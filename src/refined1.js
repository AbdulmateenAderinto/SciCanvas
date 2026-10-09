// Refined icons, part 1: immune cells, cancer and cell biology (drawn with src/refinedkit.js).
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, tone, path, rect, circ, ell, stroke, flat, dot, part, G, poly, smooth, wob, body, sball, speckle, tube, add } = K;

  // ---------- Cell builder ----------
  // A cell = membrane body (pale tint of c) + cytoplasm speckles + nucleus (mid tone of c) + optional surface decoration.
  // shape: round | spiky | ruffled | amoeboid | oval; nucleus: round | kidney | lobed | bilobed | irregular | eccentric | none
  function cellSvg(c, r, o = {}) {
    const cx = o.cx ?? 50, cy = o.cy ?? 50, R = o.R ?? 38, ry = R * (o.aspect ?? 0.94);
    const pale = L(c, o.pale ?? 0.58);
    let mod;
    if (o.shape === 'spiky') { const ph = r() * 6; mod = (a) => 0.07 * Math.sin(11 * a + ph) + 0.04 * Math.sin(17 * a + ph * 2) + 0.03 * Math.sin(23 * a); }
    if (o.shape === 'ruffled') { const ph = r() * 6; mod = (a) => 0.045 * Math.sin(9 * a + ph) + 0.03 * Math.sin(14 * a); }
    if (o.shape === 'amoeboid') { const ph = r() * 6; mod = (a) => 0.16 * Math.sin(3 * a + ph) + 0.1 * Math.sin(5 * a + ph * 1.7); }
    const pts = wob(cx, cy, R, ry, r, { amp: o.amp ?? (o.shape === 'round' || !o.shape ? 0.025 : 0.05), n: mod ? 90 : 40, mod, rot: o.rot || 0 });
    let s = '';
    if (o.under) s += o.under;
    s += part('membrane', body(pts, pale, { stroke: line(L(c, 0.2)), hi: 0.25, k: 0.9, off: 1.5 }));
    s += part('cytoplasm', speckle(cx, cy, R * 0.85, ry * 0.85, o.speckles ?? 26, L(c, 0.1), r, { op: 0.35, min: 0.5, max: 1.2 }));
    const nc = o.nc || L(c, 0.08), nx = cx + (o.nx ?? 3), ny = cy + (o.ny ?? 2), nr = R * (o.nr ?? 0.52);
    let nuc = '';
    const kind = o.nucleus || 'round';
    if (kind === 'round' || kind === 'eccentric') nuc = body(wob(nx + (kind === 'eccentric' ? R * 0.22 : 0), ny, nr, nr * 0.95, r, { amp: 0.04 }), nc, { hi: 0.18 });
    if (kind === 'irregular') nuc = body(wob(nx, ny, nr, nr * 0.9, r, { amp: 0.12 }), nc, { hi: 0.18 });
    if (kind === 'kidney') nuc = body(wob(nx, ny, nr, nr * 0.85, r, { amp: 0.02, mod: (a) => -0.32 * Math.max(0, Math.cos(a - 0.6)) ** 6 }), nc, { hi: 0.18 });
    if (kind === 'bilobed') nuc = body(wob(nx - nr * 0.45, ny, nr * 0.55, nr * 0.6, r, { amp: 0.04 }), nc, { hi: 0.18 }) + body(wob(nx + nr * 0.5, ny, nr * 0.55, nr * 0.6, r, { amp: 0.04 }), nc, { hi: 0.18 });
    if (kind === 'lobed') {
      const lobes = [[-0.6, -0.2], [-0.1, 0.35], [0.45, -0.1], [0.75, 0.45]];
      nuc = stroke(smooth(lobes.map(([a, b]) => [nx + a * nr, ny + b * nr]), false), line(nc), 3.2) + lobes.map(([a, b]) => body(wob(nx + a * nr, ny + b * nr, nr * 0.34, nr * 0.32, r, { amp: 0.05 }), nc, { hi: 0.15 })).join('');
    }
    if (kind !== 'none') s += part('nucleus', nuc + (o.chromatin === false ? '' : speckle(nx, ny, nr * 0.55, nr * 0.5, 7, D(nc, 0.15), r, { op: 0.35, min: 0.7, max: 1.6 })));
    if (o.nucleolus) s += part('nucleolus', sball(nx + nr * 0.2, ny - nr * 0.15, nr * 0.22, nr * 0.2, D(nc, 0.12)));
    if (o.granules) s += part('granules', Array.from({ length: o.granules }, () => { const a = r() * 6.3, d = 0.55 + r() * 0.35; return circ(cx + Math.cos(a) * R * d, cy + Math.sin(a) * ry * d, 1.7 + r() * 1.2, o.gc || D(c, 0.15), { w: 0.6 }); }).join(''));
    if (o.deco) s += part('surface', o.deco(cx, cy, R, ry));
    return s;
  }
  // Surface receptors around the membrane: draw(x, y, angleDeg) gives one receptor at the rim.
  const around = (cx, cy, R, ry, n, draw, ph = 0.35) => Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 + ph; return G(draw, `translate(${f(cx + Math.cos(a) * R * 0.98)} ${f(cy + Math.sin(a) * ry * 0.98)}) rotate(${f((a * 180) / Math.PI + 90)})`); }).join('');
  const RC = { tcr: (c1, c2) => rect(-2.6, -7, 2.2, 7, 1, c1, { w: 0.6 }) + rect(0.4, -7, 2.2, 7, 1, c2, { w: 0.6 }),
    bcr: (c) => stroke('M0 0 V-4.5 M0 -4.5 L-3 -8.5 M0 -4.5 L3 -8.5', line(c), 2.6) + stroke('M0 0 V-4.5 M0 -4.5 L-3 -8.5 M0 -4.5 L3 -8.5', c, 1.4),
    knob: (c) => stroke('M0 0 V-4', line(c), 1.2) + circ(0, -5.8, 2.2, c, { w: 0.6 }),
    car: (c1, c2) => stroke('M0 0 V-4', '#8f9aa4', 1.4) + rect(-3.4, -9.5, 3.2, 5, 1.4, c1, { w: 0.6 }) + rect(0.2, -9.5, 3.2, 5, 1.4, c2, { w: 0.6 }) };

  const IMM = 'Immune cells', CAN = 'Cancer', CB = 'Cells & organelles';
  const cells = [
    // [name, colour, tags, options]
    ['T cell', '#6fb58c', 'T lymphocyte TCR adaptive', { nr: 0.62, deco: (x, y, R, ry) => around(x, y, R, ry, 10, RC.tcr('#2e7d5b', '#8fd1ad')) }],
    ['CD4+ T helper cell', '#7aa7d9', 'CD4 helper T cell Th lymphocyte', { nr: 0.62, deco: (x, y, R, ry) => around(x, y, R, ry, 10, RC.tcr('#36609c', '#a7c6ec')) }],
    ['CD8+ cytotoxic T cell', '#5fb3b3', 'CD8 CTL killer T cell lymphocyte', { nr: 0.6, granules: 6, gc: '#d0675f', deco: (x, y, R, ry) => around(x, y, R, ry, 10, RC.tcr('#2b7b7b', '#9fd8d8')) }],
    ['Regulatory T cell', '#a48bd1', 'Treg FOXP3 CD25 suppressive', { nr: 0.6, deco: (x, y, R, ry) => around(x, y, R, ry, 10, RC.tcr('#6a4fa3', '#cbb9ea')) }],
    ['CAR T cell', '#6cb37a', 'CAR-T chimeric antigen receptor engineered T cell', { nr: 0.58, deco: (x, y, R, ry) => around(x, y, R, ry, 9, RC.car('#e0a23b', '#4f8fd6')) }],
    ['B cell', '#e8a35f', 'B lymphocyte BCR antibody', { nr: 0.6, deco: (x, y, R, ry) => around(x, y, R, ry, 10, RC.bcr('#4c7fcf')) }],
    ['Plasma cell', '#d98f6a', 'antibody secreting cell plasmacyte', { aspect: 0.78, nucleus: 'eccentric', nr: 0.36, nx: 10, speckles: 40, under: '' }],
    ['NK cell', '#d17aa6', 'natural killer cell innate lymphocyte granules', { nr: 0.5, granules: 9, gc: '#a8345f', shape: 'ruffled' }],
    ['Macrophage', '#9c86c9', 'macrophage phagocyte myeloid', { R: 40, shape: 'amoeboid', nucleus: 'kidney', nr: 0.42, speckles: 34 }],
    ['M1 macrophage', '#d77a7a', 'M1 macrophage pro-inflammatory classically activated', { R: 40, shape: 'amoeboid', nucleus: 'kidney', nr: 0.42, speckles: 34 }],
    ['M2 macrophage', '#6ea8d6', 'M2 macrophage anti-inflammatory alternatively activated', { R: 40, shape: 'amoeboid', nucleus: 'kidney', nr: 0.42, speckles: 34 }],
    ['Monocyte', '#b49ad3', 'monocyte myeloid blood', { nucleus: 'kidney', nr: 0.5 }],
    ['Neutrophil', '#e7a0b5', 'neutrophil granulocyte PMN multilobed', { nucleus: 'lobed', nr: 0.62, speckles: 40 }],
    ['Eosinophil', '#ec9c74', 'eosinophil granulocyte allergy', { nucleus: 'bilobed', nr: 0.62, granules: 22, gc: '#e0603a' }],
    ['Basophil', '#8f8bd1', 'basophil granulocyte histamine', { nucleus: 'bilobed', nr: 0.55, granules: 26, gc: '#4b46a0' }],
    ['Mast cell', '#b07fb8', 'mast cell histamine degranulation allergy', { aspect: 0.86, nr: 0.38, granules: 34, gc: '#7a3f88' }],
    ['Dendritic cell', '#7fbf8e', 'dendritic cell DC antigen presenting APC', { R: 34, shape: 'spiky', nr: 0.45, under: '', deco: (x, y, R, ry) => Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2 + 0.2; return tube([[x + Math.cos(a) * R * 0.8, y + Math.sin(a) * ry * 0.8], [x + Math.cos(a + 0.15) * R * 1.18, y + Math.sin(a + 0.15) * ry * 1.18], [x + Math.cos(a - 0.05) * R * 1.4, y + Math.sin(a - 0.05) * ry * 1.4]], 4, L('#7fbf8e', 0.58), { edge: line(L('#7fbf8e', 0.2)), hi: false }); }).join('') }],
    ['Platelet', '#e7a6b1', 'platelet thrombocyte clotting', { R: 22, aspect: 0.7, nucleus: 'none', granules: 7, gc: '#b65a74', shape: 'ruffled' }],
    ['Haematopoietic stem cell', '#77b7d6', 'HSC hematopoietic stem cell progenitor bone marrow', { nr: 0.6, nucleolus: true }],
    ['Fibroblast', '#d9a07f', 'fibroblast stromal spindle connective tissue', { R: 44, aspect: 0.42, nr: 0.4, rot: -18, shape: 'amoeboid', amp: 0.04 }],
    ['Epithelial cell', '#e3b88b', 'epithelial cell cuboidal epithelium', { R: 36, aspect: 1, nr: 0.45, shape: 'round', amp: 0.01 }],
    ['Stem cell', '#86c29a', 'stem cell pluripotent iPSC ESC', { nr: 0.62, nucleolus: true }],
  ];
  for (const [name, c, tags, o] of cells) add(name, IMM, tags + ' cell immune', c, [100, 100], (cc, r) => cellSvg(cc, r, o));
  // The plain cells read better under "Cells & organelles".
  for (const ic of ICONS.slice(-3)) ic.cat = `Refined · ${CB}`;
  ICONS.find((i) => i.name === 'Fibroblast' && i.refined).cat = `Refined · ${CB}`;

  add('Generic cell', CB, 'cell eukaryotic animal cell generic', '#f2b483', [100, 100], (c, r) => cellSvg(c, r, { nr: 0.4, nucleolus: true, speckles: 34, pale: 0.45 }));
  add('Red blood cell', CB, 'erythrocyte RBC blood biconcave', '#d9534f', [100, 70], (c) =>
    part('cell', ell(50, 35, 44, 30, c) + ell(48, 33, 39, 26, L(c, 0.12), { stroke: 'none', w: 0 }) + ell(52, 37, 22, 13, D(c, 0.1), { stroke: line(c), w: 0.8, op: 0.9 }) + ell(36, 22, 10, 4, '#ffffff', { stroke: 'none', w: 0, op: 0.3, rot: -12 })));
  add('Red blood cell (side view)', CB, 'erythrocyte RBC biconcave profile side', '#d9534f', [100, 50], (c) =>
    part('cell', path('M8 25 C8 10 26 8 36 14 C44 18 56 18 64 14 C74 8 92 10 92 25 C92 40 74 42 64 36 C56 32 44 32 36 36 C26 42 8 40 8 25 Z', c) + flat('M14 22 C16 14 28 13 36 18 C30 17 20 18 14 22 Z', '#ffffff', 0.3)));

  // ---------- Cancer ----------
  add('Cancer cell', CAN, 'cancer cell tumour tumor malignant', '#e98a96', [100, 100], (c, r) => cellSvg(c, r, { shape: 'spiky', R: 40, nucleus: 'irregular', nr: 0.42, speckles: 40, nc: D(c, 0.08), pale: 0.45 }));
  add('Cancer cell (round)', CAN, 'cancer cell tumour malignant round', '#c681c7', [100, 100], (c, r) => cellSvg(c, r, { shape: 'ruffled', R: 40, nucleus: 'irregular', nr: 0.48, speckles: 40, nc: D(c, 0.05), pale: 0.4 }));
  add('Cancer stem cell', CAN, 'cancer stem cell CSC tumour initiating', '#b07fd0', [100, 100], (c, r) => cellSvg(c, r, { shape: 'ruffled', nr: 0.6, nucleolus: true, pale: 0.45 }));
  add('Circulating tumour cell', CAN, 'CTC circulating tumor cell blood metastasis', '#e48a7c', [100, 100], (c, r) => cellSvg(c, r, { shape: 'spiky', R: 34, nucleus: 'irregular', nr: 0.5, pale: 0.45 })
    + part('rbc', ell(86, 82, 11, 7, '#d9534f') + ell(87, 83, 5, 3, '#b83f3c', { w: 0, stroke: 'none' }) + ell(14, 18, 9, 6, '#d9534f', { rot: 30 })));
  add('Apoptotic cell', CAN, 'apoptosis apoptotic bodies programmed cell death blebbing', '#b9a6c9', [100, 100], (c, r) =>
    cellSvg(c, r, { R: 30, nucleus: 'none', speckles: 16, pale: 0.45, under: '' })
    + part('fragments', [[34, 44, 8], [54, 56, 9], [46, 34, 5], [60, 40, 6]].map(([x, y, s]) => sball(x, y, s, s * 0.9, D(c, 0.15))).join(''))
    + part('blebs', [[15, 30, 9], [84, 40, 8], [76, 80, 10], [22, 78, 7], [52, 12, 6], [88, 64, 5]].map(([x, y, s]) => sball(x, y, s, s, L(c, 0.45))).join('')));
  add('Necrotic cell', CAN, 'necrosis necrotic cell death swelling rupture', '#c5a28e', [100, 100], (c, r) =>
    part('membrane', path(smooth(wob(50, 50, 40, 38, r, { amp: 0.04 })), L(c, 0.5), { op: 0.9 }) + stroke('M14 30 l6 4 M86 66 l-6 -2 M50 90 l1 -6', '#ffffff', 3))
    + part('nucleus', body(wob(52, 50, 16, 14, r, { amp: 0.15 }), D(c, 0.1))) + part('debris', speckle(50, 50, 36, 34, 22, D(c, 0.2), r, { op: 0.6, min: 0.8, max: 2 })));
  add('Mitotic cell', CAN, 'mitosis dividing cell metaphase chromosomes spindle', '#8fb6de', [100, 100], (c, r) =>
    cellSvg(c, r, { nucleus: 'none', pale: 0.55 })
    + part('spindle', [-1, 1].map((sg) => [-18, -9, 0, 9, 18].map((y) => stroke(`M${50 + sg * 30} 50 Q${50 + sg * 14} ${50 + y * 0.6} 50 ${50 + y}`, '#9bb3c8', 0.7)).join('') + circ(50 + sg * 30, 50, 2.4, '#5d7fa6')).join(''))
    + part('chromosomes', [-20, -10, 0, 10, 20].map((y) => G(path('M-2 -6 L2 6 M2 -6 L-2 6', '#c25b7c', { w: 3, stroke: '#c25b7c' }), `translate(50 ${50 + y})`)).join('')));
  add('Tumour spheroid', CAN, 'tumour spheroid 3D culture tumoursphere', '#e39a8f', [100, 100], (c, r) => {
    let s = '';
    const pts = [];
    for (let ring = 0; ring < 4; ring++) { const rad = ring * 11, n = ring ? ring * 7 : 1; for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + ring; pts.push([50 + Math.cos(a) * rad + (r() - 0.5) * 3, 50 + Math.sin(a) * rad + (r() - 0.5) * 3]); } }
    pts.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => { const sz = 6.5 + r() * 2; s += body(wob(x, y, sz, sz * 0.95, r, { amp: 0.06, n: 16 }), L(c, 0.35 - Math.hypot(x - 50, y - 50) / 300), { hi: 0.15, k: 0.8, off: 1 }) + dot(x + 0.5, y + 0.5, sz * 0.38, D(c, 0.12), 0.8); });
    return part('cells', s);
  });
  add('Organoid', CAN, 'organoid 3D culture intestinal crypt lumen', '#e8b27d', [100, 100], (c, r) => {
    let s = '';
    const n = 22;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, R1 = 38 + Math.sin(a * 4) * 6, cx = 50 + Math.cos(a) * (R1 - 7), cy = 50 + Math.sin(a) * (R1 - 7);
      s += G(path('M-5 -7 H5 L4 7 H-4 Z', L(c, 0.45), { stroke: line(c) }) + ell(0, 2, 2.6, 3, D(c, 0.05), { w: 0.6 }), `translate(${f(cx)} ${f(cy)}) rotate(${f((a * 180) / Math.PI + 90)})`);
    }
    return part('lumen', path(smooth(wob(50, 50, 24, 24, r, { amp: 0.08 })), '#fbf3e6', { stroke: line(L(c, 0.4)) })) + part('epithelium', s);
  });
  add('Tumour', CAN, 'tumour tumor mass solid neoplasm vascularised', '#d98a8a', [100, 90], (c, r) =>
    part('mass', body(wob(50, 46, 40, 34, r, { amp: 0.1 }), L(c, 0.2))) + part('nodules', [[30, 36, 12], [62, 30, 14], [56, 58, 15], [32, 60, 10]].map(([x, y, s]) => body(wob(x, y, s, s * 0.9, r, { amp: 0.08 }), c, { hi: 0.2 })).join(''))
    + part('vessels', stroke('M6 70 C20 64 26 56 30 46 M30 46 C34 40 40 38 44 30 M30 46 C24 40 22 30 26 22 M94 64 C80 60 72 56 66 46', PAL.vessel, 1.6, { op: 0.85 })));
  add('Angiogenesis', CAN, 'angiogenesis tumour blood vessel sprouting VEGF', '#d0454c', [120, 80], (c, r) => {
    const segs = K.branches(4, 60, -0.25, 26, 5, r, 0.55, 0.7);
    return part('tumour', body(wob(94, 40, 22, 26, r, { amp: 0.1 }), '#e7a3a8')) + part('vessels', K.tree(segs, line(c), 6, { depth: 5 }) + K.tree(segs, c, 4.2, { depth: 5 }));
  });
  add('Metastasis', CAN, 'metastasis invasion intravasation dissemination tumour vessel', '#e48a7c', [120, 90], (c, r) =>
    part('vessel', rect(0, 56, 120, 24, 2, '#f6c9c4', { stroke: '#d58b86' }) + Array.from({ length: 8 }, (_, k) => ell(8 + k * 15, 58.5, 7, 2.2, '#f0b2ad', { w: 0.6 })).join(''))
    + part('tumour', [[22, 26, 14], [38, 18, 12], [36, 36, 13]].map(([x, y, s]) => cellSvg(c, r, { cx: x, cy: y, R: s, shape: 'spiky', nucleus: 'irregular', nr: 0.45, speckles: 6, pale: 0.45 })).join(''))
    + part('migrating', cellSvg(c, r, { cx: 66, cy: 46, R: 11, aspect: 0.7, rot: 30, shape: 'amoeboid', nucleus: 'round', nr: 0.4, speckles: 4, pale: 0.45 }))
    + part('ctc', cellSvg(c, r, { cx: 98, cy: 68, R: 8, nucleus: 'round', nr: 0.5, speckles: 3, pale: 0.45 }) + ell(80, 70, 6, 3.4, '#d9534f')));
  add('Cancer-associated fibroblast', CAN, 'CAF cancer associated fibroblast stroma tumour microenvironment', '#9f8bc2', [100, 100], (c, r) => cellSvg(c, r, { R: 46, aspect: 0.36, rot: 24, shape: 'amoeboid', amp: 0.05, nr: 0.34, pale: 0.5 }));

  // ---------- Organelles ----------
  add('Mitochondrion', CB, 'mitochondria mitochondrion organelle cristae ATP energy', '#ef8c5a', [100, 60], (c) =>
    part('outer', path('M10 30 C10 12 30 6 50 6 C70 6 90 12 90 30 C90 48 70 54 50 54 C30 54 10 48 10 30 Z', L(c, 0.2)) + flat('M16 26 C18 14 34 11 50 11 C42 13 24 16 16 26 Z', '#ffffff', 0.35))
    + part('inner', path('M16 30 C16 16 32 12 50 12 C68 12 84 16 84 30 C84 44 68 48 50 48 C32 48 16 44 16 30 Z', L(c, 0.55), { stroke: line(c) }))
    + part('cristae', stroke('M22 30 C26 18 30 18 30 30 C30 42 36 42 38 30 C40 18 46 18 46 30 C46 42 52 42 54 30 C56 18 62 18 62 30 C62 42 68 42 70 30 C72 18 78 18 78 30', D(c, 0.05), 2.6)));
  add('Nucleus (organelle)', CB, 'nucleus nuclear envelope nucleolus chromatin pores', '#9c86c9', [100, 100], (c, r) =>
    part('envelope', circ(50, 50, 42, L(c, 0.35)) + circ(50, 50, 38.5, L(c, 0.5), { stroke: line(L(c, 0.2)), w: 0.8 }) + Array.from({ length: 14 }, (_, k) => { const a = (k / 14) * Math.PI * 2; return circ(50 + Math.cos(a) * 40.3, 50 + Math.sin(a) * 40.3, 1.6, L(c, 0.6), { w: 0.6 }); }).join(''))
    + part('chromatin', speckle(50, 50, 32, 32, 40, L(c, 0.15), r, { op: 0.5, min: 0.8, max: 2 })) + part('nucleolus', sball(58, 44, 11, 10, D(c, 0.05))));
  add('Endoplasmic reticulum', CB, 'ER rough endoplasmic reticulum ribosomes organelle', '#6fa8d8', [100, 80], (c) => {
    let s = '';
    for (let k = 0; k < 4; k++) { const y = 16 + k * 15; s += path(`M${10 + k * 4} ${y} C30 ${y - 6} 60 ${y + 6} ${86 - k * 3} ${y} C90 ${y + 2} 90 ${y + 8} ${86 - k * 3} ${y + 8} C60 ${y + 14} 30 ${y + 2} ${10 + k * 4} ${y + 8} C6 ${y + 7} 6 ${y + 1} ${10 + k * 4} ${y} Z`, L(c, 0.35)); }
    let rib = '';
    for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) rib += dot(16 + i * 8.5 + k * 2, 14.5 + k * 15 + Math.sin(i) * 1.8, 1.4, '#3f5e94');
    return part('cisternae', s) + part('ribosomes', rib);
  });
  add('Golgi apparatus', CB, 'Golgi apparatus complex cisternae vesicles organelle trafficking', '#e7b04f', [100, 80], (c) => {
    let s = '';
    for (let k = 0; k < 5; k++) { const y = 18 + k * 11, w = 34 - Math.abs(k - 2) * 4; s += path(`M${50 - w} ${y + 6} C${50 - w} ${y - 4} ${50 - w * 0.4} ${y - 2} 50 ${y - 2} C${50 + w * 0.4} ${y - 2} ${50 + w} ${y - 4} ${50 + w} ${y + 6} C${50 + w} ${y + 9} ${50 + w * 0.4} ${y + 4} 50 ${y + 4} C${50 - w * 0.4} ${y + 4} ${50 - w} ${y + 9} ${50 - w} ${y + 6} Z`, k % 2 ? L(c, 0.3) : L(c, 0.15)); }
    return part('cisternae', s) + part('vesicles', [[12, 20], [88, 26], [14, 62], [86, 68], [92, 46]].map(([x, y]) => circ(x, y, 4, L(c, 0.35))).join(''));
  });
  add('Lysosome', CB, 'lysosome organelle degradation hydrolase autophagy', '#8bc48a', [100, 100], (c, r) =>
    part('membrane', sball(50, 50, 40, 38, L(c, 0.35))) + part('enzymes', Array.from({ length: 14 }, () => { const a = r() * 6.3, d = r() * 26; return circ(50 + Math.cos(a) * d, 50 + Math.sin(a) * d, 2.6 + r() * 1.6, D(c, 0.1), { w: 0.6 }); }).join('')));
  add('Vesicle', CB, 'vesicle transport secretory exocytosis endocytosis cargo', '#e3a35d', [100, 100], (c, r) =>
    part('membrane', circ(50, 50, 40, L(c, 0.4)) + circ(50, 50, 34, '#fff7ee', { stroke: line(L(c, 0.3)), w: 0.8 })) + part('cargo', speckle(50, 50, 26, 26, 14, D(c, 0.05), r, { op: 0.8, min: 1.6, max: 3 })));
  add('Ribosome', CB, 'ribosome translation 80S 70S large small subunit rRNA', '#7c9ad3', [100, 90], (c, r) =>
    part('large subunit', body(wob(50, 38, 38, 26, r, { amp: 0.07 }), c)) + part('small subunit', body(wob(48, 68, 30, 16, r, { amp: 0.07 }), L(c, 0.35)))
    + part('mRNA', K.wave(2, 78, 98, 78, 1.6, 5, '#b768b8', 1.8)));
  add('Proteasome', CB, 'proteasome 26S protein degradation ubiquitin core particle', '#7d8bc9', [80, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 4; k++) for (let i = 0; i < 5; i++) s += ell(16 + i * 12, 30 + k * 13, 6.4, 6.4, k % 3 === 0 ? L(c, 0.25) : c, { w: 0.8 });
    return part('caps', body(wob(40, 14, 26, 10, r, { amp: 0.08 }), '#c9b06b') + body(wob(40, 86, 26, 10, r, { amp: 0.08 }), '#c9b06b')) + part('core', s);
  });
  add('Centrosome', CB, 'centrosome centrioles microtubule organising centre MTOC', '#76b2a6', [100, 100], (c) =>
    part('pcm', circ(50, 50, 30, L(c, 0.6), { op: 0.8 })) + part('centrioles', G(Array.from({ length: 9 }, (_, k) => rect(-9 + k * 2, -12, 1.6, 24, 0.8, c, { w: 0.5 })).join(''), 'translate(42 50) rotate(-20)') + G(Array.from({ length: 9 }, (_, k) => rect(-9 + k * 2, -12, 1.6, 24, 0.8, D(c, 0.08), { w: 0.5 })).join(''), 'translate(60 52) rotate(70)')));
})();
