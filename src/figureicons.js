// Soft-style icons for sequencing and immunology figures: gut-associated lymphoid tissue and germinal centres,
// sequencing instruments (nanopore, PacBio, Illumina, capillary), a Sanger chromatogram with ABI base colours,
// and retroviral transduction with a GFP reporter. Drawn with the shared kit from softicons.js.
(() => {
  const K = globalThis.SoftKit;
  if (!K) return;
  const { P, OW, f, oc, rng, hash, glob, tube, tubes, ball, ell, helix, cr } = K;
  const CAT = { imm: 'Soft · Cells', tissue: 'Soft · Organs & body systems', seq: 'Soft · Lab equipment', dna: 'Soft · DNA & genetics' };
  const R = (name) => rng(hash(name));
  const S = (name, cat, tags, vb, draw, color = P.navy) => K.add(name, cat, tags, color, () => draw(R(name)), vb);
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
  // Peyer's patch: a section through the small-intestinal wall. Villi either side, two follicle-associated
  // epithelium domes over lymphoid follicles with pale germinal centres, then submucosa and muscle layers.
  S("Peyer's patch", CAT.tissue, "Peyer's patch Peyers patches GALT gut-associated lymphoid tissue small intestine ileum follicle germinal centre dome M cell mucosa", [160, 104], (r) => {
    const MUC = '#f4c9c4', VIL = '#eba29d', SUB = '#f8e3d6', MUS = '#d8857c';
    let s = rr(0, 74, 160, 14, 0, SUB, { oc: '#dfbfae', w: 1.2 }) + rr(0, 87, 160, 15, 0, MUS, { w: 1.4 });
    for (let x = 6; x < 160; x += 9) s += line(`M${x} 90 L${x + 4} 99`, mix(MUS, '#7a3a34', 0.3), 1, { op: 0.6 });
    s += path('M0 44 H160 V76 H0 Z', MUC, { oc: '#d9a7a1', w: 1.2 });
    // villi on both flanks
    const villus = (x, h) => path(`M${x - 5} 46 C${x - 5} ${46 - h * 0.6} ${x - 4.5} ${46 - h} ${x} ${46 - h} C${x + 4.5} ${46 - h} ${x + 5} ${46 - h * 0.6} ${x + 5} 46 Z`, VIL, { w: 1.4 });
    [8, 19, 30].forEach((x, i) => { s += villus(x, 30 + (i % 2) * 5 + r() * 3); });
    [131, 142, 153].forEach((x, i) => { s += villus(x, 31 + (i % 2) * 4 + r() * 3); });
    // two domes with follicles
    [[60, 22], [100, 22]].forEach(([cx]) => {
      s += path(`M${cx - 24} 46 C${cx - 22} 26 ${cx - 12} 16 ${cx} 16 C${cx + 12} 16 ${cx + 22} 26 ${cx + 24} 46 Z`, MUC, { oc: '#d9a7a1', w: 1.4 });
      s += line(`M${cx - 23} 44 C${cx - 21} 26 ${cx - 12} 17.5 ${cx} 17.5 C${cx + 12} 17.5 ${cx + 21} 26 ${cx + 23} 44`, '#c9858d', 2.2, { op: 0.7 }); // follicle-associated epithelium
      s += ell(cx, 54, 21, 23, '#a99fdc', 0, { oc: '#6f63b8', w: 1.4 });           // follicle (mantle)
      s += packed(cx, 54, 20, 22, 1.25, '#8378c9', r, (x, y) => ((x - cx) / 12) ** 2 + ((y - 58) / 12) ** 2 > 1);
      s += ell(cx, 58, 12, 12, '#f3e6b8', 0, { oc: '#c9a85a', w: 1.2 });           // germinal centre
      s += packed(cx, 58, 11, 11, 1.5, '#e2c06a', r);
    });
    return s;
  }, '#7f72c4');

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
})();
