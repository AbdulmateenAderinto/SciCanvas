// Line tools (v1.3): everything a connector can do beyond a plain arrow.
// - Bend points (drag the small circles on a selected line), automatic routing around objects, line jumps where
//   lines cross, offset two-way arrows, feedback / self loops, ends glued anywhere on an object's edge, and lines
//   that branch from or merge into other lines (drop an end onto a line).
// - Reaction arrows with side reagents (ATP → ADP on a curved side arrow) and labels above / below the line.
// - Dimension and scale lines, timeline arrows with ticks and labels, wide tapered flow arrows, gradient lines and
//   double / wavy / zigzag line styles.
// - SBGN arcs and glyphs, an automatic line legend, an offline LaTeX equation editor (MathJax) and a gene / protein
//   name styling review.
// A connector that uses none of this is drawn by render.js exactly as before.
(() => {
  // ---------- small geometry helpers ----------
  const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const r2 = (n) => Math.round(n * 100) / 100;
  const ptsD = (P) => 'M' + P.map((q) => `${r2(q.x)} ${r2(q.y)}`).join(' L');
  function polyLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]); return L; }
  // Point and unit tangent at distance s along a polyline.
  function along(P, s) {
    if (P.length < 2) return { x: P[0].x, y: P[0].y, tx: 1, ty: 0 };
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const l = dist(P[i - 1], P[i]);
      if (!l) continue;
      if (acc + l >= s || i === P.length - 1) {
        const t = Math.max(0, Math.min(1, (s - acc) / l)), q = lerp(P[i - 1], P[i], t);
        return { x: q.x, y: q.y, tx: (P[i].x - P[i - 1].x) / l, ty: (P[i].y - P[i - 1].y) / l };
      }
      acc += l;
    }
    const a = P[P.length - 2], b = P[P.length - 1], l = dist(a, b) || 1;
    return { x: b.x, y: b.y, tx: (b.x - a.x) / l, ty: (b.y - a.y) / l };
  }
  // The polyline between distances s0 and s1.
  function slice(P, s0, s1) {
    const out = [], A = along(P, s0);
    out.push({ x: A.x, y: A.y });
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      acc += dist(P[i - 1], P[i]);
      if (acc > s0 && acc < s1) out.push(P[i]);
    }
    const B = along(P, s1);
    out.push({ x: B.x, y: B.y });
    return out;
  }
  // Evenly spaced samples (with tangents) every `step` along the polyline, ends included.
  function resample(P, step) {
    const L = polyLen(P), n = Math.max(2, Math.ceil(L / step));
    return Array.from({ length: n + 1 }, (_, i) => ({ ...along(P, (L * i) / n), s: (L * i) / n }));
  }
  const quad = (a, c, b, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; });
  const cubic = (a, c1, c2, b, n = 32) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return { x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y }; });
  // Smooth curve through every point (Catmull-Rom as cubic Béziers).
  function spline(P) {
    if (P.length < 3) return P;
    const out = [P[0]];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
      out.push(...cubic(p1, c1, c2, p2, 18).slice(1));
    }
    return out;
  }
  // Round each inner corner with a quadratic of radius r.
  function roundCorners(P, r) {
    if (!(r > 0) || P.length < 3) return P;
    const out = [P[0]];
    for (let i = 1; i < P.length - 1; i++) {
      const A = P[i - 1], C = P[i], B = P[i + 1], la = dist(A, C), lb = dist(B, C), rr = Math.min(r, la / 2, lb / 2);
      if (!la || !lb) continue;
      out.push(...quad(lerp(C, A, rr / la), C, lerp(C, B, rr / lb), 8));
    }
    out.push(P[P.length - 1]);
    return out;
  }
  // Shift a polyline sideways by d (positive = to the left of travel on screen).
  function offsetLine(P, d) {
    if (!d) return P;
    const n = (i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = dist(a, b) || 1; return { x: (b.y - a.y) / l, y: -(b.x - a.x) / l }; };
    return P.map((q, i) => { const m = n(i); return { x: q.x + m.x * d, y: q.y + m.y * d }; });
  }
  function simplify(P) {
    const out = [];
    for (const q of P) {
      if (out.length && dist(out[out.length - 1], q) < 0.01) continue;
      if (out.length >= 2) {
        const a = out[out.length - 2], b = out[out.length - 1];
        if (Math.abs((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) < 0.01) { out[out.length - 1] = q; continue; }
      }
      out.push(q);
    }
    return out;
  }
  // Nearest point on a polyline: { d, s (distance along), t (fraction of length) }.
  function nearestOn(P, p) {
    let best = { d: Infinity, s: 0 }, acc = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2, l = Math.sqrt(l2);
      const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2)) : 0;
      const q = lerp(a, b, t), d = dist(p, q);
      if (d < best.d) best = { d, s: acc + t * l, i };
      acc += l;
    }
    best.t = acc ? best.s / acc : 0;
    return best;
  }

  // ---------- which connectors need the extended drawing ----------
  const STYLE_KEYS = ['lineStyle', 'flow', 'flowWidth', 'flowOpacity', 'gradTo', 'measure', 'measureUnit', 'measureScale', 'measureDigits', 'ticks', 'tickLabels', 'sideIn', 'sideOut', 'sideFlip', 'labelAbove', 'labelBelow', 'labelPos', 'labelAlong', 'midArrows', 'endGap', 'animate'];
  globalThis.LINE_RESET = ['lineStyle', 'flow', 'flowWidth', 'flowOpacity', 'gradTo', 'measure', 'ticks', 'tickLabels', 'animate'];
  const set = (v) => v != null && v !== '' && v !== false && v !== 0 && v !== 'solid' && !(Array.isArray(v) && !v.length);
  const objOf = (end, objects) => (end && end.id ? objects.find((x) => x.id === end.id) : null);
  const selfLoop = (o) => !!(o.from && o.to && o.from.id && o.from.id === o.to.id);
  // Geometry differs from render.js's: bend points, auto route, a loop, an offset, an edge point or a line end.
  function shaped(o, objects) {
    if (o.type !== 'connector' || o.style === 'zoom') return false;
    if ((o.points && o.points.length) || o.route === 'auto' || selfLoop(o) || o.offset || o.endGap > 0) return true;
    for (const end of [o.from, o.to]) {
      if (!end || !end.id) continue;
      if (end.at || end.t != null) return true;
      const T = objects && objOf(end, objects);
      if (T && T.type === 'connector') return true;
    }
    return false;
  }
  const fancy = (o, objects) => o.type === 'connector' && o.style !== 'zoom' && (shaped(o, objects) || o.jumps || STYLE_KEYS.some((k) => set(o[k])));
  globalThis.connectorShaped = (o) => shaped(o, objs());
  globalThis.connectorFancy = fancy;

  // ---------- ends ----------
  const edgePoint = (T, [u, v]) => rotPt({ x: T.x + u * T.w, y: T.y + v * T.h }, center(T), T.rot || 0);
  function onLine(T, t, objects, depth) {
    if (depth > 4) { const [a, b] = connectorEnds(T, objects); return lerp(a, b, t ?? 0.5); }
    const P = geom(T, objects, depth + 1).pts, q = along(P, polyLen(P) * (t ?? 0.5));
    return { x: q.x, y: q.y };
  }
  // A rough point for aiming (the centre of an object, or the exact spot when the end is pinned).
  function aim(end, objects, depth) {
    const T = objOf(end, objects);
    if (!T) return { x: end.x, y: end.y };
    if (T.type === 'connector') return onLine(T, end.t, objects, depth);
    if (end.at) return edgePoint(T, end.at);
    if (end.port) return portPoint(T, end.port);
    return center(T);
  }
  function endPoint(end, toward, objects, depth) {
    const T = objOf(end, objects);
    if (!T) return { x: end.x, y: end.y };
    if (T.type === 'connector') return onLine(T, end.t, objects, depth);
    if (end.at) return edgePoint(T, end.at);
    if (end.port) return portPoint(T, end.port);
    return clipToBox(T, toward);
  }

  // ---------- automatic orthogonal routing around objects ----------
  const routeCache = new Map();
  function sideOf(T, toward) { // the side of T facing a point: [port, outward direction]
    const c = center(T), d = rotPt(toward, c, -(T.rot || 0)), dx = (d.x - c.x) / (T.w || 1), dy = (d.y - c.y) / (T.h || 1);
    const k = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'e' : 'w') : dy >= 0 ? 's' : 'n';
    return k;
  }
  const DIRS = { n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, e: { x: 1, y: 0 }, w: { x: -1, y: 0 } };
  function autoRoute(o, objects, depth) {
    const A = objOf(o.from, objects), B = objOf(o.to, objects), M = 20;
    const ca = aim(o.from, objects, depth), cb = aim(o.to, objects, depth);
    const plain = (T, end) => T && T.type !== 'connector' && !end.at;
    const kA = plain(A, o.from) ? o.from.port || sideOf(A, cb) : null, kB = plain(B, o.to) ? o.to.port || sideOf(B, ca) : null;
    const a = kA ? portPoint(A, kA) : endPoint(o.from, cb, objects, depth), b = kB ? portPoint(B, kB) : endPoint(o.to, ca, objects, depth);
    const dA = kA ? DIRS[kA] : null, dB = kB ? DIRS[kB] : null;
    const sa = dA ? { x: a.x + dA.x * M, y: a.y + dA.y * M } : a, sb = dB ? { x: b.x + dB.x * M, y: b.y + dB.y * M } : b;
    // Obstacles: other visible objects near the route (not the ones being joined, nor anything containing an end).
    const box = { x: Math.min(a.x, b.x) - 260, y: Math.min(a.y, b.y) - 260, x2: Math.max(a.x, b.x) + 260, y2: Math.max(a.y, b.y) + 260 };
    const inside = (r, q) => q.x > r.x && q.x < r.x2 && q.y > r.y && q.y < r.y2;
    const obs = [];
    for (const T of objects) {
      if (T === A || T === B || (T.hidden && !T.pictureContext) || T.type === 'connector' || T.type === 'comment') continue;
      const bb = bounds(T, objects), r = { x: bb.x - M + 1, y: bb.y - M + 1, x2: bb.x + bb.w + M - 1, y2: bb.y + bb.h + M - 1 };
      if (r.x2 < box.x || r.x > box.x2 || r.y2 < box.y || r.y > box.y2) continue;
      if (inside(r, a) || inside(r, b) || inside(r, sa) || inside(r, sb)) continue;
      obs.push(r);
      if (obs.length >= 60) break;
    }
    const key = JSON.stringify([sa, sb, kA, kB, obs.map((r) => [r2(r.x), r2(r.y), r2(r.x2), r2(r.y2)])]);
    let mid = routeCache.get(key);
    if (!mid) {
      mid = orthoPath(sa, sb, dA, dB, obs) || elbowFallback(sa, sb, dA);
      if (routeCache.size > 300) routeCache.clear();
      routeCache.set(key, mid);
    }
    return simplify([a, ...mid, b]);
  }
  function elbowFallback(a, b, dA) {
    const h = dA ? dA.x !== 0 : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    return h ? [a, { x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }, b] : [a, { x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }, b];
  }
  // Shortest path on the sparse grid made by every obstacle edge, with a penalty for each bend.
  function orthoPath(a, b, dA, dB, obs) {
    const uniq = (v) => [...new Set(v.map((n) => r2(n)))].sort((p, q) => p - q);
    let xs = uniq([a.x, b.x, ...obs.flatMap((r) => [r.x, r.x2])]), ys = uniq([a.y, b.y, ...obs.flatMap((r) => [r.y, r.y2])]);
    const mids = (v) => v.slice(1).map((n, i) => (n + v[i]) / 2);
    xs = uniq([...xs, ...mids(xs)]); ys = uniq([...ys, ...mids(ys)]);
    const W = xs.length, H = ys.length;
    if (W * H > 40000) return null;
    const blocked = (x, y) => obs.some((r) => x > r.x && x < r.x2 && y > r.y && y < r.y2);
    const ix = (x) => xs.indexOf(r2(x)), iy = (y) => ys.indexOf(r2(y));
    const s = [ix(a.x), iy(a.y)], g = [ix(b.x), iy(b.y)];
    if (s[0] < 0 || s[1] < 0 || g[0] < 0 || g[1] < 0) return null;
    const BEND = 40, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const id = (i, j, d) => (j * W + i) * 4 + d;
    const cost = new Float64Array(W * H * 4).fill(Infinity), prev = new Int32Array(W * H * 4).fill(-1);
    const heap = []; // binary heap of [cost, state]
    const push = (c, st) => { heap.push([c, st]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const startDir = dA ? dirs.findIndex(([dx, dy]) => dx === Math.sign(dA.x) && dy === Math.sign(dA.y)) : -1;
    for (let d = 0; d < 4; d++) { const c = startDir < 0 || d === startDir ? 0 : BEND; const st = id(s[0], s[1], d); cost[st] = c; push(c, st); }
    const endDir = dB ? dirs.findIndex(([dx, dy]) => dx === -Math.sign(dB.x) && dy === -Math.sign(dB.y)) : -1;
    let goal = -1;
    while (heap.length) {
      const [c, st] = pop();
      if (c > cost[st]) continue;
      const d = st % 4, cell = (st - d) / 4, i = cell % W, j = (cell - i) / W;
      if (i === g[0] && j === g[1] && (endDir < 0 || d === endDir)) { goal = st; break; }
      for (let nd = 0; nd < 4; nd++) {
        const ni = i + dirs[nd][0], nj = j + dirs[nd][1];
        if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
        if (blocked(xs[ni], ys[nj]) || blocked((xs[i] + xs[ni]) / 2, (ys[j] + ys[nj]) / 2)) continue;
        const nc = c + Math.abs(xs[ni] - xs[i]) + Math.abs(ys[nj] - ys[j]) + (nd === d ? 0 : BEND), ns = id(ni, nj, nd);
        if (nc < cost[ns]) { cost[ns] = nc; prev[ns] = st; push(nc, ns); }
      }
    }
    if (goal < 0) return null;
    const out = [];
    for (let st = goal; st >= 0; st = prev[st]) { const cell = (st - (st % 4)) / 4, i = cell % W, j = (cell - i) / W; out.push({ x: xs[i], y: ys[j] }); }
    return simplify(out.reverse());
  }

  // ---------- the full path of a connector, as a polyline ----------
  function loopPts(o, T) {
    const side = o.loopSide || 'n', c = center(T), size = o.loopSize || Math.max(40, Math.min(T.w, T.h) * 0.8);
    const S = { n: [[0.68, 0], [0.32, 0], 0, -1], s: [[0.32, 1], [0.68, 1], 0, 1], e: [[1, 0.68], [1, 0.32], 1, 0], w: [[0, 0.32], [0, 0.68], -1, 0] }[side];
    const at = ([u, v]) => ({ x: T.x + u * T.w + S[2] * 3, y: T.y + v * T.h + S[3] * 3 });
    const p0 = at(S[0]), p3 = at(S[1]), tx = (p0.x - p3.x) / (dist(p0, p3) || 1), ty = (p0.y - p3.y) / (dist(p0, p3) || 1);
    const k = size * 1.25, spread = size * 0.75;
    const p1 = { x: p0.x + S[2] * k + tx * spread, y: p0.y + S[3] * k + ty * spread }, p2 = { x: p3.x + S[2] * k - tx * spread, y: p3.y + S[3] * k - ty * spread };
    return cubic(p0, p1, p2, p3).map((q) => rotPt(q, c, T.rot || 0));
  }
  function geom(o, objects, depth = 0) {
    let P;
    const wps = o.points || [];
    if (selfLoop(o) && objOf(o.from, objects) && objOf(o.from, objects).type !== 'connector') P = loopPts(o, objOf(o.from, objects));
    else if (o.route === 'auto') P = roundCorners(autoRoute(o, objects, depth), o.radius || 0);
    else if (wps.length) {
      const a = endPoint(o.from, wps[0], objects, depth), b = endPoint(o.to, wps[wps.length - 1], objects, depth);
      let V = [a, ...wps, b];
      if (o.style === 'curved') P = spline(V);
      else {
        if (o.style === 'elbow') { // square every leg: across first, then up or down
          const out = [V[0]];
          for (let i = 1; i < V.length; i++) { const p = out[out.length - 1], q = V[i]; if (p.x !== q.x && p.y !== q.y) out.push({ x: q.x, y: p.y }); out.push(q); }
          V = simplify(out);
        }
        P = roundCorners(V, o.radius || 0);
      }
    } else {
      const ca = aim(o.from, objects, depth), cb = aim(o.to, objects, depth), cp = connectorControl(o, ca, cb);
      const a = endPoint(o.from, cp || cb, objects, depth), b = endPoint(o.to, cp || ca, objects, depth);
      if (o.style === 'elbow') {
        const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
        const endH = o.to.port ? 'ew'.includes(o.to.port) : startH, bt = o.bend ?? 0.5;
        let c1, c2;
        if (startH && endH) { const mx = a.x + (b.x - a.x) * bt; c1 = { x: mx, y: a.y }; c2 = { x: mx, y: b.y }; } else if (!startH && !endH) { const my = a.y + (b.y - a.y) * bt; c1 = { x: a.x, y: my }; c2 = { x: b.x, y: my }; } else c1 = c2 = startH ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
        P = roundCorners(simplify([a, c1, c2, b]), o.radius || 0);
      } else if (cp) P = quad(a, connectorControl(o, a, b) || cp, b);
      else P = [a, b];
    }
    if (o.offset) P = offsetLine(P, o.offset);
    if (o.endGap > 0 && P.length >= 2) { // stop short of the objects the line joins
      const L = polyLen(P), g0 = o.from && o.from.id ? Math.min(o.endGap, L / 3) : 0, g1 = o.to && o.to.id ? Math.min(o.endGap, L / 3) : 0;
      if (g0 || g1) P = slice(P, g0, L - g1);
    }
    return { pts: P };
  }
  globalThis.connectorPolyline = (o, objects) => geom(o, objects || objs()).pts;
  globalThis.connectorLabelPoint = (o, objects) => { const P = geom(o, objects || objs()).pts, q = along(P, polyLen(P) * (o.labelPos ?? 0.5)); return { x: q.x, y: q.y }; };
  globalThis.connectorGeom = geom;

  // Where each line's ends were last drawn, and the box of what they were attached to. Some operations replace or
  // remove objects without letting go of the lines attached to them first (boolean union, crop to shape, cutters…);
  // such a line then re-attaches to the shape now covering that spot, or stays where it was, instead of breaking.
  const lastEnds = new Map();
  const finite = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const gone = (end, objects) => !!(end && end.id && !objOf(end, objects));
  const prevEnds = connectorEnds;
  connectorEnds = function (o, objects) {
    const list = objects || [];
    if (list.length && (gone(o.from, list) || gone(o.to, list))) {
      const last = lastEnds.get(o.id);
      const fix = (end, i) => (gone(end, list) ? (last ? { x: last.pts[i].x, y: last.pts[i].y } : null) : end);
      const f = fix(o.from, 0), t = fix(o.to, 1);
      if (!f || !t) { const p = f && !f.id ? f : t && !t.id ? t : { x: 0, y: 0 }; return [p, p]; }
      return connectorEnds({ ...o, from: f, to: t }, list);
    }
    let ends;
    if (!shaped(o, list)) ends = prevEnds(o, objects);
    else { const P = geom(o, list).pts; ends = [P[0], P[P.length - 1]]; }
    if (list.length && o.id && finite(ends[0]) && finite(ends[1])) {
      const box = (end) => { const T = objOf(end, list); return T && T.type !== 'connector' ? bounds(T, list) : null; };
      lastEnds.set(o.id, { pts: ends, boxes: [box(o.from), box(o.to)] });
    }
    return ends;
  };
  // Before each redraw, let go of (or re-attach) ends whose object is gone.
  function healLines() {
    const pg = state.doc && state.doc.pages && state.doc.pages[state.pageIndex];
    if (!pg || !pg.objects) return;
    const list = pg.objects, ids = new Set(list.map((x) => x.id));
    for (const o of list) {
      if (o.type !== 'connector') continue;
      ['from', 'to'].forEach((k, i) => {
        const end = o[k];
        if (!end || !end.id || ids.has(end.id)) return;
        const last = lastEnds.get(o.id);
        if (!last) return;
        const old = last.boxes[i], p = last.pts[i];
        let into = null;
        if (old) { // the shape now covering the old object's centre, if it's about the same size (not a background)
          const c = { x: old.x + old.w / 2, y: old.y + old.h / 2 };
          for (const x of list) {
            if (x === o || x.type === 'connector' || x.hidden || x.id === (o[k === 'from' ? 'to' : 'from'] || {}).id) continue;
            const b = bounds(x, list);
            if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h && b.w * b.h <= old.w * old.h * 4) into = x;
          }
        }
        o[k] = into ? { id: into.id } : { x: p.x, y: p.y };
      });
    }
  }
  const prevRender = render;
  render = function (...args) { try { healLines(); } catch (e) { console.error(e); } return prevRender.apply(this, args); };
  globalThis.healLines = healLines;
  const prevBounds = bounds;
  bounds = function (o, objects) {
    if (o.type !== 'connector' || !fancy(o, objects || [])) return prevBounds(o, objects);
    const P = geom(o, objects || []).pts, pad = o.flow ? (o.flowWidth || 22) : o.sideIn || o.sideOut ? 34 : 0;
    const b = polyBounds(P);
    return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  };

  // ---------- extra line ends: SBGN stimulation and necessary stimulation ----------
  HEAD_KINDS.splice(HEAD_KINDS.length - 1, 0, ['otriangle', '▷ Open triangle (SBGN stimulation)'], ['necstim', '⊳ Bar + open triangle (SBGN necessary stimulation)']);
  Object.assign(HEAD_INSET, { otriangle: 1.4, necstim: 1.4 });
  const prevHead = arrowHead;
  arrowHead = function (kind, tip, from, color, sw, size = 1) {
    if (kind !== 'otriangle' && kind !== 'necstim') return prevHead(kind, tip, from, color, sw, size);
    const ang = Math.atan2(tip.y - from.y, tip.x - from.x), s = headScale(sw, size), c = Math.cos(ang), n = Math.sin(ang);
    const p = (dx, dy) => `${r2(tip.x + dx * c - dy * n)},${r2(tip.y + dx * n + dy * c)}`;
    let out = `<polygon points="${p(0, 0)} ${p(-s * 1.4, -s * 0.75)} ${p(-s * 1.4, s * 0.75)}" fill="#ffffff" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    if (kind === 'necstim') out += `<line x1="${p(-s * 1.85, -s * 0.75).split(',')[0]}" y1="${p(-s * 1.85, -s * 0.75).split(',')[1]}" x2="${p(-s * 1.85, s * 0.75).split(',')[0]}" y2="${p(-s * 1.85, s * 0.75).split(',')[1]}" stroke="${color}" stroke-width="${sw}"/>`;
    return out;
  };

  // ---------- line jumps ----------
  function segX(a, b, c, d) {
    const r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }, den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    return t > 0 && t < 1 && u > 0 && u < 1 ? t : null;
  }
  // Path with a small hop wherever this line crosses a line drawn beneath it.
  function jumpPath(o, P, objects, r) {
    const idx = objects.indexOf(o), others = objects.slice(0, idx < 0 ? objects.length : idx).filter((x) => x.type === 'connector' && (!x.hidden || x.pictureContext) && x.style !== 'zoom');
    const lines = others.map((x) => { try { return geom(x, objects, 3).pts; } catch (e) { return []; } });
    let d = `M${r2(P[0].x)} ${r2(P[0].y)}`, any = false;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], L = dist(a, b), ts = [];
      for (const Q of lines) for (let j = 1; j < Q.length; j++) { const t = segX(a, b, Q[j - 1], Q[j]); if (t != null) ts.push(t); }
      ts.sort((p, q) => p - q);
      let last = 0;
      for (const t of ts) {
        if (t * L - r < last * L + 0.5 || t * L + r > L - 0.5) continue;
        const p0 = lerp(a, b, t - r / L), p1 = lerp(a, b, t + r / L);
        d += ` L${r2(p0.x)} ${r2(p0.y)} A${r2(r)} ${r2(r)} 0 0 1 ${r2(p1.x)} ${r2(p1.y)}`;
        last = t + r / L; any = true;
      }
      d += ` L${r2(b.x)} ${r2(b.y)}`;
    }
    return any ? d : null;
  }

  // ---------- drawing ----------
  const upNormal = (q) => { let nx = q.ty, ny = -q.tx; if (ny > 0.0001 || (Math.abs(ny) <= 0.0001 && nx > 0)) { nx = -nx; ny = -ny; } return { x: nx, y: ny }; };
  function textAt(text, p, fs, color, italic, bg) { // bg: a colour for the box behind the text, or nothing
    const m = measureText(text, fs, 'sans', false, italic);
    return (bg && bg !== 'none' ? `<rect x="${r2(p.x - m.w / 2 - 3)}" y="${r2(p.y - m.h / 2)}" width="${r2(m.w + 6)}" height="${r2(m.h)}" rx="3" fill="${bg === true ? '#fff' : bg}" opacity=".9"/>` : '')
      + `<g transform="translate(${r2(p.x - m.w / 2)} ${r2(p.y - m.h / 2)})">${textSvg(text, { fontSize: fs, color, italic, w: m.w, h: m.h, align: 'center' })}</g>`;
  }
  function measureLabel(o, L) {
    const v = L * (o.measureScale || 1), dp = o.measureDigits ?? (v < 10 ? 1 : 0);
    return `${v.toFixed(dp)} ${o.measureUnit || 'px'}`;
  }
  function wavePts(P, sw, kind, amp, wl) {
    const L = polyLen(P), S = resample(P, kind === 'zigzag' ? wl / 4 : Math.max(1.5, wl / 12));
    return S.map((q) => {
      const ramp = Math.min(1, q.s / (wl / 2), (L - q.s) / (wl / 2));
      const ph = (q.s / wl) % 1, f = kind === 'zigzag' ? (ph < 0.25 ? ph * 4 : ph < 0.75 ? 2 - ph * 4 : ph * 4 - 4) : Math.sin(ph * 2 * Math.PI);
      return { x: q.x + q.ty * amp * f * ramp, y: q.y - q.tx * amp * f * ramp };
    });
  }
  function flowSvg(o, P, color) {
    const W = o.flowWidth || 22, L = polyLen(P), hl = Math.min(W * 0.95, L * 0.45), body = L - hl, S = resample(slice(P, 0, body), 4);
    const half = (s) => (W / 2) * (1 - 0.4 * (s / (body || 1)));
    const left = S.map((q) => ({ x: q.x + q.ty * half(q.s), y: q.y - q.tx * half(q.s) })), right = S.map((q) => ({ x: q.x - q.ty * half(q.s), y: q.y + q.tx * half(q.s) }));
    const end = along(P, body), tip = along(P, L), hw = W * 0.72;
    const pts = [...left, { x: end.x + end.ty * hw, y: end.y - end.tx * hw }, { x: tip.x, y: tip.y }, { x: end.x - end.ty * hw, y: end.y + end.tx * hw }, ...right.reverse()];
    return `<path d="${ptsD(pts)} Z" fill="${color}" fill-opacity="${o.flowOpacity ?? 0.45}" stroke="${color}" stroke-opacity="${Math.min(1, (o.flowOpacity ?? 0.45) + 0.3)}" stroke-width="1" stroke-linejoin="round"/>`;
  }

  const prevSvg = connectorSvg;
  connectorSvg = function (o, objects, forExport) {
    if (objects && objects.length && (gone(o.from, objects) || gone(o.to, objects))) {
      const [p, q] = connectorEnds(o, objects);
      if (!finite(p) || !finite(q) || dist(p, q) < 0.5) return '';
    }
    if (!fancy(o, objects)) return prevSvg(o, objects, forExport);
    const color = o.color || '#333', sw = o.width || 2, hsz = o.headSize || 1, P0 = geom(o, objects).pts, L = polyLen(P0);
    if (L < 0.5) return '';
    const headLen = (kind) => (HEAD_INSET[kind] ? Math.min(headScale(sw, hsz) * HEAD_INSET[kind], L / 2.5) : 0);
    // Heads point along the last straight leg; on a curve (many short legs) they aim a little way back along it.
    const aim = (fromEnd) => {
      const n = P0.length, leg = fromEnd ? [P0[n - 2], P0[n - 1]] : [P0[1], P0[0]];
      if (dist(leg[0], leg[1]) >= headScale(sw, hsz) * 0.8) return leg[0];
      const k = Math.min(headScale(sw, hsz) * 1.4, L / 2), q = along(P0, fromEnd ? L - k : k); return { x: q.x, y: q.y };
    };
    const a = P0[0], b = P0[P0.length - 1];
    const gid = o.gradTo ? `cg-${String(o.id).replace(/[^\w-]/g, '')}` : '';
    const stroke = gid ? `url(#${gid})` : color;
    let s = '';
    if (gid) s += `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${r2(a.x)}" y1="${r2(a.y)}" x2="${r2(b.x)}" y2="${r2(b.y)}"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${o.gradTo}"/></linearGradient></defs>`;
    if (!forExport) s += `<path d="${ptsD(P0)}" stroke="transparent" stroke-width="${sw + 12}" fill="none"/>`;
    if (o.flow) s += flowSvg(o, P0, color);
    else {
      const P = slice(P0, headLen(o.tail), L - headLen(o.head));
      let dash = dashAttr(o, sw), cap = /stroke-linecap/.test(dash) ? '' : ' stroke-linecap="round"';
      // Animated flow: the dashes travel along the line (canvas, Present mode and exported SVG).
      let anim = '';
      if (o.animate) {
        if (!dash) dash = ` stroke-dasharray="${r2(sw * 3)} ${r2(sw * 2.4)}"`;
        const nums = (dash.match(/stroke-dasharray="([^"]+)"/) || [null, '10 8'])[1].split(/[\s,]+/).map(Number), period = r2(nums.reduce((a, b) => a + b, 0) * 2);
        anim = `<animate attributeName="stroke-dashoffset" from="${period}" to="0" dur="${r2(Math.max(0.4, period / 30))}s" repeatCount="indefinite"/>`;
      }
      const line = (d, w) => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" fill="none" stroke-linejoin="round"${cap}${dash}>${anim}</path>`;
      const ls = o.lineStyle;
      if (ls === 'double') { const g = sw * 0.9 + 0.6; s += line(ptsD(offsetLine(P, g)), sw * 0.6) + line(ptsD(offsetLine(P, -g)), sw * 0.6); }
      else if (ls === 'wavy' || ls === 'zigzag') s += line(ptsD(wavePts(P, sw, ls, o.waveAmp || 2.5 + sw, o.waveLength || 10 + sw * 3)), sw);
      else s += line((o.jumps && jumpPath(o, P, objects, 4 + sw)) || ptsD(P), sw);
      s += arrowHead(o.head, b, aim(true), o.gradTo || color, sw, hsz) + arrowHead(o.tail, a, aim(false), color, sw, hsz);
    }
    const midQ = along(P0, L / 2), up = upNormal(midQ), fs = o.labelSize || 13;
    // Direction arrows along the line (for long arrows and cycles).
    for (let i = 0, n = Math.min(20, o.midArrows || 0); i < n && !o.flow; i++) {
      const sMid = (L * (i + 0.5)) / n, hl = headScale(sw, hsz) * 0.7, tip = along(P0, sMid + hl), back = along(P0, sMid - hl);
      s += arrowHead('arrow', { x: tip.x, y: tip.y }, { x: back.x, y: back.y }, o.gradTo ? o.gradTo : color, sw, hsz);
    }
    const off = (o.flow ? (o.flowWidth || 22) / 2 : sw / 2) + 4 + fs * 0.6;
    // Timeline ticks with labels underneath.
    const tl = String(o.tickLabels || '').split(',').map((x) => x.trim()).filter(Boolean), nT = o.ticks || tl.length;
    if (nT >= 2) {
      const use = L - (o.head && o.head !== 'none' ? headScale(sw, hsz) * 1.8 : 0), tw = Math.max(1, sw * 0.7), th = 5 + sw;
      for (let i = 0; i < nT; i++) {
        const q = along(P0, (use * i) / (nT - 1)), n = upNormal(q);
        s += `<line x1="${r2(q.x + n.x * th)}" y1="${r2(q.y + n.y * th)}" x2="${r2(q.x - n.x * th)}" y2="${r2(q.y - n.y * th)}" stroke="${color}" stroke-width="${tw}" stroke-linecap="round"/>`;
        if (tl[i]) s += textAt(tl[i], { x: q.x - n.x * (th + fs * 0.75), y: q.y - n.y * (th + fs * 0.75) }, fs, color, false, false);
      }
    }
    // Side reagents: a curved side arrow that touches the main line at its middle (ATP in, ADP out).
    if (o.sideIn || o.sideOut) {
      const n = o.sideFlip ? { x: -up.x, y: -up.y } : up, span = Math.min(L * 0.24, 54), h = Math.max(20, span * 0.8);
      const m = { x: midQ.x, y: midQ.y }, d = { x: midQ.tx, y: midQ.ty };
      const p0 = { x: m.x - d.x * span + n.x * h, y: m.y - d.y * span + n.y * h }, p2 = { x: m.x + d.x * span + n.x * h, y: m.y + d.y * span + n.y * h };
      const c = { x: 2 * m.x - (p0.x + p2.x) / 2, y: 2 * m.y - (p0.y + p2.y) / 2 }, ssw = Math.max(1, sw * 0.75);
      const Q = quad(p0, c, p2, 24), kq = Math.min(headScale(ssw, 0.8) * 1.2, polyLen(Q) / 3);
      s += `<path d="${ptsD(slice(Q, 0, polyLen(Q) - kq))}" stroke="${color}" stroke-width="${ssw}" fill="none" stroke-linecap="round"/>`;
      s += arrowHead('arrow', p2, along(Q, polyLen(Q) - kq * 1.4), color, ssw, 0.8);
      const lab = (t, p, dir) => textAt(t, { x: p.x + n.x * (fs * 0.55) + dir * d.x * (measureText(t, fs, 'sans').w / 2 + 3), y: p.y + n.y * (fs * 0.55) + dir * d.y * (measureText(t, fs, 'sans').w / 2 + 3) }, fs, color, false, false);
      if (o.sideIn) s += lab(o.sideIn, p0, -1);
      if (o.sideOut) s += lab(o.sideOut, p2, 1);
    }
    const sideUp = (o.sideIn || o.sideOut) && !o.sideFlip, sideDown = (o.sideIn || o.sideOut) && o.sideFlip;
    const above = o.measure && !o.labelAbove ? measureLabel(o, L) : o.labelAbove;
    // Labels sit at labelPos along the line (default the middle); "along the line" turns them to its angle, upright.
    const lq = o.labelPos != null ? along(P0, L * o.labelPos) : midQ, lup = upNormal(lq), gapL = o.label ? fs * 0.55 : 0, kA = off + gapL + (sideUp ? 46 : 0), kB = off + gapL + (sideDown ? 46 : 0); // clear of a main label
    let lab = '';
    if (o.labelAlong) {
      let ang = (Math.atan2(lq.ty, lq.tx) * 180) / Math.PI;
      if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
      if (above) lab += textAt(above, { x: 0, y: -kA }, fs, color, o.labelItalic, false);
      if (o.labelBelow) lab += textAt(o.labelBelow, { x: 0, y: kB }, fs, color, o.labelItalic, false);
      if (o.label) lab += textAt(o.label, { x: 0, y: 0 }, fs, color, o.labelItalic, o.labelBg || true);
      if (lab) s += `<g transform="translate(${r2(lq.x)} ${r2(lq.y)}) rotate(${r2(ang)})">${lab}</g>`;
    } else {
      if (above) s += textAt(above, { x: lq.x + lup.x * kA, y: lq.y + lup.y * kA }, fs, color, o.labelItalic, false);
      if (o.labelBelow) s += textAt(o.labelBelow, { x: lq.x - lup.x * kB, y: lq.y - lup.y * kB }, fs, color, o.labelItalic, false);
      if (o.label) s += textAt(o.label, { x: lq.x, y: lq.y }, fs, color, o.labelItalic, o.labelBg || true);
    }
    return s;
  };

  // Connectors whose drawing depends on other objects (lines they cross, objects they route around, lines they
  // hang off) re-render when those change.
  const prevKey = innerKey;
  innerKey = function (o, list) {
    let k = prevKey(o, list);
    const onLine = (end) => { const T = end && end.id && list && objOf(end, list); return !!(T && T.type === 'connector'); };
    if (o.type === 'connector' && list && (o.jumps || o.route === 'auto' || onLine(o.from) || onLine(o.to))) {
      k += '|' + list.map((x) => (x.type === 'connector' ? `${x.id}:${JSON.stringify([x.from, x.to, x.points, x.style, x.curve, x.offset, x.route])}` : `${r2(x.x)},${r2(x.y)},${r2(x.w)},${r2(x.h)},${x.rot || 0}`)).join(';');
    }
    return k;
  };

  // ---------- canvas interaction helpers used by app.js ----------
  // An end dropped near an object's outline glues to that exact spot: [u, v] in the object's box.
  globalThis.edgePointAt = function (T, p) {
    if (!T || T.type === 'connector') return null;
    const q = rotPt(p, center(T), -(T.rot || 0)), u = (q.x - T.x) / (T.w || 1), v = (q.y - T.y) / (T.h || 1), tol = 10 / state.zoom;
    const dx = Math.min(Math.abs(q.x - T.x), Math.abs(q.x - T.x - T.w)), dy = Math.min(Math.abs(q.y - T.y), Math.abs(q.y - T.y - T.h));
    if (u < -0.1 || u > 1.1 || v < -0.1 || v > 1.1 || Math.min(dx, dy) > tol) return null;
    const cu = Math.max(0, Math.min(1, u)), cv = Math.max(0, Math.min(1, v));
    if (T.type === 'ellipse' || (T.type === 'shape' && T.kind === 'pill')) { // onto the curve itself
      const ang = Math.atan2(cv - 0.5, cu - 0.5);
      return [r2(0.5 + 0.5 * Math.cos(ang)), r2(0.5 + 0.5 * Math.sin(ang))].map((n) => Math.round(n * 1000) / 1000);
    }
    return dx <= dy ? [Math.round(u) ? 1 : 0, Math.round(cv * 1000) / 1000] : [Math.round(cu * 1000) / 1000, Math.round(v) ? 1 : 0];
  };
  // The line under p (for branching from / merging into it), skipping o and lines that hang off o.
  globalThis.connectorAtPoint = function (p, excludeId, list = objs(), zoom = state.zoom) {
    const tol = 8 / zoom;
    let best = null;
    for (const c of list) {
      if (c.type !== 'connector' || c.id === excludeId || c.hidden || c.style === 'zoom') continue;
      if (excludeId && ((c.from && c.from.id === excludeId) || (c.to && c.to.id === excludeId))) continue;
      const P = geom(c, list).pts, n = nearestOn(P, p);
      if (n.d < tol && (!best || n.d < best.d)) best = { o: c, t: Math.round(n.t * 1000) / 1000, d: n.d };
    }
    return best;
  };
  globalThis.endSnapMarker = function (over, p, selfId) {
    const z = state.zoom;
    if (over) {
      const at = edgePointAt(over, p);
      if (!at || nearestPort(over, p, 14 / z)) return '';
      const q = edgePoint(over, at);
      return `<circle cx="${q.x}" cy="${q.y}" r="${4.5 / z}" fill="#3fa58b" stroke="#fff" stroke-width="${1.5 / z}"/>`;
    }
    const hit = connectorAtPoint(p, selfId);
    if (!hit) return '';
    const q = along(geom(hit.o, objs()).pts, polyLen(geom(hit.o, objs()).pts) * hit.t);
    return `<circle cx="${q.x}" cy="${q.y}" r="${5 / z}" fill="#fff" stroke="#e8743b" stroke-width="${2 / z}"/>`;
  };

  // Bend points: orange squares on the line move a point (double-click removes it); the small circles halfway
  // along each leg add one when dragged.
  globalThis.waypointDrag = function (d, p, e) {
    const o = d.o;
    if (d.h.startsWith('wpadd:')) {
      const i = +d.h.slice(6);
      o.points = [...(o.points || [])];
      o.points.splice(i, 0, { x: p.x, y: p.y });
      d.h = 'wp:' + i;
    }
    const i = +d.h.slice(3);
    let q = { x: p.x, y: p.y };
    const [ea, eb] = connectorEnds({ ...o, points: o.points.filter((_, j) => j !== i).length ? o.points : undefined }, objs());
    const V = [ea, ...o.points, eb], prevP = V[i], nextP = V[i + 2];
    if (e && e.shiftKey) { // shift: line up with the previous point
      if (prevP) { if (Math.abs(q.x - prevP.x) < Math.abs(q.y - prevP.y)) q.x = prevP.x; else q.y = prevP.y; }
    } else if (!(e && (e.metaKey || e.ctrlKey))) { // snap level / upright with either neighbour when close (⌘ turns it off)
      const tol = 6 / state.zoom;
      for (const nb of [prevP, nextP]) {
        if (!nb) continue;
        if (Math.abs(q.x - nb.x) < tol) q.x = nb.x;
        if (Math.abs(q.y - nb.y) < tol) q.y = nb.y;
      }
    }
    o.points[i] = { x: r2(q.x), y: r2(q.y) };
  };
  const prevOverlay = renderOverlay;
  renderOverlay = function (extra = '') {
    let s = '';
    const sel = selected();
    if (sel.length === 1 && sel[0].type === 'connector' && !sel[0].locked) {
      const o = sel[0], z = state.zoom, hs = 7 / z, sw = 1.5 / z;
      if (o.route !== 'auto' && !selfLoop(o) && o.style !== 'zoom') {
        const [a, b] = connectorEnds(o, objs()), V = [a, ...(o.points || []), b];
        const P = geom(o, objs()).pts, sV = V.map((q) => nearestOn(P, q).s);
        if (o.style !== 'elbow' || (o.points && o.points.length)) {
          for (let i = 1; i < V.length; i++) {
            const m = along(P, (sV[i - 1] + sV[i]) / 2); // halfway along the drawn leg (on the curve, too)
            if (dist(V[i - 1], V[i]) > 30 / z) s += `<circle data-handle="wpadd:${i - 1}" cx="${m.x}" cy="${m.y}" r="${hs * 0.5}" fill="#fff" fill-opacity=".85" stroke="#e8743b" stroke-width="${sw}" style="cursor:copy"><title>Drag to add a bend point</title></circle>`;
          }
        }
        (o.points || []).forEach((q, i) => { s += `<rect data-handle="wp:${i}" x="${q.x - hs / 2}" y="${q.y - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#e8743b" stroke-width="${sw}" style="cursor:move"><title>Bend point: drag to move, double-click to remove</title></rect>`; });
      }
    }
    if (state.view.quickConnect !== false && sel.length === 1 && sel[0].type !== 'connector' && sel[0].type !== 'comment' && !sel[0].locked && state.tool === 'select' && !(typeof nodeEdit !== 'undefined' && nodeEdit) && sel[0].w > 0) s += quickConnectSvg(sel[0]);
    prevOverlay(s + extra);
  };
  // Quick-connect arrows: on a single selected object, drag an arrow to another object to join them, or click it to
  // add a connected copy on that side (build a flowchart click by click).
  const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
  function quickConnectSvg(o) {
    const z = state.zoom, off = 18 / z, r = 7 / z, sw = 1.5 / z;
    const at = { e: [o.w + off, o.h / 2, 0], w: [-off, o.h / 2, 180], s: [o.w / 2, o.h + off, 90], n: [o.w / 2 + 26 / z, -off * 0.85, 270] }; // n sits beside the rotate handle, below the floating toolbar
    let s = `<g transform="translate(${o.x} ${o.y}) rotate(${o.rot || 0} ${o.w / 2} ${o.h / 2})">`;
    for (const [k, [x, y, a]] of Object.entries(at)) {
      s += `<g data-handle="qc:${k}" transform="translate(${x} ${y}) rotate(${a})" style="cursor:crosshair" opacity=".8"><title>Drag to connect · click to add a connected copy</title>`
        + `<circle r="${r}" fill="#ffffff" stroke="#3b6fd6" stroke-width="${sw}"/><path d="M${-r * 0.45} ${-r * 0.5} L${r * 0.5} 0 L${-r * 0.45} ${r * 0.5}" fill="none" stroke="#3b6fd6" stroke-width="${sw * 1.2}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    return s + '</g>';
  }
  globalThis.quickConnectStart = function (src, side, p) {
    const c = Make.connector({ id: src.id, port: side }, { x: p.x, y: p.y }, presetStyle());
    objs().push(c);
    return { mode: 'connect', o: c, start: p, qc: { src, side } };
  };
  globalThis.quickConnectEnd = function (d, len) {
    if (len >= 8 || d.o.to.id) return false;
    addConnectedCopy(d.qc.src, d.qc.side, d.o);
    return true;
  };
  // A copy of src on that side, joined by line c (or a new line in the current style).
  function addConnectedCopy(src, side, c) {
    const gap = 70;
    const [copy] = cloneObjects([src], objs(), 0);
    const dx = side === 'e' ? src.w + gap : side === 'w' ? -(src.w + gap) : 0, dy = side === 's' ? src.h + gap : side === 'n' ? -(src.h + gap) : 0;
    copy.x = src.x + dx; copy.y = src.y + dy;
    if (copy.type === 'text' || copy.label != null) { if (copy.type === 'text') copy.text = ''; else copy.label = ''; } // a fresh box to type in
    if (copy.type === 'text' && !copy.text) { copy.text = 'Text'; if (typeof postEdit === 'function') postEdit(copy); }
    objs().push(copy);
    if (!c) { c = Make.connector({ id: src.id, port: side }, { x: 0, y: 0 }, presetStyle()); objs().push(c); }
    c.to = { id: copy.id, port: OPP[side] };
    state.sel = [copy.id];
    render({ props: true });
  }
  // Option+Shift+Arrow: add a connected copy on that side (as in draw.io).
  window.addEventListener('keydown', (e) => {
    if (!e.altKey || !e.shiftKey || e.metaKey || e.ctrlKey || !e.key.startsWith('Arrow') || (typeof isTyping === 'function' && isTyping())) return;
    const sel = selected();
    if (sel.length !== 1 || sel[0].type === 'connector' || sel[0].locked) return;
    e.preventDefault(); e.stopImmediatePropagation();
    checkpoint();
    addConnectedCopy(sel[0], { ArrowRight: 'e', ArrowLeft: 'w', ArrowUp: 'n', ArrowDown: 's' }[e.key]);
  }, true);

  svg.addEventListener('dblclick', (e) => {
    const h = e.target.closest && e.target.closest('[data-handle^="wp:"]');
    if (!h) return;
    e.stopImmediatePropagation();
    const o = selected()[0];
    if (!o || !o.points) return;
    checkpoint();
    o.points.splice(+h.dataset.handle.slice(3), 1);
    if (!o.points.length) delete o.points;
    render({ props: true });
  }, true);

  // ---------- commands ----------
  const nonLines = () => selected().filter((o) => o.type !== 'connector');
  const styleOf = (o) => { const { id, type, from, to, label, points, labelAbove, labelBelow, sideIn, sideOut, ...st } = o; return st; };
  const presetStyle = () => (globalThis.linePreset ? { ...globalThis.linePreset } : {});
  // The odd one out: the object farthest from where the others are (the source of a branch, the target of a merge).
  function outlier(list) {
    let best = null;
    for (const o of list) {
      const rest = list.filter((x) => x !== o), c = rest.reduce((m, x) => ({ x: m.x + center(x).x / rest.length, y: m.y + center(x).y / rest.length }), { x: 0, y: 0 });
      const d = dist(center(o), c);
      if (!best || d > best.d) best = { o, d };
    }
    return best.o;
  }
  function branch(kind) {
    const list = nonLines();
    if (list.length < 3) { toast('Select three or more objects: one source and two or more targets (or the reverse to merge)'); return; }
    checkpoint();
    const hub = outlier(list), rest = list.filter((x) => x !== hub).sort((p, q) => center(p).y - center(q).y || center(p).x - center(q).x);
    const st = presetStyle(), first = rest[Math.floor((rest.length - 1) / 2)];
    const trunk = kind === 'branch' ? Make.connector({ id: hub.id }, { id: first.id }, { ...st, style: 'straight' }) : Make.connector({ id: first.id }, { id: hub.id }, { ...st, style: 'straight' });
    const made = [trunk];
    const t = kind === 'branch' ? 0.38 : 0.62;
    for (const x of rest) {
      if (x === first) continue;
      const c = kind === 'branch' ? Make.connector({ id: hub.id }, { id: x.id }, { ...st, style: 'straight' }) : Make.connector({ id: x.id }, { id: hub.id }, { ...st, style: 'straight', head: 'none' });
      if (kind === 'branch') { c.from = { id: trunk.id, t }; c.tail = 'none'; } else c.to = { id: trunk.id, t };
      made.push(c);
    }
    objs().push(...made);
    state.sel = made.map((c) => c.id);
    render({ props: true });
    toast(kind === 'branch' ? `Branched from ${hub.name || 'the source'} to ${rest.length} targets` : `Merged ${rest.length} sources into one arrow`);
  }
  function twoWay() {
    const sel = selected(), lines = sel.filter((o) => o.type === 'connector'), objsSel = nonLines();
    checkpoint();
    const made = [];
    if (lines.length) {
      for (const c of lines) {
        const back = { ...deep(c), id: uid(), from: deep(c.to), to: deep(c.from), points: c.points ? [...c.points].reverse() : undefined, label: '' };
        c.offset = 5; back.offset = 5; // each shifts to its own left, so the pair sits side by side
        made.push(back);
      }
    } else if (objsSel.length === 2) {
      const [p, q] = objsSel;
      made.push(Make.connector({ id: p.id }, { id: q.id }, { ...presetStyle(), offset: 5 }), Make.connector({ id: q.id }, { id: p.id }, { ...presetStyle(), offset: 5 }));
    } else { toast('Select a line, or two objects'); return; }
    objs().push(...made);
    state.sel = [...lines.map((c) => c.id), ...made.map((c) => c.id)];
    render({ props: true });
  }
  function selfLoopCmd() {
    const list = nonLines();
    if (!list.length) { toast('Select an object to add a feedback loop to'); return; }
    checkpoint();
    const made = list.map((x) => Make.connector({ id: x.id }, { id: x.id }, { ...presetStyle(), style: 'straight', loopSide: 'n' }));
    objs().push(...made);
    state.sel = made.map((c) => c.id);
    render({ props: true });
  }
  function addBranchFromLine() {
    const c = selected().find((o) => o.type === 'connector');
    if (!c) return;
    checkpoint();
    const P = geom(c, objs()).pts, q = along(P, polyLen(P) * 0.5), n = upNormal(q);
    const b = Make.connector({ x: 0, y: 0 }, { x: q.x - n.x * 90, y: q.y - n.y * 90 }, styleOf(c));
    b.from = { id: c.id, t: 0.5 }; b.tail = 'none'; delete b.points;
    objs().push(b);
    state.sel = [b.id];
    render({ props: true });
    toast('Branch added: drag its end onto an object');
  }

  // Automatic legend: one sample of each kind of line on the page, with an editable name.
  const NAMES = { arrow: 'Activation', stealth: 'Activation', open: 'Activation', bar: 'Inhibition', dot: 'Binding', harpoon: 'Conversion', circle: 'Catalysis', odiamond: 'Modulation', otriangle: 'Stimulation', necstim: 'Necessary stimulation', diamond: 'Association', square: 'Association', cross: 'Blocked', none: 'Association' };
  function lineName(o) {
    const P = (globalThis.ShapeLib && ShapeLib.LINES) || [];
    const hit = P.find(([, p]) => (p.head || 'arrow') === (o.head || 'arrow') && (p.tail || 'none') === (o.tail || 'none') && (p.dashStyle || 'solid') === (o.dashStyle || 'solid') && (p.style || 'straight') === (o.style || 'straight') && !!p.flow === !!o.flow && !!p.gradTo === !!o.gradTo && (p.lineStyle || '') === (o.lineStyle || ''));
    if (hit) return hit[0].replace(/^SBGN /, '');
    let n = NAMES[o.head] || 'Interaction';
    if (o.tail && o.tail !== 'none' && o.tail === o.head) n = 'Reversible ' + n.toLowerCase();
    if (o.dashStyle === 'dashed') n += ' (indirect)';
    if (o.dashStyle === 'dotted') n += ' (proposed)';
    if (o.flow) n = 'Flow';
    return n;
  }
  function insertLegend() {
    const lines = objs().filter((o) => o.type === 'connector' && !o.hidden && o.style !== 'zoom');
    if (!lines.length) { toast('No lines on this page yet'); return; }
    const sig = (o) => JSON.stringify([o.head || 'arrow', o.tail || 'none', o.dashStyle || 'solid', (o.color || '#333').toLowerCase(), o.lineStyle || '', !!o.flow, o.gradTo || '']);
    const kinds = new Map();
    for (const o of lines) if (!kinds.has(sig(o))) kinds.set(sig(o), o);
    checkpoint();
    const pg = page(), W = pg.width || 1000, H = pg.height || 700, rows = [...kinds.values()], rowH = 26, x0 = W - 250, y0 = H - 40 - rows.length * rowH - 30;
    const made = [Make.rect(x0 - 12, y0 - 10, 238, rows.length * rowH + 44, { radius: 6 })];
    Object.assign(made[0], { fill: '#ffffff', stroke: '#c9d0d8', strokeWidth: 1 });
    const title = Make.text('{b|Legend}', x0, y0, { fontSize: 14 });
    made.push(title);
    rows.forEach((o, i) => {
      const y = y0 + 34 + i * rowH;
      const c = Make.connector({ x: x0, y }, { x: x0 + 58, y }, { ...styleOf(o), style: 'straight', ticks: undefined, tickLabels: undefined, measure: undefined, route: undefined, offset: undefined, jumps: undefined, flowWidth: o.flow ? 12 : undefined });
      const t = Make.text(lineName(o), x0 + 72, y - 9, { fontSize: 13 });
      made.push(c, t);
    });
    for (const m of made) if (m.type === 'text' && typeof postEdit === 'function') postEdit(m);
    made[0].w = Math.max(238, Math.max(...made.filter((m) => m.type === 'text').map((m) => m.x - x0 + m.w)) + 26); // fit the longest name
    objs().push(...made);
    state.sel = made.map((m) => m.id);
    groupSelection();
    const g = selected()[0];
    if (g) { g.name = 'Line legend'; if (typeof placeInFreeSpot === 'function') placeInFreeSpot(g); }
    render({ props: true });
    toast(`Legend with ${rows.length} line type${rows.length > 1 ? 's' : ''}: double-click a name to edit it`);
  }

  Object.assign(ARRANGE_COMMANDS, {
    lineBranch: () => branch('branch'), lineMerge: () => branch('merge'), lineTwoWay: twoWay, lineSelfLoop: selfLoopCmd,
    toggleQuickConnect: () => { state.view.quickConnect = state.view.quickConnect === false; if (typeof saveView === 'function') saveView(); renderOverlay(); toast(`Quick-connect arrows ${state.view.quickConnect === false ? 'off' : 'on'}`); },
    lineSwap: () => { const L = selected().filter((o) => o.type === 'connector'); if (!L.length) return; checkpoint(); for (const c of L) { [c.from, c.to] = [c.to, c.from]; if (c.points) c.points.reverse(); } render({ props: true }); },
    lineAddBranch: addBranchFromLine, selectConnected, lineConnectOrder: connectInOrder, pasteInPlace, removeFromPath, lineLegend: insertLegend, lineAutoRoute: () => setLines({ route: 'auto', style: 'elbow', radius: 8 }),
    lineClearBends: () => setLines({ points: undefined, route: undefined }), lineJumps: () => setLines({ jumps: true }), lineStraighten: straighten,
    equation: () => openEquationEditor(), geneStyle: () => openGeneHelper(),
  });
  // Straighten: move the object at the end of each selected line so the line runs exactly level or upright.
  function straighten() {
    const L = selected().filter((o) => o.type === 'connector');
    if (!L.length) { toast('Select a line between two objects'); return; }
    checkpoint();
    let moved = 0;
    for (const c of L) {
      const A = objOf(c.from, objs()), B = objOf(c.to, objs());
      if (!A || !B || A === B || A.type === 'connector' || B.type === 'connector' || B.locked) continue;
      const ca = c.from.at ? edgePoint(A, c.from.at) : c.from.port ? portPoint(A, c.from.port) : center(A);
      const cb = c.to.at ? edgePoint(B, c.to.at) : c.to.port ? portPoint(B, c.to.port) : center(B);
      if (Math.abs(cb.x - ca.x) >= Math.abs(cb.y - ca.y)) B.y += ca.y - cb.y; else B.x += ca.x - cb.x;
      moved++;
    }
    render({ props: true });
    if (!moved) toast('Straighten works on lines attached to two objects');
  }
  // Everything joined to the selection through lines (a whole pathway), lines included.
  function selectConnected() {
    const list = objs(), seen = new Set(state.sel);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of list) {
        if (c.type !== 'connector') continue;
        const ends = [c.from && c.from.id, c.to && c.to.id].filter(Boolean);
        if (seen.has(c.id) || ends.some((id) => seen.has(id))) {
          for (const id of [c.id, ...ends]) if (!seen.has(id)) { seen.add(id); grew = true; }
        }
      }
    }
    state.sel = list.filter((o) => seen.has(o.id) && !o.locked && !o.hidden).map((o) => o.id);
    render({ props: true });
    toast(`${state.sel.length} objects and lines selected`);
  }
  // Join the selected objects with lines in reading order (rows top to bottom, left to right within a row).
  function connectInOrder() {
    const list = nonLines();
    if (list.length < 2) { toast('Select two or more objects to connect'); return; }
    const rowH = Math.max(...list.map((o) => o.h)) * 0.6;
    const order = [...list].sort((a, b) => (Math.abs(center(a).y - center(b).y) > rowH ? center(a).y - center(b).y : center(a).x - center(b).x));
    checkpoint();
    const made = [];
    for (let i = 1; i < order.length; i++) made.push(Make.connector({ id: order[i - 1].id }, { id: order[i].id }, presetStyle()));
    objs().push(...made);
    state.sel = made.map((c) => c.id);
    render({ props: true });
  }
  // Drop an icon or shape onto a line between two objects: it goes into the path (A → new → B), both lines keeping
  // the original style.
  function splitLine(c, mid) {
    const second = { ...deep(c), id: uid(), from: { id: mid.id }, to: deep(c.to) };
    for (const k of ['label', 'labelAbove', 'labelBelow', 'sideIn', 'sideOut', 'points', 'tickLabels', 'ticks', 'measure']) delete second[k];
    c.to = { id: mid.id };
    delete c.points;
    const i = objs().indexOf(c);
    objs().splice(i + 1, 0, second);
  }
  stage.addEventListener('drop', (e) => {
    const types = [...(e.dataTransfer ? e.dataTransfer.types : [])];
    if (!types.some((t) => /x-scicanvas-(icon|shape|upload)/.test(t))) return;
    const hit = connectorAtPoint(toWorld(e));
    if (!hit || !hit.o.from.id || !hit.o.to.id) return;
    const line = hit.o, before = new Set(objs().map((o) => o.id));
    setTimeout(() => { // after the drop has added the object
      const added = objs().filter((o) => !before.has(o.id) && o.type !== 'connector');
      if (added.length !== 1 || !objs().includes(line)) return;
      splitLine(line, added[0]);
      render({ props: true });
      toast('Inserted into the line');
    }, 60);
  }, true);
  // Remove a step from a pathway: A → X → C becomes A → C (X and its outgoing line are deleted).
  function removeFromPath() {
    const steps = nonLines();
    if (!steps.length) return;
    checkpoint();
    let n = 0;
    for (const x of steps) {
      const ins = objs().filter((c) => c.type === 'connector' && c.to.id === x.id && c.from.id !== x.id);
      const outs = objs().filter((c) => c.type === 'connector' && c.from.id === x.id && c.to.id !== x.id);
      if (ins.length !== 1 || outs.length !== 1) continue;
      ins[0].to = deep(outs[0].to);
      page().objects = objs().filter((o) => o !== x && o !== outs[0]);
      n++;
    }
    state.sel = [];
    render({ props: true });
    toast(n ? `Removed ${n} step${n > 1 ? 's' : ''} and reconnected the path` : 'Works on objects with one line in and one line out');
  }
  // Tab / Shift+Tab: select the next / previous object (handy for small or overlapping ones).
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.metaKey || e.ctrlKey || e.altKey || (typeof isTyping === 'function' && isTyping())) return;
    if (!document.querySelector('#modal').classList.contains('hidden')) return;
    const list = objs().filter((o) => !o.hidden && !o.locked);
    if (!list.length) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const i = state.sel.length ? list.findIndex((o) => o.id === state.sel[state.sel.length - 1]) : -1;
    const next = list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length];
    state.sel = [next.id];
    render({ props: true });
  }, true);
  // Smart duplicate: after duplicating and moving the copy, the next ⌘D repeats that step (rows, grids, series).
  let lastDup = null; // { ids, from: { x, y } of the first copy when made, step: offset used }
  const firstPos = (ids) => { const o = objs().find((x) => x.id === ids[0]); return o ? (o.type === 'connector' ? connectorEnds(o, objs())[0] : { x: o.x, y: o.y }) : null; };
  if (typeof duplicateSelection === 'function') {
    duplicateSelection = function () {
      const sel = selected();
      if (!sel.length) return;
      let step = { x: 20, y: 20 };
      if (lastDup && lastDup.ids.length === state.sel.length && lastDup.ids.every((id, i) => id === state.sel[i])) {
        const now = firstPos(state.sel); // the copy was moved since: repeat its offset from the original
        if (now) step = { x: now.x - lastDup.orig.x, y: now.y - lastDup.orig.y };
      }
      const orig = firstPos(state.sel);
      const copies = cloneObjects(sel, objs(), 0);
      for (const c of copies) {
        if (c.type === 'connector') { for (const k of ['from', 'to']) if (!c[k].id) c[k] = { x: c[k].x + step.x, y: c[k].y + step.y }; if (c.points) c.points = c.points.map((q) => ({ x: q.x + step.x, y: q.y + step.y })); } else { c.x += step.x; c.y += step.y; }
      }
      addObjects(copies);
      lastDup = { ids: [...state.sel], orig };
    };
  }
  // Paste in place (⇧⌘V): what was copied, at its original position (e.g. onto another page).
  async function pasteInPlace() {
    const txt = window.native.readClipboardText ? await window.native.readClipboardText() : '';
    if (!txt || !txt.startsWith('scicanvas:')) { toast('Copy objects in SciCanvas first'); return; }
    try { addObjects(cloneObjects(JSON.parse(txt.slice(10)), [], 0)); } catch { toast('Could not paste'); }
  }
  function setLines(p) {
    const L = selected().filter((o) => o.type === 'connector');
    if (!L.length) return;
    checkpoint();
    for (const o of L) for (const [k, v] of Object.entries(p)) { if (v === undefined) delete o[k]; else o[k] = v; }
    render({ props: true });
  }

  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu(), sel = selected(), lines = sel.filter((o) => o.type === 'connector'), others = sel.filter((o) => o.type !== 'connector');
    const items = [];
    if (lines.length) items.push({ label: 'Line', submenu: [
      { label: 'Straighten (move the end object)', cmd: 'lineStraighten' }, { label: 'Route around objects', cmd: 'lineAutoRoute' }, { label: 'Remove bend points / routing', cmd: 'lineClearBends' }, { label: 'Hop over crossing lines', cmd: 'lineJumps' },
      { label: 'Add parallel return arrow', cmd: 'lineTwoWay' }, ...(lines.length === 1 ? [{ label: 'Add a branch from this line', cmd: 'lineAddBranch' }] : []),
    ] });
    if (others.length >= 2) items.push({ label: 'Connect in order (arrows)', cmd: 'lineConnectOrder' });
    if (others.length === 2) items.push({ label: 'Two-way arrows between these', cmd: 'lineTwoWay' });
    if (sel.length) items.push({ label: 'Select connected (whole pathway)', cmd: 'selectConnected' });
    if (others.length && !lines.length && others.some((x) => objs().some((c) => c.type === 'connector' && c.to.id === x.id) && objs().some((c) => c.type === 'connector' && c.from.id === x.id))) items.push({ label: 'Remove from pathway (reconnect)', cmd: 'removeFromPath' });
    if (others.length >= 3) items.push({ label: 'Branch: one → many', cmd: 'lineBranch' }, { label: 'Merge: many → one', cmd: 'lineMerge' });
    if (others.length === 1 && !lines.length) items.push({ label: 'Add feedback loop', cmd: 'lineSelfLoop' });
    if (!sel.length) items.push({ label: 'Insert equation (LaTeX)…', cmd: 'equation' }, { label: 'Insert line legend', cmd: 'lineLegend' }, { label: 'Insert colour legend', cmd: 'colourLegend' }, { label: 'Gene & protein names…', cmd: 'geneStyle' });
    if (!items.length) return t;
    const at = sel.length ? t.findIndex((it) => it.visual) : -1;
    if (at < 0) return [...t, { type: 'separator' }, ...items];
    return [...t.slice(0, at), ...items, { type: 'separator' }, ...t.slice(at)];
  };

  // ---------- ready-made lines and SBGN ----------
  const SL = globalThis.ShapeLib;
  const NEW_LINES = [
    ['Reaction with side reagents', { head: 'arrow', tail: 'none', style: 'straight', sideIn: 'ATP', sideOut: 'ADP' }],
    ['Dimension line', { head: 'bar', tail: 'bar', style: 'straight', headSize: 0.6, width: 1.5, measure: true }],
    ['Scale bar', { head: 'none', tail: 'none', style: 'straight', width: 5, measure: true, measureUnit: 'µm', measureScale: 0.1 }],
    ['Timeline', { head: 'arrow', tail: 'none', style: 'straight', width: 3, tickLabels: 'Day 0, Day 3, Day 7, Day 14' }],
    ['Flow arrow', { head: 'arrow', tail: 'none', style: 'curved', curve: 30, flow: true, flowWidth: 16, color: '#3b6fd6' }],
    ['Gradient arrow', { head: 'arrow', tail: 'none', style: 'straight', width: 3, color: '#3b6fd6', gradTo: '#d6584a' }],
    ['Double line', { head: 'none', tail: 'none', style: 'straight', lineStyle: 'double' }],
    ['Wavy arrow', { head: 'arrow', tail: 'none', style: 'straight', lineStyle: 'wavy' }],
    ['Zigzag arrow (energy, light)', { head: 'arrow', tail: 'none', style: 'straight', lineStyle: 'zigzag' }],
    ['Animated flow', { head: 'arrow', tail: 'none', style: 'curved', curve: 30, width: 2.5, color: '#3b6fd6', animate: true }],
    ['Auto-routed elbow', { head: 'arrow', tail: 'none', style: 'elbow', route: 'auto', radius: 8 }],
    ['Crossing with hops', { head: 'arrow', tail: 'none', style: 'straight', jumps: true }],
    ['SBGN consumption', { head: 'none', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN production', { head: 'arrow', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN modulation', { head: 'odiamond', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN stimulation', { head: 'otriangle', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN catalysis', { head: 'circle', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN inhibition', { head: 'bar', tail: 'none', style: 'straight', width: 1.5 }],
    ['SBGN necessary stimulation', { head: 'necstim', tail: 'none', style: 'straight', width: 1.5 }],
  ];
  if (SL) {
    SL.LINES.push(...NEW_LINES);
    for (const [n] of NEW_LINES) ARRANGE_COMMANDS['line:' + n] = () => SL.useLinePreset(n);
  }
  // SBGN Process Description glyphs.
  const SBGN = {
    sbgn_na: (w, h) => { const r = Math.min(h * 0.32, w / 4); return `M0 0 H${w} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} Z`; },
    sbgn_complex: (w, h) => { const k = Math.min(w, h) * 0.2; return `M${k} 0 H${w - k} L${w} ${k} V${h - k} L${w - k} ${h} H${k} L0 ${h - k} V${k} Z`; },
    sbgn_perturb: (w, h) => { const k = Math.min(w * 0.18, h * 0.5); return `M0 0 H${w} L${w - k} ${h / 2} L${w} ${h} H0 L${k} ${h / 2} Z`; },
    sbgn_sink: (w, h) => `M${w / 2} 0 A${w / 2} ${h / 2} 0 1 1 ${w / 2 - 0.01} 0 Z M${w * 0.06} ${h * 0.94} L${w * 0.94} ${h * 0.06}`,
    sbgn_dissoc: (w, h) => `M${w / 2} 0 A${w / 2} ${h / 2} 0 1 1 ${w / 2 - 0.01} 0 Z M${w / 2} ${h * 0.22} A${w * 0.28} ${h * 0.28} 0 1 1 ${w / 2 - 0.01} ${h * 0.22} Z`,
    sbgn_tag: (w, h) => `M0 0 H${w * 0.72} L${w} ${h / 2} L${w * 0.72} ${h} H0 Z`,
    sbgn_state: (w, h) => { const r = h / 2; return `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 ${r} 0 Z`; },
  };
  const prevPath = shapePath;
  shapePath = function (kind, w, h, o) { return SBGN[kind] ? SBGN[kind](w, h, o) : prevPath(kind, w, h, o); };
  if (SL) {
    const items = [
      { label: 'Macromolecule', kind: 'rect:10', w: 110, h: 60 }, { label: 'Simple chemical', kind: 'ellipse', w: 60, h: 60 },
      { label: 'Unspecified entity', kind: 'ellipse', w: 100, h: 56 }, { label: 'Nucleic acid feature', kind: 'sbgn_na', w: 110, h: 60 },
      { label: 'Complex', kind: 'sbgn_complex', w: 140, h: 90 }, { label: 'Perturbing agent', kind: 'sbgn_perturb', w: 110, h: 56 },
      { label: 'Phenotype', kind: 'hexagon', w: 110, h: 56, extra: { inset: 0.16 } }, { label: 'Source / sink', kind: 'sbgn_sink', w: 44, h: 44 },
      { label: 'Process', kind: 'rect:0', w: 22, h: 22 }, { label: 'Association', kind: 'ellipse', w: 22, h: 22 }, { label: 'Dissociation', kind: 'sbgn_dissoc', w: 26, h: 26 },
      { label: 'State variable', kind: 'sbgn_state', w: 44, h: 22 }, { label: 'Tag', kind: 'sbgn_tag', w: 80, h: 40 }, { label: 'Compartment', kind: 'rect:26', w: 240, h: 160 },
    ];
    SL.LIB.push(['SBGN', items]);
    for (const it of items) ARRANGE_COMMANDS[`insertshape:SBGN|${it.label}`] = () => SL.insertShape(it, SL.menuPoint());
  }

  // ---------- Properties ----------
  const prevProps = renderProps;
  renderProps = function () {
    prevProps();
    const L = selected().filter((o) => o.type === 'connector' && o.style !== 'zoom');
    if (!L.length || L.length !== selected().length) return;
    const o = L[0], re = (k, v) => { checkpoint(); for (const x of L) { if (v === undefined || v === '' || v === false) delete x[k]; else x[k] = v; } render({ props: true }); };
    const sel = (k, opts) => el('select', { onchange: (e) => re(k, e.target.value || undefined) }, ...opts.map(([v, l]) => el('option', { value: v, textContent: l, selected: String(o[k] ?? '') === v })));
    const tick = (k, label) => el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: !!o[k], onchange: (e) => re(k, e.target.checked || undefined) }), label);
    const txt = (k, ph) => el('input', { type: 'text', value: o[k] || '', placeholder: ph || '', oninput: (e) => { checkpoint('prop:' + k + L.map((x) => x.id).join()); for (const x of L) { if (e.target.value) x[k] = e.target.value; else delete x[k]; } renderScene(); markDirty(); } });
    const loop = selfLoop(o);
    // Collapsible groups: open when in use, otherwise as last left (remembered).
    const openState = (() => { try { return JSON.parse(localStorage.getItem('scicanvas:lineGroups') || '{}'); } catch { return {}; } })();
    const group = (title, used, ...kids) => {
      const d = el('details', { class: 'lx-group' }, el('summary', { textContent: title }), ...kids.filter(Boolean));
      d.open = used || !!openState[title];
      d.addEventListener('toggle', () => { openState[title] = d.open; try { localStorage.setItem('scicanvas:lineGroups', JSON.stringify(openState)); } catch { /* ignore */ } });
      return d;
    };
    const s = sect('Line extras',
      group('Path', true,
        row('Line', sel('lineStyle', [['', 'Single'], ['double', 'Double ═'], ['wavy', 'Wavy ∿'], ['zigzag', 'Zigzag ⩘']])),
        row('Route', sel('route', [['', 'As drawn'], ['auto', 'Around objects']])),
        (o.points && o.points.length) ? row('', btn(`Remove ${o.points.length} bend point${o.points.length > 1 ? 's' : ''}`, () => re('points', undefined))) : null,
        row('', tick('jumps', 'Hop over lines it crosses')),
        row('Gap at ends', el('input', { type: 'range', min: 0, max: 30, step: 1, value: o.endGap || 0, title: 'Stop the line short of the objects it joins', oninput: (e) => setProps(L, 'endGap', +e.target.value || undefined) })),
        row('Offset', el('input', { type: 'range', min: -20, max: 20, step: 1, value: o.offset || 0, oninput: (e) => setProps(L, 'offset', +e.target.value || 0) })),
        loop ? row('Loop side', sel('loopSide', [['n', 'Top'], ['e', 'Right'], ['s', 'Bottom'], ['w', 'Left']])) : null,
        loop ? row('Loop size', el('input', { type: 'range', min: 14, max: 140, step: 2, value: o.loopSize || 40, oninput: (e) => setProps(L, 'loopSize', +e.target.value) })) : null,
      ),
      group('Labels', !!(o.labelAbove || o.labelBelow || o.labelPos != null || o.labelAlong || o.labelBg),
        row('Above', txt('labelAbove', o.measure ? 'auto: length' : 'e.g. kinase')), row('Below', txt('labelBelow', 'e.g. 37 °C')),
        row('Labels at', el('input', { type: 'range', min: 0.05, max: 0.95, step: 0.01, value: o.labelPos ?? 0.5, oninput: (e) => setProps(L, 'labelPos', Math.abs(+e.target.value - 0.5) < 0.015 ? undefined : +e.target.value) })),
        row('', tick('labelAlong', 'Labels follow the line’s angle')),
        row('Label box', el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(o.labelBg || '') ? o.labelBg : '#ffffff', title: 'Colour of the box behind the label', oninput: (e) => setProps(L, 'labelBg', e.target.value) }),
          btn(o.labelBg === 'none' ? 'Show box' : 'No box', () => re('labelBg', o.labelBg === 'none' ? undefined : 'none'))),
      ),
      group('Reaction (cofactors)', !!(o.sideIn || o.sideOut),
        row('Side in', txt('sideIn', 'e.g. ATP')), row('Side out', txt('sideOut', 'e.g. ADP')),
        (o.sideIn || o.sideOut) ? row('', tick('sideFlip', 'Side arrow below the line')) : null,
      ),
      group('Style and measure', !!(o.gradTo || o.flow || o.measure || o.midArrows || o.animate),
        row('Gradient to', el('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(o.gradTo || '') ? o.gradTo : '#d6584a', oninput: (e) => setProps(L, 'gradTo', e.target.value) }), o.gradTo ? btn('None', () => re('gradTo', undefined)) : null),
        row('', tick('flow', 'Flow arrow (wide, tapered)')),
      row('', tick('animate', 'Animated flow (dashes move along the line)')),
        o.flow ? row('Flow width', el('input', { type: 'range', min: 6, max: 80, step: 1, value: o.flowWidth || 22, oninput: (e) => setProps(L, 'flowWidth', +e.target.value) })) : null,
        row('', tick('measure', 'Show length (scale bar)')),
        o.measure ? row('Units', txt('measureUnit', 'px'), el('input', { type: 'number', step: 'any', value: o.measureScale || 1, title: 'Units per pixel', style: 'width:70px', onchange: (e) => re('measureScale', parseFloat(e.target.value) || undefined) })) : null,
        row('Mid arrows', el('input', { type: 'number', min: 0, max: 20, step: 1, value: o.midArrows || 0, style: 'width:60px', title: 'Arrowheads along the line, showing its direction', onchange: (e) => re('midArrows', +e.target.value || undefined) })),
      ),
      group('Timeline', !!(o.ticks || o.tickLabels),
        row('Ticks', el('input', { type: 'number', min: 0, max: 40, step: 1, value: o.ticks || 0, style: 'width:60px', onchange: (e) => re('ticks', +e.target.value || undefined) })),
        row('Tick labels', txt('tickLabels', 'Day 0, Day 3, Day 7')),
      ),
      el('div', { class: 'btnrow' }, btn('Two-way', twoWay), btn('Add branch', addBranchFromLine), btn('Legend', insertLegend),
        btn('Use for new lines', () => { const st = styleOf(o); delete st.offset; globalThis.linePreset = st; toast('New lines (connector tool, quick-connect arrows) will use this style'); })),
      el('div', { class: 'note', textContent: 'Drop a line end onto another line to branch from it or merge into it; drop it on an object’s outline to pin it to that exact spot. Drag the small orange circles to add bend points.' }));
    const P = $('#props'), anchor = [...P.querySelectorAll('h3')].filter((h) => h.textContent === 'Connector').pop(); // the style section, after the name
    if (anchor && anchor.parentElement) anchor.parentElement.after(s); else P.append(s);
  };

  // ---------- Help topics ----------
  if (typeof HELP !== 'undefined') {
    const at = HELP.findIndex(([t]) => t === 'Connect objects') + 1 || HELP.length;
    HELP.splice(at, 0,
      ['Quick connect', 'Select one object: small arrows appear on its sides. Drag one onto another object to connect them, or click it to add a connected copy on that side. Option+Shift+Arrow does the same from the keyboard.'],
      ['Bend, route and hop lines', 'Select a line and drag the small orange circles to add bend points (double-click one to remove it). Arrange › Lines › Route Around Objects finds a path past everything in the way; Hop over Crossing Lines adds little bridges where lines cross.'],
      ['Branch and merge lines', 'Drop a line’s end onto another line to branch from it or merge into it. Or select three or more objects, right-click, and choose Branch (one → many) or Merge (many → one). Drag an end onto an object’s outline to pin it to that exact spot.'],
      ['Reaction arrows, labels and cofactors', 'In Properties › Line extras: Side in / Side out draw a curved cofactor arrow (ATP → ADP); Above / Below add labels on either side; “Labels at” slides them along the line and “follow the line’s angle” turns them with it. Mid arrows show direction on long lines.'],
      ['Scale bars, dimensions and timelines', 'Line style menu (right-click): Dimension line and Scale bar show their length in your units (set Units in Line extras); Timeline adds ticks with labels such as Day 0, Day 7. Flow arrows, gradient, double, wavy and zigzag lines are there too.'],
      ['SBGN', 'Shapes › SBGN has the process-description glyphs; Line style has the SBGN arcs (production, consumption, catalysis, stimulation, necessary stimulation, modulation, inhibition). Insert › Line Legend explains the lines on a page.'],
      ['Equations', 'Insert › Equation (LaTeX)… renders LaTeX and chemistry (\\ce{…}) without internet. Double-click an equation to edit it.'],
      ['Gene and protein names', 'Edit › Gene & Protein Names… lists gene / protein symbols in your text, guesses which is which from nearby words, and sets italics (genes) and human or mouse capitalisation once you have checked them.'],
      ['Insert into a pathway', 'Drag an icon or shape from the library onto a line between two objects: it goes into the path (A → new → B) and both lines keep their style. Drag a line style from the Shapes tab onto a line to restyle it, or onto the page to draw one.'],
      ['Connect and select pathways', 'Select several objects, right-click › Connect in order to join them with arrows in reading order. Select connected (right-click or Arrange › Lines) selects everything linked to the selection through lines, so a whole pathway moves together. Tab / Shift+Tab steps through objects one at a time.'],
      ['Quick add and paste here', 'Press / over the canvas and type to add an icon right where the pointer is (arrow keys to choose, Enter to add). Right-click empty canvas › Paste here pastes at that spot; ⇧⌘V pastes in place.'],
      ['Formulas, units and symbols', 'Select text, right-click › Format chemical formulas (H2O → H₂O, Ca2+ → Ca²⁺, SO42- → SO₄²⁻), or the H₂O button in the text bar while typing. Tidy units & symbols turns 10 um into 10 µm, 5ug/ml into 5 µg/mL, 37 C into 37 °C, +/- into ±, and -> into →.'],
      ['Format painter', 'Select an object and click the paint-roller button on the floating toolbar (or right-click › Format painter), then click other objects to give them the same style. Esc or a click on empty canvas stops.'],
      ['Colour legend', 'Insert › Colour Legend (or right-click empty canvas) adds a key with one swatch per colour used by shapes and icons, named after the first thing in that colour. Double-click a name to edit it.'],
      ['Timeline builder', 'Insert › Builders › Timeline…: one line per time point (“Day 0: tumour implant”, “Week 2: boost”). You get a timeline arrow with ticks and labels, and each event above its tick with a matching icon (swap any with Replace icon).'],
      ['Cohort builder', 'Insert › Builders › Cohort / Study Groups…: one line per group (“Vehicle: 8”). Each group becomes a row of that many mice (or rats, people, flasks, tubes) in its own colour, labelled with n.'],
      ['Gating strategy builder', 'Insert › Builders › Gating Strategy…: type gates from parent to child separated by “>”, and split with “/” (Lymphocytes > Live > CD3+ > CD4+ / CD8+). You get dot-plot icons joined by arrows; replace them with your own plots.'],
      ['Western blot builder', 'Insert › Builders › Western Blot…: “Lanes: Ctrl, EGF 5′…” then one line per protein with band intensities 0–1 and the size in brackets (“p-ERK (42 kDa): 0.1, 0.8, 1”). You get strips with graded bands, angled lane labels, names and sizes.'],
      ['Significance brackets', 'Select two bars, images or groups, right-click › Significance bracket (or Insert › Significance Bracket). A bracket with * goes above them; double-click the * to change it to **, ns or a p value.'],
      ['Right-click menus', 'Right-click the canvas for picture menus of tools, shapes, line styles and brushes; right-click a toolbar button for its variants.']);
  }

  // ---------- Keyboard shortcuts, listed at the end of Help ----------
  if (typeof openHelpDialog === 'function') {
    const prevHelp = openHelpDialog;
    openHelpDialog = async function () {
      prevHelp();
      const body = document.querySelector('#modalBody');
      if (!body) return;
      const rows = [];
      try { for (const c of (await window.native.menuCommands()) || []) if (c.accel) rows.push([c.path.slice(-1)[0].replace(/…$/, ''), c.accel]); } catch { /* menus unavailable */ }
      const TOOLS_KEYS = [['Select', 'V'], ['Pan (or hold Space)', 'H'], ['Text', 'T'], ['Rectangle', 'R'], ['Ellipse', 'E'], ['Shapes', 'S'], ['Connector', 'C'], ['Brush', 'B'], ['Pencil', 'D'], ['Pen', 'P'], ['Line', 'L'], ['Arrow', 'A'], ['Airbrush', 'W'], ['Numbered badge', 'N'], ['Comment', 'M'], ['Lasso', 'Q']];
      const CANVAS = [['Nudge 1 px / 10 px', '←↑→↓ / ⇧←↑→↓'], ['Add a connected copy', '⌥⇧←↑→↓'], ['Next / previous object', 'Tab / ⇧Tab'], ['Delete', '⌫'], ['Deselect, back to pointer', 'Esc'], ['Duplicate while dragging', '⌥-drag'], ['Turn snapping off while dragging', 'hold ⌘'], ['Constrain angle / proportions', 'hold ⇧'], ['Paste in place', '⇧⌘V'], ['Add an icon at the pointer', '/']];
      const table = (title, list) => el('details', { class: 'help', open: title === 'Tools' }, el('summary', { textContent: title, style: 'cursor:pointer;font-weight:600' }),
        el('div', { style: 'display:grid;grid-template-columns:1fr auto;gap:2px 16px;margin-top:6px;font-size:13px' }, ...list.flatMap(([a, k]) => [el('span', { textContent: a }), el('kbd', { textContent: k, style: 'font-family:inherit;color:#4a525c' })])));
      body.firstChild.append(el('h3', { textContent: 'Keyboard shortcuts', style: 'margin:16px 0 6px;font-size:14px' }), table('Tools', TOOLS_KEYS), table('On the canvas', CANVAS), rows.length ? table('Menu commands', rows) : null);
    };
  }

  // ---------- Figure check (Check tab): common line mistakes ----------
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      const list = p.objects, lines = list.filter((o) => o.type === 'connector' && !o.hidden && o.style !== 'zoom');
      const add = (sev, msg, o, fix, fixLabel) => r.issues.push({ sev, kind: 'Lines', msg, id: o && o.id, fix, fixLabel });
      const nameOf = (o) => (o.name || o.label || (typeof layerName === 'function' ? layerName(o) : o.type) || '').toString().slice(0, 40);
      // A free end lying on an object's outline looks attached but won't follow when the object moves.
      for (const c of lines) {
        const ends = connectorEnds(c, list);
        ['from', 'to'].forEach((k, i) => {
          if (c[k].id) return;
          const q = ends[i];
          const near = list.find((o) => o !== c && o.type !== 'connector' && !o.hidden && o.type !== 'text' && (() => { const b = bounds(o, list), m = 6; return q.x > b.x - m && q.x < b.x + b.w + m && q.y > b.y - m && q.y < b.y + b.h + m && b.w * b.h < p.width * p.height * 0.25; })());
          if (near) add('warn', `${nameOf(c) || 'A line'}: its ${k === 'from' ? 'start' : 'end'} touches ${nameOf(near)} but isn't attached, so it won't follow if ${nameOf(near)} moves.`, c, () => { const at = edgePointAt(near, q); c[k] = at ? { id: near.id, at } : { id: near.id }; }, 'Attach');
        });
      }
      // Crossings without hops.
      const P = lines.map((c) => geom(c, list).pts);
      let crossings = 0;
      for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) {
        if (lines[a].jumps || lines[b].jumps) continue;
        const shared = ['from', 'to'].some((k) => ['from', 'to'].some((j) => lines[a][k].id && lines[a][k].id === lines[b][j].id));
        if (shared) continue;
        for (let i = 1; i < P[a].length; i++) for (let j = 1; j < P[b].length; j++) if (segX(P[a][i - 1], P[a][i], P[b][j - 1], P[b][j]) != null) crossings++;
      }
      if (crossings) add('info', `${crossings} place${crossings > 1 ? 's' : ''} where lines cross. Hops make the paths easier to follow.`, null, () => { for (const c of lines) c.jumps = true; }, 'Add hops');
      // Dashed / dotted lines usually mean something (indirect, proposed): say so in a legend.
      const styled = lines.filter((c) => (c.dashStyle && c.dashStyle !== 'solid') || c.lineStyle);
      // Several fonts by accident: offer the most common one everywhere.
      const fams = new Map(), walkF = (os) => { for (const o of os) { if (o.type === 'text') fams.set(o.family || 'sans', (fams.get(o.family || 'sans') || 0) + 1); else if (o.label && ['rect', 'ellipse', 'shape'].includes(o.type)) fams.set(o.labelFamily || 'sans', (fams.get(o.labelFamily || 'sans') || 0) + 1); if (o.children) walkF(o.children); } };
      walkF(list);
      if (fams.size > 2) {
        const top = [...fams].sort((a, b) => b[1] - a[1])[0][0], nm = (k) => ((typeof FONT_NAMES !== 'undefined' && FONT_NAMES.find(([x]) => x === k)) || [k, k])[1].replace(' ✦', '').replace(' (default)', '');
        r.issues.push({ sev: 'info', kind: 'Fonts', msg: `${fams.size} different fonts (${[...fams.keys()].map(nm).join(', ')}). One or two fonts look more consistent.`, fixLabel: `Use ${nm(top)}`,
          fix: () => { const walk = (os) => { for (const o of os) { if (o.type === 'text') o.family = top; else if (o.label && ['rect', 'ellipse', 'shape'].includes(o.type)) o.labelFamily = top; if (typeof postEdit === 'function' && (o.type === 'text' || o.label)) postEdit(o); if (o.children) walk(o.children); } }; walk(list); } });
      }
      // Labels wider or taller than the shape they sit in.
      for (const o of list) {
        if (o.hidden || !o.label || !['rect', 'ellipse', 'shape'].includes(o.type)) continue;
        const fs = o.labelSize || 16, lines = String(o.label).split('\n');
        const plain = (t) => t.replace(/\{[^|{}]*\||\}|[\^_]\{/g, '');
        const wMax = Math.max(...lines.map((l) => measureText(plain(l), fs, o.labelFamily || 'sans', o.labelBold, o.labelItalic).w)), hTot = lines.length * fs * 1.25;
        const room = (o.type === 'ellipse' ? 0.72 : 0.92), fit = Math.min((o.w * room - 4) / wMax, (o.h * room) / hTot);
        if (fit < 0.97) r.issues.push({ sev: 'warn', kind: 'Text', msg: `${nameOf(o)}: the label doesn't fit inside the shape`, id: o.id, fixLabel: 'Fit label', fix: () => {
          // try two balanced lines first (long names), then shrink only as much as still needed
          let label = o.label, best = fit;
          if (lines.length === 1 && /\s/.test(label)) {
            const words = label.split(/\s+/);
            let cand = null;
            for (let i = 1; i < words.length; i++) {
              const two = [words.slice(0, i).join(' '), words.slice(i).join(' ')], w2 = Math.max(...two.map((l) => measureText(plain(l), fs, o.labelFamily || 'sans', o.labelBold, o.labelItalic).w));
              const f2 = Math.min((o.w * room - 4) / w2, (o.h * room) / (2 * fs * 1.25));
              if (!cand || f2 > cand.f) cand = { f: f2, text: two.join('\n') };
            }
            if (cand && cand.f > best) { best = cand.f; label = cand.text; }
          }
          o.label = label;
          if (best < 1) o.labelSize = Math.max(6, Math.floor(fs * best * 10) / 10);
        } });
      }
      // Text running into other text.
      const texts = list.filter((o) => o.type === 'text' && !o.hidden && String(o.text || '').trim());
      const tb = texts.map((o) => bounds(o, list));
      const clashed = new Set();
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const A = tb[i], B = tb[j], ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ox > 2 && oy > 2 && ox * oy > Math.min(A.w * A.h, B.w * B.h) * 0.15 && !clashed.has(texts[j].id)) {
          clashed.add(texts[j].id);
          r.issues.push({ sev: 'warn', kind: 'Text', msg: `“${String(texts[j].text).replace(/\{[^|{}]*\||\}|[\^_]\{/g, '').slice(0, 24)}” overlaps “${String(texts[i].text).replace(/\{[^|{}]*\||\}|[\^_]\{/g, '').slice(0, 24)}”`, id: texts[j].id });
        }
      }
      // Almost aligned: edges or centres 0.5–3 px apart look like a mistake; line them up exactly.
      const shapes = list.filter((o) => !o.hidden && o.type !== 'connector' && o.type !== 'comment' && !o.rot && !o.locked);
      const near = [];
      const keys = [['x', (o) => o.x], ['centre x', (o) => o.x + o.w / 2], ['right edge', (o) => o.x + o.w], ['y', (o) => o.y], ['centre y', (o) => o.y + o.h / 2], ['bottom edge', (o) => o.y + o.h]];
      for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) for (const [nmK, f] of keys) {
        const d = f(shapes[j]) - f(shapes[i]);
        if (Math.abs(d) >= 0.5 && Math.abs(d) <= 3) { near.push([shapes[i], shapes[j], nmK, d]); break; }
      }
      if (near.length) r.issues.push({ sev: 'info', kind: 'Layout', msg: `${near.length} pair${near.length > 1 ? 's' : ''} of objects ${near.length > 1 ? 'are' : 'is'} almost aligned (0.5–3 px off), e.g. ${nameOf(near[0][0])} and ${nameOf(near[0][1])}.`, id: near[0][1].id, fixLabel: 'Line them up',
        fix: () => { const moved = new Set(); for (const [, b, k, d] of near) { if (moved.has(b.id)) continue; moved.add(b.id); if (/x|right/.test(k)) b.x -= d; else b.y -= d; } } });
      const hasLegend = list.some((o) => o.type === 'group' && /legend/i.test(o.name || ''));
      if (styled.length && !hasLegend) add('info', `${styled.length} dashed, dotted or styled line${styled.length > 1 ? 's' : ''} but no line legend to say what each style means.`, null, () => insertLegend(), 'Add legend');
      return r;
    };
  }

  // ---------- PowerPoint: lines PowerPoint can't draw go in as pictures ----------
  if (typeof pictureOnly === 'function') {
    const prevPic = pictureOnly;
    pictureOnly = function (o) { return o.type === 'connector' && fancy(o, []) ? 'lines with bend points or special styles' : prevPic(o); };
  }

  // ---------- LaTeX equations (MathJax, bundled, works offline) ----------
  let mjReady = null;
  function loadMathJax() {
    if (mjReady) return mjReady;
    mjReady = new Promise((res, rej) => {
      window.MathJax = { tex: { packages: { '[+]': ['mhchem', 'ams'] } }, svg: { fontCache: 'none' }, startup: { typeset: false, ready: () => { MathJax.startup.defaultReady(); MathJax.startup.promise.then(res); } } };
      const sc = document.createElement('script');
      sc.src = '../node_modules/mathjax/es5/tex-svg-full.js';
      sc.onerror = () => { mjReady = null; rej(new Error('MathJax could not be loaded')); };
      document.head.append(sc);
    });
    return mjReady;
  }
  function texToSvg(tex, color) {
    const node = MathJax.tex2svg(tex, { display: true }), s = node.querySelector('svg'), bad = node.querySelector('[data-mjx-error]');
    if (bad) throw new Error(bad.getAttribute('data-mjx-error') || 'Check the LaTeX');
    if (!s) throw new Error('Check the LaTeX');
    const ex = (v) => parseFloat(v) || 1;
    // MathJax boxes are tight (italic overhangs touch the edge): add a small margin all round.
    const [x, y, vw, vh] = s.getAttribute('viewBox').split(/[\s,]+/).map(Number), pad = vh * 0.08;
    s.setAttribute('viewBox', [x - pad, y - pad, vw + 2 * pad, vh + 2 * pad].map((n) => r2(n)).join(' '));
    const w = ex(s.getAttribute('width')) * (vw + 2 * pad) / vw, h = ex(s.getAttribute('height')) * (vh + 2 * pad) / vh;
    s.removeAttribute('style'); s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return { svg: s.outerHTML.replace(/currentColor/g, color), w, h };
  }
  globalThis.texToSvg = texToSvg;
  const SNIPPETS = [['\\frac{a}{b}', 'a/b'], ['x^{2}', 'xⁿ'], ['x_{i}', 'xᵢ'], ['\\sqrt{x}', '√'], ['\\sum_{i=1}^{n}', 'Σ'], ['\\int_{a}^{b}', '∫'], ['\\alpha', 'α'], ['\\beta', 'β'], ['\\gamma', 'γ'], ['\\Delta', 'Δ'], ['\\mu', 'µ'], ['\\pm', '±'], ['\\times', '×'], ['\\leq', '≤'], ['\\geq', '≥'], ['\\approx', '≈'], ['\\rightarrow', '→'], ['\\rightleftharpoons', '⇌'], ['\\ce{H2O}', 'ce'], ['K_{d} = \\frac{[A][B]}{[AB]}', 'Kd'], ['v = \\frac{V_{max}[S]}{K_{m} + [S]}', 'M-M']];
  function openEquationEditor(edit) {
    const o = edit && edit.latex != null ? edit : null;
    const ta = el('textarea', { rows: 3, style: 'width:100%;font-family:ui-monospace,Menlo,monospace;font-size:13px', value: o ? o.latex : 'v = \\frac{V_{max}[S]}{K_m + [S]}' });
    const colorIn = el('input', { type: 'color', value: (o && o.latexColor) || '#222222' });
    const sizeIn = el('input', { type: 'number', min: 8, max: 120, step: 1, value: (o && o.latexSize) || 24, style: 'width:64px' });
    const preview = el('div', { style: 'min-height:90px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:8px;padding:12px;margin:8px 0;background:#fff;overflow:auto' });
    const err = el('div', { class: 'note', style: 'color:#c0392b;min-height:16px' });
    let last = null;
    const update = () => {
      try { last = texToSvg(ta.value, colorIn.value); preview.innerHTML = last.svg; const s = preview.querySelector('svg'); if (s) { s.style.height = `${last.h * (+sizeIn.value || 24) * 0.45}px`; s.style.width = 'auto'; s.style.maxWidth = '100%'; } err.textContent = ''; } catch (e) { last = null; err.textContent = e.message || 'Check the LaTeX'; }
    };
    const insertSnip = (t) => { const a = ta.selectionStart, b = ta.selectionEnd; ta.value = ta.value.slice(0, a) + t + ta.value.slice(b); ta.focus(); ta.selectionStart = ta.selectionEnd = a + t.length; update(); };
    const snips = el('div', { style: 'display:flex;flex-wrap:wrap;gap:3px;margin:6px 0' }, ...SNIPPETS.map(([t, l]) => el('button', { textContent: l, title: t, style: 'padding:2px 7px;font-size:12px', onclick: () => insertSnip(t) })));
    const go = el('button', { class: 'primary', textContent: o ? 'Update equation' : 'Insert equation', onclick: () => {
      update();
      if (!last) return;
      checkpoint();
      const fs = +sizeIn.value || 24, k = fs * 0.45, key = addSvgAsset('Equation', last.svg);
      if (o) {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        Object.assign(o, { iconId: key, w: last.w * k, h: last.h * k, latex: ta.value, latexColor: colorIn.value, latexSize: fs, x: cx - (last.w * k) / 2, y: cy - (last.h * k) / 2 });
        render({ props: true });
      } else {
        const c = (globalThis.ShapeLib && ShapeLib.menuPoint()) || viewCenter();
        addObjects([{ id: uid(), type: 'icon', iconId: key, x: c.x - (last.w * k) / 2, y: c.y - (last.h * k) / 2, w: last.w * k, h: last.h * k, rot: 0, name: 'Equation', latex: ta.value, latexColor: colorIn.value, latexSize: fs }]);
      }
      closeModal();
    } });
    ta.addEventListener('input', update); colorIn.addEventListener('input', update); sizeIn.addEventListener('input', update);
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') go.click(); e.stopPropagation(); });
    const body = el('div', { style: 'width:min(560px,80vw)' },
      el('div', { class: 'note', textContent: 'Type LaTeX. Chemistry works too: \\ce{2H2 + O2 -> 2H2O}. Rendered offline; double-click the equation later to edit it.' }),
      snips, ta, preview, err, el('div', { class: 'row' }, el('label', { textContent: 'Colour' }), colorIn, el('label', { textContent: 'Size', style: 'width:auto;margin-left:12px' }), sizeIn), el('div', { class: 'btnrow', style: 'margin-top:8px' }, go));
    openModal(o ? 'Edit equation' : 'Insert equation', body);
    preview.textContent = 'Loading the equation renderer…';
    loadMathJax().then(update, (e) => { preview.textContent = ''; err.textContent = e.message; });
    setTimeout(() => ta.focus(), 50);
  }
  globalThis.openEquationEditor = openEquationEditor;
  svg.addEventListener('dblclick', (e) => {
    const o = hitObject(e.target);
    if (o && o.type === 'icon' && o.latex != null) { e.stopImmediatePropagation(); openEquationEditor(o); }
  }, true);

  // ---------- Gene / protein names ----------
  // Convention: gene symbols in italics, proteins upright (human TP53 / TP53; mouse Trp53 / TRP53). Whether a symbol
  // names the gene or the protein depends on the sentence, so this lists every candidate for a quick review.
  const NOT_GENES = new Set('DNA RNA ATP ADP AMP GTP GDP NAD NADH NADP FAD PCR RT QPCR ELISA FACS PBS LPS ROS ER UV IV IP CNS PNS HIV HBV HCV SARS COVID UK USA LOD SEM SD MRI CT PET ECM BBB GFP RFP YFP CFP NIH WHO CRISPR KO WT IC EC HPLC PH ICU MHC TCR BCR NK DC II III IV VI VII VIII IX XI XII ON OFF AND THE FOR NOT'.split(' '));
  const GENE_HINT = /\b(gene|genes|mRNA|transcript|expression|promoter|knock-?out|knock-?down|locus|allele|mutant|mutation|siRNA|shRNA|sgRNA|deletion|-\/-|\+\/-)\b/i;
  const PROT_HINT = /\b(protein|kinase|phosphorylat\w*|receptor|enzyme|ligand|binds|antibody|complex|activity|cleav\w*|secret\w*|degrad\w*)\b/i;
  const TOKEN = /(?<![\w{])([A-Z][A-Z0-9]{1,9}(?:-[A-Z0-9]+)?|[A-Z][a-z]{1,5}\d[a-z0-9]{0,4})(?!\w)/g;
  function textFields() {
    const out = [];
    const walk = (list) => { for (const o of list) { if (o.type === 'group' && o.children) walk(o.children); if (o.type === 'text' && o.text) out.push([o, 'text']); for (const k of ['label', 'labelAbove', 'labelBelow']) if (o[k]) out.push([o, k]); } };
    walk(objs());
    return out;
  }
  function openGeneHelper() {
    const found = new Map();
    for (const [o, k] of textFields()) {
      const t = String(o[k]);
      for (const m of t.matchAll(TOKEN)) {
        const tok = m[1];
        if (NOT_GENES.has(tok) || (!/\d/.test(tok) && tok.length < 3)) continue;
        const ctx = t.slice(Math.max(0, m.index - 40), m.index + tok.length + 40);
        const italic = new RegExp(`\\{[bus]*i[bus]*(#[0-9a-fA-F]{3,8})?[bus]*\\|[^{}]*\\b${tok}\\b`).test(t) || (k === 'text' && o.italic);
        const f = found.get(tok) || { tok, refs: [], ctx, italic, hint: '' };
        f.refs.push([o, k]);
        if (!f.hint) { // the nearest words decide: “BRCA1 expression” → gene, “MDM2 protein” → protein
          const after = t.slice(m.index + tok.length, m.index + tok.length + 24), before = t.slice(Math.max(0, m.index - 24), m.index);
          f.hint = GENE_HINT.test(after) ? 'gene' : PROT_HINT.test(after) ? 'protein' : GENE_HINT.test(before) ? 'gene' : PROT_HINT.test(before) ? 'protein' : '';
        }
        found.set(tok, f);
      }
    }
    const list = [...found.values()];
    const body = el('div', { style: 'width:min(640px,85vw)' });
    if (!list.length) { body.append(el('p', { textContent: 'No gene or protein symbols found in the text on this page.' })); openModal('Gene & protein names', body); return; }
    const species = el('select', {}, ...[['human', 'Human: gene TP53 (italic), protein TP53'], ['mouse', 'Mouse: gene Trp53 (italic), protein TRP53'], ['keep', 'Keep capitalisation as typed']].map(([v, l]) => el('option', { value: v, textContent: l })));
    const choices = new Map();
    const table = el('div', { style: 'max-height:50vh;overflow:auto;border:1px solid var(--border);border-radius:8px' });
    for (const f of list) {
      const pick = el('select', {}, ...[['skip', 'Leave as is'], ['gene', 'Gene → italic'], ['protein', 'Protein → upright']].map(([v, l]) => el('option', { value: v, textContent: l, selected: v === (f.hint || 'skip') })));
      choices.set(f.tok, pick);
      table.append(el('div', { style: 'display:flex;gap:10px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--border)' },
        el('b', { textContent: f.tok, style: `min-width:90px;font-style:${f.italic ? 'italic' : 'normal'}` }),
        el('span', { class: 'note', style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', textContent: `…${f.ctx.replace(/\{[^|{}]*\||\}/g, '')}…  (${f.refs.length}×)` }), pick));
    }
    const apply = el('button', { class: 'primary', textContent: 'Apply', onclick: () => {
      checkpoint();
      let n = 0;
      const sp = species.value;
      for (const f of list) {
        const how = choices.get(f.tok).value;
        if (how === 'skip') continue;
        let shown = f.tok;
        if (sp !== 'keep' && /\d|[A-Z]{2}/.test(f.tok)) shown = how === 'gene' && sp === 'mouse' ? f.tok[0].toUpperCase() + f.tok.slice(1).toLowerCase() : f.tok.toUpperCase();
        for (const [o, k] of f.refs) {
          let t = String(o[k]);
          // unwrap an existing italic span around the symbol, then wrap again when it's a gene
          t = t.replace(new RegExp(`\\{i\\|(${f.tok})\\}`, 'g'), '$1');
          t = t.replace(new RegExp(`(?<![\\w{|])${f.tok}(?![\\w}])`, 'g'), how === 'gene' ? `{i|${shown}}` : shown);
          if (t !== o[k]) { o[k] = t; n++; if (typeof postEdit === 'function') postEdit(o); }
        }
      }
      closeModal(); render({ props: true });
      toast(n ? `Updated ${n} text${n > 1 ? 's' : ''}` : 'Nothing to change');
    } });
    body.append(el('p', { class: 'note', textContent: 'Gene symbols are written in italics and proteins upright. Whether a symbol names the gene or the protein depends on the sentence, so check each one. Guesses come from nearby words (“expression”, “knockout” → gene; “phosphorylation”, “binds” → protein).' }),
      el('div', { class: 'row' }, el('label', { textContent: 'Species' }), species), table, el('div', { class: 'btnrow', style: 'margin-top:10px' }, apply));
    openModal('Gene & protein names', body);
  }
  globalThis.openGeneHelper = openGeneHelper;
})();
