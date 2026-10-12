// Live values in text (v1.9). Numbers in a figure can come straight from a data file, so they can't drift from the
// data: {=range(reads.csv:Passed)} shows "911–2,903", {=mean(reads.csv:Passed;1)} the mean to 1 decimal place,
// {=reads.csv:Passed:3} one cell (row 3). Functions: range, min, max, mean, median, sum, count, sd. Files are kept in
// the figure with a fingerprint (path, time, size, SHA-1) and refresh like linked charts: on opening, when the window
// regains focus, or Insert › Refresh Linked Data. Insert › Linked Value… builds a value with a live preview; the
// Check tab flags values that can't be computed; the deposit bundle includes the files.
(() => {
  const nat = () => window.native || {};
  const TOKEN = /\{=\s*(?:(\w+)\(\s*([^:(){}]+?)\s*:\s*([^;(){}]+?)\s*(?:;\s*(\d+))?\s*\)|([^:(){}]+?)\s*:\s*([^:;(){}]+?)\s*:\s*(\d+))\s*\}/g;
  const FUNCS = ['range', 'min', 'max', 'mean', 'median', 'sum', 'count', 'sd'];
  const reg = () => (state.doc.dataFiles || (state.doc.dataFiles = {}));
  const fmt = (v, dp) => (Number.isFinite(v) ? v.toLocaleString('en-GB', dp == null ? { maximumFractionDigits: Number.isInteger(v) ? 0 : 2 } : { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '?');
  const tableCache = new Map();
  function tableOf(name) {
    const f = reg()[name];
    if (!f || f.table == null) return null;
    if (!tableCache.has(f.sha1 + name)) tableCache.set(f.sha1 + name, parseTable(f.table));
    return tableCache.get(f.sha1 + name);
  }
  const colIndex = (t, col) => { const i = t.headers.findIndex((h) => h.trim().toLowerCase() === col.trim().toLowerCase()); return i >= 0 ? i : /^\d+$/.test(col) ? +col - 1 : -1; };

  // One token → its text, or null if it can't be computed.
  function evaluate(m) {
    const [, fn, file, col, dp, cFile, cCol, cRow] = m;
    const t = tableOf((fn ? file : cFile).trim());
    if (!t) return null;
    const ci = colIndex(t, fn ? col : cCol);
    if (ci < 0) return null;
    if (!fn) { const v = t.raw[ci][+cRow - 1]; if (v == null) return null; return Number.isFinite(Number(v)) && v !== '' ? fmt(Number(v)) : v; }
    const xs = t.cols[ci].filter(Number.isFinite), d = dp == null ? null : +dp;
    if (!FUNCS.includes(fn.toLowerCase())) return null;
    if (!xs.length && fn !== 'count') return null;
    const sum = xs.reduce((a, b) => a + b, 0), mean = sum / (xs.length || 1), sorted = [...xs].sort((a, b) => a - b);
    switch (fn.toLowerCase()) {
      case 'range': return `${fmt(sorted[0], d)}–${fmt(sorted[sorted.length - 1], d)}`;
      case 'min': return fmt(sorted[0], d);
      case 'max': return fmt(sorted[sorted.length - 1], d);
      case 'mean': return fmt(mean, d ?? 2);
      case 'median': return fmt(sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2, d);
      case 'sum': return fmt(sum, d);
      case 'count': return fmt(xs.length, 0);
      case 'sd': return fmt(Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, xs.length - 1)), d ?? 2);
      default: return null;
    }
  }
  const resolve = (text) => String(text).replace(TOKEN, (...m) => evaluate(m) ?? '⟨?⟩');
  const prevDisplay = displayText;
  displayText = function (o) {
    const t = prevDisplay(o);
    return o && o.type === 'text' && t.includes('{=') ? resolve(t) : t;
  };

  // ---------- Files: register, refresh ----------
  async function register(file) {
    const path = nat().pathForFile ? nat().pathForFile(file) : null;
    const table = await importDataFile(file);
    const info = path && nat().dataFile ? await nat().dataFile(path, { stat: true }) : {};
    reg()[file.name] = { name: file.name, path, size: info.size, mtime: info.mtime, sha1: info.sha1 || String(table.length), readAt: Date.now(), table };
    return file.name;
  }
  const tokenTexts = () => { const out = []; const walk = (l) => { for (const o of l || []) { if (o.type === 'group') walk(o.children); else if (o.type === 'text' && String(o.text).includes('{=')) out.push(o); } }; for (const p of state.doc.pages) walk(p.objects); return out; };
  function reflow() { for (const o of tokenTexts()) { if (typeof postEdit === 'function') postEdit(o); else { const m = textMetrics(o); o.w = m.w; o.h = m.h; } } }
  async function refreshValues({ quiet = true } = {}) {
    const files = Object.values(state.doc.dataFiles || {});
    if (!files.length || !nat().dataFile) return 0;
    let n = 0;
    for (const f of files) {
      if (!f.path) continue;
      let info; try { info = await nat().dataFile(f.path, { stat: true }); } catch { continue; }
      if (info.missing) { f.missing = true; continue; }
      delete f.missing;
      if (info.sha1 === f.sha1) continue;
      try {
        const full = await nat().dataFile(f.path), bytes = Uint8Array.from(atob(full.base64), (c) => c.charCodeAt(0));
        f.table = await importDataFile(new File([bytes], f.name));
        Object.assign(f, { size: full.size, mtime: full.mtime, sha1: full.sha1, readAt: Date.now() });
        n++;
      } catch { /* keep the last good table */ }
    }
    if (n) { reflow(); renderScene(); markDirty(); }
    if (n || !quiet) toast(n ? `Updated values from ${n} changed data file${n > 1 ? 's' : ''}` : 'Linked values are up to date');
    return n;
  }
  const prevLoad = loadDoc;
  loadDoc = function (...a) { const r = prevLoad.apply(this, a); setTimeout(() => refreshValues().then(() => { reflow(); renderScene(); }), 80); return r; };
  window.addEventListener('focus', () => setTimeout(() => refreshValues(), 350));
  const prevRefresh = ARRANGE_COMMANDS.refreshData;
  ARRANGE_COMMANDS.refreshData = async () => { if (prevRefresh) await prevRefresh(); await refreshValues({ quiet: false }); };

  // ---------- Insert › Linked Value… ----------
  function insertValue() {
    let name = Object.keys(reg())[0] || null;
    const fileSel = el('select', { onchange: (e) => { name = e.target.value; draw(); } });
    const colSel = el('select', { onchange: () => preview() }), fnSel = el('select', { onchange: () => preview() }, ...[...FUNCS, 'cell'].map((f) => el('option', { value: f, textContent: f === 'cell' ? 'one cell (row…)' : f })));
    const dp = el('input', { type: 'number', min: 0, max: 6, placeholder: 'auto', style: 'width:70px', oninput: () => preview() });
    const rowIn = el('input', { type: 'number', min: 1, value: 1, style: 'width:70px', oninput: () => preview() });
    const out = el('div', { style: 'font-size:22px;font-weight:600;margin:10px 0' }), tok = el('code', { class: 'note' });
    const pick = el('input', { type: 'file', accept: '.csv,.tsv,.txt,.xlsx,.pzfx', style: 'display:none', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; try { name = await register(f); draw(); } catch (err) { toast('Could not read: ' + err.message); } } });
    const token = () => { const c = colSel.value, f = fnSel.value; if (!name || !c) return ''; return f === 'cell' ? `{=${name}:${c}:${rowIn.value || 1}}` : `{=${f}(${name}:${c}${dp.value !== '' ? `;${dp.value}` : ''})}`; };
    function preview() { const t = token(); tok.textContent = t; out.textContent = t ? resolve(t) : ''; }
    function draw() {
      fileSel.innerHTML = ''; Object.keys(reg()).forEach((n) => fileSel.append(el('option', { value: n, textContent: n, selected: n === name })));
      colSel.innerHTML = ''; const t = name ? tableOf(name) : null, firstNum = t ? Math.max(0, t.cols.findIndex((c) => c.some(Number.isFinite))) : 0;
      (t ? t.headers : []).forEach((h, i) => colSel.append(el('option', { value: h, textContent: h, selected: i === firstNum })));
      preview();
    }
    const body = el('div', { style: 'min-width:460px' },
      row('Data file', fileSel, btn('Add file…', () => pick.click())), pick,
      row('Column', colSel), row('Show', fnSel), row('Decimals', dp), row('Row (one cell)', rowIn),
      el('div', { class: 'note', textContent: 'Preview' }), out, tok,
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
        const t = token(); if (!t) return;
        checkpoint('value');
        const sel = selected().find((o) => o.type === 'text');
        if (sel) { sel.text = `${sel.text}${sel.text.endsWith(' ') || !sel.text ? '' : ' '}${t}`; reflow(); }
        else { const c = viewCenter(), o = Make.text(t, c.x, c.y, { fontSize: 18 }); page().objects.push(o); state.sel = [o.id]; reflow(); }
        closeModal(); render(); markDirty();
      }, 'primary')));
    openModal('Insert linked value', body);
    draw();
    if (!name) pick.click();
  }
  ARRANGE_COMMANDS.insertValue = insertValue;

  // ---------- Check and bundle ----------
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      for (const o of p.objects.filter((x) => x.type === 'text' && String(x.text).includes('{='))) {
        const bad = [...String(o.text).matchAll(TOKEN)].filter((m) => evaluate(m) == null).map((m) => m[0]);
        if (bad.length) r.issues.push({ sev: 'error', kind: 'Data', id: o.id, msg: `A linked value can't be computed: ${bad.join(', ')} (file not added, or column not found).` });
      }
      for (const f of Object.values(state.doc.dataFiles || {})) if (f.missing) r.issues.push({ sev: 'warn', kind: 'Data', msg: `Data file for linked values not found: ${f.path}. Values show the data as last read.` });
      return r;
    };
  }
  if (typeof buildDepositBundle === 'function') {
    const prevBundle = buildDepositBundle;
    globalThis.buildDepositBundle = async (...a) => {
      const r = await prevBundle(...a);
      for (const f of Object.values(state.doc.dataFiles || {})) {
        const inZip = `data/${f.name}`;
        if (!r.zip.file(inZip)) r.zip.file(inZip, f.table);
        r.provenance.data.push({ file: f.name, originalPath: f.path, usedFor: 'linked values in text', sha1WhenRead: f.sha1, readAt: f.readAt ? new Date(f.readAt).toISOString() : null, bundled: inZip, note: 'bundled as the table SciCanvas read' });
      }
      r.zip.file('provenance.json', JSON.stringify(r.provenance, null, 2));
      return r;
    };
  }
  Object.assign(globalThis, { resolveValues: resolve, registerDataFile: register, refreshValues });
})();
