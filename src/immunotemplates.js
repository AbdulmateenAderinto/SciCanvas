// Immunology & cancer templates, drawn with the soft icon set. Captions use word-level colour markup.

(() => {
  const CAT = 'Immunology & cancer';
  const ic = (id, x, y, size, extra = {}) => Make.icon(id, x, y, size, extra);
  const T = (text, x, y, extra = {}) => Make.text(text, x, y, { fontSize: 14, ...extra });
  const centred = (text, cx, y, extra = {}) => { const t = T(text, 0, y, { align: 'center', ...extra }); t.x = cx - t.w / 2; return t; };
  const title = (o, text) => o.push(Make.text(text, 40, 22, { fontSize: 28, family: 'serif' }));
  const panel = (o, x, y, w, h, n) => {
    o.push(Make.rect(x, y, w, h, { fill: '#fcf8e8', stroke: '#e3d9a8', strokeWidth: 2, radius: 16, name: `Panel ${n}` }));
    o.push(Make.text(`${n}.`, x + 22, y + 18, { fontSize: 24 }));
  };
  const oval = (label, cx, cy, rot = 0, w = 78) => Make.ellipse(cx - w / 2, cy - w * 0.28, w, w * 0.56, { fill: '#f6efcf', stroke: '#8a7a3a', strokeWidth: 1.4, label, labelSize: 12, labelColor: '#3b3418', rot, name: label });
  const step = (o, x, y, w, h, head, body, c) => {
    o.push(Make.rect(x, y, w, h, { fill: Color.light(c, 0.9), stroke: c, radius: 14 }));
    o.push(Make.text(head, x + 14, y + 12, { fontSize: 15, bold: true, color: Color.dark(c, 0.35) }));
    if (body) o.push(Make.text(body, x + 14, y + 36, { fontSize: 12, color: '#333333' }));
    return o[o.length - (body ? 3 : 2)];
  };
  // Ligase core used in the mechanism panels: halo, two scaffolds, two green S-subunits, adaptors and substrates.
  const ligaseCore = (o, cx, cy, { ub = false } = {}) => {
    o.push(ic('sp-halo', cx - 140, cy - 140, 280, { color: '#cfe3f2' }));
    o.push(ic('sp-y', cx - 205, cy - 50, 100, { color: '#3e6db5', rot: -90 }), ic('sp-y', cx + 105, cy - 50, 100, { color: '#3e6db5', rot: 90 }));
    for (const [dy, flip] of [[-1, false], [1, true]]) {
      const y = cy + dy * 88 - 45;
      o.push(ic('sp-s', cx - 52, y, 90, { color: '#a9c9a4', flipX: !flip, flipY: flip }), ic('sp-s', cx - 38, y, 90, { color: '#4e9a4e', flipX: flip, flipY: flip }));
      o.push(oval('Adaptor', cx - 34, cy + dy * 40, dy * -18, 70), oval('Adaptor', cx + 34, cy + dy * 40, dy * 18, 70));
      o.push(ic('sp-c', cx - 52, cy + dy * 12 - 25, 50, { color: '#b9a6dc', flipY: flip }), ic('sp-c', cx + 2, cy + dy * 12 - 25, 50, { color: '#8b62c4', flipX: true, flipY: flip }));
      if (ub) o.push(ic('pd-polyub', cx - 100, cy + dy * 12 - 12, 46), ic('pd-polyub', cx + 54, cy + dy * 12 - 12, 46));
    }
  };

  TEMPLATES.push(
    { name: 'Mechanism in 3 steps (adaptor-mediated degradation)', desc: 'Three numbered panels: recruitment → ubiquitination → proteasomal degradation, with coloured captions', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'An adaptor mediates substrate degradation');
      const W = 400, H = 560, top = 110;
      [0, 1, 2].forEach((i) => panel(o, 30 + i * 440, top, W, H, i + 1));
      ligaseCore(o, 230, 360);
      ligaseCore(o, 670, 360, { ub: true });
      const sub = ic('pd-ubsubstrate', 1060, 150, 90);
      const prot = ic('pd-proteasome', 1080, 270, 130, { color: '#3a8dc4' });
      const frag = ic('pd-fragments', 1050, 440, 110);
      o.push(sub, prot, frag, Make.connector(sub, prot, { width: 1.5 }), Make.connector(prot, frag, { width: 1.5 }));
      o.push(centred('The adaptor recruits the substrate to\nthe catalytic core of the ligase complex', 230, 580, { fontSize: 16 }));
      o.push(centred('{#c9a227|Substrate marked with ubiquitin} by\nthe E3 enzyme within the complex', 670, 580, { fontSize: 16 }));
      o.push(centred('{#d64545|Substrate degraded by the\nproteasome}, {#3fa55b|enabling the\ndownstream response}', 1110, 572, { fontSize: 16 }));
      o.push(T('Author et al. Year, Journal', 30, 690, { fontSize: 12, color: '#666666' }));
      return { name: 'Mechanism', width: 1360, height: 720, background: '#ffffff', objects: o };
    } },
    { name: 'Ubiquitin–proteasome pathway', desc: 'E1 → E2 → E3 → polyubiquitinated substrate → 26S proteasome → peptides; DUB reversal', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'The ubiquitin–proteasome system');
      const ub = ic('pd-ub', 40, 150, 60), e1 = ic('pd-e1', 160, 130, 110), e2 = ic('pd-e2', 340, 130, 110), e3 = ic('pd-e3', 530, 120, 130);
      const tagged = ic('pd-ubsubstrate', 740, 130, 110), prot = ic('pd-proteasome', 930, 90, 170), pep = ic('pd-fragments', 1100, 140, 100), dub = ic('pd-dub', 620, 330, 100);
      o.push(ub, e1, e2, e3, tagged, prot, pep, dub);
      o.push(Make.connector(ub, e1, { label: 'ATP' }), Make.connector(e1, e2, { label: 'transfer' }), Make.connector(e2, e3), Make.connector(e3, tagged, { label: 'K48 chain' }), Make.connector(tagged, prot), Make.connector(prot, pep));
      o.push(Make.connector(dub, tagged, { head: 'arrow', style: 'curved', curve: -40, dash: true, color: '#e07b39', label: 'removes Ub' }));
      [['Ubiquitin', ub], ['E1 activating', e1], ['E2 conjugating', e2], ['E3 ligase\n(substrate specificity)', e3], ['Polyubiquitinated\nsubstrate', tagged], ['26S proteasome', prot], ['Peptides', pep], ['Deubiquitinase', dub]].forEach(([t, ob]) => o.push(centred(t, ob.x + ob.w / 2, ob.y + ob.h + 8, { fontSize: 13, bold: true })));
      return { name: 'Ubiquitin–proteasome', width: 1240, height: 500, background: '#ffffff', objects: o };
    } },
    { name: 'Immune synapse (APC – T cell)', desc: 'Signal 1 (MHC–peptide/TCR), signal 2 (B7/CD28), signal 3 (cytokines), CD4 co-receptor', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'The immunological synapse');
      // Facing membranes at x = 420 (APC) and x = 600 (T cell); rotated icons put their membrane on those edges.
      o.push(Make.rect(40, 90, 380, 460, { fill: '#fdf3e2', stroke: '#e8a33c', radius: 40, name: 'APC' }), Make.rect(600, 90, 380, 460, { fill: '#e6f4f0', stroke: '#3fa58b', radius: 40, name: 'T cell' }));
      o.push(ic('im-dc', 110, 200, 200), ic('im-tcell', 720, 230, 160));
      o.push(T('Antigen-presenting cell', 70, 515, { bold: true, color: '#9a6a1a' }), T('CD4⁺ T cell', 860, 515, { bold: true, color: '#1f6e5a' }));
      o.push(ic('im-mhc2', 401, 130, 120, { rot: 90 }), ic('im-tcr', 499, 130, 120, { rot: -90 }), ic('im-cd4', 516, 250, 100, { rot: -90 }), ic('im-fcr', 401, 360, 120, { rot: 90, color: '#e07b39' }), ic('im-fcr', 499, 360, 120, { rot: -90, color: '#4e9a4e' }));
      o.push(ic('im-cytokine', 470, 470, 44), ic('im-cytokine', 520, 500, 36), ic('im-cytokine', 450, 515, 30));
      o.push(T('{b|Signal 1}  MHC II–peptide : TCR', 380, 100, { fontSize: 13 }), T('CD4', 548, 238, { fontSize: 12, bold: true }), T('B7', 440, 350, { fontSize: 12, bold: true }), T('CD28', 535, 350, { fontSize: 12, bold: true }));
      o.push(T('{b|Signal 2}  B7 (CD80/86) : CD28', 380, 560, { fontSize: 13 }), T('{b|Signal 3}  cytokines (IL-12, IL-6…)', 380, 580, { fontSize: 13 }));
      return { name: 'Immune synapse', width: 1020, height: 620, background: '#ffffff', objects: o };
    } },
    { name: 'Class-switch recombination & SHM', desc: 'Germinal centre B cell: AID deamination → UNG / mismatch repair → somatic hypermutation or class switching', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'AID-initiated antibody diversification');
      const gc = ic('im-gc', 40, 110, 200), aid = ic('im-aid', 330, 120, 130), ung = ic('im-ung', 560, 120, 130);
      const shm = step(o, 800, 80, 300, 120, 'Somatic hypermutation', 'Point mutations in V(D)J\n→ affinity maturation', '#4a7fd6');
      const csr = step(o, 800, 260, 300, 120, 'Class-switch recombination', 'Sμ–Sγ/α/ε breaks joined\n→ IgG, IgA, IgE', '#3fa58b');
      o.push(gc, aid, ung, ic('im-csr', 940, 390, 150), ic('im-plasma', 360, 360, 120), ic('im-igg', 560, 380, 110));
      o.push(Make.connector(gc, aid, { label: 'activated B cell' }), Make.connector(aid, ung, { label: 'C → U' }), Make.connector(ung, shm, { label: 'abasic site, error-prone repair' }), Make.connector(ung, csr, { label: 'DSB in S regions', style: 'curved', curve: 30 }));
      o.push(centred('Germinal centre', 140, 320, { bold: true }), centred('AID deaminates\ncytidine in ssDNA', 395, 265, { fontSize: 12 }), centred('UNG removes uracil', 625, 265, { fontSize: 12 }), centred('Plasma cell → secreted\nhigh-affinity antibody', 520, 500, { fontSize: 12 }));
      return { name: 'CSR & SHM', width: 1140, height: 560, background: '#ffffff', objects: o };
    } },
    { name: 'Tumour microenvironment', desc: 'Tumour cells with CAFs, TAMs, T cells, Tregs, NK cells, MDSC and vessels', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'The tumour microenvironment');
      o.push(Make.brush('vessel', 40, 470, 1000, 70, Shapes.wave(), { size: 9, color: '#d6584a' }));
      const pos = [[360, 160], [450, 130], [420, 240], [520, 220], [330, 270], [500, 320], [600, 170]];
      pos.forEach(([x, y], i) => o.push(ic(i === 6 ? 'ca-mitosis' : 'ca-tumour', x, y, i === 6 ? 110 : 100)));
      const caf = ic('ca-caf', 120, 160, 150), caf2 = ic('ca-caf', 700, 330, 150), tam = ic('im-macrophage', 140, 300, 110), t8 = ic('im-tcell', 760, 140, 90, { color: '#d6584a' }), treg = ic('im-tcell', 880, 220, 80, { color: '#9b6bc4' }), nk = ic('im-nk', 650, 60, 80), mdsc = ic('im-neutrophil', 240, 390, 80);
      o.push(caf, caf2, tam, t8, treg, nk, mdsc);
      [['CAF', caf], ['TAM (M2)', tam], ['CD8⁺ T cell', t8], ['Treg', treg], ['NK cell', nk], ['MDSC', mdsc]].forEach(([t, ob]) => o.push(centred(t, ob.x + ob.w / 2, ob.y + ob.h + 4, { fontSize: 13, bold: true })));
      o.push(centred('Tumour cells', 470, 420, { fontSize: 14, bold: true, color: '#a8473a' }), T('Blood vessel', 50, 545, { fontSize: 12, italic: true, color: '#a8473a' }));
      o.push(Make.connector(treg, t8, { head: 'bar', color: '#9b6bc4', label: 'suppression' }), Make.connector(t8, { x: 640, y: 230 }, { color: '#d6584a', label: 'killing' }), Make.connector(caf, { x: 340, y: 200 }, { dash: true, label: 'ECM, TGF-β' }));
      return { name: 'Tumour microenvironment', width: 1080, height: 580, background: '#ffffff', objects: o };
    } },
    { name: 'Cancer–immunity cycle', desc: 'Seven steps: antigen release → presentation → priming → trafficking → infiltration → recognition → killing', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'The cancer–immunity cycle');
      const steps = [['1 Release of\ncancer antigens', 'ca-apoptotic'], ['2 Antigen\npresentation', 'im-dc'], ['3 Priming &\nactivation', 'im-mhc1'], ['4 Trafficking of\nT cells', 'im-tcell'], ['5 Infiltration\ninto tumour', 'ca-tumourmass'], ['6 Recognition of\ncancer cells', 'im-tcr'], ['7 Killing of\ncancer cells', 'im-perforin']];
      const cx = 540, cy = 340, R = 220, nodes = [];
      steps.forEach(([lab, id], i) => {
        const a = -Math.PI / 2 + (i / steps.length) * 2 * Math.PI, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        const n = ic(id, x - 40, y - 40, 80);
        nodes.push(n);
        o.push(n, centred(lab, x, y + 44, { fontSize: 12, bold: true }));
      });
      nodes.forEach((n, i) => o.push(Make.connector(n, nodes[(i + 1) % nodes.length], { style: 'curved', curve: 30, color: '#4a7fd6' })));
      o.push(centred('Checkpoint blockade acts at steps 3 and 7\n(anti-CTLA-4 priming; anti-PD-1/PD-L1 effector phase)', cx, cy - 20, { fontSize: 13, color: '#555555' }));
      return { name: 'Cancer–immunity cycle', width: 1080, height: 680, background: '#ffffff', objects: o };
    } },
    { name: 'CAR-T cell therapy workflow', desc: 'Leukapheresis → activation → CAR transduction → expansion → infusion → tumour killing', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'CAR-T cell manufacture and therapy');
      const items = [['Leukapheresis', 'human'], ['T-cell activation\n(anti-CD3/CD28)', 'im-tcell'], ['CAR gene transfer\n(lentivirus)', 'virus'], ['Expansion', 'ca-cart'], ['Infusion', 'syringe'], ['Tumour killing', 'ca-apoptotic']];
      let prev = null;
      items.forEach(([lab, id], i) => {
        const x = 50 + i * 180, n = ic(id, x, 160, id === 'syringe' ? 110 : 100);
        o.push(n, centred(lab, x + 50, 290, { fontSize: 13, bold: true }));
        if (prev) o.push(Make.connector(prev, n));
        prev = n;
      });
      o.push(ic('ca-car', 480, 360, 150), T('CAR construct:\n{b#e07b39|scFv} – hinge – TM –\n{b#3e6db5|CD28} / {b#9b6bc4|4-1BB} – {b#3fa58b|CD3ζ}', 560, 390, { fontSize: 13 }));
      return { name: 'CAR-T workflow', width: 1150, height: 540, background: '#ffffff', objects: o };
    } },
    { name: 'Antibody–drug conjugate mechanism', desc: 'ADC binds antigen → internalisation → lysosomal release → payload kills cell (+ bystander)', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'How an antibody–drug conjugate works');
      o.push(Make.ellipse(150, 110, 800, 440, { fill: '#fdeceb', stroke: '#d6584a', strokeWidth: 3, name: 'Tumour cell' }));
      const adc = ic('ca-adc', 470, 40, 110), endo = Make.ellipse(270, 250, 110, 110, { fill: '#fff7f0', stroke: '#e8b45a', strokeWidth: 3, label: 'Endosome', labelSize: 12 }), lys = ic('pd-lysosome', 470, 250, 110), drug = ic('smallmol', 680, 270, 70, { color: '#d6584a' }), nuc = Make.ellipse(640, 380, 170, 120, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true, label: 'DNA / microtubules', labelSize: 12 });
      o.push(adc, endo, lys, drug, nuc);
      o.push(Make.connector(adc, endo, { label: '1 bind & internalise', style: 'curved', curve: -40 }), Make.connector(endo, lys, { label: '2 traffic' }), Make.connector(lys, drug, { label: '3 linker cleaved' }), Make.connector(drug, nuc, { label: '4 cytotoxicity' }), Make.connector(drug, { x: 1000, y: 300 }, { dash: true, label: 'bystander effect' }));
      o.push(T('Tumour cell expressing target antigen', 180, 520, { fontSize: 13, italic: true, color: '#a8473a' }));
      return { name: 'ADC mechanism', width: 1080, height: 580, background: '#ffffff', objects: o };
    } },
    { name: 'JAK–STAT cytokine signalling', desc: 'Cytokine → receptor dimer → JAK trans-phosphorylation → STAT dimer → nuclear transcription', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'JAK–STAT signalling');
      o.push(Make.brush('membrane', 40, 190, 900, 36, Shapes.line(), { size: 8 }));
      const cyt = ic('im-cytokine', 410, 70, 70), rec = ic('im-cytokiner', 380, 150, 140), stat = ic('im-stat', 400, 330, 100);
      const nuc = Make.ellipse(560, 380, 360, 180, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true });
      o.push(cyt, rec, stat, nuc, Make.brush('dna', 600, 460, 280, 30, Shapes.line(), { size: 7 }));
      o.push(Make.connector(cyt, rec, { label: 'binding' }), Make.connector(rec, stat, { label: 'JAK → STAT-P' }), Make.connector(stat, nuc, { label: 'dimer → nucleus' }));
      o.push(T('Nucleus: target genes (e.g. SOCS, IRF1)', 590, 400, { fontSize: 13, italic: true, color: '#7a5fb0' }));
      return { name: 'JAK–STAT', width: 980, height: 600, background: '#ffffff', objects: o };
    } },
    { name: 'Flow cytometry gating strategy', desc: 'FSC/SSC → singlets → live → CD3⁺ → CD4 vs CD8, as stylised gate panels', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'Gating strategy');
      const gates = [['FSC-A', 'SSC-A', 'Lymphocytes'], ['FSC-A', 'FSC-H', 'Singlets'], ['Live/Dead', 'SSC-A', 'Live'], ['CD3', 'SSC-A', 'CD3⁺'], ['CD4', 'CD8', 'CD4⁺ / CD8⁺']];
      let prev = null;
      gates.forEach(([xl, yl, name], i) => {
        const x = 40 + i * 215, y = 110, s = 170;
        const box = Make.rect(x, y, s, s, { fill: '#ffffff', stroke: '#555555', strokeWidth: 1.2, radius: 0, name });
        o.push(box);
        let r = 7 + i;
        const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
        const clusters = i === 4 ? [[0.25, 0.7, '#3e6db5'], [0.72, 0.25, '#d6584a'], [0.2, 0.2, '#9aa7b4']] : [[0.45 + (i === 1 ? 0.05 : 0), i === 1 ? 0.45 : 0.35, '#3e6db5'], [0.75, 0.7, '#9aa7b4']];
        clusters.forEach(([cx, cy, col]) => { for (let k = 0; k < 45; k++) { const d = Make.ellipse(x + s * (cx + (rnd() - 0.5) * 0.28), y + s * (1 - cy - (rnd() - 0.5) * 0.28), 3.4, 3.4, { fill: col, stroke: 'none', strokeWidth: 0, opacity: 0.75 }); o.push(d); } });
        const gate = i === 4 ? [[0.05, 0.06, 0.42, 0.4], [0.52, 0.5, 0.43, 0.42]] : [[clusters[0][0] - 0.2, 1 - clusters[0][1] - 0.2, 0.4, 0.4]];
        gate.forEach(([gx, gy, gw, gh]) => o.push(Make.rect(x + s * gx, y + s * gy, s * gw, s * gh, { fill: 'none', stroke: '#111111', strokeWidth: 1.5, radius: 10 })));
        o.push(centred(xl, x + s / 2, y + s + 4, { fontSize: 11 }), T(yl, x - 26, y + s / 2 + 18, { fontSize: 11, rot: -90 }), centred(name, x + s / 2, y - 22, { fontSize: 13, bold: true }));
        if (prev) o.push(Make.connector({ x: x - 40, y: y + s / 2 }, { x: x - 8, y: y + s / 2 }, { width: 2 }));
        prev = box;
      });
      return { name: 'Gating strategy', width: 1110, height: 340, background: '#ffffff', objects: o };
    } },
    { name: 'In vivo tumour model timeline', desc: 'Day 0 inoculation → randomisation → dosing → tumour measurement → endpoint', category: CAT, author: 'SciCanvas', build() {
      const o = [];
      title(o, 'Syngeneic tumour model: study design');
      o.push(Make.rect(80, 300, 900, 6, { fill: '#555555', stroke: 'none', radius: 3 }));
      const ev = [[0, 'Day 0', 'Inoculate tumour cells\n(s.c., 5×10⁵)', 'ca-tumour'], [7, 'Day 7', 'Randomise when\n~100 mm³', 'ca-xenograft'], [8, 'Days 8–20', 'Treatment\n(e.g. anti-PD-1 i.p., q3d)', 'syringe'], [14, 'Every 2–3 d', 'Calliper measurement\nV = L × W² / 2', 'clock'], [21, 'Day 21', 'Endpoint: tumours,\nspleen, flow cytometry', 'ca-flow']];
      ev.forEach(([d, day, what, id], i) => {
        const x = 80 + (d / 21) * 900;
        o.push(Make.ellipse(x - 8, 295, 16, 16, { fill: '#4a7fd6', stroke: '#ffffff', strokeWidth: 2 }));
        const up = i % 2 === 0;
        o.push(ic(id, x - 40, up ? 110 : 350, 80), centred(`{b|${day}}\n${what}`, x, up ? 200 : 440, { fontSize: 12 }));
      });
      [8, 11, 14, 17, 20].forEach((d) => o.push(Make.shape('triangle', 80 + (d / 21) * 900 - 6, 280, 12, 12, { fill: '#e07b39', stroke: 'none', rot: 180 })));
      return { name: 'Tumour model timeline', width: 1060, height: 560, background: '#ffffff', objects: o };
    } },
  );
})();
