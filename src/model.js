// Object factories, templates and protocol presets.

let _uid = 0;
const uid = () => `o${Date.now().toString(36)}${(_uid++).toString(36)}`;

const Make = {
  icon(iconId, x, y, size = 90, extra = {}) {
    const vb = iconViewBox(iconId), k = size / Math.max(vb.w, vb.h);
    return { id: uid(), type: 'icon', iconId, x, y, w: vb.w * k, h: vb.h * k, rot: 0, color: ICON_MAP[iconId].color, ...extra };
  },
  text(text, x, y, extra = {}) {
    const o = { id: uid(), type: 'text', text, x, y, rot: 0, fontSize: 16, color: '#222222', family: 'sans', align: 'left', ...extra };
    const m = measureText(o.text, o.fontSize, o.family, o.bold, o.italic);
    o.w = m.w; o.h = m.h;
    return o;
  },
  rect(x, y, w, h, extra = {}) {
    return { id: uid(), type: 'rect', x, y, w, h, rot: 0, fill: '#e8f0fb', stroke: '#4a7fd6', strokeWidth: 2, radius: 10, ...extra };
  },
  ellipse(x, y, w, h, extra = {}) {
    return { id: uid(), type: 'ellipse', x, y, w, h, rot: 0, fill: '#eef7ee', stroke: '#3fa55b', strokeWidth: 2, ...extra };
  },
  connector(from, to, extra = {}) {
    const end = (e) => (e && e.id ? (e.port ? { id: e.id, port: e.port } : { id: e.id }) : { x: e.x, y: e.y });
    return { id: uid(), type: 'connector', from: end(from), to: end(to), head: 'arrow', tail: 'none', style: 'straight', curve: 40, color: '#333333', width: 2, ...extra };
  },
  brush(kind, x, y, w, h, pts, extra = {}) {
    const defaults = { membrane: '#e8b45a', dna: '#3b82c4', actin: '#d6584a', epithelium: '#e88a9a', vesicles: '#9b7fd1' };
    return { id: uid(), type: 'brush', kind, x, y, w: Math.max(w, 1), h: Math.max(h, 1), rot: 0, pts, closed: false, size: 8, color: defaults[kind], ...extra };
  },
  protocol(steps, x, y, w, extra = {}) {
    const o = { id: uid(), type: 'protocol', x, y, w, rot: 0, steps, title: '', color: '#4a7fd6', scale: 1, ...extra };
    o.h = protocolLayout(o).h;
    return o;
  },
  chart(cfg, x, y, w = 360, h = 280) {
    return { id: uid(), type: 'chart', x, y, w, h, rot: 0, cfg };
  },
  shape(kind, x, y, w, h, extra = {}) {
    return { id: uid(), type: 'shape', kind, x, y, w, h, rot: 0, fill: '#fdf0e6', stroke: '#e8743b', strokeWidth: 2, ...extra };
  },
  badge(n, x, y, extra = {}) {
    return { id: uid(), type: 'ellipse', x: x - 17, y: y - 17, w: 34, h: 34, rot: 0, fill: '#23395d', stroke: 'none', strokeWidth: 0, label: String(n), labelColor: '#ffffff', labelBold: true, labelSize: 17, badge: true, ...extra };
  },
  image(src, x, y, w, h, extra = {}) {
    return { id: uid(), type: 'image', src, x, y, w, h, rot: 0, ...extra };
  },
};

// Ellipse / arc point sets for brushes (normalised 0..1 in their box).
const Shapes = {
  ellipse: (n = 48) => Array.from({ length: n }, (_, i) => [0.5 + 0.5 * Math.cos((i / n) * 2 * Math.PI), 0.5 + 0.5 * Math.sin((i / n) * 2 * Math.PI)]),
  arc: (n = 32) => Array.from({ length: n + 1 }, (_, i) => [i / n, 1 - Math.sin((i / n) * Math.PI)]),
  line: () => [[0, 0.5], [1, 0.5]],
  wave: (n = 40) => Array.from({ length: n + 1 }, (_, i) => [i / n, 0.5 + 0.4 * Math.sin((i / n) * 4 * Math.PI)]),
};

const PROTOCOL_PRESETS = {
  'ELISA (sandwich)': [
    ['Coat plate with capture antibody', 'wellplate'], ['Block non-specific sites', 'beaker'], ['Add samples & standards', 'pipette'],
    ['Add detection antibody', 'antibody'], ['Add enzyme conjugate', 'enzyme'], ['Add substrate', 'tube'], ['Read absorbance', 'computer']],
  'Western blot': [
    ['Lyse cells', 'eppendorf'], ['Quantify protein', 'wellplate'], ['SDS-PAGE', 'gel'], ['Transfer to membrane', 'gel'],
    ['Block membrane', 'beaker'], ['Primary antibody', 'antibody'], ['Secondary antibody', 'antibody'], ['Image & quantify', 'computer']],
  'RT-qPCR': [
    ['Extract RNA', 'eppendorf'], ['Reverse transcribe to cDNA', 'rna'], ['Prepare reaction mix', 'pipette'], ['Amplify (thermocycler)', 'thermo'], ['Analyse Ct values', 'computer']],
  'Flow cytometry': [
    ['Harvest cells', 'tube'], ['Stain surface markers', 'antibody'], ['Fix & permeabilise', 'beaker'], ['Intracellular staining', 'antibody'], ['Acquire on cytometer', 'computer'], ['Gate & analyse', 'computer']],
  'Cytotoxicity assay': [
    ['Seed cells', 'wellplate'], ['Treat with compound', 'syringe'], ['Incubate', 'clock'], ['Add viability reagent', 'pipette'], ['Read luminescence', 'computer']],
  'CRISPR knockout': [
    ['Design sgRNA', 'computer'], ['Clone into vector', 'dna'], ['Transfect cells', 'pipette'], ['Select clones', 'petri'], ['Validate edit', 'gel']],
  'Immunohistochemistry': [
    ['Fix & embed tissue', 'liver'], ['Section', 'microscope'], ['Antigen retrieval', 'thermo'], ['Primary antibody', 'antibody'], ['Detect & counterstain', 'beaker'], ['Image', 'microscope']],
};

// Each template returns a fresh page.
const TEMPLATES = [
  {
    name: 'Receptor signalling pathway',
    desc: 'Ligand → receptor → kinase cascade → transcription',
    build() {
      const W = 1000, H = 700, o = [];
      const mem = Make.brush('membrane', 30, 170, 940, 40, Shapes.line(), { size: 9 });
      const title = Make.text('Proposed signalling mechanism', 30, 24, { fontSize: 26, bold: true });
      const ext = Make.text('Extracellular', 40, 120, { fontSize: 14, italic: true, color: '#666666' });
      const cyt = Make.text('Cytoplasm', 40, 232, { fontSize: 14, italic: true, color: '#666666' });
      const lig = Make.icon('ligand', 476, 60, 46);
      const rec = Make.icon('receptor', 468, 130, 110);
      const kA = Make.icon('enzyme', 300, 330, 80); const kAL = Make.text('Kinase A', 306, 414, { fontSize: 15, bold: true });
      const kB = Make.icon('protein', 500, 330, 80, { color: '#5fb3a0' }); const kBL = Make.text('Kinase B', 506, 414, { fontSize: 15, bold: true });
      const p = Make.icon('phospho', 562, 322, 26);
      const inh = Make.icon('smallmol', 520, 240, 46); const inhL = Make.text('Inhibitor X', 572, 254, { fontSize: 13, color: '#d64545' });
      const nuc = Make.ellipse(600, 470, 360, 200, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true });
      const nucL = Make.text('Nucleus', 620, 480, { fontSize: 14, italic: true, color: '#7a5fb0' });
      const tf = Make.icon('protein', 730, 330, 70, { color: '#e8743b' }); const tfL = Make.text('TF', 754, 405, { fontSize: 15, bold: true });
      const dna = Make.brush('dna', 650, 560, 260, 50, Shapes.wave(), { size: 6 });
      const gene = Make.text('Target genes', 730, 625, { fontSize: 14 });
      o.push(mem, title, ext, cyt, lig, rec, kA, kAL, kB, kBL, p, inh, inhL, nuc, nucL, tf, tfL, dna, gene);
      o.push(Make.connector(rec, kA, { label: 'activates' }));
      o.push(Make.connector(kA, kB, { label: 'phosphorylates', labelItalic: true }));
      o.push(Make.connector(inh, kB, { head: 'bar', color: '#d64545' }));
      o.push(Make.connector(kB, tf, { style: 'curved', curve: -40 }));
      o.push(Make.connector(tf, dna, { label: 'transcription', dash: true }));
      return { name: 'Pathway', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'In vivo study workflow',
    desc: 'Control vs treated cohorts through to analysis',
    build() {
      const W = 1200, H = 560, o = [];
      o.push(Make.text('Study design', 40, 24, { fontSize: 26, bold: true }));
      const rows = [['Vehicle control', '#7a8a96', 150], ['Treatment', '#e8743b', 330]];
      for (const [name, col, y] of rows) {
        const lab = Make.text(name, 40, y + 30, { fontSize: 16, bold: true, color: col });
        const m = Make.icon('mouse', 200, y, 120, { color: col === '#7a8a96' ? '#b8b8b8' : '#d9b8a0' });
        const s = Make.icon('syringe', 390, y + 20, 90, { color: col });
        const t = Make.icon('clock', 560, y + 5, 60);
        const tl = Make.text('14 days', 562, y + 72, { fontSize: 13 });
        const liv = Make.icon('liver', 700, y + 5, 90);
        const wp = Make.icon('wellplate', 870, y + 5, 90);
        const pc = Make.icon('computer', 1040, y, 90);
        o.push(lab, m, s, t, tl, liv, wp, pc);
        [[m, s], [s, t], [t, liv], [liv, wp], [wp, pc]].forEach(([a, b]) => o.push(Make.connector(a, b, { color: '#555555' })));
      }
      [['Dosing', 400], ['Duration', 556], ['Tissue harvest', 700], ['Assay', 885], ['Analysis', 1050]].forEach(([t, x]) =>
        o.push(Make.text(t, x, 470, { fontSize: 14, color: '#555555', bold: true })));
      o.push(Make.text('n = ? per group — fill in from your protocol', 40, 510, { fontSize: 12, italic: true, color: '#888888' }));
      return { name: 'Workflow', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Graphical abstract (3 panel)',
    desc: 'Question → approach → finding',
    build() {
      const W = 1328, H = 560, o = [];
      const panels = [['Question', '#4a7fd6', 'virus'], ['Approach', '#3fa58b', 'microscope'], ['Finding', '#e8743b', 'tcell']];
      const boxes = [];
      panels.forEach(([t, c, ic], i) => {
        const x = 40 + i * 436;
        const b = Make.rect(x, 60, 380, 440, { fill: Color.light(c, 0.9), stroke: c, radius: 18 });
        const hdr = Make.rect(x, 60, 380, 56, { fill: c, stroke: c, radius: 18, label: t, labelColor: '#ffffff', labelBold: true, labelSize: 22 });
        const icon = Make.icon(ic, x + 120, 170, 140);
        const txt = Make.text('One-sentence summary\nof this panel', x + 40, 360, { fontSize: 18, align: 'center' });
        txt.x = x + 190 - txt.w / 2;
        o.push(b, hdr, icon, txt);
        boxes.push(b);
      });
      o.push(Make.connector({ x: 424, y: 280 }, { x: 472, y: 280 }, { width: 4 }));
      o.push(Make.connector({ x: 860, y: 280 }, { x: 908, y: 280 }, { width: 4 }));
      return { name: 'Graphical abstract', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Control vs treatment (cells)',
    desc: 'Side-by-side comparison of two conditions',
    build() {
      const W = 1000, H = 520, o = [];
      [['Control', 40, '#7a8a96', false], ['+ Drug', 520, '#e8743b', true]].forEach(([t, x, c, drug]) => {
        o.push(Make.rect(x, 40, 440, 440, { fill: '#ffffff', stroke: c, radius: 14 }));
        o.push(Make.text(t, x + 20, 56, { fontSize: 22, bold: true, color: c }));
        o.push(Make.brush('membrane', x + 60, 110, 320, 320, Shapes.ellipse(), { closed: true, size: 7 }));
        o.push(Make.icon('nucleus', x + 175, 225, 90));
        o.push(Make.icon('mitochondrion', x + 120, 340, 60));
        o.push(Make.icon('receptor', x + 205, 82, 70));
        if (drug) { o.push(Make.icon('smallmol', x + 290, 70, 46)); o.push(Make.icon('cross', x + 330, 250, 30)); }
      });
      return { name: 'Comparison', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Conference poster (36 × 48 in)',
    desc: 'Title bar and three-column sections',
    build() {
      const W = 3456, H = 4608, o = [];
      o.push(Make.rect(0, 0, W, 460, { fill: '#23395d', stroke: '#23395d', radius: 0 }));
      o.push(Make.text('Poster title goes here', 120, 110, { fontSize: 120, bold: true, color: '#ffffff' }));
      o.push(Make.text('Author One¹, Author Two², Author Three¹\n¹Institution, ²Institution', 120, 270, { fontSize: 56, color: '#d8e2f0' }));
      const cols = [['Introduction', 'Methods'], ['Results'], ['Discussion', 'Conclusions', 'References']];
      cols.forEach((secs, ci) => {
        const x = 100 + ci * 1100, colH = 4000, each = colH / secs.length;
        secs.forEach((s, si) => {
          const y = 540 + si * each;
          o.push(Make.rect(x, y, 1040, each - 60, { fill: '#f6f8fb', stroke: '#c9d4e3', radius: 24, strokeWidth: 4 }));
          o.push(Make.rect(x, y, 1040, 120, { fill: '#4a7fd6', stroke: '#4a7fd6', radius: 24, label: s, labelColor: '#ffffff', labelBold: true, labelSize: 64 }));
          o.push(Make.text('Add text, figures and graphs here.', x + 50, y + 170, { fontSize: 44, color: '#444444' }));
        });
      });
      return { name: 'Poster', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Title slide (16:9)',
    desc: 'Presentation opener',
    build() {
      const W = 1280, H = 720, o = [];
      o.push(Make.rect(0, 0, 1280, 720, { fill: '#f3f6fb', stroke: 'none', radius: 0 }));
      o.push(Make.brush('membrane', -40, 520, 1360, 160, Shapes.wave(), { size: 10 }));
      o.push(Make.text('Talk title', 100, 220, { fontSize: 64, bold: true, color: '#23395d' }));
      o.push(Make.text('Speaker name · Lab · Date', 100, 320, { fontSize: 28, color: '#4d5b6b' }));
      o.push(Make.icon('dna', 1050, 120, 260));
      return { name: 'Title slide', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
];

TEMPLATES.push(
  {
    name: 'Cell cycle',
    desc: 'Circular cycle diagram — G1 → S → G2 → M',
    build() {
      const W = 900, H = 700, o = [], cx = 450, cy = 370, R = 220;
      o.push(Make.text('The cell cycle', 30, 24, { fontSize: 26, bold: true }));
      const phases = [['G1', 'Growth', '#4a7fd6', 'cell'], ['S', 'DNA synthesis', '#3fa58b', 'dna'], ['G2', 'Growth & checks', '#e8b33c', 'cell'], ['M', 'Mitosis', '#d6584a', 'chromosome']];
      const nodes = phases.map(([p, d, c, ic], i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const b = Make.ellipse(x - 70, y - 70, 140, 140, { fill: Color.light(c, 0.85), stroke: c, strokeWidth: 3 });
        o.push(b, Make.icon(ic, x - 28, y - 52, 56, { color: c }));
        const t = Make.text(p, 0, y + 6, { fontSize: 22, bold: true, color: Color.dark(c), align: 'center' }); t.x = x - t.w / 2;
        const t2 = Make.text(d, 0, y + 34, { fontSize: 13, color: '#444444', align: 'center' }); t2.x = x - t2.w / 2;
        o.push(t, t2);
        return b;
      });
      nodes.forEach((n, i) => o.push(Make.connector(n, nodes[(i + 1) % 4], { style: 'curved', curve: -70, width: 3, color: '#555555' })));
      const g0 = Make.text('G0\n(quiescence)', 700, 120, { fontSize: 14, italic: true, color: '#7a8a96' });
      o.push(g0, Make.connector(nodes[0], g0, { dash: true, tail: 'arrow', color: '#7a8a96' }));
      return { name: 'Cell cycle', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Mouse study timeline',
    desc: 'Day-by-day dosing & sampling timeline',
    build() {
      const W = 1200, H = 420, o = [];
      o.push(Make.text('Experimental timeline', 40, 24, { fontSize: 24, bold: true }));
      o.push(Make.rect(80, 200, 1040, 14, { fill: '#7a8a96', stroke: 'none', radius: 7 }));
      o.push(Make.shape('arrow', 1100, 186, 60, 42, { fill: '#7a8a96', stroke: 'none' }));
      const evts = [[0, 'Day 0', 'Tumour\nimplant', 'mouse'], [7, 'Day 7', 'Randomise', 'computer'], [10, 'Day 10', 'Dose 1', 'syringe'], [14, 'Day 14', 'Dose 2', 'syringe'], [21, 'Day 21', 'Blood\nsampling', 'tube'], [28, 'Day 28', 'Endpoint &\ntissue harvest', 'liver']];
      evts.forEach(([d, day, label, ic], i) => {
        const x = 100 + (d / 28) * 960;
        o.push(Make.badge(i + 1, x, 207));
        const above = i % 2 === 0;
        o.push(Make.icon(ic, x - 32, above ? 100 : 250, 64));
        const t = Make.text(day, 0, above ? 70 : 322, { fontSize: 14, bold: true, align: 'center' }); t.x = x - t.w / 2;
        const l = Make.text(label, 0, above ? 236 : 342, { fontSize: 12, align: 'center', color: '#444444' }); l.x = x - l.w / 2;
        if (!above) l.y = 340;
        else { l.y = 232; l.x = x + 22; l.align = 'left'; }
        o.push(t, l);
      });
      return { name: 'Timeline', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
  {
    name: 'Decision flowchart',
    desc: 'Screening → decision → two outcomes',
    build() {
      const W = 900, H = 640, o = [];
      const a = Make.rect(330, 40, 240, 80, { label: 'Patient samples\n(n = ?)', fill: '#e8f0fb' });
      const b = Make.rect(330, 180, 240, 80, { label: 'Screen for biomarker', fill: '#e8f0fb' });
      const c = Make.shape('diamond', 360, 310, 180, 130, { label: 'Positive?', fill: '#fdf0e6' });
      const d = Make.rect(110, 500, 240, 80, { label: 'Treatment arm', fill: '#eef7ee', stroke: '#3fa55b' });
      const e = Make.rect(550, 500, 240, 80, { label: 'Standard care', fill: '#f3f3f3', stroke: '#7a8a96' });
      o.push(a, b, c, d, e);
      o.push(Make.connector(a, b), Make.connector(b, c), Make.connector(c, d, { style: 'elbow', label: 'yes' }), Make.connector(c, e, { style: 'elbow', label: 'no' }));
      return { name: 'Flowchart', width: W, height: H, background: '#ffffff', objects: o };
    },
  },
);

const PAGE_PRESETS = [
  ['Figure — 7 × 5 in', 672, 480],
  ['Single column — 3.5 × 3.5 in', 336, 336],
  ['Double column — 7 × 7 in', 672, 672],
  ['Graphical abstract — 1328 × 531', 1328, 531],
  ['Slide 16:9 — 1280 × 720', 1280, 720],
  ['Slide 4:3 — 1024 × 768', 1024, 768],
  ['Poster 36 × 48 in', 3456, 4608],
  ['Poster A0 portrait', 3179, 4494],
  ['Canvas 1000 × 700', 1000, 700],
];

const SAMPLE_DATA = {
  bar: 'Control,Treated\n12.1,18.4\n10.8,20.1\n13.5,17.9\n11.2,22.3\n12.9,19.5\n10.4,21.0',
  box: 'WT,KO,KO + rescue\n5.2,8.9,5.9\n4.8,9.4,6.3\n6.1,10.2,5.5\n5.5,8.1,6.8\n4.9,11.5,6.1\n5.8,9.0,5.7',
  scatter: 'Dose (µM),Response\n0.1,4.2\n0.5,9.8\n1,15.1\n2,24.8\n4,41.2\n8,70.5\n10,86.0',
  line: 'Day,Control,Treated\n0,100,100\n3,180,150\n7,320,210\n10,520,260\n14,850,310',
  dose: 'Dose (µM),Drug A,Drug B\n0.001,2,1\n0.01,6,3\n0.1,22,8\n1,61,26\n10,90,63\n100,98,91\n1000,99,98',
  survival: 'Time (days),Event,Group\n6,1,Control\n8,1,Control\n10,1,Control\n12,0,Control\n14,1,Control\n15,1,Control\n18,1,Control\n20,0,Control\n12,1,Treated\n18,0,Treated\n22,1,Treated\n25,1,Treated\n30,0,Treated\n34,1,Treated\n40,0,Treated\n40,0,Treated',
  heatmap: 'Gene,Ctrl 1,Ctrl 2,Ctrl 3,Drug 1,Drug 2,Drug 3\nIL6,1.0,1.2,0.9,4.1,3.8,4.5\nTNF,0.8,1.1,1.0,3.2,2.9,3.5\nCXCL8,1.1,0.9,1.0,2.4,2.8,2.2\nIL10,1.0,1.1,0.9,0.5,0.6,0.4\nGAPDH,1.0,1.0,1.0,1.0,1.1,0.9',
};
