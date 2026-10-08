// Modal dialogs: graphing, protocol builder, chemistry, protein structures, templates, export.

let onModalClose = null;
function openModal(title, body) {
  $('#modalTitle').textContent = title;
  const mb = $('#modalBody');
  mb.innerHTML = '';
  mb.append(body);
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  if (onModalClose) { onModalClose(); onModalClose = null; }
  $('#modalBody').innerHTML = '';
}
$('#modalClose').addEventListener('click', closeModal);
$('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

const field = (label, input) => el('div', { class: 'row' }, el('label', { textContent: label }), input);

// ---------- Graphing ----------
function openGraphDialog(existing) {
  const cfg = existing ? deep(existing.cfg) : { kind: 'bar', data: SAMPLE_DATA.bar, title: '', xLabel: '', yLabel: 'Measurement', error: 'sd', showPoints: true, test: 'welch', pStyle: 'stars', grid: false };
  const W = existing ? existing.w : 380, H = existing ? existing.h : 300;
  const preview = el('div', { class: 'preview' });
  const report = el('div', { class: 'report', style: 'margin-top:10px' });
  const update = () => {
    const r = renderChart(cfg, W, H);
    preview.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:380px">${r.svg}</svg>`;
    report.textContent = r.report.join('\n');
    errRow.classList.toggle('hidden', cfg.kind !== 'bar');
    ptsRow.classList.toggle('hidden', cfg.kind !== 'bar' && cfg.kind !== 'box');
    heatRow.classList.toggle('hidden', cfg.kind !== 'heatmap');
    testRow.classList.toggle('hidden', cfg.kind === 'heatmap' || cfg.kind === 'line' || cfg.kind === 'dose');
    hint.textContent = 'Paste CSV or tab-separated data (e.g. from Excel). ' + HINTS[cfg.kind];
  };
  const bind = (key, input, prop = 'value') => { input[prop] = cfg[key]; input.addEventListener(prop === 'checked' ? 'change' : 'input', () => { cfg[key] = input[prop]; update(); }); return input; };
  const opts = (pairs) => pairs.map(([v, l]) => el('option', { value: v, textContent: l }));
  const data = bind('data', el('textarea', { rows: 10, spellcheck: false }));
  const kind = bind('kind', el('select', {}, ...opts(CHART_KINDS)));
  const hint = el('div', { class: 'note', style: 'margin:4px 0 6px' });
  const HINTS = {
    bar: 'One column per group (first row = group names).', box: 'One column per group (first row = group names).',
    scatter: 'First column = X, then one column per series.', line: 'First column = X, then one column per series.',
    dose: 'First column = dose (> 0, plotted on log scale), then one response column per compound. Fits a 4-parameter logistic curve and reports EC50.',
    survival: 'Columns: time, event (1 = event, 0 = censored), group. One row per subject. Censored subjects are shown as ticks.',
    heatmap: 'First column = row labels, first row = column labels, then values.',
  };
  const errRow = field('Error bars', bind('error', el('select', {}, ...opts([['sd', 'SD'], ['sem', 'SEM']]))));
  const ptsRow = field('', el('label', { style: 'width:auto;color:inherit' }, bind('showPoints', el('input', { type: 'checkbox' }), 'checked'), ' Show individual points'));
  const testRow = field('Analysis', bind('test', el('select', {}, ...opts([['welch', "Welch's t / ANOVA + Holm post-hoc"], ['paired', 'Paired t-test (2 groups)'], ['mw', 'Mann–Whitney U (+ Holm)'], ['none', 'None']]))));
  const heatRow = el('div', {}, field('Colours', bind('scheme', el('select', {}, ...opts([['sequential', 'Sequential (blue)'], ['diverging', 'Diverging (blue–red)']])))),
    field('', el('label', { style: 'width:auto;color:inherit' }, bind('showValues', el('input', { type: 'checkbox' }), 'checked'), ' Show values')));
  const body = el('div', {},
    el('div', { class: 'dlg-cols' },
      el('div', {},
        field('Chart', kind),
        hint,
        data,
        el('div', { class: 'btnrow', style: 'margin:6px 0 10px' }, btn('Load example', () => { cfg.data = SAMPLE_DATA[cfg.kind]; data.value = cfg.data; if (cfg.kind === 'survival') { cfg.yLabel = 'Survival probability'; cfg.xLabel = 'Time (days)'; } if (cfg.kind === 'dose') { cfg.yLabel = 'Response (%)'; cfg.xLabel = 'Dose (µM)'; } body.querySelectorAll('input[type=text]').forEach((i) => { const k = { Title: 'title', 'X label': 'xLabel', 'Y label': 'yLabel' }[i.closest('.row')?.querySelector('label')?.textContent]; if (k) i.value = cfg[k] || ''; }); update(); })),
        field('Title', bind('title', el('input', { type: 'text' }))),
        field('X label', bind('xLabel', el('input', { type: 'text' }))),
        field('Y label', bind('yLabel', el('input', { type: 'text' }))),
        errRow, ptsRow,
        testRow,
        heatRow,
        field('Show p as', bind('pStyle', el('select', {}, ...opts([['stars', 'Asterisks'], ['value', 'Exact p-value']])))),
        field('', el('label', { style: 'width:auto;color:inherit' }, bind('grid', el('input', { type: 'checkbox' }), 'checked'), ' Gridlines'))),
      el('div', {}, preview, report,
        el('div', { class: 'note', style: 'margin-top:8px' }, 'The software cannot tell from a table which observations are independent, paired, or technical vs biological replicates — choose the test to match your design. Outlier flags are prompts to investigate, not reasons to exclude.'))),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn(existing ? 'Update graph' : 'Insert graph', () => {
      if (existing) { checkpoint(); existing.cfg = cfg; render({ props: true }); }
      else { const c = viewCenter(); addObjects([Make.chart(cfg, c.x - W / 2, c.y - H / 2, W, H)]); }
      closeModal();
    }, 'primary')));
  openModal('Graph', body);
  update();
}

// ---------- Protocol (smart template) ----------
function openProtocolDialog(existing) {
  const cur = existing ? deep(existing) : { title: 'ELISA (sandwich)', steps: PROTOCOL_PRESETS['ELISA (sandwich)'].map(([title, icon]) => ({ title, icon })), color: '#4a7fd6', w: 760, scale: 1 };
  const toText = (steps) => steps.map((s) => `${s.title}${s.icon ? ' | ' + s.icon : ''}`).join('\n');
  const parse = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [title, icon] = l.split('|').map((s) => s.trim()); return { title, icon: ICON_MAP[icon] ? icon : '' }; });
  const preview = el('div', { class: 'preview' });
  const ta = el('textarea', { rows: 10, value: toText(cur.steps), spellcheck: false });
  const title = el('input', { type: 'text', value: cur.title || '' });
  const width = el('input', { type: 'number', value: Math.round(cur.w), step: 10 });
  const col = el('input', { type: 'color', value: cur.color });
  const update = () => {
    Object.assign(cur, { steps: parse(ta.value), title: title.value, w: Math.max(160, +width.value || 760), color: col.value });
    cur.h = protocolLayout(cur).h;
    preview.innerHTML = `<svg viewBox="-10 -10 ${cur.w + 20} ${cur.h + 20}" style="width:100%;max-height:420px">${protocolSvg(cur)}</svg>`;
  };
  [ta, title, width, col].forEach((i) => i.addEventListener('input', update));
  const preset = el('select', { onchange: (e) => { const p = PROTOCOL_PRESETS[e.target.value]; if (p) { ta.value = toText(p.map(([t, i]) => ({ title: t, icon: i }))); title.value = e.target.value; update(); } } },
    el('option', { value: '', textContent: 'Load a preset…' }), ...Object.keys(PROTOCOL_PRESETS).map((k) => el('option', { value: k, textContent: k })));
  const body = el('div', {},
    el('div', { class: 'dlg-cols' },
      el('div', {},
        field('Preset', preset), field('Title', title),
        el('div', { class: 'note', style: 'margin:4px 0 6px' }, 'One step per line: “Step title | icon-id”. Reorder lines to reorder steps — numbering updates automatically.'),
        ta, field('Width', width), field('Colour', col),
        el('details', { style: 'margin-top:8px' }, el('summary', { textContent: 'Icon ids' }), el('div', { class: 'note', style: 'user-select:text', textContent: ICONS.map((i) => i.id).join(', ') }))),
      el('div', {}, preview, el('div', { class: 'note', style: 'margin-top:8px' }, 'A tidy sequence is a representation of a workflow — it does not by itself establish that the procedure is complete or validated.'))),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn(existing ? 'Update protocol' : 'Insert protocol', () => {
      update();
      if (existing) { checkpoint(); Object.assign(existing, { steps: cur.steps, title: cur.title, w: cur.w, color: cur.color }); postEdit(existing); render({ props: true }); }
      else { const c = viewCenter(); addObjects([Make.protocol(cur.steps, c.x - cur.w / 2, c.y - cur.h / 2, cur.w, { title: cur.title, color: cur.color })]); }
      closeModal();
    }, 'primary')));
  openModal('Protocol diagram', body);
  update();
}

// ---------- Chemistry (PubChem) ----------
function openChemDialog() {
  let dataUrl = null;
  const q = el('input', { type: 'text', placeholder: 'e.g. caffeine, imatinib, or CC(=O)OC1=CC=CC=C1C(=O)O', style: 'flex:1' });
  const mode = el('select', {}, el('option', { value: 'name', textContent: 'Name' }), el('option', { value: 'smiles', textContent: 'SMILES' }));
  const strip = el('input', { type: 'checkbox', checked: true });
  const preview = el('div', { class: 'preview', style: 'min-height:320px' }, el('span', { class: 'note', textContent: 'Search PubChem by name or SMILES' }));
  const insertBtn = btn('Insert structure', async () => {
    if (!dataUrl) return;
    const src = strip.checked ? await trimTransparent(await removeWhite(dataUrl)) : dataUrl;
    await addImage(src, null, { source: `PubChem: ${q.value.trim()}` }, 260);
    closeModal();
  }, 'primary');
  insertBtn.disabled = true;
  const go = async () => {
    const v = q.value.trim();
    if (!v) return;
    preview.innerHTML = '<span class="note">Fetching from PubChem…</span>';
    const base = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound';
    const url = mode.value === 'name' ? `${base}/name/${encodeURIComponent(v)}/PNG?image_size=500x500` : `${base}/smiles/PNG?smiles=${encodeURIComponent(v)}&image_size=500x500`;
    try {
      dataUrl = await window.native.fetchImage(url);
      preview.innerHTML = '';
      preview.append(el('img', { src: dataUrl }));
      insertBtn.disabled = false;
    } catch (err) {
      dataUrl = null; insertBtn.disabled = true;
      preview.innerHTML = `<span class="note">No structure found for “${esc(v)}”. Check the spelling or try a SMILES string.</span>`;
    }
  };
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  openModal('Chemical structure', el('div', {},
    el('div', { class: 'row' }, mode, q, btn('Search', go)),
    preview,
    el('div', { class: 'row', style: 'margin-top:8px' }, el('label', { style: 'width:auto;color:inherit' }, strip, ' Make white background transparent')),
    el('div', { class: 'note' }, '2D depiction rendered by PubChem (NCBI). Stereochemistry only appears if it is encoded in the name/SMILES you supply. For reactions, insert each compound and connect them with arrows.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), insertBtn)));
  setTimeout(() => q.focus(), 50);
}

// ---------- Protein structure (RCSB PDB + 3Dmol.js) ----------
function openPdbDialog() {
  let viewer = null, loadedId = null;
  const id = el('input', { type: 'text', placeholder: 'PDB ID, e.g. 1HHO, 6VXX, 1CRN', style: 'width:180px', maxLength: 4 });
  const styleSel = el('select', {}, ...[['cartoon', 'Cartoon'], ['stick', 'Sticks'], ['sphere', 'Space-filling'], ['surface', 'Surface + cartoon'], ['line', 'Lines']].map(([v, l]) => el('option', { value: v, textContent: l })));
  const colorSel = el('select', {}, ...[['spectrum', 'Rainbow (N→C)'], ['chain', 'By chain'], ['ss', 'Secondary structure'], ['element', 'By element'], ['single', 'Single colour']].map(([v, l]) => el('option', { value: v, textContent: l })));
  const single = el('input', { type: 'color', value: '#4a7fd6' });
  const box = el('div', { id: 'mol3d' });
  const msg = el('div', { class: 'note', style: 'margin-top:6px', textContent: 'Drag to rotate, scroll to zoom, right-drag to pan. The snapshot you insert matches the view.' });
  const has3D = typeof $3Dmol !== 'undefined';

  const applyStyle = () => {
    if (!viewer || !loadedId) return;
    viewer.removeAllSurfaces();
    const c = colorSel.value;
    const colorSpec = c === 'spectrum' ? { color: 'spectrum' } : c === 'chain' ? { colorscheme: 'chain' } : c === 'ss' ? { colorscheme: 'ssJmol' } : c === 'element' ? { colorscheme: 'Jmol' } : { color: single.value };
    const s = styleSel.value;
    if (s === 'surface') {
      viewer.setStyle({}, { cartoon: colorSpec });
      viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.75, ...(c === 'single' ? { color: single.value } : { colorscheme: c === 'chain' ? 'chain' : 'whiteCarbon' }) });
    } else viewer.setStyle({ hetflag: false }, { [s]: colorSpec });
    viewer.render();
  };
  const load = async () => {
    const v = id.value.trim().toUpperCase();
    if (!/^[0-9][A-Z0-9]{3}$/.test(v)) { msg.textContent = 'PDB IDs are 4 characters starting with a digit, e.g. 1CRN.'; return; }
    msg.textContent = `Loading ${v} from RCSB…`;
    try {
      if (has3D) {
        const pdb = await window.native.fetchPdb(v);
        if (!viewer) viewer = $3Dmol.createViewer(box, { backgroundColor: 'white', backgroundAlpha: 0, antialias: true });
        viewer.clear();
        viewer.addModel(pdb, 'pdb');
        loadedId = v;
        applyStyle();
        viewer.zoomTo();
        viewer.render();
      } else {
        const url = await window.native.fetchImage(`https://cdn.rcsb.org/images/structures/${v.toLowerCase()}_assembly-1.jpeg`);
        box.innerHTML = '';
        box.append(el('img', { src: url, style: 'max-width:100%;max-height:100%' }));
        loadedId = v;
        box.dataset.src = url;
      }
      msg.textContent = `${v} loaded. Drag to rotate, scroll to zoom. Data: RCSB Protein Data Bank.`;
      insertBtn.disabled = false;
    } catch (err) {
      msg.textContent = `Could not load ${v}: ${err.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, '')}`;
    }
  };
  const insertBtn = btn('Insert snapshot', async () => {
    if (!loadedId) return;
    let src;
    if (has3D && viewer) { viewer.render(); src = viewer.pngURI(); } else src = await removeWhite(box.dataset.src);
    src = await trimTransparent(src);
    await addImage(src, null, { source: `PDB ${loadedId}` }, 320);
    closeModal();
  }, 'primary');
  insertBtn.disabled = true;
  [styleSel, colorSel, single].forEach((i) => i.addEventListener('input', applyStyle));
  id.addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
  onModalClose = () => { try { viewer && viewer.clear(); } catch { /* ignore */ } };
  openModal('Protein structure (PDB)', el('div', {},
    el('div', { class: 'row' }, id, btn('Load', load), el('span', { style: 'flex:1' }), styleSel, colorSel, single),
    box, msg,
    el('div', { class: 'note' }, 'This visualises a deposited structure. It does not predict binding, dynamics, or new folds — structural claims depend on the underlying entry.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), insertBtn)));
  setTimeout(() => id.focus(), 50);
}

// ---------- Templates ----------
function openTemplatesDialog() {
  const q = el('input', { type: 'search', class: 'tpl-search', placeholder: 'Search templates (pathway, timeline, cycle, poster…)' });
  const grid = el('div', { class: 'tpl-grid' });
  const cards = TEMPLATES.map((t) => {
    const p = t.build();
    const thumb = el('div', { class: 'thumb' });
    thumb.innerHTML = pageSvgString(p).replace('<svg ', '<svg style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet" ');
    const choice = el('div', { class: 'tpl-choice hidden' },
      btn('New page', (e) => { e.stopPropagation(); addTemplatePage(t, 'new'); closeModal(); }, 'primary'),
      btn('Replace page', (e) => { e.stopPropagation(); if (!objs().length || confirm('Replace everything on this page?')) { addTemplatePage(t, 'replace'); closeModal(); } }),
      btn('Add to page', (e) => { e.stopPropagation(); insertObjectsGrouped(t.build().objects, false); closeModal(); }));
    const card = el('div', { class: 'tpl', onclick: () => { cards.forEach((c) => c.choice.classList.add('hidden')); choice.classList.remove('hidden'); } }, thumb, el('div', { class: 'cap' }, el('b', { textContent: t.name }), el('span', { textContent: t.desc })), choice);
    return { t, card, choice };
  });
  const draw = () => {
    const w = q.value.toLowerCase();
    grid.innerHTML = '';
    cards.filter(({ t }) => !w || `${t.name} ${t.desc}`.toLowerCase().includes(w)).forEach(({ card }) => grid.append(card));
  };
  q.addEventListener('input', draw);
  draw();
  openModal('Templates', el('div', {}, q, grid,
    el('div', { class: 'note', style: 'margin-top:12px' }, 'Click a template, then open it as a new page, replace this page, or add it to this page as an editable group. A layout carries meaning — left-to-right implies sequence, circles imply cycles — so adapt the structure, not just the labels. For method diagrams, see Protocol.')));
  setTimeout(() => q.focus(), 30);
}

// ---------- Export ----------
function pngWithDpi(dataUrl, dpi) {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // pHYs
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const ihdrEnd = 8 + 25;
  const out = new Uint8Array(bytes.length + 21);
  out.set(bytes.subarray(0, ihdrEnd)); out.set(chunk, ihdrEnd); out.set(bytes.subarray(ihdrEnd), ihdrEnd + 21);
  let s = '';
  for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return 'data:image/png;base64,' + btoa(s);
}
function jpegWithDpi(dataUrl, dpi) {
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (bytes[2] === 0xff && bytes[3] === 0xe0 && bin.slice(6, 10) === 'JFIF') {
    bytes[13] = 1; bytes[14] = dpi >> 8; bytes[15] = dpi & 255; bytes[16] = dpi >> 8; bytes[17] = dpi & 255;
  }
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return 'data:image/jpeg;base64,' + btoa(s);
}
let _crcTable;
function crc32(buf) {
  if (!_crcTable) { _crcTable = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; _crcTable[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (const b of buf) c = _crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function maxScale(p, want) {
  return Math.min(want, 16000 / p.width, 16000 / p.height, Math.sqrt(2.5e8 / (p.width * p.height)));
}
function rasterize(p, scale, { transparent, mime }) {
  return new Promise((resolve, reject) => {
    const s = pageSvgString(p, { transparent: transparent && mime === 'image/png' });
    const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(p.width * scale); c.height = Math.round(p.height * scale);
      const ctx = c.getContext('2d');
      if (mime === 'image/jpeg') { ctx.fillStyle = p.background || '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      try { resolve(c.toDataURL(mime, 0.95)); } catch (e) { reject(e); }
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Render failed')); };
    im.src = url;
  });
}

function openExportDialog() {
  const p = page();
  const fmt = el('select', {}, ...[['png', 'PNG'], ['jpg', 'JPEG'], ['pdf', 'PDF (vector)'], ['svg', 'SVG (vector)'], ['pptx', 'PowerPoint (.pptx)']].map(([v, l]) => el('option', { value: v, textContent: l })));
  const selOnly = el('input', { type: 'checkbox', checked: state.sel.length > 0, disabled: !state.sel.length });
  const selRow = field('', el('label', { style: 'width:auto;color:inherit' }, selOnly, ` Selection only${state.sel.length ? ` (${state.sel.length} object${state.sel.length > 1 ? 's' : ''})` : ' — nothing selected'}`));
  const { icons: usedIcons } = collectCredits(state.doc);
  const creditNote = usedIcons.some((a) => needsAttribution(a.license))
    ? el('div', { class: 'note', style: 'margin-top:8px;color:#8a5300' }, 'This figure uses CC BY icons — include their attribution (File › Credits) in your legend. ', btn('Show credits', () => { closeModal(); openCreditsDialog(); }))
    : null;
  const dpi = el('select', {}, ...[72, 150, 300, 600].map((d) => el('option', { value: d, textContent: `${d} DPI`, selected: d === 300 })));
  const widthIn = el('input', { type: 'number', step: 0.1, value: ((state.sel.length ? selectionPage() : p).width / 96).toFixed(2) });
  const transparent = el('input', { type: 'checkbox' });
  const scope = el('select', {}, el('option', { value: 'page', textContent: 'Current page' }), el('option', { value: 'all', textContent: `All pages (${state.doc.pages.length})` }));
  const info = el('div', { class: 'note', style: 'margin-top:8px' });
  const rasterRows = [];
  const upd = () => {
    const p = selOnly.checked && fmt.value !== 'pdf' && fmt.value !== 'pptx' ? selectionPage() : page();
    selRow.classList.toggle('hidden', fmt.value === 'pdf' || fmt.value === 'pptx');
    const raster = fmt.value === 'png' || fmt.value === 'jpg';
    rasterRows.forEach((r) => r.classList.toggle('hidden', !raster));
    scopeRow.classList.toggle('hidden', fmt.value !== 'pdf');
    trRow.classList.toggle('hidden', !(fmt.value === 'png' || fmt.value === 'svg'));
    const win = +widthIn.value || p.width / 96, hin = win * (p.height / p.width);
    const want = (win * +dpi.value) / p.width, sc = maxScale(p, want);
    info.textContent = raster
      ? `Output: ${Math.round(p.width * sc)} × ${Math.round(p.height * sc)} px → ${win.toFixed(2)} × ${hin.toFixed(2)} in at ${dpi.value} DPI.` + (sc < want - 1e-6 ? ` Capped to ${Math.round((sc * p.width) / win)} DPI (canvas size limit) — use PDF for very large prints.` : '') + ' Imported bitmaps keep their own resolution; upscaling cannot add detail.'
      : fmt.value === 'pdf' ? 'Vector PDF: shapes, text and icons stay sharp at any size. Embedded photos/structures stay at their original resolution.'
      : fmt.value === 'pptx' ? `PowerPoint: one slide per page (${state.doc.pages.length}), each a high-resolution picture of the page. Re-export after edits — slides are not live-linked.`
      : 'SVG: fully vector and editable in Illustrator / Inkscape. Fonts are referenced, not embedded.';
  };
  [fmt, dpi, widthIn, scope, selOnly].forEach((i) => i.addEventListener('input', upd));
  selOnly.addEventListener('change', () => { const pp = selOnly.checked ? selectionPage() : page(); widthIn.value = (pp.width / 96).toFixed(2); upd(); });
  const r1 = field('Resolution', dpi), r2 = field('Print width', el('span', { style: 'display:flex;gap:6px;align-items:center' }, widthIn, 'in'));
  rasterRows.push(r1, r2);
  const scopeRow = field('Pages', scope);
  const trRow = field('', el('label', { style: 'width:auto;color:inherit' }, transparent, ' Transparent background'));
  const base = (state.filePath ? state.filePath.split(/[\\/]/).pop().replace(/\.scifig$/, '') : 'figure') + (state.doc.pages.length > 1 ? `-${p.name.replace(/[^\w-]+/g, '_')}` : '');
  const go = async () => {
    const p = selOnly.checked ? selectionPage() : page();
    try {
      let out;
      if (fmt.value === 'pptx') {
        if (typeof PptxGenJS === 'undefined') throw new Error('PowerPoint library not loaded');
        const pptx = new PptxGenJS();
        const first = state.doc.pages[0];
        pptx.defineLayout({ name: 'SCI', width: first.width / 96, height: first.height / 96 });
        pptx.layout = 'SCI';
        for (const pg of state.doc.pages) {
          const sc = maxScale(pg, 300 / 96);
          const img = await rasterize(pg, sc, { mime: 'image/png' });
          const k = Math.min(first.width / pg.width, first.height / pg.height);
          const w = (pg.width * k) / 96, h = (pg.height * k) / 96;
          const slide = pptx.addSlide();
          slide.background = { color: (pg.background || '#ffffff').replace('#', '') };
          slide.addImage({ data: img, x: (first.width / 96 - w) / 2, y: (first.height / 96 - h) / 2, w, h });
          const notes = (pg.comments || []).filter((c) => !c.resolved && c.text).map((c) => `${c.author}: ${c.text}`).join('\n');
          if (notes) slide.addNotes(notes);
        }
        const b64 = await pptx.write({ outputType: 'base64' });
        out = await window.native.exportFile({ defaultName: base.replace(/-[^-]*$/, '') + '.pptx', ext: 'pptx', data: 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + b64 });
      } else if (fmt.value === 'svg') {
        out = await window.native.exportFile({ defaultName: base + '.svg', ext: 'svg', data: '<?xml version="1.0" encoding="UTF-8"?>\n' + pageSvgString(p, { transparent: transparent.checked }) });
      } else if (fmt.value === 'pdf') {
        const pages = scope.value === 'all' ? state.doc.pages : [p];
        out = await window.native.exportPdf({ defaultName: (scope.value === 'all' ? base.replace(/-[^-]*$/, '') : base) + '.pdf', pages: pages.map((pg) => ({ svg: pageSvgString(pg), width: pg.width, height: pg.height })) });
      } else {
        const win = +widthIn.value || p.width / 96, d = +dpi.value;
        const sc = maxScale(p, (win * d) / p.width);
        const effDpi = Math.round((sc * p.width) / win);
        const mime = fmt.value === 'png' ? 'image/png' : 'image/jpeg';
        let data = await rasterize(p, sc, { transparent: transparent.checked, mime });
        data = mime === 'image/png' ? pngWithDpi(data, effDpi) : jpegWithDpi(data, effDpi);
        out = await window.native.exportFile({ defaultName: `${base}.${fmt.value}`, ext: fmt.value, data });
      }
      if (out) { toast(`Exported ${out.split(/[\\/]/).pop()}`); closeModal(); }
    } catch (e) { toast('Export failed: ' + e.message, 4000); }
  };
  openModal('Export', el('div', { style: 'max-width:520px' },
    field('Format', fmt), selRow, r1, r2, scopeRow, trRow, info, creditNote,
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Export…', go, 'primary'))));
  upd();
}
