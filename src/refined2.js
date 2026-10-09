// Refined icons, part 2: engineering & biomaterials, and microbiology (drawn with src/refinedkit.js).
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, path, rect, circ, ell, stroke, flat, dot, text, part, G, poly, smooth, wob, body, sball, speckle, glass, glint, box3, screen, button, plate, helix, wave, tube, headRing, add } = K;
  const ENG = 'Engineering & biomaterials', MIC = 'Microbiology';

  // =====================================================================================
  // Engineering & biomaterials
  // =====================================================================================
  add('Polymeric nanoparticle', ENG, 'polymeric nanoparticle polymer PLGA nanocarrier drug delivery', '#c2509e', [100, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 26; k++) {
      const a = r() * 6.3, d = r() * 26, x = 50 + Math.cos(a) * d, y = 50 + Math.sin(a) * d, rr = 6 + r() * 9;
      s += path(K.ellD(x, y, rr, rr * (0.6 + r() * 0.4)), 'none', { fill: 'none', stroke: k % 2 ? c : '#e8a33d', w: 2.2, tf: `rotate(${f(r() * 180)} ${f(x)} ${f(y)})` });
    }
    return part('core', circ(50, 50, 40, '#fbeef6', { stroke: L(c, 0.4), op: 0.6 })) + part('polymer', s);
  });
  add('Lipid nanoparticle', ENG, 'lipid nanoparticle LNP mRNA vaccine PEG ionisable lipid', '#e8a33d', [100, 100], (c, r) => {
    let peg = '';
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + 0.1; peg += wave(50 + Math.cos(a) * 42, 50 + Math.sin(a) * 42, 50 + Math.cos(a) * 49, 50 + Math.sin(a) * 49, 1.2, 1.5, '#b06a4f', 0.9); }
    return part('peg', peg) + part('core', circ(50, 50, 40, '#fdf7e4', { stroke: '#e5cf98', w: 0.8 }))
      + part('outer lipids', headRing(50, 50, 40, 46, c, '#e0b552', { tail: 6, hr: 2 })) + part('inner lipids', headRing(50, 50, 22, 26, '#d0574a', '#e0b552', { tail: 5, inward: false, hr: 1.8 }))
      + part('mRNA', wave(36, 50, 64, 50, 4, 2.5, '#5a7dc7', 1.4) + wave(40, 42, 60, 58, 3, 2, '#c2509e', 1.2));
  });
  add('Gold nanoparticle', ENG, 'gold nanoparticle AuNP nanostar metal', '#e6b422', [100, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + r() * 0.3, l = 22 + r() * 14; s += tube([[50, 50], [50 + Math.cos(a) * l * 0.6, 50 + Math.sin(a) * l * 0.6 + r() * 4], [50 + Math.cos(a) * l, 50 + Math.sin(a) * l]], 9, k % 3 ? c : L(c, 0.2), { edge: D(c, 0.25) }); }
    return part('nanostar', s + body(wob(50, 50, 16, 16, r, { amp: 0.1 }), c));
  });
  add('Micelle', ENG, 'micelle surfactant amphiphile self-assembly', '#e0663d', [100, 100], (c) => part('micelle', headRing(50, 50, 40, 34, c, '#f0a540', { tail: 14, hr: 4, double: true, tw: 1.1 })));
  add('Liposome', ENG, 'liposome lipid bilayer vesicle drug delivery', '#5b8fd6', [100, 100], (c) =>
    part('lumen', circ(50, 50, 27, '#eef5fc', { stroke: 'none', w: 0 })) + part('outer leaflet', headRing(50, 50, 42, 40, c, '#d6a94a', { tail: 6, hr: 2.6, double: true, tw: 0.9 })) + part('inner leaflet', headRing(50, 50, 29, 28, c, '#d6a94a', { tail: 6, hr: 2.4, inward: false, double: true, tw: 0.9 })));
  add('Exosome', ENG, 'exosome extracellular vesicle EV tetraspanin CD63', '#8d73c7', [100, 100], (c, r) =>
    part('vesicle', sball(50, 50, 36, 36, L(c, 0.55)) + speckle(50, 50, 26, 26, 12, c, r, { op: 0.7, min: 1.5, max: 3 }))
    + part('tetraspanins', Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2; return G(rect(-2, -6, 4, 6, 1.5, k % 2 ? '#e8a33d' : '#5fb3b3', { w: 0.6 }), `translate(${f(50 + Math.cos(a) * 36)} ${f(50 + Math.sin(a) * 36)}) rotate(${f((a * 180) / Math.PI + 90)})`); }).join('')));
  add('Nanosphere', ENG, 'nanosphere microsphere bead solid nanoparticle', '#c49a52', [100, 100], (c, r) =>
    part('sphere', circ(50, 50, 40, c) + flat(`M50 10 A40 40 0 0 1 50 90 A30 40 0 0 0 50 10 Z`, D(c, 0.15), 0.6) + speckle(50, 50, 36, 36, 120, D(c, 0.15), r, { op: 0.45, min: 0.5, max: 1.3 })));
  add('Carbon nanotube', ENG, 'carbon nanotube CNT graphene hexagonal lattice', '#8a5a44', [120, 50], (c) => {
    let s = '';
    for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) { const x = 8 + i * 12 + (j % 2) * 6, y = 14 + j * 10; s += path(poly(Array.from({ length: 6 }, (_, k) => [x + 6 * Math.cos((k / 6) * Math.PI * 2), y + 5.5 * Math.sin((k / 6) * Math.PI * 2)])), 'none', { fill: 'none', stroke: c, w: 1.2 }); }
    return part('tube', stroke('M4 8 H116 M4 42 H116', c, 1.8) + s);
  });
  add('Graphene sheet', ENG, 'graphene sheet 2D material carbon honeycomb', '#4f5a66', [100, 80], (c) => {
    let s = '';
    for (let i = 0; i < 7; i++) for (let j = 0; j < 6; j++) { const x = 12 + i * 12 + (j % 2) * 6 + j * 2, y = 12 + j * 10.4; s += path(poly(Array.from({ length: 6 }, (_, k) => [x + 6.9 * Math.cos((k / 6) * Math.PI * 2 + Math.PI / 6), y + 6 * Math.sin((k / 6) * Math.PI * 2 + Math.PI / 6)])), 'none', { fill: 'none', stroke: c, w: 1.1 }) + dot(x + 6, y, 1.1, c); }
    return part('sheet', path('M8 6 H90 L98 74 H14 Z', '#eef2f5', { stroke: '#c7d0d8' }) + s);
  });
  add('Dendrimer', ENG, 'dendrimer PAMAM branched polymer nanocarrier', '#3fa5a0', [100, 100], (c, r) => {
    const segs = [];
    for (let k = 0; k < 5; k++) segs.push(...K.branches(50, 50, (k / 5) * Math.PI * 2, 13, 3, r, 0.45, 0.85));
    const tips = segs.filter((s) => s.depth === 1).map((s) => s.pts[1]);
    return part('branches', K.tree(segs, c, 3, { depth: 3 })) + part('core', sball(50, 50, 6, 6, D(c, 0.1))) + part('surface groups', tips.map(([x, y]) => circ(x, y, 3.2, '#ef9a4f', { w: 0.7 })).join(''));
  });
  add('Quantum dot', ENG, 'quantum dot QD nanocrystal fluorescent core shell', '#e36d6d', [100, 100], (c) =>
    part('glow', circ(50, 50, 44, L(c, 0.75), { stroke: 'none', w: 0, op: 0.7 })) + part('ligands', Array.from({ length: 20 }, (_, k) => { const a = (k / 20) * Math.PI * 2; return stroke(`M${f(50 + Math.cos(a) * 26)} ${f(50 + Math.sin(a) * 26)} L${f(50 + Math.cos(a) * 37)} ${f(50 + Math.sin(a) * 37)}`, '#9aa5ae', 1.2) + dot(50 + Math.cos(a) * 38, 50 + Math.sin(a) * 38, 1.6, '#6c7883'); }).join(''))
    + part('shell', sball(50, 50, 26, 26, '#a9b3bd')) + part('core', sball(50, 50, 15, 15, c, { shine: true })));
  add('Magnetic nanoparticle', ENG, 'magnetic nanoparticle iron oxide SPION Fe3O4', '#5a5f6a', [100, 100], (c) =>
    part('coating', circ(50, 50, 40, '#dfeee0', { stroke: '#9cc39f' })) + part('core', sball(50, 50, 26, 26, c, { shine: true }) + text(50, 54, 'Fe₃O₄', 10, '#ffffff', { weight: 700 })));
  add('Microporous scaffold', ENG, 'microporous scaffold porous biomaterial tissue engineering sponge', '#c3c8cd', [100, 100], (c, r) =>
    part('cylinder', path('M12 26 V76 C12 92 88 92 88 76 V26 Z', c) + ell(50, 26, 38, 12, L(c, 0.4)))
    + part('pores', speckle(50, 58, 34, 26, 70, D(c, 0.25), r, { op: 0.7, min: 1, max: 2.6 }) + speckle(50, 26, 34, 10, 30, D(c, 0.2), r, { op: 0.6, min: 0.8, max: 2 })));
  const hydro = (d, top) => path(d, '#e3e8ec', { stroke: '#a8b4bd', op: 0.85 }) + (top ? path(top, '#f3f6f8', { stroke: '#a8b4bd', op: 0.85 }) : '');
  add('Hydrogel (stiff)', ENG, 'hydrogel stiff disc gel biomaterial', '#e3e8ec', [100, 70], () =>
    part('gel', hydro('M8 22 V48 C8 64 92 64 92 48 V22 Z', K.ellD(50, 22, 42, 12)) + flat('M14 36 C30 42 70 42 86 36', '#ffffff', 0) + stroke('M16 40 C34 46 66 46 84 40', '#ffffff', 2, { op: 0.6 })));
  add('Hydrogel (soft)', ENG, 'hydrogel soft dome gel biomaterial', '#e3e8ec', [100, 80], () =>
    part('gel', hydro('M8 70 C6 40 30 6 50 6 C70 6 94 40 92 70 C92 78 8 78 8 70 Z', K.ellD(50, 70, 42, 7)) + stroke('M30 20 C24 30 20 44 20 56', '#ffffff', 2.4, { op: 0.7 })));
  add('Hydrogel (film)', ENG, 'hydrogel film sheet thin gel membrane', '#e3e8ec', [100, 100], () =>
    part('film', path('M10 8 H90 Q92 8 92 10 V90 Q92 92 90 92 H10 Q8 92 8 90 V10 Q8 8 10 8 Z', '#e1e5e9', { stroke: '#aeb8c0' }) + flat('M20 16 H80 C70 40 84 60 72 84 H20 C30 60 14 40 20 16 Z', '#d2d8dd', 0.6) + stroke('M24 84 L84 22', '#ffffff', 2.4, { op: 0.6 })));
  add('Hydrogel network', ENG, 'hydrogel polymer network crosslinked mesh', '#11777b', [100, 100], (c, r) => {
    const nodes = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) nodes.push([22 + j * 28 + (r() - 0.5) * 8, 22 + i * 28 + (r() - 0.5) * 8]);
    let s = '';
    const q = (a, b) => `M${f(a[0])} ${f(a[1])} Q${f((a[0] + b[0]) / 2 + (r() - 0.5) * 14)} ${f((a[1] + b[1]) / 2 + (r() - 0.5) * 14)} ${f(b[0])} ${f(b[1])}`;
    for (let i = 0; i < 9; i++) { if (i % 3 < 2) s += stroke(q(nodes[i], nodes[i + 1]), c, 1.4); if (i < 6) s += stroke(q(nodes[i], nodes[i + 3]), c, 1.4); }
    nodes.forEach(([x, y], i) => { if (i % 3 === 0) s += stroke(`M${f(x)} ${f(y)} q-8 4 -16 -2`, c, 1.4); if (i % 3 === 2) s += stroke(`M${f(x)} ${f(y)} q8 -4 16 2`, c, 1.4); if (i < 3) s += stroke(`M${f(x)} ${f(y)} q4 -8 -2 -16`, c, 1.4); if (i > 5) s += stroke(`M${f(x)} ${f(y)} q-4 8 2 16`, c, 1.4); });
    return part('chains', s) + part('crosslinks', nodes.map(([x, y]) => circ(x, y, 3.2, c, { w: 0.6 })).join(''));
  });
  add('Microfluidic device', ENG, 'microfluidic device chip lab-on-a-chip PDMS channel organ-on-chip', '#e36d6d', [100, 70], (c) =>
    part('chip', path('M6 40 L58 16 L96 30 L44 54 Z', '#eef3f6', { stroke: '#a9b6bf' }) + path('M6 40 L44 54 V60 L6 46 Z', '#d7dee3', { stroke: '#a9b6bf' }) + path('M44 54 L96 30 V36 L44 60 Z', '#c8d0d6', { stroke: '#a9b6bf' }))
    + part('channels', stroke('M26 38 L44 30 L58 34 L76 26', c, 1.6) + stroke('M30 42 L46 35 L60 38 L80 30', '#5b8fd6', 1.2))
    + part('ports', [[26, 38], [76, 26], [30, 44], [80, 31]].map(([x, y], i) => ell(x, y, 3, 1.8, i < 2 ? c : '#5b8fd6')).join('')));
  add('Microfluidic devices in dish', ENG, 'microfluidic chips in dish petri organ-on-chip culture', '#e36d6d', [100, 80], (c) =>
    part('dish', path('M6 44 L60 18 L96 36 L42 62 Z', '#e4f0f3', { stroke: PAL.glassLine }) + path('M6 44 L42 62 V66 L6 48 Z', '#cfe0e6', { stroke: PAL.glassLine }) + path('M42 62 L96 36 V40 L42 66 Z', '#c3d6dd', { stroke: PAL.glassLine }))
    + part('chips', [[28, 40], [48, 30], [44, 50], [64, 40], [58, 24], [76, 32]].map(([x, y]) => ell(x, y, 8, 4.2, '#ffffff', { stroke: '#aac1ca' }) + stroke(`M${x - 4} ${y} h8`, c, 1.2) + dot(x - 4, y, 1.2, c) + dot(x + 4, y, 1.2, c)).join('')));
  add('Digital caliper', ENG, 'digital caliper vernier measurement tool engineering', '#3c4148', [140, 60], () =>
    part('jaws', path('M10 6 L16 6 L18 22 L22 22 L22 54 L16 54 L12 30 Z', '#4a5058') + path('M30 6 L36 6 L36 22 L40 22 L38 54 L32 54 L30 30 Z', '#4a5058'))
    + part('beam', rect(22, 22, 110, 8, 1, '#e9ecef', { stroke: '#8d969e' }) + Array.from({ length: 36 }, (_, k) => stroke(`M${58 + k * 2} 22 v${k % 5 ? 2.5 : 4}`, '#5b6168', 0.5)).join('') + rect(132, 24, 6, 3, 0.5, '#5b6168'))
    + part('body', rect(26, 14, 28, 22, 3, '#4a5058') + rect(30, 18, 18, 9, 1, '#c7d8b0', { stroke: '#2a2e33' }) + text(39, 25.5, '19.0', 6, '#2a2e33') + circ(60, 34, 3, '#e9ecef')));
  add('3D printer', ENG, '3D printer additive manufacturing fabrication', '#e9ecef', [100, 100], () =>
    part('frame', box3(14, 16, 64, 76, 18, '#eef1f3')) + part('chamber', rect(22, 24, 48, 50, 1.5, '#d2d9de', { stroke: '#8d969e' }) + rect(26, 28, 40, 3, 1, '#9aa5ae') + rect(30, 60, 32, 3, 1, '#9aa5ae'))
    + part('print head', rect(38, 32, 14, 10, 1.5, '#5b6168') + stroke('M45 42 v6', '#3c4148', 2) + path('M38 64 h18 l-3 -4 h-12 Z', '#5b8fd6'))
    + part('panel', screen(26, 80, 14, 6) + button(60, 83, 2.2) + button(68, 83, 2.2)));
  add('3D printing nozzle', ENG, '3D bioprinting nozzle extrusion bioink print bed', '#e36d6d', [90, 100], (c) =>
    part('bed', path('M4 84 L20 72 H86 L70 84 Z', '#e1e5e9', { stroke: '#9aa5ae' }) + path('M4 84 H70 V88 H4 Z', '#c9d0d6', { stroke: '#9aa5ae' }))
    + part('syringe', rect(38, 4, 14, 36, 2, '#eef4f7', { stroke: PAL.glassLine, op: 0.8 }) + rect(39.5, 18, 11, 21, 1.5, c, { stroke: 'none', w: 0 }) + path('M38 40 H52 L47 54 H43 Z', L(c, 0.1)) + stroke('M45 54 V72', c, 2.2) + glint(41.5, 8, 36, 1.4))
    + part('print', Array.from({ length: 6 }, (_, k) => ell(45, 76, 18 - k * 3, 3.6 - k * 0.6, 'none', { fill: 'none', stroke: c, w: 1.2 })).join('')));
  add('Pressure algometer', ENG, 'pressure algometer force gauge pain threshold dial', '#e6b422', [120, 70], (c) =>
    part('probe', rect(4, 30, 22, 8, 2, '#3c4148') + rect(26, 28, 10, 12, 1.5, '#c3cad1') + rect(36, 26, 22, 16, 3, '#3c4148'))
    + part('dial', circ(84, 34, 28, '#eef1f3', { stroke: '#5b6168', w: 2.4 }) + circ(84, 34, 23, '#f5ecd2', { stroke: '#c3cad1' }) + Array.from({ length: 30 }, (_, k) => { const a = (k / 30) * Math.PI * 2; return stroke(`M${f(84 + Math.cos(a) * 21)} ${f(34 + Math.sin(a) * 21)} L${f(84 + Math.cos(a) * (k % 5 ? 19 : 17))} ${f(34 + Math.sin(a) * (k % 5 ? 19 : 17))}`, '#5b6168', 0.6); }).join('') + stroke('M84 34 L80 54', '#3c4148', 1.4) + circ(84, 34, 2.6, c)));
  add('Electrospinning instrument', ENG, 'electrospinning nanofibres nanofibers syringe collector polymer jet', '#5b8fd6', [80, 120], (c) =>
    part('syringe', rect(32, 4, 14, 26, 2, '#3c4148') + rect(36, 30, 6, 6, 1, '#c3cad1') + stroke('M39 36 V46', '#8d969e', 1.4))
    + part('jet', wave(39, 46, 39, 66, 0.6, 3, c, 0.9) + Array.from({ length: 12 }, (_, k) => ell(39, 68 + k * 3.4, 3 + k * 1.5, 1.4, 'none', { fill: 'none', stroke: c, w: 0.8 })).join(''))
    + part('collector', path('M10 112 L18 106 H66 L58 112 Z', '#e1e5e9', { stroke: '#9aa5ae' }) + path('M10 112 H58 V116 H10 Z', '#c9d0d6', { stroke: '#9aa5ae' })));
  add('Isolation chamber', ENG, 'isolation chamber perfusion bath organ bath tubing', '#6c4aa3', [100, 100], (c) =>
    part('base', path('M8 74 C8 92 92 92 92 74 V64 H8 Z', '#d7dde2') + ell(50, 64, 42, 13, '#eef1f3'))
    + part('chamber', path('M18 22 V62 C18 74 82 74 82 62 V22 Z', '#eef5f8', { stroke: PAL.glassLine, op: 0.6 }) + ell(50, 48, 26, 8, L(c, 0.6), { op: 0.8 }) + ell(50, 22, 32, 9, '#f6fafb', { stroke: PAL.glassLine, op: 0.7 }))
    + part('electrodes', [36, 50, 64].map((x, i) => rect(x - 2.5, 30, 5, 22, 2, i === 1 ? '#5aa864' : '#6bb36b')).join(''))
    + part('tubing', stroke('M30 60 C20 74 14 84 6 96', '#3b4fb3', 3) + stroke('M40 62 C34 78 30 88 24 98', '#c2393f', 3)));
  add('96-well plate', ENG, '96 well plate microplate assay ELISA culture plate', '#e98bb0', [110, 80], (c) =>
    part('plate', plate(8, 16, 92, 56, 8, 12, { skew: 8, well: c, fill: 0.36 })));
  add('PLGA microparticle', ENG, 'PLGA microparticle microsphere drug release porous', '#9bc7e0', [100, 100], (c, r) =>
    part('particle', sball(50, 50, 40, 40, c, { shine: true })) + part('pores', speckle(54, 54, 30, 30, 26, '#ffffff', r, { op: 0.7, min: 1.2, max: 3.2 })) + part('drug', speckle(50, 50, 28, 28, 14, '#e36d6d', r, { op: 0.9, min: 1, max: 2 })));
  add('Antibody-drug nanoparticle', ENG, 'targeted nanoparticle antibody functionalised nanocarrier', '#e8a33d', [100, 100], (c) => {
    let ab = '';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; ab += G(stroke('M0 0 V-6 M0 -6 L-4 -12 M0 -6 L4 -12', line('#5b8fd6'), 3.4) + stroke('M0 0 V-6 M0 -6 L-4 -12 M0 -6 L4 -12', '#5b8fd6', 2), `translate(${f(50 + Math.cos(a) * 32)} ${f(50 + Math.sin(a) * 32)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    return part('antibodies', ab) + part('particle', sball(50, 50, 32, 32, c, { shine: true }));
  });

  // =====================================================================================
  // Microbiology
  // =====================================================================================
  add('Bacillus', MIC, 'bacillus rod bacterium bacteria E. coli flagellum pili', '#6db36d', [120, 60], (c, r) => {
    let pili = '';
    for (let k = 0; k < 18; k++) { const t = k / 18, x = 30 + t * 70, top = k % 2; pili += stroke(`M${f(x)} ${top ? 16 : 44} l${f((r() - 0.5) * 4)} ${top ? -5 : 5}`, D(c, 0.15), 0.8); }
    return part('flagellum', wave(30, 32, 2, 50, 4, 2.4, D(c, 0.2), 1.4)) + part('pili', pili)
      + part('cell', path('M30 30 C30 18 40 14 52 14 H92 C104 14 112 22 112 30 C112 40 104 46 92 46 H52 C40 46 30 42 30 30 Z', c) + flat('M36 26 C38 18 46 18 54 18 H92 C98 18 104 20 106 24 C90 22 60 22 36 26 Z', '#ffffff', 0.3)
        + speckle(72, 30, 34, 10, 22, D(c, 0.15), r, { op: 0.5, min: 0.6, max: 1.4 }));
  });
  add('E. coli', MIC, 'Escherichia coli E. coli gram-negative rod flagella bacterium', '#8cc0e0', [120, 80], (c, r) =>
    part('flagella', wave(26, 38, 2, 20, 3, 2.2, D(c, 0.3), 1.2) + wave(28, 46, 4, 70, 3, 2.2, D(c, 0.3), 1.2) + wave(100, 44, 118, 66, 3, 1.6, D(c, 0.3), 1.2))
    + part('cell', path('M24 40 C24 26 34 22 46 22 H86 C98 22 106 30 106 40 C106 50 98 58 86 58 H46 C34 58 24 54 24 40 Z', c) + path('M28 40 C28 30 36 26 46 26 H86 C96 26 102 32 102 40 C102 48 96 54 86 54 H46 C36 54 28 50 28 40 Z', L(c, 0.3), { stroke: line(L(c, 0.1)), w: 0.6 }))
    + part('nucleoid', wave(44, 40, 86, 40, 4, 3, D(c, 0.25), 1, { taper: false }) + speckle(65, 40, 30, 10, 14, D(c, 0.1), r, { op: 0.6 })));
  add('Staphylococcus', MIC, 'Staphylococcus aureus cocci cluster gram-positive MRSA', '#e2b04a', [100, 100], (c, r) =>
    part('cocci', [[36, 30], [58, 26], [74, 44], [50, 48], [28, 54], [44, 70], [66, 68], [24, 76]].map(([x, y]) => sball(x + (r() - 0.5) * 2, y, 12, 12, c, { shine: true })).join('')));
  add('Streptococcus', MIC, 'Streptococcus chain cocci gram-positive', '#8b78c9', [120, 50], (c) =>
    part('chain', [0, 1, 2, 3, 4, 5].map((k) => sball(12 + k * 19, 25 + Math.sin(k * 0.9) * 6, 10, 9.5, c, { shine: true })).join('')));
  add('Spirochete', MIC, 'spirochete Borrelia Treponema spiral bacterium', '#d07a9e', [120, 50], (c) => part('cell', wave(6, 25, 114, 25, 9, 4.5, c, 5, { outline: true })));
  add('Vibrio', MIC, 'Vibrio cholerae comma-shaped bacterium flagellum', '#5fb3b3', [120, 70], (c) =>
    part('flagellum', wave(92, 22, 118, 12, 3, 1.5, D(c, 0.25), 1.2)) + part('cell', path('M14 52 C10 36 26 22 50 26 C68 28 80 20 92 18 C98 18 100 26 94 30 C82 38 72 44 52 44 C36 44 28 50 24 56 C20 60 15 58 14 52 Z', c) + flat('M22 44 C26 34 38 30 50 31 C40 33 30 37 22 44 Z', '#ffffff', 0.35)));
  add('Bacterial colonies', MIC, 'bacterial colonies agar plate petri dish culture CFU', '#e8c14f', [100, 70], (c, r) => {
    let col = '';
    for (let k = 0; k < 60; k++) { const a = r() * 6.3, d = Math.sqrt(r()) * 0.9; col += circ(50 + Math.cos(a) * 36 * d, 34 + Math.sin(a) * 18 * d, 0.8 + r() * 2.2, c, { w: 0.4 }); }
    return part('dish', path('M6 36 V44 C6 58 94 58 94 44 V36 Z', '#d9e9ef', { stroke: PAL.glassLine, op: 0.9 }) + ell(50, 36, 44, 22, '#e9f3f6', { stroke: PAL.glassLine }))
      + part('agar', ell(50, 36, 40, 19, '#f7edc8', { stroke: '#e3d39b' })) + part('colonies', col);
  });
  add('Streak plate', MIC, 'streak plate isolation agar petri dish quadrant streaking', '#b67f5a', [100, 100], (c, r) => {
    let s = '';
    const zone = (cx, cy, ang, n) => { for (let k = 0; k < n; k++) { const x = cx + (r() - 0.5) * 22, y = cy + (r() - 0.5) * 22; s += ell(x, y, 2 + r() * 3, 1.2 + r(), c, { w: 0.4, rot: ang, op: 0.85 }); } };
    zone(34, 34, -40, 26); zone(66, 36, 20, 18); zone(64, 66, 60, 10); zone(36, 66, -10, 6);
    return part('dish', circ(50, 50, 46, '#e9f3f6', { stroke: PAL.glassLine }) + circ(50, 50, 42, '#e8d4b0', { stroke: '#cdb68d' })) + part('streaks', s + stroke('M22 30 C30 24 40 22 48 26 M56 30 C66 28 76 34 80 42', c, 2.2, { op: 0.6 }));
  });
  add('Plasmid', MIC, 'plasmid circular DNA vector cloning ori resistance gene', '#7a5cc6', [100, 100], (c) =>
    part('backbone', circ(50, 50, 36, 'none', { fill: 'none', stroke: c, w: 3 }))
    + part('features', stroke('M50 14 A36 36 0 0 1 72 21', '#e36d6d', 6, { cap: 'butt' }) + stroke('M84 58 A36 36 0 0 1 64 83', '#3fa5a0', 6, { cap: 'butt' }) + path('M60 79 l8 -1 -3 8 Z', '#3fa5a0', { w: 0.6 })
      + stroke('M24 74 A36 36 0 0 1 16 44', '#5b8fd6', 6, { cap: 'butt' }) + path('M13 48 l3 -8 4 7 Z', '#5b8fd6', { w: 0.6 })));
  add('DNA double helix', MIC, 'DNA double helix genome base pairs', '#2e6fb5', [120, 50], (c) =>
    part('dna', helix(6, 114, 25, 15, 2.4, '#d9363e', c, { w: 3.2, rungC: (i) => ['#e0b341', '#4fa86a', '#d9363e', '#6b8fd6'][i % 4], rw: 1.6 })));
  add('Bacterial outer membrane', MIC, 'bacterial outer membrane LPS lipopolysaccharide gram-negative envelope', '#b568b8', [100, 100], (c) => {
    let lps = '';
    for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2; lps += stroke(`M${f(50 + Math.cos(a) * 40)} ${f(50 + Math.sin(a) * 40)} l${f(Math.cos(a) * 7)} ${f(Math.sin(a) * 7)}`, L(c, 0.2), 0.8) + dot(50 + Math.cos(a) * 48, 50 + Math.sin(a) * 48, 1, c); }
    return part('LPS', lps) + part('membrane', headRing(50, 50, 40, 64, c, L(c, 0.4), { tail: 4, hr: 1.5, tw: 0.6 }) + headRing(50, 50, 32, 52, c, L(c, 0.4), { tail: 4, hr: 1.4, inward: false, tw: 0.6 }));
  });
  add('Yeast', MIC, 'yeast Saccharomyces cerevisiae fungus budding', '#a6714f', [100, 80], (c, r) =>
    part('cell', body(wob(48, 42, 38, 28, r, { amp: 0.06, rot: -14 }), c)) + part('texture', speckle(48, 42, 30, 20, 26, D(c, 0.18), r, { op: 0.4 })));
  add('Budding yeast', MIC, 'budding yeast cell division Saccharomyces bud scar', '#d9b36a', [100, 90], (c, r) =>
    part('mother', body(wob(40, 50, 30, 26, r, { amp: 0.03 }), c) + sball(42, 52, 10, 9, '#c79a5b')) + part('bud', body(wob(76, 30, 14, 12, r, { amp: 0.03 }), L(c, 0.1))) + part('vacuole', sball(30, 40, 8, 7, '#efe1bd')));
  add('Coronavirus', MIC, 'coronavirus SARS-CoV-2 COVID-19 spike virus RNA', '#5a4aa0', [100, 100], (c, r) => {
    let sp = '';
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; sp += G(stroke('M0 0 V-8', '#2fa29d', 2.4) + path('M-5 -9 C-5 -15 5 -15 5 -9 Z', '#2fa29d'), `translate(${f(50 + Math.cos(a) * 30)} ${f(50 + Math.sin(a) * 30)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    return part('spikes', sp) + part('envelope', sball(50, 50, 31, 31, '#8a7ac9')) + part('genome', circ(50, 50, 23, '#d9d1f0', { stroke: line('#8a7ac9') }) + wave(34, 46, 66, 54, 4, 3, c, 1.6) + wave(38, 58, 62, 40, 3, 2, c, 1.4))
      + part('M protein', speckle(50, 50, 28, 28, 10, '#e3a35d', r, { op: 0.9, min: 1.2, max: 1.8 }));
  });
  add('Influenza virus', MIC, 'influenza virus flu hemagglutinin neuraminidase RNA segments', '#3fa5a0', [100, 100], (c) => {
    let sp = '';
    for (let k = 0; k < 30; k++) { const a = (k / 30) * Math.PI * 2; sp += G(k % 3 ? stroke('M0 0 V-8', c, 2.4) : stroke('M0 0 V-6', '#e8a33d', 1.2) + circ(0, -7.5, 2, '#e8a33d', { w: 0.5 }), `translate(${f(50 + Math.cos(a) * 33)} ${f(50 + Math.sin(a) * 33)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    return part('spikes', sp) + part('envelope', circ(50, 50, 33, '#f2f6f7', { stroke: '#9fb7bd' })) + part('segments', [0, 1, 2, 3, 4, 5, 6, 7].map((k) => wave(32 + (k % 4) * 10, 36 + Math.floor(k / 4) * 20, 38 + (k % 4) * 10, 50 + Math.floor(k / 4) * 20, 1.4, 3, '#6b8fd6', 1.2)).join(''));
  });
  add('HIV', MIC, 'HIV retrovirus capsid gp120 lentivirus', '#c25b7c', [100, 100], (c) => {
    let sp = '';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; sp += G(stroke('M0 0 V-6', '#5aa864', 1.6) + circ(-2.4, -8, 2.4, '#7fbf8e', { w: 0.5 }) + circ(2.4, -8, 2.4, '#7fbf8e', { w: 0.5 }), `translate(${f(50 + Math.cos(a) * 34)} ${f(50 + Math.sin(a) * 34)}) rotate(${f((a * 180) / Math.PI + 90)})`); }
    return part('spikes', sp) + part('envelope', sball(50, 50, 34, 34, '#f4e5c9')) + part('capsid', path('M42 30 H58 L64 70 H36 Z', c) + flat('M44 33 H52 L46 66 H40 Z', '#ffffff', 0.25)) + part('RNA', wave(46, 40, 54, 62, 2, 3, '#f2c94c', 1.4));
  });
  add('Bacteriophage', MIC, 'bacteriophage phage T4 virus capsid tail fibres', '#7c8bc9', [80, 120], (c) =>
    part('head', path(poly([[40, 4], [60, 14], [60, 38], [40, 48], [20, 38], [20, 14]]), c) + flat(poly([[40, 4], [60, 14], [40, 24], [20, 14]]), '#ffffff', 0.25) + stroke('M40 24 V48', D(c, 0.15), 0.8))
    + part('tail', rect(36, 48, 8, 36, 2, '#a9b3bd') + Array.from({ length: 8 }, (_, k) => stroke(`M36 ${52 + k * 4} h8`, '#7d8892', 0.8)).join('') + rect(30, 84, 20, 5, 1.5, '#7d8892'))
    + part('fibres', stroke('M30 88 L16 100 L22 116 M50 88 L64 100 L58 116 M34 89 L28 104 L32 116 M46 89 L52 104 L48 116', '#7d8892', 1.6)));
  add('Adenovirus', MIC, 'adenovirus icosahedral capsid fibre gene therapy vector', '#5b8fd6', [100, 100], (c) => {
    let fib = '';
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + 0.26; fib += stroke(`M${f(50 + Math.cos(a) * 30)} ${f(50 + Math.sin(a) * 30)} L${f(50 + Math.cos(a) * 44)} ${f(50 + Math.sin(a) * 44)}`, '#8d969e', 1.4) + circ(50 + Math.cos(a) * 45, 50 + Math.sin(a) * 45, 2.6, '#e8a33d', { w: 0.6 }); }
    const hexP = poly(Array.from({ length: 6 }, (_, k) => [50 + 32 * Math.cos((k / 6) * Math.PI * 2 + Math.PI / 6), 50 + 32 * Math.sin((k / 6) * Math.PI * 2 + Math.PI / 6)]));
    return part('fibres', fib) + part('capsid', path(hexP, c) + flat(poly([[50, 18], [77.7, 34], [50, 50], [22.3, 34]]), '#ffffff', 0.2) + stroke('M50 50 V82 M50 50 L22.3 34 M50 50 L77.7 34', D(c, 0.15), 0.8) + speckle(50, 50, 26, 26, 30, D(c, 0.12), K.rng(5), { op: 0.4 }));
  });
  add('Fungal hyphae', MIC, 'fungus fungal hyphae mycelium mould Aspergillus conidia', '#8faa5a', [100, 100], (c, r) => {
    const segs = K.branches(50, 96, -Math.PI / 2, 22, 4, r, 0.6, 0.78);
    const tips = segs.filter((s) => s.depth === 1).map((s) => s.pts[1]);
    return part('hyphae', K.tree(segs, line(c), 5.4, { depth: 4 }) + K.tree(segs, c, 4, { depth: 4 })) + part('conidia', tips.map(([x, y]) => [0, 1, 2, 3, 4].map((k) => circ(x + Math.cos(k * 1.3) * 4, y + Math.sin(k * 1.3) * 4 - 2, 2, '#4f7f3a', { w: 0.5 })).join('')).join(''));
  });
  add('Biofilm', MIC, 'biofilm bacteria matrix EPS surface attachment', '#6db36d', [120, 70], (c, r) => {
    let b = '';
    for (let k = 0; k < 26; k++) { const x = 12 + r() * 96, y = 30 + r() * 26, a = r() * 180; b += G(path('M-5 -2 H5 Q7 -2 7 0 Q7 2 5 2 H-5 Q-7 2 -7 0 Q-7 -2 -5 -2 Z', k % 4 ? c : '#e8a33d', { w: 0.6 }), `translate(${f(x)} ${f(y)}) rotate(${f(a)})`); }
    return part('surface', rect(0, 60, 120, 8, 1, '#c9d0d6', { stroke: '#9aa5ae' })) + part('matrix', path('M4 60 C6 34 22 24 36 30 C44 14 70 12 80 26 C92 18 112 24 116 60 Z', '#e9f1df', { stroke: '#b9cfa4', op: 0.9 })) + part('bacteria', b);
  });
  add('Shaker flask', MIC, 'shaker flask Erlenmeyer culture flask baffled cap', '#9fd1ec', [80, 100], (c) =>
    part('cap', rect(30, 4, 20, 12, 2, '#e98a3c')) + part('flask', glass('M33 16 H47 V36 L70 84 C72 90 68 94 62 94 H18 C12 94 8 90 10 84 L33 36 Z'))
    + part('liquid', path('M22 62 H58 L68 84 C70 89 66 92 61 92 H19 C14 92 10 89 12 84 Z', c, { op: 0.85 })) + part('glint', glint(37, 20, 40, 2) + stroke('M28 50 L16 78', '#ffffff', 2.4, { op: 0.7 })));
  add('Glass vial and inoculation loop', MIC, 'glass vial inoculation loop culture broth sterile', '#f1d79a', [80, 110], (c) =>
    part('loop', stroke('M54 2 V60', '#5b6168', 1.6) + rect(52, 2, 4, 20, 2, '#3c4148') + ell(54, 64, 3, 4, 'none', { fill: 'none', stroke: '#5b6168', w: 1 }))
    + part('vial', glass('M24 36 H64 V100 Q64 106 58 106 H30 Q24 106 24 100 Z') + rect(22, 30, 44, 8, 2, '#dfe6ea', { stroke: PAL.glassLine }))
    + part('broth', path('M25 62 H63 V100 Q63 105 58 105 H30 Q25 105 25 100 Z', c, { op: 0.85 })) + part('glint', glint(29, 42, 98, 2)));
  add('Petri dish', MIC, 'petri dish agar plate empty culture', '#f3e2a6', [100, 60], (c) =>
    part('dish', path('M6 28 V36 C6 50 94 50 94 36 V28 Z', '#d9e9ef', { stroke: PAL.glassLine, op: 0.9 }) + ell(50, 28, 44, 20, '#e9f3f6', { stroke: PAL.glassLine }))
    + part('agar', ell(50, 29, 40, 17, c, { stroke: line(c), op: 0.9 })) + part('glint', stroke('M20 18 C28 12 40 10 50 10', '#ffffff', 2, { op: 0.7 })));
  add('Malaria parasite (Plasmodium)', MIC, 'Plasmodium falciparum malaria ring stage red blood cell parasite', '#d9534f', [100, 100], (c) =>
    part('rbc', sball(50, 50, 40, 38, c)) + part('parasite', circ(46, 46, 11, 'none', { fill: 'none', stroke: '#6b4fa3', w: 3 }) + circ(54, 38, 3.4, '#6b4fa3', { w: 0.6 })) + part('dots', speckle(50, 50, 30, 30, 12, D(c, 0.25), K.rng(9), { op: 0.7 })));
  add('Gram-positive cell wall', MIC, 'gram positive cell wall peptidoglycan teichoic acid envelope', '#8b6fc4', [120, 70], (c) => {
    let pg = '';
    for (let k = 0; k < 4; k++) pg += rect(0, 8 + k * 7, 120, 5, 2.5, k % 2 ? L(c, 0.35) : L(c, 0.2), { w: 0.6 });
    for (let k = 0; k < 8; k++) pg += stroke(`M${8 + k * 15} 6 V40`, '#e8a33d', 1.2);
    return part('peptidoglycan', pg) + part('membrane', rect(0, 42, 120, 4, 0, '#e6cf8f', { w: 0 }) + rect(0, 52, 120, 4, 0, '#e6cf8f', { w: 0 }) + Array.from({ length: 30 }, (_, k) => circ(2 + k * 4, 42, 1.6, c, { w: 0.4 }) + circ(2 + k * 4, 56, 1.6, c, { w: 0.4 })).join(''));
  });
})();
