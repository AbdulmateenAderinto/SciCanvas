// Reference-style anatomy (v1.2): accurate organ drawings shared by every organ icon (base, soft and disease
// variants). Each icon keeps its id, name, category, tags and viewBox (so saved figures don't change size); only the
// drawing changes. Loaded before iconstyle.js and iconfinish.js, which add the shared outline treatment and shading.
// Orientation follows anatomical convention: anterior views show the patient's right on the viewer's left; lateral
// views of the brain show the left hemisphere (frontal lobe on the left).
(() => {
  const K = globalThis.SoftKit;
  const cr = K.cr, f = K.f;
  const set = (id, draw, color) => { const ic = ICON_MAP[id]; if (!ic) return; ic.draw = draw; if (color) ic.color = color; };
  const P = (pts, closed = true) => cr(pts, closed);
  const shape = (d, fill, line, w = 2, extra = '') => `<path d="${d}" fill="${fill}" stroke="${line}" stroke-width="${w}" stroke-linejoin="round"${extra}/>`;
  const flat = (d, fill, op) => `<path d="${d}" fill="${fill}"${op != null ? ` opacity="${op}"` : ''}/>`;
  const line = (d, c, w = 1, op) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` opacity="${op}"` : ''}/>`;
  const fit = (inner, sx, sy, tx, ty) => `<g transform="translate(${f(tx)} ${f(ty)}) scale(${sx} ${sy})">${inner}</g>`;

  // Darker or lighter tone that keeps the hue and saturation (mixing with black turns pinks grey).
  const hsl = (hex) => { const [r, g, b] = Color.hexToRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; };
  const fromHsl = (h, s, l) => { s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l)); if (!s) return Color.rgbToHex(l * 255, l * 255, l * 255); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const t = (x) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; }; return Color.rgbToHex(t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255); };
  const tone = (c, dl, ds = 0) => { const [h, s, l] = hsl(c); return fromHsl(h, s + ds, l + dl); };

  // ---------- Geometry helpers ----------
  // Dense points along the same Catmull-Rom curve SoftKit.cr draws.
  function crSample(pts, closed, per = 8) {
    const n = pts.length, p = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))], out = [];
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = p(i - 1), p1 = p(i), p2 = p(i + 1), p3 = p(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (let k = 0; k < per; k++) {
        const t = k / per, u = 1 - t;
        out.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function resample(pts, step) {
    const out = [pts[0]];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], len = Math.hypot(x1 - x0, y1 - y0);
      let d = step - carry;
      while (d <= len) { out.push([x0 + ((x1 - x0) * d) / len, y0 + ((y1 - y0) * d) / len]); d += step; }
      carry = len - (d - step);
    }
    return out;
  }
  const normals = (q) => q.map((_, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], h = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / h, (b[0] - a[0]) / h]; });
  const inPoly = (x, y, pts) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  const distSeg = (x, y, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(x - ax - t * dx, y - ay - t * dy); };
  const edgeDist = (x, y, poly) => { let m = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) m = Math.min(m, distSeg(x, y, poly[j], poly[i])); return m; };
  // A wandering line: the smooth curve through pts with a seeded side-to-side meander (amp, wavelength).
  function meander(pts, amp, wave, r) {
    const q = resample(crSample(pts, false), 0.6), nm = normals(q), ph = r() * 6.28, ph2 = r() * 6.28, w2 = wave * (2.6 + r());
    return q.map(([x, y], i) => { const sd = i * 0.6, a = amp * Math.sin((sd / wave) * 6.283 + ph) * (0.55 + 0.45 * Math.sin((sd / w2) * 6.283 + ph2)); return [x + nm[i][0] * a, y + nm[i][1] * a]; });
  }
  // Keep the parts of a line that stay inside poly (at least `margin` from its edge), as smooth path pieces.
  function clipRuns(q, poly, margin, minLen = 2) {
    const runs = [];
    let cur = [];
    for (const p of q) {
      if (inPoly(p[0], p[1], poly) && edgeDist(p[0], p[1], poly) >= margin) cur.push(p);
      else { if (cur.length * 0.6 >= minLen) runs.push(cur); cur = []; }
    }
    if (cur.length * 0.6 >= minLen) runs.push(cur);
    return runs;
  }
  const thin = (q, k = 3) => q.filter((_, i) => i % k === 0 || i === q.length - 1);
  const smoothD = (q) => cr(thin(q), false);

  // ---------- Brain, lateral view (left hemisphere), drawn in a 100 x 80 box ----------
  const BRAIN = {
    cerebrum: [[5, 37], [7, 26], [13, 15], [23, 7.5], [35, 3.6], [48, 2.6], [60, 3.6], [71, 7], [81, 12.5], [88.5, 20], [93, 29], [95, 38], [94, 45], [90, 49.5],
      [82, 53], [74, 56.5], [66, 59.4], [57, 61], [47, 61.4], [38.5, 60.2], [32, 57.6], [28.3, 53.6], [28, 49.6], [30, 47.4], [25, 46.6], [17, 44.8], [10.5, 42.2]],
    cerebellum: [[62, 57], [68, 51.5], [77, 49], [86, 49.5], [92.5, 53.5], [94, 60], [91, 67], [84, 72.5], [75, 74.5], [67.5, 72.5], [62.5, 67.5]],
    stem: [[51.5, 57], [50.3, 61.5], [50.4, 66.5], [52.6, 70.2], [55.3, 73.4], [56.4, 79.4], [62.4, 79.4], [62.8, 72.5], [63.4, 64], [62.5, 57]],
    // Sulci: [points, weight]
    sulci: [
      [[[29.6, 47.5], [35, 46], [41, 44.6], [47, 43], [53, 41.4], [58, 39.8], [62, 38.2], [64.3, 35.6], [65, 32]], 1.5], // lateral (Sylvian) fissure
      [[[34.5, 45.9], [32.5, 42.4], [31.2, 39.6]], 0.9], [[[38.4, 45.1], [37.6, 41.4], [38.6, 38.2]], 0.9], // anterior rami (pars triangularis)
      [[[54.6, 4], [53.4, 9], [55, 13.5], [52.4, 18.5], [53.2, 23], [49.8, 27.6], [49.6, 32], [46.6, 36.6], [46.2, 39.6]], 1.2], // central sulcus
      [[[45.4, 4.6], [44.2, 9], [45, 13], [43.2, 17.2]], 1], [[[42.4, 21.5], [41, 26], [41.6, 30], [39, 34.5], [39.4, 39]], 1], // precentral sulcus
      [[[63.6, 6.2], [62.4, 11], [63.4, 15.5], [60.8, 20.5], [61, 25.5], [57.8, 30], [57.2, 35.6]], 1], // postcentral sulcus
      [[[43.8, 12.8], [38, 12.4], [32, 13.6], [26.4, 12.2], [20.5, 14.4], [15.5, 16.4]], 1], // superior frontal sulcus
      [[[41.4, 25.4], [36, 26.6], [30.4, 25.4], [24.6, 27.4], [18.6, 27.6], [12.8, 30.4]], 1], // inferior frontal sulcus
      [[[61.6, 21.6], [67, 20], [72.4, 22.8], [78, 21.8], [83.4, 25.4], [88, 29.6]], 1], // intraparietal sulcus
      [[[35.2, 52.6], [41, 51.2], [47, 50.8], [53, 49.4], [59, 48.4], [65, 46], [70, 42.4], [72.2, 37.4], [71.2, 33]], 1], // superior temporal sulcus
      [[[37.6, 57.4], [43, 56.6], [49, 57], [55, 55.8], [61, 55.4], [67, 53.2], [72, 51.4]], 0.9], // inferior temporal sulcus
      [[[80.2, 33], [84.4, 37.6], [89.6, 38.2], [93.2, 35.4]], 0.9], [[[78.6, 44.6], [83.4, 43.2], [88.4, 45.4]], 0.8], // lateral occipital sulci
      [[[12.2, 37.4], [17, 39.6], [22.6, 40.4], [27.2, 42.4]], 0.8], // orbital sulcus
    ],
    // Short tertiary sulci that break the gyri up the way real cortex looks.
    minor: [
      [[22, 8.8], [24.6, 11.2], [23.2, 14]], [[30.6, 5.4], [31.6, 9.2]], [[36.6, 16.6], [35.2, 20.2], [37, 23.2]], [[27, 18.4], [25.6, 22]], [[18.6, 20], [16, 23.6]],
      [[21.6, 31.4], [24.4, 35], [23.2, 38]], [[32.6, 29.6], [33, 34.4]], [[10, 25], [13.2, 26.6]], [[48.2, 9.6], [49.6, 14.4], [48, 19]],
      [[58.6, 8], [59.4, 13], [58, 16.6]], [[67, 9.2], [69.6, 13.4], [68, 16.4]], [[74.4, 12.6], [76.4, 16.6]], [[67.4, 27.4], [70.2, 30.4], [74.8, 29.6], [78, 33]],
      [[63, 31.4], [61.4, 35.6]], [[85.6, 17.6], [83.2, 20]], [[79.2, 27.6], [76.6, 30.6]], [[52, 45], [55.4, 46.2]], [[44, 47.6], [47.4, 48.2]],
      [[60.2, 51.8], [64, 51]], [[51.6, 53.4], [55.6, 52.6]], [[43.4, 59.6], [46.6, 59.6]], [[76.6, 38.4], [79.4, 41]], [[86.4, 41.6], [91, 42]],
    ],
  };
  // Cerebellar folia: fine curved lines parallel to the cerebellum's lower edge, stacked up through the hemisphere.
  let foliaD = null;
  function folia() {
    if (foliaD) return foliaD;
    const edge = crSample(BRAIN.cerebellum, true, 12), lower = edge.filter(([x, y]) => y > 58 && x > 63.6).sort((a, b) => a[0] - b[0]), arcs = [];
    for (let k = 1; k <= 7; k++) {
      const dy = k * 2.7, q = lower.map(([x, y]) => [x, y - dy - Math.sin(((x - 63) / 31) * Math.PI) * k * 0.35]);
      for (const run of clipRuns(resample(q, 0.6), edge, 0.9, 3)) arcs.push(smoothD(run));
    }
    foliaD = arcs.join(' ');
    return foliaD;
  }
  // The folding pattern (geometry only, so it is worked out once and reused for every colour). Gyri are drawn the
  // way illustrators draw cortex: rounded ridges (tubes) running the way each gyrus runs, with the named sulci on top.
  let brainGeo = null;
  const GW = 4.9; // gyrus width
  const REGIONS = [
    // frontal lobe in front of the precentral sulcus: superior, middle and inferior frontal gyri run front-to-back
    { poly: [[5, 37], [7, 26], [13, 15], [23, 7.5], [35, 3.6], [44.8, 3.2], [44.2, 9], [44.6, 13], [42.6, 19], [41.2, 26], [41.4, 30], [39, 34.5], [38.6, 41], [35, 46], [29.6, 47.5], [25, 46.6], [17, 44.8], [10.5, 42.2]], ang: -4, gap: 4.9 },
    // precentral gyrus
    { poly: [[44.8, 3.2], [54.6, 3.2], [53.4, 9], [55, 13.5], [52.4, 18.5], [53.2, 23], [49.8, 27.6], [49.6, 32], [46.6, 36.6], [46.2, 41.8], [38.6, 43.4], [39, 34.5], [41.4, 30], [41.2, 26], [42.6, 19], [44.6, 13], [44.2, 9]], ang: 98, gap: 5.6, single: [[49.6, 5], [48.6, 12], [48.6, 18], [46.4, 25], [45.4, 31], [42.8, 37], [42, 41]] },
    // postcentral gyrus
    { poly: [[54.6, 3.2], [63.6, 5.2], [62.4, 11], [63.4, 15.5], [60.8, 20.5], [61, 25.5], [57.8, 30], [57.2, 37], [53, 40.8], [47, 42.4], [46.6, 36.6], [49.6, 32], [49.8, 27.6], [53.2, 23], [52.4, 18.5], [55, 13.5], [53.4, 9]], ang: 98, gap: 5.6, single: [[59, 5.4], [57.8, 11.5], [58, 16.6], [56.4, 22.6], [55, 28.8], [52.6, 34.6], [50.6, 39.6]] },
    // parietal lobules (supramarginal and angular gyri curve round the ends of the Sylvian fissure and the STS)
    { poly: [[63.6, 5.2], [71, 7], [81, 12.5], [87, 18.6], [84, 27], [79.6, 34], [74.4, 37], [71.2, 33], [65, 32], [64.3, 35.6], [62, 38.2], [57.6, 39.4], [57.8, 30], [61, 25.5], [60.8, 20.5], [63.4, 15.5], [62.4, 11]], ang: 30, gap: 4.9 },
    // occipital lobe
    { poly: [[87, 18.6], [88.5, 20], [93, 29], [95, 38], [94, 45], [90, 49.5], [82, 53], [77.4, 53.6], [78.6, 44], [79.6, 34], [84, 27]], ang: -40, gap: 4.9 },
    // temporal lobe: superior, middle and inferior temporal gyri run along the Sylvian fissure
    { poly: [[29.6, 47.5], [35, 46], [41, 44.6], [47, 43], [53, 41.4], [58, 39.8], [62, 38.2], [64.3, 35.6], [65, 32], [71.2, 33], [74.4, 37], [78.6, 44], [77.4, 53.6], [74, 56.5], [66, 59.4], [57, 61], [47, 61.4], [38.5, 60.2], [32, 57.6], [28.3, 53.6], [28, 49.6]], ang: -13, gap: 4.9 },
  ];
  const brainFolds = () => brainGeo || (brainGeo = foldGeo(BRAIN.cerebrum, REGIONS, BRAIN.sulci, 1931));
  function foldGeo(outlinePts, regions, sulci, seed) {
    const r = K.rng(seed), outline = crSample(outlinePts, true, 10), gyri = [], mids = [], crowns = [], main = [];
    const keep = (q, poly) => clipRuns(q, outline, GW / 2 - 0.4, 1).flatMap((run) => clipRuns(run, poly, GW * 0.34, 3));
    for (const reg of regions) {
      const lines = [];
      if (reg.single) lines.push(meander(reg.single, 1.1, 9, r));
      else {
        const a = (reg.ang * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
        const xs = reg.poly.map(([x, y]) => x * ux + y * uy), ys = reg.poly.map(([x, y]) => x * vx + y * vy);
        for (let o = Math.min(...ys) + reg.gap * 0.55; o < Math.max(...ys) - reg.gap * 0.2; o += reg.gap * (0.92 + r() * 0.16)) {
          const pts = [];
          for (let t = Math.min(...xs) - 3; t <= Math.max(...xs) + 3; t += 3) pts.push([t * ux + o * vx, t * uy + o * vy]);
          lines.push(meander(pts, 1.25, 9 + r() * 5, r));
        }
      }
      for (const q of lines) for (const run of keep(q, reg.poly)) {
        // Break long gyri into a few pieces so their rounded ends show, as on a real brain.
        let i = 0;
        while (i < run.length) {
          const len = Math.round((16 + r() * 22) / 0.6), piece = run.slice(i, i + len);
          if (piece.length * 0.6 > 3.5) {
            gyri.push(smoothD(piece)); mids.push(piece[Math.floor(piece.length / 2)]);
            const m = piece.slice(Math.floor(piece.length * 0.2), Math.ceil(piece.length * 0.72));
            if (m.length > 4) crowns.push(smoothD(m.map(([x, y]) => [x - 0.75, y - 0.95])));
          }
          i += len + Math.round((GW * 0.35 + r() * 1.2) / 0.6);
        }
      }
    }
    sulci.forEach(([pts, w], i) => { const q = meander(pts, i === 0 ? 0.3 : 0.6, 10, r); for (const run of clipRuns(q, outline, 0.9, 1)) main.push([smoothD(run), w]); });
    return { gyri, mid: mids, crowns, main };
  }
  // o: { lobes: true } colours the lobes; { atrophy: true } shrinks the gyri so the sulci gape.
  // The cerebrum is filled in the deeper sulcal tone and the gyri are laid over it as rounded ridges in the main colour,
  // so the sulci read as the shaded grooves between them.
  function brainLateral(c, o = {}) {
    const lineC = tone(c, -0.3, -0.12), deep = tone(c, o.atrophy ? -0.17 : -0.13, 0.04), sulcC = tone(c, -0.26, -0.06), g = brainFolds(), gw = o.atrophy ? GW * 0.66 : GW - 0.25;
    let s = shape(P(BRAIN.stem), Color.mix(c, '#f3dccb', 0.35), lineC);
    s += shape(P(BRAIN.cerebellum), tone(c, -0.04, 0.02), lineC);
    s += line(folia(), tone(c, -0.24, 0.04), 0.75);
    s += line(`M50.8 69.4 Q56.6 71.6 62.8 69.6`, tone(c, -0.2), 0.7) + line(`M53.6 62.4 Q57 63.8 61.8 62.6 M53.2 65.6 Q57 67 61.8 65.8`, tone(c, -0.14), 0.55); // pons / medulla
    s += shape(P(BRAIN.cerebrum), deep, lineC, 2, ' data-flat=""');
    if (o.lobes) s += LOBES.map(([poly, col]) => flat(`M${poly.map(([x, y]) => `${x} ${y}`).join(' L')} Z`, tone(col, -0.14, 0.02))).join('');
    const fills = o.lobes ? LOBES : [[null, c]];
    for (const [poly, col] of fills) {
      const ds = o.lobes ? g.gyri.filter((d, k) => inPoly(g.mid[k][0], g.mid[k][1], poly)) : g.gyri;
      s += `<path d="${ds.join(' ')}" fill="none" stroke="${col}" stroke-width="${f(gw)}" stroke-linecap="round" stroke-linejoin="round" data-flat=""/>`;
    }
    if (!o.lobes) s += line(g.crowns.join(' '), L(c, 0.42), 0.9, 0.75);
    for (const [d, w] of g.main) s += line(d, sulcC, w * 0.9);
    s += `<path d="${P(BRAIN.cerebrum)}" fill="none" stroke="${lineC}" stroke-width="1.3" stroke-linejoin="round"/>`;
    return s;
  }
  // Lobes (for "Brain (lobes)"): frontal blue, parietal yellow, temporal green, occipital pink.
  const LOBES = [
    [[[5, 37], [7, 26], [13, 15], [23, 7.5], [35, 3.6], [48, 2.6], [54.6, 3.2], [53.4, 9], [55, 13.5], [52.4, 18.5], [53.2, 23], [49.8, 27.6], [49.6, 32], [46.6, 36.6], [46.2, 39.6], [47, 43], [41, 44.6], [35, 46], [29.6, 47.5], [25, 46.6], [17, 44.8], [10.5, 42.2]], '#9dbbe6'],
    [[[54.6, 3.2], [60, 3.6], [71, 7], [81, 12.5], [86, 17], [83, 28], [78.5, 37], [71.2, 33], [65, 32], [64.3, 35.6], [62, 38.2], [58, 39.8], [53, 41.4], [47, 43], [46.2, 39.6], [46.6, 36.6], [49.6, 32], [49.8, 27.6], [53.2, 23], [52.4, 18.5], [55, 13.5], [53.4, 9]], '#f0d47e'],
    [[[29.6, 47.5], [35, 46], [41, 44.6], [47, 43], [53, 41.4], [58, 39.8], [62, 38.2], [64.3, 35.6], [65, 32], [71.2, 33], [78.5, 37], [79.6, 44], [78, 54.6], [74, 56.5], [66, 59.4], [57, 61], [47, 61.4], [38.5, 60.2], [32, 57.6], [28.3, 53.6], [28, 49.6]], '#a6d6a0'],
    [[[86, 17], [88.5, 20], [93, 29], [95, 38], [94, 45], [90, 49.5], [82, 53], [78, 54.6], [79.6, 44], [78.5, 37], [83, 28]], '#efacbd'],
  ];

  // ---------- Brain, midsagittal section (anterior on the left), drawn in a 100 x 80 box ----------
  const SAG = {
    cerebrum: [[5, 37], [7, 26], [13, 15], [23, 7.5], [35, 3.6], [48, 2.6], [60, 3.6], [71, 7], [81, 12.5], [88.5, 20], [93, 29], [95, 38], [94, 45], [90, 49.5], [83, 51.2], [76, 50.6], [70, 51.6],
      [63, 54], [56, 55.4], [50, 55.4], [44, 54.6], [39.4, 52.4], [34.6, 49.4], [26, 47.2], [17, 45.2], [10.4, 42.2]],
    stem: [[49.6, 53], [47.6, 58], [47.2, 63.4], [48.8, 68.4], [51.4, 72.4], [52.6, 78], [52.8, 80], [59.6, 80], [59.8, 75.6], [60.4, 70], [61, 64], [60, 58], [58, 53]],
    cerebellum: [[61, 58.6], [66, 53], [75, 51], [85, 52], [91, 56.6], [92, 63.6], [87, 70.4], [78, 74.2], [69, 74], [63.4, 70.4], [61, 65]],
    callosum: [[33.4, 41.4], [35.6, 33.6], [41.4, 28.6], [50, 26.2], [60, 26.4], [68.6, 28.6], [74.4, 32.4], [76.6, 36.6], [74.6, 39.4], [70.6, 38.6], [66, 34.4], [58, 31.8], [50, 31.6], [43, 33.6], [39.4, 37.6], [38.8, 41.8], [40, 44.4], [37.6, 45.4], [34.8, 44.4]],
    sulci: [
      [[[29.4, 43.6], [29.4, 34], [33, 25], [41, 19.4], [51, 17.6], [61, 18.4], [70, 21.2], [76, 25.4], [79, 20], [80, 13], [79.6, 8.4]], 1.2], // cingulate sulcus with marginal ramus
      [[[83.8, 15.6], [86.2, 24], [86.4, 32], [83, 40], [78.6, 46.4]], 1.2], // parieto-occipital sulcus
      [[[78.6, 46.4], [84, 45], [89, 42.6], [94, 41.4]], 1.2], // calcarine sulcus
      [[[54.2, 3], [53.6, 8], [54.6, 12.4]], 1], // central sulcus reaching the medial surface (paracentral lobule)
      [[[45, 3.6], [44.4, 9], [46, 13.6]], 0.9], [[[64.6, 5.4], [65.2, 10.6], [63.6, 14.4]], 0.9],
      [[[10, 30], [16, 32.4], [22, 32], [26.4, 35]], 0.9], [[[14, 18], [20, 22], [27, 22.4]], 0.9], [[[12.4, 40], [18, 41.4], [24, 42.2]], 0.8],
      [[[70.6, 13.4], [73.6, 17.6]], 0.8], [[[86.4, 36.4], [90.4, 33]], 0.8], [[[82.6, 48.6], [88, 48]], 0.8],
    ],
  };
  function arborVitae() {
    const trunk = 'M62.6 63 C67 62.4 71.6 62.6 75.6 62.8';
    const br = [[66, 62.6, 64, 55.4], [68.6, 62.6, 70.6, 54], [71.4, 62.8, 77.6, 55.4], [73.6, 62.8, 84, 58.6], [75.6, 62.8, 87.4, 64.2], [74, 63, 83.6, 69.4], [71, 63, 76.6, 71.6], [68, 63, 69.4, 71.4]];
    return trunk + ' ' + br.map(([x0, y0, x1, y1]) => `M${x0} ${y0} Q${f((x0 + x1) / 2 + (y1 - y0) * 0.12)} ${f((y0 + y1) / 2 - (x1 - x0) * 0.12)} ${x1} ${y1}`).join(' ');
  }
  const SAG_REGIONS = [
    { poly: [[6, 36], [9, 24], [15, 14], [25, 7], [36, 4], [50, 3.4], [50, 18], [41, 19.4], [33, 25], [29.4, 34], [29.4, 43.6], [24, 46.6], [16, 44.8], [9, 41.4]], ang: -8, gap: 4.9 }, // medial frontal gyrus
    { poly: [[50, 3.4], [60, 3.6], [71, 7], [79.4, 9], [80, 13], [79, 20], [76, 25.4], [70, 21.2], [61, 18.4], [50, 18]], ang: 100, gap: 5.2 }, // paracentral lobule
    { poly: [[79.4, 9], [83.8, 15.6], [86.2, 24], [86.4, 32], [83, 40], [78.6, 46.4], [74.6, 41.6], [76.6, 33], [76, 25.4], [79, 20], [80, 13]], ang: 75, gap: 4.8 }, // precuneus
    { poly: [[83.8, 15.6], [88.5, 20], [93, 29], [95, 38], [94, 41.4], [89, 42.6], [84, 45], [78.6, 46.4], [83, 40], [86.4, 32], [86.2, 24]], ang: -35, gap: 4.6 }, // cuneus
    { poly: [[33.4, 41.4], [35.6, 33.6], [41.4, 28.6], [50, 26.2], [60, 26.4], [68.6, 28.6], [74.4, 32.4], [76.6, 36.6], [78.6, 46.4], [76, 25.4], [70, 21.2], [61, 18.4], [51, 17.6], [41, 19.4], [33, 25], [29.4, 34], [29.4, 43.6]], ang: 0, gap: 6, single: [[31.6, 44], [32, 35.6], [36.4, 27.6], [43.6, 23], [52, 21.8], [61, 22.4], [69, 24.8], [74.6, 28.6], [77, 34]] }, // cingulate gyrus
  ];
  let sagGeo = null;
  function brainSagittal(c) {
    const lineC = tone(c, -0.3, -0.12), sulcC = tone(c, -0.26, -0.06), wm = '#f6e6d8', wmL = tone(wm, -0.28, -0.1);
    let s = shape(P(SAG.cerebellum), tone(c, -0.04, 0.02), lineC);
    s += line(arborVitae(), tone(wm, -0.06), 2.2) + line(arborVitae(), wm, 1.3); // white matter of the cerebellum
    s += shape(P(SAG.stem), Color.mix(c, '#f3dccb', 0.4), lineC);
    s += flat('M60.6 61.6 L64.6 59.6 L61.2 66.6 Z', tone(c, -0.35)); // fourth ventricle
    s += line('M50.4 60.6 Q54 61.8 58.6 60.6 M50.2 64 Q54 65.4 59.2 64', tone(c, -0.14), 0.6); // pons
    sagGeo = sagGeo || foldGeo(SAG.cerebrum, SAG_REGIONS, SAG.sulci, 4242);
    s += shape(P(SAG.cerebrum), tone(c, -0.13, 0.04), lineC, 2, ' data-flat=""');
    s += `<path d="${sagGeo.gyri.join(' ')}" fill="none" stroke="${c}" stroke-width="${f(GW - 0.25)}" stroke-linecap="round" stroke-linejoin="round" data-flat=""/>`;
    s += line(sagGeo.crowns.join(' '), L(c, 0.42), 0.9, 0.75);
    for (const [d, w] of sagGeo.main) s += line(d, sulcC, w * 0.95);
    s += `<path d="${P(SAG.cerebrum)}" fill="none" stroke="${lineC}" stroke-width="1.3" stroke-linejoin="round"/>`;
    // Diencephalon and the midline structures.
    s += flat('M41.4 45.2 C44 38 52 35.4 60 36.2 C66 37 70.6 39.4 72.4 42 C68 45.4 62 48 56 50.8 C50 52.6 44 51 41.4 45.2 Z', tone(c, -0.06)); // septum region and thalamus field
    s += shape('M49 44.4 C50 40 56 38.4 61.6 39.4 C66.2 40.4 67.8 43.6 66 46.4 C63.6 49.6 56.6 51 52.4 49.6 C49.6 48.6 48.4 46.6 49 44.4 Z', tone(c, -0.1, 0.02), tone(c, -0.26), 1.2); // thalamus
    s += shape(P(SAG.callosum), wm, wmL, 1.4); // corpus callosum: rostrum, genu, body, splenium
    s += line('M72.6 38.6 C68 37.6 60 37 52.4 38 C47.6 38.8 45.6 41.6 45.2 45.6 C45 48.4 46 51 47.4 53', tone(wm, -0.18), 2.4) + line('M72.6 38.6 C68 37.6 60 37 52.4 38 C47.6 38.8 45.6 41.6 45.2 45.6 C45 48.4 46 51 47.4 53', wm, 1.4); // fornix
    s += `<circle cx="47.6" cy="53.4" r="1.6" fill="${tone(c, -0.08)}" stroke="${tone(c, -0.3)}" stroke-width="0.8"/>`; // mammillary body
    s += shape('M39.4 51.2 C40.6 50 42.6 50.2 43.2 51.6 C42.6 53 40.6 53.2 39.4 51.2 Z', '#f0dcc0', tone('#f0dcc0', -0.3), 0.8); // optic chiasm
    s += line('M43.6 54.4 L42.6 58.4', tone(c, -0.2), 1.6) + shape('M39 59 C39.4 56.6 44 56.4 45.4 58.6 C46 61 43.6 62.6 41.4 62.2 C39.6 61.8 38.8 60.6 39 59 Z', '#e9a4b8', tone('#e9a4b8', -0.3), 1); // pituitary
    s += shape('M70.6 44 C71.6 42.6 73.8 42.8 74.4 44.4 C74 46 71.6 46.2 70.6 44 Z', '#e7c08a', tone('#e7c08a', -0.3), 0.8); // pineal gland
    return s;
  }

  // ---------- Brain, superior view (anterior at the top), 80 x 100 box ----------
  // Left hemisphere drawn, right hemisphere mirrored across the longitudinal fissure.
  const SUP = {
    hemi: [[39, 5.6], [28, 6.2], [17, 12], [9.4, 24], [5.6, 40], [5.8, 58], [9.4, 74], [16.6, 87], [27, 94.4], [38.6, 95.2], [39.2, 80], [39.4, 50], [39.2, 20]],
    sulci: [
      [[[38.4, 53.6], [32, 51.6], [26, 52.4], [20, 49], [14, 49.4], [8.4, 46]], 1.2], // central sulcus
      [[[38, 45], [33, 43.6], [28, 44], [23, 41.4], [17.4, 41.6], [10, 38.6]], 1], // precentral sulcus
      [[[38, 61.4], [33, 60], [27, 60.6], [21, 57.6], [15, 58.6], [8.6, 56.6]], 1], // postcentral sulcus
      [[[28.6, 41.6], [27.4, 32], [28.6, 22], [26.4, 13.4]], 1], // superior frontal sulcus
      [[[17.6, 40], [16.4, 30], [18.6, 21], [17, 15.6]], 0.9], // inferior frontal sulcus
      [[[26, 60.6], [24.4, 68], [26.4, 76], [24.4, 84.4]], 1], // intraparietal sulcus
      [[[39, 84], [33.6, 85.4], [30.4, 89.4]], 1], // parieto-occipital sulcus
    ],
  };
  const SUP_REGIONS = [
    { poly: [[39, 5.6], [28, 6.2], [17, 12], [9.4, 24], [7, 36], [10, 38.6], [17.4, 41.6], [23, 41.4], [28, 44], [33, 43.6], [38, 45]], ang: 92, gap: 4.9 },
    { poly: [[38, 45], [33, 43.6], [28, 44], [23, 41.4], [17.4, 41.6], [10, 38.6], [7, 40], [6.4, 47], [8.4, 46], [14, 49.4], [20, 49], [26, 52.4], [32, 51.6], [38.4, 53.6]], ang: -12, gap: 5.6, single: [[37.6, 49.4], [31, 47.6], [24, 46.8], [17, 45.2], [9.2, 42.4]] },
    { poly: [[38.4, 53.6], [32, 51.6], [26, 52.4], [20, 49], [14, 49.4], [8.4, 46], [6.2, 52], [8.6, 56.6], [15, 58.6], [21, 57.6], [27, 60.6], [33, 60], [38, 61.4]], ang: -12, gap: 5.6, single: [[37.6, 57.4], [31.6, 55.8], [24, 55.4], [17, 53.6], [9, 51]] },
    { poly: [[38, 61.4], [33, 60], [27, 60.6], [21, 57.6], [15, 58.6], [8.6, 56.6], [6.6, 66], [9.4, 74], [16.6, 87], [27, 94.4], [38.6, 95.2], [39, 84], [39.2, 70]], ang: 70, gap: 4.9 },
  ];
  let supGeo = null;
  function brainSuperior(c) {
    supGeo = supGeo || foldGeo(SUP.hemi, SUP_REGIONS, SUP.sulci, 5150);
    const lineC = tone(c, -0.3, -0.12), sulcC = tone(c, -0.26, -0.06);
    const hemi = shape(P(SUP.hemi), tone(c, -0.13, 0.04), lineC, 2, ' data-flat=""')
      + `<path d="${supGeo.gyri.join(' ')}" fill="none" stroke="${c}" stroke-width="${f(GW - 0.25)}" stroke-linecap="round" stroke-linejoin="round" data-flat=""/>`
      + line(supGeo.crowns.join(' '), L(c, 0.42), 0.9, 0.75) + supGeo.main.map(([d, w]) => line(d, sulcC, w * 0.95)).join('')
      + `<path d="${P(SUP.hemi)}" fill="none" stroke="${lineC}" stroke-width="1.3" stroke-linejoin="round"/>`;
    return hemi + `<g transform="translate(80 0) scale(-1 1)">${hemi}</g>`;
  }

  // ---------- Brain, coronal section through the thalamus, 100 x 90 box (left half drawn, right half mirrored) ----------
  const COR = {
    hemi: [[49.4, 7.2], [37, 4.4], [23, 8], [12, 17.6], [5.6, 31], [5, 45], [8, 53.4], [14, 55.2], [18.6, 55.6], [14.4, 57.6], [8, 63.6], [7.4, 73], [13, 81], [23.6, 85.4], [33, 83], [39.4, 76.6], [42.6, 69.6], [46, 64], [49.4, 62]],
    white: [[49.4, 14.6], [38, 11.6], [26, 15], [16.6, 23.4], [11.6, 34], [11.2, 45], [15, 50.6], [21.4, 51], [24.4, 57.4], [18.6, 61.4], [14, 67], [14.6, 75.4], [21.6, 80], [29, 79], [34, 73.6], [37.4, 66], [42, 59], [47, 55], [49.4, 54]],
  };
  function brainCoronal(c, o = {}) {
    const lineC = tone(c, -0.3, -0.12), wm = o.regions ? '#eef1f6' : '#f7e9dd', wmL = tone(wm, -0.2, -0.05), grey = o.regions ? '#e8a9b6' : c, deep = tone(grey, -0.06);
    const basal = o.regions ? '#8fb3e3' : deep, thal = o.regions ? '#f2cf63' : deep, hip = o.regions ? '#9ccf8f' : deep;
    let half = shape(P(COR.hemi), grey, lineC);
    // Gyral white-matter cores reaching into each gyrus.
    const wpts = crSample(COR.white, false, 8);
    half += flat(P(COR.white), wm);
    const fingers = [[30, 8.6], [19, 14.6], [10.4, 25], [7.6, 37.6], [8.6, 48.6], [10.6, 68], [15.4, 79], [26, 82.6]];
    for (const [x, y] of fingers) { const [cx, cy] = [30, 44], dx = cx - x, dy = cy - y, h = Math.hypot(dx, dy), ux = dx / h, uy = dy / h; half += `<path d="M${f(x + ux * 2.6 - uy * 1.6)} ${f(y + uy * 2.6 + ux * 1.6)} L${f(x + ux * 7)} ${f(y + uy * 7)} L${f(x + ux * 2.6 + uy * 1.6)} ${f(y + uy * 2.6 - ux * 1.6)} Z" fill="${wm}"/>`; }
    const sulc = [[24.8, 7.6, 26, 12.4], [15, 15.2, 18.4, 19.4], [8.8, 25, 13, 27.8], [6.4, 40, 11.4, 40.2], [9, 61.2, 13.4, 61.6], [10.8, 75.8, 15.6, 73.4], [20.6, 83.4, 21.2, 78.6]];
    half += line(sulc.map(([a1, b1, a2, b2]) => `M${a1} ${b1} L${a2} ${b2}`).join(' '), tone(grey, -0.24), 1);
    half += line('M14.4 55.4 C18 54.6 21 53.4 23 52', tone(grey, -0.3), 1.2); // lateral (Sylvian) fissure into the insula
    half += line('M24 46 C23.4 50 23.4 54 24.6 57', tone(grey, -0.12), 2.4); // insular cortex
    half += line('M26.6 45 C26 50 26 54 27 57.6', tone(grey, -0.1), 0.7); // claustrum
    half += shape('M27.6 46 C29.6 41 34 39.6 35.6 42 C37 46 37 52 35 57 C33 59.6 29.6 59 28.4 56 C27.6 53 27.2 49 27.6 46 Z', basal, tone(basal, -0.25), 1); // lentiform nucleus (putamen)
    half += shape('M32.6 47 C34 45.4 35.6 46 36 48 C36.2 51 35.6 54 34 55.4 C33 53 32.4 50 32.6 47 Z', tone(basal, 0.18), tone(basal, -0.25), 0.7); // globus pallidus
    half += shape('M38.2 36.6 C40.6 35 42.4 36.6 42.2 39.4 C42 42.6 40.6 44.4 38.8 44 C37.4 42 37.2 38.6 38.2 36.6 Z', basal, tone(basal, -0.25), 0.9); // caudate nucleus
    half += shape('M41 34.6 C44 33.4 47.4 33.4 48.6 35.6 L48.6 41 C46.6 40 44 41.4 42.6 43.6 C42.8 40 42.4 37 41 34.6 Z', tone(c, -0.42, -0.1), tone(c, -0.5), 0.6); // lateral ventricle
    half += shape('M40.6 48.4 C42.6 45.4 46.6 45 48.8 46.6 L48.8 57.6 C46.4 59 42.6 58.4 41.2 55.6 C40.2 53.4 40 50.6 40.6 48.4 Z', thal, tone(thal, -0.25), 1); // thalamus
    half += shape('M33 72.6 C34.4 68.4 39 67.6 40.4 70.4 C41.4 72.6 39.6 75.6 37 75.4 C35.4 75.2 35 73.6 36 72.6', 'none', tone(hip, -0.25), 1.4, ' data-flat=""') + shape('M32.6 73.4 C33 69 37 66.6 40.6 68.6 C42.6 70.6 41.4 75 38 76.2 C35 77 32.6 76 32.6 73.4 Z', hip, tone(hip, -0.25), 1); // hippocampus
    half += line('M33.2 66.8 C36 65.6 39 65.6 41.4 67', tone(c, -0.42), 1); // temporal horn
    let s = `${half}<g transform="translate(100 0) scale(-1 1)">${half}</g>`;
    s += shape('M33.6 33.6 C40 29.6 46 28.6 50 28.6 C54 28.6 60 29.6 66.4 33.6 L64.6 36.4 C59 33.6 54 33 50 33 C46 33 41 33.6 35.4 36.4 Z', wm, wmL, 1, ' data-flat=""'); // corpus callosum
    s += line('M50 6.8 V28.6', lineC, 1.4) + line('M50 33.2 V41.4', wmL, 1) + line('M50 46.4 V57.6', tone(c, -0.42), 1.6); // longitudinal fissure, septum, third ventricle
    s += shape('M44.4 62 C46 60 54 60 55.6 62 L55 76 C54.4 82 52.6 88 50 89 C47.4 88 45.6 82 45 76 Z', Color.mix(c, '#f3dccb', 0.35), lineC, 1.6); // midbrain and pons
    return s;
  }
  // Head in profile (facing left) with the brain inside, 110 x 110.
  function headWithBrain(c) {
    const skin = '#f1d6c6', skinL = tone(skin, -0.28, -0.1);
    let s = shape('M56 4 C74 3.6 90 11 97.6 26 C103 37 102.6 50 99 60.6 C96.6 68 92 74 88.6 79 C87 84 86.4 92 87 108 L42 108 C42.6 101 42 96 39.6 92 C35 91 30 90.6 27.6 87.4 C26.4 84.6 27.4 82 26 80 C23.6 79 22.6 77 23.6 74.6 C21.6 73.6 21.6 71.6 22.4 69.4 C20.6 68 18.2 66.4 16.6 63.4 C15.8 61.4 17.8 59 20 57 C20.6 51 20.6 45 22 38 C24 24 36 6 56 4 Z', skin, skinL);
    s += line('M23.4 44.6 C26 43.4 29 43.4 31.4 44.8', tone(skin, -0.32), 1) + line('M25.4 49.6 Q28 48.6 30 49.8', tone(skin, -0.4), 0.9); // brow and closed eye
    s += fit(brainLateral(BR_DEFAULT), 0.72, 0.72, 25.6, 7.4);
    s += shape('M84.4 56.6 C86.6 52.6 92 52.6 93.4 57.4 C94.4 61.6 92.6 67 89.4 69.4 C87 70.6 85.6 68.4 86 66 C86.4 63 84.6 60.6 84.4 56.6 Z', tone(skin, -0.04), skinL, 1.4, ' opacity="0.88"'); // ear
    return s;
  }
  const BR_DEFAULT = '#eaaaa9';

  // ---------- Lungs, anterior view (patient's right lung on the viewer's left), 100 x 100 box ----------
  const LUNG = {
    right: [[31, 14], [37, 15.5], [40.5, 21], [42.5, 30], [43.4, 40], [43.2, 47], [42.4, 56], [42.8, 66], [45, 76], [46.6, 84], [43, 86.6], [36, 84.8], [28, 85.6], [19, 89], [12, 92.6], [7.4, 93],
      [6, 86], [6.4, 74], [8.4, 60], [12, 46], [17, 33], [22.5, 23], [26.6, 17]],
    left: [[69, 14], [73.4, 16.6], [77.5, 22], [83, 32], [88, 45], [91.6, 59], [93.6, 73], [94, 85], [92.6, 93.6], [87, 93.4], [80, 90], [72, 87.4], [65, 87], [59.6, 88.6], [56.8, 86.6],
      [57.4, 81.6], [60.2, 77.4], [62.6, 72.4], [63, 66], [61.2, 60.4], [58.4, 55.6], [56.8, 48], [57.2, 38], [58.8, 28.6], [61.6, 21], [65, 16]],
    fissures: [
      [[6.9, 57.6], [13, 63.4], [22, 71.6], [30.6, 79.2], [37.4, 85.2]], // right oblique
      [[42.6, 53.4], [35, 54.6], [26, 55.6], [17, 57.4], [8.6, 58.4]], // right horizontal
      [[92.2, 53.6], [86, 62], [79, 71], [72.4, 79.8], [67.6, 87.2]], // left oblique
    ],
    // Bronchial tree (shows faintly through the lungs): [points, width]
    tree: [
      [[[41.6, 46.6], [38.6, 41.4], [34, 36], [30.4, 30.4]], 2.4], [[[30.4, 30.4], [27, 23.6]], 1.4], [[[30.4, 30.4], [33.6, 22.4]], 1.3], [[[34, 36], [26.4, 37.6], [20.6, 41]], 1.4],
      [[[27, 23.6], [24, 19.6]], 0.8], [[[26.4, 37.6], [22, 33.6]], 0.8], [[[20.6, 41], [15.6, 44]], 0.8],
      [[[41.4, 47.6], [40.4, 55], [38.6, 62]], 2.4], [[[40.4, 55], [34, 58.4], [27.6, 60.8]], 1.5], [[[34, 58.4], [31.4, 64.6]], 1], [[[27.6, 60.8], [20.6, 60]], 0.8],
      [[[38.6, 62], [35.6, 70.4], [31, 78.6]], 1.8], [[[36.6, 67.4], [27.4, 71.2], [18.6, 76]], 1.3], [[[35.6, 70.4], [38.8, 79]], 1], [[[31, 78.6], [26.6, 84]], 0.9], [[[27.4, 71.2], [24, 66.4]], 0.8],
      [[[60.2, 45.6], [62.6, 40.4], [66.4, 34], [70, 27.4]], 2.4], [[[70, 27.4], [69.4, 20.6]], 1.2], [[[70, 27.4], [76.4, 25]], 1.2], [[[66.4, 34], [74, 35.4], [80.6, 38.6]], 1.4],
      [[[60.6, 46.8], [61.8, 54.6], [65.2, 60.2]], 1.9], [[[61.8, 54.6], [68.6, 58.6], [74.4, 64.4]], 1.4], [[[65.2, 60.2], [67.8, 69.4], [70.4, 79]], 1.8], [[[67.8, 69.4], [77.4, 71.6], [85.4, 76.6]], 1.3],
      [[[70.4, 79], [66.8, 84.4]], 0.9], [[[70.4, 79], [75.4, 84.6]], 0.9], [[[74.4, 64.4], [79.6, 61.2]], 0.8], [[[76.4, 25], [81, 29.4]], 0.8],
    ],
  };
  const TRACHEA = '#7d9dd3';
  let fissD = null;
  const lungFissures = (only) => {
    fissD = fissD || LUNG.fissures.map((q, i) => clipRuns(resample(crSample(q.map(([x, y], k) => [x + (k === 0 ? (i === 2 ? 2 : -2) : 0), y]), false), 0.5), crSample(i < 2 ? LUNG.right : LUNG.left, true, 10), 0.5, 1).map(smoothD).join(' '));
    return fissD.filter((_, i) => (only === 'right' ? i < 2 : only === 'left' ? i === 2 : true)).join(' ');
  };
  // o: { tree: false } hides the bronchial tree; { trachea: false } leaves the airway off; extra(markup) is drawn over the lungs.
  function lungsAnterior(c, o = {}) {
    const lineC = tone(c, -0.28, -0.1), fisC = tone(c, -0.2, -0.06), tc = o.tc || TRACHEA, tl = tone(tc, -0.22, -0.05);
    const right = o.only !== 'left', left = o.only !== 'right';
    let s = '';
    if (o.lungs !== false) {
      if (right) s += shape(P(LUNG.right), c, lineC);
      if (left) s += shape(P(LUNG.left), c, lineC);
      s += line(lungFissures(o.only), fisC, 0.95);
      if (o.extra) s += o.extra;
    }
    const tree = LUNG.tree.filter(([q]) => (q[0][0] < 50 ? right : left));
    if (o.tree !== false) s += tree.map(([q, w]) => (o.lungs === false ? line(P(q, false), tl, w + 1.4) + line(P(q, false), tc, w) : line(P(q, false), '#8a86c2', w, 0.5))).join('');
    if (o.trachea !== false) {
      // Main bronchi (right one shorter, wider and more vertical), then trachea with its cartilage rings and the larynx.
      const bronchi = 'M46.2 37.6 C44.6 40.8 42.4 43.6 39.8 46.2 L42.8 49.6 C45.6 46.6 48 43.8 50 41.6 C52 43.6 55.4 46.4 59.8 48.4 L61.6 44.4 C57.8 42.6 55.2 40.4 53.8 37.6 Z';
      s += shape(bronchi, tc, tl, 1.6);
      s += line('M43.2 44.4 L45.6 46.6 M45.4 41.8 L47.4 43.8 M56.2 41.8 L54.8 44.4 M59.4 43.4 L58.4 46.4', tl, 0.8);
      s += shape('M45.6 11.4 H54.4 V39 C52.6 40.6 47.4 40.6 45.6 39 Z', tc, tl, 1.6);
      for (let y = 13.6; y < 38.6; y += 2.9) s += line(`M46.4 ${f(y)} Q50 ${f(y + 1.1)} 53.6 ${f(y)}`, tl, 1.05);
      s += shape('M43.4 2 L46.8 1.2 L50 3.6 L53.2 1.2 L56.6 2 L56 6.2 C55.2 8.4 54.6 9.4 54.6 11 L45.4 11 C45.4 9.4 44.8 8.4 44 6.2 Z', tone(tc, 0.04), tl, 1.6); // thyroid cartilage
      s += line('M45.6 11.6 H54.4', tl, 1.4) + line('M50 3.8 V7.4', tl, 0.8);
    }
    return s;
  }

  // ---------- Heart, anterior view, 100 x 100 box ----------
  const AORTA = '#d9443f', PULM = '#3f7cc4', FAT = '#f1c45c';
  const vessel = (d, c, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${tone(c, -0.22, -0.05)}" stroke-width="${f(w + 1.6)}" stroke-linecap="${cap}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  // Vessel end cut across, showing the lumen (like the cut great vessels in anatomical drawings).
  const cutEnd = (x, y, w, c, rot = 0) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w / 2)}" ry="${f(w / 5)}" fill="${tone(c, -0.18)}" stroke="${tone(c, -0.3)}" stroke-width="0.9" transform="rotate(${rot} ${f(x)} ${f(y)})" data-flat=""/>`;
  const HEART = {
    ventricles: [[38.6, 44], [48, 41.4], [58, 41.6], [68, 43.4], [76.6, 47], [83.6, 54.6], [86.6, 64.6], [85, 75], [79.6, 85], [72.4, 92.6], [66.6, 94.2], [58, 91.6], [47, 86.8], [37.4, 81.4], [30.6, 75.6], [30, 66], [33.4, 54]],
    rAtrium: [[33.6, 39.4], [28, 41.4], [23.6, 47.6], [22.6, 56], [24.6, 64.4], [29.6, 71.2], [34.6, 68], [37.4, 59], [38.2, 49.4], [37.4, 42.4]],
    lAuricle: [[69.4, 43.6], [74, 41.6], [80, 42.4], [84.6, 46.4], [84.4, 51.4], [81, 51.6], [78.4, 49.2], [74.6, 48.2]],
  };
  function heartAnterior(c, o = {}) {
    const myo = c, line_ = tone(c, -0.26, -0.08), ra = tone(Color.mix(c, '#9b3f73', 0.45), 0), fatL = tone(FAT, -0.2, -0.1);
    let s = '';
    // Behind: pulmonary veins and the right pulmonary artery, the descending aorta.
    s += vessel('M77 37.4 L92.6 35', AORTA, 4.6, 'butt') + vessel('M78.4 43.6 L93.6 44.6', AORTA, 4.6, 'butt') + cutEnd(92.6, 35, 4.6, AORTA, 80) + cutEnd(93.6, 44.6, 4.6, AORTA, 95);
    s += vessel('M26 41.6 L11.6 39.4', AORTA, 4.6, 'butt') + vessel('M26 47.6 L12.6 49.4', AORTA, 4.6, 'butt') + cutEnd(11.6, 39.4, 4.6, AORTA, 98) + cutEnd(12.6, 49.4, 4.6, AORTA, 82);
    s += vessel('M42 30 L17.4 30.6', PULM, 7, 'butt') + cutEnd(17.4, 30.6, 7, PULM, 90);
    // Superior and inferior venae cavae.
    s += vessel('M30.8 2.6 V42', PULM, 9.4, 'butt') + cutEnd(30.8, 2.6, 9.4, PULM);
    s += vessel('M30.6 70 V97', PULM, 9, 'butt') + cutEnd(30.6, 97, 9, PULM);
    // Aortic arch with its three branches (brachiocephalic trunk, left common carotid, left subclavian).
    s += vessel('M45.4 14 L42.6 2.4', AORTA, 5.6, 'butt') + cutEnd(42.6, 2.4, 5.6, AORTA, -12) + vessel('M53.4 10.6 L53.4 1.8', AORTA, 4.6, 'butt') + cutEnd(53.4, 1.8, 4.6, AORTA) + vessel('M60.6 12.4 L63.4 2.6', AORTA, 4.6, 'butt') + cutEnd(63.4, 2.6, 4.6, AORTA, 16);
    s += vessel('M45 47 C44.4 36 43.4 25 45.6 17.4 C48.6 8.6 60.4 7 66.6 14.6 C69.4 18.6 69.8 24 69 30', AORTA, 11.4, 'butt');
    // Ventricles and atria.
    s += shape(P(HEART.ventricles), myo, line_);
    s += shape(P(HEART.rAtrium), ra, tone(ra, -0.25, -0.05));
    s += shape('M33.4 40.2 C35.6 35.4 40.4 34.2 43.4 36.6 C42.6 39.6 41.2 42 38.4 43.8 C36.4 43 34.6 41.8 33.4 40.2 Z', tone(ra, 0.04), tone(ra, -0.25, -0.05), 1.6); // right auricle
    // Pulmonary trunk leaving the right ventricle, dividing under the arch.
    s += vessel('M52.6 47.4 C53.4 40 55.4 34.6 59.4 30.6 C64 26.6 72 25.4 84.6 26.2', PULM, 10, 'butt') + cutEnd(84.6, 26.2, 10, PULM, 88);
    s += shape(P(HEART.lAuricle), ra, tone(ra, -0.25, -0.05), 1.6) + line('M72.6 45.6 Q76 44.4 79.8 46.2 M77 49.6 Q80.4 48.6 83 50.2', tone(ra, -0.2), 0.7);
    // Epicardial fat with the coronary vessels: right coronary in the atrioventricular groove, LAD in the anterior
    // interventricular groove, a diagonal and an acute marginal branch.
    const fatBand = (pts, w) => { const q = resample(crSample(pts, false), 0.8), nm = normals(q), r = K.rng(Math.round(pts[0][0] * 7 + pts[0][1])), side = (k) => q.map(([x, y], i) => { const u = i / (q.length - 1), ww = w * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.4))) * (0.85 + r() * 0.3); return [x + nm[i][0] * ww * k, y + nm[i][1] * ww * k]; }); return P(thin([...side(1), ...side(-1).reverse()], 2)); };
    s += shape(fatBand([[39.6, 45.6], [36.8, 55], [36.4, 65], [40.6, 74.4], [48, 81.6], [57.4, 87]], 2.6), FAT, fatL, 1.2, ' data-flat=""');
    s += shape(fatBand([[58.4, 45.6], [60.6, 56], [62.4, 67], [65, 78], [68.6, 89]], 3), FAT, fatL, 1.2, ' data-flat=""');
    s += shape(fatBand([[40.4, 74], [47.4, 74.4], [54.6, 77]], 1.8), FAT, fatL, 1, ' data-flat=""');
    const cor = (d, w = 1.1) => line(d, tone(AORTA, -0.2), w + 0.7) + line(d, AORTA, w);
    const cv = (d, w = 0.9) => line(d, tone(PULM, -0.2), w + 0.6) + line(d, PULM, w);
    s += cor('M41 45 C37.8 54 37.6 64 41.4 73.4 C45.6 80 51.4 84.6 57.6 87.6') + cor('M41.4 73.4 C46.4 74.2 51 75 55.6 77.4', 0.8);
    s += cor('M57.2 45 C59.6 56 61.2 66 63.8 77 C65.4 83 67.2 88 68.6 90.6') + cor('M60.4 56 C65.4 58.6 70.4 62.6 74.6 68', 0.8) + cor('M62.2 66 C66.4 69.6 70 74 72.4 79', 0.7);
    s += cv('M59.8 46 C62 56 63.6 66 66 77 C67.2 82.4 68.6 87 69.8 90');
    if (o.extra) s += o.extra;
    return s;
  }

  // ---------- Heart, four-chamber section (frontal plane), 100 x 100 box ----------
  // Right atrium and ventricle on the viewer's left with deoxygenated (blue-tinted) blood, left side red-tinted; the
  // left ventricular wall is much thicker than the right; tricuspid and mitral valves with chordae tendineae.
  function heartSection(c) {
    const myo = c, lineC = tone(c, -0.26, -0.08), endo = tone(c, -0.18), blue = '#a9b9e2', red = '#f2a7a2', leaf = '#f4e1c8', leafL = tone('#f4e1c8', -0.3);
    let s = '';
    s += vessel('M77 42 L93.4 39', AORTA, 4.6, 'butt') + cutEnd(93.4, 39, 4.6, AORTA, 80) + vessel('M78.6 49.4 L94 50.6', AORTA, 4.6, 'butt') + cutEnd(94, 50.6, 4.6, AORTA, 95);
    s += vessel('M32.6 2.6 V34', PULM, 9.4, 'butt') + cutEnd(32.6, 2.6, 9.4, PULM);
    s += vessel('M56 34 C55 22 56.6 14 63.4 10.6 C70 7.6 78 10.6 80 18 C81 22 80.6 27 79.6 31', AORTA, 10, 'butt');
    s += vessel('M44.4 36 C45 28 47 23 51 20', PULM, 8, 'butt') + cutEnd(51, 20, 8, PULM, 55);
    const wall = [[30.6, 30.6], [24.4, 38], [21.6, 49], [23.4, 60], [27, 70.4], [34.6, 80.4], [46, 88.4], [58, 93.4], [68.6, 95], [76.6, 90.4], [83.4, 80], [87, 67], [86.6, 55], [83.4, 44.6], [77, 36.4], [68, 32.6], [58, 32.4], [48, 31], [40, 28.6]];
    s += shape(P(wall), myo, lineC);
    const cav = (pts, fill) => shape(P(pts), fill, endo, 1.3, ' data-flat=""');
    s += cav([[31.6, 35.4], [27.4, 41.6], [26, 50], [28.4, 56.6], [37, 57.6], [45, 56.6], [46.6, 48], [44, 39.6], [38, 35]], blue); // right atrium
    s += cav([[29.6, 63.4], [31.4, 71.4], [37.6, 79.2], [47.6, 85.4], [55.6, 88], [53.4, 79], [49.6, 68.6], [47.6, 61.6], [38.4, 61]], blue); // right ventricle
    s += cav([[55.6, 41.6], [63.4, 37.4], [72.6, 38.6], [79.4, 44.4], [80.6, 51.6], [74, 55.6], [62.6, 56.2], [56.2, 52]], red); // left atrium
    s += cav([[59.4, 62.8], [66, 60.8], [74, 61.6], [78.4, 66.4], [78.4, 74], [74.4, 81.6], [68.8, 87.2], [65.4, 85.4], [62.4, 77], [60, 69]], red); // left ventricle
    // Trabeculae, papillary muscles, chordae and valve leaflets.
    s += shape('M41.6 79.6 C40.6 75 41 71.6 43.4 70.2 C45.6 71.6 45.4 76 43.6 80.4 Z', myo, endo, 0.9, ' data-flat=""') + shape('M70.6 82 C68.4 77.6 68.4 73.2 70.4 71.2 C72.8 72.4 73.2 77 72.2 82 Z', myo, endo, 0.9, ' data-flat=""') + shape('M63.6 80.6 C62.4 76.6 62.4 73.4 64 71.6 C65.8 73 66 76.6 65 80.4 Z', myo, endo, 0.9, ' data-flat=""');
    s += line('M33.6 61.4 L43.4 70.6 M39.4 61.6 L43.4 70.6 M58.4 62.4 L64 71.8 M66.6 61.8 L64 71.8 M70.4 62 L70.4 71.4 M75 62.6 L70.4 71.4', '#f7efe6', 0.6);
    s += shape('M29.6 57.6 C31.6 60 33.4 62 33.8 63.6 C36 61.6 37.4 59.4 37.6 57.8 Z', leaf, leafL, 0.8, ' data-flat=""') + shape('M37.4 57.8 C38.4 60.4 39.2 62 39.6 63.4 C42.4 61.2 44.4 59.2 45.4 57.4 Z', leaf, leafL, 0.8, ' data-flat=""'); // tricuspid
    s += shape('M59.4 56.4 C60.4 59 61.4 61 62.2 62.8 C64.6 60.6 66 58.6 66.6 56.6 Z', leaf, leafL, 0.8, ' data-flat=""') + shape('M68 56.4 C70 58.8 72 60.8 74 62.2 C75.4 60 76.4 57.8 76.6 55.8 Z', leaf, leafL, 0.8, ' data-flat=""'); // mitral
    s += line('M50.4 58 C52.4 66 56.6 78 62.2 90', tone(myo, -0.12), 0.9, 0.6); // septum edge
    return s;
  }

  // ---------- Liver, anterior view, 100 x 70 box ----------
  const LIVER = {
    outline: [[4.6, 45], [2.6, 32], [5, 18.6], [12.6, 8.6], [25, 3.6], [40, 2.6], [52, 4], [57.2, 6.6], [62.6, 4.8], [75, 5], [87, 7.6], [96.6, 12], [94.6, 15.6], [86, 21.6], [76, 27.4], [67.4, 32.4],
      [61.4, 35.6], [57.4, 37.4], [50, 43.2], [40, 51.2], [29, 58.6], [19, 63.2], [11.4, 62], [6.6, 55.6]],
  };
  function liverAnterior(c, o = {}) {
    const lineC = tone(c, -0.24, -0.08), gb = '#79b27c';
    let s = shape('M43.4 45 C42.6 50.6 44.6 56.4 49.6 57.6 C54.4 58.6 56.4 54 54.8 48.4 C54 45.6 52.6 43 51 41.4 Z', gb, tone(gb, -0.25), 1.6); // gallbladder fundus below the edge
    s += shape(P(LIVER.outline), c, lineC);
    if (o.extra) s += o.extra;
    // Falciform ligament down to the round ligament (ligamentum teres) at the inferior notch.
    s += shape('M56.2 6.2 C57.8 14 58.4 24 58.6 33.2 C58.8 35.4 59.6 37.6 60.6 39.4 C61.4 38 61.2 35.6 60.8 33 C60.6 24 59.8 14 58.4 5.6 Z', '#f1dcc0', tone('#f1dcc0', -0.3), 0.9, ' data-flat=""');
    s += `<circle cx="60.4" cy="39.6" r="1.5" fill="#f1dcc0" stroke="${tone('#f1dcc0', -0.3)}" stroke-width="0.9"/>`;
    return s;
  }

  // ---------- Kidney (left kidney, anterior view, hilum facing the midline on the viewer's right), 70 x 100 box ----------
  function kidney(c, o = {}) {
    const lineC = tone(c, -0.24, -0.08), ART2 = '#d33f45', VEIN2 = '#4a6fc0', URE = '#f0d595';
    const outline = [[34, 8.4], [22, 10], [12.6, 18], [8.4, 32], [8.6, 48], [10.6, 64], [16.4, 78], [25.4, 86.4], [35.6, 88], [43.4, 82.6], [46, 72.6], [43.6, 63.4], [40.6, 56.4], [40.8, 47.6], [43.8, 40.4], [47, 31], [47, 20], [42.6, 11.2]];
    let s = '';
    // Renal artery (red, behind) and vein (blue, in front) at the hilum; ureter (cream) running down.
    s += vessel('M41 44 C50 42.4 58 41.4 68 41', ART2, 4.2, 'butt') + cutEnd(68, 41, 4.2, ART2, 90);
    s += vessel('M44.6 60.6 C48 70 50 82 49.4 98', URE, 4.2, 'butt');
    s += shape('M39.6 41.6 C44 38.6 49 40 50 45.4 C50.4 52 49 58.6 44 62.4 C41.6 60.6 39.6 56 39.6 50.6 Z', URE, tone(URE, -0.3), 1.4); // renal pelvis
    s += shape(P(outline), c, lineC);
    if (o.extra) s += o.extra;
    s += vessel('M41.6 50 C50 50.6 58 51 68 51.4', VEIN2, 5, 'butt') + cutEnd(68, 51.4, 5, VEIN2, 90);
    s += shape('M21 9.2 C25 3 34 1.4 42 4.2 C45.4 6 46.6 9.4 44 11.6 C38 9.6 31 9.4 25.4 11.6 Z', '#e8b95a', tone('#e8b95a', -0.28), 1.4); // adrenal gland
    return s;
  }
  // Kidney cut open (coronal section): cortex, medullary pyramids, minor/major calyces and pelvis.
  function kidneySection(c) {
    const r = K.rng(5);
    let s = kidney(c, { extra: '' });
    const cortexIn = [[34, 13.4], [24, 15], [16.6, 22], [13.4, 33], [13.6, 48], [15.4, 62], [20.4, 74], [27.4, 81], [35, 82.4], [40.4, 78], [41.6, 70.6], [38.4, 62], [36, 55.6], [36.2, 47.6], [38.4, 40.4], [41.8, 31], [42, 20.6], [39, 15]];
    s += flat(P(cortexIn), tone(c, 0.1), 1);
    // Medullary pyramids: bases towards the cortex, papillae pointing at the hilum, each draining into a minor calyx.
    const H = [41.6, 50.4], pyr = [[22.4, 24.6], [17.2, 37.6], [16.8, 51.6], [19.4, 65.4], [26.4, 76.4]];
    let cal = '';
    for (const [x, y] of pyr) {
      const dx = H[0] - x, dy = H[1] - y, h = Math.hypot(dx, dy), ux = dx / h, uy = dy / h, ang = (Math.atan2(uy, ux) * 180) / Math.PI - 90;
      s += `<path d="M-6.4 -4.6 C-2.2 -6.8 2.2 -6.8 6.4 -4.6 L1.6 7 C0.8 8.2 -0.8 8.2 -1.6 7 Z" fill="${tone(c, -0.1)}" stroke="${tone(c, -0.24)}" stroke-width="0.8" transform="translate(${x} ${y}) rotate(${f(ang)})" data-flat=""/>`;
      const ax = x + ux * 8.6, ay = y + uy * 8.6;
      cal += `M${f(ax)} ${f(ay)} L${f(H[0] - ux * 2)} ${f(H[1] - uy * 2)} `;
      s += `<ellipse cx="${f(ax)}" cy="${f(ay)}" rx="2.6" ry="1.4" fill="#f0d595" stroke="${tone('#f0d595', -0.3)}" stroke-width="0.7" transform="rotate(${f(ang)} ${f(ax)} ${f(ay)})" data-flat=""/>`;
    }
    s += line(cal, tone('#f0d595', -0.3), 3.6) + line(cal, '#f0d595', 2.4);
    s += shape('M36.4 44.6 C40 41.6 46 42 48 46.4 C49.4 51 48 56.6 44 59.6 C40.6 58.6 37.4 55.4 36.4 51 Z', '#f0d595', tone('#f0d595', -0.3), 1, ' data-flat=""'); // renal pelvis
    return s;
  }

  // ---------- Base icons ----------
  set('brain', (c) => brainLateral(c), '#eaaaa9');
  set('lungs', (c) => lungsAnterior(c), '#e4a0a8');
  set('heart', (c) => heartAnterior(c), '#d8614f');
  set('liver', (c) => liverAnterior(c), '#a8574b');
  set('kidney', (c) => kidney(c), '#b65a50');
  set('vessel', (c) => bloodVessel(c), '#c24a4c');

  // ---------- Lung icons in the soft sets ----------
  const LG = '#e4a0a8';
  // The right lung on its own, filling a 60 x 90 box.
  const oneLung = (c, extra) => fit(lungsAnterior(c, { only: 'right', trachea: false, extra }), 1.08, 1.08, 1.6, -12.8);
  // A tumour: a pale, firm mass with short spicules reaching into the lung.
  const mass = (cx, cy, rad, seed) => {
    const r = K.rng(seed), pts = K.wob(cx, cy, rad, rad * 0.86, r, { amp: 0.14, n: 18 });
    let sp = '';
    for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283 + r() * 0.3, r0 = rad * 0.92, r1 = rad * (1.25 + r() * 0.4); sp += `M${f(cx + Math.cos(a) * r0)} ${f(cy + Math.sin(a) * r0 * 0.86)} L${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1 * 0.86)} `; }
    return line(sp, '#b9876f', 0.9) + shape(P(pts), '#f0dcc4', '#b9876f', 1.6) + line(P(K.wob(cx - rad * 0.15, cy - rad * 0.1, rad * 0.45, rad * 0.35, r, { amp: 0.2, n: 10 })), '#d7b99c', 0.8);
  };
  set('s-lungs-soft', (c) => fit(lungsAnterior(c), 0.9, 0.9, 5, 0), LG);
  set('s-trachea-and-bronchi', (c) => fit(lungsAnterior(LG, { lungs: false, tc: c }), 1.06, 1.06, -3, 0), TRACHEA);
  set('s-lung-tumour', (c) => oneLung(c, mass(26, 33, 6.4, 5)), LG);
  set('s-pneumonia', (c) => {
    // Consolidation: the lower lobe filled with dense, patchy inflammatory exudate.
    const r = K.rng(11);
    let x = flat('M11.6 66.4 C16.4 65.4 22 70 28.4 74.6 C32.4 77.6 35.2 81.2 35.6 84.2 C29.6 84.2 22 86.2 14.4 89.6 C10.6 87.8 9 82 9.6 74 Z', '#b8404f', 0.5);
    for (let k = 0; k < 9; k++) x += flat(P(K.wob(15 + r() * 15, 73 + r() * 10, 2.2 + r() * 2, 1.8 + r() * 1.4, r, { amp: 0.25, n: 9 })), '#a3303f', 0.45);
    for (let k = 0; k < 16; k++) x += `<circle cx="${f(13 + r() * 20)}" cy="${f(71 + r() * 14)}" r="${f(0.6 + r() * 0.6)}" fill="#7d1f2b" opacity="0.7"/>`;
    return oneLung(LG, x);
  }, '#b8404f');
  set('s-emphysema', (c) => {
    // Enlarged, merged air spaces (bullae) in the upper lobes.
    const r = K.rng(23);
    let x = '';
    const spots = [[24, 26, 5], [30, 36, 3.6], [19, 38, 3.4], [34, 22, 2.8], [26, 46, 2.6], [76, 26, 5], [70, 36, 3.4], [81, 38, 3.6], [67, 24, 2.8], [75, 47, 2.6], [14, 52, 2.2], [86, 52, 2.4]];
    for (const [cx, cy, rr] of spots) x += shape(P(K.wob(cx, cy, rr, rr * 0.9, r, { amp: 0.12, n: 12 })), '#fbeaea', c, 0.9, ' data-flat=""');
    return fit(lungsAnterior(LG, { extra: x }), 0.9, 0.9, 10, 0);
  }, '#c25d6c');

  // ---------- Brain icons in the soft sets (110 x 90 boxes) ----------
  const BR = '#eaaaa9', ART = '#c8323c';
  const brain110 = (inner) => fit(inner, 1.06, 1.06, 2, 4);
  // Middle cerebral artery: out of the Sylvian fissure, superior division over the frontal and parietal lobes,
  // inferior division over the temporal lobe.
  const MCA = ['M30.6 47.4 C36 46 42 44.4 48 42.8', 'M40 44.8 C38.4 40 37 36 34.4 31.4', 'M44 43.6 C44.6 38 46.4 32 45.6 26', 'M48 42.8 C51.4 37 55.8 31.4 56.6 24.4',
    'M48 42.8 C54 41.4 59 40 63 38', 'M56 40.6 C59 37 63.6 31.6 68.8 29.4', 'M52.6 41.6 C56 45 62 47.6 68.6 47', 'M47 43.2 C49 46.4 52 50.4 57 52.6'];
  set('s-brain-lobes', () => brain110(brainLateral(BR, { lobes: true })));
  set('s-brain-sagittal-section', (c) => brain110(brainSagittal(c)), BR);
  set('s-ischaemic-stroke', (c) => brain110(brainLateral(BR)
    + flat('M50.4 32 C53 25 60 19.6 66.6 20.8 C72 22 74.4 27.6 72.6 32.6 C70.4 38 62.6 40.6 57 39.2 C53 38.2 49.4 35.8 50.4 32 Z', c, 0.42) // infarcted territory
    + line('M50.4 32 C53 25 60 19.6 66.6 20.8 C72 22 74.4 27.6 72.6 32.6 C70.4 38 62.6 40.6 57 39.2 C53 38.2 49.4 35.8 50.4 32 Z', D(c, 0.25), 0.8).replace('/>', ' stroke-dasharray="2 1.6"/>')
    + MCA.map((d) => line(d, D(ART, 0.25), 1.9) + line(d, ART, 1.2)).join('')
    + `<ellipse cx="55.6" cy="39.6" rx="2.6" ry="1.9" fill="#5a1a1f" stroke="#3d0f13" stroke-width="0.8" transform="rotate(-38 55.6 39.6)"/>`)); // clot blocking a branch
  set('s-haemorrhagic-stroke', (c) => {
    const r = K.rng(77), blob = K.wob(58, 33, 8.6, 6.4, r, { amp: 0.16, n: 22, rot: -12 });
    let s = brainLateral(BR) + MCA.slice(0, 6).map((d) => line(d, D(ART, 0.25), 1.6) + line(d, ART, 1)).join('');
    s += shape(P(blob), c, D(c, 0.35), 1.4);
    for (let k = 0; k < 6; k++) { const a = r() * 6.28, d = 10 + r() * 3; s += `<circle cx="${f(58 + Math.cos(a) * d)}" cy="${f(33 + Math.sin(a) * d * 0.72)}" r="${f(0.6 + r() * 0.8)}" fill="${c}"/>`; }
    return brain110(s);
  });
  set('s-alzheimer-s-disease-brain-atrophy', (c) => brain110(brainLateral(c, { atrophy: true })), '#e2a2a6');

  // ---------- Digestive organs (anterior view: patient's right on the viewer's left) ----------
  const GUT = '#e6a39c';
  // A tube drawn as an outline stroke under a body stroke (the shared finish adds its light and shade lines).
  const tubeD = (d, c, w, cap = 'round') => `<path d="${d}" fill="none" stroke="${tone(c, -0.24, -0.06)}" stroke-width="${f(w + 1.6)}" stroke-linecap="${cap}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f(w)}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  // Stomach, 100 x 100: oesophagus into the cardia, fundus up on the viewer's right, greater curvature round the
  // outside, pyloric antrum and pylorus on the viewer's left, then the first part of the duodenum.
  function stomach(c, o = {}) {
    const lineC = tone(c, -0.24, -0.06);
    let s = o.oesophagus === false ? '' : tubeD('M60.6 2 C60.4 10 59.8 16 58.4 22', tone(c, -0.03), 8.6, 'butt'); // oesophagus
    if (o.duodenum !== false) s += tubeD('M23 63.4 C17 64.6 13.4 68.6 13 75 C12.6 82 15.4 88 20 92', tone(c, 0.02), 9.4, 'butt'); // duodenum
    const outline = [[55.4, 21.4], [60, 14.6], [67.6, 10.6], [76.6, 11.4], [83.6, 17.4], [87.4, 27.4], [88, 40], [84.6, 53.4], [77, 65], [65.6, 73.6], [52, 77.4], [39.6, 76.6], [30.4, 72], [24.6, 66.8], [23.4, 61.6], [26.6, 58.4], [33, 59.2], [41, 59.6], [48.6, 56], [53.4, 48], [54.6, 38], [54, 28]];
    s += shape(P(outline), c, lineC);
    if (o.extra) s += o.extra;
    // Rugae showing faintly, the angular incisure, and the pyloric sphincter.
    s += line('M62 22 C66 34 68 46 66 58 M70 18 C76 30 79 42 76 56 M58 30 C61 42 61 52 56 62 C50 68 42 70 34 68', tone(c, -0.12), 0.9, 0.7);
    s += line('M25.2 59.6 C27 62.6 26.6 66 24.4 68.6', lineC, 1.6);
    return s;
  }
  // Large intestine, 100 x 100: caecum and appendix (viewer's left, low), ascending, transverse (sagging), descending
  // and sigmoid colon, rectum; haustra drawn as the chain of pouches that gives the colon its look.
  const COLON_PATH = [[20, 84], [15, 74], [13.4, 60], [13.6, 44], [15, 30], [20, 20], [30, 18.6], [42, 24], [54, 26.4], [66, 22.6], [78, 15], [86.6, 16], [88.6, 28], [88, 44], [87.6, 60], [85.4, 72], [78, 78.6], [68, 77.6], [60, 80.4], [55, 86.6], [52.6, 96]];
  function colon(c, o = {}) {
    const q = resample(crSample(COLON_PATH, false, 10), 5), lineC = tone(c, -0.24, -0.06);
    let s = tubeD('M18.6 88 C18 93.6 21.6 97.2 26.4 96', tone(c, 0.04), 3.2); // appendix
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i], [x2, y2] = q[Math.min(q.length - 1, i + 1)], [x0, y0] = q[Math.max(0, i - 1)], a = (Math.atan2(y2 - y0, x2 - x0) * 180) / Math.PI;
      const rect = i > q.length - 4; // the rectum has no haustra
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${rect ? 4.4 : 4.4}" ry="${rect ? 5 : 7.2}" fill="${c}" stroke="${lineC}" stroke-width="1.6" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`;
    }
    s += `<ellipse cx="20.6" cy="86" rx="7.4" ry="6.6" fill="${c}" stroke="${lineC}" stroke-width="1.6"/>`; // caecum
    if (o.extra) s += o.extra;
    return s;
  }
  // Small intestine, 100 x 100: jejunum and ileum coiled in the middle of the abdomen: a pile of hairpin loops at
  // different angles, the way the loops are drawn in anatomical illustrations.
  let siD = null;
  const SI_MASS = [[16, 30], [24, 14], [40, 8], [58, 8], [76, 12], [88, 26], [90, 46], [88, 66], [80, 84], [62, 92], [42, 92], [24, 86], [13, 70], [11, 50]];
  function smallIntestine(c) {
    if (!siD) {
      const r = K.rng(808), units = [], mass = crSample(SI_MASS, true, 8);
      for (let gy = 0; gy < 5; gy++) for (let gx = 0; gx < 5; gx++) {
        const cx = 20 + gx * 15 + (gy % 2) * 7 + (r() - 0.5) * 4, cy = 20 + gy * 15.4 + (r() - 0.5) * 4;
        if (!inPoly(cx, cy, mass) || edgeDist(cx, cy, mass) < 7) continue;
        const a = r() * 360, w = 4.4 + r() * 1.4, h = 6.4 + r() * 3, t = (a * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
        const pts = [[-w, h], [-w * 1.05, 0], [-w * 0.7, -h * 0.8], [0, -h], [w * 0.7, -h * 0.8], [w * 1.05, 0], [w, h]].map(([x, y]) => [cx + x * ct - y * st, cy + x * st + y * ct]);
        units.push(P(pts, false));
      }
      siD = { units, mass: P(SI_MASS) };
    }
    const lineC = tone(c, -0.24, -0.06);
    return shape(siD.mass, tone(c, -0.1), lineC, 1.6, ' data-flat=""')
      + siD.units.map((d) => `<path d="${d}" fill="none" stroke="${lineC}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="8.4" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  }
  // Pancreas, 100 x 60: head in the C-loop of the duodenum (viewer's left), neck, body and tail rising to the spleen.
  function pancreas(c, o = {}) {
    const r = K.rng(41), lineC = tone(c, -0.22, -0.06);
    let s = tubeD('M30 6 C20 6 12 12 10 24 C8.6 36 12 46 22 50 C32 53.6 42 52 50 48', GUT, 9.4, 'butt'); // duodenum
    const outline = [[17.6, 24], [20, 15.6], [27.4, 14], [33.6, 19.4], [42, 21.4], [54, 19], [66, 15], [78, 10], [88, 6.6], [95, 8.4], [95.6, 14.6], [90, 19.6], [80, 23.6], [68, 28], [56, 31.4], [44, 34.4], [38, 39.4], [34, 45.6], [26.4, 46.4], [19.6, 40.6], [17, 32]];
    // Lobulated edge: little bumps all round the outline.
    const edge = resample(crSample(outline, true, 10), 2.2), nm = normals(edge);
    const bumpy = edge.map(([x, y], i) => { const b = 0.55 * Math.sin(i * 2.1) + 0.3 * Math.sin(i * 0.9 + 1); return [x - nm[i][0] * b, y - nm[i][1] * b]; });
    s += shape(P(bumpy), c, lineC);
    s += scatter(13, 40, [18, 7, 78, 40], (x, y, rr) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.9 + rr() * 1.2)}" fill="${tone(c, 0.12)}" opacity="0.8"/>`, (x, y) => { const oo = crSample(outline, true, 6); return inPoly(x, y, oo) && edgeDist(x, y, oo) > 2; });
    s += line('M24 40 C30 34 40 30 52 27 C64 24 76 19 92 11.6', tone(c, -0.18), 1.1) + line('M34 28 L38 26.6 M48 26 L50 23 M62 22.6 L64 19.4 M76 17.4 L77 14', tone(c, -0.18), 0.7); // main pancreatic duct
    if (o.extra) s += o.extra;
    return s;
  }

  // Gallbladder, 70 x 100: fundus at the bottom, body, neck; cystic duct joining the common hepatic duct to form the
  // common bile duct.
  const BILE = '#7fb37f';
  function gallbladder(c, o = {}) {
    const lineC = tone(c, -0.26, -0.06);
    let s = tubeD('M50 2 C50.6 16 50.4 30 50 44 C49.6 62 50.4 80 51 98', tone(c, 0.06), 4.6, 'butt'); // common hepatic -> common bile duct
    s += tubeD('M30 26 C31 20 36 18.6 39.6 22.4 C42.4 25.6 45.6 28 50 29.6', tone(c, 0.06), 3.8, 'butt'); // cystic duct (spiral folds)
    s += shape('M28.6 22.4 C22 25 18.6 34 17.6 46 C16.4 60 15.6 74 20.6 84.4 C25 93 38 94.4 43.6 86.4 C48.4 79.4 46.6 66 43.6 52 C41.4 41 39.6 31 36.6 25 C34.4 21.6 31.4 21.2 28.6 22.4 Z', c, lineC);
    s += line('M31.4 25.6 C33.6 28 34.4 31 34 34', tone(c, -0.16), 0.9);
    if (o.extra) s += o.extra;
    return s;
  }
  // Urinary bladder, 100 x 100 (anterior view): ureters arriving from above at the sides, urethra leaving below.
  function bladder(c, o = {}) {
    const lineC = tone(c, -0.26, -0.06), U = '#efd38f';
    let s = tubeD('M14 2 C16 18 20 32 30 44', U, 4.6, 'butt') + tubeD('M86 2 C84 18 80 32 70 44', U, 4.6, 'butt');
    s += tubeD('M50 78 V98', tone(c, 0.02), 7, 'butt');
    s += shape('M50 26 C64 26 78 34 80 50 C81.6 64 70 78 56 82 C52.4 83 47.6 83 44 82 C30 78 18.4 64 20 50 C22 34 36 26 50 26 Z', c, lineC);
    s += line('M50 26 C49.4 22 49.6 18 51 14.6', lineC, 1.2); // urachus (median umbilical ligament)
    s += line('M30 46 C38 50 44 58 46 70 M70 46 C62 50 56 58 54 70 M36 38 C44 42 56 42 64 38', tone(c, -0.12), 0.9, 0.7); // detrusor bundles
    if (o.extra) s += o.extra;
    return s;
  }
  // Spleen, 100 x 70 (visceral surface): convex diaphragmatic border with notches above, hilum with the splenic artery
  // (red) and vein (blue).
  function spleen(c) {
    const lineC = tone(c, -0.26, -0.06);
    let s = vessel('M60 40 C70 46 82 50 98 50', '#d33f45', 3.4, 'butt') + vessel('M58 44 C68 52 82 56 98 57', '#4a6fc0', 4.2, 'butt');
    s += shape('M8 46 C4 30 14 14 32 8 C46 3.4 64 4 78 10 C86 14 90 20 88 25 C86.4 26.6 84 26 82.6 27.4 C83.2 29.4 84.4 30.4 83.6 31.6 C78 34 70 36 64 38 C58 40 52 44 48 50 C42 58 32 64 22 63 C14 62 10 56 8 46 Z', c, lineC);
    s += line('M46 46 C52 41 58 39 64 38', tone(c, -0.18), 1);
    return s;
  }
  // Thyroid, 100 x 90: two lobes joined by the isthmus across the trachea, below the larynx.
  function thyroid(c, o = {}) {
    const lineC = tone(c, -0.26, -0.06), tc = TRACHEA, tl = tone(tc, -0.22, -0.05), k = o.big ? 1.32 : 1;
    let s = shape('M42.6 20 H57.4 V90 H42.6 Z', tc, tl, 1.6);
    for (let y = 24; y < 90; y += 4.4) s += line(`M43.6 ${y} Q50 ${y + 1.6} 56.4 ${y}`, tl, 1.1);
    s += shape('M36.6 2 L44 0.8 L50 5.4 L56 0.8 L63.4 2 L62.4 10 C61 14.4 59.6 16.6 59.4 19.4 L40.6 19.4 C40.4 16.6 39 14.4 37.6 10 Z', tone(tc, 0.05), tl, 1.6); // thyroid cartilage
    s += line('M50 5.6 V11', tl, 0.9) + shape('M41 19.4 H59 V23.6 H41 Z', tone(tc, 0.03), tl, 1.2); // cricoid
    const lobe = (sx) => `<g transform="translate(50 52) scale(${sx * k} ${k}) translate(-50 -52)"><path d="M44 54 C40 46 37 38 33 32 C30 28 25 28 22.6 32.6 C19 40 18.6 54 20.6 64 C22.6 73.6 28 79 34 78.6 C40 78 43 72 44 64 Z" fill="${c}" stroke="${lineC}" stroke-width="2" stroke-linejoin="round"/></g>`;
    s += lobe(1) + lobe(-1);
    s += shape(`M38 ${56} C44 ${58.4} 56 ${58.4} 62 ${56} L62 ${63.6} C56 ${66} 44 ${66} 38 ${63.6} Z`, c, lineC, 1.6, ' data-flat=""'); // isthmus
    s += scatter(o.big ? 61 : 27, o.big ? 26 : 30, [16, 28, 68, 52], (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + r() * (o.big ? 2.6 : 1))}" fill="${tone(c, o.big ? 0.12 : 0.08)}" ${o.big ? `stroke="${tone(c, -0.2)}" stroke-width="0.6"` : 'opacity="0.8"'}/>`, (x, y) => Math.abs(x - 50) > (o.big ? 9 : 8.4) && Math.abs(x - 50) < 26 * k && y > 34 && y < 74 + (k - 1) * 20);
    return s;
  }
  // Oesophagus, 70 x 110: from the pharynx down through the diaphragm into the cardia of the stomach.
  function oesophagus(c) {
    let s = shape('M2 72 C18 68 50 68 68 72 L68 77 C50 73.6 18 73.6 2 77 Z', '#d9b38c', tone('#d9b38c', -0.3), 1.2, ' data-flat=""'); // diaphragm
    s += tubeD('M30 2 C31 20 30 40 31.6 58 C32.6 70 35 80 39 89', c, 9.6, 'butt');
    s += line('M25.6 10 Q30 11.6 34.4 10 M25.6 22 Q30 23.6 34.4 22 M25.6 34 Q30 35.6 34.4 34 M26.6 46 Q31 47.6 35.4 46 M27.6 58 Q32 59.6 36.4 58', tone(c, -0.14), 0.8);
    s += fit(stomach(c, { oesophagus: false, duodenum: false }), 0.4, 0.4, 15.6, 79.4);
    return s;
  }
  // Uterus, tubes and ovaries, 100 x 80 (anterior view).
  function uterus(c) {
    const lineC = tone(c, -0.26, -0.06), ov = '#f0c6b6';
    let s = '';
    for (const sx of [1, -1]) {
      const g = (inner) => `<g transform="translate(50 0) scale(${sx} 1) translate(-50 0)">${inner}</g>`;
      s += g(tubeD('M38 20 C30 14 22 12 15 16 C9.6 19.6 8.6 27 12 33', tone(c, 0.04), 3.6) // fallopian tube
        + line('M12 33 L8.6 37.6 M12 33 L10.6 39 M12 33 L14.6 38.4 M12 33 L6.6 34.4', tone(c, -0.12), 1.4) // fimbriae
        + line('M37.6 30 C31 32 26 34 22.6 36', tone(c, -0.1), 1.6) // ovarian ligament
        + `<ellipse cx="17.4" cy="40.4" rx="8.6" ry="5.6" fill="${ov}" stroke="${tone(ov, -0.28)}" stroke-width="1.6" transform="rotate(-24 17.4 40.4)"/>`);
    }
    s += shape('M36 18 C36 10 44 8 50 8 C56 8 64 10 64 18 C64 30 60 42 56 50 C54.6 53 54.4 56 54.4 60 L45.6 60 C45.6 56 45.4 53 44 50 C40 42 36 30 36 18 Z', c, lineC); // body and fundus
    s += shape('M45 59 H55 C55.4 64 56 70 57.4 78 L42.6 78 C44 70 44.6 64 45 59 Z', tone(c, -0.03), lineC, 1.6); // cervix and vagina
    s += line('M45 62.4 Q50 64.4 55 62.4', tone(c, -0.18), 0.9);
    return s;
  }
  // Ovary cut open: follicles at several stages and a corpus luteum, 100 x 70.
  function ovary(c) {
    const lineC = tone(c, -0.26, -0.06);
    let s = shape('M8 36 C8 18 28 6 52 6 C76 6 94 18 94 36 C94 54 76 66 52 66 C28 66 8 54 8 36 Z', c, lineC);
    s += flat('M14 36 C14 22 30 12 52 12 C74 12 88 22 88 36 C88 50 74 60 52 60 C30 60 14 50 14 36 Z', tone(c, 0.08));
    const fol = (x, y, r0, ant) => `<circle cx="${x}" cy="${y}" r="${r0}" fill="${ant ? '#fbf1d6' : tone(c, 0.18)}" stroke="${tone(c, -0.2)}" stroke-width="0.9"/>` + (ant ? `<circle cx="${x - r0 * 0.45}" cy="${y + r0 * 0.3}" r="${f(r0 * 0.28)}" fill="#f2b5b5" stroke="${tone('#f2b5b5', -0.3)}" stroke-width="0.6"/>` : `<circle cx="${x}" cy="${y}" r="${f(r0 * 0.38)}" fill="#f2b5b5"/>`);
    s += fol(24, 30, 2.6) + fol(30, 44, 3) + fol(42, 22, 3.4) + fol(72, 46, 2.6) + fol(78, 26, 2.2) + fol(36, 50, 2.2) + fol(54, 46, 9.6, true);
    s += `<circle cx="68" cy="26" r="7.6" fill="#f2cf63" stroke="${tone('#f2cf63', -0.3)}" stroke-width="1.2"/>` + line('M64 22 Q68 26 64 30 M70 21 Q66 26 71 31', tone('#f2cf63', -0.25), 0.8); // corpus luteum
    return s;
  }

  // Blood vessel segment, 100 x 40: muscular wall (cut lengthwise), endothelial lining and red blood cells in the lumen.
  function bloodVessel(c) {
    const wall = c, wallL = tone(c, -0.26, -0.08), lumen = tone(c, 0.38, -0.1), endo = tone(c, 0.18), r = K.rng(3);
    let s = shape('M2 3 H98 V37 H2 Z', lumen, wallL, 1.2, ' data-flat=""');
    s += shape('M2 3 H98 V9.4 H2 Z', wall, wallL, 1.4) + shape('M2 30.6 H98 V37 H2 Z', wall, wallL, 1.4);
    for (let x = 2; x < 98; x += 12) s += `<path d="M${x} 9.4 C${x + 3} 12.4 ${x + 9} 12.4 ${x + 12} 9.4 Z" fill="${endo}" stroke="${tone(endo, -0.25)}" stroke-width="0.6"/><ellipse cx="${x + 6}" cy="10.6" rx="2" ry="0.8" fill="${tone(c, -0.05)}"/>`
      + `<path d="M${x} 30.6 C${x + 3} 27.6 ${x + 9} 27.6 ${x + 12} 30.6 Z" fill="${endo}" stroke="${tone(endo, -0.25)}" stroke-width="0.6"/><ellipse cx="${x + 6}" cy="29.4" rx="2" ry="0.8" fill="${tone(c, -0.05)}"/>`;
    const rbc = (x, y, rx, ry, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><ellipse rx="${rx}" ry="${ry}" fill="#c9313f" stroke="#8d1d2a" stroke-width="0.9"/><path d="M${-rx * 0.45} ${-ry * 0.1} C${-rx * 0.2} ${-ry * 0.55} ${rx * 0.25} ${-ry * 0.55} ${rx * 0.4} ${-ry * 0.2} C${rx * 0.1} ${-ry * 0.3} ${-rx * 0.2} ${-ry * 0.25} ${-rx * 0.45} ${-ry * 0.1} Z" fill="#94172a"/></g>`;
    for (const [x, y, rx, ry, rot] of [[12, 20, 5.4, 4.6, 0], [28, 24, 5, 2.4, -18], [42, 17, 5.4, 4.6, 0], [57, 23, 5, 2.4, 22], [71, 19, 5.4, 4.6, 0], [87, 22, 5, 2.4, -14]]) s += rbc(x, y, rx, ry, rot + (r() - 0.5) * 6);
    return s;
  }

  // ---------- Heart, liver and kidney icons in the soft sets ----------
  const HC = '#d8614f', LV = '#a8574b', KC = '#b65a50';
  const dashed = (d, c, w = 0.9) => line(d, c, w).replace('/>', ' stroke-dasharray="2 1.5"/>');
  const scatter = (seed, n, box, draw, inside) => { const r = K.rng(seed); let s = ''; for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) { const x = box[0] + r() * box[2], y = box[1] + r() * box[3]; if (inside && !inside(x, y)) continue; s += draw(x, y, r); k++; } return s; };
  const inLiver = (x, y) => { const o = crSample(LIVER.outline, true, 6); return inPoly(x, y, o) && edgeDist(x, y, o) > 3; };
  const kOut = [[34, 8.4], [22, 10], [12.6, 18], [8.4, 32], [8.6, 48], [10.6, 64], [16.4, 78], [25.4, 86.4], [35.6, 88], [43.4, 82.6], [46, 72.6], [43.6, 63.4], [40.6, 56.4], [40.8, 47.6], [43.8, 40.4], [47, 31], [47, 20], [42.6, 11.2]];
  const inKidney = (x, y) => { const o = crSample(kOut, true, 6); return inPoly(x, y, o) && edgeDist(x, y, o) > 3; };
  const k80 = (inner) => fit(inner, 1, 1, 5, 0);
  set('s-heart-four-chambers', (c) => heartSection(c), HC);
  set('s-heart-exterior-coronary-arteries', (c) => fit(heartAnterior(c), 0.9, 0.9, 0, 5), HC);
  set('s-myocardial-infarction', (c) => heartAnterior(HC, {
    extra: flat('M63.4 64 C68 62 75 63.6 79.4 68.6 C82.4 72.6 81.4 80 77 85.6 C73.4 90 68.4 91.4 66.2 88 C64 82.6 62.6 74 63.4 64 Z', c, 0.5)
      + dashed('M63.4 64 C68 62 75 63.6 79.4 68.6 C82.4 72.6 81.4 80 77 85.6 C73.4 90 68.4 91.4 66.2 88 C64 82.6 62.6 74 63.4 64 Z', tone(c, -0.25))
      + '<ellipse cx="61.6" cy="60.6" rx="2.2" ry="1.5" fill="#3d0f13" transform="rotate(75 61.6 60.6)"/>',
  }), '#6f3b5c');
  set('s-liver-soft', (c) => liverAnterior(c), LV);
  set('s-liver-tumour', (c) => liverAnterior(LV, { extra: mass(24, 26, 8.6, 9) }), LV);
  set('s-fatty-liver-steatosis', (c) => liverAnterior(c, { extra: scatter(31, 46, [6, 5, 88, 56], (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.9 + r() * 1.9)}" fill="#fbecc2" stroke="#e1c27e" stroke-width="0.6"/>`, inLiver) }), '#c1915e');
  set('s-cirrhotic-liver', (c) => liverAnterior(c, { extra: scatter(17, 60, [4, 4, 92, 58], (x, y, r) => { const rr = 2 + r() * 2.2; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${tone(c, (r() - 0.5) * 0.08)}" stroke="${tone(c, -0.2)}" stroke-width="0.7" data-flat=""/>`; }, inLiver) }), '#93603f');
  set('s-kidney-soft', (c) => k80(kidney(c)), KC);
  set('s-kidney-cross-section', (c) => k80(kidneySection(c)), KC);
  set('s-kidney-stones', (c) => {
    const stone = (x, y, rr0, rot) => { const rr = rr0 * 1.5; return  `<path d="M${-rr} 0 L${-rr * 0.4} ${-rr * 0.9} L${rr * 0.6} ${-rr * 0.8} L${rr} ${rr * 0.1} L${rr * 0.3} ${rr * 0.9} L${-rr * 0.7} ${rr * 0.7} Z" fill="${c}" stroke="${tone(c, -0.3)}" stroke-width="0.8" stroke-linejoin="round" transform="translate(${x} ${y}) rotate(${rot})"/>`; };
    return k80(kidneySection(KC) + stone(31.6, 36.4, 2.4, 10) + stone(28.6, 58, 2.2, 40) + stone(42.6, 51, 2.8, -20) + stone(47.6, 76, 1.6, 30));
  }, '#c9b27e');
  set('s-polycystic-kidney', (c) => k80(kidney(KC, { extra: scatter(9, 22, [10, 10, 36, 76], (x, y, r) => { const rr = 2.4 + r() * 3.4; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${c}" stroke="${tone(c, -0.28)}" stroke-width="0.8"/>`; }, inKidney) })), '#f0d58c');

  set('s-stomach', (c) => stomach(c), GUT);
  set('s-large-intestine-colon', (c) => colon(c), '#d98d8f');
  set('s-small-intestine', (c) => smallIntestine(c), '#eeb0a6');
  set('s-pancreas', (c) => pancreas(c), '#f0c06c');
  set('s-gallbladder', (c) => gallbladder(c), BILE);
  set('s-gallstones', (c) => gallbladder(BILE, { extra: [[28, 76, 4.4], [36, 80, 3.6], [24, 64, 3.2], [33, 68, 2.8], [30, 56, 2.2]].map(([x, y, rr], k) => `<path d="M${x - rr} ${y} L${x - rr * 0.3} ${y - rr} L${x + rr * 0.7} ${y - rr * 0.7} L${x + rr} ${y + rr * 0.2} L${x + rr * 0.2} ${y + rr} L${x - rr * 0.8} ${y + rr * 0.7} Z" fill="${c}" stroke="${tone(c, -0.3)}" stroke-width="0.9" stroke-linejoin="round" transform="rotate(${k * 37} ${x} ${y})"/>`).join('') }), '#d8b45f');
  set('s-urinary-bladder', (c) => bladder(c), '#e3a796');
  set('s-urinary-tract-infection', (c) => fit(bladder('#e3a796', { extra: scatter(19, 12, [30, 36, 40, 38], (x, y, r) => `<rect x="${f(x - 2.6)}" y="${f(y - 1.1)}" width="5.2" height="2.2" rx="1.1" fill="${c}" stroke="${tone(c, -0.3)}" stroke-width="0.6" transform="rotate(${f(r() * 180)} ${f(x)} ${f(y)})"/>`) + line('M24 40 C28 36 30 30 34 28 M76 40 C72 36 70 30 66 28', '#d9534f', 1, 0.6) }), 0.9, 0.9, 0, 0), '#6fb36a');
  set('s-spleen', (c) => spleen(c), '#9a4a63');
  set('s-thyroid', (c) => thyroid(c), '#cd6a55');
  set('s-goitre-enlarged-thyroid', (c) => fit(thyroid(c, { big: true }), 0.89, 0.89, 5.5, 0), '#cd6a55');
  set('s-oesophagus', (c) => oesophagus(c), GUT);
  set('s-uterus-and-ovaries', (c) => uterus(c), '#e3949c');
  set('s-ovary', (c) => ovary(c), '#e8a8a2');
  set('s-gastric-ulcer', (c) => fit(stomach(GUT, { extra: `<ellipse cx="51.6" cy="52" rx="4.6" ry="3.4" fill="${c}" stroke="${tone(c, -0.3)}" stroke-width="1.2" transform="rotate(-50 51.6 52)"/><ellipse cx="51.6" cy="52" rx="2.4" ry="1.6" fill="#f3e3c8" transform="rotate(-50 51.6 52)"/>` }), 0.9, 0.9, 5, 0), '#b5363c');
  set('s-appendicitis', (c) => {
    // Caecum with the terminal ileum joining it and an inflamed, swollen appendix.
    const cc = '#d98d8f', lineC = tone(cc, -0.24, -0.06);
    let s = tubeD('M88 30 C74 32 64 38 54 44', GUT, 9.6, 'butt');
    for (const [x, y] of [[40, 6], [38, 16], [37, 26], [37.4, 36]]) s += `<ellipse cx="${x}" cy="${y}" rx="11" ry="6.6" fill="${cc}" stroke="${lineC}" stroke-width="1.6"/>`;
    s += shape('M24 48 C22 36 32 30 42 32 C54 34 60 44 56 56 C52 66 40 68 32 64 C26 61 24.6 55 24 48 Z', cc, lineC);
    s += tubeD('M44 64 C46 74 42 84 34 90 C30 93 26 94 22 92', c, 7.4);
    s += line('M44 66 C45.6 74 42 82 35.4 87.4', '#f6c27a', 0.9, 0.8);
    for (const [x, y] of [[50, 74], [28, 98], [18, 86], [46, 86]]) s += line(`M${x - 2} ${y} L${x + 2} ${y} M${x} ${y - 2} L${x} ${y + 2}`, c, 0.9); // inflammation marks
    return s;
  }, '#d5402f');
  set('s-colon-polyp', (c) => {
    // A colon segment opened along its length, showing the lining and a stalked (pedunculated) polyp.
    const cc = '#e9a6a4', lineC = tone(cc, -0.24, -0.06);
    let s = shape('M6 18 C30 12 80 12 104 18 L104 54 C80 60 30 60 6 54 Z', cc, lineC);
    s += flat('M10 24 C32 19 78 19 100 24 L100 48 C78 53 32 53 10 48 Z', tone(cc, -0.1));
    for (let x = 18; x < 100; x += 13) s += line(`M${x} 23 C${x - 3} 30 ${x - 3} 42 ${x} 49`, tone(cc, -0.2), 1); // semilunar folds
    s += line('M58 48 C58.6 42 59 38 58 34', tone(c, -0.25), 3.4) + line('M58 48 C58.6 42 59 38 58 34', tone(c, 0.05), 2);
    s += shape('M50 30 C50 22 66 22 66 30 C66 36 60 38 58 38 C56 38 50 36 50 30 Z', c, tone(c, -0.28), 1.6);
    return s;
  }, '#d97a6a');
  set('s-biliary-tree', (c) => {
    // Intrahepatic ducts converging on the common hepatic duct, gallbladder and cystic duct, common bile duct and the
    // pancreatic duct meeting at the ampulla in the second part of the duodenum.
    const lineC = tone(c, -0.26, -0.06);
    let s = fit(pancreas('#f0c06c'), 0.62, 0.62, 30, 60);
    const duct = (d, w) => line(d, lineC, w + 1.3) + line(d, c, w);
    s += duct('M14 10 C20 16 26 20 34 22 M10 26 C18 26 26 26 34 24 M24 4 C28 12 32 18 36 22 M58 4 C54 12 48 18 42 22 M74 12 C64 16 54 20 44 23 M70 30 C60 28 50 26 42 25', 2) + duct('M34 22 C37 23 40 24 44 23 M38 23 C38.6 30 38.6 36 38 42', 3);
    s += fit(gallbladder(c), 0.48, 0.48, 14, 19.4).replace(/<path d="M50 2[^>]*>/g, '');
    s += duct('M38 42 C37.4 54 38 66 41.6 80', 3.4);
    return s;
  }, BILE);

  globalThis.Organs = { brainSuperior, brainCoronal, headWithBrain, brainSagittal, brainLateral, MCA, lungsAnterior, heartAnterior, liverAnterior, kidney, kidneySection, BRAIN, LUNG, fit, tone };
})();
