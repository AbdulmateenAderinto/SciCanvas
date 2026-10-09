// Design-tool features (part 3): auto layout (Figma), magic resize (Canva), smart animate between slides with
// video / GIF export (Figma, Canva), command palette (Figma Quick Actions), find and replace with a
// science-aware spell checker, and outline view (Illustrator).

// ---------- Auto layout ----------
function relayoutAuto(g) {
  const a = g.auto, kids = g.children.filter((c) => c.type !== 'connector');
  if (!a || !kids.length) return;
  const v = a.dir !== 'h', gap = a.gap ?? 10, pad = a.pad ?? 12;
  kids.sort((p, q) => (v ? p.y - q.y : p.x - q.x));
  const sx = g.w / g.w0, sy = g.h / g.h0;
  const box = (c) => bounds(c, g.children);
  const cross = Math.max(...kids.map((c) => (v ? box(c).w : box(c).h)));
  let cur = pad;
  kids.forEach((c) => {
    const b = box(c), dx = c.x - b.x, dy = c.y - b.y; // rotated children are placed by their visible box
    const off = a.align === 'center' ? (cross - (v ? b.w : b.h)) / 2 : a.align === 'end' ? cross - (v ? b.w : b.h) : 0;
    if (v) { c.x = pad + off + dx; c.y = cur + dy; cur += b.h + gap; } else { c.x = cur + dx; c.y = pad + off + dy; cur += b.w + gap; }
  });
  const order = new Map(kids.map((c, i) => [c.id, i]));
  g.children.sort((p, q) => (order.get(p.id) ?? -1) - (order.get(q.id) ?? -1));
  const W = v ? cross + 2 * pad : cur - gap + pad, H = v ? cur - gap + pad : cross + 2 * pad;
  g.w0 = W; g.h0 = H; g.w = W * sx; g.h = H * sy;
}
function addAutoLayout() {
  let sel = selected();
  if (!sel.length) { toast('Select a legend, a list of labelled items or a row of panels'); return; }
  let g;
  if (sel.length === 1 && sel[0].type === 'group') { checkpoint(); g = sel[0]; }
  else if (sel.length > 1) { groupSelection(); g = selected()[0]; } else { toast('Select two or more objects (or a group)'); return; }
  const kids = g.children.filter((c) => c.type !== 'connector'), xs = kids.map((c) => c.x + c.w / 2), ys = kids.map((c) => c.y + c.h / 2);
  const spread = (arr) => Math.max(...arr) - Math.min(...arr);
  g.auto = { dir: spread(xs) > spread(ys) ? 'h' : 'v', gap: 10, pad: 12, align: 'start', bg: null, stroke: null, radius: 8 };
  g.name = g.name || 'Auto layout';
  relayoutAuto(g);
  state.sel = [g.id];
  render({ props: true });
  toast('Auto layout on: items stack with even gaps. Double-click to edit; the box resizes to fit');
}
function autoSection(g) {
  const a = g.auto;
  const set = (k, v) => { checkpoint('auto' + g.id + k); a[k] = v; relayoutAuto(g); renderScene(); renderOverlay(); };
  const numA = (k, min) => el('input', { type: 'number', min, step: 1, value: a[k] ?? 0, oninput: (e) => { const v = +e.target.value; if (isFinite(v)) set(k, v); } });
  const sel = (k, opts) => el('select', { onchange: (e) => set(k, e.target.value) }, ...opts.map(([v, l]) => el('option', { value: v, textContent: l, selected: (a[k] || '') === v })));
  const colourA = (k) => el('span', { style: 'display:contents' }, el('input', { type: 'color', value: toHex(a[k] || '#ffffff'), oninput: (e) => set(k, e.target.value) }), btn('None', () => { set(k, null); renderProps(); }));
  return sect('Auto layout',
    row('Direction', sel('dir', [['v', '↓ Vertical'], ['h', '→ Horizontal']])),
    el('div', { class: 'grid2' }, row('Gap', numA('gap', -200)), row('Padding', numA('pad', 0))),
    row('Align', sel('align', [['start', a.dir === 'h' ? 'Top' : 'Left'], ['center', 'Centre'], ['end', a.dir === 'h' ? 'Bottom' : 'Right']])),
    row('Background', colourA('bg')), row('Border', colourA('stroke')), row('Corner', numA('radius', 0)),
    el('div', { class: 'btnrow' },
      btn('＋ Add item', () => {
        const kids = g.children.filter((c) => c.type !== 'connector'), last = kids[kids.length - 1];
        if (!last) return;
        checkpoint();
        const c = cloneObjects([last], g.children, 0)[0];
        if (a.dir === 'h') c.x += 1e4; else c.y += 1e4; // sorts last
        g.children.push(c); relayoutAuto(g); render({ props: true });
      }),
      btn('Remove last', () => { const kids = g.children.filter((c) => c.type !== 'connector'); if (kids.length < 2) return; checkpoint(); g.children = g.children.filter((c) => c !== kids[kids.length - 1]); relayoutAuto(g); render({ props: true }); }),
      btn('Turn off', () => { checkpoint(); delete g.auto; render({ props: true }); })),
    el('div', { class: 'note', textContent: 'Double-click to edit items: drag one above another to reorder, delete one and the rest close up.' }));
}

// ---------- Magic resize ----------
const RESIZE_TARGETS = [...PAGE_PRESETS, ['A4 portrait (print)', 794, 1123], ['Square post 1080 × 1080', 1080, 1080], ['X / Twitter card 1200 × 675', 1200, 675], ['LinkedIn post 1200 × 627', 1200, 627], ['Instagram story 1080 × 1920', 1080, 1920]];
function scaleObject(o, s) {
  if (o.type === 'connector') { o.width = (o.width || 2) * s; return; }
  const c = center(o);
  if (o.type === 'text') { o.fontSize *= s; postEdit(o); }
  else if (o.type === 'protocol') { o.w *= s; o.scale = (o.scale || 1) * s; postEdit(o); }
  else { o.w *= s; o.h *= s; if (o.type === 'brush') o.size = (o.size || 8) * s; if (o.type === 'table' && o.fontSize) o.fontSize *= s; }
  o.x = c.x - o.w / 2; o.y = c.y - o.h / 2;
}
function magicResize(src, TW, TH, mode) {
  const W = src.width, H = src.height, kx = TW / W, ky = TH / H, k = Math.min(kx, ky), K = Math.max(kx, ky);
  const list = cloneObjects(src.objects, src.objects, 0);
  const free = (p) => p && !p.id;
  if (mode === 'fit') {
    const ox = (TW - W * k) / 2, oy = (TH - H * k) / 2;
    list.forEach((o) => {
      if (o.type === 'connector') { for (const e of ['from', 'to']) if (free(o[e])) o[e] = { x: o[e].x * k + ox, y: o[e].y * k + oy }; scaleObject(o, k); return; }
      const c = center(o); scaleObject(o, k); o.x = c.x * k + ox - o.w / 2; o.y = c.y * k + oy - o.h / 2;
    });
    return list;
  }
  // Reflow: objects that touch stay together as a cluster (an icon and its label); clusters spread to fill the new shape.
  const s = k * Math.min(1.2, Math.sqrt(K / k));
  const items = list.filter((o) => o.type !== 'connector'), bx = items.map((o) => bounds(o, list));
  const parent = items.map((_, i) => i), find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const glue = Math.max(8, Math.min(W, H) * 0.03), near = (a, b, m = glue) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
  const bigBg = (b) => b.w * b.h > 0.5 * W * H; // a full-page background panel shouldn't glue everything together
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (!bigBg(bx[i]) && !bigBg(bx[j]) && near(bx[i], bx[j])) parent[find(i)] = find(j);
  const clusters = new Map();
  items.forEach((o, i) => { const r = find(i); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(i); });
  const cl = [...clusters.values()].map((idx) => {
    const b = { x: Math.min(...idx.map((i) => bx[i].x)), y: Math.min(...idx.map((i) => bx[i].y)) };
    b.w = Math.max(...idx.map((i) => bx[i].x + bx[i].w)) - b.x; b.h = Math.max(...idx.map((i) => bx[i].y + bx[i].h)) - b.y;
    const bg = idx.length === 1 && bigBg(bx[idx[0]]);
    return { idx, b, bg, cx: b.x + b.w / 2, cy: b.y + b.h / 2 };
  });
  const margin = Math.min(TW, TH) * 0.03;
  cl.forEach((c) => {
    const sc = c.bg ? 1 : s, ncx = c.bg ? TW / 2 : c.cx * kx, ncy = c.bg ? TH / 2 : c.cy * ky;
    c.nb = { w: c.b.w * sc, h: c.b.h * sc };
    c.nb.x = Math.max(margin, Math.min(TW - margin - c.nb.w, ncx - c.nb.w / 2)); c.nb.y = Math.max(margin, Math.min(TH - margin - c.nb.h, ncy - c.nb.h / 2));
    if (c.nb.w > TW - 2 * margin) c.nb.x = (TW - c.nb.w) / 2;
    if (c.nb.h > TH - 2 * margin) c.nb.y = (TH - c.nb.h) / 2;
    if (c.bg) { c.idx.forEach((i) => { const o = items[i]; o.x = 0; o.y = 0; o.w = TW; o.h = TH; }); return; }
    c.idx.forEach((i) => {
      const o = items[i], oc = center(o);
      scaleObject(o, sc);
      const nx = c.nb.x + (oc.x - c.b.x) * sc, ny = c.nb.y + (oc.y - c.b.y) * sc;
      o.x = nx - o.w / 2; o.y = ny - o.h / 2;
    });
  });
  // Push apart clusters that now overlap but didn't before.
  const movable = cl.filter((c) => !c.bg);
  for (let it = 0; it < 40; it++) {
    let moved = false;
    for (let i = 0; i < movable.length; i++) for (let j = i + 1; j < movable.length; j++) {
      const A = movable[i], B = movable[j], a = A.nb, b = B.nb;
      if (near(A.b, B.b, 0)) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox <= 0 || oy <= 0) continue;
      moved = true;
      const horiz = ox < oy, d = (horiz ? ox : oy) / 2 + 2, sign = horiz ? Math.sign(a.x + a.w / 2 - (b.x + b.w / 2)) || 1 : Math.sign(a.y + a.h / 2 - (b.y + b.h / 2)) || 1;
      for (const [C, sg] of [[A, sign], [B, -sign]]) {
        const before = { x: C.nb.x, y: C.nb.y };
        if (horiz) C.nb.x = Math.max(margin, Math.min(TW - margin - C.nb.w, C.nb.x + sg * d)); else C.nb.y = Math.max(margin, Math.min(TH - margin - C.nb.h, C.nb.y + sg * d));
        const dx = C.nb.x - before.x, dy = C.nb.y - before.y;
        C.idx.forEach((i) => { items[i].x += dx; items[i].y += dy; });
      }
    }
    if (!moved) break;
  }
  list.forEach((o) => { if (o.type === 'connector') { for (const e of ['from', 'to']) if (free(o[e])) o[e] = { x: o[e].x * kx, y: o[e].y * ky }; o.width = (o.width || 2) * s; } });
  return list;
}
function openMagicResizeDialog() {
  const p = page();
  const target = el('select', {}, ...RESIZE_TARGETS.map((t, i) => el('option', { value: i, textContent: `${t[0]}`, selected: t[1] === 1280 && t[2] === 720 })));
  const W = el('input', { type: 'number', value: 1280, min: 50 }), H = el('input', { type: 'number', value: 720, min: 50 });
  const mode = el('select', {}, el('option', { value: 'reflow', textContent: 'Reflow: rearrange to fill the new shape' }), el('option', { value: 'fit', textContent: 'Fit: scale everything, keep the layout' }));
  const prev = el('div', { class: 'preview', style: 'min-height:260px;display:flex;align-items:center;justify-content:center' });
  const draw = () => {
    const objects = magicResize(p, +W.value, +H.value, mode.value);
    prev.innerHTML = pageSvgString({ ...p, width: +W.value, height: +H.value, objects }).replace('<svg ', '<svg style="max-width:100%;max-height:320px;border:1px solid #ddd" ');
  };
  target.addEventListener('change', () => { const t = RESIZE_TARGETS[+target.value]; W.value = t[1]; H.value = t[2]; draw(); });
  [W, H, mode].forEach((x) => x.addEventListener('change', draw));
  openModal('Magic resize', el('div', { style: 'width:820px;max-width:92vw;display:grid;grid-template-columns:300px 1fr;gap:14px' },
    el('div', {}, field_('Size', target), el('div', { class: 'grid2' }, field_('W', W), field_('H', H)), field_('Method', mode),
      el('div', { class: 'note', textContent: `From ${p.width} × ${p.height}. A resized copy is added as a new page, so the original stays as it is. Labels that touch an icon move with it; text scales with the layout. Check the result and nudge anything that crowds.` })),
    el('div', {}, prev, el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Create resized page', () => {
      checkpoint();
      const np = { ...deep({ ...p, objects: [] }), id: uid(), name: `${p.name} (${W.value}×${H.value})`, width: +W.value, height: +H.value, objects: magicResize(p, +W.value, +H.value, mode.value), comments: [] };
      state.doc.pages.splice(state.pageIndex + 1, 0, np);
      closeModal(); gotoPage(state.pageIndex + 1); zoomFit();
      toast('Resized copy added as a new page');
    }, 'primary')))));
  draw();
}

// ---------- Smart animate between slides ----------
// Copies remember where they came from, so a duplicated page can be matched object-for-object.
const _cloneObjectsD3 = cloneObjects;
cloneObjects = function (list, context, offset) {
  const out = _cloneObjectsD3(list, context, offset);
  const tag = (a, b) => { b.twin = a.twin || a.id; if (a.children && b.children) a.children.forEach((c, i) => b.children[i] && tag(c, b.children[i])); };
  list.forEach((o, i) => out[i] && tag(o, out[i]));
  return out;
};
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function matchPages(A, B) {
  const pairs = new Map(), used = new Set();
  const keyA = new Map(), byName = new Map(), byIcon = new Map();
  A.objects.forEach((a) => {
    keyA.set(a.twin || a.id, a); keyA.set(a.id, a);
    if (a.name) byName.set(a.name, byName.has(a.name) ? null : a);
    if (a.type === 'icon') byIcon.set(a.iconId, byIcon.has(a.iconId) ? null : a);
  });
  const iconCountB = new Map(); B.objects.forEach((b) => { if (b.type === 'icon') iconCountB.set(b.iconId, (iconCountB.get(b.iconId) || 0) + 1); });
  for (const b of B.objects) {
    if (b.type === 'connector') continue;
    let a = keyA.get(b.twin || b.id);
    if (!a || used.has(a)) a = b.name ? byName.get(b.name) : null;
    if ((!a || used.has(a)) && b.type === 'icon' && iconCountB.get(b.iconId) === 1) a = byIcon.get(b.iconId);
    if (a && !used.has(a) && a.type !== 'connector') { pairs.set(b.id, a); used.add(a); }
  }
  return { pairs, used };
}
const TWEEN_NUM = ['x', 'y', 'w', 'h', 'fontSize', 'strokeWidth', 'labelSize', 'radius', 'size', 'glowSize'];
function sameLook(a, b) { const strip = (o) => JSON.stringify(o, (k, v) => (['id', 'twin', 'x', 'y', 'w', 'h', 'rot', 'opacity', 'name', ...COLOR_KEYS].includes(k) && typeof v !== 'object' ? undefined : v)); return a.type === b.type && strip(a) === strip(b); }
function tweenFrame(A, B, t, kind = 'smart') {
  const e = ease(t), out = [];
  if (kind === 'slide') {
    A.objects.forEach((o) => { const c = deep(o); c.id = 'a_' + o.id; if (c.type === 'connector') { const [p, q] = connectorEnds(o, A.objects); c.from = { x: p.x - e * A.width, y: p.y }; c.to = { x: q.x - e * A.width, y: q.y }; } else c.x -= e * A.width; out.push(c); });
    B.objects.forEach((o) => { const c = deep(o); if (c.type !== 'connector') c.x += (1 - e) * B.width; else { for (const k of ['from', 'to']) if (!c[k].id) c[k] = { x: c[k].x + (1 - e) * B.width, y: c[k].y }; } out.push(c); });
    return out;
  }
  const { pairs, used } = kind === 'smart' ? matchPages(A, B) : { pairs: new Map(), used: new Set() };
  // Outgoing objects fade out underneath.
  A.objects.forEach((o) => {
    if (used.has(o)) return;
    const c = deep(o); c.id = 'a_' + o.id;
    if (c.type === 'connector') { const [p, q] = connectorEnds(o, A.objects); c.from = { x: p.x, y: p.y }; c.to = { x: q.x, y: q.y }; }
    c.opacity = (o.opacity ?? 1) * (1 - e); out.push(c);
  });
  B.objects.forEach((b) => {
    const a = pairs.get(b.id);
    if (!a) { const c = deep(b); c.opacity = (b.opacity ?? 1) * (b.type === 'connector' ? Math.max(0, (e - 0.5) * 2) : e); out.push(c); return; }
    const c = deep(b);
    for (const k of TWEEN_NUM) if (typeof a[k] === 'number' && typeof b[k] === 'number') c[k] = lerp(a[k], b[k], e);
    c.rot = lerpAngle(a.rot || 0, b.rot || 0, e);
    c.opacity = lerp(a.opacity ?? 1, b.opacity ?? 1, e);
    for (const k of COLOR_KEYS) { const ca = normHex(a[k]), cb = normHex(b[k]); if (ca && cb && ca !== cb) c[k] = Color.mix(ca, cb, e); }
    if (sameLook(a, b)) { out.push(c); return; }
    // Different content (text changed, icon swapped…): cross-fade both versions along the same motion.
    const ca = deep(a); ca.id = 'x_' + a.id;
    for (const k of ['x', 'y', 'w', 'h', 'rot', 'fontSize']) if (typeof c[k] === 'number') ca[k] = c[k];
    ca.opacity = (a.opacity ?? 1) * (1 - e); c.opacity *= e;
    out.push(ca, c);
  });
  return out;
}
function animateTransition(A, B, kind, ms, drawFrame) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    let last = 0;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      if (t === 1 || now - last > 22) { drawFrame(tweenFrame(A, B, t, kind)); last = now; }
      if (t < 1 && !animateTransition.cancel) requestAnimationFrame(step); else { animateTransition.cancel = false; resolve(); }
    };
    requestAnimationFrame(step);
  });
}
let shownSlide = null, animating = false;
const _startPresentD3 = startPresent, _showSlideD3 = showSlide;
startPresent = function () { shownSlide = null; _startPresentD3(); };
showSlide = function () {
  const i = presentIndex, prev = shownSlide, B = state.doc.pages[i], kind = B.transition;
  shownSlide = i;
  if (animating) { animateTransition.cancel = true; }
  if (prev == null || i !== prev + 1 || !kind || kind === 'none') return _showSlideD3();
  const A = state.doc.pages[prev];
  const k2 = Math.min(window.innerWidth / B.width, window.innerHeight / B.height) * 0.96;
  animating = true;
  animateTransition(A, B, kind, B.transitionMs || 700, (objects) => {
    $('#presentStage').innerHTML = pageSvgString({ ...B, objects }).replace('<svg ', `<svg style="width:${B.width * k2}px;height:${B.height * k2}px" `);
  }).then(() => { animating = false; if (presentIndex === i) _showSlideD3(); });
};
function transitionSection(P) {
  const p = page();
  const setT = (k, v) => { checkpoint('tr' + k); p[k] = v; };
  P.append(sect('Transition into this slide',
    row('Effect', el('select', { onchange: (e) => setT('transition', e.target.value) }, ...[['', 'None'], ['smart', 'Smart animate'], ['fade', 'Fade'], ['slide', 'Slide in']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (p.transition || '') === v })))),
    row('Duration', el('input', { type: 'number', min: 100, max: 5000, step: 100, value: p.transitionMs || 700, onchange: (e) => setT('transitionMs', Math.max(100, +e.target.value)) }), el('span', { textContent: 'ms' })),
    el('div', { class: 'note', textContent: 'Smart animate glides objects that appear on both slides (duplicate the page, then move, resize or recolour things) and fades the rest. Objects are matched by origin, then by name.' }),
    el('div', { class: 'btnrow' }, btn('Preview', () => previewTransition()), btn('Export animation…', openAnimationExport))));
}
function previewTransition() {
  const i = state.pageIndex;
  if (!i) { toast('This is the first page: the transition plays when arriving here from the page before'); return; }
  presentIndex = i - 1; startPresent(); setTimeout(() => { presentIndex = i; showSlide(); }, 450);
}
// Animation export: MP4 / WebM through MediaRecorder, or an animated GIF.
async function svgToCanvas(ctx, svgStr, W, H) {
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' }));
  try { const img = new Image(); img.src = url; await img.decode(); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H); } finally { URL.revokeObjectURL(url); }
}
function gifEncode(frames, W, H) { // frames: [{ data: RGBA Uint8ClampedArray, delay (1/100 s) }]
  const pal = [];
  for (let r = 0; r < 6; r++) for (let g = 0; g < 7; g++) for (let b = 0; b < 6; b++) pal.push([Math.round((r * 255) / 5), Math.round((g * 255) / 6), Math.round((b * 255) / 5)]);
  while (pal.length < 256) pal.push([255, 255, 255]);
  const bytes = [], w16 = (v) => bytes.push(v & 255, (v >> 8) & 255), str = (s) => [...s].forEach((ch) => bytes.push(ch.charCodeAt(0)));
  str('GIF89a'); w16(W); w16(H); bytes.push(0xf7, 0, 0); pal.forEach((c) => bytes.push(...c));
  bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1, 0, 0, 0);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (const f of frames) {
    bytes.push(0x21, 0xf9, 4, 0, f.delay & 255, (f.delay >> 8) & 255, 0, 0);
    bytes.push(0x2c); w16(0); w16(0); w16(W); w16(H); bytes.push(0);
    const idx = new Uint8Array(W * H), d = f.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, th = (bayer[(y & 3) * 4 + (x & 3)] / 16 - 0.5);
      const q = (v, n) => Math.max(0, Math.min(n, Math.round((v / 255) * n + th * 0.9)));
      idx[i] = q(d[4 * i], 5) * 42 + q(d[4 * i + 1], 6) * 6 + q(d[4 * i + 2], 5);
    }
    // LZW, 8-bit minimum code size.
    bytes.push(8);
    const out = [];
    let cur = 0, nbits = 0, size = 9, dict = new Map(), next = 258;
    const emit = (code) => { cur |= code << nbits; nbits += size; while (nbits >= 8) { out.push(cur & 255); cur >>= 8; nbits -= 8; } };
    emit(256);
    let w = idx[0];
    for (let i = 1; i < idx.length; i++) {
      const k = idx[i], key = w * 256 + k;
      if (dict.has(key)) { w = dict.get(key); continue; }
      emit(w);
      if (next < 4096) { dict.set(key, next++); if (next > 1 << size && size < 12) size++; } else { emit(256); dict = new Map(); next = 258; size = 9; }
      w = k;
    }
    emit(w); emit(257);
    if (nbits > 0) out.push(cur & 255);
    for (let i = 0; i < out.length; i += 255) { const blk = out.slice(i, i + 255); bytes.push(blk.length, ...blk); }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Uint8Array(bytes);
}
function openAnimationExport() {
  const pages = state.doc.pages, n = pages.length;
  const from = el('input', { type: 'number', min: 1, max: n, value: 1 }), to = el('input', { type: 'number', min: 1, max: n, value: n });
  const hold = el('input', { type: 'number', min: 0.2, max: 60, step: 0.1, value: 2 });
  const size = el('select', {}, el('option', { value: 1280, textContent: '1280 px wide' }), el('option', { value: 1920, textContent: '1920 px wide' }), el('option', { value: 800, textContent: '800 px wide' }), el('option', { value: 600, textContent: '600 px wide (small GIF)' }));
  const mp4 = window.MediaRecorder && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4;codecs=avc1' : window.MediaRecorder && MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : null;
  const fmt = el('select', {}, mp4 ? el('option', { value: 'mp4', textContent: 'MP4 video' }) : null, el('option', { value: 'webm', textContent: 'WebM video' }), el('option', { value: 'gif', textContent: 'Animated GIF' }));
  const status = el('div', { class: 'note' });
  let cancelled = false;
  const go = async () => {
    const a = Math.max(1, Math.min(n, +from.value)) - 1, b = Math.max(a + 1, Math.min(n, +to.value)) - 1;
    const P0 = pages[a], Wd = +size.value, k = Wd / P0.width, W = Math.round(Wd / 2) * 2, H = Math.round((P0.height * k) / 2) * 2;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: fmt.value === 'gif' });
    const frameSvg = (pg, objects) => pageSvgString({ ...pg, objects }).replace(/width="[^"]*" height="[^"]*" viewBox/, `width="${W}" height="${H}" viewBox`);
    const holdMs = +hold.value * 1000;
    if (fmt.value === 'gif') {
      const frames = [], fps = 15;
      const grab = (delayMs) => frames.push({ data: ctx.getImageData(0, 0, W, H).data, delay: Math.max(2, Math.round(delayMs / 10)) });
      for (let i = a; i <= b && !cancelled; i++) {
        const pg = pages[i];
        if (i > a && pg.transition) {
          const ms = pg.transitionMs || 700, nf = Math.max(4, Math.round((ms / 1000) * fps));
          for (let f = 1; f < nf && !cancelled; f++) { await svgToCanvas(ctx, frameSvg(pg, tweenFrame(pages[i - 1], pg, f / nf, pg.transition)), W, H); grab(1000 / fps); }
        }
        await svgToCanvas(ctx, frameSvg(pg, pg.objects), W, H); grab(holdMs);
        status.textContent = `Rendered slide ${i - a + 1} of ${b - a + 1}…`;
      }
      if (cancelled) return;
      status.textContent = 'Encoding GIF…';
      await new Promise((r) => setTimeout(r, 30));
      const bin = gifEncode(frames, W, H);
      const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(new Blob([bin], { type: 'image/gif' })); });
      const saved = await window.native.exportFile({ defaultName: `${(state.filePath || 'animation').split(/[\\/]/).pop().replace(/\.scifig$/, '')}.gif`, ext: 'gif', data: url });
      status.textContent = saved ? `Saved ${saved}` : 'Not saved';
      return;
    }
    const mime = fmt.value === 'mp4' ? mp4 : 'video/webm;codecs=vp9';
    const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => { rec.onstop = r; });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await svgToCanvas(ctx, frameSvg(pages[a], pages[a].objects), W, H);
    rec.start();
    for (let i = a; i <= b && !cancelled; i++) {
      const pg = pages[i];
      if (i > a && pg.transition) {
        const ms = pg.transitionMs || 700, t0 = performance.now();
        for (;;) { const t = Math.min(1, (performance.now() - t0) / ms); await svgToCanvas(ctx, frameSvg(pg, tweenFrame(pages[i - 1], pg, t, pg.transition)), W, H); if (t >= 1) break; await wait(0); }
      }
      await svgToCanvas(ctx, frameSvg(pg, pg.objects), W, H);
      status.textContent = `Recording slide ${i - a + 1} of ${b - a + 1}…`;
      await wait(holdMs);
    }
    rec.stop(); await done;
    if (cancelled) return;
    const blob = new Blob(chunks, { type: mime.split(';')[0] }), ext = fmt.value === 'mp4' ? 'mp4' : 'webm';
    const url = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    const saved = await window.native.exportFile({ defaultName: `${(state.filePath || 'animation').split(/[\\/]/).pop().replace(/\.scifig$/, '')}.${ext}`, ext, data: url });
    status.textContent = saved ? `Saved ${saved}` : 'Not saved';
  };
  onModalClose = () => { cancelled = true; };
  openModal('Export animation', el('div', { style: 'width:420px' },
    el('div', { class: 'grid2' }, field_('From slide', from), field_('To slide', to)),
    field_('Hold each slide (s)', hold), field_('Size', size), field_('Format', fmt),
    el('div', { class: 'note', textContent: 'Each slide’s transition (Smart animate, Fade or Slide in, set in the page properties) plays between slides. Videos record in real time.' }),
    status,
    el('div', { class: 'actions' }, btn('Close', closeModal), btn('Export', () => { status.textContent = 'Starting…'; go().catch((e) => { status.textContent = 'Export failed: ' + e.message; }); }, 'primary'))));
}

// ---------- Command palette ----------
let menuCmds = null;
async function paletteItems() {
  if (!menuCmds) { try { menuCmds = (window.native.menuCommands && (await window.native.menuCommands())) || []; } catch { menuCmds = []; } }
  const items = menuCmds.map((m) => ({ label: m.path.join(' › '), hint: m.accel || '', run: () => runCommand(m.cmd) }));
  const tools = [['select', 'Select', 'V'], ['text', 'Text', 'T'], ['rect', 'Rectangle', 'R'], ['ellipse', 'Ellipse', 'E'], ['shape', 'Shapes', 'S'], ['pencil', 'Pencil', 'D'], ['pen', 'Pen', 'P'], ['line', 'Line', 'L'], ['arrow', 'Arrow', 'A'], ['connector', 'Connector', 'C'], ['airbrush', 'Shading airbrush', 'W'], ['eraser', 'Eraser', 'X'], ['badge', 'Numbered badge', 'N'], ['comment', 'Comment', 'M'], ['table', 'Table', '']];
  tools.forEach(([t, l, k]) => items.push({ label: `Tool › ${l}`, hint: k, run: () => setTool(t) }));
  ['membrane', 'dna', 'actin', 'epithelium', 'ubiquitin', 'vesicles'].forEach((k) => items.push({ label: `Tool › Brush › ${k[0].toUpperCase() + k.slice(1)}`, hint: '', run: () => setTool('brush', k) }));
  state.doc.pages.forEach((p, i) => items.push({ label: `Go to page › ${i + 1}. ${p.name}`, hint: '', run: () => gotoPage(i) }));
  comps().forEach((c) => items.push({ label: `Insert component › ${c.name}`, hint: '', run: () => addObjects([newInstance(c, c.variants[0], viewCenter())]) }));
  swatchList().forEach((sw) => items.push({ label: `Apply global colour › ${sw.name}`, hint: '', run: () => selected().length ? linkSwatch(selected(), sw, 'primary') : toast('Select objects first') }));
  (state.doc.textStyles || []).forEach((ts) => items.push({ label: `Apply text style › ${ts.name}`, hint: '', run: () => applyTextStyle(selected(), ts) }));
  return items;
}
function fuzzyScore(q, s) {
  s = s.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const w of words) {
    const i = s.indexOf(w);
    if (i >= 0) { score += 10 - Math.min(9, i / 6) + (s[i - 1] === ' ' || i === 0 || s[i - 1] === '›' ? 5 : 0); continue; }
    let j = 0, k = 0; // subsequence
    for (; k < s.length && j < w.length; k++) if (s[k] === w[j]) j++;
    if (j < w.length) return -1;
    score += 1;
  }
  return score;
}
async function openCommandPalette() {
  let box = $('#cmdk');
  if (box) { box.remove(); return; }
  const items = await paletteItems();
  const input = el('input', { type: 'text', placeholder: 'Type a command, tool, page or component…', spellcheck: false });
  const list = el('div', { class: 'cmdk-list' });
  box = el('div', { id: 'cmdk' }, input, list);
  document.body.append(box);
  let shown = [], active = 0;
  const draw = () => {
    const q = input.value.trim();
    shown = q ? items.map((it) => [fuzzyScore(q, it.label), it]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map(([, it]) => it) : items.slice(0, 40);
    active = Math.min(active, Math.max(0, shown.length - 1));
    list.innerHTML = '';
    shown.forEach((it, i) => list.append(el('div', { class: 'cmdk-item' + (i === active ? ' active' : ''), onmousedown: (e) => { e.preventDefault(); pick(i); } }, el('span', { textContent: it.label }), el('kbd', { textContent: it.hint }))));
    if (!shown.length) list.append(el('div', { class: 'note', style: 'padding:8px', textContent: 'No matches' }));
    list.children[active]?.scrollIntoView({ block: 'nearest' });
  };
  const close = () => box.remove();
  const pick = (i) => { const it = shown[i]; close(); if (it) setTimeout(() => it.run(), 10); };
  input.addEventListener('input', () => { active = 0; draw(); });
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(active); }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) close(); }, 120));
  draw();
  input.focus();
}

// ---------- Find and replace, spell check ----------
const TEXT_FIELDS = ['text', 'label', 'pathText', 'title'];
function textLocations() { // every editable string in the document
  const out = [];
  state.doc.pages.forEach((p, pi) => {
    const visit = (o, top) => {
      for (const k of TEXT_FIELDS) if (typeof o[k] === 'string' && o[k]) out.push({ pi, top, o, get: () => o[k], set: (v) => { o[k] = v; if (o.type === 'text') postEdit(o); }, where: `${layerName(o)}${k === 'label' ? ' label' : k === 'title' ? ' title' : ''}` });
      if (o.type === 'table') o.cells.forEach((r, ri) => r.forEach((c, ci) => { if (c) out.push({ pi, top, o, get: () => o.cells[ri][ci], set: (v) => { o.cells[ri][ci] = v; }, where: `Table cell ${ri + 1},${ci + 1}` }); }));
      if (o.type === 'protocol' && Array.isArray(o.steps)) o.steps.forEach((s, si) => { if (typeof s === 'string') out.push({ pi, top, o, get: () => o.steps[si], set: (v) => { o.steps[si] = v; postEdit(o); }, where: `Protocol step ${si + 1}` }); else if (s && typeof s === 'object') for (const k of Object.keys(s)) if (typeof s[k] === 'string' && s[k] && !/^#|^data:/.test(s[k]) && k !== 'icon') out.push({ pi, top, o, get: () => s[k], set: (v) => { s[k] = v; postEdit(o); }, where: `Protocol step ${si + 1}` }); });
      if (o.type === 'chart' && o.cfg) for (const k of ['title', 'xLabel', 'yLabel']) if (o.cfg[k]) out.push({ pi, top, o, get: () => o.cfg[k], set: (v) => { o.cfg[k] = v; }, where: `Graph ${k === 'title' ? 'title' : 'axis label'}` });
      if (o.type === 'group' && !o.comp) o.children.forEach((c) => visit(c, top));
    };
    p.objects.forEach((o) => visit(o, o));
    if (p.notes) out.push({ pi, top: null, o: p, get: () => p.notes, set: (v) => { p.notes = v; }, where: 'Speaker notes' });
  });
  (state.doc.components || []).forEach((c) => c.variants.forEach((v) => walkDeep(v.objects, (o) => {
    for (const k of ['text', 'label']) if (typeof o[k] === 'string' && o[k]) out.push({ pi: null, comp: c, top: null, o, get: () => o[k], set: (val) => { o[k] = val; if (o.type === 'text') postEdit(o); }, where: `Component “${c.name}” (${v.name})` });
  })));
  return out;
}
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function findRegex(q, cs, whole) { return new RegExp((whole ? '(?<![\\p{L}\\p{N}])' : '') + reEsc(q) + (whole ? '(?![\\p{L}\\p{N}])' : ''), 'gu' + (cs ? '' : 'i')); }
// Words a general dictionary flags but a biologist writes all the time.
const SCI_WORDS = `antigen antigens cytokine cytokines chemokine chemokines interleukin interferon ubiquitin ubiquitinated ubiquitination polyubiquitin proteasome proteasomal deubiquitinase sumoylation phosphorylation phosphorylated dephosphorylation acetylation methylation glycosylation apoptosis apoptotic necroptosis pyroptosis ferroptosis autophagy autophagosome lysosome lysosomal endosome endosomal exosome exosomes inflammasome macrophage macrophages neutrophil neutrophils eosinophil basophil monocyte monocytes lymphocyte lymphocytes thymocyte thymus germinal plasmablast plasmablasts immunoglobulin immunoglobulins isotype isotypes hypermutation recombinase deaminase deamination uracil glycosylase cytotoxic cytotoxicity perforin granzyme granzymes immunotherapy immunogenic immunogenicity immunosuppressive immunosuppression tumour tumours tumor tumors tumorigenesis tumourigenesis oncogene oncogenes oncogenic metastasis metastases metastatic angiogenesis angiogenic xenograft xenografts syngeneic orthotopic subcutaneous intraperitoneal intravenous organoid organoids spheroid spheroids fibroblast fibroblasts myeloid lymphoid haematopoietic hematopoietic transcriptome transcriptomic transcriptomics proteome proteomic proteomics genome genomic genomics epigenetic epigenome kinase kinases phosphatase phosphatases ligase ligases protease proteases peptidase receptor receptors ligand ligands agonist antagonist inhibitor inhibitors knockout knockdown knockin transfection transfected transduction transduced lentivirus lentiviral retroviral plasmid plasmids sgRNA guide nanobody nanobodies scFv bispecific conjugate conjugates linker payload internalisation internalization endocytosis exocytosis secretory cytosol cytosolic cytoplasmic nucleoplasm nucleolus chromatin heterochromatin euchromatin nucleosome histone histones acetyltransferase methyltransferase demethylase deacetylase homeostasis proteostasis chaperone chaperones heterodimer homodimer dimerisation dimerization oligomer trimer tetramer multimer subunit subunits scaffold adaptor adaptors effector effectors costimulation costimulatory coinhibitory exhaustion exhausted naive memory effector regulatory immunoblot densitometry immunofluorescence immunohistochemistry cytometry cytometer gating ELISA qPCR RNAseq scRNAseq UMAP tSNE microenvironment stromal endothelial epithelial mesenchymal glycolysis glycolytic oxidative mitochondria mitochondrial reactive oxygen downregulation upregulation downregulated upregulated dysregulated pathway pathways signalling signaling crosstalk feedback in vivo in vitro ex vivo vitro vivo et al`.split(/\s+/);
let sciDict = null;
function sciDictionary() {
  if (sciDict) return sciDict;
  sciDict = new Set(SCI_WORDS.map((w) => w.toLowerCase()));
  const addNames = (s) => String(s || '').split(/[^\p{L}\p{N}-]+/u).forEach((w) => w && sciDict.add(w.toLowerCase()));
  try { ICONS.forEach((i) => { addNames(i.name); addNames(i.tags); }); } catch { /* not loaded */ }
  try { Packs.all.forEach((i) => addNames(i.name)); } catch { /* not loaded */ }
  (lsGet('scicanvas:dictionary', []) || []).forEach((w) => sciDict.add(w.toLowerCase()));
  return sciDict;
}
function looksTechnical(w) {
  return /\d/.test(w) || /[A-Z].*[A-Z]/.test(w) || /[α-ωΑ-Ω]/.test(w) || w.length <= 2 || /^[A-Z][a-z]?$/.test(w) || /[-_^{}|#]/.test(w);
}
async function spellCheckDoc() {
  if (!window.native.spellCheck) return null;
  if (window.native.spellAvailable && !(await window.native.spellAvailable())) return 'unavailable';
  const words = new Map();
  textLocations().forEach((loc) => {
    const plain = stripMarkup(String(loc.get()));
    (plain.match(/[\p{L}][\p{L}'’-]*[\p{L}]|[\p{L}]/gu) || []).forEach((w) => {
      const clean = w.replace(/['’]s$/, '');
      if (looksTechnical(clean) || sciDictionary().has(clean.toLowerCase())) return;
      if (!words.has(clean)) words.set(clean, []);
      words.get(clean).push(loc);
    });
  });
  const bad = await window.native.spellCheck([...words.keys()]);
  return bad.map((w) => ({ word: w, locs: words.get(w) }));
}
function gotoLocation(loc) {
  if (loc.pi == null) { if (loc.comp) openComponentsDialog(); return; }
  closeModal();
  if (loc.pi !== state.pageIndex) gotoPage(loc.pi);
  if (loc.top) { state.sel = [loc.top.id]; render({ props: true }); }
}
function openFindDialog(tab = 'find') {
  const q = el('input', { type: 'text', placeholder: 'Find (e.g. PD-L1)' }), rep = el('input', { type: 'text', placeholder: 'Replace with (e.g. CD274)' });
  const cs = el('input', { type: 'checkbox' }), whole = el('input', { type: 'checkbox', checked: true });
  const results = el('div', { style: 'max-height:42vh;overflow:auto;margin-top:8px' }), summary = el('div', { class: 'note' });
  const findPane = el('div'), spellPane = el('div', { style: 'display:none' });
  const search = () => {
    results.innerHTML = '';
    if (!q.value) { summary.textContent = ''; return []; }
    const re = findRegex(q.value, cs.checked, whole.checked), hits = [];
    textLocations().forEach((loc) => { const s = String(loc.get()), m = s.match(re); if (m) hits.push({ loc, n: m.length, s }); });
    summary.textContent = `${hits.reduce((a, h) => a + h.n, 0)} match${hits.length === 1 && hits[0].n === 1 ? '' : 'es'} in ${hits.length} place${hits.length === 1 ? '' : 's'}`;
    hits.slice(0, 200).forEach(({ loc, s }) => {
      re.lastIndex = 0; const m = re.exec(s), i = m ? m.index : 0;
      const snippet = (i > 24 ? '…' : '') + s.slice(Math.max(0, i - 24), i) + '⟦' + s.slice(i, i + q.value.length) + '⟧' + s.slice(i + q.value.length, i + q.value.length + 30) + (s.length > i + q.value.length + 30 ? '…' : '');
      results.append(el('div', { class: 'cmdk-item', style: 'cursor:pointer', onclick: () => gotoLocation(loc) },
        el('span', { textContent: snippet.replace(/\n/g, ' ') }), el('kbd', { textContent: `${loc.pi != null ? `p${loc.pi + 1} · ` : ''}${loc.where}` })));
    });
    return hits;
  };
  [q, cs, whole].forEach((x) => x.addEventListener('input', search));
  [cs, whole].forEach((x) => x.addEventListener('change', search));
  const replaceAll = () => {
    if (!q.value) return;
    const hits = search();
    if (!hits.length) return;
    checkpoint();
    const re = findRegex(q.value, cs.checked, whole.checked);
    let n = 0;
    hits.forEach(({ loc }) => { const s = String(loc.get()); loc.set(s.replace(re, () => { n++; return rep.value; })); });
    comps().forEach((c) => syncComponent(c.id));
    render({ props: true });
    search(); toast(`Replaced ${n} occurrence${n === 1 ? '' : 's'}`);
  };
  findPane.append(field_('Find', q), field_('Replace', rep),
    el('div', { style: 'display:flex;gap:14px;margin:4px 0 0 84px' }, el('label', { style: 'display:flex;gap:4px;align-items:center' }, cs, 'Match case'), el('label', { style: 'display:flex;gap:4px;align-items:center' }, whole, 'Whole word')),
    el('div', { class: 'btnrow', style: 'margin:8px 0 0 84px' }, btn('Replace all', replaceAll, 'primary')), summary, results,
    el('div', { class: 'note', textContent: 'Searches text, labels, text along paths, tables, protocol steps, graph titles, speaker notes and components on every page.' }));
  const spellList = el('div', { style: 'max-height:46vh;overflow:auto' });
  const runSpell = async () => {
    spellList.innerHTML = '';
    spellList.append(el('div', { class: 'note', textContent: 'Checking…' }));
    const bad = await spellCheckDoc();
    spellList.innerHTML = '';
    if (bad == null) { spellList.append(el('div', { class: 'note', textContent: 'Spell checking needs the desktop app.' })); return; }
    if (bad === 'unavailable') { spellList.append(el('div', { class: 'note', textContent: 'The system spell checker isn’t available on this computer (on Windows and Linux it downloads a dictionary the first time, which needs internet access).' })); return; }
    if (!bad.length) { spellList.append(el('div', { class: 'note', textContent: 'No spelling problems found. Gene, protein and CD-marker names are skipped automatically.' })); return; }
    for (const { word, locs } of bad) {
      const sugg = (window.native.spellSuggest ? await window.native.spellSuggest(word) : []).slice(0, 6);
      const pick = el('select', {}, ...sugg.map((s) => el('option', { value: s, textContent: s })), el('option', { value: '', textContent: sugg.length ? 'Type my own…' : 'No suggestions — type…' }));
      const own = el('input', { type: 'text', value: '', placeholder: 'Correction', style: `width:110px;${sugg.length ? 'display:none' : ''}` });
      pick.addEventListener('change', () => { own.style.display = pick.value ? 'none' : ''; });
      const rowEl = el('div', { class: 'row', style: 'flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--line,#eee);padding:4px 0' },
        el('b', { textContent: word, style: 'min-width:110px;cursor:pointer', title: 'Show where', onclick: () => gotoLocation(locs[0]) }),
        el('span', { class: 'note', textContent: `${locs.length}×` }), pick, own,
        btn('Change all', () => {
          const to = pick.value || own.value.trim();
          if (!to) return;
          checkpoint();
          const re = findRegex(word, true, true);
          new Set(locs).forEach((loc) => loc.set(String(loc.get()).replace(re, to)));
          comps().forEach((c) => syncComponent(c.id));
          render({ props: true }); rowEl.remove();
        }),
        btn('Add to dictionary', () => { const d = lsGet('scicanvas:dictionary', []); d.push(word); lsSet('scicanvas:dictionary', d); sciDictionary().add(word.toLowerCase()); rowEl.remove(); }),
        btn('Ignore', () => rowEl.remove()));
      spellList.append(rowEl);
    }
  };
  spellPane.append(el('div', { class: 'note', style: 'margin-bottom:6px', textContent: 'Uses the system dictionary plus a scientific word list (all icon names, ~20,000 protein, gene and cell names). Words with digits, capitals inside (CD8, PD-L1) or Greek letters are skipped.' }), spellList);
  const tabs = el('div', { class: 'tabs', style: 'margin-bottom:10px' });
  const show = (t) => { findPane.style.display = t === 'find' ? '' : 'none'; spellPane.style.display = t === 'spell' ? '' : 'none'; [...tabs.children].forEach((b) => b.classList.toggle('active', b.dataset.t === t)); if (t === 'spell') runSpell(); else q.focus(); };
  tabs.append(el('button', { class: 'tab', textContent: 'Find & replace', 'data-t': 'find', onclick: () => show('find') }), el('button', { class: 'tab', textContent: 'Check spelling', 'data-t': 'spell', onclick: () => show('spell') }));
  const s0 = selected()[0];
  if (s0 && s0.type === 'text') q.value = stripMarkup(s0.text).split('\n')[0].slice(0, 40);
  openModal('Find', el('div', { style: 'width:620px;max-width:92vw' }, tabs, findPane, spellPane));
  show(tab);
  search();
}

// ---------- Outline view ----------
function toggleOutline() {
  const on = svg.classList.toggle('outline-view');
  if (!on) { toast('Outline view off'); return; }
  const p = page(), hidden = [], off = [], tiny = [];
  objs().forEach((o) => {
    if (o.type === 'connector') return;
    const b = bounds(o, objs());
    if (o.hidden) hidden.push(o);
    else if (b.x + b.w < 0 || b.y + b.h < 0 || b.x > p.width || b.y > p.height) off.push(o);
    else if (b.w < 3 && b.h < 3) tiny.push(o);
  });
  const parts = [hidden.length && `${hidden.length} hidden`, off.length && `${off.length} off the page`, tiny.length && `${tiny.length} tiny`].filter(Boolean);
  toast(`Outline view (⌘Y to leave)${parts.length ? ` — found ${parts.join(', ')} (shown in red)` : ' — no stray objects'}`, 5000);
  renderScene();
}
const _renderSceneD3 = renderScene;
renderScene = function () {
  _renderSceneD3();
  if (!svg.classList.contains('outline-view')) return;
  const p = page();
  objs().forEach((o) => {
    const c = elCache.get(o.id);
    if (!c) return;
    const b = o.type === 'connector' ? null : bounds(o, objs());
    const stray = !!b && (b.x + b.w < 0 || b.y + b.h < 0 || b.x > p.width || b.y > p.height || (b.w < 3 && b.h < 3));
    c.el.classList.toggle('ol-hidden', !!o.hidden);
    c.el.classList.toggle('ol-stray', stray);
  });
};

// ---------- Commands, panels, help ----------
Object.assign(ARRANGE_COMMANDS, { autoLayout: addAutoLayout, magicResize: openMagicResizeDialog, exportAnimation: openAnimationExport,
  commandPalette: openCommandPalette, find: () => openFindDialog('find'), spellCheck: () => openFindDialog('spell'), outlineView: toggleOutline });
window.addEventListener('keydown', (e) => { // fallbacks when running without the native menu
  if (window.native.menuCommands) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === '/') { e.preventDefault(); openCommandPalette(); }
  else if (mod && e.key.toLowerCase() === 'y' && !isTyping()) { e.preventDefault(); toggleOutline(); }
});
const _renderPropsDesign3 = renderProps;
renderProps = function () {
  _renderPropsDesign3();
  const sel = selected(), P = $('#props');
  if (!sel.length) {
    const styles = [...P.querySelectorAll('.sect')].find((s) => s.querySelector('h3')?.textContent === 'Styles');
    const tr = el('div'); transitionSection(tr);
    (styles || P.lastChild).before(...tr.children);
    P.append(sect('Resize & present', el('div', { class: 'btnrow' }, btn('Magic resize…', openMagicResizeDialog), btn('Find & replace…', () => openFindDialog('find')), btn('Check spelling…', () => openFindDialog('spell')))));
    return;
  }
  if (sel.length === 1 && sel[0].type === 'group' && sel[0].auto) P.querySelector('.sect').after(autoSection(sel[0]));
  const rb = [...P.querySelectorAll('.sect')].find((s) => s.querySelector('h3')?.textContent === 'Repeat & build');
  if (rb && !(sel.length === 1 && sel[0].auto)) rb.querySelector('.btnrow').append(btn('Auto layout', addAutoLayout));
};
document.addEventListener('DOMContentLoaded', () => {
  if (typeof HELP === 'undefined') return;
  HELP.push(
    ['Components and variants (⌥⌘K)', 'Select a protein, cell or labelled group and choose Arrange › Create Component. Copies stay linked: double-click any copy to edit the main component and every copy updates. Add variants (Unbound / Bound / Phosphorylated) in Properties and switch them per copy. Each copy can override its colours and text. Insert › Components… lists them.'],
    ['Global colours and text styles', 'Properties › Global colours saves a named colour and links objects to it; change it in Arrange › Colour & Text Styles… and every linked object updates. Text styles (Panel letter, Title, Label, Caption) work the same for text.'],
    ['Copy / paste style (⌥⌘C / ⌥⌘V)', 'Copies fill, outline, shading, effects, blend mode, width profile and text formatting from one object onto others.'],
    ['Recolour artwork', 'Arrange › Recolour Artwork… lists every colour in the selection or page. Change any one, or map them all to a colour-blind-safe or journal palette while keeping light/dark shades paired.'],
    ['Repeat and blend', 'Arrange › Repeat makes radial (receptors around a cell), grid (well plates, mouse cohorts) or along-a-path copies with a live preview; edit them later from Properties. Arrange › Blend… makes the in-between steps of two objects.'],
    ['Width tool', 'Select an open drawing or arrow and choose a width profile (taper, swell, pinch or custom) in Properties › Width tool.'],
    ['Image Trace', 'Select an image and choose Insert › Image Trace… to turn it into editable vector shapes (black & white, 3, 6 or 16 colours).'],
    ['Shape builder (⇧⌘M)', 'Select overlapping closed shapes and start the shape builder. Drag across pieces to merge them, ⌥-drag to delete pieces, Enter to finish.'],
    ['Blend modes and fades', 'Properties › Blending: Multiply, Screen and other blend modes, and a fade-out opacity mask (left, right, up, down or vignette).'],
    ['Auto layout (⌥⌘A)', 'Turns a group into a stack with even gaps and padding that grows or shrinks to fit, with an optional background box. Good for legends and key boxes.'],
    ['Magic resize', 'Arrange › Magic Resize… makes a copy of the page at another size (slide, poster panel, social card), rearranging content rather than stretching it.'],
    ['Smart animate', 'In the page properties, set “Transition into this slide” to Smart animate. Objects on both slides glide and change colour; File › Export Animation… saves MP4, WebM or GIF.'],
    ['Command palette (⌘/)', 'Type to run any menu command, pick a tool, jump to a page or insert a component.'],
    ['Find and replace (⌘F), spelling', 'Edit › Find and Replace… searches every page; the Check spelling tab skips gene, protein and CD-marker names.'],
    ['Outline view (⌘Y)', 'Shows every object as a thin outline, with hidden, off-page and tiny stray objects in red.'],
  );
});
