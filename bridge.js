// Send plots from Jupyter / RStudio (v2.1). While SciCanvas runs, it listens on 127.0.0.1 only, and accepts an SVG
// with the secret token it writes to ~/.scicanvas/bridge.json (readable by this user only), so other users and web
// pages can't post to it. The helpers scicanvas.py and scicanvas.R (copied to ~/.scicanvas) save the current
// matplotlib / seaborn / ggplot2 / base-R figure as SVG at its own size and post it; it lands on the open page.
//   POST /svg?name=…&source=…&width=in&height=in   body: the SVG   header X-SciCanvas-Token
//   GET  /ping                                      → { app, version }
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const DIR = path.join(os.homedir(), '.scicanvas');
const CONFIG = path.join(DIR, 'bridge.json');
const PREFERRED_PORT = 47913;
const MAX_BYTES = 60e6;
let server = null, info = { running: false, port: null };

function installHelpers() {
  fs.mkdirSync(DIR, { recursive: true });
  for (const [src, dest] of [['scicanvas_bridge.py', 'scicanvas.py'], ['scicanvas_bridge.R', 'scicanvas.R']]) {
    const text = fs.readFileSync(path.join(__dirname, 'scripts', src), 'utf8');
    const out = path.join(DIR, dest);
    if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== text) fs.writeFileSync(out, text);
  }
}

function start({ version, onSvg }) {
  if (server) return info;
  const token = crypto.randomBytes(24).toString('hex');
  server = http.createServer((req, res) => {
    const reply = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch { return reply(400, { error: 'bad request' }); }
    if (req.method === 'GET' && url.pathname === '/ping') return reply(200, { app: 'SciCanvas', version });
    if (req.method !== 'POST' || url.pathname !== '/svg') return reply(404, { error: 'not found' });
    const given = String(req.headers['x-scicanvas-token'] || '');
    if (given.length !== token.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) return reply(403, { error: 'wrong or missing token (see ~/.scicanvas/bridge.json)' });
    const chunks = [];
    let size = 0, tooBig = false;
    req.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { tooBig = true; req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (tooBig) return reply(413, { error: 'larger than 60 MB' });
      const svg = Buffer.concat(chunks).toString('utf8');
      if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(svg)) return reply(400, { error: 'expected an SVG' });
      const num = (k) => { const v = +url.searchParams.get(k); return Number.isFinite(v) && v > 0 ? v : null; };
      onSvg({ svg, name: (url.searchParams.get('name') || 'Plot').slice(0, 120), source: (url.searchParams.get('source') || '').slice(0, 40), widthIn: num('width'), heightIn: num('height') });
      reply(200, { ok: true });
    });
  });
  const listening = () => {
    info = { running: true, port: server.address().port };
    try {
      installHelpers();
      fs.writeFileSync(CONFIG, JSON.stringify({ port: info.port, token, pid: process.pid }), { mode: 0o600 });
      fs.chmodSync(CONFIG, 0o600);
    } catch (e) { info.error = e.message; }
  };
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && server.address() == null) { server.listen(0, '127.0.0.1', listening); return; } // another SciCanvas user: any free port
    info = { running: false, port: null, error: e.message };
  });
  server.listen(PREFERRED_PORT, '127.0.0.1', listening);
  return info;
}
function stop() {
  if (!server) return;
  try { server.close(); } catch { /* closed */ }
  try { const c = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); if (c.pid === process.pid) fs.unlinkSync(CONFIG); } catch { /* gone */ }
  server = null; info = { running: false, port: null };
}

// Make `import scicanvas` work in a given Python: a .pth file in its user site-packages pointing at ~/.scicanvas.
function installForPython(exe) {
  return new Promise((resolve, reject) => execFile(exe, ['-c', `import site, os\nd = site.getusersitepackages()\nos.makedirs(d, exist_ok=True)\nopen(os.path.join(d, "scicanvas.pth"), "w").write(${JSON.stringify(DIR)} + "\\n")\nprint(d)`], { timeout: 30000 }, (err, out, errOut) => {
    if (err) return reject(new Error(String(errOut || err.message).trim().split('\n').pop()));
    execFile(exe, ['-c', 'import scicanvas; print(scicanvas.__file__)'], { timeout: 30000 }, (e2, out2) => (e2 ? reject(new Error('Installed, but this Python ignores user site-packages (a virtual environment?). Use: import sys; sys.path.append("~/.scicanvas")')) : resolve({ site: String(out).trim(), module: String(out2).trim() })));
  }));
}

module.exports = { start, stop, info: () => ({ ...info, dir: DIR }), installForPython };
