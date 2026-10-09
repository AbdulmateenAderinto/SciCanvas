// Eraser, eyedropper, palettes & brand kit, colour-vision previews, select matching, symbol picker,
// tables, brush path editing, and "suggested" icons.

// ---------- Eraser (non-destructive mask on any object) ----------
function eraserTarget(e, p) {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (sel.length === 1) return sel[0];
  const hit = hitObject(e.target);
  return hit && hit.type !== 'connector' ? hit : null;
}
function toLocalUnit(o, p) {
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, q = rotPt(p, c, -(o.rot || 0));
  let u = (q.x - o.x) / o.w, v = (q.y - o.y) / o.h;
  if (o.flipX) u = 1 - u;
  if (o.flipY) v = 1 - v;
  return [u, v];
}
function eraserDown(e, p) {
  const o = eraserTarget(e, p);
  if (!o) { toast('Select (or start on) the object you want to erase'); return null; }
  if (o.type === 'group') { toast('Erasing works on single objects — double-click the group to edit inside it'); return null; }
  checkpoint();
  if (!o.erase) o.erase = [];
  const stroke = { pts: [toLocalUnit(o, p)], r: (DRAW_DEFAULTS.eraserSize || 18) / Math.max(o.w, o.h) };
  o.erase.push(stroke);
  state.sel = [o.id];
  renderScene();
  return { mode: 'erase', o, stroke };
}
function eraserMove(e, p, d) {
  d.stroke.pts.push(toLocalUnit(d.o, p));
  renderScene();
  const z = state.zoom, r = (DRAW_DEFAULTS.eraserSize || 18) / 2;
  renderOverlay(`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="rgba(214,69,69,.12)" stroke="#d64545" stroke-width="${1 / z}"/>`);
}
function eraserUp() { render({ props: true }); return true; }

// ---------- Eyedropper ----------
async function pickScreenColour() {
  if (!window.EyeDropper) { toast('Eyedropper is not available on this system'); return null; }
  try { return (await new EyeDropper().open()).sRGBHex; } catch { return null; } // cancelled
}

// ---------- Palettes & brand kit ----------
const getBrand = () => lsGet('scicanvas:brand', { palette: [], font: '', logo: '' });
const setBrand = (b) => lsSet('scicanvas:brand', b);
function docPalette() { if (!state.doc.palette) state.doc.palette = []; return state.doc.palette; }
function paletteRow(list, key) {
  const brand = getBrand().palette, mine = docPalette();
  const sw = (c, title, removable, from) => {
    const b = el('button', { class: 'swatch', style: `background:${c}`, title: title + (removable ? ' — right-click to remove' : ''), onclick: () => setProps(list, key, c, { rebuild: true }) });
    if (removable) b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); checkpoint(); from.splice(from.indexOf(c), 1); renderProps(); });
    return b;
  };
  return el('div', { class: 'swatches' },
    ...brand.map((c) => sw(c, 'Brand colour ' + c, false)),
    ...(brand.length ? [el('span', { class: 'swsep' })] : []),
    ...mine.map((c) => sw(c, 'Figure palette ' + c, true, mine)),
    el('button', { class: 'swatch addsw', title: 'Add the current colour to this figure’s palette', textContent: '+', onclick: () => { const c = list[0][key]; if (/^#[0-9a-f]{6}$/i.test(c || '') && !mine.includes(c)) { checkpoint(); mine.push(c); renderProps(); } } }));
}
function brandKitSection() {
  const b = getBrand();
  const wrap = el('div');
  const draw = () => {
    wrap.innerHTML = '';
    const pal = el('div', { class: 'swatches', style: 'margin-left:0' },
      ...b.palette.map((c, i) => el('input', { type: 'color', value: c, title: 'Right-click to remove', oninput: (e) => { b.palette[i] = e.target.value; setBrand(b); }, oncontextmenu: (e) => { e.preventDefault(); b.palette.splice(i, 1); setBrand(b); draw(); } })),
      el('button', { textContent: '+ Colour', onclick: () => { b.palette.push('#4a7fd6'); setBrand(b); draw(); } }));
    const font = el('select', { onchange: (e) => { b.font = e.target.value; setBrand(b); } }, el('option', { value: '', textContent: 'No default' }), ...FONT_NAMES.map(([v, l]) => el('option', { value: v, textContent: l, selected: v === b.font })));
    const logoIn = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/svg+xml', style: 'display:none', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; b.logo = await readAsDataUrl(f); setBrand(b); draw(); } });
    wrap.append(
      el('h3', { class: 'dlg-sub', textContent: 'Brand kit (lab / institution)' }),
      el('div', { class: 'row' }, el('label', { textContent: 'Colours' }), pal),
      el('div', { class: 'row' }, el('label', { textContent: 'Font' }), font, btn('Apply to all text', () => applyBrandFont())),
      el('div', { class: 'row' }, el('label', { textContent: 'Logo' }), b.logo ? el('img', { src: b.logo, style: 'max-height:36px;max-width:120px' }) : el('span', { class: 'note', textContent: 'None' }), logoIn, btn(b.logo ? 'Replace' : 'Upload…', () => logoIn.click()), b.logo ? btn('Insert logo', () => { closeModal(); insertBrandLogo(); }) : null),
      el('div', { class: 'note', style: 'margin-left:84px' }, 'Brand colours appear first in every colour row. Share the kit by exporting it from Settings on another machine with the same values.'));
  };
  draw();
  return wrap;
}
function applyBrandFont() {
  const f = getBrand().font;
  if (!f) { toast('Choose a brand font first'); return; }
  checkpoint();
  const walk = (o) => { if (o.type === 'text' || o.type === 'table') { o.family = f; postEdit(o); } if (o.children) o.children.forEach(walk); };
  state.doc.pages.forEach((p) => p.objects.forEach(walk));
  render({ props: true });
  toast('Brand font applied to all text');
}
async function insertBrandLogo() {
  const b = getBrand();
  if (!b.logo) { toast('Add a logo in Settings › Brand kit'); openSettingsDialog(); return; }
  const P = page();
  await importDataUrl('Logo', b.logo, { x: P.width - 120, y: 70 });
}

// ---------- Colour-vision & grayscale previews ----------
const VISION = { normal: 'Normal colour', gray: 'Grayscale', deut: 'Deuteranopia (red–green, most common)', prot: 'Protanopia (red–green)', trit: 'Tritanopia (blue–yellow)' };
function setVision(mode) {
  state.view.vision = mode;
  const scene = $('#scene');
  scene.style.filter = mode === 'gray' ? 'grayscale(1)' : mode && mode !== 'normal' ? `url(#cvd-${mode})` : '';
  const chip = $('#visionChip');
  chip.classList.toggle('hidden', !mode || mode === 'normal');
  chip.innerHTML = '';
  if (mode && mode !== 'normal') chip.append(el('span', { textContent: `Preview: ${VISION[mode]}` }), btn('✕', () => setVision('normal')));
}

// ---------- Select matching ----------
function selectMatching(kind) {
  const ref = selected()[0];
  if (!ref) { toast('Select an object first'); return; }
  const colourOf = (o) => (o.type === 'icon' ? o.tint || o.color : o.type === 'text' ? o.color : o.type === 'connector' || o.type === 'path' ? o.stroke || o.color : o.fill);
  const match = {
    icon: (o) => o.type === 'icon' && o.iconId === ref.iconId,
    type: (o) => o.type === ref.type && (o.type !== 'shape' || o.kind === ref.kind),
    colour: (o) => colourOf(o) && colourOf(o) === colourOf(ref),
  }[kind];
  state.sel = objs().filter((o) => !o.locked && !o.hidden && match(o)).map((o) => o.id);
  render({ props: true });
  toast(`${state.sel.length} matching object${state.sel.length === 1 ? '' : 's'} selected`);
}

// ---------- Symbol picker ----------
const SYMBOLS = [
  ['Greek', 'α β γ δ ε ζ η θ κ λ μ ν ξ π ρ σ τ φ χ ψ ω Γ Δ Θ Λ Σ Φ Ψ Ω'],
  ['Maths', '± × ÷ ≈ ≠ ≤ ≥ ∝ ∞ √ ∑ ∫ ∂ ∆ ∇ ° ′ ″ ‰ ‱'],
  ['Arrows', '→ ← ↑ ↓ ↔ ⇌ ⇄ ⇒ ⇐ ⇔ ↗ ↘ ⊣ ⟶ ⟵'],
  ['Science', 'µ Å ℃ ℉ ♀ ♂ ⊕ ⊖ • · ⁺ ⁻ ₊ ₋ ⁰ ¹ ² ³ ⁴ ₀ ₁ ₂ ₃ ₄ † ‡ § ¶ ✓ ✗ ★'],
];
function openSymbolPicker(anchor, o) {
  const pop = $('#pop');
  pop.innerHTML = '';
  pop.append(...SYMBOLS.map(([name, chars]) => el('div', {}, el('div', { class: 'note', textContent: name }),
    el('div', { class: 'symgrid' }, ...chars.split(' ').map((ch) => el('button', { textContent: ch, title: ch, onclick: () => insertSymbol(ch, o) }))))));
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.min(window.innerWidth - 300, r.left) + 'px';
  pop.style.top = r.bottom + 6 + 'px';
  pop.classList.remove('hidden');
  const close = (e) => { if (!pop.contains(e.target) && e.target !== anchor) { pop.classList.add('hidden'); window.removeEventListener('pointerdown', close, true); } };
  setTimeout(() => window.addEventListener('pointerdown', close, true), 0);
}
function insertSymbol(ch, o) {
  const ta = $('#textEditor');
  if (!ta.classList.contains('hidden')) { // editing on canvas: insert at the caret
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + ch + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + ch.length;
    ta.dispatchEvent(new Event('input'));
    ta.focus();
    return;
  }
  if (!o) return;
  checkpoint('sym' + o.id);
  o.text = (o.text || '') + ch;
  postEdit(o); renderScene(); renderOverlay(); renderProps();
}

// ---------- Tables ----------
Make.table = (rows, cols, x, y, extra = {}) => ({
  id: uid(), type: 'table', x, y, w: cols * 110, h: rows * 34, rot: 0, rows, cols,
  cells: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 ? `Header ${c + 1}` : ''))),
  header: true, stripe: true, fontSize: 13, border: '#9aa5b4', borderWidth: 1, headerFill: '#23395d', headerColor: '#ffffff', fill: '#ffffff', align: 'center', ...extra,
});
function resizeTable(o, rows, cols) {
  rows = Math.max(1, Math.min(60, rows | 0)); cols = Math.max(1, Math.min(20, cols | 0));
  checkpoint();
  const rh = o.h / o.rows, cw = o.w / o.cols;
  o.cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (o.cells[r] && o.cells[r][c]) || ''));
  if (o.cellFill) o.cellFill = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (o.cellFill[r] && o.cellFill[r][c]) || null));
  o.h = rh * rows; o.w = cw * cols; o.rows = rows; o.cols = cols; o.colW = null; o.rowH = null;
  render({ props: true });
}
function tableSection(o) {
  const L = [o];
  return sect('Table',
    btn('Edit cells…', () => openTableEditor(o), 'primary'),
    el('div', { class: 'note', style: 'margin:6px 0' }, 'Double-click a cell on the canvas to type in it.'),
    el('div', { class: 'grid2' },
      row('R', el('input', { type: 'number', value: o.rows, min: 1, onchange: (e) => resizeTable(o, +e.target.value, o.cols) })),
      row('C', el('input', { type: 'number', value: o.cols, min: 1, onchange: (e) => resizeTable(o, o.rows, +e.target.value) }))),
    row('', check(L, 'header', 'Header row'), check(L, 'stripe', 'Striped rows')),
    o.header ? row('Header', color(L, 'headerFill'), color(L, 'headerColor')) : null,
    row('Cell fill', color(L, 'fill')),
    o.stripe ? row('Stripe', color(L, 'stripeFill')) : null,
    row('Borders', color(L, 'border'), num(L, 'borderWidth', 0.5, 0)),
    row('Font', select(L, 'family', FONT_NAMES)), row('Size', num(L, 'fontSize', 1, 6)), row('Text', color(L, 'color')),
    row('Align', select(L, 'align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']])));
}
function openTableEditor(o) {
  const draft = { cells: o.cells.map((r) => [...r]), fill: o.cellFill ? o.cellFill.map((r) => [...r]) : Array.from({ length: o.rows }, () => Array(o.cols).fill(null)), colW: o.colW ? [...o.colW] : Array(o.cols).fill(1 / o.cols), rowH: o.rowH && o.rowH.length === o.rows ? [...o.rowH] : Array(o.rows).fill(1 / o.rows) };
  const selCells = new Set();
  let anchor = null;
  const grid = el('div', { class: 'tgrid', style: `grid-template-columns:repeat(${o.cols}, minmax(70px, 1fr))` });
  const drawGrid = () => {
    grid.innerHTML = '';
    for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) {
      const k = `${r},${c}`;
      const inp = el('input', { type: 'text', value: draft.cells[r][c], class: selCells.has(k) ? 'tsel' : '', style: draft.fill[r][c] ? `background:${draft.fill[r][c]}` : (o.header && r === 0 ? 'font-weight:600' : ''), oninput: (e) => { draft.cells[r][c] = e.target.value; } });
      inp.addEventListener('mousedown', (e) => {
        if (e.shiftKey && anchor) {
          const [r0, c0] = anchor;
          selCells.clear();
          for (let i = Math.min(r0, r); i <= Math.max(r0, r); i++) for (let j = Math.min(c0, c); j <= Math.max(c0, c); j++) selCells.add(`${i},${j}`);
          e.preventDefault(); drawGrid();
        } else { anchor = [r, c]; selCells.clear(); selCells.add(k); setTimeout(() => $$('.tgrid input').forEach((x, i) => x.classList.toggle('tsel', selCells.has(`${Math.floor(i / o.cols)},${i % o.cols}`))), 0); }
      });
      grid.append(inp);
    }
  };
  drawGrid();
  const fillIn = el('input', { type: 'color', value: '#fff4c2' });
  const widths = el('div', { class: 'row' }, el('label', { textContent: 'Col widths %' }), ...draft.colW.map((f, i) => el('input', { type: 'number', value: Math.round(f * 100), style: 'width:56px', oninput: (e) => { draft.colW[i] = Math.max(1, +e.target.value) / 100; } })));
  const paste = el('textarea', { rows: 3, placeholder: 'Paste cells copied from Excel / Sheets here (tab-separated), then press “Fill from paste”.', style: 'width:100%' });
  openModal('Edit table', el('div', { style: 'max-width:900px' },
    el('div', { class: 'note', style: 'margin-bottom:8px' }, 'Click a cell, Shift-click to select a range, then colour it. Use ^{…} / _{…} for super- and subscripts.'),
    grid,
    el('div', { class: 'row', style: 'margin-top:10px' }, el('label', { textContent: 'Cell colour' }), fillIn,
      btn('Colour selected', () => { selCells.forEach((k) => { const [r, c] = k.split(',').map(Number); draft.fill[r][c] = fillIn.value; }); drawGrid(); }),
      btn('Clear colour', () => { selCells.forEach((k) => { const [r, c] = k.split(',').map(Number); draft.fill[r][c] = null; }); drawGrid(); })),
    widths,
    el('div', { class: 'row', style: 'flex-wrap:wrap' }, el('label', { textContent: 'Row heights %' }), ...draft.rowH.map((f, i) => el('input', { type: 'number', value: Math.round(f * 100), style: 'width:56px', title: `Row ${i + 1}`, oninput: (e) => { draft.rowH[i] = Math.max(1, +e.target.value) / 100; } }))),
    paste, btn('Fill from paste', () => {
      const rows = paste.value.replace(/\r/g, '').split('\n').filter((l) => l.length).map((l) => l.split('\t'));
      if (!rows.length) return;
      const R = Math.max(o.rows, rows.length), C = Math.max(o.cols, ...rows.map((r) => r.length));
      if (R !== o.rows || C !== o.cols) {
        o.cells = draft.cells; resizeTable(o, R, C);
        rows.forEach((r, i) => r.forEach((v, j) => { o.cells[i][j] = v; }));
        render({ props: true }); closeModal(); openTableEditor(o); return;
      }
      rows.forEach((r, i) => r.forEach((v, j) => { draft.cells[i][j] = v; }));
      drawGrid();
    }),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Apply', () => {
      checkpoint();
      o.cells = draft.cells;
      o.cellFill = draft.fill.some((r) => r.some(Boolean)) ? draft.fill : null;
      const tot = draft.colW.reduce((a, b) => a + b, 0);
      o.colW = draft.colW.map((f) => f / tot);
      const totH = draft.rowH.reduce((a, b) => a + b, 0);
      o.rowH = draft.rowH.every((f) => Math.abs(f - draft.rowH[0]) < 1e-6) ? null : draft.rowH.map((f) => f / totH);
      render({ props: true }); closeModal();
    }, 'primary'))));
}
// Double-click a cell: edit it in place.
function editTableCellAt(o, e) {
  const p = toWorld(e);
  const c0 = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, q = rotPt(p, c0, -(o.rot || 0));
  const lx = q.x - o.x, ly = q.y - o.y;
  const heights = o.rowH && o.rowH.length === o.rows ? o.rowH : Array(o.rows).fill(1 / o.rows);
  let r = 0, accY = heights[0] * o.h;
  while (r < o.rows - 1 && ly > accY) { r++; accY += heights[r] * o.h; }
  const rowTop = accY - heights[r] * o.h;
  const widths = o.colW && o.colW.length === o.cols ? o.colW : Array(o.cols).fill(1 / o.cols);
  let acc = 0, c = 0;
  for (; c < o.cols - 1; c++) { acc += widths[c] * o.w; if (lx < acc) break; }
  const key = `__cell_${r}_${c}`;
  Object.defineProperty(o, key, { configurable: true, enumerable: false, get: () => o.cells[r][c], set: (v) => { o.cells[r][c] = v; } });
  editText(o, key);
  // Re-position the editor over the cell.
  const ta = $('#textEditor'), z = state.zoom, sr = stage.getBoundingClientRect(), svr = svg.getBoundingClientRect();
  const x0 = widths.slice(0, c).reduce((a, b) => a + b, 0) * o.w;
  Object.assign(ta.style, { left: (o.x + x0) * z + state.panX + svr.left - sr.left + 'px', top: (o.y + rowTop) * z + state.panY + svr.top - sr.top + 'px', width: Math.max(60, widths[c] * o.w * z) + 'px', fontSize: (o.fontSize || 13) * z + 'px', textAlign: o.align || 'center' });
}

// ---------- Brush path editing ----------
function editBrushPath(o) {
  if (!o.nodes) {
    checkpoint();
    const pts = o.pts.map(([u, v]) => ({ x: u * o.w, y: v * o.h }));
    const simple = simplify(o.closed ? pts.slice(0, -1) : pts, Math.max(2, Math.max(o.w, o.h) / 80));
    o.nodes = smoothNodes(simple.length >= 2 ? simple : pts, o.closed);
    o.w0 = o.w; o.h0 = o.h;
  }
  enterNodeEdit(o);
}

// ---------- Suggested icons (based on what's in the figure) ----------
function suggestedIcons(limit = 120) {
  const used = new Set(), cats = {};
  const walk = (o) => { if (o.type === 'icon') { used.add(o.iconId); const c = ICON_MAP[o.iconId] ? ICON_MAP[o.iconId].cat : getAsset(o.iconId)?.category; if (c) cats[c] = (cats[c] || 0) + 1; } if (o.children) o.children.forEach(walk); };
  state.doc.pages.forEach((p) => p.objects.forEach(walk));
  for (const k of getRecentIcons().slice(0, 20)) { const it = Packs.byKey?.get(k); if (it) cats[it.category] = (cats[it.category] || 0) + 0.5; }
  const field = new Set(FIELD_CATS[appSettings.field] || []);
  for (const c of field) cats[c] = (cats[c] || 0) + 1;
  const ranked = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const out = [];
  for (const c of ranked) {
    for (const it of [...ICONS.filter((i) => i.cat === c).map((i) => ({ native: true, id: i.id, key: i.id, name: i.name, category: i.cat })), ...Packs.all.filter((i) => i.category === c && i.kb < 600)]) {
      if (!used.has(it.key) && out.length < limit) out.push(it);
    }
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Multi-panel layout (A, B, C… figure panels) ----------
function panelLayout() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (sel.length < 2) { toast('Select two or more graphs / objects to arrange as panels'); return; }
  checkpoint();
  // Reading order: top-to-bottom rows, then left-to-right.
  const items = sel.map((o) => ({ o, b: bounds(o) })).sort((a, b) => (Math.abs(a.b.y - b.b.y) > 40 ? a.b.y - b.b.y : a.b.x - b.b.x));
  const n = items.length, cols = n <= 2 ? n : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
  const P = page(), margin = 30, gap = 34, label = 26;
  const cellW = (P.width - 2 * margin - gap * (cols - 1)) / cols, cellH = (P.height - 2 * margin - gap * (rows - 1)) / rows - label;
  const labels = [];
  items.forEach(({ o }, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const x0 = margin + c * (cellW + gap), y0 = margin + r * (cellH + label + gap) + label;
    const k = Math.min(cellW / o.w, cellH / o.h);
    if (o.type === 'text') { o.fontSize *= k; postEdit(o); } else { o.w *= k; o.h *= k; if (o.type === 'protocol') postEdit(o); }
    o.x = x0 + (cellW - o.w) / 2; o.y = y0 + (cellH - o.h) / 2; o.rot = 0;
    labels.push(Make.text(String.fromCharCode(65 + i), x0 - 4, y0 - label, { fontSize: 22, bold: true, name: `Panel ${String.fromCharCode(65 + i)}` }));
  });
  objs().push(...labels);
  state.sel = [...items.map((x) => x.o.id), ...labels.map((l) => l.id)];
  render({ props: true });
  toast(`Arranged ${n} panels in a ${rows} × ${cols} grid`);
}
ARRANGE_COMMANDS.panelLayout = panelLayout;

// ---------- Colour presets (coordinated fill + border + text) ----------
const COLOUR_PRESETS = [
  ['Blue', '#e8f0fb', '#4a7fd6', '#1d3f78'], ['Teal', '#e3f4ef', '#3fa58b', '#1f5a4b'], ['Orange', '#fdf0e6', '#e8743b', '#7a3512'],
  ['Red', '#fbe9e9', '#d64545', '#7a1f1f'], ['Purple', '#f1ecfa', '#9b7fd1', '#4b3480'], ['Yellow', '#fdf6e0', '#e8b33c', '#6e5310'],
  ['Grey', '#f1f3f5', '#7a8a96', '#2c3740'], ['Dark', '#2c3740', '#2c3740', '#ffffff'], ['Solid blue', '#4a7fd6', '#2f5fae', '#ffffff'], ['Solid teal', '#3fa58b', '#2b7f6a', '#ffffff'],
];
function colourPresets(o) {
  return el('div', { class: 'row' }, el('label', { textContent: 'Preset' }),
    el('span', { style: 'display:flex;gap:3px;flex-wrap:wrap' }, ...COLOUR_PRESETS.map(([name, fill, stroke, text]) => el('button', {
      class: 'swatch', title: name, style: `background:${fill};border:2px solid ${stroke};color:${text};font-size:9px;font-weight:700;width:22px;height:22px;line-height:16px`, textContent: 'A',
      onclick: () => { checkpoint(); Object.assign(o, { fill, stroke, labelColor: text, fill2: null }); render({ props: true }); },
    }))));
}

// ---------- Transform dialog: exact size / rotation, each object about its own centre ----------
function openTransformDialog() {
  const sel = selected().filter((o) => o.type !== 'connector' && !o.locked);
  if (!sel.length) { toast('Select objects to transform'); return; }
  const unit = el('select', {}, el('option', { value: '%', textContent: '% of current' }), el('option', { value: 'px', textContent: 'px' }));
  const w = el('input', { type: 'number', value: 100, style: 'width:80px' }), h = el('input', { type: 'number', value: 100, style: 'width:80px' });
  const rot = el('input', { type: 'number', value: 0, style: 'width:80px' }), rotMode = el('select', {}, el('option', { value: 'add', textContent: 'rotate by' }), el('option', { value: 'set', textContent: 'set to' }));
  const lock = el('input', { type: 'checkbox', checked: true });
  unit.onchange = () => { const one = sel[0]; if (unit.value === 'px') { w.value = Math.round(one.w); h.value = Math.round(one.h); } else { w.value = 100; h.value = 100; } };
  w.oninput = () => { if (!lock.checked) return; h.value = unit.value === '%' ? w.value : Math.round((+w.value * sel[0].h) / sel[0].w); };
  h.oninput = () => { if (!lock.checked) return; w.value = unit.value === '%' ? h.value : Math.round((+h.value * sel[0].w) / sel[0].h); };
  openModal('Transform', el('div', { style: 'max-width:420px' },
    el('div', { class: 'note', style: 'margin-bottom:8px' }, `${sel.length} object${sel.length > 1 ? 's' : ''} — each is transformed about its own centre, so they stay in place.`),
    field_('Units', unit), field_('Width', w), field_('Height', h), field_('', el('label', { style: 'width:auto;color:inherit' }, lock, ' Keep proportions')),
    field_('Rotation', el('span', { style: 'display:flex;gap:6px;align-items:center' }, rotMode, rot, '°')),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Apply', () => {
      checkpoint();
      for (const o of sel) {
        const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const nw = unit.value === '%' ? (o.w * +w.value) / 100 : +w.value, nh = unit.value === '%' ? (o.h * +h.value) / 100 : +h.value;
        if (nw > 0 && nh > 0 && o.type !== 'text') { o.w = nw; o.h = nh; }
        if (o.type === 'text' && unit.value === '%') o.fontSize = Math.max(4, (o.fontSize || 16) * (+w.value / 100));
        o.x = cx - o.w / 2; o.y = cy - o.h / 2;
        if (+rot.value || rotMode.value === 'set') o.rot = (((rotMode.value === 'set' ? 0 : o.rot || 0) + +rot.value) % 360 + 360) % 360;
        if (o.type === 'text') { const m = textMetrics(o); o.w = m.w; o.h = m.h; o.x = cx - o.w / 2; o.y = cy - o.h / 2; }
      }
      closeModal(); render({ props: true });
    }, 'primary'))));
}
// ---------- Crop to shape: the top closed shape becomes a custom crop of the object under it ----------
function localOutline(m) {
  if (m.type === 'ellipse') return `M${m.w / 2} 0 A${m.w / 2} ${m.h / 2} 0 1 1 ${m.w / 2} ${m.h} A${m.w / 2} ${m.h / 2} 0 1 1 ${m.w / 2} 0 Z`;
  if (m.type === 'rect') { const r = Math.min(m.radius || 0, m.w / 2, m.h / 2); return `M${r} 0 H${m.w - r} A${r} ${r} 0 0 1 ${m.w} ${r} V${m.h - r} A${r} ${r} 0 0 1 ${m.w - r} ${m.h} H${r} A${r} ${r} 0 0 1 0 ${m.h - r} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`; }
  if (m.type === 'shape' && !OPEN_SHAPES.has(m.kind)) return shapePath(m.kind, m.w, m.h);
  if (m.type === 'path' && m.closed) return nodesToD(scaledNodes(m), true);
  return null;
}
function cropToShape() {
  const sel = selected();
  if (sel.length !== 2) { toast('Select two objects: the shape to crop with, on top of the object to crop'); return; }
  const list = objs();
  const [lower, mask] = [...sel].sort((a, b) => list.indexOf(a) - list.indexOf(b));
  const d = localOutline(mask);
  if (!d) { toast('The top object must be a closed shape — rectangle, ellipse, shape or closed drawing'); return; }
  if (lower.type === 'connector') { toast('Connectors can’t be cropped'); return; }
  checkpoint();
  // mask-local → world → lower-local (both objects may be rotated about their centres)
  const tf = `rotate(${-(lower.rot || 0)} ${lower.w / 2} ${lower.h / 2}) translate(${mask.x - lower.x} ${mask.y - lower.y}) rotate(${mask.rot || 0} ${mask.w / 2} ${mask.h / 2})`;
  lower.clipPath = { d, tf, w: lower.w, h: lower.h };
  lower.clip = 'none';
  if (mask.stroke && mask.stroke !== 'none' && (mask.strokeWidth ?? 2) > 0) { lower.clipStroke = mask.stroke; lower.clipStrokeWidth = mask.strokeWidth ?? 2; }
  page().objects = list.filter((x) => x !== mask);
  state.sel = [lower.id];
  render({ props: true });
  toast('Cropped to shape — remove it from Effects › Crop shape');
}

// ---------- Apply a brush (membrane, DNA…) along a drawn path ----------
function flattenNodes(ns, closed, steps = 16) {
  const out = [];
  const seg = (a, b) => {
    const c1 = { x: a.ox ?? a.x, y: a.oy ?? a.y }, c2 = { x: b.ix ?? b.x, y: b.iy ?? b.y };
    for (let i = out.length ? 1 : 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t;
      out.push({ x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x, y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y });
    }
  };
  for (let i = 1; i < ns.length; i++) seg(ns[i - 1], ns[i]);
  if (closed && ns.length > 2) seg(ns[ns.length - 1], ns[0]);
  return out;
}
function applyBrushToPath(kind) {
  const o = selected()[0];
  if (!o || o.type !== 'path') { toast('Select a drawn line or curve first'); return; }
  if (!kind) {
    const pick = el('select', {}, ...[['membrane', 'Lipid bilayer'], ['dna', 'DNA helix'], ['actin', 'Actin filament'], ['microtubule', 'Microtubule'], ['epithelium', 'Epithelial layer'], ['cells', 'Row of cells'], ['vessel', 'Blood vessel'], ['vesicles', 'Vesicles']].map(([v, l]) => el('option', { value: v, textContent: l })));
    openModal('Apply brush to path', el('div', { style: 'max-width:380px' }, el('div', { class: 'note', style: 'margin-bottom:8px' }, 'The drawing is replaced by a brush that follows it. You can still edit its points afterwards.'), field_('Brush', pick),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Apply', () => { closeModal(); applyBrushToPath(pick.value); }, 'primary'))));
    return;
  }
  const pts = flattenNodes(scaledNodes(o), o.closed);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(1, Math.max(...xs) - x0), h = Math.max(1, Math.max(...ys) - y0);
  const b = Make.brush(kind, o.x + x0, o.y + y0, w, h, pts.map((p) => [(p.x - x0) / w, (p.y - y0) / h]), { closed: !!o.closed, rot: o.rot || 0 });
  if (o.stroke && o.stroke !== 'none' && o.stroke !== '#222222') b.color = o.stroke;
  checkpoint();
  const list = objs(); list[list.indexOf(o)] = b;
  state.sel = [b.id];
  render({ props: true });
}

// ---------- Frames: empty outlines to drop images/icons into ----------
function insertFrame(kind) {
  const c = viewCenter(), s = 220;
  const extra = { fill: 'none', stroke: '#7a8a96', strokeWidth: 3, dash: 'dashed', name: kind === 'circle' ? 'Circle frame' : 'Frame' };
  addObjects([kind === 'circle' ? Make.ellipse(c.x - s / 2, c.y - s / 2, s, s, extra) : Make.rect(c.x - s * 0.7, c.y - s / 2, s * 1.4, s, { ...extra, radius: 6 })]);
  toast('Frame added — put an image on top, select both and choose “Crop to shape” to fit it inside');
}

ARRANGE_COMMANDS.transform = openTransformDialog;
ARRANGE_COMMANDS.cropToShape = cropToShape;
ARRANGE_COMMANDS.brushToPath = () => applyBrushToPath();
ARRANGE_COMMANDS.frameRect = () => insertFrame('rect');
ARRANGE_COMMANDS.frameCircle = () => insertFrame('circle');
