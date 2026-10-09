// Drawing toolkit: pencil (freehand), pen (Bézier), line, arrow, airbrush shading, node editing,
// shading styles for filled shapes, and "convert to path".
//
// A path object stores nodes in a base frame of size w0 × h0: [{x, y, ix?, iy?, ox?, oy?}],
// where (ix, iy) / (ox, oy) are the incoming / outgoing Bézier handles (absent = corner).
// It renders scaled to its current w × h so resizing works like any other object.

// ---------- Geometry ----------
function scaledNodes(o) {
  const sx = o.w / (o.w0 || o.w || 1), sy = o.h / (o.h0 || o.h || 1);
  return o.nodes.map((n) => ({
    x: n.x * sx, y: n.y * sy,
    ix: n.ix != null ? n.ix * sx : null, iy: n.iy != null ? n.iy * sy : null,
    ox: n.ox != null ? n.ox * sx : null, oy: n.oy != null ? n.oy * sy : null,
  }));
}
function nodesToD(ns, closed) {
  if (!ns.length) return '';
  let d = `M${ns[0].x} ${ns[0].y}`;
  const seg = (a, b) => (a.ox != null || b.ix != null)
    ? ` C${a.ox ?? a.x} ${a.oy ?? a.y} ${b.ix ?? b.x} ${b.iy ?? b.y} ${b.x} ${b.y}`
    : ` L${b.x} ${b.y}`;
  for (let i = 1; i < ns.length; i++) d += seg(ns[i - 1], ns[i]);
  if (closed && ns.length > 2) d += seg(ns[ns.length - 1], ns[0]) + ' Z';
  return d;
}
// Ramer–Douglas–Peucker simplification.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const sq = (p, a, b) => {
    let x = a.x, y = a.y, dx = b.x - x, dy = b.y - y;
    if (dx || dy) { const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy); if (t > 1) { x = b.x; y = b.y; } else if (t > 0) { x += dx * t; y += dy * t; } }
    return (p.x - x) ** 2 + (p.y - y) ** 2;
  };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) { const d = sq(pts[i], pts[a], pts[b]); if (d > max) { max = d; idx = i; } }
    if (max > tol * tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// Smooth Bézier through points (Catmull-Rom → cubic handles).
function smoothNodes(pts, closed, tension = 0.5) {
  const n = pts.length, k = tension / 3;
  return pts.map((p, i) => {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = (next.x - prev.x) * k, ty = (next.y - prev.y) * k;
    const end = !closed && (i === 0 || i === n - 1);
    return end ? { x: p.x, y: p.y, ...(i === 0 ? { ox: p.x + tx, oy: p.y + ty } : { ix: p.x - tx, iy: p.y - ty }) } : { x: p.x, y: p.y, ix: p.x - tx, iy: p.y - ty, ox: p.x + tx, oy: p.y + ty };
  });
}
// Build a path object from world-space nodes (bounding box from nodes + handles).
function makePathFromNodes(nodes, extra = {}) {
  const xs = [], ys = [];
  for (const n of nodes) { xs.push(n.x, n.ix ?? n.x, n.ox ?? n.x); ys.push(n.y, n.iy ?? n.y, n.oy ?? n.y); }
  const x = Math.min(...xs), y = Math.min(...ys);
  const w = Math.max(1, Math.max(...xs) - x), h = Math.max(1, Math.max(...ys) - y);
  const rel = nodes.map((n) => ({ x: n.x - x, y: n.y - y, ...(n.ix != null ? { ix: n.ix - x, iy: n.iy - y } : {}), ...(n.ox != null ? { ox: n.ox - x, oy: n.oy - y } : {}) }));
  return { id: uid(), type: 'path', x, y, w, h, w0: w, h0: h, rot: 0, nodes: rel, closed: false, fill: 'none', stroke: '#222222', strokeWidth: 2.5, cap: 'round', ...extra };
}
// Re-fit bbox after node edits, keeping the drawing fixed on the page (handles rotation).
function refitPath(o) {
  const sx = o.w / (o.w0 || o.w), sy = o.h / (o.h0 || o.h);
  if (sx !== 1 || sy !== 1) { o.nodes = scaledNodes(o).map((n) => Object.fromEntries(Object.entries(n).filter(([, v]) => v != null))); o.w0 = o.w; o.h0 = o.h; }
  const xs = [], ys = [];
  for (const n of o.nodes) { xs.push(n.x, n.ix ?? n.x, n.ox ?? n.x); ys.push(n.y, n.iy ?? n.y, n.oy ?? n.y); }
  const mx = Math.min(...xs), my = Math.min(...ys), W = Math.max(1, Math.max(...xs) - mx), H = Math.max(1, Math.max(...ys) - my);
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const nc = rotPt({ x: c.x + (mx + W / 2 - o.w / 2), y: c.y + (my + H / 2 - o.h / 2) }, c, o.rot || 0);
  for (const n of o.nodes) { n.x -= mx; n.y -= my; if (n.ix != null) { n.ix -= mx; n.iy -= my; } if (n.ox != null) { n.ox -= mx; n.oy -= my; } }
  Object.assign(o, { w: W, h: H, w0: W, h0: H, x: nc.x - W / 2, y: nc.y - H / 2 });
}
// World point ↔ path-local (unscaled) point.
function worldToPathLocal(o, p) {
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  const q = rotPt(p, c, -(o.rot || 0));
  return { x: (q.x - o.x) * ((o.w0 || o.w) / o.w), y: (q.y - o.y) * ((o.h0 || o.h) / o.h) };
}
function pathLocalToWorld(o, p) {
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
  return rotPt({ x: o.x + p.x * (o.w / (o.w0 || o.w)), y: o.y + p.y * (o.h / (o.h0 || o.h)) }, c, o.rot || 0);
}

// ---------- Shading (fill paint for paths, shapes, rects, ellipses) ----------
const SHADES = [['flat', 'Flat'], ['soft', 'Soft 3-D'], ['gloss', 'Glossy'], ['linear', 'Top-lit'], ['inner', 'Inner shadow'], ['rim', 'Rim light']];
// Returns { fill, defs, overlay } where overlay is drawn on top, clipped to `geom` (an SVG element string).
function fillPaint(o, geom) {
  const base = o.fill && o.fill !== 'none' ? o.fill : null;
  if (!base) return { fill: 'none', defs: '', overlay: '' };
  if (o.fill2 && o.fill2 !== 'none') return { fill: `url(#gr-${o.id})`, defs: '', overlay: '' }; // gradient handled by applyEffects
  const shade = o.shade || 'flat';
  const id = `sh-${o.id}`;
  const hex = /^#[0-9a-f]{6}$/i.test(base) ? base : null;
  if (!hex || shade === 'flat') return { fill: base, defs: '', overlay: '' };
  const L = (t) => Color.light(hex, t), D = (t) => Color.dark(hex, t);
  let defs = '', overlay = '', fill = `url(#${id})`;
  switch (shade) {
    case 'soft':
    case 'gloss':
      defs = `<radialGradient id="${id}" cx="0.38" cy="0.32" r="0.78"><stop offset="0" stop-color="${L(0.55)}"/><stop offset="0.55" stop-color="${hex}"/><stop offset="1" stop-color="${D(0.3)}"/></radialGradient>`;
      if (shade === 'gloss') {
        defs += `<clipPath id="cl-${o.id}">${geom}</clipPath><radialGradient id="hl-${o.id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
        overlay = `<g clip-path="url(#cl-${o.id})"><ellipse cx="${o.w * 0.36}" cy="${o.h * 0.26}" rx="${o.w * 0.26}" ry="${o.h * 0.15}" fill="url(#hl-${o.id})"/></g>`;
      }
      break;
    case 'linear':
      defs = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L(0.45)}"/><stop offset="1" stop-color="${D(0.25)}"/></linearGradient>`;
      break;
    case 'inner':
      fill = hex;
      defs = `<clipPath id="cl-${o.id}">${geom}</clipPath><filter id="ib-${o.id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${Math.max(2, Math.min(o.w, o.h) * 0.08)}"/></filter>`;
      overlay = `<g clip-path="url(#cl-${o.id})"><g filter="url(#ib-${o.id})">${geom.replace(/fill="[^"]*"/, '').replace(/^<(\w+)/, `<$1 fill="none" stroke="${D(0.45)}" stroke-width="${Math.max(4, Math.min(o.w, o.h) * 0.16)}"`)}</g></g>`;
      break;
    case 'rim':
      defs = `<radialGradient id="${id}" cx="0.5" cy="0.5" r="0.55"><stop offset="0" stop-color="${D(0.12)}"/><stop offset="0.75" stop-color="${hex}"/><stop offset="1" stop-color="${L(0.6)}"/></radialGradient>`;
      break;
  }
  return { fill, defs, overlay };
}

// ---------- Path rendering ----------
function pathSvg(o) {
  const ns = scaledNodes(o);
  const d = nodesToD(ns, o.closed);
  const sw = o.strokeWidth ?? 2;
  const stroke = o.stroke && o.stroke !== 'none' ? o.stroke : 'none';
  const dash = dashAttr(o, sw);
  const geom = `<path d="${d}"/>`;
  const paint = o.closed ? fillPaint(o, geom) : { fill: 'none', defs: '', overlay: '' };
  let defs = paint.defs, body = '';
  if (o.blur) defs += `<filter id="bl-${o.id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${o.blur}"/></filter>`;
  // Trim the stroke under arrowheads so the line doesn't poke through the tip.
  let dd = d;
  if (!o.closed && (o.headEnd === 'arrow' || o.headStart === 'arrow') && ns.length >= 2) {
    const trimmed = ns.map((n) => ({ ...n }));
    const pull = (a, b) => { const len = Math.hypot(b.x - a.x, b.y - a.y) || 1, k = Math.min((6 + sw * 2.2) * 1.2, len / 2) / len; a.x += (b.x - a.x) * k; a.y += (b.y - a.y) * k; };
    if (o.headEnd === 'arrow') { const L = trimmed[trimmed.length - 1], P = trimmed[trimmed.length - 1].ix != null ? { x: L.ix, y: L.iy } : trimmed[trimmed.length - 2]; pull(L, P); }
    if (o.headStart === 'arrow') { const F = trimmed[0], N = trimmed[0].ox != null ? { x: F.ox, y: F.oy } : trimmed[1]; pull(F, N); }
    dd = nodesToD(trimmed, false);
  }
  if (o.tube && !o.closed && stroke !== 'none') body += `<path d="${d}" fill="none" stroke="${o.tubeOutline || Color.dark(stroke, 0.36)}" stroke-width="${sw + 2 * (o.tubeOutlineWidth ?? 2.2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  body += `<path d="${dd}" fill="${paint.fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${o.cap || 'round'}" stroke-linejoin="round"${dash}${o.strokeOpacity != null ? ` stroke-opacity="${o.strokeOpacity}"` : ''}${o.blur ? ` filter="url(#bl-${o.id})"` : ''}/>`;
  body += paint.overlay;
  if (o.pathText) { // label that follows the drawn curve
    defs += `<path id="ptx-${o.id}" d="${d}"/>`;
    body += `<text font-family='${FONT_STACK[o.pathTextFamily] || FONT_STACK.sans}' font-size="${o.pathTextSize || 16}" fill="${o.pathTextColor || '#222'}"${o.pathTextBold ? ' font-weight="700"' : ''} dy="${o.pathTextSide === 'below' ? (o.pathTextSize || 16) * 0.95 + sw / 2 : -(sw / 2 + 3)}"><textPath href="#ptx-${o.id}" startOffset="${o.pathTextOffset ?? 50}%" text-anchor="middle">${esc(o.pathText)}</textPath></text>`;
  }
  if (!o.closed && !o.tube && ns.length >= 2 && stroke !== 'none') {
    const last = ns[ns.length - 1], prevE = last.ix != null ? { x: last.ix, y: last.iy } : ns[ns.length - 2];
    const first = ns[0], nextS = first.ox != null ? { x: first.ox, y: first.oy } : ns[1];
    body += arrowHead(o.headEnd, last, prevE, stroke, sw) + arrowHead(o.headStart, first, nextS, stroke, sw);
  }
  return (defs ? `<defs>${defs}</defs>` : '') + body;
}

// ---------- Convert shapes to editable paths ----------
function ellipseNodes(w, h) {
  const k = 0.5523, rx = w / 2, ry = h / 2, cx = rx, cy = ry;
  return [
    { x: cx, y: 0, ix: cx - rx * k, iy: 0, ox: cx + rx * k, oy: 0 },
    { x: w, y: cy, ix: w, iy: cy - ry * k, ox: w, oy: cy + ry * k },
    { x: cx, y: h, ix: cx + rx * k, iy: h, ox: cx - rx * k, oy: h },
    { x: 0, y: cy, ix: 0, iy: cy + ry * k, ox: 0, oy: cy - ry * k },
  ];
}
function canConvertToPath(o) {
  if (o.type === 'rect' && !o.radius) return true;
  if (o.type === 'ellipse') return true;
  if (o.type === 'shape') return /^M[^ACQS]*Z$/i.test(shapePath(o.kind, o.w, o.h).trim().replace(/\s+/g, ' ').replace(/[ML]/g, (m) => m));
  return false;
}
function convertToPath(o) {
  let nodes;
  if (o.type === 'ellipse') nodes = ellipseNodes(o.w, o.h);
  else if (o.type === 'rect') nodes = [{ x: 0, y: 0 }, { x: o.w, y: 0 }, { x: o.w, y: o.h }, { x: 0, y: o.h }];
  else {
    const nums = shapePath(o.kind, o.w, o.h).match(/-?[\d.]+(e-?\d+)?/g).map(Number);
    nodes = [];
    for (let i = 0; i + 1 < nums.length; i += 2) nodes.push({ x: nums[i], y: nums[i + 1] });
  }
  return {
    id: o.id, type: 'path', x: o.x, y: o.y, w: o.w, h: o.h, w0: o.w, h0: o.h, rot: o.rot || 0, nodes, closed: true,
    fill: o.fill || '#ffffff', fill2: o.fill2, shade: o.shade, stroke: o.stroke || 'none', strokeWidth: o.strokeWidth ?? 2, dash: o.dash,
    opacity: o.opacity, glow: o.glow, shadow: o.shadow, name: o.name || o.label || undefined,
  };
}

// ---------- Tool state & handlers (called from app.js pointer handlers) ----------
let pen = null;        // { nodes: [...] } while drawing with the pen
let nodeEdit = null;   // { id, sel: index|null } while editing a path's nodes

const DRAW_DEFAULTS = { stroke: '#222222', strokeWidth: 2.5, fill: '#9bc4f0', shadeColor: '#1f2a44', shadeSize: 18, eraserSize: 18, mode: 'free', tubeWidth: 14 };
// Soft-protein style (matches the Soft icon set): open strokes become rounded tubes, closed ones outlined blobs.
function softProteinProps(closed) {
  const c = DRAW_DEFAULTS.fill;
  return closed ? { closed: true, fill: c, shade: 'flat', stroke: Color.dark(c, 0.36), strokeWidth: 2.2, name: 'Protein' } : { tube: true, stroke: c, strokeWidth: DRAW_DEFAULTS.tubeWidth, cap: 'round', name: 'Protein' };
}

function drawDown(e, p) {
  const z = state.zoom;
  switch (state.tool) {
    case 'pencil':
      return { mode: 'pencil', pts: [p], start: p };
    case 'airbrush':
      return { mode: 'airbrush', pts: [p], start: p };
    case 'eraser':
      return eraserDown(e, p);
    case 'line':
    case 'arrow':
      return { mode: 'line', start: p, cur: p };
    case 'pen': {
      if (!pen) pen = { nodes: [] };
      const first = pen.nodes[0];
      if (first && pen.nodes.length > 2 && Math.hypot(p.x - first.x, p.y - first.y) * z < 10) { finishPen(true); return null; }
      const node = { x: p.x, y: p.y };
      pen.nodes.push(node);
      renderPenPreview(p);
      return { mode: 'pen-node', node, start: p };
    }
  }
  return null;
}
function drawMove(e, p, d) {
  switch (d.mode) {
    case 'pencil':
    case 'airbrush': {
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) * state.zoom > 1.5) d.pts.push(p);
      const near = d.mode === 'pencil' && d.pts.length > 8 && Math.hypot(p.x - d.start.x, p.y - d.start.y) * state.zoom < 14;
      const w = d.mode === 'airbrush' ? DRAW_DEFAULTS.shadeSize : DRAW_DEFAULTS.strokeWidth;
      renderOverlay(`<polyline points="${d.pts.map((q) => `${q.x},${q.y}`).join(' ')}" fill="${near ? 'rgba(155,196,240,.35)' : 'none'}" stroke="${d.mode === 'airbrush' ? 'rgba(31,42,68,.3)' : '#222'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>${near ? `<circle cx="${d.start.x}" cy="${d.start.y}" r="${7 / state.zoom}" fill="none" stroke="#3b6fd6" stroke-width="${2 / state.zoom}"/>` : ''}`);
      return;
    }
    case 'line': {
      let q = p;
      if (e.shiftKey) { const a = Math.round(Math.atan2(p.y - d.start.y, p.x - d.start.x) / (Math.PI / 4)) * (Math.PI / 4), r = Math.hypot(p.x - d.start.x, p.y - d.start.y); q = { x: d.start.x + Math.cos(a) * r, y: d.start.y + Math.sin(a) * r }; }
      d.cur = q;
      const tmp = makePathFromNodes([d.start, q], { headEnd: state.tool === 'arrow' ? 'arrow' : 'none' });
      renderOverlay(`<g transform="translate(${tmp.x} ${tmp.y})">${pathSvg(tmp)}</g>`);
      return;
    }
    case 'pen-node': {
      // Dragging while placing a node pulls out symmetric handles (smooth node).
      const dx = p.x - d.start.x, dy = p.y - d.start.y;
      if (Math.hypot(dx, dy) * state.zoom > 3) Object.assign(d.node, { ox: d.node.x + dx, oy: d.node.y + dy, ix: d.node.x - dx, iy: d.node.y - dy });
      renderPenPreview(p);
      return;
    }
    case 'node': return nodeDragMove(e, p, d);
    case 'erase': return eraserMove(e, p, d);
  }
}
function drawUp(e, p, d) {
  switch (d.mode) {
    case 'pencil': {
      d.pts.push(p);
      if (d.pts.length < 3) { renderOverlay(); return true; }
      const protein = DRAW_DEFAULTS.mode === 'protein';
      const near = Math.hypot(p.x - d.start.x, p.y - d.start.y) * state.zoom < (protein ? 22 : 14);
      const close = d.pts.length > 8 && (DRAW_DEFAULTS.mode === 'shape' || near);
      // Protein mode smooths harder so a rough sketch becomes a clean, rounded subunit.
      const pts = simplify(close ? d.pts.slice(0, -1) : d.pts, (protein ? 5 : 1.6) / state.zoom);
      const o = makePathFromNodes(smoothNodes(pts, close), protein ? softProteinProps(close) : close
        ? { closed: true, fill: DRAW_DEFAULTS.fill, shade: 'soft', stroke: Color.dark(DRAW_DEFAULTS.fill, 0.35), strokeWidth: 2 }
        : { stroke: DRAW_DEFAULTS.stroke, strokeWidth: DRAW_DEFAULTS.strokeWidth });
      checkpoint(); objs().push(o); state.sel = [o.id];
      return true;
    }
    case 'airbrush': {
      d.pts.push(p);
      const pts = simplify(d.pts, 1.2 / state.zoom);
      const o = makePathFromNodes(pts.length > 2 ? smoothNodes(pts, false) : pts, { stroke: DRAW_DEFAULTS.shadeColor, strokeWidth: DRAW_DEFAULTS.shadeSize, strokeOpacity: 0.35, blur: DRAW_DEFAULTS.shadeSize * 0.45, name: 'Shading' });
      checkpoint(); objs().push(o); state.sel = [o.id];
      return true;
    }
    case 'line': {
      if (Math.hypot(d.cur.x - d.start.x, d.cur.y - d.start.y) * state.zoom < 4) { renderOverlay(); return true; }
      const o = makePathFromNodes([d.start, d.cur], { headEnd: state.tool === 'arrow' ? 'arrow' : 'none', name: state.tool === 'arrow' ? 'Arrow' : 'Line' });
      checkpoint(); objs().push(o); state.sel = [o.id];
      setTool('select');
      return true;
    }
    case 'pen-node': return false; // keep drawing
    case 'node': return true;
    case 'erase': return eraserUp();
  }
  return false;
}
function renderPenPreview(cursor) {
  if (!pen || !pen.nodes.length) { renderOverlay(); return; }
  const z = state.zoom, ns = pen.nodes;
  let s = `<path d="${nodesToD(ns, false)}" fill="none" stroke="#3b6fd6" stroke-width="${2 / z}"/>`;
  const last = ns[ns.length - 1];
  if (cursor) s += `<path d="M${last.x} ${last.y} ${last.ox != null ? `Q${last.ox} ${last.oy}` : 'L'} ${cursor.x} ${cursor.y}" fill="none" stroke="#3b6fd6" stroke-width="${1 / z}" stroke-dasharray="${4 / z}"/>`;
  ns.forEach((n, i) => {
    if (n.ox != null) s += `<line x1="${n.ix}" y1="${n.iy}" x2="${n.ox}" y2="${n.oy}" stroke="#e8743b" stroke-width="${1 / z}"/><circle cx="${n.ox}" cy="${n.oy}" r="${3 / z}" fill="#e8743b"/><circle cx="${n.ix}" cy="${n.iy}" r="${3 / z}" fill="#e8743b"/>`;
    s += `<rect x="${n.x - 4 / z}" y="${n.y - 4 / z}" width="${8 / z}" height="${8 / z}" fill="${i === 0 ? '#3b6fd6' : '#fff'}" stroke="#3b6fd6" stroke-width="${1.5 / z}"/>`;
  });
  renderOverlay(s);
}
function finishPen(close) {
  if (!pen) return;
  const ns = pen.nodes;
  pen = null;
  if (ns.length >= 2) {
    const o = makePathFromNodes(ns, DRAW_DEFAULTS.mode === 'protein' ? softProteinProps(close) : close
      ? { closed: true, fill: DRAW_DEFAULTS.fill, shade: 'soft', stroke: Color.dark(DRAW_DEFAULTS.fill, 0.35), strokeWidth: 2 }
      : { stroke: DRAW_DEFAULTS.stroke, strokeWidth: DRAW_DEFAULTS.strokeWidth });
    checkpoint(); objs().push(o); state.sel = [o.id];
  }
  setTool('select');
  render({ props: true });
}
function cancelPen() { pen = null; renderOverlay(); }

// ---------- Node editing ----------
function enterNodeEdit(o) {
  refitPath(o);
  nodeEdit = { id: o.id, sel: null };
  state.sel = [o.id];
  toast('Editing points — drag points/handles · click + to add · select a point and press Delete · double-click a point for smooth/corner · Esc to finish', 4200);
  render({ props: true });
}
function exitNodeEdit() { if (!nodeEdit) return; const o = byId(nodeEdit.id); nodeEdit = null; if (o) refitPath(o); render({ props: true }); }
function nodeOverlay() {
  if (!nodeEdit) return '';
  const o = byId(nodeEdit.id);
  if (!o) { nodeEdit = null; return ''; }
  const z = state.zoom, W = (q) => pathLocalToWorld(o, q);
  let s = '';
  const ns = o.nodes;
  // Segment midpoints for inserting nodes.
  const segs = ns.length - (o.closed ? 0 : 1);
  for (let i = 0; i < segs; i++) {
    const a = ns[i], b = ns[(i + 1) % ns.length];
    const m = W(bezierPoint(a, b, 0.5));
    s += `<g data-node-add="${i}" style="cursor:copy"><circle cx="${m.x}" cy="${m.y}" r="${5 / z}" fill="#fff" stroke="#3fa58b" stroke-width="${1.2 / z}"/><path d="M${m.x - 3 / z} ${m.y}H${m.x + 3 / z}M${m.x} ${m.y - 3 / z}V${m.y + 3 / z}" stroke="#3fa58b" stroke-width="${1.2 / z}"/></g>`;
  }
  ns.forEach((n, i) => {
    const P = W(n);
    for (const [hx, hy, which] of [[n.ix, n.iy, 'in'], [n.ox, n.oy, 'out']]) {
      if (hx == null) continue;
      const H = W({ x: hx, y: hy });
      s += `<line x1="${P.x}" y1="${P.y}" x2="${H.x}" y2="${H.y}" stroke="#e8743b" stroke-width="${1 / z}"/><circle data-node-handle="${i}:${which}" cx="${H.x}" cy="${H.y}" r="${4 / z}" fill="#e8743b" stroke="#fff" stroke-width="${1 / z}" style="cursor:move"/>`;
    }
    s += `<rect data-node="${i}" x="${P.x - 4.5 / z}" y="${P.y - 4.5 / z}" width="${9 / z}" height="${9 / z}" fill="${nodeEdit.sel === i ? '#3b6fd6' : '#fff'}" stroke="#3b6fd6" stroke-width="${1.5 / z}" style="cursor:move"/>`;
  });
  return s;
}
function bezierPoint(a, b, t) {
  const p1 = { x: a.ox ?? a.x, y: a.oy ?? a.y }, p2 = { x: b.ix ?? b.x, y: b.iy ?? b.y }, u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * b.y };
}
// Returns a drag descriptor if the pointer hit a node-edit control.
function nodeEditDown(e, p) {
  if (!nodeEdit) return null;
  const o = byId(nodeEdit.id);
  const t = e.target;
  const add = t.closest && t.closest('[data-node-add]');
  if (add) {
    checkpoint();
    const i = +add.dataset.nodeAdd, a = o.nodes[i], b = o.nodes[(i + 1) % o.nodes.length];
    // de Casteljau split at t = 0.5 so the curve keeps its shape.
    const p0 = a, p1 = { x: a.ox ?? a.x, y: a.oy ?? a.y }, p2 = { x: b.ix ?? b.x, y: b.iy ?? b.y }, p3 = b;
    const mid = (u, v) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
    const q0 = mid(p0, p1), q1 = mid(p1, p2), q2 = mid(p2, p3), r0 = mid(q0, q1), r1 = mid(q1, q2), s0 = mid(r0, r1);
    const curved = a.ox != null || b.ix != null;
    if (curved) { a.ox = q0.x; a.oy = q0.y; b.ix = q2.x; b.iy = q2.y; }
    o.nodes.splice(i + 1, 0, curved ? { x: s0.x, y: s0.y, ix: r0.x, iy: r0.y, ox: r1.x, oy: r1.y } : { x: s0.x, y: s0.y });
    nodeEdit.sel = i + 1;
    renderScene(); renderOverlay();
    return { mode: 'node', o, index: i + 1, kind: 'node' };
  }
  const h = t.closest && t.closest('[data-node-handle]');
  if (h) { checkpoint(); const [i, which] = h.dataset.nodeHandle.split(':'); return { mode: 'node', o, index: +i, kind: which }; }
  const n = t.closest && t.closest('[data-node]');
  if (n) { checkpoint(); nodeEdit.sel = +n.dataset.node; renderOverlay(); return { mode: 'node', o, index: +n.dataset.node, kind: 'node' }; }
  return null;
}
function nodeDragMove(e, p, d) {
  const o = d.o, n = o.nodes[d.index], q = worldToPathLocal(o, p);
  if (d.kind === 'node') {
    const dx = q.x - n.x, dy = q.y - n.y;
    n.x = q.x; n.y = q.y;
    if (n.ix != null) { n.ix += dx; n.iy += dy; }
    if (n.ox != null) { n.ox += dx; n.oy += dy; }
  } else {
    const [k, other] = d.kind === 'in' ? ['i', 'o'] : ['o', 'i'];
    n[k + 'x'] = q.x; n[k + 'y'] = q.y;
    if (!e.altKey && n[other + 'x'] != null) { // mirror the opposite handle (smooth node); Alt breaks it
      const len = Math.hypot(n[other + 'x'] - n.x, n[other + 'y'] - n.y), a = Math.atan2(q.y - n.y, q.x - n.x) + Math.PI;
      n[other + 'x'] = n.x + Math.cos(a) * len; n[other + 'y'] = n.y + Math.sin(a) * len;
    }
  }
  renderScene(); renderOverlay();
}
function nodeToggleSmooth(index) {
  const o = byId(nodeEdit.id), n = o.nodes[index];
  checkpoint();
  if (n.ix != null || n.ox != null) { delete n.ix; delete n.iy; delete n.ox; delete n.oy; }
  else {
    const prev = o.nodes[(index - 1 + o.nodes.length) % o.nodes.length], next = o.nodes[(index + 1) % o.nodes.length];
    const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6;
    Object.assign(n, { ix: n.x - tx, iy: n.y - ty, ox: n.x + tx, oy: n.y + ty });
  }
  renderScene(); renderOverlay();
}
function nodeDeleteSelected() {
  if (!nodeEdit || nodeEdit.sel == null) return false;
  const o = byId(nodeEdit.id);
  if (o.nodes.length <= (o.closed ? 3 : 2)) { toast('A path needs at least ' + (o.closed ? 3 : 2) + ' points'); return true; }
  checkpoint();
  o.nodes.splice(nodeEdit.sel, 1);
  nodeEdit.sel = null;
  renderScene(); renderOverlay();
  return true;
}

// ---------- Connector ports ----------
const PORTS = { n: [0.5, 0], e: [1, 0.5], s: [0.5, 1], w: [0, 0.5] };
function portPoint(o, port) {
  const [u, v] = PORTS[port];
  return rotPt({ x: o.x + u * o.w, y: o.y + v * o.h }, center(o), o.rot || 0);
}
function nearestPort(o, p, maxDist) {
  let best = null;
  for (const k of Object.keys(PORTS)) { const q = portPoint(o, k), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < maxDist && (!best || d < best.d)) best = { k, d }; }
  return best && best.k;
}
function portsOverlay(o) {
  if (!o) return '';
  const z = state.zoom;
  return Object.keys(PORTS).map((k) => { const q = portPoint(o, k); return `<circle cx="${q.x}" cy="${q.y}" r="${5 / z}" fill="#fff" stroke="#3fa58b" stroke-width="${2 / z}"/>`; }).join('');
}
