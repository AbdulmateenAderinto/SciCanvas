// Crop on the canvas (BioRender-style) for icons and pictures.
//
// Select an icon or picture and click Crop (floating bar, right-click menu, Properties, or Arrange › Crop). The whole
// drawing shows faded with a crop frame on top: drag the frame's corners and sides to trim, or drag inside it to slide
// the drawing under the frame. Enter or clicking outside applies; Esc cancels. Double-click a cropped object to crop
// it again; "Remove crop" in Properties restores it.
//
// A crop is stored as fractions trimmed from each side of the full drawing: o.crop = { l, t, r, b } (pictures already
// used this; render.js applies it to icons too). The object's x / y / w / h are always the visible part, so moving,
// snapping, exporting and hit-testing treat a cropped object like any other, and cropping never changes its scale.
let cropMode = null; // { id, orig, start }

const cropActive = (id) => !!cropMode && cropMode.id === id;
const cropable = (o) => !!o && (o.type === 'icon' || o.type === 'image') && !o.locked;
const noCrop = () => ({ l: 0, t: 0, r: 0, b: 0 });

// The crop as seen on screen: a flipped object shows its right-hand trim on the left.
function screenCrop(o) {
  const c = { ...noCrop(), ...(o.crop || {}) };
  return { l: o.flipX ? c.r : c.l, r: o.flipX ? c.l : c.r, t: o.flipY ? c.b : c.t, b: o.flipY ? c.t : c.b };
}
function storeCrop(o, s) {
  const c = { l: o.flipX ? s.r : s.l, r: o.flipX ? s.l : s.r, t: o.flipY ? s.b : s.t, b: o.flipY ? s.t : s.b };
  for (const k in c) c[k] = Math.round(c[k] * 1e5) / 1e5;
  o.crop = c.l || c.t || c.r || c.b ? c : null;
}
const rot = (p, deg) => { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }; };

// The full (uncropped) drawing: its size and where its centre is, in page coordinates.
function fullFrame(o) {
  const s = screenCrop(o), fw = o.w / Math.max(1e-6, 1 - s.l - s.r), fh = o.h / Math.max(1e-6, 1 - s.t - s.b);
  // Visible box centre, offset (in the object's own rotated frame) from the full drawing's centre.
  const off = { x: (s.l - s.r) * fw / 2, y: (s.t - s.b) * fh / 2 };
  const vc = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, d = rot(off, o.rot || 0);
  return { w: fw, h: fh, c: { x: vc.x - d.x, y: vc.y - d.y }, rot: o.rot || 0 };
}
// Set a new on-screen crop, keeping the full drawing exactly where it is.
function applyScreenCrop(o, F, s) {
  const min = 0.03;
  s.l = Math.max(0, Math.min(s.l, 1 - s.r - min)); s.r = Math.max(0, Math.min(s.r, 1 - s.l - min));
  s.t = Math.max(0, Math.min(s.t, 1 - s.b - min)); s.b = Math.max(0, Math.min(s.b, 1 - s.t - min));
  const w = F.w * (1 - s.l - s.r), h = F.h * (1 - s.t - s.b);
  const d = rot({ x: (s.l - s.r) * F.w / 2, y: (s.t - s.b) * F.h / 2 }, F.rot);
  o.w = w; o.h = h; o.x = F.c.x + d.x - w / 2; o.y = F.c.y + d.y - h / 2;
  storeCrop(o, s);
}

async function startCrop(o = selected()[0]) {
  if (!cropable(o)) { toast('Select an icon or picture to crop'); return; }
  if (o.type === 'image' && !o.nw && typeof loadImageSize === 'function') { // older pictures don't know their pixel size yet
    const sz = await loadImageSize(o.src); o.nw = sz.w; o.nh = sz.h;
  }
  if (cropMode) finishCrop(true);
  checkpoint();
  cropMode = { id: o.id, orig: { x: o.x, y: o.y, w: o.w, h: o.h, crop: o.crop ? { ...o.crop } : null, clip: o.clip || null, clipPath: o.clipPath ? { ...o.clipPath } : null } };
  state.sel = [o.id];
  render({ props: true });
  updateCropBar();
  drawCropUI();
  toast('Drag the corners or sides to crop · drag inside to move the drawing · pick a shape above · Enter to finish, Esc to cancel');
}
function finishCrop(apply = true) {
  if (!cropMode) return;
  const o = byId(cropMode.id);
  if (o && !apply) Object.assign(o, cropMode.orig);
  cropMode = null;
  cropBar().classList.add('hidden');
  drawCropUI();
  render({ props: true });
}
function resetCrop(o = selected()[0]) {
  if (!o || (!o.crop && !o.clipPath && (!o.clip || o.clip === 'none'))) return;
  checkpoint();
  applyScreenCrop(o, fullFrame(o), noCrop());
  o.clip = null; o.clipPath = null;
  render({ props: true });
}

// ---------- Drawing the crop frame ----------
function cropLayer() {
  let g = document.getElementById('croplayer');
  if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'croplayer'; document.getElementById('overlay').after(g); }
  return g;
}
function drawCropUI() {
  const g = cropLayer();
  const o = cropMode && byId(cropMode.id);
  if (!o) { g.innerHTML = ''; cropMode = null; return; }
  const z = state.zoom, F = fullFrame(o), s = screenCrop(o);
  const ghost = { ...o, crop: null, x: F.c.x - F.w / 2, y: F.c.y - F.h / 2, w: F.w, h: F.h, id: o.id + '-cropghost' };
  // Full drawing, faded, in the drawing's own frame; then the crop window on top of it.
  let svgS = `<g opacity="0.35" pointer-events="none">${renderObjectString(ghost, objs())}</g>`;
  const L = -F.w / 2 + s.l * F.w, T = -F.h / 2 + s.t * F.h, W = o.w, H = o.h, k = 1 / z;
  svgS += `<g transform="translate(${F.c.x} ${F.c.y}) rotate(${F.rot})">`;
  svgS += `<rect x="${-F.w / 2}" y="${-F.h / 2}" width="${F.w}" height="${F.h}" fill="none" stroke="#7a8a96" stroke-width="${k}" stroke-dasharray="${4 * k}" pointer-events="none"/>`;
  svgS += `<rect data-crop="move" x="${L}" y="${T}" width="${W}" height="${H}" fill="transparent" stroke="#1f2937" stroke-width="${1.5 * k}" style="cursor:move"/>`;
  // The chosen crop shape, outlined inside the frame (circle, rounded or the custom outline).
  const shp = cropShapeOf(o);
  if (shp !== 'rect') {
    const dash = `fill="none" stroke="#3b6fd6" stroke-width="${2 * k}" stroke-dasharray="${6 * k} ${4 * k}" pointer-events="none"`;
    if (shp === 'ellipse') svgS += `<ellipse cx="${L + W / 2}" cy="${T + H / 2}" rx="${W / 2}" ry="${H / 2}" ${dash}/>`;
    else if (shp === 'round') svgS += `<rect x="${L}" y="${T}" width="${W}" height="${H}" rx="${Math.min(W, H) * 0.12}" ${dash}/>`;
    else if (o.clipPath) { // stored in the object's own (possibly flipped) box: mirror back for the screen
      const cp = o.clipPath, sx = W / (cp.w || W), sy = H / (cp.h || H);
      svgS += `<g transform="translate(${L + (o.flipX ? W : 0)} ${T + (o.flipY ? H : 0)}) scale(${(o.flipX ? -1 : 1) * sx} ${(o.flipY ? -1 : 1) * sy})"><path d="${cp.d}" ${dash.replace(`stroke-width="${2 * k}"`, `stroke-width="${2 * k / Math.min(sx, sy)}" vector-effect="non-scaling-stroke"`)}/></g>`;
    }
  }
  for (const f of [1 / 3, 2 / 3]) svgS += `<path d="M${L + W * f} ${T}V${T + H}M${L} ${T + H * f}H${L + W}" stroke="#fff" stroke-opacity=".7" stroke-width="${k}" pointer-events="none"/>`;
  // Thick dark corner brackets and side bars, each with a larger invisible grab area.
  const arm = Math.min(14 * k, W / 3, H / 3), t = 4 * k;
  const pos = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
  const cur = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw' };
  for (const [h, [u, v]] of Object.entries(pos)) {
    const x = L + u * W, y = T + v * H, style = `cursor:${cur[h]}-resize`;
    let d;
    if (h.length === 2) { const sx = u ? -1 : 1, sy = v ? -1 : 1; d = `M${x} ${y + sy * arm}V${y}H${x + sx * arm}`; }
    else if (h === 'n' || h === 's') d = `M${x - arm / 2} ${y}H${x + arm / 2}`;
    else d = `M${x} ${y - arm / 2}V${y + arm / 2}`;
    svgS += `<path d="${d}" fill="none" stroke="#1f2937" stroke-width="${t}" stroke-linecap="square" pointer-events="none"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${t * 0.45}" stroke-linecap="square" pointer-events="none"/>`;
    svgS += `<circle data-crop="${h}" cx="${x}" cy="${y}" r="${10 * k}" fill="transparent" style="${style}"/>`;
  }
  svgS += '</g>';
  if (cropMode.drawing && cropMode.drawing.pts.length > 1) { // the custom outline being drawn
    const d = 'M' + cropMode.drawing.pts.map((q) => `${q.x} ${q.y}`).join('L');
    svgS += `<path d="${d}" fill="rgba(59,111,214,.12)" stroke="#3b6fd6" stroke-width="${2 * k}" stroke-dasharray="${5 * k} ${3 * k}" pointer-events="none"/>`;
  }
  g.innerHTML = svgS;
  placeCropBar(g);
}

// ---------- Interaction ----------
function cropPointerDown(e) {
  if (!cropMode || e.button !== 0 || !(e.target.closest && e.target.closest('#svg'))) return;
  const o = byId(cropMode.id);
  if (!o) { cropMode = null; return; }
  const hit = e.target.closest('[data-crop]');
  e.stopPropagation(); e.preventDefault();
  if (cropMode.drawing) { drawOutline(o, e); return; }
  if (!hit) { finishCrop(true); return; } // a click outside the frame applies the crop
  const st = { h: hit.dataset.crop, F: fullFrame(o), s: screenCrop(o), p: toWorld(e) };
  const move = (ev) => {
    const q = toWorld(ev), d = rot({ x: q.x - st.p.x, y: q.y - st.p.y }, -st.F.rot), dx = d.x / st.F.w, dy = d.y / st.F.h;
    const s = { ...st.s };
    let F = st.F;
    if (st.h === 'move') { // the frame stays put and the drawing slides underneath it, as far as its edges allow
      const mx = Math.max(-st.s.r, Math.min(st.s.l, dx)), my = Math.max(-st.s.b, Math.min(st.s.t, dy));
      s.l -= mx; s.r += mx; s.t -= my; s.b += my;
      const shift = rot({ x: mx * F.w, y: my * F.h }, F.rot);
      F = { ...F, c: { x: F.c.x + shift.x, y: F.c.y + shift.y } };
    } else {
      if (st.h.includes('w')) s.l = st.s.l + dx;
      if (st.h.includes('e')) s.r = st.s.r - dx;
      if (st.h.includes('n')) s.t = st.s.t + dy;
      if (st.h.includes('s')) s.b = st.s.b - dy;
    }
    applyScreenCrop(o, F, s);
    renderSceneOnly(new Set([o.id]));
    renderOverlay();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); render({ props: true }); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// ---------- Crop shape: rectangle, rounded, circle or a custom outline ----------
// Circle and rounded use the object's clip shape (o.clip), a custom outline its clip path (o.clipPath), both drawn
// inside the crop frame by render.js and exported like any other crop shape.
const CROP_SHAPES = [['rect', 'Rectangle', '<rect x="3" y="4" width="12" height="10" fill="none" stroke="currentColor" stroke-width="1.6"/>'],
  ['round', 'Rounded', '<rect x="3" y="4" width="12" height="10" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.6"/>'],
  ['ellipse', 'Circle', '<circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>'],
  ['custom', 'Custom', '<path d="M4 12C2 7 7 2 11 4s5 6 2 9-7 3-9-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.4 1.6"/>']];
const cropShapeOf = (o) => (o.clipPath ? 'custom' : o.clip === 'ellipse' ? 'ellipse' : o.clip === 'round' || o.clip === 'rounded' ? 'round' : 'rect');
function cropBar() {
  let b = document.getElementById('cropbar');
  if (!b) {
    b = document.createElement('div');
    b.id = 'cropbar';
    b.className = 'hidden';
    b.innerHTML = '<span class="cb-title">Crop shape</span>' + CROP_SHAPES.map(([k, l, svgI]) => `<button type="button" data-shape="${k}" title="${k === 'custom' ? 'Draw your own outline on the drawing' : l + ' crop'}"><svg viewBox="0 0 18 18" width="16" height="16">${svgI}</svg><span>${l}</span></button>`).join('')
      + '<span class="cb-sep"></span><button type="button" data-act="cancel" title="Esc">Cancel</button><button type="button" data-act="done" class="primary" title="Enter">Done</button>';
    document.getElementById('stage').append(b);
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || !cropMode) return;
      if (btn.dataset.act) return finishCrop(btn.dataset.act === 'done');
      setCropShape(btn.dataset.shape);
    });
  }
  return b;
}
function updateCropBar() {
  const b = cropBar(), o = cropMode && byId(cropMode.id);
  b.classList.toggle('hidden', !o);
  if (!o) return;
  const cur = cropMode.drawing ? 'custom' : cropShapeOf(o);
  for (const btn of b.querySelectorAll('[data-shape]')) btn.classList.toggle('on', btn.dataset.shape === cur);
  b.classList.toggle('drawing', !!cropMode.drawing);
  const t = b.querySelector('.cb-title');
  t.textContent = cropMode.drawing ? 'Draw the outline on the drawing' : 'Crop shape';
}
function placeCropBar(layer) {
  const b = cropBar();
  if (!cropMode || b.classList.contains('hidden')) return;
  const fr = layer.querySelector('[data-crop="move"]');
  if (!fr) return;
  const r = fr.getBoundingClientRect(), sr = document.getElementById('stage').getBoundingClientRect();
  const bw = b.offsetWidth, bh = b.offsetHeight;
  let y = r.top - sr.top - bh - 22;
  if (y < 6) y = r.bottom - sr.top + 16;
  b.style.left = Math.max(6, Math.min(sr.width - bw - 6, r.left - sr.left + r.width / 2 - bw / 2)) + 'px';
  b.style.top = Math.max(6, Math.min(sr.height - bh - 6, y)) + 'px';
}
function setCropShape(kind) {
  const o = byId(cropMode.id);
  if (!o) return;
  cropMode.drawing = null;
  if (kind === 'custom') { cropMode.drawing = { pts: [] }; updateCropBar(); drawCropUI(); toast('Drag around the part to keep · Esc to stop drawing'); return; }
  o.clipPath = null;
  o.clip = kind === 'rect' ? null : kind;
  if (kind === 'ellipse') { // a circle: make the frame square around its centre
    const F = fullFrame(o), sc = screenCrop(o), side = Math.min(o.w, o.h);
    const cx = sc.l + (1 - sc.l - sc.r) / 2, cy = sc.t + (1 - sc.t - sc.b) / 2, hw = side / F.w / 2, hh = side / F.h / 2;
    const ccx = Math.max(hw, Math.min(1 - hw, cx)), ccy = Math.max(hh, Math.min(1 - hh, cy));
    applyScreenCrop(o, F, { l: ccx - hw, r: 1 - ccx - hw, t: ccy - hh, b: 1 - ccy - hh });
  }
  render({ props: true });
  updateCropBar();
}
// Freehand outline: points in page coordinates while drawing, then stored in the object's own box (unrotated, and
// mirrored back when the object is flipped) as its clip path; the frame shrinks to fit the outline.
function drawOutline(o, e) {
  const pts = cropMode.drawing.pts = [toWorld(e)];
  const move = (ev) => {
    const q = toWorld(ev), last = pts[pts.length - 1];
    if (Math.hypot(q.x - last.x, q.y - last.y) * state.zoom >= 2) { pts.push(q); drawCropUI(); }
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    if (cropMode) applyOutline(o, pts);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}
function applyOutline(o, pts) {
  const F = fullFrame(o);
  // Into the full drawing's frame: unrotated, origin at its top-left (screen orientation).
  const loc = pts.map((p) => { const q = rot({ x: p.x - F.c.x, y: p.y - F.c.y }, -F.rot); return { x: q.x + F.w / 2, y: q.y + F.h / 2 }; })
    .map((q) => ({ x: Math.max(0, Math.min(F.w, q.x)), y: Math.max(0, Math.min(F.h, q.y)) }));
  const xs = loc.map((q) => q.x), ys = loc.map((q) => q.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (loc.length < 4 || (x1 - x0) * state.zoom < 8 || (y1 - y0) * state.zoom < 8) { cropMode.drawing = { pts: [] }; drawCropUI(); toast('Drag around the part to keep'); return; }
  // Frame = the outline's bounding box; the outline is kept relative to it.
  applyScreenCrop(o, F, { l: x0 / F.w, r: 1 - x1 / F.w, t: y0 / F.h, b: 1 - y1 / F.h });
  const w = o.w, h = o.h, r2 = (n) => Math.round(n * 100) / 100;
  const local = loc.map((q) => ({ x: q.x - x0, y: q.y - y0 })).map((q) => ({ x: o.flipX ? w - q.x : q.x, y: o.flipY ? h - q.y : q.y }));
  o.clip = null;
  o.clipPath = { d: 'M' + local.map((q) => `${r2(q.x)} ${r2(q.y)}`).join('L') + 'Z', w, h };
  cropMode.drawing = null;
  render({ props: true });
  updateCropBar();
  drawCropUI();
}

function setupCrop() {
  const st = document.getElementById('stage');
  st.addEventListener('pointerdown', cropPointerDown, true);
  window.addEventListener('keydown', (e) => {
    if (!cropMode) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finishCrop(true); }
    else if (e.key === 'Escape' && cropMode.drawing) { e.preventDefault(); e.stopPropagation(); cropMode.drawing = null; updateCropBar(); drawCropUI(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finishCrop(false); }
  }, true);
  // Double-click a cropped icon or picture to adjust its crop.
  st.addEventListener('dblclick', (e) => {
    const el = e.target.closest && e.target.closest('#scene > g[data-id]');
    const o = el && byId(el.dataset.id);
    if (o && o.crop && cropable(o) && state.tool === 'select') { e.stopPropagation(); startCrop(o); }
  }, true);
  // Keep the frame in step with zooming, panning, undo and anything else that redraws the overlay.
  const ro = renderOverlay;
  renderOverlay = function (...a) { const r = ro.apply(this, a); if (cropMode) { if (!byId(cropMode.id) || !state.sel.includes(cropMode.id)) { cropMode = null; cropLayer().innerHTML = ''; } else drawCropUI(); } return r; };
}
if (typeof ARRANGE_COMMANDS !== 'undefined') Object.assign(ARRANGE_COMMANDS, { cropStart: () => startCrop(), cropReset: () => resetCrop() });
setupCrop();
