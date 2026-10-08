// SciCanvas editor: state, rendering, interaction, panels.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = $('#svg'), stage = $('#stage');

// When opened outside Electron (e.g. in a browser for development) provide inert native stubs.
if (!window.native) {
  const none = async () => null;
  window.native = { onMenu() {}, openFigure: none, saveFigure: none, pickImages: async () => [], exportFile: none, exportPdf: none,
    listPacks: async () => {
      const out = [];
      for (const id of ['bioicons', 'reactome', 'healthicons', 'phylopic']) {
        try { const p = await (await fetch(`../assets/iconpacks/${id}/pack.json`)).json(); out.push({ ...p, id, base: new URL(`../assets/iconpacks/${id}/svg`, location.href).href }); } catch { /* not installed */ }
      }
      return out;
    },
    packCatalog: async () => [], installPack: none, saveUserIcon: none, deleteUserIcon: none,
    readPackIcon: async (pack, file) => (await fetch(`../assets/iconpacks/${pack}/svg/${encodeURIComponent(file)}`)).text(),
    getSettings: async () => ({ hasApiKey: false, author: '', field: '' }), saveSettings: none, copyImage: none, openPath: none, aiGenerate: none,
    onPackProgress() {},
    fetchPdb: async (id) => (await fetch(`https://files.rcsb.org/download/${id}.pdb`)).text(),
    fetchImage: async (url) => { const b = await (await fetch(url)).blob(); return new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); } };
}

const SWATCHES = ['#4a7fd6', '#3fa58b', '#e8743b', '#d64545', '#9b7fd1', '#e8b33c', '#5bb5e0', '#e88a9a', '#7a8a96', '#222222', '#ffffff'];

function newPage(name = 'Page 1', width = 1000, height = 700) {
  return { id: uid(), name, width, height, background: '#ffffff', objects: [] };
}
function newDoc() { return { version: 2, pages: [newPage()], uploads: [], assets: {} }; }

const state = {
  doc: newDoc(), pageIndex: 0, sel: [], tool: 'select', brushKind: 'membrane',
  zoom: 1, panX: 0, panY: 0, filePath: null, dirty: false, undo: [], redo: [],
  view: { grid: false, rulers: false, snap: true, snapGrid: false, gridSize: 20 },
};
let groupEdit = null;
const page = () => state.doc.pages[state.pageIndex];
const objs = () => page().objects;
const byId = (id) => objs().find((o) => o.id === id);
const selected = () => state.sel.map(byId).filter(Boolean);
const deep = (x) => JSON.parse(JSON.stringify(x));

function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// ---------- History ----------
let lastCp = { key: null, t: 0 };
function snapshot() { return JSON.stringify({ doc: state.doc, pageIndex: state.pageIndex }); }
function checkpoint(key) {
  const now = Date.now();
  if (key && key === lastCp.key && now - lastCp.t < 900) { lastCp.t = now; return; }
  lastCp = { key, t: now };
  state.undo.push(snapshot());
  if (state.undo.length > 200) state.undo.shift();
  state.redo = [];
  markDirty();
}
function restore(snap) {
  const s = JSON.parse(snap);
  state.doc = s.doc;
  state.pageIndex = Math.min(s.pageIndex, state.doc.pages.length - 1);
  state.sel = state.sel.filter((id) => byId(id));
  render({ props: true, pages: true });
}
function undo() { if (!state.undo.length) return; state.redo.push(snapshot()); restore(state.undo.pop()); markDirty(); }
function redo() { if (!state.redo.length) return; state.undo.push(snapshot()); restore(state.redo.pop()); markDirty(); }

let autosaveTimer;
function markDirty() {
  state.dirty = true;
  updateTitle();
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { try { localStorage.setItem('scicanvas:autosave', JSON.stringify({ doc: state.doc, filePath: state.filePath })); } catch (e) { /* quota — ignore */ } }, 800);
}
function updateTitle() {
  const name = state.filePath ? state.filePath.split(/[\\/]/).pop() : 'Untitled';
  $('#docname').textContent = name + (state.dirty ? ' •' : '');
}

// ---------- Rendering ----------
const elCache = new Map();
function renderScene() {
  const scene = $('#scene'), list = objs(), seen = new Set();
  let prev = null;
  for (const o of list) {
    const { transform, inner } = renderParts(o, list, false);
    let c = elCache.get(o.id);
    if (!c) { const g = document.createElementNS(SVGNS, 'g'); g.dataset.id = o.id; c = { el: g }; elCache.set(o.id, c); }
    if (c.inner !== inner) { c.el.innerHTML = inner; c.inner = inner; }
    if (c.transform !== transform) { transform ? c.el.setAttribute('transform', transform) : c.el.removeAttribute('transform'); c.transform = transform; }
    const op = o.opacity ?? 1;
    if (c.opacity !== op) { c.el.setAttribute('opacity', op); c.opacity = op; }
    c.el.classList.toggle('dimmed', !!groupEdit && !groupEdit.ids.has(o.id));
    const want = prev ? prev.nextSibling : scene.firstChild;
    if (want !== c.el) scene.insertBefore(c.el, want);
    prev = c.el;
    seen.add(o.id);
  }
  for (const [id, c] of elCache) if (!seen.has(id)) { c.el.remove(); elCache.delete(id); }
}

function applyViewport() {
  $('#viewport').setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.zoom})`);
  $('#zoomLabel').textContent = Math.round(state.zoom * 100) + '%';
  if (typeof drawRulers === 'function') drawRulers();
}

function renderOverlay(extra = '') {
  const ov = $('#overlay'), z = state.zoom, hs = 8 / z, sw = 1.5 / z;
  let s = '';
  const sel = selected();
  for (const o of sel) {
    if (nodeEdit && o.id === nodeEdit.id) continue;
    if (o.type === 'connector') {
      const [a, b] = connectorEnds(o, objs());
      s += `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" stroke="#3b6fd6" stroke-width="${sw}" stroke-dasharray="${4 / z}" fill="none"/>`;
      if (sel.length === 1) {
        for (const [k, p] of [['from', a], ['to', b]]) s += `<circle data-handle="${k}" cx="${p.x}" cy="${p.y}" r="${hs * 0.8}" fill="${o[k].id ? '#3b6fd6' : '#fff'}" stroke="#3b6fd6" stroke-width="${sw}" style="cursor:move"/>`;
        if (o.style === 'curved') {
          const cp = connectorControl(o, a, b) || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const m = { x: 0.25 * a.x + 0.5 * cp.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cp.y + 0.25 * b.y };
          s += `<rect data-handle="curve" x="${m.x - hs / 2}" y="${m.y - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#e8743b" stroke-width="${sw}" transform="rotate(45 ${m.x} ${m.y})" style="cursor:pointer"/>`;
        }
      }
      continue;
    }
    const tf = `translate(${o.x} ${o.y}) rotate(${o.rot || 0} ${o.w / 2} ${o.h / 2})`;
    s += `<g transform="${tf}"><rect width="${o.w}" height="${o.h}" fill="none" stroke="#3b6fd6" stroke-width="${sw}"${sel.length > 1 ? ` stroke-dasharray="${4 / z}"` : ''}/>`;
    if (sel.length === 1 && !o.locked) {
      let handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      if (o.type === 'text') handles = ['nw', 'ne', 'se', 'sw'];
      if (o.type === 'protocol') handles = ['e', 'w'];
      const pos = { n: [0.5, 0], s: [0.5, 1], e: [1, 0.5], w: [0, 0.5], nw: [0, 0], ne: [1, 0], se: [1, 1], sw: [0, 1] };
      const cursors = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' };
      for (const h of handles) {
        const [u, v] = pos[h];
        s += `<rect data-handle="${h}" x="${u * o.w - hs / 2}" y="${v * o.h - hs / 2}" width="${hs}" height="${hs}" fill="#fff" stroke="#3b6fd6" stroke-width="${sw}" style="cursor:${cursors[h]}-resize"/>`;
      }
      if (o.type !== 'protocol') {
        s += `<line x1="${o.w / 2}" y1="0" x2="${o.w / 2}" y2="${-22 / z}" stroke="#3b6fd6" stroke-width="${sw}"/>`;
        s += `<circle data-handle="rot" cx="${o.w / 2}" cy="${-24 / z}" r="${hs * 0.65}" fill="#fff" stroke="#3b6fd6" stroke-width="${sw}" style="cursor:grab"/>`;
      }
    }
    s += '</g>';
  }
  ov.innerHTML = s + extra + (typeof nodeOverlay === 'function' ? nodeOverlay() : '');
}

function render({ props = false, pages = false } = {}) {
  const p = page();
  const bg = $('#pagebg');
  bg.setAttribute('width', p.width); bg.setAttribute('height', p.height);
  bg.style.fill = p.background || '#fff';
  const gr = $('#gridrect');
  gr.setAttribute('width', p.width); gr.setAttribute('height', p.height);
  gr.style.display = state.view.grid ? '' : 'none';
  $('#gridpat').setAttribute('width', state.view.gridSize); $('#gridpat').setAttribute('height', state.view.gridSize);
  $('#gridpat path').setAttribute('d', `M${state.view.gridSize} 0H0V${state.view.gridSize}`);
  applyViewport();
  renderScene();
  renderOverlay();
  renderUserGuides();
  renderComments();
  if (pages) renderPages();
  if (props) { renderProps(); renderLayers(); }
  const n = state.sel.length;
  $('#status').textContent = n ? `${n} selected` : `${p.width} × ${p.height}px · ${(p.width / 96).toFixed(2)} × ${(p.height / 96).toFixed(2)} in`;
}

// ---------- Viewport ----------
function toWorld(e) {
  const r = svg.getBoundingClientRect();
  return { x: (e.clientX - r.left - state.panX) / state.zoom, y: (e.clientY - r.top - state.panY) / state.zoom };
}
function zoomAt(factor, cx, cy) {
  const r = svg.getBoundingClientRect();
  if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  const nz = Math.min(8, Math.max(0.05, state.zoom * factor));
  const wx = (cx - r.left - state.panX) / state.zoom, wy = (cy - r.top - state.panY) / state.zoom;
  state.zoom = nz;
  state.panX = cx - r.left - wx * nz;
  state.panY = cy - r.top - wy * nz;
  applyViewport(); renderOverlay();
}
function zoomFit() {
  const r = svg.getBoundingClientRect(), p = page();
  const z = Math.min((r.width - 120) / p.width, (r.height - 80) / p.height);
  state.zoom = Math.max(0.05, Math.min(z, 4));
  state.panX = (r.width - p.width * state.zoom) / 2 + 20;
  state.panY = (r.height - p.height * state.zoom) / 2;
  applyViewport(); renderOverlay();
}
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
  else { state.panX -= e.deltaX; state.panY -= e.deltaY; applyViewport(); }
}, { passive: false });

// ---------- Object helpers ----------
function postEdit(o) {
  if (o.type === 'text') { const m = measureText(o.text, o.fontSize, o.family, o.bold, o.italic); o.w = m.w; o.h = m.h; }
  if (o.type === 'protocol') o.h = protocolLayout(o).h;
  if (o.type === 'path' && o.closed && (!o.fill || o.fill === 'none')) { o.fill = DRAW_DEFAULTS.fill; o.shade = o.shade || 'soft'; }
}
function addObjects(list, { select = true } = {}) {
  checkpoint();
  objs().push(...list);
  if (select) state.sel = list.map((o) => o.id);
  setTool('select');
  render({ props: true });
}
function viewCenter() {
  const r = svg.getBoundingClientRect();
  return { x: (r.width / 2 - state.panX) / state.zoom, y: (r.height / 2 - state.panY) / state.zoom };
}
// Add a library icon (built-in id or pack key). In replace mode, swaps the selected icon in place.
async function addIcon(key, at) {
  const entry = ICON_MAP[key] ? null : Packs.byKey && Packs.byKey.get(key);
  if (!ICON_MAP[key] && !entry) return;
  if (entry) {
    if (entry.kb > 2500 && !confirm(`“${entry.name}” is a large file (${(entry.kb / 1024).toFixed(1)} MB, it embeds a bitmap). Add it anyway?`)) return;
    try { await ensurePackAsset(entry); } catch (e) { toast('Could not load that icon: ' + e.message); return; }
  }
  pushRecentIcon(key);
  const iconId = ICON_MAP[key] ? key : entry.key;
  const ar = iconAspect(iconId);
  if (replaceTarget && byId(replaceTarget)) {
    const o = byId(replaceTarget);
    checkpoint();
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2, size = Math.max(o.w, o.h);
    Object.assign(o, { iconId, colorMap: null, tint: null, color: ICON_MAP[iconId] ? ICON_MAP[iconId].color : undefined });
    if (ar >= 1) { o.w = size; o.h = size / ar; } else { o.h = size; o.w = size * ar; }
    o.x = cx - o.w / 2; o.y = cy - o.h / 2;
    replaceTarget = null;
    renderLibraryBanner();
    render({ props: true });
    return;
  }
  const c = at || viewCenter(), size = 110;
  const w = ar >= 1 ? size : size * ar, h = ar >= 1 ? size / ar : size;
  addObjects([{ id: uid(), type: 'icon', iconId, x: c.x - w / 2, y: c.y - h / 2, w, h, rot: 0, color: ICON_MAP[iconId] ? ICON_MAP[iconId].color : undefined }]);
}
let replaceTarget = null;
function loadImageSize(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth || 300, h: im.naturalHeight || 200 }); im.onerror = () => res({ w: 300, h: 200 }); im.src = src; });
}
async function addImage(src, at, extra = {}, maxSide = 420) {
  const { w, h } = await loadImageSize(src);
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = at || viewCenter();
  const o = Make.image(src, c.x - (w * k) / 2, c.y - (h * k) / 2, w * k, h * k, { nw: w, nh: h, ...extra });
  addObjects([o]);
  return o;
}
function addUpload(name, dataUrl) {
  if (!state.doc.uploads) state.doc.uploads = [];
  if (!state.doc.uploads.some((u) => u.dataUrl === dataUrl)) state.doc.uploads.push({ name, dataUrl });
  renderUploads();
}
function layerName(o) {
  if (o.name) return o.name;
  switch (o.type) {
    case 'icon': return ICON_MAP[o.iconId]?.name || getAsset(o.iconId)?.name || 'Icon';
    case 'text': return o.text.split('\n')[0].slice(0, 28) || 'Text';
    case 'rect': case 'ellipse': return o.label ? o.label.split('\n')[0].slice(0, 28) : o.type === 'rect' ? 'Rectangle' : 'Ellipse';
    case 'shape': return o.label ? o.label.split('\n')[0].slice(0, 28) : (SHAPES.find((x) => x[0] === o.kind) || [, 'Shape'])[1];
    case 'connector': return o.label || 'Connector';
    case 'path': return o.closed ? 'Drawn shape' : o.headEnd === 'arrow' || o.headStart === 'arrow' ? 'Arrow' : 'Drawn line';
    case 'brush': return `${o.kind[0].toUpperCase()}${o.kind.slice(1)} brush`;
    case 'chart': return o.cfg.title || `${o.cfg.kind} graph`;
    case 'protocol': return o.title || 'Protocol';
    case 'group': return `Group (${o.children.length})`;
    case 'image': return o.source || 'Image';
  }
  return o.type;
}

// Deep-copy objects with fresh ids; connectors keep links inside the copied set, else become fixed points.
function cloneObjects(list, context, offset = 20) {
  const idMap = {};
  const walk = (o) => { idMap[o.id] = uid(); if (o.children) o.children.forEach(walk); };
  list.forEach(walk);
  const resolved = {};
  list.forEach((o) => { if (o.type === 'connector') resolved[o.id] = connectorEnds(o, context); });
  const remap = (o) => {
    const c = deep(o);
    c.id = idMap[o.id];
    if (c.children) c.children = o.children.map(remap);
    return c;
  };
  return list.map((o) => {
    const c = remap(o);
    if (c.type === 'connector') {
      const [a, b] = resolved[o.id];
      c.from = o.from.id && idMap[o.from.id] ? { id: idMap[o.from.id] } : { x: a.x + offset, y: a.y + offset };
      c.to = o.to.id && idMap[o.to.id] ? { id: idMap[o.to.id] } : { x: b.x + offset, y: b.y + offset };
    } else { c.x += offset; c.y += offset; }
    return c;
  });
}

function deleteSelection() {
  if (!state.sel.length) return;
  checkpoint();
  const gone = new Set(state.sel);
  // Connectors attached to deleted objects become free-standing at their last position.
  for (const o of objs()) {
    if (o.type !== 'connector' || gone.has(o.id)) continue;
    const [a, b] = connectorEnds(o, objs());
    if (o.from.id && gone.has(o.from.id)) o.from = { x: a.x, y: a.y };
    if (o.to.id && gone.has(o.to.id)) o.to = { x: b.x, y: b.y };
  }
  page().objects = objs().filter((o) => !gone.has(o.id));
  state.sel = [];
  render({ props: true });
}
function duplicateSelection() {
  const sel = selected();
  if (!sel.length) return;
  const copies = cloneObjects(sel, objs());
  addObjects(copies);
}

// ---------- Grouping ----------
function unionBounds(list, context) {
  const bs = list.map((o) => bounds(o, context));
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y };
}
function groupSelection() {
  const items = objs().filter((o) => state.sel.includes(o.id));
  if (items.length < 2) return;
  checkpoint();
  const ids = new Set(items.map((o) => o.id));
  const bb = unionBounds(items, objs());
  const g = { id: uid(), type: 'group', x: bb.x, y: bb.y, w: Math.max(bb.w, 1), h: Math.max(bb.h, 1), w0: Math.max(bb.w, 1), h0: Math.max(bb.h, 1), rot: 0, children: [] };
  for (const o of objs()) { // outside connectors attached to grouped items now attach to the group
    if (o.type !== 'connector' || ids.has(o.id)) continue;
    if (o.from.id && ids.has(o.from.id)) o.from = { id: g.id };
    if (o.to.id && ids.has(o.to.id)) o.to = { id: g.id };
  }
  g.children = items.map((o) => {
    const c = deep(o);
    if (c.type === 'connector') {
      const [a, b] = connectorEnds(o, objs());
      if (!(o.from.id && ids.has(o.from.id))) c.from = { x: a.x - bb.x, y: a.y - bb.y };
      if (!(o.to.id && ids.has(o.to.id))) c.to = { x: b.x - bb.x, y: b.y - bb.y };
    } else { c.x -= bb.x; c.y -= bb.y; }
    return c;
  });
  const top = Math.max(...items.map((o) => objs().indexOf(o)));
  const rest = objs().filter((o, i) => !ids.has(o.id) || i === top);
  rest[rest.findIndex((o) => o.id === objs()[top].id)] = g;
  page().objects = rest;
  state.sel = [g.id];
  render({ props: true });
}
function ungroupSelection() {
  const groups = selected().filter((o) => o.type === 'group');
  if (!groups.length) return;
  checkpoint();
  const newSel = [];
  for (const g of groups) {
    const sx = g.w / g.w0, sy = g.h / g.h0, gc = { x: g.w / 2, y: g.h / 2 };
    const toWorldPt = (p) => { const q = rotPt({ x: p.x * sx, y: p.y * sy }, gc, g.rot || 0); return { x: q.x + g.x, y: q.y + g.y }; };
    for (const o of objs()) { // outside connectors attached to the group become free points
      if (o.type !== 'connector') continue;
      const [a, b] = connectorEnds(o, objs());
      if (o.from.id === g.id) o.from = { x: a.x, y: a.y };
      if (o.to.id === g.id) o.to = { x: b.x, y: b.y };
    }
    const kids = g.children.map((c) => {
      if (c.type === 'connector') {
        if (!c.from.id) c.from = toWorldPt(c.from);
        if (!c.to.id) c.to = toWorldPt(c.to);
        c.width = (c.width || 2) * Math.sqrt(sx * sy);
        return c;
      }
      const cc = toWorldPt({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
      if (c.type === 'text') { c.fontSize *= sy; postEdit(c); }
      else if (c.type === 'protocol') { c.w *= sx; c.scale = (c.scale || 1) * sy; postEdit(c); }
      else { c.w *= sx; c.h *= sy; }
      c.x = cc.x - c.w / 2; c.y = cc.y - c.h / 2;
      c.rot = ((c.rot || 0) + (g.rot || 0)) % 360;
      return c;
    });
    const i = objs().indexOf(g);
    objs().splice(i, 1, ...kids);
    newSel.push(...kids.map((k) => k.id));
  }
  state.sel = newSel;
  render({ props: true });
}

// ---------- Align / arrange ----------
function align(mode) {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (!sel.length) return;
  checkpoint();
  const ref = sel.length === 1 ? { x: 0, y: 0, w: page().width, h: page().height } : unionBounds(sel);
  if (mode === 'dh' || mode === 'dv') {
    if (sel.length < 3) return;
    const H = mode === 'dh';
    const items = sel.map((o) => ({ o, b: bounds(o) })).sort((a, b) => (H ? a.b.x - b.b.x : a.b.y - b.b.y));
    const total = items.reduce((s, it) => s + (H ? it.b.w : it.b.h), 0);
    const span = H ? ref.w : ref.h, gap = (span - total) / (items.length - 1);
    let cur = H ? ref.x : ref.y;
    for (const it of items) {
      if (H) it.o.x += cur - it.b.x; else it.o.y += cur - it.b.y;
      cur += (H ? it.b.w : it.b.h) + gap;
    }
  } else {
    for (const o of sel) {
      const b = bounds(o);
      if (mode === 'l') o.x += ref.x - b.x;
      if (mode === 'c') o.x += ref.x + ref.w / 2 - (b.x + b.w / 2);
      if (mode === 'r') o.x += ref.x + ref.w - (b.x + b.w);
      if (mode === 't') o.y += ref.y - b.y;
      if (mode === 'm') o.y += ref.y + ref.h / 2 - (b.y + b.h / 2);
      if (mode === 'b') o.y += ref.y + ref.h - (b.y + b.h);
    }
  }
  render();
}
function zorder(mode) {
  const list = objs(), ids = new Set(state.sel);
  if (!ids.size) return;
  checkpoint();
  const sel = list.filter((o) => ids.has(o.id)), rest = list.filter((o) => !ids.has(o.id));
  if (mode === 'front') page().objects = [...rest, ...sel];
  else if (mode === 'back') page().objects = [...sel, ...rest];
  else {
    const arr = [...list];
    const idxs = arr.map((o, i) => (ids.has(o.id) ? i : -1)).filter((i) => i >= 0);
    if (mode === 'forward') for (const i of idxs.reverse()) { if (i < arr.length - 1 && !ids.has(arr[i + 1].id)) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; }
    else for (const i of idxs) { if (i > 0 && !ids.has(arr[i - 1].id)) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; }
    page().objects = arr;
  }
  render({ props: true });
}

// ---------- Tools ----------
function setTool(t, kind) {
  if (state.tool === 'pen' && t !== 'pen' && pen) finishPen(false);
  state.tool = t;
  if (kind) state.brushKind = kind;
  $$('#tools button[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t && (t !== 'brush' || b.dataset.kind === state.brushKind)));
  $('#brushShape').classList.toggle('hidden', t !== 'brush');
  $('#shapePick').classList.toggle('hidden', t !== 'shape');
  stage.classList.toggle('draw', ['rect', 'ellipse', 'text', 'connector', 'brush', 'shape', 'badge', 'comment', 'pencil', 'pen', 'line', 'arrow', 'airbrush'].includes(t));
  $('#drawOpts').classList.toggle('hidden', !['pencil', 'pen', 'line', 'arrow', 'airbrush'].includes(t));
  if (typeof syncDrawOpts === 'function') syncDrawOpts();
  stage.classList.toggle('pan', t === 'pan');
}
$$('#tools button[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool, b.dataset.kind)));

// ---------- Pointer interaction ----------
let drag = null, spaceDown = false;
const hitObject = (target) => {
  const el = target.closest && target.closest('#scene > g[data-id]');
  const o = el && byId(el.dataset.id);
  return o && !o.locked ? o : null;
};
function objectAtPoint(cx, cy, excludeId) {
  const els = document.elementsFromPoint(cx, cy);
  for (const el of els) {
    const g = el.closest && el.closest('#scene > g[data-id]');
    if (g && g.dataset.id !== excludeId) { const o = byId(g.dataset.id); if (o && o.type !== 'connector') return o; }
  }
  return null;
}

svg.addEventListener('pointerdown', (e) => {
  if (!$('#textEditor').classList.contains('hidden')) commitTextEdit();
  e.preventDefault(); // keep focus handling under our control (no native drag/selection)
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (e.button === 1 || spaceDown || state.tool === 'pan') {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, px: state.panX, py: state.panY };
    return;
  }
  const p = toWorld(e);
  const guideEl = e.target.closest('[data-guide]');
  if (guideEl && state.tool === 'select') {
    checkpoint();
    drag = { mode: 'guide', axis: guideEl.dataset.guide, index: +guideEl.dataset.index };
    return;
  }
  const pin = e.target.closest('[data-comment]');
  if (pin) { openComment(pin.dataset.comment); return; }
  if (nodeEdit) {
    const nd = nodeEditDown(e, p);
    if (nd) { drag = nd; return; }
    const hitEl = e.target.closest('#scene > g[data-id]');
    if (!hitEl || hitEl.dataset.id !== nodeEdit.id) exitNodeEdit();
    else return;
  }
  if (['pencil', 'airbrush', 'line', 'arrow', 'pen'].includes(state.tool)) { drag = drawDown(e, p); return; }
  const handle = e.target.closest('[data-handle]');
  if (handle) {
    const h = handle.dataset.handle, o = selected()[0];
    checkpoint();
    if (h === 'rot') drag = { mode: 'rotate', o, c: center(o) };
    else if (h === 'from' || h === 'to') drag = { mode: 'endpoint', o, end: h };
    else if (h === 'curve') drag = { mode: 'curve', o };
    else drag = { mode: 'resize', o, h, start: { x: o.x, y: o.y, w: o.w, h: o.h, rot: o.rot || 0 }, font: o.fontSize };
    return;
  }
  const hit = hitObject(e.target);
  switch (state.tool) {
    case 'select': {
      if (hit) {
        if (e.shiftKey) state.sel = state.sel.includes(hit.id) ? state.sel.filter((i) => i !== hit.id) : [...state.sel, hit.id];
        else if (!state.sel.includes(hit.id)) state.sel = [hit.id];
        if (e.altKey && state.sel.length) { // alt-drag duplicates
          checkpoint();
          const copies = cloneObjects(selected(), objs(), 0);
          objs().push(...copies);
          state.sel = copies.map((c) => c.id);
        }
        drag = { mode: 'move', start: p, moved: false, clickedId: hit.id, orig: selected().map((o) => ({ o, x: o.x, y: o.y, from: { ...o.from }, to: { ...o.to } })) };
        render({ props: true });
      } else {
        if (groupEdit) { exitGroupEdit(); return; }
        drag = { mode: 'marquee', start: p, base: e.shiftKey ? [...state.sel] : [] };
        if (!e.shiftKey) { state.sel = []; render({ props: true }); }
      }
      break;
    }
    case 'badge': {
      checkpoint();
      const n = 1 + Math.max(0, ...objs().filter((o) => o.badge).map((o) => parseInt(o.label, 10) || 0));
      const o = Make.badge(n, p.x, p.y);
      objs().push(o);
      state.sel = [o.id];
      render({ props: true });
      break;
    }
    case 'comment':
      addComment(p);
      setTool('select');
      break;
    case 'shape':
    case 'rect':
    case 'ellipse': {
      checkpoint();
      const o = state.tool === 'rect' ? Make.rect(p.x, p.y, 1, 1) : state.tool === 'ellipse' ? Make.ellipse(p.x, p.y, 1, 1) : Make.shape($('#shapeKind').value, p.x, p.y, 1, 1);
      objs().push(o);
      drag = { mode: 'create', o, start: p };
      break;
    }
    case 'text': {
      if (hit && hit.type === 'text') { state.sel = [hit.id]; render({ props: true }); editText(hit, 'text'); setTool('select'); break; }
      checkpoint();
      const o = Make.text('', p.x, p.y - 10, { fontSize: 18 });
      o.w = 80;
      objs().push(o);
      state.sel = [o.id];
      setTool('select');
      render({ props: true });
      editText(o, 'text', true);
      break;
    }
    case 'connector': {
      checkpoint();
      const from = hit && hit.type !== 'connector' ? { id: hit.id } : { x: p.x, y: p.y };
      const o = Make.connector(from, { x: p.x, y: p.y });
      objs().push(o);
      drag = { mode: 'connect', o, start: p };
      break;
    }
    case 'brush': {
      drag = { mode: 'brush', pts: [p], start: p, cur: p, shape: $('#brushMode').value };
      break;
    }
  }
});

function computeResize(d, p, keepAspect) {
  const s = d.start, h = d.h;
  const hx = h.includes('w') ? 0 : h.includes('e') ? 1 : 0.5;
  const hy = h.includes('n') ? 0 : h.includes('s') ? 1 : 0.5;
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const A = rotPt({ x: c.x + (1 - hx) * s.w - s.w / 2, y: c.y + (1 - hy) * s.h - s.h / 2 }, c, s.rot);
  const dl = rotPt({ x: p.x, y: p.y }, A, -s.rot);
  let nw = hx === 0.5 ? s.w : hx === 1 ? dl.x - A.x : A.x - dl.x;
  let nh = hy === 0.5 ? s.h : hy === 1 ? dl.y - A.y : A.y - dl.y;
  nw = Math.max(6, nw); nh = Math.max(6, nh);
  if (keepAspect) {
    const r = s.w / s.h;
    if (hx === 0.5) nw = nh * r; else if (hy === 0.5) nh = nw / r; else if (nw / nh > r) nh = nw / r; else nw = nh * r;
  }
  const v = { x: A.x + nw / 2 - (1 - hx) * nw, y: A.y + nh / 2 - (1 - hy) * nh };
  const nc = rotPt(v, A, s.rot);
  return { x: nc.x - nw / 2, y: nc.y - nh / 2, w: nw, h: nh };
}

// Snap the moving selection's bounds to page and other objects; returns adjusted delta and guides.
function snapMove(dx, dy) {
  const moving = drag.orig.map((r) => r.o).filter((o) => o.type !== 'connector');
  if (!moving.length) return { dx, dy, guides: '' };
  const tmp = moving.map((o) => { const r = drag.orig.find((q) => q.o === o); return { ...o, x: r.x + dx, y: r.y + dy }; });
  const bb = unionBounds(tmp);
  const P = page(), th = 6 / state.zoom, ids = new Set(state.sel);
  if (!state.view.snap && !state.view.snapGrid) return { dx, dy, guides: '' };
  if (state.view.snapGrid) {
    const gs = state.view.gridSize;
    return { dx: dx + Math.round(bb.x / gs) * gs - bb.x, dy: dy + Math.round(bb.y / gs) * gs - bb.y, guides: '' };
  }
  const xs = [0, P.width / 2, P.width, ...((P.guides && P.guides.v) || [])], ys = [0, P.height / 2, P.height, ...((P.guides && P.guides.h) || [])];
  for (const o of objs()) {
    if (ids.has(o.id) || o.type === 'connector') continue;
    const b = bounds(o);
    xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h);
  }
  let bestX = null, bestY = null;
  for (const cand of [bb.x, bb.x + bb.w / 2, bb.x + bb.w]) for (const t of xs) { const d = t - cand; if (Math.abs(d) < th && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, t }; }
  for (const cand of [bb.y, bb.y + bb.h / 2, bb.y + bb.h]) for (const t of ys) { const d = t - cand; if (Math.abs(d) < th && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, t }; }
  let g = '';
  const sw = 1 / state.zoom;
  if (bestX) { dx += bestX.d; g += `<line x1="${bestX.t}" y1="-10000" x2="${bestX.t}" y2="10000" stroke="#e8437b" stroke-width="${sw}"/>`; }
  if (bestY) { dy += bestY.d; g += `<line x1="-10000" y1="${bestY.t}" x2="10000" y2="${bestY.t}" stroke="#e8437b" stroke-width="${sw}"/>`; }
  return { dx, dy, guides: g };
}

function smooth(pts) { // Chaikin
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y });
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function brushPointsFromDrag(d) {
  const a = d.start, b = d.cur;
  const box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
  if (d.shape === 'line') return [a, b];
  if (d.shape === 'arc') return Shapes.arc().map(([u, v]) => ({ x: box.x + u * box.w, y: box.y + v * box.h }));
  if (d.shape === 'ellipse') return Shapes.ellipse().map(([u, v]) => ({ x: box.x + u * box.w, y: box.y + v * box.h }));
  return d.pts;
}

window.addEventListener('pointermove', (e) => {
  if (!drag) { if (pen && state.tool === 'pen') renderPenPreview(toWorld(e)); return; }
  const p = toWorld(e);
  if (['pencil', 'airbrush', 'line', 'pen-node', 'node'].includes(drag.mode)) return drawMove(e, p, drag);
  switch (drag.mode) {
    case 'pan':
      state.panX = drag.px + e.clientX - drag.sx; state.panY = drag.py + e.clientY - drag.sy;
      applyViewport();
      return;
    case 'move': {
      let dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (!drag.moved) { if (Math.hypot(dx, dy) * state.zoom < 3) return; if (!e.altKey) checkpoint(); drag.moved = true; }
      let guides = '';
      if (!e.metaKey) ({ dx, dy, guides } = snapMove(dx, dy));
      for (const r of drag.orig) {
        if (r.o.type === 'connector') {
          if (!r.o.from.id) r.o.from = { x: r.from.x + dx, y: r.from.y + dy };
          if (!r.o.to.id) r.o.to = { x: r.to.x + dx, y: r.to.y + dy };
        } else { r.o.x = r.x + dx; r.o.y = r.y + dy; }
      }
      $('#guides').innerHTML = guides;
      renderScene(); renderOverlay();
      return;
    }
    case 'resize': {
      const o = drag.o;
      const lock = ['icon', 'image'].includes(o.type) ? !e.shiftKey : e.shiftKey;
      const r = computeResize(drag, p, o.type === 'text' ? true : lock);
      if (o.type === 'text') {
        o.fontSize = Math.max(4, Math.round(drag.font * (r.h / drag.start.h) * 2) / 2);
        postEdit(o); o.x = r.x; o.y = r.y;
      } else if (o.type === 'protocol') {
        o.x = r.x; o.w = r.w; postEdit(o);
      } else Object.assign(o, r);
      renderScene(); renderOverlay();
      return;
    }
    case 'rotate': {
      let a = (Math.atan2(p.y - drag.c.y, p.x - drag.c.x) * 180) / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      drag.o.rot = ((a % 360) + 360) % 360;
      renderScene(); renderOverlay();
      return;
    }
    case 'guide': {
      const g = page().guides;
      g[drag.axis][drag.index] = Math.round(drag.axis === 'v' ? p.x : p.y);
      drag.overRuler = isOverRuler(e, drag.axis);
      renderUserGuides();
      return;
    }
    case 'endpoint':
      drag.o[drag.end] = { x: p.x, y: p.y };
      renderScene(); renderOverlay(portsOverlay(objectAtPoint(e.clientX, e.clientY, drag.o.id)));
      return;
    case 'curve': {
      const [a, b] = connectorEnds({ ...drag.o, style: 'straight' }, objs());
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      drag.o.curve = 2 * ((p.x - (a.x + b.x) / 2) * (-dy / len) + (p.y - (a.y + b.y) / 2) * (dx / len));
      renderScene(); renderOverlay();
      return;
    }
    case 'marquee': {
      const x = Math.min(drag.start.x, p.x), y = Math.min(drag.start.y, p.y), w = Math.abs(p.x - drag.start.x), h = Math.abs(p.y - drag.start.y);
      const inside = objs().filter((o) => { if (o.locked) return false; const b = bounds(o, objs()); return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y; }).map((o) => o.id);
      state.sel = [...new Set([...drag.base, ...inside])];
      renderOverlay(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(59,111,214,.08)" stroke="#3b6fd6" stroke-width="${1 / state.zoom}" stroke-dasharray="${4 / state.zoom}"/>`);
      return;
    }
    case 'create': {
      const o = drag.o;
      let w = p.x - drag.start.x, h = p.y - drag.start.y;
      if (e.shiftKey) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
      o.x = Math.min(drag.start.x, drag.start.x + w); o.y = Math.min(drag.start.y, drag.start.y + h);
      o.w = Math.abs(w); o.h = Math.abs(h);
      renderScene();
      return;
    }
    case 'connect':
      drag.o.to = { x: p.x, y: p.y };
      renderScene();
      renderOverlay(portsOverlay(objectAtPoint(e.clientX, e.clientY, drag.o.id)));
      return;
    case 'brush': {
      drag.cur = p;
      const last = drag.pts[drag.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 3 / state.zoom) drag.pts.push(p);
      const pts = brushPointsFromDrag(drag);
      renderOverlay(`<polyline points="${pts.map((q) => `${q.x},${q.y}`).join(' ')}" fill="none" stroke="#e8743b" stroke-width="${2 / state.zoom}" stroke-dasharray="${5 / state.zoom}"/>`);
      return;
    }
  }
});

window.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const d = drag;
  drag = null;
  $('#guides').innerHTML = '';
  const p = toWorld(e);
  if (['pencil', 'airbrush', 'line', 'pen-node', 'node'].includes(d.mode)) {
    if (drawUp(e, p, d)) render({ props: true });
    else if (d.mode === 'pen-node') renderPenPreview(p);
    return;
  }
  switch (d.mode) {
    case 'guide':
      if (d.overRuler) page().guides[d.axis].splice(d.index, 1);
      renderUserGuides();
      break;
    case 'move':
      if (!d.moved && !e.shiftKey && state.sel.length > 1) state.sel = [d.clickedId];
      break;
    case 'create': {
      const o = d.o;
      if (o.w < 5 && o.h < 5) { o.w = 160; o.h = 100; o.x = d.start.x - 80; o.y = d.start.y - 50; }
      state.sel = [o.id];
      setTool('select');
      break;
    }
    case 'connect': case 'endpoint': {
      const o = d.o, end = d.mode === 'connect' ? 'to' : d.end;
      const target = objectAtPoint(e.clientX, e.clientY, o.id);
      const other = end === 'to' ? o.from : o.to;
      if (target && target.id !== other.id) {
        const port = nearestPort(target, p, 14 / state.zoom);
        o[end] = port ? { id: target.id, port } : { id: target.id };
      }
      if (d.mode === 'connect') {
        const len = d.start ? Math.hypot(p.x - d.start.x, p.y - d.start.y) : 99;
        if (!o.to.id && len < 8) o.to = { x: (o.from.x ?? p.x) + 120, y: o.from.y ?? p.y }; // click = default-length arrow
        if (o.from.id && o.from.id === o.to.id) { page().objects = objs().filter((x) => x !== o); break; }
        if (o.from.id && !o.to.id && len < 8) { const c = center(byId(o.from.id)); o.to = { x: c.x + byId(o.from.id).w / 2 + 120, y: c.y }; }
        state.sel = [o.id];
        setTool('select');
      }
      break;
    }
    case 'brush': {
      d.cur = p;
      if (d.shape === 'free') d.pts.push(p);
      let pts = brushPointsFromDrag(d);
      if (d.shape === 'free') pts = smooth(smooth(pts));
      const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y);
      const x = Math.min(...xs), y = Math.min(...ys), w = Math.max(...xs) - x, h = Math.max(...ys) - y;
      if (w < 6 && h < 6) { renderOverlay(); break; }
      const W = Math.max(w, 1), H = Math.max(h, 1);
      checkpoint();
      const o = Make.brush(state.brushKind, x, y, W, H, pts.map((q) => [(q.x - x) / W, (q.y - y) / H]), { closed: d.shape === 'ellipse' });
      objs().push(o);
      state.sel = [o.id];
      setTool('select');
      break;
    }
  }
  render({ props: true });
});

svg.addEventListener('dblclick', (e) => {
  if (state.tool === 'pen' && pen) { finishPen(false); return; }
  const nodeEl = e.target.closest && e.target.closest('[data-node]');
  if (nodeEdit && nodeEl) { nodeToggleSmooth(+nodeEl.dataset.node); return; }
  const o = hitObject(e.target);
  if (!o) return;
  if (o.type === 'path') { enterNodeEdit(o); return; }
  if (o.type === 'text') editText(o, 'text');
  else if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'shape' || o.type === 'connector') editText(o, 'label');
  else if (o.type === 'group') enterGroupEdit(o);
  else if (o.type === 'chart') openGraphDialog(o);
  else if (o.type === 'protocol') openProtocolDialog(o);
});

// ---------- Inline text editing ----------
let editing = null;
function editText(o, key, isNew) {
  const ta = $('#textEditor');
  editing = { o, key, isNew, before: snapshot() };
  ta.value = o[key] || '';
  const r = svg.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  const z = state.zoom;
  let fs = (o.type === 'text' ? o.fontSize : o.labelSize || (o.type === 'connector' ? 13 : 16)) * z;
  let left, top, width;
  if (o.type === 'connector') {
    const [a, b] = connectorEnds(o, objs());
    left = ((a.x + b.x) / 2) * z + state.panX - 80; top = ((a.y + b.y) / 2) * z + state.panY - fs; width = 160;
  } else {
    left = o.x * z + state.panX; top = o.y * z + state.panY; width = Math.max(80, o.w * z);
    if (o.type !== 'text') { top += (o.h * z) / 2 - fs; }
  }
  Object.assign(ta.style, { left: left + r.left - sr.left + 'px', top: top + r.top - sr.top + 'px', fontSize: fs + 'px', width: width + 'px', textAlign: o.type === 'text' ? o.align || 'left' : 'center', fontWeight: o.bold || o.labelBold ? 700 : 400 });
  ta.classList.remove('hidden');
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; if (o.type === 'text') ta.style.width = Math.max(width, (o.w + 10) * z) + 'px'; };
  ta.oninput = () => { o[key] = ta.value; postEdit(o); renderScene(); renderOverlay(); fit(); };
  fit();
  ta.focus();
  ta.select();
}
function commitTextEdit() {
  const ta = $('#textEditor');
  if (!editing) return;
  const { o, key, before } = editing;
  editing = null;
  ta.classList.add('hidden');
  o[key] = ta.value;
  if (o.type === 'text' && !o.text.trim()) {
    page().objects = objs().filter((x) => x !== o);
    state.sel = [];
  } else postEdit(o);
  if (before !== snapshot()) { state.undo.push(before); state.redo = []; markDirty(); }
  render({ props: true });
}
$('#textEditor').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); commitTextEdit(); }
});
$('#textEditor').addEventListener('blur', () => commitTextEdit());

// ---------- Keyboard ----------
const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
window.addEventListener('keydown', (e) => {
  if (!$('#present').classList.contains('hidden')) return presentKey(e);
  if (!$('#modal').classList.contains('hidden')) { if (e.key === 'Escape') closeModal(); return; }
  if (isTyping()) return;
  const mod = e.metaKey || e.ctrlKey;
  if (e.code === 'Space') { spaceDown = true; stage.classList.add('pan'); e.preventDefault(); return; }
  if (pen && (e.key === 'Enter' || e.key === 'Escape')) { finishPen(false); return; }
  if (nodeEdit && (e.key === 'Delete' || e.key === 'Backspace')) { nodeDeleteSelected(); e.preventDefault(); return; }
  if (nodeEdit && (e.key === 'Escape' || e.key === 'Enter')) { exitNodeEdit(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); e.preventDefault(); return; }
  if (e.key === 'Escape') { if (groupEdit) exitGroupEdit(); replaceTarget = null; renderLibraryBanner(); state.sel = []; setTool('select'); render({ props: true }); return; }
  if (e.key.startsWith('Arrow') && state.sel.length) {
    e.preventDefault();
    checkpoint('nudge');
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    for (const o of selected()) {
      if (o.type === 'connector') { if (!o.from.id) o.from = { x: o.from.x + dx, y: o.from.y + dy }; if (!o.to.id) o.to = { x: o.to.x + dx, y: o.to.y + dy }; }
      else { o.x += dx; o.y += dy; }
    }
    render();
    return;
  }
  if (mod && e.key === ']') { zorder(e.shiftKey ? 'front' : 'forward'); return; }
  if (mod && e.key === '[') { zorder(e.shiftKey ? 'back' : 'backward'); return; }
  if (mod) return;
  const map = { v: 'select', h: 'pan', t: 'text', r: 'rect', e: 'ellipse', c: 'connector', b: 'brush', s: 'shape', n: 'badge', m: 'comment', d: 'pencil', p: 'pen', l: 'line', a: 'arrow', w: 'airbrush' };
  if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()]);
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') { spaceDown = false; stage.classList.toggle('pan', state.tool === 'pan'); } });

// ---------- Clipboard (system clipboard, so copy/paste works across windows & with images) ----------
document.addEventListener('copy', (e) => {
  if (isTyping() || !state.sel.length) return;
  e.preventDefault();
  const sel = selected();
  const ends = {};
  sel.forEach((o) => { if (o.type === 'connector') ends[o.id] = connectorEnds(o, objs()); });
  const copy = deep(sel).map((o) => { // freeze connector ends that point outside the selection
    if (o.type !== 'connector') return o;
    const [a, b] = ends[o.id], ids = new Set(state.sel);
    if (o.from.id && !ids.has(o.from.id)) o.from = { x: a.x, y: a.y };
    if (o.to.id && !ids.has(o.to.id)) o.to = { x: b.x, y: b.y };
    return o;
  });
  e.clipboardData.setData('text/plain', 'scicanvas:' + JSON.stringify(copy));
});
document.addEventListener('cut', (e) => {
  if (isTyping() || !state.sel.length) return;
  e.preventDefault();
  e.clipboardData.setData('text/plain', 'scicanvas:' + JSON.stringify(deep(selected())));
  deleteSelection();
});
document.addEventListener('paste', async (e) => {
  if (isTyping()) return;
  e.preventDefault();
  const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
  if (files.length) { for (const f of files) await importFile(f); return; }
  const txt = e.clipboardData.getData('text/plain');
  if (txt.startsWith('scicanvas:')) {
    try { addObjects(cloneObjects(JSON.parse(txt.slice(10)), [])); } catch { toast('Could not paste'); }
  } else if (txt.trim()) {
    const c = viewCenter();
    addObjects([Make.text(txt.trim(), c.x, c.y)]);
  }
});
function readAsDataUrl(file) { return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); }); }
async function importFile(file, at) {
  const url = await readAsDataUrl(file);
  return importDataUrl(file.name || 'Pasted image', url, at);
}
// SVGs become recolourable vector icons; bitmaps become images.
async function importDataUrl(name, url, at) {
  addUpload(name, url);
  if (url.startsWith('data:image/svg+xml')) {
    try {
      const b64 = url.split(',')[1];
      const text = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      const key = addSvgAsset(name, text);
      const a = getAsset(key), ar = a.vw / a.vh, c = at || viewCenter(), size = 160;
      const w = ar >= 1 ? size : size * ar, h = ar >= 1 ? size / ar : size;
      addObjects([{ id: uid(), type: 'icon', iconId: key, x: c.x - w / 2, y: c.y - h / 2, w, h, rot: 0 }]);
      return;
    } catch (e) { /* fall back to a plain image */ }
  }
  return addImage(url, at, { source: name });
}

// ---------- Drag & drop ----------
stage.addEventListener('dragover', (e) => { e.preventDefault(); });
stage.addEventListener('drop', async (e) => {
  e.preventDefault();
  const p = toWorld(e);
  const icon = e.dataTransfer.getData('application/x-scicanvas-icon');
  const upload = e.dataTransfer.getData('application/x-scicanvas-upload');
  if (icon) return addIcon(icon, p);
  if (upload) return importDataUrl('Upload', upload, p);
  for (const f of e.dataTransfer.files) if (/image\/(png|jpe?g|svg\+xml)/.test(f.type)) await importFile(f, p);
});

function renderUploads() {
  const ups = state.doc.uploads || [];
  $('#uploadgrid').innerHTML = ups.map((u, i) => `<div class="icon-cell" draggable="true" data-up="${i}" title="${esc(u.name)}"><img src="${u.dataUrl}"><span>${esc(u.name)}</span></div>`).join('');
}
$('#uploadgrid').addEventListener('click', (e) => { const c = e.target.closest('[data-up]'); if (c) { const u = state.doc.uploads[+c.dataset.up]; importDataUrl(u.name, u.dataUrl); } });
$('#uploadgrid').addEventListener('dragstart', (e) => { const c = e.target.closest('[data-up]'); if (c) e.dataTransfer.setData('application/x-scicanvas-upload', state.doc.uploads[+c.dataset.up].dataUrl); });
$('#uploadBtn').addEventListener('click', () => runCommand('importImage'));
$$('[data-ltab]').forEach((t) => t.addEventListener('click', () => {
  $$('[data-ltab]').forEach((x) => x.classList.toggle('active', x === t));
  $('#lib-library').classList.toggle('hidden', t.dataset.ltab !== 'library');
  $('#lib-uploads').classList.toggle('hidden', t.dataset.ltab !== 'uploads');
}));


// ---------- Pages ----------
function renderPages() {
  $('#pages').innerHTML = state.doc.pages.map((p, i) => `<button class="page-tab ${i === state.pageIndex ? 'active' : ''}" data-page="${i}" title="Double-click to rename">${esc(p.name)}</button>`).join('');
}
function gotoPage(i) {
  if (i < 0 || i >= state.doc.pages.length) return;
  state.pageIndex = i; state.sel = [];
  render({ props: true, pages: true });
  zoomFit();
}
$('#pages').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) gotoPage(+b.dataset.page); });
$('#pages').addEventListener('dblclick', (e) => {
  const b = e.target.closest('[data-page]');
  if (!b) return;
  const i = +b.dataset.page, inp = document.createElement('input');
  inp.value = state.doc.pages[i].name; inp.style.width = '110px';
  b.replaceWith(inp); inp.focus(); inp.select();
  const done = () => { if (inp.value.trim()) { checkpoint(); state.doc.pages[i].name = inp.value.trim(); } renderPages(); };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = ''; inp.blur(); } });
});
$('#addPage').addEventListener('click', () => {
  checkpoint();
  const cur = page();
  state.doc.pages.splice(state.pageIndex + 1, 0, newPage(`Page ${state.doc.pages.length + 1}`, cur.width, cur.height));
  gotoPage(state.pageIndex + 1);
});
function addTemplatePage(tpl, mode = 'new') {
  checkpoint();
  const p = { id: uid(), ...tpl.build() };
  if (mode === 'replace' || !page().objects.length) { p.name = page().name; state.doc.pages[state.pageIndex] = p; }
  else { state.doc.pages.splice(state.pageIndex + 1, 0, p); state.pageIndex++; }
  gotoPage(state.pageIndex);
}

// ---------- Properties panel ----------
const R = (v) => Math.round(v * 10) / 10;
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'style') e.setAttribute('style', v);
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
function setProps(list, key, value, { rebuild = false } = {}) {
  checkpoint('prop:' + key + list.map((o) => o.id).join());
  for (const o of list) { o[key] = value; postEdit(o); }
  renderScene(); renderOverlay();
  if (rebuild) renderProps();
  renderLayers();
}
const row = (label, ...inputs) => el('div', { class: 'row' }, el('label', { textContent: label }), ...inputs);
const sect = (title, ...kids) => el('div', { class: 'sect' }, el('h3', { textContent: title }), ...kids);
function num(list, key, step = 1, min) {
  return el('input', { type: 'number', step, value: R(list[0][key] ?? 0), min, oninput: (e) => { const v = parseFloat(e.target.value); if (isFinite(v)) setProps(list, key, v); } });
}
function color(list, key) {
  const wrap = el('span', { style: 'display:contents' });
  const inp = el('input', { type: 'color', value: toHex(list[0][key]), oninput: (e) => setProps(list, key, e.target.value) });
  const none = el('button', { textContent: 'None', title: 'Transparent', onclick: () => setProps(list, key, 'none', { rebuild: true }) });
  wrap.append(inp);
  if (['fill', 'stroke', 'bg', 'fill2', 'clipStroke'].includes(key)) wrap.append(none);
  return wrap;
}
function swatches(list, key) {
  return el('div', { class: 'swatches' }, ...SWATCHES.map((c) => el('button', { class: 'swatch', style: `background:${c}`, title: c, onclick: () => setProps(list, key, c, { rebuild: true }) })));
}
function toHex(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : /^#[0-9a-f]{3}$/i.test(c || '') ? '#' + c.slice(1).split('').map((x) => x + x).join('') : '#ffffff'; }
function select(list, key, options, rebuild) {
  return el('select', { onchange: (e) => setProps(list, key, e.target.value, { rebuild }) }, ...options.map(([v, l]) => el('option', { value: v, textContent: l, selected: String(list[0][key] ?? '') === String(v) })));
}
function check(list, key, label) {
  return el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: !!list[0][key], onchange: (e) => setProps(list, key, e.target.checked) }), label);
}
function textInput(list, key, multiline) {
  return el(multiline ? 'textarea' : 'input', { type: 'text', value: list[0][key] || '', rows: 3, oninput: (e) => setProps(list, key, e.target.value) });
}
function range(list, key, min, max, step) {
  return el('input', { type: 'range', min, max, step, value: list[0][key] ?? 1, oninput: (e) => setProps(list, key, parseFloat(e.target.value)) });
}
const btn = (label, fn, cls) => el('button', { textContent: label, onclick: fn, class: cls || '' });

function arrangeSection(sel) {
  return sect('Arrange',
    el('div', { class: 'btnrow' },
      btn('Front', () => zorder('front')), btn('Forward', () => zorder('forward')), btn('Backward', () => zorder('backward')), btn('Back', () => zorder('back'))),
    el('div', { class: 'btnrow', style: 'margin-top:6px' },
      btn('Duplicate', duplicateSelection),
      btn('Save as icon', saveSelectionAsIcon),
      sel.length > 1 ? btn('Group', groupSelection) : null,
      sel.some((o) => o.type === 'group') ? btn('Ungroup', ungroupSelection) : null,
      btn('Delete', deleteSelection, 'danger')));
}
function alignSection(sel) {
  const multi = sel.length > 1;
  return sect(multi ? 'Align' : 'Align to page',
    el('div', { class: 'btnrow' }, ...[['l', '⇤ Left'], ['c', '↔ Center'], ['r', 'Right ⇥'], ['t', '⤒ Top'], ['m', '↕ Middle'], ['b', 'Bottom ⤓']].map(([m, l]) => btn(l, () => align(m)))),
    sel.length > 2 ? el('div', { class: 'btnrow', style: 'margin-top:6px' }, btn('Distribute horizontally', () => align('dh')), btn('Distribute vertically', () => align('dv'))) : null);
}

function renderProps() {
  const P = $('#props');
  P.innerHTML = '';
  const sel = selected();
  if (!sel.length) return renderPageProps(P);
  if (sel.length > 1) {
    const icons = sel.filter((o) => o.type === 'icon' && ICON_MAP[o.iconId]);
    P.append(sect(`${sel.length} objects`, el('div', { class: 'note', textContent: 'Group them (⌘G) to move, resize and rotate together.' })));
    P.append(alignSection(sel));
    if (icons.length) P.append(sect('Icon colour', row('Colour', color(icons, 'color')), swatches(icons, 'color')));
    P.append(arrangeSection(sel));
    return;
  }
  const o = sel[0], L = [o];
  const typeName = { icon: 'Icon', rect: 'Rectangle', ellipse: 'Ellipse', text: 'Text', connector: 'Connector', image: 'Image', brush: 'Brush', chart: 'Graph', protocol: 'Protocol', group: 'Group' }[o.type];
  P.append(sect(typeName, row('Name', el('input', { type: 'text', value: o.name || '', placeholder: layerName(o), oninput: (e) => setProps(L, 'name', e.target.value) }))));

  if (o.type !== 'connector') {
    P.append(sect('Position & size',
      el('div', { class: 'grid2' }, row('X', num(L, 'x')), row('Y', num(L, 'y')),
        o.type === 'text' ? null : row('W', num(L, 'w')), o.type === 'text' || o.type === 'protocol' ? null : row('H', num(L, 'h'))),
      row('Rotation', num(L, 'rot', 1), el('span', { textContent: '°' })),
      row('Opacity', range(L, 'opacity', 0.05, 1, 0.05)),
      o.type === 'icon' || o.type === 'image' ? row('', check(L, 'flipX', 'Flip horizontally')) : null,
      row('', check(L, 'locked', 'Lock position'))));
  }

  switch (o.type) {
    case 'icon':
      P.append(iconColourSection(o));
      P.append(iconLayersSection(o));
      break;
    case 'path':
      P.append(pathSection(o));
      break;
    case 'shape':
    case 'rect': case 'ellipse':
      P.append(sect('Style',
        o.type === 'shape' ? row('Shape', select(L, 'kind', SHAPES, false)) : null,
        row('Fill', color(L, 'fill')), swatches(L, 'fill'),
        row('Shading', select(L, 'shade', SHADES)),
        row('Gradient to', color(L, 'fill2'), o.fill2 ? select(L, 'gradDir', [['v', '↓'], ['h', '→']]) : null),
        row('Stroke', color(L, 'stroke')), row('Stroke W', num(L, 'strokeWidth', 0.5, 0)),
        o.type === 'rect' ? row('Corner', num(L, 'radius', 1, 0)) : null,
        row('', check(L, 'dash', 'Dashed outline'))));
      P.append(sect('Label', row('Text', textInput(L, 'label', true)), row('Size', num(L, 'labelSize', 1, 4)), row('Colour', color(L, 'labelColor')), row('', check(L, 'labelBold', 'Bold'))));
      break;
    case 'text':
      P.append(sect('Text',
        row('Content', textInput(L, 'text', true)),
        el('div', { class: 'note', textContent: 'Use ^{…} for superscript and _{…} for subscript, e.g. Ca^{2+}, CO_{2}. Double-click on canvas to edit.' }),
        row('Font', select(L, 'family', [['sans', 'Sans-serif'], ['serif', 'Serif'], ['mono', 'Monospace']])),
        row('Size', num(L, 'fontSize', 1, 4)),
        row('Colour', color(L, 'color')), swatches(L, 'color'),
        row('Style', check(L, 'bold', 'Bold'), check(L, 'italic', 'Italic')),
        row('Align', select(L, 'align', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']])),
        row('Highlight', color(L, 'bg'))));
      break;
    case 'connector':
      P.append(sect('Connector',
        row('Meaning', select(L, 'head', [['arrow', '→ Activation / leads to'], ['bar', '⊣ Inhibition'], ['open', '⟶ Open arrow'], ['dot', '● Binding / association'], ['none', '— Line only']])),
        row('Start', select(L, 'tail', [['none', 'None'], ['arrow', 'Arrow'], ['bar', 'Bar'], ['open', 'Open'], ['dot', 'Dot']])),
        row('Path', select(L, 'style', [['straight', 'Straight'], ['curved', 'Curved'], ['elbow', 'Elbow']], true)),
        row('Colour', color(L, 'color')), swatches(L, 'color'),
        row('Width', num(L, 'width', 0.5, 0.5)),
        row('', check(L, 'dash', 'Dashed (indirect / proposed)')),
        row('Label', textInput(L, 'label')), row('', check(L, 'labelItalic', 'Italic label')),
        el('div', { class: 'note', textContent: 'Arrow shape alone is ambiguous — a verb label (“binds”, “phosphorylates”, “increases expression of”) states the claim. Drag the end handles onto objects to attach them.' })));
      break;
    case 'brush':
      P.append(sect('Brush',
        row('Type', select(L, 'kind', [['membrane', 'Lipid bilayer'], ['dna', 'DNA helix'], ['actin', 'Actin filament'], ['epithelium', 'Cell layer'], ['vesicles', 'Vesicles']])),
        row('Colour', color(L, 'color')), swatches(L, 'color'),
        row('Unit size', range(L, 'size', 3, 24, 0.5)),
        row('', check(L, 'closed', 'Closed path'))));
      break;
    case 'image':
      P.append(sect('Image',
        o.source ? el('div', { class: 'note', textContent: `Source: ${o.source}` }) : null,
        el('div', { class: 'btnrow' },
          btn('Remove white background', async () => { checkpoint(); o.src = await removeWhite(o.src); renderScene(); toast('Background removed'); }),
          btn('Reset size', async () => { const s = await loadImageSize(o.src); checkpoint(); const k = Math.min(1, 420 / Math.max(s.w, s.h)); o.w = s.w * k; o.h = s.h * k; o.nw = s.w; o.nh = s.h; o.crop = null; render({ props: true }); }))));
      break;
    case 'chart': {
      const rep = renderChart(o.cfg, o.w, o.h).report;
      P.append(sect('Graph', btn('Edit data & analysis…', () => openGraphDialog(o), 'primary'), el('div', { class: 'report', style: 'margin-top:8px', textContent: rep.join('\n') })));
      break;
    }
    case 'protocol':
      P.append(sect('Protocol', btn('Edit steps…', () => openProtocolDialog(o), 'primary'),
        row('Title', textInput(L, 'title')), row('Colour', color(L, 'color')), swatches(L, 'color'),
        row('Scale', range(L, 'scale', 0.5, 2, 0.05)),
        el('div', { class: 'note', textContent: 'Drag the side handles: steps re-wrap and renumber automatically.' })));
      break;
    case 'group':
      P.append(sect('Group', el('div', { class: 'note', textContent: `${o.children.length} objects. Double-click to edit inside the group, or ungroup (⇧⌘G).` }),
        btn('Edit inside group', () => enterGroupEdit(o))));
      break;
  }
  if (canConvertToPath(o)) P.append(sect('Edit as drawing', el('div', { class: 'note', textContent: 'Turn this shape into a path whose points you can reshape.' }), btn('Convert to path', () => { checkpoint(); const i = objs().indexOf(o); objs()[i] = convertToPath(o); render({ props: true }); enterNodeEdit(objs()[i]); })));
  if (o.type !== 'connector') P.append(effectsSection(o));
  if (o.type === 'image') P.append(cropSection(o));
  P.append(alignSection(sel));
  P.append(arrangeSection(sel));
}

// ---------- Icon colour, layers, effects, crop ----------
function pathSection(o) {
  const L = [o];
  const heads = [['none', 'None'], ['arrow', 'Arrow'], ['open', 'Open arrow'], ['bar', 'Bar ⊣'], ['dot', 'Dot']];
  return sect(o.blur ? 'Shading stroke' : 'Drawing',
    btn('✎ Edit points', () => enterNodeEdit(o), 'primary'),
    el('div', { class: 'note', style: 'margin:6px 0' }, 'Or double-click the drawing. Drag points and handles; Alt-drag a handle for a sharp corner.'),
    row('Stroke', color(L, 'stroke')), swatches(L, 'stroke'),
    row('Width', num(L, 'strokeWidth', 0.5, 0)),
    o.blur ? row('Softness', range(L, 'blur', 0, 30, 0.5)) : null,
    o.blur || o.strokeOpacity != null ? row('Strength', range(L, 'strokeOpacity', 0.05, 1, 0.05)) : null,
    row('', check(L, 'closed', 'Closed shape'), check(L, 'dash', 'Dashed')),
    o.closed ? row('Fill', color(L, 'fill')) : null,
    o.closed ? swatches(L, 'fill') : null,
    o.closed ? row('Shading', select(L, 'shade', SHADES)) : null,
    o.closed ? row('Gradient to', color(L, 'fill2')) : null,
    !o.closed ? row('End', select(L, 'headEnd', heads)) : null,
    !o.closed ? row('Start', select(L, 'headStart', heads)) : null,
    !o.closed ? row('Line caps', select(L, 'cap', [['round', 'Round'], ['butt', 'Flat'], ['square', 'Square']])) : null);
}
function iconColourSection(o) {
  const L = [o], native = !!ICON_MAP[o.iconId], a = native ? null : getAsset(o.iconId);
  const setTint = (v) => { checkpoint('tint' + o.id); o.tint = v; o.colorMap = null; renderScene(); renderProps(); };
  return sect('Colour',
    native
      ? row('Colour', color(L, 'color'), btn('Reset', () => { checkpoint(); o.color = ICON_MAP[o.iconId].color; o.colorMap = null; render({ props: true }); }))
      : row('Tint', el('input', { type: 'color', value: o.tint || '#4a7fd6', oninput: (e) => setTint(e.target.value) }), btn('Original', () => setTint(null))),
    el('div', { class: 'swatches' }, ...SWATCHES.map((c) => el('button', { class: 'swatch', style: `background:${c}`, title: c, onclick: () => (native ? setProps(L, 'color', c, { rebuild: true }) : setTint(c)) }))),
    el('div', { class: 'btnrow' },
      btn('Replace icon…', () => { replaceTarget = o.id; renderLibraryBanner(); $('#search').focus(); }),
      btn(getFavs().includes(o.iconId) ? '★ Favourite' : '☆ Favourite', () => { toggleFav(o.iconId); renderProps(); renderLibrary(); })),
    a && a.pack !== 'upload' ? el('div', { class: 'note', style: 'margin-top:6px', textContent: `${a.name} — ${a.author} · ${LICENSE_NAMES[a.license] || a.license}${needsAttribution(a.license) ? ' (attribution required — see File › Credits)' : ''}` }) : null,
    el('div', { class: 'note', textContent: 'Use colour consistently: the same entity should keep the same colour across panels.' }));
}
function iconLayersSection(o) {
  const base = iconBaseColors(o).slice(0, 14);
  if (base.length < 2) return el('span');
  const map = o.colorMap || {};
  const setLayer = (c, v) => { checkpoint('layer' + o.id + c); o.colorMap = { ...(o.colorMap || {}), [c]: v }; if (v === c) delete o.colorMap[c]; renderScene(); };
  return sect('Colour layers',
    el('div', { class: 'note', style: 'margin-bottom:6px', textContent: 'Each distinct colour in the icon is a layer — recolour it, or hide it.' }),
    ...base.map((c) => el('div', { class: 'row' },
      el('span', { class: 'swatch', style: `background:${c};cursor:default` }), el('span', { textContent: '→', style: 'color:var(--muted)' }),
      el('input', { type: 'color', value: map[c] && map[c] !== 'none' ? map[c] : c, oninput: (e) => setLayer(c, e.target.value) }),
      el('label', { style: 'width:auto;color:inherit;display:flex;gap:4px;align-items:center' }, el('input', { type: 'checkbox', checked: map[c] === 'none', onchange: (e) => { setLayer(c, e.target.checked ? 'none' : c); renderProps(); } }), 'Hide'))),
    btn('Reset layers', () => { checkpoint(); o.colorMap = null; render({ props: true }); }));
}
function effectsSection(o) {
  const L = [o];
  const clipable = ['image', 'icon', 'group', 'chart'].includes(o.type);
  return sect('Effects',
    row('Glow', el('input', { type: 'color', value: o.glow || '#7cf2a8', oninput: (e) => setProps(L, 'glow', e.target.value) }), btn(o.glow ? 'Off' : 'On', () => setProps(L, 'glow', o.glow ? null : '#7cf2a8', { rebuild: true }))),
    o.glow ? row('Glow size', range(L, 'glowSize', 1, 20, 0.5)) : null,
    row('Shadow', select(L, 'shadow', [['', 'None'], ['soft', 'Soft'], ['strong', 'Strong']])),
    clipable ? row('Crop shape', select(L, 'clip', [['none', 'None'], ['ellipse', 'Circle / ellipse'], ['round', 'Rounded rectangle'], ['rect', 'Rectangle']], true)) : null,
    clipable && o.clip && o.clip !== 'none' ? row('Crop border', color(L, 'clipStroke'), num(L, 'clipStrokeWidth', 0.5, 0)) : null,
    clipable ? el('div', { class: 'note', textContent: 'Tip: a circle crop with a border makes a “zoom-in” callout. Duplicate the object, enlarge it, and circle-crop it.' }) : null);
}
function cropSection(o) {
  const c = o.crop || { l: 0, t: 0, r: 0, b: 0 };
  const set = (k, v) => {
    checkpoint('crop' + o.id);
    const before = o.crop || { l: 0, t: 0, r: 0, b: 0 };
    const visW0 = (1 - before.l - before.r) * (o.nw || o.w), scale = o.w / visW0;
    o.crop = { ...before, [k]: v };
    const visW = (1 - o.crop.l - o.crop.r) * (o.nw || o.w), visH = (1 - o.crop.t - o.crop.b) * (o.nh || o.h);
    o.w = visW * scale; o.h = visH * scale;
    renderScene(); renderOverlay();
  };
  if (!o.nw) return sect('Crop', el('div', { class: 'note', textContent: 'Use “Reset size” once to enable cropping for this image.' }));
  return sect('Crop', ...[['l', 'Left'], ['r', 'Right'], ['t', 'Top'], ['b', 'Bottom']].map(([k, l]) =>
    row(l, el('input', { type: 'range', min: 0, max: 0.45, step: 0.005, value: c[k] || 0, oninput: (e) => set(k, parseFloat(e.target.value)) }))),
    btn('Remove crop', () => { checkpoint(); const s = o.w / ((1 - (o.crop?.l || 0) - (o.crop?.r || 0)) * o.nw); o.crop = null; o.w = o.nw * s; o.h = o.nh * s; render({ props: true }); }));
}

function renderPageProps(P) {
  const p = page();
  const L = [p];
  const setPage = (k, v) => { checkpoint('page:' + k); p[k] = v; render(); };
  P.append(sect('Page',
    row('Name', el('input', { type: 'text', value: p.name, oninput: (e) => { setPage('name', e.target.value); renderPages(); } })),
    row('Preset', el('select', { onchange: (e) => { const pr = PAGE_PRESETS[+e.target.value]; if (pr) { checkpoint(); p.width = pr[1]; p.height = pr[2]; render({ props: true }); zoomFit(); } } },
      el('option', { textContent: 'Choose size…', value: '' }), ...PAGE_PRESETS.map((pr, i) => el('option', { value: i, textContent: pr[0] })))),
    el('div', { class: 'grid2' },
      row('W', el('input', { type: 'number', value: p.width, onchange: (e) => { setPage('width', Math.max(50, +e.target.value)); } })),
      row('H', el('input', { type: 'number', value: p.height, onchange: (e) => { setPage('height', Math.max(50, +e.target.value)); } }))),
    el('div', { class: 'note', textContent: `${(p.width / 96).toFixed(2)} × ${(p.height / 96).toFixed(2)} in at 1× (96 px/in). Export scales this up for print resolution.` }),
    row('Background', el('input', { type: 'color', value: toHex(p.background), oninput: (e) => setPage('background', e.target.value) }))));
  P.append(sect('Page actions', el('div', { class: 'btnrow' },
    btn('Duplicate page', () => { checkpoint(); const cp = deep(p); cp.id = uid(); cp.name += ' copy'; cp.objects = cloneObjects(p.objects, p.objects, 0); state.doc.pages.splice(state.pageIndex + 1, 0, cp); gotoPage(state.pageIndex + 1); }),
    btn('◀ Move', () => movePage(-1)), btn('Move ▶', () => movePage(1)),
    state.doc.pages.length > 1 ? btn('Delete page', () => { if (!confirm(`Delete “${p.name}”?`)) return; checkpoint(); state.doc.pages.splice(state.pageIndex, 1); gotoPage(Math.max(0, state.pageIndex - 1)); }, 'danger') : null)));
  P.append(sect('Tips', el('div', { class: 'note', innerHTML:
    'Drag icons from the library · <b>C</b> connector between objects · <b>B</b> brushes · Shift-click / drag to multi-select · Alt-drag to duplicate · Hold <b>Space</b> or use the trackpad to pan, pinch / ⌘-scroll to zoom · Paste screenshots directly · Hold ⌘ while dragging to disable snapping.' })));
}
function movePage(d) {
  const i = state.pageIndex, j = i + d;
  if (j < 0 || j >= state.doc.pages.length) return;
  checkpoint();
  const ps = state.doc.pages;
  [ps[i], ps[j]] = [ps[j], ps[i]];
  gotoPage(j);
}

function renderLayers() {
  const Lp = $('#layers');
  Lp.innerHTML = '';
  const list = [...objs()].reverse();
  if (!list.length) { Lp.append(el('div', { class: 'note', textContent: 'No objects on this page yet.' })); return; }
  for (const o of list) {
    const r = el('div', { class: 'layer' + (state.sel.includes(o.id) ? ' sel' : ''), onclick: (e) => { state.sel = e.shiftKey ? [...new Set([...state.sel, o.id])] : [o.id]; render({ props: true }); } },
      el('span', { class: 'kind', textContent: o.type }), el('span', { style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', textContent: layerName(o) }),
      el('span', { title: o.locked ? 'Unlock' : 'Lock', style: `opacity:${o.locked ? 1 : 0.3}`, textContent: o.locked ? '🔒' : '🔓', onclick: (e) => { e.stopPropagation(); checkpoint(); o.locked = !o.locked; if (o.locked) state.sel = state.sel.filter((i) => i !== o.id); render({ props: true }); } }));
    Lp.append(r);
  }
}

// Make near-white pixels transparent (for PubChem / RCSB renders and scanned artwork).
async function removeWhite(src, threshold = 238) {
  const im = new Image();
  await new Promise((r) => { im.onload = r; im.src = src; });
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const m = Math.min(d.data[i], d.data[i + 1], d.data[i + 2]);
    if (m >= threshold) d.data[i + 3] = Math.round(255 * (1 - (m - threshold) / (255 - threshold)));
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}

// Crop fully transparent margins (3D snapshots and background-stripped images).
async function trimTransparent(src, pad = 6) {
  const im = new Image();
  await new Promise((r) => { im.onload = r; im.src = src; });
  const c = document.createElement('canvas');
  c.width = im.naturalWidth; c.height = im.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return src;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

// ---------- Files ----------
function confirmDiscard() { return !state.dirty || confirm('You have unsaved changes. Discard them?'); }
function loadDoc(doc, filePath) {
  state.doc = doc;
  if (!doc.uploads) doc.uploads = [];
  if (!doc.assets) doc.assets = {};
  if (groupEdit) groupEdit = null;
  state.pageIndex = 0; state.sel = []; state.undo = []; state.redo = [];
  state.filePath = filePath || null; state.dirty = false;
  updateTitle(); renderUploads();
  render({ props: true, pages: true });
  zoomFit();
}
async function save(saveAs) {
  const target = await window.native.saveFigure({ path: state.filePath, content: JSON.stringify(state.doc), saveAs });
  if (target) { state.filePath = target; state.dirty = false; updateTitle(); toast('Saved'); addRecent(target); }
}

async function runCommand(cmd) {
  // Let native editing commands work inside text fields.
  if (isTyping() && ['undo', 'redo', 'selectAll'].includes(cmd)) return document.execCommand(cmd);
  if (isTyping() && ['duplicate', 'group', 'ungroup'].includes(cmd)) return;
  switch (cmd) {
    case 'new': if (confirmDiscard()) loadDoc(newDoc()); break;
    case 'open': {
      if (!confirmDiscard()) break;
      const r = await window.native.openFigure();
      if (r) { try { loadDoc(JSON.parse(r.content), r.path); addRecent(r.path); } catch { toast('That file could not be read'); } }
      break;
    }
    case 'save': save(false); break;
    case 'saveAs': save(true); break;
    case 'undo': undo(); break;
    case 'redo': redo(); break;
    case 'duplicate': duplicateSelection(); break;
    case 'selectAll': state.sel = objs().filter((o) => !o.locked).map((o) => o.id); render({ props: true }); break;
    case 'group': groupSelection(); break;
    case 'ungroup': ungroupSelection(); break;
    case 'zoomIn': zoomAt(1.25); break;
    case 'zoomOut': zoomAt(0.8); break;
    case 'zoomFit': zoomFit(); break;
    case 'importImage': {
      const files = await window.native.pickImages();
      for (const f of files) await importDataUrl(f.name, f.dataUrl);
      break;
    }
    case 'present': startPresent(); break;
    case 'export': openExportDialog(); break;
    case 'graph': openGraphDialog(); break;
    case 'protocol': openProtocolDialog(); break;
    case 'chem': openChemDialog(); break;
    case 'pdb': openPdbDialog(); break;
    case 'templates': openTemplatesDialog(); break;
    case 'ai': openAIDialog(); break;
    case 'aiIcon': openAIIconDialog(); break;
    case 'saveIcon': saveSelectionAsIcon(); break;
    case 'libraries': openLibrariesDialog(); break;
    case 'settings': openSettingsDialog(); break;
    case 'credits': openCreditsDialog(); break;
    case 'help': openHelpDialog(); break;
    case 'home': openHomeDialog(); break;
    case 'copyImage': copyAsImage(); break;
    case 'badgeTool': setTool('badge'); break;
    case 'commentTool': setTool('comment'); break;
    case 'toggleGrid': state.view.grid = !state.view.grid; saveView(); render(); toast(`Grid ${state.view.grid ? 'on' : 'off'}`); break;
    case 'toggleRulers': state.view.rulers = !state.view.rulers; saveView(); drawRulers(); renderUserGuides(); toast(`Rulers ${state.view.rulers ? 'on — drag from a ruler to add a guide' : 'off'}`); break;
    case 'toggleSnap': state.view.snap = !state.view.snap; saveView(); toast(`Smart alignment ${state.view.snap ? 'on' : 'off'}`); break;
    case 'toggleSnapGrid': state.view.snapGrid = !state.view.snapGrid; saveView(); toast(`Snap to grid ${state.view.snapGrid ? 'on' : 'off'}`); break;
  }
}
window.native.onMenu(runCommand);
$$('[data-cmd]').forEach((b) => b.addEventListener('click', () => runCommand(b.dataset.cmd)));

// ---------- Presentation mode ----------
let presentIndex = 0;
function startPresent() {
  presentIndex = state.pageIndex;
  $('#present').classList.remove('hidden');
  document.documentElement.requestFullscreen?.().catch(() => {});
  showSlide();
}
function showSlide() {
  const p = state.doc.pages[presentIndex];
  const k = Math.min(window.innerWidth / p.width, window.innerHeight / p.height) * 0.96;
  $('#presentStage').innerHTML = pageSvgString(p).replace('<svg ', `<svg style="width:${p.width * k}px;height:${p.height * k}px" `);
}
function presentKey(e) {
  if (e.key === 'Escape') { $('#present').classList.add('hidden'); if (document.fullscreenElement) document.exitFullscreen(); return; }
  if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) presentIndex = Math.min(presentIndex + 1, state.doc.pages.length - 1);
  if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) presentIndex = Math.max(presentIndex - 1, 0);
  showSlide();
}
$('#present').addEventListener('click', () => { presentIndex = Math.min(presentIndex + 1, state.doc.pages.length - 1); showSlide(); });
window.addEventListener('resize', () => { if (!$('#present').classList.contains('hidden')) showSlide(); });

