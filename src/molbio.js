// Molecular biology diagrams as editable vector objects: circular plasmid maps (typed or from a
// GenBank file), linear constructs (CAR, lentiviral vectors, floxed alleles) and gene structures
// with CRISPR guides. Sequence alignments with a logo are a chart kind (src/omics.js).

const TA_STYLE = 'width:100%;box-sizing:border-box';
const FEATURE_COL = { promoter: '#e8b33c', cds: '#4a7fd6', marker: '#d6584a', origin: '#8b98a5', misc: '#3fa58b', terminator: '#9b7fd1', tag: '#e88a9a' };
function featureType(name, given) {
  const g = String(given || '').toLowerCase();
  if (FEATURE_COL[g]) return g;
  if (/rep_origin|origin/.test(g)) return 'origin';
  if (/promoter|ltr/.test(g)) return 'promoter';
  if (/terminator|polya/.test(g)) return 'terminator';
  const n = String(name).toLowerCase();
  if (/\bori\b|origin|f1 ori|pbr322|puc/.test(n)) return 'origin';
  if (/ampr|amp\b|bla\b|kanr|kan\b|neo|puro|hygro|blast|zeo|bsd|resist/.test(n)) return 'marker';
  if (/promoter|\bcmv\b|ef-?1a|ef1α|\bu6\b|\bh1\b|pgk|sv40 pro|\bt7\b|\bcag\b|ubc|lac pro|ltr/.test(n)) return 'promoter';
  if (/polya|terminator|bgh|wpre/.test(n)) return 'terminator';
  if (/flag|\bha\b|myc tag|his|v5|p2a|t2a|ires/.test(n)) return 'tag';
  return 'cds';
}
const featureColour = (f) => (/^#[0-9a-f]{3,6}$/i.test(f.color || '') ? f.color : FEATURE_COL[featureType(f.name, f.type)]);

// ---------- GenBank ----------
function parseGenBank(text) {
  const len = +((text.match(/^LOCUS\s+\S+\s+(\d+)\s+bp/m) || [])[1] || 0);
  const name = ((text.match(/^LOCUS\s+(\S+)/m) || [])[1] || '').trim();
  const block = (text.split(/^FEATURES.*$/m)[1] || '').split(/^ORIGIN/m)[0];
  const feats = [];
  let cur = null;
  block.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^ {5}(\S+)\s+(.+)$/);
    if (m) { cur = { key: m[1], loc: m[2].trim(), q: {} }; feats.push(cur); return; }
    const q = line.match(/^ {21}\/(\w+)=?"?([^"]*)"?/);
    if (q && cur && !cur.q[q[1]]) cur.q[q[1]] = q[2].trim();
    else if (cur && /^ {21}[^/]/.test(line) && !Object.keys(cur.q).length) cur.loc += line.trim();
  });
  const out = feats.filter((f) => !['source', 'gene', 'mRNA', 'exon', 'primer_bind', 'misc_binding', 'variation'].includes(f.key)).map((f) => {
    const nums = (f.loc.match(/\d+/g) || []).map(Number);
    if (!nums.length) return null;
    const label = f.q.label || f.q.gene || f.q.product || f.q.note || f.key;
    return { name: label.length > 28 ? label.slice(0, 26) + '…' : label, start: Math.min(...nums), end: Math.max(...nums), strand: /complement/.test(f.loc) ? '-' : '+', type: f.key === 'rep_origin' ? 'origin' : f.key === 'promoter' ? 'promoter' : f.key === 'terminator' || f.key === 'polyA_signal' ? 'terminator' : f.key === 'CDS' ? '' : '' };
  }).filter(Boolean);
  return { name, length: len, features: out.slice(0, 40) };
}

// ---------- Circular plasmid map ----------
const PLASMID_SAMPLE = `# name, start, end, strand (+/-), colour or type (optional)
CMV promoter, 235, 822, +
EGFP, 916, 1635, +
SV40 polyA, 1790, 1911, +, terminator
f1 ori, 2028, 2483, -
Kan/NeoR, 2797, 3591, +
pUC ori, 3998, 4586, -`;
const PLASMID_SITES = `# name, position
NheI, 591
EcoRI, 1640
BamHI, 1665
XhoI, 1656
AseI, 59`;
// Lines starting with # are comments (a # later in the line is a colour).
function parseRows(text, n) { return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s*[,\t]\s*/)).filter((p) => p.length >= n); }
function buildPlasmid({ name, length, features, sites, R = 150, th = 18 }) {
  const out = [], A = (bp) => (-90 + (360 * (bp - 1)) / length) * (Math.PI / 180), pt = (bp, r) => ({ x: Math.cos(A(bp)) * r, y: Math.sin(A(bp)) * r });
  out.push(Make.ellipse(-R, -R, 2 * R, 2 * R, { fill: 'none', stroke: '#8b98a5', strokeWidth: 3, name: 'Backbone' }));
  const labels = [];
  features.forEach((f) => {
    let s = f.start, e = f.end < f.start ? f.end + length : f.end;
    const span = e - s, headBp = Math.min(span * 0.4, (length * (th * 0.9)) / (2 * Math.PI * R)), col = featureColour(f), steps = Math.max(6, Math.ceil((span / length) * 120));
    const arc = (a, b, r) => Array.from({ length: steps + 1 }, (_, i) => pt(a + ((b - a) * i) / steps, r));
    let poly;
    if (f.strand === '-') poly = [pt(s, R), ...arc(s + headBp, e, R + th / 2), ...arc(e, s + headBp, R - th / 2)];
    else if (f.strand === '+') poly = [...arc(s, e - headBp, R + th / 2), pt(e, R), ...arc(e - headBp, s, R - th / 2)];
    else poly = [...arc(s, e, R + th / 2), ...arc(e, s, R - th / 2)];
    out.push(makePathFromNodes(poly.map((p) => ({ x: p.x, y: p.y })), { closed: true, fill: col, shade: 'flat', stroke: Color.dark(col, 0.3), strokeWidth: 1, name: f.name }));
    labels.push({ text: f.name, bp: (s + e) / 2, col: Color.dark(col, 0.35), bold: true, r0: R + th / 2 });
  });
  sites.forEach((st) => {
    const a = pt(st.pos, R - th / 2 - 2), b = pt(st.pos, R + th / 2 + 6);
    out.push(makePathFromNodes([a, b], { stroke: '#444444', strokeWidth: 1, name: st.name }));
    labels.push({ text: `${st.name} (${st.pos})`, bp: st.pos, col: '#444444', bold: false, r0: R + th / 2 + 6, site: true });
  });
  // Labels outside the ring, nudged apart on each side so they don't overlap.
  const Rl = R + th + 34, fs = 12;
  labels.forEach((l) => { const p = pt(l.bp, Rl); l.side = p.x >= 0 ? 1 : -1; l.y = p.y; l.x = p.x; });
  for (const side of [1, -1]) {
    const L = labels.filter((l) => l.side === side).sort((a, b) => a.y - b.y);
    for (let i = 1; i < L.length; i++) if (L[i].y - L[i - 1].y < fs + 3) L[i].y = L[i - 1].y + fs + 3;
    for (let i = L.length - 2; i >= 0; i--) if (L[i + 1].y - L[i].y < fs + 3) L[i].y = L[i + 1].y - fs - 3;
  }
  labels.forEach((l) => {
    const t = Make.text(l.text, 0, 0, { fontSize: l.site ? fs - 1 : fs, bold: l.bold, color: l.col, italic: l.site });
    const lx = l.side > 0 ? Math.max(l.x, 12) : Math.min(l.x, -12);
    t.x = l.side > 0 ? lx + 4 : lx - 4 - t.w; t.y = l.y - t.h / 2;
    const from = pt(l.bp, l.r0 + 2);
    out.push(makePathFromNodes([from, { x: lx, y: l.y }], { stroke: '#9aa3ad', strokeWidth: 0.8, name: 'Leader' }), t);
  });
  const n1 = Make.text(name || 'Plasmid', 0, -14, { fontSize: 18, bold: true, italic: true });
  const n2 = Make.text(`${length.toLocaleString()} bp`, 0, 8, { fontSize: 13, color: '#666666' });
  n1.x = -n1.w / 2; n2.x = -n2.w / 2;
  out.push(n1, n2);
  return out;
}
function openPlasmidDialog() {
  const name = el('input', { type: 'text', value: 'pCMV-EGFP' });
  const len = el('input', { type: 'number', value: 4733, min: 100, style: 'width:100px' });
  const feats = el('textarea', { rows: 8, spellcheck: false, style: TA_STYLE, value: PLASMID_SAMPLE });
  const sites = el('textarea', { rows: 4, spellcheck: false, style: TA_STYLE, value: PLASMID_SITES });
  const prev = el('div', { class: 'preview', style: 'min-height:300px;display:flex;align-items:center;justify-content:center' });
  const gather = () => ({
    name: name.value.trim(), length: Math.max(10, +len.value || 1000),
    features: parseRows(feats.value, 3).filter((p) => isFinite(+p[1]) && isFinite(+p[2])).map((p) => ({ name: p[0], start: +p[1], end: +p[2], strand: p[3] === '-' ? '-' : p[3] === '+' || p[3] === undefined ? '+' : '', color: /^#/.test(p[4] || '') ? p[4] : null, type: /^#/.test(p[4] || '') ? '' : p[4] })),
    sites: parseRows(sites.value, 2).filter((p) => isFinite(+p[1])).map((p) => ({ name: p[0], pos: +p[1] })),
  });
  const draw = () => {
    const parts = buildPlasmid(gather()), x0 = Math.min(...parts.map((o) => o.x)) - 10, y0 = Math.min(...parts.map((o) => o.y)) - 10;
    parts.forEach((o) => { o.x -= x0; o.y -= y0; });
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 10, H = Math.max(...parts.map((o) => o.y + o.h)) + 10;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="max-width:100%;max-height:380px" ');
  };
  const gb = el('input', { type: 'file', accept: '.gb,.gbk,.genbank,.gbff,.txt,.ape,.dna', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0]; gb.value = '';
    if (!f) return;
    if (/\.dna$/i.test(f.name)) { toast('SnapGene .dna files are binary: export as GenBank (.gb) from SnapGene first'); return; }
    const r = parseGenBank(await f.text());
    if (!r.length || !r.features.length) { toast('No LOCUS length or features found in that file'); return; }
    name.value = r.name || f.name.replace(/\.[^.]+$/, ''); len.value = r.length;
    feats.value = '# name, start, end, strand, type\n' + r.features.map((x) => `${x.name.replace(/,/g, ' ')}, ${x.start}, ${x.end}, ${x.strand}${x.type ? ', ' + x.type : ''}`).join('\n');
    sites.value = '# name, position\n';
    draw();
    toast(`Read ${r.features.length} features from ${f.name}`);
  } });
  [name, len, feats, sites].forEach((x) => x.addEventListener('input', draw));
  openModal('Plasmid map', el('div', { style: 'width:880px;max-width:92vw;display:grid;grid-template-columns:360px 1fr;gap:14px' },
    el('div', {}, field_('Name', name), field_('Length (bp)', len),
      el('div', { class: 'btnrow', style: 'margin:4px 0' }, btn('Import GenBank…', () => gb.click()), gb),
      el('div', { class: 'note' }, 'Features: name, start, end, strand (+ / − / blank), optional colour or type (promoter, CDS, marker, origin, terminator, tag). Types are guessed from names.'), feats,
      el('div', { class: 'note' }, 'Sites (restriction enzymes, primers): name, position.'), sites),
    el('div', {}, prev, el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
      const parts = buildPlasmid(gather()), c = viewCenter();
      parts.forEach((o) => { o.x += c.x; o.y += c.y; });
      closeModal(); addObjects([makeGroup(parts, `${name.value.trim() || 'Plasmid'} map`)]);
    }, 'primary')))));
  draw();
}

// ---------- Linear constructs ----------
const CONSTRUCT_PRESETS = {
  'CAR, 2nd generation (CD28)': 'Leader, 21, #9aa7b4\nVH, 120, #4a7fd6\nLinker, 15, #cfd6dd\nVL, 110, #6fa0e8\nCD8α hinge, 45, #e8b33c\nCD28 TM, 27, #e8743b\nCD28, 41, #d6584a\nCD3ζ, 112, #9b7fd1',
  'CAR, 2nd generation (4-1BB)': 'Leader, 21, #9aa7b4\nVH, 120, #4a7fd6\nLinker, 15, #cfd6dd\nVL, 110, #6fa0e8\nCD8α hinge, 45, #e8b33c\nCD8α TM, 24, #e8743b\n4-1BB, 42, #3fa58b\nCD3ζ, 112, #9b7fd1',
  'Lentiviral transfer vector': "5′ LTR, 180, #8b98a5, ltr\nψ, 120, #cfd6dd\nRRE, 230, #cfd6dd\ncPPT, 120, #cfd6dd\nEF1α, 0, #e8b33c, promoter\nCAR, 1450, #4a7fd6\nP2A, 66, #e88a9a\ntEGFR, 1000, #3fa58b\nWPRE, 590, #9b7fd1\n3′ SIN-LTR, 230, #8b98a5, ltr",
  'Floxed allele (conditional KO)': 'Exon 1, 150, #4a7fd6\nintron, 400, , line\nloxP, 34, #d6584a, lox\nExon 2, 120, #4a7fd6\nintron, 300, , line\nExon 3, 140, #4a7fd6\nloxP, 34, #d6584a, lox\nintron, 400, , line\nExon 4, 160, #4a7fd6',
  'HDR knock-in donor': '5′ homology arm, 800, #9aa7b4\nP2A, 66, #e88a9a\nmNeonGreen, 711, #3fa58b\nbGH polyA, 225, #9b7fd1, terminator\n3′ homology arm, 800, #9aa7b4',
};
const lightColour = (c) => { const [r, g, b] = Color.hexToRgb(toHex(c)); return 0.299 * r + 0.587 * g + 0.114 * b > 165; };
function buildConstruct(rows, { width = 760, unit = 'bp' } = {}) {
  const minW = 26, H = 34, y = 30, out = [];
  // Boxes and spacers share the width in proportion to length (with a minimum); lox sites and promoters are fixed.
  const fixed = (r) => (r.shape === 'promoter' ? 0 : r.shape === 'lox' ? 16 : null);
  const flex = rows.filter((r) => fixed(r) == null), avail = width - rows.reduce((s, r) => s + (fixed(r) ?? 0) + 2, 0);
  let k = avail / (flex.reduce((s, r) => s + Math.max(1, r.len), 0) || 1);
  for (let it = 0; it < 4; it++) { const small = flex.filter((r) => Math.max(1, r.len) * k < (r.shape === 'line' ? 18 : minW)); const used = small.reduce((s, r) => s + (r.shape === 'line' ? 18 : minW), 0); k = (avail - used) / (flex.filter((r) => !small.includes(r)).reduce((s, r) => s + Math.max(1, r.len), 0) || 1); }
  const ws = rows.map((r) => fixed(r) ?? Math.max(r.shape === 'line' ? 18 : minW, Math.max(1, r.len) * k));
  let x = 0;
  out.push(Make.rect(0, y + H / 2 - 1.5, width, 3, { fill: '#9aa3ad', stroke: 'none', radius: 0, name: 'Backbone' }));
  rows.forEach((r, i) => {
    const w = ws[i], col = r.color || '#4a7fd6';
    if (r.shape === 'promoter') { // bent arrow above the line
      out.push(makePathFromNodes([{ x, y: y + H / 2 }, { x, y: y - 6 }, { x: x + 22, y: y - 6 }], { stroke: Color.dark(col, 0.2), strokeWidth: 2.5, headEnd: 'arrow', cap: 'round', name: r.name }));
      const t = Make.text(r.name, x - 2, y - 26, { fontSize: 12, bold: true, color: Color.dark(col, 0.35) }); out.push(t);
      return;
    }
    if (r.shape === 'lox') {
      out.push(Make.shape('triangle', x, y + H / 2 - 8, 16, 16, { rot: 90, fill: col, stroke: Color.dark(col, 0.3), strokeWidth: 1, name: r.name }));
      const t = Make.text(r.name, 0, y + H + 4, { fontSize: 10, color: Color.dark(col, 0.35), italic: true }); t.x = x + 8 - t.w / 2; out.push(t);
      x += w + 2; return;
    }
    if (r.shape === 'line') { x += w + 2; return; }
    const box = Make.rect(x, y + (r.shape === 'ltr' ? 2 : 0), w, r.shape === 'ltr' ? H - 4 : H, { fill: col, stroke: Color.dark(col, 0.3), strokeWidth: 1.2, radius: r.shape === 'ltr' ? 2 : 7, name: r.name });
    if (r.shape === 'terminator') Object.assign(box, { radius: H / 2 });
    out.push(box);
    const t = Make.text(r.name, 0, 0, { fontSize: 11, bold: true, color: lightColour(col) ? '#222222' : '#ffffff' });
    if (t.w + 6 <= w) { t.x = x + w / 2 - t.w / 2; t.y = y + H / 2 - t.h / 2; }
    else { t.color = '#333333'; t.fontSize = 10; Object.assign(t, textMetrics(t)); t.x = x + w / 2 - t.w / 2; t.y = i % 2 ? y + H + 4 : y - t.h - 4; }
    out.push(t);
    if (r.len && unit) { const s = Make.text(`${r.len}${unit === 'aa' ? ' aa' : ''}`, 0, 0, { fontSize: 8, color: '#888888' }); if (s.w + 4 < w && t.y > y && t.y < y + H) { s.x = x + w / 2 - s.w / 2; s.y = y + H + 3; out.push(s); } }
    x += w + 2;
  });
  return out;
}
function openConstructDialog() {
  const preset = el('select', {}, ...Object.keys(CONSTRUCT_PRESETS).map((k) => el('option', { value: k, textContent: k })));
  const ta = el('textarea', { rows: 10, spellcheck: false, style: TA_STYLE, value: CONSTRUCT_PRESETS[preset.value] });
  const unit = el('select', {}, el('option', { value: 'aa', textContent: 'aa (protein)' }), el('option', { value: 'bp', textContent: 'bp (DNA)' }), el('option', { value: '', textContent: 'Hide lengths' }));
  const prev = el('div', { class: 'preview', style: 'min-height:140px' });
  const rows = () => parseRows(ta.value, 1).map((p) => ({ name: p[0], len: +p[1] || 0, color: /^#/.test(p[2] || '') ? p[2] : '', shape: (p[3] || (/lox|frt/i.test(p[0]) ? 'lox' : /promoter|^ef1|^cmv|^pgk|^u6/i.test(p[0]) && !+p[1] ? 'promoter' : /intron|spacer/i.test(p[0]) ? 'line' : '')).toLowerCase() }));
  const draw = () => {
    const parts = buildConstruct(rows(), { unit: unit.value }), x0 = Math.min(...parts.map((o) => o.x)) - 10, y0 = Math.min(...parts.map((o) => o.y)) - 10;
    parts.forEach((o) => { o.x -= x0; o.y -= y0; });
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 10, H = Math.max(...parts.map((o) => o.y + o.h)) + 10;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="width:100%" ');
  };
  preset.addEventListener('change', () => { ta.value = CONSTRUCT_PRESETS[preset.value]; unit.value = /CAR,/.test(preset.value) ? 'aa' : 'bp'; draw(); });
  [ta, unit].forEach((x) => x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', draw));
  openModal('Construct diagram', el('div', { style: 'width:860px;max-width:92vw' }, prev,
    el('div', { class: 'dlg-cols' },
      el('div', {}, field_('Start from', preset), field_('Lengths', unit),
        el('div', { class: 'note' }, 'One element per line: name, length, colour, shape. Shapes: box (default), promoter (bent arrow, length 0), lox (loxP / FRT triangle), ltr, terminator, line (intron or spacer). Lengths set the widths; tiny elements get a minimum width so labels fit.')),
      el('div', {}, ta)),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
      const parts = buildConstruct(rows(), { unit: unit.value }), c = viewCenter();
      const W = Math.max(...parts.map((o) => o.x + o.w)), H = Math.max(...parts.map((o) => o.y + o.h));
      parts.forEach((o) => { o.x += c.x - W / 2; o.y += c.y - H / 2; });
      closeModal(); addObjects([makeGroup(parts, 'Construct')]);
    }, 'primary'))));
  unit.value = 'aa';
  draw();
}

// ---------- Gene structure + CRISPR guides ----------
const GENE_SAMPLE = { name: 'PDCD1 (mouse)', exons: '# exon start, end (genomic, gene orientation)\n1, 120\n2840, 3196\n5410, 5512\n6020, 6123\n8740, 9620', cds: '62, 9050', guides: '# name, cut position, strand (+/-)\nsg1, 2915, +\nsg2, 3050, -\nsg3, 5460, +' };
function buildGene({ name, exons, cdsStart, cdsEnd, guides, compress = true, width = 760, strand = '+' }) {
  exons = [...exons].sort((a, b) => a[0] - b[0]);
  const out = [], top = 46, H = 26, h2 = 12, iw = 46;
  // Genomic position → x, optionally drawing every intron at the same short width.
  let X;
  if (compress && exons.length > 1) {
    const exLen = exons.reduce((s, [a, b]) => s + (b - a + 1), 0), k = (width - iw * (exons.length - 1)) / exLen;
    X = (g) => {
      let x = 0;
      for (let i = 0; i < exons.length; i++) {
        const [a, b] = exons[i];
        if (g <= b || i === exons.length - 1) { if (g < a) return x - iw + iw * ((g - exons[i - 1][1]) / (a - exons[i - 1][1])); return x + Math.min(b - a + 1, g - a) * k; }
        x += (b - a + 1) * k + iw;
      }
      return x;
    };
  } else { const g0 = exons[0][0], g1 = exons[exons.length - 1][1]; X = (g) => ((g - g0) / (g1 - g0 || 1)) * width; }
  const x0 = X(exons[0][0]), x1 = X(exons[exons.length - 1][1]);
  if (name) out.push(Make.text(name, 0, 0, { fontSize: 15, bold: true, italic: true }));
  out.push(Make.rect(x0, top + H / 2 - 0.75, x1 - x0, 1.5, { fill: '#555555', stroke: 'none', radius: 0, name: 'Introns' }));
  for (let i = 0; i + 1 < exons.length; i++) { // strand chevrons in each intron
    const a = X(exons[i][1]), b = X(exons[i + 1][0]), m = (a + b) / 2, d = strand === '-' ? -1 : 1;
    if (b - a > 14) out.push(makePathFromNodes([{ x: m - 3 * d, y: top + H / 2 - 4 }, { x: m + 3 * d, y: top + H / 2 }, { x: m - 3 * d, y: top + H / 2 + 4 }], { stroke: '#555555', strokeWidth: 1.2, name: 'Strand' }));
  }
  const col = '#23395d';
  exons.forEach(([a, b], i) => {
    const seg = (s, e, coding) => { if (e < s) return; const xa = X(s), xb = X(e) + 0.001; out.push(Make.rect(xa, coding ? top : top + (H - h2) / 2, Math.max(1.5, xb - xa), coding ? H : h2, { fill: coding ? col : '#ffffff', stroke: col, strokeWidth: 1.2, radius: 1.5, name: `Exon ${i + 1}${coding ? '' : ' UTR'}` })); };
    if (cdsStart && cdsEnd) { seg(a, Math.min(b, cdsStart - 1), false); seg(Math.max(a, cdsStart), Math.min(b, cdsEnd), true); seg(Math.max(a, cdsEnd + 1), b, false); }
    else seg(a, b, true);
    const t = Make.text(`E${i + 1}`, 0, top + H + 5, { fontSize: 10, color: '#555555' }); t.x = (X(a) + X(b)) / 2 - t.w / 2; out.push(t);
  });
  guides.forEach((g, k) => {
    const x = X(g.pos), row = k % 2, y = top - 14 - row * 16, len = Math.max(10, Math.abs(X(g.pos + 17) - X(g.pos)) + 6), red = '#d6584a';
    const gx = g.strand === '-' ? x - 3 : x - len + 3;
    out.push(Make.rect(gx, y, len, 6, { fill: Color.light(red, 0.5), stroke: red, strokeWidth: 1, radius: 2, name: `${g.name} spacer` }));
    out.push(Make.rect(g.strand === '-' ? gx - 5 : gx + len, y, 5, 6, { fill: '#e8b33c', stroke: 'none', radius: 1, name: 'PAM' }));
    out.push(makePathFromNodes([{ x, y: y + 6 }, { x, y: top - 1 }], { stroke: red, strokeWidth: 1.2, headEnd: 'arrow', name: `${g.name} cut` }));
    const t = Make.text(g.name, 0, y - 1, { fontSize: 10, bold: true, color: red }); t.x = (g.strand === '-' ? gx + len + 4 : gx - t.w - 8); out.push(t);
  });
  // Scale bar: exons are always to scale; with shortened introns the bar applies to exons only.
  const pxPerBp = compress && exons.length > 1 ? (width - iw * (exons.length - 1)) / exons.reduce((t, [a, b]) => t + (b - a + 1), 0) : width / (exons[exons.length - 1][1] - exons[0][0] || 1);
  const kb = [10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10].find((v) => v * pxPerBp <= width * 0.2) || 10, bw = kb * pxPerBp;
  if (bw > 4) { out.push(Make.rect(x1 - bw, top + H + 22, bw, 1.5, { fill: '#333333', stroke: 'none', radius: 0, name: 'Scale' })); const t = Make.text(`${kb >= 1000 ? kb / 1000 + ' kb' : kb + ' bp'}${compress && exons.length > 1 ? ' (exons)' : ''}`, 0, top + H + 26, { fontSize: 9, color: '#555555' }); t.x = x1 - bw / 2 - t.w / 2; out.push(t); }
  return out;
}
function openGeneDialog() {
  const name = el('input', { type: 'text', value: GENE_SAMPLE.name });
  const ex = el('textarea', { rows: 7, spellcheck: false, style: TA_STYLE, value: GENE_SAMPLE.exons });
  const cds = el('input', { type: 'text', value: GENE_SAMPLE.cds, placeholder: 'start, end (blank = all coding)' });
  const gd = el('textarea', { rows: 4, spellcheck: false, style: TA_STYLE, value: GENE_SAMPLE.guides });
  const comp = el('input', { type: 'checkbox', checked: true });
  const strand = el('select', {}, el('option', { value: '+', textContent: 'Forward (→)' }), el('option', { value: '-', textContent: 'Reverse (←)' }));
  const prev = el('div', { class: 'preview', style: 'min-height:150px' });
  const gather = () => {
    const c = cds.value.split(/[\s,–-]+/).map(Number).filter(isFinite);
    return { name: name.value.trim(), strand: strand.value, compress: comp.checked, exons: parseRows(ex.value, 2).map((p) => [+p[0], +p[1]]).filter(([a, b]) => isFinite(a) && isFinite(b) && b >= a), cdsStart: c.length === 2 ? c[0] : null, cdsEnd: c.length === 2 ? c[1] : null, guides: parseRows(gd.value, 2).filter((p) => isFinite(+p[1])).map((p) => ({ name: p[0], pos: +p[1], strand: p[2] === '-' ? '-' : '+' })) };
  };
  const draw = () => {
    const g = gather();
    if (!g.exons.length) { prev.innerHTML = ''; return; }
    const parts = buildGene(g), x0 = Math.min(...parts.map((o) => o.x)) - 10, y0 = Math.min(...parts.map((o) => o.y)) - 10;
    parts.forEach((o) => { o.x -= x0; o.y -= y0; });
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 10, H = Math.max(...parts.map((o) => o.y + o.h)) + 10;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="width:100%" ');
  };
  [name, ex, cds, gd, comp, strand].forEach((x) => x.addEventListener(x.tagName === 'SELECT' || x.type === 'checkbox' ? 'change' : 'input', draw));
  openModal('Gene structure & CRISPR guides', el('div', { style: 'width:860px;max-width:92vw' }, prev,
    el('div', { class: 'dlg-cols' },
      el('div', {}, field_('Gene', name), field_('Strand', strand), field_('CDS', cds), field_('', el('label', { style: 'width:auto;color:inherit' }, comp, ' Shorten introns (exons to scale)')),
        el('div', { class: 'note' }, 'Exons: start, end in genomic coordinates (from Ensembl / UCSC). Thick = coding, thin = UTR.'), ex),
      el('div', {}, el('div', { class: 'note' }, 'Guides: name, cut position, strand. Drawn as a 20-nt spacer with the PAM (yellow) and an arrow at the cut site, 3 bp from the PAM.'), gd)),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
      const g = gather();
      if (!g.exons.length) { toast('Enter at least one exon'); return; }
      const parts = buildGene(g), c = viewCenter();
      const W = Math.max(...parts.map((o) => o.x + o.w)), H = Math.max(...parts.map((o) => o.y + o.h));
      parts.forEach((o) => { o.x += c.x - W / 2; o.y += c.y - H / 2; });
      closeModal(); addObjects([makeGroup(parts, `${g.name || 'Gene'} structure`)]);
    }, 'primary'))));
  draw();
}

ARRANGE_COMMANDS.plasmidMap = openPlasmidDialog;
ARRANGE_COMMANDS.constructMap = openConstructDialog;
ARRANGE_COMMANDS.geneMap = openGeneDialog;
ARRANGE_COMMANDS.alignmentChart = () => openGraphDialog(null, { kind: 'alignment', data: SAMPLE_DATA.alignment, w: 560, h: 260 });
