// Templates that use the line tools (linetools.js): a study timeline, a metabolic pathway with cofactors and
// regulation, a lineage tree and an SBGN process-description map. Loaded after linetools.js.
(() => {
  if (typeof TEMPLATES === 'undefined') return;
  const box = (x, y, w, h, label, extra = {}) => Object.assign(Make.rect(x, y, w, h, { radius: 10, ...extra }), { label, labelSize: extra.labelSize || 15 });
  const title = (t, x = 40, y = 24) => Make.text(t, x, y, { fontSize: 24, bold: true, color: '#1f2a37' });
  const note = (t, x, y, extra = {}) => Make.text(t, x, y, { fontSize: 13, color: '#566270', ...extra });
  const icon = (id, x, y, size, extra) => (typeof ICON_MAP !== 'undefined' && ICON_MAP[id] ? Make.icon(id, x, y, size, extra) : Make.ellipse(x, y, size, size, { label: id }));
  const C = (from, to, extra = {}) => Make.connector(from, to, extra);
  const centred = (t, cx, y, extra) => { const n = note(t, cx, y, extra); n.x = cx - n.w / 2; return n; };

  TEMPLATES.push(
    { name: 'In vivo study timeline', desc: 'Timeline arrow with days, procedures and a treatment window', category: 'Experimental workflows', build() {
      const W = 1100, o = [title('Study design')];
      const days = ['Day −7', 'Day 0', 'Day 7', 'Day 14', 'Day 21', 'Day 28'];
      const x0 = 80, x1 = 1020, y = 300, axis = C({ x: x0, y }, { x: x1, y }, { width: 4, color: '#33475b', tickLabels: days.join(', '), labelSize: 14 });
      o.push(axis);
      const use = (x1 - x0) - (6 + 4 * 2.2) * 1.8, tx = (i) => x0 + (use * i) / (days.length - 1); // where the ticks fall
      const steps = [['mouse', 'Acclimatise'], ['s-tumour-bearing-mouse-xenograft', 'Tumour implant'], ['syringe', 'Start treatment'], ['r-digital-caliper', 'Measure tumours'], ['syringe', 'Last dose'], ['s-flow-cytometer', 'Endpoint analysis']];
      steps.forEach(([id, label], i) => {
        const ic = icon(id, tx(i) - 36, 170, 72);
        o.push(ic, centred(label, tx(i), 140, { bold: true, color: '#33475b' }));
        o.push(C({ x: tx(i), y: 252 }, { x: tx(i), y: 285 }, { head: 'arrow', width: 1.5, color: '#9aa7b4', headSize: 0.7 }));
      });
      o.push(C({ x: tx(2), y: 380 }, { x: tx(4), y: 380 }, { head: 'bar', tail: 'bar', headSize: 0.6, width: 2, color: '#3b6fd6', labelAbove: 'Treatment window', labelBelow: 'drug, 10 mg/kg i.p., 3× weekly' }));
      o.push(note('Tumour volume measured twice weekly from Day 7 (calipers).', 70, 440, { italic: true }));
      return { name: 'In vivo study timeline', width: W, height: 500, background: '#ffffff', objects: o };
    } },

    { name: 'Glycolysis: preparatory phase', desc: 'Metabolites, cofactors on side arrows, enzymes and allosteric regulation', category: 'Molecular biology', build() {
      const o = [title('Glycolysis — preparatory phase')];
      const met = (x, y, label) => box(x, y, 130, 54, label, { fill: '#eef4fb', stroke: '#4a7fd6' });
      const glc = met(40, 220, 'Glucose'), g6p = met(270, 220, 'G6P'), f6p = met(500, 220, 'F6P'), fbp = met(730, 220, 'F-1,6-BP');
      const g3p = met(960, 310, 'G3P'), dhap = met(960, 130, 'DHAP');
      o.push(glc, g6p, f6p, fbp, g3p, dhap);
      const step = { width: 2.5, color: '#2f3b48', labelSize: 13 };
      o.push(C({ id: glc.id, port: 'e' }, { id: g6p.id, port: 'w' }, { ...step, sideIn: 'ATP', sideOut: 'ADP', labelBelow: '{i|Hexokinase}' }));
      o.push(C({ id: g6p.id, port: 'e' }, { id: f6p.id, port: 'w' }, { ...step, head: 'harpoon', tail: 'harpoon', labelBelow: '{i|PGI}' }));
      const pfk = C({ id: f6p.id, port: 'e' }, { id: fbp.id, port: 'w' }, { ...step, sideIn: 'ATP', sideOut: 'ADP', labelBelow: '{b|PFK-1}' });
      o.push(pfk);
      const ald = C({ id: fbp.id, port: 'e' }, { id: g3p.id, port: 'w' }, { ...step, style: 'elbow', radius: 10, bend: 0.4 });
      o.push(ald, C({ id: ald.id, t: 0.3 }, { id: dhap.id, port: 'w' }, { ...step, tail: 'none', style: 'elbow', radius: 10 }));
      o.push(note('Aldolase', 870, 238, { italic: true }));
      o.push(C({ id: dhap.id, port: 's' }, { id: g3p.id, port: 'n' }, { ...step, head: 'harpoon', tail: 'harpoon', labelAlong: true, label: 'TPI' }));
      // Allosteric regulation of PFK-1, attached to the reaction itself.
      const cit = box(470, 400, 110, 44, 'Citrate', { fill: '#fdecec', stroke: '#d6584a', labelSize: 14 });
      const amp = box(640, 400, 110, 44, 'AMP', { fill: '#eaf6ee', stroke: '#3fa55b', labelSize: 14 });
      o.push(cit, amp);
      o.push(C({ id: cit.id, port: 'n' }, { id: pfk.id, t: 0.3 }, { head: 'bar', color: '#d6584a', width: 2, style: 'curved', curve: 20 }));
      o.push(C({ id: amp.id, port: 'n' }, { id: pfk.id, t: 0.7 }, { head: 'arrow', color: '#3fa55b', width: 2, dashStyle: 'dashed', style: 'curved', curve: -20 }));
      o.push(note('Citrate and ATP inhibit PFK-1; AMP relieves the inhibition.', 40, 470, { italic: true }));
      return { name: 'Glycolysis', width: 1130, height: 520, background: '#ffffff', objects: o };
    } },

    { name: 'Haematopoiesis lineage tree', desc: 'Stem cell to progenitors to mature blood cells, with branching lines', category: 'Immunology', build() {
      const o = [title('Haematopoietic lineages')];
      const cell = (id, x, y, label, size = 64) => { const ic = icon(id, x, y, size); o.push(ic, centred(label, x + size / 2, y + size + 4, { fontSize: 12, bold: true, color: '#33475b' })); return ic; };
      const hsc = cell('s-stem-cell', 40, 300, 'Haematopoietic stem cell', 80);
      const cmp = cell('s-stem-cell', 290, 160, 'Myeloid progenitor', 64);
      const clp = cell('s-lymphoid-progenitor', 290, 470, 'Lymphoid progenitor', 64);
      const tip = { style: 'elbow', radius: 8, width: 2, color: '#56657a' };
      o.push(C({ id: hsc.id, port: 'e' }, { id: cmp.id, port: 'w' }, tip), C({ id: hsc.id, port: 'e' }, { id: clp.id, port: 'w' }, tip));
      const my = [['s-red-blood-cell-soft', 'Erythrocyte'], ['s-platelet', 'Platelets'], ['s-neutrophil', 'Neutrophil'], ['s-monocyte', 'Monocyte'], ['s-eosinophil', 'Eosinophil']];
      const ly = [['s-t-cell', 'T cell'], ['s-b-cell', 'B cell'], ['s-nk-cell', 'NK cell']];
      my.forEach(([id, l], i) => { const c = cell(id, 560, 40 + i * 92, l, 56); o.push(C({ id: cmp.id, port: 'e' }, { id: c.id, port: 'w' }, tip)); });
      ly.forEach(([id, l], i) => { const c = cell(id, 560, 500 + i * 92, l, 56); o.push(C({ id: clp.id, port: 'e' }, { id: c.id, port: 'w' }, tip)); });
      o.push(note('Bone marrow', 40, 230, { italic: true }), note('Blood and tissues', 540, 10, { italic: true }));
      return { name: 'Haematopoiesis', width: 820, height: 790, background: '#ffffff', objects: o };
    } },

    { name: 'SBGN signalling map', desc: 'Process-description glyphs and arcs: association, catalysis, inhibition', category: 'Cell biology', build() {
      const o = [title('Growth-factor signalling (SBGN Process Description)')];
      const macro = (x, y, l) => box(x, y, 110, 52, l, { fill: '#ffffff', stroke: '#33475b', strokeWidth: 2 });
      const chem = (x, y, l) => Object.assign(Make.ellipse(x, y, 62, 62, { fill: '#ffffff', stroke: '#33475b' }), { label: l, labelSize: 13 });
      const proc = (x, y) => Make.rect(x, y, 30, 30, { fill: '#ffffff', stroke: '#33475b', radius: 0 });
      const egf = macro(40, 110, 'EGF'), egfr = macro(40, 260, 'EGFR');
      const assoc = Make.ellipse(240, 203, 20, 20, { fill: '#33475b', stroke: '#33475b' });
      const cx = Make.shape('sbgn_complex', 340, 160, 150, 110, { fill: '#ffffff', stroke: '#33475b' });
      cx.label = 'EGF:EGFR'; cx.labelSize = 14;
      const gdp = macro(560, 360, 'RAS·GDP'), gtp = macro(860, 360, 'RAS·GTP'), p1 = proc(740, 371);
      const gtpIn = chem(660, 470, 'GTP'), gdpOut = chem(830, 470, 'GDP');
      const inh = box(700, 160, 120, 50, 'Inhibitor X', { fill: '#fdecec', stroke: '#d6584a' });
      o.push(egf, egfr, assoc, cx, gdp, gtp, p1, gtpIn, gdpOut, inh);
      const arc = { width: 1.8, color: '#33475b' };
      o.push(C({ id: egf.id }, { id: assoc.id }, { ...arc, head: 'none' }), C({ id: egfr.id }, { id: assoc.id }, { ...arc, head: 'none' }), C({ id: assoc.id }, { id: cx.id, port: 'w' }, { ...arc, head: 'arrow' }));
      o.push(C({ id: gdp.id, port: 'e' }, { id: p1.id, port: 'w' }, { ...arc, head: 'none' }), C({ id: p1.id, port: 'e' }, { id: gtp.id, port: 'w' }, { ...arc, head: 'arrow' }));
      o.push(C({ id: gtpIn.id }, { id: p1.id, port: 's' }, { ...arc, head: 'none' }), C({ id: p1.id, port: 's' }, { id: gdpOut.id }, { ...arc, head: 'arrow' }));
      o.push(C({ id: cx.id, port: 's' }, { id: p1.id, at: [0.25, 0] }, { ...arc, head: 'circle', style: 'elbow', radius: 8 }));
      o.push(C({ id: inh.id, port: 's' }, { id: p1.id, at: [0.85, 0] }, { ...arc, head: 'bar', color: '#d6584a' }));
      o.push(note('Association (●), consumption (—), production (→), catalysis (○), inhibition (⊣).', 40, 560, { italic: true }));
      return { name: 'SBGN map', width: 1020, height: 600, background: '#ffffff', objects: o };
    } },
  );
  if (typeof TEMPLATE_CATEGORY !== 'undefined') TEMPLATES.forEach((t) => { if (!t.category) t.category = 'Other'; });
})();
