// Design tools (part 5): warp (envelope presets, free distort, perspective, isometric planes and grid),
// cutaway / cross-section, and path tools (offset path, outline stroke, knife, scissors, join, simplify,
// smooth, round corners, per-corner radius on rectangles).

// ---------- SVG path data: parse, transform, flatten (no DOM needed) ----------
function parsePathD(d) {
  const toks = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const num = () => parseFloat(toks[i++]);
  const more = () => i < toks.length && !/^[A-Za-z]$/.test(toks[i]);
  while (i < toks.length) {
    if (/^[A-Za-z]$/.test(toks[i])) cmd = toks[i++];
    else if (!cmd) { i++; continue; }
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out.push(['Z']); x = sx; y = sy; lc = lq = null; continue; }
    if (!more()) { if (C !== 'Z') continue; }
    switch (C) {
      case 'M': x = ox + num(); y = oy + num(); sx = x; sy = y; out.push(['M', x, y]); cmd = rel ? 'l' : 'L'; lc = lq = null; break;
      case 'L': x = ox + num(); y = oy + num(); out.push(['L', x, y]); lc = lq = null; break;
      case 'H': x = ox + num(); out.push(['L', x, y]); lc = lq = null; break;
      case 'V': y = (rel ? y : 0) + num(); out.push(['L', x, y]); lc = lq = null; break;
      case 'C': { const a = [ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num()]; out.push(['C', ...a]); lc = [a[2], a[3]]; x = a[4]; y = a[5]; lq = null; break; }
      case 'S': { const r1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]; const a = [ox + num(), oy + num(), ox + num(), oy + num()]; out.push(['C', r1[0], r1[1], ...a]); lc = [a[0], a[1]]; x = a[2]; y = a[3]; lq = null; break; }
      case 'Q': { const a = [ox + num(), oy + num(), ox + num(), oy + num()]; out.push(['Q', ...a]); lq = [a[0], a[1]]; x = a[2]; y = a[3]; lc = null; break; }
      case 'T': { const q = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y]; const a = [ox + num(), oy + num()]; out.push(['Q', q[0], q[1], ...a]); lq = q; x = a[0]; y = a[1]; lc = null; break; }
      case 'A': {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), ex = ox + num(), ey = oy + num();
        out.push(...pathArcToCubics(x, y, rx, ry, rot, large, sweep, ex, ey)); x = ex; y = ey; lc = lq = null; break;
      }
      default: i++;
    }
  }
  return out;
}
// SVG elliptical arc → cubic Béziers (SVG spec F.6.5 / F.6.6).
function pathArcToCubics(x1, y1, rx, ry, phi, fa, fs, x2, y2) {
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [['L', x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const p = (phi * Math.PI) / 180, cp = Math.cos(p), sp = Math.sin(p);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sign = fa === fs ? -1 : 1;
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2))), seg = dt / n, k = (4 / 3) * Math.tan(seg / 4), out = [];
  const pt = (t) => ({ x: cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, y: cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp });
  const dv = (t) => ({ x: -rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, y: -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp });
  for (let i = 0; i < n; i++) {
    const a = t1 + i * seg, b = a + seg, P0 = pt(a), P3 = pt(b), d0 = dv(a), d3 = dv(b);
    out.push(['C', P0.x + k * d0.x, P0.y + k * d0.y, P3.x - k * d3.x, P3.y - k * d3.y, P3.x, P3.y]);
  }
  return out;
}
// Segments → polylines (one per subpath). `step` is the target spacing; `map` transforms each point.
function flattenSegs(segs, step = 2, map = (x, y) => ({ x, y })) {
  const subs = [];
  let cur = null, px = 0, py = 0, sx = 0, sy = 0;
  const push = (x, y) => { cur.pts.push(map(x, y)); px = x; py = y; };
  for (const s of segs) {
    if (s[0] === 'M') { cur = { pts: [], closed: false }; subs.push(cur); push(s[1], s[2]); sx = s[1]; sy = s[2]; continue; }
    if (!cur) { cur = { pts: [], closed: false }; subs.push(cur); push(px, py); sx = px; sy = py; }
    if (s[0] === 'L') {
      const n = Math.max(1, Math.min(200, Math.ceil(Math.hypot(s[1] - px, s[2] - py) / (step * 4))));
      const x0 = px, y0 = py;
      for (let k = 1; k <= n; k++) push(x0 + ((s[1] - x0) * k) / n, y0 + ((s[2] - y0) * k) / n);
    } else if (s[0] === 'C' || s[0] === 'Q') {
      const P = s[0] === 'C' ? [px, py, s[1], s[2], s[3], s[4], s[5], s[6]] : [px, py, s[1], s[2], s[3], s[4]];
      const est = s[0] === 'C' ? Math.hypot(P[2] - P[0], P[3] - P[1]) + Math.hypot(P[4] - P[2], P[5] - P[3]) + Math.hypot(P[6] - P[4], P[7] - P[5]) : Math.hypot(P[2] - P[0], P[3] - P[1]) + Math.hypot(P[4] - P[2], P[5] - P[3]);
      const n = Math.max(2, Math.min(96, Math.ceil(est / step)));
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        if (s[0] === 'C') push(u ** 3 * P[0] + 3 * u * u * t * P[2] + 3 * u * t * t * P[4] + t ** 3 * P[6], u ** 3 * P[1] + 3 * u * u * t * P[3] + 3 * u * t * t * P[5] + t ** 3 * P[7]);
        else push(u * u * P[0] + 2 * u * t * P[2] + t * t * P[4], u * u * P[1] + 2 * u * t * P[3] + t * t * P[5]);
      }
    } else if (s[0] === 'Z') { cur.closed = true; px = sx; py = sy; cur = null; }
  }
  return subs.filter((s) => s.pts.length > 1);
}
const polyD = (subs) => subs.map((s) => 'M' + s.pts.map((p) => `${fmt4(p.x)} ${fmt4(p.y)}`).join('L') + (s.closed ? 'Z' : '')).join('');

// ---------- Affine matrices [a, b, c, d, e, f] ----------
const M_ID = [1, 0, 0, 1, 0, 0];
const mMul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const mApply = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
const mScale = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
function parseTransform(t) {
  let m = M_ID;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let r;
  while ((r = re.exec(t || ''))) {
    const a = (r[2].match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || []).map(Number);
    let n = M_ID;
    switch (r[1]) {
      case 'matrix': if (a.length === 6) n = a; break;
      case 'translate': n = [1, 0, 0, 1, a[0] || 0, a[1] || 0]; break;
      case 'scale': n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0]; break;
      case 'rotate': {
        const q = ((a[0] || 0) * Math.PI) / 180, c = Math.cos(q), s = Math.sin(q);
        n = [c, s, -s, c, 0, 0];
        if (a.length >= 3) n = mMul(mMul([1, 0, 0, 1, a[1], a[2]], n), [1, 0, 0, 1, -a[1], -a[2]]);
        break;
      }
      case 'skewX': n = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0]; break;
      case 'skewY': n = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0]; break;
    }
    m = mMul(m, n);
  }
  return m;
}
function parseAttrs(s) {
  const out = [], re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let r;
  while ((r = re.exec(s || ''))) out.push([r[1], r[2] ?? r[3]]);
  return out;
}
const attrStr = (list) => list.map(([k, v]) => (String(v).includes('"') ? ` ${k}='${v}'` : ` ${k}="${v}"`)).join('');
const getA = (list, k) => { const f = list.find((a) => a[0] === k); return f ? f[1] : null; };
function shapeToD(tag, A) {
  const n = (k, d = 0) => parseFloat(getA(A, k) ?? d) || 0;
  switch (tag) {
    case 'path': return getA(A, 'd') || '';
    case 'rect': { const x = n('x'), y = n('y'), w = n('width'), h = n('height'); let rx = getA(A, 'rx') != null ? n('rx') : n('ry'), ry = getA(A, 'ry') != null ? n('ry') : rx; rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2); return rx || ry ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
    case 'circle': { const cx = n('cx'), cy = n('cy'), r = n('r'); return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`; }
    case 'ellipse': { const cx = n('cx'), cy = n('cy'), rx = n('rx'), ry = n('ry'); return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; }
    case 'line': return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
    case 'polyline': case 'polygon': { const p = (getA(A, 'points') || '').trim().split(/[\s,]+/).map(Number); let d = ''; for (let i = 0; i + 1 < p.length; i += 2) d += `${i ? 'L' : 'M'}${p[i]} ${p[i + 1]}`; return d + (tag === 'polygon' ? 'Z' : ''); }
  }
  return '';
}
const GEOM_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const GEOM_ATTRS = new Set(['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'pathLength']);
const PASS_TAGS = new Set(['defs', 'linearGradient', 'radialGradient', 'pattern', 'filter', 'marker', 'symbol', 'style', 'title', 'desc', 'metadata']);
const RIGID_TAGS = new Set(['text', 'image', 'use', 'foreignObject']);
function scaleStroke(A, s) {
  if (s === 1) return A;
  return A.map(([k, v]) => {
    if (k === 'stroke-width' && isFinite(parseFloat(v))) return [k, fmt4(parseFloat(v) * s)];
    if (k === 'style' && /stroke-width\s*:/.test(v)) return [k, v.replace(/stroke-width\s*:\s*([\d.]+)/, (m, w) => `stroke-width:${fmt4(+w * s)}`)];
    return [k, v];
  });
}
// Warp every shape in an SVG fragment with fn(x, y) → {x, y}. Curves are flattened into short segments,
// transforms are baked in, text and images move as rigid pieces (best-fit affine around their anchor).
function warpMarkup(markup, fn, step = 1.5) {
  const re = /<(\/?)([A-Za-z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  const stack = [{ m: M_ID, tag: '#root' }];
  let out = '', pass = 0, skipEnd = 0, r;
  const top = () => stack[stack.length - 1];
  const affineAt = (m, x, y) => { // local linearisation of fn∘m at (x, y)
    const h = 0.5, p = mApply(m, x, y), q = fn(p.x, p.y), qx = fn(p.x + h, p.y), qy = fn(p.x, p.y + h);
    const J = [(qx.x - q.x) / h, (qx.y - q.y) / h, (qy.x - q.x) / h, (qy.y - q.y) / h];
    const L = [J[0], J[1], J[2], J[3], q.x - (J[0] * p.x + J[2] * p.y), q.y - (J[1] * p.x + J[3] * p.y)];
    return mMul(L, m);
  };
  while ((r = re.exec(markup))) {
    if (r[5] !== undefined) { out += r[5]; continue; }
    const [, close, tag, attrs, self] = r;
    if (pass) { // inside defs / gradients / text etc.: copy unchanged
      out += r[0];
      if (!self && !close) pass++;
      else if (close) { pass--; if (!pass && top().rigid) { out += '</g>'; stack.pop(); } }
      continue;
    }
    if (close) {
      if (skipEnd && GEOM_TAGS.has(tag)) { skipEnd--; continue; }
      if (stack.length > 1) stack.pop();
      out += tag === 'svg' || tag === 'a' ? `</${tag === 'a' ? 'a' : 'g'}>` : `</${tag}>`;
      continue;
    }
    const A = parseAttrs(attrs), m0 = top().m;
    if (PASS_TAGS.has(tag)) { out += r[0]; if (!self) pass = 1; continue; }
    if (RIGID_TAGS.has(tag)) {
      const own = mMul(m0, parseTransform(getA(A, 'transform')));
      let ax = parseFloat(getA(A, 'x')) || 0, ay = parseFloat(getA(A, 'y')) || 0;
      if (tag === 'image' || tag === 'use' || tag === 'foreignObject') { ax += (parseFloat(getA(A, 'width')) || 0) / 2; ay += (parseFloat(getA(A, 'height')) || 0) / 2; }
      const T = affineAt(own, ax, ay).map(fmt4);
      out += `<g transform="matrix(${T.join(' ')})"><${tag}${attrStr(A.filter(([k]) => k !== 'transform'))}${self ? '/' : ''}>`;
      if (self) out += '</g>';
      else { pass = 1; stack.push({ m: m0, tag, rigid: true }); }
      continue;
    }
    if (GEOM_TAGS.has(tag)) {
      const m = mMul(m0, parseTransform(getA(A, 'transform')));
      const subs = flattenSegs(parsePathD(shapeToD(tag, A)), step / mScale(m), (x, y) => { const p = mApply(m, x, y); return fn(p.x, p.y); });
      const keep = scaleStroke(A.filter(([k]) => !GEOM_ATTRS.has(k)), mScale(m));
      out += `<path d="${polyD(subs)}"${attrStr(keep)}/>`;
      if (!self) skipEnd++;
      continue;
    }
    if (tag === 'svg') { // nested viewport (icons): viewBox → matrix
      const vb = (getA(A, 'viewBox') || '').split(/[\s,]+/).map(Number), W = parseFloat(getA(A, 'width')), H = parseFloat(getA(A, 'height'));
      let m = mMul(m0, [1, 0, 0, 1, parseFloat(getA(A, 'x')) || 0, parseFloat(getA(A, 'y')) || 0]);
      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0 && W > 0 && H > 0) {
        let sx = W / vb[2], sy = H / vb[3], tx = 0, ty = 0;
        const par = getA(A, 'preserveAspectRatio') || 'xMidYMid meet';
        if (!/none/.test(par)) { const s = /slice/.test(par) ? Math.max(sx, sy) : Math.min(sx, sy); tx = (W - vb[2] * s) / 2; ty = (H - vb[3] * s) / 2; sx = sy = s; }
        m = mMul(m, [sx, 0, 0, sy, tx - vb[0] * sx, ty - vb[1] * sy]);
      }
      const keep = A.filter(([k]) => !['x', 'y', 'width', 'height', 'viewBox', 'preserveAspectRatio', 'overflow', 'xmlns', 'xmlns:xlink'].includes(k));
      const sw = getA(A, 'stroke-width') ? scaleStroke(keep, mScale(m)) : [...keep, ['stroke-width', fmt4(mScale(m))]];
      out += `<g${attrStr(sw)}${self ? '/' : ''}>`;
      if (!self) stack.push({ m, tag });
      continue;
    }
    // g, a, clipPath, mask, switch…: bake their transform into the children.
    const m = mMul(m0, parseTransform(getA(A, 'transform')));
    const keep = A.filter(([k]) => k !== 'transform');
    out += `<${tag}${attrStr(getA(A, 'stroke-width') ? scaleStroke(keep, mScale(m)) : keep)}${self ? '/' : ''}>`;
    if (!self) stack.push({ m, tag });
  }
  return out;
}

// ---------- Warps ----------
// o.warp = { kind, amount (-1..1), corners: [[u, v] × 4] (tl, tr, br, bl; 0..1 of the box) }
const WARPS = [['', 'None'], ['arc', 'Arc'], ['arch', 'Arch (both edges)'], ['bulge', 'Bulge'], ['flag', 'Flag'], ['wave', 'Wave'], ['fisheye', 'Fish-eye'], ['twist', 'Twist'], ['squeeze', 'Squeeze'], ['rise', 'Rise'], ['free', 'Free distort (4 corners)'], ['perspective', 'Perspective (4 corners)']];
const CORNER_PRESETS = [
  ['Isometric top', (w, h) => isoCorners(w, h, (x, y) => [(x - y) * 0.866, (x + y) * 0.5])],
  ['Isometric left side', (w, h) => isoCorners(w, h, (x, y) => [x * 0.866, x * 0.5 + y])],
  ['Isometric right side', (w, h) => isoCorners(w, h, (x, y) => [x * 0.866, -x * 0.5 + y])],
  ['Floor (tilted back)', () => ({ kind: 'perspective', corners: [[0.22, 0], [0.78, 0], [1, 1], [0, 1]] })],
  ['Wall on the left', () => ({ kind: 'perspective', corners: [[0, 0], [1, 0.2], [1, 0.8], [0, 1]] })],
  ['Wall on the right', () => ({ kind: 'perspective', corners: [[0, 0.2], [1, 0], [1, 1], [0, 0.8]] })],
  ['Lean back', () => ({ kind: 'free', corners: [[0.15, 0], [1.15, 0], [1, 1], [0, 1]] })],
];
// Map the box through an affine projection; the object's box is resized to fit, so `size` is returned too.
function isoCorners(w, h, f) {
  const P = [[0, 0], [w, 0], [w, h], [0, h]].map(([x, y]) => f(x, y));
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), mx = Math.min(...xs), my = Math.min(...ys), W = Math.max(...xs) - mx || 1, H = Math.max(...ys) - my || 1;
  return { kind: 'free', corners: P.map(([x, y]) => [fmt4((x - mx) / W), fmt4((y - my) / H)]), size: [W, H] };
}
// Unit square → quad (projective). Returns (u, v) → [x, y] in corner units.
function homography(C) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = C;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, hh = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1 || 1e-9; g = (dx3 * dy2 - dx2 * dy3) / den; hh = (dx1 * dy3 - dx3 * dy1) / den; }
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return (u, v) => { const z = g * u + hh * v + 1; return [(a * u + b * v + c) / z, (d * u + e * v + f) / z]; };
}
function warpFn(o) {
  const w = o.warp, W = o.w, H = o.h, a = w.amount ?? 0.5;
  const C = w.corners || [[0, 0], [1, 0], [1, 1], [0, 1]];
  if (w.kind === 'perspective') { const hm = homography(C); return (x, y) => { const [u, v] = hm(x / W, y / H); return { x: u * W, y: v * H }; }; }
  if (w.kind === 'free') {
    return (x, y) => {
      const u = x / W, v = y / H;
      const top = [C[0][0] + (C[1][0] - C[0][0]) * u, C[0][1] + (C[1][1] - C[0][1]) * u], bot = [C[3][0] + (C[2][0] - C[3][0]) * u, C[3][1] + (C[2][1] - C[3][1]) * u];
      return { x: (top[0] + (bot[0] - top[0]) * v) * W, y: (top[1] + (bot[1] - top[1]) * v) * H };
    };
  }
  return (x, y) => {
    const u = x / W, v = y / H, s = 2 * u - 1, par = 1 - s * s;
    switch (w.kind) {
      case 'arc': return { x, y: y - a * H * 0.5 * par };
      case 'arch': return { x, y: y - a * H * 0.5 * par * (1 - v * 0.6) };
      case 'bulge': return { x, y: H / 2 + (y - H / 2) * (1 + a * par) };
      case 'flag': return { x, y: y + a * H * 0.2 * Math.sin(2 * Math.PI * u) };
      case 'wave': return { x: x + a * W * 0.05 * Math.sin(2 * Math.PI * v), y: y + a * H * 0.2 * Math.sin(2 * Math.PI * u + Math.PI * v) };
      case 'rise': return { x, y: y - a * H * 0.5 * u };
      case 'squeeze': { const t = 2 * v - 1; return { x: W / 2 + (x - W / 2) * (1 - a * 0.6 * (1 - t * t)), y }; }
      case 'fisheye': { const dx = s, dy = 2 * v - 1, r = Math.min(1, Math.hypot(dx, dy)), k = 1 + a * 0.6 * (1 - r * r); return { x: W / 2 + (x - W / 2) * k, y: H / 2 + (y - H / 2) * k }; }
      case 'twist': { const dx = x - W / 2, dy = y - H / 2, r = Math.min(1, Math.hypot(dx / (W / 2), dy / (H / 2))), q = a * Math.PI * 0.5 * (1 - r), c = Math.cos(q), sn = Math.sin(q); return { x: W / 2 + dx * c - dy * sn, y: H / 2 + dx * sn + dy * c }; }
    }
    return { x, y };
  };
}

// ---------- Cutaway / cross-section ----------
// o.cut = { kind: 'wedge' | 'line' | 'shape', cx, cy, a0, sweep (wedge, degrees; 0 = right, clockwise),
//           x1, y1, x2, y2 (line, 0..1), d (shape, local path data), rim, rimWidth, interior }
function cutterD(o) {
  const c = o.cut, W = o.w, H = o.h, R = 4 * Math.max(W, H);
  if (c.kind === 'shape') return c.d || '';
  if (c.kind === 'line') {
    const ax = c.x1 * W, ay = c.y1 * H, bx = c.x2 * W, by = c.y2 * H, dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;
    const P = [[ax - ux * R, ay - uy * R], [bx + ux * R, by + uy * R], [bx + ux * R + nx * R, by + uy * R + ny * R], [ax - ux * R + nx * R, ay - uy * R + ny * R]];
    return 'M' + P.map((p) => p.map(fmt4).join(' ')).join('L') + 'Z';
  }
  const cx = (c.cx ?? 0.5) * W, cy = (c.cy ?? 0.5) * H, a0 = ((c.a0 ?? -90) * Math.PI) / 180, sw = (Math.max(1, Math.min(359, c.sweep ?? 90)) * Math.PI) / 180;
  let d = `M${fmt4(cx)} ${fmt4(cy)}`;
  for (let i = 0; i <= 24; i++) { const t = a0 + (sw * i) / 24; d += `L${fmt4(cx + Math.cos(t) * R)} ${fmt4(cy + Math.sin(t) * R)}`; }
  return d + 'Z';
}
function cutawaySvg(o, inner) {
  const c = o.cut, d = cutterD(o);
  if (!d) return inner;
  const id = o.id, W = o.w, H = o.h, box = `x="${-3 * W}" y="${-3 * H}" width="${7 * W}" height="${7 * H}"`;
  const rimCol = c.rim === undefined ? '#5a4a42' : c.rim, rw = c.rimWidth ?? 6;
  let defs = `<mask id="ctm-${id}" maskUnits="userSpaceOnUse" ${box}><rect ${box} fill="#fff"/><path d="${d}" fill="#000"/></mask><clipPath id="ctc-${id}"><path d="${d}"/></clipPath>`;
  const needSil = (c.interior && c.interior !== 'none') || (rimCol && rimCol !== 'none' && rw > 0);
  if (needSil) defs += `<mask id="cts-${id}" maskUnits="userSpaceOnUse" ${box} style="mask-type:alpha">${inner}</mask>`;
  let s = `<defs>${defs}</defs>`;
  if (c.interior && c.interior !== 'none') s += `<g mask="url(#cts-${id})"><path d="${d}" fill="${c.interior}"/></g>`;
  s += `<g mask="url(#ctm-${id})">${inner}</g>`;
  if (rimCol && rimCol !== 'none' && rw > 0) s += `<g clip-path="url(#ctc-${id})"><g mask="url(#cts-${id})"><path d="${d}" fill="none" stroke="${rimCol}" stroke-width="${fmt4(rw * 2)}" stroke-linejoin="round"/></g></g>`;
  return s;
}

// ---------- Rectangles with a radius per corner ----------
function roundRectD(w, h, rr) {
  const lim = (r) => Math.max(0, Math.min(r || 0, w / 2, h / 2));
  const [a, b, c, d] = rr.map(lim);
  return `M${a} 0H${w - b}${b ? `A${b} ${b} 0 0 1 ${w} ${b}` : ''}V${h - c}${c ? `A${c} ${c} 0 0 1 ${w - c} ${h}` : ''}H${d}${d ? `A${d} ${d} 0 0 1 0 ${h - d}` : ''}V${a}${a ? `A${a} ${a} 0 0 1 ${a} 0` : ''}Z`;
}
const _localOutlineD5 = localOutlineD;
localOutlineD = function (o) { return o.type === 'rect' && o.radii ? roundRectD(o.w, o.h, o.radii) : _localOutlineD5(o); };

const _renderPartsD5 = renderParts;
renderParts = function (o, objects, forExport) {
  let r;
  if (o.type === 'rect' && Array.isArray(o.radii)) { // draw as a shape with a custom outline
    r = _renderPartsD5({ ...o, type: 'shape', kind: '__rr' }, objects, forExport);
  } else r = _renderPartsD5(o, objects, forExport);
  if (o.type === 'connector') return r;
  if (o.warp && o.warp.kind && o.w > 0 && o.h > 0) {
    try { r = { ...r, inner: warpMarkup(r.inner, warpFn(o), Math.max(0.6, Math.max(o.w, o.h) / 220)) }; } catch (e) { console.warn('warp failed', e); }
  }
  if (o.cut && o.cut.kind) r = { ...r, inner: cutawaySvg(o, r.inner) };
  return r;
};
const _shapePathD5 = shapePath;
shapePath = function (kind, w, h) {
  if (kind === '__rr' && shapePath._rr) return roundRectD(w, h, shapePath._rr);
  return _shapePathD5(kind, w, h);
};
// The radii travel with the fake shape through a short-lived slot (shapePath only gets kind, w and h).
const _renderPartsD5b = renderParts;
renderParts = function (o, objects, forExport) {
  if (o.type === 'rect' && Array.isArray(o.radii)) { const prev = shapePath._rr; shapePath._rr = o.radii; try { return _renderPartsD5b(o, objects, forExport); } finally { shapePath._rr = prev; } }
  return _renderPartsD5b(o, objects, forExport);
};
STYLE_SETS.rect.push('radii');
const _canConvertD5 = canConvertToPath;
canConvertToPath = function (o) { return !(o.type === 'rect' && o.radii) && _canConvertD5(o); };
STYLE_SETS.common.push('warp');

// ---------- Warp and cutaway: commands, handles, panels ----------
function applyCornerPreset(o, i) {
  const pr = CORNER_PRESETS[i][1](o.w, o.h);
  checkpoint();
  if (pr.size) { const c = center(o); o.w = pr.size[0]; o.h = pr.size[1]; o.x = c.x - o.w / 2; o.y = c.y - o.h / 2; if (o.type === 'group') { /* group content scales with its box */ } }
  o.warp = { kind: pr.kind, corners: pr.corners };
  render({ props: true });
}
function editWarpCorners(o) {
  if (!o.warp || !['free', 'perspective'].includes(o.warp.kind)) { checkpoint(); o.warp = { kind: 'perspective', corners: [[0, 0], [1, 0], [1, 1], [0, 1]] }; render({ props: true }); }
  const w = o.warp;
  w.corners = w.corners || [[0, 0], [1, 0], [1, 1], [0, 1]];
  startHandles({
    hint: 'Drag the four corners. Enter or Esc when done',
    handles: () => w.corners.map(([u, v], i) => ({ id: String(i), ...localToPage(o, { x: u * o.w, y: v * o.h }) })),
    lines: (z) => { const P = w.corners.map(([u, v]) => localToPage(o, { x: u * o.w, y: v * o.h })); return `<path d="M${P.map((p) => `${p.x} ${p.y}`).join('L')}Z" fill="none" stroke="#3b6fd6" stroke-width="${1.4 / z}" stroke-dasharray="${5 / z} ${3 / z}"/>`; },
    drag: (id, p) => { const q = worldToLocal(o, p); w.corners[+id] = [fmt4(q.x / o.w), fmt4(q.y / o.h)]; },
  });
}
function warpSection(o) {
  const w = o.warp || {}, set = (k, v) => { checkpoint('warp' + o.id + k); o.warp = { ...(o.warp || {}), [k]: v }; if (k === 'kind' && !v) delete o.warp; renderScene(); renderOverlay(); markDirty(); if (k === 'kind') renderProps(); };
  return sect('Warp & perspective',
    row('Warp', el('select', { onchange: (e) => { const v = e.target.value; if (['free', 'perspective'].includes(v)) { checkpoint(); o.warp = { kind: v, corners: (o.warp && o.warp.corners) || [[0, 0], [1, 0], [1, 1], [0, 1]] }; render({ props: true }); editWarpCorners(o); } else set('kind', v); } }, ...WARPS.map(([v, l]) => el('option', { value: v, textContent: l, selected: (w.kind || '') === v })))),
    w.kind && !['free', 'perspective'].includes(w.kind) ? row('Amount', el('input', { type: 'range', min: -1, max: 1, step: 0.05, value: w.amount ?? 0.5, oninput: (e) => set('amount', +e.target.value) })) : null,
    row('3-D plane', el('select', { onchange: (e) => { if (e.target.value !== '') applyCornerPreset(o, +e.target.value); } }, el('option', { value: '', textContent: 'Place on a plane…' }), ...CORNER_PRESETS.map(([n], i) => el('option', { value: i, textContent: n })))),
    el('div', { class: 'btnrow' }, btn('Edit corners on canvas', () => editWarpCorners(o)), w.kind ? btn('Remove warp', () => { checkpoint(); delete o.warp; render({ props: true }); }) : null),
    el('div', { class: 'note', textContent: 'Warps stay editable. Isometric planes turn a well plate, tissue section or membrane into a 3-D-looking face; View › Isometric Grid helps line them up. Text and photos move with the plane as rigid pieces.' }));
}
function startCutaway(kind) {
  const sel = selected();
  if (kind === 'shape') {
    const cutter = sel.length === 2 ? sel[sel.length - 1] : null, o = sel.length === 2 ? sel[0] : null;
    const d = cutter && localOutlineD(cutter);
    if (!o || !d) { toast('Select the object, then a closed shape on top of it to use as the cut, and choose this again'); return; }
    checkpoint();
    const subs = flattenSegs(parsePathD(d), 1, (x, y) => { const p = localToPage(cutter, { x, y }), q = worldToLocal(o, p); return q; });
    o.cut = { kind: 'shape', d: polyD(subs.map((s) => ({ ...s, closed: true }))) };
    page().objects = objs().filter((x) => x !== cutter);
    state.sel = [o.id];
    render({ props: true });
    return;
  }
  const o = sel[0];
  if (!o || sel.length !== 1 || o.type === 'connector') { toast('Select one object (a cell, organ, tumour or group) to cut away'); return; }
  checkpoint();
  o.cut = kind === 'line' ? { kind, x1: 0.5, y1: 0, x2: 0.5, y2: 1 } : { kind: 'wedge', cx: 0.5, cy: 0.5, a0: -90, sweep: 90 };
  render({ props: true });
  editCutOnCanvas(o);
}
function editCutOnCanvas(o) {
  const c = o.cut;
  if (!c || c.kind === 'shape') return;
  const P = (u, v) => localToPage(o, { x: u * o.w, y: v * o.h });
  const r0 = 0.42;
  startHandles({
    hint: c.kind === 'line' ? 'Drag the two ends of the cut line. Enter or Esc when done' : 'Drag the centre and the two edges of the wedge. Enter or Esc when done',
    handles: () => {
      if (c.kind === 'line') return [{ id: 'a', ...P(c.x1, c.y1) }, { id: 'b', ...P(c.x2, c.y2) }];
      const a = (c.a0 * Math.PI) / 180, b = ((c.a0 + c.sweep) * Math.PI) / 180;
      return [{ id: 'c', ...P(c.cx, c.cy), color: '#e8743b' }, { id: 'e1', ...P(c.cx + Math.cos(a) * r0, c.cy + Math.sin(a) * r0) }, { id: 'e2', ...P(c.cx + Math.cos(b) * r0, c.cy + Math.sin(b) * r0) }];
    },
    lines: (z) => { const hs = handleMode.handles(); return hs.length === 2 ? `<line x1="${hs[0].x}" y1="${hs[0].y}" x2="${hs[1].x}" y2="${hs[1].y}" stroke="#e8743b" stroke-width="${1.4 / z}"/>` : `<path d="M${hs[1].x} ${hs[1].y}L${hs[0].x} ${hs[0].y}L${hs[2].x} ${hs[2].y}" fill="none" stroke="#e8743b" stroke-width="${1.4 / z}"/>`; },
    drag: (id, p) => {
      const q = worldToLocal(o, p), u = fmt4(q.x / o.w), v = fmt4(q.y / o.h);
      if (id === 'a') { c.x1 = u; c.y1 = v; } else if (id === 'b') { c.x2 = u; c.y2 = v; } else if (id === 'c') { c.cx = u; c.cy = v; }
      else {
        const ang = (Math.atan2(v - c.cy, u - c.cx) * 180) / Math.PI;
        if (id === 'e1') { const end = c.a0 + c.sweep; c.a0 = Math.round(ang); c.sweep = ((end - c.a0) % 360 + 360) % 360 || 360; } else c.sweep = Math.round(((ang - c.a0) % 360 + 360) % 360) || 1;
      }
    },
  });
}
function cutSection(o) {
  const c = o.cut, set = (k, v) => { checkpoint('cut' + o.id + k); c[k] = v; renderScene(); markDirty(); };
  return sect('Cutaway',
    el('div', { class: 'note', textContent: c.kind === 'wedge' ? 'A wedge is cut out so the layers inside show.' : c.kind === 'line' ? 'Everything on one side of the line is cut away.' : 'Cut along your own shape.' }),
    row('Cut face', el('input', { type: 'color', value: toHex(c.rim === undefined ? '#5a4a42' : c.rim === 'none' ? '#5a4a42' : c.rim), oninput: (e) => set('rim', e.target.value) }), btn(c.rim === 'none' ? 'Show' : 'Hide', () => { set('rim', c.rim === 'none' ? '#5a4a42' : 'none'); renderProps(); })),
    row('Face width', el('input', { type: 'range', min: 0, max: 30, step: 0.5, value: c.rimWidth ?? 6, oninput: (e) => set('rimWidth', +e.target.value) })),
    row('Inside colour', el('input', { type: 'color', value: toHex(c.interior && c.interior !== 'none' ? c.interior : '#f6e7d8'), oninput: (e) => set('interior', e.target.value) }), btn(c.interior && c.interior !== 'none' ? 'Clear' : 'Fill', () => { set('interior', c.interior && c.interior !== 'none' ? 'none' : '#f6e7d8'); renderProps(); })),
    el('div', { class: 'note', textContent: 'Leave “Inside” clear to see the objects behind (put the nucleus and organelles underneath).' }),
    el('div', { class: 'btnrow' }, c.kind !== 'shape' ? btn('Edit cut on canvas', () => editCutOnCanvas(o), 'primary') : null, btn('Remove cutaway', () => { checkpoint(); delete o.cut; render({ props: true }); }, 'danger')));
}

// ---------- Isometric grid (View menu) ----------
const _renderOverlayD5 = renderOverlay;
renderOverlay = function (extra = '') {
  let g = '';
  if (state.view.isoGrid) {
    const p = page(), s = state.view.isoSize || 40, z = state.zoom, t = Math.tan(Math.PI / 6), W = p.width, H = p.height;
    let d = '';
    for (let x = 0; x <= W; x += s * 0.866 * 2) d += `M${fmt4(x)} 0V${H}`;
    for (let c = -W * t; c <= H + W * t; c += s) { d += `M0 ${fmt4(c)}L${W} ${fmt4(c + W * t)}`; d += `M0 ${fmt4(c)}L${W} ${fmt4(c - W * t)}`; }
    g = `<defs><clipPath id="isoClip"><rect width="${W}" height="${H}"/></clipPath></defs><path d="${d}" clip-path="url(#isoClip)" stroke="#8fb3ea" stroke-opacity=".55" stroke-width="${0.8 / z}" fill="none" pointer-events="none"/>`;
  }
  return _renderOverlayD5(g + extra);
};

// ---------- Path tools ----------
// Rings of a closed object (or the polyline of an open drawing) in page coordinates.
function pageRings(o, step = 1) {
  const d = o.type === 'path' ? nodesToD(scaledNodes(o), o.closed) : localOutlineD(o);
  if (!d) return [];
  return flattenSegs(parsePathD(d), step, (x, y) => localToPage(o, { x, y }));
}
const ring = (pts) => { const r = pts.map((p) => [p.x, p.y]); if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0]); return r; };
// Discs are circumscribed and turned by half a step so their corners never sit exactly on a band's corners
// (coincident points upset the sweep-line in polygon-clipping).
function circlePoly(x, y, r, n = 18) { const out = [], R = r / Math.cos(Math.PI / n); for (let i = 0; i <= n; i++) { const a = ((i + 0.5) / n) * 2 * Math.PI; out.push([x + Math.cos(a) * R, y + Math.sin(a) * R]); } out[n] = out[0]; return [out]; }
// Round-joined band around a polyline: union of one quad per segment and a disc at every vertex.
function bandPolys(pts, rAt, caps = true) {
  const polys = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-6) continue;
    const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L, ra = rAt(i), rb = rAt(i + 1);
    polys.push([[[a.x + nx * ra, a.y + ny * ra], [b.x + nx * rb, b.y + ny * rb], [b.x - nx * rb, b.y - ny * rb], [a.x - nx * ra, a.y - ny * ra], [a.x + nx * ra, a.y + ny * ra]]]);
  }
  pts.forEach((p, i) => { if ((i > 0 && i < pts.length - 1) || caps) { const r = rAt(i); if (r > 0.05) polys.push(circlePoly(p.x, p.y, r, r > 8 ? 24 : 14)); } });
  return polys;
}
const roundGeom = (g, k = 1000) => { // accepts a polygon ([ring…]) or a multipolygon ([[ring…]…])
  const rr = (ring) => ring.map(([x, y]) => [Math.round(x * k) / k, Math.round(y * k) / k]);
  return g.length && typeof g[0][0][0] === 'number' ? g.map(rr) : g.map((poly) => poly.map(rr));
};
function clipSafe(op, ...args) { // retry once on coarser coordinates if the sweep-line trips on near-coincident points
  try { return polygonClipping[op](...args.map((g) => roundGeom(g))); } catch { return polygonClipping[op](...args.map((g) => roundGeom(g, 50))); }
}
function unionAll(polys) { // pairwise to keep each union small
  let list = polys.filter((p) => p && p.length).map((p) => roundGeom(p));
  while (list.length > 1) { const next = []; for (let i = 0; i < list.length; i += 2) next.push(i + 1 < list.length ? clipSafe('union', list[i], list[i + 1]) : list[i]); list = next; }
  return list[0] || [];
}
function offsetGeom(rings, dist, closed) {
  const thin = rings.map((r) => ({ ...r, pts: simplify(r.pts, Math.min(0.4, Math.abs(dist) / 10)) }));
  const band = unionAll(thin.flatMap((r) => bandPolys(r.closed ? [...r.pts, r.pts[0]] : r.pts, () => Math.abs(dist), true)));
  if (!closed) return band;
  let base = [];
  for (const r of thin) base = base.length ? clipSafe('xor', base, [ring(r.pts)]) : [[ring(r.pts)]];
  return clipSafe(dist >= 0 ? 'union' : 'difference', base, band);
}
function offsetSelection(dist, keep = true) {
  if (typeof polygonClipping === 'undefined') return;
  const sel = selected().filter((o) => o.type === 'path' || localOutlineD(o));
  if (!sel.length) { toast('Select a drawing or closed shape'); return; }
  checkpoint();
  const made = [];
  for (const o of sel) {
    const closed = o.type === 'path' ? o.closed : true, geom = offsetGeom(pageRings(o, 1), dist, closed);
    const style = closed ? { ...o, fill: o.fill, stroke: o.stroke } : { ...o, fill: o.stroke && o.stroke !== 'none' ? o.stroke : '#888888', stroke: 'none' };
    const p = geom.length && geomToPath(geom, { ...style, name: `${o.name || layerName(o)} (offset ${dist > 0 ? '+' : ''}${dist})` });
    if (!p) continue;
    if (closed && dist > 0) p.fill = Color.light(normHex(o.fill) || '#9bc4f0', 0.4);
    const list = objs(), i = list.indexOf(o);
    if (!keep) list.splice(i, 1, p); else list.splice(dist > 0 ? i : i + 1, 0, p);
    made.push(p);
  }
  state.sel = made.map((p) => p.id);
  render({ props: true });
  toast(made.length ? `Offset path: ${made.length} new shape${made.length === 1 ? '' : 's'}` : 'Nothing to offset');
}
function openOffsetDialog() {
  if (!selected().length) { toast('Select a drawing or closed shape first'); return; }
  const d = el('input', { type: 'number', value: 8, step: 1 }), keep = el('input', { type: 'checkbox', checked: true });
  openModal('Offset path', el('div', {},
    el('div', { class: 'note', textContent: 'Positive distances grow the shape outward (a halo, periplasm or outer membrane); negative ones shrink it inward (an inner membrane or nuclear envelope). Open drawings become a band of that half-width.' }),
    field('Distance (px)', d), field('Keep original', keep),
    el('div', { class: 'btnrow' }, btn('Offset', () => { const v = +d.value; closeModal(); if (v) offsetSelection(v, keep.checked); }, 'primary'))));
}
function outlineStroke() {
  if (typeof polygonClipping === 'undefined') return;
  const sel = selected().filter((o) => o.type === 'path' && o.stroke && o.stroke !== 'none');
  if (!sel.length) { toast('Select a drawing with a visible outline or line'); return; }
  checkpoint();
  const made = [];
  for (const o of sel) {
    const subs = pageRings(o, Math.max(0.6, (o.strokeWidth || 2) / 4)), sw = (o.strokeWidth || 2) / 2;
    const prof = typeof widthAt === 'function' && o.widthProfile;
    const polys = subs.flatMap((r) => {
      const pts = r.closed ? [...r.pts, r.pts[0]] : r.pts, n = pts.length - 1 || 1;
      return bandPolys(pts, (i) => (prof ? (o.strokeWidth || 2) * Math.max(0.02, widthAt(o, i / n)) / 2 : sw), r.closed || o.cap !== 'butt');
    });
    const p = geomToPath(unionAll(polys), { fill: o.stroke, stroke: 'none', strokeWidth: 0, opacity: o.opacity, name: `${o.name || 'Line'} (outlined)` });
    if (!p) continue;
    const list = objs();
    list.splice(list.indexOf(o), 1, p);
    if (o.closed && o.fill && o.fill !== 'none') list.splice(list.indexOf(p), 0, { ...deep(o), id: uid(), stroke: 'none' });
    made.push(p);
  }
  state.sel = made.map((p) => p.id);
  render({ props: true });
  toast('Outline stroke: the line is now a filled shape you can edit point by point');
}
// Path nodes in page coordinates and back.
function worldNodes(o) {
  return scaledNodes(o).map((n) => {
    const P = (x, y) => localToPage(o, { x, y }), q = P(n.x, n.y), out = { x: q.x, y: q.y };
    if (n.ix != null) { const h = P(n.ix, n.iy); out.ix = h.x; out.iy = h.y; }
    if (n.ox != null) { const h = P(n.ox, n.oy); out.ox = h.x; out.oy = h.y; }
    if (n.move) out.move = true;
    return out;
  });
}
const styleOfPath = (o) => Object.fromEntries(['fill', 'fill2', 'fillSpec', 'pattern', 'shade', 'stroke', 'strokeWidth', 'dash', 'dashStyle', 'cap', 'tube', 'tubeOutline', 'opacity', 'headEnd', 'headStart', 'widthProfile', 'name'].filter((k) => o[k] !== undefined).map((k) => [k, deep(o[k])]));
const reverseNodes = (ns) => ns.slice().reverse().map((n) => { const m = { x: n.x, y: n.y }; if (n.ox != null) { m.ix = n.ox; m.iy = n.oy; } if (n.ix != null) { m.ox = n.ix; m.oy = n.iy; } return m; });
function splitCubic(a, b, t) { // de Casteljau on the segment a → b (node handles)
  const p0 = [a.x, a.y], p1 = [a.ox ?? a.x, a.oy ?? a.y], p2 = [b.ix ?? b.x, b.iy ?? b.y], p3 = [b.x, b.y];
  const lp = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const q0 = lp(p0, p1), q1 = lp(p1, p2), q2 = lp(p2, p3), r0 = lp(q0, q1), r1 = lp(q1, q2), s = lp(r0, r1);
  const curved = a.ox != null || b.ix != null;
  return { a: curved ? { ...a, ox: q0[0], oy: q0[1] } : a, mid: curved ? { x: s[0], y: s[1], ix: r0[0], iy: r0[1], ox: r1[0], oy: r1[1] } : { x: s[0], y: s[1] }, b: curved ? { ...b, ix: q2[0], iy: q2[1] } : b };
}
function nearestOnPath(ns, closed, p) {
  let best = null;
  const segs = ns.length - (closed ? 0 : 1);
  for (let i = 0; i < segs; i++) {
    const a = ns[i], b = ns[(i + 1) % ns.length];
    if (b.move) continue;
    for (let k = 0; k <= 40; k++) {
      const t = k / 40, s = splitCubic(a, b, t).mid, d = Math.hypot(s.x - p.x, s.y - p.y);
      if (!best || d < best.d) best = { i, t, d };
    }
  }
  return best;
}
// Cut a drawing at a point (page coordinates). Closed → opened there; open → two drawings.
function cutPathAt(o, p) {
  const ns = worldNodes(o), hit = nearestOnPath(ns, o.closed, p);
  if (!hit || ns.some((n) => n.move)) return null;
  const t = Math.min(0.999, Math.max(0.001, hit.t)), j = (hit.i + 1) % ns.length;
  const sp = splitCubic(ns[hit.i], ns[j], t);
  const before = ns.slice(0, hit.i);
  const st = styleOfPath(o);
  if (o.closed) {
    const N = ns.length, mid = sp.mid;
    const seq = [{ x: mid.x, y: mid.y, ...(mid.ox != null ? { ox: mid.ox, oy: mid.oy } : {}) }];
    for (let s = 0; s < N; s++) { const k = (j + s) % N; seq.push(k === j ? sp.b : k === hit.i ? sp.a : ns[k]); if (k === hit.i) break; }
    seq.push({ x: mid.x, y: mid.y, ...(mid.ix != null ? { ix: mid.ix, iy: mid.iy } : {}) });
    return [makePathFromNodes(seq, { ...st, closed: false, fill: 'none', stroke: st.stroke && st.stroke !== 'none' ? st.stroke : Color.dark(normHex(st.fill) || '#888888', 0.3) })];
  }
  const m1 = { x: sp.mid.x, y: sp.mid.y, ...(sp.mid.ix != null ? { ix: sp.mid.ix, iy: sp.mid.iy } : {}) }, m2 = { x: sp.mid.x, y: sp.mid.y, ...(sp.mid.ox != null ? { ox: sp.mid.ox, oy: sp.mid.oy } : {}) };
  return [makePathFromNodes([...before, sp.a, m1], { ...st, headEnd: 'none' }), makePathFromNodes([m2, sp.b, ...ns.slice(j + 1)], { ...st, headStart: 'none' })];
}
function joinPaths(a, b) {
  const A = worldNodes(a), B = worldNodes(b), d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  const opts = [[A, B, d(A[A.length - 1], B[0])], [A, reverseNodes(B), d(A[A.length - 1], B[B.length - 1])], [reverseNodes(A), B, d(A[0], B[0])], [reverseNodes(A), reverseNodes(B), d(A[0], B[B.length - 1])]];
  const [P, Q, gap] = opts.sort((x, y) => x[2] - y[2])[0];
  let nodes;
  if (gap < 1.5) { const last = { ...P[P.length - 1] }; if (Q[0].ox != null) { last.ox = Q[0].ox; last.oy = Q[0].oy; } nodes = [...P.slice(0, -1), last, ...Q.slice(1)]; } else nodes = [...P, ...Q];
  return makePathFromNodes(nodes, { ...styleOfPath(a), closed: false });
}
function joinSelection() {
  const sel = selected().filter((o) => o.type === 'path' && !o.closed);
  if (sel.length === 1) { checkpoint(); sel[0].closed = true; postEdit(sel[0]); render({ props: true }); toast('Path closed'); return; }
  if (sel.length !== 2) { toast('Select two open drawings to join (or one to close it)'); return; }
  checkpoint();
  const j = joinPaths(sel[0], sel[1]), list = objs(), i = list.indexOf(sel[0]);
  page().objects = list.filter((o) => !sel.includes(o));
  page().objects.splice(Math.min(i, page().objects.length), 0, j);
  state.sel = [j.id];
  render({ props: true });
  toast('Joined into one drawing');
}
function simplifyPath(o, strength = 1) {
  if (o.type !== 'path' || o.nodes.some((n) => n.move)) return false;
  const pts = flattenNodes(o.nodes, o.closed), diag = Math.hypot(o.w0 || o.w, o.h0 || o.h);
  const keep = simplify(o.closed ? [...pts, pts[0]] : pts, Math.max(0.5, diag * 0.012 * strength));
  const anchors = o.closed ? keep.slice(0, -1) : keep;
  if (anchors.length < (o.closed ? 3 : 2) || anchors.length >= o.nodes.length) return false;
  o.nodes = smoothNodes(anchors, o.closed);
  refitPath(o);
  return true;
}
function smoothPath(o) {
  if (o.type !== 'path' || o.nodes.some((n) => n.move)) return false;
  o.nodes = smoothNodes(o.nodes.map((n) => ({ x: n.x, y: n.y })), o.closed);
  refitPath(o);
  return true;
}
// Replace sharp corner nodes by short curves of the given radius (page px).
function roundPathCorners(o, r) {
  if (o.type !== 'path' || o.nodes.some((n) => n.move)) return false;
  const sx = o.w / (o.w0 || o.w), sy = o.h / (o.h0 || o.h), ns = o.nodes, n = ns.length, out = [];
  let changed = false;
  ns.forEach((p, i) => {
    const sharp = p.ix == null && p.ox == null && (o.closed || (i > 0 && i < n - 1));
    if (!sharp) { out.push(p); return; }
    const a = ns[(i - 1 + n) % n], b = ns[(i + 1) % n];
    const da = Math.hypot((a.x - p.x) * sx, (a.y - p.y) * sy), db = Math.hypot((b.x - p.x) * sx, (b.y - p.y) * sy), rr = Math.min(r, da / 2, db / 2);
    if (rr < 0.5) { out.push(p); return; }
    const ua = { x: (a.x - p.x) * (rr / da), y: (a.y - p.y) * (rr / da) }, ub = { x: (b.x - p.x) * (rr / db), y: (b.y - p.y) * (rr / db) }, k = 0.45;
    out.push({ x: p.x + ua.x, y: p.y + ua.y, ox: p.x + ua.x * k, oy: p.y + ua.y * k }, { x: p.x + ub.x, y: p.y + ub.y, ix: p.x + ub.x * k, iy: p.y + ub.y * k });
    changed = true;
  });
  if (changed) { o.nodes = out; refitPath(o); }
  return changed;
}
function pathToolCmd(kind) {
  const sel = selected();
  let n = 0;
  checkpoint();
  for (let o of sel) {
    if (o.type !== 'path' && canConvertToPath(o) && kind === 'round') { const i = objs().indexOf(o); objs()[i] = o = convertToPath(o); }
    if (kind === 'simplify' && simplifyPath(o)) n++;
    if (kind === 'smooth' && smoothPath(o)) n++;
    if (kind === 'round' && roundPathCorners(o, state.view.roundRadius || 12)) n++;
  }
  render({ props: true });
  toast(n ? { simplify: 'Fewer points, same shape', smooth: 'Points smoothed', round: 'Corners rounded' }[kind] : 'Select a drawing (or a polygon shape for rounding)');
}

// Knife (drag across shapes to cut them apart) and scissors (click a drawing to cut it there).
let cutTool = null;
function startKnife() { cutTool = { kind: 'knife', pts: [] }; toast('Knife: drag across shapes to cut them apart. Esc to stop', 5000); stage.style.cursor = 'crosshair'; }
function startScissors() { cutTool = { kind: 'scissors' }; toast('Scissors: click on a drawing’s outline to cut it there. Esc to stop', 5000); stage.style.cursor = 'crosshair'; }
function stopCutTool() { cutTool = null; stage.style.cursor = ''; $('#guides').innerHTML = ''; }
function knifeCut(line) {
  if (typeof polygonClipping === 'undefined' || line.length < 2) return 0;
  const band = unionAll(bandPolys(line, () => 0.35, true));
  const sel = new Set(state.sel), list = objs();
  const targets = list.filter((o) => !o.locked && !o.hidden && localOutlineD(o) && (!sel.size || sel.has(o.id)));
  let n = 0;
  for (const o of targets) {
    const G = objectGeom(o);
    if (!G) continue;
    const pieces = clipSafe('difference', G, band);
    if (pieces.length < 2) continue;
    const out = pieces.map((poly, k) => geomToPath([poly], { ...o, name: `${o.name || layerName(o)} ${k + 1}` })).filter(Boolean);
    out.forEach((p) => { if (o.fillSpec) p.fillSpec = deep(o.fillSpec); if (o.pattern) p.pattern = deep(o.pattern); });
    const i = page().objects.indexOf(o);
    page().objects.splice(i, 1, ...out);
    n++;
  }
  return n;
}
svg.addEventListener('pointerdown', (e) => {
  if (!cutTool || e.button !== 0) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const p = toWorld(e);
  if (cutTool.kind === 'knife') { cutTool.pts = [p]; return; }
  const g = e.target.closest && e.target.closest('#scene > g[data-id]'), o = g && byId(g.dataset.id);
  let target = o;
  if (target && target.type !== 'path' && canConvertToPath(target)) { checkpoint(); const i = objs().indexOf(target); objs()[i] = target = convertToPath(target); }
  if (!target || target.type !== 'path') { toast('Click on a drawing (or a rectangle, ellipse or polygon)'); return; }
  checkpoint();
  const parts = cutPathAt(target, p);
  if (!parts) { toast('That drawing has several parts; ungroup or simplify it first'); return; }
  const list = objs();
  list.splice(list.indexOf(target), 1, ...parts);
  state.sel = parts.map((x) => x.id);
  render({ props: true });
  toast(parts.length === 2 ? 'Cut into two drawings' : 'Opened the shape at that point');
}, true);
svg.addEventListener('pointermove', (e) => {
  if (!cutTool || cutTool.kind !== 'knife' || !cutTool.pts.length || !(e.buttons & 1)) return;
  e.stopImmediatePropagation();
  cutTool.pts.push(toWorld(e));
  $('#guides').innerHTML = `<polyline points="${cutTool.pts.map((q) => `${q.x},${q.y}`).join(' ')}" fill="none" stroke="#d64545" stroke-width="${1.5 / state.zoom}" stroke-dasharray="${4 / state.zoom}"/>`;
}, true);
window.addEventListener('pointerup', () => {
  if (!cutTool || cutTool.kind !== 'knife' || cutTool.pts.length < 2) return;
  checkpoint();
  const n = knifeCut(simplify(cutTool.pts, 1));
  cutTool.pts = [];
  $('#guides').innerHTML = '';
  render({ props: true });
  toast(n ? `Cut ${n} shape${n === 1 ? '' : 's'}` : 'The knife line has to cross a closed shape completely');
}, true);
window.addEventListener('keydown', (e) => { if (cutTool && e.key === 'Escape') { e.stopImmediatePropagation(); stopCutTool(); } }, true);

function pathToolsSection(o) {
  const tools = [];
  if (o.type === 'path') tools.push(btn('Simplify', () => pathToolCmd('simplify')), btn('Smooth', () => pathToolCmd('smooth')), btn('Scissors', startScissors));
  if (o.type === 'path' && !o.closed) tools.push(btn('Outline stroke', outlineStroke), btn('Close path', joinSelection));
  tools.push(btn('Offset path…', openOffsetDialog), btn('Knife', startKnife));
  const rr = el('input', { type: 'number', min: 1, step: 1, value: state.view.roundRadius || 12, style: 'width:60px', oninput: (e) => { state.view.roundRadius = Math.max(1, +e.target.value || 12); } });
  return sect('Path tools', el('div', { class: 'btnrow' }, ...tools),
    o.type !== 'rect' && (o.type === 'path' || canConvertToPath(o)) ? row('Round corners', rr, btn('Round', () => pathToolCmd('round'))) : null);
}
function cornerRadiiRow(o) {
  const r = o.radii || [o.radius || 0, o.radius || 0, o.radius || 0, o.radius || 0];
  const set = (i, v) => { checkpoint('radii' + o.id); const n = [...(o.radii || r)]; n[i] = Math.max(0, v); o.radii = n; renderScene(); markDirty(); };
  return el('div', {}, row('Corners', ...['↖', '↗', '↘', '↙'].map((t, i) => el('input', { type: 'number', min: 0, step: 1, value: r[i], title: `Corner ${t}`, style: 'width:48px', oninput: (e) => set(i, +e.target.value || 0) }))),
    o.radii ? btn('Same radius on all corners', () => { checkpoint(); o.radius = o.radii[0]; delete o.radii; render({ props: true }); }) : null);
}
const _renderPropsD5 = renderProps;
renderProps = function () {
  _renderPropsD5();
  const sel = selected(), P = $('#props');
  if (sel.length !== 1) {
    if (sel.length === 2 && sel.every((o) => o.type === 'path' && !o.closed)) P.append(sect('Path tools', el('div', { class: 'btnrow' }, btn('Join paths', joinSelection), btn('Knife', startKnife))));
    if (sel.length === 2 && localOutlineD(sel[1])) P.append(sect('Cutaway', el('div', { class: 'btnrow' }, btn('Cut away with the top shape', () => startCutaway('shape')))));
    return;
  }
  const o = sel[0];
  if (o.type === 'connector') return;
  if (o.type === 'rect') { const st = [...P.querySelectorAll('.sect')].find((x) => x.querySelector('h3')?.textContent === 'Style'); if (st) st.append(cornerRadiiRow(o)); }
  if (o.type === 'path' || localOutlineD(o)) placeSection(P, SECTION_CHAIN, pathToolsSection(o));
  placeSection(P, SECTION_CHAIN, warpSection(o));
  placeSection(P, SECTION_CHAIN, o.cut ? cutSection(o) : sect('Cutaway', el('div', { class: 'note', textContent: 'Slice a cell, organ, tumour or tissue block to show the layers inside.' }), el('div', { class: 'btnrow' }, btn('Wedge cut', () => startCutaway('wedge')), btn('Straight cut', () => startCutaway('line')))));
};

Object.assign(ARRANGE_COMMANDS, {
  offsetPath: openOffsetDialog, outlineStroke, knifeTool: startKnife, scissorsTool: startScissors, joinPaths: joinSelection,
  simplifyPath: () => pathToolCmd('simplify'), smoothPath: () => pathToolCmd('smooth'), roundCorners: () => pathToolCmd('round'),
  warpCorners: () => { const o = selected()[0]; if (o) editWarpCorners(o); else toast('Select an object to distort'); },
  isoTop: () => { const o = selected()[0]; if (o) applyCornerPreset(o, 0); }, isoLeft: () => { const o = selected()[0]; if (o) applyCornerPreset(o, 1); }, isoRight: () => { const o = selected()[0]; if (o) applyCornerPreset(o, 2); },
  removeWarp: () => { const s = selected().filter((o) => o.warp); if (!s.length) return; checkpoint(); s.forEach((o) => delete o.warp); render({ props: true }); },
  toggleIsoGrid: () => { state.view.isoGrid = !state.view.isoGrid; renderOverlay(); toast(state.view.isoGrid ? 'Isometric grid on' : 'Isometric grid off'); },
  cutWedge: () => startCutaway('wedge'), cutLine: () => startCutaway('line'), cutShape: () => startCutaway('shape'),
  removeCut: () => { const s = selected().filter((o) => o.cut); if (!s.length) return; checkpoint(); s.forEach((o) => delete o.cut); render({ props: true }); },
});
