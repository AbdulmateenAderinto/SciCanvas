// Refined icons, part 6: the biology icons that complete the reference sheets — immune cells and molecules, proteins,
// organ cancers and tumour histology, lab-mouse views, and nanoparticles (drawn with src/refinedkit.js).
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, path, rect, circ, ell, stroke, flat, dot, part, G, poly, smooth, wob, body, sball, speckle, tube, taper, wave, headRing, add } = K;
  const IMM = 'Immune cells', IMOL = 'Immune molecules', MOL = 'Molecules & proteins', ORG = 'Organs & cancers', ANI = 'Animal models', ENG = 'Engineering & biomaterials';
  const cell = (c, r, o) => (K.cell ? K.cell(c, r, o) : sball(o.cx ?? 50, o.cy ?? 50, o.R ?? 38, o.R ?? 38, c));
  const TAU = Math.PI * 2;
  // Cauliflower outline: rounded bumps with creases between them (tumours, protein surfaces).
  const lumpy = (cx, cy, rx, ry, r, bumps = 11, amp = 0.07, o = {}) => {
    const ph = r() * 6.3, ph2 = r() * 6.3;
    return wob(cx, cy, rx, ry, r, { amp: o.amp ?? 0.03, n: o.n ?? 180, rot: o.rot || 0, mod: (a) => amp * (Math.abs(Math.sin((bumps * a) / 2 + ph + 0.6 * Math.sin(3 * a + ph2))) ** 0.5 - 0.6) });
  };
  // Random tangled polymer strands inside a circle.
  const tangle = (cx, cy, R, n, r, colours, w = 1.5) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const pts = [];
      let a = r() * TAU, d = Math.sqrt(r()) * R * 0.85;
      for (let i = 0; i < 7; i++) { pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]); a += (r() - 0.5) * 2.2; d = Math.min(R * 0.95, Math.max(R * 0.1, d + (r() - 0.5) * R * 0.7)); }
      const c = colours[k % colours.length], d0 = smooth(pts, false);
      s += stroke(d0, line(c), w + 1) + stroke(d0, c, w);
    }
    return s;
  };
  const SKIN = '#f3d3bd', PINK = '#eeb2b4';

  // =====================================================================================
  // Immune cells
  // =====================================================================================
  add('Activated macrophage', IMM, 'activated macrophage spiky pseudopods phagocyte myeloid M1', '#a99ad8', [100, 100], (c, r) =>
    cell(c, r, { R: 31, shape: 'spikes', arms: 17, armLen: 0.42, armW: 0.07, amp: 0.02, nucleus: 'round', nx: 0, ny: 0, nr: 0.48, speckles: 14, vacuoles: 4 }));
  add('Degranulating mast cell', IMM, 'mast cell degranulation histamine release allergy anaphylaxis granules', '#9d8fd0', [120, 100], (c, r) => {
    let spray = '';
    for (let k = 0; k < 70; k++) {
      const side = k % 2 ? 1 : -1, a = (side > 0 ? 0 : Math.PI) + (r() - 0.5) * 1.8, d = 36 + r() * 22;
      spray += dot(60 + Math.cos(a) * d, 50 + Math.sin(a) * d * 0.8, 0.6 + r() * 1.2, D(c, 0.15), 0.5 + r() * 0.4);
    }
    return part('released granules', spray) + cell(c, r, { cx: 60, R: 32, shape: 'lumpy', nucleus: 'round', nx: 0, ny: 2, nr: 0.34, ncD: 0.05, speckles: 0, granules: 46, gs: 1, gd: 0.2, gc: D(c, 0.12), vacuoles: 2 })
      + part('vesicles', [[74, 36, 6], [46, 64, 4.5]].map(([x, y, v]) => circ(x, y, v, '#ffffff', { stroke: line(L(c, 0.3)), w: 0.7 }) + dot(x - 1, y + 1, 1.2, D(c, 0.15)) + dot(x + 1.5, y - 1, 1, D(c, 0.15))).join(''));
  });
  add('B cell with antibodies', IMM, 'B cell BCR membrane antibodies surface immunoglobulin lymphocyte', '#6fb0c8', [100, 100], (c, r) => {
    const ab = '#3f86c6', y = stroke('M0 0 V-7 M0 -7 L-4.5 -12.5 M0 -7 L4.5 -12.5', line(ab), 3.4) + stroke('M0 0 V-7 M0 -7 L-4.5 -12.5 M0 -7 L4.5 -12.5', ab, 1.8)
      + stroke('M-2.4 -8.6 L-5.6 -12.8 M2.4 -8.6 L5.6 -12.8', L(ab, 0.45), 1.2);
    return cell(c, r, { R: 26, nr: 0.66, nx: 0, ny: 0, speckles: 0, chromatin: false, amp: 0.012, pale: 0.5, deco: (x, yy, R, ry) => (K.cellAround ? K.cellAround(x, yy, R, ry, 8, y, 0) : '') });
  });
  add('Lymph node', IMM, 'lymph node lymphatic organ follicles germinal centre afferent efferent vessels', '#9cc25a', [100, 100], (c, r) => {
    const out = 'M54 8 C76 8 90 28 90 50 C90 74 76 92 54 92 C40 92 34 84 38 74 C42 64 46 58 46 50 C46 42 42 36 38 26 C34 16 40 8 54 8 Z';
    const vessels = [[[86, 26], [94, 18], [98, 10]], [[90, 46], [98, 44]], [[88, 70], [96, 76], [98, 86]], [[70, 10], [74, 3]], [[70, 90], [74, 98]]];
    return part('vessels', vessels.map((p) => stroke(smooth(p, false), L(c, 0.3), 3, {}) + stroke(smooth(p, false), L(c, 0.55), 1.4)).join('') + stroke('M40 50 C30 50 22 46 12 40 M40 54 C30 56 22 60 12 66', D(c, 0.05), 2.4) + stroke('M40 50 C30 50 22 46 12 40 M40 54 C30 56 22 60 12 66', L(c, 0.4), 1))
      + part('capsule', path(out, L(c, 0.55), { stroke: D(c, 0.12), w: 1.6 }))
      + part('cortex', path('M56 14 C74 14 84 30 84 50 C84 70 74 86 56 86 C46 86 42 80 44 74 C48 64 52 58 52 50 C52 42 48 34 45 26 C43 18 46 14 56 14 Z', L(c, 0.75), { stroke: L(c, 0.35), w: 0.8 }))
      + part('follicles', [[66, 20], [78, 34], [80, 56], [72, 76], [58, 82]].map(([x, y]) => circ(x, y, 5.4, L(c, 0.5), { stroke: L(c, 0.2), w: 0.7 }) + circ(x, y, 2.4, L(c, 0.3), { stroke: 'none', w: 0 })).join(''))
      + part('medulla', stroke('M56 50 C62 44 66 38 64 30 M56 50 C64 52 70 58 70 66 M56 50 H70', L(c, 0.35), 1.2));
  });

  // =====================================================================================
  // Immune molecules
  // =====================================================================================
  // TNF receptor after the reference: a trimer of stalks, each topped by stacked cysteine-rich domains.
  add('TNF receptor', IMOL, 'TNF receptor TNFR trimer death receptor cysteine-rich domains', '#8a3fa0', [100, 100], (c) => {
    const chain = (x, y0, col) => rect(x - 1.1, y0 + 36, 2.2, 92 - y0 - 36, 1.1, D(col, 0.1), { w: 0.6 })
      + [0, 1, 2, 3].map((k) => rect(x - 5, y0 + k * 9, 10, 9.4, 3.2, k % 2 ? L(col, 0.18) : col, { w: 0.8 })).join('') + ell(x, 93, 3, 2.4, D(col, 0.1), { w: 0.6 });
    return part('receptors', chain(38, 12, L(c, 0.1)) + chain(62, 12, L(c, 0.1)) + chain(50, 6, c));
  });
  // Cytokine storm: a funnel of grey swirls carrying many coloured cytokine dots.
  add('Cytokine storm', IMOL, 'cytokine storm cytokine release syndrome CRS hypercytokinemia inflammation', '#c94a4a', [120, 100], (c, r) => {
    let rings = '', dots = '';
    const cols = [c, '#2f8f8f', '#3d4f8f', '#e8a33d'];
    for (let k = 0; k < 9; k++) {
      const t = k / 8, cx = 58 + t * 12 + Math.sin(t * 5) * 4, cy = 14 + t * 74, rx = 50 * (1 - t * 0.85), ry = 6 * (1 - t * 0.6);
      rings += ell(cx, cy, rx, ry, 'none', { fill: 'none', stroke: '#b9c1c8', w: 1.1 });
      const n = Math.round(10 * (1 - t * 0.7));
      for (let i = 0; i < n; i++) { const a = r() * TAU; dots += circ(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 1.4 + r() * 1.6 * (1 - t * 0.5), cols[(i + k) % cols.length], { w: 0.5 }); }
    }
    return part('swirl', rings) + part('cytokines', dots);
  });

  // =====================================================================================
  // Molecules & proteins
  // =====================================================================================
  const knobbly = (cx, cy, rx, ry, c, r, n = 14) => {
    let s = body(lumpy(cx, cy, rx, ry, r, n, 0.09), c, { hi: 0.18, k: 0.85, off: 2 });
    for (let k = 0; k < 16; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.75; s += ell(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 3 + r() * 3, 2.4 + r() * 2.4, D(c, 0.08), { stroke: 'none', w: 0, op: 0.35, rot: r() * 180 }); }
    return s;
  };
  add('Protein (ball)', MOL, 'protein globular ball surface generic', '#5b7fcf', [100, 100], (c, r) => part('protein', knobbly(50, 50, 34, 32, c, r, 16)));
  add('Protein (cylinder)', MOL, 'protein cylinder elongated generic surface', '#6f58ad', [80, 100], (c, r) => part('protein', knobbly(40, 50, 24, 40, c, r, 18)));
  add('Polypeptide', MOL, 'polypeptide chain unfolded protein amino acid chain', '#5b2a8f', [100, 100], (c) => {
    const pts = [];
    for (let i = 0; i <= 90; i++) { const t = (i / 90) * TAU * 2; pts.push([50 + 26 * Math.sin(t * 0.9 + 0.4) + 12 * Math.sin(t * 2.6), 50 + 30 * Math.sin(t * 0.55 + 1.6) + 11 * Math.cos(t * 3.4)]); }
    return part('chain', tube(pts, 4.4, c, { hi: true }));
  });

  // =====================================================================================
  // Organs & cancers
  // =====================================================================================
  add('Melanoma', ORG, 'melanoma skin cancer mole nevus lesion pigmented', '#3b2723', [100, 100], (c, r) =>
    part('skin', circ(50, 50, 44, SKIN, { stroke: D(SKIN, 0.1), w: 0.8 }))
    + part('margin', path(smooth(wob(50, 50, 27, 25, r, { amp: 0.14, n: 40 })), '#8a5a43', { stroke: 'none', w: 0, op: 0.75 }))
    + part('lesion', path(smooth(wob(50, 50, 23, 21, r, { amp: 0.16, n: 46 })), c, { stroke: D(c, 0.2), w: 0.8 }) + speckle(50, 50, 18, 16, 26, '#9a6a54', r, { op: 0.6, min: 0.6, max: 1.6 })));
  add('Glioblastoma', ORG, 'glioblastoma GBM brain tumour glioma astrocytoma', '#8c7a90', [100, 100], (c, r) => {
    let rim = '';
    for (let k = 0; k < 90; k++) { const a = r() * TAU, d = 34 + r() * 7; rim += dot(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 0.7 + r() * 1, '#d1606a', 0.75); }
    return part('tissue', path(smooth(wob(50, 50, 42, 41, r, { amp: 0.03 })), '#f4c6b6', { stroke: '#dc9a8a' }) + path(smooth(wob(50, 50, 33, 32, r, { amp: 0.04 })), '#f9ddd2', { stroke: 'none', w: 0 }))
      + part('infiltrating cells', rim) + part('tumour', body(lumpy(50, 50, 20, 19, r, 9, 0.12), c, { hi: 0.15 }) + speckle(50, 50, 16, 15, 22, D(c, 0.25), r, { op: 0.6, min: 0.5, max: 1.2 }));
  });
  const lobules = (pts, c) => pts.map(([x, y, s]) => path(smooth(wob(x, y, s, s * 0.9, K.rng(K.hash(`${x},${y}`)), { amp: 0.08, n: 14 })), L(c, 0.22), { stroke: line(L(c, 0.2)), w: 0.6, op: 0.85 })).join('');
  add('Round tumour', ORG, 'round tumour tumor mass nodule neoplasm lobulated', '#f2aeb1', [100, 100], (c, r) =>
    part('mass', body(lumpy(50, 50, 41, 39, r, 12, 0.08), c, { hi: 0.12, k: 0.92, off: 1.4 }))
    + part('lobules', lobules([[36, 32, 9], [56, 26, 8], [70, 42, 9], [44, 52, 10], [62, 64, 9], [32, 70, 8], [24, 48, 7], [50, 76, 7], [74, 66, 6]], c)));
  add('Round tumour (cross-section)', ORG, 'tumour cross-section cut surface lobulated mass', '#d79fa4', [100, 90], (c, r) =>
    part('mass', body(lumpy(50, 45, 43, 34, r, 11, 0.07), c, { hi: 0.12, k: 0.92, off: 1.4 }))
    + part('fissures', stroke('M18 38 C28 34 34 42 44 38 C52 34 56 26 66 30 M44 38 C46 48 40 56 46 64 M66 30 C70 40 80 42 86 48 M46 64 C56 60 64 66 72 60 M30 52 C34 58 30 64 34 70 M60 46 C64 52 62 56 66 60', D(c, 0.22), 1.3)));
  add('Round tumour (necrosis)', ORG, 'tumour necrotic core necrosis hypoxia mass', '#d7737a', [100, 100], (c, r) =>
    part('viable rim', body(lumpy(50, 50, 41, 39, r, 12, 0.08), c, { hi: 0.15, k: 0.92, off: 1.4 }))
    + part('necrotic core', path(smooth(wob(50, 51, 25, 23, r, { amp: 0.16, n: 40 })), '#5a2a2c', { stroke: D(c, 0.3), w: 0.8 }) + path(smooth(wob(51, 52, 18, 16, r, { amp: 0.2, n: 36 })), '#2f1b1d', { stroke: 'none', w: 0 })
      + speckle(50, 52, 22, 20, 20, '#c0454f', r, { op: 0.8, min: 0.6, max: 1.6 })));
  add('Liver cancer', ORG, 'liver cancer hepatocellular carcinoma HCC metastasis segments gallbladder', '#a55a46', [120, 90], (c, r) =>
    part('gallbladder', path('M58 60 C56 70 60 80 68 80 C76 80 78 70 72 62 Z', '#7fb069', { stroke: '#5a8c4a' }))
    + part('liver', path('M8 34 C8 16 26 8 50 9 C72 10 96 12 112 16 C119 18 118 27 110 30 C96 36 86 44 74 54 C62 64 46 78 30 80 C16 80 8 68 8 52 Z', c) + flat('M14 30 C18 18 34 13 52 13 C36 16 22 22 14 30 Z', '#ffffff', 0.2))
    + part('segments', stroke('M48 10 C46 30 48 50 44 74 M20 44 C36 42 52 44 72 50 M74 14 C72 26 76 36 84 40', D(c, 0.25), 0.9, { dash: '2.4 1.8' }))
    + part('tumours', body(lumpy(32, 28, 11, 10, r, 7, 0.1), '#ecc3ae', { hi: 0.12 }) + body(lumpy(88, 24, 7, 6.5, r, 6, 0.1), '#ecc3ae', { hi: 0.12 }) + body(lumpy(30, 60, 5, 5, r, 5, 0.1), '#ecc3ae', { hi: 0.12 })));
  add('Lung cancer', ORG, 'lung cancer NSCLC carcinoma tumour lungs bronchi trachea', '#eaa7ac', [100, 100], (c, r) => {
    const airway = '#5b8fd6';
    return part('lungs', path('M42 22 C30 22 16 40 12 62 C8 82 14 94 26 94 C36 94 44 88 44 76 Z', c) + path('M58 22 C70 22 84 40 88 62 C92 82 86 94 74 94 C66 94 60 90 58 84 C62 80 60 74 56 72 Z', c)
      + flat('M36 30 C26 36 18 50 16 64 C22 48 28 38 36 30 Z', '#ffffff', 0.35) + flat('M64 30 C72 36 80 46 84 60 C78 48 72 38 64 30 Z', '#ffffff', 0.35) + stroke('M14 62 C24 60 34 62 44 58 M86 56 C76 54 66 58 58 54 M88 72 C78 72 70 74 62 70', D(c, 0.18), 0.8))
      + part('airways', stroke('M50 4 V36 M50 36 C46 42 40 46 34 54 M50 36 C54 42 60 46 66 54 M40 46 L30 46 M60 46 L72 44', line(airway), 5.4) + stroke('M50 4 V36 M50 36 C46 42 40 46 34 54 M50 36 C54 42 60 46 66 54 M40 46 L30 46 M60 46 L72 44', airway, 3.6)
        + [8, 13, 18, 23, 28].map((y) => stroke(`M47.4 ${y} H52.6`, L(airway, 0.45), 1.1)).join(''))
      + part('tumour', body(lumpy(72, 74, 7.5, 7, r, 7, 0.12), '#b5434b', { hi: 0.15 }));
  });
  // Colon: a bead chain (haustra) along the frame of the large intestine.
  const colonPath = [[30, 90], [24, 76], [22, 56], [22, 34], [26, 20], [40, 16], [60, 18], [76, 16], [82, 28], [80, 48], [80, 66], [74, 80], [62, 84], [56, 92], [56, 98]];
  add('Colon cancer', ORG, 'colon cancer colorectal large intestine tumour polyp', '#f0bab0', [100, 100], (c, r) => {
    const pts = [], d = smooth(colonPath, false);
    for (let i = 0; i < colonPath.length - 1; i++) for (let k = 0; k < 3; k++) { const t = k / 3, a = colonPath[i], b = colonPath[i + 1]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    return part('colon', stroke(d, line(c), 16) + stroke(d, c, 13.6) + pts.map(([x, y], i) => ell(x, y, 7.2, 7, i % 2 ? c : L(c, 0.08), { w: 0.9 })).join('') + stroke(d, L(c, 0.3), 3, { op: 0.6 }))
      + part('tumour', body(lumpy(84, 40, 5.5, 5.5, r, 6, 0.12), '#b5434b', { hi: 0.15 }));
  });
  add('Colon carcinoma', ORG, 'colon carcinoma colorectal adenocarcinoma polyp bowel wall cross-section', '#f2dc8c', [100, 90], (c, r) =>
    part('muscularis', path('M8 84 C8 36 28 8 50 8 C72 8 92 36 92 84 Z', '#c66a72'))
    + part('submucosa', path('M15 84 C15 42 32 16 50 16 C68 16 85 42 85 84 Z', '#f0c3bd', { stroke: '#d38c88' }))
    + part('mucosa', path('M22 84 C22 50 36 26 50 26 C64 26 78 50 78 84 Z', '#fbe9e4', { stroke: '#e1aaa4' }))
    + part('carcinoma', body(lumpy(50, 52, 22, 24, r, 10, 0.1), c, { hi: 0.15 }) + lobules([[44, 42, 6], [56, 40, 6], [50, 54, 7], [40, 60, 5], [60, 60, 6]], c))
    + part('base', stroke('M44 78 L50 84 L56 78 M34 84 H66', '#c9a3a0', 0.9, { dash: '1.6 1.6' })));
  add('Kidney cancer', ORG, 'kidney cancer renal cell carcinoma RCC tumour nephrectomy', '#cf7a5a', [100, 100], (c, r) =>
    part('vessels', stroke('M64 44 C76 44 84 40 96 38', line(PAL.vessel), 6.4) + stroke('M64 44 C76 44 84 40 96 38', PAL.vessel, 4.6) + stroke('M64 52 C76 54 84 52 96 52', line(PAL.vein), 6.4) + stroke('M64 52 C76 54 84 52 96 52', PAL.vein, 4.6)
      + stroke('M62 62 C70 70 70 84 68 98', '#c99a3a', 5) + stroke('M62 62 C70 70 70 84 68 98', '#f0c75a', 3.4))
    + part('cortex', path('M56 6 C28 6 12 28 12 50 C12 76 30 94 54 94 C70 94 74 82 66 72 C60 64 60 38 66 28 C74 18 72 6 56 6 Z', c))
    + part('medulla', [[34, 26, 35], [28, 44, 5], [30, 62, -25], [44, 18, 65]].map(([x, y, a]) => G(path('M-6 -5 L7 0 L-6 5 C-8.5 2 -8.5 -2 -6 -5 Z', D(c, 0.15), { w: 0.8 }), `translate(${x} ${y}) rotate(${a})`)).join(''))
    + part('pelvis', path('M64 30 C54 32 44 40 42 50 C44 60 54 66 64 68 C60 60 58 40 64 30 Z', '#f3d27a', { stroke: '#c99a3a' }))
    + part('tumour', body(lumpy(34, 76, 13, 12, r, 8, 0.1), '#f1dcae', { hi: 0.15 }) + lobules([[30, 74, 4], [38, 79, 4], [34, 70, 3]], '#e9c98a')));
  add('Breast cancer', ORG, 'breast cancer tumour mammary gland sagittal lobules ducts', '#f4d27a', [80, 100], (c, r) => {
    let lob = '';
    [[36, 30], [46, 40], [40, 54], [52, 58], [44, 70], [32, 78], [30, 44], [56, 46]].forEach(([x, y]) => { for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; lob += circ(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, '#e8b04c', { w: 0.5 }); } lob += stroke(`M${x} ${y} L68 62`, '#e4a64a', 0.7); });
    return part('chest wall', rect(2, 2, 12, 96, 2, '#c8665e') + stroke('M4 20 H12 M4 40 H12 M4 60 H12 M4 80 H12', '#a8504a', 1))
      + part('skin', path('M14 4 H24 C34 18 62 32 70 54 C74 64 74 70 70 76 C62 90 44 96 24 96 H14 Z', SKIN, { stroke: '#dba48a' }))
      + part('fat', path('M14 10 H24 C34 22 58 34 64 54 C68 64 66 72 62 78 C54 88 40 92 24 92 H14 Z', c, { stroke: 'none', w: 0 }) + speckle(40, 56, 20, 30, 20, L(c, 0.35), r, { op: 0.8, min: 1.6, max: 3.2 }))
      + part('lobules and ducts', lob) + part('nipple', ell(71, 62, 3, 4, '#c98272'))
      + part('tumour', body(lumpy(36, 34, 8, 7.5, r, 7, 0.12), '#c0414a', { hi: 0.15 }));
  });
  add('Prostate cancer', ORG, 'prostate cancer adenocarcinoma bladder urethra tumour', '#e9a39e', [100, 100], (c, r) =>
    part('ureters', stroke('M22 26 C16 18 12 10 10 4 M78 26 C84 18 88 10 90 4', '#c9a07a', 3.4) + stroke('M22 26 C16 18 12 10 10 4 M78 26 C84 18 88 10 90 4', '#f2d6b6', 2))
    + part('bladder', path('M18 30 C18 18 34 14 50 14 C66 14 82 18 82 30 C82 50 70 62 50 62 C30 62 18 50 18 30 Z', c) + path('M26 30 C26 22 38 20 50 20 C62 20 74 22 74 30 C74 46 64 54 50 54 C36 54 26 46 26 30 Z', L(c, 0.3), { stroke: line(L(c, 0.1)), w: 0.8 }))
    + part('prostate', path('M30 66 C30 58 40 56 50 58 C60 56 70 58 70 66 C70 80 62 88 50 88 C38 88 30 80 30 66 Z', '#d98d7c'))
    + part('urethra', stroke('M50 56 V98', '#f2d6b6', 3) + stroke('M50 56 V98', '#e8b8a0', 1))
    + part('tumours', body(lumpy(39, 74, 6, 5.5, r, 6, 0.12), '#5d3a3a', { hi: 0.15 }) + body(lumpy(61, 72, 4.5, 4.2, r, 5, 0.12), '#5d3a3a', { hi: 0.15 })));
  add('Endometrial cancer', ORG, 'endometrial cancer uterine cancer uterus endometrium ovaries fallopian tubes', '#e79aa2', [120, 90], (c, r) =>
    part('fallopian tubes', stroke('M44 22 C34 14 22 12 14 20 C10 24 10 30 14 34 M76 22 C86 14 98 12 106 20 C110 24 110 30 106 34', line(c), 4.6) + stroke('M44 22 C34 14 22 12 14 20 C10 24 10 30 14 34 M76 22 C86 14 98 12 106 20 C110 24 110 30 106 34', c, 3)
      + stroke('M12 34 l-3 4 M14 35 l0 5 M16 34 l3 4 M108 34 l3 4 M106 35 l0 5 M104 34 l-3 4', c, 1.4))
    + part('ovaries', ell(26, 30, 7, 4.6, '#f2c9b7', { rot: 20 }) + ell(94, 30, 7, 4.6, '#f2c9b7', { rot: -20 }))
    + part('uterus', path('M40 16 C40 10 80 10 80 16 C80 34 70 48 66 56 V78 C66 86 54 86 54 78 V56 C50 48 40 34 40 16 Z', c) + path('M47 20 H73 C70 32 64 42 60 52 C56 42 50 32 47 20 Z', L(c, 0.45), { stroke: line(L(c, 0.15)), w: 0.8 }) + stroke('M60 56 V80', D(c, 0.15), 1))
    + part('tumour', body(lumpy(63, 28, 6.5, 6, r, 6, 0.12), '#8e2f3a', { hi: 0.15 })));
  add('Tumour cells (cluster)', ORG, 'tumour cells cluster cancer cells aggregate neoplastic', '#e7a3a0', [100, 100], (c, r) => {
    const pos = [[50, 50], [30, 40], [70, 40], [40, 70], [64, 70], [50, 26], [26, 62], [76, 58], [34, 20], [68, 22], [52, 84], [18, 44], [84, 36], [80, 78], [22, 80]];
    pos.sort((a, b) => a[1] - b[1]);
    return part('cells', pos.map(([x, y], i) => cell(i % 3 ? c : D(c, 0.06), r, { cx: x, cy: y, R: 12.5 + r() * 2.5, shape: 'ruffled', amp: 0.06, nucleus: 'irregular', nx: 0, ny: 0, nr: 0.5, ncD: 0.12, speckles: 3, chromatin: false, pale: 0.3 })).join(''));
  });
  add('Squamous tumour cells', ORG, 'squamous cell carcinoma tumour cells keratinocytes spindle SCC', '#d89aa3', [100, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 44; k++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 30, x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d, rot = (a * 180) / Math.PI + 90 + (r() - 0.5) * 50;
      s += G(path('M-14 0 C-8 -6.5 8 -6.5 14 0 C8 6.5 -8 6.5 -14 0 Z', k % 2 ? c : L(c, 0.15), { w: 0.9 }) + ell(0, 0, 4.4, 2.2, D(c, 0.25), { w: 0.5 }), `translate(${f(x)} ${f(y)}) rotate(${f(rot)})`);
    }
    return part('stroma', circ(50, 50, 44, L(c, 0.65), { stroke: L(c, 0.2), w: 0.8 })) + part('cells', s);
  });
  add('Breast ductal cancer', ORG, 'breast ductal carcinoma DCIS duct cribriform tumour cells', '#c2393f', [100, 100], (c, r) => {
    let wall = '', tum = '';
    for (let k = 0; k < 30; k++) { const a = (k / 30) * TAU; wall += G(ell(0, 0, 5, 3, '#f0b6a8', { w: 0.6 }) + dot(0, 0.4, 1.4, '#c9786a'), `translate(${f(50 + Math.cos(a) * 36)} ${f(50 + Math.sin(a) * 36)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    for (let k = 0; k < 70; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 30; const x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d; if ([[40, 42], [60, 58], [58, 36], [38, 62]].some(([lx, ly]) => Math.hypot(x - lx, y - ly) < 6.5)) continue; tum += circ(x, y, 3 + r() * 0.8, k % 3 ? c : D(c, 0.1), { w: 0.5 }) + dot(x + 0.4, y + 0.3, 1.1, D(c, 0.35)); }
    return part('stroma', circ(50, 50, 46, '#f8e2d6', { stroke: '#e5bba8' })) + part('basement membrane', circ(50, 50, 40, '#fdf3ee', { stroke: '#d79b86', w: 1.2 }))
      + part('lumen', [[40, 42], [60, 58], [58, 36], [38, 62]].map(([x, y]) => circ(x, y, 5, '#ffffff', { stroke: '#e5bba8', w: 0.6 })).join(''))
      + part('duct epithelium', wall) + part('tumour cells', tum);
  });

  // =====================================================================================
  // Animal models (lab mice and rats; the side views live in refined4.js)
  // =====================================================================================
  const paw = (x, y, rot = 0, s = 1) => G(ell(0, 0, 2.6 * s, 2 * s, PINK, { w: 0.6 }) + stroke(`M-1.8 -1.6 l-1 -${f(2 * s)} M0 -2 l0 -${f(2.4 * s)} M1.8 -1.6 l1 -${f(2 * s)}`, D(PINK, 0.1), 1), `translate(${f(x)} ${f(y)}) rotate(${f(rot)})`);
  const face = (x, y, flip = 1) => circ(x, y, 1.9, '#8c2335', { w: 0.5 }) + dot(x - 0.5 * flip, y - 0.6, 0.6, '#ffffff');
  const whisk = (x, y, dir) => stroke(`M${x} ${y} l${9 * dir} -4 M${x} ${y + 1} l${10 * dir} 0 M${x} ${y + 2} l${9 * dir} 4`, '#9aa3ab', 0.4);
  // Sitting mouse facing left: hunched pear-shaped body, forepaws held up at the chest, long tail along the floor.
  const sitting = (c, o = {}) => {
    const e = o.ear ?? 1;
    return part('tail', path(taper([[84, 60], [94, 68], [108, 69], [120, 63], [126, 56]], o.tail ?? 4, 0.9), PINK, { w: 0.7 }))
      + part('feet', path('M50 66 C56 65 66 66 70 67 C72 69 70 71 66 71 L52 70 C48 70 48 67 50 66 Z', PINK, { w: 0.7 }))
      + part('body', path('M14 44 C16 38 22 33 30 31 C36 21 50 17 62 19 C80 21 89 34 89 48 C89 61 80 68 67 68 L46 68 C38 68 35 62 37 56 C30 54 24 51 20 49 C16 48 14 46 14 44 Z', c) + flat('M38 26 C46 20 58 19 68 22 C58 22 46 24 38 26 Z', '#ffffff', 0.45) + stroke('M72 36 C62 42 58 56 64 67', line(c), 0.9, { op: 0.5 }))
      + part('ear', ell(37, 25, 7 * e, 8.5 * e, c, { rot: -12 }) + ell(36.6, 25.6, 4.4 * e, 6 * e, PINK, { stroke: 'none', w: 0, rot: -12 }))
      + part('forepaws', paw(32, 56, 160, 0.8) + paw(38, 58, 170, 0.8))
      + part('face', face(25, 38) + ell(14.5, 44, 1.8, 1.5, '#e98b97', { w: 0.5 }) + whisk(18, 44, -1));
  };
  add('Mouse (sitting)', ANI, 'mouse lab mouse sitting rodent animal model albino BALB/c', '#eceae8', [130, 80], (c) => sitting(c));
  add('Rat (sitting)', ANI, 'rat sitting rodent animal model Wistar Sprague Dawley', '#ebe7e1', [130, 80], (c) => G(sitting(c, { ear: 0.75, tail: 5.4 }), 'translate(-6 -10) scale(1.08 1.12)'));
  add('Mouse (walking)', ANI, 'mouse walking lab mouse rodent animal model behaviour', '#eceae8', [130, 80], (c) => {
    const leg = (pts, w0) => path(taper(pts, w0, 3), c, { w: 0.9 });
    return part('tail', path(taper([[28, 36], [16, 30], [9, 18], [12, 7], [22, 3]], 4, 0.9), PINK, { w: 0.7 }))
      + part('far legs', leg([[50, 46], [56, 58], [60, 67]], 7) + leg([[94, 46], [99, 57], [104, 65]], 5.5))
      + part('near legs', leg([[40, 44], [34, 56], [26, 66]], 10) + leg([[86, 46], [84, 57], [80, 66]], 6))
      + part('feet', paw(24, 68, 100) + paw(61, 69, 80) + paw(79, 68, 90) + paw(105, 67, 70))
      + part('body', path('M121 46 C117 41 111 37 104 36 C99 29 90 26 81 28 C66 21 44 21 32 29 C22 35 22 47 30 51 C36 55 44 53 52 53 L80 53 C88 53 94 51 100 50 C108 49 117 48 121 46 Z', c) + flat('M36 31 C46 26 60 25 72 27 C60 28 46 29 36 31 Z', '#ffffff', 0.45))
      + part('ear', ell(97, 31, 6.4, 7.8, c, { rot: -15 }) + ell(97.5, 31.6, 4, 5.4, PINK, { stroke: 'none', w: 0, rot: -15 }))
      + part('face', face(109, 40, -1) + ell(120.4, 46, 1.7, 1.4, '#e98b97', { w: 0.5 }) + whisk(117, 46, 1));
  });
  // Dorsal views: head at the top with a pointed snout, small ears, elongated body, long tail down.
  add('Mouse (dorsal)', ANI, 'mouse dorsal top view spread prone surgery rodent animal model', '#eceae8', [90, 130], (c) => {
    const limb = (pts) => path(taper(pts, 8, 3.4), c, { w: 0.9 });
    return part('tail', path(taper([[45, 96], [46, 108], [44, 118], [46, 128]], 4.4, 1), PINK, { w: 0.7 }))
      + part('limbs', limb([[38, 36], [24, 32], [12, 26]]) + limb([[52, 36], [66, 32], [78, 26]]) + limb([[36, 82], [24, 90], [16, 100]]) + limb([[54, 82], [66, 90], [74, 100]]))
      + part('paws', paw(10, 24, -70) + paw(80, 24, 70) + paw(14, 103, -140) + paw(76, 103, 140))
      + part('ears', ell(35, 21, 5, 4, PINK, { rot: -30 }) + ell(55, 21, 5, 4, PINK, { rot: 30 }))
      + part('body', path('M45 3 C49 3 53 10 55 18 C58 22 60 26 58 30 C64 38 66 54 64 70 C63 84 58 94 45 98 C32 94 27 84 26 70 C24 54 26 38 32 30 C30 26 32 22 35 18 C37 10 41 3 45 3 Z', c) + flat('M40 34 C42 50 42 70 40 86 C36 72 36 50 40 34 Z', '#ffffff', 0.4))
      + part('face', dot(40, 15, 1.2, '#8c2335') + dot(50, 15, 1.2, '#8c2335') + ell(45, 3.6, 1.6, 1.3, '#e98b97', { w: 0.5 }) + stroke('M43 6 l-8 -2 M43 7 l-8 2 M47 6 l8 -2 M47 7 l8 2', '#9aa3ab', 0.4));
  });
  add('Mouse (dorsal, walking)', ANI, 'mouse dorsal top view walking rodent animal model', '#eceae8', [70, 130], (c) =>
    part('tail', path(taper([[34, 92], [38, 104], [30, 114], [34, 128]], 4.2, 1), PINK, { w: 0.7 }))
    + part('paws', paw(18, 38, -60, 0.9) + paw(52, 32, 50, 0.9) + paw(16, 82, -110, 1) + paw(54, 88, 120, 1))
    + part('ears', ell(25, 21, 5, 4, PINK, { rot: -30 }) + ell(43, 19, 5, 4, PINK, { rot: 30 }))
    + part('body', path('M35 2 C39 3 42 9 44 16 C47 20 48 24 46 28 C52 36 54 52 52 68 C51 82 46 92 33 94 C22 92 18 82 18 68 C17 52 20 38 24 30 C22 26 23 21 26 17 C28 9 31 2 35 2 Z', c) + flat('M30 34 C32 50 32 68 30 82 C26 70 26 50 30 34 Z', '#ffffff', 0.4))
    + part('face', dot(30.5, 14, 1.2, '#8c2335') + dot(40, 13.5, 1.2, '#8c2335') + ell(35, 2.8, 1.6, 1.3, '#e98b97', { w: 0.5 })));
  add('Mouse (crouching, front)', ANI, 'mouse crouching front view huddled rodent animal model', '#eceae8', [100, 90], (c) =>
    part('tail', path(taper([[80, 66], [90, 72], [92, 82], [84, 88], [74, 88]], 4, 0.9), PINK, { w: 0.7 }))
    + part('body', path('M30 36 C32 18 48 10 62 12 C80 14 90 30 88 50 C86 68 74 76 60 76 L40 76 C30 72 26 56 30 36 Z', c) + flat('M44 18 C54 14 66 15 74 20 C64 18 54 18 44 18 Z', '#ffffff', 0.45))
    + part('hind feet', path('M58 74 C64 73 72 74 74 76 C74 79 70 80 66 79 L58 78 Z', PINK, { w: 0.7 }))
    + G(part('ears', ell(25, 42, 7, 8, c, { rot: -25 }) + ell(25.4, 42.6, 4.4, 5.4, PINK, { stroke: 'none', w: 0, rot: -25 }) + ell(51, 40, 7, 8, c, { rot: 25 }) + ell(50.6, 40.6, 4.4, 5.4, PINK, { stroke: 'none', w: 0, rot: 25 }))
    + part('head', path('M38 44 C46 44 52 50 52 58 C52 66 44 74 38 76 C32 74 24 66 24 58 C24 50 30 44 38 44 Z', c) + flat('M30 50 C34 46 40 46 44 48 C38 48 34 48 30 50 Z', '#ffffff', 0.45))
    + part('forepaws', paw(31, 79, 180, 0.8) + paw(45, 79, 180, 0.8))
    + part('face', face(32, 58) + face(44, 58) + ell(38, 73.4, 1.7, 1.4, '#e98b97', { w: 0.5 }) + whisk(35, 72, -1) + whisk(41, 72, 1)), 'translate(38 62) scale(0.86) translate(-38 -62)'));
  const side = (c) => (K.mouseSide ? K.mouseSide(c) : '');
  add('Mouse with organs', ANI, 'mouse anatomy internal organs brain heart lungs liver stomach intestine kidney', '#e2e2e4', [110, 100], (c) => {
    const gut = 'M60 52 C56 48 50 49 50 53 C50 57 56 58 57 55 M50 53 C46 49 40 50 40 54 C40 58 46 60 48 57 C50 61 56 62 58 59 M40 54 C36 54 34 58 36 61 C38 63 44 63 46 61';
    return side(c) + part('brain', ell(89, 41.5, 5, 3, '#e9a6a6', { rot: -14 }) + stroke('M86.5 41.5 c1 1.6 2.6 1.6 3.4 0 M90.5 40.5 c1 1.6 2.6 1.6 3.4 0', D('#e9a6a6', 0.2), 0.6))
      + part('oesophagus', stroke('M99 53 C90 54 78 50 64 46', '#e98b97', 1.8))
      + part('lungs', ell(76, 46, 5, 4.4, '#f2b8bd', { rot: -10 })) + part('heart', path('M75 52 C73 49 76 47.5 78 50 C80 47.5 83 49 81 52 L78 56 Z', '#c8414b', { w: 0.8 }))
      + part('kidney', ell(52, 40, 3.2, 2.3, '#a8423f'))
      + part('liver', path('M64 46 C69 45 73 48 72 53 C71 58 66 59 62 57 C59 55 60 47 64 46 Z', '#9c3b3b'))
      + part('stomach', path('M56 42 C61 39 66 43 64 48 C62 51 57 51 55 48 C54 46 54 44 56 42 Z', '#e7a9a0') + ell(60, 48.6, 2.6, 1.6, '#f1c34a', { w: 0.5 }))
      + part('intestines', stroke(gut, '#d98585', 3.8) + stroke(gut, '#f2aaa8', 2.4))
      + part('bladder', ell(32, 56, 3, 2.6, '#f1d27a', { w: 0.6 }));
  });
  add('Mouse with tumours', ANI, 'mouse tumour xenograft subcutaneous tumor bearing mouse cancer model', '#eceae8', [110, 100], (c, r) =>
    side(c) + part('tumours', body(lumpy(46, 30, 9, 7, r, 6, 0.1), '#f2c8c6', { hi: 0.2, stroke: '#d08c8c' }) + body(lumpy(64, 60, 7, 5.5, r, 5, 0.1), '#f2c8c6', { hi: 0.2, stroke: '#d08c8c' })
      + stroke('M42 28 c2 2 4 1 6 3 M62 59 c2 1 3 0 5 2', '#d0454c', 0.6, { op: 0.7 })));

  // =====================================================================================
  // Nanoparticles
  // =====================================================================================
  add('Gold particle', ENG, 'gold nanoparticle AuNP sphere plasmonic glow colloidal gold', '#f2c21b', [100, 100], (c) =>
    part('glow', circ(50, 50, 46, L(c, 0.7), { stroke: 'none', w: 0, op: 0.35 }) + circ(50, 50, 41, L(c, 0.55), { stroke: 'none', w: 0, op: 0.5 }))
    + part('sphere', circ(50, 50, 34, c, { stroke: D(c, 0.18) }) + flat('M50 16 A34 34 0 0 1 50 84 A26 34 0 0 0 50 16 Z', D(c, 0.08), 0.6) + circ(46, 46, 26, L(c, 0.18), { stroke: 'none', w: 0, op: 0.7 }) + ell(38, 34, 8, 4.6, '#ffffff', { stroke: 'none', w: 0, op: 0.65, rot: -35 })));
  add('Nanoparticle with drug', ENG, 'nanoparticle drug loaded nanocarrier polymer encapsulated drug delivery', '#9a8fd0', [100, 100], (c, r) =>
    part('polymer', tangle(50, 50, 40, 26, r, [c, L(c, 0.2)], 1.3)) + part('drug', [[38, 40, 7], [62, 44, 6.5], [48, 64, 7]].map(([x, y, s]) => sball(x, y, s, s, '#b8302f', { shine: true })).join('')));
  add('Solid lipid nanoparticle', ENG, 'solid lipid nanoparticle SLN lipid core drug delivery', '#f0a020', [100, 100], (c) => {
    let s = '';
    for (const [rad, n, tl] of [[42, 44, 8], [31, 32, 7], [20, 20, 6]]) s += headRing(50, 50, rad, n, rad === 31 ? '#e8576f' : c, '#f2c46a', { tail: tl, hr: 1.8, tw: 0.8 });
    return part('fringe', Array.from({ length: 30 }, (_, k) => { const a = (k / 30) * TAU; return wave(50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44, 50 + Math.cos(a) * 49, 50 + Math.sin(a) * 49, 0.8, 1.5, '#a9b3bd', 0.6); }).join(''))
      + part('core', circ(50, 50, 44, '#fff7e8', { stroke: '#efd7a6', w: 0.6 })) + part('lipids', s)
      + part('micelles', [[50, 50], [40, 56]].map(([x, y]) => headRing(x, y, 4.5, 10, '#e36d6d', '#f2c46a', { tail: 3, hr: 1.2, tw: 0.6 })).join(''));
  });
  add('Mesoporous nanoparticle', ENG, 'mesoporous silica nanoparticle MSN pores drug loading', '#6cbf6a', [100, 100], (c) => {
    let pores = '';
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const u = (j + (i % 2 ? 0.5 : 0)) / 4.9, v = (i * 0.866) / 4.9, d = Math.hypot(u, v);
      if (d > 0.92) continue;
      const k = Math.sqrt(1 - d * d), a = Math.atan2(v, u);
      pores += ell(50 + u * 38, 50 + v * 38, 2.7 * Math.max(0.35, k), 2.7, D(c, 0.3), { stroke: 'none', w: 0, rot: (a * 180) / Math.PI, op: 0.85 });
    }
    return part('sphere', sball(50, 50, 40, 40, c, { hi: 0.15 })) + part('pores', pores);
  });
  add('Polymeric nanoparticle (2 colours)', ENG, 'polymeric nanoparticle copolymer two polymers blend PLGA PEG', '#b0323a', [100, 100], (c, r) =>
    part('polymer A', tangle(50, 50, 40, 16, r, [c], 1.4)) + part('polymer B', tangle(50, 50, 40, 14, r, ['#2f5f9e'], 1.4)));
  add('Polymeric micelle', ENG, 'polymeric micelle block copolymer core corona amphiphilic', '#3a9a9a', [100, 100], (c) => {
    let s = '', core = '';
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      core += wave(50 + ca * 7, 50 + sa * 7, 50 + ca * 17, 50 + sa * 17, 1.2, 2, '#d6457a', 1);
      s += wave(50 + ca * 17, 50 + sa * 17, 50 + ca * 45, 50 + sa * 45, 1.8, 5, c, 1);
    }
    return part('corona', s) + part('core', core + circ(50, 50, 17, 'none', { fill: 'none', stroke: '#d6457a', w: 0.8 }));
  });
  // Buckyball: the 60 vertices of a truncated icosahedron, rotated and projected; back edges fainter.
  add('Buckyball', ENG, 'buckyball fullerene C60 buckminsterfullerene carbon cage', '#3f6fb0', [100, 100], (c) => {
    const p = (1 + Math.sqrt(5)) / 2, base = [[0, 1, 3 * p], [1, 2 + p, 2 * p], [p, 2, 2 * p + 1]], V = [];
    for (const b of base) for (let s = 0; s < 8; s++) {
      const v = b.map((x, i) => (s >> i) & 1 ? -x : x);
      if (b[0] === 0 && s & 1) continue;
      for (let k = 0; k < 3; k++) V.push([v[k % 3], v[(k + 1) % 3], v[(k + 2) % 3]]);
    }
    const ax = 0.5, ay = 0.35, R = V.map(([x, y, z]) => { const y1 = y * Math.cos(ax) - z * Math.sin(ax), z1 = y * Math.sin(ax) + z * Math.cos(ax); return [x * Math.cos(ay) + z1 * Math.sin(ay), y1, -x * Math.sin(ay) + z1 * Math.cos(ay)]; });
    const k = 40 / Math.hypot(...V[0]), P = R.map(([x, y, z]) => [50 + x * k, 50 + y * k, z]);
    let back = '', front = '', nodes = '';
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
      if (Math.abs(Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]) - 2) > 0.01) continue;
      const seg = `M${f(P[i][0])} ${f(P[i][1])} L${f(P[j][0])} ${f(P[j][1])}`;
      if (P[i][2] + P[j][2] < 0) back += stroke(seg, L(c, 0.55), 0.9); else front += stroke(seg, c, 1.4);
    }
    P.forEach(([x, y, z]) => { if (z >= 0) nodes += circ(x, y, 1.5, D(c, 0.1), { w: 0.4 }); });
    return part('back', back) + part('front', front) + part('atoms', nodes);
  });
  add('Quantum dot nanocrystal', ENG, 'quantum dot nanocrystal core shell ligands CdSe ZnS fluorescent', '#d8403a', [100, 100], (c) => {
    const lig = '#3f75c4';
    let ligs = '';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; ligs += G(path('M-7 0 C-7 -6 -4 -9 -3 -10 C-6 -12 -5 -17 0 -17 C5 -17 6 -12 3 -10 C4 -9 7 -6 7 0 Z', lig, { w: 0.9 }), `translate(${f(50 + Math.cos(a) * 30)} ${f(50 + Math.sin(a) * 30)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    return part('ligands', ligs + circ(50, 50, 32, lig, { w: 0.9 })) + part('outer shell', circ(50, 50, 28, '#bfe3f2', { stroke: '#7fb6d1' }))
      + part('shell', circ(50, 50, 22, '#f6d76a', { stroke: '#d9b240' }) + circ(50, 50, 17, '#f39c3c', { stroke: '#cf7f28' })) + part('core', sball(50, 50, 12, 12, c, { shine: true }));
  });
  add('Polymersome', ENG, 'polymersome polymer vesicle block copolymer bilayer', '#d0464f', [100, 100], (c) => {
    let s = '';
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * TAU, ca = Math.cos(a), sa = Math.sin(a), l = (r0, r1) => `M${f(50 + ca * r0)} ${f(50 + sa * r0)} L${f(50 + ca * r1)} ${f(50 + sa * r1)}`;
      s += stroke(l(42, 46), c, 1.1) + stroke(l(30, 34), c, 1.1) + stroke(l(34.5, 41.5), '#3f6fc4', 0.7);
    }
    return part('lumen', circ(50, 50, 30, '#ffffff', { stroke: 'none', w: 0 })) + part('membrane', circ(50, 50, 38, 'none', { fill: 'none', stroke: L('#3f6fc4', 0.75), w: 7 }) + s);
  });
})();
