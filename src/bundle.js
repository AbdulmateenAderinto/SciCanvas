// Deposit bundle (v1.9): one zip with everything a reader, reviewer or repository needs to see how a figure was
// made — the editable figure (icons embedded), SVG and 300-dpi PNG of each page, copies of the data files its charts
// are linked to, and provenance.json (SHA-1 of each data file, when it was read, which charts use it, the SciCanvas
// version, icon credits and image sources), with a README in plain words. File › Export Deposit Bundle.
(() => {
  const safe = (s) => String(s || 'figure').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'figure';
  const pad = (n) => String(n).padStart(2, '0');

  async function buildBundle({ scale = 300 / 96 } = {}) {
    if (typeof JSZip === 'undefined') throw new Error('Zip support is missing');
    const zip = new JSZip(), base = safe((state.filePath || 'figure').split(/[\\/]/).pop().replace(/\.scifig$/, ''));
    const doc = JSON.parse(JSON.stringify(state.doc));
    if (typeof embedBuiltinIcons === 'function') embedBuiltinIcons(doc);
    delete doc.thumb;
    zip.file(`${base}.scifig`, JSON.stringify(doc));
    const pages = [];
    for (const [i, p] of state.doc.pages.entries()) {
      const name = `page-${pad(i + 1)}-${safe(p.name || 'page')}`;
      zip.file(`figure/${name}.svg`, pageSvgString(p));
      const png = await rasterize(p, scale, { mime: 'image/png' });
      zip.file(`figure/${name}.png`, png.split(',')[1], { base64: true });
      pages.push({ page: i + 1, name: p.name || '', width: p.width, height: p.height, files: [`figure/${name}.svg`, `figure/${name}.png`] });
    }
    // Linked data: one copy per file, with its fingerprint now and when the charts last read it.
    const data = [], byPath = new Map();
    const charts = typeof linkedCharts === 'function' ? linkedCharts() : [];
    for (const o of charts) {
      const src = o.cfg.source;
      if (!byPath.has(src.path)) byPath.set(src.path, { src, charts: [] });
      byPath.get(src.path).charts.push(o.name || o.cfg.title || o.id);
    }
    for (const [path, { src, charts: used }] of byPath) {
      const entry = { file: src.name, originalPath: path, charts: used, sha1WhenRead: src.sha1, readAt: src.readAt ? new Date(src.readAt).toISOString() : null };
      try {
        const now = await window.native.dataFile(path);
        if (now.missing) entry.status = 'missing: the chart shows the data as last read';
        else {
          const inZip = `data/${safe(src.name)}`;
          zip.file(inZip, now.base64, { base64: true });
          Object.assign(entry, { bundled: inZip, sha1: now.sha1, size: now.size, modified: new Date(now.mtime).toISOString(), status: now.sha1 === src.sha1 ? 'matches the chart' : 'changed since the chart last read it' });
        }
      } catch (err) { entry.status = 'could not read: ' + err.message; }
      data.push(entry);
    }
    const credits = typeof collectCredits === 'function' ? collectCredits(state.doc) : { icons: [], sources: [] };
    const version = window.native.appVersion ? await window.native.appVersion() : '';
    const provenance = {
      made_with: `SciCanvas ${version}`.trim(), exported: new Date().toISOString(), figure: state.filePath || null,
      pages, data,
      icons: credits.icons.map((c) => ({ name: c.name, author: c.author, license: c.license, attribution: c.attribution || c.credit || '' })),
      image_sources: credits.sources,
    };
    zip.file('provenance.json', JSON.stringify(provenance, null, 2));
    const lines = [`# ${base}`, '', `Exported from ${provenance.made_with} on ${provenance.exported.slice(0, 10)}.`, '',
      '## Contents', `- \`${base}.scifig\`: the editable figure (open in SciCanvas; icons are embedded).`,
      ...pages.map((p) => `- Page ${p.page}${p.name ? ` (${p.name})` : ''}: \`${p.files[0]}\` (vector) and \`${p.files[1]}\` (300 dpi).`),
      ...(data.length ? ['', '## Data behind the charts', ...data.map((d) => `- \`${d.bundled || d.file}\` → ${d.charts.join(', ')}. SHA-1 ${(d.sha1 || d.sha1WhenRead || '').slice(0, 12)}; ${d.status}.`)] : []),
      '', 'Full details, including icon credits, are in `provenance.json`.'];
    zip.file('README.md', lines.join('\n') + '\n');
    return { base, zip, provenance };
  }

  ARRANGE_COMMANDS.exportBundle = async () => {
    try {
      toast('Building deposit bundle…');
      const { base, zip, provenance } = await globalThis.buildDepositBundle(); // includes additions such as legends (legend.js)
      const b64 = await zip.generateAsync({ type: 'base64' });
      const out = await window.native.exportFile({ defaultName: `${base} – deposit bundle.zip`, ext: 'zip', data: 'data:application/zip;base64,' + b64 });
      if (out) toast(`Saved deposit bundle: ${provenance.pages.length} page${provenance.pages.length > 1 ? 's' : ''}, ${provenance.data.length} data file${provenance.data.length === 1 ? '' : 's'}`, 4000);
    } catch (err) { toast('Could not build the bundle: ' + err.message, 5000); }
  };
  globalThis.buildDepositBundle = buildBundle;
})();
