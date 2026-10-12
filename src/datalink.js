// Data-linked charts (v1.9). A chart whose data came from a file remembers that file — its path and a fingerprint
// (modified time, size, SHA-1) — so the figure can say exactly which data it shows, and refresh itself when the
// file changes: on opening the figure, when the window comes back into focus, or on request. Properties shows the
// source (Refresh, Show in Finder, Unlink); the Check tab warns when a linked file is missing.
(() => {
  const nat = () => window.native || {};
  const short = (h) => (h ? h.slice(0, 8) : '');
  const when = (t) => (t ? new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');

  // Called by the chart dialog after importing `file` into `cfg`.
  async function linkDataSource(cfg, file, { wide } = {}) {
    const path = nat().pathForFile ? nat().pathForFile(file) : null;
    if (!path || !nat().dataFile) { delete cfg.source; return; }
    try {
      const info = await nat().dataFile(path, { stat: true });
      if (info.missing) return;
      cfg.source = { path, name: file.name, size: info.size, mtime: info.mtime, sha1: info.sha1, readAt: Date.now(), wide: !!wide };
    } catch { /* not a linkable file */ }
  }

  const linkedCharts = (doc = state.doc) => {
    const out = [];
    const walk = (list) => { for (const o of list || []) { if (o.type === 'group') walk(o.children); else if (o.type === 'chart' && o.cfg && o.cfg.source) out.push(o); } };
    for (const p of doc.pages || []) walk(p.objects);
    return out;
  };

  // Re-read changed files. Returns { updated, missing }.
  async function refreshLinked({ quiet = false, force = false } = {}) {
    const charts = linkedCharts();
    if (!charts.length || !nat().dataFile) return { updated: 0, missing: 0 };
    let updated = 0, missing = 0, checkpointed = false;
    for (const o of charts) {
      const src = o.cfg.source;
      let info;
      try { info = await nat().dataFile(src.path, { stat: true }); } catch { continue; }
      if (info.missing) { if (!src.missing) { src.missing = true; } missing++; continue; }
      delete src.missing;
      if (!force && info.sha1 === src.sha1) continue;
      try {
        const full = await nat().dataFile(src.path);
        const bytes = Uint8Array.from(atob(full.base64), (c) => c.charCodeAt(0));
        let text = await importDataFile(new File([bytes], src.name || src.path.split(/[\\/]/).pop()));
        if (src.wide && typeof tidyToWide === 'function') text = tidyToWide(text) || text;
        if (text === o.cfg.data && info.sha1 === src.sha1) continue;
        if (!checkpointed) { checkpoint('datalink'); checkpointed = true; }
        o.cfg.data = text;
        Object.assign(src, { size: full.size, mtime: full.mtime, sha1: full.sha1, readAt: Date.now() });
        updated++;
      } catch (err) { if (!quiet) toast(`Couldn't re-read ${src.name}: ${err.message}`, 4000); }
    }
    if (updated) { renderScene(); renderProps(); markDirty(); }
    if (!quiet || updated || missing) {
      const parts = [];
      if (updated) parts.push(`Updated ${updated} chart${updated > 1 ? 's' : ''} from changed data`);
      if (missing) parts.push(`${missing} linked data file${missing > 1 ? 's' : ''} not found`);
      if (!parts.length) parts.push('Linked data is up to date');
      toast(parts.join(' · '), 3500);
    }
    return { updated, missing };
  }

  // Refresh after opening a figure and whenever the window comes back into focus (data edited in Excel meanwhile).
  const prevLoad = loadDoc;
  loadDoc = function (...args) { const r = prevLoad.apply(this, args); setTimeout(() => refreshLinked({ quiet: true }), 50); return r; };
  let focusTimer;
  window.addEventListener('focus', () => { clearTimeout(focusTimer); focusTimer = setTimeout(() => refreshLinked({ quiet: true }), 300); });

  // Properties: where this chart's data came from.
  const prevProps = renderProps;
  renderProps = function () {
    prevProps();
    const sel = selected();
    if (sel.length !== 1 || sel[0].type !== 'chart' || !sel[0].cfg || !sel[0].cfg.source) return;
    const o = sel[0], src = o.cfg.source;
    const lines = [
      el('div', { style: 'font-weight:600;word-break:break-all', textContent: src.name, title: src.path }),
      el('div', { class: 'note', textContent: src.missing ? `Not found at ${src.path}` : `Read ${when(src.readAt)} · file modified ${when(src.mtime)}` }),
      el('div', { class: 'note', textContent: `SHA-1 ${short(src.sha1)} · ${Math.max(1, Math.round((src.size || 0) / 1024))} KB` }),
      el('div', { class: 'btnrow', style: 'margin-top:6px' },
        btn('Refresh', () => refreshLinked({ force: true })),
        btn('Show in Finder', () => nat().reveal && nat().reveal(src.path)),
        btn('Unlink', () => { checkpoint('unlink'); delete o.cfg.source; renderProps(); markDirty(); toast('Chart unlinked; its data stays as it is'); })),
    ];
    $('#props').append(sect('Data source', ...lines));
  };

  // Check tab: missing linked files.
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      for (const o of linkedCharts({ pages: [p] })) {
        const src = o.cfg.source;
        if (src.missing) r.issues.push({ sev: 'warn', kind: 'Data', id: o.id, msg: `Chart data file not found: ${src.path}. The chart shows the data as last read (${when(src.readAt)}).` });
      }
      return r;
    };
  }

  ARRANGE_COMMANDS.refreshData = () => refreshLinked({ force: false });
  Object.assign(globalThis, { linkDataSource, refreshLinked, linkedCharts });
})();
