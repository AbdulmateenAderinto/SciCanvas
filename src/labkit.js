// Labware kit: tubes, bottles, glassware and flasks drawn to their real proportions (millimetres scaled to icon
// units), in the BioRender-like finish of src/refinedkit.js. Used by refined3.js and refined5.js.
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, path, rect, ell, stroke, flat, text, part, poly, glint, view, prism, cyl, rrect, ptsD } = K;
  const GL = PAL.glassLine;

  // A vessel described by its half-width profile hw(y) between y0 and y1 (centre x = cx). Returns the outline path.
  function profile(cx, y0, y1, hw, n = 40) {
    const L = [], R = [];
    for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n, w = hw(y); L.push([cx - w, y]); R.push([cx + w, y]); }
    return poly(L.concat(R.reverse()));
  }
  // Same, but with a flat base at yB whose corners are rounded with radius r (bottles, flasks).
  function vessel(cx, y0, yB, hw, r, n = 40) {
    const Lp = [], Rp = [], y1 = yB - r;
    for (let i = 0; i <= n; i++) { const y = y0 + ((y1 - y0) * i) / n, w = hw(y); Lp.push([cx - w, y]); Rp.push([cx + w, y]); }
    const wb = hw(y1);
    return poly(Lp, false) + ` Q${f(cx - wb)} ${f(yB)} ${f(cx - wb + r)} ${f(yB)} H${f(cx + wb - r)} Q${f(cx + wb)} ${f(yB)} ${f(cx + wb)} ${f(y1)} L` + Rp.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
  }
  const liquidIn = (cx, yL, y1, hw, inset = 0.6) => profile(cx, yL, y1 - inset * 0.6, (y) => Math.max(0, hw(y) - inset));
  const ticks = (x, y0, y1, n, o = {}) => {
    let s = '';
    for (let i = 0; i <= n; i++) {
      const y = y1 - ((y1 - y0) * i) / n, major = i % (o.every ?? 2) === 0, w = major ? (o.major ?? 5) : (o.minor ?? 3);
      s += stroke(`M${f(o.right ? x - w : x)} ${f(y)} h${f(w)}`, o.c || '#7f97a8', o.w ?? 0.5);
      if (major && o.nums && i > 0) s += text(o.right ? x - w - 1.2 : x + w + 1.2, y + 0.9, o.nums(i), o.fs ?? 2.4, o.c || '#7f97a8', { anchor: o.right ? 'end' : 'start', weight: 400 });
    }
    return s;
  };

  // ---------- Falcon / conical centrifuge tubes ----------
  // Real sizes: 15 mL = Ø17 × 120 mm (cap Ø21 × 13), 50 mL = Ø30 × 115 mm (cap Ø35 × 17); conical tip ≈ 21 mm.
  const FALCON = { 15: { d: 17, len: 120, cd: 21, ch: 13, cone: 22, tip: 2.4, max: 15, grad: 92 }, 50: { d: 30, len: 115, cd: 35, ch: 17, cone: 20, tip: 4.5, max: 50, grad: 80 } };
  function falcon(ml, o = {}) {
    const t = FALCON[ml], s = o.s ?? 0.82, W = t.cd * s + 4, cx = W / 2, hw0 = (t.d * s) / 2;
    const yTop = 2 + t.ch * s * 0.72 + (o.open ? 10 : 0), yC = yTop + (t.len - t.cone) * s, yB = yTop + t.len * s;
    const hw = (y) => (y <= yC ? hw0 : t.tip * s * 0.5 + (hw0 - t.tip * s * 0.5) * Math.sqrt(Math.max(0, 1 - ((y - yC) / (yB - yC)) ** 1.6)));
    const capC = o.cap || '#e0803e';
    let s1 = '';
    const tubeD = profile(cx, yTop, yB, hw);
    s1 += part('tube', path(tubeD, PAL.glass, { stroke: GL, op: 0.8 }) + flat(`M${f(cx - hw0 + 0.6)} ${f(yTop + 1)} h${f(hw0 * 2 - 1.2)} v${f(5 * s)} h${f(-hw0 * 2 + 1.2)} Z`, '#dbe8ee', 0.9));
    if (o.level != null && o.level > 0) { // level: fraction of the graduated volume
      const yL = yB - (t.grad * s) * Math.min(1, o.level);
      s1 += part('liquid', path(liquidIn(cx, yL, yB, hw), o.c || '#9fd1ec', { op: 0.85, w: 0.6 }) + stroke(`M${f(cx - hw(yL) + 0.8)} ${f(yL + 0.4)} H${f(cx + hw(yL) - 0.8)}`, '#ffffff', 0.7, { op: 0.6 }));
    }
    if (o.pellet) s1 += part('pellet', path(profile(cx, yB - 4.5 * s, yB - 0.6, (y) => Math.max(0, hw(y) - 0.7), 10), o.pellet, { w: 0.5 }));
    if (o.schematic) {
      s1 += part('label', rect(cx - hw0 * 0.62, yTop + 10 * s, hw0 * 1.24, 34 * s, 0.8, '#ffffff', { stroke: '#c3cad1', w: 0.6 })
        + `<text x="${f(cx)}" y="${f(yTop + 27 * s)}" transform="rotate(-90 ${f(cx)} ${f(yTop + 27 * s)})" text-anchor="middle" dominant-baseline="central" font-family="Roboto, Helvetica, Arial" font-weight="500" font-size="${f(Math.min(4, hw0 * 0.6))}" fill="#3c4148">${o.label || 'Label'}</text>`);
      s1 += part('marks', ticks(cx + hw0 - 1, yC - t.grad * s * 0.72, yC, 8, { right: true, major: 4, minor: 2.4 }));
    } else {
      s1 += part('marks', ticks(cx - (ml === 15 ? 2.6 : 3.2), yC - t.grad * s * 0.78, yC, ml === 15 ? 14 : 18, { major: ml === 15 ? 4.4 : 6.4, minor: ml === 15 ? 2.6 : 3.8, nums: ml === 50 ? (i) => i * 2.5 : null, fs: 2.2 }));
      if (o.label) s1 += part('label', rect(cx - hw0 * 0.7, yTop + 8 * s, hw0 * 1.4, 18 * s, 0.8, '#ffffff', { stroke: '#c3cad1', w: 0.6 }) + text(cx, yTop + 18.5 * s, o.label, Math.min(4, hw0 * 0.42), '#3c4148'));
    }
    s1 += part('glint', glint(cx - hw0 + 2, yTop + 7, yC - 2, Math.max(1.2, hw0 * 0.16)));
    // cap: ribbed screw cap, a little wider than the tube
    const cw = (t.cd * s) / 2, ch = t.ch * s;
    const nr = Math.round(t.cd / 3), ribs = Array.from({ length: nr }, (_, k) => { const x = cx - cw + 1.6 + (k * (cw * 2 - 3.2)) / (nr - 1); return stroke(`M${f(x)} ${f(-ch + 3.4)} V${f(-1.6)}`, D(capC, 0.18), 0.55); }).join('');
    const capSvg = path(`M${f(cx - cw)} ${f(-ch + 1.5)} Q${f(cx - cw)} ${f(-ch)} ${f(cx - cw + 1.5)} ${f(-ch)} H${f(cx + cw - 1.5)} Q${f(cx + cw)} ${f(-ch)} ${f(cx + cw)} ${f(-ch + 1.5)} V0 H${f(cx - cw)} Z`, capC)
      + flat(`M${f(cx - cw + 0.6)} ${f(-ch + 0.6)} H${f(cx + cw - 0.6)} V${f(-ch + 2.6)} H${f(cx - cw + 0.6)} Z`, L(capC, 0.3), 0.9) + (o.schematic ? '' : ribs)
      + flat(`M${f(cx - cw + 0.6)} -2.2 H${f(cx + cw - 0.6)} V-0.6 H${f(cx - cw + 0.6)} Z`, D(capC, 0.14), 0.9);
    if (o.open) {
      s1 += part('rim', ell(cx, yTop, hw0, hw0 * 0.22, '#f4f9fb', { stroke: GL, w: 0.7 }));
      s1 += part('cap', `<g transform="translate(${f(cx + hw0 * 0.9)} ${f(yTop - 4)}) rotate(-38) translate(${f(-cx)} 0)">${capSvg}</g>`);
    } else s1 += part('cap', `<g transform="translate(0 ${f(yTop + 2.2)})">${capSvg}</g>`);
    return { svg: s1, w: f(W + (o.open ? cw * 1.6 : 0)), h: f(yB + 2) };
  }

  // ---------- Square media bottles (Corning-style storage bottles) ----------
  // Body width : height as on the reference sheet — 1 L ≈ 92 × 150, 500 mL ≈ 72 × 124, 100 mL ≈ 50 × 72 (mm-like units).
  const BOTTLE = { 1000: { w: 92, h: 150, neck: 40, nh: 14, sh: 28 }, 500: { w: 72, h: 124, neck: 36, nh: 12, sh: 22 }, 100: { w: 50, h: 72, neck: 30, nh: 10, sh: 14 } };
  function bottle(ml, o = {}) {
    const b = BOTTLE[ml], s = o.s ?? 90 / (b.h + b.nh + 15), W = b.w * s, H = b.h * s, nw = (b.neck * s) / 2, x0 = 3, cx = x0 + W / 2, r = 4.5 * s * (ml === 100 ? 1.4 : 1);
    const capH = (o.cap === false ? 0 : 15 * s), yTop = 2 + capH, yN = yTop + b.nh * s, yS = yN + b.sh * s, yB = yN + H;
    const hw = (y) => (y < yN ? nw : y < yS ? nw + (W / 2 - nw) * Math.sin((((y - yN) / (yS - yN)) * Math.PI) / 2) : W / 2);
    const bodyD = vessel(cx, yTop, yB, hw, r, 50);
    let s1 = part('bottle', path(bodyD, PAL.glass, { stroke: GL, op: 0.75 }) + stroke(`M${f(cx - W / 2 + 2.4)} ${f(yS + 3)} V${f(yB - 3)}`, '#ffffff', 1.6, { op: 0.75 }) + stroke(`M${f(cx + W / 2 - 4)} ${f(yS + 3)} V${f(yB - 3)}`, '#c9dbe3', 1, { op: 0.8 }));
    if (o.level) {
      const yL = yS + 2 + (yB - yS - 3) * (1 - Math.min(1, o.level));
      const lw = (y) => Math.max(0, hw(y) - 0.7);
      s1 += part('liquid', path(vessel(cx, yL, yB - 0.7, lw, r - 0.5, 30), o.c || '#e8433c', { op: 0.92, w: 0.6 })
        + flat(`M${f(cx - W / 2 + 1.4)} ${f(yL + 1.2)} H${f(cx - W / 2 + 3.6)} V${f(yB - 3)} H${f(cx - W / 2 + 1.4)} Z`, '#ffffff', 0.25));
    }
    s1 += part('marks', ticks(cx - W / 2 + 2, yS + 6, yB - 6, 8, { major: 2.6, minor: 1.6, w: 0.4 }));
    if (o.label) s1 += part('label', rect(cx - W * 0.28, yS + (yB - yS) * 0.18, W * 0.56, (yB - yS) * 0.62, 0.8, '#ffffff', { stroke: '#c3cad1', w: 0.5 })
      + stroke(`M${f(cx - W * 0.18)} ${f(yS + (yB - yS) * 0.26)} h${f(W * 0.36)} M${f(cx - W * 0.14)} ${f(yS + (yB - yS) * 0.31)} h${f(W * 0.28)} M${f(cx - W * 0.06)} ${f(yS + (yB - yS) * 0.72)} h${f(W * 0.12)}`, '#9aa5ae', 0.5));
    // threaded neck ring
    s1 += part('neck', rect(cx - nw - 0.6, yN - 2.6, nw * 2 + 1.2, 2.6, 0.8, '#e2ecf1', { stroke: GL, w: 0.6 }));
    if (o.cap !== false) {
      const cw = nw + 1.4, cc = o.capC || '#e9ecef';
      s1 += part('cap', rect(cx - cw, 2, cw * 2, capH, 1.6, cc, { stroke: line(cc === '#e9ecef' ? '#d5dbe0' : cc), w: 0.8 })
        + Array.from({ length: 9 }, (_, k) => stroke(`M${f(cx - cw + 1.5 + (k * (cw * 2 - 3)) / 8)} ${f(4.4)} V${f(capH + 0.6)}`, D(cc, 0.12), 0.5)).join('')
        + flat(`M${f(cx - cw + 0.6)} 2.6 H${f(cx + cw - 0.6)} V4 H${f(cx - cw + 0.6)} Z`, '#ffffff', 0.6));
    } else s1 += part('rim', ell(cx, yTop, nw, 1.6, '#f4f9fb', { stroke: GL, w: 0.6 }));
    return { svg: s1, w: f(W + 6), h: f(yB + 2) };
  }

  // ---------- Griffin beaker (low form, Ø70 × 95 mm for 250 mL) with spout ----------
  function beaker(o = {}) {
    const W = o.w ?? 46, H = o.h ?? 56, x0 = o.x ?? 6, y0 = o.y ?? 6, cx = x0 + W / 2, ry = W * 0.09;
    let s = '';
    s += part('beaker', path(`M${f(x0)} ${f(y0)} V${f(y0 + H - 3)} Q${f(x0)} ${f(y0 + H)} ${f(x0 + 4)} ${f(y0 + H)} H${f(x0 + W - 4)} Q${f(x0 + W)} ${f(y0 + H)} ${f(x0 + W)} ${f(y0 + H - 3)} V${f(y0)} Z`, PAL.glass, { stroke: GL, op: 0.75 }));
    if (o.level) {
      const yL = y0 + H - (H - 6) * o.level;
      s += part('liquid', path(`M${f(x0 + 0.7)} ${f(yL)} V${f(y0 + H - 3)} Q${f(x0 + 0.7)} ${f(y0 + H - 0.7)} ${f(x0 + 4)} ${f(y0 + H - 0.7)} H${f(x0 + W - 4)} Q${f(x0 + W - 0.7)} ${f(y0 + H - 0.7)} ${f(x0 + W - 0.7)} ${f(y0 + H - 3)} V${f(yL)} Z`, o.c || '#9fd1ec', { op: 0.75, w: 0.6 })
        + ell(cx, yL, W / 2 - 0.7, ry * 0.85, L(o.c || '#9fd1ec', 0.3), { op: 0.9, w: 0.5, stroke: line(o.c || '#9fd1ec') }));
    }
    s += part('rim', ell(cx, y0, W / 2, ry, '#f4f9fb', { stroke: GL, op: 0.8, w: 0.9 }) + path(`M${f(x0 - 0.5)} ${f(y0 - 0.5)} q-3.2 -1.6 -3.6 -3.4 q2.6 -0.2 5.4 1.6`, '#f4f9fb', { stroke: GL, w: 0.8 }));
    s += part('marks', ticks(x0 + W - 3, y0 + H * 0.22, y0 + H - 6, 8, { right: true, major: W * 0.22, minor: W * 0.12, w: 0.6 }));
    s += part('glint', stroke(`M${f(x0 + 3.2)} ${f(y0 + 5)} V${f(y0 + H - 5)}`, '#ffffff', 2, { op: 0.75 }));
    return s;
  }

  // ---------- Erlenmeyer (250 mL: base Ø85, height 145, neck Ø34) ----------
  function erlenmeyer(o = {}) {
    const s = o.s ?? 0.5, cx = o.cx ?? 40, y0 = o.y ?? 4, H = 145 * s, base = (85 * s) / 2, neck = ((o.neck ?? 30) * s) / 2, nl = 34 * s, yB = y0 + H;
    const hw = (y) => (y < y0 + nl ? neck : neck + (base - neck) * Math.min(1, (y - y0 - nl) / (H - nl - 4 * s)));
    const outline = vessel(cx, y0, yB, hw, 3 * s, 30);
    let sv = part('flask', path(outline, PAL.glass, { stroke: GL, op: 0.75 }) + rect(cx - neck - 1, y0 - 1.6, neck * 2 + 2, 2.6, 1, '#f1f7f9', { stroke: GL, w: 0.7 }));
    if (o.arm) sv += part('side arm', path(`M${f(cx + neck - 0.4)} ${f(y0 + nl * 0.35)} H${f(cx + neck + 9 * s * 2)} V${f(y0 + nl * 0.35 + 5 * s * 2)} H${f(cx + neck - 0.4)} Z`, PAL.glass, { stroke: GL, op: 0.8, w: 0.8 }));
    if (o.level) {
      const yL = yB - (H - nl) * o.level;
      sv += part('liquid', path(vessel(cx, yL, yB - 0.7, (y) => Math.max(0, hw(y) - 0.7), 3 * s - 0.4, 20), o.c || '#9fd1ec', { op: 0.75, w: 0.6 })
        + ell(cx, yL, hw(yL) - 0.7, 1.4, L(o.c || '#9fd1ec', 0.3), { w: 0.5, op: 0.9 }));
    }
    if (o.marks !== false) sv += part('marks', ticks(cx + 2, yB - (H - nl) * 0.75, yB - 8 * s, 6, { major: 7 * s * 2, minor: 4 * s * 2, w: 0.5 }));
    sv += part('glint', stroke(`M${f(cx - neck + 2)} ${f(y0 + 3)} V${f(y0 + nl)} L${f(cx - base + 6 * s * 2)} ${f(yB - 6)}`, '#ffffff', 1.8, { op: 0.7 }));
    return sv;
  }

  // ---------- Round-bottom flask (sphere with a long narrow neck) ----------
  function roundBottom(o = {}) {
    const cx = o.cx ?? 40, R = o.R ?? 30, nw = R * 0.3, y0 = o.y ?? 4, nl = R * 1.05, cy = y0 + nl + R * 0.92;
    const a = Math.asin(nw / R), yJ = cy - R * Math.cos(a);
    const d = `M${f(cx - nw)} ${f(y0)} V${f(yJ)} A${f(R)} ${f(R)} 0 1 0 ${f(cx + nw)} ${f(yJ)} V${f(y0)} Z`;
    let sv = part('flask', path(d, PAL.glass, { stroke: GL, op: 0.75 }) + rect(cx - nw - 1.2, y0 - 1.6, nw * 2 + 2.4, 3, 1, '#f1f7f9', { stroke: GL, w: 0.7 }));
    if (o.level) {
      const yL = cy + R - 2 * R * o.level, hx = Math.sqrt(Math.max(0, (R - 0.7) ** 2 - (yL - cy) ** 2));
      sv += part('liquid', path(`M${f(cx - hx)} ${f(yL)} A${f(R - 0.7)} ${f(R - 0.7)} 0 ${yL < cy ? 1 : 0} 0 ${f(cx + hx)} ${f(yL)} Z`, o.c || '#9fd1ec', { op: 0.75, w: 0.6 }) + ell(cx, yL, hx, 1.6, L(o.c || '#9fd1ec', 0.3), { w: 0.5, op: 0.9 }));
    }
    sv += part('glint', path(`M${f(cx - R * 0.7)} ${f(cy - R * 0.2)} Q${f(cx - R * 0.66)} ${f(cy - R * 0.62)} ${f(cx - R * 0.3)} ${f(cy - R * 0.8)}`, 'none', { stroke: '#ffffff', w: 2.2, op: 0.75 }));
    return { svg: sv, h: cy + R + 2 };
  }

  // ---------- Cell culture flask (T25 / T75) lying flat, seen from above-front with its canted neck and cap ----------
  // T25: 95 × 55 × 26 mm body, T75: 150 × 80 × 36 mm; neck canted up ~35° at the front corner, vented cap.
  const TFLASK = { 25: { l: 95, w: 55, h: 26, neck: 18, cap: 15 }, 75: { l: 150, w: 80, h: 36, neck: 24, cap: 20 } };
  function tflask(size, o = {}) {
    const t = TFLASK[size], s = o.s ?? (size === 75 ? 0.52 : 0.62);
    const P = view(0, 0, [s * 0.84, -s * 0.34], [s * 0.3, s * 0.42], s * 0.95);
    const sh = t.w * 0.36; // shoulder length from body to neck
    const foot = [[0, 0], [t.l, 0], [t.l, t.w], [0, t.w], [-sh, t.w * 0.62], [-sh, t.w * 0.22]];
    const body = prism(P, foot, 0, t.h);
    const capCol = o.cap || '#2f64c7';
    let sv = part('flask', path(ptsD(body.side), '#d9e8ee', { stroke: GL, op: 0.8 }));
    if (o.medium) {
      const m = prism(P, foot.map(([u, v]) => [u * 0.98 + 1, v * 0.96 + 1]), 0.6, t.h * 0.26);
      sv += part('medium', path(ptsD(m.side), o.c || '#ee8c94', { op: 0.85, w: 0.6 }) + path(ptsD(m.top), L(o.c || '#ee8c94', 0.25), { op: 0.9, w: 0.5 }));
    }
    sv += part('flask top', path(ptsD(body.top), '#f2f8fa', { stroke: GL, op: o.medium ? 0.45 : 0.8, w: 0.8 }));
    sv += part('edges', stroke(ptsD([P(0, t.w, t.h), P(t.l, t.w, t.h)], false), GL, 0.6, { op: 0.6 }) + stroke(ptsD([P(t.l * 0.1, t.w * 0.2, t.h), P(t.l * 0.9, t.w * 0.2, t.h)], false), '#ffffff', 1.4, { op: 0.7 }));
    // neck and cap along an axis canted upward out of the front end
    const vc = t.w * 0.42, zc = t.h * 0.55, ax = [-Math.cos(0.6), 0, Math.sin(0.6)];
    const p0 = [-sh + 1, vc, zc], p1 = [p0[0] + ax[0] * t.neck * 0.8, vc, zc + ax[2] * t.neck * 0.8], p2 = [p1[0] + ax[0] * t.cap * 0.7, vc, p1[2] + ax[2] * t.cap * 0.7];
    const neck = cyl(P, p0, p1, t.h * 0.3), cap = cyl(P, p1, p2, t.h * 0.38);
    sv += part('neck', path(ptsD(neck.side), PAL.glass, { stroke: GL, op: 0.85, w: 0.8 }));
    sv += part('cap', path(ptsD(cap.side), capCol, { w: 0.9 }) + path(ptsD(cap.end1), L(capCol, 0.2), { w: 0.7 })
      + Array.from({ length: 6 }, (_, k) => { const q = cap.end0[(k * 3 + 2) % cap.end0.length], r2 = cap.end1[(k * 3 + 2) % cap.end1.length]; return stroke(`M${f(q[0])} ${f(q[1])} L${f(r2[0])} ${f(r2[1])}`, D(capCol, 0.2), 0.5, { op: 0.8 }); }).join(''));
    const all = body.side.concat(cap.side, neck.side), x0 = Math.min(...all.map((q) => q[0])), y0 = Math.min(...all.map((q) => q[1]));
    const w = Math.max(...all.map((q) => q[0])) - x0, h = Math.max(...all.map((q) => q[1])) - y0;
    return { svg: `<g transform="translate(${f(2 - x0)} ${f(2 - y0)})">${sv}</g>`, w: f(w + 4), h: f(h + 4) };
  }

  globalThis.LabKit = { profile, ticks, falcon, FALCON, bottle, BOTTLE, beaker, erlenmeyer, roundBottom, tflask, TFLASK };
})();
