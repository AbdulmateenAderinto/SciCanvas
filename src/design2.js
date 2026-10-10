// Design-tool features (part 2): repeat (radial, grid, along a path) and blend (Illustrator), variable-width
// strokes (Illustrator Width tool), Image Trace, Shape Builder, blend modes and fade-out opacity masks.

function groupOf(items, name, extra = {}) {
  const bb = unionBounds(items, items);
  const g = { id: uid(), type: 'group', name, x: bb.x, y: bb.y, w: Math.max(1, bb.w), h: Math.max(1, bb.h), w0: Math.max(1, bb.w), h0: Math.max(1, bb.h), rot: 0, ...extra };
  g.children = items.map((o) => (o.type === 'connector' ? o : { ...o, x: o.x - bb.x, y: o.y - bb.y }));
  return g;
}
// A dialog docked to the side so the canvas shows a live preview; Done keeps it as one undo step.
function sideModal(snap0, isApplied) {
  $('#modal').classList.add('side');
  onModalClose = () => {
    $('#modal').classList.remove('side');
    if (isApplied()) { state.undo.push(snap0); if (state.undo.length > 200) state.undo.shift(); state.redo = []; markDirty(); render({ props: true }); }
    else restore(snap0);
  };
}
function placeCopy(src, cx, cy, rot) {
  const c = cloneObjects([src], [src], 0)[0];
  c.x = cx - c.w / 2; c.y = cy - c.h / 2;
  if (rot != null) c.rot = ((rot % 360) + 360) % 360;
  return c;
}
function pathPagePoints(p) {
  const pts = flattenNodes(scaledNodes(p), p.closed).map((q) => localToPage(p, q));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = cum[cum.length - 1] || 1;
  const at = (s) => {
    let i = cum.findIndex((c) => c >= s); if (i <= 0) i = 1;
    const a = pts[i - 1], b = pts[i] || a, t = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  };
  return { L, at, closed: !!p.closed };
}

// ---------- Repeat (radial / grid / along a path) ----------
function generateRepeat(cfg) {
  const src = cfg.src, items = [], sc = { x: src.x + src.w / 2, y: src.y + src.h / 2 };
  if (cfg.mode === 'radial') {
    const n = Math.max(2, cfg.count | 0);
    for (let i = 0; i < n; i++) {
      const a = cfg.start + (i * 360) / n, r = (a * Math.PI) / 180;
      items.push(placeCopy(src, cfg.cx + cfg.radius * Math.cos(r), cfg.cy + cfg.radius * Math.sin(r), cfg.rotate ? (src.rot || 0) + a - cfg.start : src.rot));
    }
  } else if (cfg.mode === 'grid') {
    for (let r = 0; r < Math.max(1, cfg.rows | 0); r++) for (let c = 0; c < Math.max(1, cfg.cols | 0); c++) {
      const stagger = cfg.stagger && r % 2 ? (src.w + cfg.gapX) / 2 : 0;
      items.push(placeCopy(src, sc.x + c * (src.w + cfg.gapX) + stagger, sc.y + r * (src.h + cfg.gapY)));
    }
  } else {
    const P = cfg.pathObj && pathPagePoints(cfg.pathObj);
    if (!P) return [];
    const n = Math.max(2, cfg.count | 0), span = P.closed ? P.L : P.L, step = P.closed ? span / n : span / (n - 1);
    for (let i = 0; i < n; i++) { const q = P.at(i * step); items.push(placeCopy(src, q.x, q.y, cfg.rotate ? (src.rot || 0) + q.ang : src.rot)); }
  }
  return items;
}
function openRepeatDialog(mode, existing) {
  const sel = selected();
  let cfg;
  if (existing) cfg = deep(existing.repeatCfg);
  else {
    if (!sel.length) { toast('Select the object to repeat'); return; }
    let src = sel[0], centreObj = null, pathObj = null;
    if (sel.length === 2) {
      const [a, b] = sel;
      if (mode === 'path') { pathObj = sel.find((o) => o.type === 'path'); src = sel.find((o) => o !== pathObj); }
      else { centreObj = a.w * a.h >= b.w * b.h ? a : b; src = centreObj === a ? b : a; }
    }
    if (mode === 'path' && !pathObj) { toast('Select the object and a drawn path (pen or pencil) to repeat it along'); return; }
    if (!src || src.type === 'connector' || !Number.isFinite(src.w)) { toast('Lines can’t be repeated: select a shape, icon, image or group'); return; } // copies came out at NaN
    const c = centreObj ? center(centreObj) : { x: src.x + src.w / 2 + 110, y: src.y + src.h / 2 };
    const radius = centreObj ? Math.hypot(src.x + src.w / 2 - c.x, src.y + src.h / 2 - c.y) || Math.max(centreObj.w, centreObj.h) / 2 : 110;
    const start = centreObj ? (Math.atan2(src.y + src.h / 2 - c.y, src.x + src.w / 2 - c.x) * 180) / Math.PI : 180;
    cfg = { mode, src: deep(src), count: mode === 'radial' ? 8 : 6, cx: c.x, cy: c.y, radius: Math.round(radius), start: Math.round(start), rotate: true, rows: 3, cols: 4, gapX: 12, gapY: 12, stagger: false, pathId: pathObj && pathObj.id };
  }
  const snap0 = snapshot();
  let applied = false, gid = existing ? existing.id : null;
  if (!existing) { const i = objs().indexOf(byId(cfg.src.id)); const ph = groupOf([deep(cfg.src)], 'Repeat'); gid = ph.id; objs().splice(i, 1, ph); }
  const update = () => {
    cfg.pathObj = cfg.pathId ? byId(cfg.pathId) : null;
    const items = generateRepeat(cfg);
    if (!items.length) return;
    const cur = byId(gid), g = groupOf(items, { radial: 'Radial repeat', grid: 'Grid repeat', path: 'Repeat along path' }[cfg.mode], { repeatCfg: { ...cfg, pathObj: undefined } });
    g.id = gid;
    objs()[objs().indexOf(cur)] = g;
    state.sel = [gid];
    renderScene(); renderOverlay();
  };
  const numIn = (k, min, max, step = 1) => el('input', { type: 'number', min, max, step, value: cfg[k], oninput: (e) => { const v = +e.target.value; if (isFinite(v)) { cfg[k] = v; update(); } } });
  const chk = (k, label) => el('label', { style: 'display:flex;gap:6px;align-items:center' }, el('input', { type: 'checkbox', checked: !!cfg[k], onchange: (e) => { cfg[k] = e.target.checked; update(); } }), label);
  const body = el('div', { style: 'width:360px' });
  if (cfg.mode === 'radial') body.append(row('Copies', numIn('count', 2, 200)), row('Radius', numIn('radius', 0, 5000)), row('Start angle', numIn('start', -360, 360, 5)), chk('rotate', 'Turn each copy to face outward'),
    el('div', { class: 'note', textContent: 'Tip: select a receptor and the cell together first, and the copies go around the cell at the receptor’s distance.' }));
  else if (cfg.mode === 'grid') body.append(row('Rows', numIn('rows', 1, 100)), row('Columns', numIn('cols', 1, 100)), row('Gap across', numIn('gapX', -500, 2000)), row('Gap down', numIn('gapY', -500, 2000)), chk('stagger', 'Stagger alternate rows (cell monolayer)'),
    el('div', { class: 'note', textContent: '8 × 12 makes a 96-well plate; 2 × 4 a cohort of eight mice.' }));
  else body.append(row('Copies', numIn('count', 2, 500)), chk('rotate', 'Turn copies to follow the path'));
  body.append(el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Done', () => { applied = true; closeModal(); }, 'primary')));
  openModal({ radial: 'Radial repeat', grid: 'Grid repeat', path: 'Repeat along path' }[cfg.mode], body);
  sideModal(snap0, () => applied);
  update();
}

// ---------- Blend between two objects ----------
const BLEND_NUM = ['x', 'y', 'w', 'h', 'opacity', 'strokeWidth', 'fontSize', 'labelSize', 'radius', 'size', 'width', 'glowSize'];
const lerp = (a, b, t) => a + (b - a) * t;
function lerpAngle(a, b, t) { const d = ((((b - a) % 360) + 540) % 360) - 180; return a + d * t; }
function blendObjects(A, B, t) {
  const o = deep(t < 0.5 || A.type !== B.type ? A : B);
  o.id = uid();
  for (const k of BLEND_NUM) if (typeof A[k] === 'number' && typeof B[k] === 'number') o[k] = lerp(A[k], B[k], t);
  o.rot = lerpAngle(A.rot || 0, B.rot || 0, t);
  for (const k of COLOR_KEYS) { const a = normHex(A[k]), b = normHex(B[k]); if (a && b) o[k] = Color.mix(a, b, t); }
  if (A.type === 'path' && B.type === 'path' && A.nodes.length === B.nodes.length && !!A.closed === !!B.closed) {
    const na = scaledNodes(A), nb = scaledNodes(B), L = (p, q) => (p != null && q != null ? lerp(p, q, t) : null);
    o.nodes = na.map((p, i) => { const q = nb[i], n = { x: lerp(p.x, q.x, t), y: lerp(p.y, q.y, t) }; const ix = L(p.ix, q.ix), iy = L(p.iy, q.iy), ox = L(p.ox, q.ox), oy = L(p.oy, q.oy); if (ix != null) Object.assign(n, { ix, iy }); if (ox != null) Object.assign(n, { ox, oy }); if (p.move) n.move = true; return n; });
    o.w0 = o.w; o.h0 = o.h;
  }
  if (A.type === 'icon' && B.type === 'icon' && A.iconId === B.iconId) {
    const ca = normHex(A.tint || A.color), cb = normHex(B.tint || B.color);
    if (ca && cb) { if (ICON_MAP[A.iconId]) o.color = Color.mix(ca, cb, t); else o.tint = Color.mix(ca, cb, t); o.colorMap = null; }
  }
  if (o.type === 'text') { o.x = lerp(A.x + A.w / 2, B.x + B.w / 2, t); postEdit(o); o.x -= o.w / 2; }
  return o;
}
function openBlendDialog(existing) {
  let A, B, steps = 5, keepEnds = true, gid;
  const snap0 = snapshot();
  if (existing) { const c = deep(existing.blendCfg); A = c.a; B = c.b; steps = c.steps; keepEnds = c.keepEnds; gid = existing.id; } else {
    const sel = selected().filter((o) => o.type !== 'connector');
    if (sel.length !== 2) { toast('Select exactly two objects to blend between (e.g. a naive and an exhausted T cell)'); return; }
    const list = objs();
    [A, B] = sel.sort((p, q) => list.indexOf(p) - list.indexOf(q)).map(deep);
    const ph = groupOf([deep(A), deep(B)], 'Blend'); gid = ph.id;
    const i = Math.min(list.indexOf(sel[0]), list.indexOf(sel[1]));
    page().objects = list.filter((o) => o.id !== A.id && o.id !== B.id);
    page().objects.splice(i, 0, ph);
  }
  let applied = false;
  const update = () => {
    const mids = [];
    for (let i = 1; i <= steps; i++) mids.push(blendObjects(A, B, i / (steps + 1)));
    const kids = keepEnds ? [deep(A), ...mids, deep(B)] : mids;
    const g = groupOf(kids, 'Blend', { blendCfg: { a: A, b: B, steps, keepEnds } });
    g.id = gid;
    const cur = byId(gid);
    objs()[objs().indexOf(cur)] = g;
    state.sel = [gid]; renderScene(); renderOverlay();
  };
  openModal('Blend', el('div', { style: 'width:340px' },
    row('Steps', el('input', { type: 'number', min: 1, max: 60, value: steps, oninput: (e) => { const v = +e.target.value; if (v >= 1 && v <= 60) { steps = v; update(); } } })),
    el('label', { style: 'display:flex;gap:6px;align-items:center' }, el('input', { type: 'checkbox', checked: keepEnds, onchange: (e) => { keepEnds = e.target.checked; update(); } }), 'Keep the two end objects'),
    el('div', { class: 'note', textContent: 'Position, size, rotation, opacity and colours are interpolated. Drawings with the same number of points morph shape too. Use it for a naive → exhausted colour ramp, a dose series or growing tumours.' }),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Done', () => { applied = true; closeModal(); }, 'primary'))));
  sideModal(snap0, () => applied);
  update();
}

// ---------- Variable-width strokes (Illustrator Width tool) ----------
const WIDTH_PRESETS = [['', 'Uniform'], ['taperEnd', 'Taper to the end'], ['taperStart', 'Taper from the start'], ['taperBoth', 'Taper both ends'], ['swell', 'Swell in the middle'], ['pinch', 'Pinch in the middle'], ['custom', 'Custom (start / middle / end)']];
function widthAt(o, t) {
  const p = o.widthProfile;
  const [s, m, e] = p === 'taperEnd' ? [1, 0.75, 0.04] : p === 'taperStart' ? [0.04, 0.75, 1] : p === 'taperBoth' ? [0.04, 1, 0.04] : p === 'swell' ? [0.45, 1.7, 0.45] : p === 'pinch' ? [1.3, 0.35, 1.3] : [o.wStart ?? 1, o.wMid ?? 1, o.wEnd ?? 0.1];
  // Smooth quadratic through the three control widths.
  const k = t < 0.5 ? t * 2 : (t - 0.5) * 2, ease = (x) => x * x * (3 - 2 * x);
  return t < 0.5 ? s + (m - s) * ease(k) : m + (e - m) * ease(k);
}
function variableWidthD(o) {
  const ns = scaledNodes(o), raw = flattenNodes(ns, false, 24);
  if (raw.length < 2) return '';
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
  const L = cum[cum.length - 1] || 1, n = Math.max(12, Math.min(600, Math.ceil(L / 2))), pts = [];
  let j = 1;
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * L;
    while (j < raw.length - 1 && cum[j] < s) j++;
    const a = raw[j - 1], b = raw[j], t = (s - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1);
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  const sw = o.strokeWidth ?? 2.5, left = [], right = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const hw = (sw * Math.max(0.02, widthAt(o, i / n))) / 2, nx = -dy / len, ny = dx / len;
    left.push(`${R(p.x + nx * hw)} ${R(p.y + ny * hw)}`); right.push(`${R(p.x - nx * hw)} ${R(p.y - ny * hw)}`);
  });
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}
const _pathSvgD2 = pathSvg;
pathSvg = function (o) {
  if (o.closed || !o.widthProfile || !o.stroke || o.stroke === 'none') return _pathSvgD2(o);
  const ns = scaledNodes(o), sw = o.strokeWidth ?? 2.5;
  let s = '';
  if (o.tube) s += `<path d="${variableWidthD({ ...o, strokeWidth: sw + 2 * (o.tubeOutlineWidth ?? 2.2) })}" fill="${o.tubeOutline || Color.dark(o.stroke, 0.36)}"/>`;
  s += `<path d="${variableWidthD(o)}" fill="${o.stroke}"${o.strokeOpacity != null ? ` fill-opacity="${o.strokeOpacity}"` : ''}/>`;
  if (ns.length >= 2) {
    const last = ns[ns.length - 1], prevE = last.ix != null ? { x: last.ix, y: last.iy } : ns[ns.length - 2];
    const first = ns[0], nextS = first.ox != null ? { x: first.ox, y: first.oy } : ns[1];
    s += arrowHead(o.headEnd, last, prevE, o.stroke, Math.max(1, sw * Math.max(0.5, widthAt(o, 1)))) + arrowHead(o.headStart, first, nextS, o.stroke, Math.max(1, sw * Math.max(0.5, widthAt(o, 0))));
  }
  return s;
};
function widthSection(o) {
  const L = [o];
  return sect('Width tool',
    row('Profile', select(L, 'widthProfile', WIDTH_PRESETS, true)),
    o.widthProfile === 'custom' ? row('Start', range(L, 'wStart', 0, 3, 0.05)) : null,
    o.widthProfile === 'custom' ? row('Middle', range(L, 'wMid', 0, 3, 0.05)) : null,
    o.widthProfile === 'custom' ? row('End', range(L, 'wEnd', 0, 3, 0.05)) : null,
    el('div', { class: 'note', textContent: 'Tapering strokes make hand-drawn flux arrows, secretion trails and brush-like pathway arrows. Width sets the widest point.' }));
}

// ---------- Image Trace ----------
function kmeans(px, k, iters = 10) {
  // px: Float32Array of r,g,b triples (0-255). Deterministic k-means++ seeding.
  const n = px.length / 3, cents = [];
  let idx = 0;
  cents.push([px[0], px[1], px[2]]);
  const d2 = new Float32Array(n).fill(Infinity);
  while (cents.length < k) {
    const c = cents[cents.length - 1];
    let best = 0, bi = 0;
    for (let i = 0; i < n; i++) { const dd = (px[3 * i] - c[0]) ** 2 + (px[3 * i + 1] - c[1]) ** 2 + (px[3 * i + 2] - c[2]) ** 2; if (dd < d2[i]) d2[i] = dd; if (d2[i] > best) { best = d2[i]; bi = i; } }
    if (best < 1) break;
    idx = bi; cents.push([px[3 * idx], px[3 * idx + 1], px[3 * idx + 2]]);
  }
  for (let it = 0; it < iters; it++) {
    const sum = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) { let bj = 0, bd = Infinity; for (let j = 0; j < cents.length; j++) { const c = cents[j], dd = (px[3 * i] - c[0]) ** 2 + (px[3 * i + 1] - c[1]) ** 2 + (px[3 * i + 2] - c[2]) ** 2; if (dd < bd) { bd = dd; bj = j; } } const s = sum[bj]; s[0] += px[3 * i]; s[1] += px[3 * i + 1]; s[2] += px[3 * i + 2]; s[3]++; }
    sum.forEach((s, j) => { if (s[3]) cents[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return cents;
}
// Outlines of a binary mask as closed rings (pixel-edge boundaries, inside on the right).
function traceMask(mask, W, H) {
  const out = new Map(), key = (x, y) => y * (W + 1) + x, edges = [];
  const add = (x1, y1, x2, y2) => { const e = { x1, y1, x2, y2, used: false }; edges.push(e); const k = key(x1, y1); if (!out.has(k)) out.set(k, []); out.get(k).push(e); };
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    if (!inside(x, y - 1)) add(x, y, x + 1, y);
    if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!inside(x - 1, y)) add(x, y + 1, x, y);
  }
  const rings = [];
  for (const e0 of edges) {
    if (e0.used) continue;
    const ring = [];
    let e = e0;
    while (e && !e.used) {
      e.used = true; ring.push({ x: e.x1, y: e.y1 });
      const cand = (out.get(key(e.x2, e.y2)) || []).filter((c) => !c.used);
      if (cand.length > 1) { // saddle: turn right so diagonal pixels stay separate
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
        cand.sort((a, b) => ((a.x2 - a.x1) * dy - (a.y2 - a.y1) * dx < 0 ? 1 : 0) - ((b.x2 - b.x1) * dy - (b.y2 - b.y1) * dx < 0 ? 1 : 0));
      }
      e = cand[0];
    }
    if (ring.length >= 4) rings.push(ring);
  }
  return rings;
}
const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p.x * q.y - q.x * p.y; } return a / 2; };
function chaikinClosed(pts, it) {
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; out.push({ x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y }, { x: 0.25 * a.x + 0.75 * b.x, y: 0.25 * a.y + 0.75 * b.y }); }
    pts = out;
  }
  return pts;
}
async function traceImage(o, opt) {
  const img = new Image(); img.src = o.src; await img.decode();
  const nw = img.naturalWidth, nh = img.naturalHeight, c = o.crop || { l: 0, t: 0, r: 0, b: 0 };
  const sx0 = c.l * nw, sy0 = c.t * nh, sw0 = Math.max(1, (1 - c.l - c.r) * nw), sh0 = Math.max(1, (1 - c.t - c.b) * nh);
  const k = Math.min(1, opt.res / Math.max(sw0, sh0)), W = Math.max(8, Math.round(sw0 * k)), H = Math.max(8, Math.round(sh0 * k));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, sx0, sy0, sw0, sh0, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data, N = W * H, label = new Int16Array(N).fill(-1);
  let palette;
  if (opt.mode === 'bw') {
    palette = [opt.lineColour || '#111111'];
    for (let i = 0; i < N; i++) { if (data[4 * i + 3] < 128) continue; const l = 0.299 * data[4 * i] + 0.587 * data[4 * i + 1] + 0.114 * data[4 * i + 2]; if (l < opt.threshold) label[i] = 0; }
  } else {
    const step = Math.max(1, Math.floor(N / 40000)), sample = [];
    for (let i = 0; i < N; i += step) if (data[4 * i + 3] >= 128) sample.push(data[4 * i], data[4 * i + 1], data[4 * i + 2]);
    const cents = kmeans(Float32Array.from(sample), opt.colours);
    palette = cents.map(([r, g, b]) => Color.rgbToHex(r, g, b));
    for (let i = 0; i < N; i++) {
      if (data[4 * i + 3] < 128) continue;
      let bj = 0, bd = Infinity;
      for (let j = 0; j < cents.length; j++) { const q = cents[j], dd = (data[4 * i] - q[0]) ** 2 + (data[4 * i + 1] - q[1]) ** 2 + (data[4 * i + 2] - q[2]) ** 2; if (dd < bd) { bd = dd; bj = j; } }
      label[i] = bj;
    }
  }
  const scaleX = o.w / W, scaleY = o.h / H, minArea = opt.speck, paths = [];
  palette.forEach((col, j) => {
    if (opt.mode !== 'bw' && opt.dropWhite && hexToHsl(col)[2] > 0.92) return;
    const mask = new Uint8Array(N);
    let count = 0;
    for (let i = 0; i < N; i++) if (label[i] === j) { mask[i] = 1; count++; }
    if (!count) return;
    const rings = traceMask(mask, W, H).filter((r) => Math.abs(ringArea(r)) >= minArea);
    if (!rings.length) return;
    const nodes = [];
    let area = 0;
    rings.forEach((r) => {
      area += ringArea(r);
      let pts = simplify(r, 0.6);
      if (pts.length < 3) return;
      pts = simplify(chaikinClosed(pts, opt.smooth), 0.25);
      pts.forEach((p, i) => { const q = localToPage(o, { x: p.x * scaleX, y: p.y * scaleY }); nodes.push(i === 0 && nodes.length ? { x: q.x, y: q.y, move: true } : { x: q.x, y: q.y }); });
    });
    if (nodes.length < 3) return;
    const pth = makePathFromNodes(nodes, { closed: true, fill: col, stroke: col, strokeWidth: 0.6, shade: 'flat', name: `Traced ${col}` });
    pth.area = Math.abs(area);
    paths.push(pth);
  });
  paths.sort((a, b) => b.area - a.area);
  paths.forEach((p) => delete p.area);
  return paths;
}
function openTraceDialog() {
  const o = selected().find((x) => x.type === 'image');
  if (!o) { toast('Select an image (PNG / JPG) to trace into editable shapes'); return; }
  const mode = el('select', {}, ...[['bw', 'Black & white line art'], ['3', '3 colours'], ['6', '6 colours'], ['16', '16 colours']].map(([v, l]) => el('option', { value: v, textContent: l, selected: v === '6' })));
  const thr = el('input', { type: 'range', min: 20, max: 240, value: 128 }), res = el('input', { type: 'range', min: 120, max: 700, step: 20, value: 360 });
  const smooth = el('input', { type: 'range', min: 0, max: 4, step: 1, value: 2 }), speck = el('input', { type: 'range', min: 0, max: 200, step: 2, value: 12 });
  const dropWhite = el('input', { type: 'checkbox', checked: true }), keep = el('input', { type: 'checkbox', checked: false });
  const prev = el('div', { class: 'preview', style: 'min-height:280px;display:flex;align-items:center;justify-content:center' }), info = el('div', { class: 'note' });
  let result = [], busy = 0;
  const opts = () => ({ mode: mode.value === 'bw' ? 'bw' : 'colour', colours: +mode.value || 6, threshold: +thr.value, res: +res.value, smooth: +smooth.value, speck: +speck.value, dropWhite: dropWhite.checked });
  const run = async () => {
    const my = ++busy;
    info.textContent = 'Tracing…';
    await new Promise((r) => setTimeout(r, 20));
    const paths = await traceImage({ ...o, rot: 0, flipX: false, flipY: false, x: 0, y: 0 }, opts());
    if (my !== busy) return;
    result = paths;
    const nodes = paths.reduce((s, p) => s + p.nodes.length, 0);
    info.textContent = `${paths.length} colour shape${paths.length === 1 ? '' : 's'}, ${nodes} points`;
    prev.innerHTML = pageSvgString({ width: o.w, height: o.h, background: '#ffffff', objects: paths }).replace('<svg ', '<svg style="max-width:100%;max-height:320px;border:1px solid #ddd" ');
  };
  [mode, thr, res, smooth, speck, dropWhite].forEach((x) => x.addEventListener('change', run));
  openModal('Image Trace', el('div', { style: 'width:820px;max-width:92vw;display:grid;grid-template-columns:300px 1fr;gap:14px' },
    el('div', {}, field_('Mode', mode), field_('Threshold', thr), field_('Detail', res), field_('Smoothness', smooth), field_('Ignore specks', speck),
      el('label', { style: 'display:flex;gap:6px;align-items:center' }, dropWhite, 'Leave white areas empty'),
      el('label', { style: 'display:flex;gap:6px;align-items:center' }, keep, 'Keep the original image (hidden)'),
      el('div', { class: 'note', textContent: 'Turns a sketch, a scanned drawing or an old PNG figure you own into editable vector shapes. Threshold applies to black & white mode.' })),
    el('div', {}, prev, info, el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Trace', async () => {
      if (!result.length) return;
      const paths = await traceImage(o, opts());
      checkpoint();
      const g = groupOf(paths, 'Traced image');
      const i = objs().indexOf(o);
      if (keep.checked) { o.hidden = true; objs().splice(i + 1, 0, g); } else objs().splice(i, 1, g);
      state.sel = [g.id]; closeModal(); render({ props: true });
      toast('Traced. Double-click the group to edit each colour shape');
    }, 'primary')))));
  run();
}

// ---------- Shape Builder ----------
let builder = null;
const geomArea = (mp) => mp.reduce((s, poly) => s + poly.reduce((t, ring, i) => t + (i ? -1 : 1) * Math.abs(ringArea(ring.map(([x, y]) => ({ x, y })))), 0), 0);
function startShapeBuilder() {
  if (typeof polygonClipping === 'undefined') return;
  const list = objs(), shapes = selected().filter(canBoolean).sort((a, b) => list.indexOf(a) - list.indexOf(b));
  if (shapes.length < 2) { toast('Select two or more overlapping closed shapes (drawings, rectangles, ellipses or shapes)'); return; }
  let regions = [];
  shapes.forEach((s, i) => {
    const G = objectGeom(s);
    if (!G) return;
    const next = [];
    for (const r of regions) {
      const inter = polygonClipping.intersection(r.geom, G), diff = polygonClipping.difference(r.geom, G);
      if (geomArea(inter) > 4) next.push({ geom: inter, owners: [...r.owners, i] });
      if (geomArea(diff) > 4) next.push({ geom: diff, owners: r.owners });
    }
    const rest = regions.length ? polygonClipping.difference(G, ...regions.map((r) => r.geom)) : G;
    if (geomArea(rest) > 4) next.push({ geom: rest, owners: [i] });
    regions = next;
  });
  // Each separate piece is its own region.
  regions = regions.flatMap((r) => r.geom.map((poly) => ({ geom: [poly], owners: r.owners, mark: null })));
  builder = { shapes, regions, painting: null };
  state.sel = [];
  render({ props: true });
  drawBuilder();
  toast('Shape builder: drag across pieces to merge them, ⌥-drag to delete pieces. Enter to finish, Esc to cancel', 6000);
}
function drawBuilder() {
  let layer = $('#sbLayer');
  if (!builder) { if (layer) layer.remove(); return; }
  if (!layer) { layer = document.createElementNS(SVGNS, 'g'); layer.id = 'sbLayer'; $('#viewport').append(layer); }
  const z = state.zoom;
  layer.innerHTML = builder.regions.map((r, i) => {
    const d = r.geom.map((poly) => poly.map((ring) => 'M' + ring.map(([x, y]) => `${R(x)} ${R(y)}`).join('L') + 'Z').join('')).join('');
    const fill = r.mark === 'merge' ? 'rgba(59,111,214,.45)' : r.mark === 'delete' ? 'rgba(214,69,69,.5)' : 'rgba(255,255,255,0.01)';
    return `<path data-region="${i}" d="${d}" fill="${fill}" fill-rule="evenodd" stroke="#3b6fd6" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}" style="cursor:crosshair"/>`;
  }).join('');
}
function finishShapeBuilder(commit) {
  const b = builder;
  builder = null; drawBuilder();
  if (!b || !commit) { render(); return; }
  checkpoint();
  const list = objs(), styleOf = (r) => b.shapes[Math.max(...r.owners)];
  let regions = b.regions.filter((r) => r.mark !== 'delete');
  const merged = regions.filter((r) => r.mark === 'merge');
  if (merged.length) {
    const u = polygonClipping.union(...merged.map((r) => r.geom));
    regions = [...regions.filter((r) => r.mark !== 'merge'), { geom: u, owners: merged[0].owners }];
  }
  const out = regions.map((r) => geomToPath(r.geom, { ...styleOf(r), name: styleOf(r).name || 'Piece' })).filter(Boolean);
  const i = Math.min(...b.shapes.map((s) => list.indexOf(s)).filter((x) => x >= 0));
  page().objects = list.filter((o) => !b.shapes.includes(o));
  page().objects.splice(Math.max(0, i), 0, ...out);
  state.sel = out.map((o) => o.id);
  render({ props: true });
  toast(`Shape builder: ${out.length} shape${out.length === 1 ? '' : 's'}`);
}
svg.addEventListener('pointerdown', (e) => {
  if (!builder) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const r = e.target.closest && e.target.closest('[data-region]');
  if (!r) { finishShapeBuilder(true); return; }
  builder.painting = e.altKey ? 'delete' : 'merge';
  const reg = builder.regions[+r.dataset.region];
  reg.mark = reg.mark === builder.painting && !e.shiftKey ? null : builder.painting;
  drawBuilder();
}, true);
svg.addEventListener('pointermove', (e) => {
  if (!builder || !builder.painting || !(e.buttons & 1)) return;
  e.stopImmediatePropagation();
  const t = document.elementFromPoint(e.clientX, e.clientY), r = t && t.closest && t.closest('[data-region]');
  if (r) { const reg = builder.regions[+r.dataset.region]; if (reg.mark !== builder.painting) { reg.mark = builder.painting; drawBuilder(); } }
}, true);
window.addEventListener('pointerup', () => {
  if (!builder || !builder.painting) return;
  const paint = builder.painting;
  builder.painting = null;
  if (paint === 'merge') { // merge as soon as the drag ends, like Illustrator
    const m = builder.regions.filter((r) => r.mark === 'merge');
    if (m.length > 1) { const u = polygonClipping.union(...m.map((r) => r.geom)); builder.regions = [...builder.regions.filter((r) => r.mark !== 'merge'), { geom: u, owners: m[0].owners, mark: null }]; }
    else m.forEach((r) => { r.mark = null; r.picked = true; });
  } else builder.regions = builder.regions.filter((r) => r.mark !== 'delete');
  drawBuilder();
}, true);
window.addEventListener('keydown', (e) => {
  if (!builder) return;
  if (e.key === 'Enter') { e.stopImmediatePropagation(); e.preventDefault(); finishShapeBuilder(true); }
  else if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); finishShapeBuilder(false); }
}, true);
const _applyViewportD2 = applyViewport;
applyViewport = function () { _applyViewportD2(); if (builder) drawBuilder(); };

// ---------- Blend modes and fade (opacity mask) ----------
const BLEND_MODES = [['', 'Normal'], ['multiply', 'Multiply'], ['screen', 'Screen'], ['overlay', 'Overlay'], ['darken', 'Darken'], ['lighten', 'Lighten'], ['color-dodge', 'Colour dodge'], ['color-burn', 'Colour burn'], ['soft-light', 'Soft light'], ['hard-light', 'Hard light'], ['difference', 'Difference'], ['hue', 'Hue'], ['saturation', 'Saturation'], ['color', 'Colour'], ['luminosity', 'Luminosity']];
const FADES = [['', 'None'], ['right', 'Fade out to the right'], ['left', 'Fade out to the left'], ['bottom', 'Fade out downwards'], ['top', 'Fade out upwards'], ['radial', 'Fade out at the edges (vignette)']];
function fadeWrap(o, inner) {
  const f = o.fade, s = Math.max(0, Math.min(0.95, o.fadeStart ?? 0.35)), id = `fd-${o.id}`;
  const lin = { right: [0, 0, 1, 0], left: [1, 0, 0, 0], bottom: [0, 0, 0, 1], top: [0, 1, 0, 0] }[f];
  const grad = lin
    ? `<linearGradient id="${id}g" x1="${lin[0]}" y1="${lin[1]}" x2="${lin[2]}" y2="${lin[3]}"><stop offset="${s}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>`
    : `<radialGradient id="${id}g" cx=".5" cy=".5" r=".5"><stop offset="${s}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>`;
  return `<defs>${grad}<mask id="${id}" maskUnits="userSpaceOnUse" x="${-o.w}" y="${-o.h}" width="${3 * o.w}" height="${3 * o.h}"><rect width="${o.w}" height="${o.h}" fill="url(#${id}g)"/></mask></defs><g mask="url(#${id})">${inner}</g>`;
}
const _renderPartsD2 = renderParts;
renderParts = function (o, objects, forExport) {
  const r = _renderPartsD2(o, objects, forExport);
  if (o.fade && o.type !== 'connector') r.inner = fadeWrap(o, r.inner);
  if (o.type === 'group' && o.auto && (o.auto.bg || o.auto.stroke)) r.inner = `<rect width="${o.w}" height="${o.h}" rx="${o.auto.radius ?? 8}" fill="${o.auto.bg || 'none'}" stroke="${o.auto.stroke || 'none'}" stroke-width="${o.auto.stroke ? o.auto.strokeWidth ?? 1.5 : 0}"/>` + r.inner;
  return r;
};
function blendSection(sel) {
  const L = sel, o = sel[0];
  return sect('Blending',
    row('Blend mode', select(L, 'blend', BLEND_MODES, false)),
    sel.length === 1 && o.type !== 'connector' ? row('Fade', select(L, 'fade', FADES, true)) : null,
    sel.length === 1 && o.fade ? row('Fade starts', range(L, 'fadeStart', 0, 0.95, 0.05)) : null,
    el('div', { class: 'note', textContent: 'Multiply makes overlapping fluorescent channels and translucent halos mix like ink. Fade blends an image or icon softly into the schematic.' }));
}

// ---------- Commands and panels ----------
Object.assign(ARRANGE_COMMANDS, {
  repeatRadial: () => openRepeatDialog('radial'), repeatGrid: () => openRepeatDialog('grid'), repeatPath: () => openRepeatDialog('path'),
  blend: () => openBlendDialog(), imageTrace: openTraceDialog, shapeBuilder: startShapeBuilder,
});
const _renderPropsDesign2 = renderProps;
renderProps = function () {
  _renderPropsDesign2();
  const sel = selected(), P = $('#props');
  if (!sel.length) return;
  const o = sel[0];
  if (sel.length === 1 && o.type === 'path' && !o.closed) { const d = [...P.querySelectorAll('.sect')].find((s) => /Drawing/.test(s.querySelector('h3')?.textContent || '')); (d || P.lastChild).after(widthSection(o)); }
  if (sel.length === 1 && o.repeatCfg) P.querySelector('.sect').after(sect('Repeat', el('div', { class: 'btnrow' }, btn('Edit repeat…', () => openRepeatDialog(o.repeatCfg.mode, o), 'primary'), btn('Ungroup copies', ungroupSelection))));
  if (sel.length === 1 && o.blendCfg) P.querySelector('.sect').after(sect('Blend', el('div', { class: 'btnrow' }, btn('Edit blend…', () => openBlendDialog(o), 'primary'), btn('Ungroup steps', ungroupSelection))));
  if (sel.length === 1 && o.type === 'image') P.append(sect('Image Trace', el('div', { class: 'note', textContent: 'Convert this picture into editable vector shapes.' }), btn('Image Trace…', openTraceDialog)));
  if (!sel.some((x) => x.type === 'connector')) P.append(blendSection(sel));
  const tools = [btn('Radial repeat…', () => openRepeatDialog('radial')), btn('Grid repeat…', () => openRepeatDialog('grid'))];
  if (sel.length === 2 && sel.some((x) => x.type === 'path')) tools.push(btn('Repeat along path…', () => openRepeatDialog('path')));
  if (sel.length === 2) tools.push(btn('Blend…', () => openBlendDialog()));
  if (sel.filter(canBoolean).length >= 2) tools.push(btn('Shape builder', startShapeBuilder));
  P.append(sect('Repeat & build', el('div', { class: 'btnrow' }, ...tools)));
};
