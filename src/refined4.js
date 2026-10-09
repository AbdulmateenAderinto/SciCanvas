// Refined icons, part 4: neuroscience, and molecules & proteins (drawn with src/refinedkit.js).
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, path, rect, circ, ell, stroke, flat, dot, text, part, G, poly, smooth, wob, body, sball, speckle, glass, wave, tube, helix, branches, tree, add } = K;
  const NEU = 'Neuroscience', MOL = 'Molecules & proteins', IMM = 'Immune molecules';

  // =====================================================================================
  // Neuroscience
  // =====================================================================================
  // Lateral brain outline (cerebrum + cerebellum + brainstem) in a 120 × 90 box.
  const CEREBRUM = 'M14 50 C8 30 24 10 52 8 C78 6 104 14 110 36 C114 50 108 60 98 62 C90 64 82 60 74 62 C64 64 58 70 46 70 C30 70 18 64 14 50 Z';
  const gyri = (c) => stroke('M30 20 C36 28 30 36 38 42 M50 12 C46 22 54 28 50 38 C48 46 56 52 52 60 M68 12 C64 22 72 30 66 40 M84 18 C80 28 88 34 84 44 M98 28 C94 36 100 42 96 50 M24 40 C30 44 26 52 34 56 M40 48 C46 52 64 52 70 46 M74 52 C82 50 90 54 96 50', D(c, 0.18), 1.1);
  const cerebellum = (c) => path('M78 62 C80 72 92 78 102 74 C108 70 108 62 100 60 C92 62 86 60 78 62 Z', L(c, 0.05)) + stroke('M84 66 C90 68 98 68 104 64 M84 70 C90 72 98 72 102 69', D(c, 0.15), 0.8);
  const stem = (c) => path('M64 64 C66 72 66 80 62 88 H72 C74 80 76 72 76 62 Z', L(c, 0.12));
  const brainLat = (c) => part('brainstem', stem(c)) + part('cerebellum', cerebellum(c)) + part('cerebrum', path(CEREBRUM, c) + flat('M22 36 C24 22 40 12 58 12 C42 16 30 24 22 36 Z', '#ffffff', 0.35) + gyri(c));
  add('Lateral brain', NEU, 'brain lateral view cerebrum cerebellum brainstem gyri sulci', '#eab0ae', [120, 90], (c) => brainLat(c));
  add('Lateral brain with vessels', NEU, 'brain vasculature middle cerebral artery blood vessels lateral', '#eab0ae', [120, 90], (c, r) =>
    brainLat(c) + part('vessels', tree(branches(58, 46, -2.6, 12, 4, r, 0.6), PAL.vessel, 2.2, { depth: 4 }) + tree(branches(60, 46, -0.4, 14, 4, r, 0.6), PAL.vessel, 2.2, { depth: 4 }) + tree(branches(58, 48, 0.9, 10, 3, r, 0.6), PAL.vessel, 1.8, { depth: 3 })));
  add('Brain (sagittal cut)', NEU, 'brain sagittal section midline corpus callosum thalamus', '#eab0ae', [120, 90], (c) =>
    brainLat(c).replace(gyri(c), '') + part('section', path('M30 44 C34 30 54 24 70 28 C82 30 90 38 88 46 C80 40 64 36 50 40 C42 42 36 46 30 44 Z', '#f5e4dc') + path('M52 42 C56 38 66 38 70 42 C72 48 66 54 58 54 C52 54 50 48 52 42 Z', D(c, 0.12)) + stroke('M28 22 C34 28 30 34 36 38 M46 16 C44 24 50 28 48 34 M84 22 C80 28 86 34 82 40 M98 34 C94 40 98 44 96 50', D(c, 0.18), 1)));
  add('Brain (coronal cut)', NEU, 'brain coronal section ventricles grey matter white matter', '#eab0ae', [100, 90], (c) =>
    part('hemispheres', path('M50 10 C30 6 8 18 8 42 C8 62 22 76 40 76 C46 76 48 72 50 70 C52 72 54 76 60 76 C78 76 92 62 92 42 C92 18 70 6 50 10 Z', c) + path('M50 16 C34 14 16 24 16 42 C16 58 28 68 40 68 C46 68 50 64 50 60 C50 64 54 68 60 68 C72 68 84 58 84 42 C84 24 66 14 50 16 Z', '#f6e3dd'))
    + part('ventricles', path('M44 34 C40 40 40 48 46 50 L50 46 L54 50 C60 48 60 40 56 34 C54 40 50 42 50 42 C50 42 46 40 44 34 Z', '#ffffff', { stroke: line(c) }))
    + part('basal ganglia', ell(34, 50, 6, 8, D(c, 0.08), { stroke: line(c) }) + ell(66, 50, 6, 8, D(c, 0.08), { stroke: line(c) })) + part('stem', path('M44 70 C46 80 46 86 44 90 H56 C54 86 54 80 56 70 Z', L(c, 0.12))));
  add('Brain with regions (coronal)', NEU, 'brain regions coronal cortex hippocampus thalamus striatum atlas', '#b6c9e8', [100, 90], () =>
    part('cortex', path('M50 10 C30 6 8 18 8 42 C8 62 22 76 40 76 C46 76 48 72 50 70 C52 72 54 76 60 76 C78 76 92 62 92 42 C92 18 70 6 50 10 Z', '#f2f4f6', { stroke: '#a9b6bf' }) + stroke('M14 30 C10 40 12 56 22 66', '#5b8fd6', 4) + stroke('M86 30 C90 40 88 56 78 66', '#3fa5a0', 4) + stroke('M24 16 C34 10 44 10 50 12 M50 12 C58 10 70 12 78 18', '#7c6fc9', 4))
    + part('regions', ell(34, 46, 8, 10, '#f2c94c') + ell(66, 46, 8, 10, '#e98bb0') + ell(50, 56, 7, 6, '#e36d6d') + path('M26 60 C30 66 38 66 40 60 Z', '#6bb36b') + path('M60 60 C62 66 70 66 74 60 Z', '#ef9a4f')));
  add('Brain (superior view)', NEU, 'brain superior view top dorsal hemispheres longitudinal fissure', '#eab0ae', [80, 100], (c) =>
    part('left hemisphere', path('M38 6 C20 6 8 22 8 48 C8 76 20 94 38 94 Z', c)) + part('right hemisphere', path('M42 6 C60 6 72 22 72 48 C72 76 60 94 42 94 Z', c))
    + part('gyri', stroke('M18 20 C26 24 20 32 28 36 M14 44 C22 46 18 54 28 56 M18 70 C26 70 24 78 32 82 M30 12 C28 22 34 28 30 40 M62 20 C54 24 60 32 52 36 M66 44 C58 46 62 54 52 56 M62 70 C54 70 56 78 48 82 M50 12 C52 22 46 28 50 40', D(c, 0.18), 1.1) + flat('M14 30 C16 18 26 10 36 10 C26 16 18 24 14 30 Z', '#ffffff', 0.35)));
  const HEAD = 'M30 108 C30 96 26 90 22 84 C16 76 12 64 12 50 C12 24 32 6 58 6 C82 6 98 22 98 46 C98 54 100 58 104 64 C106 68 102 70 98 70 C98 76 98 80 96 84 C94 88 88 88 84 90 C82 96 82 102 82 108 Z';
  add('Lateral brain in head', NEU, 'head profile brain lateral human anatomy neurology', '#eab0ae', [110, 110], (c) =>
    part('head', path(HEAD, PAL.skin, { op: 0.55 })) + G(brainLat(c), 'translate(8 6) scale(0.78)'));
  add('Anterior brain in head', NEU, 'head anterior front view brain human anatomy', '#eab0ae', [100, 110], (c) =>
    part('head', path('M50 4 C26 4 14 22 14 46 C14 70 28 88 38 94 V108 H62 V94 C72 88 86 70 86 46 C86 22 74 4 50 4 Z', PAL.skin, { op: 0.55 }) + path('M8 108 C10 100 24 96 38 94 H62 C76 96 90 100 92 108 Z', PAL.skin, { op: 0.4 }))
    + part('brain', path('M50 10 C32 8 20 20 20 36 C20 48 30 54 40 54 C46 54 48 50 50 48 C52 50 54 54 60 54 C70 54 80 48 80 36 C80 20 68 8 50 10 Z', c) + stroke('M50 12 V48 M30 24 C34 28 30 34 36 38 M70 24 C66 28 70 34 64 38', D(c, 0.18), 1)));
  add('Brain and spinal cord', NEU, 'central nervous system CNS brain spinal cord nerves peripheral parasympathetic', '#eab0ae', [80, 160], (c) =>
    part('nerves', [30, 46, 62, 78, 94, 110, 126].map((y, i) => stroke(`M36 ${y} C${26 - i} ${y + 4} ${18 - i} ${y + 10} ${10 - i} ${y + 18} M44 ${y} C${54 + i} ${y + 4} ${62 + i} ${y + 10} ${70 + i} ${y + 18}`, PAL.nerve, 0.9)).join(''))
    + part('spinal cord', tube([[40, 26], [40, 90], [40, 150]], 6, L(c, 0.05), { hi: false }))
    + part('brain', path('M40 2 C22 2 10 12 10 24 C10 34 20 38 30 36 C34 36 38 34 40 32 C42 34 46 36 50 36 C60 38 70 34 70 24 C70 12 58 2 40 2 Z', c) + stroke('M40 4 V32 M22 14 C26 18 22 24 28 26 M58 14 C54 18 58 24 52 26', D(c, 0.18), 1)));
  add('Spinal cord (cross-section)', NEU, 'spinal cord cross section grey matter white matter butterfly dorsal ventral horn', '#eab0ae', [100, 80], (c) =>
    part('white matter', ell(50, 40, 44, 34, '#f6ece6', { stroke: line(c) })) + part('grey matter', path('M50 24 C44 10 26 8 24 18 C22 28 34 30 36 36 C30 44 18 50 22 62 C26 70 40 62 46 52 L50 54 L54 52 C60 62 74 70 78 62 C82 50 70 44 64 36 C66 30 78 28 76 18 C74 8 56 10 50 24 Z', c))
    + part('canal', circ(50, 40, 2.4, '#ffffff')) + part('roots', stroke('M20 26 L4 18 M80 26 L96 18 M22 58 L6 68 M78 58 L94 68', PAL.nerve, 2) + ell(10, 20, 4, 3, PAL.nerve) + ell(90, 20, 4, 3, PAL.nerve)));
  add('Hippocampus', NEU, 'hippocampus memory limbic system seahorse', '#e8a07c', [100, 70], (c) =>
    part('hippocampus', tube([[10, 52], [20, 32], [42, 20], [66, 22], [84, 34], [86, 50], [76, 58], [66, 52], [68, 44]], 13, c) + stroke(smooth([[16, 50], [24, 34], [42, 26], [64, 28], [78, 38], [79, 48]], false), D(c, 0.2), 1, { dash: '3 2' })));
  // Neurons
  const soma = (x, y, rx, ry, c, r) => body(wob(x, y, rx, ry, r, { amp: 0.08 }), c, { hi: 0.25 }) + sball(x + 0.5, y, rx * 0.42, ry * 0.42, D(c, 0.12)) + dot(x + 1, y - 0.5, rx * 0.12, '#ffffff', 0.7);
  add('Multipolar neuron', NEU, 'multipolar neuron nerve cell dendrites axon soma', '#c25b9e', [80, 120], (c, r) => {
    const dend = [...branches(40, 30, -1.9, 10, 4, r, 0.5), ...branches(40, 30, -1.2, 10, 4, r, 0.5), ...branches(40, 30, -2.6, 9, 3, r, 0.5), ...branches(40, 30, -0.5, 9, 3, r, 0.5)];
    return part('dendrites', tree(dend, c, 2.6, { depth: 4 })) + part('axon', stroke('M40 34 C41 60 39 80 40 104 M40 104 L32 116 M40 104 L40 117 M40 104 L48 116', c, 1.6)) + part('soma', soma(40, 30, 8, 7, c, r));
  });
  add('Pyramidal neuron', NEU, 'pyramidal neuron cortical neuron apical dendrite', '#c25b9e', [80, 120], (c, r) =>
    part('apical dendrite', stroke('M40 54 V14', c, 2.2) + tree([...branches(40, 14, -1.9, 7, 3, r, 0.6), ...branches(40, 14, -1.2, 7, 3, r, 0.6)], c, 1.6, { depth: 3 }) + [24, 34, 44].map((y, i) => stroke(`M40 ${y} l${i % 2 ? 8 : -8} -6 M40 ${y + 4} l${i % 2 ? -7 : 7} -5`, c, 1)).join(''))
    + part('basal dendrites', tree([...branches(36, 62, 2.4, 9, 3, r, 0.5), ...branches(44, 62, 0.7, 9, 3, r, 0.5)], c, 1.8, { depth: 3 })) + part('axon', stroke('M40 66 V116', c, 1.4))
    + part('soma', path('M40 48 L50 64 C46 68 34 68 30 64 Z', L(c, 0.35)) + sball(40, 61, 3.6, 3.4, D(c, 0.1))));
  add('Purkinje cell', NEU, 'Purkinje cell cerebellum neuron dendritic tree', '#c25b9e', [100, 110], (c, r) =>
    part('dendrites', tree([...branches(50, 66, -1.9, 14, 6, r, 0.42, 0.72), ...branches(50, 66, -1.25, 14, 6, r, 0.42, 0.72)], c, 2.6, { depth: 6 })) + part('axon', stroke('M50 74 V106', c, 1.4)) + part('soma', soma(50, 68, 6.5, 6, c, r)));
  add('Myelinated motor neuron', NEU, 'motor neuron myelin sheath Schwann cells axon nodes of Ranvier', '#c25b9e', [80, 140], (c, r) =>
    part('dendrites', tree([...branches(40, 22, -1.6, 9, 3, r, 0.6), ...branches(40, 22, -0.4, 8, 3, r, 0.6), ...branches(40, 22, -2.7, 8, 3, r, 0.6), ...branches(40, 22, 2.2, 7, 2, r, 0.6)], c, 2, { depth: 3 }))
    + part('axon', stroke('M40 28 C42 60 36 90 42 126', c, 1.6) + stroke('M42 126 L34 136 M42 126 L42 138 M42 126 L50 136', c, 1.2))
    + part('myelin', [40, 56, 72, 88, 104].map((y, i) => G(rect(-3.6, -6.5, 7.2, 13, 3.6, '#efcfa8', { stroke: '#c9a27a' }), `translate(${f(40.6 + Math.sin(y / 20) * 1.6 - (i > 2 ? 1 : 0))} ${y}) rotate(${i > 2 ? 4 : -3})`)).join('')) + part('soma', soma(40, 22, 7, 6.5, c, r)));
  add('Sensory neuron (pseudounipolar)', NEU, 'sensory neuron pseudounipolar dorsal root ganglion', '#c25b9e', [120, 60], (c, r) =>
    part('axon', stroke('M6 40 C30 40 50 40 60 36 C70 40 90 40 114 40', c, 1.6) + stroke('M60 36 V24', c, 1.6) + tree(branches(6, 40, Math.PI, 6, 3, r, 0.6), c, 1.2, { depth: 3 })) + part('soma', soma(60, 20, 7, 6.5, c, r)));
  add('Astrocyte', NEU, 'astrocyte glia glial cell star-shaped', '#4fa8a0', [100, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + r() * 0.3; s += tree(branches(50 + Math.cos(a) * 6, 50 + Math.sin(a) * 6, a, 14, 4, r, 0.55, 0.7), c, 3.4, { depth: 4 }); }
    return part('processes', s) + part('soma', soma(50, 50, 10, 9, c, r));
  });
  add('Microglia', NEU, 'microglia glia resident macrophage CNS ramified', '#d98f4f', [100, 100], (c, r) => {
    let s = '';
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r(); s += tree(branches(50, 50, a, 13, 4, r, 0.6, 0.72), c, 2.2, { depth: 4 }); }
    return part('processes', s) + part('soma', soma(50, 50, 8, 6, c, r));
  });
  add('Oligodendrocyte', NEU, 'oligodendrocyte myelinating glia CNS myelin', '#7c6fc9', [110, 90], (c, r) =>
    part('axons', stroke('M4 18 H106 M4 72 H106 M4 46 C30 40 80 52 106 46', '#c9a27a', 1.4)) + part('processes', stroke('M55 44 C40 32 30 24 28 18 M55 44 C70 32 78 24 80 18 M55 50 C44 60 38 66 34 72 M55 50 C66 60 74 66 78 72', c, 1.4))
    + part('myelin', [[28, 18], [80, 18], [34, 72], [78, 72]].map(([x, y]) => rect(x - 9, y - 4, 18, 8, 4, L(c, 0.45))).join('')) + part('soma', soma(55, 47, 8, 7, c, r)));
  add('Schwann cell', NEU, 'Schwann cell myelin peripheral nerve wrapping axon', '#e2b15e', [110, 50], (c) =>
    part('axon', stroke('M2 25 H108', '#c25b9e', 2.4)) + part('sheath', rect(26, 13, 58, 24, 12, L(c, 0.3)) + [0, 1, 2, 3].map((k) => stroke(`M${32 + k * 2} 15 V35`, D(c, 0.1), 0.7)).join('') + sball(56, 14, 6, 3.6, c)));
  add('Presynaptic terminal', NEU, 'presynaptic membrane terminal synaptic vesicles neurotransmitter bouton', '#d9e1e8', [80, 110], (c) =>
    part('terminal', path('M28 2 H52 V30 C70 36 76 56 76 76 C76 92 64 102 60 102 C58 96 54 92 50 92 C46 92 42 96 40 102 H34 C30 96 24 92 18 92 C12 92 8 96 6 100 C4 86 4 62 12 48 C18 38 24 34 28 30 Z', c, { stroke: '#8d969e' }))
    + part('vesicles', [[30, 52], [46, 46], [60, 62], [36, 70], [52, 78], [24, 84]].map(([x, y]) => circ(x, y, 5, '#ffffff', { stroke: '#8d969e' })).join('')));
  add('Synapse', NEU, 'synapse synaptic cleft neurotransmitter release receptors pre post', '#c9b6e4', [100, 100], (c, r) => {
    let nt = '';
    for (let k = 0; k < 16; k++) nt += dot(34 + r() * 32, 54 + r() * 10, 1.2, '#e8a33d');
    return part('presynaptic', path('M30 2 H70 V18 C84 24 88 40 86 50 H14 C12 40 16 24 30 18 Z', c) + [[36, 34], [50, 30], [64, 36], [44, 44], [58, 44]].map(([x, y]) => circ(x, y, 4.4, '#fff7e8', { stroke: line(c) }) + dot(x, y, 1, '#e8a33d') + dot(x + 1.6, y - 1, 1, '#e8a33d')).join(''))
      + part('postsynaptic', path('M10 68 H90 C92 80 88 94 80 100 H20 C12 94 8 80 10 68 Z', L(c, 0.2))) + part('receptors', [26, 38, 50, 62, 74].map((x) => rect(x - 2, 64, 4, 8, 1.5, '#5fb3b3', { w: 0.6 })).join('')) + part('neurotransmitter', nt);
  });
  add('Neuromuscular junction', NEU, 'neuromuscular junction motor end plate acetylcholine muscle fibre', '#c25b9e', [110, 80], (c) =>
    part('muscle', rect(4, 46, 102, 28, 6, '#e8a0a0') + Array.from({ length: 12 }, (_, k) => stroke(`M${10 + k * 8} 48 V72`, '#d07c7c', 0.8)).join(''))
    + part('axon', stroke('M54 4 V30', c, 2.4) + path('M30 46 C30 32 42 28 54 28 C66 28 78 32 78 46 Z', L(c, 0.35))) + part('vesicles', [40, 50, 60, 68].map((x) => circ(x, 40, 2.6, '#ffffff', { stroke: line(c), w: 0.6 })).join('')));
  add('Action potential', NEU, 'action potential membrane voltage depolarisation spike trace', '#c25b9e', [110, 70], (c) =>
    part('axes', stroke('M8 6 V64 H104', '#5b6168', 1) + stroke('M8 50 H104', '#9aa5ae', 0.6, { dash: '2 2' })) + part('trace', stroke('M8 50 H34 C38 50 38 44 40 42 C42 30 44 10 46 10 C48 10 50 30 52 52 C54 60 58 58 62 54 C68 50 80 50 104 50', c, 2)));
  add('EEG electrode cap', NEU, 'EEG electroencephalography electrode cap brain recording', '#5b8fd6', [100, 100], (c) =>
    part('head', path('M50 8 C26 8 12 26 12 50 C12 70 24 88 36 94 H64 C76 88 88 70 88 50 C88 26 74 8 50 8 Z', PAL.skin, { op: 0.65 }))
    + part('cap', path('M14 46 C14 22 30 8 50 8 C70 8 86 22 86 46 C70 40 30 40 14 46 Z', L(c, 0.5))) + part('electrodes', [[24, 32], [36, 22], [50, 18], [64, 22], [76, 32], [30, 40], [50, 32], [70, 40]].map(([x, y]) => circ(x, y, 3.4, c, { w: 0.8 })).join(''))
    + part('wires', stroke('M50 18 C52 6 70 2 90 4 M64 22 C70 10 84 8 96 10', '#5b6168', 0.8)));
  // Mice
  // Lab mouse in side view after the reference: elongated body with a high rounded rump, pointed snout, round pink-lined
  // ear, dark red eye, pink feet and a long pink tapering tail (about body length).
  const MOUSE = 'M105 51 C101 46 95 41 89 39 C85 32 77 28 68 30 C56 23 34 24 24 34 C15 43 16 58 26 63 C31 66 38 66 44 64 C54 66 66 66 74 63 C82 62 86 60 91 58 C98 56 103 54 105 51 Z';
  const PINK = '#eeb2b4';
  const mouseSide = (c, o = {}) => part('tail', path(K.taper([[24, 58], [12, 64], [9, 76], [24, 87], [52, 89], [80, 85]], o.tail ?? 4.4, 1), PINK, { w: 0.8 }))
    + part('feet', path('M33 64 C38 64 46 65 51 66 C53 67 52 69 49 69 L35 68 C32 68 31 65 33 64 Z', PINK, { w: 0.8 }) + path('M82 62 L84 67 C85 69 90 69 91 67 L88 61 Z', PINK, { w: 0.8 }))
    + part('body', path(MOUSE, c) + flat('M28 40 C36 31 50 28 62 31 C50 32 38 35 28 40 Z', '#ffffff', 0.4) + stroke('M42 40 C52 44 56 55 50 64', line(c), 0.9, { op: 0.55 }) + stroke('M80 52 C82 56 84 60 84 64', line(c), 0.9, { op: 0.55 }))
    + part('ear', ell(82, 33, (o.ear ?? 1) * 7, (o.ear ?? 1) * 8.5, c, { rot: -15 }) + ell(82.6, 33.6, (o.ear ?? 1) * 4.6, (o.ear ?? 1) * 6, PINK, { stroke: 'none', w: 0, rot: -15 }))
    + part('face', circ(94, 43, 1.9, '#8c2335', { w: 0.5 }) + dot(93.5, 42.4, 0.6, '#ffffff') + ell(103.6, 50, 1.8, 1.5, '#e98b97', { w: 0.5 }) + stroke('M100 51 l9 -4 M100 52 l10 0 M100 53 l9 4', '#9aa3ab', 0.4));
  K.mouseSide = mouseSide; // reused by refined6.js (mouse with organs / tumours)
  add('Lab mouse (side)', NEU, 'mouse lab mouse rodent animal model C57BL/6 side view', '#eceae8', [110, 100], (c) => mouseSide(c));
  add('Lab mouse (black)', NEU, 'black mouse C57BL/6 B6 rodent animal model', '#4a4f57', [110, 100], (c) => mouseSide(c));
  add('Mouse with optrodes', NEU, 'mouse optogenetics optrode optic fibre implant behaviour', '#4a4f57', [110, 100], (c) =>
    mouseSide(c) + part('implant', rect(70, 20, 8, 11, 2, '#c3cad1') + stroke('M73 20 C72 10 66 6 58 4', '#5b8fd6', 1.2) + stroke('M75 20 C80 8 90 6 100 6', '#3fa5a0', 1.2) + circ(58, 4, 2, '#5b8fd6', { w: 0.5 }) + circ(100, 6, 2, '#3fa5a0', { w: 0.5 })));
  add('Mouse head with brain', NEU, 'mouse anterior head brain coronal rodent neuroscience', '#e6e5e3', [100, 100], (c) =>
    part('ears', circ(20, 26, 16, c) + circ(20, 26, 10, '#f2b6b6', { stroke: 'none', w: 0 }) + circ(80, 26, 16, c) + circ(80, 26, 10, '#f2b6b6', { stroke: 'none', w: 0 }))
    + part('head', path('M50 16 C30 16 20 34 22 56 C24 74 38 92 50 96 C62 92 76 74 78 56 C80 34 70 16 50 16 Z', c))
    + part('brain', path('M50 22 C38 22 32 30 32 40 C32 48 40 50 50 50 C60 50 68 48 68 40 C68 30 62 22 50 22 Z', '#eab0ae') + stroke('M50 24 V48', D('#eab0ae', 0.2), 1))
    + part('face', dot(38, 60, 2.2, '#2a2e33') + dot(62, 60, 2.2, '#2a2e33') + ell(50, 88, 3, 2.2, '#f2a2a8') + stroke('M44 86 l-14 -2 M44 88 h-14 M56 86 l14 -2 M56 88 h14', '#8d969e', 0.5)));
  add('Mouse brain', NEU, 'mouse brain rodent olfactory bulb cerebellum lateral', '#eab0ae', [120, 70], (c) =>
    part('olfactory bulb', ell(14, 34, 10, 8, L(c, 0.05))) + part('cerebrum', path('M20 34 C20 18 40 10 64 12 C82 14 92 22 92 34 C92 44 82 50 64 50 C42 50 20 48 20 34 Z', c) + flat('M28 26 C34 18 46 14 60 14 C48 18 36 22 28 26 Z', '#ffffff', 0.35))
    + part('cerebellum', path('M88 26 C98 24 108 30 108 40 C108 48 100 52 92 50 C90 44 92 36 88 26 Z', L(c, 0.05)) + stroke('M94 30 C98 36 98 42 96 48 M100 30 C104 36 104 42 102 48', D(c, 0.15), 0.8)) + part('stem', path('M80 48 C86 54 92 58 100 58 L98 50 Z', L(c, 0.12))));
  add('Mouse brain with vasculature', NEU, 'mouse brain vessels vasculature blood flow', '#eab0ae', [120, 70], (c, r) =>
    ICON_MAP['r-mouse-brain'].draw(c) + part('vessels', tree(branches(56, 46, -1.7, 10, 4, r, 0.6), '#4b63b5', 1.6, { depth: 4 }) + tree(branches(40, 44, -1.3, 9, 4, r, 0.6), PAL.vessel, 1.6, { depth: 4 }) + tree(branches(74, 44, -2.0, 9, 3, r, 0.6), '#4b63b5', 1.4, { depth: 3 })));
  add('Mouse brain (coronal section)', NEU, 'mouse brain coronal slice section atlas plane', '#eab0ae', [120, 80], (c) =>
    G(ICON_MAP['r-mouse-brain'].draw(c), 'translate(0 8)') + part('plane', path('M54 2 L72 10 V78 L54 70 Z', '#9fcbea', { stroke: '#5b8fd6', op: 0.45 })));
  add('Forced swim test', NEU, 'forced swim test Porsolt behaviour depression mouse cylinder water', '#7fb8e3', [100, 80], (c) =>
    part('container', path('M8 30 V60 C8 76 92 76 92 60 V30 Z', '#e9eef2', { stroke: '#9aa5ae' }) + ell(50, 30, 42, 12, '#f3f6f8', { stroke: '#9aa5ae' }))
    + part('water', ell(50, 34, 38, 10, c, { op: 0.85 })) + part('mouse', path('M42 32 C42 26 50 24 56 26 C62 22 68 26 64 30 C66 34 60 38 54 36 C48 38 42 36 42 32 Z', '#f2f4f6', { stroke: '#a9b6bf' }) + dot(62, 27, 0.8, '#2a2e33'))
    + part('ripples', ell(52, 33, 18, 5, 'none', { fill: 'none', stroke: '#ffffff', w: 1, op: 0.7 })));
  add('Rat (side)', NEU, 'rat rodent animal model Sprague Dawley Wistar', '#ebe7e1', [130, 90], (c) => G(mouseSide(c, { ear: 0.75, tail: 5.6 }), 'translate(1 -9) scale(1.16 1)'));
  add('Morris water maze', NEU, 'Morris water maze spatial memory platform pool behaviour', '#7fb8e3', [110, 70], (c) =>
    part('pool', ell(55, 38, 50, 26, '#e9eef2', { stroke: '#9aa5ae' }) + ell(55, 36, 46, 22, c, { op: 0.8 })) + part('platform', ell(76, 30, 6, 3, '#ffffff', { stroke: '#9aa5ae' }))
    + part('path', stroke('M30 44 C40 36 30 28 44 24 C58 22 50 40 64 38 C70 36 72 32 76 30', '#e36d6d', 1, { dash: '2 1.6' })) + part('mouse', ell(30, 44, 4, 2.6, '#f2f4f6', { stroke: '#a9b6bf' })));

  // =====================================================================================
  // Molecules & proteins
  // =====================================================================================
  add('Generic protein', MOL, 'protein globular generic enzyme blob', '#3fa5a0', [100, 100], (c, r) =>
    part('protein', body(wob(50, 50, 30, 36, r, { amp: 0.08, mod: (a) => 0.12 * Math.sin(2 * a + 1) }), c, { hi: 0.25 })));
  add('Protein (C-shaped)', MOL, 'protein C-shaped clamp enzyme sigma factor', '#cc8022', [100, 100], (c, r) => {
    const pts = wob(50, 50, 36, 34, r, { amp: 0.06, n: 60, mod: (a) => (Math.cos(a - 0.4) > 0.7 ? -0.5 * (Math.cos(a - 0.4) - 0.7) * 3 : 0) });
    return part('protein', body(pts, c, { hi: 0.2 }) + speckle(46, 50, 22, 22, 14, D(c, 0.12), r, { op: 0.45, min: 1, max: 2.4 }));
  });
  add('RNA polymerase', MOL, 'RNA polymerase transcription enzyme clamp', '#c7ddf3', [120, 100], (c) =>
    part('clamp', path('M14 58 C10 34 34 14 62 14 C92 14 112 30 110 50 C108 60 98 62 90 58 C86 50 76 46 68 50 C62 54 66 62 74 64 C82 66 90 64 96 70 C98 82 84 94 62 94 C36 94 18 80 14 58 Z', c, { op: 0.95 }) + flat('M22 50 C24 32 40 20 60 20 C42 26 30 36 22 50 Z', '#ffffff', 0.5)));
  add('Sigma factor', MOL, 'sigma factor transcription initiation bacterial', '#c97c1f', [80, 80], (c, r) =>
    part('protein', body([[14, 50], [18, 30], [32, 16], [46, 22], [60, 14], [70, 26], [66, 42], [56, 50], [52, 64], [44, 72], [38, 60], [26, 66]].map(([x, y]) => [x + (r() - 0.5) * 2, y]), c, { hi: 0.18 }) + speckle(42, 40, 20, 18, 14, D(c, 0.15), r, { op: 0.5, min: 1, max: 2.6 })));
  add('DNA', MOL, 'DNA double helix promoter terminator gene', '#1aa0d6', [120, 40], (c) => part('dna', helix(4, 116, 20, 7, 4, c, D(c, 0.15), { w: 2, rungs: false })));
  add('DNA with promoter and terminator', MOL, 'DNA promoter terminator gene transcription unit', '#1aa0d6', [120, 50], (c) =>
    part('promoter', helix(4, 30, 20, 7, 1, '#7a5a2e', '#5a3e1c', { w: 2, rungs: false })) + part('gene', helix(30, 96, 20, 7, 2.5, c, D(c, 0.15), { w: 2, rungs: false })) + part('terminator', helix(96, 116, 20, 7, 0.8, '#b02a2a', '#7a1717', { w: 2, rungs: false }))
    + part('labels', text(16, 42, 'Promoter', 6, '#7a5a2e') + text(106, 42, 'Terminator', 6, '#b02a2a')));
  add('mRNA', MOL, 'mRNA messenger RNA transcript 5 cap poly-A tail', '#b568b8', [120, 50], (c) =>
    part('cap', circ(8, 26, 4, '#e36d6d')) + part('strand', wave(12, 26, 96, 26, 6, 3.5, c, 2.2)) + part('poly-A tail', stroke('M96 26 H116', '#9aa5ae', 2.2, { dash: '2 1.6' })));
  add('Ubiquitin', MOL, 'ubiquitin Ub degradation tag ubiquitination', '#e6b422', [60, 60], (c, r) => part('ubiquitin', body(wob(30, 30, 20, 18, r, { amp: 0.06 }), c, { hi: 0.25 })));
  add('Polyubiquitin chain', MOL, 'polyubiquitin chain K48 proteasomal degradation', '#e6b422', [110, 50], (c, r) => part('chain', [0, 1, 2, 3, 4].map((k) => body(wob(14 + k * 20, 25 + (k % 2 ? -5 : 5), 11, 10, r, { amp: 0.06 }), c, { hi: 0.25 })).join('')));
  add('ATP', MOL, 'ATP adenosine triphosphate energy phosphate', '#e36d6d', [110, 50], (c) =>
    part('adenine', path(poly([[12, 14], [24, 8], [34, 14], [34, 28], [24, 34], [12, 28]]), '#9fcbea')) + part('ribose', path(poly([[38, 30], [50, 24], [60, 30], [56, 42], [42, 42]]), '#f2c94c'))
    + part('phosphates', [70, 84, 98].map((x) => circ(x, 32, 6, c)).join('') + stroke('M60 32 H64 M76 32 H78 M90 32 H92', '#5b6168', 1.4) + stroke('M34 22 L42 30', '#5b6168', 1.4)));
  add('Lipid bilayer', MOL, 'lipid bilayer cell membrane phospholipids', '#f0a540', [120, 50], (c) => {
    let s = '';
    for (let k = 0; k < 20; k++) { const x = 3 + k * 6; s += stroke(`M${x - 1} 13 V24 M${x + 1} 13 V24 M${x - 1} 27 V38 M${x + 1} 27 V38`, '#e8c37a', 0.8) + circ(x, 10, 3, c, { w: 0.6 }) + circ(x, 40, 3, c, { w: 0.6 }); }
    return part('bilayer', s);
  });
  add('Transmembrane receptor', MOL, 'transmembrane receptor membrane protein cell surface', '#5b8fd6', [80, 110], (c, r) => {
    let mem = '';
    for (let k = 0; k < 14; k++) { const x = 3 + k * 6; mem += circ(x, 58, 2.6, '#f0a540', { w: 0.5 }) + circ(x, 80, 2.6, '#f0a540', { w: 0.5 }) + stroke(`M${x} 61 V77`, '#e8c37a', 0.8); }
    return part('membrane', mem) + part('helices', [26, 34, 42, 50].map((x, i) => rect(x - 3.4, 52, 6.8, 36, 3.4, i % 2 ? L(c, 0.2) : c)).join(''))
      + part('extracellular domain', body(wob(32, 30, 16, 18, r, { amp: 0.08 }), c, { hi: 0.25 }) + body(wob(50, 34, 12, 14, r, { amp: 0.08 }), L(c, 0.2), { hi: 0.25 })) + part('intracellular domain', body(wob(40, 98, 16, 9, r, { amp: 0.08 }), D(c, 0.05), { hi: 0.2 }));
  });
  add('Ion channel', MOL, 'ion channel pore membrane transport', '#3fa5a0', [100, 100], (c) => {
    let mem = '';
    for (let k = 0; k < 17; k++) { const x = 3 + k * 6; if (x > 30 && x < 70) continue; mem += circ(x, 36, 2.6, '#f0a540', { w: 0.5 }) + circ(x, 64, 2.6, '#f0a540', { w: 0.5 }) + stroke(`M${x} 39 V61`, '#e8c37a', 0.8); }
    return part('membrane', mem) + part('channel', rect(30, 22, 16, 56, 7, c) + rect(54, 22, 16, 56, 7, L(c, 0.2))) + part('ions', [[50, 12], [50, 50], [50, 88]].map(([x, y]) => circ(x, y, 3, '#f2c94c', { w: 0.6 })).join(''));
  });
  add('Cas9 with guide RNA', MOL, 'CRISPR Cas9 sgRNA guide RNA genome editing nuclease', '#9fb7e0', [120, 90], (c, r) =>
    part('dna', helix(2, 118, 70, 6, 4, '#2e6fb5', '#79a7dc', { w: 2, rungs: false })) + part('Cas9', body(wob(60, 44, 40, 30, r, { amp: 0.08 }), c, { hi: 0.25 }) + body(wob(76, 34, 18, 14, r, { amp: 0.1 }), L(c, 0.3), { hi: 0.2 }))
    + part('sgRNA', wave(34, 56, 70, 56, 2, 3, '#e36d6d', 1.8) + stroke('M70 56 C80 48 70 38 62 44', '#e36d6d', 1.8)));
  add('TALEN', MOL, 'TALEN TALE repeats FokI nuclease genome editing', '#3e9ea6', [120, 60], (c) =>
    part('dna', stroke('M2 30 H118 M2 38 H118', '#7d8892', 1.4) + Array.from({ length: 28 }, (_, k) => stroke(`M${4 + k * 4.2} 30 V38`, '#c3cad1', 0.8)).join(''))
    + part('left TALE', rect(4, 16, 10, 12, 2, '#7d8892') + Array.from({ length: 9 }, (_, k) => rect(15 + k * 5, 16, 4.6, 12, 1.5, [L(c, 0.6), c, L(c, 0.35), D(c, 0.1)][k % 4], { w: 0.6 })).join(''))
    + part('right TALE', rect(106, 40, 10, 12, 2, '#7d8892') + Array.from({ length: 9 }, (_, k) => rect(60 + k * 5, 40, 4.6, 12, 1.5, [c, L(c, 0.6), D(c, 0.1), L(c, 0.35)][k % 4], { w: 0.6 })).join(''))
    + part('FokI', ell(56, 26, 9, 7, L(c, 0.6)) + ell(56, 42, 9, 7, L(c, 0.45))));
  add('Zinc finger nuclease', MOL, 'zinc finger nuclease ZFN genome editing FokI', '#8b6fc4', [120, 60], (c) =>
    part('dna', stroke('M2 30 H118 M2 38 H118', '#7d8892', 1.4)) + part('fingers', [14, 26, 38].map((x) => circ(x, 22, 6, c)).join('') + [80, 92, 104].map((x) => circ(x, 46, 6, L(c, 0.25))).join('')) + part('FokI', ell(58, 24, 9, 7, '#9bd8c2') + ell(62, 44, 9, 7, '#7cc3a7')));
  add('Transcription factor on DNA', MOL, 'transcription factor DNA binding gene regulation', '#e36d6d', [110, 70], (c, r) =>
    part('dna', helix(2, 108, 52, 7, 3, '#2e6fb5', '#79a7dc', { w: 2, rungs: false })) + part('factor', body(wob(44, 30, 14, 16, r, { amp: 0.08 }), c, { hi: 0.25 }) + body(wob(66, 30, 14, 16, r, { amp: 0.08 }), L(c, 0.25), { hi: 0.25 })));
  add('Kinase', MOL, 'kinase enzyme ATP phosphorylation signalling', '#7c8bc9', [100, 100], (c, r) =>
    part('N-lobe', body(wob(46, 30, 26, 18, r, { amp: 0.06 }), L(c, 0.25), { hi: 0.2 })) + part('C-lobe', body(wob(52, 64, 34, 24, r, { amp: 0.06 }), c, { hi: 0.2 }))
    + part('phosphate', circ(84, 42, 6, '#f2c94c') + text(84, 45, 'P', 7, '#7a5a1c', { weight: 700 })));
  add('Enzyme with substrate', MOL, 'enzyme substrate active site lock and key catalysis', '#5fb3b3', [100, 90], (c, r) =>
    part('enzyme', body(wob(48, 52, 38, 30, r, { amp: 0.04, mod: (a) => (Math.sin(a) < -0.85 ? -0.4 : 0) }), c, { hi: 0.2 })) + part('substrate', path('M40 6 H58 L54 22 H44 Z', '#e8a33d')));
  add('G protein-coupled receptor', MOL, 'GPCR G protein-coupled receptor seven transmembrane', '#9a79c9', [120, 100], (c) => {
    let mem = '';
    for (let k = 0; k < 20; k++) { const x = 3 + k * 6; mem += circ(x, 36, 2.6, '#f0a540', { w: 0.5 }) + circ(x, 62, 2.6, '#f0a540', { w: 0.5 }) + stroke(`M${x} 39 V59`, '#e8c37a', 0.8); }
    return part('membrane', mem) + part('helices', Array.from({ length: 7 }, (_, k) => rect(22 + k * 10, 26, 8, 46, 4, k % 2 ? L(c, 0.25) : c)).join('') + stroke('M26 26 C26 18 34 18 36 26 M46 26 C46 18 54 18 56 26 M66 26 C66 18 74 18 76 26 M36 72 C36 80 44 80 46 72 M56 72 C56 80 64 80 66 72', c, 2.2))
      + part('G protein', ell(70, 88, 10, 8, '#e98bb0') + ell(86, 86, 7, 6, '#f2c94c') + ell(98, 90, 5, 4, '#6bb36b'));
  });

  // =====================================================================================
  // Immune molecules
  // =====================================================================================
  // Antibody (IgG) in a 100 × 100 box, after the reference: Fab arms ~45° up, each a heavy chain (inner) with the light
  // chain alongside its outer side, variable domains at the tips in a lighter tone, a thin hinge, and an Fc stem about
  // as long as an arm (two paired constant domains).
  const igg = (c, lc) => {
    const dom = (x, y, w, h, col) => rect(x, y, w, h, 2.2, col, { w: 0.9 });
    const arm = (sg) => G(dom(-3.75, -17, 7.5, 17, c) + dom(-3.75, -35, 7.5, 17, L(c, 0.35)) + dom(sg < 0 ? -11 : 4, -16, 7, 15, lc) + dom(sg < 0 ? -11 : 4, -32, 7, 15, L(lc, 0.35)), `translate(${50 + sg * 8} 52) rotate(${sg * 45})`);
    return part('Fc', dom(42.5, 60, 7.5, 16, c) + dom(50, 60, 7.5, 16, c) + dom(42.5, 77, 7.5, 16, c) + dom(50, 77, 7.5, 16, c))
      + part('hinge', stroke('M46.2 61 C46 57 45 55 43 52 M53.8 61 C54 57 55 55 57 52', line(c), 1.6) + stroke('M46.5 56 H53.5', line(c), 1.2))
      + part('heavy chains', arm(-1) + arm(1));
  };
  add('Antibody (IgG)', IMM, 'antibody IgG immunoglobulin monoclonal heavy light chain', '#7b52b3', [100, 100], (c) => igg(c, '#c94f9b'));
  add('Antibody (simple)', IMM, 'antibody Y-shaped simple immunoglobulin', '#3f73c4', [80, 100], (c) =>
    part('antibody', stroke('M40 96 V54 M40 54 L14 22 M40 54 L66 22', line(c), 12) + stroke('M40 96 V54 M40 54 L14 22 M40 54 L66 22', c, 9.6) + stroke('M28 46 L8 22 M52 46 L72 22', line(c), 7) + stroke('M28 46 L8 22 M52 46 L72 22', L(c, 0.35), 4.8)));
  add('IgM pentamer', IMM, 'IgM pentamer antibody J chain', '#3e5fb8', [100, 100], (c) =>
    part('IgM', Array.from({ length: 5 }, (_, k) => G(igg(c, L(c, 0.25)), `translate(50 50) rotate(${k * 72 + 36}) translate(0 -7) scale(0.5) translate(-50 -93)`)).join('')) + part('J chain', circ(50, 50, 4, '#e8a33d', { w: 0.8 })));
  add('IgA dimer', IMM, 'IgA dimer secretory antibody J chain mucosal', '#3fa5a0', [110, 80], (c) =>
    part('IgA', [G(stroke('M0 0 H-20 M-20 0 L-32 -12 M-20 0 L-32 12', line(c), 6) + stroke('M0 0 H-20 M-20 0 L-32 -12 M-20 0 L-32 12', c, 4), 'translate(48 40)'), G(stroke('M0 0 H20 M20 0 L32 -12 M20 0 L32 12', line(c), 6) + stroke('M0 0 H20 M20 0 L32 -12 M20 0 L32 12', c, 4), 'translate(62 40)')].join('')) + part('J chain', ell(55, 40, 7, 5, '#e8a33d')));
  add('Fab fragment', IMM, 'Fab fragment antigen binding antibody', '#3f73c4', [60, 80], (c) => part('Fab', tube([[30, 72], [30, 40], [30, 10]], 9, c, { hi: false }) + tube([[22.5, 64], [22.5, 38], [22.5, 12]], 7, L(c, 0.4), { hi: false })));
  add('scFv', IMM, 'scFv single-chain variable fragment antibody engineering CAR', '#3f73c4', [80, 60], (c) => part('scFv', ell(26, 30, 14, 18, c) + ell(56, 30, 14, 18, L(c, 0.4)) + stroke('M38 20 C44 10 40 6 44 14', '#9aa5ae', 1.4)));
  add('Bispecific T cell engager', IMM, 'BiTE bispecific T cell engager CD3 CD19 antibody', '#3f73c4', [120, 50], (c) =>
    part('anti-CD19', ell(18, 25, 12, 15, c) + ell(40, 25, 12, 15, L(c, 0.4))) + part('linker', stroke('M52 25 H68', '#9aa5ae', 1.6)) + part('anti-CD3', ell(80, 25, 12, 15, '#e36d6d') + ell(102, 25, 12, 15, L('#e36d6d', 0.4))));
  add('Antibody-drug conjugate', IMM, 'ADC antibody drug conjugate payload linker', '#7b52b3', [100, 100], (c) =>
    igg(c, '#c94f9b') + part('payload', [[30, 50], [70, 50], [40, 70], [60, 70]].map(([x, y]) => stroke(`M${x} ${y} l${x < 50 ? -8 : 8} 0`, '#9aa5ae', 1) + circ(x + (x < 50 ? -11 : 11), y, 3.4, '#e36d6d')).join('')));
  const memb = (y, w = 100) => { let s = ''; for (let k = 0; k < Math.ceil(w / 6); k++) { const x = 3 + k * 6; s += circ(x, y, 2.4, '#f0a540', { w: 0.5 }) + circ(x, y + 14, 2.4, '#f0a540', { w: 0.5 }) + stroke(`M${x} ${y + 2.6} V${y + 11.4}`, '#e8c37a', 0.8); } return s; };
  add('T cell receptor', IMM, 'TCR T cell receptor alpha beta CD3', '#2e7d5b', [80, 110], (c) =>
    part('membrane', memb(68, 80)) + part('alpha chain', ell(30, 26, 8, 11, L(c, 0.2)) + ell(30, 48, 8, 10, L(c, 0.2)) + rect(28, 58, 4, 34, 2, L(c, 0.2)))
    + part('beta chain', ell(48, 26, 8, 11, c) + ell(48, 48, 8, 10, c) + rect(46, 58, 4, 34, 2, c)) + part('CD3', ell(14, 56, 6, 7, '#9bd8c2') + ell(66, 56, 6, 7, '#9bd8c2') + rect(12, 62, 3, 36, 1.5, '#9bd8c2') + rect(65, 62, 3, 36, 1.5, '#9bd8c2')));
  // MHC class I after the reference: α1/α2 platform (with the peptide in its groove) on top, α3 below with β2-microglobulin
  // beside it, then a long single transmembrane stalk.
  add('MHC class I', IMM, 'MHC class I HLA peptide presentation beta-2 microglobulin', '#7a3e8e', [80, 110], (c) =>
    part('membrane', memb(80, 80)) + part('heavy chain', rect(37.6, 52, 4.8, 50, 2.4, c) + path('M20 30 V16 Q20 10 26 10 H36 Q40 10 40 14 V30 Z', c) + path('M40 30 V10 Q40 4 46 4 H54 Q60 4 60 10 V30 Z', c)
      + rect(26, 30, 28, 24, 5, c) + stroke('M40 12 V28', line(c), 0.9))
    + part('peptide', stroke('M23 9 H57', '#e8a33d', 2.4) + stroke('M23 9 H57', '#f6c56a', 1))
    + part('b2m', rect(55, 34, 16, 20, 6, L(c, 0.4))));
  add('MHC class II', IMM, 'MHC class II HLA-DR peptide CD4 antigen presentation', '#c25b7c', [80, 110], (c) =>
    part('membrane', memb(80, 80)) + part('alpha chain', ell(30, 22, 10, 12, c) + ell(30, 50, 9, 11, c) + rect(28, 60, 4, 36, 2, c)) + part('beta chain', ell(50, 22, 10, 12, L(c, 0.35)) + ell(50, 50, 9, 11, L(c, 0.35)) + rect(48, 60, 4, 36, 2, L(c, 0.35))) + part('peptide', stroke('M26 10 H54', '#e8a33d', 3)));
  add('TCR–peptide–MHC complex', IMM, 'TCR pMHC immune synapse antigen recognition T cell APC', '#2e7d5b', [100, 120], (c) =>
    part('APC membrane', memb(4, 100)) + part('MHC', ell(38, 36, 10, 12, '#c25b7c') + ell(58, 36, 10, 12, L('#c25b7c', 0.35)) + rect(36, 20, 4, 8, 2, '#c25b7c') + rect(56, 20, 4, 8, 2, L('#c25b7c', 0.35)) + stroke('M34 50 H62', '#e8a33d', 3))
    + part('TCR', ell(38, 64, 10, 12, L(c, 0.2)) + ell(58, 64, 10, 12, c) + rect(36, 76, 4, 22, 2, L(c, 0.2)) + rect(56, 76, 4, 22, 2, c)) + part('T cell membrane', memb(98, 100)));
  add('Chimeric antigen receptor', IMM, 'CAR chimeric antigen receptor scFv hinge CD28 4-1BB CD3 zeta', '#3f73c4', [70, 120], (c) =>
    part('scFv', ell(26, 12, 10, 9, c) + ell(44, 12, 10, 9, L(c, 0.4))) + part('hinge', rect(32, 20, 6, 24, 3, '#9aa5ae')) + part('membrane', memb(46, 70)) + part('transmembrane', rect(32, 44, 6, 20, 2, '#7d8892'))
    + part('costimulatory', ell(35, 72, 9, 6, '#6bb36b')) + part('CD3ζ', ell(35, 86, 9, 6, '#e8a33d') + ell(35, 100, 9, 6, '#e8a33d')) + part('labels', text(56, 74, 'CD28', 5, '#5b6168', { anchor: 'start' })));
  add('PD-1 and PD-L1', IMM, 'PD-1 PD-L1 immune checkpoint inhibitory receptor ligand', '#7c5cc6', [100, 110], (c) =>
    part('tumour membrane', memb(4, 100)) + part('PD-L1', rect(48, 20, 4, 14, 2, '#e36d6d') + ell(50, 42, 10, 9, '#e36d6d') + ell(50, 26, 0.1, 0.1, '#e36d6d'))
    + part('PD-1', ell(50, 62, 10, 9, c) + rect(48, 70, 4, 22, 2, c)) + part('T cell membrane', memb(90, 100)));
  add('CTLA-4 and B7', IMM, 'CTLA-4 CD80 CD86 B7 checkpoint costimulation', '#c25b7c', [100, 110], (c) =>
    part('APC membrane', memb(4, 100)) + part('B7', [36, 64].map((x) => rect(x - 2, 20, 4, 14, 2, '#5fb3b3') + ell(x, 42, 8, 8, '#5fb3b3')).join('')) + part('CTLA-4', [36, 64].map((x) => ell(x, 60, 8, 8, c) + rect(x - 2, 66, 4, 24, 2, c)).join('') + stroke('M36 82 H64', D(c, 0.2), 1.4)) + part('T cell membrane', memb(90, 100)));
  add('Cytokine', IMM, 'cytokine interleukin IL-2 four-helix bundle signalling', '#e8a33d', [80, 80], (c) =>
    part('helices', [[24, 20], [36, 26], [48, 20], [60, 26]].map(([x, y], i) => rect(x - 5, y, 10, 36, 5, i % 2 ? L(c, 0.25) : c)).join('') + stroke('M24 20 C24 10 36 10 36 26 M48 20 C48 10 60 10 60 26 M36 62 C36 72 48 72 48 56', c, 2)));
  add('Chemokine', IMM, 'chemokine CXCL12 CCL chemoattractant', '#d4579f', [80, 80], (c, r) => part('chemokine', body(wob(44, 44, 26, 22, r, { amp: 0.08 }), c, { hi: 0.25 }) + tube([[22, 32], [12, 20], [16, 8]], 3, D(c, 0.05), { hi: false })));
  add('Complement MAC', IMM, 'membrane attack complex complement C5b-9 pore', '#8b6fc4', [100, 90], (c) =>
    part('membrane', memb(44, 100)) + part('pore', Array.from({ length: 9 }, (_, k) => rect(20 + k * 7, 22 + Math.abs(k - 4) * 2, 5.4, 52 - Math.abs(k - 4) * 2, 2.7, k % 2 ? L(c, 0.3) : c)).join('')));
  add('Perforin and granzyme', IMM, 'perforin granzyme cytotoxic granule killing', '#e36d6d', [100, 80], (c) =>
    part('perforin pore', Array.from({ length: 6 }, (_, k) => rect(18 + k * 7, 20, 5, 40, 2.5, '#8b6fc4')).join('')) + part('granzymes', [[72, 30], [84, 42], [70, 54]].map(([x, y]) => circ(x, y, 6, c, { w: 0.8 })).join('')));
  add('Antigen', IMM, 'antigen epitope foreign protein', '#6bb36b', [80, 80], (c, r) => part('antigen', body(wob(40, 40, 26, 24, r, { amp: 0.14, n: 40 }), c, { hi: 0.25 })));
  add('Interferon', IMM, 'interferon IFN type I antiviral cytokine', '#5fb3b3', [80, 80], (c, r) => part('interferon', [[30, 34], [50, 30], [42, 50]].map(([x, y], i) => body(wob(x, y, 14, 12, r, { amp: 0.08 }), i ? L(c, 0.25) : c, { hi: 0.2 })).join('')));
  // TLR dimer after the reference: two horseshoe (leucine-rich repeat) ectodomains curling outwards, stalks meeting at the
  // membrane, and the paired TIR domains below it.
  add('Toll-like receptor', IMM, 'TLR toll-like receptor pattern recognition innate horseshoe', '#c23b5c', [100, 110], (c) => {
    const shoe = (sg) => { const d = `M${50 - sg * 5} 46 C${50 - sg * 4} 30 ${50 - sg * 10} 14 ${50 - sg * 24} 12 C${50 - sg * 40} 12 ${50 - sg * 44} 30 ${50 - sg * 38} 42`;
      return stroke(d, line(c), 13.4) + stroke(d, sg > 0 ? c : L(c, 0.12), 11) + stroke(d, L(c, 0.35), 3, { dash: '1.4 3', op: 0.8 }); };
    return part('ectodomains', shoe(1) + shoe(-1)) + part('stalks', rect(43, 44, 6, 28, 3, c) + rect(51, 44, 6, 28, 3, L(c, 0.12)))
      + part('membrane', memb(62, 100)) + part('TIR domains', path('M38 96 C38 84 44 78 50 78 C56 78 62 84 62 96 C62 102 38 102 38 96 Z', c) + stroke('M50 80 V100', line(c), 1));
  });
  add('Inflammasome', IMM, 'inflammasome NLRP3 ASC caspase-1 IL-1 beta', '#c25b7c', [100, 100], (c) =>
    part('NLRP3 ring', Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2; return ell(50 + Math.cos(a) * 30, 50 + Math.sin(a) * 30, 8, 8, k % 2 ? L(c, 0.3) : c); }).join('')) + part('ASC', circ(50, 50, 14, '#e8a33d')) + part('caspase-1', circ(50, 50, 6, '#5fb3b3')));
})();
