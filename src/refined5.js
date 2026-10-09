// Refined icons, part 5: labware drawn to real proportions from the reference sheets — Falcon tubes, media bottles,
// glassware, T-flasks — plus flow cytometer models and HPLC modules (drawn with src/refinedkit.js and src/labkit.js).
(() => {
  const K = globalThis.RefinedKit, LK = globalThis.LabKit;
  if (!K || !LK) return;
  const { PAL, line, path, rect, circ, ell, stroke, flat, dot, text, part, G, poly, glass, glint, box3, screen, button, add } = K;
  const CON = 'Lab consumables', LAB = 'Lab instruments';

  // ---------- Falcon tubes ----------
  const tube = (ml, o) => { const t = LK.falcon(ml, o); return t; };
  const tubeIcon = (name, ml, tags, colour, o) => { const t = tube(ml, { c: colour, ...o }); add(name, CON, tags, colour, [t.w, t.h], (c) => LK.falcon(ml, { ...o, c }).svg); };
  tubeIcon('Falcon tube (15 mL)', 15, 'Falcon tube 15 mL conical centrifuge tube', '#9fd1ec', { level: 0.85 });
  tubeIcon('Falcon tube (15 mL, empty)', 15, 'Falcon tube 15 mL conical empty', '#9fd1ec', {});
  tubeIcon('Falcon tube (50 mL)', 50, 'Falcon tube 50 mL conical centrifuge tube', '#9fd1ec', { level: 0.9 });
  tubeIcon('Falcon tube (50 mL, half)', 50, 'Falcon tube 50 mL conical half full', '#9fd1ec', { level: 0.5 });
  tubeIcon('Falcon tube (50 mL, empty)', 50, 'Falcon tube 50 mL conical empty', '#9fd1ec', {});
  tubeIcon('Falcon tube (50 mL, media)', 50, 'Falcon tube 50 mL medium red culture media', '#e8433c', { level: 0.55 });
  tubeIcon('Falcon tube (15 mL, open)', 15, 'Falcon tube 15 mL open cap uncapped', '#e98bb0', { level: 0.55, open: true, cap: '#3f8fd8' });
  tubeIcon('Falcon tube (50 mL, cell pellet)', 50, 'Falcon tube 50 mL cell pellet centrifuged', '#e98bb0', { level: 0.45, pellet: '#e7c9b0' });
  tubeIcon('Falcon tube (15 mL, schematic)', 15, 'Falcon tube 15 mL schematic label', '#9fd1ec', { level: 0.75, schematic: true });
  tubeIcon('Falcon tube (50 mL, schematic)', 50, 'Falcon tube 50 mL schematic label', '#9fd1ec', { level: 0.75, schematic: true });
  tubeIcon('Falcon tube (labelled)', 50, 'Falcon tube 50 mL labelled my media', '#e36d6d', { level: 0.3, label: 'My media', cap: '#2f64c7' });

  // ---------- Media bottles ----------
  for (const [ml, nm] of [[1000, '1 L'], [500, '500 mL'], [100, '100 mL']]) {
    const b = LK.bottle(ml, {});
    add(`Media bottle (${nm})`, CON, `media bottle ${nm} storage bottle square empty`, '#e8433c', [b.w, b.h], () => LK.bottle(ml, { cap: false }).svg);
    add(`Media bottle (${nm}, with cap)`, CON, `media bottle ${nm} cap label`, '#e8433c', [b.w, b.h], () => LK.bottle(ml, { label: true }).svg);
    add(`Media bottle (${nm}, full)`, CON, `media bottle ${nm} full medium culture media DMEM RPMI`, '#e8433c', [b.w, b.h], (c) => LK.bottle(ml, { level: 0.97, c, label: true }).svg);
  }
  add('Media bottle (500 mL, 400 mL liquid)', CON, 'media bottle 500 mL partly full medium', '#e8433c', [LK.bottle(500).w, LK.bottle(500).h], (c) => LK.bottle(500, { level: 0.72, c, label: true }).svg);

  // ---------- Glassware ----------
  add('Beaker (empty)', CON, 'beaker empty glassware Griffin', '#9fd1ec', [58, 70], () => LK.beaker({}));
  add('Beaker (3/5 liquid)', CON, 'beaker partly full liquid glassware', '#9fd1ec', [58, 70], (c) => LK.beaker({ level: 0.6, c }));
  add('Beaker (full)', CON, 'beaker full liquid glassware', '#9fd1ec', [58, 70], (c) => LK.beaker({ level: 0.92, c }));
  add('Beaker (pouring)', CON, 'beaker pouring tilted liquid transfer', '#9fd1ec', [88, 92], (c) =>
    G(LK.beaker({ x: 6, y: 6 }) + part('liquid', path('M6.7 6.5 L45.4 61.3 H10 Q6.7 61.3 6.7 58 Z', c, { op: 0.75, w: 0.6 })), 'translate(20 2) rotate(-55 30 36)')
    + part('stream', path('M5.6 41 q-1.6 20 0.4 49 h2.2 q-1.6 -26 0.2 -48 Z', c, { op: 0.75, w: 0.5 })));
  add('Erlenmeyer flask (small)', CON, 'Erlenmeyer flask small empty conical flask', '#9fd1ec', [60, 82], () => LK.erlenmeyer({ cx: 30, y: 6, s: 0.48 }));
  add('Erlenmeyer flask (with liquid)', CON, 'Erlenmeyer flask liquid conical flask', '#9fd1ec', [60, 82], (c) => LK.erlenmeyer({ cx: 30, y: 6, s: 0.48, level: 0.32, c }));
  add('Erlenmeyer flask (shaking)', CON, 'Erlenmeyer flask shaking culture yellow', '#f2c14c', [76, 84], (c) =>
    LK.erlenmeyer({ cx: 38, y: 8, s: 0.48, level: 0.3, c }) + part('motion', stroke('M10 40 q-4 8 0 16 M5 36 q-6 12 0 24 M66 40 q4 8 0 16 M71 36 q6 12 0 24', '#9aa5ae', 1)));
  add('Filtering flask', CON, 'filtering flask Buchner flask side arm vacuum filtration', '#9fd1ec', [72, 82], (c) => LK.erlenmeyer({ cx: 30, y: 6, s: 0.48, neck: 40, arm: true, level: 0.2, c }));
  add('Round bottom flask (empty)', CON, 'round bottom flask empty boiling flask', '#9fd1ec', [60, 88], () => LK.roundBottom({ cx: 30, R: 24, y: 4 }).svg);
  add('Round bottom flask (with liquid)', CON, 'round bottom flask liquid', '#9fd1ec', [60, 88], (c) => LK.roundBottom({ cx: 30, R: 24, y: 4, level: 0.45, c }).svg);
  add('Membrane filter', CON, 'membrane filter vacuum filtration funnel filter unit sterile filtration', '#9fd1ec', [64, 124], (c) => {
    const fl = LK.erlenmeyer({ cx: 32, y: 46, s: 0.5, neck: 30, level: 0.3, c });
    return fl + part('stopper', path('M25 40 H39 L37.5 52 H26.5 Z', '#3c4148') + rect(24, 38, 16, 3, 1, '#5b6168'))
      + part('collar', rect(28, 33, 8, 5, 1, '#e98bb0', { w: 0.7 }))
      + part('funnel', glass('M8 6 H56 L35.5 27 V33 H28.5 V27 Z') + ell(32, 6, 24, 3,  '#f4f9fb', { stroke: PAL.glassLine, w: 0.8 }) + path('M12.5 10 H51.5 L35 25 H29 Z', c, { op: 0.6, w: 0.5 }) + stroke('M32 52 V96', c, 1, { op: 0.8, dash: '1.5 2' }));
  });

  // ---------- Cell culture flasks ----------
  for (const [size, empty] of [[25, true], [25, false], [75, true]]) {
    const t = LK.tflask(size, {});
    add(`Cell culture flask (T${size}${empty ? ', empty' : ''})`, CON, `T${size} tissue culture flask${empty ? ' empty' : ' medium cells'}`, '#ee8c94', [t.w, t.h], (c) => LK.tflask(size, { medium: !empty, c }).svg);
  }

  // ---------- Flow cytometers (after the reference sheet's models) ----------
  const slot = (x, y, w, h, c = '#3c4148') => rect(x, y, w, h, 0.8, c, { w: 0.6 });
  const vents = (x, y, w, n, c = '#9aa5ae') => Array.from({ length: n }, (_, k) => stroke(`M${x} ${y + k * 2} h${w}`, c, 0.6)).join('');
  add('Flow cytometer (BD LSR)', LAB, 'flow cytometer BD LSR Fortessa pxONE analyser', '#3d4f8f', [100, 86], (c) =>
    part('cabinet', box3(14, 16, 58, 62, 14, c, { side: D(c, 0.2), top: L(c, 0.35) }) + rect(18, 20, 50, 20, 1.5, L(c, 0.12)) + flat('M20 22 H66 V24 H20 Z', '#ffffff', 0.25))
    + part('front', rect(18, 44, 50, 30, 1.5, D(c, 0.12)) + slot(24, 50, 22, 3) + slot(24, 57, 22, 3) + vents(50, 50, 14, 6, L(c, 0.3)))
    + part('sampler', box3(76, 56, 16, 22, 6, '#c3cad1') + rect(80, 50, 6, 8, 1, '#9fd1ec') + rect(79.4, 47, 7.2, 3.4, 1, '#3f73c4')));
  add('Flow cytometer (BD LSR II)', LAB, 'flow cytometer BD LSR II analyser benchtop', '#e9ecef', [110, 60], (c) =>
    part('housing', box3(8, 26, 86, 24, 18, c, { side: '#d5dbe0', top: '#f7f8f9' }) + flat('M8 34 H94 V36 H8 Z', '#c3cad1', 0.7))
    + part('badge', circ(68, 41, 2.6, '#ffffff', { stroke: '#9aa5ae', w: 0.6 }) + rect(74, 39.6, 14, 3, 1, '#c3cad1', { w: 0.5 }))
    + part('sample port', rect(96, 42, 6, 10, 1, '#c3cad1') + rect(97.6, 36, 3, 7, 1, '#9fd1ec', { w: 0.5 })));
  add('Flow cytometer (BD Accuri C6)', LAB, 'flow cytometer BD Accuri C6 compact benchtop', '#e04848', [100, 86], (c) =>
    part('fluidics', [12, 22].map((x) => rect(x, 30, 8, 26, 2, '#e6f2f6', { stroke: PAL.glassLine }) + rect(x + 1, 26, 6, 4, 1, '#3c4148')).join('') + stroke('M16 26 C16 16 28 14 34 22 M26 26 C26 18 32 18 36 24', '#5b6168', 0.8))
    + part('housing', box3(30, 36, 50, 36, 14, '#eef1f3') + path('M30 36 L37.7 29.7 H87.7 L80 36 Z', c) + path('M28 36 H82 V40 H28 Z', D(c, 0.08)) + path('M80 36 L87.7 29.7 V33.7 L82 40 Z', D(c, 0.2)))
    + part('base', path('M24 72 H90 Q92 72 92 74 V78 H22 V74 Q22 72 24 72 Z', '#5b6168') + ell(78, 74, 10, 3, '#3c4148'))
    + part('front', slot(36, 48, 16, 3) + slot(36, 56, 16, 3) + circ(70, 58, 4, '#c3cad1')));
  add('Cytek Aurora', LAB, 'Cytek Aurora spectral flow cytometer micro-sampling', '#e9ecef', [90, 90], (c) =>
    part('housing', path('M14 20 Q14 12 22 12 H62 Q72 12 72 22 V80 H14 Z', c) + path('M72 22 Q72 12 80 10 V76 L72 80 Z', '#d5dbe0') + path('M22 12 Q24 6 32 6 H74 Q80 6 80 10 Q72 12 62 12 Z', '#f7f8f9'))
    + part('screen', rect(22, 18, 30, 12, 1.5, '#dfe4e8') + screen(24, 20, 14, 8))
    + part('port', path('M24 50 H62 V70 H24 Z', '#2a2e33') + rect(40, 54, 6, 12, 1.5, '#9fd1ec', { w: 0.5 }) + flat('M26 52 H60 V54 H26 Z', '#ffffff', 0.2)));
  add('MACSQuant analyzer', LAB, 'MACSQuant flow cytometer Miltenyi analyser touchscreen', '#d9d3c5', [96, 96], (c) =>
    part('housing', box3(12, 40, 56, 46, 14, c) + rect(16, 44, 48, 16, 1.5, L(c, 0.2)) + vents(18, 66, 22, 6, D(c, 0.25)))
    + part('bottles', [70, 80].map((x) => rect(x, 60, 8, 22, 2, '#e6f2f6', { stroke: PAL.glassLine }) + rect(x + 1, 57, 6, 3, 1, '#5b6168')).join(''))
    + part('monitor', stroke('M50 40 V30', '#5b6168', 2) + rect(36, 8, 44, 24, 2, '#3c4148') + screen(38.5, 10.5, 39, 19, { c: '#e8eef6' }) + stroke('M44 24 l6 -6 5 3 7 -8 6 5', '#5b8fd6', 1))
    + part('rack', path('M22 32 h20 l-2 8 h-16 Z', '#c3cad1') + [26, 31, 36].map((x) => rect(x, 26, 3, 7, 1, '#9fd1ec', { w: 0.5 })).join('')));
  add('Cell sorter (BD FACSAria)', LAB, 'cell sorter FACS BD FACSAria sorting', '#4a4f57', [110, 86], (c) =>
    part('cabinet', box3(8, 18, 66, 60, 14, c, { side: D(c, 0.2), top: L(c, 0.3) }) + rect(12, 22, 58, 22, 1.5, D(c, 0.1)) + vents(16, 50, 26, 10, L(c, 0.25)))
    + part('sort chamber', box3(76, 30, 22, 48, 8, '#e9ecef') + rect(79, 36, 16, 18, 1.5, '#e6f2f6', { stroke: PAL.glassLine }) + rect(84, 58, 6, 8, 1, '#9fd1ec', { w: 0.5 }) + dot(90, 72, 1.6, '#e36d6d'))
    + part('panel', rect(46, 52, 22, 20, 1.5, '#6a7079') + screen(49, 55, 16, 8)));
  add('Cell analyzer (BD FACSymphony)', LAB, 'cell analyzer flow cytometer BD FACSymphony high-parameter', '#2b4a8f', [96, 90], (c) =>
    part('cabinet', box3(12, 14, 58, 70, 14, '#eef1f3') + rect(16, 18, 50, 18, 1.5, '#dfe4e8'))
    + part('drawers', [40, 50, 60, 70].map((y) => rect(16, y, 50, 8, 1.2, c) + rect(36, y + 3, 10, 1.6, 0.8, L(c, 0.4), { w: 0 })).join(''))
    + part('sampler', box3(72, 52, 14, 32, 6, '#e9ecef') + rect(75, 44, 5, 9, 1, '#9fd1ec', { w: 0.5 }) + rect(74.4, 41, 6.2, 3.2, 1, '#3f73c4')));
  add('FACS tube', CON, 'FACS tube flow cytometry round-bottom polystyrene tube 5 mL test tube', '#9fd1ec', [30, 110], (c) =>
    part('tube', glass('M8 18 H22 V98 Q22 106 15 106 Q8 106 8 98 Z')) + part('liquid', path('M8.6 70 H21.4 V98 Q21.4 105.4 15 105.4 Q8.6 105.4 8.6 98 Z', c, { op: 0.8, w: 0.5 }))
    + part('cap', rect(6, 4, 18, 16, 2.5, '#4aa3df') + flat('M7 5 H23 V8 H7 Z', '#ffffff', 0.3) + stroke('M10 8 V18 M15 8 V18 M20 8 V18', '#2f86c2', 0.6)) + part('glint', glint(11, 24, 96, 1.8)));
  add('Flow cell nozzle', LAB, 'flow cytometry nozzle flow cell hydrodynamic focusing sheath stream', '#9fd1ec', [60, 110], (c) =>
    part('nozzle', glass('M10 8 H50 L32 56 H28 Z') + stroke('M24 8 V0 M36 8 V0', PAL.glassLine, 2) + path('M14 12 H46 L31.5 52 H28.5 Z', c, { op: 0.5, w: 0.5 }))
    + part('stream', stroke('M30 56 V106', c, 1.6) + [66, 80, 94].map((y, i) => dot(30, y, 2.4, ['#e36d6d', '#9a79c9', '#e36d6d'][i])).join('')));
  add('Flow cytometry plot', LAB, 'flow cytometry dot plot density FSC SSC scatter gating', '#4d74c9', [100, 90], (c, r) => {
    let s2 = stroke('M16 8 V76 H94', '#3c4148', 1) + text(50, 88, 'FSC', 6, '#3c4148') + `<text x="6" y="42" transform="rotate(-90 6 42)" text-anchor="middle" font-family="Roboto, Helvetica, Arial" font-size="6" fill="#3c4148">SSC</text>`;
    for (const [cx, cy, rx, ry] of [[38, 58, 16, 11], [72, 30, 10, 9]]) {
      for (let i = 0; i < 160; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * 1.15; s2 += dot(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 0.55, '#2b3fa0', 0.8); }
      [[1, c], [0.72, '#3fc1c9'], [0.5, '#9be15d'], [0.32, '#f2c94c'], [0.16, '#e5483c']].forEach(([k, col]) => { s2 += ell(cx + (1 - k) * 1.5, cy + (1 - k), rx * k, ry * k, col, { stroke: 'none', w: 0, rot: -20 }); });
    }
    return part('axes', s2);
  });

  // ---------- HPLC ----------
  const module = (x, y, w, h, extra = '') => box3(x, y, w, h, 10, '#eef1f3') + extra;
  const hplcStack = (c) =>
    part('solvent tray', path('M14 16 L19.5 11.5 H79.5 L74 16 Z', '#dfe4e8') + rect(14, 16, 60, 4, 1, '#d5dbe0') + [20, 34, 48, 62].map((x, i) => rect(x, 2, 9, 14, 2, '#e6f2f6', { stroke: PAL.glassLine }) + rect(x + 0.6, 7, 7.8, 8.4, 1.5, [c, '#f2c94c', '#9bd8c2', '#e98bb0'][i], { op: 0.7, w: 0 }) + rect(x + 2, 0, 5, 2.6, 0.8, '#5b6168')).join(''))
    + part('degasser', module(14, 22, 60, 12, rect(18, 25, 18, 6, 1, '#dfe4e8') + dot(68, 28, 1.2, '#7fd17f')))
    + part('pump', module(14, 36, 60, 16, rect(18, 39, 22, 10, 1, '#dfe4e8') + circ(56, 44, 4, '#c3cad1') + dot(68, 40, 1.2, '#7fd17f')))
    + part('autosampler', module(14, 54, 60, 18, rect(18, 57, 36, 12, 1.5, '#e6f2f6', { stroke: PAL.glassLine }) + [22, 28, 34, 40, 46].map((x) => rect(x, 61, 3, 6, 1, c, { w: 0.4, op: 0.8 })).join('') + dot(68, 58, 1.2, '#7fd17f')))
    + part('column oven', module(14, 74, 60, 12, rect(18, 77, 40, 6, 1, '#dfe4e8') + stroke('M22 80 H54', '#8d969e', 2.2)))
    + part('detector', module(14, 88, 60, 14, rect(18, 91, 20, 8, 1, '#dfe4e8') + screen(44, 91, 14, 7) + dot(68, 92, 1.2, '#7fd17f')));
  add('HPLC system', LAB, 'HPLC system liquid chromatography UHPLC stack pump autosampler detector', '#5b8fd6', [90, 106], (c) => hplcStack(c));
  add('HPLC solvent bottle', CON, 'HPLC solvent bottle mobile phase reservoir tubing', '#5b8fd6', [56, LK.bottle(500).h + 22], (c) => {
    const b = LK.bottle(500, { level: 0.75, c, cap: false });
    return G(b.svg, 'translate(6 18)') + part('cap', rect(23, 15, 15, 7, 1.5, '#3c4148')) + part('tubing', stroke('M30.5 15 C30.5 4 44 2 50 10', '#8d969e', 1.2) + stroke('M30.5 22 V96', '#8d969e', 0.8, { op: 0.6 }));
  });
  add('HPLC pump', LAB, 'HPLC pump binary quaternary pump liquid chromatography', '#5b8fd6', [100, 60], (c) =>
    part('pump', box3(8, 18, 80, 34, 12, '#eef1f3') + rect(12, 22, 30, 26, 1.5, '#dfe4e8') + circ(60, 35, 8, '#c3cad1') + circ(60, 35, 3, c) + screen(16, 26, 20, 8) + dot(82, 24, 1.4, '#7fd17f')));
  add('HPLC autosampler', LAB, 'HPLC autosampler injector sample tray vials', '#5b8fd6', [100, 70], (c) =>
    part('autosampler', box3(8, 20, 80, 44, 12, '#eef1f3') + rect(12, 24, 60, 30, 1.5, '#e6f2f6', { stroke: PAL.glassLine })
      + Array.from({ length: 12 }, (_, k) => rect(16 + (k % 6) * 9, 30 + Math.floor(k / 6) * 11, 4, 8, 1, k % 3 ? '#e6f2f6' : c, { stroke: PAL.glassLine, w: 0.4 }) + rect(15.6 + (k % 6) * 9, 28.6 + Math.floor(k / 6) * 11, 4.8, 2, 0.6, '#3c4148', { w: 0 })).join('') + dot(82, 26, 1.4, '#7fd17f')));
  add('HPLC column', CON, 'HPLC column C18 chromatography column stainless steel', '#c3cad1', [110, 30], (c) =>
    part('column', rect(18, 10, 74, 10, 2, c, { stroke: '#8d969e' }) + flat('M20 11.5 H90 V13.5 H20 Z', '#ffffff', 0.5) + rect(30, 11, 30, 8, 0.6, '#ffffff', { stroke: '#9aa5ae', w: 0.4 }) + text(45, 16.8, 'C18', 4.4, '#3c4148'))
    + part('fittings', [[8, 10], [92, 10]].map(([x]) => rect(x, 9, 10, 12, 1.5, '#9aa5ae') + Array.from({ length: 3 }, (_, k) => stroke(`M${x + 2.5 + k * 2.5} 9.6 V20.4`, '#6f7a83', 0.5)).join('')).join('') + stroke('M2 15 H8 M102 15 H108', '#8d969e', 1.6)));
  add('HPLC detector', LAB, 'HPLC detector UV-Vis diode array DAD chromatography', '#5b8fd6', [100, 60], (c) =>
    part('detector', box3(8, 18, 80, 34, 12, '#eef1f3') + rect(12, 22, 34, 26, 1.5, '#dfe4e8') + screen(52, 24, 30, 16) + stroke('M55 37 h4 l2 -9 2 9 h4 l2 -5 2 5 h7', c === '#5b8fd6' ? '#9be59b' : c, 0.8) + dot(82, 46, 1.4, '#7fd17f')));
  add('Chromatogram', LAB, 'chromatogram HPLC peaks retention time absorbance trace', '#4d74c9', [110, 70], (c) =>
    part('axes', stroke('M12 6 V60 H104', '#3c4148', 1) + text(58, 68, 'Retention time', 5.5, '#3c4148'))
    + part('trace', path('M12 59 H24 C28 59 29 30 31 30 C33 30 34 59 38 59 H52 C55 59 56 14 58.5 14 C61 14 62 59 65 59 H76 C79 59 80 42 82 42 C84 42 85 59 88 59 H104', c, { fill: 'none', w: 1.4 })));
})();
