// Design tools (1.2): fills, light, effects, warps, cutaways, path tools, typography, labels, graphic styles,
// selection and layout grids. Rendering is checked as SVG strings; geometry with numbers.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const setPage = (objects, extra = {}) => {
  A.state.doc = { version: 2, pages: [{ id: 'p1', name: 'Page 1', width: 1000, height: 700, background: '#ffffff', objects, guides: { v: [], h: [] }, ...extra }], assets: {}, uploads: [] };
  A.state.pageIndex = 0; A.state.sel = []; A.state.zoom = 1; A.state.view.snap = true;
};
const svgOf = (o, list = [o]) => A.renderParts(o, list, true).inner;
const area = (mp) => mp.reduce((s, poly) => s + poly.reduce((t, ring, i) => { let a = 0; for (let k = 0; k < ring.length - 1; k++) a += ring[k][0] * ring[k + 1][1] - ring[k + 1][0] * ring[k][1]; return t + (i ? -1 : 1) * Math.abs(a / 2); }, 0), 0);

test('fill editor: multi-stop gradients with per-stop opacity, any angle, radial', () => {
  setPage([]);
  const r = A.Make.rect(0, 0, 100, 60, { id: 'g1', fillSpec: { kind: 'linear', x1: 0, y1: 0, x2: 1, y2: 1, stops: [{ at: 0, color: '#ff0000' }, { at: 0.5, color: '#00ff00', alpha: 0.5 }, { at: 1, color: '#0000ff' }] } });
  const s = svgOf(r);
  assert.match(s, /<linearGradient id="fs-g1" x1="0" y1="0" x2="1" y2="1">/);
  assert.equal((s.match(/<stop /g) || []).length, 3);
  assert.match(s, /stop-color="#00ff00" stop-opacity="0.5"/);
  assert.match(s, /fill="url\(#fs-g1\)"/);
  const e = A.Make.ellipse(0, 0, 80, 80, { id: 'g2', fillSpec: { kind: 'radial', cx: 0.3, cy: 0.4, r: 0.6, stops: [{ at: 0, color: '#ffffff' }, { at: 1, color: '#123456' }] } });
  assert.match(svgOf(e), /<radialGradient id="fs-g2" cx="0.3" cy="0.4" r="0.6"/);
});

test('fill editor: patterns and generated textures sit on top of the fill', () => {
  setPage([]);
  const r = A.Make.rect(0, 0, 100, 60, { id: 'p1', pattern: { kind: 'stripes', color: '#333333', angle: 45 } });
  const s = svgOf(r);
  assert.match(s, /<pattern id="pt-p1" patternUnits="userSpaceOnUse"[^>]*patternTransform="rotate\(45\)"/);
  assert.match(s, /fill="url\(#pt-p1\)"/);
  for (const k of ['granules', 'fibres', 'stroma', 'chromatin', 'droplets', 'trabeculae']) {
    const t1 = A.patternTile(k, 56, '#444444', 7), t2 = A.patternTile(k, 56, '#444444', 7);
    assert.ok(t1.length > 100, k); assert.equal(t1, t2, `${k} is the same every time`);
  }
  const n = svgOf(A.Make.rect(0, 0, 50, 50, { id: 'n1', pattern: { kind: 'noise' } }));
  assert.match(n, /feTurbulence/);
});

test('fill opacity and the legacy two-colour gradient on drawings', () => {
  setPage([]);
  assert.match(svgOf(A.Make.rect(0, 0, 50, 50, { id: 'a1', fill: '#ff0000', fillAlpha: 0.4 })), /fill="rgba\(255,0,0,0.4\)"/);
  const p = A.makePathFromNodes([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 25, y: 40 }], { id: 'pp', closed: true, fill: '#ff0000', fill2: '#0000ff' });
  assert.match(svgOf(p), /<linearGradient id="gr-pp"/);
});

test('one light source moves shading highlights and drop shadows', () => {
  setPage([]);
  const r = A.Make.ellipse(0, 0, 100, 100, { id: 'l1', fill: '#4a7fd6', shade: 'soft', shadow: 'soft' });
  const before = svgOf(r);
  assert.match(before, /cx="0.38" cy="0.32"/);
  A.state.doc.light = 90; // from the right
  const after = svgOf(r);
  assert.match(after, /<radialGradient id="sh-l1" cx="0.67" cy="0.5"/);
  assert.match(after, /<feDropShadow dx="-3.6" dy="0"/);
  A.state.doc.light = null;
  assert.match(svgOf(r), /cx="0.38" cy="0.32"/);
});

test('extra effects: inner glow, halo, grain, depth blur, background blur', () => {
  const r = A.Make.rect(0, 0, 50, 50, { id: 'e1', innerGlow: { color: '#ffffff', size: 4 }, halo: { color: '#000000', width: 2 }, grain: 0.3, depthBlur: 2 });
  const f = A.effectsFilter(r);
  assert.match(f, /feMorphology/); assert.match(f, /operator="out"/); assert.match(f, /feTurbulence/); assert.match(f, /stdDeviation="2"/);
  const back = A.Make.rect(10, 10, 100, 100, { id: 'bk', fill: '#ff0000' }), panel = A.Make.rect(40, 40, 100, 100, { id: 'fr', backdropBlur: 6, fillAlpha: 0.5 });
  setPage([back, panel]);
  const s = svgOf(panel, [back, panel]);
  assert.match(s, /clip-path="url\(#bdc-fr\)"/);
  assert.match(s, /translate\(-40 -40\)/);
});

test('path data: relative commands, arcs and flattening', () => {
  const segs = A.parsePathD('m10 10 h20 v20 h-20 z M0 0 A10 10 0 0 1 20 0');
  assert.equal(JSON.stringify(segs.slice(0, 3)), JSON.stringify([['M', 10, 10], ['L', 30, 10], ['L', 30, 30]]));
  assert.ok(segs.some((s) => s[0] === 'C'));
  const circle = A.flattenSegs(A.parsePathD('M-50 0A50 50 0 1 0 50 0A50 50 0 1 0 -50 0Z'), 1)[0];
  assert.ok(circle.closed);
  for (const p of circle.pts) assert.ok(Math.abs(Math.hypot(p.x, p.y) - 50) < 0.2);
});

test('warps: perspective corners are exact; markup is flattened with transforms baked in', () => {
  const h = A.homography([[0.1, 0], [0.9, 0], [1, 1], [0, 1]]);
  assert.equal(h(0, 0).map((v) => +v.toFixed(6)).join(), '0.1,0'); assert.equal(h(1, 1).map((v) => +v.toFixed(6)).join(), '1,1');
  const o = { id: 'w', type: 'rect', x: 0, y: 0, w: 100, h: 100, warp: { kind: 'arc', amount: 1 } };
  const f = A.warpFn(o);
  assert.equal(f(50, 100).y, 50); assert.equal(f(0, 100).y, 100);
  const out = A.warpMarkup('<g transform="translate(10 0)"><rect width="20" height="10" fill="red" stroke-width="2"/></g><svg width="100" height="100" viewBox="0 0 10 10" preserveAspectRatio="none"><circle cx="5" cy="5" r="5"/></svg><text x="5" y="5">Hi</text>', (x, y) => ({ x, y }));
  assert.ok(!/<rect|<circle/.test(out));
  assert.match(out, /<path d="M10 0L/);
  assert.match(out, /stroke-width="10"/); // nested viewBox scale × 10 carried into the stroke
  assert.match(out, /<g transform="matrix\(1 0 0 1 0 0\)"><text x="5" y="5">Hi<\/text><\/g>/);
});

test('warps: isometric presets keep the 30° geometry and render as warped paths', () => {
  const p = A.isoCorners(100, 100, (x, y) => [(x - y) * 0.866, (x + y) * 0.5]);
  assert.equal(p.kind, 'free');
  assert.ok(Math.abs(p.size[0] / p.size[1] - 1.732) < 0.01);
  setPage([]);
  const r = A.Make.rect(0, 0, 173.2, 100, { id: 'iso', radius: 0, warp: { kind: 'free', corners: p.corners } });
  const s = svgOf(r);
  assert.ok(!s.includes('<rect width="173.2"'));
  assert.match(s, /<path d="M86.6 0L/);
});

test('cutaway: wedge removes a sector, draws the cut face and an optional inside colour', () => {
  setPage([]);
  const e = A.Make.ellipse(0, 0, 100, 100, { id: 'c1', cut: { kind: 'wedge', cx: 0.5, cy: 0.5, a0: -90, sweep: 90, interior: '#ffeedd' } });
  const s = svgOf(e);
  assert.match(s, /<mask id="ctm-c1"/); assert.match(s, /style="mask-type:alpha"/); assert.match(s, /fill="#ffeedd"/); assert.match(s, /stroke="#5a4a42" stroke-width="12"/);
});

test('rectangles with a radius per corner', () => {
  assert.equal(A.roundRectD(100, 50, [10, 0, 0, 0]), 'M10 0H100V50H0V10A10 10 0 0 1 10 0Z');
  setPage([]);
  assert.match(svgOf(A.Make.rect(0, 0, 100, 50, { id: 'rr', radii: [10, 0, 20, 0] })), /A20 20 0 0 1 80 50/);
});

test('offset path grows and shrinks a closed shape with round corners', () => {
  setPage([]);
  const sq = A.Make.rect(0, 0, 100, 100, { radius: 0 });
  const rings = A.pageRings(sq, 1);
  const out = A.offsetGeom(rings, 10, true), inn = A.offsetGeom(rings, -10, true);
  assert.ok(Math.abs(area(out) - (100 * 100 + 4 * 100 * 10 + Math.PI * 100)) < 60, `outward area ${area(out)}`);
  assert.ok(Math.abs(area(inn) - 80 * 80) < 40, `inward area ${area(inn)}`);
  const band = A.offsetGeom(A.pageRings(A.makePathFromNodes([{ x: 0, y: 0 }, { x: 100, y: 0 }]), 1), 5, false);
  assert.ok(Math.abs(area(band) - (100 * 10 + Math.PI * 25)) < 15);
});

test('scissors, join, simplify and round corners', () => {
  setPage([]);
  const line = A.makePathFromNodes([{ x: 0, y: 0 }, { x: 100, y: 0 }], { stroke: '#222222' });
  const parts = A.cutPathAt(line, { x: 40, y: 2 });
  assert.equal(parts.length, 2);
  assert.ok(Math.abs(parts[0].x + parts[0].w - 40) < 1.5 && Math.abs(parts[1].x - 40) < 1.5);
  const joined = A.joinPaths(parts[0], parts[1]);
  assert.equal(joined.nodes.length, 3); assert.ok(Math.abs(joined.w - 100) < 0.01);
  const tri = A.makePathFromNodes([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 80 }], { closed: true, fill: '#ff0000' });
  const open = A.cutPathAt(tri, { x: 50, y: 0 });
  assert.equal(open.length, 1); assert.equal(open[0].closed, false);
  const ws = A.worldNodes(open[0]); assert.ok(Math.hypot(ws[0].x - ws[ws.length - 1].x, ws[0].y - ws[ws.length - 1].y) < 1e-6);
  const sq = A.makePathFromNodes([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }], { closed: true });
  assert.ok(A.roundPathCorners(sq, 10)); assert.equal(sq.nodes.length, 8);
  const wiggly = A.makePathFromNodes(Array.from({ length: 60 }, (_, i) => ({ x: i * 5, y: Math.sin(i / 6) * 40 + (i % 2) * 0.3 })), {});
  assert.ok(A.simplifyPath(wiggly)); assert.ok(wiggly.nodes.length < 30);
});

test('typography: text boxes wrap, justify, split into columns and keep word styles', () => {
  setPage([]);
  const t = A.Make.text('alpha beta gamma delta epsilon zeta eta theta', 0, 0, { fontSize: 10, boxW: 100 });
  const L = A.typesetLayout(t, []);
  assert.ok(L.lines.length >= 3);
  for (const ln of L.lines) assert.ok(ln.used <= 100.5);
  assert.equal(A.textMetrics(t).w, 100);
  const c = { ...t, columns: 2, gutter: 10 }, C = A.typesetLayout(c, []);
  assert.ok(C.lines.some((l) => l.col === 1));
  const s = A.renderParts({ ...t, align: 'justify', text: 'one {b#d64545|two three} four five six seven eight' }, [], true).inner;
  assert.match(s, /<tspan fill="#d64545" font-weight="700">two<\/tspan>/); assert.match(s, /<tspan fill="#d64545" font-weight="700">three<\/tspan>/);
  assert.equal((s.match(/<text /g) || []).length, 1);
  const sp = A.renderParts({ ...t, tracking: 0.1, lineHeight: 1.6, smallCaps: true, numerals: 'tabular' }, [], true).inner;
  assert.match(sp, /letter-spacing="1"/); assert.match(sp, /font-variant="small-caps"/); assert.match(sp, /tabular-nums/);
});

test('typography: text wraps around objects inside its box', () => {
  const t = A.Make.text('word '.repeat(40).trim(), 0, 0, { fontSize: 10, boxW: 300, wrapAround: true });
  const img = A.Make.rect(0, 0, 120, 60, { id: 'ob' });
  setPage([img, t]);
  const L = A.typesetLayout(t, [img, t]);
  const firstLines = L.lines.filter((l) => l.y < 60);
  assert.ok(firstLines.length && firstLines.every((l) => l.slot[0] >= 120));
  assert.ok(L.lines.some((l) => l.y > 70 && l.slot[0] === 0));
});

test('typing shortcuts turn into symbols when you press space', () => {
  assert.equal(JSON.stringify(A.applyTypeShortcuts('IFN-\\gamma ', 11)), JSON.stringify({ text: 'IFN-γ ', caret: 6 }));
  assert.equal(A.applyTypeShortcuts('A <=', 4), null); // still typing: <= could become <=>
  assert.equal(A.applyTypeShortcuts('A <=> ', 6).text, 'A ⇌ ');
  assert.equal(A.applyTypeShortcuts('37\\deg ', 7).text, '37° ');
  assert.equal(A.applyTypeShortcuts('\\alph ', 6), null);
});

test('labels: names go beside the objects with leader lines that follow them', () => {
  const a = A.Make.rect(400, 100, 50, 50, { id: 'A', name: 'PD-1' }), b = A.Make.rect(500, 300, 50, 50, { id: 'B', name: 'PD-L1' });
  setPage([a, b]);
  A.state.sel = ['A', 'B'];
  A.labelSelected();
  const labels = A.state.doc.pages[0].objects.filter((o) => o.leader);
  assert.equal(labels.length, 2);
  const la = labels.find((l) => l.leader.target === 'A');
  assert.equal(la.text, 'PD-1');
  assert.match(A.leaderSvg(la, A.state.doc.pages[0].objects), /<path d="M/);
  const x0 = la.x; a.x += 30;
  A.syncLeaders(A.state.doc.pages[0].objects);
  assert.equal(la.x, x0 + 30);
});

test('graphic styles: one look applied to many objects, updated everywhere', () => {
  const a = A.Make.rect(0, 0, 50, 50, { fill: '#ff0000', stroke: '#000000', shadow: 'soft', pattern: { kind: 'dots' } }), b = A.Make.rect(0, 0, 50, 50), c = A.Make.ellipse(0, 0, 50, 50);
  setPage([a, b, c]);
  const gs = { id: 'gs1', name: 'Tumour', type: 'shape', props: A.styleProps(a) };
  A.gstyles().push(gs);
  A.applyGraphicStyle([b, c], gs);
  assert.equal(b.fill, '#ff0000'); assert.equal(c.shadow, 'soft'); assert.equal(c.pattern.kind, 'dots'); assert.equal(c.gstyle, 'gs1');
  gs.props.fill = '#00ff00';
  A.syncGraphicStyle(gs);
  assert.equal(b.fill, '#00ff00'); assert.equal(c.fill, '#00ff00'); assert.equal(a.fill, '#ff0000');
});

test('lasso selects objects whose centres are inside the loop', () => {
  const a = A.Make.rect(0, 0, 20, 20, { id: 'a' }), b = A.Make.rect(200, 200, 20, 20, { id: 'b' });
  setPage([a, b]);
  assert.equal(A.lassoSelect([{ x: -10, y: -10 }, { x: 50, y: -10 }, { x: 50, y: 50 }, { x: -10, y: 50 }], false), 1);
  assert.deepEqual([...A.state.sel], ['a']);
  assert.equal(A.pointInPoly({ x: 2, y: 2 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]), true);
});

test('layout grids: journal columns and snapping targets', () => {
  setPage([A.Make.rect(0, 0, 10, 10)], { layoutGrid: { cols: 2, gutterFrac: 5 / 183, margin: 0 } });
  const G = A.gridColumns(A.state.doc.pages[0]);
  assert.equal(G.cols.length, 2);
  assert.ok(Math.abs(G.cw / 1000 - 89 / 183) < 1e-9);
  assert.ok(A.guideTargets().some((t) => Math.abs(t.x - G.cols[1].x) < 1e-9 && t.h === 0));
  assert.ok(A.sizeTargets().some((t) => Math.abs(t.w - 1000) < 1e-9));
});
