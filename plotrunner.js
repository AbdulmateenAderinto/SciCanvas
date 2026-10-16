// Code plots (v1.10): runs matplotlib / ggplot2 code with the user's own Python and R and returns the plot as SVG.
// Each language gets one worker process (scripts/plot-worker.py / .R) that stays running, so libraries load once
// and a re-run takes a fraction of a second. Requests and results pass through a temporary folder per run
// (code, size, data-file paths in; SVG, printed output, error out), so neither language needs a JSON library.
const { app } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIN = process.platform === 'win32';
const home = os.homedir();
const CANDIDATES = {
  python: [
    path.join(home, 'miniforge3/bin/python3'), path.join(home, 'mambaforge/bin/python3'), path.join(home, 'miniconda3/bin/python3'), path.join(home, 'anaconda3/bin/python3'),
    '/opt/homebrew/bin/python3', '/usr/local/bin/python3', '/Library/Frameworks/Python.framework/Versions/Current/bin/python3', '/usr/bin/python3',
    ...(WIN ? [path.join(home, 'miniforge3', 'python.exe'), path.join(home, 'anaconda3', 'python.exe'), path.join(home, 'miniconda3', 'python.exe')] : []),
  ],
  r: [
    '/usr/local/bin/Rscript', '/opt/homebrew/bin/Rscript', '/Library/Frameworks/R.framework/Resources/bin/Rscript',
    ...(WIN ? (() => { try { const d = 'C:\\Program Files\\R'; return fs.readdirSync(d).sort().reverse().map((v) => path.join(d, v, 'bin', 'Rscript.exe')); } catch { return []; } })() : []),
  ],
};
const PROBE = { python: ['-c', 'import matplotlib'], r: ['-e', 'invisible(0)'] };
const SCRIPT = { python: 'plot-worker.py', r: 'plot-worker.R' };

const run = (cmd, args, ms = 15000) => new Promise((res) => execFile(cmd, args, { timeout: ms }, (err, out) => res(err ? null : String(out).trim())));
// Apps opened from the Finder get a bare PATH; ask the login shell where python3 / Rscript are.
async function fromLoginShell(name) {
  if (WIN) { const r = await run('where', [name === 'python3' ? 'python' : name]); return r ? r.split(/\r?\n/)[0] : null; }
  return run(process.env.SHELL || '/bin/zsh', ['-lc', `command -v ${name}`]);
}

const found = {};
async function interpreter(lang, preferred) {
  if (preferred) return preferred;
  if (found[lang] !== undefined) return found[lang];
  const shell = await fromLoginShell(lang === 'python' ? 'python3' : 'Rscript');
  for (const c of [shell, ...CANDIDATES[lang]].filter(Boolean)) {
    if (!fs.existsSync(c)) continue;
    if ((await run(c, PROBE[lang])) !== null) return (found[lang] = c);
  }
  return (found[lang] = null);
}

// ---------- Workers ----------
const workers = {};
function workerScript(lang) {
  // The app's own files may be inside an asar archive, which Python and R can't read: copy the script out.
  const dir = path.join(app.getPath('userData'), 'plot-workers');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, SCRIPT[lang]);
  const text = fs.readFileSync(path.join(__dirname, 'scripts', SCRIPT[lang]), 'utf8');
  if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== text) fs.writeFileSync(dest, text);
  return dest;
}
function startWorker(lang, exe) {
  const args = lang === 'python' ? ['-u', workerScript(lang)] : [workerScript(lang)];
  const proc = spawn(exe, args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, MPLBACKEND: 'Agg', PYTHONIOENCODING: 'utf-8' } });
  const w = { proc, exe, pending: new Map(), buf: '', stderr: '', info: null };
  w.ready = new Promise((resolve, reject) => { w.onReady = resolve; w.onFail = reject; });
  proc.stdout.on('data', (d) => {
    w.buf += d;
    let i;
    while ((i = w.buf.indexOf('\n')) >= 0) {
      const line = w.buf.slice(0, i).trim(); w.buf = w.buf.slice(i + 1);
      if (line.startsWith('READY ')) { try { w.info = JSON.parse(line.slice(6)); } catch { w.info = {}; } w.onReady(w.info); }
      else if (line.startsWith('DONE ')) { const p = w.pending.get(line.slice(5).trim()); if (p) p(); }
    }
  });
  proc.stderr.on('data', (d) => { w.stderr = (w.stderr + d).slice(-4000); });
  const gone = (why) => {
    if (workers[lang] === w) delete workers[lang];
    w.onFail(new Error(`${lang === 'python' ? 'Python' : 'R'} stopped: ${why}\n${w.stderr.trim().split('\n').slice(-8).join('\n')}`));
    for (const p of w.pending.values()) p(new Error(`${lang === 'python' ? 'Python' : 'R'} stopped while plotting.\n${w.stderr.trim().split('\n').slice(-8).join('\n')}`));
    w.pending.clear();
  };
  proc.on('exit', (code) => gone(`exit code ${code}`));
  proc.on('error', (e) => gone(e.message));
  return w;
}
async function worker(lang, exe) {
  let w = workers[lang];
  if (w && w.exe !== exe) { w.proc.kill(); w = null; }
  if (!w) w = workers[lang] = startWorker(lang, exe);
  await Promise.race([w.ready, new Promise((_, rej) => setTimeout(() => rej(new Error(`${lang === 'python' ? 'Python' : 'R'} took too long to start`)), 60000))]);
  return w;
}

let seq = 0;
// { lang, code, prelude?, data: {name: path | {base64}}, width, height (inches, printed size), fontSize, tickSize, labelSize,
//   titleSize, legendSize, minScriptPt (pt), family, palette (['#rrggbb']), margins? ({left, right, top, bottom} mm),
//   interpreter?, timeout? (ms) } → { svg, axes, log, error, ms, interpreter, info }
// Data given as {base64} (a copy carried inside the figure, used when the original file isn't on this computer) is
// written to the run's folder and passed to the code as a path, like any other file.
async function plot(req) {
  const lang = req.lang === 'r' ? 'r' : 'python';
  const exe = await interpreter(lang, req.interpreter);
  if (!exe) throw new Error(lang === 'python' ? 'Python 3 with matplotlib wasn\'t found. Install it (e.g. `pip install matplotlib`) or choose the interpreter in the plot window.' : 'R wasn\'t found. Install it from cran.r-project.org or choose Rscript in the plot window.');
  const w = await worker(lang, exe);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scicanvas-plot-'));
  const t0 = Date.now(), id = String(++seq);
  try {
    const width = +req.width || 4, height = +req.height || 3, fontSize = +req.fontSize || 8, data = {};
    const safe = (n) => String(n).replace(/[\\/:*?"<>|\t\n]/g, '_');
    for (const [name, v] of Object.entries(req.data || {})) {
      if (v && typeof v === 'object' && typeof v.base64 === 'string') {
        fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
        const f = path.join(dir, 'data', safe(name));
        fs.writeFileSync(f, Buffer.from(v.base64, 'base64'));
        data[name] = f;
      } else data[name] = String(v);
    }
    fs.writeFileSync(path.join(dir, lang === 'python' ? 'code.py' : 'code.R'), String(req.code || ''));
    if (req.prelude && String(req.prelude).trim()) fs.writeFileSync(path.join(dir, lang === 'python' ? 'prelude.py' : 'prelude.R'), String(req.prelude));
    const palette = (req.palette || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)), family = String(req.family || 'Arial').replace(/[^\w .-]/g, '');
    const n = (v) => (Number.isFinite(+v) && +v > 0 ? +v : null);
    const sizes = { tickSize: n(req.tickSize), labelSize: n(req.labelSize), titleSize: n(req.titleSize), legendSize: n(req.legendSize), minScriptPt: n(req.minScriptPt), axisLineWidth: n(req.axisLineWidth), lineWidth: n(req.lineWidth), markerSize: n(req.markerSize) };
    const rasterizeAbove = Number.isFinite(+req.rasterizeAbove) ? Math.max(0, Math.round(+req.rasterizeAbove)) : 0;
    const pair = (v) => (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) ? v.map(Number) : null);
    const limits = req.limits ? { x: pair(req.limits.x), y: pair(req.limits.y) } : null;
    const m = req.margins && ['left', 'right', 'top', 'bottom'].every((k) => Number.isFinite(+req.margins[k])) ? { left: +req.margins.left, right: +req.margins.right, top: +req.margins.top, bottom: +req.margins.bottom } : null;
    fs.writeFileSync(path.join(dir, 'params.json'), JSON.stringify({ width, height, fontSize, ...sizes, rasterizeAbove, limits, palette, family, margins: m }));
    fs.writeFileSync(path.join(dir, 'params.dcf'), [`width: ${width}`, `height: ${height}`, `fontsize: ${fontSize}`, `ticksize: ${sizes.tickSize ?? ''}`, `labelsize: ${sizes.labelSize ?? ''}`, `titlesize: ${sizes.titleSize ?? ''}`, `legendsize: ${sizes.legendSize ?? ''}`, `family: ${family}`, `palette: ${palette.join(',')}`, `margins: ${m ? [m.left, m.right, m.top, m.bottom].join(',') : ''}`, `axislw: ${sizes.axisLineWidth ?? ''}`, `linelw: ${sizes.lineWidth ?? ''}`, `markersize: ${sizes.markerSize ?? ''}`, `rasterize: ${rasterizeAbove}`, `xlim: ${limits && limits.x ? limits.x.join(',') : ''}`, `ylim: ${limits && limits.y ? limits.y.join(',') : ''}`].join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(data));
    fs.writeFileSync(path.join(dir, 'data.tsv'), Object.entries(data).map(([k, v]) => `${k.replace(/[\t\n]/g, ' ')}\t${String(v).replace(/[\t\n]/g, ' ')}`).join('\n'));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { w.pending.delete(id); w.proc.kill(); reject(new Error(`The plot took longer than ${Math.round((req.timeout || 60000) / 1000)} s and was stopped.`)); }, req.timeout || 60000);
      w.pending.set(id, (err) => { clearTimeout(timer); w.pending.delete(id); err ? reject(err) : resolve(); });
      w.proc.stdin.write(`${id}\t${dir}\n`);
    });
    const read = (f) => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
    const error = read('error.txt'), svg = error ? null : read('out.svg');
    let axes = null, ranges = null; try { axes = JSON.parse(read('axes.json') || 'null'); } catch { /* none */ }
    try { ranges = JSON.parse(read('ranges.json') || 'null'); } catch { /* none */ }
    return { svg, axes, ranges, log: (read('log.txt') || '').trim(), error: error && error.trim(), ms: Date.now() - t0, interpreter: exe, info: w.info };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// What's available, for the plot window (starts the workers so the first plot is quick).
async function environment(prefs = {}) {
  const out = {};
  for (const lang of ['python', 'r']) {
    const exe = await interpreter(lang, prefs[lang]);
    if (!exe) { out[lang] = { found: false }; continue; }
    try { const w = await worker(lang, exe); out[lang] = { found: true, path: exe, ...w.info }; } catch (e) { out[lang] = { found: true, path: exe, error: e.message }; }
  }
  return out;
}
const stopAll = () => { for (const w of Object.values(workers)) try { w.proc.kill(); } catch { /* gone */ } };
app.on('will-quit', stopAll);

module.exports = { plot, environment, stopAll };

// Plot window › Install: a few packages the plots use, installed with the user's own Python / R (into the user's
// R library, or the active Python environment). Only these names, whatever a figure file says.
const INSTALLABLE = { r: ['svglite', 'ggplot2', 'readxl', 'ggrastr'], python: ['pandas', 'seaborn', 'openpyxl'] };
async function installPackage(lang, pkg, prefs = {}) {
  if (!(INSTALLABLE[lang] || []).includes(pkg)) throw new Error(`Not an installable package: ${pkg}`);
  const exe = await interpreter(lang, prefs[lang]);
  if (!exe) throw new Error(`${lang === 'python' ? 'Python' : 'R'} wasn't found`);
  const args = lang === 'r'
    ? ['-e', `lib <- Sys.getenv("R_LIBS_USER"); dir.create(lib, recursive = TRUE, showWarnings = FALSE); .libPaths(c(lib, .libPaths())); install.packages("${pkg}", lib = lib, repos = "https://cloud.r-project.org"); if (!requireNamespace("${pkg}", quietly = TRUE)) quit(status = 1)`]
    : ['-m', 'pip', 'install', pkg];
  await new Promise((resolve, reject) => execFile(exe, args, { timeout: 15 * 60000, maxBuffer: 20e6 }, (err, _out, errOut) => (err ? reject(new Error(String(errOut || err.message).trim().split('\n').slice(-6).join('\n'))) : resolve())));
  if (workers[lang]) { workers[lang].proc.kill(); delete workers[lang]; } // restart with the new package
  return true;
}
module.exports.installPackage = installPackage;
