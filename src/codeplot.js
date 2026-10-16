// Code plots (v2.0, extended in 2.1). Insert › Code Plot: write matplotlib (Python) or ggplot2 / base-R code, run it
// with the user's own Python or R (plotrunner.js keeps one worker per language running, so a re-run takes
// milliseconds to a second), and place the result as a vector plot that remembers its code, data and size.
//   - Printed size: a plot renders at the size it PRINTS (its page size × the journal width ÷ the page width), so
//     plotStyle sizes are printed points whatever the page is; changing the journal width re-runs plots.
//   - One plot style per figure: font; text, tick, label, title and legend sizes; the smallest size super- and
//     subscripts may shrink to; colours (PALETTE and the default colours); axes margins (automatic or fixed mm).
//   - Shared plot code per figure (state.doc.plotPrelude), run before every plot of that language.
//   - Data files are carried inside the figure (state.doc.plotData, by SHA-1): plots still run on another computer.
//   - Fixed axes margins and Line Up Plot Axes make side-by-side panels' axes meet the same lines.
//   - Label edits (Properties › Plot labels, with ^{sup}, _{sub}, {i|italic}, {b|bold}) and colour edits are
//     re-applied on every run; resizing re-runs at the new size instead of stretching.
//   - The Check tab looks inside plots: text below the journal minimum, lines thinner than its minimum, labels
//     overlapping each other; plus failed runs, missing or changed data, stretched plots, a changed print width.
//   - Scripting: SciCanvas.ready, SciCanvas.renderPlot(), SciCanvas.addSvg(), SciCanvas.plotStyle().
// Ungroup into Editable Parts turns a plot into ordinary shapes and text (it then no longer re-runs).
// Code that arrived inside a figure file is never run until the user runs it here (it can do anything a program can).
(() => {
  const nat = () => window.native || {};
  const PX_IN = 96, MM = 96 / 25.4, DATA_MAX = 25e6;
  const OKABE_ITO = ['#0072b2', '#e69f00', '#009e73', '#d55e00', '#cc79a7', '#56b4e9', '#f0e442', '#000000'];
  const SIDES = ['left', 'right', 'top', 'bottom'];
  const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no storage */ } };
  const prefs = () => store('scicanvas:plotInterpreters', {});
  // Code run on this computer (by hash, with the figure's shared code), so plots can re-run on their own; other code
  // waits for an explicit Run.
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; };
  const prelude = (lang) => ((state.doc.plotPrelude || {})[lang] || '');
  const codeKey = (p, pre = prelude(p.lang)) => (pre.trim() ? pre + '\u0000' + p.code : p.code);
  const isApproved = (p) => store('scicanvas:plotCodeRun', []).includes(hash(codeKey(p)));
  const approveKey = (k) => { const h = hash(k), l = store('scicanvas:plotCodeRun', []).filter((x) => x !== h); l.push(h); keep('scicanvas:plotCodeRun', l.slice(-500)); };

  // ---------- The figure's plot style and printed size ----------
  const journalMin = () => {
    const jd = state.doc.journal, j = jd && typeof JOURNALS !== 'undefined' && JOURNALS.find((x) => x.id === jd.id);
    return { pt: (j && j.minPt) || 6, line: (j && j.minLine) || 0.25 };
  };
  const validMargins = (m) => (m && typeof m === 'object' && SIDES.every((k) => Number.isFinite(+m[k])) ? Object.fromEntries(SIDES.map((k) => [k, +m[k]])) : null);
  function plotStyle() {
    const s = state.doc.plotStyle || {}, fs = +s.fontSize || 7;
    const pal = s.palette && s.palette.length ? s.palette : (typeof docPalette === 'function' && docPalette().length >= 3 ? docPalette() : OKABE_ITO);
    return {
      family: s.family || 'Arial', fontSize: fs, tickSize: +s.tickSize || fs - 1, labelSize: +s.labelSize || fs, titleSize: +s.titleSize || fs + 1, legendSize: +s.legendSize || fs - 1,
      minScriptPt: s.minScriptPt === 0 ? 0 : +s.minScriptPt || journalMin().pt, margins: validMargins(s.margins),
      palette: pal.filter((c) => /^#[0-9a-f]{6}$/i.test(c)),
    };
  }
  const pageOf = (o) => {
    const has = (l) => (l || []).some((x) => x === o || (x.type === 'group' && has(x.children)));
    return state.doc.pages.find((p) => has(p.objects)) || page();
  };
  // Pages are 96 units per inch, but a figure laid out on a big page prints at the journal's width.
  function printScale(o) { const jd = state.doc.journal, pg = o ? pageOf(o) : page(); return jd && jd.widthMM ? (jd.widthMM * MM) / pg.width : 1; }
  const marginsFor = (spec, st = plotStyle()) => (spec.margins === 'auto' ? null : validMargins(spec.margins) || st.margins);

  const TEMPLATES = {
    python: [
      ['Scatter with fit', `x = np.array([0.5, 1, 2, 4, 8, 16])
y = np.array([3.1, 5.8, 11.6, 21.9, 44.0, 85.2])
slope, intercept = np.polyfit(x, y, 1)

fig, ax = plt.subplots()
ax.scatter(x, y, s=18, zorder=3)
ax.plot(x, slope * x + intercept, color=PALETTE[1])
ax.set_xlabel("Concentration (µM)")
ax.set_ylabel("Signal (a.u.)")
ax.text(0.04, 0.92, f"y = {slope:.2f}x + {intercept:.2f}", transform=ax.transAxes)`],
      ['Bars with points (mean ± SD)', `groups = {"Control": [4.1, 3.8, 4.5, 4.0], "Drug A": [6.2, 5.9, 6.8, 6.4], "Drug B": [8.9, 9.6, 8.4, 9.1]}

fig, ax = plt.subplots()
for i, (name, vals) in enumerate(groups.items()):
    v = np.array(vals)
    ax.bar(i, v.mean(), yerr=v.std(ddof=1), width=0.6, color=PALETTE[i], alpha=0.35, capsize=3, error_kw={"linewidth": 0.8})
    ax.scatter(np.full(len(v), i) + np.linspace(-0.12, 0.12, len(v)), v, s=14, color=PALETTE[i], zorder=3)
ax.set_xticks(range(len(groups)), groups.keys())
ax.set_ylabel("Expression (fold)")`],
      ['Lines from a data file', `# Attach a CSV/TSV/Excel file (Data files, above); read("name") loads it.
# Here: first column = x, then one column per series.
df = read("data.csv")
fig, ax = plt.subplots()
x = df.columns[0]
for col in df.columns[1:]:
    ax.plot(df[x], df[col], marker="o", ms=3, label=col)
ax.set_xlabel(x)
ax.legend(frameon=False)`],
      ['Heatmap', `rng = np.random.default_rng(1)
m = rng.normal(size=(8, 6))
fig, ax = plt.subplots()
im = ax.imshow(m, cmap="RdBu_r", vmin=-2.5, vmax=2.5, aspect="auto")
ax.set_xticks(range(6), [f"S{i + 1}" for i in range(6)])
ax.set_yticks(range(8), [f"Gene {i + 1}" for i in range(8)])
fig.colorbar(im, ax=ax, label="z-score", shrink=0.8)`],
    ],
    r: [
      ['ggplot: scatter with fit', `df <- data.frame(x = c(0.5, 1, 2, 4, 8, 16), y = c(3.1, 5.8, 11.6, 21.9, 44.0, 85.2))
ggplot(df, aes(x, y)) +
  geom_smooth(method = "lm", formula = y ~ x, colour = PALETTE[2], fill = PALETTE[2], alpha = 0.15, linewidth = 0.6) +
  geom_point(colour = PALETTE[1], size = 1.6) +
  labs(x = "Concentration (µM)", y = "Signal (a.u.)")`],
      ['ggplot: box plot with points', `df <- data.frame(group = rep(c("Control", "Drug A", "Drug B"), each = 6),
                 value = c(4.1, 3.8, 4.5, 4.0, 4.3, 3.9, 6.2, 5.9, 6.8, 6.4, 6.1, 6.6, 8.9, 9.6, 8.4, 9.1, 9.3, 8.8))
ggplot(df, aes(group, value, colour = group)) +
  geom_boxplot(outlier.shape = NA, width = 0.55, linewidth = 0.4) +
  geom_jitter(width = 0.12, size = 1.2) +
  labs(x = NULL, y = "Expression (fold)") +
  theme(legend.position = "none")`],
      ['ggplot: from a data file', `# Attach a CSV/TSV/Excel file (Data files, above); read("name") loads it as a data frame.
df <- read("data.csv")
ggplot(df, aes(.data[[names(df)[1]]], .data[[names(df)[2]]])) +
  geom_point(size = 1.4) +
  labs(x = names(df)[1], y = names(df)[2])`],
      ['Base R', `x <- seq(0, 10, length.out = 100)
plot(x, sin(x), type = "l", col = PALETTE[1], lwd = 1.5, xlab = "Time (h)", ylab = "Signal", bty = "l", las = 1)
lines(x, cos(x), col = PALETTE[2], lwd = 1.5)
legend("topright", c("sin", "cos"), col = PALETTE[1:2], lwd = 1.5, bty = "n")`],
    ],
  };


  // ---------- Data carried in the figure ----------
  // Each attached file is read when it changes and kept in the figure by SHA-1 (up to 25 MB each). A plot reads the
  // original when it's there, and the figure's copy when it isn't (another computer, a moved file).
  async function resolveData(spec) {
    const kept = state.doc.plotData || (state.doc.plotData = {}), data = {};
    for (const f of spec.files || []) {
      let info = null;
      try { info = f.path && nat().dataFile ? await nat().dataFile(f.path, { stat: true }) : null; } catch { info = null; }
      if (info && !info.missing) {
        if ((info.sha1 !== f.sha1 || !kept[info.sha1]) && info.size <= DATA_MAX) {
          try { const full = await nat().dataFile(f.path); kept[full.sha1] = { name: f.name, base64: full.base64, size: full.size }; info = full; } catch { /* keep the path only */ }
        }
        Object.assign(f, { sha1: info.sha1, mtime: info.mtime, missing: false, fromCopy: false });
        data[f.name] = f.path;
      } else if (f.sha1 && kept[f.sha1]) {
        Object.assign(f, { missing: true, fromCopy: true });
        data[f.name] = { base64: kept[f.sha1].base64 };
      } else {
        f.missing = true;
        throw new Error(`The data file ${f.name} isn't on this computer (${f.path}) and the figure has no copy of it. Attach it again (Data files).`);
      }
    }
    return data;
  }
  function pruneData() {
    if (!state.doc.plotData) return;
    const used = new Set(allPlots().flatMap((o) => (o.plot.files || []).map((f) => f.sha1)));
    for (const k of Object.keys(state.doc.plotData)) if (!used.has(k)) delete state.doc.plotData[k];
  }

  // ---------- Running and placing ----------
  async function runSpec(spec, k = printScale()) {
    if (!nat().plotRun) throw new Error('Code plots need the SciCanvas desktop app.');
    const st = plotStyle(), pre = prelude(spec.lang);
    const data = await resolveData(spec);
    const r = await nat().plotRun({
      lang: spec.lang, code: spec.code, prelude: pre, data, width: (spec.w * k) / PX_IN, height: (spec.h * k) / PX_IN,
      fontSize: st.fontSize, tickSize: st.tickSize, labelSize: st.labelSize, titleSize: st.titleSize, legendSize: st.legendSize, minScriptPt: st.minScriptPt,
      family: st.family, palette: st.palette, margins: marginsFor(spec, st), interpreter: prefs()[spec.lang],
    });
    approveKey(codeKey(spec, pre));
    spec.k = k;
    return r;
  }
  // Label edits: text in the plot whose content matches an edited label is replaced on every run. The new text may
  // use SciCanvas markup (^{sup}, _{sub}, {i|italic}, {b|bold}, {#c00|colour}); super- and subscripts keep at
  // least the figure's minimum script size (minUnits, in the plot's own units).
  const MARKUP = /[\^_]\{|\{[biu]{1,3}(#[0-9a-f]{3,8})?\||\{#[0-9a-f]{3,8}\|/i;
  const fontSizeOf = (t) => { const s = t.getAttribute('style') || ''; const m = s.match(/font-size\s*:\s*([\d.]+)/) || s.match(/font\s*:[^;]*?([\d.]+)px/) || [null, t.getAttribute('font-size')]; return parseFloat(m[1]) || 10; };
  function setLabel(t, value, minUnits) {
    t.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    if (!MARKUP.test(value) || typeof parseMarkup !== 'function') { t.textContent = value; return; }
    const fs = fontSizeOf(t), NS = t.namespaceURI, doc = t.ownerDocument;
    t.textContent = '';
    for (const seg of parseMarkup(value)) {
      const sp = doc.createElementNS(NS, 'tspan');
      if (seg.bold) sp.setAttribute('font-weight', '700');
      if (seg.italic) sp.setAttribute('font-style', 'italic');
      if (seg.color) sp.setAttribute('fill', seg.color);
      sp.textContent = seg.t;
      t.append(sp);
      if (seg.s) {
        const shift = seg.s > 0 ? -fs * 0.38 : fs * 0.22;
        sp.setAttribute('font-size', Math.min(fs, Math.max(fs * 0.7, minUnits || 0)).toFixed(2));
        sp.setAttribute('dy', shift.toFixed(2));
        const back = doc.createElementNS(NS, 'tspan'); back.setAttribute('dy', (-shift).toFixed(2)); back.textContent = '​'; t.append(back);
      }
    }
  }
  function applyTextEdits(svgText, edits, spec) {
    if (!edits || !Object.keys(edits).length) return svgText;
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const vb = (doc.documentElement.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const ptPerUnit = spec && vb[2] ? (spec.w * (spec.k || 1) * 0.75) / vb[2] : 1;
    const minUnits = plotStyle().minScriptPt / ptPerUnit;
    for (const t of doc.querySelectorAll('text')) { const k = t.textContent.trim(); if (Object.prototype.hasOwnProperty.call(edits, k)) setLabel(t, edits[k], minUnits); }
    return new XMLSerializer().serializeToString(doc);
  }
  // The plot's own labels, before any edits.
  const plotTexts = (o) => { const a = getAsset(o.iconId); if (!a) return []; const d = new DOMParser().parseFromString(a.raw || `<svg xmlns="http://www.w3.org/2000/svg">${a.svg}</svg>`, 'image/svg+xml'); return [...new Set([...d.querySelectorAll('text')].map((t) => t.textContent.trim()).filter(Boolean))]; };
  function dropAssetIfUnused(key) {
    if (!key || !state.doc.assets || !state.doc.assets[key]) return;
    let used = false;
    const walk = (l) => { for (const x of l || []) { if (x.type === 'group') walk(x.children); else if (x.iconId === key) used = true; } };
    for (const p of state.doc.pages) walk(p.objects);
    if (!used) delete state.doc.assets[key];
  }
  // svglite (R) draws axis lines and outlines black through a <style> block, which importing an SVG drops (as it
  // drops all CSS): write those defaults onto the shapes themselves.
  function inlineSvgliteDefaults(svgText) {
    if (!/class=['"]svglite['"]/.test(svgText)) return svgText;
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const has = (e, prop) => e.hasAttribute(prop) || new RegExp(`(^|;)\\s*${prop}\\s*:`).test(e.getAttribute('style') || '');
    for (const e of doc.querySelectorAll('line, polyline, polygon, path, rect, circle')) {
      if (e.closest('g.glyphgroup')) continue;
      if (!has(e, 'fill')) e.setAttribute('fill', 'none');
      if (!has(e, 'stroke')) e.setAttribute('stroke', '#000000');
      if (!has(e, 'stroke-linecap')) e.setAttribute('stroke-linecap', 'round');
      if (!has(e, 'stroke-linejoin')) e.setAttribute('stroke-linejoin', 'round');
    }
    return new XMLSerializer().serializeToString(doc);
  }
  // The asset keeps the run's own SVG (raw), so label edits can be re-applied to it without re-running.
  function plotAsset(svgText, spec) {
    const key = addSvgAsset(`${spec.lang === 'r' ? 'R' : 'Python'} plot`, inlineSvgliteDefaults(applyTextEdits(svgText, spec.textEdits, spec)));
    Object.assign(state.doc.assets[key], { pack: 'codeplot', raw: svgText });
    return key;
  }
  // Put a run's SVG on the page: a new plot object, or the existing one updated in place.
  function place(svgText, spec, existing, result) {
    const key = plotAsset(svgText, spec);
    const meta = { ...spec, error: null, ranAt: Date.now(), versions: result.info || null, interpreter: result.interpreter || null, axes: result.axes || null };
    let o = existing;
    if (o) { const old = o.iconId; o.iconId = key; o.w = spec.w; o.h = spec.h; o.plot = meta; dropAssetIfUnused(old); }
    else {
      const c = viewCenter();
      o = { id: uid(), type: 'icon', iconId: key, x: c.x - spec.w / 2, y: c.y - spec.h / 2, w: spec.w, h: spec.h, rot: 0, name: `${spec.lang === 'r' ? 'R' : 'Python'} plot`, plot: meta };
      page().objects.push(o);
      state.sel = [o.id];
    }
    pruneData();
    return o;
  }
  const stale = (o) => Math.abs(o.w - o.plot.w) > 0.5 || Math.abs(o.h - o.plot.h) > 0.5 || Math.abs((o.plot.k || 1) - printScale(o)) > 0.005;
  // Re-run one plot object (on data change, resize, style or print-width change, or request). True if redrawn.
  async function rerun(o, { quiet = false, force = false } = {}) {
    if (!o.plot) return false;
    if (!force && !isApproved(o.plot)) { if (!quiet) toast('This plot’s code came with the figure: open it (double-click) and press Run to run it on this computer.', 5000); return false; }
    const spec = { ...o.plot, w: o.w, h: o.h };
    let r;
    try { r = await runSpec(spec, printScale(o)); } catch (e) { o.plot.error = e.message; if (!quiet) toast(e.message, 6000); return false; }
    if (!r.svg) { o.plot.error = r.error || 'No plot'; renderProps(); if (!quiet) toast('The plot’s code failed: ' + String(r.error).split('\n').pop(), 6000); return false; }
    place(r.svg, spec, o, r);
    return true;
  }

  // ---------- The plot window ----------
  function openPlotDialog(existing) {
    const k = existing ? printScale(existing) : printScale();
    const spec = existing && existing.plot
      ? { ...deep(existing.plot), w: existing.w, h: existing.h }
      : { lang: store('scicanvas:plotLang', 'python'), code: '', files: [], w: (80 * MM) / k, h: (60 * MM) / k, textEdits: {} };
    if (!spec.code) spec.code = TEMPLATES[spec.lang][0][1];
    let trusted = !existing || isApproved(spec), last = null, timer = null, busy = false, again = false;
    const styleBefore = JSON.stringify(plotStyle()), preludeBefore = { python: prelude('python'), r: prelude('r') };

    const mono = 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45';
    const noSpell = (t) => { t.setAttribute('spellcheck', 'false'); t.setAttribute('autocorrect', 'off'); t.setAttribute('autocapitalize', 'off'); return t; };
    const code = noSpell(el('textarea', { value: spec.code, style: `${mono};width:100%;height:300px;resize:vertical;tab-size:4;white-space:pre;padding:8px;box-sizing:border-box` }));
    const pre = noSpell(el('textarea', { value: prelude(spec.lang), placeholder: 'Helpers every plot in this figure can use (imports, functions, a theme). Runs before each plot’s own code.', style: `${mono};width:100%;height:120px;resize:vertical;white-space:pre;padding:8px;box-sizing:border-box` }));
    const preSummary = el('summary', { style: 'cursor:pointer' });
    const drawPreSummary = () => { const n = prelude(spec.lang).split('\n').filter((l) => l.trim()).length; preSummary.textContent = `Shared code for this figure (${spec.lang === 'r' ? 'R' : 'Python'}, runs before every plot)${n ? ` · ${n} line${n > 1 ? 's' : ''}` : ''}`; };
    const lang = el('select', {}, el('option', { value: 'python', textContent: 'Python (matplotlib)', selected: spec.lang === 'python' }), el('option', { value: 'r', textContent: 'R (ggplot2 / base)', selected: spec.lang === 'r' }));
    const tmpl = el('select', {});
    const fillTemplates = () => { tmpl.innerHTML = ''; tmpl.append(el('option', { value: '', textContent: 'Start from an example…' }), ...TEMPLATES[spec.lang].map(([n], i) => el('option', { value: i, textContent: n }))); };
    const filesBox = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center' });
    const pick = el('input', { type: 'file', multiple: true, accept: '.csv,.tsv,.txt,.xlsx,.xls,.json', style: 'display:none' });
    const num = (v, min, max, step, w = 60) => el('input', { type: 'number', value: v, min, max, step, style: `width:${w}px` });
    const wIn = num(+((spec.w * k) / MM).toFixed(1), 10, 400, 1, 70), hIn = num(+((spec.h * k) / MM).toFixed(1), 10, 400, 1, 70);

    // Axes margins for this plot: the figure's default, automatic, or fixed (mm from each edge).
    const mMode = el('select', {}, ...[['', 'Figure default'], ['auto', 'Automatic'], ['fixed', 'Fixed (mm)']].map(([v, t]) => el('option', { value: v, textContent: t })));
    mMode.value = spec.margins === 'auto' ? 'auto' : validMargins(spec.margins) ? 'fixed' : '';
    const mIn = Object.fromEntries(SIDES.map((s) => [s, num(+(validMargins(spec.margins) || plotStyle().margins || { left: 12, right: 2, top: 2, bottom: 10 })[s].toFixed(1), 0, 100, 0.5, 52)]));
    const mBox = el('span', { style: 'display:inline-flex;gap:4px;align-items:center' }, ...SIDES.flatMap((s) => [el('span', { class: 'note', textContent: s[0].toUpperCase() }), mIn[s]]));
    const readMargins = () => { spec.margins = mMode.value === 'auto' ? 'auto' : mMode.value === 'fixed' ? Object.fromEntries(SIDES.map((s) => [s, +mIn[s].value || 0])) : undefined; mBox.style.display = mMode.value === 'fixed' ? 'inline-flex' : 'none'; };
    readMargins();

    // The figure's plot style (every code plot).
    const st0 = state.doc.plotStyle || {};
    const sIn = {
      fontSize: num(plotStyle().fontSize, 4, 14, 0.5), tickSize: num(st0.tickSize || '', 4, 14, 0.5, 72), labelSize: num(st0.labelSize || '', 4, 14, 0.5, 72),
      titleSize: num(st0.titleSize || '', 4, 18, 0.5, 72), legendSize: num(st0.legendSize || '', 4, 14, 0.5, 72), minScriptPt: num(st0.minScriptPt ?? '', 0, 12, 0.5),
    };
    sIn.tickSize.placeholder = sIn.legendSize.placeholder = 'text −1'; sIn.labelSize.placeholder = 'text'; sIn.titleSize.placeholder = 'text +1'; sIn.minScriptPt.placeholder = `${journalMin().pt}`;
    const famIn = el('input', { value: plotStyle().family, style: 'width:100px' });
    const swatches = el('span', { style: 'display:inline-flex;gap:2px;vertical-align:middle' });
    const drawSwatches = () => { swatches.innerHTML = ''; plotStyle().palette.slice(0, 10).forEach((c) => swatches.append(el('span', { title: c, style: `width:12px;height:12px;border-radius:2px;background:${c};display:inline-block` }))); };
    const palIn = el('input', { value: (st0.palette || []).join(', '), placeholder: 'figure palette / Okabe–Ito', title: 'Hex colours for every plot, comma-separated. Empty: the figure’s palette, or the colour-blind-safe Okabe–Ito set.', style: 'width:190px' });
    const dmMode = el('select', {}, el('option', { value: '', textContent: 'Automatic' }), el('option', { value: 'fixed', textContent: 'Fixed (mm)' }));
    dmMode.value = st0.margins ? 'fixed' : '';
    const dmIn = Object.fromEntries(SIDES.map((s) => [s, num(+((st0.margins || { left: 12, right: 2, top: 2, bottom: 10 })[s]).toFixed(1), 0, 100, 0.5, 52)]));
    const dmBox = el('span', { style: 'display:inline-flex;gap:4px;align-items:center' }, ...SIDES.flatMap((s) => [el('span', { class: 'note', textContent: s[0].toUpperCase() }), dmIn[s]]));
    const saveStyle = () => {
      const s = { ...(state.doc.plotStyle || {}) };
      for (const [key, inp] of Object.entries(sIn)) { if (inp.value === '') delete s[key]; else s[key] = +inp.value; }
      s.family = famIn.value.trim() || 'Arial';
      s.palette = palIn.value.split(/[\s,;]+/).filter(Boolean).map((c) => (c.startsWith('#') ? c : '#' + c).toLowerCase()).filter((c) => /^#[0-9a-f]{6}$/.test(c));
      palIn.value = s.palette.join(', ');
      s.margins = dmMode.value === 'fixed' ? Object.fromEntries(SIDES.map((x) => [x, +dmIn[x].value || 0])) : null;
      dmBox.style.display = dmMode.value === 'fixed' ? 'inline-flex' : 'none';
      state.doc.plotStyle = s; drawSwatches(); markDirty(); schedule();
    };
    dmBox.style.display = dmMode.value === 'fixed' ? 'inline-flex' : 'none';
    drawSwatches();

    const preview = el('div', { class: 'preview', style: 'min-height:280px;position:relative' });
    const status = el('div', { class: 'note', style: 'min-height:18px' });
    const out = el('pre', { style: `${mono};max-height:110px;overflow:auto;margin:6px 0 0;white-space:pre-wrap;color:var(--muted)` });
    const env = el('div', { class: 'note', style: 'margin-top:6px' });
    const runBtn = btn('Run ⌘↵', () => run(true), 'primary');
    const doneBtn = btn(existing ? 'Update plot' : 'Insert plot', () => finish(), 'primary');

    const drawFiles = () => {
      filesBox.innerHTML = '';
      for (const f of spec.files) filesBox.append(el('span', { class: 'chip', title: `${f.path}${f.fromCopy ? ' (not found: using the copy saved in the figure)' : ''}`, style: 'display:inline-flex;gap:4px;align-items:center;padding:2px 8px;border:1px solid var(--border);border-radius:10px' }, `read("${f.name}")${f.fromCopy ? ' · saved copy' : ''}`, el('button', { textContent: '×', title: 'Remove', style: 'border:0;background:none;cursor:pointer', onclick: () => { spec.files = spec.files.filter((x) => x !== f); drawFiles(); schedule(); } })));
      filesBox.append(btn('Add data file…', () => pick.click()));
    };
    pick.onchange = async () => {
      for (const f of pick.files) {
        const p = nat().pathForFile && nat().pathForFile(f);
        if (!p) { toast('Could not get the file’s location'); continue; }
        spec.files = spec.files.filter((x) => x.name !== f.name).concat({ name: f.name, path: p });
      }
      pick.value = ''; drawFiles(); schedule();
    };
    const show = (r) => {
      last = r;
      preview.innerHTML = '';
      if (r.svg) {
        const url = URL.createObjectURL(new Blob([inlineSvgliteDefaults(applyTextEdits(r.svg, spec.textEdits, spec))], { type: 'image/svg+xml' }));
        preview.append(el('img', { src: url, style: 'max-width:100%;max-height:400px', onload: () => URL.revokeObjectURL(url) }));
      } else preview.append(el('pre', { textContent: r.error || 'No plot', style: `${mono};color:#c0392b;white-space:pre-wrap;padding:10px;margin:0;align-self:flex-start` }));
      out.textContent = r.log || '';
      const st = plotStyle();
      status.textContent = r.svg ? `Rendered in ${r.ms} ms · prints ${wIn.value} × ${hIn.value} mm, text ${st.fontSize} pt, ticks ${st.tickSize} pt${r.axes ? ` · axes ${SIDES.map((s) => r.axes[s].toFixed(1)).join(' / ')} mm (L/R/T/B)` : ''}` : 'The code failed (see the message on the right).';
      doneBtn.disabled = !r.svg;
      drawFiles();
    };
    async function run(explicit) {
      if (!trusted && !explicit) return;
      if (busy) { again = true; return; }
      busy = true; trusted = true;
      spec.code = code.value; spec.lang = lang.value; spec.w = (+wIn.value * MM) / k; spec.h = (+hIn.value * MM) / k; readMargins();
      status.textContent = 'Running…';
      try { show(await runSpec(spec, k)); } catch (e) { show({ error: e.message }); }
      busy = false;
      if (again) { again = false; run(false); }
    }
    const schedule = () => { clearTimeout(timer); if (trusted) timer = setTimeout(() => run(false), 450); };
    async function finish() {
      if (!last || !last.svg) return;
      checkpoint('codeplot');
      spec.code = code.value; spec.lang = lang.value; readMargins();
      if (spec.margins === undefined) delete spec.margins;
      const placed = place(last.svg, spec, existing, last);
      keep('scicanvas:plotLang', spec.lang);
      closeModal(); render({ props: true }); markDirty();
      // Shared code or the figure's plot style changed: bring the other plots in line. Plots this computer ran with
      // the old shared code may run with the new one (the user just wrote it).
      const others = allPlots().filter((o) => o !== placed);
      for (const lg of ['python', 'r']) {
        if (prelude(lg) === preludeBefore[lg]) continue;
        for (const o of others) if (o.plot.lang === lg && store('scicanvas:plotCodeRun', []).includes(hash(codeKey(o.plot, preludeBefore[lg])))) approveKey(codeKey(o.plot));
      }
      const styleChanged = JSON.stringify(plotStyle()) !== styleBefore;
      const redo = others.filter((o) => isApproved(o.plot) && (styleChanged || prelude(o.plot.lang) !== preludeBefore[o.plot.lang]));
      if (redo.length) rerunMany(redo, styleChanged ? 'Plot style changed' : 'Shared code changed');
    }

    code.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(true); }
      else if (e.key === 'Tab') { e.preventDefault(); const s = code.selectionStart; code.setRangeText(spec.lang === 'r' ? '  ' : '    ', s, code.selectionEnd, 'end'); }
    });
    code.addEventListener('input', schedule);
    pre.addEventListener('input', () => { state.doc.plotPrelude = { ...(state.doc.plotPrelude || {}), [spec.lang]: pre.value }; drawPreSummary(); markDirty(); schedule(); });
    lang.onchange = () => {
      spec.lang = lang.value; fillTemplates(); pre.value = prelude(spec.lang); drawPreSummary();
      if (TEMPLATES[lang.value === 'r' ? 'python' : 'r'].some(([, c]) => c === code.value) || !code.value.trim()) code.value = TEMPLATES[spec.lang][0][1];
      checkEnv(); schedule();
    };
    tmpl.onchange = () => { if (tmpl.value === '') return; code.value = TEMPLATES[spec.lang][+tmpl.value][1]; tmpl.value = ''; trusted = true; schedule(); };
    [wIn, hIn, ...Object.values(mIn)].forEach((i) => i.addEventListener('input', schedule));
    mMode.addEventListener('change', () => { readMargins(); schedule(); });
    [...Object.values(sIn), famIn, palIn, dmMode, ...Object.values(dmIn)].forEach((i) => i.addEventListener('change', saveStyle));

    // Which Python / R is used, with buttons for packages that are missing.
    async function checkEnv() {
      if (!nat().plotEnv) { env.textContent = 'Code plots need the SciCanvas desktop app.'; return; }
      env.textContent = 'Looking for Python and R…';
      let e; try { e = await nat().plotEnv(prefs()); } catch (err) { env.textContent = err.message; return; }
      const x = e[spec.lang] || {}, kids = [];
      if (!x.found) kids.push(spec.lang === 'python' ? 'Python 3 with matplotlib wasn’t found. ' : 'R wasn’t found. ');
      else if (x.error) kids.push(`${x.path}: ${x.error} `);
      else if (spec.lang === 'python') kids.push(`Python ${x.python} · matplotlib ${x.matplotlib}${x.pandas ? ` · pandas ${x.pandas}` : ''}${x.seaborn ? ` · seaborn ${x.seaborn}` : ''} (${x.path}) `);
      else kids.push(`R ${x.r}${x.ggplot2 ? ` · ggplot2 ${x.ggplot2}` : ''}${x.svglite ? ` · svglite ${x.svglite}` : ''} (${x.path}) `);
      const missing = !x.found || x.error ? [] : spec.lang === 'python' ? ['pandas', 'seaborn'].filter((p) => !x[p]) : ['svglite', 'ggplot2'].filter((p) => !x[p]);
      for (const p of missing) kids.push(btn(`Install ${p}`, async (ev) => {
        ev.target.disabled = true; ev.target.textContent = `Installing ${p}…`;
        try { await nat().plotInstall(spec.lang, p, prefs()); toast(`${p} installed`); checkEnv(); schedule(); } catch (err) { toast(`Couldn’t install ${p}: ${err.message}`, 8000); ev.target.disabled = false; ev.target.textContent = `Install ${p}`; }
      }), ' ');
      kids.push(btn('Choose…', async () => { const p = await nat().pickInterpreter(); if (!p) return; const pr = prefs(); pr[spec.lang] = p; keep('scicanvas:plotInterpreters', pr); checkEnv(); schedule(); }));
      if (prefs()[spec.lang]) kids.push(' ', btn('Use default', () => { const pr = prefs(); delete pr[spec.lang]; keep('scicanvas:plotInterpreters', pr); checkEnv(); schedule(); }));
      env.innerHTML = ''; env.append(...kids);
    }

    fillTemplates(); drawFiles(); drawPreSummary();
    const line = (...kids) => el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px' }, ...kids);
    const lab = (t, ...kids) => el('label', { style: 'display:inline-flex;gap:4px;align-items:center' }, t, ...kids);
    const body = el('div', {},
      el('div', { style: 'display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px' },
        el('div', {},
          el('div', { style: 'display:flex;gap:8px;margin-bottom:6px' }, lang, tmpl),
          code,
          el('details', { style: 'margin-top:6px' }, preSummary, pre),
          el('div', { style: 'margin-top:6px' }, el('div', { class: 'note', textContent: 'Data files (saved in the figure; re-run when they change):' }), filesBox, pick),
          env),
        el('div', {},
          preview, status,
          line(lab('Width', wIn, 'mm'), lab('Height', hIn, 'mm'), el('span', { class: 'note', textContent: 'printed size' })),
          line(lab('Axes margins', mMode), mBox),
          el('details', { style: 'margin-top:8px' }, el('summary', { textContent: 'Plot style for this figure (every code plot)', style: 'cursor:pointer' }),
            line(lab('Text', sIn.fontSize, 'pt'), lab('Ticks', sIn.tickSize), lab('Axis labels', sIn.labelSize), lab('Titles', sIn.titleSize), lab('Legend', sIn.legendSize)),
            line(lab('Super/subscripts at least', sIn.minScriptPt, 'pt'), lab('Font', famIn)),
            line(lab('Colours', palIn), swatches),
            line(lab('Default axes margins', dmMode), dmBox)),
          out)),
      el('div', { class: 'note', style: 'margin-top:8px', textContent: 'Code runs with your own Python / R. Available: PALETTE, WIDTH, HEIGHT (in), FONT_SIZE, TICK_SIZE, LABEL_SIZE, TITLE_SIZE, LEGEND_SIZE (pt), MARGINS, read("file"), data. Python also has plt, np, pd, sns; R loads ggplot2.' }),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), runBtn, doneBtn));
    openModal(existing ? 'Edit code plot' : 'Code plot', body);
    doneBtn.disabled = true;
    checkEnv();
    if (trusted) run(false);
    else preview.append(el('div', { class: 'note', style: 'padding:16px;text-align:center', textContent: 'This plot’s code (or the figure’s shared code) came with the figure and hasn’t been run on this computer. Read it, then press Run.' }));
    setTimeout(() => code.focus(), 50);
  }

  // ---------- Commands, double-click, Properties ----------
  const allPlots = () => { const out = []; const walk = (l) => { for (const o of l || []) { if (o.type === 'group') walk(o.children); else if (o.type === 'icon' && o.plot) out.push(o); } }; for (const p of state.doc.pages) walk(p.objects); return out; };
  async function rerunMany(list, why) {
    if (!list.length) return 0;
    checkpoint('codeplot');
    let n = 0;
    for (const o of list) if (await rerun(o, { quiet: true })) n++;
    if (n) { render({ props: true }); markDirty(); toast(`${why}: re-ran ${n} plot${n > 1 ? 's' : ''}`); }
    return n;
  }
  // Line up plot axes: give the selected plots the same fixed margins (the largest each side needs), so their axes
  // start and end on the same lines when the plots are aligned and the same size.
  async function lineUpAxes(list = selected().filter((o) => o.plot)) {
    if (list.length < 2) { toast('Select two or more code plots to line up their axes'); return; }
    const boxes = list.map((o) => o.plot.axes || validMargins(o.plot.margins)).filter(Boolean);
    if (boxes.length < list.length) { toast('Re-run the plots first so SciCanvas knows where their axes are'); return; }
    const m = Object.fromEntries(SIDES.map((s) => [s, +Math.max(...boxes.map((b) => b[s])).toFixed(2)]));
    for (const o of list) o.plot.margins = m;
    await rerunMany(list.filter((o) => isApproved(o.plot)), 'Lined up axes');
  }
  ARRANGE_COMMANDS.codePlot = () => { const s = selected(); openPlotDialog(s.length === 1 && s[0].plot ? s[0] : null); };
  ARRANGE_COMMANDS.rerunPlots = () => rerunMany(allPlots().filter((o) => isApproved(o.plot)), 'Figure plot style');
  ARRANGE_COMMANDS.lineUpPlotAxes = () => lineUpAxes();
  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu(), sel = selected();
    if (sel.filter((o) => o.plot).length >= 2) t.push({ label: 'Line up plot axes', cmd: 'lineUpPlotAxes' });
    return t;
  };

  svg.addEventListener('dblclick', (e) => {
    const g = e.target.closest && e.target.closest('#scene [data-id]');
    const o = g && byId(g.dataset.id);
    if (o && o.plot) { e.stopPropagation(); e.preventDefault(); openPlotDialog(o); }
  }, true);

  const prevProps = renderProps;
  renderProps = function () {
    prevProps();
    const sel = selected();
    if (sel.length !== 1 || !sel[0].plot) return;
    // Colour presets and the icon tint recolour every colour of an icon, which would flatten a plot's palette.
    for (const h of document.querySelectorAll('#props .sect > h3')) if (/^colour presets$|^colour$/i.test(h.textContent.trim())) h.parentElement.remove();
    const o = sel[0], p = o.plot;
    const labels = plotTexts(o).filter((t) => !/^[-−+]?[\d.,]+%?$/.test(t)).slice(0, 40);
    const edits = { ...(p.textEdits || {}) };
    const rows = labels.map((orig) => row(orig.length > 22 ? orig.slice(0, 21) + '…' : orig, el('input', { value: edits[orig] ?? orig, title: `${orig}\nUse ^{superscript}, _{subscript}, {i|italic}, {b|bold}.`, onchange: (e) => {
      const v = e.target.value, a = getAsset(o.iconId);
      if (v === orig) delete edits[orig]; else edits[orig] = v;
      checkpoint('plotlabel'); p.textEdits = edits;
      if (a && a.raw) { const old = o.iconId; o.iconId = plotAsset(a.raw, p); dropAssetIfUnused(old); }
      render({ props: true }); markDirty();
    } })));
    const k = printScale(o), copies = (p.files || []).filter((f) => f.fromCopy).length;
    const mine = [sect(`Code plot (${p.lang === 'r' ? 'R' : 'Python'})`,
      el('div', { class: 'note', textContent: `Prints ${((o.w * k) / MM).toFixed(0)} × ${((o.h * k) / MM).toFixed(0)} mm${(p.files || []).length ? ` · data: ${p.files.map((f) => f.name).join(', ')}${copies ? ' (saved copy)' : ''}` : ''}${p.ranAt ? ` · run ${new Date(p.ranAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}${stale(o) ? ' · size or print width changed: re-run to lay it out again' : ''}` }),
      p.error ? el('div', { class: 'note', style: 'color:#c0392b', textContent: 'Last run failed: ' + String(p.error).split('\n').pop() }) : '',
      el('div', { class: 'btnrow' }, btn('Edit code…', () => openPlotDialog(o)), btn('Re-run', async () => { checkpoint('codeplot'); if (await rerun(o, { force: true })) { render({ props: true }); markDirty(); } }), btn('Ungroup into parts', () => ungroupIcons([o])))),
    labels.length ? sect('Plot labels (kept when the plot re-runs)', el('div', { class: 'note', textContent: 'Rich text: ^{superscript}, _{subscript}, {i|italic}, {b|bold}.' }), ...rows) : ''].filter(Boolean);
    const pos = [...document.querySelectorAll('#props .sect > h3')].find((h) => /position/i.test(h.textContent));
    if (pos) pos.parentElement.after(...mine); else $('#props').append(...mine);
  };

  // Resizing a plot lays it out again at the new size (text keeps its size) instead of stretching it.
  let resizeTimer;
  window.addEventListener('pointerup', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      const list = selected().filter((o) => o.plot && isApproved(o.plot) && stale(o));
      if (list.length) await rerunMany(list, 'Resized');
    }, 120);
  });

  // Data or print width changed (window regains focus, figure opened, Insert › Refresh Linked Data): re-run.
  async function refreshPlots({ quiet = true } = {}) {
    if (!nat().dataFile) return 0;
    const redo = [];
    for (const o of allPlots()) {
      if (stale(o)) redo.push(o);
      for (const f of o.plot.files || []) {
        let i; try { i = await nat().dataFile(f.path, { stat: true }); } catch { continue; }
        f.missing = !!i.missing; f.fromCopy = f.missing && !!(state.doc.plotData || {})[f.sha1];
        if (!i.missing && f.sha1 && i.sha1 !== f.sha1) { f.changed = true; if (!redo.includes(o)) redo.push(o); }
      }
    }
    const n = await rerunMany(redo.filter((o) => isApproved(o.plot)), 'Data or size changed');
    if (!quiet && !redo.length) toast('Code plots are up to date');
    return n;
  }
  window.addEventListener('focus', () => setTimeout(() => refreshPlots(), 500));
  const prevLoad = loadDoc;
  loadDoc = function (...a) { const r = prevLoad.apply(this, a); setTimeout(() => refreshPlots(), 150); return r; };
  const prevRefresh = ARRANGE_COMMANDS.refreshData;
  ARRANGE_COMMANDS.refreshData = async () => { if (prevRefresh) await prevRefresh(); await refreshPlots({ quiet: false }); };

  // ---------- Check tab: inside the plots ----------
  // The plot's drawing is laid out off-screen at its own units; every text run's font size and every stroke's width
  // is taken through its transform and converted to printed points; text boxes (one per label: matplotlib draws a
  // label with maths as several runs inside one <g id="text_…">) are tested for overlaps.
  const inspected = new Map();
  function inspectPlot(o) {
    const a = getAsset(o.iconId);
    if (!a || !a.vw || typeof document === 'undefined' || !document.body || !document.body.append) return null;
    const k = printScale(o), min = journalMin(), key = `${o.iconId}|${o.w.toFixed(1)}|${k.toFixed(4)}|${min.pt}|${min.line}`;
    if (inspected.has(key)) return inspected.get(key);
    const ptPerUnit = (o.w * k * 0.75) / a.vw;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-30000px;top:0;opacity:0;pointer-events:none';
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${a.vw}" height="${a.vh}" viewBox="${a.vb}" overflow="visible">${a.svg}</svg>`;
    document.body.append(host);
    const out = { small: [], thin: [], overlaps: [], minText: null, minLine: null };
    try {
      const root = host.firstElementChild;
      const scale = (e) => { const m = e.getCTM && e.getCTM(); return m ? Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) : 1; };
      const hidden = (e) => !!e.closest('defs, clipPath, mask, pattern, marker, symbol');
      // text
      for (const e of root.querySelectorAll('text, tspan')) {
        if (hidden(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.replace(/\u200b/g, '').trim())) continue;
        const pt = parseFloat(getComputedStyle(e).fontSize) * scale(e.closest('text')) * ptPerUnit;
        if (!(pt > 0)) continue;
        out.minText = out.minText == null ? pt : Math.min(out.minText, pt);
        if (pt < min.pt - 0.05) out.small.push({ text: e.textContent.trim(), pt });
      }
      // strokes
      for (const e of root.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse')) {
        if (hidden(e)) continue;
        const cs = getComputedStyle(e);
        if (cs.stroke === 'none' || cs.visibility === 'hidden' || +cs.strokeOpacity === 0 || +cs.opacity === 0) continue;
        const w = parseFloat(cs.strokeWidth) * scale(e) * ptPerUnit;
        if (!(w > 0)) continue;
        out.minLine = out.minLine == null ? w : Math.min(out.minLine, w);
        if (w < min.line - 0.005) out.thin.push(w);
      }
      // overlapping labels
      const groups = new Map();
      for (const t of root.querySelectorAll('text')) {
        if (hidden(t) || !t.textContent.replace(/\u200b/g, '').trim()) continue;
        const g = t.closest('g[id^="text_"], g[id*="_text_"]') || t, r = t.getBoundingClientRect();
        const cur = groups.get(g) || { text: '', l: Infinity, t: Infinity, r: -Infinity, b: -Infinity };
        // a text box includes the font's full line height; the letters fill roughly its middle 60 %
        const inset = r.height * 0.2;
        Object.assign(cur, { text: cur.text + t.textContent.replace(/\s+/g, ' ').trim(), l: Math.min(cur.l, r.left), t: Math.min(cur.t, r.top + inset), r: Math.max(cur.r, r.right), b: Math.max(cur.b, r.bottom - inset) });
        groups.set(g, cur);
      }
      const boxes = [...groups.values()].filter((b) => b.r > b.l && b.b > b.t);
      for (let i = 0; i < boxes.length && out.overlaps.length < 6; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const A = boxes[i], B = boxes[j], w = Math.min(A.r, B.r) - Math.max(A.l, B.l), h = Math.min(A.b, B.b) - Math.max(A.t, B.t);
          if (w <= 0 || h <= 0) continue;
          const small = Math.min((A.r - A.l) * (A.b - A.t), (B.r - B.l) * (B.b - B.t));
          if ((w * h) / small > 0.25) out.overlaps.push([A.text, B.text]);
        }
      }
    } finally { host.remove(); }
    if (inspected.size > 200) inspected.clear();
    inspected.set(key, out);
    return out;
  }
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      const walk = (l, f) => { for (const o of l || []) { if (o.type === 'group') walk(o.children, f); else f(o); } };
      const min = journalMin(), q = (s) => `“${s.length > 28 ? s.slice(0, 27) + '…' : s}”`;
      walk(p.objects, (o) => {
        if (!o.plot) return;
        const nm = o.name || 'A code plot';
        if (o.plot.error) r.issues.push({ sev: 'error', kind: 'Data', id: o.id, msg: `${nm}: its code failed on the last run (${String(o.plot.error).split('\n').pop().slice(0, 120)}).` });
        for (const f of o.plot.files || []) {
          if (f.missing && !f.fromCopy) r.issues.push({ sev: 'warn', kind: 'Data', id: o.id, msg: `${nm}: data file not found: ${f.path}, and the figure has no copy of it.` });
          else if (f.changed && !isApproved(o.plot)) r.issues.push({ sev: 'warn', kind: 'Data', id: o.id, msg: `${nm}: ${f.name} has changed since the plot was drawn. Open the plot and Run it to update.` });
        }
        if (stale(o)) r.issues.push({ sev: 'warn', kind: 'Text', id: o.id, msg: `${nm} was drawn for a different size or print width, so its text and lines don’t print at their set sizes.`, fix: async () => { await rerun(o); }, fixLabel: 'Re-run at this size' });
        let x = null; try { x = inspectPlot(o); } catch { x = null; }
        if (!x) return;
        if (x.small.length) {
          const s = x.small.slice().sort((a, b) => a.pt - b.pt);
          r.issues.push({ sev: 'warn', kind: 'Text', id: o.id, msg: `${nm}: ${s.length} text run${s.length > 1 ? 's print' : ' prints'} below the ${min.pt} pt minimum (smallest ${q(s[0].text)} at ${s[0].pt.toFixed(1)} pt). Raise the plot text sizes or “Super/subscripts at least” (Plot style), or make the plot larger.` });
        }
        if (x.thin.length) r.issues.push({ sev: 'warn', kind: 'Lines', id: o.id, msg: `${nm}: ${x.thin.length} line${x.thin.length > 1 ? 's print' : ' prints'} thinner than ${min.line} pt (thinnest ${Math.min(...x.thin).toFixed(2)} pt) and may disappear in print.` });
        for (const [a, b] of x.overlaps.slice(0, 3)) r.issues.push({ sev: 'warn', kind: 'Layout', id: o.id, msg: `${nm}: labels ${q(a)} and ${q(b)} overlap.` });
      });
      return r;
    };
  }

  // ---------- Deposit bundle: the code, the shared code, the data and the versions ----------
  if (typeof buildDepositBundle === 'function') {
    const prevBundle = buildDepositBundle;
    globalThis.buildDepositBundle = async (...a) => {
      const r = await prevBundle(...a);
      const st = plotStyle(), kept = state.doc.plotData || {};
      for (const lg of ['python', 'r']) if (prelude(lg).trim()) r.zip.file(`code/shared.${lg === 'r' ? 'R' : 'py'}`, prelude(lg) + '\n');
      const pending = [];
      allPlots().forEach((o, i) => {
        const ext = o.plot.lang === 'r' ? 'R' : 'py', file = `code/plot-${i + 1}${o.name ? '-' + o.name.replace(/[^\w-]+/g, '_').slice(0, 30) : ''}.${ext}`;
        const k = o.plot.k || 1, W = ((o.plot.w * k) / PX_IN).toFixed(3), H = ((o.plot.h * k) / PX_IN).toFixed(3), shared = prelude(o.plot.lang).trim();
        const header = o.plot.lang === 'r'
          ? `# SciCanvas code plot. Prints ${W} x ${H} in; text ${st.fontSize} pt, ticks ${st.tickSize} pt, ${st.family}.\n# Run from this folder: read(name) loads files from ../data.\nlibrary(ggplot2)\nPALETTE <- c(${st.palette.map((c) => `"${c}"`).join(', ')})\nWIDTH <- ${W}; HEIGHT <- ${H}; FONT_SIZE <- ${st.fontSize}; TICK_SIZE <- ${st.tickSize}; LABEL_SIZE <- ${st.labelSize}; TITLE_SIZE <- ${st.titleSize}; LEGEND_SIZE <- ${st.legendSize}\nread <- function(name, ...) { p <- file.path("..", "data", name); if (grepl("\\\\.(tsv|txt)$", p)) read.delim(p, check.names = FALSE, ...) else read.csv(p, check.names = FALSE, ...) }\n${shared ? 'source("shared.R")\n' : ''}\n`
          : `# SciCanvas code plot. Prints ${W} x ${H} in; text ${st.fontSize} pt, ticks ${st.tickSize} pt, ${st.family}.\n# Run from this folder: read(name) loads files from ../data.\nimport os\nimport matplotlib.pyplot as plt\nimport numpy as np\ntry:\n    import pandas as pd\nexcept ImportError:\n    pd = None\ntry:\n    import seaborn as sns\nexcept ImportError:\n    sns = None\nPALETTE = ${JSON.stringify(st.palette)}\nWIDTH, HEIGHT, FONT_SIZE, TICK_SIZE, LABEL_SIZE, TITLE_SIZE, LEGEND_SIZE = ${W}, ${H}, ${st.fontSize}, ${st.tickSize}, ${st.labelSize}, ${st.titleSize}, ${st.legendSize}\nplt.rcParams.update({"font.size": FONT_SIZE, "xtick.labelsize": TICK_SIZE, "ytick.labelsize": TICK_SIZE, "axes.labelsize": LABEL_SIZE, "axes.titlesize": TITLE_SIZE, "legend.fontsize": LEGEND_SIZE, "svg.fonttype": "none", "figure.figsize": (WIDTH, HEIGHT)})\ndef read(name, **kw):\n    p = os.path.join("..", "data", name)\n    return pd.read_csv(p, sep="\\t" if p.endswith((".tsv", ".txt")) else ",", **kw) if pd is not None else np.genfromtxt(p, delimiter=",", names=True, dtype=None, encoding="utf-8")\n${shared ? 'exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shared.py"), encoding="utf-8").read())\n' : ''}\n`;
        r.zip.file(file, header + o.plot.code + '\n');
        const files = [];
        for (const f of o.plot.files || []) {
          const inZip = `data/${f.name}`; files.push(inZip);
          if (!r.zip.file(inZip)) pending.push({ inZip, f });
        }
        r.provenance.code = (r.provenance.code || []).concat({ file, sharedCode: shared ? `code/shared.${ext}` : null, object: o.name || o.id, language: o.plot.lang, versions: o.plot.versions, interpreter: o.plot.interpreter, ranAt: o.plot.ranAt ? new Date(o.plot.ranAt).toISOString() : null, printedSizeIn: [+W, +H], dataFiles: (o.plot.files || []).map((f) => ({ name: f.name, originalPath: f.path, sha1WhenRun: f.sha1 || null })), bundledData: files });
      });
      for (const { inZip, f } of pending) {
        if (r.zip.file(inZip)) continue;
        try { const full = await nat().dataFile(f.path); if (!full.missing) { r.zip.file(inZip, full.base64, { base64: true }); continue; } } catch { /* use the figure's copy */ }
        if (f.sha1 && kept[f.sha1]) r.zip.file(inZip, kept[f.sha1].base64, { base64: true });
      }
      r.zip.file('provenance.json', JSON.stringify(r.provenance, null, 2));
      return r;
    };
  }

  // ---------- Scripting ----------
  // For scripts driving SciCanvas (DevTools, automation): wait for SciCanvas.ready (startup restores the last
  // session or opens a file, which replaces the document), then place plots and SVGs without touching internals.
  //   await SciCanvas.ready
  //   const o = await SciCanvas.renderPlot({ lang: 'python', code, wMM: 80, hMM: 60, x: 40, y: 40, files: ['/path/data.csv'] })
  //   SciCanvas.addSvg(svgText, { x, y, wMM })          // ids and url(#…) references made unique, styles inlined
  //   SciCanvas.plotStyle({ fontSize: 7, tickSize: 6 })  // read or update the figure's plot style
  const toSpec = (opts, k) => ({
    lang: opts.lang === 'r' ? 'r' : 'python', code: String(opts.code || ''), textEdits: opts.textEdits || {},
    files: (opts.files || []).map((f) => (typeof f === 'string' ? { name: f.split(/[\\/]/).pop(), path: f } : { ...f })),
    w: opts.w || ((opts.wMM || 80) * MM) / k, h: opts.h || ((opts.hMM || 60) * MM) / k, ...(opts.margins ? { margins: opts.margins } : {}),
  });
  async function renderPlot(opts = {}) {
    await (globalThis.SciCanvas && globalThis.SciCanvas.ready);
    if (opts.pageIndex != null) state.pageIndex = Math.max(0, Math.min(state.doc.pages.length - 1, opts.pageIndex));
    if (opts.prelude != null) state.doc.plotPrelude = { ...(state.doc.plotPrelude || {}), [opts.lang === 'r' ? 'r' : 'python']: String(opts.prelude) };
    const k = printScale(), spec = toSpec(opts, k);
    const r = await runSpec(spec, k);
    if (!r.svg) throw new Error(r.error || 'The code made no plot');
    checkpoint('codeplot');
    const o = place(r.svg, spec, opts.replace || null, r);
    if (opts.x != null) o.x = opts.x;
    if (opts.y != null) o.y = opts.y;
    if (opts.name) o.name = opts.name;
    render({ props: true }); markDirty();
    return o;
  }
  function addSvg(svgText, opts = {}) {
    const key = addSvgAsset(opts.name || 'SVG', inlineSvgliteDefaults(String(svgText)));
    const a = getAsset(key), ar = a.vw / a.vh, k = printScale();
    const w = opts.w || (opts.wMM ? (opts.wMM * MM) / k : opts.h ? opts.h * ar : opts.hMM ? ((opts.hMM * MM) / k) * ar : a.vw * (96 / 72));
    const h = opts.h || (opts.hMM ? (opts.hMM * MM) / k : w / ar);
    const c = viewCenter();
    const o = { id: uid(), type: 'icon', iconId: key, x: opts.x ?? c.x - w / 2, y: opts.y ?? c.y - h / 2, w, h, rot: 0, name: opts.name || 'SVG' };
    checkpoint('svg');
    page().objects.push(o); state.sel = [o.id];
    render({ props: true }); markDirty();
    return o;
  }
  function stylePlots(set) {
    if (set && typeof set === 'object') { state.doc.plotStyle = { ...(state.doc.plotStyle || {}), ...set }; markDirty(); }
    return plotStyle();
  }
  globalThis.SciCanvas = Object.assign(globalThis.SciCanvas || {}, { renderPlot, addSvg, plotStyle: stylePlots, lineUpPlotAxes: lineUpAxes, refreshPlots, inspectPlot });

  Object.assign(globalThis, { openPlotDialog, plotStyle, applyPlotTextEdits: applyTextEdits, rerunPlot: rerun, refreshPlots, inspectPlot, printScale, PLOT_TEMPLATES: TEMPLATES });
})();
