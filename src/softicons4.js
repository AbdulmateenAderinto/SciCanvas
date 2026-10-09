// Soft-style icons, part 4 (v1.1): neuroscience, heart & circulation, membrane channels / pumps / transporters,
// metabolism & small molecules, cell division & cell fate, tissues, people & places, data & computing,
// and environment & ecology. Drawn with the shared kit from softicons.js (same palette and outlines).
(() => {
  const K = globalThis.SoftKit;
  if (!K) return;
  const { P, OW, f, oc, rng, hash, glob, tubes, tube, ball, ell, G, membrane } = K;
  const CAT = {
    neuro: 'Soft · Neuroscience', heart: 'Soft · Heart & circulation', trans: 'Soft · Channels, pumps & transporters',
    met: 'Soft · Metabolism & small molecules', div: 'Soft · Cell division & cell fate', tis: 'Soft · Tissues',
    ppl: 'Soft · People & places', data: 'Soft · Data & computing', env: 'Soft · Environment & ecology',
  };
  const R = (name) => rng(hash(name));
  const S = (name, cat, tags, vb, draw, color = P.navy) => K.add(name, cat, tags, color, () => draw(R(name)), vb);

  // ---------- Local helpers (same as part 3) ----------
  const path = (d, c, o = {}) => `<path d="${d}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}" stroke-linejoin="round" stroke-linecap="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const line = (d, c, w = OW, o = {}) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const rr = (x, y, w, h, r, c, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}"${o.op ? ` opacity="${o.op}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${f(x + w / 2)} ${f(y + h / 2)})"` : ''}/>`;
  const poly = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  const ngon = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, k) => { const t = rot + (k / n) * Math.PI * 2; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
  const shine = (cx, cy, rx, ry, rot = -20) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#ffffff" opacity=".38" transform="rotate(${rot} ${f(cx)} ${f(cy)})"/>`;
  const txt = (x, y, s, size, c, w = 700) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Helvetica, Arial" font-weight="${w}" font-size="${size}" fill="${c}">${s}</text>`;
  const arrow = (x1, y1, x2, y2, c, w = 2.4) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 3 + w * 1.6; return line(`M${f(x1)} ${f(y1)} L${f(x2 - Math.cos(a) * h * 0.6)} ${f(y2 - Math.sin(a) * h * 0.6)}`, c, w) + `<path d="M${f(x2)} ${f(y2)} L${f(x2 - Math.cos(a - 0.45) * h)} ${f(y2 - Math.sin(a - 0.45) * h)} L${f(x2 - Math.cos(a + 0.45) * h)} ${f(y2 - Math.sin(a + 0.45) * h)} Z" fill="${c}"/>`; };
  const ion = (x, y, label, c, rad = 6) => ball(x, y, rad, c, { w: 1 }) + txt(x, y + rad * 0.38, label, rad * 0.95, '#ffffff');
  const NEU = '#e6b84a', MYE = '#f6efcc', BLOOD = '#c62828', DEOX = '#5c6bc0', WALL = '#ec9a9a', LIPID = '#f2c36b';
  // Membrane band across the middle of a 100-wide icon, with phospholipid heads.
  const bilayer = (y = 38, h = 24, w = 100) => membrane(y, w, h) + Array.from({ length: Math.ceil(w / 6) + 1 }, (_, k) => ball(k * 6, y, 2.4, '#f7d58b', { w: 0.6 }) + ball(k * 6, y + h, 2.4, '#f7d58b', { w: 0.6 })).join('');
  // Recursive branching (dendrites, trees): returns a list of polylines.
  const branches = (x, y, ang, len, depth, r, spread = 0.5, shrink = 0.72) => {
    if (depth === 0 || len < 2) return [];
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    const out = [[[x, y], [x2, y2]]];
    for (const s of [-1, 1]) out.push(...branches(x2, y2, ang + s * spread * (0.7 + r() * 0.6), len * shrink * (0.85 + r() * 0.3), depth - 1, r, spread, shrink));
    return out;
  };

  // =====================================================================================
  // Neuroscience
  // =====================================================================================
  S('Pyramidal neuron', CAT.neuro, 'cortical neuron apical dendrite cortex hippocampus excitatory', [100, 100], () =>
    tubes([[[50, 50], [50, 30], [48, 12], [46, 2]], [[49, 32], [36, 20], [26, 12]], [[50, 22], [62, 12], [70, 4]], [[48, 14], [38, 6]], [[43, 64], [28, 72], [12, 70]], [[57, 64], [72, 72], [88, 68]], [[45, 66], [34, 82], [28, 94]], [[55, 66], [66, 82], [72, 94]]], 3.6, NEU)
    + tube([[50, 70], [51, 84], [50, 99]], 2.6, NEU) + path('M50 42 L64 66 Q50 74 36 66 Z', NEU) + ball(50, 60, 4.5, '#a8741e', { w: 1 }), NEU);
  S('Motor neuron', CAT.neuro, 'motoneuron lower motor neuron axon myelin efferent spinal', [130, 70], () =>
    tubes([[[22, 34], [10, 20], [4, 10]], [[22, 34], [8, 40], [2, 50]], [[22, 34], [16, 54], [14, 66]], [[22, 34], [26, 14], [32, 4]]], 3.4, NEU)
    + tube([[30, 36], [116, 36]], 3, NEU) + [40, 58, 76, 94].map((x) => rr(x, 30, 14, 12, 6, MYE, { oc: '#c9b97a' })).join('')
    + tubes([[[116, 36], [124, 26]], [[116, 36], [126, 38]], [[116, 36], [122, 48]]], 2.4, NEU) + [[124, 26], [126, 38], [122, 48]].map(([x, y]) => ball(x, y, 3.2, NEU)).join('')
    + glob(22, 35, 12, 11, NEU, R('mn'), { amp: 0.12 }) + ball(22, 35, 4.5, '#a8741e', { w: 1 }), NEU);
  S('Sensory neuron (pseudounipolar)', CAT.neuro, 'sensory afferent dorsal root ganglion DRG pseudounipolar', [130, 70], () =>
    tube([[6, 46], [124, 46]], 3, NEU) + [22, 40, 84, 102].map((x) => rr(x, 40, 14, 12, 6, MYE, { oc: '#c9b97a' })).join('')
    + tube([[64, 46], [64, 26]], 3, NEU) + tubes([[[6, 46], [2, 34]], [[6, 46], [2, 58]], [[6, 46], [0, 46]]], 2.2, NEU)
    + tubes([[[124, 46], [128, 38]], [[124, 46], [128, 54]]], 2.2, NEU) + ball(64, 16, 11, NEU) + ball(64, 16, 4.2, '#a8741e', { w: 1 }), NEU);
  S('Bipolar neuron', CAT.neuro, 'bipolar cell retina olfactory', [110, 60], () =>
    tubes([[[46, 30], [24, 30], [12, 20]], [[24, 30], [10, 38]], [[18, 26], [6, 26]]], 3.2, NEU) + tubes([[[64, 30], [96, 30], [104, 22]], [[96, 30], [106, 36]]], 2.8, NEU)
    + ell(55, 30, 12, 9, NEU) + ball(55, 30, 4, '#a8741e', { w: 1 }), NEU);
  S('Purkinje cell', CAT.neuro, 'Purkinje neuron cerebellum dendritic tree', [100, 100], (r) => {
    const br = branches(50, 70, -Math.PI / 2, 20, 6, r, 0.62, 0.74);
    return tubes(br, 2.2, NEU) + tube([[50, 80], [50, 99]], 2.6, NEU) + ell(50, 76, 9, 8, NEU) + ball(50, 77, 3.4, '#a8741e', { w: 1 });
  }, NEU);
  S('Myelinated axon', CAT.neuro, 'myelin sheath nodes of Ranvier saltatory conduction axon', [130, 50], () =>
    tube([[2, 25], [128, 25]], 6, NEU) + [6, 38, 70, 102].map((x) => rr(x, 13, 26, 24, 11, MYE, { oc: '#c9b97a' }) + line(`M${x + 6} 19 v12 M${x + 13} 18 v14 M${x + 20} 19 v12`, '#e3d59a', 1.2)).join(''), '#c9b97a');
  S('Schwann cell (myelin, cross-section)', CAT.neuro, 'Schwann cell myelin wrapping oligodendrocyte cross section', [100, 100], () => {
    let s = ball(50, 50, 44, MYE, { oc: '#c9b97a' });
    for (let k = 0; k < 7; k++) s += `<circle cx="50" cy="50" r="${f(40 - k * 4)}" fill="none" stroke="#d8c78a" stroke-width="1.6"/>`;
    return s + ball(50, 50, 13, NEU) + path('M18 22 C30 6 70 6 82 22 C70 14 30 14 18 22 Z', '#e8d9a0') + ell(50, 12, 12, 5, '#c39bd3');
  }, '#c9b97a');
  S('Chemical synapse', CAT.neuro, 'synapse presynaptic postsynaptic vesicles neurotransmitter cleft', [100, 100], (r) => {
    let s = path('M30 0 L70 0 L72 14 C90 22 92 44 82 50 H18 C8 44 10 22 28 14 Z', L(NEU, 0.35), { oc: '#b88a2a' });
    s += [[34, 26], [48, 22], [62, 28], [40, 38], [56, 40], [70, 40], [28, 40]].map(([x, y]) => ball(x, y, 5, '#fff7e0', { oc: '#b88a2a', w: 1 }) + ball(x, y, 1.6, P.magenta, { w: 0 })).join('');
    s += path('M10 64 H90 V100 H10 Z', L(P.sky, 0.25), { oc: P.blue });
    s += [22, 36, 50, 64, 78].map((x) => rr(x - 3.5, 58, 7, 10, 2, P.blue)).join('');
    for (let k = 0; k < 9; k++) s += ball(24 + r() * 52, 53 + r() * 4, 1.6, P.magenta, { w: 0 });
    return s;
  }, P.magenta);
  S('Neuromuscular junction', CAT.neuro, 'NMJ motor end plate acetylcholine muscle', [110, 90], () => {
    let s = rr(4, 56, 102, 30, 8, '#e57373') + [12, 22, 32, 42, 52, 62, 72, 82, 92].map((x) => line(`M${x} 60 V82`, '#c25252', 1.4)).join('');
    s += tube([[55, 0], [55, 30]], 4, NEU) + rr(48, 4, 14, 18, 7, MYE, { oc: '#c9b97a' });
    s += tubes([[[55, 30], [34, 46]], [[55, 30], [55, 48]], [[55, 30], [76, 46]]], 3, NEU) + [[34, 50], [55, 52], [76, 50]].map(([x, y]) => ell(x, y, 8, 5, NEU)).join('');
    return s;
  }, '#e57373');
  S('Dendritic spines', CAT.neuro, 'dendrite spine mushroom thin stubby synapse plasticity', [80, 100], () => {
    let s = '';
    [[24, 16, -1], [56, 30, 1], [22, 46, -1], [58, 62, 1], [24, 78, -1]].forEach(([x, y, d], i) => { s += tube([[40, y], [40 + d * 12, y - 2]], 3, NEU) + (i % 2 ? ell(40 + d * 16, y - 3, 6, 5, NEU) : ball(40 + d * 15, y - 3, 4, NEU)); });
    return tube([[40, 0], [40, 100]], 12, NEU) + s;
  }, NEU);
  S('Action potential', CAT.neuro, 'action potential spike membrane potential depolarisation repolarisation', [120, 70], () =>
    line('M10 6 V64 H116', '#90a4ae', 1.6) + line('M10 44 H116', '#b0bec5', 1.2, { dash: '4 3' })
    + line('M12 52 H40 C44 52 46 50 48 44 C50 30 52 10 54 8 C56 8 58 30 60 50 C62 60 66 60 72 57 C80 54 86 52 116 52', P.red, 3), P.red);
  S('Brain (sagittal section)', CAT.neuro, 'brain midsagittal corpus callosum cerebellum brainstem thalamus', [110, 90], () =>
    path('M60 62 C62 72 64 80 66 90 L74 90 C72 80 72 72 74 62 Z', '#d7a7b0') + ell(84, 64, 15, 10, '#d48a9c') + line('M72 62 q12 -4 26 2 M72 66 q12 -3 25 2 M74 70 q10 -2 20 1', '#b56a7d', 1.2)
    + path('M12 46 C8 24 28 8 54 8 C80 8 100 22 100 42 C100 54 92 58 80 56 C70 54 64 56 58 60 C44 66 18 62 12 46 Z', '#efb3bf')
    + line('M22 30 q6 -8 14 -2 M38 18 q8 -4 14 2 M58 16 q8 -2 14 4 M78 22 q8 2 10 10 M20 44 q8 -4 12 2 M88 42 q-4 -6 -10 -4', '#c97f8f', 1.6)
    + path('M34 42 C44 34 66 32 80 40 C70 38 46 38 34 46 Z', '#f8e1e6') + ell(58, 48, 8, 6, '#d48a9c'), '#d48a9c');
  S('Brain (lobes)', CAT.neuro, 'brain lateral frontal parietal occipital temporal lobe cerebellum cortex', [110, 90], () =>
    path('M58 60 C60 70 62 78 64 88 L72 88 C70 78 70 70 72 60 Z', '#bdbdbd') + ell(84, 62, 15, 10, '#b39ddb') + line('M72 60 q12 -4 26 2 M72 64 q12 -3 25 2 M74 68 q10 -2 20 1', '#8e7cc3', 1.2)
    + path('M12 46 C10 26 28 10 48 10 L52 10 C50 24 48 34 42 44 C34 48 24 52 14 54 Z', '#90caf9') // frontal
    + path('M52 10 C70 10 86 16 92 28 C82 34 72 38 64 40 C56 40 48 42 42 44 C48 34 50 24 52 10 Z', '#fff59d') // parietal
    + path('M92 28 C98 34 100 42 98 50 C92 54 84 54 76 52 C72 46 68 42 64 40 C72 38 82 34 92 28 Z', '#a5d6a7') // occipital
    + path('M14 54 C24 52 34 48 42 44 C48 42 56 40 64 40 C68 42 72 46 76 52 C68 60 54 64 40 64 C28 64 18 60 14 54 Z', '#f48fb1') // temporal
    + line('M24 34 q6 -6 12 0 M60 22 q8 -4 14 2 M30 58 q8 -4 16 0 M80 44 q6 -4 10 0', 'rgba(0,0,0,.18)', 1.4), '#90caf9');
  S('Hippocampus', CAT.neuro, 'hippocampus memory seahorse dentate gyrus CA1 CA3', [100, 70], () =>
    tube([[90, 14], [70, 10], [46, 14], [26, 26], [14, 42], [18, 56], [32, 60], [42, 52], [38, 42], [30, 44]], 12, '#ce93d8') + line('M88 14 C70 12 48 16 30 28 C20 38 18 50 26 56', '#ab47bc', 1.6, { dash: '3 3' }), '#ab47bc');
  S('Rod photoreceptor', CAT.neuro, 'rod cell retina photoreceptor rhodopsin vision', [50, 100], () => {
    let s = rr(16, 2, 18, 40, 4, '#b39ddb');
    for (let y = 6; y < 40; y += 4) s += line(`M18 ${y} H32`, '#8e7cc3', 1.2);
    return s + tube([[25, 42], [25, 46]], 3, '#cfd8dc') + rr(15, 46, 20, 18, 7, '#ffe0b2') + ell(25, 72, 9, 8, '#ffe0b2') + ball(25, 72, 4, '#a1887f', { w: 1 }) + tube([[25, 80], [25, 92]], 3, '#ffe0b2') + ell(25, 94, 8, 4, '#ffe0b2');
  }, '#8e7cc3');
  S('Cone photoreceptor', CAT.neuro, 'cone cell retina photoreceptor colour vision opsin', [50, 100], () => {
    let s = path('M25 4 L36 40 H14 Z', '#ffab91');
    for (let y = 14; y < 40; y += 4) s += line(`M${25 - (y - 4) * 0.3} ${y} H${25 + (y - 4) * 0.3}`, '#e57355', 1.2);
    return s + tube([[25, 40], [25, 44]], 3, '#cfd8dc') + rr(13, 44, 24, 18, 8, '#ffe0b2') + ell(25, 70, 9, 8, '#ffe0b2') + ball(25, 70, 4, '#a1887f', { w: 1 }) + tube([[25, 78], [25, 92]], 3, '#ffe0b2') + ell(25, 94, 8, 4, '#ffe0b2');
  }, '#e57355');
  S('Retina (layers)', CAT.neuro, 'retina layers ganglion bipolar photoreceptor rods cones light', [100, 100], () => {
    let s = rr(0, 0, 100, 100, 4, '#fff8e1', { oc: '#e0c48a' }) + arrow(50, -2, 50, 12, '#f9a825', 3);
    s += [14, 34, 54, 74, 90].map((x) => ball(x, 22, 6, '#ffcc80') + tube([[x, 28], [x, 40]], 2, '#ffcc80')).join('');
    s += [20, 42, 64, 84].map((x) => ell(x, 50, 4, 6, '#a5d6a7') + tube([[x, 56], [x, 66]], 2, '#a5d6a7')).join('');
    for (let k = 0; k < 10; k++) { const x = 6 + k * 9.8; s += k % 3 === 1 ? path(`M${x} 70 L${x + 4} 90 H${x - 4} Z`, '#ffab91') : rr(x - 3, 70, 6, 24, 3, '#b39ddb'); }
    return s + rr(0, 94, 100, 6, 2, '#6d4c41');
  }, '#e0c48a');
  S('Inner-ear hair cell', CAT.neuro, 'hair cell cochlea stereocilia hearing vestibular', [70, 100], () =>
    [16, 22, 28, 34, 40, 46].map((x, i) => rr(x - 1.6, 26 - i * 4, 3.2, 20 + i * 4 - 6, 1.6, '#90a4ae')).join('')
    + path('M14 40 H56 C60 40 62 44 62 50 C62 76 50 88 35 88 C20 88 8 76 8 50 C8 44 10 40 14 40 Z', '#ffcc80') + ball(35, 66, 7, '#a1887f', { w: 1 })
    + tubes([[[26, 88], [20, 98]], [[44, 88], [50, 98]]], 3, NEU), '#ffb74d');
  S('Blood–brain barrier', CAT.neuro, 'blood brain barrier BBB endothelium tight junction astrocyte endfeet pericyte', [100, 100], () => {
    let s = [0, 1, 2, 3, 4, 5].map((k) => { const t = (k / 6) * Math.PI * 2; return ell(50 + 40 * Math.cos(t), 50 + 40 * Math.sin(t), 10, 7, '#9fa8da', (t * 180) / Math.PI + 90); }).join('');
    s += ball(50, 50, 30, '#ffcdd2', { oc: '#e57373' }) + ball(42, 46, 6, BLOOD) + ball(58, 56, 6, BLOOD);
    s += ngon(50, 50, 30, 6, Math.PI / 6).map(([x, y]) => ball(x, y, 2.6, '#37474f', { w: 0 })).join('');
    for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2 + 0.52; s += ell(50 + 32 * Math.cos(t), 50 + 32 * Math.sin(t), 4, 9, '#5c6bc0', (t * 180) / Math.PI + 90); }
    return s + ell(80, 22, 10, 5, '#a1887f', 40);
  }, '#5c6bc0');

  // =====================================================================================
  // Heart & circulation
  // =====================================================================================
  S('Heart (four chambers)', CAT.heart, 'heart cross section atria ventricles septum valves aorta four chambers', [100, 100], () =>
    tube([[34, 34], [34, 4]], 8, '#7986cb') + tube([[46, 32], [48, 16], [62, 10], [70, 14]], 8, '#7986cb') + tube([[56, 32], [56, 14], [66, 4], [80, 8], [84, 20]], 9, '#e53935')
    + path('M50 26 C42 18 16 18 12 38 C8 58 30 80 52 96 C72 80 92 60 88 40 C84 20 58 18 50 26 Z', '#c94c4c') // myocardium
    + ell(31, 40, 12, 9, '#9fa8da') + ell(67, 39, 12, 8, '#ef9a9a') // right and left atria
    + path('M22 54 C28 50 40 50 44 54 C46 64 46 74 49 84 C38 78 28 66 22 54 Z', '#9fa8da') // right ventricle
    + path('M57 54 C62 50 74 50 79 54 C76 66 68 76 56 84 C57 74 57 64 57 54 Z', '#ef9a9a') // left ventricle (thicker wall)
    + line('M26 49.5 H38 M60 49.5 H74', '#ffffff', 2), '#c94c4c');
  S('Vein with valve', CAT.heart, 'vein venous valve leaflets one-way flow', [110, 60], () =>
    rr(2, 6, 106, 48, 20, '#7986cb') + rr(6, 14, 98, 32, 14, '#c5cae9', { oc: '#7986cb' })
    + path('M46 14 C54 22 60 28 64 30 C58 30 52 30 46 26 Z', '#9fa8da') + path('M46 46 C54 38 60 32 64 30 C58 30 52 30 46 34 Z', '#9fa8da')
    + arrow(14, 30, 36, 30, '#3949ab', 2.6) + arrow(72, 30, 96, 30, '#3949ab', 2.6), '#7986cb');
  S('Capillary bed', CAT.heart, 'capillaries arteriole venule microcirculation exchange', [110, 80], () => {
    // arteriole (left, red) branches into a capillary mesh that joins the venule (right, blue)
    const caps = [[[30, 16], [46, 20], [64, 14], [80, 18]], [[30, 16], [44, 34], [62, 30], [80, 36]], [[28, 40], [46, 48], [64, 44], [82, 54]], [[28, 40], [44, 62], [62, 60], [82, 64]], [[46, 20], [44, 34]], [[62, 30], [64, 44]], [[46, 48], [44, 62]], [[64, 14], [62, 30]]];
    return tubes(caps, 3.4, '#ce93d8') + tube([[2, 8], [16, 10], [30, 16], [30, 40], [28, 52]], 9, '#e53935') + tube([[80, 18], [82, 36], [82, 54], [84, 70], [108, 74]], 9, '#5c6bc0');
  }, '#ab47bc');
  S('Atherosclerotic plaque', CAT.heart, 'atherosclerosis plaque artery stenosis lipid core foam cells', [110, 80], () =>
    rr(0, 4, 110, 72, 6, WALL) + rr(0, 16, 110, 48, 2, '#ffebee', { oc: '#e57373' })
    + path('M24 64 C30 44 44 34 56 34 C70 34 82 46 88 64 Z', '#fdd835') + path('M38 62 C42 50 50 44 58 44 C66 44 74 52 76 62 Z', '#f9a825')
    + [[14, 28], [30, 24], [96, 28], [100, 44], [70, 26]].map(([x, y]) => ell(x, y, 6, 4, BLOOD)).join(''), '#f9a825');
  S('Blood clot (thrombus)', CAT.heart, 'thrombus clot fibrin mesh platelets red cells coagulation', [100, 90], (r) => {
    let s = glob(50, 45, 46, 40, '#fff4f4', r, { amp: 0.08, oc: '#f3b6b6' });
    const inside = () => { const t = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.85; return [50 + Math.cos(t) * 44 * d, 45 + Math.sin(t) * 38 * d]; };
    for (let k = 0; k < 16; k++) { const [x1, y1] = inside(), [x2, y2] = inside(); s += line(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`, '#f2c94c', 1.4); }
    for (let k = 0; k < 11; k++) { const [x, y] = inside(); s += ell(x, y, 7, 4.5, BLOOD, r() * 180) + shine(x - 1, y - 1, 2, 1); }
    for (let k = 0; k < 6; k++) { const [x, y] = inside(); s += ball(x, y, 2.8, '#ce93d8', { w: 0.8 }); }
    return s;
  }, BLOOD);
  S('Stent in artery', CAT.heart, 'stent angioplasty coronary artery mesh', [120, 60], () => {
    let s = rr(0, 4, 120, 52, 10, WALL) + rr(4, 12, 112, 36, 8, '#ffebee', { oc: '#e57373' });
    for (let x = 14; x < 104; x += 12) s += line(`M${x} 14 L${x + 6} 30 L${x} 46 M${x + 6} 14 L${x} 30 L${x + 6} 46`, '#78909c', 1.8);
    return s + line('M14 14 H104 M14 46 H104', '#78909c', 1.6);
  }, '#78909c');
  S('ECG trace', CAT.heart, 'ECG EKG electrocardiogram PQRST heartbeat rhythm', [120, 60], () => {
    let s = rr(0, 0, 120, 60, 4, '#fff1f1', { oc: '#f3b6b6' });
    for (let x = 10; x < 120; x += 10) s += line(`M${x} 0 V60`, '#f8d0d0', 0.8);
    for (let y = 10; y < 60; y += 10) s += line(`M0 ${y} H120`, '#f8d0d0', 0.8);
    const beat = (x) => `L${x + 8} 36 Q${x + 12} 30 ${x + 16} 36 L${x + 20} 36 L${x + 22} 40 L${x + 26} 8 L${x + 30} 46 L${x + 33} 36 L${x + 38} 36 Q${x + 44} 26 ${x + 50} 36 L${x + 58} 36`;
    return s + line(`M2 36 ${beat(2)} ${beat(60)}`, '#c62828', 2.4);
  }, '#c62828');
  S('Blood pressure cuff', CAT.heart, 'sphygmomanometer blood pressure cuff hypertension', [100, 90], () =>
    rr(4, 10, 46, 30, 6, '#5c6bc0') + rr(8, 16, 38, 18, 4, '#7986cb') + line('M50 26 C62 26 62 50 72 52', '#37474f', 2.4) + line('M30 40 C30 60 40 70 30 80', '#37474f', 2.4)
    + ball(76, 58, 18, '#eceff1', { oc: '#90a4ae' }) + ball(76, 58, 14, '#ffffff', { oc: '#cfd8dc', w: 1 }) + line('M76 58 L86 50', P.red, 2) + ell(28, 84, 10, 6, '#37474f'), '#5c6bc0');
  S('Sickle cell (red blood cell)', CAT.heart, 'sickle cell anaemia disease red blood cell haemoglobin S', [100, 60], () =>
    path('M10 44 C26 10 74 6 92 30 C76 22 40 22 10 44 Z', BLOOD) + shine(54, 22, 14, 3, -12), BLOOD);
  S('Blood sample, separated', CAT.heart, 'centrifuged blood plasma buffy coat red cells tube PBMC', [40, 100], () =>
    rr(8, 2, 24, 12, 3, '#9575cd') + rr(10, 14, 20, 82, 8, '#e9f2f8', { oc: '#8aa0b4' }) + rr(11, 16, 18, 36, 2, '#fff59d', { w: 0 }) + rr(11, 52, 18, 4, 1, '#ffffff', { w: 0 }) + path('M11 56 H29 V86 Q29 95 20 95 Q11 95 11 86 Z', '#b71c1c', { w: 0 }), '#b71c1c');
  S('Lymphatic vessel', CAT.heart, 'lymphatic vessel lymph valves lymphocytes drainage', [110, 60], () =>
    rr(2, 8, 106, 44, 18, '#c5e1a5', { oc: '#7cb342' }) + path('M36 10 C42 22 46 28 50 30 C46 32 42 38 36 50', 'none', { oc: '#7cb342', w: 2 }) + path('M74 10 C80 22 84 28 88 30 C84 32 80 38 74 50', 'none', { oc: '#7cb342', w: 2 })
    + [[18, 26], [24, 38], [60, 22], [62, 38], [98, 30]].map(([x, y]) => ball(x, y, 4.5, '#64b5f6', { w: 1 })).join(''), '#7cb342');
  S('Pacemaker', CAT.heart, 'pacemaker implantable device lead cardiac rhythm', [90, 100], () =>
    rr(6, 10, 48, 40, 18, '#cfd8dc', { oc: '#78909c' }) + shine(22, 22, 10, 4) + rr(22, 2, 16, 8, 3, '#90a4ae') + line('M30 4 C34 0 56 0 62 18 C70 40 50 60 70 92', '#455a64', 2.6) + ball(70, 94, 3.4, '#455a64'), '#78909c');

  // =====================================================================================
  // Channels, pumps & transporters (membrane runs across the middle; outside is up)
  // =====================================================================================
  const NA = '#7e57c2', KI = '#26a69a', CA = '#ef6c00', HP = '#e53935', GLU = '#f6c344';
  const subunit = (x, c, h = 40) => rr(x, 30, 12, h, 6, c);
  S('Voltage-gated Na⁺ channel', CAT.trans, 'sodium channel Nav voltage-gated action potential', [100, 100], () =>
    bilayer() + subunit(22, P.indigo) + subunit(34, L(P.indigo, 0.2)) + subunit(54, L(P.indigo, 0.2)) + subunit(66, P.indigo)
    + ion(50, 18, 'Na⁺', NA) + ion(50, 50, 'Na⁺', NA) + arrow(50, 64, 50, 88, NA, 2.2) + txt(12, 32, '+', 10, '#d32f2f') + txt(12, 76, '−', 12, '#1565c0'), P.indigo);
  S('K⁺ channel', CAT.trans, 'potassium channel Kv selectivity filter leak', [100, 100], () =>
    bilayer() + subunit(26, P.teal) + subunit(38, L(P.teal, 0.25)) + subunit(50, L(P.teal, 0.25)) + subunit(62, P.teal)
    + ion(50, 82, 'K⁺', KI) + ion(50, 54, 'K⁺', KI) + arrow(50, 40, 50, 14, KI, 2.2), P.teal);
  S('Ligand-gated ion channel', CAT.trans, 'ionotropic receptor nicotinic acetylcholine GABA-A glutamate receptor pentamer', [100, 100], () =>
    bilayer() + rr(24, 12, 14, 64, 7, P.purple) + rr(38, 8, 10, 70, 5, L(P.purple, 0.25)) + rr(52, 8, 10, 70, 5, L(P.purple, 0.25)) + rr(62, 12, 14, 64, 7, P.purple)
    + path('M18 10 l6 -6 l6 6 l-6 6 Z', P.green) + path('M70 10 l6 -6 l6 6 l-6 6 Z', P.green) + ion(50, 30, '+', NA, 5) + arrow(50, 60, 50, 92, NA, 2), P.purple);
  S('Aquaporin', CAT.trans, 'aquaporin water channel AQP osmosis', [100, 100], () => {
    const w = (x, y) => ball(x, y, 4, '#e53935', { w: 0.8 }) + ball(x - 4, y - 3, 2.4, '#ffffff', { oc: '#90a4ae', w: 0.6 }) + ball(x + 4, y - 3, 2.4, '#ffffff', { oc: '#90a4ae', w: 0.6 });
    return bilayer() + path('M26 26 C40 32 42 46 42 50 C42 54 40 68 26 74 V26 Z', P.sky) + path('M74 26 C60 32 58 46 58 50 C58 54 60 68 74 74 V26 Z', P.sky)
      + w(50, 14) + w(50, 36) + w(50, 52) + w(50, 68) + w(50, 88);
  }, P.sky);
  S('Na⁺/K⁺-ATPase', CAT.trans, 'sodium potassium pump ATPase active transport 3Na 2K', [100, 100], () =>
    bilayer() + rr(30, 24, 40, 54, 14, P.orange) + rr(36, 76, 28, 16, 8, L(P.orange, 0.3))
    + ion(20, 12, 'Na⁺', NA, 5.5) + ion(34, 8, 'Na⁺', NA, 5.5) + ion(48, 12, 'Na⁺', NA, 5.5) + ion(70, 90, 'K⁺', KI, 5.5) + ion(84, 84, 'K⁺', KI, 5.5)
    + arrow(62, 20, 62, 4, NA, 2) + arrow(80, 66, 80, 76, KI, 2) + ball(22, 88, 6, '#ffd54f', { w: 1 }) + txt(22, 90.6, 'ATP', 4.4, '#6d4c00'), P.orange);
  S('Proton pump (H⁺-ATPase)', CAT.trans, 'proton pump V-ATPase H+ acidification active transport', [100, 100], () =>
    bilayer() + rr(32, 24, 36, 54, 12, P.red) + rr(38, 76, 24, 14, 7, L(P.red, 0.3)) + [[26, 12], [40, 6], [56, 10], [72, 6]].map(([x, y]) => ion(x, y, 'H⁺', HP, 5)).join('') + arrow(50, 64, 50, 20, HP, 2.2)
    + ball(22, 88, 6, '#ffd54f', { w: 1 }) + txt(22, 90.6, 'ATP', 4.4, '#6d4c00'), P.red);
  const hexose = (x, y, s = 1) => path(poly(ngon(x, y, 6 * s, 6, Math.PI / 6)), GLU);
  S('Glucose transporter (GLUT)', CAT.trans, 'GLUT uniporter facilitated diffusion glucose transporter', [100, 100], () =>
    bilayer() + path('M26 24 H46 V76 H26 C22 76 20 72 20 68 V32 C20 28 22 24 26 24 Z', P.green) + path('M54 24 H74 C78 24 80 28 80 32 V68 C80 72 78 76 74 76 H54 Z', L(P.green, 0.2))
    + hexose(50, 12) + hexose(50, 50) + hexose(50, 88) + arrow(86, 18, 86, 82, '#2e7d32', 2), P.green);
  S('Symporter', CAT.trans, 'symporter cotransporter SGLT secondary active transport', [100, 100], () =>
    bilayer() + rr(30, 24, 40, 52, 14, P.cyan) + ion(40, 12, 'Na⁺', NA, 5.5) + hexose(60, 12, 0.9) + ion(40, 88, 'Na⁺', NA, 5.5) + hexose(60, 88, 0.9) + arrow(84, 16, 84, 84, '#00838f', 2) + arrow(16, 16, 16, 84, '#00838f', 2), P.cyan);
  S('Antiporter', CAT.trans, 'antiporter exchanger Na+/Ca2+ NCX secondary active transport', [100, 100], () =>
    bilayer() + rr(30, 24, 40, 52, 14, P.plum) + ion(36, 12, 'Na⁺', NA, 5.5) + ion(64, 88, 'Ca²⁺', CA, 6) + arrow(16, 16, 16, 84, NA, 2) + arrow(84, 84, 84, 16, CA, 2), P.plum);
  S('ABC transporter (drug efflux)', CAT.trans, 'ABC transporter P-glycoprotein MDR1 efflux pump multidrug resistance', [100, 100], () =>
    bilayer() + rr(26, 24, 22, 54, 9, P.magenta) + rr(52, 24, 22, 54, 9, L(P.magenta, 0.2)) + ball(37, 84, 9, P.magenta) + ball(63, 84, 9, L(P.magenta, 0.2))
    + path('M44 50 l6 -5 l6 5 l-6 5 Z', P.red) + arrow(50, 40, 50, 6, P.red, 2) + ball(50, 94, 4, '#ffd54f', { w: 0.8 }), P.magenta);
  S('ATP synthase', CAT.trans, 'ATP synthase F0 F1 rotary mitochondria oxidative phosphorylation proton', [100, 110], () =>
    bilayer(20, 24) + [24, 34, 44, 54, 64, 74].map((x) => rr(x - 4, 18, 8, 28, 4, '#ffcc80')).join('') + rr(78, 14, 12, 36, 5, '#ffb74d')
    + line('M50 44 V66 M84 50 V70', '#8d6e63', 4) + ngon(50, 82, 14, 6).map(([x, y], i) => ball(x, y, 9, i % 2 ? '#ef9a9a' : '#e57373')).join('') + ball(50, 82, 6, '#bcaaa4')
    + ion(30, 8, 'H⁺', HP, 5) + arrow(14, 6, 14, 40, HP, 2) + ball(84, 100, 6, '#ffd54f', { w: 1 }) + txt(84, 102.4, 'ATP', 4.4, '#6d4c00'), '#e57373');
  S('Gap junction', CAT.trans, 'gap junction connexon connexin cell-cell channel coupling', [100, 100], () =>
    membrane(14, 100, 16) + membrane(70, 100, 16) + [22, 50, 78].map((x) => rr(x - 9, 10, 18, 80, 8, P.teal) + rr(x - 2.5, 12, 5, 76, 2.5, '#e0f7fa', { w: 0.8 })).join(''), P.teal);
  S('Tight junction', CAT.trans, 'tight junction claudin occludin epithelial barrier', [100, 100], () =>
    path('M0 0 H44 V100 H0 Z', '#ffe0b2', { oc: '#e0a96d' }) + path('M56 0 H100 V100 H56 Z', '#ffe0b2', { oc: '#e0a96d' }) + [16, 32, 48, 64, 80].map((y) => rr(40, y - 4, 20, 8, 4, P.indigo)).join(''), P.indigo);
  S('Desmosome', CAT.trans, 'desmosome cadherin desmoglein plaque intermediate filaments keratin', [100, 100], () =>
    path('M0 0 H40 V100 H0 Z', '#ffe0b2', { oc: '#e0a96d' }) + path('M60 0 H100 V100 H60 Z', '#ffe0b2', { oc: '#e0a96d' }) + rr(30, 24, 8, 52, 3, '#8d6e63') + rr(62, 24, 8, 52, 3, '#8d6e63')
    + [30, 40, 50, 60, 70].map((y) => line(`M38 ${y} L62 ${y}`, P.purple, 2.4)).join('') + line('M30 30 C14 34 18 50 4 54 M30 50 C16 54 20 70 6 76 M70 30 C86 34 82 50 96 54 M70 50 C84 54 80 70 94 76', '#a1887f', 1.8), '#8d6e63');
  S('Clathrin-coated pit (endocytosis)', CAT.trans, 'endocytosis clathrin coated pit vesicle receptor-mediated uptake', [100, 100], () =>
    path('M0 30 H24 C30 30 30 40 30 54 C30 76 40 86 50 86 C60 86 70 76 70 54 C70 40 70 30 76 30 H100 V44 H84 C82 44 82 50 82 56 C82 84 66 98 50 98 C34 98 18 84 18 56 C18 50 18 44 16 44 H0 Z', '#f7d58b', { oc: '#d9a12b' })
    + ngon(50, 60, 34, 14, Math.PI * 0.06).filter(([, y]) => y > 46).map(([x, y]) => ball(x, y, 4, '#4db6ac', { w: 0.8 })).join('') + [[40, 60], [50, 68], [60, 60]].map(([x, y]) => ball(x, y, 4.5, P.red)).join(''), '#4db6ac');
  S('Exocytosis', CAT.trans, 'exocytosis secretion vesicle fusion release SNARE', [100, 100], () =>
    path('M0 30 H34 C38 30 40 26 42 22 C44 18 56 18 58 22 C60 26 62 30 66 30 H100 V44 H72 C64 44 64 60 50 66 C36 60 36 44 28 44 H0 Z', '#f7d58b', { oc: '#d9a12b' })
    + ball(50, 52, 10, '#fff3e0', { oc: '#d9a12b' }) + [[44, 12], [52, 6], [60, 12], [48, 50], [54, 54]].map(([x, y]) => ball(x, y, 2.6, P.magenta, { w: 0 })).join('') + arrow(50, 30, 50, 14, '#ad1457', 1.8), P.magenta);
  S('Porin (β-barrel)', CAT.trans, 'porin beta barrel outer membrane protein OmpF bacteria mitochondria', [100, 100], () =>
    bilayer() + rr(28, 20, 44, 60, 14, P.lime) + [34, 42, 50, 58, 66].map((x) => line(`M${x} 24 L${x - 4} 76`, '#689f38', 2)).join('') + ell(50, 22, 14, 5, '#f1f8e9', 0, { oc: '#689f38' }), P.lime);

  // =====================================================================================
  // Metabolism & small molecules (skeletal structures where the molecule is small enough)
  // =====================================================================================
  const INK = '#37474f', OXY = '#d32f2f', NIT = '#1565c0', SUL = '#b8860b';
  // Skeletal formula: atoms {id: [x, y, label?, colour?]}, bonds [a, b, order]; labelled atoms get a gap.
  // A ring double bond can name the ring centre (4th item) so its second line is drawn on the inside.
  const skel = (atoms, bonds, sw = 2.2) => {
    let s = '';
    for (const [a, b, order = 1, ctr] of bonds) {
      let [x1, y1, l1] = atoms[a], [x2, y2, l2] = atoms[b];
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const g1 = l1 ? 5.5 + (l1.length > 2 ? 3 : 0) : 0, g2 = l2 ? 5.5 + (l2.length > 2 ? 3 : 0) : 0;
      x1 += ux * g1; y1 += uy * g1; x2 -= ux * g2; y2 -= uy * g2;
      s += line(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`, INK, sw);
      if (order === 2) {
        let nx = -uy * 3.6, ny = ux * 3.6;
        if (ctr) { const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; if (Math.hypot(mx + nx - ctr[0], my + ny - ctr[1]) > Math.hypot(mx - nx - ctr[0], my - ny - ctr[1])) { nx = -nx; ny = -ny; } }
        const trim = ctr ? 3 : 0;
        s += line(`M${f(x1 + nx + ux * trim)} ${f(y1 + ny + uy * trim)} L${f(x2 + nx - ux * trim)} ${f(y2 + ny - uy * trim)}`, INK, sw);
      }
    }
    for (const [x, y, label, c] of Object.values(atoms)) if (label) s += txt(x, y + 3.6, label, 10, c || (label.includes('O') ? OXY : label.includes('N') ? NIT : label.includes('S') ? SUL : INK));
    return s;
  };
  const hexAt = (cx, cy, r = 15) => ngon(cx, cy, r, 6, -Math.PI / 2); // pointy-top ring: [top, upper-right, lower-right, bottom, lower-left, upper-left]
  const token = (label, c, sub = '') => rr(6, 28, 88, 44, 22, c) + shine(30, 38, 14, 4, 0) + txt(50, 58, label, 18, '#ffffff') + (sub ? txt(50, 86, sub, 9, '#607d8b', 600) : '');

  S('Water (H₂O)', CAT.met, 'water H2O molecule solvent', [100, 80], () => ball(50, 46, 20, OXY) + ball(24, 26, 12, '#eceff1', { oc: '#90a4ae' }) + ball(76, 26, 12, '#eceff1', { oc: '#90a4ae' }) + shine(44, 38, 7, 4), OXY);
  S('Oxygen (O₂)', CAT.met, 'oxygen O2 molecule gas respiration', [100, 60], () => ball(36, 30, 18, OXY) + ball(64, 30, 18, OXY) + shine(30, 22, 6, 3) + shine(58, 22, 6, 3), OXY);
  S('Carbon dioxide (CO₂)', CAT.met, 'carbon dioxide CO2 gas respiration', [110, 50], () => ball(22, 25, 15, OXY) + ball(88, 25, 15, OXY) + ball(55, 25, 17, '#546e7a') + shine(50, 18, 6, 3), '#546e7a');
  S('Pyruvate', CAT.met, 'pyruvate pyruvic acid glycolysis end product', [90, 90], () => skel({ a: [12, 58], b: [32, 46], c: [52, 58], o1: [32, 22, 'O'], o2: [52, 82, 'O'], o3: [74, 46, 'O⁻'] }, [['a', 'b'], ['b', 'c'], ['b', 'o1', 2], ['c', 'o2', 2], ['c', 'o3']]), INK);
  S('Lactate', CAT.met, 'lactate lactic acid anaerobic fermentation', [90, 90], () => skel({ a: [12, 58], b: [32, 46], c: [52, 58], o1: [32, 22, 'OH'], o2: [52, 82, 'O'], o3: [74, 46, 'O⁻'] }, [['a', 'b'], ['b', 'c'], ['b', 'o1'], ['c', 'o2', 2], ['c', 'o3']]), INK);
  S('Acetyl-CoA', CAT.met, 'acetyl coenzyme A acetyl-CoA citric acid cycle', [110, 80], () => skel({ a: [10, 52], b: [30, 40], o: [30, 16, 'O'], s: [50, 52, 'S'] }, [['a', 'b'], ['b', 'o', 2], ['b', 's']]) + line('M56 52 H66', INK, 2.2) + rr(66, 38, 40, 28, 14, P.teal) + txt(86, 56.5, 'CoA', 12, '#ffffff'), P.teal);
  S('Amino acid (general structure)', CAT.met, 'amino acid alpha carbon R group carboxyl amine', [100, 90], () => skel({ n: [14, 40, 'H₂N'], ca: [42, 50], c: [66, 40], o1: [66, 16, 'O'], o2: [90, 52, 'OH'], r: [42, 76, 'R'] }, [['n', 'ca'], ['ca', 'c'], ['c', 'o1', 2], ['c', 'o2'], ['ca', 'r']]), INK);
  S('Glutamate', CAT.met, 'glutamate glutamic acid neurotransmitter excitatory amino acid', [110, 80], () => skel({ o1: [6, 42, '⁻O'], c1: [24, 52], o2: [24, 74, 'O'], c2: [42, 42], n: [42, 18, 'H₃N⁺'], c3: [60, 52], c4: [78, 42], c5: [96, 52], o3: [96, 74, 'O'], o4: [108, 38, 'O⁻'] },
    [['o1', 'c1'], ['c1', 'o2', 2], ['c1', 'c2'], ['c2', 'n'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'c5'], ['c5', 'o3', 2], ['c5', 'o4']]), INK);
  S('GABA', CAT.met, 'GABA gamma-aminobutyric acid inhibitory neurotransmitter', [110, 70], () => skel({ n: [12, 34, 'H₂N'], a: [32, 44], b: [50, 34], c: [68, 44], d: [86, 34], o1: [86, 12, 'O'], o2: [104, 44, 'OH'] }, [['n', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'o1', 2], ['d', 'o2']]), INK);
  S('Dopamine', CAT.met, 'dopamine catecholamine neurotransmitter reward', [110, 90], () => {
    const cx = 44, cy = 50, v = hexAt(cx, cy), c = [cx, cy], out = (p, k = 15) => [p[0] + ((p[0] - cx) / 15) * k, p[1] + ((p[1] - cy) / 15) * k];
    const at = { v0: v[0], v1: v[1], v2: v[2], v3: v[3], v4: v[4], v5: v[5], c1: [v[1][0] + 13, v[1][1] - 7.5], c2: [v[1][0] + 26, v[1][1]], n: [v[1][0] + 41, v[1][1] - 8, 'NH₂'], oA: [...out(v[5]), 'HO'], oB: [...out(v[4]), 'HO'] };
    return skel(at, [['v0', 'v1', 2, c], ['v1', 'v2'], ['v2', 'v3', 2, c], ['v3', 'v4'], ['v4', 'v5', 2, c], ['v5', 'v0'], ['v1', 'c1'], ['c1', 'c2'], ['c2', 'n'], ['v5', 'oA'], ['v4', 'oB']]);
  }, INK);
  S('Serotonin', CAT.met, 'serotonin 5-HT 5-hydroxytryptamine neurotransmitter indole mood', [110, 90], () => {
    const v = hexAt(34, 56); // benzene: v1 = C3a, v2 = C7a, v0 = C4, v5 = C5
    const at = { v0: v[0], v1: v[1], v2: v[2], v3: v[3], v4: v[4], v5: v[5], c3: [v[1][0] + 14.3, v[1][1] - 4.6], c2: [v[1][0] + 23.1, 56], n1: [v[2][0] + 14.3, v[2][1] + 4.6, 'NH'], e1: [v[1][0] + 18, v[1][1] - 19], e2: [v[1][0] + 32, v[1][1] - 23], n2: [v[1][0] + 44, v[1][1] - 34, 'NH₂'], o: [v[5][0] - 13, v[5][1] - 7.5, 'HO'] };
    return skel(at, [['v0', 'v1'], ['v1', 'v2', 2, [34, 56]], ['v2', 'v3'], ['v3', 'v4', 2, [34, 56]], ['v4', 'v5'], ['v5', 'v0', 2, [34, 56]], ['v1', 'c3'], ['c3', 'c2', 2, [v[1][0] + 12, 56]], ['c2', 'n1'], ['n1', 'v2'], ['c3', 'e1'], ['e1', 'e2'], ['e2', 'n2'], ['v5', 'o']]);
  }, INK);
  S('Acetylcholine', CAT.met, 'acetylcholine ACh neurotransmitter cholinergic', [110, 80], () => skel({ a: [8, 52], b: [24, 42], o1: [24, 18, 'O'], o2: [40, 52, 'O'], c: [56, 42], d: [72, 52], n: [88, 42, 'N⁺'], m1: [88, 18], m2: [104, 52], m3: [100, 30] },
    [['a', 'b'], ['b', 'o1', 2], ['b', 'o2'], ['o2', 'c'], ['c', 'd'], ['d', 'n'], ['n', 'm1'], ['n', 'm2'], ['n', 'm3']]), INK);
  S('Steroid hormone (testosterone)', CAT.met, 'steroid hormone testosterone androgen sterol rings cortisol oestrogen', [90, 90], () => {
    const ox = 6, oy = 0, r = 11, h = r * Math.sqrt(3) / 2;
    const A = hexAt(20 + ox, 66 + oy, r), B = hexAt(20 + ox + 2 * h, 66 + oy, r), C = hexAt(20 + ox + 3 * h, 66 + oy - 1.5 * r, r);
    const c13 = C[1], c14 = C[2], d15 = [c14[0] + 10.5, c14[1] + 3.4], d16 = [c13[0] + 16.9, (c13[1] + c14[1]) / 2], d17 = [c13[0] + 10.5, c13[1] - 3.4];
    const at = { a0: A[0], a1: A[1], a2: A[2], a3: A[3], a4: A[4], a5: A[5], b0: B[0], b1: B[1], b2: B[2], b3: B[3], c0: C[0], c1: c13, c2: c14, c5: C[5], d15, d16, d17,
      o3: [A[4][0] - 14, A[4][1] + 8, 'O'], oh: [d17[0] + 4, d17[1] - 14, 'OH'], m10: [A[1][0], A[1][1] - 12], m13: [c13[0], c13[1] - 12] };
    return skel(at, [['a0', 'a1'], ['a1', 'a2'], ['a2', 'a3', 2, [20 + ox, 66 + oy]], ['a3', 'a4'], ['a4', 'a5'], ['a5', 'a0'], ['a4', 'o3', 2], ['a1', 'b0'], ['b0', 'b1'], ['b1', 'b2'], ['b2', 'b3'], ['b3', 'a2'],
      ['b0', 'c5'], ['c5', 'c0'], ['c0', 'c1'], ['c1', 'c2'], ['c2', 'b1'], ['c2', 'd15'], ['d15', 'd16'], ['d16', 'd17'], ['d17', 'c1'], ['d17', 'oh'], ['a1', 'm10'], ['c1', 'm13']], 2);
  }, INK);
  S('Nucleotide', CAT.met, 'nucleotide phosphate sugar base DNA RNA monomer', [110, 70], () =>
    ball(16, 34, 12, P.yellow) + txt(16, 38.5, 'P', 12, '#6d4c00') + line('M28 34 H40', INK, 2.4) + path(poly(ngon(54, 36, 14, 5, -Math.PI / 2)), '#ffab91') + line('M67 32 H76', INK, 2.4) + path(poly(hexAt(90, 32, 14)), P.sky), '#ffab91');
  S('NADH (electron carrier)', CAT.met, 'NADH NAD+ nicotinamide adenine dinucleotide redox electron carrier', [100, 100], () => token('NADH', '#5e35b1', 'NAD⁺ + 2e⁻ + H⁺'), '#5e35b1');
  S('FADH₂ (electron carrier)', CAT.met, 'FADH2 FAD flavin adenine dinucleotide redox electron carrier', [100, 100], () => token('FADH₂', '#f9a825', 'FAD + 2e⁻ + 2H⁺'), '#f9a825');
  S('Insulin', CAT.met, 'insulin hormone A chain B chain disulfide peptide diabetes', [120, 70], () => {
    let s = '';
    const A = Array.from({ length: 21 }, (_, k) => [8 + k * 4.8, 18 + Math.sin(k / 2.2) * 5]), B = Array.from({ length: 30 }, (_, k) => [4 + k * 3.8, 52 + Math.sin(k / 2.6 + 1) * 5]);
    s += line(`M${f(A[6][0])} ${f(A[6][1])} L${f(B[6][0])} ${f(B[6][1])} M${f(A[19][0])} ${f(A[19][1])} L${f(B[18][0])} ${f(B[18][1])}`, '#fbc02d', 3) + line(`M${f(A[5][0])} ${f(A[5][1])} Q${f(A[8][0])} 0 ${f(A[10][0])} ${f(A[10][1])}`, '#fbc02d', 2.4);
    return s + A.map(([x, y]) => ball(x, y, 3, P.blue, { w: 0.8 })).join('') + B.map(([x, y]) => ball(x, y, 3, P.teal, { w: 0.8 })).join('');
  }, P.blue);
  S('Reactive oxygen species', CAT.met, 'ROS reactive oxygen species superoxide hydrogen peroxide free radical oxidative stress', [100, 100], () =>
    path(poly(ngon(50, 50, 46, 16).map(([x, y], i) => (i % 2 ? [50 + (x - 50) * 0.62, 50 + (y - 50) * 0.62] : [x, y]))), '#fff3e0', { oc: '#ffb74d' })
    + ball(40, 50, 13, OXY) + ball(62, 50, 13, OXY) + ball(75, 32, 3, '#212121', { w: 0 }) + txt(80, 76, '−', 18, '#212121'), OXY);
  S('Ions (Na⁺, K⁺, Ca²⁺, Cl⁻)', CAT.met, 'ions electrolytes sodium potassium calcium chloride', [100, 100], () =>
    ion(28, 30, 'Na⁺', '#7e57c2', 15) + ion(72, 28, 'K⁺', '#26a69a', 15) + ion(30, 72, 'Ca²⁺', '#ef6c00', 15) + ion(72, 72, 'Cl⁻', '#43a047', 15), '#7e57c2');
  S('Metal ions (Fe, Zn, Mg, Cu)', CAT.met, 'metal ions iron zinc magnesium copper cofactor trace elements', [100, 100], () =>
    ion(28, 30, 'Fe²⁺', '#8d6e63', 15) + ion(72, 28, 'Zn²⁺', '#78909c', 15) + ion(30, 72, 'Mg²⁺', '#9ccc65', 15) + ion(72, 72, 'Cu²⁺', '#e65100', 15), '#8d6e63');
  S('Enzyme and substrate', CAT.met, 'enzyme substrate active site lock and key induced fit catalysis', [110, 90], (r) =>
    path('M10 50 C10 20 40 8 62 14 C66 26 60 34 66 40 C72 46 84 40 92 46 C100 70 74 88 46 86 C24 84 10 70 10 50 Z', P.teal) + shine(30, 36, 10, 5)
    + path('M66 22 L84 22 L94 36 L80 38 Z', P.orange), P.teal);
  S('Enzyme with competitive inhibitor', CAT.met, 'competitive inhibitor enzyme active site blocked drug', [110, 90], () =>
    path('M10 50 C10 20 40 8 62 14 C66 26 60 34 66 40 C72 46 84 40 92 46 C100 70 74 88 46 86 C24 84 10 70 10 50 Z', P.teal) + shine(30, 36, 10, 5)
    + path('M64 22 L82 22 L92 36 L78 38 Z', P.red) + path('M86 4 L102 4 L110 16 L96 18 Z', P.orange, { op: 0.8 }) + line('M92 2 L108 20 M108 2 L92 20', P.red, 2.2), P.teal);

  // =====================================================================================
  // Cell division & cell fate
  // =====================================================================================
  const CYTO = '#fde7c8', CYO = '#e0b27a', NUC = '#c5b4e3', CHR1 = '#8e24aa', CHR2 = '#1e88e5', SPIN = '#9e9e9e';
  const xchrom = (x, y, c, rot = 0, s = 1) => G(rr(-2.2 * s, -9 * s, 4.4 * s, 18 * s, 2.2 * s, c, { rot: 24 }) + rr(-2.2 * s, -9 * s, 4.4 * s, 18 * s, 2.2 * s, c, { rot: -24 }), `translate(${f(x)} ${f(y)}) rotate(${rot})`);
  const vchrom = (x, y, c, dir) => G(rr(-2, 0, 4, 12, 2, c, { rot: 28 }) + rr(-2, 0, 4, 12, 2, c, { rot: -28 }), `translate(${f(x)} ${f(y)}) rotate(${dir})`);
  const centro = (x, y) => rr(x - 3.5, y - 1.5, 7, 3, 1.5, '#43a047', { w: 0.8 }) + rr(x - 1.5, y - 3.5, 3, 7, 1.5, '#43a047', { w: 0.8 });
  const cell = (r, inner, o = {}) => glob(50, 50, o.rx || 44, o.ry || 40, CYTO, r, { amp: 0.04, oc: CYO }) + inner;
  S('Interphase', CAT.div, 'interphase cell cycle G1 S G2 nucleus chromatin', [100, 100], (r) =>
    cell(r, glob(52, 52, 22, 20, NUC, r, { amp: 0.05 }) + ball(58, 46, 5, '#9575cd') + line('M38 54 q5 -6 10 0 t10 0 M44 62 q5 -5 10 0', '#7e57c2', 1.6) + centro(24, 30)), CHR1);
  S('Prophase', CAT.div, 'prophase mitosis chromosome condensation spindle', [100, 100], (r) =>
    cell(r, glob(50, 50, 22, 20, L(NUC, 0.3), r, { amp: 0.05, op: 0.9 }) + xchrom(42, 46, CHR1, 10) + xchrom(56, 44, CHR2, -20) + xchrom(46, 60, CHR2, 60) + xchrom(60, 58, CHR1, -50) + centro(18, 40) + centro(30, 22) + line('M20 40 L36 46 M30 24 L42 40', SPIN, 1, { op: 0.7 })), CHR1);
  S('Metaphase', CAT.div, 'metaphase mitosis chromosomes aligned metaphase plate spindle', [100, 100], (r) => {
    let s = '';
    for (const y of [30, 40, 50, 60, 70]) s += line(`M14 50 L48 ${y} M86 50 L52 ${y}`, SPIN, 1, { op: 0.8 });
    return cell(r, s + [32, 44, 56, 68].map((y, i) => xchrom(50, y, i % 2 ? CHR2 : CHR1, 90, 0.9)).join('') + centro(14, 50) + centro(86, 50), { rx: 46, ry: 38 });
  }, CHR1);
  S('Anaphase', CAT.div, 'anaphase mitosis sister chromatids separate spindle', [100, 100], (r) => {
    let s = '';
    for (const y of [34, 46, 58, 70]) s += line(`M12 50 L32 ${y} M88 50 L68 ${y}`, SPIN, 1, { op: 0.8 });
    return cell(r, s + [36, 48, 60, 72].map((y, i) => vchrom(34, y - 6, i % 2 ? CHR2 : CHR1, 90) + vchrom(66, y - 6, i % 2 ? CHR2 : CHR1, -90)).join('') + centro(12, 50) + centro(88, 50), { rx: 47, ry: 36 });
  }, CHR1);
  S('Telophase', CAT.div, 'telophase mitosis nuclear envelope reforms cleavage furrow', [110, 90], (r) =>
    path('M10 45 C10 20 30 10 48 18 C52 24 58 24 62 18 C80 10 100 20 100 45 C100 70 80 80 62 72 C58 66 52 66 48 72 C30 80 10 70 10 45 Z', CYTO, { oc: CYO })
    + glob(30, 45, 14, 13, NUC, r, { amp: 0.05 }) + glob(80, 45, 14, 13, NUC, r, { amp: 0.05 }) + line('M24 42 q4 -5 8 0 M28 50 q4 -4 8 0 M74 42 q4 -5 8 0 M78 50 q4 -4 8 0', '#7e57c2', 1.6), CHR1);
  S('Cytokinesis', CAT.div, 'cytokinesis daughter cells midbody cell division', [120, 80], (r) =>
    glob(30, 40, 26, 30, CYTO, r, { amp: 0.04, oc: CYO }) + glob(90, 40, 26, 30, CYTO, r, { amp: 0.04, oc: CYO }) + tube([[54, 40], [66, 40]], 5, CYTO, { oc: CYO }) + ball(60, 40, 2.6, '#43a047')
    + glob(28, 40, 11, 10, NUC, r) + glob(92, 40, 11, 10, NUC, r), CHR1);
  S('Meiosis (crossing over)', CAT.div, 'meiosis crossing over homologous recombination tetrad chiasma bivalent', [100, 100], () => {
    // two homologous chromosomes (sister chromatids side by side); the inner chromatids have swapped their lower arms
    const chromatid = (x, top, bottom) => rr(x, 8, 10, 84, 5, top) + path(`M${x} 62 H${x + 10} V87 C${x + 10} 90 ${x + 8} 92 ${x + 5} 92 C${x + 2} 92 ${x} 90 ${x} 87 Z`, bottom);
    return chromatid(22, CHR1, CHR1) + chromatid(34, CHR1, CHR2) + chromatid(56, CHR2, CHR1) + chromatid(68, CHR2, CHR2)
      + line('M44 58 L56 66 M44 66 L56 58', '#616161', 1.8) + ball(39, 40, 4.5, '#43a047') + ball(61, 40, 4.5, '#43a047');
  }, CHR1);
  S('Necrotic cell', CAT.div, 'necrosis cell swelling membrane rupture lysis inflammation', [100, 100], (r) =>
    path('M50 8 C76 8 94 26 92 50 C91 62 86 66 88 74 C80 90 60 94 46 92 C30 90 12 78 10 56 C8 32 24 8 50 8 Z', L(CYTO, 0.2), { oc: CYO }) + line('M86 64 L92 70 M80 80 L86 88', CYO, 2)
    + glob(48, 48, 14, 13, L(NUC, 0.4), r, { amp: 0.12 }) + [[90, 82], [96, 72], [84, 94], [70, 98]].map(([x, y]) => ball(x, y, 3, '#ffcc80', { w: 0.8 })).join('') + ell(66, 64, 8, 5, '#ffab91', 30), '#ffab91');
  S('Migrating cell (lamellipodium)', CAT.div, 'cell migration lamellipodium leading edge chemotaxis motility', [120, 80], (r) =>
    path('M10 50 C10 40 22 34 40 32 C60 30 80 18 100 22 C112 26 114 44 108 56 C100 66 80 64 60 64 C40 64 10 62 10 50 Z', CYTO, { oc: CYO }) + line('M100 22 q6 4 4 10 M108 34 q6 4 2 10 M108 48 q4 4 0 8', CYO, 1.6)
    + glob(40, 48, 12, 9, NUC, r) + arrow(80, 44, 112, 44, '#ef6c00', 2.4), '#ef6c00');
  S('Phagocytosis', CAT.div, 'phagocytosis engulfment macrophage bacterium phagosome', [110, 100], (r) =>
    path('M14 60 C10 36 28 18 50 18 C58 18 62 24 58 30 C50 32 46 44 52 52 C60 58 72 56 76 46 C80 38 90 40 92 50 C96 74 74 94 50 94 C30 94 16 80 14 60 Z', '#b39ddb')
    + rr(52, 30, 30, 14, 7, '#81c784', { rot: 20 }) + glob(34, 66, 12, 10, '#7e57c2', r), '#b39ddb');
  S('Asymmetric cell division', CAT.div, 'asymmetric division stem cell self-renewal differentiation', [120, 80], (r) =>
    glob(30, 40, 24, 26, '#80cbc4', r, { amp: 0.05 }) + glob(90, 40, 24, 26, '#ffcc80', r, { amp: 0.05 }) + tube([[54, 40], [66, 40]], 5, '#cfd8dc') + glob(30, 40, 10, 9, '#4db6ac', r) + glob(90, 40, 10, 9, '#ffa726', r), '#80cbc4');
  S('Cell differentiation', CAT.div, 'differentiation stem cell lineage specialised cell types fate', [120, 100], (r) =>
    glob(24, 50, 16, 16, '#80cbc4', r) + arrow(42, 44, 70, 18, '#90a4ae', 2) + arrow(42, 50, 70, 50, '#90a4ae', 2) + arrow(42, 56, 70, 82, '#90a4ae', 2)
    + ell(92, 16, 18, 9, '#ef9a9a') + rr(78, 40, 28, 20, 4, '#ffe082') + tubes([[[92, 84], [76, 74]], [[92, 84], [112, 76]], [[92, 84], [96, 98]]], 3, NEU) + ball(92, 84, 7, NEU), '#80cbc4');

  // =====================================================================================
  // Tissues
  // =====================================================================================
  const EPI = '#ffccbc', EPO = '#d7907a', ENUC = '#7e57c2', BM = '#a1887f';
  S('Simple squamous epithelium', CAT.tis, 'simple squamous epithelium endothelium alveolar lining flat cells', [120, 60], () =>
    rr(0, 40, 120, 6, 2, BM) + [0, 30, 60, 90].map((x) => path(`M${x} 40 C${x + 6} 30 ${x + 24} 30 ${x + 30} 40 Z`, EPI, { oc: EPO }) + ell(x + 15, 36, 7, 2.6, ENUC)).join(''), EPO);
  S('Simple cuboidal epithelium', CAT.tis, 'simple cuboidal epithelium kidney tubule gland', [120, 60], () =>
    rr(0, 46, 120, 6, 2, BM) + [0, 24, 48, 72, 96].map((x) => rr(x + 1, 22, 22, 24, 3, EPI, { oc: EPO }) + ball(x + 12, 34, 5, ENUC)).join(''), EPO);
  S('Simple columnar epithelium', CAT.tis, 'simple columnar epithelium microvilli brush border intestine', [120, 80], () =>
    rr(0, 70, 120, 6, 2, BM) + [0, 20, 40, 60, 80, 100].map((x) => rr(x + 1, 16, 18, 54, 3, EPI, { oc: EPO }) + ell(x + 10, 54, 4, 7, ENUC) + line(`M${x + 4} 16 v-6 M${x + 8} 16 v-6 M${x + 12} 16 v-6 M${x + 16} 16 v-6`, EPO, 1.4)).join(''), EPO);
  S('Stratified squamous epithelium', CAT.tis, 'stratified squamous epithelium skin oesophagus keratinised layers', [120, 90], () => {
    let s = rr(0, 82, 120, 6, 2, BM);
    for (let x = 0; x < 120; x += 15) s += rr(x + 1, 66, 13, 16, 3, EPI, { oc: EPO }) + ball(x + 7.5, 74, 3.4, ENUC);
    for (let x = -10; x < 120; x += 20) s += ell(x + 10, 54, 10, 7, EPI, 0, { oc: EPO }) + ell(x + 10, 54, 3.4, 2.8, ENUC);
    for (let x = 0; x < 120; x += 24) s += ell(x + 12, 40, 12, 5, EPI, 0, { oc: EPO }) + ell(x + 12, 40, 4, 1.6, ENUC);
    for (let x = -12; x < 120; x += 30) s += ell(x + 15, 28, 15, 3.4, L(EPI, 0.3), 0, { oc: EPO });
    return s;
  }, EPO);
  S('Pseudostratified ciliated epithelium', CAT.tis, 'pseudostratified ciliated columnar epithelium respiratory airway goblet cell', [120, 90], () => {
    let s = rr(0, 82, 120, 6, 2, BM);
    [0, 20, 40, 60, 80, 100].forEach((x, i) => {
      if (i === 2) s += path(`M${x + 2} 82 V40 C${x + 2} 22 ${x + 18} 22 ${x + 18} 40 V82 Z`, '#e1bee7', { oc: '#ab47bc' }) + ball(x + 10, 36, 7, '#f3e5f5', { oc: '#ab47bc', w: 1 });
      else s += rr(x + 1, 22, 18, 60, 3, EPI, { oc: EPO }) + ell(x + 10, [70, 52, 0, 62, 48, 66][i], 4, 6, ENUC) + line(`M${x + 4} 22 q-2 -7 1 -12 M${x + 9} 22 q-2 -7 1 -12 M${x + 14} 22 q-2 -7 1 -12`, EPO, 1.2);
    });
    return s;
  }, EPO);
  S('Loose connective tissue', CAT.tis, 'areolar loose connective tissue collagen elastic fibres fibroblast', [110, 90], (r) => {
    let s = rr(0, 0, 110, 90, 6, '#fff8f0', { oc: '#e0c0a0' });
    for (let k = 0; k < 6; k++) s += line(`M${f(r() * 20)} ${f(8 + k * 14)} C${f(30 + r() * 20)} ${f(r() * 90)} ${f(60 + r() * 20)} ${f(r() * 90)} 110 ${f(10 + k * 13)}`, '#f48fb1', 3.6, { op: 0.8 });
    for (let k = 0; k < 6; k++) s += line(`M${f(r() * 110)} 0 C${f(r() * 110)} 30 ${f(r() * 110)} 60 ${f(r() * 110)} 90`, '#5d4037', 1, { op: 0.7 });
    return s + [[24, 30], [70, 24], [40, 66], [86, 62]].map(([x, y]) => ell(x, y, 10, 3.4, '#ce93d8', 20) + ell(x, y, 3, 1.8, ENUC, 20)).join('');
  }, '#f48fb1');
  S('Compact bone (osteon)', CAT.tis, 'osteon Haversian system compact bone lamellae osteocytes central canal', [100, 100], () => {
    let s = ball(50, 50, 46, '#efe6cf', { oc: '#c9b88f' });
    for (let k = 1; k <= 5; k++) s += `<circle cx="50" cy="50" r="${8 + k * 7}" fill="none" stroke="#d8c9a3" stroke-width="1.4"/>`;
    for (let k = 0; k < 14; k++) { const t = k * 0.9, rad = 15 + (k % 4) * 7; s += ell(50 + Math.cos(t) * rad, 50 + Math.sin(t) * rad, 2.6, 1.6, '#8d6e63', (t * 180) / Math.PI + 90); }
    return s + ball(50, 50, 7, '#ef9a9a', { oc: '#c62828' });
  }, '#c9b88f');
  S('Hyaline cartilage', CAT.tis, 'hyaline cartilage chondrocytes lacunae matrix isogenous groups', [110, 80], () =>
    rr(0, 0, 110, 80, 8, '#dbe9f6', { oc: '#90a4c8' }) + [[20, 20, 2], [56, 16, 1], [88, 26, 2], [28, 58, 1], [64, 54, 2], [96, 62, 1]].map(([x, y, n]) => ell(x, y, 10, 8, '#eef5fc', 0, { oc: '#90a4c8' }) + (n === 2 ? ball(x - 4, y, 3.6, '#7986cb', { w: 0.8 }) + ball(x + 4, y, 3.6, '#7986cb', { w: 0.8 }) : ball(x, y, 4, '#7986cb', { w: 0.8 }))).join(''), '#7986cb');
  S('Skeletal muscle (striated fibres)', CAT.tis, 'skeletal muscle fibres striations sarcomere multinucleated', [120, 80], () =>
    [6, 30, 54].map((y) => { let s = rr(2, y, 116, 20, 9, '#e57373'); for (let x = 10; x < 114; x += 6) s += line(`M${x} ${y + 2} V${y + 18}`, '#c25252', 1.2); return s + ell(30, y + 3, 5, 2, ENUC) + ell(80, y + 17, 5, 2, ENUC); }).join(''), '#e57373');
  S('Intestinal villus', CAT.tis, 'villus intestine absorption enterocytes lacteal capillary microvilli', [80, 110], () =>
    path('M14 108 V30 C14 6 66 6 66 30 V108 Z', EPI, { oc: EPO }) + path('M22 108 V32 C22 16 58 16 58 32 V108 Z', '#fff3e0', { oc: '#ffcc80' })
    + line('M30 108 V36 C30 26 50 26 50 36 V108', '#e53935', 2) + line('M50 108 V60', '#5c6bc0', 2) + line('M40 106 V34', '#fff59d', 4) + line('M40 106 V34', '#fbc02d', 1.2)
    + Array.from({ length: 9 }, (_, k) => { const t = Math.PI + (k / 8) * Math.PI; return ell(40 + 26 * Math.cos(t), 30 + 22 * Math.sin(t), 2, 3, ENUC, (t * 180) / Math.PI); }).join(''), EPO);
  S('Alveoli', CAT.tis, 'alveoli alveolar sacs lung gas exchange bronchiole capillaries', [110, 100], () => {
    const sacs = [[40, 50], [60, 40], [78, 52], [58, 66], [36, 72], [80, 74], [62, 86]];
    return tube([[0, 20], [24, 30], [44, 46]], 12, '#f8bbd0', { oc: '#d81b60' }) + sacs.map(([x, y]) => ball(x, y, 14, '#fce4ec', { oc: '#d81b60' })).join('') + line('M26 60 C40 54 54 58 68 50 C80 44 90 60 96 70 M30 80 C44 76 58 80 70 76', '#e53935', 1.4) + line('M40 92 C54 86 70 92 88 86', '#5c6bc0', 1.4);
  }, '#d81b60');
  S('Nephron', CAT.tis, 'nephron kidney glomerulus Bowman capsule loop of Henle tubule collecting duct', [100, 110], () =>
    ball(22, 22, 16, '#fff3e0', { oc: '#d7907a' }) + ball(22, 22, 10, '#e57373') + line('M18 18 q4 6 8 0 M16 26 q6 -4 10 2', '#c62828', 1.2)
    + tube([[34, 28], [44, 34], [40, 44], [50, 48], [46, 58], [52, 62], [54, 102], [66, 102], [66, 64], [76, 58], [72, 48], [82, 42], [78, 30], [90, 24], [92, 6]], 6, '#ffcc80') + tube([[92, 6], [94, 108]], 7, '#ffe0b2'), '#d7907a');
  S('Liver lobule', CAT.tis, 'liver lobule central vein portal triad hepatocyte plates sinusoids', [100, 100], () => {
    const hx = ngon(50, 50, 44, 6, Math.PI / 6);
    let s = path(poly(hx), '#e8b4a0', { oc: '#a1574a' });
    for (const [x, y] of hx) s += line(`M50 50 L${f(x)} ${f(y)}`, '#c98a74', 3, { op: 0.8 });
    for (let k = 0; k < 6; k++) { const t = Math.PI / 6 + k * Math.PI / 3 + Math.PI / 6; s += line(`M50 50 L${f(50 + Math.cos(t) * 38)} ${f(50 + Math.sin(t) * 38)}`, '#c98a74', 2, { op: 0.6 }); }
    s += hx.map(([x, y]) => ball(x - 2, y, 2.6, '#e53935', { w: 0.6 }) + ball(x + 2.5, y - 1.5, 2.2, '#43a047', { w: 0.6 }) + ball(x + 1, y + 3, 2.2, '#5c6bc0', { w: 0.6 })).join('');
    return s + ball(50, 50, 6, '#5c6bc0');
  }, '#a1574a');
  S('Islet of Langerhans', CAT.tis, 'pancreatic islet Langerhans beta alpha delta cells insulin glucagon endocrine', [100, 100], (r) => {
    let s = glob(50, 50, 46, 44, '#ffe0b2', r, { amp: 0.06, oc: '#d7a46a' });
    for (let k = 0; k < 10; k++) { const t = (k / 10) * Math.PI * 2; s += ball(50 + Math.cos(t) * 40, 50 + Math.sin(t) * 38, 6, '#ffcc80', { w: 0.8 }); }
    s += glob(50, 50, 28, 26, '#f1f8e9', r, { amp: 0.06, oc: '#7cb342' });
    for (let k = 0; k < 18; k++) { const t = k * 2.4, d = 6 + (k % 3) * 7; s += ball(50 + Math.cos(t) * d, 50 + Math.sin(t) * d, 3.6, k % 6 === 0 ? '#e57373' : k % 9 === 4 ? '#64b5f6' : '#81c784', { w: 0.7 }); }
    return s;
  }, '#7cb342');

  // =====================================================================================
  // People & places (simple, neutral figures)
  // =====================================================================================
  const SKIN = ['#f1c7a5', '#d7a17e', '#a86f4c', '#7b4b2e'];
  // Front-facing figure: head, torso (clothing), arms, legs. Extras are drawn on top.
  const fig = (cx, cy, s, skin, top, legs = '#455a64', extra = '') => G(
    tubes([[[-7, 30], [-8, 50]], [[7, 30], [8, 50]]], 7, legs) + tubes([[[-12, 8], [-18, 28]], [[12, 8], [18, 28]]], 6, top) + ball(-18, 30, 3.4, skin, { w: 0.8 }) + ball(18, 30, 3.4, skin, { w: 0.8 })
    + path('M-12 2 H12 C15 2 16 5 16 8 V30 C16 33 14 34 12 34 H-12 C-14 34 -16 33 -16 30 V8 C-16 5 -15 2 -12 2 Z', top) + ball(0, -10, 10, skin) + extra,
    `translate(${f(cx)} ${f(cy)}) scale(${s})`);
  S('Scientist', CAT.ppl, 'scientist researcher lab coat goggles investigator', [80, 100], () =>
    fig(40, 32, 1.2, SKIN[1], '#ffffff', '#455a64', path('M-12 2 L0 18 L12 2', 'none', { oc: '#90a4ae', w: 1.4 }) + rr(-4, 2, 8, 14, 2, '#5c6bc0') + rr(-10, -14, 20, 6, 3, '#b3e5fc', { oc: '#4fc3f7' }) + rr(6, 20, 6, 8, 1, '#4fc3f7')), '#5c6bc0');
  S('Doctor', CAT.ppl, 'doctor physician clinician white coat stethoscope', [80, 100], () =>
    fig(40, 32, 1.2, SKIN[2], '#ffffff', '#37474f', rr(-4, 2, 8, 14, 2, '#26a69a') + line('M-8 4 C-10 18 -2 22 0 16 M8 4 C10 18 2 22 0 16 L0 24', '#455a64', 1.8) + ball(0, 26, 2.6, '#90a4ae')), '#26a69a');
  S('Nurse', CAT.ppl, 'nurse clinician scrubs healthcare worker', [80, 100], () =>
    fig(40, 32, 1.2, SKIN[0], '#4db6ac', '#4db6ac', path('M-6 2 L0 10 L6 2', 'none', { oc: '#00897b', w: 1.6 }) + rr(4, 12, 7, 5, 1, '#ffffff', { oc: '#00897b', w: 0.8 })), '#4db6ac');
  S('Patient', CAT.ppl, 'patient hospital gown participant subject', [80, 100], () =>
    fig(40, 32, 1.2, SKIN[3], '#b3e5fc', '#90a4ae', [[-8, 10], [0, 16], [8, 10], [-6, 24], [6, 26]].map(([x, y]) => ball(x, y, 1.4, '#4fc3f7', { w: 0 })).join('') + rr(14, 26, 7, 3, 1, '#ffffff', { oc: '#90a4ae', w: 0.6 })), '#4fc3f7');
  S('Child', CAT.ppl, 'child paediatric kid young patient', [60, 80], () => fig(30, 30, 0.85, SKIN[1], '#ffb74d', '#5c6bc0'), '#ffb74d');
  S('Older adult', CAT.ppl, 'older adult elderly ageing geriatric walking cane', [80, 100], () =>
    fig(36, 32, 1.2, SKIN[0], '#a1887f', '#5d4037', ball(0, -10, 10, SKIN[0]) + path('M-9 -14 C-6 -22 6 -22 9 -14 C4 -18 -4 -18 -9 -14 Z', '#eceff1')) + line('M60 70 V98 M60 70 C60 64 68 64 68 70', '#6d4c41', 2.6), '#a1887f');
  S('Pregnant person', CAT.ppl, 'pregnancy pregnant maternal prenatal obstetrics', [80, 100], () =>
    tubes([[[36, 62], [35, 96]], [[46, 62], [47, 96]]], 7, '#455a64') + path('M34 26 H48 C52 26 54 30 54 34 C66 40 68 58 56 64 H34 C30 64 30 60 30 56 V32 C30 28 31 26 34 26 Z', '#ce93d8')
    + tube([[42, 30], [45, 54]], 6, L('#ce93d8', 0.15)) + ball(45, 56, 3.4, SKIN[1], { w: 0.8 }) + ball(42, 14, 10, SKIN[1]), '#ce93d8');
  S('Population / group', CAT.ppl, 'population cohort group people community participants', [120, 90], () =>
    fig(24, 34, 0.9, SKIN[2], '#90caf9') + fig(96, 34, 0.9, SKIN[0], '#a5d6a7') + fig(60, 30, 1.05, SKIN[1], '#ffcc80') + fig(42, 48, 0.75, SKIN[3], '#f48fb1') + fig(78, 48, 0.75, SKIN[1], '#b39ddb'), '#90caf9');
  S('Hospital', CAT.ppl, 'hospital building clinic healthcare', [100, 100], () =>
    rr(10, 30, 80, 66, 4, '#eceff1', { oc: '#90a4ae' }) + rr(34, 10, 32, 30, 4, '#eceff1', { oc: '#90a4ae' }) + rr(46, 14, 8, 22, 1, '#e53935') + rr(39, 21, 22, 8, 1, '#e53935')
    + [18, 34, 58, 74].flatMap((x) => [44, 62].map((y) => rr(x, y, 10, 10, 1.5, '#b3e5fc', { oc: '#90a4ae', w: 1 }))).join('') + rr(42, 74, 16, 22, 2, '#90a4ae'), '#e53935');
  S('University / research institute', CAT.ppl, 'university research institute academic building college', [100, 100], () =>
    path('M6 34 L50 8 L94 34 Z', '#d7ccc8') + rr(10, 34, 80, 8, 1, '#bcaaa4') + [18, 34, 50, 66, 82].map((x) => rr(x - 4, 42, 8, 40, 2, '#efebe9', { oc: '#a1887f' })).join('') + rr(6, 82, 88, 12, 2, '#bcaaa4'), '#a1887f');

  // =====================================================================================
  // Data & computing
  // =====================================================================================
  S('Server rack', CAT.data, 'server rack computing cluster HPC data centre', [80, 100], () =>
    rr(10, 4, 60, 92, 5, '#455a64') + [10, 30, 50, 70].map((y) => rr(16, y, 48, 16, 2, '#607d8b') + ball(24, y + 8, 2.4, '#66bb6a', { w: 0 }) + ball(32, y + 8, 2.4, '#ffca28', { w: 0 }) + line(`M40 ${y + 5} H58 M40 ${y + 11} H58`, '#90a4ae', 1.4)).join(''), '#455a64');
  S('Database', CAT.data, 'database storage records data repository', [80, 100], () =>
    [70, 44, 18].map((y) => path(`M10 ${y} V${y + 16} C10 ${y + 24} 70 ${y + 24} 70 ${y + 16} V${y} Z`, '#5c6bc0') + ell(40, y, 30, 8, '#7986cb')).join(''), '#5c6bc0');
  S('Cloud computing', CAT.data, 'cloud computing upload download remote storage', [110, 90], () =>
    path('M28 62 C12 62 8 44 22 38 C22 22 42 16 52 28 C58 14 84 16 86 34 C102 34 104 60 86 62 Z', '#e3f2fd', { oc: '#64b5f6' }) + arrow(44, 84, 44, 46, '#1e88e5', 3) + arrow(66, 46, 66, 84, '#1e88e5', 3), '#64b5f6');
  S('Neural network (AI)', CAT.data, 'neural network artificial intelligence machine learning deep learning model', [110, 90], () => {
    const L1 = [18, 38, 58, 78].map((y) => [14, y]), L2 = [12, 32, 52, 72, 86].map((y) => [50, y - 2]), L3 = [30, 60].map((y) => [92, y]);
    let s = '';
    for (const [a, b] of [[L1, L2], [L2, L3]]) for (const p of a) for (const q of b) s += line(`M${p[0]} ${p[1]} L${q[0]} ${q[1]}`, '#b0bec5', 1);
    return s + L1.map(([x, y]) => ball(x, y, 6, '#4fc3f7')).join('') + L2.map(([x, y]) => ball(x, y, 6, '#9575cd')).join('') + L3.map(([x, y]) => ball(x, y, 6, '#66bb6a')).join('');
  }, '#9575cd');
  S('Code', CAT.data, 'code programming script software analysis pipeline', [100, 80], () =>
    rr(4, 4, 92, 72, 6, '#263238') + rr(4, 4, 92, 14, 6, '#37474f') + [12, 20, 28].map((x, i) => ball(x, 11, 2.6, ['#ef5350', '#ffca28', '#66bb6a'][i], { w: 0 })).join('') + txt(50, 56, '&lt;/&gt;', 26, '#80deea'), '#263238');
  S('Spreadsheet', CAT.data, 'spreadsheet table data rows columns Excel CSV', [100, 90], () => {
    let s = rr(6, 6, 88, 78, 4, '#ffffff', { oc: '#43a047' }) + rr(6, 6, 88, 14, 4, '#c8e6c9', { oc: '#43a047' });
    for (let y = 34; y < 84; y += 14) s += line(`M6 ${y} H94`, '#a5d6a7', 1.2);
    for (const x of [30, 54, 78]) s += line(`M${x} 6 V84`, '#a5d6a7', 1.2);
    return s;
  }, '#43a047');
  S('Smartphone app', CAT.data, 'smartphone mobile app health app digital', [60, 100], () =>
    rr(8, 2, 44, 96, 8, '#37474f') + rr(12, 10, 36, 74, 3, '#e3f2fd', { w: 0 }) + [[16, 60, 10], [28, 48, 22], [40, 54, 16]].map(([x, y, h]) => rr(x, y, 7, h, 1, '#42a5f5', { w: 0 })).join('') + line('M16 40 L26 30 L34 36 L44 22', '#ef5350', 2) + ball(30, 91, 3, '#90a4ae', { w: 0 }), '#37474f');
  S('Wearable sensor (smartwatch)', CAT.data, 'wearable smartwatch sensor heart rate digital health monitoring', [70, 100], () =>
    rr(20, 0, 30, 24, 6, '#546e7a') + rr(20, 76, 30, 24, 6, '#546e7a') + rr(10, 22, 50, 56, 12, '#263238') + rr(16, 28, 38, 44, 8, '#102027', { w: 0 }) + line('M18 52 H26 L30 42 L34 60 L38 48 L42 52 H52', '#ef5350', 2), '#263238');
  S('Laboratory robot', CAT.data, 'lab robot automation liquid handler robotic arm', [100, 100], () =>
    rr(20, 84, 50, 12, 3, '#90a4ae') + rr(36, 72, 18, 14, 4, '#ff7043') + tube([[45, 74], [40, 46], [70, 30]], 9, '#ffab91') + ball(45, 74, 7, '#ff7043') + ball(40, 46, 6, '#ff7043') + ball(70, 30, 5, '#ff7043')
    + line('M70 30 L78 40 M70 30 L82 30', '#455a64', 3) + rr(76, 46, 10, 18, 3, '#e9f2f8', { oc: '#8aa0b4' }), '#ff7043');
  S('Microchip', CAT.data, 'microchip processor GPU computing hardware semiconductor', [100, 100], () => {
    let s = '';
    for (let k = 0; k < 5; k++) { const t = 26 + k * 12; s += line(`M${t} 6 V20 M${t} 80 V94 M6 ${t} H20 M80 ${t} H94`, '#b0bec5', 3); }
    return s + rr(18, 18, 64, 64, 6, '#37474f') + rr(32, 32, 36, 36, 4, '#546e7a') + line('M38 50 H62 M50 38 V62', '#80cbc4', 1.4);
  }, '#37474f');

  // =====================================================================================
  // Environment & ecology
  // =====================================================================================
  const LEAF = '#66bb6a', LEAFD = '#388e3c', TRUNK = '#8d6e63';
  S('Tree (conifer)', CAT.env, 'conifer pine spruce evergreen tree', [70, 100], () =>
    rr(30, 80, 10, 18, 3, TRUNK) + path('M35 4 L52 34 H44 L60 58 H48 L66 84 H4 L22 58 H10 L26 34 H18 Z', LEAFD), LEAFD);
  S('Forest', CAT.env, 'forest woodland trees ecosystem', [120, 90], (r) =>
    [[22, 1, 0.9], [96, 1, 0.85], [58, 0, 1.1]].map(([x, kind, sc]) => (kind ? G(rr(-5, 20, 10, 28, 3, TRUNK) + path('M0 -40 L18 -8 H10 L26 18 H-26 L-10 -8 H-18 Z', LEAFD), `translate(${x} 40) scale(${sc})`) : G(rr(-5, 10, 10, 34, 3, TRUNK) + glob(0, -6, 26, 24, LEAF, r, { amp: 0.1 }), `translate(${x} 44) scale(${sc})`))).join('') + rr(0, 82, 120, 8, 3, '#a5d6a7'), LEAFD);
  S('Ocean wave', CAT.env, 'ocean sea wave marine water', [110, 80], () =>
    path('M2 60 C20 60 26 24 50 20 C70 18 80 34 72 44 C66 50 58 44 62 38 C52 40 54 56 70 58 C84 60 96 48 108 50 V78 H2 Z', '#4fc3f7') + path('M2 70 C30 64 60 76 108 66 V78 H2 Z', '#0288d1'), '#0288d1');
  S('Lake / pond', CAT.env, 'lake pond freshwater wetland reeds', [110, 70], () =>
    ell(55, 46, 50, 20, '#4fc3f7', 0, { oc: '#0288d1' }) + line('M30 42 q8 -2 14 0 M60 50 q8 -2 14 0', '#e1f5fe', 2) + line('M12 50 V24 M16 50 V18 M96 50 V22 M100 52 V28', LEAFD, 2.4) + ell(16, 18, 2.6, 6, TRUNK) + ell(96, 22, 2.6, 6, TRUNK), '#0288d1');
  S('River', CAT.env, 'river stream watershed freshwater', [100, 100], () =>
    rr(0, 0, 100, 100, 8, '#c5e1a5', { oc: '#8bc34a' }) + tube([[22, 6], [30, 26], [62, 38], [52, 66], [70, 94]], 13, '#4fc3f7', { oc: '#0288d1' }), '#0288d1');
  S('Mountains', CAT.env, 'mountains alpine landscape altitude', [120, 80], () =>
    path('M0 78 L36 20 L60 52 L80 26 L120 78 Z', '#90a4ae') + path('M36 20 L46 36 L40 34 L34 40 L28 33 Z', '#ffffff') + path('M80 26 L90 40 L84 38 L78 44 L72 38 Z', '#ffffff'), '#90a4ae');
  S('Sun', CAT.env, 'sun sunlight solar UV radiation light', [100, 100], () => {
    let s = '';
    for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2; s += line(`M${f(50 + Math.cos(t) * 30)} ${f(50 + Math.sin(t) * 30)} L${f(50 + Math.cos(t) * 44)} ${f(50 + Math.sin(t) * 44)}`, '#fbc02d', 4); }
    return s + ball(50, 50, 24, '#ffd54f', { oc: '#f9a825' }) + shine(42, 42, 8, 4);
  }, '#fbc02d');
  S('Rain cloud', CAT.env, 'rain cloud precipitation weather climate', [100, 100], () =>
    path('M26 56 C12 56 8 38 22 34 C22 18 42 12 52 24 C58 10 82 12 84 30 C98 30 100 54 84 56 Z', '#cfd8dc') + [[30, 70], [50, 74], [70, 70], [40, 88], [60, 90]].map(([x, y]) => path(`M${x} ${y - 6} C${x + 4} ${y} ${x + 4} ${y + 4} ${x} ${y + 4} C${x - 4} ${y + 4} ${x - 4} ${y} ${x} ${y - 6} Z`, '#42a5f5')).join(''), '#42a5f5');
  S('Factory (pollution)', CAT.env, 'factory industry pollution emissions smoke air quality', [110, 100], () =>
    ball(26, 14, 10, '#b0bec5') + ball(40, 10, 8, '#cfd8dc') + ball(86, 18, 9, '#b0bec5') + rr(18, 24, 12, 40, 2, '#78909c') + rr(78, 32, 12, 32, 2, '#78909c')
    + path('M6 96 V60 L30 46 V60 L54 46 V60 L78 46 V60 L104 60 V96 Z', '#90a4ae') + [16, 40, 64, 88].map((x) => rr(x, 72, 10, 10, 1, '#ffe082', { oc: '#78909c', w: 1 })).join(''), '#78909c');
  S('Recycling', CAT.env, 'recycling sustainability circular reuse waste', [100, 100], () => {
    // three arrows chasing each other round a circle
    let out = '';
    for (let k = 0; k < 3; k++) {
      const a0 = -Math.PI / 2 + k * (2 * Math.PI / 3) + 0.22, a1 = a0 + 2 * Math.PI / 3 - 0.5, rad = 34;
      const pts = Array.from({ length: 13 }, (_, i) => { const t = a0 + ((a1 - a0) * i) / 12; return `${f(50 + Math.cos(t) * rad)} ${f(52 + Math.sin(t) * rad)}`; });
      out += line(`M${pts.join(' L')}`, '#43a047', 9);
      const tx = 50 + Math.cos(a1) * rad, ty = 52 + Math.sin(a1) * rad, dx = -Math.sin(a1), dy = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
      out += `<path d="M${f(tx + dx * 14)} ${f(ty + dy * 14)} L${f(tx + nx * 11)} ${f(ty + ny * 11)} L${f(tx - nx * 11)} ${f(ty - ny * 11)} Z" fill="#43a047" stroke="${oc('#43a047')}" stroke-width="${OW}" stroke-linejoin="round"/>`;
    }
    return out;
  }, '#43a047');
  S('Coral', CAT.env, 'coral reef marine biodiversity ocean', [100, 100], (r) =>
    tubes(branches(50, 96, -Math.PI / 2, 24, 4, r, 0.55, 0.7), 7, '#ff8a65') + rr(10, 92, 80, 8, 4, '#ffe0b2'), '#ff8a65');
  S('Bee (pollinator)', CAT.env, 'bee honeybee pollinator insect pollination', [100, 80], () =>
    ell(34, 22, 16, 10, '#e3f2fd', -20, { oc: '#90caf9' }) + ell(56, 20, 16, 10, '#e3f2fd', 20, { oc: '#90caf9' })
    + ell(50, 48, 30, 18, '#ffca28') + line('M40 32 V64 M52 30 V66 M64 34 V62', '#3e2723', 4.5) + ball(20, 46, 10, '#3e2723') + line('M14 38 L8 28 M20 36 L18 26', '#3e2723', 1.8) + path('M80 48 L90 48 L80 52 Z', '#3e2723'), '#ffca28');
  S('Wind turbine', CAT.env, 'wind turbine renewable energy', [80, 110], () =>
    path('M37 108 L39 42 H43 L45 108 Z', '#eceff1', { oc: '#90a4ae' }) + [0, 120, 240].map((rot) => G(path('M41 40 C44 30 44 14 41 2 C38 14 38 30 41 40 Z', '#eceff1', { oc: '#90a4ae' }), `rotate(${rot} 41 40)`)).join('') + ball(41, 40, 4, '#b0bec5'), '#90a4ae');
  S('Earth (globe)', CAT.env, 'earth globe planet world global health climate', [100, 100], () =>
    ball(50, 50, 44, '#4fc3f7', { oc: '#0288d1' }) + path('M26 22 C34 16 46 20 44 30 C42 38 30 36 28 46 C26 54 18 50 14 44 C14 34 18 28 26 22 Z', '#66bb6a', { oc: '#388e3c' })
    + path('M58 30 C70 26 84 34 86 46 C80 50 74 46 70 54 C66 64 74 72 66 82 C58 86 54 76 56 66 C58 56 50 50 52 42 C52 36 54 32 58 30 Z', '#66bb6a', { oc: '#388e3c' }) + shine(34, 30, 10, 5), '#0288d1');
})();
