// Line ends, rounded elbows, the shapes library (src/shapelib.js) and per-word underline / strikethrough.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('every line end draws, and closed ends stop the line short', () => {
  for (const k of ['arrow', 'stealth', 'open', 'harpoon', 'bar', 'dot', 'circle', 'diamond', 'odiamond', 'square', 'cross']) {
    const s = G.arrowHead(k, { x: 100, y: 50 }, { x: 0, y: 50 }, '#333', 2, 1.5);
    assert.ok(s.length > 10 && !/NaN|undefined/.test(s), k);
  }
  assert.equal(G.arrowHead('none', { x: 1, y: 1 }, { x: 0, y: 0 }, '#333', 2), '');
  const c = { id: 'c', type: 'connector', from: { x: 0, y: 0 }, to: { x: 200, y: 0 }, head: 'diamond', width: 2 };
  const d = G.connectorSvg(c, [c], true).match(/<path d="M([\d.]+) [\d.]+ L([\d.]+)/);
  assert.ok(+d[2] < 190, 'line stops before a diamond end');
});

test('elbows can have rounded corners and a draggable bend', () => {
  const d = G.roundedPolyline([{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 80 }, { x: 120, y: 80 }], 10);
  assert.equal((d.match(/Q/g) || []).length, 2);
  const o = { from: { x: 0, y: 0 }, to: { x: 200, y: 100 }, bend: 0.25 };
  assert.equal(JSON.stringify(G.elbowBendHandle(o, { x: 0, y: 0 }, { x: 200, y: 100 })), JSON.stringify({ x: 50, y: 50, axis: 'x' })); // object from the app's sandbox
});

test('library shapes draw valid geometry and keep old defaults', () => {
  for (const [k, d] of Object.entries(G.SHAPE_DEFS)) {
    const p = G.shapePath(k, 120, 90, {});
    assert.match(p, /^M/, k); assert.doesNotMatch(p, /NaN|undefined|Infinity/, k);
    for (const [key, , min, max] of d.params || []) for (const val of [min, max]) assert.doesNotMatch(G.shapePath(k, 120, 90, { [key]: val }), /NaN|Infinity/, `${k} ${key}=${val}`);
  }
  // The 5-point star with default settings is the original geometry.
  const star = G.shapePath('star', 100, 100, {});
  assert.match(star, /^M50 0 /);
  assert.equal((star.match(/L/g) || []).length, 9);
  assert.notEqual(G.shapePath('star', 100, 100, { points: 7 }), star);
});

test('per-word underline and strikethrough parse alongside bold and colour', () => {
  const segs = G.parseMarkup('a {u|under} {s|gone} {b#d64545|red} x^{2}');
  assert.ok(segs.some((s) => s.t === 'under' && s.underline));
  assert.ok(segs.some((s) => s.t === 'gone' && s.strike));
  assert.ok(segs.some((s) => s.t === 'red' && s.bold && s.color === '#d64545'));
  assert.ok(segs.some((s) => s.t === '2' && s.s === 1));
  assert.match(G.textSvg('{u|under}', { fontSize: 14 }), /text-decoration="underline"/);
});
