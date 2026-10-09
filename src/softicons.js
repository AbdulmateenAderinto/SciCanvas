// Soft-style icon set: flat fills, darker same-hue outlines, rounded protein "tubes" and blobs —
// the look of hand-made BioRender-style mechanism figures. Everything is drawn from code (offline).
// Named proteins reuse a shape archetype (hook, Ω, kinase, receptor…) with a per-name seeded variation,
// so each icon is distinct but the set stays visually consistent. All icons are recolourable.
(() => {
  const OW = 2.2;
  const f = (n) => Math.round(n * 10) / 10;
  const oc = (c) => {
    const [r, g, b] = Color.hexToRgb(c), lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.86 ? Color.mix(c, '#4f7f9c', 0.42) : D(c, 0.36);
  };
  const P = {
    green: '#3f9e48', sage: '#c4dbbf', purple: '#8b5cc6', lavender: '#b9a7dd', blue: '#3a6fc4', sky: '#a8d2ef', ice: '#e4f1fa',
    cream: '#f6efcc', gold: '#d9a12b', teal: '#2a9fd4', navy: '#3d5a9c', salmon: '#e8898a', red: '#d64545', orange: '#e8843b',
    pink: '#e98fb4', mint: '#7fd1b9', grey: '#9aa6b2', brown: '#a87451', yellow: '#ecc94b', magenta: '#c2509e', olive: '#9fae4f',
    cyan: '#53c2d6', plum: '#7a4a8c', coral: '#f08a6c', indigo: '#5a5fc8', rose: '#d9667a', lime: '#9ccc4a', slate: '#5f7488',
  };
  const col = (k) => P[k] || k;
  const MEM = '#f1dc9e', MEMLINE = '#d4b75f';

  // ---------- Primitives ----------
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  // Catmull-Rom spline through points → smooth cubic Bézier path.
  function cr(pts, closed) {
    const n = pts.length;
    if (n < 2) return '';
    const p = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
      d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d + (closed ? ' Z' : '');
  }
  const blob = (pts, c, o = {}) => `<path d="${cr(pts, true)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}" stroke-linejoin="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  // Smooth organic outline: low-frequency harmonics (no corners), optional extra modulation.
  function wob(cx, cy, rx, ry, r, { amp = 0.07, n = 28, rot = 0, mod } = {}) {
    const pts = [], ph = r() * Math.PI * 2, p2 = r() * 6.3, p3 = r() * 6.3, p4 = r() * 6.3, w2 = 0.5 + r() * 0.5, w3 = 0.3 + r() * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ph;
      const k = 1 + amp * 1.3 * (w2 * Math.sin(2 * a + p2) + w3 * Math.sin(3 * a + p3) + 0.25 * Math.sin(4 * a + p4)) + (mod ? mod(a) : 0);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k, t = (rot * Math.PI) / 180;
      pts.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
    }
    return pts;
  }
  const glob = (cx, cy, rx, ry, c, r, o = {}) => blob(wob(cx, cy, rx, ry, r, o), c, o);
  // Tubes: outlines first, then fills, so tubes in one call merge into a single soft shape.
  function tubes(list, w, c, o = {}) {
    const ds = list.map((pts) => cr(pts, false));
    const cap = `stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    return ds.map((d) => `<path d="${d}" stroke="${o.oc || oc(c)}" stroke-width="${w + 2 * (o.ow ?? OW)}" ${cap}/>`).join('')
      + ds.map((d) => `<path d="${d}" stroke="${c}" stroke-width="${w}" ${cap}/>`).join('')
      + (o.seg ? ds.map((d) => `<path d="${d}" stroke="${L(c, 0.35)}" stroke-width="${w * 0.5}" stroke-dasharray="${o.seg}" ${cap} opacity=".75"/>`).join('') : '');
  }
  const tube = (pts, w, c, o) => tubes([pts], w, c, o);
  const ball = (cx, cy, rad, c, o = {}) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW * 0.8}"/>`;
  const ell = (cx, cy, rx, ry, c, rot = 0, o = {}) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}"${rot ? ` transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"` : ''}/>`;
  const G = (inner, tf) => `<g transform="${tf}">${inner}</g>`;
  const jit = (pts, r, a = 3) => pts.map(([x, y]) => [x + (r() * 2 - 1) * a, y + (r() * 2 - 1) * a]);
  const membrane = (y, w, h = 14) => `<rect x="0" y="${y}" width="${w}" height="${h}" fill="${MEM}" opacity=".7"/><path d="M0 ${y} H${w} M0 ${y + h} H${w}" stroke="${MEMLINE}" stroke-width="1.4"/>`;
  const ubChain = (pts, rad = 6.5) => pts.map(([x, y]) => ball(x, y, rad, P.gold)).join('');

  // ---------- Archetypes: (c, r, arg) → { vb, s } ----------
  const A = {
    hook: (c, r) => ({ vb: [100, 100], s: tube(jit([[60, 12], [74, 24], [80, 46], [72, 68], [56, 82], [40, 78], [34, 64]], r, 3), 17, c) }),
    omega: (c, r) => ({ vb: [100, 100], s: tube(jit([[20, 40], [30, 22], [52, 18], [62, 34], [48, 50], [40, 66], [54, 82], [78, 78], [84, 62]], r, 3), 17, c) }),
    cshape: (c, r) => ({ vb: [100, 100], s: tube(jit([[76, 22], [52, 14], [28, 28], [24, 54], [38, 78], [64, 84], [80, 72]], r, 3), 18, c) }),
    oval: (c, r) => ({ vb: [100, 70], s: ell(50, 35, 42 + r() * 4, 25 + r() * 4, c, -12 + r() * 24) }),
    bean: (c, r) => ({ vb: [100, 90], s: blob(jit([[16, 44], [24, 22], [48, 12], [74, 18], [86, 40], [80, 64], [62, 76], [50, 60], [34, 74], [18, 64]], r, 3), c) }),
    globule: (c, r) => ({ vb: [100, 100], s: glob(50, 50, 40, 36, c, r, { amp: 0.11 }) }),
    lumpy: (c, r) => ({ vb: [100, 100], s: glob(50, 50, 38, 34, c, r, { amp: 0.06, n: 36, mod: (a) => 0.07 * Math.sin(5 * a) }) }),
    kinase: (c, r) => ({ vb: [100, 100], s: glob(40, 30, 28, 19, L(c, 0.32), r, { rot: -10 }) + glob(54, 66, 38, 27, c, r, { amp: 0.08 }) + ball(66, 46, 4.4, P.gold) + ball(74, 45, 4.4, P.gold) + ball(82, 43, 4.4, P.gold) }),
    dumbbell: (c, r) => ({ vb: [100, 70], s: tube([[30, 35], [50, 32 + r() * 6], [70, 35]], 8, D(c, 0.1)) + glob(26, 35, 21, 20, c, r) + glob(74, 35, 21, 20, L(c, 0.25), r) }),
    helix4: (c, r) => {
      const xs = [24, 41, 58, 75], top = xs.map(() => 18 + r() * 8), bot = xs.map(() => 74 + r() * 8);
      let s = tube([[24, bot[0]], [32, 92], [41, bot[1]]], 4, D(c, 0.1)) + tube([[41, top[1]], [50, 6], [58, top[2]]], 4, D(c, 0.1)) + tube([[58, bot[2]], [66, 92], [75, bot[3]]], 4, D(c, 0.1));
      xs.forEach((x, i) => { s += tube([[x, top[i]], [x, bot[i]]], 14, i % 2 ? L(c, 0.28) : c); });
      return { vb: [100, 100], s };
    },
    trimer: (c, r) => ({ vb: [100, 100], s: glob(50, 32, 25, 23, D(c, 0.12), r) + glob(32, 64, 25, 23, c, r) + glob(68, 64, 25, 23, L(c, 0.28), r) }),
    dimer: (c, r) => ({ vb: [100, 80], s: glob(64, 40, 30, 32, L(c, 0.3), r) + glob(36, 40, 30, 32, c, r) }),
    tetramer: (c, r) => ({ vb: [100, 100], s: glob(34, 34, 22, 22, L(c, 0.3), r) + glob(66, 34, 22, 22, c, r) + glob(34, 66, 22, 22, c, r) + glob(66, 66, 22, 22, L(c, 0.3), r) }),
    horseshoe: (c, r) => ({ vb: [100, 100], s: tube(jit([[76, 20], [52, 10], [26, 22], [16, 50], [26, 78], [52, 90], [76, 80]], r, 2), 22, c, { seg: '2 6' }) }),
    propeller: (c) => {
      let s = '';
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2 - Math.PI / 2; s += ell(50 + 26 * Math.cos(t), 50 + 26 * Math.sin(t), 17, 12, k % 2 ? L(c, 0.28) : c, (t * 180) / Math.PI); }
      return { vb: [100, 100], s: s + ball(50, 50, 9, '#ffffff', { oc: oc(c) }) };
    },
    ring: (c, r) => {
      let s = '';
      for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2; s += glob(50 + 27 * Math.cos(t), 50 + 27 * Math.sin(t), 17, 17, k % 2 ? L(c, 0.25) : c, r); }
      return { vb: [100, 100], s: s + ball(50, 50, 8, '#ffffff', { oc: oc(c) }) };
    },
    yshape: (c, r) => {
      const arms = [jit([[50, 54], [36, 40], [18, 34]], r, 2), jit([[50, 54], [66, 38], [84, 30]], r, 2), jit([[50, 54], [48, 72], [56, 90]], r, 2)];
      return { vb: [100, 100], s: tubes(arms.map((a) => a.map(([x, y]) => [x + 7, y + 3])), 24, L(c, 0.68), { oc: L(c, 0.55), ow: 1 }) + tubes(arms, 16, c) };
    },
    scaffold: (c, r) => ({ vb: [100, 100], s: tube(jit([[12, 84], [26, 62], [44, 46], [66, 32], [88, 18]], r, 3), 16, c) }),
    pacman: (c, r) => {
      const pts = [];
      for (let a = 38; a <= 322; a += 28) { const t = (a * Math.PI) / 180, k = 40 * (1 + (r() * 2 - 1) * 0.05); pts.push([50 + k * Math.cos(t), 50 + k * Math.sin(t)]); }
      pts.push([54, 50]);
      return { vb: [100, 100], s: blob(pts, c) };
    },
    trefoil: (c, r) => ({ vb: [100, 100], s: glob(50, 52, 34, 34, c, r, { amp: 0.03, n: 36, mod: (a) => 0.16 * Math.cos(3 * a) }) + glob(50, 52, 12, 12, L(c, 0.3), r, { w: 1.4 }) }),
    chemokine: (c, r) => ({ vb: [100, 90], s: tube(jit([[34, 40], [20, 26], [10, 32], [8, 18]], r, 2), 4, D(c, 0.1)) + glob(56, 50, 32, 28, c, r) + tube([[44, 44], [60, 40], [72, 50]], 5, L(c, 0.35), { ow: 1 }) }),
    helixglob: (c, r) => ({ vb: [100, 100], s: glob(50, 50, 38, 36, c, r) + tubes([[[30, 34], [52, 28], [70, 36]], [[28, 54], [50, 50], [72, 58]], [[36, 72], [56, 70], [66, 76]]], 6, L(c, 0.32), { ow: 1 }) }),
    ubl: (c, r) => ({ vb: [70, 70], s: tube([[44, 46], [54, 52], [58, 60], [54, 64]], 3.5, D(c, 0.1)) + glob(32, 32, 24, 22, c, r) }),
    smallmol: (c, r) => {
      // 1–2 fused rings plus a side chain; ring count, tilt and substituents vary per name.
      const hexPath = (cx, cy, rr) => `M${Array.from({ length: 6 }, (_, k) => { const t = (k / 6) * Math.PI * 2 + Math.PI / 6; return `${f(cx + rr * Math.cos(t))} ${f(cy + rr * Math.sin(t))}`; }).join(' L')} Z`;
      const two = r() > 0.4, five = r() > 0.7, rr = 13, cx2 = 22 + 2 * rr * Math.cos(Math.PI / 6);
      const end = two ? cx2 + rr : 22 + rr, up = r() > 0.5, tl = 10 + r() * 8;
      let s = tube([[end - 2, 32], [end + tl * 0.7, up ? 20 : 44], [end + tl * 1.4, up ? 26 : 38]], 4, D(c, 0.1)) + ball(end + tl * 1.4, up ? 26 : 38, 5, r() > 0.5 ? L(c, 0.2) : P.red, { w: 1.2 });
      if (r() > 0.5) s += tube([[22, 32 - rr], [18, 6]], 3.5, D(c, 0.1)) + ball(18, 6, 4, P.teal, { w: 1 });
      const rings = `<path d="${hexPath(22, 32, rr)}"/>` + (two ? (five ? `<path d="${hexPath(cx2, 32, rr * 0.9)}"/>` : `<path d="${hexPath(cx2, 32, rr)}"/>`) : '');
      s += `<g fill="${L(c, 0.45)}" stroke="${oc(c)}" stroke-width="3" stroke-linejoin="round" transform="rotate(${f((r() - 0.5) * 16)} 40 32)">${rings}</g>`;
      return { vb: [two ? 96 : 76, 62], s };
    },
    peptide: (c, r) => ({ vb: [100, 50], s: tube(jit([[8, 34], [20, 16], [34, 30], [48, 36], [62, 18], [76, 26], [90, 14]], r, 3), 7, c) }),
    coil: (c) => {
      const a = [], b = [];
      for (let i = 0; i <= 12; i++) { const x = 8 + i * 7; a.push([x, 30 + 12 * Math.sin(i * 0.9)]); b.push([x, 30 - 12 * Math.sin(i * 0.9)]); }
      return { vb: [100, 60], s: tube(b, 8, L(c, 0.3)) + tube(a, 8, c) };
    },
    tfdna: (c, r) => ({ vb: [100, 100], s: dnaH(0, 66, 100) + glob(64, 44, 20, 24, L(c, 0.3), r) + glob(36, 44, 20, 24, c, r) + tube([[30, 62], [34, 76]], 7, c) + tube([[70, 62], [66, 76]], 7, L(c, 0.3)) }),
    // Membrane proteins (cell surface at the bottom, so they stand on a membrane brush).
    igrec: (c, r, arg = '2') => {
      const n = parseInt(arg, 10) || 2, dim = /d/.test(arg), crd = /c/.test(arg);
      const sp = n <= 2 ? 22 : n === 3 ? 18 : 15.5, rx = crd ? 9 : 13, ry = crd ? sp * 0.42 : sp * 0.56;
      const chain = (x, cc) => {
        let s = tube([[x, 70], [x, 100]], 5, D(cc, 0.12)) + tube([[x, 100], [x + 3, 110], [x - 1, 116]], 4, D(cc, 0.05));
        for (let i = n - 1; i >= 0; i--) s += ell(x + (i % 2 ? 2.5 : -2.5) + (r() - 0.5) * 2, 64 - i * sp, rx, ry, cc, (r() - 0.5) * 14);
        return s;
      };
      return { vb: [60, 120], s: membrane(80, 60) + (dim ? chain(39, L(c, 0.3)) + chain(21, c) : chain(30, c)) };
    },
    rtk: (c, r) => ({ vb: [70, 120], s: membrane(68, 70)
      + tube([[42, 50], [42, 94]], 5, D(c, 0.1)) + glob(47, 16, 13, 13, L(c, 0.3), r) + glob(46, 40, 12, 12, L(c, 0.3), r) + glob(46, 102, 13, 11, L(c, 0.3), r)
      + tube([[28, 50], [28, 94]], 5, D(c, 0.1)) + glob(23, 16, 13, 13, c, r) + glob(24, 40, 12, 12, c, r) + glob(24, 102, 13, 11, c, r)
      + ball(9, 112, 4.5, P.gold) + ball(61, 112, 4.5, P.gold) }),
    gpcr: (c) => {
      let s = membrane(28, 100, 40);
      const xs = Array.from({ length: 7 }, (_, i) => 17 + i * 11);
      for (let i = 0; i < 6; i++) s += i % 2 ? tube([[xs[i], 20], [xs[i] + 5.5, 9], [xs[i + 1], 20]], 3.5, D(c, 0.1)) : tube([[xs[i], 76], [xs[i] + 5.5, 87], [xs[i + 1], 76]], 3.5, D(c, 0.1));
      s += tube([[17, 20], [10, 9], [4, 13]], 3.5, D(c, 0.1)) + tube([[83, 76], [90, 86], [97, 82]], 3.5, D(c, 0.1));
      xs.forEach((x, i) => { s += tube([[x, 20 + (i % 3)], [x, 76 - (i % 2) * 2]], 9, i % 2 ? L(c, 0.28) : c); });
      return { vb: [100, 92], s };
    },
    cytrec: (c, r) => {
      const chain = (x, cc, s1) => tube([[x, 64], [x, 100]], 5, D(cc, 0.1)) + glob(x - 3 * s1, 22, 14, 13, cc, r) + ell(x, 50, 10, 12, cc, 8 * s1) + glob(x - 4 * s1, 108, 10, 8, P.gold, r);
      return { vb: [80, 120], s: membrane(76, 80) + chain(52, L(c, 0.3), -1) + chain(28, c, 1) };
    },
    tlr: (c, r) => ({ vb: [90, 125], s: membrane(80, 90) + tube([[66, 60], [54, 72], [50, 78], [50, 98]], 5, D(c, 0.1)) + tube(jit([[66, 60], [76, 36], [62, 12], [38, 10], [18, 28], [16, 50], [26, 64]], r, 1.5), 18, c, { seg: '2 6' }) + glob(50, 108, 13, 9, L(c, 0.2), r) }),
    lectin: (c, r) => ({ vb: [60, 120], s: membrane(80, 60) + tube([[38, 34], [32, 74], [32, 100]], 4, D(c, 0.1)) + tube([[22, 34], [28, 74], [28, 100]], 4, D(c, 0.1)) + glob(40, 22, 14, 13, L(c, 0.3), r) + glob(20, 22, 14, 13, c, r) }),
    integrin: (c, r) => ({ vb: [80, 130], s: membrane(92, 80) + tube([[52, 38], [57, 70], [48, 92], [48, 116]], 7, L(c, 0.3)) + glob(52, 28, 13, 13, L(c, 0.3), r) + tube([[28, 36], [22, 70], [30, 92], [30, 118]], 8, c) + glob(30, 22, 19, 15, c, r) }),
    cadherin: (c, r) => {
      let s = membrane(84, 100) + tube([[66, 74], [66, 112]], 5, D(c, 0.1));
      for (let i = 0; i < 5; i++) { const t = i / 4, x = 12 + t * 54 + Math.sin(t * Math.PI) * -6, y = 12 + t * 58 - Math.sin(t * Math.PI) * 10; s += ell(x, y, 12, 8, i % 2 ? L(c, 0.25) : c, 50 - t * 20 + (r() - 0.5) * 10); }
      return { vb: [100, 120], s };
    },
    channel: (c) => ({ vb: [80, 100], s: membrane(30, 80, 40) + tube([[18, 22], [18, 78]], 14, L(c, 0.3)) + tube([[62, 22], [62, 78]], 14, L(c, 0.3)) + tube([[33, 18], [32, 82]], 13, c) + tube([[47, 18], [48, 82]], 13, c) }),
  };
  function dnaH(x0, y0, w, hi) {
    const a = [], b = [], rungs = [];
    for (let i = 0; i <= 10; i++) { const x = x0 + 4 + (i * (w - 8)) / 10, ph = i * 0.95; a.push([x, y0 + 12 + 10 * Math.sin(ph)]); b.push([x, y0 + 12 - 10 * Math.sin(ph)]); if (i > 0 && i < 10) rungs.push(`<path d="M${f(x)} ${f(y0 + 12 + 10 * Math.sin(ph))} V${f(y0 + 12 - 10 * Math.sin(ph))}" stroke="${hi === i ? P.red : '#b8c4d4'}" stroke-width="${hi === i ? 4 : 2.4}" stroke-linecap="round"/>`); }
    return rungs.join('') + tube(b, 5, P.sky) + tube(a, 5, P.navy);
  }

  // ---------- Cells ----------
  function cell(c, r, kind = 'round', deco = '') {
    let s = '';
    const pale = L(c, 0.6);
    const stub = (t, draw) => { const x = 50 + 44 * Math.cos(t), y = 50 + 42 * Math.sin(t); return G(draw, `translate(${f(x)} ${f(y)}) rotate(${f((t * 180) / Math.PI + 90)})`); };
    const decoAround = (draw, n = 9) => { let o = ''; for (let k = 0; k < n; k++) o += stub((k / n) * Math.PI * 2 + 0.3, draw); return o; };
    if (deco === 'tcr') s += decoAround(tube([[-2, 0], [-2, -7]], 2.4, P.navy, { ow: 0.8 }) + tube([[2, 0], [2, -7]], 2.4, P.sky, { ow: 0.8 }), 8);
    if (deco === 'ab') s += decoAround(tubes([[[0, 0], [0, -6]], [[0, -6], [-4, -11]], [[0, -6], [4, -11]]], 2.6, P.blue, { ow: 1 }));
    if (deco === 'car') s += decoAround(tube([[0, 0], [0, -6]], 2, P.grey, { ow: 0.8 }) + ball(-2.5, -9, 3, P.green, { w: 1 }) + ball(2.5, -9, 3, P.lime, { w: 1 }));
    if (deco === 'pd1') s += decoAround(tube([[0, 0], [0, -5]], 2, P.purple, { ow: 0.8 }) + ball(0, -8, 3.3, P.purple, { w: 1 }), 8);
    if (deco === 'mhc') s += decoAround(tube([[0, 0], [0, -5]], 2.4, P.sage, { ow: 0.8 }) + ell(0, -9, 5, 3.4, P.sage, 0, { w: 1 }) + `<path d="M-3 -12.5 H3" stroke="${P.red}" stroke-width="2" stroke-linecap="round"/>`, 8);
    const body = {
      round: () => glob(50, 50, 43, 41, pale, r, { amp: 0.035, oc: oc(c) }),
      macro: () => glob(50, 50, 40, 38, pale, r, { amp: 0.1, n: 40, mod: (a) => 0.11 * Math.sin(7 * a), oc: oc(c) }),
      dc: () => { const pts = []; for (let k = 0; k < 14; k++) { const t = (k / 14) * Math.PI * 2, rr = k % 2 ? 22 + r() * 6 : 40 + r() * 8; pts.push([50 + rr * Math.cos(t), 50 + rr * Math.sin(t)]); } return blob(pts, pale, { oc: oc(c) }); },
      oval: () => ell(50, 50, 44, 34, pale, -8, { oc: oc(c) }),
      spindle: () => blob([[4, 52], [24, 40], [50, 36], [76, 42], [96, 50], [76, 60], [50, 64], [24, 62]], pale, { oc: oc(c) }),
      cube: () => `<rect x="10" y="12" width="80" height="76" rx="18" fill="${pale}" stroke="${oc(c)}" stroke-width="${OW}"/>`,
      tumour: () => glob(50, 50, 42, 39, pale, r, { amp: 0.12, n: 36, mod: (a) => 0.04 * Math.sin(6 * a), oc: oc(c) }),
      flat: () => blob([[4, 56], [20, 44], [50, 40], [80, 44], [96, 56], [80, 62], [50, 64], [20, 62]], pale, { oc: oc(c) }),
      neuron: () => tubes([[[50, 50], [26, 30], [12, 12]], [[50, 50], [74, 26], [86, 10]], [[50, 50], [20, 62], [6, 70]], [[50, 50], [62, 78], [80, 94]]], 6, pale, { oc: oc(c) }) + glob(50, 50, 20, 18, pale, r, { oc: oc(c) }),
      astro: () => tubes(Array.from({ length: 8 }, (_, k) => { const t = (k / 8) * Math.PI * 2 + r() * 0.3; return [[50, 50], [50 + 28 * Math.cos(t + 0.2), 50 + 28 * Math.sin(t + 0.2)], [50 + 46 * Math.cos(t), 50 + 46 * Math.sin(t)]]; }), 5, pale, { oc: oc(c) }) + glob(50, 50, 18, 17, pale, r, { oc: oc(c) }),
      small: () => glob(50, 50, 26, 24, pale, r, { amp: 0.06, oc: oc(c) }),
      fat: () => glob(50, 50, 44, 42, pale, r, { amp: 0.03, oc: oc(c) }) + glob(54, 48, 34, 32, '#fdf3c4', r, { amp: 0.03 }),
    }[kind]();
    s += body;
    const nuc = {
      round: () => glob(52, 52, 26, 24, c, r),
      macro: () => blob([[36, 40], [52, 34], [64, 44], [58, 58], [44, 62], [34, 54]], c),
      dc: () => glob(50, 50, 14, 13, c, r),
      oval: () => glob(66, 52, 16, 15, c, r) + `<path d="M22 38 q10 -6 18 2 M20 50 q10 -6 18 2 M22 62 q10 -6 18 2" stroke="${L(c, 0.2)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      spindle: () => ell(50, 50, 16, 7, c),
      cube: () => glob(50, 50, 16, 15, c, r),
      tumour: () => glob(52, 50, 25, 22, c, r, { amp: 0.15 }) + ball(56, 46, 5, D(c, 0.2), { w: 1 }),
      flat: () => ell(50, 52, 13, 6, c),
      neuron: () => ball(50, 50, 7, c, { w: 1.2 }),
      astro: () => ball(50, 50, 8, c, { w: 1.2 }),
      small: () => glob(50, 50, 10, 9, c, r),
      fat: () => ell(20, 52, 6, 14, c, 10),
    }[kind]();
    s += nuc;
    if (deco === 'gran' || deco === 'granred') for (let k = 0; k < 12; k++) { const t = r() * Math.PI * 2, rr = 20 + r() * 16; s += ball(50 + rr * Math.cos(t), 50 + rr * Math.sin(t), 2.4, deco === 'granred' ? P.red : D(c, 0.25), { w: 0.6 }); }
    if (deco === 'lobed') s = s.replace(nuc, '') + tubes([[[34, 44], [46, 56], [58, 42], [68, 56]]], 13, c);
    if (deco === 'bilobe') s = s.replace(nuc, '') + ball(38, 48, 13, c) + ball(62, 48, 13, c) + Array.from({ length: 10 }, () => ball(28 + r() * 44, 64 + r() * 14, 2.6, P.orange, { w: 0.6 })).join('');
    if (deco === 'blebs') { s = s.replace(nuc, ''); for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2; s += glob(50 + 40 * Math.cos(t), 50 + 38 * Math.sin(t), 9, 8, L(c, 0.6), r, { oc: oc(c) }); } s += ball(44, 46, 7, c) + ball(58, 54, 6, c) + ball(50, 62, 5, c); }
    if (deco === 'senescent') s += Array.from({ length: 6 }, () => ball(24 + r() * 52, 22 + r() * 56, 3, P.brown, { w: 0.6 })).join('');
    if (deco === 'stripes') s += Array.from({ length: 7 }, (_, k) => `<path d="M${20 + k * 10} 18 V82" stroke="${L(c, 0.35)}" stroke-width="2.4" opacity=".8"/>`).join('');
    return { vb: [100, 100], s };
  }

  // ---------- Hand-built complexes & specials ----------
  const SPECIAL = {
    ub: () => ({ vb: [40, 40], s: ball(20, 20, 15, P.gold) }),
    ubk48: () => ({ vb: [100, 44], s: ubChain([[14, 26], [32, 17], [50, 26], [68, 17], [86, 26]], 10) }),
    ubk63: () => ({ vb: [100, 30], s: ubChain([[13, 15], [30, 15], [47, 15], [64, 15], [81, 15]], 9.5) }),
    ubbranch: () => ({ vb: [90, 80], s: ubChain([[14, 64], [30, 52], [46, 40], [62, 28], [78, 16], [62, 56], [76, 64], [36, 22]], 9) }),
    polyub: () => ({ vb: [100, 100], s: tube([[64, 14], [78, 24], [84, 46], [76, 68], [62, 84], [46, 80], [42, 66]], 15, P.purple) + ubChain([[50, 14], [36, 18], [22, 14], [10, 22]], 7.5) }),
    monoub: (r) => ({ vb: [100, 100], s: glob(54, 58, 36, 32, P.lavender, r) + ball(22, 24, 11, P.gold) + tube([[28, 32], [34, 38]], 3, D(P.gold, 0.1)) }),
    p26s: (r) => {
      let s = '';
      const row = (y, cc) => { for (let i = 0; i < 4; i++) s += ball(13 + i * 10, y - 3.5, 6.5, D(cc, 0.18), { w: 1.2 }); for (let i = 0; i < 5; i++) s += ball(8 + i * 10, y, 6.8, cc, { w: 1.3 }); };
      const cap = (y0, dir) => { for (let i = 0; i < 9; i++) s += ball(10 + r() * 40, y0 + dir * r() * 12, 6 + r() * 2, i % 3 ? P.teal : D(P.teal, 0.12), { w: 1.2 }); };
      cap(18, -1); row(30, '#4a90d4'); row(42, P.navy); row(54, P.salmon); row(66, P.salmon); row(78, P.navy); row(90, '#4a90d4'); cap(100, 1);
      return { vb: [60, 116], s };
    },
    p20s: () => {
      let s = '';
      const row = (y, cc) => { for (let i = 0; i < 4; i++) s += ball(13 + i * 10, y - 3.5, 6.5, D(cc, 0.18), { w: 1.2 }); for (let i = 0; i < 5; i++) s += ball(8 + i * 10, y, 6.8, cc, { w: 1.3 }); };
      row(12, P.navy); row(24, P.salmon); row(36, P.salmon); row(48, P.navy);
      return { vb: [60, 58], s };
    },
    frag: (r) => {
      let s = '';
      for (let k = 0; k < 13; k++) { const x = 10 + r() * 80, y = 10 + r() * 80, a = r() * Math.PI * 2, l = 8 + r() * 10; s += tube([[x, y], [x + Math.cos(a) * l * 0.6 + (r() - 0.5) * 8, y + Math.sin(a) * l * 0.6 + (r() - 0.5) * 8], [x + Math.cos(a) * l, y + Math.sin(a) * l]], 4.5, r() > 0.5 ? P.purple : D(P.purple, 0.1), { ow: 1.4 }); }
      return { vb: [100, 100], s };
    },
    unfolded: (r) => { const pts = [[10, 50]]; for (let i = 1; i < 11; i++) pts.push([10 + i * 8, 50 + (r() - 0.5) * 50]); return { vb: [100, 100], s: tube(pts, 6, P.purple) }; },
    e1: (r) => ({ vb: [100, 90], s: A.bean(P.blue, r).s + ball(86, 30, 10, P.gold) }),
    e2: (r) => ({ vb: [90, 90], s: glob(42, 50, 32, 30, P.teal, r) + ball(76, 26, 10, P.gold) }),
    crl: (r) => ({ vb: [120, 100], s: tube([[26, 30], [42, 46], [62, 60], [84, 70], [100, 70]], 16, P.blue) + ell(22, 18, 12, 9, P.cream, -20) + glob(18, 46, 12, 14, P.purple, r) + tube([[24, 62], [36, 72], [36, 84], [28, 90]], 9, P.lavender) + glob(104, 56, 11, 11, P.green, r) + glob(108, 34, 11, 10, P.teal, r) + ball(110, 16, 7, P.gold) }),
    ctlh: (r, sub) => {
      // Two mirrored halves (top / bottom) around a pale scaffold ring, MAEA-like Y subunits on the sides.
      const half = (flip) => {
        const m = (pts) => pts.map(([x, y]) => [x, flip ? 140 - y : y]);
        const g1 = flip ? P.sage : P.green, g2 = flip ? P.green : P.sage;
        let h = tube(m([[48, 34], [52, 20], [64, 16], [70, 26], [62, 36], [56, 44], [60, 52]]), 11, g1);
        h += tube(m([[92, 34], [88, 20], [76, 16], [70, 26], [78, 36], [84, 44], [80, 52]]), 11, g2);
        h += ell(57, flip ? 84 : 56, 12, 8, P.cream, flip ? 22 : -22) + ell(83, flip ? 84 : 56, 12, 8, P.cream, flip ? -22 : 22);
        if (sub) h += tube(m([[60, 62], [56, 66], [58, 72], [64, 71]]), 6.5, flip ? P.purple : P.lavender) + tube(m([[80, 62], [84, 66], [82, 72], [76, 71]]), 6.5, flip ? P.lavender : P.purple);
        if (sub === 'ub') h += ubChain(m([[50, 66], [44, 68], [38, 66], [90, 66], [96, 68], [102, 66]]), 3.6);
        return h;
      };
      const scaffold = tubes([[[66, 12], [40, 10], [24, 30], [30, 52], [22, 70], [30, 88], [24, 110], [40, 130], [66, 128]], [[74, 12], [100, 10], [116, 30], [110, 52], [118, 70], [110, 88], [116, 110], [100, 130], [74, 128]]], 15, P.ice, { oc: '#a9d3e6' });
      const y = (x, sx) => tubes([[[x, 70], [x - 8 * sx, 58], [x - 14 * sx, 54]], [[x, 70], [x + 6 * sx, 56]], [[x, 70], [x + 6 * sx, 84], [x + 14 * sx, 88]]], 9, P.blue);
      return { vb: [140, 140], s: scaffold + half(false) + half(true) + y(16, 1) + y(124, -1) };
    },
    protac: (r) => ({ vb: [120, 90], s: A.bean(P.green, r).s.replace(/<path/, `<path transform="translate(-4 4) scale(.62)"`) + glob(90, 44, 26, 28, P.purple, r) + tube([[52, 44], [58, 38], [62, 46], [66, 40]], 3, P.grey, { ow: 1 }) + ball(50, 46, 5, P.orange) + ball(68, 42, 5, P.teal) + ubChain([[104, 14], [112, 8]], 5) }),
    protacmol: () => {
      const hex = (cx, cy, rr, c) => `<path d="M${Array.from({ length: 6 }, (_, k) => { const t = (k / 6) * Math.PI * 2 + Math.PI / 6; return `${f(cx + rr * Math.cos(t))} ${f(cy + rr * Math.sin(t))}`; }).join(' L')} Z" fill="${L(c, 0.35)}" stroke="${oc(c)}" stroke-width="2.4" stroke-linejoin="round"/>`;
      return { vb: [120, 44], s: tube([[30, 22], [42, 14], [54, 28], [66, 14], [78, 28], [90, 22]], 3, P.grey) + hex(18, 22, 13, P.orange) + hex(102, 22, 13, P.teal) + ball(18, 22, 4, P.orange, { w: 1 }) + ball(102, 22, 4, P.teal, { w: 1 }) };
    },
    glue: (r) => ({ vb: [110, 90], s: glob(36, 50, 28, 30, P.green, r) + glob(80, 46, 24, 26, P.purple, r) + `<path d="M58 40 L64 48 L58 56 L52 48 Z" fill="${P.orange}" stroke="${oc(P.orange)}" stroke-width="2" stroke-linejoin="round"/>` }),
    autophago: (r) => ({ vb: [100, 100], s: `<circle cx="50" cy="50" r="44" fill="#f8f3fc" stroke="${P.lavender}" stroke-width="6"/><circle cx="50" cy="50" r="36" fill="none" stroke="${oc(P.lavender)}" stroke-width="2"/>` + tube([[40, 30], [52, 30], [58, 44], [50, 58], [40, 56]], 9, P.purple) + ubChain([[34, 26], [28, 32]], 4.5) + ell(60, 66, 12, 7, '#f2a65a', -20) + Array.from({ length: 8 }, (_, k) => ball(50 + 36 * Math.cos(k * 0.8), 50 + 36 * Math.sin(k * 0.8), 2.6, P.teal, { w: 0.6 })).join('') }),
    lysosome: (r) => ({ vb: [100, 100], s: glob(50, 50, 40, 38, '#f9d8e2', r, { oc: oc(P.pink), amp: 0.04 }) + Array.from({ length: 14 }, () => ball(24 + r() * 52, 24 + r() * 52, 2.5 + r() * 2, P.rose, { w: 0.6 })).join('') }),
    aggresome: (r) => { let s = ''; for (let k = 0; k < 9; k++) { const pts = []; for (let i = 0; i < 5; i++) pts.push([30 + r() * 40, 30 + r() * 40]); s += tube(pts, 5, k % 2 ? P.purple : P.lavender, { ow: 1.2 }); } return { vb: [100, 100], s }; },
    igg: (r, v) => {
      const hc = v === 'bi' ? P.blue : P.blue, lc = P.sky, lc2 = v === 'bi' ? P.mint : lc, hc2 = v === 'bi' ? P.green : hc;
      let s = tubes([[[46, 54], [45, 72], [44, 92]], [[54, 54], [55, 72], [56, 92]], [[46, 54], [34, 40], [20, 24]]], 11, hc) + tube([[54, 54], [66, 40], [80, 24]], 11, hc2);
      s += tube([[33, 52], [22, 40], [10, 28]], 9, lc) + tube([[67, 52], [78, 40], [90, 28]], 9, lc2);
      if (v === 'adc') s += [[30, 66], [70, 66], [40, 84], [60, 84]].map(([x, y]) => tube([[x < 50 ? 44 : 56, y - 4], [x, y]], 2, P.grey, { ow: 0.8 }) + `<path d="M${x} ${y - 6} l2 4 4.5 .5 -3.3 3 1 4.4 -4.2 -2.3 -4.2 2.3 1 -4.4 -3.3 -3 4.5 -.5Z" fill="${P.red}" stroke="${oc(P.red)}" stroke-width="1.2" stroke-linejoin="round"/>`).join('');
      if (v === 'label') s += `<path d="M50 88 l3 6 6.5 .7 -4.8 4.4 1.4 6.4 -6.1 -3.3 -6.1 3.3 1.4 -6.4 -4.8 -4.4 6.5 -.7Z" fill="#7cf2a8" stroke="${oc('#7cf2a8')}" stroke-width="1.4" stroke-linejoin="round"/>`;
      return { vb: [100, v === 'label' ? 110 : 100], s };
    },
    fab: () => ({ vb: [60, 100], s: tube([[34, 92], [32, 52], [30, 10]], 12, P.blue) + tube([[18, 88], [16, 50], [14, 14]], 10, P.sky) }),
    fab2: () => ({ vb: [100, 80], s: tubes([[[46, 70], [34, 46], [20, 20]], [[54, 70], [66, 46], [80, 20]], [[46, 70], [54, 70]]], 11, P.blue) + tube([[33, 66], [22, 44], [10, 22]], 9, P.sky) + tube([[67, 66], [78, 44], [90, 22]], 9, P.sky) }),
    scfv: (r) => ({ vb: [100, 70], s: tube([[30, 50], [50, 62], [70, 50]], 3, P.grey, { ow: 1 }) + glob(30, 32, 20, 22, P.blue, r) + glob(70, 32, 20, 22, P.sky, r) }),
    vhh: (r) => ({ vb: [60, 80], s: glob(30, 40, 22, 30, P.teal, r) }),
    fc: () => ({ vb: [60, 80], s: tubes([[[24, 8], [23, 40], [22, 72]], [[36, 8], [37, 40], [38, 72]]], 12, P.blue) }),
    bite: (r) => ({ vb: [120, 60], s: tube([[40, 30], [60, 22], [80, 30]], 3, P.grey, { ow: 1 }) + glob(22, 30, 16, 18, P.blue, r) + glob(44, 30, 14, 16, P.sky, r) + glob(76, 30, 14, 16, P.mint, r) + glob(98, 30, 16, 18, P.green, r) }),
    igm: () => {
      let s = '';
      const y = tubes([[[0, 0], [0, -16]], [[0, -16], [-9, -28]], [[0, -16], [9, -28]]], 7, P.blue) + tube([[-6, -18], [-13, -28]], 5, P.sky) + tube([[6, -18], [13, -28]], 5, P.sky);
      for (let k = 0; k < 5; k++) s += G(y, `translate(${f(50 + 14 * Math.cos((k / 5) * 2 * Math.PI - Math.PI / 2))} ${f(50 + 14 * Math.sin((k / 5) * 2 * Math.PI - Math.PI / 2))}) rotate(${k * 72})`);
      return { vb: [100, 100], s: s + ball(50, 50, 5, P.purple) };
    },
    iga: () => {
      const y = tubes([[[0, 0], [0, -18]], [[0, -18], [-10, -32]], [[0, -18], [10, -32]]], 8, P.teal) + tube([[-7, -20], [-15, -32]], 6, P.sky) + tube([[7, -20], [15, -32]], 6, P.sky);
      return { vb: [100, 100], s: G(y, 'translate(50 44)') + G(y, 'translate(50 56) rotate(180)') + ball(50, 50, 4.5, P.purple) };
    },
    car: (r) => ({ vb: [60, 140], s: membrane(76, 60) + tube([[30, 40], [30, 98]], 5, P.grey) + glob(20, 16, 12, 13, P.green, r) + glob(40, 16, 12, 13, P.lime, r) + tube([[24, 28], [30, 40]], 4, P.grey) + glob(30, 106, 10, 8, P.orange, r) + [114, 124, 134].map((y) => `<rect x="22" y="${y - 4}" width="16" height="8" rx="4" fill="${P.purple}" stroke="${oc(P.purple)}" stroke-width="1.6"/>`).join('') }),
    tcr: (r) => ({ vb: [100, 130], s: membrane(80, 100)
      + [36, 64].map((x, i) => tube([[x, 60], [x, 100]], 4.5, D(i ? P.teal : P.navy, 0.1)) + ell(x, 52, 12, 13, i ? P.teal : P.navy) + ell(x + (i ? 2 : -2), 26, 12, 13, L(i ? P.teal : P.navy, 0.3))).join('')
      + [14, 86].map((x) => tube([[x, 70], [x, 100]], 3.5, P.olive) + glob(x, 62, 9, 9, L(P.olive, 0.25), r)).join('')
      + tubes([[[46, 100], [46, 124]], [[54, 100], [54, 124]]], 3.5, P.purple) }),
    bcr: (r) => ({ vb: [100, 130], s: membrane(84, 100) + G(SPECIAL.igg(r).s, 'translate(14 0) scale(.72)') + tubes([[[46, 66], [46, 104]], [[54, 66], [54, 104]]], 4, P.blue) + [16, 84].map((x) => tube([[x, 72], [x, 112]], 3.5, P.coral) + glob(x, 64, 9, 9, P.coral, r)).join('') }),
    mhc1: (r) => ({ vb: [80, 120], s: membrane(80, 80) + tube([[34, 62], [34, 100]], 5, D(P.sage, 0.2)) + glob(34, 52, 13, 12, P.sage, r) + glob(58, 54, 11, 11, P.lavender, r) + glob(40, 26, 30, 14, P.sage, r) + tube([[22, 14], [40, 11], [58, 14]], 4.5, P.red) }),
    mhc2: (r) => ({ vb: [80, 120], s: membrane(80, 80) + tube([[28, 62], [28, 100]], 5, D(P.sage, 0.2)) + tube([[52, 62], [52, 100]], 5, D(P.olive, 0.1)) + glob(28, 52, 12, 12, P.sage, r) + glob(52, 52, 12, 12, L(P.olive, 0.3), r) + glob(26, 26, 18, 13, P.sage, r) + glob(54, 26, 18, 13, L(P.olive, 0.3), r) + tube([[18, 13], [40, 10], [62, 13]], 4.5, P.red) }),
    synapse: (r) => ({ vb: [100, 228], s: G(SPECIAL.tcr(r).s, 'translate(0 130) scale(1 -1)') + G(SPECIAL.mhc1(r).s, 'translate(10 108)') }),
    pdpair: (r) => ({ vb: [80, 162], s: G(A.igrec(P.purple, r, '1').s, 'translate(10 120) scale(1 -1)') + G(A.igrec(P.orange, r, '2').s, 'translate(10 40)') }),
    perforin: () => {
      let s = `<rect x="0" y="44" width="30" height="22" fill="${MEM}" opacity=".7"/><rect x="70" y="44" width="30" height="22" fill="${MEM}" opacity=".7"/><path d="M0 44 H30 M0 66 H30 M70 44 H100 M70 66 H100" stroke="${MEMLINE}" stroke-width="1.4"/>`;
      for (let k = 0; k < 5; k++) { const x = 32 + k * 9, front = k === 0 || k === 4; s += tube([[x, 14], [x + (k - 2) * 1.2, 40], [x, 74]], 7.5, front ? P.red : L(P.red, 0.25 + k * 0.05), { ow: 1.5 }) + ball(x, 12, 5, D(P.red, 0.1), { w: 1.2 }); }
      return { vb: [100, 84], s };
    },
    inflammasome: (r) => {
      let s = '';
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2; s += glob(50 + 30 * Math.cos(t), 50 + 30 * Math.sin(t), 14, 12, k % 2 ? L(P.indigo, 0.3) : P.indigo, r, { rot: (t * 180) / Math.PI }); }
      for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2; s += ball(50 + 14 * Math.cos(t), 50 + 14 * Math.sin(t), 6, P.mint); }
      return { vb: [100, 100], s: s + glob(50, 50, 8, 8, P.coral, r) };
    },
    dna: () => ({ vb: [100, 44], s: dnaH(0, 10, 100) }),
    dnau: () => ({ vb: [100, 44], s: dnaH(0, 10, 100, 5) }),
    rna: (r) => { const pts = []; let s = ''; for (let i = 0; i <= 10; i++) { const x = 6 + i * 8.8, y = 22 + 9 * Math.sin(i * 0.9); pts.push([x, y]); if (i % 2 === 0 && i > 0 && i < 10) s += `<path d="M${f(x)} ${f(y)} v12" stroke="${P.coral}" stroke-width="3.4" stroke-linecap="round"/>`; } return { vb: [100, 50], s: s + tube(pts, 5, P.orange) }; },
    nucleosome: () => ({ vb: [100, 90], s: `<ellipse cx="50" cy="56" rx="30" ry="12" fill="${D(P.lavender, 0.1)}" stroke="${oc(P.lavender)}" stroke-width="2.2"/><rect x="20" y="30" width="60" height="26" fill="${P.lavender}"/><path d="M20 30 V56 M80 30 V56" stroke="${oc(P.lavender)}" stroke-width="2.2"/><ellipse cx="50" cy="30" rx="30" ry="12" fill="${L(P.lavender, 0.3)}" stroke="${oc(P.lavender)}" stroke-width="2.2"/>` + tube([[4, 70], [20, 62], [50, 70], [82, 58], [84, 40], [50, 36], [16, 40], [18, 26], [50, 18], [96, 22]], 6, P.navy) }),
    membrane: () => { let s = ''; for (let i = 0; i < 9; i++) { const x = 6 + i * 11; s += `<path d="M${x - 2} 12 V19 M${x + 2} 12 V19 M${x - 2} 27 V34 M${x + 2} 27 V34" stroke="${MEMLINE}" stroke-width="1.6" stroke-linecap="round"/>` + ball(x, 9, 4.6, P.gold, { w: 1 }) + ball(x, 37, 4.6, P.gold, { w: 1 }); } return { vb: [100, 46], s }; },
    phospho: () => ({ vb: [40, 40], s: ball(20, 20, 15, P.yellow) + `<text x="20" y="26.5" text-anchor="middle" font-family="Helvetica, Arial" font-weight="700" font-size="18" fill="${D(P.yellow, 0.55)}">P</text>` }),
    atp: (r) => ({ vb: [100, 50], s: ubChain([[60, 25], [74, 25], [88, 25]], 6.5).replace(/#d9a12b/g, P.yellow) + `<path d="M28 14 L42 20 L40 34 L26 36 L18 24 Z" fill="${P.coral}" stroke="${oc(P.coral)}" stroke-width="2" stroke-linejoin="round"/>` + glob(12, 20, 8, 8, P.teal, r) + tube([[42, 26], [53, 25]], 2.5, P.grey, { ow: 0.8 }) }),
    hsp70: (r) => ({ vb: [100, 100], s: tube([[30, 80], [50, 60], [64, 70], [86, 52]], 5, P.purple) + glob(36, 40, 28, 26, P.teal, r) + glob(68, 50, 16, 14, L(P.teal, 0.3), r) + tube([[60, 36], [74, 30], [84, 40]], 7, L(P.teal, 0.3)) }),
    p53: (r) => ({ vb: [100, 100], s: dnaH(0, 70, 100) + A.tetramer(P.red, r).s.replace(/^/, '<g transform="translate(10 0) scale(.8)">') + '</g>' }),
    ras: (r) => ({ vb: [100, 100], s: glob(48, 52, 36, 34, P.orange, r) + ubChain([[60, 34], [70, 30], [80, 34]], 5).replace(/#d9a12b/g, P.yellow) + tube([[48, 86], [48, 98]], 4, P.grey) }),
  };

  // ---------- Catalogue ----------
  const ICON_LIST = [];
  const add = (name, cat, tags, color, draw, vb) => ICON_LIST.push({ name, cat, tags, color, draw, vb });
  const used = new Set();
  const slug = (s) => { let id = 's-' + s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, ''); while (used.has(id)) id += '-2'; used.add(id); return id; };
  // Archetype icons: colour = primary (recolourable), shape varies per name.
  function arch(name, a, colour, cat, tags) {
    const [kind, arg] = a.split(':'), seed = hash(name), c0 = col(colour);
    const vb = A[kind](c0, rng(seed), arg).vb;
    add(name, cat, `${tags} protein soft`, c0, (c) => A[kind](c, rng(seed), arg).s, vb);
  }
  function special(name, key, cat, tags, arg) {
    const seed = hash(name), vb = SPECIAL[key](rng(seed), arg).vb;
    add(name, cat, `${tags} soft`, P.blue, () => SPECIAL[key](rng(seed), arg).s, vb);
  }
  function cellIcon(name, colour, kind, deco, tags) {
    const seed = hash(name), c0 = col(colour);
    add(name, 'Soft · Cells', `${tags || ''} cell soft`, c0, (c) => cell(c, rng(seed), kind, deco).s, [100, 100]);
  }

  // Generic protein shapes (the building blocks; recolour freely).
  const SH = 'Soft · Protein shapes';
  [['Protein (hook)', 'hook', 'purple', 'J substrate curved'], ['Protein (Ω-shaped)', 'omega', 'green', 'S curved domain'], ['Protein (C-shaped)', 'cshape', 'teal', 'arc curved'],
    ['Adaptor protein (oval)', 'oval', 'cream', 'ellipse subunit'], ['Protein (bean)', 'bean', 'blue', 'kidney'], ['Globular protein', 'globule', 'orange', 'round blob'],
    ['Globular protein (lumpy)', 'lumpy', 'magenta', 'blob'], ['Kinase (bilobed)', 'kinase', 'blue', 'ATP N-lobe C-lobe'], ['Two-domain protein (dumbbell)', 'dumbbell', 'teal', 'calmodulin linker'],
    ['Four-helix bundle', 'helix4', 'coral', 'cytokine helices'], ['Trimer', 'trimer', 'red', 'trimeric TNF'], ['Dimer', 'dimer', 'purple', 'homodimer'], ['Tetramer', 'tetramer', 'indigo', 'tetrameric'],
    ['Horseshoe (leucine-rich repeat)', 'horseshoe', 'green', 'LRR solenoid'], ['β-propeller (WD40)', 'propeller', 'navy', 'WD40 repeat'], ['Hexameric ring', 'ring', 'teal', 'AAA ATPase hexamer'],
    ['Protein (Y-shaped)', 'yshape', 'navy', 'branched'], ['Scaffold (elongated)', 'scaffold', 'blue', 'cullin rod'], ['Enzyme (open cleft)', 'pacman', 'orange', 'active site protease'],
    ['β-trefoil', 'trefoil', 'rose', 'IL-1 FGF'], ['Chemokine', 'chemokine', 'pink', 'small'], ['Helical globular protein', 'helixglob', 'plum', 'helices'], ['Ubiquitin-like modifier', 'ubl', 'gold', 'Ubl tag'],
    ['Small molecule', 'smallmol', 'orange', 'drug ligand compound'], ['Peptide', 'peptide', 'red', 'short chain'], ['Coiled coil', 'coil', 'green', 'fibrous dimer'], ['Transcription factor on DNA', 'tfdna', 'purple', 'TF dimer binding'],
    ['Receptor (1 Ig domain)', 'igrec:1', 'purple', 'membrane'], ['Receptor (2 Ig domains)', 'igrec:2', 'blue', 'membrane'], ['Receptor (3 Ig domains)', 'igrec:3', 'teal', 'membrane'], ['Receptor (4 Ig domains)', 'igrec:4', 'green', 'membrane'],
    ['Receptor dimer (2 domains)', 'igrec:2d', 'orange', 'membrane'], ['Receptor dimer (3 domains)', 'igrec:3d', 'red', 'membrane'], ['TNF-family receptor', 'igrec:4c', 'coral', 'cysteine-rich membrane'],
    ['Receptor tyrosine kinase dimer', 'rtk', 'blue', 'RTK membrane'], ['GPCR (7-transmembrane)', 'gpcr', 'purple', 'G protein-coupled receptor'], ['Cytokine receptor (JAK-associated)', 'cytrec', 'teal', 'JAK membrane'],
    ['Toll-like receptor', 'tlr', 'green', 'TLR LRR membrane'], ['C-type lectin receptor', 'lectin', 'magenta', 'membrane'], ['Integrin', 'integrin', 'navy', 'adhesion membrane'], ['Cadherin', 'cadherin', 'teal', 'adhesion junction membrane'],
    ['Ion channel', 'channel', 'cyan', 'pore membrane transporter']].forEach(([n, a, c, t]) => arch(n, a, c, SH, t));
  // Shape variants (different seeds give different silhouettes).
  for (let i = 1; i <= 8; i++) arch(`Globular protein ${i}`, i % 2 ? 'globule' : 'lumpy', ['blue', 'green', 'purple', 'orange', 'teal', 'red', 'navy', 'coral'][i - 1], SH, 'blob variant');
  for (let i = 1; i <= 6; i++) arch(`Hook protein ${i}`, 'hook', ['purple', 'lavender', 'teal', 'orange', 'green', 'magenta'][i - 1], SH, 'substrate variant');
  for (let i = 1; i <= 6; i++) arch(`Ω protein ${i}`, 'omega', ['green', 'sage', 'blue', 'purple', 'orange', 'teal'][i - 1], SH, 'domain variant');
  for (let i = 1; i <= 6; i++) arch(`Bean protein ${i}`, 'bean', ['blue', 'teal', 'orange', 'red', 'purple', 'olive'][i - 1], SH, 'variant');

  // Specials.
  const UB = 'Soft · Ubiquitin & degradation', IM = 'Soft · Antibodies & immune complexes', MS = 'Soft · Molecules & DNA';
  [['Ubiquitin', 'ub', UB, 'Ub tag'], ['Polyubiquitin chain (K48)', 'ubk48', UB, 'Ub degradation signal'], ['Linear ubiquitin chain (K63 / M1)', 'ubk63', UB, 'Ub signalling'], ['Branched ubiquitin chain', 'ubbranch', UB, 'Ub'],
    ['Polyubiquitinated substrate', 'polyub', UB, 'Ub marked protein UNG2'], ['Monoubiquitinated protein', 'monoub', UB, 'Ub'], ['26S proteasome', 'p26s', UB, 'degradation 19S'], ['20S proteasome core', 'p20s', UB, 'degradation'],
    ['Peptide fragments (degraded protein)', 'frag', UB, 'degradation products'], ['Unfolded protein', 'unfolded', UB, 'misfolded chain'], ['E1 ubiquitin-activating enzyme ~Ub', 'e1', UB, 'UBA1'], ['E2 conjugating enzyme ~Ub', 'e2', UB, 'UBE2'],
    ['Cullin-RING ligase complex', 'crl', UB, 'CRL SCF E3'], ['CTLH E3 ligase complex', 'ctlh', UB, 'GID MAEA RANBP9'], ['CTLH–FAM72A–UNG2 complex', 'ctlh', UB, 'adaptor substrate recruitment', 'sub'],
    ['CTLH complex ubiquitinating UNG2', 'ctlh', UB, 'MAEA ubiquitination', 'ub'], ['PROTAC ternary complex', 'protac', UB, 'degrader target E3'], ['PROTAC molecule', 'protacmol', UB, 'bifunctional degrader'],
    ['Molecular glue degrader complex', 'glue', UB, 'IMiD CRBN'], ['Autophagosome', 'autophago', UB, 'autophagy LC3 double membrane'], ['Lysosome', 'lysosome', UB, 'acidic organelle'], ['Aggresome / protein aggregate', 'aggresome', UB, 'misfolded aggregation'],
    ['HSP70 chaperone with client', 'hsp70', UB, 'folding heat shock'],
    ['IgG antibody (soft)', 'igg', IM, 'immunoglobulin Y'], ['Bispecific antibody', 'igg', IM, 'bsAb', 'bi'], ['Antibody–drug conjugate (soft)', 'igg', IM, 'ADC payload', 'adc'], ['Fluorophore-labelled antibody', 'igg', IM, 'secondary detection', 'label'],
    ['Fab fragment', 'fab', IM, 'antigen binding'], ['F(ab′)₂ fragment', 'fab2', IM, 'pepsin'], ['scFv', 'scfv', IM, 'single-chain variable fragment'], ['Nanobody (VHH)', 'vhh', IM, 'single domain camelid'],
    ['Fc fragment', 'fc', IM, 'crystallisable'], ['BiTE (bispecific T-cell engager)', 'bite', IM, 'blinatumomab'], ['IgM pentamer', 'igm', IM, 'immunoglobulin M J chain'], ['IgA dimer', 'iga', IM, 'secretory mucosal'],
    ['Chimeric antigen receptor (CAR)', 'car', IM, 'CAR-T construct CD3ζ CD28'], ['TCR–CD3 complex', 'tcr', IM, 'T-cell receptor'], ['BCR complex', 'bcr', IM, 'B-cell receptor Igα Igβ'],
    ['MHC class I with peptide', 'mhc1', IM, 'HLA antigen presentation β2m'], ['MHC class II with peptide', 'mhc2', IM, 'HLA-DR antigen presentation'], ['TCR–peptide–MHC synapse', 'synapse', IM, 'immunological synapse recognition'],
    ['PD-1 / PD-L1 interaction', 'pdpair', IM, 'checkpoint'], ['Perforin pore', 'perforin', IM, 'cytotoxic membrane'], ['Inflammasome (NLRP3)', 'inflammasome', IM, 'ASC caspase-1'],
    ['DNA double helix (soft)', 'dna', MS, 'double strand'], ['DNA with uracil lesion (U:G)', 'dnau', MS, 'mismatch deamination AID UNG'], ['RNA strand (soft)', 'rna', MS, 'mRNA'], ['Nucleosome', 'nucleosome', MS, 'histone chromatin'],
    ['Lipid bilayer segment', 'membrane', MS, 'membrane phospholipid'], ['Phosphate (P)', 'phospho', MS, 'phosphorylation'], ['ATP / GTP', 'atp', MS, 'nucleotide triphosphate energy'],
    ['p53 tetramer on DNA', 'p53', 'Soft · Cancer signalling', 'tumour suppressor TP53'], ['RAS–GTP', 'ras', 'Soft · Cancer signalling', 'KRAS oncogene GTPase']].forEach(([n, k, c, t, a]) => special(n, k, c, t, a));

  // Named proteins: [name, archetype, colour, tags].
  const NAMED = {
    'Soft · Ubiquitin & degradation': `UNG2|hook|purple|uracil DNA glycosylase substrate;FAM72A|oval|cream|adaptor AID;MAEA|yshape|navy|CTLH RING E3;RMND5A|yshape|blue|CTLH RING;RANBP9|omega|green|CTLH scaffold;RANBP10|omega|sage|CTLH;ARMC8|cshape|sky|CTLH armadillo;WDR26|propeller|navy|CTLH WD40;MKLN1|propeller|teal|CTLH muskelin;GID4|bean|orange|CTLH substrate receptor;GID8 (TWA1)|dumbbell|teal|CTLH;YPEL5|ubl|pink|CTLH;
      MDM2|pacman|red|E3 ligase p53 HDM2;MDMX (MDM4)|pacman|rose|p53;CRBN (cereblon)|bean|green|E3 IMiD substrate receptor;VHL|bean|blue|E3 HIF von Hippel-Lindau;DCAF15|propeller|teal|E3 indisulam;DDB1|propeller|navy|CRL4 adaptor;β-TrCP|propeller|purple|F-box SCF;SKP2|horseshoe|orange|F-box p27;FBXW7|propeller|magenta|F-box tumour suppressor;KEAP1|propeller|indigo|NRF2 CUL3 Kelch;SPOP|dimer|coral|CUL3 adaptor;
      CBL|bean|olive|RING E3 RTK;ITCH|cshape|orange|HECT E3;NEDD4|cshape|teal|HECT E3;WWP1|cshape|plum|HECT;HUWE1|scaffold|slate|HECT;Parkin|lumpy|green|PRKN mitophagy RBR;TRIM21|dimer|red|antibody E3;TRIM25|dimer|coral|RIG-I E3;cIAP1|globule|orange|BIRC2;XIAP|dumbbell|red|BIRC4 caspase inhibitor;RNF4|ubl|teal|STUbL;RNF168|globule|purple|DNA damage;APC/C|ring|navy|anaphase promoting complex;CDC20|propeller|green|APC/C coactivator;CDH1 (FZR1)|propeller|sage|APC/C;
      CUL1|scaffold|blue|cullin SCF;CUL2|scaffold|teal|cullin;CUL3|scaffold|indigo|cullin BTB;CUL4A|scaffold|navy|cullin;CUL4B|scaffold|slate|cullin;CUL5|scaffold|cyan|cullin;RBX1|ubl|green|RING box ROC1;SKP1|oval|cream|SCF adaptor;Elongin B|ubl|lavender|CRL2;Elongin C|oval|sky|CRL2;
      UBA1 (E1)|bean|blue|activating enzyme;UBE2D (UbcH5)|globule|teal|E2;UBE2N (Ubc13)|globule|cyan|E2 K63;UBC9|globule|mint|SUMO E2;CDC34|globule|sky|E2 SCF;SUMO1|ubl|teal|sumoylation;SUMO2/3|ubl|cyan|sumoylation;NEDD8|ubl|green|neddylation;ISG15|dumbbell|pink|interferon Ubl;
      USP7|pacman|blue|DUB HAUSP;USP14|pacman|teal|DUB proteasome;UCHL5|pacman|cyan|DUB;RPN11 (PSMD14)|pacman|navy|DUB proteasome lid;OTUB1|pacman|orange|DUB;CYLD|pacman|purple|DUB NF-κB;A20 (TNFAIP3)|pacman|red|DUB NF-κB;BAP1|pacman|olive|DUB tumour suppressor;
      p97 / VCP|ring|teal|segregase AAA;NPL4|dumbbell|sky|p97 cofactor;UFD1|ubl|lavender|p97 cofactor;HSP90|dimer|orange|chaperone;HSC70|kinase|teal|chaperone;CHIP (STUB1)|dimer|coral|E3 chaperone;BAG3|cshape|olive|co-chaperone;
      p62 / SQSTM1|coil|orange|autophagy receptor;LC3|ubl|teal|autophagy ATG8;GABARAP|ubl|cyan|autophagy;NBR1|coil|plum|autophagy;Optineurin|coil|green|mitophagy;NDP52|coil|purple|xenophagy;ATG5|bean|blue|autophagy;ATG7|dimer|indigo|E1-like autophagy;ATG12|ubl|green|autophagy;ATG16L1|coil|navy|autophagy;Beclin 1|coil|coral|autophagy;ULK1|kinase|purple|autophagy kinase;LAMP1|igrec:2|pink|lysosome membrane;LAMP2A|igrec:2|rose|CMA lysosome;Cathepsin B|pacman|rose|lysosomal protease;Cathepsin D|pacman|magenta|lysosomal protease;
      Immunoproteasome β5i (LMP7)|ring|salmon|antigen processing;IKZF1 (Ikaros)|tfdna|indigo|neosubstrate zinc finger;IKZF3 (Aiolos)|tfdna|plum|neosubstrate;CK1α|kinase|teal|neosubstrate;GSPT1|globule|olive|neosubstrate;BRD4|dumbbell|purple|bromodomain PROTAC target`,
    'Soft · Immune receptors': `TCRα/β|igrec:2d|navy|T-cell receptor;TCRγ/δ|igrec:2d|teal|T-cell receptor;CD3ε|igrec:1|olive|CD3;CD3γ|igrec:1|lime|CD3;CD3δ|igrec:1|mint|CD3;CD3ζ|igrec:1|purple|CD247 ITAM;CD4|igrec:4|blue|coreceptor helper;CD8|igrec:1d|teal|coreceptor cytotoxic;CD2|igrec:2|cyan|adhesion;
      CD19|igrec:2|orange|B cell;CD20|channel|coral|MS4A1 rituximab;CD21|igrec:4c|olive|complement receptor 2;CD22|igrec:4|plum|Siglec B cell;CD79a (Igα)|igrec:1|coral|BCR;CD79b (Igβ)|igrec:1|orange|BCR;CD25 (IL-2Rα)|igrec:2|sky|Treg;CD27|igrec:3c|teal|TNFR;CD28|igrec:1d|green|costimulation;CD30|igrec:4c|indigo|TNFR;CD33|igrec:2|pink|Siglec myeloid;CD38|globule|orange|NADase;CD40|igrec:4c|blue|TNFR;CD44|igrec:1|slate|hyaluronan;CD45|igrec:4|navy|PTPRC phosphatase;CD47|igrec:1|red|don't eat me;CD52|igrec:1|lavender|alemtuzumab;CD56 (NCAM)|igrec:4|teal|NK;CD62L (L-selectin)|lectin|cyan|homing;CD69|lectin|orange|activation;CD70|trimer|coral|TNF;CD80 (B7-1)|igrec:2|orange|costimulation;CD86 (B7-2)|igrec:2|coral|costimulation;CD95 (Fas)|igrec:3c|red|death receptor;CD103|integrin|teal|αE integrin;CD127 (IL-7Rα)|cytrec|green|IL-7;
      CD137 (4-1BB)|igrec:4c|green|TNFR costimulation;OX40|igrec:3c|teal|TNFR;GITR|igrec:3c|purple|TNFR;ICOS|igrec:1d|olive|costimulation;ICOSL|igrec:2|lime|B7;PD-1|igrec:1|purple|checkpoint PDCD1;PD-L1|igrec:2|orange|checkpoint CD274 B7-H1;PD-L2|igrec:2|coral|checkpoint;CTLA-4|igrec:1d|red|checkpoint CD152;LAG-3|igrec:4|indigo|checkpoint;TIM-3|igrec:1|teal|checkpoint HAVCR2;TIGIT|igrec:1|magenta|checkpoint;VISTA|igrec:1|plum|checkpoint;BTLA|igrec:1|navy|checkpoint;HVEM|igrec:4c|blue|TNFR;CD226 (DNAM-1)|igrec:2|green|activating;CD96|igrec:3|olive|;SIRPα|igrec:3|red|CD47 receptor;
      KIR|igrec:2|plum|NK inhibitory;NKG2D|lectin|green|NK activating;NKG2A|lectin|purple|NK inhibitory;MICA|igrec:3|orange|NKG2D ligand;HLA-E|igrec:3|sage|NKG2A ligand;NKp46|igrec:2|teal|NCR1;NKp30|igrec:1|cyan|NCR3;CD16 (FcγRIII)|igrec:2|blue|Fc receptor ADCC;CD32 (FcγRII)|igrec:2|sky|Fc receptor;CD64 (FcγRI)|igrec:3|navy|Fc receptor;FcRn|igrec:3|teal|neonatal Fc receptor;FcεRI|igrec:2d|orange|IgE receptor mast;CD1d|igrec:3|olive|lipid antigen NKT;MR1|igrec:3|lime|MAIT;
      TLR1|tlr|green|Toll-like;TLR2|tlr|teal|Toll-like lipopeptide;TLR3|tlr|blue|Toll-like dsRNA;TLR4|tlr|red|Toll-like LPS;TLR5|tlr|orange|flagellin;TLR7|tlr|purple|ssRNA;TLR8|tlr|plum|ssRNA;TLR9|tlr|navy|CpG DNA;Dectin-1|lectin|olive|β-glucan;DC-SIGN|lectin|cyan|CD209;Mannose receptor|igrec:4c|teal|CD206 M2;
      IL-2R (βγc)|cytrec|teal|IL-2 receptor;IL-6R / gp130|cytrec|blue|IL-6 receptor;IFNAR|cytrec|indigo|type I interferon receptor;IFNGR|cytrec|purple|IFN-γ receptor;IL-4R|cytrec|orange|;IL-17R|igrec:2d|red|;IL-1R|igrec:3|rose|IL-1 receptor;TNFR1|igrec:4c|red|TNF receptor;TNFR2|igrec:4c|coral|;TGF-βR|rtk|olive|serine kinase receptor;
      CXCR4|gpcr|teal|chemokine receptor;CXCR3|gpcr|blue|chemokine receptor;CXCR5|gpcr|indigo|follicle;CCR5|gpcr|purple|HIV coreceptor;CCR7|gpcr|navy|lymph node homing;CX3CR1|gpcr|green|fractalkine;C5aR|gpcr|orange|complement;S1PR1|gpcr|cyan|egress;LFA-1|integrin|blue|αLβ2 adhesion;VLA-4|integrin|teal|α4β1;ICAM-1|igrec:4|orange|CD54 adhesion;VCAM-1|igrec:4|coral|adhesion`,
    'Soft · Cytokines & chemokines': `IL-1α|trefoil|rose|interleukin;IL-1β|trefoil|red|interleukin inflammation;IL-18|trefoil|coral|interleukin;IL-33|trefoil|magenta|alarmin;IL-2|helix4|teal|interleukin T cell growth;IL-3|helix4|sky|;IL-4|helix4|orange|Th2;IL-5|helix4|olive|eosinophil;IL-6|helix4|blue|inflammation;IL-7|helix4|green|;IL-9|helix4|lime|;IL-10|dimer|purple|anti-inflammatory;IL-12|dimer|indigo|p35 p40 Th1;IL-13|helix4|coral|Th2;IL-15|helix4|cyan|NK;IL-17A|dimer|red|Th17;IL-17F|dimer|rose|Th17;IL-21|helix4|plum|Tfh;IL-22|helixglob|teal|;IL-23|dimer|magenta|Th17;IL-27|dimer|slate|;IL-35|dimer|lavender|Treg;
      IFN-α|helixglob|indigo|interferon type I;IFN-β|helixglob|blue|interferon type I;IFN-γ|dimer|purple|interferon type II;IFN-λ|helixglob|cyan|type III;TNF-α|trimer|red|tumour necrosis factor;LT-α|trimer|coral|lymphotoxin;TGF-β|dimer|olive|transforming growth factor;GM-CSF|helix4|green|colony stimulating;G-CSF|helix4|lime|neutrophil;M-CSF|dimer|teal|macrophage;TSLP|helix4|orange|alarmin;BAFF|trimer|blue|B cell survival;APRIL|trimer|sky|;RANKL|trimer|orange|osteoclast;TRAIL|trimer|magenta|apoptosis;CD40L|trimer|navy|CD154;FasL|trimer|red|death ligand;OX40L|trimer|teal|;4-1BBL|trimer|green|;
      CXCL8 (IL-8)|chemokine|red|neutrophil chemokine;CXCL9|chemokine|purple|;CXCL10|chemokine|indigo|IP-10;CXCL12 (SDF-1)|chemokine|teal|;CXCL13|chemokine|blue|B cell follicle;CCL2 (MCP-1)|chemokine|orange|monocyte;CCL3|chemokine|coral|MIP-1α;CCL5 (RANTES)|chemokine|magenta|;CCL19|chemokine|navy|;CCL21|chemokine|slate|;CX3CL1|chemokine|green|fractalkine;
      Complement C1q|tetramer|lavender|classical pathway;C3|bean|olive|complement;C3b|bean|lime|opsonin;C5a|chemokine|orange|anaphylatoxin;Granzyme A|pacman|red|serine protease;Granzyme B|pacman|rose|cytotoxic;Granulysin|helixglob|coral|;Perforin|scaffold|red|pore;Defensin|ubl|orange|antimicrobial;Lysozyme|pacman|teal|;Lactoferrin|dumbbell|pink|;Myeloperoxidase|dimer|green|MPO neutrophil`,
    'Soft · Immune signalling': `LCK|kinase|blue|Src kinase TCR;FYN|kinase|sky|Src;ZAP-70|kinase|navy|Syk family;LAT|peptide|olive|adaptor;SLP-76|coil|teal|adaptor;PLCγ1|bean|orange|phospholipase;SYK|kinase|teal|B cell;BTK|kinase|green|ibrutinib;BLNK|coil|lime|adaptor;PI3Kδ|kinase|purple|;PKCθ|kinase|indigo|;CARD11|coil|plum|CBM;BCL10|ubl|coral|CBM;MALT1|pacman|magenta|paracaspase;
      MyD88|dumbbell|orange|TLR adaptor;TRIF|dumbbell|coral|TLR3 adaptor;IRAK4|kinase|red|;IRAK1|kinase|rose|;TRAF6|trimer|purple|E3;TAK1|kinase|teal|;IKKβ|kinase|blue|NF-κB;NEMO|coil|sky|IKKγ;IκBα|cshape|olive|NF-κB inhibitor;NF-κB p65/p50|tfdna|red|RelA transcription;IRF3|tfdna|indigo|interferon;IRF7|tfdna|plum|;
      cGAS|bean|teal|DNA sensor;STING|dimer|green|TMEM173;RIG-I|helixglob|orange|RNA sensor DDX58;MDA5|helixglob|coral|IFIH1;MAVS|coil|purple|mitochondrial;TBK1|kinase|navy|;NLRP3|horseshoe|indigo|inflammasome sensor;ASC|dumbbell|mint|PYCARD;Caspase-1|dimer|coral|inflammasome;Gasdermin D|bean|red|pyroptosis pore;NOD2|horseshoe|teal|;
      JAK1|kinase|gold|Janus kinase;JAK2|kinase|orange|Janus kinase;JAK3|kinase|coral|;TYK2|kinase|olive|;STAT1|tfdna|purple|transcription;STAT3|tfdna|blue|transcription;STAT4|tfdna|teal|;STAT5|tfdna|green|;STAT6|tfdna|orange|;SOCS1|globule|red|suppressor;
      NFAT|tfdna|teal|calcineurin;AP-1 (Fos/Jun)|tfdna|orange|transcription;T-bet|tfdna|purple|Th1 TBX21;GATA3|tfdna|green|Th2;RORγt|tfdna|red|Th17;FOXP3|tfdna|indigo|Treg;BCL6|tfdna|blue|Tfh germinal centre;BLIMP-1|tfdna|magenta|plasma PRDM1;IRF4|tfdna|plum|;PAX5|tfdna|teal|B cell;TOX|tfdna|slate|exhaustion;TCF1|tfdna|green|stemness;
      AID (AICDA)|bean|orange|activation-induced deaminase somatic hypermutation class switch;APOBEC3G|bean|coral|cytidine deaminase;MSH2/MSH6|dimer|teal|mismatch repair;APE1|pacman|blue|AP endonuclease;Pol η|pacman|purple|error-prone polymerase;REV1|bean|indigo|translesion;UNG (uracil glycosylase)|hook|purple|base excision;RAG1/RAG2|tetramer|navy|V(D)J recombination;TdT|pacman|olive|terminal transferase`,
    'Soft · Cancer signalling': `MDM2 (cancer)|pacman|red|p53 regulator;RB|bean|blue|retinoblastoma;E2F1|tfdna|orange|;CDK4|kinase|teal|palbociclib;CDK6|kinase|cyan|;Cyclin D1|globule|orange|;CDK2|kinase|blue|;Cyclin E|globule|coral|;CDK1|kinase|navy|;Cyclin B|globule|magenta|;p16 INK4A|ubl|olive|CDK inhibitor;p21|peptide|green|CDKN1A;p27|peptide|lime|CDKN1B;MYC|tfdna|red|oncogene;MAX|tfdna|purple|;
      KRAS|globule|orange|GTPase G12C;NRAS|globule|coral|;HRAS|globule|rose|;SOS1|bean|teal|GEF;GRB2|dumbbell|olive|adaptor SH2;NF1|scaffold|purple|GAP;BRAF|kinase|red|V600E;CRAF|kinase|coral|RAF1;MEK1|kinase|purple|MAP2K1;MEK2|kinase|plum|;ERK1|kinase|blue|MAPK3;ERK2|kinase|navy|MAPK1;
      EGFR|rtk|blue|ErbB1 receptor;HER2|rtk|orange|ErbB2 trastuzumab;HER3|rtk|coral|ErbB3;MET|rtk|teal|HGF receptor;ALK|rtk|purple|;ROS1|rtk|magenta|;RET|rtk|olive|;FGFR|rtk|green|;VEGFR2|rtk|red|KDR angiogenesis;VEGF-A|dimer|red|angiogenesis;PDGFRα|rtk|indigo|;KIT|rtk|cyan|CD117;FLT3|rtk|navy|;BCR-ABL|kinase|magenta|imatinib fusion;
      PI3Kα|kinase|purple|PIK3CA;PTEN|pacman|green|phosphatase tumour suppressor;AKT1|kinase|teal|PKB;mTORC1|lumpy|indigo|mTOR;TSC2|horseshoe|olive|tuberin;LKB1|kinase|slate|STK11;AMPK|tetramer|lime|;
      β-catenin|horseshoe|blue|armadillo Wnt;APC|scaffold|navy|tumour suppressor;GSK3β|kinase|plum|;AXIN|coil|orange|;WNT|helixglob|coral|ligand;Frizzled|gpcr|purple|Wnt receptor;LRP6|igrec:4|teal|coreceptor;NOTCH|igrec:4c|green|;NICD|tfdna|green|Notch intracellular;SHH|globule|orange|Hedgehog;PTCH1|channel|blue|;SMO|gpcr|indigo|;GLI1|tfdna|teal|;YAP|coil|red|Hippo;TAZ|coil|coral|;TEAD|tfdna|blue|;HIF-1α|tfdna|cyan|hypoxia;
      BRCA1|dumbbell|pink|DNA repair;BRCA2|scaffold|magenta|DNA repair;PARP1|bean|teal|olaparib;ATM|horseshoe|navy|DNA damage kinase;ATR|horseshoe|indigo|;CHK1|kinase|orange|;CHK2|kinase|coral|;WEE1|kinase|olive|;
      BCL-2|helixglob|purple|anti-apoptotic venetoclax;BCL-XL|helixglob|plum|;MCL-1|helixglob|indigo|;BAX|helixglob|red|pro-apoptotic;BAK|helixglob|coral|;BIM|peptide|orange|BH3;Cytochrome c|ubl|red|apoptosis;APAF1|ring|navy|apoptosome;Caspase-3|dimer|red|executioner;Caspase-8|dimer|orange|initiator;Caspase-9|dimer|coral|initiator;Survivin|dimer|teal|IAP;
      Telomerase (TERT)|cshape|blue|;IDH1 mutant|dimer|green|2-HG;IDH2 mutant|dimer|lime|;EZH2|lumpy|purple|PRC2 methyltransferase;DNMT1|bean|indigo|methylation;HDAC|pacman|teal|deacetylase;KDM5|bean|olive|demethylase;MMP2|pacman|orange|matrix metalloproteinase;MMP9|pacman|coral|;E-cadherin|cadherin|teal|epithelial;N-cadherin|cadherin|orange|mesenchymal;Vimentin|coil|plum|intermediate filament EMT;Snail|tfdna|red|EMT;Twist|tfdna|magenta|EMT;ZEB1|tfdna|purple|EMT;
      Kinase inhibitor|smallmol|orange|drug TKI;Chemotherapy drug|smallmol|red|cytotoxic;Imatinib|smallmol|teal|Gleevec;Venetoclax|smallmol|purple|BCL-2 inhibitor;Lenalidomide|smallmol|green|IMiD glue`,
  };
  const MORE = {
    'Soft · Ubiquitin & degradation': `UBE2C|globule|teal|E2 APC/C;UBE2S|globule|cyan|E2 K11;UBE2L3|globule|sky|E2 HECT RBR;UBE3A (E6AP)|cshape|purple|HECT Angelman;HECTD1|cshape|indigo|HECT;SMURF1|cshape|teal|HECT TGF-β;SMURF2|cshape|green|HECT;NEDD4L|cshape|olive|HECT;UBR5|scaffold|navy|HECT N-degron;UBR4|scaffold|slate|N-degron;TRIP12|scaffold|plum|HECT;HERC2|scaffold|indigo|HECT;
      MARCH1|igrec:1|purple|membrane E3 MHC;MARCH8|igrec:1|plum|membrane E3;RNF43|igrec:1|green|Wnt receptor E3;ZNRF3|igrec:1|olive|Wnt receptor E3;RNF8|globule|orange|DNA damage E3;BARD1|dumbbell|pink|BRCA1 partner;DTL (CDT2)|propeller|teal|CRL4 receptor;DCAF1|propeller|purple|CRL4 receptor;KLHL12|propeller|cyan|CUL3 Kelch;FBXO11|horseshoe|orange|F-box;CUL7|scaffold|teal|cullin;CUL9|scaffold|olive|cullin;ARIH1|bean|indigo|RBR E3;
      HOIP (RNF31)|bean|red|LUBAC linear;HOIL-1|ubl|coral|LUBAC;SHARPIN|ubl|rose|LUBAC;OTULIN|pacman|teal|linear DUB;USP1|pacman|blue|DUB FANCD2;USP2|pacman|cyan|DUB;USP8|pacman|orange|DUB endosome;USP9X|pacman|purple|DUB;USP10|pacman|indigo|DUB;USP15|pacman|teal|DUB;USP22|pacman|green|DUB SAGA;USP28|pacman|coral|DUB MYC;USP30|pacman|olive|DUB mitophagy;Ataxin-3|pacman|plum|DUB Machado-Joseph;
      RAD23A|dumbbell|teal|shuttle factor;UBQLN2|dumbbell|purple|ubiquilin shuttle;DDI2|pacman|orange|aspartic protease NRF1;RPN1 (PSMD2)|horseshoe|navy|proteasome receptor;RPN10 (PSMD4)|dumbbell|blue|ubiquitin receptor;RPN13 (ADRM1)|globule|teal|ubiquitin receptor;PA28 activator|ring|coral|proteasome activator 11S;PA200|horseshoe|slate|proteasome activator;PSMB5 (β5)|globule|salmon|chymotrypsin-like bortezomib;PSMB1 (β1)|globule|rose|caspase-like;PSMB2 (β2)|globule|pink|trypsin-like;PSMA (α ring)|ring|navy|proteasome gate;UFM1|ubl|lime|ufmylation;FAT10|dumbbell|olive|Ubl;Bortezomib|smallmol|red|proteasome inhibitor;Carfilzomib|smallmol|coral|proteasome inhibitor;MLN4924 (pevonedistat)|smallmol|teal|neddylation inhibitor`,
    'Soft · Immune receptors': `CD5|igrec:3c|teal|scavenger;CD7|igrec:1|cyan|;CD10|globule|orange|neprilysin;CD11b (Mac-1)|integrin|purple|αM integrin;CD11c|integrin|green|αX integrin DC;CD14|horseshoe|red|LPS coreceptor monocyte;CD15|smallmol|plum|Lewis X;CD34|igrec:1|navy|progenitor;CD45RA|igrec:4|slate|naive;CD45RO|igrec:3|blue|memory;CD57|smallmol|olive|senescence;CD68|igrec:2|brown|macrophage lysosomal;CD123 (IL-3Rα)|cytrec|pink|pDC AML target;CD141|lectin|teal|thrombomodulin cDC1;CD163|igrec:4c|brown|M2 scavenger;CD200|igrec:2|lime|;CD200R|igrec:2|green|;CD39|channel|indigo|ectonucleotidase;CD73|dimer|purple|ecto-5′-nucleotidase adenosine;A2A receptor|gpcr|teal|adenosine;
      BCMA|igrec:1|orange|myeloma target TNFRSF17;GPRC5D|gpcr|coral|myeloma target;FcRH5|igrec:4|purple|myeloma target;CD22 (target)|igrec:4|plum|;CD33 (target)|igrec:2|pink|AML;HER2 (target)|rtk|orange|;TROP2|igrec:2|teal|ADC target sacituzumab;Nectin-4|igrec:3|green|ADC target enfortumab;CEACAM5|igrec:4|blue|CEA;MUC1|coil|lavender|mucin;Mesothelin|horseshoe|sky|MSLN;GD2|smallmol|magenta|ganglioside;Claudin 18.2|channel|cyan|zolbetuximab;DLL3|igrec:4c|indigo|SCLC target;GPC3|horseshoe|olive|glypican HCC;PSMA|dimer|red|prostate-specific membrane antigen;EpCAM|igrec:2|navy|epithelial;B7-H3|igrec:2|coral|CD276;CD70 (target)|trimer|coral|;Siglec-15|igrec:2|plum|;
      HLA-A2|igrec:3|sage|MHC class I allele;HLA-DR (soft)|igrec:2d|olive|MHC class II;β2-microglobulin|globule|lavender|β2m;TAP1/TAP2|channel|teal|peptide transporter;Tapasin|igrec:2|green|PLC;Calreticulin|lectin|orange|eat-me;CD36|igrec:1|brown|scavenger;LILRB1|igrec:4|purple|ILT2;LILRB2|igrec:4|indigo|ILT4;CD300a|igrec:1|plum|;TREM2|igrec:1|teal|microglia;DAP12|peptide|olive|ITAM adaptor;FcγRIIB|igrec:2|navy|inhibitory;FcαRI|igrec:2|teal|CD89;pIgR|igrec:4|cyan|polymeric Ig receptor;CR3|integrin|blue|complement receptor 3;
      CXCR1|gpcr|red|IL-8 receptor;CXCR2|gpcr|coral|neutrophil;CXCR6|gpcr|olive|;CCR1|gpcr|orange|;CCR2|gpcr|teal|monocyte;CCR3|gpcr|pink|eosinophil;CCR4|gpcr|indigo|Treg skin;CCR6|gpcr|magenta|Th17;CCR8|gpcr|plum|tumour Treg;CCR9|gpcr|cyan|gut;CCR10|gpcr|green|skin;XCR1|gpcr|lime|cDC1;CMKLR1|gpcr|slate|chemerin;FPR1|gpcr|red|formyl peptide;LTB4R|gpcr|orange|leukotriene;EP4 (PTGER4)|gpcr|indigo|prostaglandin;
      TLR6|tlr|lime|Toll-like;TLR10|tlr|slate|Toll-like;NOD1|horseshoe|olive|NLR;NLRC4|horseshoe|coral|inflammasome;AIM2|dumbbell|teal|DNA inflammasome;IL-2Rα (CD25) dimer|igrec:2d|sky|;IL-3R|cytrec|pink|;IL-5R|cytrec|olive|;IL-7R|cytrec|green|;IL-10R|cytrec|purple|;IL-12R|cytrec|indigo|;IL-15R|cytrec|cyan|;IL-21R|cytrec|plum|;IL-23R|cytrec|magenta|;IL-33R (ST2)|igrec:3|magenta|;GM-CSFR|cytrec|green|;EPOR|cytrec|red|erythropoietin receptor;TPOR (MPL)|cytrec|coral|;Fas (soft)|igrec:3c|red|;DR5|igrec:3c|magenta|TRAIL receptor;LTβR|igrec:4c|coral|;BAFF-R|igrec:1|blue|;TACI|igrec:2c|sky|`,
    'Soft · Cytokines & chemokines': `IL-11|helix4|orange|;IL-25 (IL-17E)|dimer|pink|alarmin;IL-31|helix4|plum|itch;IL-36|trefoil|coral|;IL-37|trefoil|lavender|anti-inflammatory;IL-38|trefoil|slate|;LIF|helix4|teal|;Oncostatin M|helix4|cyan|OSM;EPO|helix4|red|erythropoietin;TPO|helix4|coral|thrombopoietin;Flt3L|helix4|navy|;SCF (KIT ligand)|helix4|cyan|;IL-34|dimer|brown|;Activin A|dimer|olive|;BMP4|dimer|green|;GDF15|dimer|orange|;Osteopontin|coil|teal|SPP1;HMGB1|dumbbell|red|alarmin DAMP;S100A8/A9|dimer|magenta|calprotectin;Galectin-9|dumbbell|purple|TIM-3 ligand;Galectin-3|ubl|plum|;CD47 ligand TSP-1|horseshoe|olive|thrombospondin;
      CXCL1|chemokine|orange|GRO-α;CXCL2|chemokine|coral|;CXCL5|chemokine|rose|;CXCL11|chemokine|plum|;CXCL16|chemokine|olive|;CCL1|chemokine|lime|;CCL4|chemokine|pink|MIP-1β;CCL11 (eotaxin)|chemokine|orange|;CCL17|chemokine|indigo|TARC;CCL20|chemokine|magenta|;CCL22|chemokine|purple|MDC;CCL25|chemokine|cyan|;CCL27|chemokine|green|;XCL1|chemokine|lime|lymphotactin;
      Complement C2|bean|olive|;Complement C4|bean|lime|;Factor B|bean|green|alternative pathway;Factor H|coil|teal|regulator;C5|bean|orange|;C5b-9 (MAC)|ring|red|membrane attack complex;MBL|trimer|cyan|mannose-binding lectin;CRP|ring|coral|C-reactive protein pentraxin;Serum amyloid A|helixglob|orange|acute phase;Interferon-stimulated gene product|ubl|indigo|ISG;Cathelicidin LL-37|peptide|orange|antimicrobial peptide;Histamine|smallmol|plum|mast cell;Leukotriene B4|smallmol|orange|lipid mediator;Prostaglandin E2|smallmol|red|PGE2;Adenosine|smallmol|teal|immunosuppressive;Kynurenine|smallmol|brown|IDO`,
    'Soft · Immune signalling': `ITK|kinase|teal|Tec kinase;PKCβ|kinase|indigo|;Calcineurin|dimer|orange|phosphatase;Calmodulin|dumbbell|teal|calcium;ORAI1|channel|green|CRAC channel;STIM1|coil|lime|ER calcium sensor;SHP1|pacman|purple|PTPN6 phosphatase;SHP2 (immune)|pacman|indigo|PTPN11;SHIP1|pacman|plum|inositol phosphatase;CSK|kinase|slate|;CBL-B|bean|olive|E3 T cell anergy;DGKζ|kinase|coral|diacylglycerol kinase;RASGRP1|bean|orange|;VAV1|dumbbell|red|GEF;WASP|coil|teal|actin;Talin|scaffold|navy|integrin activation;Kindlin|bean|blue|;
      IDO1|pacman|brown|tryptophan;Arginase 1|ring|olive|ARG1;iNOS|dimer|red|NOS2 nitric oxide;COX-2|dimer|orange|PTGS2;TGF-β latent complex|dimer|olive|LAP GARP;Granzyme K|pacman|coral|;Cathepsin G|pacman|rose|neutrophil;Neutrophil elastase|pacman|pink|ELANE;PAD4|dimer|plum|NETosis citrullination;MLKL|helixglob|red|necroptosis;RIPK1|kinase|purple|necroptosis;RIPK3|kinase|indigo|necroptosis;Caspase-11|dimer|orange|non-canonical;Gasdermin E|bean|coral|pyroptosis;NINJ1|channel|red|plasma membrane rupture;
      Activation-induced deaminase on DNA|tfdna|orange|AID class switch;XRCC4|coil|teal|NHEJ;Ku70/Ku80|dimer|blue|NHEJ;DNA-PKcs|horseshoe|navy|NHEJ;53BP1|coil|purple|class switch repair;REV7 (shieldin)|ubl|plum|;Pol θ|pacman|indigo|MMEJ;Artemis|pacman|coral|V(D)J;SLFN11|bean|teal|DNA damage;cGAMP|smallmol|teal|second messenger STING`,
    'Soft · Cancer signalling': `PIK3R1 (p85)|dumbbell|purple|PI3K regulatory;mTORC2|lumpy|plum|RICTOR;S6K1|kinase|teal|;4E-BP1|peptide|olive|translation;eIF4E|globule|coral|cap-binding;NRF2|tfdna|green|NFE2L2 oxidative stress;SMAD2/3|tfdna|olive|TGF-β;SMAD4|tfdna|lime|;DLL4|igrec:4c|teal|Notch ligand;JAG1|igrec:4c|cyan|Notch ligand;CDK7|kinase|indigo|CAK;CDK9|kinase|purple|P-TEFb;PLK1|kinase|coral|mitosis;Aurora A|kinase|orange|mitosis;Aurora B|kinase|red|;KIF11 (Eg5)|coil|teal|kinesin;α/β-Tubulin|dimer|green|microtubule;
      Menin|cshape|teal|MEN1;KMT2A (MLL)|scaffold|purple|;DOT1L|bean|plum|methyltransferase;PRMT5|dimer|indigo|arginine methyltransferase;MTAP|ring|olive|;SHP2 (PTPN11)|pacman|purple|RAS pathway phosphatase;SOS2|bean|cyan|;RAC1|globule|teal|GTPase;RHOA|globule|red|GTPase;ROCK1|kinase|orange|;FAK|kinase|navy|PTK2;SRC|kinase|blue|;ABL1|kinase|magenta|;EPHA2|rtk|teal|;AXL|rtk|purple|TAM;MERTK|rtk|indigo|;NTRK|rtk|green|TRK fusion;IGF1R|rtk|orange|;Insulin receptor|rtk|blue|INSR;
      Estrogen receptor α|tfdna|pink|ESR1 hormone;Androgen receptor|tfdna|blue|AR prostate;Progesterone receptor|tfdna|plum|;Glucocorticoid receptor|tfdna|olive|NR3C1;BCL6 (lymphoma)|tfdna|blue|;MYCN|tfdna|coral|neuroblastoma;SOX2|tfdna|teal|stemness;OCT4|tfdna|indigo|pluripotency;KLF4|tfdna|lime|;NANOG|tfdna|purple|;SOX9|tfdna|orange|;FOXA1|tfdna|cyan|pioneer;ETS fusion (TMPRSS2-ERG)|tfdna|red|prostate;PML-RARα|tfdna|magenta|APL fusion;EWS-FLI1|tfdna|orange|Ewing;
      BCL-W|helixglob|plum|;BID|helixglob|orange|BH3;NOXA|peptide|coral|BH3;PUMA|peptide|red|BH3;Smac/DIABLO|dimer|teal|IAP antagonist;cFLIP|dimer|olive|;Caspase-7|dimer|rose|executioner;PARP (cleaved)|bean|grey|apoptosis marker;Lamin A/C|coil|navy|nuclear lamina;Ki-67|coil|red|proliferation;PCNA|ring|teal|replication clamp;MCM2-7|ring|navy|helicase;RPA|dumbbell|green|ssDNA binding;RAD51|ring|blue|recombinase;FANCD2|scaffold|purple|Fanconi;POLQ|pacman|indigo|polymerase theta;
      Hexokinase 2|bean|orange|glycolysis;PKM2|tetramer|coral|pyruvate kinase;LDHA|tetramer|red|lactate;GLUT1|channel|teal|glucose transporter;MCT1|channel|olive|lactate transporter;Glutaminase|tetramer|purple|GLS;ACLY|tetramer|lime|;FASN|dimer|olive|fatty acid synthase;CPT1A|channel|orange|;SLC7A11|channel|indigo|xCT ferroptosis;GPX4|globule|teal|ferroptosis;Ferritin|ring|brown|iron;Transferrin receptor|igrec:2d|red|CD71;
      Trastuzumab|special-igg|blue|HER2 antibody;Pembrolizumab|special-igg|purple|anti-PD-1;Nivolumab|special-igg|plum|anti-PD-1;Atezolizumab|special-igg|orange|anti-PD-L1;Ipilimumab|special-igg|red|anti-CTLA-4;Rituximab|special-igg|coral|anti-CD20;Cetuximab|special-igg|teal|anti-EGFR;Bevacizumab|special-igg|indigo|anti-VEGF;Daratumumab|special-igg|olive|anti-CD38;Osimertinib|smallmol|blue|EGFR TKI;Sotorasib|smallmol|orange|KRAS G12C;Olaparib|smallmol|teal|PARP inhibitor;Palbociclib|smallmol|cyan|CDK4/6 inhibitor;Ibrutinib|smallmol|green|BTK inhibitor;Paclitaxel|smallmol|olive|taxane microtubule;Cisplatin|smallmol|slate|platinum;Doxorubicin|smallmol|red|anthracycline;5-Fluorouracil|smallmol|orange|antimetabolite;MMAE payload|smallmol|red|auristatin ADC;DXd payload|smallmol|magenta|topoisomerase ADC`,
  };
  for (const [cat, txt] of Object.entries(MORE)) NAMED[cat] = NAMED[cat] + ';' + txt;
  for (const [cat, txt] of Object.entries(NAMED)) {
    for (const line of txt.split(';')) {
      const [name, a, c, t] = line.trim().split('|');
      if (a === 'special-igg') { const seed = hash(name), cc = col(c); add(name, cat, `${t} antibody therapeutic monoclonal soft`, cc, (x) => SPECIAL.igg(rng(seed)).s.replace(new RegExp(P.blue, 'g'), x).replace(new RegExp(oc(P.blue), 'g'), oc(x)), [100, 100]); }
      else if (name && A[(a || '').split(':')[0]]) arch(name, a, c, cat, t || '');
    }
  }

  // Cells: [name, colour, body, decoration, tags].
  `T cell|blue|round|tcr|lymphocyte;CD4 helper T cell|blue|round|tcr|Th;CD8 cytotoxic T cell|teal|round|tcr|CTL killer;Regulatory T cell (Treg)|purple|round|tcr|FOXP3;Th1 cell|indigo|round|tcr|;Th2 cell|green|round|tcr|;Th17 cell|red|round|tcr|;Follicular helper T cell (Tfh)|navy|round|tcr|germinal centre;γδ T cell|cyan|round|tcr|;NKT cell|plum|round|tcr|;Memory T cell|sky|round|tcr|;Naive T cell|slate|round|tcr|;
    Exhausted T cell|grey|round|pd1|PD-1 dysfunction;CAR-T cell|green|round|car|chimeric antigen receptor;B cell|orange|round|ab|lymphocyte;Memory B cell|coral|round|ab|;Germinal centre B cell|gold|round|ab|centroblast;Plasma cell|orange|oval||antibody secreting;Plasmablast|coral|oval||;NK cell|magenta|round|granred|natural killer;Innate lymphoid cell (ILC)|lime|round||;
    Macrophage|purple|macro||phagocyte;M1 macrophage|red|macro||classically activated;M2 macrophage|teal|macro||alternatively activated;Tumour-associated macrophage (TAM)|brown|macro||TAM;Monocyte|lavender|round|lobed|;Dendritic cell|green|dc|mhc|antigen presenting DC;Plasmacytoid DC|indigo|dc||pDC interferon;Neutrophil|pink|round|lobed|granulocyte;Eosinophil|orange|round|bilobe|granulocyte;Basophil|indigo|round|gran|granulocyte;Mast cell|plum|round|gran|histamine;MDSC|olive|macro||myeloid-derived suppressor;
    Platelet|rose|small|gran|thrombocyte;Red blood cell (soft)|red|small||erythrocyte;Haematopoietic stem cell|teal|round||HSC;Tumour cell|red|tumour||cancer;Cancer stem cell|magenta|tumour||CSC;Circulating tumour cell|coral|tumour||CTC metastasis;Apoptotic cell|grey|round|blebs|apoptosis;Senescent cell|brown|tumour|senescent|SASP;
    Epithelial cell|orange|cube||;Fibroblast|olive|spindle||stroma;Cancer-associated fibroblast (CAF)|brown|spindle||stroma;Endothelial cell|red|flat||vessel;Smooth muscle cell|rose|spindle||;Adipocyte|gold|fat||fat cell;Hepatocyte|brown|cube||liver;Cardiomyocyte|red|cube|stripes|heart muscle;Neuron (soft)|gold|neuron||nerve;Astrocyte|teal|astro||glia;Microglia|purple|astro||glia;Keratinocyte|coral|cube||skin;Melanocyte|brown|dc||pigment;Osteoclast|plum|macro||bone;β cell|green|cube||pancreas insulin;Stem cell|teal|round||pluripotent;Langerhans cell|teal|dc||skin DC;Follicular dendritic cell|olive|dc||FDC;Kupffer cell|brown|macro||liver macrophage;Alveolar macrophage|coral|macro||lung;Tissue-resident memory T cell|navy|round|tcr|TRM;MAIT cell|lime|round|tcr|;Th9 cell|olive|round|tcr|;Th22 cell|coral|round|tcr|;Regulatory B cell (Breg)|plum|round|ab|;Marginal zone B cell|gold|round|ab|;Long-lived plasma cell|brown|oval||bone marrow;Megakaryocyte|rose|macro|gran|platelet precursor;Erythroblast|red|round||;Lymphoid progenitor|sky|round||CLP;Myeloblast|lavender|round||;Leukaemic blast|magenta|round||leukemia AML ALL;Myeloma cell|orange|oval||multiple myeloma;Lymphoma cell|indigo|round||;Glioma cell|teal|astro||glioblastoma;Melanoma cell|brown|dc||melanoma;Hypoxic tumour cell|indigo|tumour||hypoxia;Immunogenic dying tumour cell|grey|tumour|blebs|ICD;Tumour cell (PD-L1+)|red|tumour|pd1|checkpoint;Tumour cell (MHC-I+)|coral|tumour|mhc|antigen presentation;Dendritic cell presenting antigen|green|dc|mhc|cross-presentation;Pericyte|olive|spindle||vessel;Goblet cell|lavender|cube||mucus;Enterocyte|orange|cube||intestine;Paneth cell|red|cube|granred|defensin;Podocyte|teal|astro||kidney;Oligodendrocyte|lavender|astro||myelin;Chondrocyte|sky|round||cartilage;Osteoblast|olive|cube||bone`.split(';').forEach((line) => {
    const [n, c, k, d, t] = line.trim().split('|');
    cellIcon(n, c, k, d, t);
  });

  for (const it of ICON_LIST) {
    const icon = { id: slug(it.name), name: it.name, cat: it.cat, tags: it.tags, color: it.color, draw: it.draw, vb: it.vb, soft: true };
    ICONS.push(icon);
    ICON_MAP[icon.id] = icon;
  }
})();
