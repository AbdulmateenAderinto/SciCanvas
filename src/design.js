// Design-tool features borrowed from Figma, Illustrator and Canva (part 1): components with variants,
// global colours and text styles, copy / paste style, and recolour artwork.

// ---------- Colour utilities shared by components, global colours and recolour ----------
const COLOR_KEYS = ['fill', 'fill2', 'stroke', 'color', 'labelColor', 'tint', 'bg', 'glow', 'clipStroke', 'tubeOutline', 'pathTextColor', 'border', 'headerFill', 'headerColor', 'stripeFill'];
function normHex(c) {
  if (typeof c !== 'string') return null;
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((x) => x + x).join('').toLowerCase();
  return null;
}
const SPAN_HEX = /\{([bi]{0,2})(#[0-9a-fA-F]{3,6})(?=[bi]{0,2}\|)/g;
// Calls fn(hex, object, where) for every colour an object shows; a returned colour replaces it.
function mapColours(list, fn) {
  const swap = (c, o, where) => { const h = normHex(c); if (!h) return c; const n = fn(h, o, where); return n && n !== h ? n : c; };
  const walk = (o) => {
    for (const k of COLOR_KEYS) {
      if (o.type === 'icon' && (k === 'color' || k === 'tint')) continue; // icons are recoloured per layer below
      if (o[k] !== undefined && o[k] !== null) o[k] = swap(o[k], o, k);
    }
    if (o.type === 'icon') {
      let base = [];
      try { base = iconBaseColors(o); } catch { /* icon not loaded */ }
      if (base.length) {
        const m = { ...(o.colorMap || {}) };
        let changed = false;
        base.forEach((b) => { const eff = normHex(m[b] ?? b); if (!eff) return; const n = fn(eff, o, 'layer'); if (n && n !== eff) { m[b] = n; changed = true; } });
        if (changed) o.colorMap = m;
      }
      if (o.layerStyle) for (const st of Object.values(o.layerStyle)) if (st && st.stroke) st.stroke = swap(st.stroke, o, 'border');
    }
    for (const k of ['text', 'label']) if (typeof o[k] === 'string' && o[k].includes('{')) o[k] = o[k].replace(SPAN_HEX, (all, pre, hex) => { const h = normHex(hex), n = h && fn(h, o, 'span'); return n && n !== h ? `{${pre}${n}` : all; });
    if (o.type === 'chart' && o.cfg && Array.isArray(o.cfg.colors)) o.cfg.colors = o.cfg.colors.map((c) => swap(c, o, 'chart'));
    if (o.cellFill) o.cellFill = o.cellFill.map((r) => (r ? r.map((c) => (c ? swap(c, o, 'cell') : c)) : r));
    if (o.children) o.children.forEach(walk);
  };
  list.forEach(walk);
}
function collectColours(list) {
  const counts = new Map();
  mapColours(list, (c) => { counts.set(c, (counts.get(c) || 0) + 1); return undefined; });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
function allDocObjectLists() {
  const lists = state.doc.pages.map((p) => p.objects);
  (state.doc.components || []).forEach((c) => c.variants.forEach((v) => lists.push(v.objects)));
  return lists;
}
function walkDeep(list, fn) { list.forEach((o) => { fn(o); if (o.children) walkDeep(o.children, fn); }); }
// The colour property that "is" an object's colour (used by global colours and copy style).
function primaryKey(o) {
  switch (o.type) {
    case 'icon': return ICON_MAP[o.iconId] ? 'color' : 'tint';
    case 'text': case 'connector': case 'brush': return 'color';
    case 'path': return o.closed ? 'fill' : 'stroke';
    case 'rect': case 'ellipse': case 'shape': return 'fill';
    case 'table': return 'headerFill';
    case 'protocol': return 'color';
    default: return null;
  }
}
const secondaryKey = (o) => (['rect', 'ellipse', 'shape'].includes(o.type) || (o.type === 'path' && o.closed) ? 'stroke' : o.type === 'text' ? 'bg' : null);
function setColourKey(o, k, c) {
  o[k] = c;
  if (o.type === 'icon' && (k === 'tint' || k === 'color')) o.colorMap = null;
}
const hexToHsl = (h) => {
  const [r, g, b] = Color.hexToRgb(h).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [hh * 60, s, l];
};
const hslDegToHex = (h, s, l) => {
  const f = (n) => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return Color.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
};
function colourDistance(a, b) { // "redmean" approximation of perceptual distance
  const [r1, g1, b1] = Color.hexToRgb(a), [r2, g2, b2] = Color.hexToRgb(b), rm = (r1 + r2) / 2;
  return Math.sqrt((2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2);
}

// ---------- Components with variants (Figma components, Illustrator symbols) ----------
const comps = () => (state.doc.components || (state.doc.components = []));
const getComp = (id) => (state.doc.components || []).find((c) => c.id === id);
const variantOf = (g) => { const c = getComp(g.comp); return c && (c.variants.find((v) => v.id === g.variant) || c.variants[0]); };
const isInstance = (o) => !!(o && o.type === 'group' && o.comp && getComp(o.comp));
// Text-bearing children of a variant, by index, for per-instance text overrides.
function textSlots(v) { return v.objects.map((c, i) => [i, c]).filter(([, c]) => c.type === 'text' || typeof c.label === 'string'); }
function buildInstance(g) {
  const comp = getComp(g.comp);
  if (!comp) { delete g.comp; delete g.variant; delete g.overrides; return; }
  const v = comp.variants.find((x) => x.id === g.variant) || comp.variants[0];
  g.variant = v.id;
  const sx = g.w0 ? g.w / g.w0 : 1, sy = g.h0 ? g.h / g.h0 : 1, cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  const kids = cloneObjects(v.objects, v.objects, 0), ov = g.overrides || {};
  if (ov.colors && Object.keys(ov.colors).length) mapColours(kids, (c) => ov.colors[c]);
  if (ov.text) for (const [i, t] of Object.entries(ov.text)) { const k = kids[+i]; if (!k) continue; if (k.type === 'text') { k.text = t; postEdit(k); } else if (typeof k.label === 'string') k.label = t; }
  g.children = kids;
  g.w0 = v.w; g.h0 = v.h; g.w = v.w * sx; g.h = v.h * sy;
  g.x = cx - g.w / 2; g.y = cy - g.h / 2;
}
function syncComponent(cid) {
  const visit = (list) => list.forEach((o) => { if (o.type === 'group') { if (o.comp === cid) buildInstance(o); else visit(o.children); } });
  state.doc.pages.forEach((p) => visit(p.objects));
}
function newInstance(comp, v, at) {
  const g = { id: uid(), type: 'group', name: comp.name, x: at.x - v.w / 2, y: at.y - v.h / 2, w: v.w, h: v.h, w0: v.w, h0: v.h, rot: 0, comp: comp.id, variant: v.id, children: [] };
  buildInstance(g);
  return g;
}
function createComponent() {
  let sel = selected().filter((o) => o.type !== 'connector' || selected().length > 1);
  if (!sel.length) { toast('Select the objects that make up the component (e.g. a protein with its label)'); return; }
  if (sel.length === 1 && isInstance(sel[0])) { toast('This is already a component instance — use “Detach instance” first to make a new component from it'); return; }
  let g;
  if (sel.length === 1 && sel[0].type === 'group') { checkpoint(); g = sel[0]; }
  else if (sel.length > 1) { groupSelection(); g = selected()[0]; }
  else {
    checkpoint();
    const o = sel[0], b = bounds(o, objs());
    g = { id: uid(), type: 'group', x: b.x, y: b.y, w: b.w, h: b.h, w0: b.w, h0: b.h, rot: 0, children: [{ ...deep(o), x: o.x - b.x, y: o.y - b.y }] };
    for (const c of objs()) if (c.type === 'connector') { if (c.from.id === o.id) c.from = { id: g.id }; if (c.to.id === o.id) c.to = { id: g.id }; }
    objs()[objs().indexOf(o)] = g;
  }
  if (!g) return;
  const n = comps().length + 1, name = (g.name || '').trim() || (g.children.length === 1 ? layerName(g.children[0]) : '') || `Component ${n}`;
  // Store the definition at the instance's unscaled size.
  const kids = deep(g.children);
  const comp = { id: uid(), name, variants: [{ id: uid(), name: 'Default', w: g.w0, h: g.h0, objects: kids }] };
  comps().push(comp);
  Object.assign(g, { comp: comp.id, variant: comp.variants[0].id, name });
  delete g.overrides;
  buildInstance(g);
  state.sel = [g.id];
  render({ props: true });
  toast(`Created component “${name}”. Copies stay linked: edit one (double-click) and every copy updates`);
}
function detachInstance(g) {
  checkpoint();
  delete g.comp; delete g.variant; delete g.overrides;
  render({ props: true });
  toast('Detached: this copy no longer follows the component');
}
// Write an edited instance back to its component, undoing its own overrides first.
function pushInstance(g) {
  const comp = getComp(g.comp), v = comp && variantOf(g);
  if (!v) return;
  const objects = deep(g.children), ov = g.overrides || {};
  if (ov.colors) { const inv = {}; for (const [a, b] of Object.entries(ov.colors)) inv[normHex(b)] = a; mapColours(objects, (c) => inv[c]); }
  if (ov.text) for (const i of Object.keys(ov.text)) { const old = v.objects[+i], k = objects[+i]; if (!old || !k || old.type !== k.type) continue; if (k.type === 'text') { k.text = old.text; postEdit(k); } else k.label = old.label; }
  v.objects = objects; v.w = g.w0; v.h = g.h0;
  syncComponent(comp.id);
}
function addVariant(g) {
  const comp = getComp(g.comp), v = variantOf(g);
  if (!v) return;
  checkpoint();
  const nv = { id: uid(), name: `Variant ${comp.variants.length + 1}`, w: v.w, h: v.h, objects: deep(v.objects) };
  comp.variants.push(nv);
  g.variant = nv.id;
  buildInstance(g);
  render({ props: true });
  toast('New variant added: double-click the instance to change how this state looks');
}
function deleteVariant(g) {
  const comp = getComp(g.comp), v = variantOf(g);
  if (!v || comp.variants.length < 2) return;
  checkpoint();
  comp.variants = comp.variants.filter((x) => x !== v);
  syncComponent(comp.id);
  render({ props: true });
}
function selectInstances(cid) {
  const ids = objs().filter((o) => o.type === 'group' && o.comp === cid).map((o) => o.id);
  state.sel = ids; render({ props: true });
  toast(`${ids.length} instance${ids.length === 1 ? '' : 's'} on this page`);
}
function instanceSection(g) {
  const comp = getComp(g.comp), v = variantOf(g), L = [g];
  const count = state.doc.pages.reduce((n, p) => { let k = 0; walkDeep(p.objects, (o) => { if (o.comp === comp.id) k++; }); return n + k; }, 0);
  const ov = g.overrides || (g.overrides = {});
  const rebuild = (key) => { checkpoint('ov' + g.id + key); buildInstance(g); renderScene(); renderOverlay(); };
  const colourRows = collectColours(v.objects).slice(0, 10).map(([c]) => el('div', { class: 'row' },
    el('span', { class: 'swatch', style: `background:${c};cursor:default`, title: c }), el('span', { textContent: '→', style: 'color:var(--muted)' }),
    el('input', { type: 'color', value: (ov.colors && ov.colors[c]) || c, oninput: (e) => { ov.colors = { ...(ov.colors || {}), [c]: e.target.value }; if (e.target.value === c) delete ov.colors[c]; rebuild('c' + c); } })));
  const textRows = textSlots(v).map(([i, c]) => row(c.type === 'text' ? 'Text' : 'Label', el('input', { type: 'text', value: ov.text && ov.text[i] != null ? ov.text[i] : c.type === 'text' ? c.text : c.label, oninput: (e) => { ov.text = { ...(ov.text || {}), [i]: e.target.value }; rebuild('t' + i); } })));
  return sect(`Component · ${count} cop${count === 1 ? 'y' : 'ies'}`,
    row('Component', el('input', { type: 'text', value: comp.name, onchange: (e) => { checkpoint(); comp.name = e.target.value.trim() || comp.name; walkDeep(objs(), (o) => { if (o.comp === comp.id) o.name = comp.name; }); renderLayers(); } })),
    row('Variant', el('select', { onchange: (e) => { checkpoint(); g.variant = e.target.value; buildInstance(g); render({ props: true }); } }, ...comp.variants.map((x) => el('option', { value: x.id, textContent: x.name, selected: x === v })))),
    row('Variant name', el('input', { type: 'text', value: v.name, onchange: (e) => { checkpoint(); v.name = e.target.value.trim() || v.name; renderProps(); } })),
    el('div', { class: 'note', textContent: 'Variants are states of the same thing: Unbound / Bound / Phosphorylated, or Naive / Activated / Exhausted.' }),
    el('div', { class: 'btnrow' }, btn('Edit main component', () => enterGroupEdit(g), 'primary'), btn('＋ Variant', () => addVariant(g)), comp.variants.length > 1 ? btn('Delete variant', () => deleteVariant(g)) : null),
    el('h3', { textContent: 'This copy only', style: 'margin-top:10px' }),
    ...textRows, ...colourRows,
    el('div', { class: 'btnrow', style: 'margin-top:6px' },
      btn('Reset overrides', () => { checkpoint(); g.overrides = {}; buildInstance(g); render({ props: true }); }),
      btn('Select all copies', () => selectInstances(comp.id)),
      btn('Detach instance', () => detachInstance(g))));
}
function openComponentsDialog() {
  const list = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px;width:640px;max-width:90vw;max-height:60vh;overflow:auto' });
  const draw = () => {
    list.innerHTML = '';
    if (!comps().length) { list.append(el('div', { class: 'note', textContent: 'No components yet. Select a protein, cell or labelled group and choose Arrange › Create Component (⌥⌘K).' })); return; }
    comps().forEach((comp) => {
      const v = comp.variants[0], pad = 6;
      const thumb = el('div', { style: 'height:110px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;border:1px solid var(--line,#ddd)' });
      thumb.innerHTML = pageSvgString({ width: v.w + 2 * pad, height: v.h + 2 * pad, background: '#ffffff', objects: cloneObjects(v.objects, v.objects, pad) }).replace('<svg ', '<svg style="max-width:100%;max-height:104px" ');
      list.append(el('div', { style: 'display:flex;flex-direction:column;gap:4px' }, thumb,
        el('input', { type: 'text', value: comp.name, onchange: (e) => { checkpoint(); comp.name = e.target.value.trim() || comp.name; } }),
        el('div', { class: 'note', textContent: `${comp.variants.length} variant${comp.variants.length === 1 ? '' : 's'}: ${comp.variants.map((x) => x.name).join(', ')}` }),
        el('div', { class: 'btnrow' }, btn('Insert', () => { closeModal(); addObjects([newInstance(comp, v, viewCenter())]); }, 'primary'),
          btn('Delete', () => { if (!confirm(`Delete component “${comp.name}”? Its copies stay on the page as plain groups.`)) return; checkpoint(); state.doc.components = comps().filter((c) => c !== comp); state.doc.pages.forEach((p) => walkDeep(p.objects, (o) => { if (o.comp === comp.id) { delete o.comp; delete o.variant; delete o.overrides; } })); draw(); render({ props: true }); }, 'danger'))));
    });
  };
  draw();
  openModal('Components', el('div', {}, list, el('div', { class: 'note', style: 'margin-top:8px', textContent: 'Components live in this figure. To reuse one in other figures, select a copy and use Save as icon.' })));
}

// Group editing keeps a group's identity and settings (component link, auto layout, name…). Component
// instances and auto-layout groups are edited upright at their true size, then the change is written back.
const GROUP_KEEP_SKIP = new Set(['id', 'type', 'x', 'y', 'w', 'h', 'w0', 'h0', 'rot', 'children', 'flipX', 'flipY']);
const _enterGroupEditD = enterGroupEdit, _exitGroupEditD = exitGroupEdit;
enterGroupEdit = function (g) {
  const meta = { id: g.id, undoLen: state.undo.length, keep: Object.fromEntries(Object.entries(g).filter(([k]) => !GROUP_KEEP_SKIP.has(k)).map(([k, v]) => [k, deep(v)])) };
  if (g.comp || g.auto) {
    const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    Object.assign(meta, { normal: true, sx: g.w / g.w0, sy: g.h / g.h0, rot: g.rot || 0, flipX: g.flipX, flipY: g.flipY });
    g.w = g.w0; g.h = g.h0; g.rot = 0; g.flipX = false; g.flipY = false; g.x = cx - g.w / 2; g.y = cy - g.h / 2;
  }
  _enterGroupEditD(g);
  if (groupEdit) groupEdit.meta = meta;
  if (g.comp) toast('Editing the main component — changes apply to every copy. Click outside or press Esc when done');
};
exitGroupEdit = function () {
  if (!groupEdit) return;
  const meta = groupEdit.meta;
  if (!meta) return _exitGroupEditD();
  const ids = [...groupEdit.ids].filter((id) => byId(id));
  groupEdit = null;
  if (!ids.length) { render({ props: true }); return; }
  state.sel = ids;
  if (ids.length >= 2) groupSelection();
  else {
    const o = byId(ids[0]), b = bounds(o, objs());
    const g1 = { id: uid(), type: 'group', x: b.x, y: b.y, w: b.w, h: b.h, w0: b.w, h0: b.h, rot: 0, children: [{ ...deep(o), x: o.x - b.x, y: o.y - b.y }] };
    objs()[objs().indexOf(o)] = g1; state.sel = [g1.id];
  }
  const g = byId(state.sel[0]);
  if (g && g.type === 'group') {
    Object.assign(g, meta.keep);
    if (!byId(meta.id)) { const nid = g.id; g.id = meta.id; objs().forEach((c) => { if (c.type === 'connector') { if (c.from.id === nid) c.from = { id: meta.id }; if (c.to.id === nid) c.to = { id: meta.id }; } }); }
    if (g.auto && typeof relayoutAuto === 'function') relayoutAuto(g);
    if (isInstance(g)) pushInstance(g);
    if (meta.normal) {
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      g.w = g.w0 * meta.sx; g.h = g.h0 * meta.sy; g.x = cx - g.w / 2; g.y = cy - g.h / 2;
      g.rot = meta.rot; if (meta.flipX) g.flipX = true; if (meta.flipY) g.flipY = true;
    }
  }
  // The whole edit session is one undo step back to the group as it was.
  if (state.undo.length > meta.undoLen + 1) state.undo.length = meta.undoLen + 1;
  state.sel = [];
  render({ props: true });
};

// ---------- Global colours and text styles (Figma styles, Illustrator global swatches / paragraph styles) ----------
const swatchList = () => (state.doc.swatches || (state.doc.swatches = []));
const getSwatch = (id) => (state.doc.swatches || []).find((s) => s.id === id);
const TEXT_STYLE_KEYS = ['family', 'fontSize', 'color', 'bold', 'italic'];
const DEFAULT_TEXT_STYLES = [['Panel letter', 26, true], ['Title', 20, true], ['Label', 14, false], ['Caption', 11, false]];
function textStyles() {
  if (!state.doc.textStyles) state.doc.textStyles = DEFAULT_TEXT_STYLES.map(([name, fontSize, bold]) => ({ id: uid(), name, family: 'sans', fontSize, bold, italic: false, color: '#222222' }));
  return state.doc.textStyles;
}
const getTextStyle = (id) => (state.doc.textStyles || []).find((s) => s.id === id);
function linkSwatch(list, sw, which) {
  checkpoint();
  const apply = (o) => {
    if (o.type === 'group') { o.children.forEach(apply); return; }
    const k = which === 'secondary' ? secondaryKey(o) : primaryKey(o);
    if (!k) return;
    setColourKey(o, k, sw.color);
    o.swatchRefs = { ...(o.swatchRefs || {}), [k]: sw.id };
  };
  list.forEach(apply);
  list.filter(isInstance).forEach((g) => { pushInstance(g); });
  render({ props: true });
}
function updateSwatch(sw, colour) {
  checkpoint('sw' + sw.id);
  sw.color = colour;
  const touched = new Set();
  allDocObjectLists().forEach((list) => walkDeep(list, (o) => {
    if (!o.swatchRefs) return;
    for (const [k, id] of Object.entries(o.swatchRefs)) if (id === sw.id) { setColourKey(o, k, colour); touched.add(o); }
  }));
  comps().forEach((c) => syncComponent(c.id));
  renderScene();
  return touched.size;
}
function swatchUsage(id) { let n = 0; allDocObjectLists().forEach((l) => walkDeep(l, (o) => { if (o.swatchRefs && Object.values(o.swatchRefs).includes(id)) n++; })); return n; }
function applyTextStyle(list, ts) {
  checkpoint();
  list.filter((o) => o.type === 'text').forEach((o) => { for (const k of TEXT_STYLE_KEYS) o[k] = ts[k]; o.textStyle = ts.id; postEdit(o); });
  render({ props: true });
}
function updateTextStyle(ts) {
  allDocObjectLists().forEach((list) => walkDeep(list, (o) => { if (o.type === 'text' && o.textStyle === ts.id) { for (const k of TEXT_STYLE_KEYS) o[k] = ts[k]; postEdit(o); } }));
  comps().forEach((c) => syncComponent(c.id));
  renderScene(); renderOverlay();
}
// Editing a linked property by hand unlinks just that property.
const _setPropsD = setProps;
setProps = function (list, key, value, opts) {
  for (const o of list) {
    if (o.swatchRefs && o.swatchRefs[key]) { delete o.swatchRefs[key]; if (!Object.keys(o.swatchRefs).length) delete o.swatchRefs; }
    if (o.textStyle && TEXT_STYLE_KEYS.includes(key)) delete o.textStyle;
  }
  return _setPropsD(list, key, value, opts);
};
function globalColourSection(sel) {
  const linked = new Set();
  walkDeep(sel, (o) => { if (o.swatchRefs) Object.values(o.swatchRefs).forEach((id) => linked.add(id)); });
  const chips = swatchList().map((sw) => el('button', { class: 'swatch', style: `background:${sw.color};${linked.has(sw.id) ? 'outline:2px solid var(--accent,#3b6fd6);outline-offset:1px' : ''}`, title: `${sw.name} — click: fill / colour · ⌥-click: outline`, onclick: (e) => linkSwatch(sel, sw, e.altKey ? 'secondary' : 'primary') }));
  return sect('Global colours',
    chips.length ? el('div', { class: 'swatches', style: 'margin-left:0' }, ...chips) : el('div', { class: 'note', textContent: 'Named colours like “Treg” or “PD-1 green”. Change one and everything using it updates.' }),
    el('div', { class: 'btnrow', style: 'margin-top:6px' },
      btn('＋ From selection', () => {
        const o = sel.find((x) => primaryKey(x)), c = o && normHex(o[primaryKey(o)]);
        if (!c) { toast('The selection has no plain colour to save'); return; }
        checkpoint();
        const sw = { id: uid(), name: (o.name || layerName(o) || 'Colour').slice(0, 30), color: c };
        swatchList().push(sw); linkSwatch(sel, sw, 'primary');
      }),
      btn('Manage styles…', openStylesDialog)));
}
function textStyleRow(o) {
  const L = [o], cur = getTextStyle(o.textStyle);
  return el('div', {},
    row('Text style', el('select', { onchange: (e) => { const ts = getTextStyle(e.target.value); if (ts) applyTextStyle(L, ts); else { checkpoint(); delete o.textStyle; renderProps(); } } },
      el('option', { value: '', textContent: cur ? 'Detach style' : 'None' }), ...textStyles().map((ts) => el('option', { value: ts.id, textContent: `${ts.name} · ${ts.fontSize}pt`, selected: ts === cur })))),
    el('div', { class: 'btnrow', style: 'margin:0 0 6px 84px' },
      cur ? btn('Update style to match', () => { checkpoint(); for (const k of TEXT_STYLE_KEYS) cur[k] = o[k]; updateTextStyle(cur); toast(`“${cur.name}” updated everywhere`); }) : null,
      btn('New style…', () => {
        checkpoint();
        const ts = { id: uid(), name: `Style ${textStyles().length + 1}`, ...Object.fromEntries(TEXT_STYLE_KEYS.map((k) => [k, o[k]])) };
        textStyles().push(ts); o.textStyle = ts.id; openStylesDialog();
      })));
}
function openStylesDialog() {
  const wrap = el('div', { style: 'width:620px;max-width:90vw;max-height:70vh;overflow:auto' });
  const draw = () => {
    wrap.innerHTML = '';
    wrap.append(el('h3', { class: 'dlg-sub', textContent: 'Global colours' }));
    swatchList().forEach((sw) => wrap.append(el('div', { class: 'row' },
      el('input', { type: 'text', value: sw.name, style: 'width:160px', onchange: (e) => { checkpoint(); sw.name = e.target.value; } }),
      el('input', { type: 'color', value: sw.color, oninput: (e) => updateSwatch(sw, e.target.value) }),
      el('span', { class: 'note', style: 'margin:0 8px', textContent: `used ${swatchUsage(sw.id)}×` }),
      btn('Delete', () => { checkpoint(); state.doc.swatches = swatchList().filter((x) => x !== sw); allDocObjectLists().forEach((l) => walkDeep(l, (o) => { if (o.swatchRefs) for (const [k, id] of Object.entries(o.swatchRefs)) if (id === sw.id) delete o.swatchRefs[k]; })); draw(); }, 'danger'))));
    wrap.append(el('div', { class: 'btnrow' },
      btn('＋ Colour', () => { checkpoint(); swatchList().push({ id: uid(), name: `Colour ${swatchList().length + 1}`, color: '#4a7fd6' }); draw(); }),
      btn('Add figure palette & brand colours', () => {
        checkpoint();
        const have = new Set(swatchList().map((s) => s.color));
        [...(state.doc.palette || []), ...((typeof getBrand === 'function' && getBrand().palette) || [])].map(normHex).filter((c) => c && !have.has(c)).forEach((c) => { have.add(c); swatchList().push({ id: uid(), name: c, color: c }); });
        draw();
      })));
    wrap.append(el('div', { class: 'note', textContent: 'Apply a global colour from Properties › Global colours. Recolouring a linked object by hand unlinks it.' }));
    wrap.append(el('h3', { class: 'dlg-sub', textContent: 'Text styles', style: 'margin-top:14px' }));
    textStyles().forEach((ts) => {
      const upd = (k, v) => { checkpoint('ts' + ts.id + k); ts[k] = v; updateTextStyle(ts); };
      wrap.append(el('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px' },
        el('input', { type: 'text', value: ts.name, style: 'width:120px', onchange: (e) => { checkpoint(); ts.name = e.target.value; } }),
        el('select', { onchange: (e) => upd('family', e.target.value) }, ...FONT_NAMES.map(([v, l]) => el('option', { value: v, textContent: l, selected: v === ts.family }))),
        el('input', { type: 'number', min: 4, step: 1, value: ts.fontSize, style: 'width:56px', oninput: (e) => { const v = +e.target.value; if (v >= 4) upd('fontSize', v); } }),
        el('label', { style: 'width:auto;display:flex;gap:3px;align-items:center;color:inherit' }, el('input', { type: 'checkbox', checked: !!ts.bold, onchange: (e) => upd('bold', e.target.checked) }), 'B'),
        el('label', { style: 'width:auto;display:flex;gap:3px;align-items:center;color:inherit' }, el('input', { type: 'checkbox', checked: !!ts.italic, onchange: (e) => upd('italic', e.target.checked) }), 'I'),
        el('input', { type: 'color', value: toHex(ts.color), oninput: (e) => upd('color', e.target.value) }),
        btn('Delete', () => { checkpoint(); state.doc.textStyles = textStyles().filter((x) => x !== ts); allDocObjectLists().forEach((l) => walkDeep(l, (o) => { if (o.textStyle === ts.id) delete o.textStyle; })); draw(); }, 'danger')));
    });
    wrap.append(el('div', { class: 'btnrow' }, btn('＋ Text style', () => { checkpoint(); textStyles().push({ id: uid(), name: `Style ${textStyles().length + 1}`, family: 'sans', fontSize: 14, bold: false, italic: false, color: '#222222' }); draw(); }),
      btn('Apply “Label” style to all unstyled text', () => {
        const ts = textStyles().find((x) => x.name === 'Label') || textStyles()[0];
        if (!ts) return;
        const list = []; state.doc.pages.forEach((p) => walkDeep(p.objects, (o) => { if (o.type === 'text' && !o.textStyle) list.push(o); }));
        applyTextStyle(list, ts); toast(`Styled ${list.length} text box${list.length === 1 ? '' : 'es'}`);
      })));
  };
  draw();
  openModal('Colour & text styles', wrap);
}

// ---------- Copy / paste style (Illustrator eyedropper, Figma copy properties, Canva copy style) ----------
const STYLE_SETS = {
  fillable: ['fill', 'fill2', 'gradDir', 'shade', 'stroke', 'strokeWidth', 'dash', 'dashStyle', 'labelSize', 'labelColor', 'labelBold'],
  rect: ['radius'],
  openPath: ['stroke', 'strokeWidth', 'dash', 'dashStyle', 'cap', 'tube', 'tubeOutline', 'tubeOutlineWidth', 'widthProfile', 'headEnd', 'headStart'],
  text: ['family', 'fontSize', 'color', 'bold', 'italic', 'underline', 'strike', 'align', 'bg', 'textStyle'],
  connector: ['color', 'width', 'dash', 'dashStyle', 'head', 'tail', 'style', 'labelItalic'],
  brush: ['color', 'size'],
  table: ['fill', 'border', 'borderWidth', 'headerFill', 'headerColor', 'stripe', 'stripeFill', 'fontSize', 'family', 'color', 'align'],
  image: ['clip', 'clipStroke', 'clipStrokeWidth'],
  common: ['opacity', 'glow', 'glowSize', 'shadow', 'blend', 'fade', 'fadeStart'],
};
function styleKeysFor(o) {
  if (o.type === 'connector') return STYLE_SETS.connector;
  const ks = [...STYLE_SETS.common];
  if (['rect', 'ellipse', 'shape'].includes(o.type) || (o.type === 'path' && o.closed)) ks.push(...STYLE_SETS.fillable);
  if (o.type === 'rect') ks.push(...STYLE_SETS.rect);
  if (o.type === 'path' && !o.closed) ks.push(...STYLE_SETS.openPath);
  if (o.type === 'text') ks.push(...STYLE_SETS.text);
  if (o.type === 'brush') ks.push(...STYLE_SETS.brush);
  if (o.type === 'table') ks.push(...STYLE_SETS.table);
  if (['image', 'icon', 'group', 'chart'].includes(o.type)) ks.push(...STYLE_SETS.image);
  return ks;
}
let copiedStyle = null;
function copyStyle() {
  const o = selected()[0];
  if (!o) { toast('Select the object whose style you want to copy'); return; }
  const props = {};
  for (const k of styleKeysFor(o)) if (o[k] !== undefined) props[k] = deep(o[k]);
  const pk = primaryKey(o);
  copiedStyle = { type: o.type, iconId: o.iconId, closed: !!o.closed, props, primary: pk ? normHex(o[pk]) : null, colorMap: o.type === 'icon' ? deep(o.colorMap || null) : null, layerStyle: o.type === 'icon' ? deep(o.layerStyle || null) : null };
  try { localStorage.setItem('scicanvas:copiedStyle', JSON.stringify(copiedStyle)); } catch { /* not saved */ }
  toast('Style copied — select other objects and Paste Style (⌥⌘V)');
}
function pasteStyle() {
  if (!copiedStyle) { try { copiedStyle = JSON.parse(localStorage.getItem('scicanvas:copiedStyle')); } catch { /* none */ } }
  const sel = selected();
  if (!copiedStyle) { toast('Copy a style first (⌥⌘C)'); return; }
  if (!sel.length) { toast('Select the objects to restyle'); return; }
  checkpoint();
  const s = copiedStyle;
  const apply = (o) => {
    if (o.type === 'group' && s.type !== 'group') { o.children.forEach(apply); return; }
    const allowed = new Set(styleKeysFor(o));
    for (const [k, v] of Object.entries(s.props)) if (allowed.has(k)) o[k] = deep(v);
    if (o.type === 'icon' && s.type === 'icon' && o.iconId === s.iconId) { o.colorMap = deep(s.colorMap); o.layerStyle = deep(s.layerStyle); }
    const pk = primaryKey(o);
    if (pk && s.primary && (s.type !== o.type || o.type === 'icon') && !(o.type === 'icon' && o.iconId === s.iconId && s.colorMap)) setColourKey(o, pk, s.primary);
    delete o.swatchRefs;
    postEdit(o);
  };
  sel.forEach(apply);
  render({ props: true });
  toast(`Style pasted onto ${sel.length} object${sel.length === 1 ? '' : 's'}`);
}

// ---------- Recolour artwork (Illustrator Recolor Artwork) ----------
const RECOLOUR_PALETTES = {
  okabe: ['Okabe–Ito (colour-blind safe)', ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#000000']],
  tol: ['Paul Tol bright (colour-blind safe)', ['#4477aa', '#ee6677', '#228833', '#ccbb44', '#66ccee', '#aa3377', '#bbbbbb']],
  soft: ['Soft immunology (cream, muted green / purple / blue)', ['#f6efdc', '#8fbf7f', '#9b7fd1', '#6f9bd8', '#e8a87c', '#d97a7a', '#7a8a96']],
  nature: ['Muted journal', ['#e64b35', '#4dbbd5', '#00a087', '#3c5488', '#f39b7f', '#8491b4', '#91d1c2', '#dc0000']],
  gray: ['Grayscale', ['#111111', '#444444', '#777777', '#aaaaaa', '#d4d4d4', '#ffffff']],
};
function openRecolourDialog() {
  const selIds = new Set(state.sel), scopeSel = selIds.size > 0;
  const snap0 = snapshot(), base = JSON.parse(snap0).doc;
  let applied = false;
  const allPages = el('input', { type: 'checkbox' });
  const targets = (doc) => (allPages.checked ? doc.pages.map((p) => p.objects) : [scopeSel ? doc.pages[state.pageIndex].objects.filter((o) => selIds.has(o.id)) : doc.pages[state.pageIndex].objects]);
  let colours = [], map = {};
  const reset = () => { const d = JSON.parse(snap0).doc; state.doc.pages = d.pages; state.doc.components = d.components; };
  const preview = () => {
    reset();
    targets(state.doc).forEach((l) => mapColours(l, (c) => map[c]));
    renderScene();
  };
  const listEl = el('div', { style: 'max-height:46vh;overflow:auto;margin:8px 0' });
  const drawList = () => {
    colours = collectColours(targets(base).flat()).slice(0, 48);
    listEl.innerHTML = '';
    if (!colours.length) listEl.append(el('div', { class: 'note', textContent: 'No colours found (icons from libraries need to be loaded first).' }));
    colours.forEach(([c, n]) => {
      const inp = el('input', { type: 'color', value: map[c] || c, oninput: (e) => { map[c] = e.target.value; preview(); } });
      listEl.append(el('div', { class: 'row' }, el('span', { class: 'swatch', style: `background:${c};cursor:default`, title: c }), el('span', { textContent: '→', style: 'color:var(--muted)' }), inp,
        el('span', { class: 'note', style: 'margin:0 6px', textContent: `${c} · ${n}×` }), btn('Reset', () => { delete map[c]; inp.value = c; preview(); })));
    });
  };
  const pal = el('select', {}, ...Object.entries(RECOLOUR_PALETTES).map(([k, [l]]) => el('option', { value: k, textContent: l })),
    el('option', { value: 'swatches', textContent: 'This figure’s global colours' }), el('option', { value: 'figure', textContent: 'Figure palette + brand kit' }));
  const keepShades = el('input', { type: 'checkbox', checked: true });
  const paletteColours = () => {
    if (pal.value === 'swatches') return swatchList().map((s) => s.color);
    if (pal.value === 'figure') return [...(state.doc.palette || []), ...((typeof getBrand === 'function' && getBrand().palette) || [])].map(normHex).filter(Boolean);
    return RECOLOUR_PALETTES[pal.value][1];
  };
  const mapToPalette = () => {
    const P = paletteColours();
    if (!P.length) { toast('That palette is empty'); return; }
    const chromatic = P.filter((p) => hexToHsl(p)[1] > 0.15);
    map = {};
    for (const [c] of colours) {
      const [h, s, l] = hexToHsl(c);
      if (keepShades.checked && s > 0.12 && chromatic.length) {
        // Same hue family → same palette hue, keeping each shade's lightness (light/dark partners stay paired).
        const hd = (a) => Math.min(Math.abs(a - h), 360 - Math.abs(a - h));
        const p = chromatic.slice().sort((a, b) => hd(hexToHsl(a)[0]) - hd(hexToHsl(b)[0]))[0], [ph, ps] = hexToHsl(p);
        map[c] = hslDegToHex(ph, Math.max(ps * 0.85, Math.min(ps, s)), l);
      } else if (!keepShades.checked || pal.value === 'gray') map[c] = P.slice().sort((a, b) => colourDistance(a, c) - colourDistance(b, c))[0];
    }
    drawList(); preview();
  };
  const randomise = () => { const P = paletteColours(); map = {}; colours.forEach(([c], i) => { if (hexToHsl(c)[1] > 0.12) map[c] = P[i % P.length]; }); drawList(); preview(); };
  allPages.addEventListener('change', () => { map = {}; reset(); drawList(); renderScene(); });
  onModalClose = () => { $('#modal').classList.remove('side'); if (!applied) { reset(); render({ props: true }); } };
  drawList();
  openModal('Recolour artwork', el('div', { style: 'width:560px;max-width:92vw' },
    el('div', { class: 'note', textContent: scopeSel ? `Colours in the ${selIds.size} selected object${selIds.size === 1 ? '' : 's'}. Change any colour and every place it is used follows.` : 'Colours on this page. Select objects first to recolour only those.' }),
    el('label', { style: 'display:flex;gap:6px;align-items:center;margin-top:6px' }, allPages, 'All pages'),
    listEl,
    el('h3', { class: 'dlg-sub', textContent: 'Map to a palette' }),
    row('Palette', pal), el('label', { style: 'display:flex;gap:6px;align-items:center' }, keepShades, 'Keep shades (light and dark versions of one colour stay paired)'),
    el('div', { class: 'btnrow', style: 'margin-top:6px' }, btn('Map colours', mapToPalette), btn('Shuffle palette', randomise), btn('Reset all', () => { map = {}; drawList(); preview(); })),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Apply', () => {
      applied = true;
      state.undo.push(snap0); state.redo = []; markDirty();
      comps().forEach((c) => syncComponent(c.id));
      closeModal(); render({ props: true });
      toast('Recoloured');
    }, 'primary'))));
  $('#modal').classList.add('side'); // keep the artwork visible while recolouring
}

// ---------- Commands, menus and panels ----------
Object.assign(ARRANGE_COMMANDS, {
  createComponent, componentsDialog: openComponentsDialog,
  detachInstance: () => { const g = selected().find(isInstance); if (g) detachInstance(g); else toast('Select a component copy'); },
  stylesDialog: openStylesDialog, copyStyle, pasteStyle, recolour: openRecolourDialog,
});
const _renderPropsDesign1 = renderProps;
renderProps = function () {
  _renderPropsDesign1();
  const sel = selected(), P = $('#props');
  if (!sel.length) {
    P.append(sect('Styles', el('div', { class: 'note', textContent: `${swatchList().length} global colour${swatchList().length === 1 ? '' : 's'} · ${(state.doc.textStyles || []).length} text styles · ${comps().length} component${comps().length === 1 ? '' : 's'}` }),
      el('div', { class: 'btnrow' }, btn('Colour & text styles…', openStylesDialog), btn('Components…', openComponentsDialog), btn('Recolour artwork…', openRecolourDialog))));
    return;
  }
  const first = P.querySelector('.sect');
  if (sel.length === 1 && isInstance(sel[0])) first.after(instanceSection(sel[0]));
  if (sel.length === 1 && sel[0].type === 'text') { const tsect = [...P.querySelectorAll('.sect')].find((s) => s.querySelector('h3')?.textContent === 'Text'); if (tsect) tsect.querySelector('h3').after(textStyleRow(sel[0])); }
  if (sel.some((o) => primaryKey(o) || o.type === 'group')) P.append(globalColourSection(sel));
  P.append(sect('Style', el('div', { class: 'btnrow' },
    btn('Copy style', copyStyle), btn('Paste style', pasteStyle), btn('Recolour…', openRecolourDialog),
    sel.length === 1 && isInstance(sel[0]) ? null : btn('Create component', createComponent))));
};
const _ctxDesign1 = contextMenuTemplate;
contextMenuTemplate = function () {
  const items = _ctxDesign1(), sel = selected();
  if (!sel.length) return items;
  const i = items.findIndex((x) => x.cmd === 'saveIcon');
  items.splice(i < 0 ? items.length : i, 0,
    { label: 'Copy style', cmd: 'copyStyle' }, { label: 'Paste style', cmd: 'pasteStyle' },
    sel.length === 1 && isInstance(sel[0]) ? { label: 'Detach instance', cmd: 'detachInstance' } : { label: 'Create component', cmd: 'createComponent' },
    { label: 'Recolour artwork…', cmd: 'recolour' });
  return items;
};
