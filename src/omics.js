// Omics and clinical plots as chart kinds: volcano, MA, UMAP / t-SNE, marker dot plot, oncoprint,
// lollipop mutation plot, forest plot, Venn, UpSet, waterfall, swimmer, and sequence alignments with a logo.
// Each kind is an EXTRA_CHARTS renderer; CHART_META gives the graph dialog its hint, axis labels and options.

const CHART_META = {};
const OMICS = 'Omics & clinical';
const omEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Find a column by header pattern; falls back to the n-th numeric (or text) column.
function omCol(t, patterns, { numeric = true, skip = [], nth = 0 } = {}) {
  for (const re of patterns) { const i = t.headers.findIndex((h, k) => !skip.includes(k) && re.test(h)); if (i >= 0) return i; }
  const isNum = (k) => t.cols[k].filter(isFinite).length >= t.cols[k].length * 0.6;
  const cand = t.headers.map((_, k) => k).filter((k) => !skip.includes(k) && (numeric ? isNum(k) : !isNum(k)));
  return cand[nth] ?? -1;
}
// Greedy label placement: keep labels from overlapping each other, with a leader line when moved.
function placeLabels(items, fs = 10) {
  const boxes = [];
  const hit = (b) => boxes.some((c) => b.x < c.x + c.w && b.x + b.w > c.x && b.y < c.y + c.h && b.y + b.h > c.y);
  let s = '';
  for (const it of items) {
    const w = measureText(it.text, fs, 'sans').w + 2, h = fs + 2;
    let best = null;
    for (const [dx, dy] of [[6, -h / 2], [-w - 6, -h / 2], [6, -h - 4], [-w - 6, -h - 4], [6, 4], [-w - 6, 4], [-w / 2, -h - 10], [-w / 2, 10], [14, -h - 14], [-w - 14, -h - 14], [14, 14], [-w - 14, 14]]) {
      const b = { x: it.x + dx, y: it.y + dy, w, h };
      if (b.x < it.minX || b.x + b.w > it.maxX || b.y < it.minY || b.y + h > it.maxY) continue;
      if (!hit(b)) { best = b; break; }
    }
    if (!best) continue;
    boxes.push(best);
    const lx = best.x + (best.x > it.x ? 0 : best.w), ly = best.y + best.h / 2;
    if (Math.hypot(lx - it.x, ly - it.y) > 9) s += `<line x1="${it.x}" y1="${it.y}" x2="${lx}" y2="${ly}" stroke="#666" stroke-width=".6"/>`;
    s += `<text x="${best.x + 1}" y="${best.y + h - 3}" font-size="${fs}" font-style="${it.italic ? 'italic' : 'normal'}" fill="#222" stroke="#fff" stroke-width="2.5" paint-order="stroke">${omEsc(it.text)}</text>`;
  }
  return s;
}
const legendRow = (items, x, y) => items.map(([label, col, shape], i) => `<g transform="translate(${x} ${y + i * 14})">${shape === 'line' ? `<rect y="3" width="12" height="3" fill="${col}"/>` : `<circle cx="5" cy="5" r="4" fill="${col}"/>`}<text x="16" y="9">${omEsc(label)}</text></g>`).join('');
const sigLog = (p) => -Math.log10(Math.max(p, 1e-300));

// ---------- Volcano & MA ----------
function deCols(t, cfg) {
  const gene = omCol(t, [/^(gene|symbol|gene.?name|id|feature)$/i], { numeric: false });
  const fc = omCol(t, [/log2.?f(old)?.?c(hange)?/i, /^logfc$/i, /^lfc$/i, /fold/i]);
  const padj = omCol(t, [/padj|fdr|adj.?p|q.?val/i]);
  const praw = omCol(t, [/^p.?val(ue)?$|^pvalue$|^p$/i]);
  const p = cfg.pType === 'raw' ? (praw >= 0 ? praw : padj) : (padj >= 0 ? padj : praw);
  const mean = omCol(t, [/basemean|avg.?expr|^aveexpr|mean/i]);
  return { gene, fc, p, mean, pName: p >= 0 ? t.headers[p] : 'p' };
}
CHART_KINDS.push(['volcano', 'Volcano plot (differential expression)', OMICS], ['ma', 'MA plot (mean vs fold change)', OMICS]);
SAMPLE_DATA.volcano = (() => {
  let r = 7; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const named = { CXCL9: [4.2, 1e-42], CXCL10: [4.8, 1e-51], GZMB: [3.6, 1e-33], IFNG: [3.1, 1e-25], PDCD1: [2.4, 1e-18], CD274: [2.9, 1e-22], IDO1: [3.3, 1e-27], LAG3: [2.1, 1e-14], TGFB1: [-1.9, 1e-12], VEGFA: [-2.4, 1e-16], MYC: [-1.6, 1e-9], CCND1: [-1.4, 1e-7], ARG1: [-3.1, 1e-21], IL10: [-2.2, 1e-11], FOXP3: [-1.2, 1e-5] };
  const rows = ['gene,baseMean,log2FoldChange,pvalue,padj'];
  Object.entries(named).forEach(([g, [fc, p]]) => rows.push(`${g},${Math.round(200 + rnd() * 3000)},${fc},${p},${Math.min(1, p * 30).toExponential(2)}`));
  for (let i = 0; i < 400; i++) { const fc = (rnd() - 0.5) * 3 * (rnd() < 0.15 ? 2 : 1), p = Math.min(1, Math.exp(-Math.abs(fc) * 4 * rnd() * 3) * rnd() + 1e-12); rows.push(`G${i + 1},${Math.round(5 + rnd() ** 2 * 5000)},${fc.toFixed(3)},${p.toExponential(2)},${Math.min(1, p * 12).toExponential(2)}`); }
  return rows.join('\n');
})();
SAMPLE_DATA.ma = SAMPLE_DATA.volcano;
const DE_OPTS = [
  { key: 'pType', label: 'p column', type: 'select', options: [['adj', 'Adjusted (padj / FDR)'], ['raw', 'Raw p-value']], def: 'adj' },
  { key: 'pCut', label: 'p cut-off', def: 0.05 },
  { key: 'fcCut', label: '|log₂FC| ≥', def: 1 },
  { key: 'nLabel', label: 'Label top', def: 10 },
  { key: 'highlight', label: 'Always label', type: 'text', placeholder: 'e.g. CXCL9, PDCD1' },
];
CHART_META.volcano = { hint: 'Columns from DESeq2 / edgeR / limma: gene, log2FoldChange, pvalue and/or padj (detected by name).', labels: ['log₂ fold change', '−log₁₀ adjusted p'], noTransform: true, opts: DE_OPTS };
CHART_META.ma = { hint: 'Columns: gene, baseMean (or AveExpr), log2FoldChange, padj.', labels: ['log₁₀ mean expression', 'log₂ fold change'], noTransform: true, opts: DE_OPTS };
function deChart(cfg, t, w, h, pal, ma) {
  const c = deCols(t, cfg);
  if (c.fc < 0 || c.p < 0) throw new Error('needs a log2 fold-change column and a p-value column');
  if (ma && c.mean < 0) throw new Error('needs a mean expression column (baseMean / AveExpr)');
  const pCut = +cfg.pCut || 0.05, fcCut = cfg.fcCut === '' || cfg.fcCut == null ? 1 : +cfg.fcCut;
  const rows = t.cols[c.fc].map((fc, i) => ({ g: c.gene >= 0 ? t.raw[c.gene][i] : `#${i + 1}`, fc, p: t.cols[c.p][i], m: ma ? t.cols[c.mean][i] : 0 }))
    .filter((r) => isFinite(r.fc) && isFinite(r.p) && (!ma || r.m > 0));
  rows.forEach((r) => { r.sig = r.p < pCut && Math.abs(r.fc) >= fcCut; r.dir = r.sig ? (r.fc > 0 ? 'up' : 'down') : 'ns'; r.y = ma ? r.fc : sigLog(r.p); r.x = ma ? Math.log10(r.m) : r.fc; });
  const up = cfg.colors && cfg.colors[0] ? cfg.colors[0] : '#d6584a', down = cfg.colors && cfg.colors[1] ? cfg.colors[1] : '#4a7fd6';
  const col = { up, down, ns: '#bfc5cc' };
  const xs = rows.map((r) => r.x), ys = rows.map((r) => r.y);
  const xr = ma ? [Math.min(...xs), Math.max(...xs)] : (() => { const m = Math.max(...xs.map(Math.abs)) * 1.05; return [-m, m]; })();
  const f = axesFrame(cfg, w, h, { xTicks: niceTicks(xr[0], xr[1]), yTicks: yRange(cfg, ma ? Math.min(...ys) : 0, Math.max(...ys) * 1.05) });
  let s = f.s;
  const clipX = (v) => Math.max(f.m.l, Math.min(f.m.l + f.pw, v));
  if (ma) s += `<line x1="${f.m.l}" x2="${f.m.l + f.pw}" y1="${f.Y(0)}" y2="${f.Y(0)}" stroke="#888" stroke-dasharray="4 3"/>`;
  else {
    const yp = f.Y(sigLog(pCut));
    if (yp > f.m.t) s += `<line x1="${f.m.l}" x2="${f.m.l + f.pw}" y1="${yp}" y2="${yp}" stroke="#888" stroke-dasharray="4 3"/>`;
    if (fcCut > 0) for (const v of [-fcCut, fcCut]) s += `<line x1="${clipX(f.X(v))}" x2="${clipX(f.X(v))}" y1="${f.m.t}" y2="${f.m.t + f.ph}" stroke="#888" stroke-dasharray="4 3"/>`;
  }
  const r0 = Math.max(1.4, Math.min(3, 900 / Math.sqrt(rows.length + 1) / 30));
  for (const k of ['ns', 'down', 'up']) {
    let d = '';
    rows.filter((r) => r.dir === k).forEach((r) => { d += `<circle cx="${f.X(r.x).toFixed(1)}" cy="${f.Y(r.y).toFixed(1)}" r="${r0}"/>`; });
    s += `<g fill="${col[k]}" fill-opacity="${k === 'ns' ? 0.55 : 0.85}">${d}</g>`;
  }
  const hl = new Set(String(cfg.highlight || '').split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean));
  const nLab = cfg.nLabel === '' || cfg.nLabel == null ? 10 : +cfg.nLabel;
  const top = rows.filter((r) => r.sig).sort((a, b) => a.p - b.p || Math.abs(b.fc) - Math.abs(a.fc)).slice(0, nLab);
  const lab = [...rows.filter((r) => hl.has(String(r.g).toUpperCase())), ...top.filter((r) => !hl.has(String(r.g).toUpperCase()))];
  lab.forEach((r) => { if (hl.has(String(r.g).toUpperCase())) s += `<circle cx="${f.X(r.x)}" cy="${f.Y(r.y)}" r="${r0 + 1.4}" fill="none" stroke="#222" stroke-width="1"/>`; });
  s += placeLabels(lab.map((r) => ({ x: f.X(r.x), y: f.Y(r.y), text: r.g, italic: true, minX: f.m.l, maxX: f.m.l + f.pw, minY: f.m.t, maxY: f.m.t + f.ph })), 10);
  const nUp = rows.filter((r) => r.dir === 'up').length, nDown = rows.filter((r) => r.dir === 'down').length;
  s += legendRow([[`Up (${nUp})`, up], [`Down (${nDown})`, down], ['Not significant', col.ns]], f.m.l + 8, f.m.t + 4);
  return { svg: s + titles(cfg, w, h, f), report: [`${rows.length} genes; ${nUp} up, ${nDown} down at ${c.pName} < ${pCut} and |log₂FC| ≥ ${fcCut}`, c.pName && /p.?val/i.test(c.pName) && !/adj/i.test(c.pName) ? 'Using unadjusted p-values: with thousands of genes, report adjusted p (FDR) instead.' : ''] };
}
EXTRA_CHARTS.volcano = (cfg, t, w, h, pal) => deChart(cfg, t, w, h, pal, false);
EXTRA_CHARTS.ma = (cfg, t, w, h, pal) => deChart(cfg, t, w, h, pal, true);

// ---------- UMAP / t-SNE ----------
const CLUSTER_PAL = ['#4a7fd6', '#e8743b', '#3fa58b', '#d6584a', '#9b7fd1', '#e8b33c', '#5bb5e0', '#c77cb1', '#7f9b3a', '#a0522d', '#2b6cb0', '#e88a9a', '#5f6b75', '#17a2a2', '#b8860b', '#8e44ad', '#f08a5d', '#3b8b5a', '#c0392b', '#6d7fcc'];
CHART_KINDS.push(['embedding', 'UMAP / t-SNE (colour by cluster or gene)', OMICS]);
SAMPLE_DATA.embedding = (() => {
  let r = 3; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const g = () => (rnd() + rnd() + rnd() - 1.5) * 1.3;
  const cl = [['CD8 T', -6, 3, 'CD8A'], ['CD4 T', -4, 6, 'CD4'], ['Treg', -1.5, 7.5, 'FOXP3'], ['NK', -8, -1, 'NKG7'], ['B cell', 5, 6, 'MS4A1'], ['Monocyte', 6, -3, 'CD14'], ['Macrophage', 3, -6, 'CD68'], ['Tumour', -1, -5, 'EPCAM']];
  const rows = ['cell,UMAP_1,UMAP_2,cluster,GZMB'];
  let n = 0;
  cl.forEach(([name, x, y], k) => { for (let i = 0; i < 70 + (k * 37) % 60; i++) rows.push(`c${++n},${(x + g() * 1.2).toFixed(2)},${(y + g()).toFixed(2)},${name},${(['CD8 T', 'NK'].includes(name) ? 2 + rnd() * 2 : rnd() * 0.6).toFixed(2)}`); });
  return rows.join('\n');
})();
CHART_META.embedding = { hint: 'One row per cell: UMAP_1, UMAP_2 (or tSNE / PC columns), then a cluster or cell-type column and/or gene expression columns. Export from Seurat or Scanpy as CSV.', labels: ['UMAP 1', 'UMAP 2'], noTransform: true, noAxes: true,
  opts: [{ key: 'colorBy', label: 'Colour by', type: 'text', placeholder: 'column name (blank = cluster)' }, { key: 'clusterLabels', label: '', type: 'check', def: true }, { key: 'axisStyle', label: 'Axes', type: 'select', options: [['arrows', 'Corner arrows'], ['box', 'Full axes'], ['none', 'None']], def: 'arrows' }, { key: 'pointSize', label: 'Point size', def: '' }] };
EXTRA_CHARTS.embedding = (cfg, t, w, h, pal) => {
  const xi = omCol(t, [/umap.?_?1$|tsne.?_?1$|^pc.?_?1$|dim.?_?1$|^x$/i]), yi = omCol(t, [/umap.?_?2$|tsne.?_?2$|^pc.?_?2$|dim.?_?2$|^y$/i], { skip: [xi] });
  if (xi < 0 || yi < 0) throw new Error('needs two coordinate columns (e.g. UMAP_1, UMAP_2)');
  let ci = cfg.colorBy ? t.headers.findIndex((hd) => hd.toLowerCase() === String(cfg.colorBy).trim().toLowerCase()) : -1;
  if (ci < 0) ci = omCol(t, [/cluster|ident|cell.?type|annotation|leiden|louvain/i], { numeric: false, skip: [xi, yi] });
  if (ci < 0) ci = omCol(t, [], { numeric: false, skip: [xi, yi, omCol(t, [/^(cell|barcode|id)$/i], { numeric: false })] });
  const numeric = ci >= 0 && t.cols[ci].filter(isFinite).length > t.cols[ci].length * 0.9;
  let pts = t.cols[xi].map((x, i) => ({ x, y: t.cols[yi][i], c: ci >= 0 ? (numeric ? t.cols[ci][i] : t.raw[ci][i]) : '' })).filter((p) => isFinite(p.x) && isFinite(p.y));
  const total = pts.length, MAX = 30000;
  if (pts.length > MAX) { const step = pts.length / MAX; pts = Array.from({ length: MAX }, (_, i) => pts[Math.floor(i * step)]); }
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const legW = numeric ? 60 : 110, m = { l: cfg.axisStyle === 'box' ? 48 : 18, r: legW, t: cfg.title ? 30 : 10, b: cfg.axisStyle === 'box' ? 40 : 28 };
  const pw = w - m.l - m.r, ph = h - m.t - m.b, k = Math.min(pw / (x1 - x0 || 1), ph / (y1 - y0 || 1));
  const ox = m.l + (pw - (x1 - x0) * k) / 2, oy = m.t + (ph - (y1 - y0) * k) / 2;
  const X = (v) => ox + (v - x0) * k, Y = (v) => oy + (y1 - v) * k;
  const r = +cfg.pointSize || Math.max(0.8, Math.min(3.2, 220 / Math.sqrt(pts.length)));
  let s = '';
  const cats = numeric ? [] : [...new Set(pts.map((p) => p.c))];
  const catCol = (c) => (cfg.colors && cfg.colors[cats.indexOf(c)]) || CLUSTER_PAL[cats.indexOf(c) % CLUSTER_PAL.length];
  if (numeric) {
    const vs = pts.map((p) => p.c).filter(isFinite), lo = Math.min(...vs), hi = Math.max(...vs);
    const grad = (v) => { const u = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1))); return `rgb(${Math.round(217 - 158 * u)},${Math.round(221 - 193 * u)},${Math.round(226 - 86 * u)})`; };
    [...pts].sort((a, b) => a.c - b.c).forEach((p) => { s += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}" fill="${grad(p.c)}"/>`; });
    const lx = w - legW + 14, ly = m.t + 18;
    s += `<defs><linearGradient id="emb-g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${grad(lo)}"/><stop offset="1" stop-color="${grad(hi)}"/></linearGradient></defs><text x="${lx}" y="${ly - 6}" font-weight="700" font-style="italic">${omEsc(t.headers[ci])}</text><rect x="${lx}" y="${ly}" width="10" height="80" fill="url(#emb-g)"/><text x="${lx + 14}" y="${ly + 8}">${+hi.toPrecision(3)}</text><text x="${lx + 14}" y="${ly + 80}">${+lo.toPrecision(3)}</text>`;
  } else {
    cats.forEach((c) => { let d = ''; pts.filter((p) => p.c === c).forEach((p) => { d += `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${r}"/>`; }); s += `<g fill="${catCol(c)}" fill-opacity=".8">${d}</g>`; });
    if (cfg.clusterLabels !== false) cats.forEach((c) => {
      const q = pts.filter((p) => p.c === c), med = (a) => a.sort((u, v) => u - v)[Math.floor(a.length / 2)];
      s += `<text x="${X(med(q.map((p) => p.x)))}" y="${Y(med(q.map((p) => p.y))) + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#222" stroke="#fff" stroke-width="3" paint-order="stroke">${omEsc(c)}</text>`;
    });
    cats.slice(0, Math.floor((h - m.t) / 14)).forEach((c, i) => { s += `<circle cx="${w - legW + 14}" cy="${m.t + 10 + i * 14}" r="4.5" fill="${catCol(c)}"/><text x="${w - legW + 23}" y="${m.t + 14 + i * 14}">${omEsc(c)}</text>`; });
  }
  const nameX = cfg.xLabel || t.headers[xi].replace(/_/g, ' '), nameY = cfg.yLabel || t.headers[yi].replace(/_/g, ' ');
  if (cfg.axisStyle === 'box') {
    s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="#333"/><text x="${m.l + pw / 2}" y="${h - 12}" text-anchor="middle" font-size="12">${omEsc(nameX)}</text><text transform="translate(16 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12">${omEsc(nameY)}</text>`;
  } else if (cfg.axisStyle !== 'none') {
    const ax = m.l, ay = h - 10, L = Math.min(48, pw * 0.2);
    s += `<path d="M${ax} ${ay}H${ax + L}M${ax} ${ay}V${ay - L}" stroke="#333" stroke-width="1.4" fill="none"/><path d="M${ax + L} ${ay - 3}l5 3l-5 3z M${ax - 3} ${ay - L}l3 -5l3 5z" fill="#333"/><text x="${ax + L / 2}" y="${ay + 9}" text-anchor="middle" font-size="9">${omEsc(nameX)}</text><text transform="translate(${ax - 5} ${ay - L / 2}) rotate(-90)" text-anchor="middle" font-size="9">${omEsc(nameY)}</text>`;
  }
  if (cfg.title) s += `<text x="${(w - legW) / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  return { svg: s, report: [`${total.toLocaleString()} cells${total > pts.length ? ` (${pts.length.toLocaleString()} drawn, evenly subsampled)` : ''}; coloured by ${ci >= 0 ? t.headers[ci] : '—'}${numeric ? '' : ` (${cats.length} groups)`}`] };
};

// ---------- Marker gene dot plot ----------
CHART_KINDS.push(['markerdot', 'Marker dot plot (% expressing × mean expression)', OMICS]);
SAMPLE_DATA.markerdot = (() => {
  const genes = ['CD3E', 'CD8A', 'GZMB', 'FOXP3', 'NKG7', 'MS4A1', 'CD14', 'CD68', 'EPCAM'];
  const cl = ['CD8 T', 'Treg', 'NK', 'B cell', 'Monocyte', 'Macrophage', 'Tumour'];
  const hi = { 'CD8 T': ['CD3E', 'CD8A', 'GZMB'], Treg: ['CD3E', 'FOXP3'], NK: ['NKG7', 'GZMB'], 'B cell': ['MS4A1'], Monocyte: ['CD14'], Macrophage: ['CD68', 'CD14'], Tumour: ['EPCAM'] };
  let r = 5; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const rows = ['Gene,Cluster,PctExpressed,AvgExpression'];
  cl.forEach((c) => genes.forEach((g) => { const on = hi[c].includes(g); rows.push(`${g},${c},${Math.round(on ? 55 + rnd() * 40 : rnd() * 18)},${(on ? 1.5 + rnd() * 1.5 : rnd() * 0.5).toFixed(2)}`); }));
  return rows.join('\n');
})();
CHART_META.markerdot = { hint: 'Long format, one row per gene and cluster: Gene, Cluster, % expressing, mean expression (Seurat DotPlot data or Scanpy).', noTransform: true, noAxes: true,
  opts: [{ key: 'scaleExpr', label: 'Colour', type: 'select', options: [['gene', 'Scaled per gene (z-score)'], ['none', 'Mean expression as is']], def: 'gene' }, { key: 'flip', label: '', type: 'check', def: false }] };
CHART_META.markerdot.opts[1].label = 'Genes down the side';
EXTRA_CHARTS.markerdot = (cfg, t, w, h) => {
  const G = t.raw[0] || [], C = t.raw[1] || [], P = t.cols[2] || [], E = t.cols[3] || [];
  const rows = G.map((g, i) => ({ g, c: C[i], p: P[i], e: E[i] })).filter((r) => r.g && r.c && isFinite(r.p) && isFinite(r.e));
  if (!rows.length) throw new Error('needs columns Gene, Cluster, PctExpressed, AvgExpression');
  const genes = [...new Set(rows.map((r) => r.g))], cls = [...new Set(rows.map((r) => r.c))];
  if (cfg.scaleExpr !== 'none') genes.forEach((g) => { const q = rows.filter((r) => r.g === g), vs = q.map((r) => r.e), mu = Stats.mean(vs), sd = vs.length > 1 ? Stats.sd(vs) : 1; q.forEach((r) => { r.z = Math.max(-2.5, Math.min(2.5, (r.e - mu) / (sd || 1))); }); });
  const val = (r) => (cfg.scaleExpr !== 'none' ? r.z : r.e), vs = rows.map(val), lo = Math.min(...vs), hi = Math.max(...vs);
  const pMax = Math.max(...rows.map((r) => r.p)), pct = pMax <= 1 ? 100 : 1;
  const flip = !!cfg.flip, cols = flip ? cls : genes, rws = flip ? genes : cls;
  const labW = Math.max(...rws.map((x) => measureText(x, 11, 'sans').w)) + 12, top = (cfg.title ? 30 : 10), legW = 90;
  const colLab = Math.max(...cols.map((x) => measureText(x, 11, 'sans').w)) * 0.75 + 16;
  const cw = Math.min(34, (w - labW - legW) / cols.length), rh = Math.min(30, (h - top - colLab - 8) / rws.length), R = Math.min(cw, rh) / 2 - 1;
  const lerp = (a, b, k) => `rgb(${a.map((x, q) => Math.round(x + (b[q] - x) * k)).join(',')})`;
  const BLUE = [42, 72, 160], PALE = [232, 236, 241], RED = [184, 40, 52];
  const ramp = (v) => { const u = (v - lo) / (hi - lo || 1); return cfg.scaleExpr !== 'none' ? (u < 0.5 ? lerp(BLUE, PALE, u * 2) : lerp(PALE, RED, (u - 0.5) * 2)) : lerp(PALE, BLUE, u); };
  let s = '';
  rws.forEach((rn, i) => { s += `<text x="${labW - 6}" y="${top + (i + 0.5) * rh + 4}" text-anchor="end"${flip ? ' font-style="italic"' : ''}>${omEsc(rn)}</text>`; });
  cols.forEach((cn, j) => { const x = labW + (j + 0.5) * cw, y = top + rws.length * rh + 8; s += `<text transform="translate(${x + 3} ${y}) rotate(45)"${flip ? '' : ' font-style="italic"'}>${omEsc(cn)}</text>`; });
  rows.forEach((r) => {
    const i = rws.indexOf(flip ? r.g : r.c), j = cols.indexOf(flip ? r.c : r.g);
    const rad = Math.max(0.5, R * Math.sqrt((r.p * pct) / 100));
    s += `<circle cx="${labW + (j + 0.5) * cw}" cy="${top + (i + 0.5) * rh}" r="${rad}" fill="${ramp(val(r))}" stroke="#555" stroke-width=".4"/>`;
  });
  const lx = labW + cols.length * cw + 18;
  s += `<text x="${lx}" y="${top + 8}" font-weight="700">% expressing</text>`;
  [25, 50, 75, 100].forEach((p, k) => { s += `<circle cx="${lx + R}" cy="${top + 22 + k * (2 * R + 4)}" r="${R * Math.sqrt(p / 100)}" fill="#888"/><text x="${lx + 2 * R + 6}" y="${top + 26 + k * (2 * R + 4)}">${p}</text>`; });
  const gy = top + 30 + 4 * (2 * R + 4);
  s += `<text x="${lx}" y="${gy}" font-weight="700">${cfg.scaleExpr !== 'none' ? 'Scaled expr.' : 'Mean expr.'}</text>`;
  for (let k = 0; k < 20; k++) s += `<rect x="${lx}" y="${gy + 6 + (19 - k) * 3}" width="10" height="3.2" fill="${ramp(lo + ((hi - lo) * k) / 19)}"/>`;
  s += `<text x="${lx + 14}" y="${gy + 14}">${+hi.toPrecision(2)}</text><text x="${lx + 14}" y="${gy + 66}">${+lo.toPrecision(2)}</text>`;
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  return { svg: s, report: [`${genes.length} genes × ${cls.length} clusters; dot size = % of cells expressing, colour = ${cfg.scaleExpr !== 'none' ? 'mean expression scaled per gene' : 'mean expression'}`] };
};

// ---------- Oncoprint ----------
const ONCO = {
  amp: ['Amplification', '#e3342f', 'cna'], gain: ['Gain', '#f5a3a3', 'cna'], deepdel: ['Deep deletion', '#2b6cb0', 'cna'], loss: ['Shallow deletion', '#a6c8ec', 'cna'],
  missense: ['Missense', '#3a9d23', 'mut'], truncating: ['Truncating', '#222222', 'mut'], inframe: ['In-frame', '#a0522d', 'mut'], splice: ['Splice', '#e8b33c', 'mut'], fusion: ['Fusion', '#8e44ad', 'mut'], other: ['Other', '#7a8a96', 'mut'],
  mrnaup: ['mRNA high', '#e3342f', 'rna'], mrnadown: ['mRNA low', '#2b6cb0', 'rna'],
};
function oncoType(s) {
  const k = String(s || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!k || k === 'none' || k === 'wt' || k === 'wildtype') return null;
  if (/^amp/.test(k)) return 'amp'; if (/gain/.test(k)) return 'gain'; if (/deep|homdel|^del$|deletion/.test(k)) return 'deepdel'; if (/loss|hetloss|shallow/.test(k)) return 'loss';
  if (/missense/.test(k)) return 'missense'; if (/nonsense|frameshift|truncat|stop|fs/.test(k)) return 'truncating'; if (/inframe/.test(k)) return 'inframe'; if (/splice/.test(k)) return 'splice'; if (/fusion|sv|rearr/.test(k)) return 'fusion';
  if (/mrnaup|mrnahigh|exphigh|up/.test(k)) return 'mrnaup'; if (/mrnadown|mrnalow|explow|down/.test(k)) return 'mrnadown';
  return 'other';
}
CHART_KINDS.push(['oncoprint', 'Oncoprint (alterations per gene × patient)', OMICS]);
SAMPLE_DATA.oncoprint = (() => {
  let r = 13; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const genes = [['TP53', 0.55, ['Missense', 'Missense', 'Truncating']], ['KRAS', 0.35, ['Missense']], ['CDKN2A', 0.3, ['Deep deletion', 'Truncating']], ['PIK3CA', 0.2, ['Missense', 'Amplification']], ['MYC', 0.18, ['Amplification']], ['PTEN', 0.15, ['Truncating', 'Deep deletion']], ['STK11', 0.12, ['Truncating', 'Missense']], ['ALK', 0.05, ['Fusion']]];
  const rows = ['Gene,Sample,Alteration'];
  for (let p = 1; p <= 40; p++) { let any = false; genes.forEach(([g, f, ty]) => { if (rnd() < f) { rows.push(`${g},P${p},${ty[Math.floor(rnd() * ty.length)]}`); any = true; } }); if (!any) rows.push(`TP53,P${p},none`); }
  return rows.join('\n');
})();
CHART_META.oncoprint = { hint: 'Long format: Gene, Sample, Alteration (Missense, Truncating / Nonsense / Frameshift, In-frame, Splice, Fusion, Amplification, Gain, Deep deletion, Shallow deletion, mRNA high / low). Use "none" for a profiled sample without alterations so it is counted.', noTransform: true, noAxes: true,
  opts: [{ key: 'showSamples', label: '', type: 'check', def: false }, { key: 'sortGenes', label: 'Gene order', type: 'select', options: [['freq', 'Most altered first'], ['input', 'As entered']], def: 'freq' }] };
CHART_META.oncoprint.opts[0].label = 'Show sample names';
EXTRA_CHARTS.oncoprint = (cfg, t, w, h) => {
  const G = t.raw[0] || [], S = t.raw[1] || [], A = t.raw[2] || [];
  const samples = [...new Set(S.filter(Boolean))];
  if (!samples.length) throw new Error('needs columns Gene, Sample, Alteration');
  const cell = new Map(), genesIn = [];
  G.forEach((g, i) => { if (!g || !S[i]) return; if (!genesIn.includes(g)) genesIn.push(g); const ty = oncoType(A[i]); if (!ty) return; const k = g + '\u0000' + S[i]; if (!cell.has(k)) cell.set(k, new Set()); cell.get(k).add(ty); });
  const altered = (g, s) => cell.has(g + '\u0000' + s);
  const freq = (g) => samples.filter((s) => altered(g, s)).length;
  const genes = cfg.sortGenes === 'input' ? genesIn.filter((g) => freq(g) || true) : [...genesIn].sort((a, b) => freq(b) - freq(a));
  const order = [...samples].sort((a, b) => { for (const g of genes) { const d = (altered(g, b) ? 1 : 0) - (altered(g, a) ? 1 : 0); if (d) return d; } return 0; });
  const labW = Math.max(...genes.map((g) => measureText(g, 11, 'sans').w)) + 46, top = (cfg.title ? 30 : 10) + 30;
  const used = new Set([...cell.values()].flatMap((x) => [...x]));
  const legH = 18 + Math.ceil(used.size / Math.max(1, Math.floor((w - labW) / 112))) * 14, sampH = cfg.showSamples ? 40 : 0;
  const cw = (w - labW - 10) / order.length, rh = Math.min(24, (h - top - legH - sampH - 6) / genes.length);
  let s = '';
  // Per-sample burden bar on top.
  const burden = order.map((sm) => genes.filter((g) => altered(g, sm)).length), bMax = Math.max(1, ...burden);
  burden.forEach((b, j) => { if (b) s += `<rect x="${labW + j * cw + cw * 0.1}" y="${top - 4 - (b / bMax) * 24}" width="${cw * 0.8}" height="${(b / bMax) * 24}" fill="#9aa7b4"/>`; });
  genes.forEach((g, i) => {
    const y = top + i * rh, pct = Math.round((freq(g) / samples.length) * 100);
    s += `<text x="${labW - 40}" y="${y + rh / 2 + 4}" text-anchor="end" font-style="italic">${omEsc(g)}</text><text x="${labW - 6}" y="${y + rh / 2 + 4}" text-anchor="end">${pct}%</text>`;
    order.forEach((sm, j) => {
      const x = labW + j * cw, ty = cell.get(g + '\u0000' + sm) || new Set(), gap = Math.min(1.5, cw * 0.12);
      s += `<rect x="${x + gap / 2}" y="${y + 1}" width="${cw - gap}" height="${rh - 2}" fill="#e3e6ea"/>`;
      [...ty].filter((k) => ONCO[k][2] === 'cna').forEach((k) => { s += `<rect x="${x + gap / 2}" y="${y + 1}" width="${cw - gap}" height="${rh - 2}" fill="${ONCO[k][1]}"/>`; });
      const muts = [...ty].filter((k) => ONCO[k][2] === 'mut');
      muts.forEach((k, q) => { const hh = (rh - 2) / 3, yy = y + 1 + hh + (muts.length > 1 ? (q - (muts.length - 1) / 2) * hh * 0.7 : 0); s += `<rect x="${x + gap / 2}" y="${yy}" width="${cw - gap}" height="${hh}" fill="${ONCO[k][1]}"/>`; });
      [...ty].filter((k) => ONCO[k][2] === 'rna').forEach((k) => { s += `<rect x="${x + gap / 2 + 0.5}" y="${y + 1.5}" width="${cw - gap - 1}" height="${rh - 3}" fill="none" stroke="${ONCO[k][1]}" stroke-width="1"/>`; });
    });
  });
  const by = top + genes.length * rh;
  if (cfg.showSamples) order.forEach((sm, j) => { s += `<text transform="translate(${labW + (j + 0.5) * cw + 3} ${by + 6}) rotate(60)" font-size="8">${omEsc(sm)}</text>`; });
  const perRow = Math.max(1, Math.floor((w - labW) / 112));
  [...used].forEach((k, i) => {
    const x = labW + (i % perRow) * 112, y = by + sampH + 12 + Math.floor(i / perRow) * 14, [name, col, kind] = ONCO[k];
    s += kind === 'cna' ? `<rect x="${x}" y="${y}" width="8" height="12" fill="${col}"/>` : kind === 'rna' ? `<rect x="${x}" y="${y}" width="8" height="12" fill="#e3e6ea" stroke="${col}"/>` : `<rect x="${x}" y="${y}" width="8" height="12" fill="#e3e6ea"/><rect x="${x}" y="${y + 4}" width="8" height="4" fill="${col}"/>`;
    s += `<text x="${x + 12}" y="${y + 10}">${name}</text>`;
  });
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  const anyAlt = order.filter((sm) => genes.some((g) => altered(g, sm))).length;
  return { svg: s, report: [`${samples.length} samples, ${genes.length} genes; ${anyAlt} samples (${Math.round((anyAlt / samples.length) * 100)}%) altered in at least one gene. Bars on top = alterations per sample.`] };
};

// ---------- Lollipop mutation plot ----------
const MUT_COL = { missense: '#3a9d23', truncating: '#222222', nonsense: '#222222', frameshift: '#222222', inframe: '#a0522d', splice: '#e8b33c', fusion: '#8e44ad', other: '#7a8a96' };
CHART_KINDS.push(['lollipop', 'Lollipop mutation plot (on protein domains)', OMICS]);
SAMPLE_DATA.lollipop = 'Position,Count,Type,Label\n175,38,Missense,R175H\n248,31,Missense,R248Q\n273,27,Missense,R273H\n245,14,Missense,G245S\n249,12,Missense,R249S\n282,11,Missense,R282W\n220,9,Missense,Y220C\n213,8,Truncating,R213*\n196,6,Truncating,R196*\n342,5,Truncating,R342*\n158,4,Missense,R158H\n306,4,Truncating,R306*\n132,3,Missense,K132N\n337,3,Missense,R337H\n110,2,Missense,R110L\n224,2,Splice,E224=\n58,1,Truncating,Q52fs';
CHART_META.lollipop = { hint: 'One row per mutated position: Position, Count, Type (Missense, Truncating, In-frame, Splice, Fusion), Label (e.g. R175H). Set the protein length and domains below.', labels: ['', '# mutations'], noTransform: true, noAxes: true,
  opts: [{ key: 'protLen', label: 'Length (aa)', def: 393 }, { key: 'domains', label: 'Domains', type: 'textarea', rows: 3, def: 'Transactivation, 1, 61, #9b7fd1\nDNA-binding, 94, 292, #4a7fd6\nTetramerisation, 325, 356, #3fa58b', placeholder: 'name, start, end, colour' }, { key: 'nLabel', label: 'Label top', def: 6 }] };
EXTRA_CHARTS.lollipop = (cfg, t, w, h) => {
  const pi = omCol(t, [/^pos(ition)?$|aa.?pos|residue|codon/i]), ci = omCol(t, [/count|n$|freq|samples/i], { skip: [pi] });
  const ti = t.headers.findIndex((x) => /type|class|consequence/i.test(x)), li = t.headers.findIndex((x) => /label|change|hgvs|protein|mutation/i.test(x));
  if (pi < 0) throw new Error('needs a Position column');
  const muts = t.cols[pi].map((p, i) => ({ p, n: ci >= 0 && isFinite(t.cols[ci][i]) ? t.cols[ci][i] : 1, ty: ti >= 0 ? t.raw[ti][i] : 'Missense', lab: li >= 0 ? t.raw[li][i] : '' })).filter((m) => isFinite(m.p));
  const len = +cfg.protLen || Math.max(...muts.map((m) => m.p)) + 10;
  const doms = typeof parseDomainRows === 'function' ? parseDomainRows(String(cfg.domains || '')) : [];
  const m = { l: 46, r: 16, t: cfg.title ? 30 : 12, b: 54 };
  const pw = w - m.l - m.r, base = h - m.b, ph = base - m.t - 26, X = (aa) => m.l + ((aa - 1) / (len - 1)) * pw;
  const nMax = Math.max(...muts.map((q) => q.n)), yt = niceTicks(0, nMax, 4), Y = (v) => base - 12 - (v / yt[yt.length - 1]) * ph;
  let s = '';
  yt.forEach((v) => { s += `<line x1="${m.l - 4}" x2="${m.l}" y1="${Y(v)}" y2="${Y(v)}" stroke="#333"/><text x="${m.l - 7}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`; });
  s += `<line x1="${m.l}" x2="${m.l}" y1="${Y(yt[yt.length - 1])}" y2="${Y(0)}" stroke="#333" stroke-width="1.3"/>`;
  s += `<text transform="translate(14 ${(Y(0) + Y(yt[yt.length - 1])) / 2}) rotate(-90)" text-anchor="middle" font-size="12">${omEsc(cfg.yLabel || '# mutations')}</text>`;
  const sorted = [...muts].sort((a, b) => a.n - b.n);
  sorted.forEach((q) => { const col = MUT_COL[oncoType(q.ty)] || MUT_COL.other; s += `<line x1="${X(q.p)}" x2="${X(q.p)}" y1="${base - 4}" y2="${Y(q.n)}" stroke="#9aa3ad" stroke-width="1"/><circle cx="${X(q.p)}" cy="${Y(q.n)}" r="${3 + Math.sqrt(q.n / nMax) * 3}" fill="${col}" stroke="#fff" stroke-width=".8"/>`; });
  const nLab = cfg.nLabel === '' || cfg.nLabel == null ? 6 : +cfg.nLabel;
  s += placeLabels([...muts].filter((q) => q.lab).sort((a, b) => b.n - a.n).slice(0, nLab).map((q) => ({ x: X(q.p), y: Y(q.n) - 4, text: q.lab, minX: m.l, maxX: w, minY: 0, maxY: base - 8 })), 10);
  s += `<rect x="${m.l}" y="${base - 4}" width="${pw}" height="8" rx="3" fill="#cfd6dd"/>`;
  doms.forEach((d, i) => {
    const c = d.color || CHART_PALETTE[i % CHART_PALETTE.length], x = X(d.start), ww = Math.max(3, X(d.end) - X(d.start));
    s += `<rect x="${x}" y="${base - 9}" width="${ww}" height="18" rx="5" fill="${c}" stroke="${Color.dark(c, 0.3)}" stroke-width=".8"/>`;
    const tw = measureText(d.name, 9, 'sans').w;
    s += tw + 4 < ww ? `<text x="${x + ww / 2}" y="${base + 3.5}" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">${omEsc(d.name)}</text>` : `<text x="${x + ww / 2}" y="${base + 22}" text-anchor="middle" font-size="9">${omEsc(d.name)}</text>`;
  });
  niceTicks(1, len, 6).filter((v) => v >= 1 && v <= len).forEach((v) => { s += `<text x="${X(v)}" y="${base + 34}" text-anchor="middle" font-size="9" fill="#666">${v}</text>`; });
  s += `<text x="${m.l + pw}" y="${base + 46}" text-anchor="end" font-size="9" fill="#666">${len} aa</text>`;
  const kinds = [...new Set(muts.map((q) => oncoType(q.ty) || 'other'))];
  kinds.forEach((k, i) => { s += `<circle cx="${m.l + pw - 90}" cy="${m.t + 6 + i * 13}" r="4" fill="${MUT_COL[k] || MUT_COL.other}"/><text x="${m.l + pw - 82}" y="${m.t + 10 + i * 13}">${(ONCO[k] || ONCO.other)[0]}</text>`; });
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  const total = muts.reduce((a, q) => a + q.n, 0);
  return { svg: s, report: [`${muts.length} positions, ${total} mutations; hotspot ${[...muts].sort((a, b) => b.n - a.n)[0]?.lab || ''} (n = ${nMax})`] };
};

// ---------- Forest plot ----------
CHART_KINDS.push(['forest', 'Forest plot (hazard / odds ratios)', OMICS]);
SAMPLE_DATA.forest = 'Subgroup,HR,Lower,Upper,p\nAll patients,0.68,0.55,0.84,0.0004\nAge,,,,\n< 65 years,0.62,0.46,0.83,0.001\n≥ 65 years,0.77,0.56,1.06,0.11\nPD-L1 TPS,,,,\n< 1%,0.94,0.66,1.34,0.73\n1–49%,0.69,0.49,0.97,0.03\n≥ 50%,0.48,0.33,0.70,0.0001\nSmoking,,,,\nNever,0.85,0.52,1.39,0.52\nFormer / current,0.64,0.51,0.81,0.0002';
CHART_META.forest = { hint: 'Columns: label, estimate, lower CI, upper CI, optional p. A row with only a label is a bold subgroup heading; the rows under it are indented.', labels: ['Hazard ratio (95% CI)', ''], noTransform: true, noAxes: true,
  opts: [{ key: 'logX', label: '', type: 'check', def: true }, { key: 'refLine', label: 'No-effect line', def: 1 }, { key: 'favour', label: 'Arrows', type: 'text', def: 'Favours treatment|Favours control', placeholder: 'left text|right text' }] };
CHART_META.forest.opts[0].label = 'Log scale (ratios)';
EXTRA_CHARTS.forest = (cfg, t, w, h, pal) => {
  const n = t.raw[0].length, rows = Array.from({ length: n }, (_, i) => ({ lab: t.raw[0][i], e: t.cols[1]?.[i], lo: t.cols[2]?.[i], hi: t.cols[3]?.[i], p: t.cols[4]?.[i] }));
  const est = rows.filter((r) => isFinite(r.e) && isFinite(r.lo) && isFinite(r.hi));
  if (!est.length) throw new Error('needs columns label, estimate, lower, upper');
  const logX = cfg.logX !== false && est.every((r) => r.lo > 0);
  const tf = (v) => (logX ? Math.log10(v) : v), ref = cfg.refLine === '' || cfg.refLine == null ? (logX ? 1 : 0) : +cfg.refLine;
  const lo = Math.min(...est.map((r) => tf(r.lo)), tf(ref)), hi = Math.max(...est.map((r) => tf(r.hi)), tf(ref));
  const labW = Math.min(w * 0.36, Math.max(...rows.map((r) => measureText(r.lab, 11, 'sans').w)) + 12), txtW = 120, top = cfg.title ? 32 : 14;
  const hasP = t.cols[4] && rows.some((r) => isFinite(r.p));
  const px0 = labW + 6, px1 = w - txtW - (hasP ? 46 : 0) - 8, bottom = h - 44, rh = Math.min(22, (bottom - top - 16) / rows.length);
  const pad = (hi - lo) * 0.06, X = (v) => px0 + ((tf(v) - (lo - pad)) / (hi - lo + 2 * pad)) * (px1 - px0);
  let s = `<text x="${px1 + 8}" y="${top + 4}" font-weight="700">${omEsc(t.headers[1] || 'Estimate')} (95% CI)</text>${hasP ? `<text x="${w - 6}" y="${top + 4}" text-anchor="end" font-weight="700">p</text>` : ''}`;
  const wMax = Math.max(...est.map((r) => 1 / Math.max(1e-6, tf(r.hi) - tf(r.lo))));
  let seenHead = false;
  rows.forEach((r, i) => {
    const y = top + 16 + (i + 0.5) * rh, head = !isFinite(r.e);
    if (head) seenHead = true;
    const indent = !head && seenHead ? 12 : 0; // rows under a subgroup heading are indented
    s += `<text x="${4 + indent}" y="${y + 4}"${head ? ' font-weight="700"' : ''}>${omEsc(String(r.lab).trim())}</text>`;
    if (head) return;
    const col = (cfg.colors && cfg.colors[0]) || '#23395d', sz = 3 + 5 * Math.sqrt((1 / Math.max(1e-6, tf(r.hi) - tf(r.lo))) / wMax);
    s += `<line x1="${X(r.lo)}" x2="${X(r.hi)}" y1="${y}" y2="${y}" stroke="${col}" stroke-width="1.4"/><rect x="${X(r.e) - sz}" y="${y - sz}" width="${2 * sz}" height="${2 * sz}" fill="${col}"/>`;
    s += `<text x="${px1 + 8}" y="${y + 4}">${r.e.toFixed(2)} (${r.lo.toFixed(2)}–${r.hi.toFixed(2)})</text>`;
    if (hasP && isFinite(r.p)) s += `<text x="${w - 6}" y="${y + 4}" text-anchor="end">${r.p < 0.001 ? '&lt;0.001' : r.p.toFixed(r.p < 0.01 ? 3 : 2)}</text>`;
  });
  const axY = top + 16 + rows.length * rh + 4;
  s += `<line x1="${X(ref)}" x2="${X(ref)}" y1="${top + 10}" y2="${axY}" stroke="#555" stroke-dasharray="3 3"/><line x1="${px0}" x2="${px1}" y1="${axY}" y2="${axY}" stroke="#333"/>`;
  const ticks = logX ? [0.1, 0.2, 0.25, 0.5, 1, 2, 4, 5, 10, 20].filter((v) => tf(v) >= lo - pad && tf(v) <= hi + pad) : niceTicks(lo, hi, 5);
  ticks.forEach((v) => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${axY}" y2="${axY + 4}" stroke="#333"/><text x="${X(v)}" y="${axY + 15}" text-anchor="middle">${v}</text>`; });
  s += `<text x="${(px0 + px1) / 2}" y="${axY + 30}" text-anchor="middle" font-size="12">${omEsc(cfg.xLabel || '')}</text>`;
  const fav = String(cfg.favour || '').split('|');
  if (fav[0]) s += `<text x="${X(ref) - 6}" y="${axY + 42}" text-anchor="end" font-size="10" fill="#555">← ${omEsc(fav[0])}</text>`;
  if (fav[1]) s += `<text x="${X(ref) + 6}" y="${axY + 42}" font-size="10" fill="#555">${omEsc(fav[1])} →</text>`;
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  return { svg: s, report: [`${est.length} estimates${logX ? ' on a log scale' : ''}; square size ∝ precision (1 / CI width). Overlapping subgroup CIs are not a test of interaction.`] };
};

// ---------- Venn & UpSet ----------
function setsFrom(t) {
  return t.headers.map((name, k) => ({ name, items: new Set(t.raw[k].map((x) => x.trim()).filter(Boolean)) })).filter((s) => s.items.size);
}
CHART_KINDS.push(['venn', 'Venn diagram (2–3 sets)', OMICS], ['upset', 'UpSet plot (many sets)', OMICS]);
SAMPLE_DATA.venn = 'Up in CD8 T,Up in NK,Up in tumour\nGZMB,GZMB,MKI67\nPRF1,PRF1,TOP2A\nIFNG,IFNG,MYC\nCD8A,NKG7,CCND1\nCD3E,KLRD1,MKI67\nPDCD1,FCGR3A,EPCAM\nLAG3,NCAM1,KRT8\nHAVCR2,KLRB1,KRT18\nTOX,TYROBP,SOX2\nMKI67,MKI67,VIM\nCXCL13,XCL1,CD274\nTIGIT,TIGIT,TIGIT';
SAMPLE_DATA.upset = 'Patient A,Patient B,Patient C,Patient D\nTP53,TP53,TP53,KRAS\nKRAS,KRAS,PIK3CA,PIK3CA\nCDKN2A,STK11,CDKN2A,TP53\nPTEN,KEAP1,MYC,ARID1A\nARID1A,SMARCA4,ARID1A,NF1\nEGFR,EGFR,,BRAF\nRB1,,RB1,';
CHART_META.venn = { hint: 'One column per set (header = set name), listing the items (genes, peptides…) in that set. Counts are exact; circle sizes are not to scale.', noTransform: true, noAxes: true, opts: [{ key: 'showItems', label: '', type: 'check', def: false }] };
CHART_META.venn.opts[0].label = 'List items (small sets)';
CHART_META.upset = { hint: 'One column per set (header = set name), listing the items in each set. Shows the size of every exact intersection.', noTransform: true, noAxes: true, opts: [{ key: 'maxBars', label: 'Show top', def: 15 }] };
EXTRA_CHARTS.venn = (cfg, t, w, h, pal) => {
  const sets = setsFrom(t);
  if (sets.length < 2 || sets.length > 3) throw new Error('Venn needs 2 or 3 columns — use UpSet for more sets');
  const all = [...new Set(sets.flatMap((s) => [...s.items]))];
  const region = (mask) => all.filter((x) => sets.every((s, k) => s.items.has(x) === !!(mask & (1 << k))));
  const top = cfg.title ? 30 : 10, cx = w / 2, cy = top + (h - top) / 2 + (sets.length === 3 ? 6 : 0), R = Math.min(w / (sets.length === 3 ? 3.4 : 3.2), (h - top) / (sets.length === 3 ? 3.1 : 2.4));
  const centres = sets.length === 2 ? [[cx - R * 0.55, cy], [cx + R * 0.55, cy]] : [[cx - R * 0.55, cy - R * 0.38], [cx + R * 0.55, cy - R * 0.38], [cx, cy + R * 0.58]];
  const cols = sets.map((_, k) => (cfg.colors && cfg.colors[k]) || pal[k % pal.length]);
  let s = centres.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${R}" fill="${cols[k]}" fill-opacity=".22" stroke="${cols[k]}" stroke-width="1.8"/>`).join('');
  const pos = sets.length === 2 ? { 1: [cx - R * 1.0, cy], 2: [cx + R * 1.0, cy], 3: [cx, cy] }
    : { 1: [cx - R * 1.05, cy - R * 0.6], 2: [cx + R * 1.05, cy - R * 0.6], 4: [cx, cy + R * 1.1], 3: [cx, cy - R * 0.72], 5: [cx - R * 0.62, cy + R * 0.32], 6: [cx + R * 0.62, cy + R * 0.32], 7: [cx, cy] };
  Object.entries(pos).forEach(([mask, [x, y]]) => {
    const r = region(+mask);
    s += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" font-weight="700">${r.length}</text>`;
    if (cfg.showItems && r.length && r.length <= 6) r.forEach((it, i) => { s += `<text x="${x}" y="${y + 19 + i * 10}" text-anchor="middle" font-size="8" font-style="italic" fill="#555">${omEsc(it)}</text>`; });
  });
  const lp = sets.length === 2 ? [[cx - R * 0.9, cy - R - 8, 'end'], [cx + R * 0.9, cy - R - 8, 'start']] : [[centres[0][0] - R * 0.5, centres[0][1] - R - 6, 'end'], [centres[1][0] + R * 0.5, centres[1][1] - R - 6, 'start'], [cx, centres[2][1] + R + 16, 'middle']];
  sets.forEach((st, k) => { s += `<text x="${lp[k][0]}" y="${lp[k][1]}" text-anchor="${lp[k][2]}" font-size="12" font-weight="700" fill="${Color.dark(cols[k], 0.25)}">${omEsc(st.name)} (${st.items.size})</text>`; });
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  const core = region((1 << sets.length) - 1);
  return { svg: s, report: [`${all.length} distinct items; shared by all ${sets.length} sets: ${core.length}${core.length && core.length <= 12 ? ` (${core.join(', ')})` : ''}`] };
};
EXTRA_CHARTS.upset = (cfg, t, w, h, pal) => {
  const sets = setsFrom(t);
  if (sets.length < 2) throw new Error('needs at least 2 columns (sets)');
  const all = [...new Set(sets.flatMap((s) => [...s.items]))], combos = new Map();
  all.forEach((x) => { const key = sets.map((s) => (s.items.has(x) ? 1 : 0)).join(''); combos.set(key, (combos.get(key) || 0) + 1); });
  const bars = [...combos.entries()].sort((a, b) => b[1] - a[1]).slice(0, +cfg.maxBars || 15);
  const col = (cfg.colors && cfg.colors[0]) || '#23395d';
  const top = cfg.title ? 30 : 10, labW = Math.max(...sets.map((s) => measureText(s.name, 11, 'sans').w)) + 70, rowH = Math.min(20, (h - top) * 0.4 / sets.length);
  const matTop = h - 8 - sets.length * rowH, barBot = matTop - 8, bw = (w - labW - 10) / bars.length, bMax = Math.max(...bars.map((b) => b[1]));
  let s = '';
  bars.forEach(([key, n], j) => {
    const x = labW + (j + 0.5) * bw, bh = ((barBot - top - 14) * n) / bMax;
    s += `<rect x="${x - bw * 0.35}" y="${barBot - bh}" width="${bw * 0.7}" height="${bh}" fill="${col}"/><text x="${x}" y="${barBot - bh - 3}" text-anchor="middle" font-size="10">${n}</text>`;
    const on = [...key].map((c, k) => (c === '1' ? k : -1)).filter((k) => k >= 0);
    sets.forEach((_, k) => { s += `<circle cx="${x}" cy="${matTop + (k + 0.5) * rowH}" r="${Math.min(5, rowH * 0.3)}" fill="${on.includes(k) ? col : '#d5d9de'}"/>`; });
    if (on.length > 1) s += `<line x1="${x}" x2="${x}" y1="${matTop + (on[0] + 0.5) * rowH}" y2="${matTop + (on[on.length - 1] + 0.5) * rowH}" stroke="${col}" stroke-width="2"/>`;
  });
  const sMax = Math.max(...sets.map((st) => st.items.size));
  sets.forEach((st, k) => {
    const y = matTop + (k + 0.5) * rowH, bl = (56 * st.items.size) / sMax;
    if (k % 2 === 0) s = `<rect x="${labW - 4}" y="${matTop + k * rowH}" width="${w - labW - 6}" height="${rowH}" fill="#f3f5f7"/>` + s;
    s += `<rect x="${labW - 8 - bl}" y="${y - rowH * 0.3}" width="${bl}" height="${rowH * 0.6}" fill="#8b98a5"/><text x="${labW - 70}" y="${y + 4}" text-anchor="end">${omEsc(st.name)}</text>`;
  });
  s += `<text transform="translate(${labW - 6} ${(top + barBot) / 2}) rotate(-90)" text-anchor="middle" font-size="11">Intersection size</text>`;
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  return { svg: s, report: [`${sets.length} sets, ${all.length} distinct items, ${combos.size} non-empty exact intersections${combos.size > bars.length ? ` (top ${bars.length} shown)` : ''}`] };
};

// ---------- Waterfall (best response) ----------
const RECIST = { CR: ['Complete response', '#1f4e8c'], PR: ['Partial response', '#4a7fd6'], SD: ['Stable disease', '#9aa7b4'], PD: ['Progressive disease', '#d6584a'], NE: ['Not evaluable', '#d5d9de'] };
const recistOf = (v) => (v <= -100 ? 'CR' : v <= -30 ? 'PR' : v >= 20 ? 'PD' : 'SD');
CHART_KINDS.push(['waterfall', 'Waterfall plot (best tumour response)', OMICS], ['swimmer', 'Swimmer plot (time on treatment)', OMICS]);
SAMPLE_DATA.waterfall = (() => { let r = 17; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; }; const rows = ['Patient,Best change (%),Arm']; for (let i = 1; i <= 30; i++) rows.push(`P${i},${Math.round(-100 + rnd() * 160 + (i % 3 === 0 ? 30 : 0))},${i % 3 === 0 ? 'Monotherapy' : 'Combination'}`); return rows.join('\n'); })();
SAMPLE_DATA.swimmer = 'Patient,Months,Best response,Ongoing,Response start,Progression\nP01,24,CR,1,2,\nP02,21,PR,1,3,\nP03,18,PR,0,2,15\nP04,15,SD,0,,12\nP05,14,PR,1,4,\nP06,11,SD,0,,9\nP07,9,PD,0,,3\nP08,8,PR,0,2,7\nP09,6,SD,1,,\nP10,4,PD,0,,2\nP11,3,PD,0,,2\nP12,2,NE,0,,';
CHART_META.waterfall = { hint: 'Columns: patient, best % change in tumour size (RECIST sum of diameters), optional group / arm (else bars are coloured by RECIST response).', labels: ['', 'Best change from baseline (%)'], noTransform: true,
  opts: [{ key: 'colorBy', label: 'Colour by', type: 'select', options: [['recist', 'RECIST response'], ['group', 'Third column (arm / group)']], def: 'recist' }, { key: 'thresholds', label: '', type: 'check', def: true }] };
CHART_META.waterfall.opts[1].label = '+20% / −30% lines';
CHART_META.swimmer = { hint: 'Columns: patient, time on treatment, best response (CR, PR, SD, PD, NE), ongoing (1 / 0), optional response start and progression times.', labels: ['Months on treatment', ''], noTransform: true, noAxes: true };
EXTRA_CHARTS.waterfall = (cfg, t, w, h, pal) => {
  const vi = omCol(t, [/change|%|response|pct/i]), gi = t.headers.length > 2 ? 2 : -1;
  if (vi < 0) throw new Error('needs a % change column');
  const rows = t.cols[vi].map((v, i) => ({ id: t.raw[0][i], v, g: gi >= 0 ? t.raw[gi][i] : '' })).filter((r) => isFinite(r.v)).sort((a, b) => b.v - a.v);
  const groups = [...new Set(rows.map((r) => r.g))], byGroup = cfg.colorBy === 'group' && gi >= 0;
  const f = axesFrame({ ...cfg, xLabel: cfg.xLabel || '' }, w, h, { xCats: rows.map(() => ''), yTicks: yRange(cfg, Math.min(-100, ...rows.map((r) => r.v)), Math.max(40, ...rows.map((r) => r.v))) });
  let s = f.s;
  if (cfg.thresholds !== false) for (const v of [20, -30]) s += `<line x1="${f.m.l}" x2="${f.m.l + f.pw}" y1="${f.Y(v)}" y2="${f.Y(v)}" stroke="#666" stroke-dasharray="4 3"/><text x="${f.m.l + 3}" y="${f.Y(v) - 3}" font-size="9" fill="#666">${v > 0 ? '+' : ''}${v}%</text>`;
  rows.forEach((r, i) => { const col = byGroup ? pal[groups.indexOf(r.g) % pal.length] : RECIST[recistOf(r.v)][1]; s += `<rect x="${f.X(i) - f.band * 0.4}" y="${Math.min(f.Y(0), f.Y(r.v))}" width="${f.band * 0.8}" height="${Math.abs(f.Y(r.v) - f.Y(0))}" fill="${col}"/>`; });
  s += `<line x1="${f.m.l}" x2="${f.m.l + f.pw}" y1="${f.Y(0)}" y2="${f.Y(0)}" stroke="#333"/>`;
  const leg = byGroup ? groups.map((g, k) => [g, pal[k % pal.length]]) : Object.keys(RECIST).filter((k) => rows.some((r) => recistOf(r.v) === k)).map((k) => [RECIST[k][0], RECIST[k][1]]);
  s += leg.map(([lab, c], i) => `<rect x="${f.m.l + f.pw - 120}" y="${f.m.t + 4 + i * 14}" width="10" height="10" fill="${c}"/><text x="${f.m.l + f.pw - 106}" y="${f.m.t + 13 + i * 14}">${omEsc(lab)}</text>`).join('');
  const orr = rows.filter((r) => r.v <= -30).length;
  return { svg: s + titles(cfg, w, h, f), report: [`${rows.length} patients; objective response (≤ −30%) in ${orr} (${Math.round((orr / rows.length) * 100)}%). RECIST also needs non-target and new lesions — bar colours use the size change only.`] };
};
EXTRA_CHARTS.swimmer = (cfg, t, w, h) => {
  const ti = omCol(t, [/month|week|day|time|duration/i]), ri = t.headers.findIndex((x) => /response|recist|bor/i.test(x) && !/start/i.test(x));
  const oi = t.headers.findIndex((x) => /ongoing|censor|active/i.test(x)), si = t.headers.findIndex((x) => /start|onset/i.test(x)), pi = t.headers.findIndex((x) => /progress|pd$/i.test(x));
  if (ti < 0) throw new Error('needs a time column');
  const rows = t.cols[ti].map((v, i) => ({ id: t.raw[0][i], v, r: ri >= 0 ? String(t.raw[ri][i]).toUpperCase().trim() : '', on: oi >= 0 && t.cols[oi][i] === 1, s: si >= 0 ? t.cols[si][i] : NaN, p: pi >= 0 ? t.cols[pi][i] : NaN })).filter((r) => isFinite(r.v)).sort((a, b) => b.v - a.v);
  const top = cfg.title ? 30 : 10, labW = Math.max(...rows.map((r) => measureText(r.id, 10, 'sans').w)) + 10, legH = 34, bottom = h - 34 - legH;
  const xt = niceTicks(0, Math.max(...rows.map((r) => r.v)) * 1.06), X = (v) => labW + (v / xt[xt.length - 1]) * (w - labW - 20), rh = (bottom - top) / rows.length;
  let s = '';
  rows.forEach((r, i) => {
    const y = top + i * rh, c = (RECIST[r.r] || RECIST.NE)[1];
    s += `<text x="${labW - 5}" y="${y + rh / 2 + 3.5}" text-anchor="end" font-size="10">${omEsc(r.id)}</text><rect x="${labW}" y="${y + rh * 0.2}" width="${X(r.v) - labW}" height="${rh * 0.6}" rx="2" fill="${c}"/>`;
    if (r.on) s += `<path d="M${X(r.v) + 3} ${y + rh / 2}h10m-4 -4l4 4l-4 4" stroke="#333" stroke-width="1.4" fill="none"/>`;
    if (isFinite(r.s)) s += `<path d="M${X(r.s)} ${y + rh * 0.12}l4 7h-8z" fill="#fff" stroke="#222" stroke-width="1"/>`;
    if (isFinite(r.p)) s += `<path d="M${X(r.p) - 3.5} ${y + rh / 2 - 3.5}l7 7m0 -7l-7 7" stroke="#222" stroke-width="1.8"/>`;
  });
  xt.forEach((v) => { s += `<line x1="${X(v)}" x2="${X(v)}" y1="${bottom}" y2="${bottom + 4}" stroke="#333"/><text x="${X(v)}" y="${bottom + 15}" text-anchor="middle">${v}</text>`; });
  s += `<line x1="${labW}" x2="${X(xt[xt.length - 1])}" y1="${bottom}" y2="${bottom}" stroke="#333"/><text x="${(labW + w) / 2}" y="${bottom + 29}" text-anchor="middle" font-size="12">${omEsc(cfg.xLabel || t.headers[ti])}</text>`;
  const used = Object.keys(RECIST).filter((k) => rows.some((r) => r.r === k));
  const ly = h - legH + 8;
  let lx = labW;
  used.forEach((k) => { s += `<rect x="${lx}" y="${ly}" width="10" height="10" fill="${RECIST[k][1]}"/><text x="${lx + 14}" y="${ly + 9}">${RECIST[k][0]}</text>`; lx += 26 + measureText(RECIST[k][0], 11, 'sans').w; });
  s += `<path d="M${labW} ${ly + 22}l4 7h-8z" transform="translate(4 -6)" fill="#fff" stroke="#222"/><text x="${labW + 12}" y="${ly + 24}">Response start</text><path d="M${labW + 110} ${ly + 16}l7 7m0 -7l-7 7" stroke="#222" stroke-width="1.8"/><text x="${labW + 122}" y="${ly + 24}">Progression</text><path d="M${labW + 210} ${ly + 20}h10m-4 -4l4 4l-4 4" stroke="#333" stroke-width="1.4" fill="none"/><text x="${labW + 226}" y="${ly + 24}">Ongoing</text>`;
  if (cfg.title) s += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  return { svg: s, report: [`${rows.length} patients; ${rows.filter((r) => r.on).length} still on treatment`] };
};

// ---------- Sequence alignment + logo ----------
const AA_CLUSTAL = { A: '#80a0f0', I: '#80a0f0', L: '#80a0f0', M: '#80a0f0', F: '#80a0f0', W: '#80a0f0', V: '#80a0f0', C: '#f08080', K: '#f01505', R: '#f01505', E: '#c048c0', D: '#c048c0', N: '#15c015', Q: '#15c015', S: '#15c015', T: '#15c015', G: '#f09048', P: '#c0c000', H: '#15a4a4', Y: '#15a4a4' };
const NT_COL = { A: '#3fa55b', C: '#4a7fd6', G: '#e8b33c', T: '#d6584a', U: '#d6584a' };
function parseAlignment(text) {
  const lines = String(text || '').split(/\r?\n/), seqs = [];
  if (lines.some((l) => l.startsWith('>'))) { let cur = null; lines.forEach((l) => { if (l.startsWith('>')) { cur = { name: l.slice(1).trim().split(/\s+/)[0] || `seq${seqs.length + 1}`, seq: '' }; seqs.push(cur); } else if (cur) cur.seq += l.replace(/\s+/g, ''); }); }
  else lines.forEach((l) => { const m = l.trim().match(/^(\S+)[\s,]+([A-Za-z.\-*]+)$/); if (m) { const s0 = seqs.find((x) => x.name === m[1]); if (s0) s0.seq += m[2]; else seqs.push({ name: m[1], seq: m[2] }); } });
  seqs.forEach((s) => { s.seq = s.seq.toUpperCase(); });
  return seqs.filter((s) => s.seq);
}
CHART_KINDS.push(['alignment', 'Sequence alignment + logo', OMICS]);
SAMPLE_DATA.alignment = '>Human_CDR3_1\nCASSLGQAYEQYF\n>Human_CDR3_2\nCASSLGQGYEQYF\n>Human_CDR3_3\nCASSPGQAYEQYF\n>Human_CDR3_4\nCASSLGTAYEQYF\n>Mouse_CDR3_1\nCASSLGQSNERLF\n>Mouse_CDR3_2\nCASGLGQAYEQYF';
CHART_META.alignment = { hint: 'Paste aligned sequences as FASTA (>name, then sequence; use - for gaps) or one "name sequence" per line. Protein or DNA / RNA is detected.', noTransform: true, noAxes: true,
  opts: [{ key: 'scheme', label: 'Colours', type: 'select', options: [['auto', 'By residue (Clustal / nucleotide)'], ['identity', 'Identity (grey by conservation)'], ['diff', 'Differences from first sequence only']], def: 'auto' }, { key: 'logo', label: '', type: 'check', def: true }, { key: 'from', label: 'From position', def: 1 }, { key: 'width', label: 'Residues per line', def: 60 }] };
CHART_META.alignment.opts[1].label = 'Sequence logo on top';
EXTRA_CHARTS.alignment = (cfg, t, w, h) => {
  const seqs = parseAlignment(cfg.data);
  if (!seqs.length) throw new Error('no sequences found');
  const L = Math.max(...seqs.map((s) => s.seq.length)), from = Math.max(1, +cfg.from || 1), per = Math.max(5, +cfg.width || 60);
  const nuc = seqs.every((s) => /^[ACGTUN.\-*]+$/.test(s.seq)), pal = nuc ? NT_COL : AA_CLUSTAL;
  const cols = Array.from({ length: L }, (_, i) => seqs.map((s) => s.seq[i] || '-'));
  const info = cols.map((c) => {
    const res = c.filter((x) => /[A-Z]/.test(x)), n = res.length, cnt = {};
    res.forEach((x) => { cnt[x] = (cnt[x] || 0) + 1; });
    const H = Object.values(cnt).reduce((a, k) => a - (k / n) * Math.log2(k / n), 0), Rmax = Math.log2(nuc ? 4 : 20);
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return { cnt, n, R: n ? Math.max(0, Rmax - H) * (n / c.length) : 0, Rmax, cons: top ? top[0] : '-', frac: top ? top[1] / c.length : 0 };
  });
  const nameW = Math.max(...seqs.map((s) => measureText(s.name, 11, 'mono').w)) + 12, cw = 11, rh = 14, logoH = cfg.logo !== false ? 46 : 0;
  const end = Math.min(L, from - 1 + Math.max(per, 1) * 50), blocks = [];
  for (let b = from - 1; b < end; b += per) blocks.push([b, Math.min(end, b + per)]);
  const blockH = logoH + 16 + (seqs.length + 1) * rh + 18;
  let s = '', y = cfg.title ? 26 : 4;
  const mono = 'font-family="Menlo, Consolas, monospace"';
  blocks.forEach(([b0, b1]) => {
    if (logoH) {
      for (let i = b0; i < b1; i++) {
        const x = nameW + (i - b0) * cw, it = info[i];
        let yy = y + logoH;
        Object.entries(it.cnt).sort((a, b) => a[1] - b[1]).forEach(([res, k]) => {
          const hh = (it.R / it.Rmax) * logoH * (k / it.n);
          if (hh < 0.5) return;
          s += `<text x="0" y="0" ${mono} font-weight="700" font-size="14" text-anchor="middle" fill="${pal[res] || '#666'}" transform="translate(${x + cw / 2} ${yy}) scale(1 ${(hh / 10.5).toFixed(3)})">${res}</text>`;
          yy -= hh;
        });
      }
      s += `<line x1="${nameW}" x2="${nameW}" y1="${y}" y2="${y + logoH}" stroke="#999"/><text x="${nameW - 4}" y="${y + 8}" text-anchor="end" font-size="8" fill="#666">${info[0].Rmax.toFixed(1)} bits</text>`;
    }
    const y0 = y + logoH + 14;
    for (let i = b0; i < b1; i++) if ((i + 1) % 10 === 0 || i === b0) s += `<text x="${nameW + (i - b0) * cw + cw / 2}" y="${y0 - 3}" text-anchor="middle" font-size="8" fill="#888">${i + 1}</text>`;
    seqs.forEach((sq, r) => {
      const yy = y0 + r * rh;
      s += `<text x="${nameW - 6}" y="${yy + 10.5}" text-anchor="end" ${mono} font-size="10">${omEsc(sq.name)}</text>`;
      for (let i = b0; i < b1; i++) {
        const ch = sq.seq[i] || '-', x = nameW + (i - b0) * cw, it = info[i];
        let bg = null, fg = '#222';
        if (/[A-Z]/.test(ch)) {
          if (cfg.scheme === 'identity') { if (ch === it.cons) { bg = it.frac >= 0.999 ? '#5f6b75' : it.frac >= 0.6 ? '#a9b2bb' : '#dde1e5'; fg = it.frac >= 0.999 ? '#fff' : '#222'; } }
          else if (cfg.scheme === 'diff') { if (r > 0 && ch === seqs[0].seq[i]) { fg = '#bbb'; } else if (r > 0) { bg = '#ffe08a'; } }
          else bg = Color.light(pal[ch] || '#cccccc', 0.45);
        } else fg = '#bbb';
        if (bg) s += `<rect x="${x}" y="${yy}" width="${cw}" height="${rh}" fill="${bg}"/>`;
        s += `<text x="${x + cw / 2}" y="${yy + 10.5}" text-anchor="middle" ${mono} font-size="10" fill="${fg}">${cfg.scheme === 'diff' && r > 0 && ch === seqs[0].seq[i] ? '.' : ch}</text>`;
      }
    });
    const yc = y0 + seqs.length * rh + 2;
    for (let i = b0; i < b1; i++) { const it = info[i], bh = it.frac * 10; s += `<rect x="${nameW + (i - b0) * cw + 1}" y="${yc + 10 - bh}" width="${cw - 2}" height="${bh}" fill="#9aa7b4"/>`; }
    s += `<text x="${nameW - 6}" y="${yc + 9}" text-anchor="end" font-size="8" fill="#666">identity</text>`;
    y += blockH;
  });
  const natW = nameW + Math.min(per, end - from + 1) * cw + 8, natH = y;
  const k = Math.min(w / natW, h / natH);
  let out = `<g transform="scale(${k})">${s}</g>`;
  if (cfg.title) out += `<text x="${w / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${omEsc(cfg.title)}</text>`;
  const ident = info.filter((x) => x.frac >= 0.999).length;
  return { svg: out, report: [`${seqs.length} ${nuc ? 'nucleotide' : 'protein'} sequences, ${L} columns; ${ident} fully conserved (${Math.round((ident / L) * 100)}%)${end < L ? `; showing ${from}–${end}` : ''}. Resize the graph to change the scale.`] };
};

// Insert › Omics & Clinical Plot › … opens the graph dialog on that kind with example data.
const OMICS_SIZES = { embedding: [440, 360], markerdot: [460, 340], oncoprint: [620, 320], lollipop: [620, 280], forest: [620, 340], upset: [520, 340], swimmer: [520, 380], alignment: [560, 260], venn: [420, 340] };
CHART_KINDS.filter((k) => k[2] === OMICS).forEach(([kind]) => {
  ARRANGE_COMMANDS['omics_' + kind] = () => { const [w, h] = OMICS_SIZES[kind] || [440, 340]; openGraphDialog(null, { kind, w, h }); };
});
