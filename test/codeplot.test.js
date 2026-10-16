// Code plots: the example code is valid, and the plot runner returns SVG with editable text from a real Python
// (skipped where Python with matplotlib isn't installed).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const A = require('./load-app');

const T = A.globals.PLOT_TEMPLATES;
const python = (() => { for (const p of ['python3', 'python']) { try { execFileSync(p, ['-c', 'import matplotlib'], { stdio: 'ignore' }); return p; } catch { /* next */ } } return null; })();
const pythonAny = (() => { for (const p of ['python3', 'python']) { try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return p; } catch { /* next */ } } return null; })();

test('there are Python and R examples', () => {
  assert.ok(T.python.length >= 3 && T.r.length >= 3);
  for (const [name, code] of [...T.python, ...T.r]) assert.ok(name && code.trim().length > 20, name);
});

test('the Python examples are valid Python', { skip: !pythonAny && 'no Python' }, () => {
  for (const [, code] of T.python) execFileSync(pythonAny, ['-c', 'import sys, ast; ast.parse(sys.stdin.read())'], { input: code });
  assert.ok(true);
});

test('the runner draws a matplotlib plot as SVG with text kept as text', { skip: !python && 'no Python with matplotlib' }, async () => {
  const Module = require('module'), orig = Module._load, ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-plot-'));
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud, on() {} } } : orig.call(this, r, ...a); };
  const runner = require('../plotrunner.js');
  Module._load = orig;
  const csv = path.join(ud, 'd.csv'); fs.writeFileSync(csv, 'x,y\n1,2\n2,4\n3,6\n');
  try {
    const r = await runner.plot({ lang: 'python', interpreter: execFileSync(python, ['-c', 'import sys; print(sys.executable)']).toString().trim(), code: 'd = read("d.csv")\nfig, ax = plt.subplots()\nax.plot([1, 2, 3], [2, 4, 6], color=PALETTE[0])\nax.set_xlabel("Dose (µM)")\nprint("ok", WIDTH)', data: { 'd.csv': csv }, width: 3, height: 2, fontSize: 7, palette: ['#123456'] });
    assert.equal(r.error, null);
    assert.match(r.svg, /<svg/);
    assert.match(r.svg, /Dose \(µM\)/); // text, not glyph outlines
    assert.match(r.svg, /#123456/);   // the figure palette reached the plot
    assert.match(r.log, /ok 3/);
    const bad = await runner.plot({ lang: 'python', interpreter: r.interpreter, code: 'fig, ax = plt.subplots()\nax.plot(nope)', width: 3, height: 2 });
    assert.equal(bad.svg, null);
    assert.match(bad.error, /NameError/);
  } finally { runner.stopAll(); }
});

test('rich text keeps a space at the end of a styled run (xml:space="preserve")', () => {
  assert.match(A.globals.textSvg('Wt / {i|Maea}', { fontSize: 10 }), /<text xml:space="preserve"/);
});

test('the runner honours printed sizes, script minimum, shared code, fixed margins and data carried as base64', { skip: !python && 'no Python with matplotlib' }, async () => {
  const Module = require('module'), orig = Module._load, ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-plot-'));
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud, on() {} } } : orig.call(this, r, ...a); };
  delete require.cache[require.resolve('../plotrunner.js')];
  const runner = require('../plotrunner.js');
  Module._load = orig;
  const exe = execFileSync(python, ['-c', 'import sys; print(sys.executable)']).toString().trim();
  const sizes = (svg) => [...svg.matchAll(/font(?:-size)?:\s*([\d.]+)px/g)].map((m) => +m[1]);
  try {
    const r = await runner.plot({
      lang: 'python', interpreter: exe, width: 2.4, height: 1.8, fontSize: 7, tickSize: 6, minScriptPt: 6,
      prelude: 'def label(ax):\n    ax.set_ylabel(r"$Aicda^{-/-}$")', margins: { left: 12, right: 2, top: 2, bottom: 9 },
      data: { 'd.csv': { base64: Buffer.from('x,y\n1,10\n2,1000\n').toString('base64') } },
      code: 'd = read("d.csv")\nfig, ax = plt.subplots()\nax.plot(d["x"], d["y"])\nax.set_yscale("log")\nlabel(ax)\nprint(TICK_SIZE)',
    });
    assert.equal(r.error, null);
    assert.ok(Math.min(...sizes(r.svg)) >= 6 - 1e-6, `smallest text ${Math.min(...sizes(r.svg))}`); // superscripts too
    assert.deepEqual(Object.fromEntries(Object.entries(r.axes).filter(([k]) => k !== 'count').map(([k, v]) => [k, +v.toFixed(2)])), { left: 12, right: 2, top: 2, bottom: 9 });
    assert.match(r.log, /^6(\.0)?$/m);
    const bad = await runner.plot({ lang: 'python', interpreter: exe, prelude: 'x = 1/0', code: 'fig, ax = plt.subplots()', width: 2, height: 2 });
    assert.match(bad.error, /Shared plot code/);
  } finally { runner.stopAll(); }
});

test('the runner applies line widths, matched ranges, helpers and rasterises dense points', { skip: !python && 'no Python with matplotlib' }, async () => {
  const Module = require('module'), orig = Module._load, ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-plot-'));
  Module._load = function (r, ...a) { return r === 'electron' ? { app: { getPath: () => ud, on() {} } } : orig.call(this, r, ...a); };
  delete require.cache[require.resolve('../plotrunner.js')];
  const runner = require('../plotrunner.js');
  Module._load = orig;
  const exe = execFileSync(python, ['-c', 'import sys; print(sys.executable)']).toString().trim();
  try {
    const r = await runner.plot({ lang: 'python', interpreter: exe, width: 2.4, height: 1.8, axisLineWidth: 0.5, lineWidth: 1, limits: { y: [0, 100] },
      code: 'fig, ax = plt.subplots()\nsc.bars_points(ax, {"WT": [1, 2, 3], "KO": [4, 5, 6]})\nsc.bracket(ax, 0, 1, 7, sc.stars(0.003))' });
    assert.equal(r.error, null);
    assert.deepEqual(r.ranges.y, [0, 100]);
    assert.match(r.svg, /\*\*/);                                  // the bracket's stars
    assert.match(r.svg, /stroke-width:\s*0\.5\b/);                // axis lines from the style
    const big = await runner.plot({ lang: 'python', interpreter: exe, width: 2, height: 2, rasterizeAbove: 1000, code: 'fig, ax = plt.subplots()\nax.scatter(np.arange(5000), np.arange(5000), s=1)' });
    assert.match(big.svg, /<image/);
  } finally { runner.stopAll(); }
});

test('the plot bridge listens on localhost only and needs its token', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-home-')), oldHome = process.env.HOME, oldProfile = process.env.USERPROFILE;
  process.env.HOME = home; process.env.USERPROFILE = home;
  delete require.cache[require.resolve('../bridge.js')];
  const bridge = require('../bridge.js');
  const got = [];
  try {
    bridge.start({ version: 'test', onSvg: (p) => got.push(p) });
    for (let i = 0; i < 50 && !bridge.info().port; i++) await new Promise((r) => setTimeout(r, 20));
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.scicanvas', 'bridge.json'), 'utf8'));
    assert.ok(fs.existsSync(path.join(home, '.scicanvas', 'scicanvas.py')) && fs.existsSync(path.join(home, '.scicanvas', 'scicanvas.R')));
    if (process.platform !== 'win32') assert.equal(fs.statSync(path.join(home, '.scicanvas', 'bridge.json')).mode & 0o077, 0); // this user only
    const post = (token, body) => fetch(`http://127.0.0.1:${cfg.port}/svg?name=T&width=2`, { method: 'POST', headers: { 'X-SciCanvas-Token': token }, body });
    assert.equal((await post('nope', '<svg/>')).status, 403);
    assert.equal((await post(cfg.token, 'not svg')).status, 400);
    assert.equal((await post(cfg.token, '<svg xmlns="http://www.w3.org/2000/svg"/>')).status, 200);
    assert.equal(got.length, 1);
    assert.equal(got[0].name, 'T');
    assert.equal(got[0].widthIn, 2);
  } finally {
    bridge.stop();
    process.env.HOME = oldHome; if (oldProfile === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = oldProfile;
  }
});
