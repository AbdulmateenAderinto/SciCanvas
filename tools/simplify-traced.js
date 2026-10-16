// Lighten traced art in src/tracedart.js: fewer points, no specks, same look at any size a figure uses.
//
//     node tools/simplify-traced.js [--eps 1.5] [--min-area 25] [name ...]
//
// Traced icons (tools/trace-icon.py) stack many full-size tone layers, each a path with hundreds of outlines;
// the browser redraws all of them on every zoom or scroll frame, so a dense trace makes the canvas lag. For each
// outline this keeps only its anchor points, drops outlines smaller than --min-area square picture pixels,
// thins the rest with Ramer–Douglas–Peucker to within --eps picture pixels, and redraws them with the same
// smooth curves trace-icon.py uses (straight into corners). Rewrites src/tracedart.js in place.
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'tracedart.js');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = +args[i + 1]; args.splice(i, 2); return v; };
const EPS = opt('--eps', 1.5), MIN_AREA = opt('--min-area', 25), only = args;

// Outlines of one path: the end point of every segment (M, L and C; absolute commands only, as traced).
function outlines(d) {
  const out = [];
  let cur = null;
  for (const m of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const n = m[2].trim() ? m[2].trim().split(/[\s,]+/).map(Number) : [];
    if (m[1] === 'M') { cur = [[n[0], n[1]]]; out.push(cur); } else if (m[1] === 'L') cur.push([n[0], n[1]]); else if (m[1] === 'C') cur.push([n[4], n[5]]);
  }
  return out.map((p) => (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1] ? p.slice(0, -1) : p));
}
const area = (p) => Math.abs(p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
function rdp(p, eps) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p[p.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
  let far = 0, at = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = Math.abs(dy * p[i][0] - dx * p[i][1] + b[0] * a[1] - b[1] * a[0]) / L; if (d > far) { far = d; at = i; } }
  return far <= eps ? [a, b] : [...rdp(p.slice(0, at + 1), eps).slice(0, -1), ...rdp(p.slice(at), eps)];
}
// Closed outline: split at the point farthest from the first so both halves have real ends.
function simplifyClosed(p, eps) {
  let far = 0, at = 0;
  p.forEach((q, i) => { const d = Math.hypot(q[0] - p[0][0], q[1] - p[0][1]); if (d > far) { far = d; at = i; } });
  if (at === 0) return p;
  return [...rdp(p.slice(0, at + 1), eps).slice(0, -1), ...rdp([...p.slice(at), p[0]], eps).slice(0, -1)];
}
// Same as smooth_path in trace-icon.py: Catmull-Rom as cubic Bezier, straight into corners sharper than 40°.
function smooth(pts) {
  const n = pts.length, f = (v) => v.toFixed(1), at = (i) => pts[((i % n) + n) % n];
  const corner = pts.map((_, i) => { const a = at(i - 1), b = at(i), c = at(i + 1); const t = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]); return Math.abs(((t + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) > (40 * Math.PI) / 180; });
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = corner[i] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = corner[(i + 1) % n] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += c1 === p1 && c2 === p2 ? `L${f(p2[0])} ${f(p2[1])}` : `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + 'Z';
}
const straightOnly = (d) => !/C/.test(d);
const straight = (pts) => `M${pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z`;

const src = fs.readFileSync(FILE, 'utf8');
const out = src.replace(/^(\s*)(\w+): '(.*)',?$/gm, (line, ind, name, art) => {
  if (only.length && !only.includes(name)) return line;
  const before = art.length;
  // Only the traced tone layers (filled, even-odd); lines and shapes drawn over them are left as they are.
  const next = art.replace(/(<path [^>]*fill-rule="evenodd"[^>]*) d="([^"]*)"/g, (_m, head, d) => {
    const keepStraight = straightOnly(d);
    const parts = outlines(d).filter((p) => p.length >= 3 && area(p) >= MIN_AREA).map((p) => simplifyClosed(p, EPS)).filter((p) => p.length >= 3);
    return `${head} d="${parts.map(keepStraight ? straight : smooth).join('')}"`;
  });
  console.log(`${name}: ${Math.round(before / 1024)} KB -> ${Math.round(next.length / 1024)} KB`);
  return line.replace(art, () => next);
});
fs.writeFileSync(FILE, out);
