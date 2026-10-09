// More templates (v0.9), chosen from the topics scientists ask for most often: drug delivery, vaccines,
// genome editing, haematopoiesis, EMT, extracellular vesicles, the gut–brain axis, omics and machine-learning
// workflows, 2D vs 3D culture, wound healing, antibiotic resistance, hybridoma antibodies, the drug pipeline,
// trial phases and bioprinting. All original artwork built from library icons, shapes and live charts.

// Icon by name (falls back to a labelled circle so a template never breaks if an icon set changes).
function tIcon(key, x, y, size, extra = {}) {
  const id = findIcon(key) || null;
  if (!id) return Make.ellipse(x, y, size, size, { fill: '#eef1f6', stroke: '#9aa5b5', label: key, labelSize: 11, ...extra });
  const o = Make.icon(id, x, y, size, extra);
  o.x = x + (size - o.w) / 2; o.y = y + (size - o.h) / 2;
  return o;
}
const tTitle = (t, sub) => [Make.text(t, 30, 20, { fontSize: 26, bold: true, color: '#23395d' }), ...(sub ? [Make.text(sub, 32, 56, { fontSize: 14, italic: true, color: '#666666' })] : [])];
const tLabel = (t, cx, y, extra = {}) => { const o = Make.text(t, 0, y, { fontSize: 13, bold: true, align: 'center', ...extra }); o.x = cx - o.w / 2; return o; };
// A row of icon steps joined by arrows: steps = [[label, iconKey, note?]].
function tFlow(steps, { x = 40, y = 120, gap = 170, size = 80, colour = '#4a7fd6', numbered = true } = {}) {
  const o = [], nodes = [];
  steps.forEach(([lab, key, note], i) => {
    const cx = x + i * gap + size / 2, ic = tIcon(key, cx - size / 2, y, size);
    nodes.push(ic); o.push(ic);
    o.push(tLabel(`${numbered ? `${i + 1}. ` : ''}${lab}`, cx, y + size + 10, { color: '#23395d' }));
    if (note) o.push(tLabel(note, cx, y + size + 30, { bold: false, fontSize: 11, color: '#666666' }));
  });
  nodes.forEach((n, i) => { if (i) o.push(Make.connector(nodes[i - 1], n, { color: colour, width: 2.2 })); });
  return { o, nodes };
}
const tPage = (name, width, height, objects) => ({ name, width, height, background: '#ffffff', objects });
const tBox = (label, x, y, w, h, col, extra = {}) => Make.rect(x, y, w, h, { fill: Color.light(col, 0.88), stroke: col, strokeWidth: 1.6, radius: 10, label, labelSize: 13, labelBold: true, labelColor: Color.dark(col, 0.5), ...extra });

TEMPLATES.push(
  { name: 'mRNA delivery by lipid nanoparticle', desc: 'LNP uptake → endosomal escape → translation', category: 'Drug delivery', build() {
    const o = tTitle('Lipid nanoparticle (LNP) mRNA delivery');
    const cell = Make.ellipse(220, 110, 760, 470, { fill: '#fff8f0', stroke: '#e8b45a', strokeWidth: 3, name: 'Cell' });
    const nuc = Make.ellipse(760, 330, 190, 150, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true, label: 'Nucleus\n(mRNA acts in the cytoplasm)', labelSize: 11, labelColor: '#7a5fb0' });
    const lnp = tIcon('lipid nanoparticle', 70, 240, 90), endo = Make.ellipse(330, 260, 150, 120, { fill: '#e8f0fb', stroke: '#4a7fd6', label: '', name: 'Endosome' });
    const lnp2 = tIcon('lipid nanoparticle', 370, 285, 60), mrna = tIcon('mRNA', 540, 210, 70), ribo = tIcon('ribosome translating mRNA', 560, 380, 90), prot = tIcon('protein', 760, 170, 60, { color: '#3fa58b' });
    o.push(cell, nuc, lnp, endo, lnp2, mrna, ribo, prot);
    o.push(Make.connector(lnp, endo, { label: '1. endocytosis' }), Make.connector(endo, mrna, { label: '2. endosomal escape', labelItalic: true }), Make.connector(mrna, ribo, { label: '3. translation' }), Make.connector(ribo, prot, { style: 'curved', curve: -60, label: '4. protein' }));
    o.push(tLabel('Ionisable lipid becomes positively charged at endosomal pH and disrupts the membrane', 600, 600, { bold: false, fontSize: 12, color: '#666666' }));
    return tPage('LNP delivery', 1000, 640, o);
  } },
  { name: 'mRNA vaccine: immune response', desc: 'Antigen expression → presentation → T and B cell responses', category: 'Immunology', build() {
    const o = tTitle('How an mRNA vaccine trains the immune system');
    const f = tFlow([['Injection', 'syringe', 'LNP-mRNA, intramuscular'], ['Antigen made', 'dendritic cell', 'by muscle & dendritic cells'], ['Presented to T cells', 'T cell', 'lymph node, on MHC'], ['B cells activated', 'B cell', 'helped by CD4 T cells'], ['Antibodies', 'plasma cell', 'plasma cells secrete']], { y: 130, gap: 185, size: 86 });
    o.push(...f.o);
    const ab = tIcon('antibody', 820, 300, 60), mem = tBox('Memory B and T cells\n→ faster response on exposure', 560, 400, 330, 64, '#3fa58b');
    const ctl = tBox('CD8 T cells kill\ninfected cells', 330, 400, 220, 64, '#d6584a');
    const under = (n) => ({ x: n.x + n.w / 2, y: 280 });
    o.push(ab, mem, ctl, Make.connector({ x: 851, y: 270 }, ab), Make.connector(under(f.nodes[2]), ctl, { dash: true }), Make.connector(under(f.nodes[3]), mem, { dash: true }));
    return tPage('mRNA vaccine', 1000, 520, o);
  } },
  { name: 'CRISPR–Cas9 genome editing', desc: 'Cas9 + guide RNA → double-strand break → NHEJ or HDR', category: 'Molecular biology', build() {
    const o = tTitle('CRISPR–Cas9 genome editing');
    const cas = tIcon('Cas9', 60, 110, 120), dsb = tIcon('DNA double-strand break', 330, 120, 110);
    o.push(cas, tLabel('Cas9 + sgRNA', 120, 236), dsb, tLabel('Double-strand break\n3 bp upstream of the PAM (NGG)', 385, 236, { bold: false, fontSize: 12 }));
    o.push(Make.connector(cas, dsb, { label: 'guide pairs with target' }));
    const nhej = tBox('NHEJ (error-prone)\nsmall insertions / deletions\n→ frameshift → knockout', 600, 100, 300, 86, '#d6584a'), hdr = tBox('HDR (needs donor template)\nprecise insertion or base change\n→ knock-in / correction', 600, 230, 300, 86, '#3fa58b');
    o.push(nhej, hdr, Make.connector(dsb, nhej, { style: 'elbow' }), Make.connector(dsb, hdr, { style: 'elbow' }));
    o.push(Make.text('HDR is mostly active in S/G2;\nNHEJ dominates in non-dividing cells.', 600, 330, { fontSize: 12, italic: true, color: '#666666' }));
    return tPage('CRISPR', 940, 380, o);
  } },
  { name: 'Haematopoiesis', desc: 'Stem cell → myeloid and lymphoid lineages', category: 'Cell biology', build() {
    const o = tTitle('Haematopoiesis', 'Classical hierarchy (simplified)');
    const at = (key, label, x, y, s = 70) => { const ic = tIcon(key, x, y, s); o.push(ic, tLabel(label, x + s / 2, y + s + 4, { fontSize: 12 })); return ic; };
    const hsc = at('haematopoietic stem cell', 'HSC', 470, 90, 84);
    const cmp = at('stem cell', 'Common myeloid\nprogenitor', 250, 230), clp = at('stem cell', 'Common lymphoid\nprogenitor', 700, 230);
    const ery = at('red blood cell', 'Erythrocyte', 40, 400), mk = at('megakaryocyte', 'Megakaryocyte', 170, 400), neu = at('neutrophil', 'Neutrophil', 300, 400), mono = at('monocyte', 'Monocyte', 430, 400);
    const plt = at('platelet', 'Platelets', 170, 540, 50), mac = at('macrophage', 'Macrophage', 430, 530, 60);
    const b = at('B cell', 'B cell', 610, 400), t = at('T cell', 'T cell', 740, 400), nk = at('NK cell', 'NK cell', 870, 400);
    const ln = (a, c) => o.push(Make.connector(a, c, { color: '#777777', width: 1.6 }));
    [[hsc, cmp], [hsc, clp], [cmp, ery], [cmp, mk], [cmp, neu], [cmp, mono], [mk, plt], [mono, mac], [clp, b], [clp, t], [clp, nk]].forEach(([a, c]) => ln(a, c));
    o.push(Make.text('Myeloid', 40, 330, { fontSize: 15, bold: true, color: '#e8743b' }), Make.text('Lymphoid', 880, 330, { fontSize: 15, bold: true, color: '#4a7fd6' }));
    return tPage('Haematopoiesis', 1000, 640, o);
  } },
  { name: 'Epithelial–mesenchymal transition (EMT)', desc: 'Loss of polarity and E-cadherin; gain of motility', category: 'Cancer biology', build() {
    const o = tTitle('Epithelial–mesenchymal transition');
    const epi = tIcon('epithelial cell', 70, 140, 130), mes = tIcon('fibroblast', 680, 150, 150);
    o.push(epi, mes, tLabel('Epithelial', 135, 290), tLabel('Mesenchymal', 755, 290));
    const arr = Make.shape('arrow', 260, 170, 380, 70, { fill: '#e8743b', stroke: 'none', label: 'TGF-β · Wnt · hypoxia', labelColor: '#ffffff', labelBold: true, labelSize: 14 });
    o.push(arr, tLabel('Transcription factors: SNAIL, SLUG, TWIST, ZEB1/2', 450, 250, { bold: false, fontSize: 12 }));
    o.push(tBox('Lost: E-cadherin, claudins,\napical–basal polarity', 40, 340, 260, 66, '#4a7fd6'), tBox('Gained: N-cadherin, vimentin,\nfibronectin, motility, invasion', 630, 340, 280, 66, '#d6584a'));
    o.push(dgPoly([[540, 366], [410, 366], [410, 354], [380, 378], [410, 402], [410, 390], [540, 390]], { fill: '#9aa5b5', stroke: 'none', name: 'MET arrow' }), tLabel('MET (reverse)', 470, 370, { color: '#ffffff', fontSize: 12 }));
    return tPage('EMT', 950, 440, o);
  } },
  { name: 'Extracellular vesicle biogenesis', desc: 'Exosomes from multivesicular bodies, microvesicles from the membrane', category: 'Cell biology', build() {
    const o = tTitle('Extracellular vesicles');
    const cell = Make.ellipse(80, 100, 560, 400, { fill: '#fff8f0', stroke: '#e8b45a', strokeWidth: 3, name: 'Cell' });
    const nuc = Make.ellipse(130, 260, 150, 120, { fill: '#f1ebfa', stroke: '#9b7fd1', label: 'Nucleus', labelSize: 12 });
    const ee = Make.ellipse(300, 180, 80, 70, { fill: '#e8f0fb', stroke: '#4a7fd6', label: 'Early\nendosome', labelSize: 10 });
    const mvb = Make.ellipse(400, 290, 120, 110, { fill: '#e8f0fb', stroke: '#4a7fd6', name: 'Multivesicular body' });
    o.push(cell, nuc, ee, mvb);
    for (let i = 0; i < 6; i++) o.push(Make.ellipse(420 + (i % 3) * 28, 315 + Math.floor(i / 3) * 34, 22, 22, { fill: '#9ccc65', stroke: '#5a9e4b', strokeWidth: 1.2 }));
    o.push(tLabel('MVB (intraluminal vesicles, ESCRT)', 460, 405, { fontSize: 11 }), Make.connector(ee, mvb));
    const exo = tIcon('extracellular vesicle exosome', 700, 300, 60), mv = Make.ellipse(520, 112, 64, 64, { fill: '#ffe0b2', stroke: '#e8743b', name: 'Microvesicle' });
    o.push(exo, mv, Make.connector(mvb, exo, { label: 'fusion with plasma membrane' }), tLabel('Exosomes\n30–150 nm', 730, 370), tLabel('Microvesicles 100–1000 nm\n(bud from the membrane)', 700, 120, { fontSize: 12 }));
    o.push(Make.text('Cargo: proteins (CD9, CD63, CD81, TSG101), mRNA, miRNA, lipids', 80, 520, { fontSize: 12, italic: true, color: '#666666' }));
    return tPage('Extracellular vesicles', 860, 560, o);
  } },
  { name: 'Gut–brain axis', desc: 'Microbiota, vagus nerve, immune and endocrine signals', category: 'Physiology', build() {
    const o = tTitle('The gut–brain axis');
    const brain = tIcon('brain', 40, 200, 150), gut = tIcon('enterocyte', 720, 215, 120), bac = tIcon('bacterium', 760, 345, 60);
    o.push(brain, gut, bac, tLabel('Brain', 115, 360), tLabel('Gut epithelium\n& microbiota', 780, 410));
    const routes = [['Vagus nerve', '#9b7fd1'], ['Immune signalling (cytokines)', '#d6584a'], ['Microbial metabolites (SCFAs, tryptophan)', '#3fa58b'], ['Endocrine (HPA axis, cortisol)', '#e8b33c']];
    routes.forEach(([t, c], i) => { const b = tBox(t, 280, 110 + i * 85, 340, 52, c); o.push(b, Make.connector({ id: brain.id, port: 'e' }, { id: b.id, port: 'w' }, { head: 'arrow', tail: 'arrow', color: c, style: 'elbow' }), Make.connector({ id: b.id, port: 'e' }, { id: gut.id, port: 'w' }, { head: 'arrow', tail: 'arrow', color: c, style: 'elbow' })); });
    o.push(Make.text('Signals run both ways: the brain alters gut motility, secretion and barrier function.', 280, 460, { fontSize: 12, italic: true, color: '#666666' }));
    return tPage('Gut–brain axis', 900, 500, o);
  } },
  { name: 'Bulk RNA-seq workflow', desc: 'Sample to differentially expressed genes, with a live volcano plot', category: 'Omics & data science', build() {
    const o = tTitle('RNA-seq workflow');
    const f = tFlow([['Samples', 'eppendorf'], ['RNA extraction', 'mRNA', 'RIN ≥ 7'], ['Library prep', 'thermocycler', 'poly-A or rRNA depletion'], ['Sequencing', 'sequencer', '20–30 M reads'], ['Analysis', 'computer', 'align → count → DESeq2']], { y: 110, gap: 175, size: 80 });
    o.push(...f.o);
    const ch = Make.chart({ kind: 'volcano', data: SAMPLE_DATA.volcano, title: 'Treated vs control', xLabel: 'log₂ fold change', yLabel: '−log₁₀ adjusted p', test: 'auto' }, 560, 260, 380, 300);
    o.push(ch, Make.connector({ x: f.nodes[4].x + 40, y: 238 }, ch, { color: '#4a7fd6', width: 2 }));
    return tPage('RNA-seq', 980, 590, o);
  } },
  { name: 'Single-cell RNA-seq workflow', desc: 'Dissociation → droplets → clustering, with a live UMAP', category: 'Omics & data science', build() {
    const o = tTitle('Single-cell RNA-seq');
    const f = tFlow([['Tissue', 'liver'], ['Dissociation', 'eppendorf', 'single-cell suspension'], ['Droplet capture', 'thermocycler', 'cell barcode; UMI per molecule'], ['Sequencing', 'sequencer'], ['Clustering', 'computer', 'QC → normalise → UMAP']], { y: 110, gap: 175, size: 80 });
    o.push(...f.o);
    const ch = Make.chart({ kind: 'embedding', data: SAMPLE_DATA.embedding, title: 'Cell types', xLabel: 'UMAP 1', yLabel: 'UMAP 2', test: 'auto' }, 560, 260, 380, 320);
    o.push(ch, Make.connector({ x: f.nodes[4].x + 40, y: 238 }, ch, { color: '#4a7fd6', width: 2 }));
    return tPage('scRNA-seq', 980, 610, o);
  } },
  { name: 'Proteomics (LC-MS/MS) workflow', desc: 'Lysis → digestion → LC → tandem MS → identification', category: 'Omics & data science', build() {
    const o = tTitle('Bottom-up proteomics');
    const steps = [['Lysis', 'eppendorf', 'protein extraction'], ['Digestion', 'enzyme', 'trypsin → peptides'], ['LC separation', null, 'reversed-phase column'], ['MS / MS', null, 'precursor → fragments'], ['Identification', 'computer', 'database search, FDR 1%']];
    const nodes = [];
    steps.forEach(([lab, key, note], i) => {
      const x = 40 + i * 175;
      const n = key ? tIcon(key, x, 110, 80) : i === 2 ? Make.shape('cylinder', x + 20, 110, 40, 80, { fill: '#e8f0fb', stroke: '#4a7fd6', name: 'LC column' }) : Make.rect(x, 115, 80, 70, { fill: '#eef1f6', stroke: '#23395d', radius: 8, label: 'MS', labelBold: true, name: 'Mass spectrometer' });
      nodes.push(n); o.push(n, tLabel(`${i + 1}. ${lab}`, x + 40, 200, { color: '#23395d' }), tLabel(note, x + 40, 220, { bold: false, fontSize: 11, color: '#666666' }));
      if (i) o.push(Make.connector(nodes[i - 1], n, { color: '#4a7fd6', width: 2.2 }));
    });
    o.push(tBox('Label-free (LFQ) or isobaric (TMT) quantification → differential abundance', 160, 280, 560, 50, '#3fa58b'));
    return tPage('Proteomics', 900, 360, o);
  } },
  { name: 'Machine learning workflow', desc: 'Data → features → train / test → validation (live ROC)', category: 'Omics & data science', build() {
    const o = tTitle('Supervised machine learning');
    const stages = [['Collect data', '#7a8a96'], ['Clean & label', '#4a7fd6'], ['Features', '#9b7fd1'], ['Split', '#e8b33c'], ['Train model', '#e8743b'], ['Validate', '#3fa58b']];
    stages.forEach(([t, c], i) => { const b = Make.shape('chevron', 30 + i * 150, 100, 170, 64, { fill: c, stroke: 'none' }); o.push(b, tLabel(t, 30 + i * 150 + 100, 124, { color: '#ffffff' })); });
    o.push(tBox('Training set (70%)\nfit + cross-validate hyper-parameters', 330, 210, 270, 60, '#e8743b'), tBox('Held-out test set (30%)\nused once, at the end', 330, 290, 270, 60, '#3fa58b'));
    const ch = Make.chart({ kind: 'roc', data: SAMPLE_DATA.roc, title: 'Test-set performance', xLabel: '1 − specificity', yLabel: 'Sensitivity', test: 'auto', cutoff: true }, 640, 200, 300, 300);
    o.push(ch, Make.text('Avoid leakage: split before any scaling, imputation or feature selection.', 30, 380, { fontSize: 12, italic: true, color: '#666666' }));
    return tPage('ML workflow', 980, 520, o);
  } },
  { name: '2D vs 3D cell culture', desc: 'Monolayer compared with spheroids and organoids', category: 'Experimental workflows', build() {
    const o = tTitle('2D monolayer vs 3D culture');
    [['2D monolayer', 'petri dish', '#4a7fd6'], ['3D spheroids / organoids', 'organoid', '#3fa58b']].forEach(([t, key, c], i) => {
      const x = 40 + i * 470;
      o.push(Make.rect(x, 90, 430, 400, { fill: Color.light(c, 0.92), stroke: c, radius: 16 }), Make.text(t, x + 20, 104, { fontSize: 20, bold: true, color: Color.dark(c, 0.4) }), tIcon(key, x + 155, 150, 120));
    });
    const points = [[['+', 'Simple, cheap, high-throughput'], ['+', 'Easy to image and quantify'], ['−', 'Flattened cells, altered polarity'], ['−', 'Poor model of tissue architecture']],
      [['+', 'Cell–cell and cell–matrix contacts'], ['+', 'Oxygen, nutrient and drug gradients'], ['+', 'Self-organised, tissue-like structure'], ['−', 'More variable, harder to image']]];
    points.forEach((pts, i) => pts.forEach(([sign, p], k) => o.push(Make.text(`${sign === '+' ? '✓' : '✗'}  ${p}`, 70 + i * 470, 300 + k * 40, { fontSize: 15, color: sign === '+' ? '#2e7d32' : '#c0392b' }))));
    return tPage('2D vs 3D', 960, 520, o);
  } },
  { name: 'Wound healing phases', desc: 'Haemostasis → inflammation → proliferation → remodelling', category: 'Physiology', build() {
    const o = tTitle('Phases of wound healing');
    const ph = [['Haemostasis', 'minutes–hours', 'platelet', '#d6584a', 'Platelet plug,\nfibrin clot'], ['Inflammation', 'days 1–5', 'neutrophil', '#e8743b', 'Neutrophils,\nthen macrophages'], ['Proliferation', 'days 4–21', 'fibroblast', '#e8b33c', 'Granulation tissue,\nangiogenesis,\nre-epithelialisation'], ['Remodelling', '3 weeks–2 years', 'macrophage', '#3fa58b', 'Collagen III → I,\nscar matures']];
    ph.forEach(([t, time, key, c, det], i) => {
      const x = 30 + i * 230;
      o.push(Make.shape('chevron', x, 100, 250, 64, { fill: c, stroke: 'none' }), tLabel(t, x + 140, 122, { color: '#ffffff' }), tLabel(time, x + 125, 172, { bold: false, fontSize: 12, color: Color.dark(c, 0.3) }));
      o.push(tIcon(key, x + 85, 210, 90), Make.text(det, x + 40, 316, { fontSize: 12, color: '#444444' }));
    });
    return tPage('Wound healing', 980, 380, o);
  } },
  { name: 'Mechanisms of antibiotic resistance', desc: 'Inactivation, efflux, target change, permeability, biofilm, gene transfer', category: 'Microbiology', build() {
    const o = tTitle('How bacteria resist antibiotics');
    const bac = tIcon('bacterium', 370, 230, 200);
    o.push(bac);
    const mech = [['Enzymatic inactivation', 'β-lactamases, aminoglycoside-modifying enzymes'], ['Efflux pumps', 'AcrAB–TolC, NorA'], ['Target modification', 'PBP2a (MRSA), 23S rRNA methylation'], ['Reduced permeability', 'Porin loss (Gram-negatives)'], ['Biofilm', 'Matrix limits penetration; persister cells'], ['Horizontal gene transfer', 'Plasmids, transposons, integrons']];
    mech.forEach(([t, ex], i) => {
      const a = -Math.PI / 2 + (i / mech.length) * 2 * Math.PI, cx = 470 + 330 * Math.cos(a), cy = 330 + 210 * Math.sin(a), c = DG_PAL[i];
      const w = Math.max(220, measureText(ex, 12, 'sans', true).w * 1.1 + 30), b = tBox(`${t}\n${ex}`, cx - w / 2, cy - 34, w, 68, c, { labelSize: 12 });
      o.push(b, Make.connector(bac, b, { head: 'none', color: c, width: 2 }));
    });
    return tPage('Antibiotic resistance', 960, 620, o);
  } },
  { name: 'Monoclonal antibodies by hybridoma', desc: 'Immunise → fuse → HAT select → screen → clone', category: 'Immunology', build() {
    const o = tTitle('Monoclonal antibody production (hybridoma)');
    const f = tFlow([['Immunise', 'mouse', 'antigen + adjuvant'], ['Harvest spleen', 'spleen', 'antibody-producing B cells'], ['Fuse', 'hybridoma cell', 'B cell × myeloma (PEG)'], ['HAT selection', 'wellplate', 'only hybridomas survive'], ['Screen & clone', 'wellplate', 'ELISA, limiting dilution'], ['mAb', 'antibody', 'one clone, one epitope']], { y: 110, gap: 150, size: 76 });
    const my = tIcon('myeloma cell', 200, 260, 56);
    o.push(...f.o, my, tLabel('Myeloma cells (HGPRT⁻, immortal)', 228, 322, { bold: false, fontSize: 11 }), Make.connector(my, f.nodes[2], { dash: true, color: '#777777' }));
    return tPage('Hybridoma', 940, 360, o);
  } },
  { name: 'Drug discovery and development pipeline', desc: 'Target to approval, with typical durations', category: 'Drug development', build() {
    const o = tTitle('Drug discovery and development', 'Typical: 10–15 years; ~1 in 10 drugs entering phase I is approved');
    const st = [['Target\nID', '1–2 y'], ['Hit to\nlead', '1–2 y'], ['Lead\noptimisation', '1–3 y'], ['Pre-\nclinical', '1–2 y'], ['Phase I', '~1 y'], ['Phase II', '~2 y'], ['Phase III', '2–4 y'], ['Approval', '~1 y']];
    st.forEach(([t, y], i) => { const x = 30 + i * 118, c = i < 4 ? '#4a7fd6' : i < 7 ? '#e8743b' : '#3fa58b', sh = Make.shape('chevron', x, 110, 130, 64, { fill: Color.dark(c, 0.06 * (i % 4)), stroke: 'none' }), lb = tLabel(t, x + 76, 0, { color: '#ffffff', fontSize: 11 }); lb.y = 142 - lb.h / 2; o.push(sh, lb, tLabel(y, x + 66, 184, { bold: false, fontSize: 11, color: '#555555' })); });
    o.push(Make.text('Discovery & preclinical', 40, 215, { fontSize: 14, bold: true, color: '#4a7fd6' }), Make.text('Clinical development', 520, 215, { fontSize: 14, bold: true, color: '#e8743b' }), Make.text('Regulatory', 860, 215, { fontSize: 14, bold: true, color: '#3fa58b' }));
    return tPage('Drug pipeline', 1000, 260, o);
  } },
  { name: 'Clinical trial phases', desc: 'Phase I–IV: participants, purpose, typical size', category: 'Clinical', build() {
    const o = tTitle('Phases of clinical trials');
    const ph = [['Phase I', '20–100', 'Healthy volunteers\nor patients', 'Safety, dose,\npharmacokinetics'], ['Phase II', '100–300', 'Patients', 'Efficacy signal,\ndose, side effects'], ['Phase III', '300–3,000+', 'Patients, randomised', 'Confirm efficacy\nvs standard care'], ['Phase IV', 'Thousands', 'Post-marketing', 'Long-term and rare\nadverse events']];
    ph.forEach(([t, n, who, aim], i) => { const x = 30 + i * 240, c = DG_PAL[i]; o.push(Make.rect(x, 90, 220, 230, { fill: Color.light(c, 0.9), stroke: c, radius: 14 }), Make.text(t, x + 18, 104, { fontSize: 22, bold: true, color: Color.dark(c, 0.35) }), tIcon('human', x + 20, 150, 50), Make.text(`n ≈ ${n}`, x + 80, 165, { fontSize: 16, bold: true }), Make.text(who, x + 18, 220, { fontSize: 13, italic: true, color: '#555555' }), Make.text(aim, x + 18, 258, { fontSize: 13 })); });
    return tPage('Trial phases', 1000, 350, o);
  } },
  { name: '3D bioprinting workflow', desc: 'Imaging → design → bioink → print → mature → implant', category: 'Experimental workflows', build() {
    const o = tTitle('3D bioprinting');
    const f = tFlow([['Imaging', 'computer', 'CT / MRI of the defect'], ['CAD model', 'computer', 'slice into layers'], ['Bioink', 'stem cell', 'cells + hydrogel'], ['Printing', 'scaffold', 'extrusion, layer by layer'], ['Maturation', 'flask', 'bioreactor, days–weeks'], ['Implant / test', 'human', 'or drug screening']], { y: 110, gap: 150, size: 76 });
    o.push(...f.o);
    return tPage('Bioprinting', 940, 280, o);
  } },
);
