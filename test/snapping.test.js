// Snapping (v1.1): rotation angles, straight lines, and resizing to match other objects' sizes.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const noKeys = { shiftKey: false, metaKey: false, ctrlKey: false };
const setPage = (objects) => { // a fresh one-page document (the test loader's own may be replaced by start-up timers)
  A.state.doc = { version: 1, pages: [{ id: 'p1', name: 'Page 1', width: 1000, height: 700, background: '#ffffff', objects, guides: { v: [], h: [] } }], assets: {}, uploads: {} };
  A.state.pageIndex = 0; A.state.sel = []; A.state.zoom = 1; A.state.view.snap = true;
};

test('rotation locks onto 45° steps within a few degrees', () => {
  assert.equal(A.snapAngle(87.5, noKeys).a, 90);
  assert.equal(A.snapAngle(358, noKeys).a, 0);
  assert.equal(A.snapAngle(47, noKeys).a, 45);
  assert.equal(A.snapAngle(62, noKeys).snapped, false);
  assert.equal(A.snapAngle(62, noKeys).a, 62);
});

test('rotation: Shift gives 15° steps, ⌘ / Ctrl turns snapping off, other objects’ angles attract', () => {
  assert.equal(A.snapAngle(37, { ...noKeys, shiftKey: true }).a, 30);
  assert.equal(A.snapAngle(88, { ...noKeys, ctrlKey: true }).a, 88);
  assert.equal(A.snapAngle(88, { ...noKeys, metaKey: true }).a, 88);
  const m = A.snapAngle(31.5, noKeys, [30]);
  assert.equal(m.a, 30); assert.equal(m.matched, true);
});

test('lines straighten near horizontal, vertical and 45°', () => {
  A.state.zoom = 1;
  const a = { x: 0, y: 0 };
  const h = A.snapLinePoint(a, { x: 200, y: 7 }, noKeys).p;
  assert.ok(Math.abs(h.y) < 1e-9 && Math.abs(h.x - 200.12) < 0.01);
  const v = A.snapLinePoint(a, { x: -5, y: 150 }, noKeys).p;
  assert.ok(Math.abs(v.x) < 1e-9);
  const d = A.snapLinePoint(a, { x: 100, y: 96 }, noKeys).p;
  assert.ok(Math.abs(d.x - d.y) < 1e-9);
  const free = A.snapLinePoint(a, { x: 100, y: 60 }, noKeys).p;
  assert.deepEqual([free.x, free.y], [100, 60]);
});

test('resizing keeps the opposite side or corner in place', () => {
  const r = { x: 10, y: 20, w: 100, h: 50 };
  A.resizeFromAnchor(r, 'nw', 80, 40);
  assert.deepEqual({ ...r }, { x: 30, y: 30, w: 80, h: 40 });
  const s = { x: 10, y: 20, w: 100, h: 50 };
  A.resizeFromAnchor(s, 'e', 80, 50);
  assert.deepEqual({ ...s }, { x: 10, y: 20, w: 80, h: 50 });
});

test('resizing snaps to the width of another object', () => {
  setPage([A.Make.rect(100, 100, 100, 80, { id: 'A' }), A.Make.rect(300, 300, 60, 60, { id: 'B' })]);
  A.state.sel = ['B'];
  const r = { x: 300, y: 300, w: 97, h: 60 };
  const g = A.snapResize({ h: 'e', start: { x: 300, y: 300, w: 60, h: 60, rot: 0 } }, r, false, noKeys);
  assert.equal(r.w, 100); assert.equal(r.x, 300);
  assert.match(g, />100</); // dimension labels on both boxes
  const r2 = { x: 300, y: 300, w: 97, h: 60 };
  A.snapResize({ h: 'e', start: { x: 300, y: 300, w: 60, h: 60, rot: 0 } }, r2, false, { ...noKeys, ctrlKey: true });
  assert.equal(r2.w, 97);
});

test('locked-proportion resizing (icons, images) scales to a matching size', () => {
  setPage([A.Make.rect(100, 100, 100, 80, { id: 'A' }), A.Make.rect(600, 300, 50, 50, { id: 'I' })]);
  A.state.sel = ['I'];
  const r = { x: 600, y: 300, w: 83, h: 83 };
  A.snapResize({ h: 'se', start: { x: 600, y: 300, w: 50, h: 50, rot: 0 } }, r, true, noKeys);
  assert.equal(r.w, r.h); assert.equal(r.h, 80); assert.equal(r.x, 600); assert.equal(r.y, 300);
});

test('new shapes snap to existing sizes', () => {
  setPage([A.Make.rect(100, 100, 100, 80, { id: 'A' })]);
  const s = A.snapCreateSize(97, -78, noKeys);
  assert.equal(s.w, 100); assert.equal(s.h, -80);
  assert.equal(A.snapCreateSize(140, 30, noKeys).w, 140);
});

test('icon search still finds built-in icons (cached list)', () => {
  assert.equal(A.nativeSearchList(), A.nativeSearchList());
  assert.ok(A.searchIcons('mitochondr').items.some((i) => /Mitochondri/.test(i.name)));
});

test('redraw check: moving an object reuses its drawing, moving a connector end does not', () => {
  const r = A.Make.rect(10, 10, 50, 40);
  const k = A.innerKey(r, [r]);
  r.x = 300; r.y = 200;
  assert.equal(A.innerKey(r, [r]), k); // only the outer position changed
  const c = A.Make.connector({ x: 100, y: 450 }, { x: 120, y: 456 });
  const k2 = A.innerKey(c, [c]);
  c.to = { x: 300, y: 450 };
  assert.notEqual(A.innerKey(c, [c]), k2); // used to be equal, leaving a stub arrow on screen
});
