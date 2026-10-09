// Icon finish (v1.2): one look for every built-in icon, following the professional scientific illustrations the team
// chose as the reference. Fills stay flat with a thin outline in a darker tone of the same hue (iconstyle.js), and this
// pass adds the shading those illustrations use:
//   - a shadow band in a deeper tone of the fill along the lower-right inside of each outlined shape,
//   - a slim, tapered light streak (and a short dash after it) just inside the upper-left edge of larger shapes,
//   - on tubes (a body stroke over a wider outline stroke), a darker line along the lower side and a light line on top.
// The shading is computed as plain shapes, with no gradients, filters, masks or clip paths. Icons therefore still
// recolour per layer, ungroup, warp, and export to SVG, PDF and PowerPoint as before. Older two-tone "lit copies"
// (a lighter inset copy of a shape) are replaced by this finish so every icon is shaded the same way. Flat shapes
// with no outline (silhouettes, membranes, glass), or marked data-flat, are left as drawn. The Classic icon style
// turns all of this off.
(() => {
  const PC = globalThis.polygonClipping;
  const LIGHT = [-0.5, -0.866]; // light comes from the upper left of the page
  const DOWN = [0.34, 0.94]; // the shadow band sits along this side
  const r1 = (n) => Math.round(n * 10) / 10;

  // ---------- Colour ----------
  const toHsl = (hex) => {
    const [r, g, b] = Color.hexToRgb(hex).map((v) => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  };
  const fromHsl = (h, s, l) => {
    s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    if (!s) return Color.rgbToHex(l * 255, l * 255, l * 255);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const t = (x) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    return Color.rgbToHex(t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255);
  };
  const cache = new Map();
  const memoColour = (key, fn) => { let v = cache.get(key); if (v === undefined) { v = fn(); if (cache.size > 4000) cache.clear(); cache.set(key, v); } return v; };
  // Shadow: a deeper, slightly richer tone of the same hue (pale fills get a warm grey rather than mud).
  const shade = (hex) => memoColour('s' + hex, () => { const [h, s, l] = toHsl(hex); return fromHsl(h, s > 0.04 ? Math.min(1, s * 1.04 + 0.02) : s, l - 0.055 - 0.08 * l); });
  // Light: most of the way to white, keeping a hint of the hue.
  const light = (hex) => memoColour('l' + hex, () => { const [h, s, l] = toHsl(hex); return fromHsl(h, s * 0.85, l + (1 - l) * (l > 0.8 ? 0.62 : 0.42)); });
  const HEX = /^#[0-9a-f]{3}([0-9a-f]{3})?$/i;
  const lum = (hex) => { const [r, g, b] = Color.hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

  // ---------- Geometry ----------
  const NUM = /[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  function arcPts(x1, y1, rx, ry, phi, fa, fs, x2, y2, out) {
    rx = Math.abs(rx); ry = Math.abs(ry);
    if (!rx || !ry) { out.push([x2, y2]); return; }
    const c = Math.cos((phi * Math.PI) / 180), s = Math.sin((phi * Math.PI) / 180), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const xp = c * dx + s * dy, yp = -s * dx + c * dy, lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
    if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
    let co = den ? Math.sqrt(Math.max(0, num / den)) : 0;
    if (fa === fs) co = -co;
    const cxp = (co * rx * yp) / ry, cyp = (-co * ry * xp) / rx, cx = c * cxp - s * cyp + (x1 + x2) / 2, cy = s * cxp + c * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
    let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(dt) / (Math.PI / 14)));
    for (let k = 1; k <= n; k++) { const t = t1 + (dt * k) / n, px = rx * Math.cos(t), py = ry * Math.sin(t); out.push([c * px - s * py + cx, s * px + c * py + cy]); }
  }
  // A path's subpaths as closed point rings (curves and arcs flattened).
  function pathRings(d) {
    const tk = d.match(NUM) || [], rings = [];
    let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lqx = 0, lqy = 0, prev = '', cur = null;
    const n = () => parseFloat(tk[i++]);
    const more = () => i < tk.length && !/^[A-Za-z]$/.test(tk[i]);
    const start = () => { if (cur && cur.length > 2) rings.push(cur); cur = [[x, y]]; };
    while (i < tk.length) {
      if (/^[A-Za-z]$/.test(tk[i])) cmd = tk[i++]; else if (!cmd) { i++; continue; }
      const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { x = sx; y = sy; if (cur && cur.length > 2) rings.push(cur); cur = null; prev = 'Z'; continue; }
      if (!more()) { prev = C; continue; }
      if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; start(); cmd = rel ? 'l' : 'L'; prev = 'M'; continue; }
      if (!cur) start();
      if (C === 'L') { x = ox + n(); y = oy + n(); cur.push([x, y]); }
      else if (C === 'H') { x = ox + n(); cur.push([x, y]); }
      else if (C === 'V') { y = oy + n(); cur.push([x, y]); }
      else if (C === 'C' || C === 'S') {
        let x1, y1;
        if (C === 'C') { x1 = ox + n(); y1 = oy + n(); } else { x1 = prev === 'C' || prev === 'S' ? 2 * x - lcx : x; y1 = prev === 'C' || prev === 'S' ? 2 * y - lcy : y; }
        const x2 = ox + n(), y2 = oy + n(), ex = ox + n(), ey = oy + n();
        for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; cur.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey]); }
        lcx = x2; lcy = y2; x = ex; y = ey;
      } else if (C === 'Q' || C === 'T') {
        let x1, y1;
        if (C === 'Q') { x1 = ox + n(); y1 = oy + n(); } else { x1 = prev === 'Q' || prev === 'T' ? 2 * x - lqx : x; y1 = prev === 'Q' || prev === 'T' ? 2 * y - lqy : y; }
        const ex = ox + n(), ey = oy + n();
        for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t; cur.push([u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey]); }
        lqx = x1; lqy = y1; x = ex; y = ey;
      } else if (C === 'A') {
        const rx = n(), ry = n(), phi = n(), fa = n(), fs = n(), ex = ox + n(), ey = oy + n();
        arcPts(x, y, rx, ry, phi, fa, fs, ex, ey, cur);
        x = ex; y = ey;
      } else { i++; }
      prev = C;
    }
    if (cur && cur.length > 2) rings.push(cur);
    return rings.filter((r) => r.every(([a, b]) => Number.isFinite(a) && Number.isFinite(b)));
  }
  const ellRing = (cx, cy, rx, ry) => Array.from({ length: 48 }, (_, k) => [cx + rx * Math.cos((k / 48) * Math.PI * 2), cy + ry * Math.sin((k / 48) * Math.PI * 2)]);
  function rectRing(x, y, w, h, rx, ry) {
    rx = Math.min(rx || ry || 0, w / 2); ry = Math.min(ry || rx || 0, h / 2);
    if (!rx || !ry) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const out = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + (k / 6) * (Math.PI / 2); out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } };
    arc(x + w - rx, y + ry, -Math.PI / 2); arc(x + w - rx, y + h - ry, 0); arc(x + rx, y + h - ry, Math.PI / 2); arc(x + rx, y + ry, Math.PI);
    return out;
  }
  function shapeRings(tag, a) {
    const v = (k) => parseFloat(a[k]) || 0;
    if (tag === 'path') return a.d ? pathRings(a.d) : [];
    if (tag === 'circle') return v('r') > 0 ? [ellRing(v('cx'), v('cy'), v('r'), v('r'))] : [];
    if (tag === 'ellipse') return v('rx') > 0 && v('ry') > 0 ? [ellRing(v('cx'), v('cy'), v('rx'), v('ry'))] : [];
    if (tag === 'rect') return v('width') > 0 && v('height') > 0 ? [rectRing(v('x'), v('y'), v('width'), v('height'), v('rx'), v('ry'))] : [];
    if (tag === 'polygon') { const p = (a.points || '').trim().split(/[\s,]+/).map(Number); const r = []; for (let k = 0; k + 1 < p.length; k += 2) r.push([p[k], p[k + 1]]); return r.length > 2 ? [r] : []; }
    return [];
  }
  const area = (r) => { let s = 0; for (let k = 0, j = r.length - 1; k < r.length; j = k++) s += r[j][0] * r[k][1] - r[k][0] * r[j][1]; return s / 2; };
  const inRings = (x, y, rings) => { let ins = false; for (const pts of rings) for (let k = 0, j = pts.length - 1; k < pts.length; j = k++) { const [xi, yi] = pts[k], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  const bbox = (rings) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const r of rings) for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 }; };
  // Ring(s) as a path, dropping points closer than `gap` to the last one kept (keeps shading paths small).
  const ringsD = (rings, gap = 0) => rings.map((r) => { const q = []; for (const p of r) { const l = q[q.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) >= gap) q.push(p); } return q.length > 2 ? `M${q.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z` : ''; }).join(' ');

  // ---------- Transforms (only the linear part matters: it turns "upper left on the page" into local directions) ----------
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  function parseTf(s) {
    let m = [1, 0, 0, 1, 0, 0];
    for (const [, fn, args] of (s || '').matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
      const p = args.trim().split(/[\s,]+/).map(Number);
      let t = null;
      if (fn === 'matrix' && p.length === 6) t = p;
      else if (fn === 'translate') t = [1, 0, 0, 1, p[0] || 0, p[1] || 0];
      else if (fn === 'scale') t = [p[0], 0, 0, p.length > 1 ? p[1] : p[0], 0, 0];
      else if (fn === 'rotate') { const a = ((p[0] || 0) * Math.PI) / 180, c = Math.cos(a), s2 = Math.sin(a), cx = p[1] || 0, cy = p[2] || 0; t = [c, s2, -s2, c, cx - c * cx + s2 * cy, cy - s2 * cx - c * cy]; }
      else if (fn === 'skewX') t = [1, 0, Math.tan(((p[0] || 0) * Math.PI) / 180), 1, 0, 0];
      else if (fn === 'skewY') t = [1, Math.tan(((p[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
      if (t && t.every(Number.isFinite)) m = mul(m, t);
    }
    return m;
  }
  // Page direction -> local direction under the linear part of m (normalised), and the local-to-page scale.
  const local = (m, [vx, vy]) => { const det = m[0] * m[3] - m[1] * m[2] || 1, x = (m[3] * vx - m[2] * vy) / det, y = (-m[1] * vx + m[0] * vy) / det, h = Math.hypot(x, y) || 1; return [x / h, y / h]; };
  const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;

  // ---------- Shading for one outlined shape ----------
  const geomCache = new Map();
  function shapeShading(tag, a, m, size, minFrac) {
    const key = `${minFrac}|${tag}|${a.d || ''}|${a.cx}|${a.cy}|${a.r}|${a.rx}|${a.ry}|${a.x}|${a.y}|${a.width}|${a.height}|${a.points || ''}|${a.transform || ''}|${m.join(',')}|${size}`;
    let g = geomCache.get(key);
    if (g !== undefined) return g;
    g = null;
    try { g = computeShading(tag, a, m, size, minFrac); } catch { g = null; }
    if (geomCache.size > 6000) geomCache.clear();
    geomCache.set(key, g);
    return g;
  }
  function computeShading(tag, a, m, size, minFrac) {
    const rings = shapeRings(tag, a);
    if (!rings.length || rings.length > 8 || !PC) return null; // many subpaths = a texture (dots, granules), left flat
    const tm = mul(m, parseTf(a.transform)), sc = scaleOf(tm), b = bbox(rings), mn = Math.min(b.w, b.h);
    if (mn * sc < size * minFrac || rings.reduce((s, r) => s + Math.abs(area(r)), 0) * sc * sc < size * size * 0.008) return null;
    const geom = rings.length === 1 ? [[rings[0]]] : PC.xor(...rings.map((r) => [[r]]));
    const shapeArea = geom.reduce((s, poly) => s + poly.reduce((t, r, k) => t + (k ? -1 : 1) * Math.abs(area(r)), 0), 0);
    if (!(shapeArea > 0)) return null;
    // Shadow band: what is left of the shape after taking away a copy of itself nudged towards the light.
    const dn = local(tm, DOWN), off = Math.min(mn * 0.14, (size * 0.055) / sc);
    const moved = geom.map((poly) => poly.map((r) => r.map(([x, y]) => [x - dn[0] * off, y - dn[1] * off])));
    const band = PC.difference(geom, moved).filter((poly) => Math.abs(area(poly[0])) > shapeArea * 0.004);
    const bandArea = band.reduce((s, poly) => s + Math.abs(area(poly[0])), 0);
    const out = { shadow: bandArea > shapeArea * 0.025 ? ringsD(band.flat(), size / 140) : '' };
    // Light streak: just inside the stretch of outline that faces the light, tapered at both ends.
    if (mn * sc >= size * 0.17) out.streak = streak(geom, local(tm, LIGHT), mn);
    return out;
  }
  function streak(geom, ld, mn) {
    const outer = geom.map((p) => p[0]).sort((p, q) => Math.abs(area(q)) - Math.abs(area(p)))[0];
    if (!outer) return '';
    // Resample the outline evenly so lengths can be measured in points.
    const step = mn / 40, pts = [];
    for (let k = 0; k < outer.length; k++) {
      const [x0, y0] = outer[k], [x1, y1] = outer[(k + 1) % outer.length], len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
      for (let j = 0; j < n; j++) pts.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n]);
    }
    const N = pts.length;
    if (N < 24) return '';
    const sgn = Math.sign(area(pts)) || 1, nrm = [];
    for (let k = 0; k < N; k++) {
      const [ax, ay] = pts[(k - 3 + N) % N], [bx, by] = pts[(k + 3) % N], tx = bx - ax, ty = by - ay, h = Math.hypot(tx, ty) || 1;
      nrm.push([(sgn * ty) / h, (-sgn * tx) / h]); // outward
    }
    const good = nrm.map(([x, y]) => x * ld[0] + y * ld[1] > 0.5);
    if (good.every(Boolean)) good[nrm.reduce((bi, n, k) => (n[0] * ld[0] + n[1] * ld[1] < nrm[bi][0] * ld[0] + nrm[bi][1] * ld[1] ? k : bi), 0)] = false;
    let best = null;
    for (let k = 0; k < N; k++) {
      if (!good[k] || good[(k - 1 + N) % N]) continue;
      let len = 0;
      while (len < N && good[(k + len) % N]) len++;
      if (!best || len > best.len) best = { k, len };
    }
    if (!best || best.len < 10) return '';
    const inset = mn * 0.1, thick = Math.max(0.5, mn * 0.06);
    const piece = (u0, u1, tmax) => {
      const a = Math.round(best.len * u0), z = Math.round(best.len * u1), outerE = [], innerE = [];
      if (z - a < 4) return null;
      for (let j = a; j <= z; j++) {
        const k = (best.k + j) % N, [px, py] = pts[k], [nx, ny] = nrm[k], u = (j - a) / (z - a), th = tmax * Math.pow(Math.sin(Math.PI * u), 0.8);
        outerE.push([px - nx * inset, py - ny * inset]);
        innerE.push([px - nx * (inset + th), py - ny * (inset + th)]);
      }
      const poly = [...outerE, ...innerE.reverse()];
      return poly.every(([x, y]) => inRings(x, y, geom.flat())) ? poly : null;
    };
    const main = piece(0.18, 0.56, thick), dash = best.len > 26 ? piece(0.66, 0.76, thick * 0.8) : null;
    return [main, dash].filter(Boolean).map((p) => `M${p.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`).join(' ');
  }

  // ---------- Tubes ----------
  function tubeLines(d, w, body, cap, tf, m, size) {
    const tm = mul(m, parseTf(tf)), sc = scaleOf(tm);
    if (w * sc < size * 0.04 || !HEX.test(body)) return '';
    const dn = local(tm, DOWN), up = local(tm, LIGHT), wrap = (s) => (tf ? `<g transform="${tf}">${s}</g>` : s);
    const line = (v, k, wd, c, op) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${r1(w * wd) || 0.3}" stroke-linecap="${cap}" stroke-linejoin="round"${op ? ` opacity="${op}"` : ''} transform="translate(${r1(v[0] * w * k)} ${r1(v[1] * w * k)})"/>`;
    return wrap(line(dn, 0.24, 0.34, shade(body)) + line(up, 0.22, 0.13, light(body), 0.75));
  }

  // ---------- The pass ----------
  const TAG = /<(\/?)([a-zA-Z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  const ATTR = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  const attrs = (s) => { const o = {}; for (const [, k, v] of s.matchAll(ATTR)) o[k] = v; return o; };
  const SHAPES = new Set(['path', 'circle', 'ellipse', 'rect', 'polygon']);
  const SKIP = new Set(['defs', 'clipPath', 'mask', 'pattern', 'symbol', 'marker', 'linearGradient', 'radialGradient', 'filter', 'text']);
  const opaque = (a) => !(parseFloat(a.opacity ?? 1) < 0.9 || parseFloat(a['fill-opacity'] ?? 1) < 0.9);
  const hueNear = (p, q) => { const [h1, s1] = toHsl(p), [h2, s2] = toHsl(q); if (s1 < 0.12 || s2 < 0.12) return Math.abs(s1 - s2) < 0.2; const dh = Math.abs(h1 - h2); return Math.min(dh, 1 - dh) < 0.07; };
  const tfOf = (stack) => stack.reduce((m, t) => mul(m, t), [1, 0, 0, 1, 0, 0]);

  function finish(svg, size) {
    const toks = [];
    let last = 0;
    for (const mt of svg.matchAll(TAG)) {
      if (mt.index > last) toks.push({ text: svg.slice(last, mt.index) });
      toks.push({ text: mt[0], close: !!mt[1], name: mt[2], self: !!mt[4] || /\/\s*$/.test(mt[3]), a: mt[1] ? null : attrs(mt[3]) });
      last = mt.index + mt[0].length;
    }
    if (last < svg.length) toks.push({ text: svg.slice(last) });
    // Tubes: an outline stroke and a narrower body stroke along the same path.
    const strokes = new Map();
    toks.forEach((t, k) => {
      if (t.name !== 'path' || t.close || !t.a || t.a.fill !== 'none' || !t.a.d || t.a['stroke-dasharray'] || t.a['data-flat'] != null || !HEX.test(t.a.stroke || '') || !opaque(t.a)) return;
      const w = parseFloat(t.a['stroke-width']);
      if (!(w > 0)) return;
      (strokes.get(t.a.d) || strokes.set(t.a.d, []).get(t.a.d)).push({ k, w });
    });
    const tubeBody = new Map();
    for (const list of strokes.values()) {
      if (list.length < 2) continue;
      const wide = list.reduce((p, q) => (q.w > p.w ? q : p)), body = list.filter((q) => q.w < wide.w && q.k > wide.k).sort((p, q) => q.w - p.w)[0];
      if (body && body.w >= wide.w * 0.5) tubeBody.set(body.k, body.w);
    }
    // Busy icons (hundreds of small cells or dots) only shade their larger shapes, to keep them light.
    const outlined = toks.filter((t) => t.a && SHAPES.has(t.name) && HEX.test(t.a.fill || '') && HEX.test(t.a.stroke || '')).length;
    const minFrac = outlined > 80 ? 0.14 : 0.075;
    const out = [], tf = [], skipDepth = [];
    const nextEl = (k) => { for (let j = k + 1; j < toks.length; j++) { if (!toks[j].name) { if (toks[j].text.trim()) return -1; continue; } return toks[j].close ? -1 : j; } return -1; };
    const dropped = new Set();
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (dropped.has(k)) continue;
      out.push(t.text);
      if (!t.name) continue;
      if (t.close) { if (t.name === 'g' || t.name === 'svg') tf.pop(); if (skipDepth.length && skipDepth[skipDepth.length - 1] === t.name) skipDepth.pop(); continue; }
      if (SKIP.has(t.name)) { if (!t.self) skipDepth.push(t.name); continue; }
      if ((t.name === 'g' || t.name === 'svg') && !t.self) { tf.push(t.name === 'g' ? parseTf(t.a.transform) : [1, 0, 0, 1, 0, 0]); continue; }
      if (skipDepth.length || !SHAPES.has(t.name)) continue;
      const a = t.a, m = tfOf(tf);
      if (tubeBody.has(k)) { out.push(tubeLines(a.d, tubeBody.get(k), a.stroke, a['stroke-linecap'] || 'butt', a.transform, m, size)); continue; }
      const fill = a.fill, stroke = a.stroke, sw = parseFloat(a['stroke-width']);
      if (!HEX.test(fill || '') || !HEX.test(stroke || '') || !(sw > 0) || !opaque(a) || a['data-flat'] != null) continue;
      // An older lit copy (lighter, unoutlined, inset copy right after the shape) gives way to this finish;
      // a white shine just after it means the shape already has its highlight.
      let hasShine = false;
      for (let j = nextEl(k), n = 0; j > 0 && n < 2; j = nextEl(j), n++) {
        const e = toks[j], ea = e.a;
        if (!SHAPES.has(e.name) || !HEX.test(ea.fill || '') || (ea.stroke && ea.stroke !== 'none')) break;
        if (/^#f{3}(f{3})?$/i.test(ea.fill)) { hasShine = true; break; }
        if (n === 0 && opaque(ea) && lum(ea.fill) > lum(fill) + 0.02 && hueNear(ea.fill, fill)) {
          const pb = bbox(shapeRings(t.name, a)), eb = bbox(shapeRings(e.name, ea));
          const pad = Math.max(pb.w, pb.h) * 0.06;
          if (eb.x0 >= pb.x0 - pad && eb.y0 >= pb.y0 - pad && eb.x1 <= pb.x1 + pad && eb.y1 <= pb.y1 + pad && eb.w * eb.h >= pb.w * pb.h * 0.45 && (ea.transform || '') === (a.transform || '')) { dropped.add(j); continue; }
        }
        break;
      }
      const g = shapeShading(t.name, a, m, size, minFrac);
      if (!g || (!g.shadow && !g.streak)) continue;
      const tfa = a.transform ? ` transform="${a.transform}"` : '';
      let s = '';
      if (g.shadow) s += `<path d="${g.shadow}" fill="${shade(fill)}" fill-rule="evenodd"${tfa}/>`;
      if (g.streak && !hasShine) s += `<path d="${g.streak}" fill="${light(fill)}"${tfa}/>`;
      // Redraw the outline on top so the shading doesn't cover its inner half.
      const keep = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points', 'transform', 'stroke', 'stroke-width', 'stroke-linejoin', 'stroke-linecap', 'stroke-dasharray'];
      s += `<${t.name} ${keep.filter((q) => a[q] != null).map((q) => `${q}="${a[q]}"`).join(' ')} fill="none"/>`;
      out.push(s);
    }
    return out.join('');
  }

  // ---------- Wrap every built-in icon ----------
  const MEMO = 24;
  for (const ic of ICONS) {
    if (ic.finished || ic.art) continue; // professional artwork (organicons.js) is already shaded
    const prev = ic.draw, memo = new Map(), size = Math.max(...(ic.vb || [100, 100]));
    ic.finished = true;
    ic.draw = (c) => {
      if (globalThis.IconStyle && IconStyle.mode === 'classic') return prev(c);
      const k = String(c);
      let s = memo.get(k);
      if (s === undefined) { s = finish(prev(c), size); if (memo.size > MEMO) memo.clear(); memo.set(k, s); }
      return s;
    };
  }
  globalThis.IconFinish = { finish, shade, light, pathRings };
})();
