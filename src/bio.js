// Biology builders: editable antibody constructor, and disease-mechanism templates.

// ---------- Antibody builder ----------
// Every domain is its own rounded shape inside a group, named (VH, CL, Fc…) so it can be recoloured or
// edited after insertion (double-click the group).
const AB_FORMATS = [
  ['igg', 'IgG (full antibody)'], ['fab', 'Fab fragment'], ['f2ab', 'F(ab′)₂'], ['scfv', 'scFv (single-chain variable fragment)'],
  ['vhh', 'Nanobody (VHH)'], ['hcab', 'Heavy-chain antibody (camelid)'], ['bispecific', 'Bispecific IgG'], ['adc', 'Antibody–drug conjugate'],
  ['labelled', 'Fluorophore-labelled IgG'], ['igm', 'IgM pentamer'], ['iga', 'IgA dimer'],
];
const AB_DEFAULTS = { heavy: '#4a7fd6', light: '#e8b33c', variable: '#e8743b', second: '#3fa58b', payload: '#d64545', label: '#7cf2a8' };

function abDomains(fmt, col) {
  const D = [];
  const dom = (cx, cy, rot, fill, name, w = 18, h = 30) => D.push({ cx, cy, rot, fill, name, w, h });
  const vcol = (chain, second) => (second ? col.second : col.variable || chain);
  // One Fab arm from pivot (px,py) at angle a (deg, 0 = straight up); side = -1 left arm, +1 right arm.
  const arm = (px, py, a, side, { light = true, second = false } = {}) => {
    const r = (a * Math.PI) / 180, d = [Math.sin(r), -Math.cos(r)], n = [side * Math.cos(r), side * Math.sin(r)];
    const at = (along, lat) => [px + d[0] * along + n[0] * lat, py + d[1] * along + n[1] * lat];
    dom(...at(18, 0), a, col.heavy, 'CH1'); dom(...at(50, 0), a, vcol(col.heavy, second), 'VH');
    if (light) { dom(...at(18, 19), a, col.light, 'CL'); dom(...at(50, 19), a, vcol(col.light, second), 'VL'); }
  };
  const fc = (x0, y0, n = 2) => { for (let k = 0; k < n; k++) { dom(x0 - 9.5, y0 + 18 + k * 32, 0, col.heavy, `CH${k + 2}`); dom(x0 + 9.5, y0 + 18 + k * 32, 0, col.heavy, `CH${k + 2}`); } };
  const hinge = (x0, y0) => { D.push({ cx: x0, cy: y0, rot: 0, fill: col.heavy, name: 'Hinge', w: 22, h: 6, rx: 2 }); };
  const igg = (x0, y0, opts = {}) => { arm(x0 - 9, y0, -38, -1, opts.left || {}); arm(x0 + 9, y0, 38, 1, opts.right || {}); hinge(x0, y0 + 2); fc(x0, y0 + 2, opts.fcDomains || 2); };
  switch (fmt) {
    case 'fab': arm(91, 150, 0, -1); break;
    case 'f2ab': arm(91, 120, -38, -1); arm(109, 120, 38, 1); hinge(100, 122); break;
    case 'scfv': dom(88, 100, 0, vcol(col.heavy), 'VH'); dom(112, 100, 0, vcol(col.light), 'VL'); D.push({ cx: 100, cy: 122, rot: 0, fill: '#7a8a96', name: 'Linker', w: 30, h: 4, rx: 2 }); break;
    case 'vhh': dom(100, 100, 0, vcol(col.heavy), 'VHH', 20, 32); break;
    case 'hcab': arm(91, 110, -30, -1, { light: false }); arm(109, 110, 30, 1, { light: false }); hinge(100, 112); fc(100, 112); break;
    case 'bispecific': igg(100, 100, { right: { second: true } }); break;
    case 'adc': igg(100, 100);
      [[78, 120], [122, 120], [86, 160], [114, 160]].forEach(([x, y]) => D.push({ cx: x, cy: y, rot: 0, fill: col.payload, name: 'Payload', w: 10, h: 10, ellipse: true }));
      break;
    case 'labelled': igg(100, 100); D.push({ cx: 100, cy: 196, rot: 0, fill: col.label, name: 'Fluorophore', w: 22, h: 22, star: true }); break;
    case 'igm': case 'iga': {
      const n = fmt === 'igm' ? 5 : 2, gap = fmt === 'igm' ? 16 : 12, unit = [];
      const save = D.length;
      igg(0, -130, { fcDomains: fmt === 'igm' ? 3 : 2 });
      unit.push(...D.splice(save));
      const tail = Math.max(...unit.map((u) => u.cy + u.h / 2)); // Fc tip; shifted to sit `gap` from the centre
      for (let k = 0; k < n; k++) {
        const ang = fmt === 'igm' ? (k * 360) / n : k * 180, r = (ang * Math.PI) / 180;
        for (const u of unit) {
          const ux = u.cx, uy = u.cy - tail - gap;
          D.push({ ...u, cx: 150 + ux * Math.cos(r) - uy * Math.sin(r), cy: 150 + ux * Math.sin(r) + uy * Math.cos(r), rot: (u.rot || 0) + ang });
        }
      }
      D.push({ cx: 150, cy: 150, rot: 0, fill: '#9b7fd1', name: 'J chain', w: 14, h: 14, ellipse: true });
      break;
    }
    default: igg(100, 100);
  }
  return D;
}
function buildAntibody(fmt, col, size) {
  const D = abDomains(fmt, col);
  const xs = D.flatMap((d) => [d.cx - d.h / 2, d.cx + d.h / 2]), ys = D.flatMap((d) => [d.cy - d.h / 2, d.cy + d.h / 2]);
  const bx = Math.min(...xs), by = Math.min(...ys), k = size / Math.max(Math.max(...xs) - bx, Math.max(...ys) - by);
  const parts = D.map((d) => {
    const extra = { fill: d.fill, stroke: Color.dark(d.fill, 0.3), strokeWidth: 1.2 * k, name: d.name, rot: d.rot };
    const x = (d.cx - bx - d.w / 2) * k, y = (d.cy - by - d.h / 2) * k, w = d.w * k, h = d.h * k;
    if (d.star) return Make.shape('star', x, y, w, h, { ...extra, glow: d.fill });
    if (d.ellipse) return Make.ellipse(x, y, w, h, extra);
    return Make.rect(x, y, w, h, { ...extra, radius: (d.rx ?? Math.min(d.w, d.h) / 2) * k, shade: 'soft' });
  });
  return parts;
}
function openAntibodyBuilder() {
  const fmt = el('select', {}, ...AB_FORMATS.map(([v, l]) => el('option', { value: v, textContent: l })));
  const col = { ...AB_DEFAULTS };
  const prev = el('div', { class: 'preview', style: 'min-height:260px;display:flex;align-items:center;justify-content:center' });
  const draw = () => {
    const parts = buildAntibody(fmt.value, col, 240);
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 20, H = Math.max(...parts.map((o) => o.y + o.h)) + 20;
    parts.forEach((o) => { o.x += 10; o.y += 10; });
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="max-width:100%;max-height:300px" ');
  };
  const picker = (key, label) => field_(label, el('input', { type: 'color', value: col[key], oninput: (e) => { col[key] = e.target.value; draw(); } }));
  fmt.onchange = draw;
  const labels = el('input', { type: 'checkbox' });
  openModal('Antibody builder', el('div', { style: 'max-width:620px;display:grid;grid-template-columns:1fr 260px;gap:14px' },
    prev,
    el('div', {}, field_('Format', fmt), picker('heavy', 'Heavy chain'), picker('light', 'Light chain'), picker('variable', 'Variable (V) domains'),
      picker('second', '2nd specificity'), picker('payload', 'Drug payload'), picker('label', 'Fluorophore'),
      field_('', el('label', { style: 'width:auto;color:inherit' }, labels, ' Add domain labels')),
      el('div', { class: 'note' }, 'Inserted as a group of named domains — double-click it to recolour or move individual chains.'),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
        const parts = buildAntibody(fmt.value, col, 180), c = viewCenter();
        const W = Math.max(...parts.map((o) => o.x + o.w)), H = Math.max(...parts.map((o) => o.y + o.h));
        parts.forEach((o) => { o.x += c.x - W / 2; o.y += c.y - H / 2; });
        if (labels.checked) {
          const seen = new Set();
          for (const p of [...parts]) {
            if (seen.has(p.name) || p.name === 'Hinge' || p.name === 'Linker') continue;
            seen.add(p.name);
            const t = Make.text(p.name, 0, 0, { fontSize: 10, bold: true, color: '#222222' });
            t.x = p.x + p.w / 2 - t.w / 2; t.y = p.y + p.h / 2 - t.h / 2;
            parts.push(t);
          }
        }
        const g = makeGroup(parts, AB_FORMATS.find(([v]) => v === fmt.value)[1]);
        closeModal();
        addObjects([g]);
      }, 'primary')))));
  draw();
}

// ---------- Disease-mechanism templates ----------
function dmStep(o, x, y, w, h, title, body, c) {
  o.push(Make.rect(x, y, w, h, { fill: Color.light(c, 0.9), stroke: c, radius: 14 }));
  const t = Make.text(title, x + 14, y + 12, { fontSize: 15, bold: true, color: Color.dark(c, 0.35) });
  o.push(t);
  if (body) o.push(Make.text(body, x + 14, y + 38, { fontSize: 12, color: '#333333' }));
}
TEMPLATES.push(
  { name: 'Insulin resistance (type 2 diabetes)', desc: 'Insulin → receptor → IRS/PI3K/AKT → GLUT4; lipid & inflammatory blocks', category: 'Disease mechanisms', author: 'SciCanvas', build() {
    const o = [Make.text('Insulin resistance', 30, 20, { fontSize: 26, bold: true })];
    o.push(Make.brush('membrane', 30, 150, 940, 36, Shapes.line(), { size: 8 }));
    const ins = Make.icon('ligand', 160, 70, 50, { color: '#e8b33c' }), rec = Make.icon('receptor', 140, 120, 100);
    const irs = Make.icon('protein', 150, 270, 70, { color: '#4a7fd6' }), pi3k = Make.icon('enzyme', 330, 280, 70), akt = Make.icon('enzyme', 510, 280, 70, { color: '#3fa58b' });
    const glut = Make.icon('receptor', 720, 120, 90, { color: '#9b7fd1' }), ves = Make.ellipse(710, 300, 90, 60, { fill: '#f1ebfa', stroke: '#9b7fd1', label: 'GLUT4\nvesicle', labelSize: 11 });
    const glu = Make.icon('smallmol', 740, 60, 40, { color: '#e8743b' });
    const ffa = Make.rect(300, 430, 200, 70, { label: 'Lipids / DAG\n→ PKCθ', fill: '#fbe9e9', stroke: '#d64545' }), tnf = Make.rect(560, 430, 200, 70, { label: 'Inflammation\nTNF-α → JNK / IKKβ', fill: '#fbe9e9', stroke: '#d64545' });
    o.push(ins, rec, irs, pi3k, akt, glut, ves, glu, ffa, tnf,
      Make.text('Insulin', 215, 80, { fontSize: 13, bold: true }), Make.text('IRS-1', 160, 345, { fontSize: 13, bold: true }), Make.text('PI3K', 345, 355, { fontSize: 13, bold: true }), Make.text('AKT', 528, 355, { fontSize: 13, bold: true }), Make.text('Glucose', 790, 70, { fontSize: 13, bold: true }),
      Make.connector(rec, irs, { label: 'Tyr-P' }), Make.connector(irs, pi3k), Make.connector(pi3k, akt, { label: 'PIP3' }), Make.connector(akt, ves, { label: 'translocation' }), Make.connector(ves, glut, { dash: true }), Make.connector(glu, glut),
      Make.connector(ffa, irs, { head: 'bar', color: '#d64545', label: 'Ser-P', style: 'curved', curve: 40 }), Make.connector(tnf, irs, { head: 'bar', color: '#d64545', style: 'curved', curve: -60 }));
    return { name: 'Insulin resistance', width: 1000, height: 540, background: '#ffffff', objects: o };
  } },
  { name: 'Alzheimer’s disease: amyloid & tau', desc: 'APP cleavage → Aβ plaques; tau hyperphosphorylation → tangles → neuron loss', category: 'Disease mechanisms', author: 'SciCanvas', build() {
    const o = [Make.text('Alzheimer’s disease: amyloid and tau', 30, 20, { fontSize: 26, bold: true })];
    dmStep(o, 30, 80, 220, 140, 'APP processing', 'β-secretase (BACE1) and\nγ-secretase cleave APP', '#4a7fd6');
    dmStep(o, 280, 80, 220, 140, 'Aβ42 aggregation', 'Monomers → oligomers\n→ extracellular plaques', '#e8743b');
    dmStep(o, 530, 80, 200, 140, 'Microglial activation', 'Neuroinflammation,\ncytokine release', '#9b7fd1');
    dmStep(o, 280, 290, 220, 140, 'Tau hyperphosphorylation', 'Kinases (GSK-3β, CDK5)\n→ tau detaches from MTs', '#d64545');
    dmStep(o, 530, 290, 200, 140, 'Neurofibrillary tangles', 'Microtubule collapse,\nimpaired transport', '#a8473a');
    dmStep(o, 760, 180, 210, 160, 'Synapse & neuron loss', 'Cognitive decline', '#2c3740');
    o.push(Make.icon('neuron', 800, 360, 130), Make.icon('macrophage', 650, 160, 60, { color: '#9b7fd1' }));
    const B = o.filter((x) => x.type === 'rect');
    o.push(Make.connector(B[0], B[1]), Make.connector(B[1], B[2]), Make.connector(B[1], B[3], { label: 'drives', dash: true }), Make.connector(B[3], B[4]), Make.connector(B[2], B[5]), Make.connector(B[4], B[5]));
    return { name: 'Alzheimer’s', width: 1000, height: 500, background: '#ffffff', objects: o };
  } },
  { name: 'Tumour immune evasion: PD-1 / PD-L1', desc: 'T cell–tumour synapse, PD-1/PD-L1 checkpoint and blocking antibody', category: 'Disease mechanisms', author: 'SciCanvas', build() {
    const o = [Make.text('Tumour immune evasion via PD-1 / PD-L1', 30, 20, { fontSize: 26, bold: true })];
    const t = Make.icon('tcell', 60, 140, 220), tum = Make.icon('cell', 660, 120, 260, { color: '#d6584a' });
    const tcr = Make.icon('receptor', 330, 170, 70, { color: '#4a7fd6', rot: 90 }), mhc = Make.icon('receptor', 560, 170, 70, { color: '#e8b33c', rot: -90 });
    const pd1 = Make.icon('receptor', 330, 300, 70, { color: '#9b7fd1', rot: 90 }), pdl1 = Make.icon('receptor', 560, 300, 70, { color: '#e8743b', rot: -90 });
    const ab = Make.icon('antibody', 445, 390, 60, { color: '#3fa58b' });
    o.push(t, tum, tcr, mhc, pd1, pdl1, ab,
      Make.text('T cell', 130, 370, { fontSize: 16, bold: true }), Make.text('Tumour cell', 740, 390, { fontSize: 16, bold: true }),
      Make.text('TCR', 345, 150, { fontSize: 13, bold: true }), Make.text('MHC–antigen', 545, 150, { fontSize: 13, bold: true }), Make.text('PD-1', 345, 280, { fontSize: 13, bold: true }), Make.text('PD-L1', 575, 280, { fontSize: 13, bold: true }),
      Make.text('Anti-PD-1 / PD-L1\nantibody', 400, 455, { fontSize: 12, bold: true, color: '#3fa58b' }),
      Make.connector(tcr, mhc, { head: 'dot', label: 'activation' }), Make.connector(pdl1, pd1, { head: 'bar', color: '#d64545', label: 'exhaustion signal' }),
      Make.connector(ab, pdl1, { head: 'bar', color: '#3fa58b', dash: true }));
    return { name: 'PD-1 / PD-L1', width: 1000, height: 520, background: '#ffffff', objects: o };
  } },
  { name: 'Viral entry & replication', desc: 'Attachment → entry → uncoating → replication → assembly → release', category: 'Disease mechanisms', author: 'SciCanvas', build() {
    const o = [Make.text('Viral life cycle', 30, 20, { fontSize: 26, bold: true })];
    const cell = Make.ellipse(120, 90, 760, 420, { fill: '#fff7f0', stroke: '#e8b45a', strokeWidth: 4 });
    const nuc = Make.ellipse(400, 250, 220, 150, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true });
    o.push(cell, nuc, Make.text('Nucleus', 478, 262, { fontSize: 13, italic: true, color: '#7a5fb0' }), Make.text('Host cell', 150, 470, { fontSize: 13, italic: true, color: '#9a7a3a' }));
    const steps = [['1 Attachment', 40, 64], ['2 Entry', 220, 160], ['3 Uncoating', 250, 330], ['4 Replication', 470, 300], ['5 Assembly', 690, 330], ['6 Release', 880, 100]];
    let prev = null;
    steps.forEach(([lab, x, y], i) => {
      const v = Make.icon(i === 3 ? 'rna' : 'virus', x, y, i === 3 ? 70 : 54, { color: '#d6584a' });
      const l = Make.text(lab, 0, i === 5 ? y - 20 : y + (i === 3 ? 74 : 58), { fontSize: 13, bold: true });
      l.x = x + (i === 3 ? 35 : 27) - l.w / 2;
      o.push(v, l);
      if (prev) o.push(Make.connector(prev, v, { style: 'curved', curve: 30 }));
      prev = v;
    });
    return { name: 'Viral life cycle', width: 1000, height: 540, background: '#ffffff', objects: o };
  } },
  { name: 'Atherosclerosis', desc: 'Endothelial dysfunction → LDL oxidation → foam cells → plaque & rupture', category: 'Disease mechanisms', author: 'SciCanvas', build() {
    const o = [Make.text('Atherosclerotic plaque formation', 30, 20, { fontSize: 26, bold: true })];
    o.push(Make.rect(30, 90, 940, 120, { fill: '#fbe9e9', stroke: 'none', radius: 0 }), Make.text('Lumen (blood flow →)', 40, 96, { fontSize: 13, italic: true, color: '#a83a3a' }));
    o.push(Make.brush('epithelium', 30, 210, 940, 30, Shapes.line(), { size: 10, color: '#e88a9a' }));
    o.push(Make.rect(30, 245, 940, 200, { fill: '#fdf6e0', stroke: 'none', radius: 0 }), Make.text('Intima', 40, 420, { fontSize: 13, italic: true, color: '#6e5310' }));
    const ldl = Make.icon('smallmol', 150, 130, 44, { color: '#e8b33c' }), ox = Make.icon('smallmol', 260, 290, 44, { color: '#a8473a' });
    const mono = Make.icon('macrophage', 420, 110, 70, { color: '#9b7fd1' }), foam = Make.icon('macrophage', 520, 290, 90, { color: '#e8b33c' });
    const smc = Make.icon('cell', 720, 300, 80, { color: '#e8743b' }), cap = Make.rect(660, 240, 260, 34, { label: 'Fibrous cap', fill: '#fdf0e6', stroke: '#e8743b', radius: 17 });
    o.push(ldl, ox, mono, foam, smc, cap,
      Make.text('LDL', 200, 140, { fontSize: 13, bold: true }), Make.text('oxLDL', 310, 300, { fontSize: 13, bold: true }), Make.text('Monocyte', 490, 120, { fontSize: 13, bold: true }), Make.text('Foam cell', 520, 385, { fontSize: 13, bold: true }), Make.text('Smooth muscle cells', 700, 385, { fontSize: 13, bold: true }),
      Make.connector(ldl, ox, { label: 'oxidation' }), Make.connector(mono, foam, { label: 'recruitment → macrophage' }), Make.connector(ox, foam, { label: 'uptake' }), Make.connector(foam, smc, { dash: true, label: 'cytokines' }), Make.connector(smc, cap));
    return { name: 'Atherosclerosis', width: 1000, height: 480, background: '#ffffff', objects: o };
  } },
);
ARRANGE_COMMANDS.antibody = openAntibodyBuilder;
