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
  // Pocket nanopore sequencer (MinION-style), after BioRender and Nature Methods drawings: a long, slim device in
  // three-quarter view with a darker grey shell over a pale base, vent slots along the long side, a USB-C port on
  // the near end, a round button on the lid and a lead from the far end. `open` lifts the lid to show the flow cell.
  const minion = (open) => () => {
    const q = (pts, c, o = {}) => path(poly(pts), c, { w: 1.2, ...o });
    const add = ([x, y], [dx, dy]) => [x + dx, y + dy];
    const TL = [10, 44], TR = [100, 14], BL = [30, 56], BR = [120, 26], H = [0, 9], H2 = [0, 15];
    let s = line(`M${f(TR[0] + 12)} ${f(TR[1] + 8)} C132 16 136 8 140 2`, '#5b6168', 5) + line('M126 14 C134 10 137 6 140 2', '#8a9096', 1.4, { op: 0.6 });
    s += rr(TR[0] + 8, TR[1] + 3, 10, 9, 3, '#6f757c', { w: 1 });                                         // cable boot
    s += q([BL, BR, add(BR, H2), add(BL, H2)], '#e2e5e8', { oc: '#9aa1a8' });                             // pale base, long side
    s += q([TL, BL, add(BL, H2), add(TL, H2)], '#d3d7db', { oc: '#9aa1a8' });                             // pale base, near end
    s += q([BL, BR, add(BR, H), add(BL, H)], '#b9bec3', { oc: '#7d848b' });                               // shell, long side
    s += q([TL, BL, add(BL, H), add(TL, H)], '#a9afb5', { oc: '#7d848b' });                               // shell, near end
    for (let k = 0; k < 22; k++) { const t = 0.22 + k * 0.032, x = BL[0] + (BR[0] - BL[0]) * t, y = BL[1] + (BR[1] - BL[1]) * t; s += line(`M${f(x)} ${f(y + 10.5)} L${f(x + 1.6)} ${f(y + 13.5)}`, '#6b7178', 0.9); }
    s += q([[13, 51], [24, 58], [24, 66], [13, 59]], '#3d4248', { oc: '#2a2e33' });                         // USB-C port
    s += line('M15.5 55 L21.5 59', '#9aa1a8', 1.1);
    if (!open) {
      s += q([TL, TR, BR, BL], '#9ea4aa', { oc: '#6f767d' });                                               // lid
      s += line(`M${f(TL[0] + 4)} ${f(TL[1] + 1)} L${f(TR[0] - 2)} ${f(TR[1] + 1)}`, '#c3c8cd', 1.4, { op: 0.8 });
      s += ell(96, 21, 6.5, 3.4, '#b9bec3', -17, { oc: '#7d848b', w: 1 });                                   // button
      return s;
    }
    s += q([TL, TR, BR, BL], '#7d848b', { oc: '#5b6168' });                                                 // open bay
    s += q([[22, 46], [96, 21.5], [108, 27], [34, 51.5]], '#3d4248', { oc: '#24282c', w: 1 });              // flow cell
    s += q([[44, 41], [58, 36.3], [64, 39.3], [50, 44]], '#cfd65a', { oc: '#9aa23a', w: 0.8 });             // sensor chip
    s += line('M70 33 L76 31 L79 33 L73 35 L76 37 L82 35 L85 37 L79 39', '#8a9096', 1.3);                   // waste channel
    s += ell(88, 27.5, 3, 1.6, '#8a9096', -17, { oc: '#5b6168', w: 0.8 });                                  // sample port
    s += q([TL, TR, [92, -14], [4, 16]], '#8f969d', { oc: '#5b6168' });                                     // lid, raised
    s += ell(82, -3, 6, 3.2, '#a9afb5', -17, { oc: '#6f767d', w: 1 });
    return s;
  };
  S('Nanopore sequencer (MinION-style)', CAT.seq, 'MinION nanopore sequencer Oxford Nanopore ONT portable long-read sequencing device USB', [140, 74], minion(false), '#9ea4aa');
  S('Nanopore sequencer, lid open (MinION-style)', CAT.seq, 'MinION nanopore sequencer lid open flow cell loading Oxford Nanopore ONT portable long-read sequencing device', [140, 74], minion(true), '#9ea4aa');

  // Nanopore flow cell (top view), after the Nature Methods drawing: dark body, yellow-green sensor chip,
  // serpentine waste channel, sample port and priming port.
  S('Nanopore flow cell', CAT.seq, 'nanopore flow cell MinION R10.4.1 sensor chip array membrane pores ASIC ONT consumable', [130, 56], () => {
    let s = rr(4, 6, 122, 44, 8, '#3d4248', { oc: '#24282c', w: 1.4 });
    s += rr(14, 14, 30, 22, 2, '#cfd65a', { oc: '#9aa23a', w: 1 });
    for (let y = 17; y < 34; y += 3) s += line(`M16 ${y} H42`, '#b3ba45', 0.5);
    s += ell(56, 40, 4, 4, '#8a9096', 0, { oc: '#5b6168', w: 1 }) + ell(56, 18, 2.6, 2.6, '#8a9096', 0, { oc: '#5b6168', w: 1 });
    s += line('M70 14 V40 H78 V14 H86 V40 H94 V14 H102 V40 H110 V14', '#8a9096', 3.2);
    s += ell(118, 40, 3, 3, '#5b6168', 0, { oc: '#24282c', w: 0.8 }) + ell(12, 44, 2, 2, '#5b6168', 0, { oc: '#24282c', w: 0.6 });
    return s;
  }, '#3d4248');

  // Nanopore sequencing principle, after BioRender: double-stranded DNA is unwound by a motor protein (teal, two
  // pale lobes) sitting on a protein nanopore (blue) in a membrane; one strand passes through the channel, and the
  // ions flowing out below carry the current that identifies each base.
  S('Nanopore sequencing (strand through pore)', CAT.dna, 'nanopore sequencing principle pore protein membrane motor protein helicase DNA strand translocation ionic current ions cis trans long read', [120, 132], (r) => {
    let s = `<rect x="0" y="80" width="120" height="14" fill="#e3f1fb" data-flat="1"/>` + rr(0, 78, 120, 3.5, 0, '#b9c5ce', { w: 0 }) + rr(0, 92.5, 120, 3.5, 0, '#b9c5ce', { w: 0 });
    // the unwinding duplex coming in from the upper right, and the displaced strand leaving to the upper left
    s += `<g transform="translate(64 34) rotate(-32)">${helix(4, 62, 0, 4.2, 2.6, { w: 2.1, c1: '#d64545', c2: '#2457c5' })}</g>`;
    s += line('M58 32 C46 24 34 30 24 22 C16 16 10 18 4 12', '#d64545', 2.1);
    s += path('M60 44 C80 44 92 52 92 66 L92 80 C92 90 84 92 80 87 C76 82 72 83 70 90 L70 108 L50 108 L50 90 C48 83 44 82 40 87 C36 92 28 90 28 80 L28 66 C28 52 40 44 60 44 Z', '#a7d2f4', { oc: '#3f78b5', w: 1.6 });
    s += path('M53 46 H67 C67 56 63 60 63 66 C63 72 66 74 66 80 L66 108 L54 108 L54 80 C54 74 57 72 57 66 C57 60 53 56 53 46 Z', '#5c97d6', { oc: '#3f78b5', w: 1 });
    s += ell(60, 40, 24, 12, '#55b3ac', 0, { oc: '#2e7f7a', w: 1.6 });                                    // motor protein
    s += ell(49, 42, 6.5, 9.5, '#bfe9e4', 0, { oc: '#2e7f7a', w: 1.1 }) + ell(71, 42, 6.5, 9.5, '#bfe9e4', 0, { oc: '#2e7f7a', w: 1.1 });
    s += line('M60 30 C60 40 61 50 60 60 C59 72 61 86 60 100 C59 112 62 120 66 128', '#1f3f8f', 2);         // translocating strand
    ['#d64545', '#1f9d3a', '#e8b33c', '#8b5cc6', '#d64545', '#1f9d3a'].forEach((c, k) => { s += ball(60.4 + (k % 2 ? -1 : 1) * 2, 58 + k * 8, 1.6, c, { w: 0.5 }); });
    for (let k = 0; k < 11; k++) s += `<circle cx="${f(46 + r() * 30)}" cy="${f(110 + r() * 18)}" r="${f(1 + r() * 0.9)}" fill="${k % 3 ? '#f2c94c' : '#e98fb4'}" opacity=".9"/>`; // ions
    return s;
  }, '#3f78b5');

  // Nanopore signal: the ionic current steps down as each k-mer sits in the pore, with base calls below.
  S('Nanopore current trace (squiggle)', CAT.dna, 'nanopore signal squiggle ionic current trace pA base calling basecalling raw signal electrical current ONT', [140, 84], (r) => {
    const COL = { A: '#1f9d3a', C: '#2457c5', G: '#e8a33c', T: '#d64545' }, calls = 'TGAACGTAAC';
    let s = line('M10 6 V64 H136', '#5b6168', 1.4);
    const lv = [24, 46, 30, 54, 38, 20, 44, 28, 50, 34];
    let d = '', x = 12;
    lv.forEach((y, i) => {
      const w = 9 + r() * 6;
      for (let k = 0; k <= 4; k++) { const xx = x + (w * k) / 4, yy = y + (r() - 0.5) * 3.2; d += `${d ? ' L' : 'M'}${f(xx)} ${f(yy)}`; }
      x += w;
      if (i < lv.length - 1) d += ` L${f(x)} ${f(lv[i + 1])}`;
      s += txt(x - w / 2, 78, calls[i], 9, COL[calls[i]]);
    });
    s += line(d, '#1f3f8f', 1.4);
    return s;
  }, '#1f3f8f');

  // Benchtop nanopore sequencer (PromethION-style), the platform high-throughput providers run: a dark unit with
  // an angled front holding two rows of twelve flow-cell bays.
  S('Nanopore sequencer, benchtop (PromethION-style)', CAT.seq, 'PromethION P24 P48 P2 nanopore sequencer benchtop high-throughput Oxford Nanopore ONT long-read sequencing service provider flow cells', [140, 92], () => {
    let s = path(poly([[10, 30], [28, 12], [134, 12], [116, 30]]), '#8a9096', { oc: '#5b6168', w: 1.2 });          // top
    s += path(poly([[116, 30], [134, 12], [134, 70], [116, 88]]), '#3d4248', { oc: '#24282c', w: 1.2 });           // side
    s += path(poly([[10, 30], [116, 30], [116, 88], [10, 88]]), '#4a5057', { oc: '#24282c', w: 1.4 });             // front
    s += path(poly([[16, 36], [110, 36], [110, 70], [16, 70]]), '#2f3338', { oc: '#1d2024', w: 1 });               // bay panel
    for (let row = 0; row < 2; row++) for (let k = 0; k < 12; k++) {
      const x = 20 + k * 7.4, y = 39 + row * 16;
      s += rr(x, y, 5, 12.5, 1, '#c3c9cf', { oc: '#7d848b', w: 0.6 }) + rr(x + 1.2, y + 2.5, 2.6, 4, 0.5, '#cfd65a', { oc: '#9aa23a', w: 0.4 });
    }
    s += rr(16, 76, 40, 5, 2, '#2bb3c0', { oc: '#1d8090', w: 0.7 }) + rr(92, 76, 18, 5, 2, '#5b6168', { w: 0.7 });
    return s;
  }, '#4a5057');
  // Thermal cycler with the lid open, traced from the author's reference illustration (tools/trace-icon.py; art in
  // tracedart.js): the picture's exact outline and proportions in 16 grey tones, in its own 1312 x 1199 frame.
  S('Thermal cycler (lid open)', CAT.seq, 'PCR machine thermocycler thermal cycler amplification 96-well block heated lid touchscreen', [1312, 1199],
    () => (globalThis.TRACED_ART && globalThis.TRACED_ART.thermalCycler) || '', '#8d9196');
  // PromethION-style flow cell: long, narrow cartridge with the sensor chip and sample port.
  S('Nanopore flow cell (PromethION-style)', CAT.seq, 'PromethION flow cell FLO-PRO114M R10.4.1 nanopore cartridge sensor chip consumable', [140, 40], () => {
    let s = rr(4, 8, 132, 24, 5, '#3d4248', { oc: '#24282c', w: 1.3 });
    s += rr(40, 13, 34, 14, 1.5, '#cfd65a', { oc: '#9aa23a', w: 0.9 });
    for (let x = 43; x < 72; x += 3) s += line(`M${x} 15 V25`, '#b3ba45', 0.5);
    s += ell(20, 20, 4, 4, '#8a9096', 0, { oc: '#5b6168', w: 0.9 }) + ell(30, 20, 2.4, 2.4, '#8a9096', 0, { oc: '#5b6168', w: 0.8 });
    s += line('M86 14 V26 M92 14 V26 M98 14 V26 M104 14 V26', '#8a9096', 2.4) + rr(114, 12, 16, 16, 2, '#c3c9cf', { oc: '#7d848b', w: 0.8 });
    return s;
  }, '#3d4248');

  // Laboratory mouse in side view, after BioRender's realistic mouse: rounded body with soft shading, large pink
  // ears, pink paws with toes, a long tapering tail, eye with a highlight and whiskers. Three coat colours.
  const SPEC = 'Soft · Model organisms & animals';
  const mixC = (a, b, k) => Color.mix(a, b, k);
  const realMouse = (coat, edge, shadeC, hiC) => () => {
    const SKIN = '#d79a90', SKINO = '#a8665d', SKIND = '#c3857b';
    // tail: one smooth outline that tapers from the root to the tip
    const tc = crPoints([[160, 66], [178, 68], [192, 76], [195, 88], [186, 97], [164, 102], [134, 104], [104, 104], [84, 102]], 1);
    const tw = (i) => 3.4 - (2.6 * i) / tc.length;
    const sideA = tc.map((p, i) => offsetPts(tc, tw(i))[i]), sideB = tc.map((p, i) => offsetPts(tc, -tw(i))[i]);
    let s = `<path d="${band(sideA, sideB)}" fill="${SKIN}" stroke="${SKINO}" stroke-width="0.9" stroke-linejoin="round"/>`;
    // limbs: thin pink legs with long flat feet and toes; far-side legs darker and set back
    const leg = (dx, c, o) => path(`M${60 + dx} 74 C${61 + dx} 83 ${59 + dx} 90 ${56 + dx} 95.5 L${45 + dx} 98.5 C${40 + dx} 99.5 ${39 + dx} 102 ${43 + dx} 102.4 L${57 + dx} 101.6 C${61 + dx} 101 ${63 + dx} 97 ${64 + dx} 91 C${65 + dx} 85 ${65 + dx} 79 ${65 + dx} 74 Z`, c, { oc: o, w: 0.9 })
      + line(`M${45 + dx} 99.4 L${40.5 + dx} 100.6 M${47 + dx} 100.8 L${42.5 + dx} 102.3 M${49 + dx} 101.6 L${46 + dx} 103.4`, o, 0.55);
    const hind = (dx, c, o) => path(`M${136 + dx} 80 C${138 + dx} 88 ${136 + dx} 93 ${131 + dx} 96.5 L${112 + dx} 98.6 C${107 + dx} 99.4 ${107 + dx} 102.3 ${111 + dx} 102.6 L${132 + dx} 101.8 C${138 + dx} 101 ${142 + dx} 96 ${143 + dx} 90 C${144 + dx} 86 ${143 + dx} 82 ${142 + dx} 80 Z`, c, { oc: o, w: 0.9 })
      + line(`M${112 + dx} 99.5 L${107.5 + dx} 100.7 M${114 + dx} 100.9 L${109.5 + dx} 102.4 M${116 + dx} 101.7 L${113 + dx} 103.5`, o, 0.55);
    s += leg(14, SKIND, SKINO) + hind(14, SKIND, SKINO);
    s += leg(0, SKIN, SKINO) + hind(0, SKIN, SKINO);
    // body: pointed snout, rounded crown, back rising to a hump over the haunch, round rump
    const body = [[9, 51], [13, 46], [22, 39], [34, 32], [48, 27], [62, 25], [80, 22], [104, 19], [128, 21], [148, 28], [163, 40], [170, 54], [167, 68], [156, 78], [138, 84], [112, 86], [88, 85], [72, 81], [60, 74], [48, 66], [34, 60], [22, 57], [13, 55]];
    s += path(cr(body, true), coat, { oc: edge, w: 1.4 });
    // soft shading: darker belly and rump, a light sheen along the back, haunch and shoulder contours
    s += path('M70 80 C96 72 128 72 158 76 C146 84 112 87 88 85 C80 84 74 82 70 80 Z', shadeC, { oc: shadeC, w: 0.1, op: 0.8 });
    s += path('M148 30 C162 42 170 56 166 68 C158 58 152 46 140 36 Z', shadeC, { oc: shadeC, w: 0.1, op: 0.65 });
    s += path('M50 30 C74 23 104 18 132 23 C108 23 80 27 58 35 Z', hiC, { oc: hiC, w: 0.1, op: 0.5 });
    s += line('M124 46 C140 52 148 64 146 78', edge, 0.9, { op: 0.5 }) + line('M62 50 C70 58 70 68 64 74', edge, 0.8, { op: 0.4 });
    // ears: the far ear peeks behind, the near ear is large, rounded and pink
    s += ell(50, 25, 6.5, 8, mixC(coat, '#000000', 0.12), -18, { oc: edge, w: 1 });
    s += path('M54 32 C50 21 56 12 65 12 C74 12 78 21 75 30 C72 38 60 40 54 32 Z', SKIN, { oc: SKINO, w: 1.2 });
    s += path('M58 30 C56 23 60 17 65 17 C70 17 72 23 70 28 C68 33 61 34 58 30 Z', SKIND, { oc: SKIND, w: 0.1 });
    // eye with highlight, nose, mouth line, whiskers
    s += ell(31, 41, 3, 2.6, '#1d1b1a', -10, { oc: '#000000', w: 0.6 }) + '<circle cx="30" cy="40" r="0.85" fill="#ffffff"/>';
    s += ell(10.5, 50.5, 2.6, 2.2, '#d9868c', 0, { oc: '#a8565e', w: 0.8 });
    s += line('M13 54 C16 56 19 56 22 55', edge, 0.8, { op: 0.8 });
    [[[18, 50], [0, 40]], [[18, 51], [-1, 48]], [[18, 52], [1, 57]], [[19, 53], [6, 64]], [[19, 50], [4, 33]]].forEach(([a, b]) => { s += line(`M${a[0]} ${a[1]} Q${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - 2} ${b[0]} ${b[1]}`, '#8a8580', 0.45); });
    return `<svg x="0" y="0" width="200" height="108" viewBox="0 0 200 108" overflow="hidden">${s}</svg>`;
  };
  S('Mouse, C57BL/6 (black, realistic)', SPEC, 'mouse C57BL/6 B6 black mouse lab mouse realistic Mus musculus in vivo rodent animal model knockout wild type', [200, 108], realMouse('#4c4845', '#2b2826', '#3a3633', '#6a6561'), '#4c4845');
  S('Mouse, albino (white, realistic)', SPEC, 'mouse albino white BALB/c lab mouse realistic Mus musculus in vivo rodent animal model', [200, 108], realMouse('#f3f0eb', '#b9b1a6', '#ddd6cc', '#ffffff'), '#f3f0eb');
  S('Mouse, agouti (brown, realistic)', SPEC, 'mouse agouti brown wild-type lab mouse realistic Mus musculus 129 in vivo rodent animal model', [200, 108], realMouse('#8d7259', '#5e4a38', '#76604a', '#a88d73'), '#8d7259');

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

  // Production-scale short-read sequencer (NovaSeq-style), traced from the author's illustration
  // (tools/trace-icon.py, colour mode) with a sequencing-run screen on the monitor: flow-cell lanes, per-cycle
  // quality bars with a Q30 line, and run progress.
  S('Production sequencer (NovaSeq-style)', CAT.seq, 'Illumina NovaSeq production short-read sequencer sequencing by synthesis flow cell drawer touchscreen run quality instrument', [1974, 1540],
    () => (globalThis.TRACED_ART && globalThis.TRACED_ART.productionSequencer) || '', '#3b3f45');

  // Illumina flow cell with clusters: a flat glass plate in three-quarter view and, standing on it, three clusters
  // of four clonal strands (one colour per cluster), each with purple adapter ends anchored in the surface and
  // pale stripes for its bases; strands further back stand higher on the plate.
  S('Flow-cell clusters (Illumina)', CAT.seq, 'Illumina flow cell clusters bridge amplification sequencing by synthesis clonal strands adapters short reads', [150, 80], () => {
    const ADP = '#8b5cc6', ADPO = '#6340a0', SW = 6;
    const CL = [['#3fae5a', '#2a7f3e'], ['#e8843b', '#b45f22'], ['#4a9be0', '#2f72b0']];
    // plate: top face, front edge, right edge
    let s = path(poly([[4, 64], [132, 64], [146, 54], [18, 54]]), '#e3e7eb', { oc: '#9aa6b2', w: 1.2 });
    s += path(poly([[4, 64], [132, 64], [132, 72], [4, 72]]), '#c9d0d7', { oc: '#9aa6b2', w: 1.2 });
    s += path(poly([[132, 64], [146, 54], [146, 62], [132, 72]]), '#b7c0c8', { oc: '#9aa6b2', w: 1.1 });
    const strand = (x, base, h, [c, o]) => {
      let t = `<ellipse cx="${f(x + SW / 2)}" cy="${f(base + 0.6)}" rx="5.5" ry="1.7" fill="#000" opacity="0.08"/>`;
      t += rr(x, base - 8, SW, 8, 1.6, ADP, { oc: ADPO, w: 0.7 });
      t += rr(x, base - h + 8, SW, h - 16, 1.2, c, { oc: o, w: 0.7 });
      for (let y = base - h + 11.5; y < base - 9; y += 3.8) t += line(`M${f(x + 1.1)} ${f(y)} L${f(x + SW - 1.1)} ${f(y)}`, '#ffffff', 0.8, { op: 0.55 });
      t += rr(x, base - h, SW, 8, 1.6, ADP, { oc: ADPO, w: 0.7 });
      t += line(`M${f(x + 1.6)} ${f(base - h + 2)} L${f(x + 1.6)} ${f(base - h + 5.6)}`, '#ffffff', 0.8, { op: 0.45 });
      return t;
    };
    // within a cluster: back strands first (higher base, drawn behind), heights varied
    const LAY = [[-11.5, 57, 42], [-4, 61, 48], [3.5, 56, 46], [11, 62, 40]];
    [[34, 0], [76, 1], [118, 2]].forEach(([cx, k]) => {
      [...LAY].sort((a, b) => a[1] - b[1]).forEach(([dx, base, h], j) => { s += strand(cx + dx - SW / 2, base, h + (j % 2) * 3 + k * 2, CL[k]); });
    });
    return `<g transform="translate(0 -4)">${s}</g>`;
  }, '#4a9be0');

  // UMI-tagged PCR products: double-stranded amplicons, each carrying a unique molecular identifier (a short
  // coloured block) at both ends, in the colours of three different molecules.
  S('UMI-tagged PCR products', CAT.dna, 'UMI unique molecular identifier tagged amplicons PCR products barcoded molecules consensus', [140, 84], () => {
    const UMIS = [['#e8843b', '#b45f22'], ['#3fae5a', '#2a7f3e'], ['#8b5cc6', '#6340a0']];
    let s = '';
    UMIS.forEach(([c, o], k) => {
      const y = 14 + k * 24;
      s += rr(30, y, 80, 5, 2.5, '#9fb4c8', { oc: '#6f8aa3', w: 0.9 }) + rr(30, y + 7, 80, 5, 2.5, '#c5d3e0', { oc: '#8aa1b7', w: 0.9 });
      for (let x = 36; x < 108; x += 6) s += line(`M${x} ${y + 5} L${x} ${y + 7}`, '#8aa1b7', 0.7);
      s += rr(10, y, 20, 12, 2.5, c, { oc: o, w: 1 }) + rr(110, y, 20, 12, 2.5, c, { oc: o, w: 1 });
      s += line(`M14 ${y + 3.5} L26 ${y + 3.5} M14 ${y + 8.5} L26 ${y + 8.5} M114 ${y + 3.5} L126 ${y + 3.5} M114 ${y + 8.5} L126 ${y + 8.5}`, '#ffffff', 0.8, { op: 0.6 });
    });
    return s;
  }, '#e8843b');

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
  const chromatogram = (calls) => (r) => {
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
    if (calls) peaks.forEach((p) => { s += txt(p.x, 9.5, p.b, 8, COL[p.b]); });
    return s;
  };
  S('Sanger chromatogram (ABI trace)', CAT.dna, 'Sanger sequencing chromatogram electropherogram trace ab1 ABI four-colour peaks base calls capillary', [160, 72], chromatogram(true), '#222222');
  // Without the base letters, for small sizes where they would print as specks.
  S('Sanger chromatogram (trace only)', CAT.dna, 'Sanger sequencing chromatogram electropherogram trace ab1 ABI four-colour peaks capillary small', [160, 72], chromatogram(false), '#222222');

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
  // B cells in the style of the soft B cell (im-bcell, immunoicons.js), drawn from it at render time so they match:
  // a group of three for a sorted population, and a germinal-centre B cell carrying the sorting markers between its
  // antibody receptors (B220 teal stalk, GL7 pink glycan beads, Fas orange trimer), at the receptors' own weight.
  // Uses the B cell's original drawing (classicDraw) so these get the same styling passes as im-bcell, once.
  const imB = (c) => { const ic = ICON_MAP['im-bcell']; return ic ? (ic.classicDraw || ic.draw)(c) : ''; };
  const thin = (d, c, w = 2) => `<path d="${d}" fill="none" stroke="${Color.dark(c, 0.34)}" stroke-width="${w + 2.6}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bead = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${Color.dark(c, 0.34)}" stroke-width="1"/>`;
  const MARK = {
    b220: thin('M50 8 L50 -3', '#2a9d8f') + bead(50, -4.5, 2.6, '#2a9d8f'),
    gl7: thin('M50 8 L50 1', '#c9578c', 1.6) + bead(47.6, -0.6, 2, '#e98fb4') + bead(52.4, -0.6, 2, '#e98fb4') + bead(50, -4.2, 2, '#c9578c'),
    fas: thin('M50 8 L50 0', '#e8a33c') + bead(47.3, -2.2, 2.1, '#e8a33c') + bead(52.7, -2.2, 2.1, '#e8a33c') + bead(50, -5.6, 2.1, '#f2c14e'),
  };
  S('Germinal-centre B cells (group)', CAT.imm, 'germinal centre center GC B cells group population sorted B cells lymphocytes several cells cluster', [120, 104], () => {
    const at = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})">${imB('#3e6db5')}</g>`;
    return `<svg x="0" y="0" width="120" height="104" viewBox="-4 -6 128 116" overflow="visible">${at(2, 4, 0.6) + at(62, 2, 0.6) + at(26, 36, 0.7)}</svg>`;
  }, '#3e6db5');
  S('Germinal-centre B cell (soft, with markers)', CAT.imm, 'germinal centre center GC B cell B220 CD45R GL7 Fas CD95 markers sorted activated lymphocyte', [100, 100], () => {
    let s = imB('#3e6db5');
    ['b220', 'gl7', 'fas', 'b220', 'gl7', 'fas'].forEach((k, i) => { s += `<g transform="rotate(${30 + i * 60} 50 50)">${MARK[k]}</g>`; });
    return s;
  }, '#3e6db5');

  // Flat lab-step icons to sit with the rest of this set: a GFP histogram with a "high" gate, a 96-well plate seen
  // from above with a few GFP-positive clones, and puromycin selection (resistant cell survives, sensitive cell dies).
  S('GFP histogram with high gate', CAT.imm, 'GFP histogram flow cytometry gate GFP-high sort selection reporter fluorescence positive negative', [100, 72], () => {
    const curve = (mu, sd, amp) => (x) => amp * Math.exp(-(((x - mu) / sd) ** 2) / 2);
    const neg = curve(30, 7, 38), pos = curve(68, 9, 30), base = 66;
    const pts = (fn, a, b) => { let d = `M${a} ${base}`; for (let x = a; x <= b; x += 1) d += ` L${x} ${f(base - fn(x))}`; return d + ` L${b} ${base} Z`; };
    let s = path(pts(neg, 12, 50), '#d3dae1', { oc: '#9aa6b2', w: 1.2 }) + path(pts(pos, 44, 94), '#8fd39b', { oc: '#3f9e48', w: 1.2 });
    s += line(`M10 6 V${base} H96`, '#5b6168', 1.4);
    s += line('M62 18 V12 H94 V18', '#2f8f47', 2.2); // the gate (labels belong in the figure, not the icon)
    return s;
  }, '#3f9e48');
  S('96-well plate (top view, flat)', CAT.seq, '96-well plate microplate top view limiting dilution subcloning clones wells', [120, 88], (r) => {
    let s = rr(4, 6, 112, 78, 7, '#eef2f5', { oc: '#9aa6b2', w: 1.4 });
    const pick = new Set(Array.from({ length: 9 }, () => Math.floor(r() * 96)));
    for (let row = 0; row < 8; row++) for (let col = 0; col < 12; col++) {
      const k = row * 12 + col, x = 14 + col * 8.4, y = 15 + row * 8.6;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="3.1" fill="${pick.has(k) ? '#8fd39b' : '#ffffff'}" stroke="${pick.has(k) ? '#3f9e48' : '#b7c1cb'}" stroke-width="0.9"/>`;
    }
    return s;
  }, '#9aa6b2');
  S('Puromycin selection (flat)', CAT.imm, 'puromycin selection antibiotic resistant cells survive sensitive cells die stable transduced clones', [120, 70], () => {
    const ic = ICON_MAP['s-antibiotic-selection'];
    return ic ? (ic.classicDraw || ic.draw)('#3f9e48') : '';
  }, '#3f9e48');

  // Antibody-secreting cell in BioRender's manner (plasma cell, myeloma, hybridoma): a ruffled outline, a large
  // nucleus with the segmented "cartwheel" chromatin, and stacked rough ER on one side. Recolourable, so one drawing
  // serves for a plasma cell (blue), myeloma (orange), hybridoma (red) or a coloured hybridoma library; the second
  // version wears its own antibodies, some on the membrane and some just released.
  const secretor = (c, r, withAb) => {
    const body = mix(c, '#ffffff', 0.22), edge = Color.dark(c, 0.42), nuc = Color.dark(c, 0.18), chrom = Color.dark(c, 0.5), er = Color.dark(c, 0.36);
    const pts = []; const ph = r() * 6;
    for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2, k = 1 + 0.045 * Math.sin(9 * a + ph) + 0.03 * Math.sin(5 * a + 1.3) + 0.04 * Math.sin(2 * a); pts.push([60 + 44 * k * Math.cos(a), 52 + 37 * k * Math.sin(a)]); }
    let s = '';
    if (withAb) {
      const Y = (x, y, ang, sc) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)}) scale(${sc})">` + tubes([[[0, 0], [0, -7]], [[0, -7], [-5, -13]], [[0, -7], [5, -13]]], 2.6, Color.dark(c, 0.15), { ow: 0.9 }) + '</g>';
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.25, rr0 = k % 3 === 1 ? 62 : 49; s += Y(60 + rr0 * Math.cos(a) * 1.08, 52 + rr0 * Math.sin(a) * 0.95, (a * 180) / Math.PI + 90 + (k % 3 === 1 ? 25 : 0), k % 3 === 1 ? 0.9 : 1); }
    }
    s += path(cr(pts, true), body, { oc: edge, w: 1.8 });
    s += path(cr(pts.map(([x, y]) => [60 + (x - 60) * 0.8 - 6, 52 + (y - 52) * 0.8 - 2]), true), mix(c, '#ffffff', 0.38), { oc: mix(c, '#ffffff', 0.38), w: 0.1, op: 0.55 });
    // rough ER: stacked, slightly wavy cisternae
    for (let k = 0; k < 5; k++) { const x = 70 + k * 5.2; s += line(`M${f(x)} ${f(28 + k * 2)} C${f(x + 6)} ${f(40)} ${f(x + 6)} ${f(64)} ${f(x)} ${f(76 - k * 2)}`, er, 2.1); }
    for (let k = 0; k < 10; k++) s += `<circle cx="${f(68 + r() * 30)}" cy="${f(30 + r() * 44)}" r="0.9" fill="${er}"/>`;
    // nucleus with cartwheel chromatin
    s += `<circle cx="44" cy="52" r="20" fill="${nuc}" stroke="${edge}" stroke-width="1.6"/>`;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.3, a1 = a - 0.26, a2 = a + 0.26, p = (rad, t) => [44 + rad * Math.cos(t), 52 + rad * Math.sin(t)];
      const [x0, y0] = p(5, a), [x1, y1] = p(16, a1), [x2, y2] = p(16, a2); s += `<path d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)} Q${f(44 + 18 * Math.cos(a))} ${f(52 + 18 * Math.sin(a))} ${f(x2)} ${f(y2)} Z" fill="${chrom}" stroke="${chrom}" stroke-width="1" stroke-linejoin="round"/>`; }
    s += `<circle cx="44" cy="52" r="3.4" fill="${chrom}"/>`;
    return s;
  };
  const SECRETOR_TAGS = 'hybridoma plasma cell myeloma antibody-secreting cell ASC rough ER endoplasmic reticulum ruffled BioRender';
  K.add('Antibody-secreting cell (ruffled)', CAT.imm, SECRETOR_TAGS, '#c45a5a', (c) => secretor(c || '#c45a5a', R('secretor'), false), [120, 104]);
  NAMES.add('Antibody-secreting cell (ruffled)');
  K.add('Antibody-secreting cell with antibodies (ruffled)', CAT.imm, SECRETOR_TAGS + ' surface Ig secreted antibodies', '#c45a5a', (c) => `<svg x="0" y="0" width="120" height="104" viewBox="-14 -14 148 132" overflow="visible">${secretor(c || '#c45a5a', R('secretor'), true)}</svg>`, [120, 104]);
  NAMES.add('Antibody-secreting cell with antibodies (ruffled)');

  // DNA double helix in one colour (both strands one hue, base pairs a lighter tint): for libraries of coloured genes.
  K.add('DNA double helix (one colour)', CAT.dna, 'DNA double helix one colour single colour gene library VH VL coloured', '#2457c5',
    (c) => helix(4, 156, 20, 11, 3.2, { w: 3.6, c1: c || '#2457c5', c2: Color.dark(c || '#2457c5', 0.12), pairA: mix(c || '#2457c5', '#ffffff', 0.45), pairB: mix(c || '#2457c5', '#ffffff', 0.6) }), [160, 40]);
  NAMES.add('DNA double helix (one colour)');

  // Lateral-flow test cassette: control (C) and test (T) lines in the read window, and the sample well (S).
  S('Lateral flow test cassette', CAT.seq, 'lateral flow test rapid antigen test cassette point-of-care diagnostic control line test line sample well LFA', [64, 120], () => {
    let s = rr(4, 4, 56, 112, 12, '#3b5d73', { oc: '#26404f', w: 1.6 });
    s += rr(22, 14, 20, 48, 6, '#f3f6f8', { oc: '#c3ccd5', w: 1 }) + rr(25, 26, 14, 4, 1, '#3a8fd6', { w: 0.6 }) + rr(25, 44, 14, 4, 1, '#3a8fd6', { w: 0.6 });
    s += txt(13, 31, 'C', 9, '#ffffff') + txt(13, 49, 'T', 9, '#ffffff') + txt(32, 80, 'S', 9, '#ffffff');
    s += `<circle cx="32" cy="98" r="9" fill="#f3f6f8" stroke="#c3ccd5" stroke-width="1"/><circle cx="32" cy="98" r="5" fill="#3a8fd6"/>`;
    return s;
  }, '#3b5d73');

  // ---------- Slide-level schematics: immune synapse with checkpoint blockade, labelled antigen, FACS sorter, RT ----------
  // A Y-shaped IgG drawn with the soft tubes: arms (Fab) towards `deg`, at (x, y) the hinge, `k` the scale.
  const igY = (x, y, deg, k, c) => {
    const t = (deg * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)], n = [-u[1], u[0]], P = (a, b) => [x + u[0] * a + n[0] * b, y + u[1] * a + n[1] * b];
    return tubes([[P(0, 0), P(-14 * k, 0)], [P(0, 0), P(11 * k, -9 * k)], [P(0, 0), P(11 * k, 9 * k)]], 4.2 * k, c, { ow: 1 })
      + tubes([[P(3 * k, -5 * k), P(11 * k, -13 * k)], [P(3 * k, 5 * k), P(11 * k, 13 * k)]], 2.8 * k, mix(c, '#ffffff', 0.4), { ow: 0.8 });
  };
  // Immune synapse: T cell (left) and tumour cell (right) membranes; TCR on the T cell engages peptide–MHC-I on the
  // tumour cell; PD-1 faces PD-L1, and an anti-PD-L1 antibody sits on PD-L1 so the inhibitory signal is blocked.
  S('Immune synapse with checkpoint blockade', CAT.imm, 'immune synapse checkpoint blockade immunotherapy PD-1 PD-L1 anti-PD-L1 antibody TCR MHC class I peptide T cell tumour cell killing', [260, 160], () => {
    const TG = '#3f9e48', TGL = '#bfe3c0', TU = '#d6584a', TUL = '#f6cfcc';
    let s = rr(-4, -4, 46, 168, 0, '#e8f5e8', { oc: '#e8f5e8', w: 0.1 }) + rr(218, -4, 46, 168, 0, '#fbe9e7', { oc: '#fbe9e7', w: 0.1 });
    s += rr(36, -4, 10, 168, 3, TGL, { oc: TG, w: 1.4 }) + rr(214, -4, 10, 168, 3, TUL, { oc: TU, w: 1.4 });
    // TCR (α light, β dark green) from the T cell membrane, its tips on the peptide; MHC class I from the tumour membrane
    // (α3 stalk, α1/α2 groove holding the peptide) with β2-microglobulin
    s += tubes([[[44, 32], [80, 32], [104, 34]]], 7, '#2f8f47', { ow: 1.1 }) + tubes([[[44, 52], [80, 52], [104, 50]]], 7, '#7fc97f', { ow: 1.1 });
    s += ell(112, 35, 9, 7, '#2f8f47', 0, { w: 1.2 }) + ell(112, 49, 9, 7, '#7fc97f', 0, { w: 1.2 });
    s += tubes([[[216, 42], [176, 42]]], 7, '#e3b86a', { ow: 1.1 }) + ball(184, 60, 7, '#c9a24a', { w: 1 });
    s += ell(158, 34, 15, 9, '#e8c27a', 0, { w: 1.2 }) + ell(158, 50, 15, 9, '#e8c27a', 0, { w: 1.2 });
    s += rr(118, 37, 28, 10, 5, '#d64545', { w: 1 });
    // PD-1 on the T cell, PD-L1 on the tumour cell, anti-PD-L1 antibody in between
    s += tubes([[[44, 116], [78, 116]]], 5, TG, { ow: 1 }) + ball(86, 116, 9, TG, { w: 1.2 });
    s += tubes([[[216, 116], [196, 116]]], 5, '#e8843b', { ow: 1 }) + ball(186, 116, 9, '#e8843b', { w: 1.2 }) + ball(168, 116, 9, '#f2a65e', { w: 1.2 });
    s += igY(144, 116, 0, 1.25, '#2457c5');
    return s;
  }, '#3f9e48');

  // Fluorescently labelled antigen: a lumpy multi-domain protein, a flexible linker and a glowing fluorophore.
  S('Fluorescently labelled antigen', CAT.imm, 'fluorescently labelled antigen fluorophore conjugate tetramer probe bait staining sorting antigen-specific', [100, 110], (r) => {
    const PC = '#8b5cc6';
    let s = '';
    [[50, 30, 13, PC], [36, 22, 11, '#a383d6'], [64, 20, 11, '#7a4bb8'], [34, 40, 11, '#7a4bb8'], [66, 40, 12, '#a383d6'], [50, 14, 10, '#9a72d0'], [50, 46, 11, '#9a72d0']]
      .forEach(([x, y, rad, c]) => { s += ball(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2, rad, c, { w: 1.2 }); });
    s += line('M50 56 C44 64 58 70 50 78', '#3d4248', 2);
    s += `<circle cx="50" cy="92" r="17" fill="#b6f05a" opacity=".22" data-flat="1"/><circle cx="50" cy="92" r="12.5" fill="#b6f05a" opacity=".35" data-flat="1"/>`;
    s += ball(50, 92, 9, '#7ed321', { oc: '#4f9a10', w: 1.2 }) + `<circle cx="47" cy="89" r="2.6" fill="#ffffff" opacity=".7"/>`;
    return s;
  }, '#8b5cc6');

  // FACS sorter: sample funnel feeding cells in single file past the laser (scatter to the detector), the stream
  // breaking into droplets, charged deflection plates sending droplets left or right into collection tubes.
  S('FACS sorter (nozzle, laser, plates, tubes)', CAT.seq, 'FACS fluorescence-activated cell sorting sorter nozzle laser detector deflection plates droplets collection tubes flow cytometry', [180, 210], (r) => {
    const PU = '#b77bd6', GR = '#5fbf6a', GY = '#c3ccd5';
    let s = path('M58 6 H122 L104 58 V76 H76 V58 Z', '#e6f3fb', { oc: '#7d8996', w: 1.6 });
    [[72, 16, PU], [90, 14, GR], [108, 18, PU], [80, 30, GR], [98, 32, PU], [88, 46, GR]].forEach(([x, y, c]) => { s += ball(x, y, 5, c, { w: 1 }); });
    s += rr(84, 74, 12, 30, 3, '#e6f3fb', { oc: '#7d8996', w: 1.4 });
    s += ball(90, 82, 3.6, GR, { w: 0.8 }) + ball(90, 94, 3.6, PU, { w: 0.8 });
    // laser and detector
    s += rr(6, 84, 34, 12, 3, '#59636e', { w: 1 }) + line('M40 90 L86 90', '#e8843b', 3) + line('M40 90 L86 90', '#f2c94c', 1.2);
    s += line('M94 90 L146 80 M94 90 L146 100', '#f2c94c', 1.4, { dash: '3 2' }) + rr(146, 74, 26, 32, 4, '#3d4248', { w: 1 }) + rr(150, 80, 18, 20, 2, '#2bb3c0', { oc: '#1d8090', w: 0.8 });
    // droplets breaking off, plates, deflected streams
    s += ball(90, 112, 4, GR, { w: 0.8 }) + ball(90, 124, 4, PU, { w: 0.8 });
    s += `<g transform="rotate(14 54 140)">${rr(48, 118, 12, 46, 3, '#3a6fc4', { w: 1 })}</g><g transform="rotate(-14 126 140)">${rr(120, 118, 12, 46, 3, '#d64545', { w: 1 })}</g>`;
    s += txt(54, 146, '−', 13, '#ffffff') + txt(126, 146, '+', 12, '#ffffff');
    [[80, 140, PU], [70, 156, PU], [61, 172, PU]].forEach(([x, y, c]) => { s += ball(x, y, 4, c, { w: 0.8 }); });
    [[100, 140, GR], [110, 156, GR], [119, 172, GR]].forEach(([x, y, c]) => { s += ball(x, y, 4, c, { w: 0.8 }); });
    s += ball(90, 150, 2.6, GY, { w: 0.6 }) + ball(90, 166, 2.6, GY, { w: 0.6 });
    // collection tubes
    const tubeAt = (x, c) => path(`M${x - 13} 180 V198 C${x - 13} 208 ${x + 13} 208 ${x + 13} 198 V180 Z`, '#f3f7fa', { oc: '#8a96a3', w: 1.4 }) + rr(x - 15, 176, 30, 6, 2, '#cfd6dd', { w: 1 }) + ball(x - 4, 198, 3.6, c, { w: 0.8 }) + ball(x + 5, 194, 3.6, c, { w: 0.8 });
    s += tubeAt(52, PU) + tubeAt(128, GR);
    return s;
  }, '#3a6fc4');

  // Reverse transcription: reverse transcriptase moving along the mRNA from an oligo-dT primer at the poly(A) tail,
  // leaving the new cDNA strand paired with the RNA behind it (an RNA:DNA hybrid); arrow = direction of synthesis.
  S('Reverse transcription (mRNA to cDNA)', CAT.dna, 'reverse transcription reverse transcriptase RT mRNA cDNA first strand synthesis oligo-dT primer poly(A) RNA:DNA hybrid', [200, 92], () => {
    const RNA = '#9b59b6', DNAc = '#2457c5';
    const wave = (x0, x1, y, amp = 3) => { let d = `M${x0} ${y}`; for (let x = x0; x <= x1; x += 4) d += ` L${x} ${f(y + amp * Math.sin((x - x0) / 7))}`; return d; };
    let s = line(wave(6, 194, 40), RNA, 3.2);
    for (let x = 110; x < 186; x += 6) s += line(`M${x} ${f(40 + 3 * Math.sin((x - 6) / 7) + 3)} V58`, '#b9c3cc', 1.4);
    s += line(wave(110, 186, 62, 2), DNAc, 3.2);
    s += rr(176, 56, 14, 8, 3, '#7fb2e5', { oc: DNAc, w: 1 });                    // oligo-dT primer at the poly(A) tail
    s += glob(102, 50, 24, 18, '#3fb6a8', K.rng(7), { amp: 0.08 }) + `<ellipse cx="94" cy="42" rx="7" ry="4" fill="#ffffff" opacity=".35"/>`;
    s += arrow(88, 14, 50, 14, '#3d4248', 2);
    for (let x = 160; x <= 190; x += 6) s += txt(x, 34, 'A', 6, RNA);
    return s;
  }, '#3fb6a8');

  // NK cell: a large granular lymphocyte, lavender, with a kidney-shaped nucleus, red cytotoxic granules and CD16
  // (FcγRIII) Fc receptors around the membrane, the receptors antibody-coated targets engage in ADCC.
  S('NK cell (CD16, cytotoxic granules)', CAT.imm, 'NK cell natural killer large granular lymphocyte CD16 FcγRIII Fc receptor perforin granzyme cytotoxic granules ADCC', [110, 110], (r) => {
    let s = '';
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.2, p = (rad) => [55 + rad * Math.cos(a), 55 + rad * Math.sin(a)];
      s += tube([p(36), p(46)], 2.6, '#5a3f9a', { ow: 0.8 });
      const [hx, hy] = p(49), n = [-Math.sin(a) * 2.6, Math.cos(a) * 2.6];
      s += ball(hx + n[0], hy + n[1], 3.2, '#6f52b8', { w: 0.8 }) + ball(hx - n[0], hy - n[1], 3.2, '#8b6fd0', { w: 0.8 });
    }
    s += glob(55, 55, 38, 37, '#d6c9f0', r, { amp: 0.035, oc: '#7a5cc0' });
    s += path('M38 40 C46 30 64 32 66 44 C68 52 60 54 58 60 C56 70 44 72 38 64 C32 58 32 48 38 40 Z', '#9c7fd6', { oc: '#6a4fb0', w: 1.4 });
    [[72, 52], [76, 62], [68, 70], [80, 46], [62, 78], [74, 74], [70, 40]].forEach(([x, y]) => { s += ball(x, y, 2.7, '#d64545', { w: 0.7 }); });
    s += `<ellipse cx="40" cy="30" rx="10" ry="4" fill="#ffffff" opacity=".4" transform="rotate(-30 40 30)"/>`;
    return s;
  }, '#8b6fd0');

  // C1q: six globular heads on collagen-like stalks gathered into a stem, the "bouquet of tulips"; heads face left to
  // bind the Fc of antibodies on a target.
  S('Complement C1q (bouquet)', CAT.imm, 'complement C1q bouquet of tulips classical pathway globular heads collagen stalk Fc binding', [110, 92], () => {
    const heads = [[20, 12], [14, 27], [11, 42], [11, 54], [14, 68], [20, 82]];
    let s = tube([[104, 47], [70, 47]], 9, '#3f9e48', { ow: 1.1 });
    heads.forEach(([x, y]) => { s += tube([[70, 47], [48, 47 + (y - 47) * 0.55], [x + 8, y]], 2.8, '#4caf50', { ow: 0.8 }); });
    heads.forEach(([x, y]) => { s += ell(x, y, 8, 6.5, '#7fcf86', 0, { oc: '#2f8f47', w: 1.2 }); });
    return s;
  }, '#3f9e48');

  // Flat like BioRender: mark these as finished so iconfinish.js does not add its shadow bands and light streaks.
  // The two soft B-cell icons stay unfinished, so they are shaded exactly like the im-bcell they are drawn from.
  NAMES.delete('Germinal-centre B cells (group)'); NAMES.delete('Germinal-centre B cell (soft, with markers)');
  for (const ic of ICONS) if (NAMES.has(ic.name) && /^s-/.test(ic.id)) ic.finished = true;
})();
