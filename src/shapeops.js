// Drawing power tools: boolean shape operations, splitting brushes into editable pieces,
// membrane-aware placement (receptors snap into a lipid bilayer or onto DNA and follow it),
// and pathway auto-layout, including building a laid-out pathway from typed text.

// ---------- Geometry helpers ----------
let _probePath = null;
function sampleD(d, spacing = 1.5) {
  if (!_probePath) { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; _probePath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); s.append(_probePath); document.body.append(s); }
  // One ring per subpath (split at absolute moves).
  return String(d).split(/(?=M)/).map((sub) => sub.trim()).filter(Boolean).map((sub) => {
    _probePath.setAttribute('d', sub);
    const L = _probePath.getTotalLength(), n = Math.max(8, Math.min(1500, Math.ceil(L / spacing))), out = [];
    for (let i = 0; i < n; i++) { const p = _probePath.getPointAtLength((i / n) * L); out.push({ x: p.x, y: p.y }); }
    return out;
  }).filter((r) => r.length >= 3);
}
// Local → page coordinates for an object (rotation about its centre, flips).
function localToPage(o, p) {
  let x = o.flipX ? o.w - p.x : p.x, y = o.flipY ? o.h - p.y : p.y;
  return rotPt({ x: o.x + x, y: o.y + y }, { x: o.x + o.w / 2, y: o.y + o.h / 2 }, o.rot || 0);
}
function localOutlineD(o) {
  if (o.type === 'path' && o.closed) return nodesToD(scaledNodes(o), true);
  if (o.type === 'rect') { const r = Math.min(o.radius || 0, o.w / 2, o.h / 2); return r ? `M${r} 0H${o.w - r}A${r} ${r} 0 0 1 ${o.w} ${r}V${o.h - r}A${r} ${r} 0 0 1 ${o.w - r} ${o.h}H${r}A${r} ${r} 0 0 1 0 ${o.h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z` : `M0 0H${o.w}V${o.h}H0Z`; }
  if (o.type === 'ellipse') return `M0 ${o.h / 2}A${o.w / 2} ${o.h / 2} 0 1 1 ${o.w} ${o.h / 2}A${o.w / 2} ${o.h / 2} 0 1 1 0 ${o.h / 2}Z`;
  if (o.type === 'shape' && !OPEN_SHAPES.has(o.kind)) return shapePath(o.kind, o.w, o.h, o).split(/(?=M)/)[0];
  return null;
}
const canBoolean = (o) => !!localOutlineD(o);
// Polygon-clipping geometry for an object: evenodd rings are combined with XOR so holes stay holes.
function objectGeom(o) {
  const rings = sampleD(localOutlineD(o), Math.max(0.8, Math.min(o.w, o.h) / 160)).map((r) => r.map((p) => { const q = localToPage(o, p); return [q.x, q.y]; }));
  if (!rings.length) return null;
  const close = (r) => [...r, r[0]];
  let g = [[close(rings[0])]];
  for (const r of rings.slice(1)) g = polygonClipping.xor(g, [[close(r)]]);
  return g;
}
function geomToPath(mp, style) {
  const nodes = [];
  mp.forEach((poly) => poly.forEach((ring) => {
    const pts = simplify(ring.slice(0, -1).map(([x, y]) => ({ x, y })), 0.35);
    pts.forEach((p, i) => nodes.push(i === 0 && nodes.length ? { x: p.x, y: p.y, move: true } : { x: p.x, y: p.y }));
  }));
  if (nodes.length < 3) return null;
  const keep = ['fill', 'fill2', 'shade', 'gradDir', 'stroke', 'strokeWidth', 'dash', 'dashStyle', 'opacity', 'glow', 'glowSize', 'shadow', 'name'];
  const extra = Object.fromEntries(keep.filter((k) => style[k] !== undefined).map((k) => [k, style[k]]));
  if (!extra.fill || extra.fill === 'none') extra.fill = '#9bc4f0';
  return makePathFromNodes(nodes, { cap: 'round', ...extra, closed: true });
}

// ---------- Boolean operations ----------
function booleanOp(kind) {
  if (typeof polygonClipping === 'undefined') { toast('Shape operations are not loaded'); return; }
  const list = objs(), sel = selected().filter(canBoolean).sort((a, b) => list.indexOf(a) - list.indexOf(b));
  const skipped = selected().length - sel.length;
  if (sel.length < 2) { toast('Select two or more closed shapes (drawings, rectangles, ellipses or shapes)' + (skipped ? ' — icons, text and groups can’t be combined' : '')); return; }
  const geoms = sel.map(objectGeom);
  if (geoms.some((g) => !g)) { toast('One of the shapes has no area'); return; }
  let res;
  try {
    if (kind === 'union') res = polygonClipping.union(...geoms);
    else if (kind === 'intersect') res = polygonClipping.intersection(...geoms);
    else if (kind === 'subtract') res = polygonClipping.difference(geoms[0], ...geoms.slice(1));
    else res = polygonClipping.xor(...geoms);
  } catch (e) { toast('Could not combine these shapes: ' + e.message); return; }
  if (!res.length) { toast(kind === 'intersect' ? 'The shapes don’t overlap' : 'Nothing is left'); return; }
  const base = sel[0], out = geomToPath(res, { ...base, name: base.name || { union: 'Union', intersect: 'Intersection', subtract: 'Cut-out', exclude: 'Exclusion' }[kind] });
  if (!out) return;
  checkpoint();
  const i = list.indexOf(base);
  page().objects = list.filter((o) => !sel.includes(o));
  page().objects.splice(Math.min(i, page().objects.length), 0, out);
  state.sel = [out.id];
  render({ props: true });
  toast({ union: 'Combined', intersect: 'Kept the overlap', subtract: 'Cut the front shapes out of the back one', exclude: 'Removed the overlap' }[kind] + (skipped ? ` (${skipped} non-shape object${skipped === 1 ? '' : 's'} ignored)` : ''));
}

// ---------- Split a brush into editable pieces ----------
function splitBrush(b) {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${brushSvg(b)}</svg>`, 'image/svg+xml');
  const P = (x, y) => localToPage(b, { x: +x, y: +y }), pieces = [];
  const attr = (e, k, inh) => e.getAttribute(k) ?? inh[k];
  const style = (e, inh) => ({ fill: attr(e, 'fill', inh) || 'none', stroke: attr(e, 'stroke', inh) || 'none', strokeWidth: +(attr(e, 'stroke-width', inh) || 0), opacity: e.getAttribute('opacity') != null ? +e.getAttribute('opacity') : undefined });
  const walk = (node, inh) => {
    for (const e of node.children) {
      const tag = e.tagName.toLowerCase(), st = style(e, inh);
      if (tag === 'g') { walk(e, { ...inh, fill: e.getAttribute('fill') ?? inh.fill, stroke: e.getAttribute('stroke') ?? inh.stroke, 'stroke-width': e.getAttribute('stroke-width') ?? inh['stroke-width'] }); continue; }
      if (tag === 'circle' || tag === 'ellipse') {
        const rx = +(e.getAttribute('r') || e.getAttribute('rx')), ry = +(e.getAttribute('r') || e.getAttribute('ry')), c = P(e.getAttribute('cx'), e.getAttribute('cy'));
        const m = /rotate\(([-\d.e]+)/.exec(e.getAttribute('transform') || '');
        pieces.push({ id: uid(), type: 'ellipse', x: c.x - rx, y: c.y - ry, w: 2 * rx, h: 2 * ry, rot: ((m ? +m[1] : 0) + (b.rot || 0)) % 360, ...st, strokeWidth: st.stroke === 'none' ? 0 : st.strokeWidth });
      } else if (tag === 'line') {
        pieces.push(makePathFromNodes([P(e.getAttribute('x1'), e.getAttribute('y1')), P(e.getAttribute('x2'), e.getAttribute('y2'))], { stroke: st.stroke, strokeWidth: st.strokeWidth, cap: e.getAttribute('stroke-linecap') || 'butt' }));
      } else if (tag === 'polyline' || tag === 'polygon') {
        const nums = (e.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number), pts = [];
        for (let i = 0; i + 1 < nums.length; i += 2) pts.push(P(nums[i], nums[i + 1]));
        if (pts.length >= 2) pieces.push(makePathFromNodes(pts, tag === 'polygon' ? { closed: true, fill: st.fill, shade: 'flat', stroke: st.stroke, strokeWidth: st.strokeWidth } : { stroke: st.stroke, strokeWidth: st.strokeWidth, cap: e.getAttribute('stroke-linecap') || 'round' }));
      } else if (tag === 'path') {
        // Brushes write paths as M/L polylines; each move starts a separate piece.
        (e.getAttribute('d') || '').split(/(?=M)/).forEach((sub) => {
          const nums = sub.match(/-?[\d.]+(e-?\d+)?/g), pts = [];
          if (!nums) return;
          for (let i = 0; i + 1 < nums.length; i += 2) pts.push(P(nums[i], nums[i + 1]));
          if (pts.length >= 2) pieces.push(makePathFromNodes(pts, { stroke: st.stroke, strokeWidth: st.strokeWidth, cap: e.getAttribute('stroke-linecap') || 'round', piece: 'segment' }));
        });
      }
    }
  };
  walk(doc.documentElement, {});
  pieces.forEach((p) => { if (p.opacity === undefined) delete p.opacity; });
  // Membranes: regroup each lipid (head + its two tails) so a whole lipid can be deleted in one click.
  if (b.kind === 'membrane') {
    const tails = pieces.filter((p) => p.piece === 'segment'), heads = pieces.filter((p) => p.type === 'ellipse');
    if (tails.length === heads.length * 2) {
      tails.forEach((t) => delete t.piece);
      return heads.map((hd, i) => makeGroup([tails[2 * i], tails[2 * i + 1], hd], 'Lipid'));
    }
  }
  pieces.forEach((p) => delete p.piece);
  return pieces;
}
function splitBrushSelection() {
  const sel = selected().filter((o) => o.type === 'brush');
  if (!sel.length) { toast('Select a brush (membrane, DNA, actin…) first'); return; }
  checkpoint();
  const list = objs(), ids = [];
  for (const b of sel) {
    const parts = splitBrush(b);
    if (!parts.length) continue;
    const name = { membrane: 'Membrane', dna: 'DNA', actin: 'Actin', microtubule: 'Microtubule', epithelium: 'Epithelium', cells: 'Cells', vessel: 'Vessel', vesicles: 'Vesicles', ubiquitin: 'Ubiquitin chain' }[b.kind] || 'Brush';
    const g = makeGroup(parts, `${name} (pieces)`);
    if (b.dockFollowers) g.dockFollowers = b.dockFollowers;
    list[list.indexOf(b)] = g;
    ids.push(g.id);
  }
  state.sel = ids;
  render({ props: true });
  toast('Split into pieces: double-click to go inside the group, then select and delete or recolour pieces');
}

// ---------- Membrane-aware placement ----------
const DOCK_KINDS = ['membrane', 'dna'];
function brushPagePolyline(b) {
  const pts = b.nodes ? flattenNodes(scaledNodes(b), b.closed) : b.pts.map(([u, v]) => ({ x: u * b.w, y: v * b.h }));
  const out = pts.map((p) => localToPage(b, p));
  if (b.closed && out.length) out.push(out[0]);
  return out;
}
function nearestOnPolyline(pl, p) {
  let best = null;
  for (let i = 0; i + 1 < pl.length; i++) {
    const a = pl[i], c = pl[i + 1], dx = c.x - a.x, dy = c.y - a.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)), q = { x: a.x + dx * t, y: a.y + dy * t }, d = Math.hypot(p.x - q.x, p.y - q.y);
    if (!best || d < best.d) best = { x: q.x, y: q.y, d, ang: (Math.atan2(dy, dx) * 180) / Math.PI };
  }
  return best;
}
const dockable = (o) => ['icon', 'path', 'group', 'shape', 'ellipse', 'rect'].includes(o.type) && !o.locked;
function dockTo(o, b, near) {
  const n = near || nearestOnPolyline(brushPagePolyline(b), center(o));
  if (!n) return false;
  const off = o.dockOffset || 0, rad = ((n.ang + 90) * Math.PI) / 180;
  o.x = n.x + Math.cos(rad) * off - o.w / 2; o.y = n.y + Math.sin(rad) * off - o.h / 2;
  // Keep whichever of the two orientations along the membrane is closest to the current one.
  const cur = o.rot || 0, a1 = ((n.ang % 360) + 360) % 360, a2 = (a1 + 180) % 360;
  const diff = (a) => Math.abs(((a - cur + 540) % 360) - 180);
  let r = diff(a1) <= diff(a2) ? a1 : a2;
  if (r > 180) r -= 360;
  o.rot = Math.abs(r) < 4 ? 0 : Math.round(r * 10) / 10;
  o.dock = b.id;
  return true;
}
function findDockTarget(o) {
  const c = center(o);
  let best = null;
  for (const b of objs()) {
    if (b.type !== 'brush' || !DOCK_KINDS.includes(b.kind) || b.hidden) continue;
    const n = nearestOnPolyline(brushPagePolyline(b), c), reach = Math.max((b.size || 8) * 2.6, 14, Math.min(o.w, o.h) * 0.2);
    if (n && n.d <= reach && (!best || n.d < best.n.d)) best = { b, n };
  }
  return best;
}
function membraneSnapOn() { try { return localStorage.getItem('scicanvas:membraneSnap') !== 'off'; } catch { return true; } }
// Docked objects ride along when their membrane is dragged.
function moveStartHook(drag) {
  const moving = new Set(drag.orig.map((r) => r.o.id)), brushes = drag.orig.filter((r) => r.o.type === 'brush').map((r) => r.o.id);
  if (!brushes.length) return;
  for (const o of objs()) if (o.dock && brushes.includes(o.dock) && !moving.has(o.id)) drag.orig.push({ o, x: o.x, y: o.y, from: { ...o.from }, to: { ...o.to } });
}
function moveEndHook(d, e) {
  if (e.metaKey || e.ctrlKey || !membraneSnapOn()) return;
  const moved = d.orig.map((r) => r.o);
  if (moved.some((o) => o.type === 'brush')) return; // moving the membrane itself (and its riders)
  const sel = moved.filter(dockable);
  if (sel.length !== 1) return;
  const o = sel[0], hit = findDockTarget(o);
  if (hit) { dockTo(o, hit.b, hit.n); renderScene(); renderOverlay(); renderProps(); }
  else if (o.dock) delete o.dock;
}
function snapSelectionToMembrane() {
  const sel = selected(), target = sel.find((o) => o.type === 'brush' && DOCK_KINDS.includes(o.kind));
  const items = sel.filter((o) => o !== target && dockable(o));
  if (!items.length) { toast('Select the receptors (and optionally the membrane) to snap'); return; }
  checkpoint();
  let n = 0;
  for (const o of items) {
    const b = target || (findDockTarget({ ...o, w: o.w, h: o.h }) || {}).b || objs().filter((x) => x.type === 'brush' && DOCK_KINDS.includes(x.kind)).sort((a, c) => (nearestOnPolyline(brushPagePolyline(a), center(o))?.d ?? 1e9) - (nearestOnPolyline(brushPagePolyline(c), center(o))?.d ?? 1e9))[0];
    if (b && dockTo(o, b)) n++;
  }
  render({ props: true });
  toast(n ? `Snapped ${n} object${n === 1 ? '' : 's'} into the membrane — they now move with it` : 'No membrane or DNA brush on this page');
}
function spreadAlongMembrane() {
  const sel = selected().filter((o) => o.dock && dockable(o));
  if (sel.length < 2) { toast('Select two or more objects snapped to the same membrane'); return; }
  const b = byId(sel[0].dock), pl = b && brushPagePolyline(b);
  if (!pl) return;
  const cum = [0]; for (let i = 1; i < pl.length; i++) cum.push(cum[i - 1] + Math.hypot(pl[i].x - pl[i - 1].x, pl[i].y - pl[i - 1].y));
  const at = (s) => { let i = cum.findIndex((c) => c >= s); if (i <= 0) i = 1; const t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: pl[i - 1].x + (pl[i].x - pl[i - 1].x) * t, y: pl[i - 1].y + (pl[i].y - pl[i - 1].y) * t }; };
  const pos = (o) => { const n = nearestOnPolyline(pl, center(o)); let best = 0, bd = 1e9; for (let i = 0; i < pl.length; i++) { const d = Math.hypot(pl[i].x - n.x, pl[i].y - n.y); if (d < bd) { bd = d; best = cum[i]; } } return best; };
  const items = sel.map((o) => ({ o, s: pos(o) })).sort((a, c) => a.s - c.s), s0 = items[0].s, s1 = items[items.length - 1].s;
  checkpoint();
  items.forEach((it, k) => { const p = at(s0 + ((s1 - s0) * k) / (items.length - 1)); it.o.x = p.x - it.o.w / 2; it.o.y = p.y - it.o.h / 2; dockTo(it.o, b); });
  render({ props: true });
}

// ---------- Pathway auto-layout ----------
function layoutPathway(nodes, edges, { dir = 'TB', gapMain = 70, gapCross = 46 } = {}) {
  const ids = nodes.map((o) => o.id), out = new Map(ids.map((i) => [i, []])), inn = new Map(ids.map((i) => [i, []]));
  edges.forEach(([a, b]) => { if (a !== b) { out.get(a).push(b); inn.get(b).push(a); } });
  // Layers: longest path from sources; cycles are broken at the node with the fewest unplaced inputs.
  const layer = new Map(), indeg = new Map(ids.map((i) => [i, inn.get(i).length])), placed = new Set();
  let frontier = ids.filter((i) => !indeg.get(i));
  while (placed.size < ids.length) {
    if (!frontier.length) { const rest = ids.filter((i) => !placed.has(i)).sort((a, b) => indeg.get(a) - indeg.get(b)); frontier = [rest[0]]; }
    const next = [];
    for (const v of frontier) {
      if (placed.has(v)) continue;
      placed.add(v);
      const l = Math.max(0, ...inn.get(v).filter((u) => placed.has(u) && layer.has(u)).map((u) => layer.get(u) + 1));
      layer.set(v, l);
      for (const w of out.get(v)) { indeg.set(w, indeg.get(w) - 1); if (indeg.get(w) <= 0 && !placed.has(w)) next.push(w); }
    }
    frontier = next;
  }
  // Pull sources down next to what they feed (so a ligand sits right above its receptor).
  for (let it = 0; it < 3; it++) ids.forEach((v) => { if (!inn.get(v).length && out.get(v).length) layer.set(v, Math.max(0, Math.min(...out.get(v).map((w) => layer.get(w))) - 1)); });
  const L = Math.max(...layer.values()) + 1, rows = Array.from({ length: L }, () => []);
  ids.forEach((v) => rows[layer.get(v)].push(v));
  const byId2 = new Map(nodes.map((o) => [o.id, o])), main = (o) => (dir === 'TB' ? o.h : o.w), cross = (o) => (dir === 'TB' ? o.w : o.h);
  const origin = (o) => (dir === 'TB' ? o.x + o.w / 2 : o.y + o.h / 2);
  rows.forEach((r) => r.sort((a, b) => origin(byId2.get(a)) - origin(byId2.get(b))));
  // Barycentre sweeps reduce crossings.
  const order = new Map();
  const reindex = () => rows.forEach((r) => r.forEach((v, i) => order.set(v, i)));
  reindex();
  for (let sweep = 0; sweep < 6; sweep++) {
    const down = sweep % 2 === 0;
    for (let li = down ? 1 : L - 2; down ? li < L : li >= 0; li += down ? 1 : -1) {
      const nb = (v) => (down ? inn.get(v) : out.get(v)).filter((u) => layer.get(u) === li + (down ? -1 : 1));
      rows[li].sort((a, b) => { const ba = nb(a).length ? Stats.mean(nb(a).map((u) => order.get(u))) : order.get(a), bb = nb(b).length ? Stats.mean(nb(b).map((u) => order.get(u))) : order.get(b); return ba - bb; });
      reindex();
    }
  }
  const pos = new Map();
  let m = 0;
  rows.forEach((r) => {
    const span = r.reduce((s, v) => s + cross(byId2.get(v)), 0) + gapCross * (r.length - 1), thick = Math.max(...r.map((v) => main(byId2.get(v))));
    let c = -span / 2;
    r.forEach((v) => { const o = byId2.get(v); pos.set(v, { main: m + thick / 2, cross: c + cross(o) / 2 }); c += cross(o) + gapCross; });
    m += thick + gapMain;
  });
  return { pos, dir };
}
function applyLayout(nodes, layout, labels = new Map()) {
  // Keep the pathway where it was: the main axis starts at its old edge, the cross axis is centred.
  const bx = Math.min(...nodes.map((o) => o.x)), by = Math.min(...nodes.map((o) => o.y));
  const cx = (bx + Math.max(...nodes.map((o) => o.x + o.w))) / 2, cy = (by + Math.max(...nodes.map((o) => o.y + o.h))) / 2;
  nodes.forEach((o) => {
    const p = layout.pos.get(o.id), ncx = layout.dir === 'TB' ? cx + p.cross : bx + p.main, ncy = layout.dir === 'TB' ? by + p.main : cy + p.cross;
    const dx = ncx - (o.x + o.w / 2), dy = ncy - (o.y + o.h / 2);
    o.x += dx; o.y += dy;
    (labels.get(o.id) || []).forEach((t) => { t.x += dx; t.y += dy; });
  });
}
function autoLayoutSelection(dir) {
  const sel = selected();
  const nodes = sel.filter((o) => o.type !== 'connector' && o.type !== 'text' && o.type !== 'brush' && !o.locked);
  const ids = new Set(nodes.map((o) => o.id));
  const edges = objs().filter((o) => o.type === 'connector' && o.from.id && o.to.id && ids.has(o.from.id) && ids.has(o.to.id)).map((c) => [c.from.id, c.to.id]);
  if (!edges.length) { toast('Select the pathway: its shapes or icons and the arrows connecting them'); return; }
  const connected = new Set(edges.flat()), graphNodes = nodes.filter((o) => connected.has(o.id));
  // Labels travel with the closest node.
  const labels = new Map();
  sel.filter((o) => o.type === 'text').forEach((t) => {
    const tc = center(t);
    let best = null, bd = Infinity;
    graphNodes.forEach((o) => { const c = center(o), d = Math.max(0, Math.abs(tc.x - c.x) - o.w / 2) + Math.max(0, Math.abs(tc.y - c.y) - o.h / 2); if (d < bd) { bd = d; best = o; } });
    if (best && bd < 60) { if (!labels.has(best.id)) labels.set(best.id, []); labels.get(best.id).push(t); }
  });
  const gapMain = 70 + Math.max(0, ...[...labels.values()].flat().map((t) => t.h)) * (dir === 'TB' ? 1 : 0);
  checkpoint();
  applyLayout(graphNodes, layoutPathway(graphNodes, edges, { dir, gapMain }), labels);
  render({ props: true });
  toast(`Laid out ${graphNodes.length} nodes ${dir === 'TB' ? 'top to bottom' : 'left to right'}${nodes.length > graphNodes.length ? ` (${nodes.length - graphNodes.length} unconnected object${nodes.length - graphNodes.length === 1 ? '' : 's'} left in place)` : ''}`);
}

// ---------- Pathway from text ----------
const PATHWAY_SAMPLE = `# One interaction per line. -> activates, -| inhibits, ..> indirect, -- binds
PD-L1 -- PD-1
PD-1 -> SHP2
SHP2 -| ZAP70
TCR -> ZAP70 -> LAT -> PLCγ1
LAT -> GRB2 -> SOS -> RAS -> ERK
CD28 -> PI3K -> AKT
SHP2 -| PI3K
PLCγ1 ..> NFAT
ERK -> AP-1
NFAT, AP-1 -> IL-2`;
const EDGE_TOKENS = [['-->', 'arrow'], ['->', 'arrow'], ['→', 'arrow'], ['=>', 'arrow'], ['--|', 'bar'], ['-|', 'bar'], ['⊣', 'bar'], ['..>', 'dashed'], ['--', 'bind'], ['—', 'bind']];
function parsePathwayText(text) {
  const re = new RegExp(`\\s*(${EDGE_TOKENS.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*`);
  const nodes = [], edges = [];
  const add = (n) => { n = n.trim(); if (n && !nodes.includes(n)) nodes.push(n); return n; };
  text.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).forEach((line) => {
    const parts = line.split(re);
    const groups = parts.filter((_, i) => i % 2 === 0).map((g) => g.split(/\s*,\s*/).map(add).filter(Boolean));
    parts.filter((_, i) => i % 2 === 1).forEach((tok, k) => { const kind = EDGE_TOKENS.find(([t]) => t === tok)[1]; groups[k].forEach((a) => groups[k + 1].forEach((b) => edges.push([a, b, kind]))); });
    if (parts.length === 1) groups[0].forEach(add);
  });
  return { nodes, edges };
}
function pathwayNodeColour(name, i) {
  const s = name.toUpperCase();
  if (/^(PD-?L?1|CTLA-?4|LAG-?3|TIM-?3|TIGIT|SHP-?[12])/.test(s)) return '#d6584a';
  if (/^(TCR|CD3|CD28|CD4|CD8|MHC|BCR|IL-?\d|IFN|TNF)/.test(s)) return '#4a7fd6';
  return ['#3fa58b', '#9b7fd1', '#e8b33c', '#e8743b', '#5bb5e0', '#c77cb1'][i % 6];
}
function openPathwayTextDialog() {
  const ta = el('textarea', { rows: 14, spellcheck: false, value: PATHWAY_SAMPLE, style: 'font-family:Menlo,monospace;font-size:12px;width:100%;box-sizing:border-box' });
  const dir = el('select', {}, el('option', { value: 'TB', textContent: 'Top to bottom' }), el('option', { value: 'LR', textContent: 'Left to right' }));
  const style = el('select', {}, el('option', { value: 'soft', textContent: 'Soft protein ovals' }), el('option', { value: 'box', textContent: 'Rounded boxes' }));
  const prev = el('div', { class: 'preview', style: 'min-height:260px' });
  const build = () => {
    const { nodes, edges } = parsePathwayText(ta.value);
    const objsN = nodes.map((n, i) => {
      const col = pathwayNodeColour(n, i), w = Math.max(64, measureText(n, 14, 'sans', true).w + 30);
      return style.value === 'box'
        ? Make.rect(0, i * 10, w, 38, { fill: Color.light(col, 0.8), stroke: col, strokeWidth: 1.8, radius: 10, label: n, labelSize: 14, labelBold: true, labelColor: Color.dark(col, 0.45), name: n })
        : Make.ellipse(0, i * 10, w, 42, { fill: Color.light(col, 0.55), stroke: Color.dark(col, 0.3), strokeWidth: 1.8, label: n, labelSize: 14, labelBold: true, labelColor: Color.dark(col, 0.55), name: n });
    });
    const idOf = new Map(nodes.map((n, i) => [n, objsN[i]]));
    const conns = edges.map(([a, b, kind]) => Make.connector(idOf.get(a), idOf.get(b), kind === 'bar' ? { head: 'bar', color: '#c0392b' } : kind === 'dashed' ? { dashStyle: 'dashed' } : kind === 'bind' ? { head: 'none', tail: 'none', color: '#666666', dashStyle: 'dotted' } : {}));
    if (objsN.length) applyLayout(objsN, layoutPathway(objsN, edges.map(([a, b]) => [idOf.get(a).id, idOf.get(b).id]), { dir: dir.value }));
    return [...objsN, ...conns];
  };
  const draw = () => {
    const list = build(), shapes = list.filter((o) => o.type !== 'connector');
    if (!shapes.length) { prev.innerHTML = ''; return; }
    const x0 = Math.min(...shapes.map((o) => o.x)) - 14, y0 = Math.min(...shapes.map((o) => o.y)) - 14;
    shapes.forEach((o) => { o.x -= x0; o.y -= y0; });
    const W = Math.max(...shapes.map((o) => o.x + o.w)) + 14, H = Math.max(...shapes.map((o) => o.y + o.h)) + 14;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: list }).replace('<svg ', '<svg style="max-width:100%;max-height:340px" ');
  };
  [ta, dir, style].forEach((x) => x.addEventListener(x.tagName === 'SELECT' ? 'change' : 'input', draw));
  openModal('Pathway from text', el('div', { style: 'width:860px;max-width:92vw;display:grid;grid-template-columns:330px 1fr;gap:14px' },
    el('div', {}, ta, field_('Layout', dir), field_('Nodes', style),
      el('div', { class: 'note' }, 'A -> B activates, A -| B inhibits, A ..> B indirect / proposed, A -- B binds. Chain several on one line, and use commas for several inputs (NFAT, AP-1 -> IL-2). Arrows are drawn as claims: check each one against your data.')),
    el('div', {}, prev, el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert pathway', () => {
      const list = build(), c = viewCenter(), shapes = list.filter((o) => o.type !== 'connector');
      if (!shapes.length) return;
      const x0 = Math.min(...shapes.map((o) => o.x)), y0 = Math.min(...shapes.map((o) => o.y)), W = Math.max(...shapes.map((o) => o.x + o.w)) - x0, H = Math.max(...shapes.map((o) => o.y + o.h)) - y0;
      shapes.forEach((o) => { o.x += c.x - W / 2 - x0; o.y += c.y - H / 2 - y0; });
      closeModal(); addObjects(list);
    }, 'primary')))));
  draw();
}

// ---------- Commands ----------
ARRANGE_COMMANDS.boolUnion = () => booleanOp('union');
ARRANGE_COMMANDS.boolSubtract = () => booleanOp('subtract');
ARRANGE_COMMANDS.boolIntersect = () => booleanOp('intersect');
ARRANGE_COMMANDS.boolExclude = () => booleanOp('exclude');
ARRANGE_COMMANDS.splitBrush = splitBrushSelection;
ARRANGE_COMMANDS.snapMembrane = snapSelectionToMembrane;
ARRANGE_COMMANDS.spreadMembrane = spreadAlongMembrane;
ARRANGE_COMMANDS.toggleMembraneSnap = () => {
  const on = !membraneSnapOn();
  try { localStorage.setItem('scicanvas:membraneSnap', on ? 'on' : 'off'); } catch { /* not saved */ }
  toast(`Snap into membranes when dropped: ${on ? 'on' : 'off'} (hold ⌘ while dropping to skip once)`);
};
ARRANGE_COMMANDS.layoutTB = () => autoLayoutSelection('TB');
ARRANGE_COMMANDS.layoutLR = () => autoLayoutSelection('LR');
ARRANGE_COMMANDS.pathwayText = openPathwayTextDialog;

// Context buttons in the properties panel.
const _renderPropsShapeOps = renderProps;
renderProps = function () {
  _renderPropsShapeOps();
  const sel = selected(), P = $('#props');
  if (sel.length === 1 && sel[0].type === 'brush') P.append(sect('Pieces', el('div', { class: 'note', textContent: 'Turn the brush into separate objects, e.g. to remove lipids where a channel sits or recolour one segment.' }), btn('Split into pieces', splitBrushSelection)));
  if (sel.length === 1 && sel[0].dock && byId(sel[0].dock)) {
    const o = sel[0];
    P.append(sect('Membrane', el('div', { class: 'note', textContent: 'Snapped into a membrane: it moves with it. Drag it off to release.' }),
      row('Depth', el('input', { type: 'range', min: -60, max: 60, step: 1, value: o.dockOffset || 0, oninput: (e) => { checkpoint('dock' + o.id); o.dockOffset = +e.target.value; dockTo(o, byId(o.dock)); renderScene(); renderOverlay(); } })),
      btn('Release', () => { checkpoint(); delete o.dock; delete o.dockOffset; render({ props: true }); })));
  }
  if (sel.length >= 2 && sel.filter(canBoolean).length >= 2 && !sel.some((o) => o.type === 'connector')) P.append(sect('Combine shapes', el('div', { class: 'btnrow' }, btn('Union', () => booleanOp('union')), btn('Subtract', () => booleanOp('subtract')), btn('Intersect', () => booleanOp('intersect')), btn('Exclude', () => booleanOp('exclude'))),
    el('div', { class: 'note', textContent: 'Subtract cuts the front shapes out of the back-most one.' })));
  if (sel.length >= 3 && sel.some((o) => o.type === 'connector')) P.append(sect('Pathway', el('div', { class: 'btnrow' }, btn('Tidy ↓', () => autoLayoutSelection('TB')), btn('Tidy →', () => autoLayoutSelection('LR')))));
};
