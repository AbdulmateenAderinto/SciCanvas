// Molecular immunology & cancer toolkit: protein shape builder, soft-protein styling of drawings,
// lighter partner subunits, "degrade into fragments", protein domain maps, and templates.

// ---------- Protein shapes ----------
// Tube shapes are a centreline (0..100 box) swept with a width; closed shapes are an outline.
const PROTEIN_SHAPES = [
  ['globular', 'Globular', { closed: [[50, 8], [76, 12], [92, 34], [88, 62], [70, 88], [42, 92], [16, 78], [8, 50], [20, 22]] }],
  ['bean', 'Bean / kidney', { closed: [[30, 16], [58, 8], [84, 22], [90, 50], [78, 80], [50, 90], [36, 80], [40, 62], [36, 48], [20, 44], [12, 30]] }],
  ['oval', 'Elongated oval', { closed: [[50, 30], [80, 26], [96, 42], [90, 62], [60, 72], [24, 72], [6, 58], [10, 38]] }],
  ['c', 'C-shape', { line: [[70, 20], [44, 10], [22, 30], [20, 56], [36, 80], [66, 82]], width: 22 }],
  ['s', 'S-shape', { line: [[76, 18], [46, 8], [26, 22], [36, 44], [64, 54], [74, 74], [54, 92], [26, 84]], width: 18 }],
  ['u', 'Horseshoe / U', { line: [[22, 14], [20, 56], [34, 84], [66, 84], [80, 56], [78, 14]], width: 19 }],
  ['j', 'Hook / J', { line: [[60, 8], [60, 60], [52, 84], [30, 86], [22, 70]], width: 20 }],
  ['crescent', 'Crescent', { line: [[16, 30], [36, 60], [64, 60], [84, 30]], width: 20, taper: 0.7 }],
  ['rod', 'Rod / coiled coil', { line: [[10, 80], [90, 20]], width: 20 }],
  ['coil', 'Unfolded chain', { line: [[6, 70], [18, 40], [30, 80], [42, 50], [54, 74], [64, 44], [78, 40], [80, 62], [94, 60]], width: 7 }],
];

// Outline of a centreline swept with width w (optionally fatter in the middle), as a closed polygon.
function tubeOutline(pts, w, { taper = 0, bulge = 0 } = {}) {
  const S = samplePath(flattenNodes(smoothNodes(pts.map(([x, y]) => ({ x, y })), false), false), Math.max(1, w / 6), false);
  if (S.length < 2) return [];
  const n = S.length, left = [], right = [];
  const halfW = (i) => { const t = i / (n - 1); return (w / 2) * (1 + bulge * Math.sin(Math.PI * t)) * (1 - taper * Math.abs(2 * t - 1) ** 2); };
  S.forEach((p, i) => { const h = halfW(i); left.push({ x: p.x - p.ty * h, y: p.y + p.tx * h }); right.push({ x: p.x + p.ty * h, y: p.y - p.tx * h }); });
  const cap = (p, h, a0) => Array.from({ length: 7 }, (_, k) => { const a = a0 - (Math.PI * (k + 1)) / 8; return { x: p.x + h * Math.cos(a), y: p.y + h * Math.sin(a) }; });
  const e = S[n - 1], s0 = S[0];
  const endA = Math.atan2(e.tx, -e.ty), startA = Math.atan2(-s0.tx, s0.ty);
  return [...left, ...cap(e, halfW(n - 1), endA), ...right.reverse(), ...cap(s0, halfW(0), startA)];
}
// A soft-style editable path from a closed polygon (world coordinates).
function softPathFromPolygon(poly, color, extra = {}) {
  // Even spacing keeps the Catmull-Rom smoothing from overshooting at the caps.
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const even = samplePath(poly, Math.max(2, size / 28), true).map((p) => ({ x: p.x, y: p.y }));
  return makePathFromNodes(smoothNodes(even, true, 0.5), { closed: true, fill: color, stroke: Color.dark(color, 0.34), strokeWidth: 1.8, cap: 'round', ...extra });
}
function buildProteinShape(kind, { color, size, width, bulge, x, y, rot = 0, name }) {
  const def = (PROTEIN_SHAPES.find((s) => s[0] === kind) || PROTEIN_SHAPES[0])[2];
  const k = size / 100, rr = (rot * Math.PI) / 180;
  const tf = ([px, py]) => { const dx = (px - 50) * k, dy = (py - 50) * k; return [x + dx * Math.cos(rr) - dy * Math.sin(rr), y + dx * Math.sin(rr) + dy * Math.cos(rr)]; };
  let poly;
  if (def.closed) poly = flattenNodes(smoothNodes(def.closed.map(tf).map(([a, b]) => ({ x: a, y: b })), true), true);
  else poly = tubeOutline(def.line.map(tf), (width ?? def.width) * k, { taper: def.taper || 0, bulge: bulge || 0 });
  return softPathFromPolygon(poly, color, { name: name || 'Protein' });
}
function openProteinShapeDialog() {
  const st = { kind: 'c', color: '#8b62c4', width: '', bulge: 0.15, partner: false, label: '' };
  const prev = el('div', { class: 'preview', style: 'min-height:240px;display:flex;align-items:center;justify-content:center' });
  const make = (size, cx, cy) => {
    const def = PROTEIN_SHAPES.find((s) => s[0] === st.kind)[2];
    const out = [buildProteinShape(st.kind, { color: st.color, size, width: st.width === '' ? def.width : +st.width, bulge: st.bulge, x: cx, y: cy })];
    if (st.partner) {
      const p = buildProteinShape(st.kind, { color: Color.light(st.color, 0.5), size, width: st.width === '' ? def.width : +st.width, bulge: st.bulge, x: cx, y: cy, name: 'Partner subunit' });
      flipPathH(p);
      p.x = out[0].x + out[0].w * 0.72;
      out.unshift(p);
    }
    if (st.label.trim()) {
      const main = out[out.length - 1];
      const ov = Make.ellipse(0, 0, size * 0.62, size * 0.3, { fill: '#f6efcf', stroke: '#8a7a3a', strokeWidth: 1.2, label: st.label.trim(), labelSize: Math.max(9, size * 0.11), labelColor: '#3b3418', rot: -15 });
      ov.x = main.x + main.w / 2 - ov.w / 2; ov.y = main.y + main.h * 0.62 - ov.h / 2;
      out.push(ov);
    }
    return out;
  };
  const draw = () => {
    const parts = make(170, 0, 0);
    const minX = Math.min(...parts.map((o) => o.x)), minY = Math.min(...parts.map((o) => o.y));
    parts.forEach((o) => { o.x -= minX - 14; o.y -= minY - 14; });
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 14, H = Math.max(...parts.map((o) => o.y + o.h)) + 14;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="max-width:100%;max-height:280px" ');
  };
  const kind = el('select', { onchange: (e) => { st.kind = e.target.value; widthIn.placeholder = String(PROTEIN_SHAPES.find((s) => s[0] === st.kind)[2].width || '—'); draw(); } }, ...PROTEIN_SHAPES.map(([v, l]) => el('option', { value: v, textContent: l, selected: v === st.kind })));
  const widthIn = el('input', { type: 'number', min: 3, max: 50, placeholder: '22', style: 'width:70px', oninput: (e) => { st.width = e.target.value; draw(); } });
  openModal('Protein shape', el('div', { style: 'max-width:640px;display:grid;grid-template-columns:1fr 250px;gap:14px' }, prev,
    el('div', {},
      field_('Shape', kind),
      field_('Colour', el('input', { type: 'color', value: st.color, oninput: (e) => { st.color = e.target.value; draw(); } })),
      field_('Thickness', widthIn),
      field_('Bulge', el('input', { type: 'range', min: -0.4, max: 0.6, step: 0.05, value: st.bulge, oninput: (e) => { st.bulge = +e.target.value; draw(); } })),
      field_('', el('label', { style: 'width:auto;color:inherit' }, el('input', { type: 'checkbox', onchange: (e) => { st.partner = e.target.checked; draw(); } }), ' Add lighter partner subunit')),
      field_('Label tag', el('input', { type: 'text', placeholder: 'e.g. FAM72A', oninput: (e) => { st.label = e.target.value; draw(); } })),
      el('div', { class: 'note' }, 'Inserted as editable outlines: double-click to drag points. To make your own shape, draw it with the pencil, then Arrange › Make Protein Shape.'),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
        const c = viewCenter(), parts = make(130, c.x, c.y);
        closeModal();
        addObjects(parts.length > 1 ? [makeGroup(parts, 'Protein')] : parts);
      }, 'primary')))));
  draw();
}
function flipPathH(o) {
  o.nodes = o.nodes.map((n) => ({ ...n, x: o.w0 - n.x, ...(n.ix != null ? { ix: o.w0 - n.ix } : {}), ...(n.ox != null ? { ox: o.w0 - n.ox } : {}) }));
}

// Pencil / pen drawing → protein: open strokes become an outlined tube, closed shapes get the soft style.
function makeProteinFromSelection() {
  const sel = selected().filter((o) => o.type === 'path' || o.type === 'rect' || o.type === 'ellipse' || o.type === 'shape');
  if (!sel.length) { toast('Select a drawing (pencil or pen), rectangle, ellipse or shape first'); return; }
  checkpoint();
  const list = objs();
  for (const o of sel) {
    const color = o.type === 'path' && !o.closed ? (o.stroke && o.stroke !== 'none' ? o.stroke : '#8b62c4') : (o.fill && o.fill !== 'none' ? o.fill : '#8b62c4');
    let n;
    if (o.type === 'path' && !o.closed) {
      const ns = scaledNodes(o).map((p) => ({ ...p, x: p.x + o.x, y: p.y + o.y, ix: p.ix != null ? p.ix + o.x : null, iy: p.iy != null ? p.iy + o.y : null, ox: p.ox != null ? p.ox + o.x : null, oy: p.oy != null ? p.oy + o.y : null }));
      const line = flattenNodes(ns.map((p) => Object.fromEntries(Object.entries(p).filter(([, v]) => v != null))), false);
      const w = Math.max(10, (o.strokeWidth || 2.5) * 4);
      const S = samplePath(line, Math.max(2, w / 3), false).map((p) => [p.x, p.y]);
      const poly = tubeOutline(simplify(S.map(([x, y]) => ({ x, y })), w / 6).map((p) => [p.x, p.y]), w, { bulge: 0.1 });
      n = softPathFromPolygon(poly, color === '#222222' ? '#8b62c4' : color, { name: o.name || 'Protein', rot: 0 });
    } else {
      n = o.type === 'path' ? o : convertToPath(o);
      Object.assign(n, { fill: color, fill2: null, shade: 'flat', stroke: Color.dark(color, 0.34), strokeWidth: 1.8, name: o.name || 'Protein' });
    }
    const i = list.indexOf(o);
    if (i >= 0) list[i] = n;
    o.__new = n;
  }
  state.sel = sel.map((o) => o.__new.id);
  sel.forEach((o) => delete o.__new);
  render({ props: true });
  toast('Converted to a soft protein shape — double-click to edit points');
}

// ---------- Lighter partner subunit ----------
function recolorLight(o, t = 0.5) {
  const L = (c) => (/^#[0-9a-f]{3,6}$/i.test(c || '') ? Color.light(c, t) : c);
  if (o.type === 'icon') { o.color = L(o.color || (ICON_MAP[o.iconId] || {}).color); if (o.tint) o.tint = L(o.tint); }
  if (o.fill && o.fill !== 'none') { o.fill = L(o.fill); if (o.stroke && o.stroke !== 'none') o.stroke = Color.dark(o.fill, 0.34); }
  else if (o.type === 'path' && o.stroke) o.stroke = L(o.stroke);
  if (o.type === 'brush' && o.color) o.color = L(o.color);
  if (o.children) o.children.forEach((c) => recolorLight(c, t));
}
function addLighterPartner() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (!sel.length) { toast('Select a protein or icon first'); return; }
  checkpoint();
  const list = objs(), ids = [];
  for (const o of sel) {
    const copy = cloneObjects([o], list, 0)[0];
    recolorLight(copy);
    copy.x = o.x + o.w * 0.62;
    copy.name = (o.name ? o.name + ' ' : '') + 'partner';
    list.splice(list.indexOf(o), 0, copy); // behind the original
    ids.push(copy.id);
  }
  state.sel = ids;
  render({ props: true });
}

// ---------- Degrade into fragments ----------
function mainColor(o) {
  if (o.type === 'icon') return o.tint || o.color || (ICON_MAP[o.iconId] || {}).color || '#8b62c4';
  if (o.type === 'path' && !o.closed) return o.stroke || '#8b62c4';
  if (o.fill && o.fill !== 'none') return o.fill;
  if (o.children) for (const c of o.children) { const k = mainColor(c); if (k) return k; }
  return o.color || '#8b62c4';
}
function fragmentPaths(x, y, w, h, color, seed = 1) {
  let r = seed * 9301 + 49297;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const n = Math.max(6, Math.round(Math.sqrt(w * h) / 12)), sw = Math.max(3, Math.min(w, h) / 11), out = [];
  for (let i = 0; i < n; i++) {
    const cx = x + w * (0.1 + 0.8 * rnd()), cy = y + h * (0.1 + 0.8 * rnd()), len = Math.min(w, h) * (0.12 + 0.16 * rnd()), a = rnd() * Math.PI * 2;
    const pts = [0, 1, 2].map((k) => ({ x: cx + Math.cos(a) * len * (k - 1) + (k === 1 ? Math.sin(a) * len * (rnd() - 0.5) : 0), y: cy + Math.sin(a) * len * (k - 1) - (k === 1 ? Math.cos(a) * len * (rnd() - 0.5) : 0) }));
    out.push(makePathFromNodes(smoothNodes(pts, false), { stroke: color, strokeWidth: sw, cap: 'round', name: 'Peptide' }));
  }
  return out;
}
function degradeSelection() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (!sel.length) { toast('Select the protein to degrade'); return; }
  checkpoint();
  const list = objs(), ids = [];
  sel.forEach((o, k) => {
    const g = makeGroup(fragmentPaths(o.x, o.y, o.w, o.h, mainColor(o), k + 3), 'Degraded fragments');
    list[list.indexOf(o)] = g;
    ids.push(g.id);
  });
  state.sel = ids;
  render({ props: true });
}

// ---------- Protein domain map ----------
const DOMAIN_SAMPLE = `# name, start, end, colour (optional)
Signal peptide, 1, 22, #9aa7b4
Ig-like V, 30, 140, #4a7fd6
Ig-like C2, 150, 240, #6fa0e8
Transmembrane, 268, 290, #e8b33c
ITIM, 320, 330, #d64545
ITSM, 340, 350, #d64545`;
function buildDomainMap({ name, length, domains, sites, width = 760, colorDefault = '#4a7fd6' }) {
  const o = [], H = 26, top = 48, k = width / length, X = (aa) => 20 + (aa - 1) * k;
  if (name) o.push(Make.text(name, 20, 0, { fontSize: 16, bold: true }));
  o.push(Make.rect(20, top + H / 2 - 4, width, 8, { fill: '#cfd6dd', stroke: 'none', radius: 4, name: 'Backbone' }));
  domains.forEach((d, i) => {
    const c = d.color || CHART_PALETTE[i % CHART_PALETTE.length] || colorDefault;
    const w = Math.max(4, (d.end - d.start + 1) * k);
    o.push(Make.rect(X(d.start), top, w, H, { fill: c, stroke: Color.dark(c, 0.3), strokeWidth: 1.2, radius: 8, name: d.name }));
    const t = Make.text(d.name, 0, 0, { fontSize: 11, bold: true, color: '#ffffff' });
    if (t.w + 6 < w) { t.x = X(d.start) + w / 2 - t.w / 2; t.y = top + H / 2 - t.h / 2; } else { t.color = '#333333'; t.x = X(d.start) + w / 2 - t.w / 2; t.y = top - t.h - (i % 2 ? 12 : 0); }
    o.push(t);
  });
  sites.forEach((s) => {
    const x = X(s.pos);
    o.push(Make.rect(x - 0.75, top + H, 1.5, 14, { fill: '#555555', stroke: 'none', radius: 0 }));
    const b = Make.ellipse(x - 7, top + H + 13, 14, 14, { fill: s.color || '#f2c14e', stroke: Color.dark(s.color || '#f2c14e', 0.35), strokeWidth: 1, label: s.mark || 'P', labelSize: 8, labelBold: true, labelColor: '#3a2a00' });
    o.push(b);
    if (s.label) { const t = Make.text(s.label, 0, top + H + 30, { fontSize: 10, color: '#444444' }); t.x = x - t.w / 2; o.push(t); }
  });
  // Axis with ticks.
  const ticks = niceTicks(1, length, 6).filter((v) => v >= 1 && v <= length);
  if (ticks[0] !== 1) ticks.unshift(1);
  const axY = top + H + (sites.length ? 52 : 14);
  o.push(Make.rect(20, axY, width, 1, { fill: '#888888', stroke: 'none', radius: 0 }));
  ticks.forEach((v) => { o.push(Make.rect(X(v) - 0.5, axY, 1, 5, { fill: '#888888', stroke: 'none', radius: 0 })); const t = Make.text(String(v), 0, axY + 6, { fontSize: 10, color: '#666666' }); t.x = X(v) - t.w / 2; o.push(t); });
  const e = Make.text(`${length} aa`, 0, axY + 6, { fontSize: 10, color: '#666666', bold: true }); e.x = 20 + width + 6; o.push(e);
  return o;
}
function parseDomainRows(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s*[,\t]\s*/)).filter((p) => p.length >= 3 && isFinite(+p[1]) && isFinite(+p[2])).map((p) => ({ name: p[0], start: +p[1], end: +p[2], color: /^#[0-9a-f]{3,6}$/i.test(p[3] || '') ? p[3] : null }));
}
function parseSiteRows(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s*[,\t]\s*/)).filter((p) => isFinite(+p[0]) && p[0] !== '').map((p) => {
    const mark = (p[1] || 'P').trim();
    const col = { P: '#f2c14e', Ub: '#d4a531', Ac: '#5bb5e0', Me: '#9bd06b', SUMO: '#5bb5e0', N: '#e08a86', '*': '#d64545' }[mark] || '#f2c14e';
    return { pos: +p[0], mark, label: p[2] || '', color: col };
  });
}
function openDomainMapDialog() {
  const name = el('input', { type: 'text', value: 'PD-1 (PDCD1)' });
  const len = el('input', { type: 'number', value: 288, min: 10, style: 'width:90px' });
  const doms = el('textarea', { rows: 8, spellcheck: false, value: DOMAIN_SAMPLE.replace('268, 290', '171, 191').replace('ITIM, 320, 330', 'ITIM, 221, 226').replace('ITSM, 340, 350', 'ITSM, 246, 251').replace('Ig-like C2, 150, 240, #6fa0e8\n', '').replace('Ig-like V, 30, 140', 'Ig-like V, 35, 145') });
  const sites = el('textarea', { rows: 3, spellcheck: false, value: '# position, mark (P, Ub, Ac, Me, SUMO, N, *), label\n223, P, Y223\n248, P, Y248' });
  const prev = el('div', { class: 'preview', style: 'min-height:160px' });
  const gather = () => ({ name: name.value.trim(), length: Math.max(1, +len.value || 100), domains: parseDomainRows(doms.value), sites: parseSiteRows(sites.value) });
  const draw = () => {
    const parts = buildDomainMap(gather());
    parts.forEach((p) => { p.x += 10; p.y += 10; });
    const W = Math.max(...parts.map((o) => o.x + o.w)) + 20, H = Math.max(...parts.map((o) => o.y + o.h)) + 14;
    prev.innerHTML = pageSvgString({ width: W, height: H, background: '#ffffff', objects: parts }).replace('<svg ', '<svg style="width:100%" ');
  };
  [name, len, doms, sites].forEach((i) => i.addEventListener('input', draw));
  openModal('Protein domain map', el('div', { style: 'width:820px;max-width:90vw' }, prev,
    el('div', { class: 'dlg-cols' },
      el('div', {}, field_('Protein', name), field_('Length (aa)', len), el('div', { class: 'note' }, 'Domains: one per line — name, start, end, optional colour. Paste from UniProt “Family & Domains” and edit.'), doms),
      el('div', {}, el('div', { class: 'note' }, 'Sites: position, mark, label — phosphorylation (P), ubiquitination (Ub), acetylation (Ac), methylation (Me), glycosylation (N), mutation (*).'), sites)),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert', () => {
      const parts = buildDomainMap(gather()), c = viewCenter();
      const W = Math.max(...parts.map((o) => o.x + o.w)), H = Math.max(...parts.map((o) => o.y + o.h));
      parts.forEach((p) => { p.x += c.x - W / 2; p.y += c.y - H / 2; });
      closeModal();
      addObjects([makeGroup(parts, `${name.value.trim() || 'Protein'} domain map`)]);
    }, 'primary'))));
  draw();
}

ARRANGE_COMMANDS.proteinShape = openProteinShapeDialog;
ARRANGE_COMMANDS.makeProtein = makeProteinFromSelection;
ARRANGE_COMMANDS.lighterPartner = addLighterPartner;
ARRANGE_COMMANDS.degrade = degradeSelection;
ARRANGE_COMMANDS.domainMap = openDomainMapDialog;
