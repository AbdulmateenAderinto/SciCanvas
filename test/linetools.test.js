// Line tools (src/linetools.js): bend points, routing, loops, branches, jumps, line styles and SBGN.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

const box = (id, x, y, w = 80, h = 50) => ({ id, type: 'rect', x, y, w, h, rot: 0 });
const line = (extra) => ({ id: 'c' + Math.random().toString(36).slice(2, 7), type: 'connector', from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, head: 'arrow', tail: 'none', style: 'straight', width: 2, color: '#333', ...extra });
const pts = (o, list) => G.connectorGeom(o, list || [o]).pts;
const clean = (s) => !/NaN|undefined|Infinity/.test(s);

test('plain connectors still use the original drawing', () => {
  assert.equal(G.connectorFancy(line({}), []), false);
  for (const k of ['points', 'route', 'jumps', 'offset', 'lineStyle', 'flow', 'gradTo', 'measure', 'ticks', 'sideIn', 'labelAbove']) {
    const v = { points: [{ x: 50, y: 40 }], route: 'auto', jumps: true, offset: 5, lineStyle: 'wavy', flow: true, gradTo: '#f00', measure: true, ticks: 3, sideIn: 'ATP', labelAbove: 'x' }[k];
    assert.equal(G.connectorFancy(line({ [k]: v }), []), true, k);
  }
});

test('bend points: straight legs through each point, or a smooth curve through them', () => {
  const o = line({ points: [{ x: 60, y: 80 }, { x: 140, y: -40 }] });
  assert.equal(JSON.stringify(pts(o)), JSON.stringify([{ x: 0, y: 0 }, { x: 60, y: 80 }, { x: 140, y: -40 }, { x: 200, y: 0 }]));
  const c = pts({ ...o, style: 'curved' });
  assert.ok(c.length > 20);
  for (const w of o.points) assert.ok(c.some((q) => Math.hypot(q.x - w.x, q.y - w.y) < 0.01), 'curve passes through the bend point');
  const e = pts({ ...o, style: 'elbow' });
  for (let i = 1; i < e.length; i++) assert.ok(e[i].x === e[i - 1].x || e[i].y === e[i - 1].y, 'elbow legs are square');
  assert.ok(clean(G.connectorSvg({ ...o, style: 'curved' }, [o], true)));
});

test('automatic routing goes around objects in the way', () => {
  const a = box('a', 0, 100), b = box('b', 400, 100), wall = box('w', 180, 40, 60, 170);
  const o = line({ from: { id: 'a' }, to: { id: 'b' }, style: 'elbow', route: 'auto' });
  const P = pts(o, [a, b, wall, o]);
  for (let i = 1; i < P.length; i++) {
    const p = P[i - 1], q = P[i];
    assert.ok(p.x === q.x || p.y === q.y, 'square legs');
    for (let t = 0; t <= 1; t += 0.05) {
      const x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
      assert.ok(!(x > wall.x && x < wall.x + wall.w && y > wall.y && y < wall.y + wall.h), `leg ${i} crosses the obstacle at ${x},${y}`);
    }
  }
  assert.ok(Math.abs(P[0].x - 80) < 0.01 && Math.abs(P[P.length - 1].x - 400) < 0.01, 'leaves and enters through the facing sides');
});

test('a line from an object back to itself is a feedback loop above it', () => {
  const a = box('a', 100, 100), o = line({ from: { id: 'a' }, to: { id: 'a' } });
  const P = pts(o, [a, o]);
  assert.ok(P.length > 10);
  assert.ok(Math.min(...P.map((q) => q.y)) < 100 - 20, 'loop rises above the top edge');
  assert.ok(Math.abs(P[0].y - 97) < 0.5 && Math.abs(P[P.length - 1].y - 97) < 0.5, 'starts and ends at the top edge');
  const b = G.bounds(o, [a, o]);
  assert.ok(b.y < 80 && b.h > 20);
  assert.ok(clean(G.connectorSvg({ ...o, loopSide: 'e' }, [a, o], true)));
});

test('two-way arrows sit side by side', () => {
  const p = line({ offset: 5 }), q = line({ from: { x: 200, y: 0 }, to: { x: 0, y: 0 }, offset: 5 });
  const P = pts(p), Q = pts(q);
  assert.ok(Math.abs(Math.abs(P[0].y - Q[0].y) - 10) < 0.01, 'opposite sides of the centre line');
});

test('ends can hang off another line, or sit anywhere on an edge', () => {
  const trunk = line({ id: 'trunk', from: { x: 0, y: 0 }, to: { x: 200, y: 0 } });
  const br = line({ from: { id: 'trunk', t: 0.25 }, to: { x: 50, y: 120 } });
  assert.equal(JSON.stringify(G.connectorEnds(br, [trunk, br])[0]), JSON.stringify({ x: 50, y: 0 }));
  const a = box('a', 100, 100, 80, 40), e = line({ from: { id: 'a', at: [1, 0.25] }, to: { x: 400, y: 0 } });
  assert.equal(JSON.stringify(G.connectorEnds(e, [a, e])[0]), JSON.stringify({ x: 180, y: 110 }));
  assert.ok(clean(G.connectorSvg(br, [trunk, br], true)));
});

test('a line hops over the lines it crosses', () => {
  const under = line({ id: 'u', from: { x: 100, y: -100 }, to: { x: 100, y: 100 } }), over = line({ jumps: true });
  assert.match(G.connectorSvg(over, [under, over], true), / A\d/);
  assert.doesNotMatch(G.connectorSvg(over, [over], true), / A\d/, 'no hop without a crossing');
});

test('line styles, gradients, flow arrows, dimensions, timelines and side reagents', () => {
  const svg = (x) => { const s = G.connectorSvg(line(x), [], true); assert.ok(clean(s), JSON.stringify(x)); return s; };
  assert.equal((svg({ lineStyle: 'double' }).match(/<path /g) || []).length, 2);
  assert.ok(svg({ lineStyle: 'wavy' }).split(' L').length > 40);
  assert.ok(svg({ lineStyle: 'zigzag' }).split(' L').length > 20);
  assert.match(svg({ gradTo: '#ff0000' }), /linearGradient[^>]*>.*stop-color="#ff0000"/);
  assert.match(svg({ flow: true }), /fill-opacity="0.45"/);
  assert.match(svg({ measure: true }), /200 px/);
  assert.match(svg({ measure: true, measureUnit: 'µm', measureScale: 0.1 }), />20 µm</);
  assert.equal((svg({ head: 'none', tickLabels: 'Day 0, Day 3, Day 7' }).match(/<line /g) || []).length, 3);
  const r = svg({ sideIn: 'ATP', sideOut: 'ADP', labelBelow: 'hexokinase' });
  for (const t of ['ATP', 'ADP', 'hexokinase']) assert.ok(r.includes(t), t);
});

test('SBGN arcs, glyphs and presets', () => {
  for (const k of ['otriangle', 'necstim']) {
    const s = G.arrowHead(k, { x: 100, y: 50 }, { x: 0, y: 50 }, '#333', 2);
    assert.ok(s.includes('polygon') && clean(s), k);
  }
  for (const k of ['sbgn_na', 'sbgn_complex', 'sbgn_perturb', 'sbgn_sink', 'sbgn_dissoc', 'sbgn_tag', 'sbgn_state']) assert.ok(/^M/.test(G.shapePath(k, 100, 60, {})) && clean(G.shapePath(k, 100, 60, {})), k);
  const SL = G.ShapeLib;
  assert.ok(SL.LIB.some(([c, items]) => c === 'SBGN' && items.length >= 12));
  for (const n of ['SBGN stimulation', 'Flow arrow', 'Timeline', 'Reaction with side reagents', 'Dimension line']) assert.ok(SL.LINES.some(([l]) => l === n), n);
});

test('PowerPoint gets special lines as pictures, plain ones as native connectors', () => {
  assert.ok(G.pictureOnly(line({ lineStyle: 'wavy' })));
  assert.ok(G.pictureOnly(line({ points: [{ x: 1, y: 1 }] })));
  assert.equal(G.pictureOnly(line({})), null);
});

test('a line whose object disappears keeps its last position instead of breaking', () => {
  const a = box('a', 0, 0), b = box('b', 300, 0), o = line({ id: 'keep', from: { id: 'a' }, to: { id: 'b' } });
  const before = G.connectorEnds(o, [a, b, o]);
  const after = G.connectorEnds(o, [b, o]); // 'a' was removed without letting go of the line
  assert.equal(JSON.stringify(after), JSON.stringify(before));
  assert.ok(clean(G.connectorSvg(o, [b, o], true)));
  const never = line({ id: 'never', from: { id: 'zz' }, to: { x: 50, y: 50 } });
  assert.equal(G.connectorSvg(never, [never], true), '', 'nothing to draw from an unknown object');
});

test('free-floating lines can be found under the pointer (to branch from or restyle)', () => {
  const free = line({ id: 'free', from: { x: 0, y: 100 }, to: { x: 300, y: 100 } });
  const hit = G.connectorAtPoint({ x: 150, y: 102 }, undefined, [free], 1);
  assert.ok(hit && hit.o.id === 'free' && Math.abs(hit.t - 0.5) < 0.01);
  assert.equal(G.connectorAtPoint({ x: 150, y: 102 }, 'free', [free], 1), null, 'the line being dragged is skipped');
});

test('Shift over a shape: the straight line meets its edge and attaches there', () => {
  const B = box('B', 420, 360, 120, 140);
  const hit = G.straightOntoObject({ x: 180, y: 425 }, { x: 470, y: 425 }, B);
  assert.equal(JSON.stringify(hit.pt), JSON.stringify({ x: 420, y: 425 }), 'enters through the left edge, still level');
  assert.equal(hit.at[0], 0);
  assert.ok(Math.abs(hit.at[1] - 65 / 140) < 1e-9);
  const diag = G.straightOntoObject({ x: 300, y: 240 }, { x: 440, y: 380 }, B);
  assert.ok(Math.abs((diag.pt.y - 240) - (diag.pt.x - 300)) < 1e-9 && diag.pt.y === 360, '45° line meets the top edge');
  assert.equal(G.straightOntoObject({ x: 0, y: 0 }, { x: 100, y: 0 }, B), null, 'a line that misses the shape stays free');
  assert.equal(G.straightOntoObject({ x: 180, y: 425 }, { x: 470, y: 425 }, { ...B, rot: 30 }), null, 'rotated shapes are left alone');
});
