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
  o.h = rh * rows; o.w = cw * cols; o.rows = rows; o.cols = cols; o.colW = null;
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
  const draft = { cells: o.cells.map((r) => [...r]), fill: o.cellFill ? o.cellFill.map((r) => [...r]) : Array.from({ length: o.rows }, () => Array(o.cols).fill(null)), colW: o.colW ? [...o.colW] : Array(o.cols).fill(1 / o.cols) };
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
      render({ props: true }); closeModal();
    }, 'primary'))));
}
// Double-click a cell: edit it in place.
function editTableCellAt(o, e) {
  const p = toWorld(e);
  const c0 = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, q = rotPt(p, c0, -(o.rot || 0));
  const lx = q.x - o.x, ly = q.y - o.y;
  const r = Math.min(o.rows - 1, Math.max(0, Math.floor(ly / (o.h / o.rows))));
  const widths = o.colW && o.colW.length === o.cols ? o.colW : Array(o.cols).fill(1 / o.cols);
  let acc = 0, c = 0;
  for (; c < o.cols - 1; c++) { acc += widths[c] * o.w; if (lx < acc) break; }
  const key = `__cell_${r}_${c}`;
  Object.defineProperty(o, key, { configurable: true, enumerable: false, get: () => o.cells[r][c], set: (v) => { o.cells[r][c] = v; } });
  editText(o, key);
  // Re-position the editor over the cell.
  const ta = $('#textEditor'), z = state.zoom, sr = stage.getBoundingClientRect(), svr = svg.getBoundingClientRect();
  const x0 = widths.slice(0, c).reduce((a, b) => a + b, 0) * o.w;
  Object.assign(ta.style, { left: (o.x + x0) * z + state.panX + svr.left - sr.left + 'px', top: (o.y + (r * o.h) / o.rows) * z + state.panY + svr.top - sr.top + 'px', width: Math.max(60, widths[c] * o.w * z) + 'px', fontSize: (o.fontSize || 13) * z + 'px', textAlign: o.align || 'center' });
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
