// Soft-style icons for sequencing and immunology figures: gut-associated lymphoid tissue and germinal centres,
// sequencing instruments (nanopore, PacBio, Illumina, capillary), a Sanger chromatogram with ABI base colours,
// and retroviral transduction with a GFP reporter. Drawn with the shared kit from softicons.js in the flat BioRender
// manner: soft fills, an outline in a darker tone of the same hue, rounded shapes and no added shading.
(() => {
  const K = globalThis.SoftKit;
  if (!K) return;
  const { P, OW, f, oc, rng, hash, glob, tube, tubes, ball, ell, helix, cr } = K;
  const CAT = { imm: 'Soft · Cells', tissue: 'Soft · Organs & body systems', seq: 'Soft · Lab equipment', dna: 'Soft · DNA & genetics' };
  const R = (name) => rng(hash(name));
  const NAMES = new Set();
  const S = (name, cat, tags, vb, draw, color = P.navy) => { NAMES.add(name); K.add(name, cat, tags, color, () => draw(R(name)), vb); };
  const mix = (a, b, k) => Color.mix(a, b, k);
  const light = (c, k) => mix(c, '#ffffff', k);

  const path = (d, c, o = {}) => `<path d="${d}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}" stroke-linejoin="round" stroke-linecap="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const line = (d, c, w = OW, o = {}) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const rr = (x, y, w, h, r, c, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const flat = (d, c, o = {}) => `<path d="${d}" fill="${c}" stroke="none"${o.op ? ` opacity="${o.op}"` : ''} data-flat="1"/>`;
  const poly = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  const txt = (x, y, s, size, c, w = 700) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Helvetica, Arial" font-weight="${w}" font-size="${size}" fill="${c}">${s}</text>`;
  const arrow = (x1, y1, x2, y2, c, w = 2) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 3 + w * 1.6; return line(`M${f(x1)} ${f(y1)} L${f(x2 - Math.cos(a) * h * 0.6)} ${f(y2 - Math.sin(a) * h * 0.6)}`, c, w) + `<path d="M${f(x2)} ${f(y2)} L${f(x2 - Math.cos(a - 0.45) * h)} ${f(y2 - Math.sin(a - 0.45) * h)} L${f(x2 - Math.cos(a + 0.45) * h)} ${f(y2 - Math.sin(a + 0.45) * h)} Z" fill="${c}"/>`; };
  // Packed small cells (lymphocytes) filling an ellipse, for follicles and germinal-centre zones.
  const packed = (cx, cy, rx, ry, rad, c, r, keep = () => true) => {
    let s = '';
    for (let y = cy - ry; y <= cy + ry; y += rad * 1.75) for (let x = cx - rx; x <= cx + rx; x += rad * 1.9) {
      const jx = x + (r() - 0.5) * rad * 0.7, jy = y + (r() - 0.5) * rad * 0.7;
      if (((jx - cx) / rx) ** 2 + ((jy - cy) / ry) ** 2 > 0.86 || !keep(jx, jy)) continue;
      s += ball(jx, jy, rad * (0.8 + r() * 0.3), c, { w: 0.8 });
    }
    return s;
  };
  const GFP = '#3fae5a', GFPL = '#bfe8c3', VIRUS = '#8b5cc6';

  // =====================================================================================
  // Gut-associated lymphoid tissue and germinal centres
  // =====================================================================================
  // Peyer's patch, modelled on BioRender gut-mucosa scenes: finger-shaped villi lined by columnar epithelium (cell
  // borders, nuclei, goblet cells) under a pale-green mucus layer, a dome of follicle-associated epithelium with
  // purple M cells, and beneath it the patch itself — a soft lavender glow around a follicle of B cells (blue),
  // T cells (green) and dendritic cells (purple) with a pale germinal centre. Lamina propria, muscularis mucosae
  // and submucosa below.
  const crPoints = (pts, step = 0.6) => { // Catmull-Rom spline sampled into points about `step` apart
    const out = [], n = pts.length, P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
    for (let i = 0; i < n - 1; i++) {
      const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)], m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let k = 0; k < m; k++) {
        const t = k / m, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[n - 1]);
    return out;
  };
  const offsetPts = (pts, d) => pts.map(([x, y], i) => { // + d moves towards the lumen (left of travel)
    const [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, by - ay) || 1;
    return [x + ((by - ay) / L) * d, y - ((bx - ax) / L) * d];
  });
  const ptsD = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L');
  const band = (a, b) => ptsD(a) + ' L' + [...b].reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
  S("Peyer's patch", CAT.tissue, "Peyer's patch Peyers patches GALT gut-associated lymphoid tissue small intestine ileum villi villus epithelium follicle germinal centre dome M cell goblet cell mucus lamina propria", [200, 132], (r) => {
    const LP = '#f8ece2', EPI = '#f4ddd2', EPIO = '#d8b1a3', MUC = '#dcefc9', MUCO = '#a9cf8c', MCELL = '#dccaf0', GOB = '#d4e6b5';
    const surf = crPoints([[-14, 72], [-6, 70], [6, 66], [9, 34], [12, 17], [21, 9], [30, 17], [33, 34], [35, 62], [41, 70], [47, 62], [49, 34], [52, 17], [61, 9], [70, 17], [73, 34], [75, 58],
      [82, 64], [94, 56], [108, 47], [125, 44], [142, 47], [156, 56], [166, 64], [171, 58], [173, 34], [176, 17], [185, 9], [194, 17], [197, 34], [199, 60], [204, 66], [216, 70], [224, 72]]);
    const inner = offsetPts(surf, -9), mucus = offsetPts(surf, 4.5);
    // tissue layers
    let s = `<path d="${ptsD(surf)} L224 132 L-14 132 Z" fill="${LP}" stroke="none" data-flat="1"/>`;
    s += `<rect x="-2" y="112" width="204" height="20" fill="#f6e6dc" data-flat="1"/>`;
    s += `<path d="M-2 101 C30 97 60 105 100 101 C140 97 170 105 202 101 L202 112 C170 116 140 108 100 112 C60 116 30 108 -2 112 Z" fill="#f1bfcc" stroke="#dd93a8" stroke-width="1" data-flat="1"/>`;
    for (let k = 0; k < 3; k++) s += line(`M-2 ${104 + k * 3} C30 ${100 + k * 3} 60 ${108 + k * 3} 100 ${104 + k * 3} C140 ${100 + k * 3} 170 ${108 + k * 3} 202 ${104 + k * 3}`, '#e3a2b5', 0.6, { op: 0.8 });
    // the patch: lavender glow, follicle, germinal centre, mixed immune cells
    for (const [rad, op] of [[44, 0.1], [37, 0.14], [30, 0.18]]) s += `<ellipse cx="125" cy="80" rx="${rad}" ry="${rad * 0.62}" fill="#b9a2e6" opacity="${op}" data-flat="1"/>`;
    s += ell(125, 80, 24, 17, '#ece3f8', 0, { oc: '#c5b3e8', w: 1 });
    s += ell(126, 82, 11, 8, '#fbf3d9', 0, { oc: '#e6cf8f', w: 0.9 });
    const cellAt = (x, y, c, rad = 2.9) => ball(x, y, rad, c, { oc: oc(c), w: 0.7 }) + `<circle cx="${f(x + 0.4)}" cy="${f(y + 0.3)}" r="${f(rad * 0.48)}" fill="${oc(c)}" opacity=".55"/>`;
    const dc = (x, y) => { let d = ''; for (let k = 0; k < 7; k++) { const t = (k / 7) * Math.PI * 2 + r(); d += tube([[x, y], [x + Math.cos(t) * 5.5, y + Math.sin(t) * 5.5]], 1.3, '#8a6cc4', { ow: 0.5 }); } return d + ball(x, y, 2.6, '#9b7fd1', { w: 0.7 }); };
    [[108, 76], [113, 85], [118, 70], [134, 71], [140, 79], [137, 88], [116, 91], [129, 92], [146, 85], [105, 84]].forEach(([x, y], i) => { s += cellAt(x, y, i % 3 === 2 ? '#8fd18a' : '#bfe3f2'); });
    [[122, 80], [129, 79], [125, 85], [131, 85]].forEach(([x, y]) => { s += cellAt(x, y, '#f2d488', 2.4); }); // germinal-centre B cells
    s += dc(102, 70) + dc(148, 72) + dc(124, 64);
    // epithelium: band, cell borders every ~4.6 units, nuclei, then M cells on the dome and goblet cells on villi
    s += `<path d="${band(surf, inner)}" fill="${EPI}" stroke="${EPIO}" stroke-width="0.9" stroke-linejoin="round" data-flat="1"/>`;
    const cum = [0]; for (let i = 1; i < surf.length; i++) cum.push(cum[i - 1] + Math.hypot(surf[i][0] - surf[i - 1][0], surf[i][1] - surf[i - 1][1]));
    const idx = []; for (let d = 2, i = 0; d < cum[cum.length - 1]; d += 4.6) { while (cum[i] < d) i++; idx.push(i); }
    for (let k = 0; k < idx.length - 1; k++) {
      const a = idx[k], b = idx[k + 1], m = Math.round((a + b) / 2), [mx] = surf[m];
      const quad = `M${f(surf[a][0])} ${f(surf[a][1])} L${f(surf[b][0])} ${f(surf[b][1])} L${f(inner[b][0])} ${f(inner[b][1])} L${f(inner[a][0])} ${f(inner[a][1])} Z`;
      const onDome = mx > 104 && mx < 146, mcell = onDome && k % 3 === 0, goblet = !onDome && k % 7 === 3;
      if (mcell) s += `<path d="${quad}" fill="${MCELL}" stroke="#a98bd6" stroke-width=".7" stroke-linejoin="round" data-flat="1"/>`;
      if (goblet) s += `<path d="${quad}" fill="${GOB}" stroke="#9fc27a" stroke-width=".7" stroke-linejoin="round" data-flat="1"/>`;
      s += line(`M${f(surf[a][0])} ${f(surf[a][1])} L${f(inner[a][0])} ${f(inner[a][1])}`, EPIO, 0.55);
      const [nx, ny] = offsetPts(surf, -6)[m];
      s += `<circle cx="${f(nx)}" cy="${f(ny)}" r="${mcell ? 1.3 : 1.05}" fill="${mcell ? '#7d58b8' : goblet ? '#7aa356' : '#c58f84'}"/>`;
      if (goblet) { const [gx, gy] = offsetPts(surf, -3)[m]; s += `<circle cx="${f(gx)}" cy="${f(gy)}" r=".6" fill="#ffffff"/>`; }
    }
    // mucus layer on the luminal side
    s += `<path d="${band(mucus, surf)}" fill="${MUC}" stroke="none" data-flat="1"/>` + line(ptsD(mucus), MUCO, 0.9);
    // the tissue runs past both sides; a nested <svg> clips it to the frame without needing clip-path ids
    return `<svg x="0" y="0" width="200" height="132" viewBox="0 0 200 132" overflow="hidden">${s}</svg>`;
  }, '#9b7fd1');

  // Germinal centre: mantle of naive B cells, a dark zone of dividing centroblasts and a light zone with a
  // follicular dendritic cell network and centrocytes.
  S('Germinal centre (dark and light zones)', CAT.imm, 'germinal centre center GC dark zone light zone centroblast centrocyte follicular dendritic cell FDC mantle zone follicle somatic hypermutation selection', [100, 100], (r) => {
    let s = ell(50, 50, 47, 45, '#c7d3ef', 0, { oc: '#6f86c4', w: 1.6 });
    s += packed(50, 50, 46, 44, 2.2, '#5d77c0', r, (x, y) => ((x - 50) / 33) ** 2 + ((y - 52) / 33) ** 2 > 1);
    s += ell(50, 52, 33, 33, '#fff7e0', 0, { oc: '#d9b45a', w: 1.4 });
    // dark zone (lower half): densely packed centroblasts, some dividing
    s += `<path d="M17 56 A33 33 0 0 0 83 56 Z" fill="#e9c97b" opacity=".55" data-flat="1"/>`;
    for (let k = 0; k < 18; k++) {
      const a = Math.PI * (0.08 + r() * 0.84), rad = 6 + r() * 23, x = 50 + Math.cos(a) * rad, y = 58 + Math.sin(a) * rad * 0.9;
      s += ball(x, y, 3.6, '#c7962f', { w: 1 }) + ball(x - 0.6, y - 0.4, 1.6, '#8a6418', { w: 0.6 });
    }
    // light zone (upper half): FDC network and a few centrocytes
    const fdc = (x, y) => tubes([[[x, y], [x - 9, y - 6]], [[x, y], [x + 8, y - 7]], [[x, y], [x + 9, y + 4]], [[x, y], [x - 8, y + 5]]], 1.6, '#8cc084', { ow: 0.7 }) + ball(x, y, 3, '#8cc084', { w: 1 });
    s += fdc(38, 36) + fdc(62, 34);
    [[48, 28], [30, 46], [70, 46], [52, 44]].forEach(([x, y]) => { s += ball(x, y, 3, '#e3b860', { w: 1 }); });
    s += line('M19 56 H81', '#b08a3a', 0.9, { dash: '2 2', op: 0.8 });
    return s;
  }, '#d9b45a');

  // Germinal-centre B cell: a large activated blast with the surface markers used to sort GC B cells
  // (B220/CD45R stalks, GL7 glycan clusters, Fas/CD95 trimers) and, in the nucleus, AID acting on DNA.
  S('Germinal-centre B cell (B220+ GL7+ Fas+)', CAT.imm, 'germinal centre center B cell GC B cell centroblast B220 CD45R GL7 Fas CD95 AID somatic hypermutation SHM activated', [100, 100], (r) => {
    const body = '#f6dfa0', edge = '#c9a03f';
    let s = '';
    const stub = (t, draw) => { const x = 50 + 40 * Math.cos(t), y = 50 + 38 * Math.sin(t); return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f((t * 180) / Math.PI + 90)})">${draw}</g>`; };
    const b220 = tube([[0, 0], [0, -10]], 2.2, '#3a6fc4', { ow: 0.8 }) + ball(0, -11, 2.4, '#3a6fc4', { w: 0.8 });
    const gl7 = tube([[0, 0], [0, -4]], 1.4, '#c2509e', { ow: 0.6 }) + ball(-2.2, -6, 1.9, '#e98fb4', { w: 0.7 }) + ball(2.2, -6, 1.9, '#e98fb4', { w: 0.7 }) + ball(0, -9, 1.9, '#c2509e', { w: 0.7 });
    const fas = tube([[0, 0], [0, -5]], 1.8, '#3f9e48', { ow: 0.7 }) + ball(-2.6, -8, 2.3, '#3f9e48', { w: 0.8 }) + ball(2.6, -8, 2.3, '#3f9e48', { w: 0.8 }) + ball(0, -10.5, 2.3, '#7fc97f', { w: 0.8 });
    const kinds = [b220, gl7, fas];
    for (let k = 0; k < 15; k++) s += stub((k / 15) * Math.PI * 2 + 0.2, kinds[k % 3]);
    s += glob(50, 50, 41, 39, body, r, { amp: 0.04, oc: edge });
    s += glob(51, 52, 25, 23, '#9b7bc9', r, { amp: 0.05 });
    s += ball(43, 44, 4.2, '#6c4fa0', { w: 1 }); // nucleolus of a blasting cell
    // AID on DNA inside the nucleus, with mutated base pairs highlighted
    s += helix(36, 68, 58, 4.2, 1.2, { w: 1.8, mark: { 0.3: '#f2b705', 0.62: '#f2b705' } });
    s += glob(55, 52, 6.5, 5.5, '#e8843b', r, { amp: 0.08 });
    return s;
  }, '#d9a12b');

  // =====================================================================================
  // Sequencing instruments and consumables
  // =====================================================================================
  // Pocket nanopore sequencer (MinION-style): low charcoal body, hinged light lid opened over a flow cell, USB lead.
  S('Nanopore sequencer (MinION-style)', CAT.seq, 'MinION nanopore sequencer Oxford Nanopore ONT portable long-read sequencing flow cell R10 device USB', [130, 70], () => {
    const top = '#cfd6dd', front = '#3d4650', side = '#59636e';
    let s = line('M118 44 C128 46 130 56 124 62 C120 66 112 66 106 68', '#59636e', 2.6);
    s += path(poly([[8, 40], [24, 26], [122, 26], [106, 40]]), top, { w: 1.6 });                         // top face
    s += path(poly([[8, 40], [106, 40], [106, 56], [8, 56]]), front, { w: 1.6 });                       // front face
    s += path(poly([[106, 40], [122, 26], [122, 42], [106, 56]]), side, { w: 1.6 });                     // end face
    s += path(poly([[22, 37], [33, 28.5], [104, 28.5], [93, 37]]), '#f2f5f8', { oc: '#aab4bf', w: 1.2 }); // flow cell in its bay
    s += path(poly([[44, 35.5], [50, 30.5], [80, 30.5], [74, 35.5]]), '#2bb3c0', { oc: '#1d8090', w: 1 }); // sensor array
    for (let k = 0; k < 6; k++) s += line(`M${f(50 + k * 5)} 31.5 L${f(45 + k * 5)} 35`, '#9ee5ec', 0.7);
    s += ell(31, 33, 3.2, 2, '#ffffff', 0, { oc: '#8a96a3', w: 1 }) + ell(88, 33, 2.6, 1.6, '#ffffff', 0, { oc: '#8a96a3', w: 1 }); // sample and priming ports
    s += path(poly([[24, 26], [36, 6], [128, 6], [122, 26]]), '#e5eaee', { oc: '#9aa6b2', w: 1.4 });    // lid, open
    s += rr(14, 46, 20, 4, 2, '#2bb3c0', { w: 0.8 });                                                      // status light
    return s;
  }, '#3d4650');

  // Nanopore flow cell (top view): sensor-array window, sample port and priming port.
  S('Nanopore flow cell', CAT.seq, 'nanopore flow cell MinION Flongle R10.4.1 sensor array membrane pores ONT consumable', [120, 56], () => {
    let s = rr(4, 6, 112, 44, 7, '#eef2f5', { oc: '#9aa6b2', w: 1.6 });
    s += rr(10, 12, 18, 32, 4, '#d6dde4', { w: 1.2 });
    s += rr(40, 14, 52, 28, 3, '#2bb3c0', { oc: '#1d8090', w: 1.2 });
    for (let y = 18; y < 40; y += 4.4) for (let x = 44; x < 90; x += 4.4) s += ball(x, y, 0.9, '#c9f2f5', { w: 0.3 });
    s += ell(19, 22, 4, 4, '#ffffff', 0, { oc: '#7a8794', w: 1.2 }) + ell(19, 36, 2.8, 2.8, '#ffffff', 0, { oc: '#7a8794', w: 1 });
    s += rr(100, 14, 10, 28, 2, '#c3ccd5', { w: 1 });
    return s;
  }, '#2bb3c0');

  // Nanopore sequencing principle: a DNA strand threading through a protein pore in a membrane, with the
  // ionic-current trace it produces.
  S('Nanopore sequencing (strand through pore)', CAT.dna, 'nanopore sequencing principle pore protein membrane DNA strand translocation motor protein ionic current squiggle signal long read', [120, 100], (r) => {
    const MEM = '#f1dc9e', ML = '#d4b75f';
    let s = `<rect x="0" y="44" width="120" height="16" fill="${MEM}" opacity=".8" data-flat="1"/>` + line('M0 44 H120 M0 60 H120', ML, 1.4);
    s += path('M42 40 C42 34 50 32 60 32 C70 32 78 34 78 40 L70 44 L68 60 L74 66 L46 66 L52 60 L50 44 Z', '#8b5cc6', { w: 1.6 });
    s += rr(57, 38, 6, 30, 2, '#ffffff', { oc: '#6a3fa8', w: 1 });
    s += glob(60, 26, 13, 9, '#e8843b', r, { amp: 0.08 }); // motor protein
    s += line('M34 6 C40 14 50 12 54 18 C57 22 60 22 60 30 L60 74 C60 84 70 88 80 92', '#3a6fc4', 2.4);
    s += line('M28 8 C36 18 46 16 52 24', '#d64545', 2.4);
    let d = 'M84 10', x = 84;
    for (let k = 0; k < 10; k++) { x += 3.2; d += ` L${f(x)} ${f(12 + r() * 14)}`; }
    s += rr(82, 4, 36, 30, 3, '#ffffff', { oc: '#9aa6b2', w: 1 }) + line(d, '#2a9fd4', 1.4);
    return s;
  }, '#8b5cc6');

  // PacBio-style long-read instrument: tall white cabinet, dark loading door, accent light strip, touchscreen.
  S('Long-read sequencer (PacBio-style)', CAT.seq, 'PacBio Revio Sequel HiFi SMRT single-molecule real-time long-read sequencer instrument', [90, 112], () => {
    let s = rr(10, 8, 66, 100, 5, '#f4f6f8', { oc: '#9aa6b2', w: 1.6 });
    s += `<path d="M76 13 L84 18 V104 L76 108 Z" fill="#d9dfe5" stroke="#9aa6b2" stroke-width="1.4" stroke-linejoin="round"/>`;
    s += rr(16, 18, 54, 44, 3, '#2f3742', { w: 1.4 });
    s += rr(16, 66, 54, 4, 2, '#8b5cc6', { oc: '#6a3fa8', w: 0.8 });
    s += rr(50, 24, 16, 12, 2, '#53c2d6', { oc: '#2a8fa6', w: 1 });
    for (let k = 0; k < 4; k++) s += rr(20 + k * 7, 46, 5, 10, 1, '#59636e', { w: 0.6 });
    s += rr(16, 76, 54, 26, 3, '#e5eaee', { w: 1.2 });
    return s;
  }, '#8b5cc6');

  // Benchtop short-read sequencer (Illumina-style): light housing, dark front screen and a flow-cell door.
  S('Short-read sequencer (Illumina-style)', CAT.seq, 'Illumina NextSeq MiSeq NovaSeq short-read sequencing by synthesis benchtop sequencer instrument', [120, 84], () => {
    let s = path(poly([[8, 26], [22, 12], [116, 12], [102, 26]]), '#e5eaee', { oc: '#9aa6b2', w: 1.4 });
    s += rr(8, 26, 94, 52, 4, '#f4f6f8', { oc: '#9aa6b2', w: 1.6 });
    s += path(poly([[102, 26], [116, 12], [116, 64], [102, 78]]), '#d9dfe5', { oc: '#9aa6b2', w: 1.4 });
    s += rr(14, 32, 34, 24, 2, '#2f3742', { w: 1.2 }) + line('M18 50 L24 44 L29 47 L35 39 L42 42', '#53c2d6', 1.2);
    s += rr(54, 32, 42, 30, 3, '#cfd6dd', { w: 1.2 }) + rr(58, 44, 34, 6, 1.5, '#e8843b', { w: 0.8 });
    s += rr(14, 64, 82, 4, 2, '#7fd1b9', { w: 0.8 });
    return s;
  }, '#9aa6b2');

  // Capillary (Sanger) sequencer: cabinet with a window onto the capillary array and buffer reservoirs.
  S('Capillary sequencer (Sanger)', CAT.seq, 'Sanger capillary electrophoresis sequencer ABI 3730 3500 genetic analyzer instrument', [100, 100], () => {
    let s = rr(8, 6, 84, 88, 5, '#f4f6f8', { oc: '#9aa6b2', w: 1.6 });
    s += rr(16, 14, 68, 46, 3, '#dcebf3', { oc: '#7aa2b8', w: 1.2 });
    for (let k = 0; k < 8; k++) s += line(`M${24 + k * 7} 18 C${24 + k * 7} 34 ${30 + k * 5} 44 ${36 + k * 4} 56`, '#3a6fc4', 0.9, { op: 0.8 });
    s += rr(16, 66, 30, 20, 2, '#cfd6dd', { w: 1.1 }) + rr(54, 66, 30, 20, 2, '#cfd6dd', { w: 1.1 });
    s += rr(22, 72, 18, 8, 1.5, '#7fd1b9', { w: 0.7 }) + rr(60, 72, 18, 8, 1.5, '#7fd1b9', { w: 0.7 });
    return s;
  }, '#3a6fc4');

  // Sanger chromatogram as shown for ABI (.ab1) files: four overlaid traces (A green, C blue, G black, T red)
  // with evenly spaced peaks and base calls above them.
  S('Sanger chromatogram (ABI trace)', CAT.dna, 'Sanger sequencing chromatogram electropherogram trace ab1 ABI four-colour peaks base calls capillary', [160, 72], (r) => {
    const seq = 'GACTTGCAGTCAATG', COL = { A: '#1f9d3a', C: '#2457c5', G: '#222222', T: '#d62728' };
    const x0 = 8, dx = 10, base = 64, n = seq.length;
    const peaks = [...seq].map((b, i) => ({ b, x: x0 + 4 + i * dx, h: 26 + r() * 22, w: 2.6 + r() * 0.8 }));
    let s = line(`M4 ${base} H156`, '#c4ccd4', 0.8);
    for (const b of 'ACGT') {
      let d = '';
      for (let x = 4; x <= 156; x += 0.8) {
        let y = 0.6 + r() * 0.5; // low background noise
        for (const p of peaks) if (p.b === b) y += p.h * Math.exp(-(((x - p.x) / p.w) ** 2) / 2);
        // small shoulder of the neighbouring signal, as in real traces
        for (const p of peaks) if (p.b !== b && b === 'ACGT'[(('ACGT'.indexOf(p.b)) + 1) % 4]) y += 2.2 * Math.exp(-(((x - p.x - 1.5) / 3) ** 2) / 2);
        d += `${d ? ' L' : 'M'}${f(x)} ${f(base - y)}`;
      }
      s += line(d, COL[b], 1.3);
    }
    peaks.forEach((p) => { s += txt(p.x, 9.5, p.b, 8, COL[p.b]); });
    return s;
  }, '#222222');

  // =====================================================================================
  // Retroviral transduction with a GFP reporter
  // =====================================================================================
  const virus = (cx, cy, rad, r, genome = GFP) => {
    let s = '';
    for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2, x = cx + Math.cos(t) * rad, y = cy + Math.sin(t) * rad; s += tube([[x, y], [cx + Math.cos(t) * (rad + 4), cy + Math.sin(t) * (rad + 4)]], 1.4, VIRUS, { ow: 0.6 }) + ball(cx + Math.cos(t) * (rad + 5), cy + Math.sin(t) * (rad + 5), 1.7, '#c2a7ea', { w: 0.6 }); }
    s += ball(cx, cy, rad, '#d8c8f2', { oc: '#7a4fb8', w: 1.4 });
    s += ell(cx, cy, rad * 0.55, rad * 0.5, '#efe7fb', 0, { oc: '#a58ad6', w: 1 }); // capsid
    s += line(`M${f(cx - rad * 0.35)} ${f(cy - 1)} C${f(cx - 2)} ${f(cy - 5)} ${f(cx + 2)} ${f(cy + 4)} ${f(cx + rad * 0.35)} ${f(cy)}`, genome, 1.6);
    s += line(`M${f(cx - rad * 0.3)} ${f(cy + 2.5)} C${f(cx - 1)} ${f(cy - 1)} ${f(cx + 1)} ${f(cy + 6)} ${f(cx + rad * 0.3)} ${f(cy + 3)}`, genome, 1.6);
    return s;
  };
  // Chromosomal DNA with an integrated provirus drawn green (the GFP-carrying insert).
  const integrated = (x0, x1, y, amp = 5) => {
    const a = x0 + (x1 - x0) * 0.36, b = x0 + (x1 - x0) * 0.66;
    return helix(x0, a, y, amp, ((a - x0) / (x1 - x0)) * 2.2, { w: 2 })
      + helix(a, b, y, amp, ((b - a) / (x1 - x0)) * 2.2, { w: 2.2, c1: '#2f8f47', c2: '#5cc46f', pairA: '#a6dfb0', pairB: '#7fcf8d', phase: ((a - x0) / (x1 - x0)) * 2.2 * Math.PI * 2 })
      + helix(b, x1, y, amp, ((x1 - b) / (x1 - x0)) * 2.2, { w: 2, phase: ((b - x0) / (x1 - x0)) * 2.2 * Math.PI * 2 });
  };
  S('Gamma-retrovirus (GFP vector)', CAT.dna, 'gamma retrovirus retroviral vector pMX MSCV particle GFP reporter RNA genome envelope transduction', [60, 60], (r) => virus(30, 30, 16, r), VIRUS);

  // Retroviral transduction: particles bind and enter, the RNA genome is reverse transcribed, and the provirus
  // (green, carrying GFP) integrates into the host chromosome; the cell then fluoresces green.
  S('Retroviral transduction (GFP)', CAT.imm, 'retroviral transduction infection retrovirus vector pMX integration provirus GFP reporter reverse transcription stable cell line', [170, 110], (r) => {
    let s = glob(108, 56, 58, 50, '#e9f6ea', r, { amp: 0.03, oc: '#7fbf86' });            // host cell, faintly green
    s += glob(120, 60, 30, 26, '#d9ccef', r, { amp: 0.04, oc: '#9b84c9' });               // nucleus
    s += integrated(94, 146, 60, 5);
    s += virus(20, 26, 13, r);
    s += virus(48, 52, 10, r);                                                          // fusing at the membrane
    s += line('M58 56 C68 50 74 66 84 58', GFP, 1.8, { dash: '3 2.5' });                   // released genome / reverse transcription
    s += arrow(84, 58, 92, 58, GFP, 1.6);
    s += arrow(32, 34, 40, 42, '#7a4fb8', 1.6);
    return s;
  }, GFP);

  // Transduced cell: green cytoplasm (GFP) and an integrated green provirus in the nucleus.
  S('GFP+ transduced cell', CAT.imm, 'GFP positive transduced cell reporter fluorescent green integrated provirus retroviral stable expression hybridoma', [100, 100], (r) => {
    let s = `<circle cx="50" cy="50" r="47" fill="${GFPL}" opacity=".45" data-flat="1"/>`;
    s += glob(50, 50, 41, 39, '#a8e0b1', r, { amp: 0.035, oc: '#3f9e48' });
    s += glob(52, 52, 24, 21, '#d9ccef', r, { amp: 0.05, oc: '#9b84c9' });
    s += integrated(32, 72, 53, 4.5);
    return s;
  }, GFP);

  // Retroviral plasmids drawn as maps: LTRs, the insert, GFP (green) and puromycin resistance.
  const plasmid = (insert) => () => {
    const cx = 50, cy = 50, R0 = 34, seg = (a0, a1, c, w = 8) => {
      const p = (a) => [cx + R0 * Math.cos(a), cy + R0 * Math.sin(a)], [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `<path d="M${f(x0)} ${f(y0)} A${R0} ${R0} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${oc(c)}" stroke-width="${w + 2}" stroke-linecap="butt"/><path d="M${f(x0)} ${f(y0)} A${R0} ${R0} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="butt"/>`;
    };
    const T = Math.PI / 180;
    let s = `<circle cx="${cx}" cy="${cy}" r="${R0}" fill="none" stroke="#9aa6b2" stroke-width="3"/>`;
    s += seg(-100 * T, -80 * T, '#9aa6b2') + seg(80 * T, 100 * T, '#9aa6b2');                 // LTRs
    if (insert) s += seg(-72 * T, -8 * T, '#d64545');                                         // insert (e.g. Aicda)
    s += seg(2 * T, 52 * T, GFP);                                                             // GFP
    s += seg(112 * T, 168 * T, '#e8b33c');                                                    // puromycin resistance
    return s;
  };
  S('Retroviral plasmid (insert, GFP, PuroR)', CAT.dna, 'retroviral plasmid vector map pMX insert GFP puromycin resistance LTR cloning Aicda', [100, 100], plasmid(true), GFP);
  S('Retroviral plasmid (empty, GFP, PuroR)', CAT.dna, 'retroviral plasmid vector map pMX empty vector control GFP puromycin resistance LTR', [100, 100], plasmid(false), GFP);
  // Flat like BioRender: mark these as finished so iconfinish.js does not add its shadow bands and light streaks.
  for (const ic of ICONS) if (NAMES.has(ic.name) && /^s-/.test(ic.id)) ic.finished = true;
})();
