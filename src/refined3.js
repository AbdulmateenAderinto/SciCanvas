// Refined icons, part 3: lab instruments & consumables, and computational biology (drawn with src/refinedkit.js).
(() => {
  const K = globalThis.RefinedKit, LK = globalThis.LabKit;
  if (!K || !LK) return;
  const { f, PAL, line, path, rect, circ, ell, stroke, flat, dot, text, part, G, poly, smooth, speckle, glass, glint, box3, screen, button, plate, helix, wave, add } = K;
  const LAB = 'Lab instruments', CON = 'Lab consumables', CMP = 'Computational biology';
  const P = PAL.plastic, PS = PAL.plasticSide, DK = PAL.dark;

  // =====================================================================================
  // Instruments
  // =====================================================================================
  add('PCR machine', LAB, 'PCR machine thermocycler thermal cycler amplification', '#4d74c9', [100, 80], (c) =>
    part('base', path('M10 70 L20 50 H86 L94 70 Z', PS) + rect(10, 70, 84, 6, 2, '#c3cad1'))
    + part('lid', path('M18 50 L28 14 H80 L88 50 Z', P) + flat('M28 18 H78 L80 26 H27 Z', '#ffffff', 0.5))
    + part('screen', path('M32 26 H74 L78 44 H30 Z', '#dfe7f2', { stroke: '#8d969e' }) + path('M36 29 H70 L73 41 H34 Z', c, { stroke: D(c, 0.3) }) + text(53, 38.5, 'PCR', 6.5, '#ffffff', { weight: 700 })));
  add('qPCR machine', LAB, 'qPCR real-time PCR machine RT-qPCR thermocycler', '#2a2e33', [90, 100], (c) =>
    part('housing', path('M16 12 C16 8 20 6 24 6 H66 C74 6 80 12 82 20 L84 86 C84 92 80 94 74 94 H24 C18 94 14 90 14 84 Z', '#eceff2'))
    + part('front', path('M12 14 C12 10 16 8 20 8 H56 C60 8 62 10 62 14 V88 C62 92 60 94 56 94 H18 C14 94 12 92 12 88 Z', c) + flat('M14 12 H58 V20 H14 Z', '#ffffff', 0.08))
    + part('screen', rect(20, 22, 34, 26, 2, '#2b3f8f', { stroke: '#1d2333' }) + flat('M34 23 H53 V36 Z', '#ffffff', 0.12)));
  add('Centrifuge', LAB, 'centrifuge benchtop rotor spin pellet', '#4d74c9', [100, 90], (c) =>
    part('body', path('M8 52 V72 C8 80 14 84 22 84 H82 C88 84 92 80 92 74 V52 Z', '#e9ecef') + rect(14, 62, 40, 12, 2, '#3c4148') + screen(18, 65, 14, 6) + button(40, 68, 2) + button(46, 68, 2))
    + part('lid', path('M8 52 C8 40 26 32 50 32 C74 32 92 40 92 52 Z', '#f4f6f7') + path('M20 46 C26 22 44 6 70 8 C76 8 80 12 78 18 L66 40 Z', '#e1e5e9', { op: 0.95 }))
    + part('rotor', ell(50, 50, 30, 8, '#c3cad1') + ell(50, 49, 22, 5, c) + Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2; return ell(50 + Math.cos(a) * 18, 49 + Math.sin(a) * 4.2, 2.2, 1, '#e9ecef', { w: 0.4 }); }).join('')));
  add('Microcentrifuge', LAB, 'microcentrifuge mini centrifuge Eppendorf spin', '#3fa5a0', [100, 70], (c) =>
    part('body', path('M8 34 V52 C8 60 16 64 26 64 H74 C84 64 92 60 92 52 V34 Z', '#e9ecef')) + part('lid', ell(50, 34, 42, 16, '#f6f8f9') + ell(50, 34, 30, 10, L(c, 0.55), { op: 0.8 }) + ell(50, 34, 8, 3, c))
    + part('panel', screen(36, 50, 16, 6) + button(60, 53, 2.2)));
  add('Incubated shaker', LAB, 'incubated shaker incubator shaking flasks orbital', '#9fcbea', [90, 100], (c) =>
    part('cabinet', box3(12, 14, 62, 80, 14, '#eef1f3')) + part('window', rect(18, 20, 50, 46, 2, '#e6f2f6', { stroke: '#a9b6bf' }) + stroke('M22 24 L36 60', '#ffffff', 2, { op: 0.8 }))
    + part('flasks', [26, 43, 60].map((x) => path(`M${x - 2} 30 h4 v8 l7 18 h-18 l7 -18 Z`, '#f6fafb', { stroke: PAL.glassLine }) + path(`M${x - 8} 50 h16 l2 6 h-20 Z`, c)).join('') + rect(20, 56, 46, 3, 1, '#c3cad1'))
    + part('panel', rect(18, 72, 50, 16, 2, '#dfe4e8') + screen(24, 75, 18, 8) + button(54, 79, 3, '#5b6168')));
  add('Parallel bioreactor', LAB, 'parallel bioreactor bioreactor array fermentation vessels', '#e36d6d', [100, 100], (c) =>
    part('base', box3(8, 60, 76, 30, 12, '#dfe4e8') + rect(14, 70, 18, 10, 1.5, '#3c4148'))
    + part('vessels', [[20, 34], [40, 30], [60, 34], [76, 28]].map(([x, y]) => glass(`M${x - 7} ${y} H${x + 7} V${y + 30} Q${x + 7} ${y + 34} ${x + 3} ${y + 34} H${x - 3} Q${x - 7} ${y + 34} ${x - 7} ${y + 30} Z`) + path(`M${x - 6.4} ${y + 14} H${x + 6.4} V${y + 30} Q${x + 6.4} ${y + 33} ${x + 3} ${y + 33} H${x - 3} Q${x - 6.4} ${y + 33} ${x - 6.4} ${y + 30} Z`, c, { op: 0.85 }) + rect(x - 8, y - 6, 16, 6, 1.5, '#9aa5ae') + stroke(`M${x - 3} ${y - 6} V${y - 14} M${x + 3} ${y - 6} V${y - 12}`, '#8d969e', 1.2)).join('')));
  add('Bioreactor tank', LAB, 'bioreactor tank fermenter stirred tank culture', '#f2c94c', [70, 110], (c) =>
    part('top', rect(14, 18, 42, 8, 2, '#c3cad1') + stroke('M24 18 V6 M35 18 V2 M46 18 V8', '#8d969e', 1.6) + rect(32, 0, 6, 4, 1, '#5b6168'))
    + part('vessel', glass('M16 26 H54 V94 Q54 104 44 104 H26 Q16 104 16 94 Z')) + part('culture', path('M16.6 52 H53.4 V94 Q53.4 103 44 103 H26 Q16.6 103 16.6 94 Z', c, { op: 0.85 }))
    + part('impeller', stroke('M35 18 V90', '#5b6168', 1.4) + path('M26 74 H44 V78 H26 Z M26 88 H44 V92 H26 Z', '#5b6168')) + part('jacket', rect(12, 40, 46, 4, 1, '#9aa5ae') + rect(12, 96, 46, 4, 1, '#9aa5ae')) + part('glint', glint(20, 30, 90, 2)));
  add('Mass spectrometer', LAB, 'mass spectrometry LC-MS proteomics metabolomics instrument spectrum', '#4d74c9', [110, 90], (c) =>
    part('instrument', box3(6, 20, 54, 56, 12, '#e9ecef') + rect(12, 28, 18, 12, 2, '#dfe4e8') + circ(21, 34, 4, '#c3cad1') + rect(38, 28, 16, 40, 2, '#dfe4e8') + rect(12, 46, 20, 24, 2, '#d0d6db'))
    + part('laptop', path('M62 46 H102 V74 H62 Z', '#3c4148') + rect(65, 49, 34, 22, 1, '#f7f9fb', { w: 0.6 }) + path('M56 74 H108 L104 80 H60 Z', '#5b6168')
      + stroke('M67 68 H97 M70 68 V62 M74 68 V54 M78 68 V64 M84 68 V58 M90 68 V66 M94 68 V63', c, 1)));
  add('Flow cytometer', LAB, 'flow cytometer FACS cytometry analyser sorter BD FACSLyric FACSCanto', '#3f73c4', [100, 86], (c) =>
    part('cabinet', box3(12, 20, 52, 58, 16, '#e9ecef') + rect(16, 24, 44, 14, 1.5, '#c3cad1') + rect(16, 42, 44, 32, 1.5, '#dfe4e8') + Array.from({ length: 8 }, (_, k) => stroke(`M20 ${46 + k * 2} h18`, '#9aa5ae', 0.6)).join(''))
    + part('loader', box3(66, 54, 24, 24, 10, '#dfe4e8') + path('M68 54 L73.5 49.5 H94.5 L90 54 Z', c) + rect(68, 60, 20, 10, 1.5, c, { op: 0.9 }))
    + part('tray', [72, 77, 82].map((x) => rect(x, 46, 3.4, 6, 1, '#9fd1ec', { w: 0.5 })).join('')));
  add('Confocal microscope', LAB, 'confocal microscope fluorescence imaging laser scanning', '#3c4148', [100, 100], (c) =>
    part('stand', path('M14 90 H86 V96 H14 Z', '#5b6168') + rect(60, 20, 14, 70, 3, '#e9ecef') + path('M24 60 H72 V68 H24 Z', '#c3cad1'))
    + part('head', rect(20, 14, 54, 16, 3, c) + rect(30, 30, 10, 14, 2, '#5b6168') + rect(32, 44, 6, 8, 1, '#8d969e') + rect(76, 10, 18, 22, 3, '#e9ecef') + circ(85, 21, 4, '#e36d6d'))
    + part('eyepieces', path('M42 14 L36 4 H44 L48 14 Z', '#5b6168') + path('M50 14 L48 4 H56 L56 14 Z', '#5b6168')) + part('stage', rect(22, 56, 40, 4, 1, '#3c4148') + rect(36, 52, 12, 4, 1, '#e6f2f6')));
  add('Inverted microscope', LAB, 'inverted microscope cell culture brightfield phase contrast', '#e9ecef', [100, 100], (c) =>
    part('base', path('M10 88 H84 Q88 88 88 92 V96 H10 Z', '#c3cad1') + rect(64, 20, 16, 70, 3, c) + path('M22 70 H72 V80 H22 Z', '#dfe4e8'))
    + part('arm', path('M30 10 H80 V22 H44 L38 36 H30 Z', c) + rect(30, 36, 8, 10, 1.5, '#5b6168') + circ(34, 50, 3, '#ffd85e', { op: 0.9 }))
    + part('stage', rect(18, 54, 50, 5, 1.5, '#3c4148') + ell(36, 53, 8, 2.2, '#e6f2f6')) + part('objectives', rect(32, 60, 5, 8, 1, '#8d969e') + rect(40, 60, 5, 7, 1, '#8d969e'))
    + part('eyepieces', path('M80 14 L94 6 L96 10 L84 18 Z', '#5b6168')) + part('knob', circ(72, 78, 5, '#8d969e')));
  add('Biosafety cabinet', LAB, 'biosafety cabinet laminar flow hood tissue culture hood BSC', '#e9ecef', [100, 100], (c) =>
    part('cabinet', box3(6, 12, 80, 82, 10, c)) + part('sash', rect(14, 24, 64, 36, 2, '#e6f2f6', { stroke: '#a9b6bf', op: 0.85 }) + stroke('M20 28 L32 56', '#ffffff', 2.4, { op: 0.8 }))
    + part('work area', rect(14, 60, 64, 14, 1, '#dfe4e8') + rect(14, 74, 64, 3, 1, '#9aa5ae')) + part('panel', rect(14, 15, 64, 6, 1, '#5b6168') + dot(20, 18, 1.2, '#7fd17f'))
    + part('stand', rect(14, 80, 6, 14, 1, '#9aa5ae') + rect(72, 80, 6, 14, 1, '#9aa5ae')));
  add('CO₂ incubator', LAB, 'CO2 incubator cell culture incubator 37 degrees', '#e9ecef', [80, 100], (c) =>
    part('cabinet', box3(8, 12, 56, 84, 10, c)) + part('door', rect(12, 16, 48, 76, 2, '#f4f6f7') + rect(54, 40, 3, 20, 1.5, '#9aa5ae'))
    + part('panel', screen(18, 22, 22, 9) + text(29, 29, '37°', 6, '#ffffff') + button(48, 26, 2.2, '#7fd17f')));
  add('−80 °C freezer', LAB, 'ultra low freezer -80 minus eighty storage', '#e9ecef', [80, 116], (c) =>
    part('cabinet', box3(8, 14, 58, 96, 14, c, { side: '#d5dbe0', top: '#f7f8f9' }))
    + part('door', rect(11, 17, 52, 76, 1.5, '#f6f7f8') + flat('M13 19 H61 V21 H13 Z', '#ffffff', 0.7) + rect(54, 40, 4, 30, 2, '#5b6168') + rect(55, 42, 2, 26, 1, '#7c848c', { w: 0 }))
    + part('panel', rect(15, 22, 26, 13, 1.5, '#3c4148') + screen(17, 24, 15, 9) + text(24.5, 30.6, '-80', 5, '#9be59b') + button(36.5, 26, 1.4, '#7fd17f') + button(36.5, 31, 1.4, '#e36d6d'))
    + part('base', rect(11, 95, 52, 12, 1.2, '#5b6168') + Array.from({ length: 6 }, (_, k) => stroke(`M14 ${97.5 + k * 1.6} h46`, '#3c4148', 0.6)).join('') + rect(10, 107, 6, 3, 1, '#3c4148') + rect(58, 107, 6, 3, 1, '#3c4148')));
  add('Plate reader', LAB, 'microplate reader spectrophotometer absorbance fluorescence ELISA', '#4d74c9', [100, 70], (c) =>
    part('instrument', box3(8, 18, 80, 44, 12, '#e9ecef') + rect(14, 24, 40, 14, 2, '#dfe4e8') + screen(62, 24, 20, 12) + stroke('M65 33 l4 -4 3 2 5 -6 3 3', '#9be59b', 0.9))
    + part('drawer', path('M14 50 H54 L58 56 H10 Z', '#c3cad1') + plate(16, 44, 34, 8, 2, 8, { well: c, fill: 0.3 })));
  add('NanoDrop spectrophotometer', LAB, 'NanoDrop microvolume spectrophotometer DNA quantification A260', '#5b8fd6', [100, 70], (c) =>
    part('base', path('M8 40 C8 32 14 28 22 28 H78 C86 28 92 32 92 40 V52 C92 58 88 62 80 62 H20 C12 62 8 58 8 52 Z', '#e9ecef') + circ(40, 40, 4, '#c3cad1') + dot(40, 40, 1.4, c))
    + part('arm', path('M20 26 C20 14 32 10 44 14 L52 18 C56 20 54 26 50 26 Z', '#c3cad1')) + part('screen', screen(62, 34, 22, 14) + text(73, 43, 'A260', 5, '#ffffff')));
  add('Gel electrophoresis', LAB, 'gel electrophoresis agarose gel tank power supply DNA bands', '#5b8fd6', [110, 70], (c) =>
    part('tank', path('M6 44 L24 22 H84 L66 44 Z', '#cfe3ef', { stroke: '#8fa9b8' }) + path('M6 44 H66 V54 H6 Z', '#b6d3e3', { stroke: '#8fa9b8' }) + path('M66 44 L84 22 V32 L66 54 Z', '#a6c6d8', { stroke: '#8fa9b8' }))
    + part('gel', path('M18 40 L30 26 H72 L60 40 Z', '#e6f2f6', { stroke: '#9fb7c2' }) + [0, 1, 2, 3, 4].map((k) => stroke(`M${30 + k * 7} 29 l2.4 0 M${27 + k * 7} 33 l2.4 0 M${24 + k * 7} 37 l2.4 0`, c, 1.4)).join(''))
    + part('leads', stroke('M8 46 C0 56 2 64 14 66 H92', '#d9363e', 1.6) + stroke('M80 30 C90 32 94 40 94 50', '#3c4148', 1.6))
    + part('power supply', box3(86, 48, 20, 16, 4, '#dfe4e8') + screen(89, 51, 14, 6)));
  add('Western blot transfer', LAB, 'western blot transfer membrane sandwich immunoblot', '#7a5cc6', [100, 70], (c) =>
    part('stack', [['#4f5a66', 54], ['#e6e9ec', 48], ['#f2f4f6', 42], [c, 36], ['#f2f4f6', 30], ['#e6e9ec', 24], ['#4f5a66', 18]].map(([cc, y]) => path(`M10 ${y} L30 ${y - 10} H92 L72 ${y} Z`, cc)).join(''))
    + part('bands', [0, 1, 2, 3].map((k) => stroke(`M${38 + k * 10} 31 l6 0`, '#ffffff', 1.2, { op: 0.9 })).join('')));
  add('Liquid handling robot', LAB, 'liquid handling robot automation pipetting robot high-throughput', '#e9ecef', [120, 90], (c) =>
    part('frame', path('M4 76 L18 70 H116 L104 80 H4 Z', '#3c4148') + rect(10, 18, 10, 56, 2, '#dfe4e8') + rect(10, 14, 36, 8, 2, '#e9ecef') + rect(36, 22, 10, 10, 1.5, '#9aa5ae') + stroke('M38 32 v6 M42 32 v6', '#5b6168', 1.2))
    + part('deck', plate(24, 58, 22, 10, 2, 6, { well: '#9bd8c2', fill: 0.3 }) + plate(52, 58, 22, 10, 2, 6, { well: '#e98bb0', fill: 0.3 }))
    + part('stacker', box3(78, 18, 30, 54, 8, c) + [0, 1, 2, 3, 4].map((k) => rect(82, 24 + k * 9, 22, 6, 1, '#3c4148')).join('')));
  add('Vortex mixer', LAB, 'vortex mixer vortexer shaker tube mixing', '#5b8fd6', [70, 90], (c) =>
    part('base', path('M10 84 L16 50 H54 L60 84 Z', '#e9ecef') + rect(8, 84, 54, 4, 2, '#9aa5ae') + circ(35, 68, 4, c)) + part('cup', ell(35, 50, 12, 4, '#3c4148'))
    + part('tube', path('M30 10 H40 V40 L36 48 H34 L30 40 Z', '#eef4f7', { stroke: PAL.glassLine }) + path('M30.6 26 H39.4 V40 L36 47 H34 L30.6 40 Z', c, { op: 0.8 })));
  add('Water bath', LAB, 'water bath heating incubation', '#9fcbea', [100, 70], (c) =>
    part('bath', box3(8, 22, 78, 40, 10, '#e9ecef') + path('M14 22 L18 16 H86 L82 22 Z', c, { op: 0.8 }) + rect(14, 44, 18, 8, 1.5, '#3c4148'))
    + part('tubes', [30, 40, 50, 60, 70].map((x) => rect(x, 6, 5, 14, 2, '#f6fafb', { stroke: PAL.glassLine })).join('')));
  add('Magnetic stirrer', LAB, 'magnetic stirrer hotplate stir bar beaker', '#9fd1ec', [96, 92], (c) =>
    part('body', path('M6 62 L18 46 H90 L84 62 Z', '#f4f6f7') + path('M6 62 H84 V80 Q84 84 80 84 H10 Q6 84 6 80 Z', '#e9ecef') + path('M84 62 L90 46 V64 L84 80 Z', '#d5dbe0'))
    + part('panel', path('M10 64.5 H58 V80 H10 Z', '#2b4a8f', { stroke: '#1d2f5c' }) + circ(22, 72, 4.6, '#2a2e33') + circ(22, 72, 1.4, '#5b6168', { w: 0 }) + circ(42, 72, 4.6, '#2a2e33') + circ(42, 72, 1.4, '#5b6168', { w: 0 }) + rect(68, 70, 6, 4, 1, '#3c4148'))
    + part('plate', path('M22 56 L28 48 H76 L70 56 Z', '#ffffff', { stroke: '#a9b6bf' }) + path('M22 56 H70 V58.5 H22 Z', '#dfe4e8', { stroke: '#a9b6bf', w: 0.8 }))
    + part('beaker', G(LK.beaker({ x: 0, y: 0, w: 28, h: 34, level: 0.8, c }), 'translate(35 18)') + rect(44, 47, 10, 2.6, 1.3, '#ffffff', { stroke: '#9aa5ae', w: 0.6 })
      + stroke('M41 26 q8 3 16 0 M44 29 q5 6 10 0 M47 32 q2 8 4 0', '#ffffff', 0.9, { op: 0.8 })));
  add('Analytical balance', LAB, 'analytical balance scale weighing', '#e9ecef', [90, 90], (c) =>
    part('base', box3(8, 64, 70, 20, 10, c) + screen(16, 70, 22, 8) + text(27, 76, '0.000', 4.8, '#ffffff'))
    + part('draft shield', glass('M18 14 H70 V62 H18 Z', { op: 0.55 }) + path('M18 14 L23 8 H75 L70 14 Z', '#e6f2f6', { stroke: PAL.glassLine, op: 0.7 }) + glint(22, 18, 58, 2))
    + part('pan', ell(44, 58, 16, 3, '#c3cad1')));
  add('pH meter', LAB, 'pH meter electrode probe acidity', '#3fa5a0', [80, 90], (c) =>
    part('meter', box3(6, 50, 40, 32, 8, '#e9ecef') + screen(11, 56, 30, 12) + text(26, 65, '7.02', 7, '#9be59b'))
    + part('electrode', stroke('M62 10 V64', '#3c4148', 4) + path('M60 64 H64 V76 Q62 80 60 76 Z', '#e6f2f6', { stroke: PAL.glassLine }) + stroke('M62 10 C62 2 46 2 40 14 L34 50', '#5b6168', 1.2))
    + part('beaker', glass('M50 56 H74 V84 H50 Z', { op: 0.6 }) + path('M50.6 68 H73.4 V83.4 H50.6 Z', c, { op: 0.5 })));
  add('Sonicator', LAB, 'sonicator probe ultrasonic homogeniser cell lysis', '#9aa5ae', [70, 100], (c) =>
    part('generator', box3(6, 70, 40, 24, 8, '#e9ecef') + screen(10, 76, 18, 8)) + part('horn', rect(36, 4, 14, 24, 3, '#5b6168') + path('M38 28 H48 L45 44 H41 Z', c) + stroke('M43 44 V62', c, 2.4))
    + part('tube', path('M34 48 H52 V66 Q43 74 34 66 Z', '#eef4f7', { stroke: PAL.glassLine })) + part('waves', stroke('M30 58 q-4 4 0 8 M56 58 q4 4 0 8', '#5b8fd6', 1)));

  // =====================================================================================
  // Consumables
  // =====================================================================================
  add('Pipette', CON, 'pipette micropipette P200 P1000 pipettor', '#4d74c9', [50, 120], (c) =>
    G(part('plunger', rect(19, 2, 10, 8, 2, '#c3cad1') + rect(22, 10, 4, 6, 1, '#8d969e'))
      + part('handle', path('M16 16 H32 V54 Q32 60 28 62 H20 Q16 60 16 54 Z', c) + path('M30 22 C38 22 40 28 36 32 L32 34', '#eef1f3') + rect(19, 34, 10, 10, 1.5, '#dfe7f2') + text(24, 41.5, '200', 4, D(c, 0.3)))
      + part('shaft', path('M20 62 H28 L26 92 H22 Z', '#e9ecef') + rect(21, 70, 6, 2, 0.5, c))
      + part('tip', path('M22 92 H26 L24.6 116 H23.4 Z', '#f6f8f9', { stroke: PAL.glassLine })), 'rotate(18 24 60)'));
  add('Multichannel pipette', CON, 'multichannel pipette 8-channel pipettor', '#e36d6d', [70, 120], (c) =>
    part('handle', rect(28, 4, 12, 8, 2, '#c3cad1') + path('M26 12 H42 V56 Q42 62 38 62 H30 Q26 62 26 56 Z', c) + rect(29, 30, 10, 10, 1.5, '#dfe7f2'))
    + part('manifold', path('M10 62 H58 L54 74 H14 Z', '#e9ecef')) + part('tips', Array.from({ length: 8 }, (_, k) => path(`M${15 + k * 5.4} 74 h3 l-0.8 30 h-1.4 Z`, '#f6f8f9', { stroke: PAL.glassLine, w: 0.6 })).join('')));
  add('Syringe', CON, 'syringe needle injection plunger', '#9fd1ec', [60, 120], (c) =>
    G(part('plunger', rect(22, 2, 16, 4, 1.5, '#c3cad1') + rect(28, 6, 4, 30, 1, '#c3cad1') + rect(22.6, 34, 14.8, 6, 1, '#3c4148'))
      + part('barrel', glass('M22 32 H38 V88 Q38 92 34 92 H26 Q22 92 22 88 Z') + rect(18, 30, 24, 4, 1.5, '#dfe6ea', { stroke: PAL.glassLine }) + path('M22.6 40 H37.4 V88 Q37.4 91.4 34 91.4 H26 Q22.6 91.4 22.6 88 Z', c, { op: 0.75 })
        + Array.from({ length: 8 }, (_, k) => stroke(`M23 ${46 + k * 5} h${k % 2 ? 3 : 5}`, '#5b6168', 0.6)).join(''))
      + part('needle', rect(28, 92, 4, 6, 1, '#c3cad1') + stroke('M30 98 V118', '#8d969e', 1.2)), 'rotate(24 30 60)'));
  add('Eppendorf tube', CON, 'Eppendorf tube microcentrifuge tube 1.5 mL microtube', '#9fd1ec', [60, 110], (c) =>
    part('cap', path('M16 18 H44 V24 H16 Z', '#eef4f7', { stroke: PAL.glassLine }) + path('M16 18 C10 12 10 4 18 2 L22 6 C16 8 16 12 20 16 Z', '#eef4f7', { stroke: PAL.glassLine }) + rect(10, 2, 14, 6, 2, '#eef4f7', { stroke: PAL.glassLine, tf: 'rotate(-35 17 5)' }))
    + part('tube', glass('M18 24 H42 V60 L32 104 H28 L18 60 Z')) + part('liquid', path('M18.6 66 H41.4 L32 103 H28 Z', c, { op: 0.8 })) + part('marks', stroke('M36 40 h4 M36 48 h4 M36 56 h4', '#8fa9b8', 0.8)) + part('glint', glint(22, 28, 60, 1.8)));
  add('Conical tube (50 mL)', CON, 'Falcon tube 50 mL conical tube centrifuge tube', '#f2c94c', [LK.falcon(50).w, LK.falcon(50).h], (c) => LK.falcon(50, { level: 0.6, c, cap: '#3f73c4', label: ' ' }).svg);
  add('Cryovial', CON, 'cryovial cryotube freezing vial liquid nitrogen', '#e36d6d', [40, 100], (c) =>
    part('cap', rect(8, 2, 24, 18, 3, c) + Array.from({ length: 5 }, (_, k) => stroke(`M${12 + k * 4} 4 V18`, D(c, 0.2), 0.8)).join(''))
    + part('tube', glass('M10 20 H30 V90 Q30 96 24 96 H16 Q10 96 10 90 Z')) + part('liquid', path('M10.6 70 H29.4 V90 Q29.4 95 24 95 H16 Q10.6 95 10.6 90 Z', '#f3e2ef', { op: 0.9 })) + part('label', rect(12, 30, 16, 26, 1, '#ffffff', { stroke: '#c3cad1' })));
  add('Cell culture flask (T75)', CON, 'T75 T25 tissue culture flask cell culture vented cap', '#e98bb0', [LK.tflask(75).w, LK.tflask(75).h], (c) => LK.tflask(75, { medium: true, c }).svg);
  add('Tissue culture dish', CON, 'tissue culture dish 10 cm dish cell culture plate medium', '#e98bb0', [100, 60], (c) =>
    part('dish', path('M6 26 V36 C6 50 94 50 94 36 V26 Z', '#e4eef2', { stroke: PAL.glassLine, op: 0.9 }) + ell(50, 26, 44, 18, '#eef5f8', { stroke: PAL.glassLine }))
    + part('medium', ell(50, 28, 40, 15, c, { op: 0.75 })) + part('glint', stroke('M18 18 C28 12 40 10 52 10', '#ffffff', 2, { op: 0.7 })));
  const plateIcon = (n, well, o = {}) => { const pl = K.sbsPlate(n, { well, ...o }); return part('plate', pl.svg); };
  add('6-well plate', CON, '6 well plate tissue culture plate multiwell', '#e98bb0', [104, 46], (c) => plateIcon(6, c));
  add('12-well plate', CON, '12 well plate tissue culture plate multiwell editable', '#e98bb0', [104, 46], (c) => plateIcon(12, (i, j) => ((i + j) % 2 ? '#8fc5ea' : c)));
  add('24-well plate', CON, '24 well plate tissue culture plate multiwell', '#9fd1ec', [104, 46], (c) => plateIcon(24, c));
  add('48-well plate', CON, '48 well plate multiwell assay plate', '#9bd8c2', [104, 46], (c) => plateIcon(48, (i) => ['#9bd8c2', '#9fcbea', '#dcc3b8', '#d9c2ec', '#f1dfb1', '#e8a9b6'][i] || c));
  add('384-well plate', CON, '384 well plate high-throughput screening HTS microplate', '#9fcbea', [104, 46], (c) => plateIcon(384, c));
  add('PCR plate', CON, 'PCR plate 96 well skirted thermocycler plate', '#e9ecef', [110, 60], (c) => {
    let s = path('M6 40 L24 20 H104 L86 40 Z', '#f2f4f6', { stroke: '#a9b6bf' }) + path('M6 40 H86 V48 H6 Z', '#dfe4e8', { stroke: '#a9b6bf' }) + path('M86 40 L104 20 V28 L86 48 Z', '#cfd5da', { stroke: '#a9b6bf' });
    for (let i = 0; i < 8; i++) for (let j = 0; j < 12; j++) { const x = 13 + j * 6 + (7 - i) * 2.2, y = 37 - i * 2.4; s += ell(x, y, 2.2, 1, c === '#e9ecef' ? '#ffffff' : c, { stroke: '#a9b6bf', w: 0.4 }); }
    return part('plate', s);
  });
  add('PCR tube strip', CON, 'PCR tubes 8-strip 0.2 mL tube strip', '#9fd1ec', [110, 60], (c) =>
    part('strip', Array.from({ length: 8 }, (_, k) => { const x = 8 + k * 12.4; return glass(`M${x} 14 H${x + 9} V30 L${x + 5.4} 50 H${x + 3.6} L${x} 30 Z`) + path(`M${x + 0.5} 32 H${x + 8.5} L${x + 5.2} 49 H${x + 3.8} Z`, c, { op: 0.8 }) + rect(x - 1, 8, 11, 6, 1.5, '#eef4f7', { stroke: PAL.glassLine }); }).join('') + rect(7, 12, 99, 2, 1, '#dfe6ea', { stroke: PAL.glassLine, w: 0.6 })));
  add('Serological pipette', CON, 'serological pipette stripette 10 mL', '#e36d6d', [120, 30], (c) =>
    part('pipette', path('M4 15 L12 12 H112 Q116 12 116 15 Q116 18 112 18 H12 Z', '#eef4f7', { stroke: PAL.glassLine }) + rect(98, 11, 10, 8, 1, c) + Array.from({ length: 16 }, (_, k) => stroke(`M${20 + k * 5} 12 v${k % 2 ? 2 : 3.5}`, '#5b6168', 0.6)).join('')));
  add('Pipette tip box', CON, 'pipette tip box tip rack filtered tips', '#4d74c9', [100, 80], (c) => {
    let tips = '';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) tips += ell(22 + j * 6.4 - i * 2.4, 24 + i * 4, 2.2, 1.1, L(c, 0.45), { stroke: c, w: 0.5 });
    return part('box', path('M8 42 L20 18 H84 L72 42 Z', L(c, 0.65), { stroke: c }) + path('M8 42 H72 V70 H8 Z', c, { op: 0.9 }) + path('M72 42 L84 18 V46 L72 70 Z', D(c, 0.12), { op: 0.9 })) + part('tips', tips);
  });
  add('Beaker', CON, 'beaker glassware graduated', '#9fd1ec', [58, 70], (c) => LK.beaker({ level: 0.55, c }));
  add('Erlenmeyer flask', CON, 'Erlenmeyer flask conical flask glassware', '#9bd8c2', [60, 82], (c) => LK.erlenmeyer({ cx: 30, y: 6, s: 0.48, level: 0.4, c }));
  add('Round-bottom flask', CON, 'round bottom flask chemistry glassware boiling', '#f2c94c', [60, 88], (c) => LK.roundBottom({ cx: 30, R: 24, y: 4, level: 0.4, c }).svg);
  add('Graduated cylinder', CON, 'graduated cylinder measuring cylinder glassware', '#9fcbea', [50, 120], (c) =>
    part('cylinder', glass('M14 8 H36 V108 H14 Z') + path('M14 8 L10 4 H18 Z', '#e6f2f6', { stroke: PAL.glassLine }) + path('M6 108 H44 V116 H6 Z', '#dfe6ea', { stroke: PAL.glassLine }))
    + part('liquid', path('M14.6 54 H35.4 V107.4 H14.6 Z', c, { op: 0.75 })) + part('marks', Array.from({ length: 10 }, (_, k) => stroke(`M26 ${16 + k * 9} h${k % 2 ? 6 : 10}`, '#8fa9b8', 0.8)).join('')) + part('glint', glint(18, 12, 104, 2)));
  add('Test tube rack', CON, 'test tube rack tubes holder', '#3fa5a0', [110, 80], (c) =>
    part('tubes', [16, 32, 48, 64, 80].map((x, i) => glass(`M${x} 6 H${x + 10} V60 Q${x + 10} 66 ${x + 5} 66 Q${x} 66 ${x} 60 Z`) + path(`M${x + 0.6} ${30 + i * 3} H${x + 9.4} V60 Q${x + 9.4} 65 ${x + 5} 65 Q${x + 0.6} 65 ${x + 0.6} 60 Z`, [c, '#e36d6d', '#f2c94c', '#9a79c9', '#6bb36b'][i], { op: 0.8 })).join(''))
    + part('rack', rect(6, 30, 98, 8, 2, '#e9ecef') + rect(6, 64, 98, 8, 2, '#dfe4e8') + rect(8, 38, 4, 26, 1, '#c3cad1') + rect(98, 38, 4, 26, 1, '#c3cad1')));
  add('Ice bucket', CON, 'ice bucket ice box samples on ice', '#5b8fd6', [100, 80], (c) =>
    part('bucket', path('M8 26 H92 L84 74 Q83 78 78 78 H22 Q17 78 16 74 Z', c) + ell(50, 26, 42, 10, L(c, 0.2)))
    + part('ice', ell(50, 26, 38, 8, '#f3f8fc', { stroke: '#b9d3e6' }) + [[34, 24], [48, 22], [62, 25], [42, 28], [56, 29]].map(([x, y]) => rect(x - 4, y - 3, 8, 6, 1.5, '#ffffff', { stroke: '#b9d3e6', w: 0.6 })).join(''))
    + part('tubes', [38, 50, 62].map((x) => path(`M${x - 3} 6 h6 v14 l-3 6 l-3 -6 Z`, '#eef4f7', { stroke: PAL.glassLine })).join('')));
  add('Nitrile gloves', CON, 'gloves nitrile PPE lab safety hand', '#7f8fe0', [80, 100], (c) =>
    part('glove', path('M24 96 V60 C18 54 10 46 8 40 C6 34 12 32 16 36 L24 46 V16 C24 10 32 10 32 16 V40 V10 C32 4 40 4 40 10 V40 V12 C40 6 48 6 48 12 V40 V18 C48 12 56 12 56 18 V62 C56 70 54 76 52 80 V96 Z', c) + flat('M27 46 V18 C27 14 30 14 30 18 V44 Z', '#ffffff', 0.25)));
  add('Lab coat', CON, 'lab coat PPE laboratory safety', '#f4f6f8', [90, 100], () =>
    part('coat', path('M30 6 L18 12 L6 50 L14 54 L20 38 V96 H70 V38 L76 54 L84 50 L72 12 L60 6 L45 34 Z', '#f4f6f8', { stroke: '#a9b6bf' }) + stroke('M45 34 V96', '#a9b6bf', 1) + path('M30 6 L45 34 L38 40 L26 14 Z M60 6 L45 34 L52 40 L64 14 Z', '#e6eaee', { stroke: '#a9b6bf' }) + rect(52, 56, 12, 10, 1, '#eef1f3', { stroke: '#a9b6bf' }) + dot(41, 50, 1.2, '#a9b6bf') + dot(41, 64, 1.2, '#a9b6bf') + dot(41, 78, 1.2, '#a9b6bf')));

  // =====================================================================================
  // Computational biology
  // =====================================================================================
  const monitor = (x, y, w, h, inner) => rect(x, y, w, h, 2, '#3c4148') + rect(x + 2.5, y + 2.5, w - 5, h - 5, 1, '#ffffff', { stroke: 'none', w: 0 }) + inner + path(`M${x + w / 2 - 4} ${y + h} H${x + w / 2 + 4} L${x + w / 2 + 6} ${y + h + 10} H${x + w / 2 - 6} Z`, '#4a5058') + path(`M${x + w / 2 - 14} ${y + h + 10} H${x + w / 2 + 14} L${x + w / 2 + 16} ${y + h + 13} H${x + w / 2 - 16} Z`, '#5b6168');
  add('Computer', CMP, 'computer desktop PC workstation tower monitor', '#3c4148', [110, 90], () =>
    part('tower', rect(6, 14, 24, 68, 2, '#d6dce1') + rect(10, 20, 16, 4, 1, '#9aa5ae') + rect(10, 28, 16, 2, 1, '#9aa5ae') + circ(18, 70, 2.4, '#9aa5ae'))
    + part('monitor', monitor(36, 18, 66, 46, flat('M40 22 H98 V36 Z', '#e8eef5', 0.8))));
  add('Laptop', CMP, 'laptop computer analysis notebook', '#3c4148', [110, 80], (c) =>
    part('screen', rect(22, 8, 66, 46, 3, c) + rect(25, 11, 60, 40, 1, '#f5f8fb', { w: 0.6 }) + stroke('M30 44 L40 34 L48 38 L58 24 L66 30 L80 18', '#4d74c9', 1.4)) + part('base', path('M14 54 H96 L104 64 Q104 68 100 68 H10 Q6 68 6 64 Z', '#c3cad1') + rect(46, 56, 18, 3, 1.5, '#9aa5ae')));
  add('Monitor with flasks', CMP, 'monitor screen experimental design reaction conditions flasks', '#3c4148', [110, 100], () =>
    part('monitor', monitor(8, 6, 94, 66, [[26, 30, '#5fb3b3'], [55, 30, '#5b8fd6'], [84, 30, '#d4a59a'], [26, 56, '#8b5cc6'], [55, 56, '#f2c94c'], [84, 56, '#e36d6d']].map(([x, y, cc]) => path(`M${x - 2.5} ${y - 14} h5 v5 l6 9 q1 3 -2 3 h-13 q-3 0 -2 -3 l6 -9 Z`, '#ffffff', { stroke: line(cc), w: 1 }) + path(`M${x - 6.5} ${y - 4} h13 l1.6 2.6 q1 2.4 -2 2.4 h-12.2 q-3 0 -2 -2.4 Z`, cc) + dot(x - 1, y - 18, 0.9, cc) + dot(x + 1, y - 20, 0.9, cc)).join(''))));
  add('Network analysis on monitor', CMP, 'network graph AI analysis optimisation nodes monitor', '#3c4148', [110, 100], () => {
    const N = [[55, 38], [40, 46], [30, 52], [36, 24], [50, 20], [68, 28], [80, 36], [52, 60]];
    const E = [[0, 1], [1, 2], [1, 3], [0, 4], [0, 5], [5, 6], [0, 7]];
    return part('monitor', monitor(8, 6, 94, 66, E.map(([a, b]) => stroke(`M${N[a][0]} ${N[a][1]} L${N[b][0]} ${N[b][1]}`, '#2a2e33', 1)).join('') + N.map(([x, y], i) => circ(x, y, 4, i ? '#d9d1f0' : '#f2b6b6', { stroke: i ? '#5a4aa0' : '#b33a3a', w: 1 })).join('')));
  });
  add('Illumina MiSeq', CMP, 'Illumina MiSeq sequencer benchtop next-generation sequencing NGS', '#2a2e33', [100, 80], () =>
    part('body', box3(10, 26, 48, 46, 10, '#e9ecef') + rect(14, 34, 40, 30, 2, '#dfe4e8')) + part('lid', path('M56 26 L62 22 H90 V72 H56 Z', '#2a2e33') + rect(60, 14, 30, 12, 1.5, '#3c4148', { tf: 'rotate(-6 75 20)' }) + screen(63, 16, 24, 8)));
  add('Illumina HiSeq', CMP, 'Illumina HiSeq NovaSeq high-throughput sequencer NGS', '#2a2e33', [90, 100], () =>
    part('body', box3(10, 30, 60, 64, 12, '#eceff2') + rect(14, 40, 26, 46, 2, '#dfe4e8') + rect(44, 40, 22, 46, 2, '#3c4148') + rect(46, 44, 18, 4, 1, '#5b6168'))
    + part('screen', rect(20, 6, 34, 20, 2, '#3c4148') + screen(22, 8, 30, 16) + stroke('M37 26 V30', '#5b6168', 2)));
  add('Microarray', CMP, 'microarray DNA chip gene expression array glass slide', '#e36d6d', [100, 60], () => {
    let s = '';
    const cols = ['#e36d6d', '#6bb36b', '#f2c94c', '#5b8fd6', '#b568b8'];
    for (let k = 0; k < 9; k++) s += wave(30 + k * 6, 30, 34 + k * 6, 6, 1.2, 1.5, cols[k % 5], 1.2);
    return part('slide', path('M6 44 L30 30 H94 L70 44 Z', '#f2f4f6', { stroke: '#a9b6bf' }) + path('M6 44 H70 V48 H6 Z', '#dfe4e8', { stroke: '#a9b6bf' })) + part('probes', s);
  });
  add('Nanopore sequencer', CMP, 'nanopore sequencing Oxford Nanopore flow cell long read', '#8d969e', [110, 60], () =>
    part('device', path('M10 30 L30 18 H74 L54 30 Z', '#eef1f3', { stroke: '#8d969e' }) + path('M10 30 H54 V44 H10 Z', '#dfe4e8', { stroke: '#8d969e' }) + path('M54 30 L74 18 V32 L54 44 Z', '#c3cad1', { stroke: '#8d969e' }) + ell(42, 24, 8, 2.6, '#9aa5ae'))
    + part('cable', stroke('M74 26 C86 26 92 18 106 14', '#9aa5ae', 3)));
  add('MinION', CMP, 'MinION nanopore portable sequencer USB', '#3fa5a0', [100, 70], () =>
    part('device', path('M8 40 L40 18 H92 L60 40 Z', '#3c4148') + path('M8 40 H60 V50 H8 Z', '#2a2e33') + path('M60 40 L92 18 V28 L60 50 Z', '#4a5058') + path('M20 36 L44 22 H80 L56 36 Z', '#3fa5a0') + flat('M30 33 L48 24 H64 L46 33 Z', '#ffffff', 0.25)));
  add('Genome sequencing trace', CMP, 'genome sequencing chromatogram coverage peaks read depth', '#c94a4a', [110, 60], (c) => {
    const pts = [[4, 54]];
    for (let x = 6; x <= 106; x += 2) pts.push([x, 54 - (Math.exp(-((x - 24) ** 2) / 8) * 44 + Math.exp(-((x - 42) ** 2) / 14) * 30 + Math.exp(-((x - 60) ** 2) / 10) * 20 + Math.exp(-((x - 78) ** 2) / 30) * 12 + Math.abs(Math.sin(x * 1.7)) * 3)]);
    pts.push([106, 54]);
    return part('trace', path(poly(pts), c, { op: 0.9 })) + part('axis', stroke('M4 54.5 H106', '#5b6168', 1));
  });
  add('DNA with primer', CMP, 'DNA primer annealing template PCR sequencing ladder', '#2e5ea3', [100, 40], (c) =>
    part('template', stroke('M6 28 H94', c, 2.4) + Array.from({ length: 12 }, (_, k) => stroke(`M${14 + k * 6} 28 V18`, c, 1.4)).join('')) + part('primer', stroke('M12 17 H86', c, 2.4)));
  add('RNA strand', CMP, 'RNA mRNA single strand transcript', '#b568b8', [100, 70], (c) =>
    part('rna', wave(8, 16, 92, 12, 4, 2.2, c, 2.4) + wave(8, 36, 92, 32, 4, 2.2, c, 2.4) + wave(8, 56, 92, 52, 4, 2.2, c, 2.4)));
  add('Nucleosome', CMP, 'nucleosome histone octamer chromatin DNA wrap', '#e36d6d', [110, 60], () =>
    part('dna', stroke('M4 46 H40 M70 46 H106', '#2a2e33', 1.6) + stroke('M40 46 C30 30 50 12 62 18 C76 26 72 44 70 46', '#2a2e33', 1.6))
    + part('histones', [['#5b8fd6', 48, 32], ['#6bb36b', 58, 28], ['#f2c94c', 62, 38], ['#e98bb0', 52, 40]].map(([cc, x, y]) => ell(x, y, 8, 10, cc, { rot: 20 })).join('')));
  add('Nucleosome (3D)', CMP, 'nucleosome 3D histone octamer structure chromatin', '#5a4aa0', [110, 70], (c, r) =>
    part('dna', helix(4, 106, 52, 4, 6, '#3fa5a0', '#5b8fd6', { w: 1.6, rungs: false }))
    + part('octamer', [[44, 30, '#7c6fc9'], [58, 26, '#5fb3b3'], [70, 32, '#9a79c9'], [52, 40, '#6b8fd6'], [64, 42, '#3fa5a0']].map(([x, y, cc]) => K.body(K.wob(x, y, 11, 10, r, { amp: 0.1 }), cc, { hi: 0.2 })).join(''))
    + part('wrap', stroke('M34 46 C30 30 44 14 60 14 C76 14 84 30 78 44', '#3fa5a0', 2.6) + stroke('M36 50 C38 36 50 22 64 22 C78 24 82 38 76 50', '#5b8fd6', 2.6)));
  add('Deep learning neural network', CMP, 'deep learning neural network AI machine learning layers', '#e36d6d', [110, 90], () => {
    const L1 = [10, 22, 34, 46, 58, 70, 82], layers = [[10, L1, '#e98bb0'], [34, [16, 28, 40, 52, 64, 76], '#9aa5ae'], [58, [16, 28, 40, 52, 64, 76], '#9aa5ae'], [82, [28, 40, 52, 64], '#9aa5ae'], [102, [34, 46, 58], '#3fa5a0']];
    let e = '';
    for (let i = 0; i < layers.length - 1; i++) for (const y1 of layers[i][1]) for (const y2 of layers[i + 1][1]) e += stroke(`M${layers[i][0]} ${y1} L${layers[i + 1][0]} ${y2}`, '#c3cad1', 0.4);
    return part('connections', e) + part('neurons', layers.map(([x, ys, cc]) => ys.map((y) => circ(x, y, 3.4, cc, { w: 0.6 })).join('')).join(''));
  });
  add('Bar graph', CMP, 'bar graph bar chart grouped error bars data', '#7a5cc6', [100, 80], (c) => {
    const g = [[18, [40, 26, 46]], [44, [30, 50, 22]], [70, [52, 34, 28]]], cols = [L(c, 0.45), c, '#4d74c9'];
    return part('axes', stroke('M10 8 V70 H96', '#5b6168', 1)) + part('bars', g.map(([x, hs]) => hs.map((h, i) => rect(x + i * 7, 70 - h, 6, h, 0.5, cols[i], { w: 0.5 }) + stroke(`M${x + i * 7 + 3} ${70 - h - 5} v5 M${x + i * 7 + 1.5} ${70 - h - 5} h3`, '#2a2e33', 0.6)).join('')).join(''));
  });
  add('Heat map', CMP, 'heat map heatmap gene expression clustering dendrogram', '#d64545', [100, 90], (c, r) => {
    const ramp = ['#2e7d32', '#7cb342', '#d4e157', '#fff176', '#ffb74d', '#ef6c00', c];
    let s = '';
    for (let i = 0; i < 10; i++) for (let j = 0; j < 8; j++) s += `<rect x="${18 + j * 9}" y="${16 + i * 7}" width="9" height="7" fill="${ramp[Math.floor(r() * ramp.length)]}"/>`;
    return part('dendrogram', stroke('M16 19 H10 V26 H16 M10 22.5 H6 V40 H10 M16 33 H10 V47 H16 M16 54 H8 V68 H16 M6 40 H2 V61 H8', '#5b6168', 0.6) + stroke('M22 14 V10 H31 V14 M26 10 V6 H44 V10 M40 10 V14 M49 14 V8 H76 V14 M62 8 V4', '#5b6168', 0.6)) + part('cells', s);
  });
  add('Volcano plot', CMP, 'volcano plot differential expression fold change p-value', '#d64545', [100, 90], (c, r) => {
    let s = '';
    for (let k = 0; k < 140; k++) { const x = (r() - 0.5) * 2, y = Math.abs(x) ** 1.6 * 60 + r() * 14; const up = x > 0.35 && y > 18, dn = x < -0.35 && y > 18; s += dot(54 + x * 40, 78 - y, 1.3, up ? c : dn ? '#4d74c9' : '#b7bfc6', 0.85); }
    return part('axes', stroke('M10 6 V80 H96', '#5b6168', 1) + stroke('M40 80 V8 M68 80 V8 M10 60 H96', '#9aa5ae', 0.6, { dash: '2 2' })) + part('points', s);
  });
  add('Scatter plot', CMP, 'scatter plot dot plot data points jitter', '#d4789c', [100, 90], (c, r) => {
    let s = '';
    for (let k = 0; k < 90; k++) { const g = k % 3, x = 30 + g * 26 + (r() - 0.5) * 14, y = 76 - (r() ** (g + 1)) * 60; s += circ(x, y, 1.6, c, { w: 0.4, op: 0.85 }); }
    return part('axes', stroke('M12 6 V80 H96', '#5b6168', 1)) + part('points', s);
  });
  add('t-SNE plot', CMP, 't-SNE UMAP single-cell clusters dimensionality reduction scRNA-seq', '#4d74c9', [100, 100], (c, r) => {
    const cl = [[28, 26, '#3fa5a0'], [62, 24, '#9a79c9'], [50, 52, c], [26, 60, '#9fcbea'], [52, 82, '#f2c94c'], [78, 56, '#e36d6d'], [80, 30, '#d4579f'], [74, 78, '#a0614d']];
    let s = '';
    for (const [x, y, cc] of cl) for (let k = 0; k < 34; k++) { const a = r() * 6.3, d = Math.sqrt(r()) * (cc === c ? 15 : 10); s += dot(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.9, 1.3, cc); }
    return part('axes', stroke('M6 4 V96 H98', '#5b6168', 0.8)) + part('clusters', s);
  });
  add('Phylogenetic tree', CMP, 'phylogenetic tree evolution cladogram dendrogram lineage', '#3fa5a0', [100, 90], (c) =>
    part('tree', stroke('M8 45 H20 M20 22 V68 M20 22 H40 M20 68 H34 M40 12 V32 M40 12 H92 M40 32 H58 M58 26 V38 M58 26 H92 M58 38 H92 M34 56 V80 M34 56 H92 M34 80 H52 M52 74 V86 M52 74 H92 M52 86 H92', '#5b6168', 1.4))
    + part('tips', [12, 26, 38, 56, 74, 86].map((y, i) => circ(92, y, 3, i < 3 ? c : '#e8a33d', { w: 0.6 })).join('')));
  add('Server rack', CMP, 'server rack HPC cluster computing data centre', '#3c4148', [70, 100], (c) =>
    part('rack', box3(10, 8, 44, 88, 10, c)) + part('units', Array.from({ length: 8 }, (_, k) => rect(14, 12 + k * 10, 36, 8, 1, '#4a5058', { stroke: '#2a2e33' }) + dot(18, 16 + k * 10, 1, k % 3 ? '#7fd17f' : '#f2c94c') + stroke(`M24 ${16 + k * 10} h22`, '#5b6168', 0.8)).join('')));
  add('Database', CMP, 'database data storage SQL repository', '#4d74c9', [70, 90], (c) =>
    part('database', [60, 38, 16].map((y) => path(`M8 ${y} V${y + 18} C8 ${y + 26} 62 ${y + 26} 62 ${y + 18} V${y} Z`, c) + ell(35, y, 27, 8, L(c, 0.3))).join('')));
  add('Cloud computing', CMP, 'cloud computing upload storage', '#9fcbea', [100, 70], (c) =>
    part('cloud', path('M24 60 C10 60 6 48 12 40 C16 34 22 32 26 34 C28 20 42 12 54 16 C62 8 80 10 84 24 C94 24 98 34 96 42 C96 54 88 60 78 60 Z', c) + flat('M28 36 C30 26 40 20 50 22 C40 24 32 30 28 36 Z', '#ffffff', 0.5)) + part('arrow', path('M50 52 V34 M42 42 L50 34 L58 42', 'none', { fill: 'none', stroke: '#ffffff', w: 3 })));
  add('Code / script', CMP, 'code script programming Python R bioinformatics pipeline', '#3c4148', [100, 80], (c) =>
    part('window', rect(6, 6, 88, 68, 4, c) + rect(6, 6, 88, 10, 4, '#5b6168') + dot(13, 11, 1.8, '#e36d6d') + dot(19, 11, 1.8, '#f2c94c') + dot(25, 11, 1.8, '#6bb36b'))
    + part('code', stroke('M14 26 h20 M38 26 h16 M20 34 h28 M20 42 h14 M38 42 h22 M14 50 h12 M20 58 h30 M14 66 h18', '#9fcbea', 2) + stroke('M30 26 h4 M52 34 h10 M64 42 h8', '#f2c94c', 2)));
  add('Sequence alignment', CMP, 'sequence alignment BLAST multiple alignment nucleotides', '#5b8fd6', [110, 60], () => {
    const seqs = ['ATGCGTACGT', 'ATGCGAACGT', 'ATGTGTACGA', 'ATGCGTACGT'], col = { A: '#6bb36b', T: '#e36d6d', G: '#f2c94c', C: '#5b8fd6' };
    let s = '';
    seqs.forEach((q, i) => [...q].forEach((b, j) => { s += `<rect x="${5 + j * 10}" y="${6 + i * 12}" width="9" height="10" rx="1" fill="${L(col[b], 0.45)}"/>` + text(9.5 + j * 10, 13.8 + i * 12, b, 7, D(col[b], 0.35), { weight: 700 }); }));
    return part('alignment', s);
  });
})();
