// BioRender-style editing: ungroup an icon into editable vector parts (which stay editable in PowerPoint), circular
// arrows with adjustable ends and head size, one-click colour presets for icons and text, editable well plates,
// outlined numbered step badges, zoom-in callout wedges and labelled DNA sequence grids.

// ---------- Ungroup an icon into editable parts ----------
// Affine matrix [a, b, c, d, e, f] applied to (x, y).
const mxApply = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

// Absolute path segments (parseSvgPath: M/L/C/Q/Z) → path-object nodes, each point mapped through `map`.
// Subpaths after the first start with `move: true`; a subpath closed back onto its start drops the duplicate
// node and hands its incoming handle to the start node. Returns { nodes, closedAny }.
function segsToNodes(segs, map = (p) => p) {
  const nodes = [];
  let start = -1, closedAny = false, needMove = false, cur = null, startRaw = null;
  const add = (n) => { nodes.push(n); return n; };
  for (const s of segs) {
    const p = s.p;
    if (s.t === 'M') {
      const q = map({ x: p[0], y: p[1] });
      add({ x: q.x, y: q.y, ...(nodes.length ? { move: true } : {}) });
      start = nodes.length - 1; needMove = false; cur = { x: p[0], y: p[1] }; startRaw = cur;
      continue;
    }
    if (s.t === 'Z') {
      closedAny = true;
      if (start >= 0 && nodes.length - 1 > start) {
        const a = nodes[start], b = nodes[nodes.length - 1];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-3 * Math.max(1, Math.abs(a.x) + Math.abs(a.y))) {
          if (b.ix != null) { a.ix = b.ix; a.iy = b.iy; }
          nodes.pop();
        }
      }
      cur = startRaw; // the current point returns to the subpath start
      needMove = true;
      continue;
    }
    if (needMove && start >= 0) { // drawing on after a close without a new M: restart at the subpath start
      const a = nodes[start];
      add({ x: a.x, y: a.y, move: true });
      start = nodes.length - 1; needMove = false;
    }
    if (s.t === 'L') { const q = map({ x: p[0], y: p[1] }); add({ x: q.x, y: q.y }); cur = { x: p[0], y: p[1] }; continue; }
    let c1, c2, e;
    if (s.t === 'C') { c1 = { x: p[0], y: p[1] }; c2 = { x: p[2], y: p[3] }; e = { x: p[4], y: p[5] }; }
    else if (s.t === 'Q') { // quadratic → cubic
      const p0 = cur || { x: p[0], y: p[1] }, q1 = { x: p[0], y: p[1] }; e = { x: p[2], y: p[3] };
      c1 = { x: p0.x + (2 / 3) * (q1.x - p0.x), y: p0.y + (2 / 3) * (q1.y - p0.y) };
      c2 = { x: e.x + (2 / 3) * (q1.x - e.x), y: e.y + (2 / 3) * (q1.y - e.y) };
    } else continue;
    const prev = nodes[nodes.length - 1];
    if (prev) { const m1 = map(c1); prev.ox = m1.x; prev.oy = m1.y; }
    const m2 = map(c2), me = map(e);
    add({ x: me.x, y: me.y, ix: m2.x, iy: m2.y });
    cur = e;
  }
  return { nodes, closedAny };
}

// Path data for the basic SVG shape elements, from their attributes.
function elementPathD(tag, at) {
  const n = (k, d = 0) => { const v = parseFloat(at(k)); return isFinite(v) ? v : d; };
  switch (tag) {
    case 'path': return at('d') || '';
    case 'rect': {
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      if (!(w > 0 && h > 0)) return '';
      let rx = at('rx') != null ? n('rx') : null, ry = at('ry') != null ? n('ry') : null;
      if (rx == null) rx = ry ?? 0; if (ry == null) ry = rx;
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      if (!rx || !ry) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      return `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`;
    }
    case 'circle': case 'ellipse': {
      const cx = n('cx'), cy = n('cy'), rx = tag === 'circle' ? n('r') : n('rx'), ry = tag === 'circle' ? n('r') : n('ry');
      if (!(rx > 0 && ry > 0)) return '';
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case 'line': return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
    case 'polyline': case 'polygon': {
      const v = String(at('points') || '').trim().split(/[\s,]+/).map(Number).filter(isFinite);
      if (v.length < 4) return '';
      let d = `M${v[0]} ${v[1]}`;
      for (let i = 2; i + 1 < v.length; i += 2) d += `L${v[i]} ${v[i + 1]}`;
      return tag === 'polygon' ? d + 'Z' : d;
    }
  }
  return '';
}

// CSS colour → #rrggbb (null for none / transparent).
function cssToHex(c) {
  if (!c || c === 'none' || c === 'transparent') return null;
  const m = String(c).match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    if (p.length > 3 && p[3] === 0) return null;
    return '#' + p.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  return /^#[0-9a-f]{3,8}$/i.test(c) ? toHex(c) : c;
}

// One part's style (computed, so classes, inherited attributes and per-layer CSS all count) → path fields.
function partStyle(el, root, scale) {
  const cs = getComputedStyle(el);
  const paint = (v) => {
    const u = String(v || '').match(/url\(["']?#([^"')]+)["']?\)/);
    if (!u) return cssToHex(v);
    const g = root.querySelector(`[id="${u[1]}"]`), stops = g ? [...g.querySelectorAll('stop')] : [];
    if (!stops.length) return null;
    return cssToHex(getComputedStyle(stops[Math.floor(stops.length / 2)]).stopColor || stops[0].getAttribute('stop-color'));
  };
  let opacity = 1;
  for (let e = el; e && e !== root; e = e.parentElement) { const v = parseFloat(getComputedStyle(e).opacity); if (isFinite(v)) opacity *= v; }
  const fill = paint(cs.fill), stroke = paint(cs.stroke), sw = parseFloat(cs.strokeWidth) || 0;
  const fo = parseFloat(cs.fillOpacity), so = parseFloat(cs.strokeOpacity);
  const st = { fill: fill || 'none', stroke: stroke && sw > 0 ? stroke : 'none', strokeWidth: +(sw * scale).toFixed(2) };
  if (isFinite(fo) && fo < 1) opacity *= fill ? fo : 1;
  if (isFinite(so) && so < 1 && !fill) opacity *= so;
  if (opacity < 0.999) st.opacity = +opacity.toFixed(3);
  if (cs.strokeDasharray && cs.strokeDasharray !== 'none') st.dashStyle = /^\s*[0-9.]+(px)?\s*[, ]\s*/.test(cs.strokeDasharray) && parseFloat(cs.strokeDasharray) < 2 ? 'dotted' : 'dashed';
  st.cap = cs.strokeLinecap === 'butt' ? 'butt' : cs.strokeLinecap === 'square' ? 'square' : 'round';
  return st;
}

const PART_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text']);
const NON_RENDERED = 'defs,clipPath,mask,pattern,marker,symbol,linearGradient,radialGradient,filter,style,title,desc,metadata';

// Turn an icon into a group of editable vector parts (drawn shapes, plus text), positioned exactly where the
// icon's pieces were. Returns the group, or null when the icon has no vector parts.
function iconToParts(o) {
  const { markup, vb } = iconMarkup(o);
  const [vx, vy, vw, vh] = String(vb).split(/[\s,]+/).map(Number);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;pointer-events:none'; // not visibility:hidden: every part would inherit it and be skipped
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="ls-${o.id}" width="${vw}" height="${vh}" viewBox="${vb}" overflow="visible">${markup}</svg>`;
  document.body.append(host);
  const root = host.firstChild, parts = [];
  try {
    const rootInv = root.getScreenCTM().inverse();
    const sx = o.w / vw, sy = o.h / vh;
    const toPage = (m) => (p) => { const q = mxApply(m, p.x, p.y); return localToPage(o, { x: (q.x - vx) * sx, y: (q.y - vy) * sy }); };
    for (const el of root.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      if (!PART_TAGS.has(tag) || el.closest(NON_RENDERED)) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const ctm = rootInv.multiply(el.getScreenCTM()), m = [ctm.a, ctm.b, ctm.c, ctm.d, ctm.e, ctm.f];
      const scale = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) * Math.sqrt(sx * sy);
      if (tag === 'text') {
        const txt = (el.textContent || '').trim();
        if (!txt) continue;
        const bb = el.getBBox(), map = toPage(m), c = map({ x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 });
        const t = Make.text(txt, 0, 0, { fontSize: +((parseFloat(cs.fontSize) || 12) * scale).toFixed(1), color: cssToHex(cs.fill) || '#222222', bold: parseInt(cs.fontWeight, 10) >= 600, align: 'center' });
        t.x = c.x - t.w / 2; t.y = c.y - t.h / 2; t.rot = o.rot || 0;
        parts.push(t);
        continue;
      }
      const d = elementPathD(tag, (k) => el.getAttribute(k));
      if (!d) continue;
      const st = partStyle(el, root, scale);
      if (st.fill === 'none' && st.stroke === 'none') continue;
      const { nodes, closedAny } = segsToNodes(parseSvgPath(d), toPage(m));
      if (nodes.length < 2) continue;
      const p = makePathFromNodes(nodes, { ...st, closed: st.fill !== 'none' || closedAny });
      p.name = `Part ${parts.length + 1}`;
      parts.push(p);
    }
  } finally { host.remove(); }
  if (!parts.length) return null;
  const g = makeGroup(parts, `${layerName(o)} (parts)`);
  g.id = o.id; // arrows glued to the icon stay glued to its parts
  if (o.opacity != null && o.opacity < 1) g.opacity = o.opacity;
  return g;
}

function ungroupIcons(list = selected().filter((o) => o.type === 'icon' && !o.locked)) {
  if (!list.length) { toast('Select an icon to ungroup'); return; }
  checkpoint();
  let made = 0, total = 0;
  const newSel = [];
  for (const o of list) {
    const g = iconToParts(o);
    if (!g) { newSel.push(o.id); continue; }
    const arr = objs(), i = arr.indexOf(o);
    if (i >= 0) arr[i] = g;
    newSel.push(g.id); made++; total += g.children.length;
  }
  state.sel = newSel;
  render({ props: true });
  if (!made) toast('This icon is a picture, so it has no separate parts to edit');
  else toast(`${made > 1 ? `${made} icons` : 'Icon'} split into ${total} editable parts. Double-click to edit a part, or Ungroup again to separate them. They stay editable in PowerPoint.`, 4800);
}

// Ungroup on an icon splits it into parts; on groups it behaves as before.
const _ungroupSelectionBR = ungroupSelection;
ungroupSelection = function () {
  const icons = selected().filter((o) => o.type === 'icon' && !o.locked);
  if (icons.length && !selected().some((o) => o.type === 'group')) return ungroupIcons(icons);
  return _ungroupSelectionBR();
};

// ---------- Circular arrows ----------
function insertCircularArrow() {
  const c = viewCenter(), r = 90;
  addObjects([Make.shape('cycle', c.x - r, c.y - r, 2 * r, 2 * r, { fill: 'none', stroke: '#4a90d9', strokeWidth: 8, arcStart: 20, arcEnd: 330, headSize: 100, headEnd: 'arrow', headStart: 'none', name: 'Circular arrow' })]);
  setTool('select');
  toast('Drag the blue dots to move the ends. Width and head size are in the panel on the right.');
}
const isCycle = (o) => o && o.type === 'shape' && o.kind === 'cycle';
// World position of a point at `deg` on a cycle's ellipse.
function cyclePoint(o, deg) {
  const a = ((deg - 90) * Math.PI) / 180, rx = o.w / 2, ry = o.h / 2;
  let x = rx + rx * Math.cos(a), y = ry + ry * Math.sin(a);
  if (o.flipX) x = o.w - x; if (o.flipY) y = o.h - y;
  return rotPt({ x: o.x + x, y: o.y + y }, center(o), o.rot || 0);
}
// Angle (degrees clockwise from 12 o'clock) of a world point around a cycle.
function cycleAngleAt(o, p) {
  const c = center(o), q = rotPt(p, c, -(o.rot || 0));
  let u = (q.x - c.x) / (o.w / 2 || 1), v = (q.y - c.y) / (o.h / 2 || 1);
  if (o.flipX) u = -u; if (o.flipY) v = -v;
  return (((Math.atan2(v, u) * 180) / Math.PI + 90) % 360 + 360) % 360;
}
// Cut a circular arrow into n pieces with a gap (degrees) between them; each piece keeps the arrowhead style.
function splitCycle(o, n, gap = 14) {
  if (!isCycle(o) || n < 2) return;
  checkpoint();
  const [a0, a1] = cycleArcSpan(o), span = a1 - a0 - gap * (n - (a1 - a0 >= 359 ? 0 : 1)), each = span / n;
  if (each < 5) { toast('The arrow is too short to cut into that many pieces'); return; }
  const pieces = [];
  for (let i = 0; i < n; i++) {
    const s = a0 + i * (each + gap), copy = { ...deep(o), id: uid(), arcStart: s % 360, arcEnd: (s + each) % 360 || 360, name: `${o.name || 'Circular arrow'} ${i + 1}` };
    copy.stroke = i === 0 ? o.stroke : DG_PAL[(DG_PAL.indexOf(o.stroke) + i + 1 + DG_PAL.length) % DG_PAL.length];
    pieces.push(copy);
  }
  const arr = objs(), idx = arr.indexOf(o);
  arr.splice(idx, 1, ...pieces);
  state.sel = pieces.map((p) => p.id);
  render({ props: true });
}
function cycleSection(o) {
  const L = [o], [a0, a1] = cycleArcSpan(o);
  const setAng = (k, v) => { if (!isFinite(v)) return; setProps(L, k, ((v % 360) + 360) % 360); };
  const heads = (o.headEnd ?? 'arrow') !== 'none' ? ((o.headStart ?? 'none') !== 'none' ? 'both' : 'end') : (o.headStart ?? 'none') !== 'none' ? 'start' : 'none';
  const gap = el('input', { type: 'number', value: 14, min: 0, max: 90, style: 'width:56px' });
  return sect('Circular arrow',
    row('Line width', el('input', { type: 'range', min: 1, max: 30, step: 0.5, value: o.strokeWidth ?? 2, oninput: (e) => setProps(L, 'strokeWidth', parseFloat(e.target.value)) })),
    row('Head size', el('input', { type: 'range', min: 20, max: 300, step: 5, value: o.headSize ?? 100, oninput: (e) => setProps(L, 'headSize', parseFloat(e.target.value)) }), el('span', { class: 'note', textContent: '%' })),
    row('Heads', el('select', { onchange: (e) => { const v = e.target.value; setProps(L, 'headEnd', v === 'end' || v === 'both' ? 'arrow' : 'none'); setProps(L, 'headStart', v === 'start' || v === 'both' ? 'arrow' : 'none'); } },
      ...[['end', 'At the end'], ['start', 'At the start'], ['both', 'Both ends'], ['none', 'None']].map(([v, l]) => el('option', { value: v, textContent: l, selected: v === heads })))),
    row('Starts at', el('input', { type: 'number', step: 5, value: Math.round(a0 % 360), style: 'width:64px', oninput: (e) => setAng('arcStart', parseFloat(e.target.value)) }), el('span', { class: 'note', textContent: '°' })),
    row('Ends at', el('input', { type: 'number', step: 5, value: Math.round(a1 % 360) || 360, style: 'width:64px', oninput: (e) => setAng('arcEnd', parseFloat(e.target.value)) }), el('span', { class: 'note', textContent: '°' })),
    el('div', { class: 'btnrow' },
      btn('Full circle', () => { checkpoint(); o.arcStart = 0; o.arcEnd = 359; render({ props: true }); }),
      btn('Reverse direction', () => { checkpoint(); const s = o.arcStart ?? 0, e = o.arcEnd ?? 300; o.arcStart = (360 - e) % 360; o.arcEnd = (360 - s) % 360 || 360; o.flipX = !o.flipX; render({ props: true }); })),
    el('div', { class: 'btnrow', style: 'margin-top:6px;align-items:center' }, el('span', { class: 'note', textContent: 'Cut into' }),
      ...[2, 3, 4].map((n) => btn(`${n}`, () => splitCycle(o, n, parseFloat(gap.value) || 0))), el('span', { class: 'note', textContent: 'gap' }), gap, el('span', { class: 'note', textContent: '°' })),
    el('div', { class: 'note', textContent: 'Angles run clockwise from 12 o’clock. Drag the blue dots on the canvas to move either end; hold Shift to snap to 15°.' }));
}

// Drag handles for the two ends of a selected circular arrow.
function cycleHandlesSvg() {
  const sel = selected();
  if (sel.length !== 1 || !isCycle(sel[0]) || sel[0].locked) return '';
  const o = sel[0], [a0, a1] = cycleArcSpan(o), z = state.zoom, r = 6 / z, sw = 1.6 / z;
  return [['arcStart', a0], ['arcEnd', a1]].map(([k, deg]) => { const p = cyclePoint(o, deg); return `<circle data-cyc="${k}" cx="${p.x}" cy="${p.y}" r="${r}" fill="#3b82f6" stroke="#fff" stroke-width="${sw}" style="cursor:grab"><title>${k === 'arcStart' ? 'Start' : 'End'} of the arrow: drag to move it</title></circle>`; }).join('');
}
const _renderOverlayBR = renderOverlay;
renderOverlay = function (extra = '') { _renderOverlayBR(extra + cycleHandlesSvg()); };
svg.addEventListener('pointerdown', (e) => {
  const h = e.target.closest && e.target.closest('[data-cyc]');
  if (!h) return;
  const o = selected()[0];
  if (!isCycle(o)) return;
  e.stopPropagation(); e.preventDefault();
  checkpoint();
  const key = h.dataset.cyc;
  const move = (ev) => {
    let a = cycleAngleAt(o, toWorld(ev));
    if (ev.shiftKey) a = Math.round(a / 15) * 15;
    o[key] = Math.round(a * 10) / 10 % 360;
    if (key === 'arcEnd' && !o[key]) o[key] = 360;
    renderScene(); renderOverlay();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); render({ props: true }); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}, true);

// ---------- Colour presets for icons and text ----------
const ICON_PRESETS = ['#e57373', '#f06292', '#ba68c8', '#9575cd', '#7986cb', '#64b5f6', '#4fc3f7', '#4db6ac', '#81c784', '#aed581', '#ffd54f', '#ffb74d', '#a1887f', '#90a4ae'];
function iconPresetThumb(o, c) {
  const native = !!ICON_MAP[o.iconId];
  const { markup, vb } = iconMarkup({ ...o, id: 'pv', color: native ? c || ICON_MAP[o.iconId].color : o.color, tint: native ? o.tint : c, colorMap: null, layerStyle: null });
  return `<svg viewBox="${vb}" width="30" height="30" preserveAspectRatio="xMidYMid meet" overflow="hidden">${markup}</svg>`;
}
function applyIconPreset(list, c) {
  checkpoint();
  for (const o of list) {
    if (ICON_MAP[o.iconId]) o.color = c || ICON_MAP[o.iconId].color; else o.tint = c;
    o.colorMap = null;
  }
  render({ props: true });
}
function iconPresetsSection(list) {
  const o = list[0];
  const tile = (c, title) => {
    const b = el('button', { class: 'br-preset', title, onclick: () => applyIconPreset(list, c) });
    b.innerHTML = iconPresetThumb(o, c);
    return b;
  };
  return sect('Colour presets', el('div', { class: 'br-presets' }, tile(null, 'Original colours'), ...ICON_PRESETS.map((c) => tile(c, c))),
    el('div', { class: 'note', textContent: list.length > 1 ? `Click a preset to recolour all ${list.length} selected icons.` : 'Click a preset to recolour the icon. Shift-select several icons to recolour them together.' }));
}
// Text style presets: colour, weight and an optional label background.
const TEXT_PRESETS = [
  ['#222222', false], ['#4d5b6b', false], ['#23395d', true], ['#2f6db5', false], ['#2a8c74', false], ['#c0392b', false],
  ['#7d4fb8', false], ['#c46a1a', false], ['#b83f7a', false], ['#2f6db5', true], ['#2a8c74', true], ['#c0392b', true],
  ['#ffffff', true, '#2f6db5'], ['#ffffff', true, '#2a8c74'], ['#ffffff', true, '#c0392b'], ['#23395d', true, '#e3ecf7'], ['#7d4fb8', true, '#efe7f8'], ['#8a5a00', true, '#fdf1d6'],
];
function textPresetsSection(list) {
  const apply = ([color, bold, bg]) => { checkpoint(); for (const o of list) { o.color = color; o.bold = bold; o.bg = bg || null; postEdit(o); } render({ props: true }); };
  return sect('Text presets', el('div', { class: 'br-presets' }, ...TEXT_PRESETS.map((p) => el('button', {
    class: 'br-preset br-text', title: `${p[0]}${p[1] ? ' bold' : ''}${p[2] ? ` on ${p[2]}` : ''}`, textContent: 'Aa', onclick: () => apply(p),
    style: `color:${p[0]};font-weight:${p[1] ? 700 : 400};background:${p[2] || '#f4f6f9'}`,
  }))));
}

// ---------- Numbered step badges ----------
const badgeStylePref = () => { try { return localStorage.getItem('scicanvas:badgeStyle') || 'filled'; } catch { return 'filled'; } };
const BADGE_STYLES = {
  filled: { fill: '#23395d', stroke: 'none', strokeWidth: 0, labelColor: '#ffffff' },
  outline: { fill: '#ffffff', stroke: '#1d1d1d', strokeWidth: 2.5, labelColor: '#1d1d1d' },
  soft: { fill: '#e3ecf7', stroke: '#2f6db5', strokeWidth: 2, labelColor: '#23395d' },
};
function badgeToolStyle() { return { ...(BADGE_STYLES[badgeStylePref()] || {}) }; }
function renumberBadges() {
  const list = objs().filter((o) => o.badge);
  if (!list.length) return;
  checkpoint();
  const rowH = Math.max(...list.map((o) => o.h)) * 1.5;
  list.sort((a, b) => Math.round(a.y / rowH) - Math.round(b.y / rowH) || a.x - b.x).forEach((o, i) => { o.label = String(i + 1); });
  render({ props: true });
  toast(`Renumbered ${list.length} badges in reading order`);
}
function badgeSection(o) {
  const setStyle = (k) => { checkpoint(); Object.assign(o, BADGE_STYLES[k]); try { localStorage.setItem('scicanvas:badgeStyle', k); } catch { /* private window */ } render({ props: true }); };
  return sect('Step badge',
    row('Number', el('input', { type: 'text', value: o.label || '', style: 'width:64px', oninput: (e) => setProps([o], 'label', e.target.value) })),
    el('div', { class: 'btnrow' }, btn('Filled', () => setStyle('filled')), btn('Outline', () => setStyle('outline')), btn('Soft', () => setStyle('soft')), btn('Renumber all', renumberBadges)),
    el('div', { class: 'note', textContent: 'The badge tool (N) uses the style you pick here for new badges.' }));
}

// ---------- Zoom callout wedge ----------
// A translucent cone that joins a small region (the source) to its enlarged callout (the target). It is a connector
// with style 'zoom', so it follows both objects; it is drawn as the convex hull of their outlines.
function outlinePoints(t) {
  const c = center(t);
  let pts;
  if (t.type === 'ellipse' || (t.type === 'shape' && t.kind === 'cycle') || (t.clip === 'ellipse')) pts = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * 2 * Math.PI; return { x: c.x + (t.w / 2) * Math.cos(a), y: c.y + (t.h / 2) * Math.sin(a) }; });
  else pts = [{ x: t.x, y: t.y }, { x: t.x + t.w, y: t.y }, { x: t.x + t.w, y: t.y + t.h }, { x: t.x, y: t.y + t.h }];
  return pts.map((p) => rotPt(p, c, t.rot || 0));
}
function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
function zoomEnds(o, objects) {
  const find = (end) => (end && end.id ? objects.find((x) => x.id === end.id) : null);
  const A = find(o.from), B = find(o.to);
  return { A, B, pa: A ? outlinePoints(A) : [{ x: o.from.x, y: o.from.y }], pb: B ? outlinePoints(B) : [{ x: o.to.x, y: o.to.y }] };
}
function zoomWedgeHull(o, objects) { const { pa, pb } = zoomEnds(o, objects); return convexHull([...pa, ...pb]); }
function zoomWedgeSvg(o, objects) {
  const { pa, pb } = zoomEnds(o, objects), hull = convexHull([...pa, ...pb]);
  if (hull.length < 3) return '';
  const ca = polyCentroid(pa), cb = polyCentroid(pb), col = o.color || '#7fb8c4', op = o.wedgeOpacity ?? 0.45, far = o.fade === false ? op : op * 0.2;
  const pts = hull.map((p) => `${+p.x.toFixed(2)},${+p.y.toFixed(2)}`).join(' ');
  const edge = o.width > 0 && o.wedgeEdges ? ` stroke="${col}" stroke-width="${o.width}" stroke-linejoin="round"` : '';
  return `<defs><linearGradient id="zw-${o.id}" gradientUnits="userSpaceOnUse" x1="${ca.x}" y1="${ca.y}" x2="${cb.x}" y2="${cb.y}"><stop offset="0" stop-color="${col}" stop-opacity="${op}"/><stop offset="1" stop-color="${col}" stop-opacity="${far}"/></linearGradient></defs><polygon points="${pts}" fill="url(#zw-${o.id})"${edge}/>`;
}
const polyCentroid = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
// PowerPoint: a freeform polygon with a transparent gradient (not glued, but editable).
function zoomWedgeXml(o, objects, T, id, name, alpha) {
  const { pa, pb } = zoomEnds(o, objects), hull = convexHull([...pa, ...pb]).map((p) => slidePt(T, p));
  if (hull.length < 3) return '';
  const bx = polyBounds(hull);
  const segs = hull.map((p, i) => ({ t: i ? 'L' : 'M', p: [p.x - bx.x, p.y - bx.y] })).concat([{ t: 'Z' }]);
  const ca = slidePt(T, polyCentroid(pa)), cb = slidePt(T, polyCentroid(pb));
  const ang = ((((Math.atan2(cb.y - ca.y, cb.x - ca.x) * 180) / Math.PI) % 360) + 360) % 360;
  const col = o.color || '#7fb8c4', op = (o.wedgeOpacity ?? 0.45) * alpha, far = o.fade === false ? op : op * 0.2;
  const fill = `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${clrXml(col, op)}</a:gs><a:gs pos="100000">${clrXml(col, far)}</a:gs></a:gsLst><a:lin ang="${Math.round(ang * 60000)}" scaled="0"/></a:gradFill>`;
  return spXml(id, name, { box: bx, geom: custGeomXml([{ xml: segsToPathXml(segs, 1, 1) }], bx.w, bx.h, { sites: false }), fill, line: '<a:ln><a:noFill/></a:ln>' });
}
function addZoomWedge() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (sel.length !== 2) { toast('Select two objects: the small region and the enlarged callout'); return; }
  const [src, dst] = [...sel].sort((a, b) => a.w * a.h - b.w * b.h);
  const fillOf = (t) => (t.type === 'icon' ? t.tint || t.color : t.stroke && t.stroke !== 'none' ? t.stroke : t.fill);
  const col = /^#[0-9a-f]{6}$/i.test(fillOf(dst) || '') ? Color.light(fillOf(dst), 0.25) : '#7fb8c4';
  checkpoint();
  const w = Make.connector({ id: src.id }, { id: dst.id }, { style: 'zoom', head: 'none', tail: 'none', color: col, width: 0, wedgeOpacity: 0.45, fade: true, name: 'Zoom wedge' });
  const arr = objs(), i = Math.min(arr.indexOf(src), arr.indexOf(dst));
  arr.splice(Math.max(0, i), 0, w);
  state.sel = [w.id];
  render({ props: true });
  toast('Zoom wedge added behind both objects. It follows them when you move either one.');
}
function zoomSection(o) {
  const L = [o];
  return sect('Zoom wedge',
    row('Colour', color(L, 'color')), swatches(L, 'color'),
    row('Opacity', el('input', { type: 'range', min: 0.05, max: 1, step: 0.05, value: o.wedgeOpacity ?? 0.45, oninput: (e) => setProps(L, 'wedgeOpacity', parseFloat(e.target.value)) })),
    row('', check(L, 'fade', 'Fade towards the callout')),
    row('', check(L, 'wedgeEdges', 'Outline edges')), o.wedgeEdges ? row('Edge width', num(L, 'width', 0.5, 0)) : null,
    el('div', { class: 'btnrow' }, btn('Swap direction', () => { checkpoint(); [o.from, o.to] = [o.to, o.from]; render({ props: true }); })));
}

// ---------- Editable well plates ----------
const PLATE_FORMATS = { 6: [2, 3, 64], 12: [3, 4, 52], 24: [4, 6, 40], 48: [6, 8, 32], 96: [8, 12, 25], 384: [16, 24, 13] };
addDiagram('wellplate', {
  label: 'Well plate (editable wells)', group: 'Lab methods', desc: 'A multi-well plate whose wells are separate circles. Double-click the plate, Shift-click wells, then pick a colour or preset.',
  fields: [
    { key: 'format', label: 'Wells', type: 'select', def: '24', options: Object.keys(PLATE_FORMATS).map((k) => [k, `${k}-well`]) },
    { key: 'fillMode', label: 'Fill wells', type: 'select', def: 'empty', options: [['empty', 'Empty'], ['row', 'By row'], ['col', 'By column'], ['dilution', 'Serial dilution (by column)'], ['checker', 'Checkerboard']] },
    { key: 'colour', label: 'Colour (for dilution / checkerboard)', type: 'text', def: '#c77cb1' },
    { key: 'labels', label: 'Row and column labels', type: 'check', def: true },
  ],
  build(p) {
    const [R, C, pitch] = PLATE_FORMATS[p.format] || PLATE_FORMATS[24], lab = p.labels !== false, o = [];
    const d = pitch * 0.8, left = lab ? pitch * 1.1 : pitch * 0.6, top = lab ? pitch * 1.05 : pitch * 0.6;
    const W = left + C * pitch + pitch * 0.45, H = top + R * pitch + pitch * 0.45, ch = Math.min(W, H) * 0.08;
    const base = /^#[0-9a-f]{6}$/i.test(p.colour || '') ? p.colour : '#c77cb1';
    o.push(dgPoly([[ch, 0], [W, 0], [W, H], [0, H], [0, ch]], { fill: '#e4edf2', stroke: '#93a9b7', strokeWidth: 2, name: 'Plate' }));
    o.push(Make.rect(left - pitch * 0.25, top - pitch * 0.25, C * pitch + pitch * 0.5 - pitch * 0.2 + pitch * 0.2, R * pitch + pitch * 0.3, { fill: '#f2f7fa', stroke: '#b7c7d1', strokeWidth: 1.2, radius: Math.max(3, pitch * 0.15), name: 'Well area' }));
    const fs = Math.max(6, Math.min(15, pitch * 0.42));
    if (lab) {
      for (let c = 0; c < C; c++) o.push(dgCenteredText(String(c + 1), left + c * pitch + pitch / 2 - pitch * 0.1, top - pitch * 0.55, { fontSize: fs, color: '#4d5b6b' }));
      for (let r = 0; r < R; r++) o.push(dgCenteredText(String.fromCharCode(65 + r), left - pitch * 0.62, top + r * pitch + pitch / 2 - pitch * 0.1, { fontSize: fs, color: '#4d5b6b' }));
    }
    o.push(Make.ellipse(pitch * 0.18, H - pitch * 0.42 - Math.min(10, pitch * 0.3), Math.min(10, pitch * 0.3), Math.min(10, pitch * 0.3), { fill: 'none', stroke: '#93a9b7', strokeWidth: 1.2, name: 'Orientation mark' }));
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      let fill = '#ffffff';
      if (p.fillMode === 'row') fill = Color.light(DG_PAL[r % DG_PAL.length], 0.55);
      else if (p.fillMode === 'col') fill = Color.light(DG_PAL[c % DG_PAL.length], 0.55);
      else if (p.fillMode === 'dilution') fill = Color.light(base, Math.min(0.92, (c / Math.max(1, C - 1)) * 0.9));
      else if (p.fillMode === 'checker') fill = (r + c) % 2 ? '#ffffff' : Color.light(base, 0.35);
      o.push(Make.ellipse(left + c * pitch + (pitch - d) / 2 - pitch * 0.1, top + r * pitch + (pitch - d) / 2 - pitch * 0.1, d, d, { fill, stroke: '#6f8796', strokeWidth: Math.max(0.8, pitch * 0.05), name: `${String.fromCharCode(65 + r)}${c + 1}` }));
    }
    return [makeGroup(o, `${p.format || 24}-well plate`)];
  },
});

// ---------- DNA sequence grid ----------
const DNA_COMP = { A: 'T', T: 'A', G: 'C', C: 'G', U: 'A', N: 'N', R: 'Y', Y: 'R', S: 'S', W: 'W', K: 'M', M: 'K' };
// "3-8 | #b9e3df" / "12" / "4-6" → [{ a, b, colour }] with 1-based inclusive positions.
function parseRanges(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { // not dgLines: it strips '# comments', which would eat the colours
    const [r, c] = dgParts(l), m = String(r).match(/^(\d+)\s*(?:[-–:]\s*(\d+))?$/);
    return m ? { a: +m[1], b: +(m[2] || m[1]), colour: c && /^#[0-9a-f]{3,6}$/i.test(c) ? c : null } : null;
  }).filter(Boolean);
}
function buildSequenceGrid(p) {
  const seq = String(p.seq || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 120);
  if (!seq) throw new Error('type a sequence');
  const both = p.complement !== false, n = seq.length, cell = Math.max(14, Math.min(60, parseFloat(p.cell) || 28));
  const shade = parseRanges(p.highlight), bold = parseRanges(p.bold);
  const strands = both ? [seq, [...seq].map((b) => DNA_COMP[b] || 'N').join('')] : [seq];
  const inRange = (list, i) => list.find((r) => i + 1 >= r.a && i + 1 <= r.b);
  const cells = strands.map((s) => [...s].map((b, i) => (inRange(bold, i) ? `{b|${b}}` : b)));
  const cellFill = strands.map((s, r) => [...s].map((_, i) => { const h = inRange(shade, i); return h ? h.colour || Color.light('#3fa58b', 0.55 + 0.15 * r) : null; }));
  const x0 = cell * 1.6, o = [];
  const t = Make.table(strands.length, n, x0, 0, { w: n * cell, h: strands.length * cell, cells, cellFill, header: false, stripe: false, fontSize: Math.round(cell * 0.6), border: '#555555', borderWidth: 1.2, fill: '#f3f3f3', color: '#222222', align: 'center', name: 'Sequence' });
  o.push(t);
  if (p.ends !== false) {
    const fs = Math.round(cell * 0.75);
    strands.forEach((_, r) => {
      const y = r * cell + cell / 2, [l, rr] = r ? ['3′', '5′'] : ['5′', '3′'];
      o.push(dgLine([[x0 - cell * 0.55, y], [x0, y]], { strokeWidth: 1.2, stroke: '#555555' }), dgLine([[x0 + n * cell, y], [x0 + n * cell + cell * 0.55, y]], { strokeWidth: 1.2, stroke: '#555555' }));
      o.push(dgCenteredText(l, x0 - cell * 1.05, y, { fontSize: fs, color: '#444444' }), dgCenteredText(rr, x0 + n * cell + cell * 1.05, y, { fontSize: fs, color: '#444444' }));
    });
  }
  return o;
}
addDiagram('seqgrid', {
  label: 'DNA sequence grid', group: 'Biology', desc: 'A double-stranded sequence in boxed cells with 5′/3′ ends, shaded and bold positions (e.g. TALEN or guide binding sites).',
  fields: [
    { key: 'seq', label: 'Sequence (top strand, 5′→3′)', type: 'textarea', rows: 3, def: 'TGTCAAGGTCGTAATCTGCT' },
    { key: 'complement', label: 'Show the complementary strand', type: 'check', def: true },
    { key: 'highlight', label: 'Shade positions (one range per line; optional | colour)', type: 'textarea', rows: 3, def: '2-3 | #9ccfd0\n6-8 | #b9e3df\n9-16 | #d8efed' },
    { key: 'bold', label: 'Bold positions (one range per line)', type: 'textarea', rows: 2, def: '2-16' },
    { key: 'cell', label: 'Cell size (px)', type: 'number', def: 28 },
    { key: 'ends', label: 'Label the 5′ and 3′ ends', type: 'check', def: true },
  ],
  build: buildSequenceGrid,
});

// ---------- Panels, context bar, menus ----------
const _renderPropsBR = renderProps;
renderProps = function () {
  _renderPropsBR();
  const sel = selected(), P = $('#props');
  if (!sel.length) return;
  const o = sel[0];
  const after = (title, node) => { const s = [...P.querySelectorAll('.sect')].find((x) => (x.querySelector('h3')?.textContent || '') === title); if (s) s.after(node); else P.append(node); };
  const icons = sel.filter((x) => x.type === 'icon');
  if (icons.length && icons.length === sel.length) {
    after(sel.length > 1 ? `Icon colour (${icons.length})` : 'Colour', iconPresetsSection(icons));
    if (sel.length === 1) after('Colour presets', sect('Edit parts', el('div', { class: 'note', textContent: 'Ungroup splits the icon into separate shapes you can recolour, move or delete. They stay separate, editable shapes in PowerPoint.' }), el('div', { class: 'btnrow' }, btn('Ungroup into parts', () => ungroupIcons([o]), 'primary'), btn('Select same icons', () => selectMatching('icon')))));
  }
  const texts = sel.filter((x) => x.type === 'text');
  if (texts.length && texts.length === sel.length) after(sel.length > 1 ? `${sel.length} objects` : 'Text', textPresetsSection(texts));
  if (sel.length === 1 && isCycle(o)) P.querySelector('.sect').after(cycleSection(o));
  if (sel.length === 1 && o.type === 'ellipse' && o.badge) P.querySelector('.sect').after(badgeSection(o));
  if (sel.length === 1 && o.type === 'connector' && o.style === 'zoom') P.querySelector('.sect').after(zoomSection(o));
  if (sel.length === 2 && sel.every((x) => x.type !== 'connector')) P.append(sect('Zoom callout', el('div', { class: 'note', textContent: 'Join a small region to its enlarged view with a translucent wedge.' }), btn('Add zoom wedge', addZoomWedge)));
};

Object.assign(CTX_SVG, {
  ungroupIcon: '<rect x="2" y="2" width="6" height="6" rx="1" fill="currentColor"/><rect x="10" y="10" width="6" height="6" rx="1" fill="currentColor" opacity=".55"/><path d="M10 3h5v5M3 10v5h5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.6"/>',
  replace: '<rect x="2" y="2" width="7" height="6" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="10" width="7" height="6" rx="1" fill="currentColor"/><path d="M12 3.5h2.5V7M14.5 7l-1.6-1.6M6 14.5H3.5V11M3.5 11l1.6 1.6" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  same: '<circle cx="5" cy="5" r="3" fill="currentColor"/><circle cx="13" cy="5" r="3" fill="currentColor"/><circle cx="5" cy="13" r="3" fill="currentColor"/><circle cx="13" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  wedge: '<circle cx="12.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 15l6.3-11.4M3 15l11.8-4.6" stroke="currentColor" stroke-width="1.2" opacity=".7"/><circle cx="3" cy="15" r="1.6" fill="currentColor"/>',
});
const _updateContextBarBR = updateContextBar;
updateContextBar = function () {
  _updateContextBarBR();
  const bar = $('#ctxbar');
  if (bar.classList.contains('hidden')) return;
  const sel = selected(), extra = [];
  if (sel.length === 1 && sel[0].type === 'icon') extra.push(ctxBtn('ungroupIcon', 'ungroupIcon', 'Ungroup into editable parts (⇧⌘G)'), ctxBtn('replace', 'replaceSel', 'Replace icon'), ctxBtn('same', 'selectSameIcon', 'Select same icons'));
  if (sel.length === 2 && sel.every((o) => o.type !== 'connector')) extra.push(ctxBtn('wedge', 'zoomWedge', 'Zoom callout wedge'));
  if (!extra.length) return;
  const w0 = bar.offsetWidth, sr = stage.getBoundingClientRect();
  bar.insertAdjacentHTML('beforeend', '<span class="ctxsep"></span>' + extra.join(''));
  const left = parseFloat(bar.style.left) - (bar.offsetWidth - w0) / 2;
  bar.style.left = Math.max(6, Math.min(sr.width - bar.offsetWidth - 6, left)) + 'px';
};
const _contextMenuTemplateBR = contextMenuTemplate;
contextMenuTemplate = function () {
  const t = _contextMenuTemplateBR(), sel = selected(), add = [];
  if (sel.length && sel.every((o) => o.type === 'icon')) add.push({ label: 'Ungroup into editable parts', cmd: 'ungroupIcon' });
  if (sel.length === 2 && sel.every((o) => o.type !== 'connector')) add.push({ label: 'Add zoom callout wedge', cmd: 'zoomWedge' });
  if (sel.length === 1 && isCycle(sel[0])) add.push({ label: 'Cut circular arrow in two', cmd: 'splitCycle2' });
  if (!add.length) return t;
  const i = t.findIndex((x) => x.label === 'Transform…');
  t.splice(i < 0 ? t.length : i, 0, ...add);
  return t;
};
Object.assign(ARRANGE_COMMANDS, {
  ungroupIcon: () => ungroupIcons(),
  zoomWedge: addZoomWedge,
  circularArrow: insertCircularArrow,
  splitCycle2: () => splitCycle(selected()[0], 2),
  renumberBadges,
});
