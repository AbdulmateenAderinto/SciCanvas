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
  const cfg = existing ? deep(existing.cfg) : { kind: 'bar', data: SAMPLE_DATA.bar, title: '', xLabel: '', yLabel: 'Measurement', error: 'sd', showPoints: true, test: 'auto', pStyle: 'stars', grid: false };
  const W = existing ? existing.w : 380, H = existing ? existing.h : 300;
  const preview = el('div', { class: 'preview' });
  const report = el('div', { class: 'report', style: 'margin-top:10px' });
  const GROUP = ['bar', 'box', 'violin', 'dotplot'];
  const HINTS = {
    bar: 'One column per group (first row = group names).', box: 'One column per group.', violin: 'One column per group.', dotplot: 'One column per group.',
    scatter: 'First column = X, then one column per series.', line: 'First column = X, then one column per series.',
    dose: 'First column = dose (> 0, log scale), then one response column per compound. 4-parameter logistic fit → EC50 / IC50.',
    survival: 'Columns: time, event (1 = event, 0 = censored), group. One row per subject.',
    heatmap: 'First column = row labels, first row = column labels, then values.',
    groupedbar: 'Long format, one row per measurement: Factor A, Factor B, Value. Runs a two-way ANOVA.',
    pie: 'Two columns: label, value.', plate: 'First column = row letters (A–H), header = column numbers (1–12), then values.',
    growth: 'First column = time; replicate columns share the same series name (e.g. Control, Control, Control, Drug, Drug, Drug).',
    standard: 'Conc, Signal[, Sample]. Leave Conc blank for unknowns — they are interpolated from the standard curve.',
    logistic: 'Two columns: X, outcome (0 or 1).',
  };
  const show = (elx, on) => elx.classList.toggle('hidden', !on);
  const useSuggested = btn('Use suggested test', () => { if (lastSuggestion) { cfg.test = lastSuggestion; testSel.value = cfg.test; update(); } });
  let lastSuggestion = null;
  const update = () => {
    const r = renderChart(cfg, W, H);
    preview.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:380px">${r.svg}</svg>`;
    report.textContent = r.report.join('\n');
    lastSuggestion = r.suggestion;
    const k = cfg.kind, axes = !['pie', 'plate', 'heatmap'].includes(k);
    show(errRow, ['bar', 'dotplot', 'groupedbar', 'growth'].includes(k));
    show(ptsRow, ['bar', 'box', 'violin', 'groupedbar'].includes(k));
    show(centerRow, k === 'dotplot');
    show(testRow, GROUP.includes(k));
    show(statsRow, ['scatter', 'survival', 'groupedbar'].includes(k));
    show(fitRow, k === 'scatter');
    show(stdFitRow, k === 'standard');
    show(heatRow, k === 'heatmap' || k === 'plate');
    show(donutRow, k === 'pie');
    show(bandRow, k === 'growth');
    show(transformRow, !['pie', 'plate', 'heatmap', 'survival', 'standard', 'logistic'].includes(k));
    show(axisRow, axes && !['survival', 'logistic'].includes(k));
    show(logRow, ['scatter', 'line'].includes(k));
    show(pRow, GROUP.includes(k));
    show(useSuggested, GROUP.includes(k) && lastSuggestion && cfg.test !== 'auto' && cfg.test !== lastSuggestion);
    hint.textContent = 'Paste CSV or tab-separated data (e.g. from Excel), or import a file. ' + (HINTS[k] || '');
  };
  const bind = (key, input, prop = 'value') => { if (cfg[key] != null || input.tagName !== 'SELECT') input[prop] = cfg[key] ?? (prop === 'checked' ? false : ''); input.addEventListener(prop === 'checked' ? 'change' : 'input', () => { cfg[key] = input[prop]; update(); }); return input; };
  const opts = (pairs) => pairs.map(([v, l]) => el('option', { value: v, textContent: l }));
  const cb = (key, label) => el('label', { style: 'width:auto;color:inherit' }, bind(key, el('input', { type: 'checkbox' }), 'checked'), ' ' + label);
  const data = bind('data', el('textarea', { rows: 10, spellcheck: false }));
  const kind = bind('kind', el('select', {}, ...opts(CHART_KINDS)));
  const hint = el('div', { class: 'note', style: 'margin:4px 0 6px' });
  const errRow = field('Error bars', bind('error', el('select', {}, ...opts([['sd', 'SD'], ['sem', 'SEM'], ['ci95', '95% CI']]))));
  const ptsRow = field('', cb('showPoints', 'Show individual points'));
  const centerRow = field('Centre line', bind('center', el('select', {}, ...opts([['mean', 'Mean ± error'], ['median', 'Median + IQR']]))));
  const testSel = bind('test', el('select', {}, ...opts([['auto', 'Automatic (recommended test)'], ['welch', "Welch's t / ANOVA (parametric)"], ['mw', 'Mann–Whitney / Kruskal–Wallis (non-parametric)'], ['paired', 'Paired t / repeated-measures ANOVA'], ['wilcoxon', 'Wilcoxon signed-rank (paired, non-parametric)'], ['none', 'None']])));
  const testRow = el('div', {}, field('Analysis', testSel), el('div', { style: 'margin-left:84px' }, useSuggested));
  const statsRow = field('', el('label', { style: 'width:auto;color:inherit' }, (() => { const c = el('input', { type: 'checkbox', checked: cfg.test !== 'none' }); c.addEventListener('change', () => { cfg.test = c.checked ? 'auto' : 'none'; update(); }); return c; })(), ' Run statistics'));
  const fitRow = field('Fit', bind('fit', el('select', {}, ...opts([['linear', 'Linear'], ['poly2', 'Quadratic (degree 2)'], ['poly3', 'Cubic (degree 3)'], ['none', 'None']]))));
  const stdFitRow = field('Curve', bind('fit', el('select', {}, ...opts([['linear', 'Linear'], ['4pl', '4-parameter logistic (ELISA)']]))));
  const heatRow = el('div', {}, field('Colours', bind('scheme', el('select', {}, ...opts([['sequential', 'Sequential (blue)'], ['diverging', 'Diverging (blue–red)']])))), field('', cb('showValues', 'Show values')));
  const donutRow = field('', cb('donut', 'Donut'));
  const bandRow = field('', (() => { const c = el('input', { type: 'checkbox', checked: cfg.band !== false }); c.addEventListener('change', () => { cfg.band = c.checked; update(); }); return el('label', { style: 'width:auto;color:inherit' }, c, ' Shaded error band'); })());
  const transformRow = field('Transform', bind('transform', el('select', {}, ...opts(TRANSFORMS))));
  const axisRow = field('Y range', el('span', { style: 'display:flex;gap:4px;align-items:center' }, bind('yMin', el('input', { type: 'number', placeholder: 'auto', style: 'width:70px' })), '–', bind('yMax', el('input', { type: 'number', placeholder: 'auto', style: 'width:70px' }))));
  const logRow = field('', cb('yLog', 'Log₁₀ Y axis'));
  const pRow = field('Show p as', bind('pStyle', el('select', {}, ...opts([['stars', 'Asterisks'], ['value', 'Exact p-value']]))));
  const fileIn = el('input', { type: 'file', accept: '.csv,.tsv,.txt,.xlsx,.pzfx', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      let text = await importDataFile(f);
      const wide = GROUP.includes(cfg.kind) ? tidyToWide(text) : null;
      if (wide) text = wide;
      cfg.data = text; data.value = text; update();
      toast(`Imported ${f.name}${wide ? ' (long format converted to one column per group)' : ''}`);
    } catch (err) { toast('Import failed: ' + err.message, 4000); }
    fileIn.value = '';
  } });
  const syncText = () => body.querySelectorAll('input[type=text]').forEach((i) => { const k = { Title: 'title', 'X label': 'xLabel', 'Y label': 'yLabel' }[i.closest('.row')?.querySelector('label')?.textContent]; if (k) i.value = cfg[k] || ''; });
  const body = el('div', {},
    el('div', { class: 'dlg-cols' },
      el('div', {},
        field('Chart', kind),
        hint,
        data,
        el('div', { class: 'btnrow', style: 'margin:6px 0 10px' },
          btn('Load example', () => {
            cfg.data = SAMPLE_DATA[cfg.kind]; data.value = cfg.data;
            const L = { survival: ['Time (days)', 'Survival probability'], dose: ['Dose (µM)', 'Response (%)'], growth: ['Time (h)', 'OD600'], standard: ['Concentration (pg/mL)', 'OD450'], logistic: ['Dose', 'P(response)'], groupedbar: ['', 'Value'] }[cfg.kind];
            if (L) { cfg.xLabel = L[0]; cfg.yLabel = L[1]; }
            syncText(); update();
          }),
          btn('Import file…', () => fileIn.click()), fileIn,
          btn('Long → wide', () => { const wide = tidyToWide(cfg.data); if (wide) { cfg.data = wide; data.value = wide; update(); } else toast('Needs two columns: group label, value'); })),
        field('Title', bind('title', el('input', { type: 'text' }))),
        field('X label', bind('xLabel', el('input', { type: 'text' }))),
        field('Y label', bind('yLabel', el('input', { type: 'text' }))),
        errRow, ptsRow, centerRow, testRow, statsRow, fitRow, stdFitRow, heatRow, donutRow, bandRow, transformRow, axisRow, logRow, pRow,
        field('', cb('grid', 'Gridlines'))),
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

// Copy one graph's look (colours, error bars, points, gridlines, p-value style) to every graph in the figure.
function applyGraphStyleToAll(src) {
  const keys = ['colors', 'grid', 'error', 'showPoints', 'pStyle', 'center', 'scheme', 'band'];
  checkpoint();
  let n = 0;
  const walk = (o) => { if (o.type === 'chart' && o !== src) { for (const k of keys) if (src.cfg[k] !== undefined) o.cfg[k] = src.cfg[k]; n++; } if (o.children) o.children.forEach(walk); };
  state.doc.pages.forEach((p) => p.objects.forEach(walk));
  render({ props: true });
  toast(`Style applied to ${n} other graph${n === 1 ? '' : 's'}`);
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

// ---------- Chemistry: vector structures (SmilesDrawer) from a name (PubChem) or SMILES ----------
const CHEM_THEMES = [['light', 'Standard (coloured heteroatoms)'], ['oldschool', 'Black & white'], ['github', 'Muted'], ['solarized', 'Solarized'], ['gruvbox', 'Gruvbox'], ['carbon', 'Carbon'], ['cyberpunk', 'Cyberpunk'], ['matrix', 'Matrix'], ['dark', 'Dark background']];
function openChemDialog() {
  let current = null; // { svgText, smiles, info }
  const q = el('input', { type: 'text', placeholder: 'e.g. caffeine, imatinib, ATP — or a SMILES string / reaction (A.B>>C)', style: 'flex:1' });
  const mode = el('select', {}, el('option', { value: 'name', textContent: 'Name' }), el('option', { value: 'smiles', textContent: 'SMILES' }));
  const theme = el('select', {}, ...CHEM_THEMES.map(([v, l]) => el('option', { value: v, textContent: l })));
  const bond = el('input', { type: 'range', min: 0.6, max: 3, step: 0.1, value: 1.4 });
  const fsz = el('input', { type: 'range', min: 6, max: 16, step: 0.5, value: 10 });
  const carbons = el('input', { type: 'checkbox' }), hyd = el('input', { type: 'checkbox', checked: true }), label = el('input', { type: 'checkbox', checked: true });
  const preview = el('div', { class: 'preview', style: 'min-height:320px;padding:12px' }, el('span', { class: 'note', textContent: 'Search PubChem by name, or paste a SMILES string.' }));
  const info = el('div', { class: 'note', style: 'margin-top:6px;user-select:text' });
  const insertBtn = btn('Insert editable structure', async () => {
    if (!current) return;
    const key = addSvgAsset(current.name, current.svgText);
    const a = getAsset(key); a.source = `PubChem / SMILES: ${current.smiles}`;
    const c = viewCenter(), ar = a.vw / a.vh, size = 240, w = ar >= 1 ? size : size * ar, h = ar >= 1 ? size / ar : size;
    const objsNew = [{ id: uid(), type: 'icon', iconId: key, x: c.x - w / 2, y: c.y - h / 2, w, h, rot: 0, name: current.name }];
    if (label.checked && current.label) { const t = Make.text(current.label, 0, c.y + h / 2 + 8, { fontSize: 14, align: 'center' }); t.x = c.x - t.w / 2; objsNew.push(t); }
    addObjects(objsNew);
    closeModal();
  }, 'primary');
  const imgBtn = btn('Insert PubChem image instead', async () => {
    if (!current) return;
    const base = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound';
    const url = current.cid ? `${base}/cid/${current.cid}/PNG?image_size=500x500` : `${base}/smiles/PNG?smiles=${encodeURIComponent(current.smiles)}&image_size=500x500`;
    try { const d = await window.native.fetchImage(url); await addImage(await trimTransparent(await removeWhite(d)), null, { source: `PubChem: ${current.name}` }, 260); closeModal(); }
    catch { toast('PubChem has no image for this structure'); }
  });
  [insertBtn, imgBtn].forEach((b) => (b.disabled = true));
  const draw = () => {
    if (!current) return;
    const sd = new SmilesDrawer.SmiDrawer({ bondThickness: +bond.value, fontSizeLarge: +fsz.value, fontSizeSmall: +fsz.value * 0.7, terminalCarbons: carbons.checked, explicitHydrogens: hyd.checked, padding: 10 });
    sd.draw(current.smiles, 'svg', theme.value, (svgEl) => {
      // Drop only the page background (a direct child rect), never the white rect inside the label mask.
      if (theme.value !== 'dark') [...svgEl.children].forEach((r) => { if (r.tagName.toLowerCase() === 'rect' && /^(#fff|#ffffff|white)$/i.test(r.getAttribute('fill') || r.style.fill || '')) r.remove(); });
      svgEl.style.background = theme.value === 'dark' ? '#141414' : '';
      current.svgText = new XMLSerializer().serializeToString(svgEl);
      preview.innerHTML = '';
      const shown = svgEl.cloneNode(true);
      shown.removeAttribute('width'); shown.removeAttribute('height'); shown.style.maxWidth = '100%'; shown.style.maxHeight = '360px';
      preview.append(shown);
      [insertBtn, imgBtn].forEach((b) => (b.disabled = false));
    }, (err) => { preview.innerHTML = `<span class="note">Couldn't draw that SMILES: ${esc(err.message || String(err))}</span>`; insertBtn.disabled = true; });
  };
  const go = async () => {
    const v = q.value.trim();
    if (!v) return;
    preview.innerHTML = '<span class="note">Looking up…</span>'; info.textContent = '';
    try {
      if (mode.value === 'name') {
        const r = await window.native.pubchemLookup(v);
        current = { name: v, smiles: r.smiles, cid: r.cid, label: v.replace(/^./, (c) => c.toUpperCase()) };
        info.textContent = `${r.formula} · MW ${r.mw} · ${r.iupac || ''} · PubChem CID ${r.cid} · SMILES ${r.smiles}`;
      } else {
        current = { name: v.includes('>') ? 'Reaction' : 'Structure', smiles: v, label: '' };
        info.textContent = v.includes('>') ? 'Reaction SMILES: reactants >> products (agents between the > signs).' : '';
      }
      draw();
    } catch (err) {
      current = null; [insertBtn, imgBtn].forEach((b) => (b.disabled = true));
      preview.innerHTML = `<span class="note">${esc(err.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''))}</span>`;
    }
  };
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  [theme, bond, fsz, carbons, hyd].forEach((i) => i.addEventListener('input', draw));
  const chk = (c, t) => el('label', { style: 'width:auto;color:inherit;display:flex;gap:4px;align-items:center' }, c, t);
  openModal('Chemical structure', el('div', {},
    el('div', { class: 'row' }, mode, q, btn('Search', go)),
    el('div', { class: 'dlg-cols', style: 'grid-template-columns:1fr 250px' },
      el('div', {}, preview, info),
      el('div', {},
        field_('Theme', theme), field_('Bonds', bond), field_('Labels', fsz),
        el('div', { class: 'row' }, chk(carbons, 'Show all carbons')), el('div', { class: 'row' }, chk(hyd, 'Explicit hydrogens')), el('div', { class: 'row' }, chk(label, 'Add name label')),
        el('div', { class: 'note' }, 'Inserted as editable vector art: recolour atoms in Colour layers, resize, rotate and flip like any icon. Stereochemistry appears only if encoded in the SMILES. Not a full ChemDraw replacement — no atom-by-atom editing.'))),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), imgBtn, insertBtn)));
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
  const outline = el('input', { type: 'checkbox' }), ligands = el('input', { type: 'checkbox', checked: true });
  const fileIn = el('input', { type: 'file', accept: '.pdb,.ent,.cif,.mmcif,.pqr', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const fmt = /\.(cif|mmcif)$/i.test(f.name) ? 'cif' : 'pdb';
    await showModel(await f.text(), fmt, f.name.replace(/\.[^.]+$/, ''));
    msg.textContent = `${f.name} loaded from your computer.`;
    fileIn.value = '';
  } });
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
    if (s !== 'surface') viewer.setStyle({ hetflag: true, not: { resn: ['HOH', 'WAT'] } }, ligands.checked ? { stick: { colorscheme: 'greenCarbon', radius: 0.22 } } : {});
    try { viewer.setViewStyle(outline.checked ? { style: 'outline', color: 'black', width: 0.04 } : { style: 'none' }); } catch { /* older 3Dmol */ }
    viewer.render();
  };
  async function showModel(text, fmt, label) {
    if (!has3D) { toast('3D viewer unavailable'); return; }
    if (!viewer) viewer = $3Dmol.createViewer(box, { backgroundColor: 'white', backgroundAlpha: 0, antialias: true });
    viewer.clear();
    viewer.addModel(text, fmt);
    loadedId = label;
    applyStyle();
    viewer.zoomTo();
    viewer.render();
    insertBtn.disabled = false;
  }
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
  [styleSel, colorSel, single, outline, ligands].forEach((i) => i.addEventListener('input', applyStyle));
  const turn = (deg, axis) => () => { if (viewer) { viewer.rotate(deg, axis); viewer.render(); } };
  id.addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
  onModalClose = () => { try { viewer && viewer.clear(); } catch { /* ignore */ } };
  openModal('Protein structure (PDB)', el('div', {},
    el('div', { class: 'row' }, id, btn('Load', load), btn('Open file…', () => fileIn.click()), fileIn, el('span', { style: 'flex:1' }), styleSel, colorSel, single),
    box, msg,
    el('div', { class: 'row', style: 'margin-top:6px' },
      el('label', { style: 'width:auto;color:inherit;display:flex;gap:4px;align-items:center' }, outline, 'Outline'),
      el('label', { style: 'width:auto;color:inherit;display:flex;gap:4px;align-items:center' }, ligands, 'Show ligands'),
      el('span', { style: 'flex:1' }), el('span', { class: 'note', textContent: 'Rotate 90°:' }),
      btn('↺ X', turn(90, 'x')), btn('↺ Y', turn(90, 'y')), btn('↺ Z', turn(90, 'z'))),
    el('div', { class: 'note' }, 'This visualises a deposited structure. It does not predict binding, dynamics, or new folds — structural claims depend on the underlying entry.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), insertBtn)));
  setTimeout(() => id.focus(), 50);
}

// ---------- Templates ----------
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
          const notes = [pg.notes || '', ...(pg.comments || []).filter((c) => !c.resolved && c.text).map((c) => `${c.author}: ${c.text}`)].filter(Boolean).join('\n');
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
