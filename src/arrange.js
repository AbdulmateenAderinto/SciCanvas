// Arranging: smart guides (alignment, equal spacing, distances), resize snapping, z-order & align
// commands, flip / match size / lock / hide, the floating context bar, the right-click menu,
// and the layers panel (drag to reorder, show/hide, lock, rename, group contents).

const GUIDE_ALIGN = '#e8437b', GUIDE_SPACE = '#8a4fff';

// ---------- Smart guides ----------
function guideTargets() {
  // Nothing else moves during a drag, so work the targets out once per drag rather than every frame.
  if (typeof drag !== 'undefined' && drag && drag.snapTargets) return drag.snapTargets;
  const ids = new Set(state.sel);
  if (typeof drag !== 'undefined' && drag && drag.orig) for (const r of drag.orig) ids.add(r.o.id); // docked riders too
  const out = objs().filter((o) => !ids.has(o.id) && o.type !== 'connector' && !o.hidden && !(groupEdit && !groupEdit.ids.has(o.id))).map((o) => bounds(o));
  if (typeof drag !== 'undefined' && drag) drag.snapTargets = out;
  return out;
}
function label(x, y, text) {
  const z = state.zoom, fs = 10.5 / z, w = (text.length * 6.2 + 8) / z, h = 15 / z;
  return `<g><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${3 / z}" fill="${GUIDE_SPACE}"/><text x="${x}" y="${y + fs * 0.36}" font-size="${fs}" font-family="Helvetica, Arial" font-weight="600" fill="#fff" text-anchor="middle">${text}</text></g>`;
}
function hDim(x1, x2, y) { // horizontal dimension line with end ticks + label
  const z = state.zoom, t = 4 / z;
  return `<path d="M${x1} ${y}H${x2}M${x1} ${y - t}V${y + t}M${x2} ${y - t}V${y + t}" stroke="${GUIDE_SPACE}" stroke-width="${1 / z}"/>` + label((x1 + x2) / 2, y, String(Math.round(x2 - x1)));
}
function vDim(y1, y2, x) {
  const z = state.zoom, t = 4 / z;
  return `<path d="M${x} ${y1}V${y2}M${x - t} ${y1}H${x + t}M${x - t} ${y2}H${x + t}" stroke="${GUIDE_SPACE}" stroke-width="${1 / z}"/>` + label(x, (y1 + y2) / 2, String(Math.round(y2 - y1)));
}
const overlapY = (a, b) => a.y < b.y + b.h && b.y < a.y + a.h;
const overlapX = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w;

// Candidate positions for the moving box's left edge (axis 'x') or top edge (axis 'y').
function axisCandidates(bb, others, axis) {
  const P = page();
  const pos = axis === 'x' ? 'x' : 'y', size = axis === 'x' ? 'w' : 'h';
  const overlap = axis === 'x' ? overlapY : overlapX;
  const out = [];
  // Alignment: edges and centres of other objects, page edges/centre, ruler guides.
  const lines = [[0, null], [(axis === 'x' ? P.width : P.height) / 2, null], [axis === 'x' ? P.width : P.height, null], ...(((P.guides && P.guides[axis === 'x' ? 'v' : 'h']) || []).map((g) => [g, null]))];
  for (const b of others) lines.push([b[pos], b], [b[pos] + b[size] / 2, b], [b[pos] + b[size], b]);
  for (const [t, ref] of lines) {
    for (const [off, name] of [[0, 'start'], [bb[size] / 2, 'mid'], [bb[size], 'end']]) out.push({ kind: 'align', value: t - off, line: t, ref, name });
  }
  // Equal spacing with neighbours in the same row (x) / column (y).
  const mates = others.filter((b) => overlap(b, bb)).sort((a, b) => a[pos] - b[pos]);
  const before = mates.filter((b) => b[pos] + b[size] <= bb[pos] + bb[size] / 2);
  const after = mates.filter((b) => b[pos] >= bb[pos] + bb[size] / 2);
  const L = before[before.length - 1], R = after[0];
  if (L && R) out.push({ kind: 'between', value: (L[pos] + L[size] + R[pos] - bb[size]) / 2, L, R });
  if (L && before.length > 1) { const L2 = before[before.length - 2], g = L[pos] - (L2[pos] + L2[size]); if (g > 0) out.push({ kind: 'repeat', value: L[pos] + L[size] + g, A: L2, B: L, side: 'after' }); }
  if (R && after.length > 1) { const R2 = after[1], g = R2[pos] - (R[pos] + R[size]); if (g > 0) out.push({ kind: 'repeat', value: R[pos] - g - bb[size], A: R, B: R2, side: 'before' }); }
  return out;
}
function bestCandidate(cands, current, th) {
  let best = null;
  for (const c of cands) { const d = c.value - current; if (Math.abs(d) <= th && (!best || Math.abs(d) < Math.abs(best.d) - 1e-6 || (Math.abs(Math.abs(d) - Math.abs(best.d)) < 1e-6 && c.kind !== 'align'))) best = { ...c, d }; }
  return best;
}
function drawAxisGuide(c, bb, axis) {
  const z = state.zoom, sw = 1 / z;
  if (c.kind === 'align') {
    const span = c.ref ? [Math.min(axis === 'x' ? bb.y : bb.x, axis === 'x' ? c.ref.y : c.ref.x), Math.max(axis === 'x' ? bb.y + bb.h : bb.x + bb.w, axis === 'x' ? c.ref.y + c.ref.h : c.ref.x + c.ref.w)] : [-100000, 100000];
    return axis === 'x'
      ? `<line x1="${c.line}" y1="${span[0] - 8 / z}" x2="${c.line}" y2="${span[1] + 8 / z}" stroke="${GUIDE_ALIGN}" stroke-width="${sw}"/>`
      : `<line x1="${span[0] - 8 / z}" y1="${c.line}" x2="${span[1] + 8 / z}" y2="${c.line}" stroke="${GUIDE_ALIGN}" stroke-width="${sw}"/>`;
  }
  const dims = [];
  const gapPairs = c.kind === 'between' ? [[c.L, bb], [bb, c.R]] : c.side === 'after' ? [[c.A, c.B], [c.B, bb]] : [[bb, c.A], [c.A, c.B]];
  for (const [a, b] of gapPairs) {
    if (axis === 'x') { const y = Math.max(a.y, b.y) + (Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)) / 2; dims.push(hDim(a.x + a.w, b.x, y)); }
    else { const x = Math.max(a.x, b.x) + (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) / 2; dims.push(vDim(a.y + a.h, b.y, x)); }
  }
  return dims.join('');
}
// Distances to the nearest neighbour on each side (shown while dragging, BioRender-style).
function distanceGuides(bb, others, skipX, skipY) {
  let s = '';
  const near = (list, d) => list.reduce((m, b) => (!m || d(b) < d(m) ? b : m), null);
  const left = near(others.filter((b) => overlapY(b, bb) && b.x + b.w <= bb.x), (b) => bb.x - (b.x + b.w));
  const right = near(others.filter((b) => overlapY(b, bb) && b.x >= bb.x + bb.w), (b) => b.x - (bb.x + bb.w));
  const up = near(others.filter((b) => overlapX(b, bb) && b.y + b.h <= bb.y), (b) => bb.y - (b.y + b.h));
  const down = near(others.filter((b) => overlapX(b, bb) && b.y >= bb.y + bb.h), (b) => b.y - (bb.y + bb.h));
  const cy = (b) => (Math.max(b.y, bb.y) + Math.min(b.y + b.h, bb.y + bb.h)) / 2, cx = (b) => (Math.max(b.x, bb.x) + Math.min(b.x + b.w, bb.x + bb.w)) / 2;
  if (!skipX && left && bb.x - (left.x + left.w) < 400) s += hDim(left.x + left.w, bb.x, cy(left));
  if (!skipX && right && right.x - (bb.x + bb.w) < 400) s += hDim(bb.x + bb.w, right.x, cy(right));
  if (!skipY && up && bb.y - (up.y + up.h) < 400) s += vDim(up.y + up.h, bb.y, cx(up));
  if (!skipY && down && down.y - (bb.y + bb.h) < 400) s += vDim(bb.y + bb.h, down.y, cx(down));
  return s;
}

function snapMove(dx, dy) {
  const moving = drag.orig.filter((r) => r.o.type !== 'connector');
  if (!moving.length) return { dx, dy, guides: '' };
  const tmp = moving.map((r) => ({ ...r.o, x: r.x + dx, y: r.y + dy }));
  let bb = unionBounds(tmp);
  if (!state.view.snap && !state.view.snapGrid) return { dx, dy, guides: '' };
  if (state.view.snapGrid) {
    const gs = state.view.gridSize;
    return { dx: dx + Math.round(bb.x / gs) * gs - bb.x, dy: dy + Math.round(bb.y / gs) * gs - bb.y, guides: '' };
  }
  const th = 6 / state.zoom, others = guideTargets();
  const bx = bestCandidate(axisCandidates(bb, others, 'x'), bb.x, th);
  if (bx) { dx += bx.d; bb = { ...bb, x: bb.x + bx.d }; }
  const by = bestCandidate(axisCandidates(bb, others, 'y'), bb.y, th);
  if (by) { dy += by.d; bb = { ...bb, y: bb.y + by.d }; }
  let g = '';
  if (bx) g += drawAxisGuide(bx, bb, 'x');
  if (by) g += drawAxisGuide(by, bb, 'y');
  if (state.view.distances !== false) g += distanceGuides(bb, others, bx && bx.kind !== 'align', by && by.kind !== 'align');
  return { dx, dy, guides: g };
}

// ---------- Resize snapping ----------
// Edges snap to other objects' edges / centres, the page and ruler guides; the size snaps to the width or
// height of other objects (shown with matching dimension lines). Works with locked proportions too
// (icons and images), where the whole size scales to the nearest match. Hold ⌘ / Ctrl to resize freely.
const snapOff = (e) => !!e && (e.metaKey || e.ctrlKey);
function sizeTargets() {
  if (typeof drag !== 'undefined' && drag && drag.sizeTargets) return drag.sizeTargets;
  const ids = new Set(state.sel);
  const out = objs().filter((o) => !ids.has(o.id) && o.type !== 'connector' && !o.hidden && o.w > 1 && o.h > 1 && !((o.rot || 0) % 360) && !(groupEdit && !groupEdit.ids.has(o.id)))
    .map((o) => ({ w: o.w, h: o.h, b: bounds(o) }));
  if (typeof drag !== 'undefined' && drag) drag.sizeTargets = out;
  return out;
}
// Keep the side or corner opposite the dragged handle in place while changing the size.
function resizeFromAnchor(r, h, nw, nh) {
  const x = h.includes('w') ? r.x + r.w - nw : h.includes('e') ? r.x : r.x + r.w / 2 - nw / 2;
  const y = h.includes('n') ? r.y + r.h - nh : h.includes('s') ? r.y : r.y + r.h / 2 - nh / 2;
  Object.assign(r, { x, y, w: nw, h: nh });
}
// Equal-size marks: a dimension line on the resized box and on up to three matching objects.
function sizeMatchGuides(r, dim, value) {
  const z = state.zoom, off = 12 / z;
  const same = sizeTargets().filter((t) => Math.abs(t[dim] - value) < 0.5)
    .sort((a, b) => Math.hypot(a.b.x - r.x, a.b.y - r.y) - Math.hypot(b.b.x - r.x, b.b.y - r.y)).slice(0, 3);
  const mark = (b) => (dim === 'w' ? hDim(b.x, b.x + b.w, b.y - off) : vDim(b.y, b.y + b.h, b.x - off));
  return mark(r) + same.map((t) => mark(t.b)).join('');
}
function nearestWithin(v, list, th) {
  let best = null;
  for (const t of list) if (Math.abs(t - v) <= th && (best === null || Math.abs(t - v) < Math.abs(best - v))) best = t;
  return best;
}
function snapResize(d, r, keepAspect, e) {
  const z = state.zoom;
  const sizeLabel = () => label(r.x + r.w / 2, r.y + r.h + 14 / z, `${Math.round(r.w)} × ${Math.round(r.h)}`);
  if (!state.view.snap || snapOff(e) || (d.start.rot || 0) % 360) return sizeLabel();
  const th = 6 / z, others = guideTargets(), P = page();
  const xs = [0, P.width / 2, P.width, ...((P.guides && P.guides.v) || [])], ys = [0, P.height / 2, P.height, ...((P.guides && P.guides.h) || [])];
  for (const b of others) { xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h); }
  const sizes = sizeTargets(), widths = sizes.map((t) => t.w), heights = sizes.map((t) => t.h);
  const hx = d.h.includes('e') ? 'e' : d.h.includes('w') ? 'w' : null, hy = d.h.includes('s') ? 's' : d.h.includes('n') ? 'n' : null;
  const line = (axis, t) => (axis === 'x' ? `<line x1="${t}" y1="-100000" x2="${t}" y2="100000" stroke="${GUIDE_ALIGN}" stroke-width="${1 / z}"/>` : `<line x1="-100000" y1="${t}" x2="100000" y2="${t}" stroke="${GUIDE_ALIGN}" stroke-width="${1 / z}"/>`);
  let g = '';
  if (!keepAspect) {
    let doneX = false, doneY = false;
    if (hx === 'e') { const t = nearestWithin(r.x + r.w, xs, th); if (t !== null && t - r.x > 6) { r.w = t - r.x; g += line('x', t); doneX = true; } }
    if (hx === 'w') { const t = nearestWithin(r.x, xs, th); if (t !== null && r.x + r.w - t > 6) { r.w += r.x - t; r.x = t; g += line('x', t); doneX = true; } }
    if (hy === 's') { const t = nearestWithin(r.y + r.h, ys, th); if (t !== null && t - r.y > 6) { r.h = t - r.y; g += line('y', t); doneY = true; } }
    if (hy === 'n') { const t = nearestWithin(r.y, ys, th); if (t !== null && r.y + r.h - t > 6) { r.h += r.y - t; r.y = t; g += line('y', t); doneY = true; } }
    if (hx && !doneX) { const w = nearestWithin(r.w, widths, th); if (w !== null) { resizeFromAnchor(r, hx + (hy || ''), w, r.h); g += sizeMatchGuides(r, 'w', w); } }
    if (hy && !doneY) { const h = nearestWithin(r.h, heights, th); if (h !== null) { resizeFromAnchor(r, (hx || '') + hy, r.w, h); g += sizeMatchGuides(r, 'h', h); } }
  } else {
    // Proportions locked: collect the widths that would land on something, pick the closest.
    const ratio = r.w / r.h, cands = [];
    if (hx) {
      for (const t of xs) cands.push({ w: hx === 'e' ? t - r.x : r.x + r.w - t, d: Math.abs(t - (hx === 'e' ? r.x + r.w : r.x)), kind: 'edge', axis: 'x', t });
      for (const w of widths) cands.push({ w, d: Math.abs(w - r.w), kind: 'w', v: w });
    }
    if (hy) {
      for (const t of ys) cands.push({ w: (hy === 's' ? t - r.y : r.y + r.h - t) * ratio, d: Math.abs(t - (hy === 's' ? r.y + r.h : r.y)), kind: 'edge', axis: 'y', t });
      for (const h of heights) cands.push({ w: h * ratio, d: Math.abs(h - r.h), kind: 'h', v: h });
    }
    let best = null;
    for (const c of cands) if (c.d <= th && c.w > 6 && (!best || c.d < best.d)) best = c;
    if (best) {
      resizeFromAnchor(r, d.h, best.w, best.w / ratio);
      g += best.kind === 'edge' ? line(best.axis, best.t) : sizeMatchGuides(r, best.kind, best.v);
    }
  }
  return g + sizeLabel();
}
// New shapes drawn with the rectangle / ellipse / shape tools snap to the sizes of existing objects.
function snapCreateSize(w, h, e) {
  if (!state.view.snap || snapOff(e)) return { w, h, guides: '' };
  const th = 6 / state.zoom, sizes = sizeTargets();
  const W = nearestWithin(Math.abs(w), sizes.map((t) => t.w), th), H = nearestWithin(Math.abs(h), sizes.map((t) => t.h), th);
  return { w: W !== null ? Math.sign(w || 1) * W : w, h: H !== null ? Math.sign(h || 1) * H : h, W, H };
}

// ---------- Angle snapping ----------
// Rotation and straight lines lock onto 0°, 45°, 90°… when within a few degrees (and rotation also onto
// the angle of any other tilted object). Shift gives 15° steps for rotation, 45° for lines; ⌘ / Ctrl turns it off.
const ANGLE_MAGNET = 4;
const angleGap = (a, b) => { const d = Math.abs((((a - b) % 360) + 540) % 360 - 180); return d; };
function snapAngle(a, e, extra = []) {
  if (e && e.shiftKey) return { a: ((Math.round(a / 15) * 15) % 360 + 360) % 360, snapped: true };
  if (!state.view.snap || snapOff(e)) return { a, snapped: false };
  let best = null;
  for (const c of [0, 45, 90, 135, 180, 225, 270, 315, ...extra]) { const d = angleGap(a, c); if (d <= ANGLE_MAGNET && (!best || d < best.d)) best = { c, d }; }
  return best ? { a: ((best.c % 360) + 360) % 360, snapped: true, matched: !(best.c % 45 === 0) } : { a, snapped: false };
}
function rotationTargets() {
  if (drag && drag.rotTargets) return drag.rotTargets;
  const out = [...new Set(objs().filter((o) => o.id !== (drag && drag.o && drag.o.id) && o.type !== 'connector' && o.rot && o.rot % 45).map((o) => Math.round(o.rot * 10) / 10))];
  if (drag) drag.rotTargets = out;
  return out;
}
// Readout and guide while rotating: the object's axis through its centre, plus the angle.
function rotateGuides(o, snapped, matched) {
  const z = state.zoom, c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }, L = Math.max(o.w, o.h) * 0.75 + 30 / z;
  const rad = ((o.rot || 0) - 90) * Math.PI / 180, dx = Math.cos(rad) * L, dy = Math.sin(rad) * L;
  let g = snapped ? `<line x1="${c.x - dx}" y1="${c.y - dy}" x2="${c.x + dx}" y2="${c.y + dy}" stroke="${GUIDE_ALIGN}" stroke-width="${1 / z}" stroke-dasharray="${5 / z} ${3 / z}"/>` : '';
  if (matched) for (const x of objs()) if (x.id !== o.id && x.type !== 'connector' && Math.abs((x.rot || 0) - o.rot) < 0.05) g += `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" transform="rotate(${x.rot} ${x.x + x.w / 2} ${x.y + x.h / 2})" fill="none" stroke="${GUIDE_SPACE}" stroke-width="${1.5 / z}" stroke-dasharray="${4 / z}"/>`;
  return g + label(c.x, c.y + Math.hypot(o.w, o.h) / 2 + 22 / z, `${Math.round((o.rot || 0) * 10) / 10}°`); // below the turning box
}
// Straighten a line from `a` to `p`: returns the snapped end point and a small angle readout.
function snapLinePoint(a, p, e) {
  const ang = (Math.atan2(p.y - a.y, p.x - a.x) * 180) / Math.PI, len = Math.hypot(p.x - a.x, p.y - a.y);
  if (len * state.zoom < 8) return { p, guides: '' };
  const s = e && e.shiftKey ? { a: Math.round(ang / 45) * 45, snapped: true } : snapAngle(ang, e);
  if (!s.snapped) return { p, guides: '' };
  const r = (s.a * Math.PI) / 180, q = { x: a.x + Math.cos(r) * len, y: a.y + Math.sin(r) * len };
  const z = state.zoom, shown = ((Math.round(-s.a) % 180) + 180) % 180;
  return { p: q, guides: `<line x1="${a.x}" y1="${a.y}" x2="${q.x}" y2="${q.y}" stroke="${GUIDE_ALIGN}" stroke-width="${1 / z}" stroke-dasharray="${5 / z} ${3 / z}"/>` + label(q.x + 18 / z, q.y - 14 / z, `${shown}°`) };
}

// ---------- Arrange commands ----------
function flipSelection(axis) {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (!sel.length) return;
  checkpoint();
  for (const o of sel) o[axis === 'h' ? 'flipX' : 'flipY'] = !o[axis === 'h' ? 'flipX' : 'flipY'];
  render({ props: true });
}
function matchSize(which) {
  const sel = selected().filter((o) => o.type !== 'connector' && o.type !== 'text');
  if (sel.length < 2) { toast('Select two or more objects — the first one selected sets the size'); return; }
  checkpoint();
  const ref = sel[0];
  for (const o of sel.slice(1)) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    if (which !== 'h') o.w = ref.w;
    if (which !== 'w') o.h = ref.h;
    postEdit(o);
    o.x = cx - o.w / 2; o.y = cy - o.h / 2;
  }
  render({ props: true });
}
function setLocked(v) {
  checkpoint();
  if (v) { for (const o of selected()) o.locked = true; state.sel = []; }
  else for (const o of objs()) o.locked = false;
  render({ props: true });
  toast(v ? 'Locked — unlock from the Layers panel or Arrange › Unlock all' : 'All objects unlocked');
}
function setHidden(v) {
  checkpoint();
  if (v) { for (const o of selected()) o.hidden = true; state.sel = []; }
  else for (const o of objs()) o.hidden = false;
  render({ props: true });
  toast(v ? 'Hidden — show it again from the Layers panel' : 'All objects shown');
}

const ARRANGE_COMMANDS = {
  bringFront: () => zorder('front'), bringForward: () => zorder('forward'), sendBackward: () => zorder('backward'), sendBack: () => zorder('back'),
  alignL: () => align('l'), alignC: () => align('c'), alignR: () => align('r'), alignT: () => align('t'), alignM: () => align('m'), alignB: () => align('b'),
  distH: () => align('dh'), distV: () => align('dv'), flipH: () => flipSelection('h'), flipV: () => flipSelection('v'),
  matchW: () => matchSize('w'), matchH: () => matchSize('h'), matchSize: () => matchSize('both'),
  lock: () => setLocked(true), unlockAll: () => setLocked(false), hide: () => setHidden(true), showAll: () => setHidden(false),
  deleteSel: () => deleteSelection(),
  // The library, searched for the selected icon's name: other styles and versions of the same thing.
  findSimilar: () => {
    const o = selected()[0];
    if (!o || o.type !== 'icon') return;
    const a = (typeof ICON_MAP !== 'undefined' && ICON_MAP[o.iconId]) || (typeof getAsset === 'function' && getAsset(o.iconId)) || {};
    const name = String(a.name || o.name || '').replace(/\((soft|refined|classic)[^)]*\)/gi, '').replace(/[^\w\s-]/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ');
    if (!name) return;
    const tab = document.querySelector('[data-ltab="library"]');
    if (tab) tab.click();
    $('#search').value = name; activeCat = 'All'; libLimit = LIB_FIRST; renderLibrary();
    toast(`Library: icons like “${name}”`);
  },
  toggleFavSel: () => { const o = selected()[0]; if (o && o.type === 'icon') { toggleFav(o.iconId); renderProps(); renderLibrary(); } },
  replaceSel: () => { const o = selected()[0]; if (o && o.type === 'icon') { replaceTarget = o.id; replaceAll = false; renderLibraryBanner(); $('#search').focus(); } },
  editPoints: () => { const o = selected()[0]; if (o && o.type === 'path') enterNodeEdit(o); },
  toggleDistances: () => { state.view.distances = state.view.distances === false; saveView(); toast(`Distance labels ${state.view.distances === false ? 'off' : 'on'}`); },
};

// ---------- Floating context bar ----------
const CTX_SVG = {
  front: '<path d="M4 15h8V7H4z" fill="currentColor" opacity=".35"/><path d="M8 11h8V3H8z" fill="currentColor"/>',
  back: '<path d="M8 11h8V3H8z" fill="currentColor" opacity=".35"/><path d="M4 15h8V7H4z" fill="currentColor"/>',
  forward: '<path d="M10 3v12M5 8l5-5 5 5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  backward: '<path d="M10 15V3M5 10l5 5 5-5" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  align: '<path d="M3 2v14" stroke="currentColor" stroke-width="1.8"/><rect x="5" y="4" width="10" height="3.5" rx="1" fill="currentColor"/><rect x="5" y="10" width="6" height="3.5" rx="1" fill="currentColor"/>',
  flip: '<path d="M9 2v14" stroke="currentColor" stroke-dasharray="2 2"/><path d="M7 4L2 14h5z M11 4l5 10h-5z" fill="currentColor"/>',
  dup: '<rect x="2.5" y="5.5" width="9" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="6.5" y="1.5" width="9" height="9" rx="1.5" fill="currentColor" opacity=".45"/>',
  group: '<rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-dasharray="2.5 2"/><rect x="4.5" y="4.5" width="5" height="5" fill="currentColor"/><circle cx="12" cy="12" r="2.6" fill="currentColor"/>',
  lock: '<rect x="4" y="8" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M6.5 8V6a2.5 2.5 0 015 0v2" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  del: '<path d="M3 5h12M7 5V3h4v2M5 5l1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  points: '<path d="M3 14C6 3 12 15 15 4" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="1.5" y="12.5" width="3" height="3" fill="currentColor"/><rect x="13.5" y="2.5" width="3" height="3" fill="currentColor"/>',
};
Object.assign(CTX_SVG, {
  lineStyle: '<path d="M2 6h10" stroke="currentColor" stroke-width="1.8"/><path d="M11 3l4 3-4 3z" fill="currentColor"/><path d="M2 12h12" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2"/><path d="M15 9.5v5" stroke="currentColor" stroke-width="1.8"/>',
  similar: '<circle cx="7.5" cy="7.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M11 11l5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  swap: '<path d="M3 6h11M11 3l3 3-3 3M15 12H4M7 9l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  straight: '<rect x="1.5" y="7" width="4" height="4" fill="currentColor"/><rect x="12.5" y="7" width="4" height="4" fill="currentColor"/><path d="M5.5 9h7" stroke="currentColor" stroke-width="1.8"/><path d="M9 2v3M9 13v3" stroke="currentColor" stroke-width="1.2"/>',
});
const ctxBtn = (key, cmd, title) => `<button data-ctx="${cmd}" title="${title}"><svg viewBox="0 0 18 18" width="16" height="16">${CTX_SVG[key]}</svg></button>`;
function updateContextBar() {
  const bar = $('#ctxbar');
  const sel = selected();
  if (!sel.length || state.tool !== 'select' || nodeEdit || drag || editing) { bar.classList.add('hidden'); return; }
  const multi = sel.length > 1, hasGroup = sel.some((o) => o.type === 'group'), isPath = sel.length === 1 && sel[0].type === 'path';
  const allLines = sel.every((o) => o.type === 'connector') && typeof ARRANGE_COMMANDS.lineSwap === 'function';
  bar.innerHTML = [
    allLines ? ctxBtn('lineStyle', '@lines', 'Line style') + ctxBtn('swap', 'lineSwap', 'Swap direction') + ctxBtn('straight', 'lineStraighten', 'Straighten (moves the end object)') + '<span class="ctxsep"></span>' : '',
    ctxBtn('front', 'bringFront', 'Bring to front (⇧⌘])'), ctxBtn('forward', 'bringForward', 'Bring forward (⌘])'),
    ctxBtn('backward', 'sendBackward', 'Send backward (⌘[)'), ctxBtn('back', 'sendBack', 'Send to back (⇧⌘[)'),
    '<span class="ctxsep"></span>',
    ctxBtn('align', '@align', multi ? 'Align / distribute selection' : 'Align to page'),
    ctxBtn('flip', 'flipH', 'Flip horizontally (⇧H)'),
    multi ? ctxBtn('group', 'group', 'Group (⌘G)') : hasGroup ? ctxBtn('group', 'ungroup', 'Ungroup (⇧⌘G)') : '',
    isPath ? ctxBtn('points', 'editPoints', 'Edit points') : '',
    sel.length === 1 && sel[0].type === 'icon' ? ctxBtn('similar', 'findSimilar', 'Find similar icons in the library') : '',
    '<span class="ctxsep"></span>',
    ctxBtn('dup', 'duplicate', 'Duplicate (⌘D)'), ctxBtn('lock', 'lock', 'Lock (⌘L)'), ctxBtn('del', 'deleteSel', 'Delete (⌫)'),
  ].join('');
  // Position above the selection (below it if there is no room).
  const bb = unionBounds(sel.map((o) => (o.type === 'connector' ? { ...bounds(o, objs()), rot: 0 } : o)), objs());
  const sr = stage.getBoundingClientRect();
  const left = state.panX + (bb.x + bb.w / 2) * state.zoom, topY = state.panY + bb.y * state.zoom, botY = state.panY + (bb.y + bb.h) * state.zoom;
  bar.classList.remove('hidden');
  const bw = bar.offsetWidth, bh = bar.offsetHeight;
  let y = topY - bh - 36;
  if (y < 6) y = botY + 14;
  bar.style.left = Math.max(6, Math.min(sr.width - bw - 6, left - bw / 2)) + 'px';
  bar.style.top = Math.max(6, Math.min(sr.height - bh - 6, y)) + 'px';
}
function setupContextBar() {
  const bar = $('#ctxbar');
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ctx]');
    if (!b) return;
    const cmd = b.dataset.ctx;
    if (cmd === '@align') return showAlignPopover(b);
    if (cmd === '@lines' && globalThis.VisualMenu && VisualMenu.openLines) { const r = b.getBoundingClientRect(); return VisualMenu.openLines(r.left, r.bottom + 6); }
    runCommand(cmd);
  });
}
function showAlignPopover(anchor) {
  const pop = $('#alignpop');
  const multi = state.sel.length > 1;
  const items = [['alignL', '⇤ Left'], ['alignC', '↔ Centre'], ['alignR', 'Right ⇥'], ['alignT', '⤒ Top'], ['alignM', '↕ Middle'], ['alignB', 'Bottom ⤓']];
  if (state.sel.length > 2) items.push(['distH', '⇿ Distribute horizontally'], ['distV', '⇳ Distribute vertically']);
  if (multi) items.push(['matchW', '▭ Match width'], ['matchH', '▯ Match height']);
  pop.innerHTML = `<div class="note" style="padding:2px 6px 4px">${multi ? 'Align selection' : 'Align to page'}</div>` + items.map(([c, l]) => `<button data-ctx="${c}">${l}</button>`).join('');
  const r = anchor.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  pop.style.left = r.left - sr.left + 'px';
  pop.style.top = r.bottom - sr.top + 6 + 'px';
  pop.classList.remove('hidden');
  const close = (e) => { if (!pop.contains(e.target)) { pop.classList.add('hidden'); window.removeEventListener('pointerdown', close, true); } };
  setTimeout(() => window.addEventListener('pointerdown', close, true), 0);
  pop.onclick = (e) => { const b = e.target.closest('[data-ctx]'); if (b) { runCommand(b.dataset.ctx); pop.classList.add('hidden'); } };
}

// ---------- Right-click menu (native) ----------
function contextMenuTemplate() {
  const sel = selected(), n = sel.length;
  if (!n) return [
    { label: 'Paste', role: 'paste' }, { label: 'Select all', cmd: 'selectAll' }, { type: 'separator' },
    { label: 'Show all hidden', cmd: 'showAll' }, { label: 'Unlock all', cmd: 'unlockAll' }, { type: 'separator' },
    { label: 'Add comment here', cmd: 'commentTool' },
  ];
  const isPath = n === 1 && sel[0].type === 'path', hasGroup = sel.some((o) => o.type === 'group');
  return [
    { label: 'Cut', role: 'cut' }, { label: 'Copy', role: 'copy' }, { label: 'Paste', role: 'paste' }, { label: 'Duplicate', cmd: 'duplicate' }, { label: 'Copy as image', cmd: 'copyImage' }, { label: 'Copy as SVG', cmd: 'copySvg' },
    { type: 'separator' },
    { label: 'Bring to front', cmd: 'bringFront' }, { label: 'Bring forward', cmd: 'bringForward' }, { label: 'Send backward', cmd: 'sendBackward' }, { label: 'Send to back', cmd: 'sendBack' },
    { type: 'separator' },
    { label: n > 1 ? 'Align' : 'Align to page', submenu: [{ label: 'Left', cmd: 'alignL' }, { label: 'Centre', cmd: 'alignC' }, { label: 'Right', cmd: 'alignR' }, { type: 'separator' }, { label: 'Top', cmd: 'alignT' }, { label: 'Middle', cmd: 'alignM' }, { label: 'Bottom', cmd: 'alignB' }] },
    ...(n > 2 ? [{ label: 'Distribute', submenu: [{ label: 'Horizontally', cmd: 'distH' }, { label: 'Vertically', cmd: 'distV' }] }] : []),
    ...(n > 1 ? [{ label: 'Arrange as figure panels (A, B, C…)', cmd: 'panelLayout' }, { label: 'Arrange as poster columns…', cmd: 'posterLayout' }] : []),
    ...(n > 1 ? [{ label: 'Match size', submenu: [{ label: 'Width', cmd: 'matchW' }, { label: 'Height', cmd: 'matchH' }, { label: 'Width & height', cmd: 'matchSize' }] }] : []),
    { label: 'Flip', submenu: [{ label: 'Horizontally', cmd: 'flipH' }, { label: 'Vertically', cmd: 'flipV' }] },
    { type: 'separator' },
    ...(n > 1 ? [{ label: 'Group', cmd: 'group' }] : []), ...(hasGroup ? [{ label: 'Ungroup', cmd: 'ungroup' }] : []),
    ...(isPath ? [{ label: 'Edit points', cmd: 'editPoints' }, { label: 'Apply brush to path…', cmd: 'brushToPath' }] : []),
    ...(n === 2 ? [{ label: 'Crop to shape (top shape crops the object below)', cmd: 'cropToShape' }] : []),
    { label: 'Transform…', cmd: 'transform' },
    { label: 'Biology', submenu: [{ label: 'Make protein shape', cmd: 'makeProtein' }, { label: 'Add lighter partner subunit', cmd: 'lighterPartner' }, { label: 'Degrade into fragments', cmd: 'degrade' }] },
    ...(n === 1 && sel[0].type === 'icon' ? [{ label: getFavs().includes(sel[0].iconId) ? 'Remove from favourites' : 'Add to favourites', cmd: 'toggleFavSel' }, { label: 'Replace icon…', cmd: 'replaceSel' }, { label: 'Find similar icons', cmd: 'findSimilar' }] : []),
    { label: 'Select matching', submenu: [{ label: 'Same icon', cmd: 'selectSameIcon' }, { label: 'Same type', cmd: 'selectSameType' }, { label: 'Same colour', cmd: 'selectSameColour' }] },
    { label: 'Save as icon…', cmd: 'saveIcon' },
    { label: '✦ AI', submenu: [{ label: 'Edit with AI…', cmd: 'aiEdit' }, { label: 'Restyle…', cmd: 'aiRestyle' }, { label: 'Remove text', cmd: 'aiRemoveText' }, { label: 'Remove background', cmd: 'removeBg' }] },
    { type: 'separator' },
    { label: 'Lock', cmd: 'lock' }, { label: 'Hide', cmd: 'hide' }, { label: 'Delete', cmd: 'deleteSel' },
  ];
}
function setupContextMenu() {
  svg.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const o = hitObject(e.target);
    if (o && !state.sel.includes(o.id)) { state.sel = [o.id]; render({ props: true }); }
    if (!o && !e.shiftKey) { state.sel = []; render({ props: true }); }
    if (window.native.contextMenu) window.native.contextMenu(contextMenuTemplate());
  });
}

// ---------- Layers panel ----------
let layerOpen = new Set(), layerDrag = null, layerAnchor = null;
const LAYER_ICON = { icon: '◉', rect: '▭', ellipse: '◯', shape: '⬡', text: 'T', connector: '↗', image: '🖼', brush: '〰', chart: '▤', protocol: '①', group: '▣', path: '✎' };
// The list is rebuilt only when it's on screen and its rows actually changed (objects added, removed,
// reordered, renamed, hidden, locked or groups opened); a new selection just moves the highlight.
let layersShape = null, layerSerial = 0;
const layerObjIds = new WeakMap(); // undo swaps in new object copies, which must rebuild the rows
const layerObjId = (o) => { if (!layerObjIds.has(o)) layerObjIds.set(o, ++layerSerial); return layerObjIds.get(o); };
// A small picture of each layer, drawn from the object itself (cached until the object changes).
const layerThumbCache = new Map();
function layerThumb(o, list) {
  if (o.type === 'comment') return '';
  let key;
  try { key = innerKey(o, list) + `|${o.w}x${o.h}`; } catch { return ''; }
  const hit = layerThumbCache.get(o.id);
  if (hit && hit[0] === key) return hit[1];
  let svgText = '';
  try {
    const b = bounds(o, list), m = Math.max(b.w, b.h, 1) * 0.08, s = Math.max(b.w, b.h, 1) + 2 * m;
    const inner = renderObjectString(o, list, true);
    svgText = `<svg viewBox="${b.x + b.w / 2 - s / 2} ${b.y + b.h / 2 - s / 2} ${s} ${s}" width="22" height="22">${inner}</svg>`;
    if (/NaN|undefined/.test(svgText) || svgText.length > 400000) svgText = '';
  } catch { svgText = ''; }
  if (layerThumbCache.size > 3000) layerThumbCache.clear();
  layerThumbCache.set(o.id, [key, svgText]);
  return svgText;
}
function renderLayers() {
  const Lp = $('#layers');
  if (Lp.classList.contains('hidden')) { layersShape = null; return; } // drawn when the Layers tab opens
  const shape = JSON.stringify([state.pageIndex, [...layerOpen], objs().map((o) => [layerObjId(o), o.id, layerName(o), !!o.hidden, !!o.locked, o.type === 'group' && layerOpen.has(o.id) ? o.children.map((c) => [layerObjId(c), c.id, layerName(c)]) : 0])]);
  if (shape === layersShape) {
    const sel = new Set(state.sel);
    let first = null;
    for (const r of Lp.querySelectorAll('.layer')) { const on = sel.has(r.dataset.lid); r.classList.toggle('sel', on); if (on && !first) first = r; }
    if (first) first.scrollIntoView({ block: 'nearest' });
    return;
  }
  layersShape = shape;
  Lp.innerHTML = '';
  const list = [...objs()].reverse(); // top of the list = front-most
  if (!list.length) { Lp.append(el('div', { class: 'note', textContent: 'No objects on this page yet.' })); return; }
  Lp.append(el('div', { class: 'btnrow', style: 'margin-bottom:6px' },
    btn('Show all', () => setHidden(false)), btn('Unlock all', () => setLocked(false)),
    el('span', { class: 'note', style: 'margin-left:auto;align-self:center', textContent: 'Drag to reorder' })));
  const order = list.map((o) => o.id);
  const row = (o, depth, parent) => {
    const isSel = state.sel.includes(o.id);
    const r = el('div', { class: 'layer' + (isSel ? ' sel' : '') + (o.hidden ? ' hid' : ''), draggable: !parent, 'data-lid': o.id, style: depth ? `padding-left:${8 + depth * 16}px` : '' });
    const caret = o.type === 'group' && !parent ? el('span', { class: 'caret', textContent: layerOpen.has(o.id) ? '▾' : '▸', onclick: (e) => { e.stopPropagation(); layerOpen.has(o.id) ? layerOpen.delete(o.id) : layerOpen.add(o.id); renderLayers(); } }) : el('span', { class: 'caret' });
    const name = el('span', { class: 'lname', textContent: layerName(o), title: 'Double-click to rename' });
    name.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      const inp = el('input', { type: 'text', value: o.name || layerName(o), style: 'flex:1;min-width:0' });
      name.replaceWith(inp); inp.focus(); inp.select();
      const done = () => { const v = inp.value.trim(); checkpoint(); o.name = v && v !== layerName({ ...o, name: '' }) ? v : undefined; layersShape = null; renderLayers(); renderProps(); };
      inp.addEventListener('blur', done);
      inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = o.name || ''; inp.blur(); } });
    });
    const kind = el('span', { class: 'kind', textContent: LAYER_ICON[o.type] || '•', title: o.type });
    const pic = layerThumb(o, parent ? parent.children : objs());
    if (pic) { kind.textContent = ''; kind.classList.add('lthumb'); kind.innerHTML = pic; }
    r.append(caret, kind, name);
    if (!parent) {
      r.append(
        el('button', { class: 'lbtn' + (o.hidden ? ' on' : ''), title: o.hidden ? 'Show' : 'Hide', textContent: o.hidden ? '◌' : '👁', onclick: (e) => { e.stopPropagation(); checkpoint(); o.hidden = !o.hidden; if (o.hidden) state.sel = state.sel.filter((i) => i !== o.id); render({ props: true }); } }),
        el('button', { class: 'lbtn' + (o.locked ? ' on' : ''), title: o.locked ? 'Unlock' : 'Lock', textContent: o.locked ? '🔒' : '🔓', onclick: (e) => { e.stopPropagation(); checkpoint(); o.locked = !o.locked; if (o.locked) state.sel = state.sel.filter((i) => i !== o.id); render({ props: true }); } }));
    }
    r.addEventListener('click', (e) => {
      const id = parent ? parent.id : o.id;
      if (e.shiftKey && layerAnchor && order.includes(layerAnchor)) {
        const [a, b] = [order.indexOf(layerAnchor), order.indexOf(id)].sort((x, y) => x - y);
        state.sel = order.slice(a, b + 1).filter((i) => !byId(i).locked && !byId(i).hidden);
      } else if (e.metaKey || e.ctrlKey) state.sel = state.sel.includes(id) ? state.sel.filter((i) => i !== id) : [...state.sel, id];
      else { state.sel = [id]; layerAnchor = id; }
      render({ props: true });
    });
    if (!parent) {
      r.addEventListener('dragstart', (e) => { layerDrag = state.sel.includes(o.id) ? [...state.sel] : [o.id]; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', o.id); });
      r.addEventListener('dragover', (e) => {
        if (!layerDrag) return;
        e.preventDefault();
        const rect = r.getBoundingClientRect(), above = e.clientY < rect.top + rect.height / 2;
        $$('.layer.drop-above, .layer.drop-below', Lp).forEach((x) => x.classList.remove('drop-above', 'drop-below'));
        r.classList.add(above ? 'drop-above' : 'drop-below');
      });
      r.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!layerDrag || layerDrag.includes(o.id)) { layerDrag = null; renderLayers(); return; }
        const rect = r.getBoundingClientRect(), above = e.clientY < rect.top + rect.height / 2;
        checkpoint();
        const moving = objs().filter((x) => layerDrag.includes(x.id));
        const rest = objs().filter((x) => !layerDrag.includes(x.id));
        // List is front-to-back, so "above" in the list means later in the array (in front).
        const idx = rest.indexOf(o) + (above ? 1 : 0);
        rest.splice(idx, 0, ...moving);
        page().objects = rest;
        layerDrag = null;
        render({ props: true });
      });
      r.addEventListener('dragend', () => { layerDrag = null; $$('.layer.drop-above, .layer.drop-below', Lp).forEach((x) => x.classList.remove('drop-above', 'drop-below')); });
    }
    Lp.append(r);
    if (o.type === 'group' && layerOpen.has(o.id)) [...o.children].reverse().forEach((c) => row(c, depth + 1, parent || o));
  };
  list.forEach((o) => row(o, 0, null));
  const selRow = Lp.querySelector('.layer.sel');
  if (selRow) selRow.scrollIntoView({ block: 'nearest' });
}

// Draw the layers list when its tab is opened (it isn't kept up to date while hidden).
$$('[data-rtab="layers"]').forEach((t) => t.addEventListener('click', () => setTimeout(renderLayers, 0)));
