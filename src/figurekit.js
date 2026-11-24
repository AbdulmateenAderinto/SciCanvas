// Figure kit (v2.2): three ways to assemble multi-panel figures faster.
//
// 1. Automatic panel letters. A panel letter is a text with `panelLetter: { target, tx, ty, last, custom }`. It
//    belongs to a panel (target), follows it when the panel moves, and is re-lettered in reading order (rows top to
//    bottom, then left to right) whenever panels move, are added or are deleted. One style per figure
//    (state.doc.panelLabels: format A / a / (A) / (a) / A. / a. / A) / a) / 1 / i, size, bold, font, colour) applies to
//    every letter. Type a different text into a letter (A′, say) and it keeps it and drops out of the sequence.
//    Arrange › Panel Letters › Letter Selected Panels adds them; Panel Letter Style… sets the style, turns automatic
//    re-lettering off or on, and can adopt letters already on the page.
// 2. Plot grid with one shared legend. Arrange › Arrange as Plot Grid… lays the selected plots (and any other
//    objects) out in equal cells, re-runs code plots at their cell size, lines up their axes, letters the panels and,
//    for Python plots, takes the legends out of the plots and draws each distinct entry once, at the right or bottom,
//    as ordinary editable shapes and text. Right-click › Separate legends again puts them back.
// 3. Dark version for talks. View › Dark Version of Page adds a copy of the page with a black background: black and
//    grey text, lines and fills turn light (and white fills dark) while colours stay as they are; plots and charts
//    are recoloured the same way, and keep being when they re-run. Run it again to bring the dark copy up to date
//    with the original page (edits made only on the dark copy are replaced).
(() => {
  // ---------- Colour helpers ----------
  const NAMED = { black: '#000000', white: '#ffffff' };
  function parseColour(c) {
    if (typeof c !== 'string') return null;
    const s = c.trim().toLowerCase();
    if (NAMED[s]) return { rgb: NAMED[s].slice(1).match(/../g).map((h) => parseInt(h, 16)), a: '' };
    let m = /^#([0-9a-f]{3})$/.exec(s);
    if (m) return { rgb: m[1].split('').map((h) => parseInt(h + h, 16)), a: '' };
    m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
    if (m) return { rgb: m[1].match(/../g).map((h) => parseInt(h, 16)), a: m[2] || '' };
    m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
    if (m) return { rgb: [+m[1], +m[2], +m[3]].map((v) => Math.max(0, Math.min(255, Math.round(v)))), a: m[4] != null ? Math.round(Math.max(0, Math.min(1, +m[4])) * 255).toString(16).padStart(2, '0') : '' };
    return null;
  }
  const hex2 = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  // Neutral colours (black, greys, white, and near-neutrals) swap lightness; real colours stay as they are.
  function darkColour(c) {
    const p = parseColour(c);
    if (!p) return c;
    const [r, g, b] = p.rgb.map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn > 0.12) return c;
    const l = (mx + mn) / 2, nl = 1 - l, d = nl - l;
    return '#' + [r, g, b].map((v) => hex2((v + d) * 255)).join('') + p.a;
  }
  // Recolour an SVG string: colours in fill / stroke / stop-color / color attributes and style properties.
  const SVG_COLOUR = /((?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*(?:=\s*["']|:\s*))(#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|black\b|white\b)/g;
  const darkSvg = (s) => String(s).replace(SVG_COLOUR, (_, pre, c) => pre + darkColour(c));

  // ---------- 1. Automatic panel letters ----------
  const DEFAULT_STYLE = { auto: true, format: 'A', fontSize: 22, bold: true, family: 'sans', color: '#111111' };
  const FORMATS = [['A', 'A, B, C'], ['a', 'a, b, c'], ['(A)', '(A), (B)'], ['(a)', '(a), (b)'], ['A.', 'A., B.'], ['a.', 'a., b.'], ['A)', 'A), B)'], ['a)', 'a), b)'], ['1', '1, 2, 3'], ['i', 'i, ii, iii']];
  function labelStyle() {
    const d = state.doc.panelLabels;
    return { ...DEFAULT_STYLE, ...(d && typeof d === 'object' ? d : {}) };
  }
  const letters = (i) => { let s = ''; i += 1; while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
  function roman(n) {
    const t = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
    let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
  }
  function formatLabel(i, format = 'A') {
    if (format === '1') return String(i + 1);
    if (format === 'i') return roman(i + 1);
    const up = /A/.test(format), L = up ? letters(i) : letters(i).toLowerCase();
    return format.replace(/[Aa]/, L);
  }
  const isLetter = (o) => o && o.type === 'text' && o.panelLetter && typeof o.panelLetter === 'object';
  // Reading order: rows top to bottom (items whose tops differ by less than half the smaller height share a row),
  // then left to right.
  function readingOrder(items) {
    const sorted = [...items].sort((a, b) => a.b.y - b.b.y || a.b.x - b.b.x), rows = [];
    for (const it of sorted) {
      const row = rows.find((r) => Math.abs(it.b.y - r.y) < 0.5 * Math.min(it.b.h, r.h) + 1);
      if (row) row.items.push(it); else rows.push({ y: it.b.y, h: it.b.h, items: [it] });
    }
    return rows.sort((a, b) => a.y - b.y).flatMap((r) => r.items.sort((a, b) => a.b.x - b.b.x));
  }
  // Letters follow their panels: when a panel moves on its own, its letter moves by the same amount.
  function followPanels(list) {
    const sel = new Set(state.sel || []);
    for (const o of list) {
      if (!isLetter(o) || !o.panelLetter.target) continue;
      const t = list.find((x) => x.id === o.panelLetter.target);
      if (!t) continue;
      const B = bounds(t), pl = o.panelLetter;
      const movedTogether = sel.has(o.id) && sel.has(t.id);
      if (pl.tx != null && !movedTogether && (Math.abs(B.x - pl.tx) > 1e-6 || Math.abs(B.y - pl.ty) > 1e-6)) { o.x += B.x - pl.tx; o.y += B.y - pl.ty; }
      pl.tx = B.x; pl.ty = B.y;
    }
  }
  // Give every automatic letter on the page its letter in reading order (of their panels, or of the letters
  // themselves when they have none). Returns true if any text changed.
  function reletter(p = page(), { force = false } = {}) {
    const st = labelStyle();
    if (!st.auto && !force) return false;
    const list = p.objects;
    const items = [];
    for (const o of list) {
      if (!isLetter(o) || o.hidden) continue;
      const pl = o.panelLetter;
      if (force) pl.custom = false;
      else if (pl.last != null && String(o.text).trim() !== pl.last) pl.custom = true; // typed over: keep it
      if (pl.custom) continue;
      const t = pl.target && list.find((x) => x.id === pl.target && !x.hidden);
      items.push({ o, b: bounds(t || o) });
    }
    let changed = false;
    readingOrder(items).forEach(({ o }, i) => {
      const s = formatLabel(i, st.format);
      if (o.text !== s) { o.text = s; postEdit(o); changed = true; }
      o.panelLetter.last = s;
    });
    return changed;
  }
  const _renderSceneFK = renderScene;
  renderScene = function () {
    try { const list = objs(); followPanels(list); reletter(); } catch (e) { console.warn(e); }
    return _renderSceneFK();
  };
  const _renderSceneOnlyFK = renderSceneOnly;
  renderSceneOnly = function (ids, moveOnly) {
    const extra = new Set(ids);
    for (const o of objs()) if (isLetter(o) && ids.has(o.panelLetter.target)) extra.add(o.id);
    return _renderSceneOnlyFK(extra, moveOnly);
  };

  const letterProps = (st) => ({ fontSize: st.fontSize, bold: !!st.bold, family: st.family, color: st.color });
  // A letter for a panel, at its top-left corner, just above it (or inside it at the top of the page).
  function makeLetter(t, st = labelStyle()) {
    const B = bounds(t);
    const o = Make.text('A', 0, 0, { ...letterProps(st), name: 'Panel letter', panelLetter: { target: t.id, tx: B.x, ty: B.y } });
    o.x = B.x - 4;
    o.y = B.y - o.h - 2 < 0 ? B.y + 2 : B.y - o.h - 2;
    return o;
  }
  const panelCandidates = (list) => list.filter((o) => o.type !== 'connector' && !isLetter(o) && !o.sharedLegend);
  function letterPanels(list = panelCandidates(selected())) {
    if (!list.length) { toast('Select the panels (plots, pictures, groups…) to letter'); return []; }
    checkpoint();
    if (!state.doc.panelLabels) state.doc.panelLabels = { ...DEFAULT_STYLE };
    const have = new Set(objs().filter(isLetter).map((o) => o.panelLetter.target));
    const made = list.filter((t) => !have.has(t.id)).map((t) => makeLetter(t));
    objs().push(...made);
    reletter(page(), { force: false });
    render({ props: true });
    markDirty();
    toast(made.length ? `Lettered ${made.length} panel${made.length > 1 ? 's' : ''}. Letters follow their panels and re-letter when panels move` : 'Those panels already have letters');
    return made;
  }
  // Lone letters already on the page (A, (b), C.) become automatic letters of the nearest panel below / right.
  function adoptLetters(p = page()) {
    const lone = /^\s*\(?([A-Za-z]|[ivx]{1,4}|\d{1,2})[).]?\s*$/;
    const texts = p.objects.filter((o) => o.type === 'text' && !isLetter(o) && !o.hidden && lone.test(stripMarkup(o.text || '')) && (o.bold || (o.fontSize || 16) >= 18));
    const panels = panelCandidates(p.objects).filter((o) => o.type !== 'text');
    for (const o of texts) {
      const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
      let best = null, bd = 160;
      for (const t of panels) { const B = bounds(t), d = Math.hypot(B.x - c.x, B.y - c.y); if (d < bd && c.x < B.x + B.w * 0.5 && c.y < B.y + B.h * 0.5) { bd = d; best = t; } }
      const B = best && bounds(best);
      o.panelLetter = best ? { target: best.id, tx: B.x, ty: B.y } : {};
      o.name = o.name || 'Panel letter';
    }
    return texts.length;
  }
  function applyStyleToLetters(st) {
    for (const p of state.doc.pages) for (const o of p.objects) if (isLetter(o)) { Object.assign(o, letterProps(st)); postEdit(o); }
  }
  function openLetterStyle() {
    const st = labelStyle();
    const auto = el('input', { type: 'checkbox', checked: st.auto });
    const fmt = el('select', {}, ...FORMATS.map(([v, l]) => el('option', { value: v, textContent: l, selected: v === st.format })));
    const size = el('input', { type: 'number', min: 6, max: 120, step: 1, value: st.fontSize, style: 'width:70px' });
    const bold = el('input', { type: 'checkbox', checked: !!st.bold });
    const colour = el('input', { type: 'color', value: toHex(st.color) });
    const printed = el('span', { class: 'note', style: 'margin-left:6px' });
    const k = typeof printScale === 'function' ? printScale() : 1;
    const showPt = () => { printed.textContent = state.doc.journal && state.doc.journal.widthMM ? `≈ ${(size.value * k * 0.75).toFixed(1)} pt printed` : ''; };
    size.oninput = showPt; showPt();
    const nOnPage = objs().filter(isLetter).length;
    openModal('Panel letters', el('div', { style: 'max-width:440px' },
      el('div', { class: 'note', style: 'margin-bottom:8px' }, 'One style for every panel letter in this figure. Automatic letters follow their panels and are re-lettered in reading order (rows top to bottom, then left to right) when panels move. Type another text into a letter (A′, say) to keep it as it is.'),
      field_('', el('label', { style: 'width:auto;color:inherit' }, auto, ' Re-letter automatically')),
      field_('Numbering', fmt), field_('Size', el('span', { style: 'display:flex;align-items:center' }, size, printed)),
      field_('', el('label', { style: 'width:auto;color:inherit' }, bold, ' Bold')), field_('Colour', colour),
      el('div', { class: 'note', style: 'margin-top:6px' }, nOnPage ? `${nOnPage} automatic letter${nOnPage > 1 ? 's' : ''} on this page.` : 'No automatic letters on this page yet: select panels › Arrange › Panel Letters › Letter Selected Panels, or adopt the letters already here.'),
      el('div', { class: 'actions' },
        btn('Adopt letters on this page', () => { checkpoint(); const n = adoptLetters(); reletter(page(), { force: true }); render({ props: true }); markDirty(); toast(n ? `${n} letter${n > 1 ? 's' : ''} now automatic` : 'No lone panel letters found on this page'); }),
        btn('Cancel', closeModal),
        btn('Apply', () => {
          checkpoint();
          state.doc.panelLabels = { auto: auto.checked, format: fmt.value, fontSize: Math.max(4, +size.value || DEFAULT_STYLE.fontSize), bold: bold.checked, family: st.family, color: colour.value };
          applyStyleToLetters(state.doc.panelLabels);
          for (const p of state.doc.pages) reletter(p, { force: true });
          closeModal(); render({ props: true }); markDirty();
        }, 'primary'))));
  }

  // ---------- 2. Plot grid with one shared legend ----------
  const isPlot = (o) => o && o.type === 'icon' && o.plot;
  const ptToPage = (pt, o) => (pt / 0.75) / (typeof printScale === 'function' ? printScale(o) : 1);
  // Equal cells in reading order; each row leaves room above it for the panel letters.
  function gridCells(n, cols, area, aspect, gap, letterRoom = 0) {
    const rows = Math.ceil(n / cols), cw = (area.w - gap * (cols - 1)) / cols;
    const ch = Math.min(cw * aspect, (area.h - (rows - 1) * (gap + letterRoom)) / rows);
    return Array.from({ length: n }, (_, i) => ({ x: area.x + (i % cols) * (cw + gap), y: area.y + Math.floor(i / cols) * (ch + gap + letterRoom), w: cw, h: ch }));
  }
  // The distinct entries of the plots' legends, in order of first appearance.
  function legendEntries(plots) {
    const seen = new Set(), out = [];
    for (const o of plots) for (const e of (o.plot && o.plot.legend) || []) if (e && e.label && !seen.has(e.label)) { seen.add(e.label); out.push(e); }
    return out;
  }
  const edgeOf = (e, col) => (e.edge && e.edge !== col && !/^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(e.edge) ? e.edge : 'none');
  // The shared legend: ordinary shapes and text in a group, so it can be edited and exports natively.
  function buildLegend(entries, plots, pos, box) {
    if (!entries.length) return null;
    const st = typeof plotStyle === 'function' ? plotStyle() : { legendSize: 6, family: 'Arial' };
    const fs = ptToPage(st.legendSize || 6, plots[0]), sw = fs * 1.6, gap = fs * 0.5, rowH = fs * 1.5;
    const parts = [], items = [];
    for (const e of entries) {
      const t = Make.text(e.label, 0, 0, { fontSize: fs, color: '#222222', family: st.family || 'sans' });
      items.push({ e, t, w: sw + gap + t.w });
    }
    const place = (it, x, y) => {
      const { e, t } = it, cy = y + rowH / 2, col = e.color || '#444444';
      if (e.kind === 'line') { // a thin bar (three short ones when dashed), so the group exports as native shapes
        const lw = Math.max(0.75, fs * 0.12), segs = e.dash ? [[0, 0.28], [0.36, 0.64], [0.72, 1]] : [[0, 1]];
        for (const [a, b] of segs) parts.push(Make.rect(x + a * sw, cy - lw / 2, (b - a) * sw, lw, { fill: col, stroke: 'none', strokeWidth: 0, radius: 0 }));
      }
      if (e.kind === 'patch') parts.push(Make.rect(x + sw * 0.15, cy - fs * 0.4, sw * 0.7, fs * 0.8, { fill: col, stroke: edgeOf(e, col), strokeWidth: edgeOf(e, col) === 'none' ? 0 : 0.75, radius: 0 }));
      if (e.kind === 'marker' || (e.kind === 'line' && e.marker)) { const r = fs * 0.32; parts.push(Make.ellipse(x + sw / 2 - r, cy - r, 2 * r, 2 * r, { fill: col, stroke: 'none', strokeWidth: 0 })); }
      t.x = x + sw + gap; t.y = cy - t.h / 2;
      parts.push(t);
    };
    if (pos === 'bottom') {
      const total = items.reduce((s, it) => s + it.w, 0) + fs * 1.5 * (items.length - 1);
      let x = box.x + Math.max(0, (box.w - total) / 2);
      for (const it of items) { place(it, x, box.y); x += it.w + fs * 1.5; }
    } else {
      items.forEach((it, i) => place(it, box.x, box.y + i * rowH));
    }
    const g = makeGroup(parts, 'Shared legend');
    g.sharedLegend = { plots: plots.map((o) => o.id), pos };
    return g;
  }
  function removeLegendsFor(ids, list = objs()) {
    const set = new Set(ids);
    const keep = list.filter((o) => !(o.sharedLegend && (o.sharedLegend.plots || []).some((id) => set.has(id))));
    if (keep.length !== list.length) page().objects = keep;
  }
  async function rerunList(list) {
    const ok = [];
    for (const o of list) if (typeof rerunPlot === 'function' && await rerunPlot(o, { quiet: true })) ok.push(o);
    return ok;
  }
  // Lay the selection out as a grid: { cols, gap, letters, lineUp, shared, pos } (gap and sizes in page units).
  async function arrangePlotGrid(list, opt = {}) {
    const P = page(), margin = 30;
    const items = readingOrder(list.map((o) => ({ o, b: bounds(o) }))).map((x) => x.o);
    const n = items.length, cols = Math.max(1, Math.min(n, +opt.cols || (n <= 2 ? n : n <= 4 ? 2 : 3)));
    const gap = Number.isFinite(+opt.gap) ? +opt.gap : 24;
    const plots = items.filter(isPlot), py = plots.filter((o) => o.plot.lang !== 'r');
    const shared = !!opt.shared && py.length > 0;
    const pos = opt.pos === 'bottom' ? 'bottom' : 'right';
    const letterRoom = opt.letters ? Math.round(labelStyle().fontSize * 1.3) : 0;
    const legendRoom = shared ? (pos === 'right' ? Math.min(220, P.width * 0.2) : 50) : 0;
    const area = { x: margin + (opt.letters ? 6 : 0), y: margin + letterRoom, w: P.width - 2 * margin - (opt.letters ? 6 : 0) - (pos === 'right' ? legendRoom : 0), h: P.height - 2 * margin - letterRoom - (pos === 'bottom' ? legendRoom : 0) };
    const aspects = items.map((o) => o.h / o.w).sort((a, b) => a - b), aspect = aspects[Math.floor(aspects.length / 2)] || 0.75;
    const cells = gridCells(n, cols, area, aspect, gap, letterRoom);
    checkpoint();
    items.forEach((o, i) => {
      const c = cells[i];
      if (isPlot(o)) { o.x = c.x; o.y = c.y; o.w = c.w; o.h = c.h; o.rot = 0; return; }
      const k = Math.min(c.w / o.w, c.h / o.h);
      if (o.type === 'text') { if (k < 1) { o.fontSize *= k; postEdit(o); } } else { o.w *= k; o.h *= k; if (o.type === 'protocol') postEdit(o); }
      o.x = c.x + (c.w - o.w) / 2; o.y = c.y + (c.h - o.h) / 2; o.rot = 0;
    });
    removeLegendsFor(plots.map((o) => o.id));
    for (const o of py) { if (shared) o.plot.hideLegend = true; else delete o.plot.hideLegend; }
    if (opt.letters) {
      const have = new Set(objs().filter(isLetter).map((o) => o.panelLetter.target));
      const st = labelStyle();
      const made = items.filter((t) => !have.has(t.id)).map((t) => makeLetter(t, st));
      objs().push(...made);
      // Letters sit just above their cells, all at the same offset.
      for (const L of objs().filter(isLetter)) { const t = items.find((x) => x.id === L.panelLetter.target); if (t) { const B = bounds(t); L.x = B.x - 4; L.y = Math.max(2, B.y - L.h - 2); L.panelLetter.tx = B.x; L.panelLetter.ty = B.y; } }
    }
    render({ props: true });
    let ran = plots.length ? await rerunList(plots) : [];
    if (opt.lineUp && ran.length >= 2 && globalThis.SciCanvas && SciCanvas.lineUpPlotAxes) await SciCanvas.lineUpPlotAxes(ran);
    let legend = null;
    if (shared) {
      const entries = legendEntries(py);
      const gb = unionBounds(items);
      const box = pos === 'right' ? { x: gb.x + gb.w + gap, y: gb.y, w: legendRoom - gap, h: gb.h } : { x: gb.x, y: gb.y + gb.h + gap * 0.5, w: gb.w, h: legendRoom };
      legend = buildLegend(entries, py, pos, box);
      if (legend) { if (pos === 'right') legend.y = gb.y + Math.max(0, (gb.h - legend.h) / 2); objs().push(legend); }
    }
    state.sel = items.map((o) => o.id);
    render({ props: true });
    markDirty();
    const notRun = plots.length - ran.length;
    toast(`Arranged ${n} panel${n > 1 ? 's' : ''} in a ${Math.ceil(n / cols)} × ${cols} grid${legend ? ' with one shared legend' : shared ? ' (the plots drew no legends to share)' : ''}${notRun ? `. ${notRun} plot${notRun > 1 ? 's' : ''} could not re-run: open and Run ${notRun > 1 ? 'them' : 'it'}` : ''}`, 4500);
    return { items, legend };
  }
  function openPlotGrid() {
    const list = selected().filter((o) => o.type !== 'connector' && !isLetter(o) && !o.sharedLegend);
    if (list.length < 2) { toast('Select two or more plots (or pictures, charts…) to arrange as a grid'); return; }
    const n = list.length, plots = list.filter(isPlot), py = plots.filter((o) => o.plot.lang !== 'r');
    const cols = el('input', { type: 'number', min: 1, max: n, value: n <= 2 ? n : n <= 4 ? 2 : 3, style: 'width:60px' });
    const gap = el('input', { type: 'number', min: 0, max: 200, value: 24, style: 'width:60px' });
    const letters = el('input', { type: 'checkbox', checked: true });
    const lineUp = el('input', { type: 'checkbox', checked: plots.length >= 2, disabled: plots.length < 2 });
    const shared = el('input', { type: 'checkbox', checked: py.length >= 2, disabled: !py.length });
    const pos = el('select', {}, el('option', { value: 'right', textContent: 'at the right' }), el('option', { value: 'bottom', textContent: 'at the bottom' }));
    openModal('Arrange as plot grid', el('div', { style: 'max-width:460px' },
      el('div', { class: 'note', style: 'margin-bottom:8px' }, `${n} panels in reading order, in equal cells across the page. Code plots re-run at their cell size, so their text keeps its size.`),
      field_('Columns', cols), field_('Gap', el('span', {}, gap, ' px')),
      field_('', el('label', { style: 'width:auto;color:inherit' }, letters, ' Letter the panels (A, B, C…)')),
      field_('', el('label', { style: 'width:auto;color:inherit' }, lineUp, ' Line up plot axes')),
      field_('', el('label', { style: 'width:auto;color:inherit' }, shared, ' One shared legend ', pos)),
      py.length < plots.length ? el('div', { class: 'note' }, 'R plots keep their own legends; the shared legend collects Python (matplotlib / seaborn) legends.') : null,
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Arrange', () => {
        closeModal();
        arrangePlotGrid(list, { cols: +cols.value, gap: +gap.value, letters: letters.checked, lineUp: lineUp.checked, shared: shared.checked, pos: pos.value });
      }, 'primary'))));
  }
  async function separateLegends(list = selected().filter((o) => isPlot(o) || o.sharedLegend)) {
    const ids = new Set();
    for (const o of list) { if (o.sharedLegend) (o.sharedLegend.plots || []).forEach((id) => ids.add(id)); else ids.add(o.id); }
    const plots = objs().filter((o) => isPlot(o) && ids.has(o.id) && o.plot.hideLegend);
    if (!plots.length) { toast('Select plots that share a legend, or the shared legend'); return; }
    checkpoint();
    for (const o of plots) delete o.plot.hideLegend;
    removeLegendsFor([...ids]);
    render({ props: true });
    await rerunList(plots);
    render({ props: true }); markDirty();
    toast('Each plot draws its own legend again');
  }

  // ---------- 3. Dark version for talks ----------
  const FIELD_TYPES = new Set(['text', 'rect', 'ellipse', 'shape', 'path', 'connector', 'brush', 'table', 'quad']);
  const INK_TYPES = new Set(['chart', 'protocol']);
  const COLOUR_KEY = /colou?r|fill|stroke|background|^bg$/i;
  const SKIP_KEYS = new Set(['id', 'plot', 'cfg', 'children', 'src', 'nodes', 'pts', 'points', 'panelLetter', 'leader', 'sharedLegend']);
  function darkFields(v, keyMatches) {
    if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? (keyMatches ? darkColour(x) : x) : darkFields(x, keyMatches)));
    if (!v || typeof v !== 'object') return v;
    for (const [k, x] of Object.entries(v)) {
      if (SKIP_KEYS.has(k)) continue;
      const m = COLOUR_KEY.test(k);
      if (typeof x === 'string') { if (m) v[k] = darkColour(x); } else if (x && typeof x === 'object') v[k] = darkFields(x, m);
    }
    return v;
  }
  function darkObject(o) {
    if (o.type === 'group') { (o.children || []).forEach(darkObject); return o; }
    if (FIELD_TYPES.has(o.type)) {
      darkFields(o, false);
      if (o.type === 'text' && !o.color) o.color = darkColour('#222222');
      if (o.label && !o.labelColor) o.labelColor = darkColour('#222222');
      return o;
    }
    if (INK_TYPES.has(o.type) || isPlot(o)) o.darkInk = true;
    return o; // pictures and illustrations keep their colours
  }
  // A copy of a page with new ids (connectors, leaders and letters re-pointed at the copies).
  function copyObjects(list) {
    const map = {};
    const ids = (o) => { map[o.id] = uid(); (o.children || []).forEach(ids); };
    list.forEach(ids);
    const fix = (v) => {
      if (Array.isArray(v)) return v.map(fix);
      if (!v || typeof v !== 'object') return v;
      for (const [k, x] of Object.entries(v)) {
        if ((k === 'id' || k === 'target') && typeof x === 'string' && map[x]) v[k] = map[x];
        else if (k === 'plots' && Array.isArray(x)) v[k] = x.map((id) => map[id] || id);
        else if (x && typeof x === 'object') fix(x);
      }
      return v;
    };
    return fix(deep(list));
  }
  function darkPage(p) {
    const d = deep({ ...p, objects: [] });
    d.id = uid(); d.name = `${p.name || 'Page'} (dark)`; d.darkOf = p.id;
    d.background = darkColour(p.background || '#ffffff');
    d.objects = copyObjects(p.objects).map(darkObject);
    return d;
  }
  function darkVersion() {
    const cur = page(), pages = state.doc.pages;
    const src = cur.darkOf ? pages.find((x) => x.id === cur.darkOf) : cur;
    if (!src) { toast('The page this dark copy was made from is gone'); return; }
    checkpoint();
    const old = pages.findIndex((x) => x.darkOf === src.id);
    const d = darkPage(src);
    if (old >= 0) { d.id = pages[old].id; d.name = pages[old].name; pages[old] = d; } else pages.splice(pages.indexOf(src) + 1, 0, d);
    gotoPage(pages.indexOf(d));
    render({ props: true, pages: true }); markDirty();
    toast(old >= 0 ? 'Dark version brought up to date with the original page' : 'Added a dark version of the page for slides. Run it again after changing the original to update it', 4500);
  }
  // Plots and charts on a dark page are recoloured as they are drawn, so they stay dark when they re-run.
  const _renderPartsFK = renderParts;
  renderParts = function (o, objects, forExport) {
    const r = _renderPartsFK(o, objects, forExport);
    if (!o.darkInk || !r || typeof r.inner !== 'string') return r;
    return { ...r, inner: `<g fill="#ffffff" color="#ffffff">${darkSvg(r.inner)}</g>` };
  };

  // ---------- Commands and menus ----------
  Object.assign(ARRANGE_COMMANDS, {
    letterPanels: () => letterPanels(),
    panelLetterStyle: openLetterStyle,
    plotGrid: openPlotGrid,
    separateLegends: () => separateLegends(),
    darkVersion,
  });
  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu(), sel = selected();
    const panels = panelCandidates(sel);
    if (panels.length >= 2) t.push({ label: 'Arrange as plot grid…', cmd: 'plotGrid' });
    if (panels.length && panels.some((o) => !objs().some((L) => isLetter(L) && L.panelLetter.target === o.id))) t.push({ label: 'Letter selected panels', cmd: 'letterPanels' });
    if (sel.some((o) => o.sharedLegend || (isPlot(o) && o.plot.hideLegend))) t.push({ label: 'Separate legends again', cmd: 'separateLegends' });
    return t;
  };

  Object.assign(globalThis, {
    darkColour, darkSvg, formatLabel, readingOrder, reletter, letterPanels, adoptLetters, labelStyle, followPanels,
    arrangePlotGrid, legendEntries, buildLegend, separateLegends, darkPage, darkVersion, copyObjects,
  });
})();
