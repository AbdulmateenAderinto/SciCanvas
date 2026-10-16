// Code plots (v1.10). Insert › Code Plot: write matplotlib (Python) or ggplot2 / base-R code, run it with the
// user's own Python or R (plotrunner.js keeps one worker per language running, so a re-run takes milliseconds to a
// second), and place the result as a vector plot that remembers its code, data files and size:
//   - one plot style for the whole figure (font, text size, palette: PALETTE in the code, and the default colours),
//     so every panel matches;
//   - plots render at the size they occupy, so their text is the real printed size; resizing one re-runs it at the
//     new size instead of stretching the text;
//   - label edits (Properties › Plot labels) and colour edits are re-applied on every re-run;
//   - plots re-run when their data files change; the Check tab flags failed runs, missing or changed data and
//     text below the journal's minimum size; the deposit bundle carries the code, data and versions.
// Ungroup into Editable Parts turns a plot into ordinary shapes and text (it then no longer re-runs).
// Code that arrived inside a figure file is never run until the user runs it here (it can do anything a program can).
(() => {
  const nat = () => window.native || {};
  const PX_IN = 96, MM = 96 / 25.4;
  const OKABE_ITO = ['#0072b2', '#e69f00', '#009e73', '#d55e00', '#cc79a7', '#56b4e9', '#f0e442', '#000000'];
  const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no storage */ } };
  const prefs = () => store('scicanvas:plotInterpreters', {});
  // Code run on this computer (by hash), so plots can re-run on their own; other code waits for an explicit Run.
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; };
  const isApproved = (code) => store('scicanvas:plotCodeRun', []).includes(hash(code));
  const approve = (code) => { const l = store('scicanvas:plotCodeRun', []).filter((x) => x !== hash(code)); l.push(hash(code)); keep('scicanvas:plotCodeRun', l.slice(-500)); };

  // ---------- The figure's plot style ----------
  function plotStyle() {
    const s = state.doc.plotStyle || {};
    const pal = s.palette && s.palette.length ? s.palette : (typeof docPalette === 'function' && docPalette().length >= 3 ? docPalette() : OKABE_ITO);
    return { family: s.family || 'Arial', fontSize: s.fontSize || 7, palette: pal.filter((c) => /^#[0-9a-f]{6}$/i.test(c)) };
  }

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

  // ---------- Running and placing ----------
  const filesMap = (spec) => Object.fromEntries((spec.files || []).map((f) => [f.name, f.path]));
  async function runSpec(spec) {
    if (!nat().plotRun) throw new Error('Code plots need the SciCanvas desktop app.');
    const st = plotStyle();
    const r = await nat().plotRun({ lang: spec.lang, code: spec.code, data: filesMap(spec), width: spec.w / PX_IN, height: spec.h / PX_IN, fontSize: st.fontSize, family: st.family, palette: st.palette, interpreter: prefs()[spec.lang] });
    approve(spec.code);
    return r;
  }
  // Label edits: text in the plot whose content matches an edited label is replaced (every run).
  function applyTextEdits(svgText, edits) {
    if (!edits || !Object.keys(edits).length) return svgText;
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    for (const t of doc.querySelectorAll('text')) { const k = t.textContent.trim(); if (Object.prototype.hasOwnProperty.call(edits, k)) t.textContent = edits[k]; }
    return new XMLSerializer().serializeToString(doc);
  }
  // The plot's own labels, before any edits.
  const plotTexts = (o) => { const a = getAsset(o.iconId); if (!a) return []; const d = new DOMParser().parseFromString(a.raw || `<svg xmlns="http://www.w3.org/2000/svg">${a.svg}</svg>`, 'image/svg+xml'); return [...new Set([...d.querySelectorAll('text')].map((t) => t.textContent.trim()).filter(Boolean))]; };
  async function fingerprint(files) {
    for (const f of files || []) { try { const i = await nat().dataFile(f.path, { stat: true }); if (!i.missing) { f.sha1 = i.sha1; f.mtime = i.mtime; } } catch { /* unreadable */ } }
  }
  function dropAssetIfUnused(key) {
    if (!key || !state.doc.assets || !state.doc.assets[key]) return;
    let used = false;
    const walk = (l) => { for (const x of l || []) { if (x.type === 'group') walk(x.children); else if (x.iconId === key) used = true; } };
    for (const p of state.doc.pages) walk(p.objects);
    if (!used) delete state.doc.assets[key];
  }
  // Put a run's SVG on the page: a new plot object, or the existing one updated in place.
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
    const key = addSvgAsset(`${spec.lang === 'r' ? 'R' : 'Python'} plot`, inlineSvgliteDefaults(applyTextEdits(svgText, spec.textEdits)));
    Object.assign(state.doc.assets[key], { pack: 'codeplot', raw: svgText });
    return key;
  }
  function place(svgText, spec, existing, result) {
    const key = plotAsset(svgText, spec);
    const meta = { ...spec, error: null, ranAt: Date.now(), versions: result.info || null, interpreter: result.interpreter || null };
    if (existing) {
      const old = existing.iconId;
      existing.iconId = key; existing.w = spec.w; existing.h = spec.h; existing.plot = meta;
      dropAssetIfUnused(old);
      return existing;
    }
    const c = viewCenter(), o = { id: uid(), type: 'icon', iconId: key, x: c.x - spec.w / 2, y: c.y - spec.h / 2, w: spec.w, h: spec.h, rot: 0, name: `${spec.lang === 'r' ? 'R' : 'Python'} plot`, plot: meta };
    page().objects.push(o);
    state.sel = [o.id];
    return o;
  }
  // Re-run one plot object (on data change, resize, style change or request). Returns true if it was redrawn.
  async function rerun(o, { quiet = false, force = false } = {}) {
    if (!o.plot) return false;
    if (!force && !isApproved(o.plot.code)) { if (!quiet) toast('This plot’s code came with the figure: open it (double-click) and press Run to run it on this computer.', 5000); return false; }
    const spec = { ...o.plot, w: o.w, h: o.h };
    let r;
    try { r = await runSpec(spec); } catch (e) { o.plot.error = e.message; if (!quiet) toast(e.message, 6000); return false; }
    if (!r.svg) { o.plot.error = r.error || 'No plot'; renderProps(); if (!quiet) toast('The plot’s code failed: ' + String(r.error).split('\n').pop(), 6000); return false; }
    await fingerprint(spec.files);
    place(r.svg, spec, o, r);
    return true;
  }

  // ---------- The plot window ----------
  function openPlotDialog(existing) {
    const st = plotStyle();
    const spec = existing && existing.plot
      ? { ...deep(existing.plot), w: existing.w, h: existing.h }
      : { lang: store('scicanvas:plotLang', 'python'), code: '', files: [], w: 80 * MM, h: 60 * MM, textEdits: {} };
    if (!spec.code) spec.code = TEMPLATES[spec.lang][0][1];
    let trusted = !existing || isApproved(spec.code), last = null, timer = null, busy = false, again = false;
    const styleBefore = JSON.stringify(plotStyle());

    const mono = 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45';
    const code = el('textarea', { value: spec.code, style: `${mono};width:100%;height:340px;resize:vertical;tab-size:4;white-space:pre;padding:8px;box-sizing:border-box` });
    const lang = el('select', {}, el('option', { value: 'python', textContent: 'Python (matplotlib)', selected: spec.lang === 'python' }), el('option', { value: 'r', textContent: 'R (ggplot2 / base)', selected: spec.lang === 'r' }));
    const tmpl = el('select', {});
    const fillTemplates = () => { tmpl.innerHTML = ''; tmpl.append(el('option', { value: '', textContent: 'Start from an example…' }), ...TEMPLATES[spec.lang].map(([n], i) => el('option', { value: i, textContent: n }))); };
    const filesBox = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center' });
    const pick = el('input', { type: 'file', multiple: true, accept: '.csv,.tsv,.txt,.xlsx,.xls,.json', style: 'display:none' });
    const num = (v, min, max, step) => el('input', { type: 'number', value: v, min, max, step, style: 'width:70px' });
    const wIn = num(+(spec.w / MM).toFixed(1), 10, 400, 1), hIn = num(+(spec.h / MM).toFixed(1), 10, 400, 1);
    code.setAttribute('spellcheck', 'false'); code.setAttribute('autocorrect', 'off'); code.setAttribute('autocapitalize', 'off');
    const fsIn = num(st.fontSize, 4, 14, 0.5), famIn = el('input', { value: st.family, style: 'width:110px' });
    // Palette for every plot: hex colours, or empty for the figure's palette (Okabe–Ito if it has fewer than 3).
    const swatches = el('span', { style: 'display:inline-flex;gap:2px;vertical-align:middle' });
    const drawSwatches = () => { swatches.innerHTML = ''; plotStyle().palette.slice(0, 10).forEach((c) => swatches.append(el('span', { title: c, style: `width:12px;height:12px;border-radius:2px;background:${c};display:inline-block` }))); };
    const palIn = el('input', { value: ((state.doc.plotStyle || {}).palette || []).join(', '), placeholder: 'figure palette / Okabe–Ito', title: 'Hex colours for every plot, comma-separated. Empty: the figure’s palette, or the colour-blind-safe Okabe–Ito set.', style: 'width:200px' });
    palIn.addEventListener('change', () => {
      const list = palIn.value.split(/[\s,;]+/).filter(Boolean).map((c) => (c.startsWith('#') ? c : '#' + c).toLowerCase()).filter((c) => /^#[0-9a-f]{6}$/.test(c));
      state.doc.plotStyle = { ...(state.doc.plotStyle || {}), palette: list }; palIn.value = list.join(', ');
      drawSwatches(); markDirty(); schedule();
    });
    drawSwatches();
    const preview = el('div', { class: 'preview', style: 'min-height:300px;position:relative' });
    const status = el('div', { class: 'note', style: 'min-height:18px' });
    const out = el('pre', { style: `${mono};max-height:120px;overflow:auto;margin:6px 0 0;white-space:pre-wrap;color:var(--muted)` });
    const env = el('div', { class: 'note', style: 'margin-top:6px' });
    const runBtn = btn('Run ⌘↵', () => run(true), 'primary');
    const doneBtn = btn(existing ? 'Update plot' : 'Insert plot', () => finish(), 'primary');

    const drawFiles = () => {
      filesBox.innerHTML = '';
      for (const f of spec.files) filesBox.append(el('span', { class: 'chip', title: f.path, style: 'display:inline-flex;gap:4px;align-items:center;padding:2px 8px;border:1px solid var(--border);border-radius:10px' }, `read("${f.name}")`, el('button', { textContent: '×', title: 'Remove', style: 'border:0;background:none;cursor:pointer', onclick: () => { spec.files = spec.files.filter((x) => x !== f); drawFiles(); schedule(); } })));
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
        const url = URL.createObjectURL(new Blob([inlineSvgliteDefaults(applyTextEdits(r.svg, spec.textEdits))], { type: 'image/svg+xml' }));
        preview.append(el('img', { src: url, style: 'max-width:100%;max-height:420px', onload: () => URL.revokeObjectURL(url) }));
      } else preview.append(el('pre', { textContent: r.error || 'No plot', style: `${mono};color:#c0392b;white-space:pre-wrap;padding:10px;margin:0;align-self:flex-start` }));
      out.textContent = r.log || '';
      status.textContent = r.svg ? `Rendered in ${r.ms} ms · ${(spec.w / MM).toFixed(0)} × ${(spec.h / MM).toFixed(0)} mm, text ${plotStyle().fontSize} pt` : 'The code failed (see the message on the right).';
      doneBtn.disabled = !r.svg;
    };
    async function run(explicit) {
      if (!trusted && !explicit) return;
      if (busy) { again = true; return; }
      busy = true; trusted = true;
      spec.code = code.value; spec.lang = lang.value; spec.w = +wIn.value * MM; spec.h = +hIn.value * MM;
      status.textContent = 'Running…';
      try { show(await runSpec(spec)); } catch (e) { show({ error: e.message }); }
      busy = false;
      if (again) { again = false; run(false); }
    }
    const schedule = () => { clearTimeout(timer); if (trusted) timer = setTimeout(() => run(false), 450); };
    async function finish() {
      if (!last || !last.svg) return;
      checkpoint('codeplot');
      spec.code = code.value; spec.lang = lang.value;
      await fingerprint(spec.files);
      const placed = place(last.svg, spec, existing, last);
      keep('scicanvas:plotLang', spec.lang);
      closeModal(); render({ props: true }); markDirty();
      // The figure's plot style changed: bring the other plots in line.
      if (JSON.stringify(plotStyle()) !== styleBefore) rerunMany(allPlots().filter((o) => o !== placed && isApproved(o.plot.code)), 'Plot style changed');
    }
    const saveStyle = () => { state.doc.plotStyle = { ...(state.doc.plotStyle || {}), fontSize: +fsIn.value || 7, family: famIn.value.trim() || 'Arial' }; markDirty(); schedule(); };

    code.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(true); }
      else if (e.key === 'Tab') { e.preventDefault(); const s = code.selectionStart; code.setRangeText(spec.lang === 'r' ? '  ' : '    ', s, code.selectionEnd, 'end'); }
    });
    code.addEventListener('input', schedule);
    lang.onchange = () => { spec.lang = lang.value; fillTemplates(); if (TEMPLATES[lang.value === 'r' ? 'python' : 'r'].some(([, c]) => c === code.value) || !code.value.trim()) code.value = TEMPLATES[spec.lang][0][1]; checkEnv(); schedule(); };
    tmpl.onchange = () => { if (tmpl.value === '') return; code.value = TEMPLATES[spec.lang][+tmpl.value][1]; tmpl.value = ''; trusted = true; schedule(); };
    [wIn, hIn].forEach((i) => i.addEventListener('input', schedule));
    [fsIn, famIn].forEach((i) => i.addEventListener('change', saveStyle));

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

    fillTemplates(); drawFiles();
    const body = el('div', {},
      el('div', { style: 'display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:14px' },
        el('div', {},
          el('div', { style: 'display:flex;gap:8px;margin-bottom:6px' }, lang, tmpl),
          code,
          el('div', { style: 'margin-top:6px' }, el('div', { class: 'note', textContent: 'Data files (re-run when they change):' }), filesBox, pick),
          env),
        el('div', {},
          preview, status,
          el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px' },
            el('label', {}, 'Width ', wIn, ' mm'), el('label', {}, 'Height ', hIn, ' mm')),
          el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:6px' },
            el('span', { class: 'note', textContent: 'Figure plot style (all plots):' }), el('label', {}, fsIn, ' pt'), famIn,
            el('label', {}, 'Colours ', palIn), swatches),
          out)),
      el('div', { class: 'note', style: 'margin-top:8px', textContent: 'Code runs with your own Python / R. Available: PALETTE, WIDTH, HEIGHT (in), FONT_SIZE (pt), read("file"), data. Python also has plt, np, pd, sns; R loads ggplot2.' }),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), runBtn, doneBtn));
    openModal(existing ? 'Edit code plot' : 'Code plot', body);
    doneBtn.disabled = true;
    checkEnv();
    if (trusted) run(false);
    else preview.append(el('div', { class: 'note', style: 'padding:16px;text-align:center', textContent: 'This plot’s code came with the figure and hasn’t been run on this computer. Read it, then press Run.' }));
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
  ARRANGE_COMMANDS.codePlot = () => { const s = selected(); openPlotDialog(s.length === 1 && s[0].plot ? s[0] : null); };
  ARRANGE_COMMANDS.rerunPlots = () => rerunMany(allPlots().filter((o) => isApproved(o.plot.code)), 'Figure plot style');

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
    // Colour presets tint every colour of an icon, which would flatten a plot's palette: hide them for plots.
    // (and the icon Tint, which does the same)
    for (const h of document.querySelectorAll('#props .sect > h3')) if (/^colour presets$|^colour$/i.test(h.textContent.trim())) h.parentElement.remove();
    const o = sel[0], p = o.plot, sized = Math.abs(o.w - p.w) > 0.5 || Math.abs(o.h - p.h) > 0.5;
    const labels = plotTexts(o).filter((t) => !/^[-−+]?[\d.,]+%?$/.test(t)).slice(0, 40);
    const edits = { ...(p.textEdits || {}) };
    const rows = labels.map((orig) => row(orig.length > 22 ? orig.slice(0, 21) + '…' : orig, el('input', { value: edits[orig] ?? orig, title: orig, onchange: (e) => {
      const v = e.target.value, a = getAsset(o.iconId);
      if (v === orig) delete edits[orig]; else edits[orig] = v;
      checkpoint('plotlabel'); p.textEdits = edits;
      if (a && a.raw) { const old = o.iconId; o.iconId = plotAsset(a.raw, p); dropAssetIfUnused(old); }
      render({ props: true }); markDirty();
    } })));
    const mine = [sect(`Code plot (${p.lang === 'r' ? 'R' : 'Python'})`,
      el('div', { class: 'note', textContent: `${(p.files || []).length ? `Data: ${p.files.map((f) => f.name).join(', ')} · ` : ''}${p.ranAt ? `run ${new Date(p.ranAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}${sized ? ' · resized: re-run to lay it out at this size' : ''}` }),
      p.error ? el('div', { class: 'note', style: 'color:#c0392b', textContent: 'Last run failed: ' + String(p.error).split('\n').pop() }) : '',
      el('div', { class: 'btnrow' }, btn('Edit code…', () => openPlotDialog(o)), btn('Re-run', async () => { checkpoint('codeplot'); if (await rerun(o, { force: true })) { render({ props: true }); markDirty(); } }), btn('Ungroup into parts', () => ungroupIcons([o])))),
    labels.length ? sect('Plot labels (kept when the plot re-runs)', ...rows) : ''].filter(Boolean);
    // near the top, after Position & size, rather than below every icon setting
    const pos = [...document.querySelectorAll('#props .sect > h3')].find((h) => /position/i.test(h.textContent));
    if (pos) pos.parentElement.after(...mine); else $('#props').append(...mine);
  };

  // Resizing a plot lays it out again at the new size (text keeps its size) instead of stretching it.
  let resizeTimer;
  window.addEventListener('pointerup', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      const list = selected().filter((o) => o.plot && isApproved(o.plot.code) && (Math.abs(o.w - o.plot.w) > 0.5 || Math.abs(o.h - o.plot.h) > 0.5));
      if (list.length) await rerunMany(list, 'Resized');
    }, 120);
  });

  // Data changed (window regains focus, figure opened, Insert › Refresh Linked Data): re-run plots that read it.
  async function refreshPlots({ quiet = true } = {}) {
    if (!nat().dataFile) return 0;
    const changed = [];
    for (const o of allPlots()) {
      for (const f of o.plot.files || []) {
        let i; try { i = await nat().dataFile(f.path, { stat: true }); } catch { continue; }
        f.missing = !!i.missing;
        if (!i.missing && f.sha1 && i.sha1 !== f.sha1) { f.changed = true; if (!changed.includes(o)) changed.push(o); }
      }
    }
    const ok = changed.filter((o) => isApproved(o.plot.code));
    const n = await rerunMany(ok, 'Data changed');
    if (!quiet && !changed.length) toast('Code plots are up to date');
    return n;
  }
  window.addEventListener('focus', () => setTimeout(() => refreshPlots(), 500));
  const prevLoad = loadDoc;
  loadDoc = function (...a) { const r = prevLoad.apply(this, a); setTimeout(() => refreshPlots(), 150); return r; };
  const prevRefresh = ARRANGE_COMMANDS.refreshData;
  ARRANGE_COMMANDS.refreshData = async () => { if (prevRefresh) await prevRefresh(); await refreshPlots({ quiet: false }); };

  // ---------- Check tab ----------
  function smallestPt(o) {
    const a = getAsset(o.iconId); if (!a || !a.vw) return null;
    const sizes = [...a.svg.matchAll(/font-size(?:\s*:\s*|=["'])([\d.]+)(px|pt)?/g)].map((m) => +m[1]).concat([...a.svg.matchAll(/font:\s*(?:[a-z]+\s+)*([\d.]+)px/g)].map((m) => +m[1])).filter((v) => v > 0);
    if (!sizes.length) return null;
    const jd = state.doc.journal, pg = page(), k = jd && jd.widthMM ? (jd.widthMM * MM) / pg.width : 1;
    return Math.min(...sizes) * (o.w / a.vw) * 0.75 * k; // svg units → page px → pt, at the printed width
  }
  if (typeof checkFigure === 'function') {
    const prevCheck = checkFigure;
    checkFigure = async function (p = page()) {
      const r = await prevCheck(p);
      const walk = (l, f) => { for (const o of l || []) { if (o.type === 'group') walk(o.children, f); else f(o); } };
      const minPt = (state.doc.journal && typeof JOURNALS !== 'undefined' && (JOURNALS.find((j) => j.id === state.doc.journal.id) || {}).minPt) || 6;
      walk(p.objects, (o) => {
        if (!o.plot) return;
        const nm = o.name || 'A code plot';
        if (o.plot.error) r.issues.push({ sev: 'error', kind: 'Data', id: o.id, msg: `${nm}: its code failed on the last run (${String(o.plot.error).split('\n').pop().slice(0, 120)}).` });
        for (const f of o.plot.files || []) {
          if (f.missing) r.issues.push({ sev: 'warn', kind: 'Data', id: o.id, msg: `${nm}: data file not found: ${f.path}. It shows the data as last read.` });
          else if (f.changed && !isApproved(o.plot.code)) r.issues.push({ sev: 'warn', kind: 'Data', id: o.id, msg: `${nm}: ${f.name} has changed since the plot was drawn. Open the plot and Run it to update.` });
        }
        const pt = smallestPt(o);
        if (pt && pt < minPt - 0.05) r.issues.push({ sev: 'warn', kind: 'Text', id: o.id, msg: `${nm}: its smallest text prints at ${pt.toFixed(1)} pt, below the ${minPt} pt minimum. Raise the plot text size (Figure plot style) or make the plot larger.` });
        if (Math.abs(o.w - o.plot.w) > 0.5 || Math.abs(o.h - o.plot.h) > 0.5) r.issues.push({ sev: 'warn', kind: 'Text', id: o.id, msg: `${nm} is stretched from the size it was drawn at, so its text and lines are distorted.`, fix: async () => { await rerun(o, { force: false }); }, fixLabel: 'Re-run at this size' });
      });
      return r;
    };
  }

  // ---------- Deposit bundle: the code, the data and the versions ----------
  if (typeof buildDepositBundle === 'function') {
    const prevBundle = buildDepositBundle;
    globalThis.buildDepositBundle = async (...a) => {
      const r = await prevBundle(...a);
      const st = plotStyle();
      allPlots().forEach((o, i) => {
        const ext = o.plot.lang === 'r' ? 'R' : 'py', file = `code/plot-${i + 1}${o.name ? '-' + o.name.replace(/[^\w-]+/g, '_').slice(0, 30) : ''}.${ext}`;
        const header = o.plot.lang === 'r'
          ? `# SciCanvas code plot. Size ${(o.plot.w / PX_IN).toFixed(2)} x ${(o.plot.h / PX_IN).toFixed(2)} in, text ${st.fontSize} pt ${st.family}.\n# read(name) loads files from ../data; PALETTE = c(${st.palette.map((c) => `"${c}"`).join(', ')})\nlibrary(ggplot2)\nPALETTE <- c(${st.palette.map((c) => `"${c}"`).join(', ')})\nread <- function(name, ...) { p <- file.path("..", "data", name); if (grepl("\\\\.(tsv|txt)$", p)) read.delim(p, check.names = FALSE, ...) else read.csv(p, check.names = FALSE, ...) }\n\n`
          : `# SciCanvas code plot. Size ${(o.plot.w / PX_IN).toFixed(2)} x ${(o.plot.h / PX_IN).toFixed(2)} in, text ${st.fontSize} pt ${st.family}.\nimport os\nimport matplotlib.pyplot as plt\nimport numpy as np\ntry:\n    import pandas as pd\nexcept ImportError:\n    pd = None\nPALETTE = ${JSON.stringify(st.palette)}\nplt.rcParams.update({"font.size": ${st.fontSize}, "svg.fonttype": "none", "figure.figsize": (${(o.plot.w / PX_IN).toFixed(3)}, ${(o.plot.h / PX_IN).toFixed(3)})})\ndef read(name, **kw):\n    p = os.path.join("..", "data", name)\n    return pd.read_csv(p, sep="\\t" if p.endswith((".tsv", ".txt")) else ",", **kw) if pd is not None else np.genfromtxt(p, delimiter=",", names=True, dtype=None, encoding="utf-8")\n\n`;
        r.zip.file(file, header + o.plot.code + '\n');
        const files = [];
        for (const f of o.plot.files || []) {
          const inZip = `data/${f.name}`; files.push(inZip);
          if (!r.zip.file(inZip) && f.path && nat().dataFile) r.pendingData = (r.pendingData || []).concat({ inZip, path: f.path });
        }
        r.provenance.code = (r.provenance.code || []).concat({ file, object: o.name || o.id, language: o.plot.lang, versions: o.plot.versions, interpreter: o.plot.interpreter, ranAt: o.plot.ranAt ? new Date(o.plot.ranAt).toISOString() : null, dataFiles: (o.plot.files || []).map((f) => ({ name: f.name, originalPath: f.path, sha1WhenRun: f.sha1 || null })), bundledData: files });
      });
      for (const d of r.pendingData || []) { try { const full = await nat().dataFile(d.path); r.zip.file(d.inZip, full.base64, { base64: true }); } catch { /* missing: listed in provenance */ } }
      delete r.pendingData;
      r.zip.file('provenance.json', JSON.stringify(r.provenance, null, 2));
      return r;
    };
  }

  Object.assign(globalThis, { openPlotDialog, plotStyle, applyPlotTextEdits: applyTextEdits, rerunPlot: rerun, refreshPlots, PLOT_TEMPLATES: TEMPLATES });
})();
