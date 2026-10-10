// Crop on the canvas (src/crop.js): trimming an icon or picture keeps the rest of the drawing exactly where it was
// (also when rotated or flipped), cropped icons draw only the kept part, and side handles stretch one way.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;
const inApp = (code) => require('vm').runInContext(code, G); // script-level constants of the app

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
const icon = (extra = {}) => ({ ...A.Make.icon('heart', 100, 50, 200), ...extra });

test('trimming keeps the full drawing in place, rotated and flipped too', () => {
  for (const extra of [{}, { rot: 30 }, { flipX: true }, { rot: -75, flipX: true, flipY: true }]) {
    const o = icon(extra), F = G.fullFrame(o);
    G.applyScreenCrop(o, F, { l: 0.2, t: 0.1, r: 0.15, b: 0.3 });
    const F2 = G.fullFrame(o);
    near(F2.c.x, F.c.x, 'centre x'); near(F2.c.y, F.c.y, 'centre y'); near(F2.w, F.w, 'width'); near(F2.h, F.h, 'height');
    near(o.w, 200 * 0.65, 'visible width'); near(o.h, F.h * 0.6, 'visible height');
    // On screen the left trim is 0.2 whichever way the drawing is flipped.
    near(G.screenCrop(o).l, 0.2, 'screen left'); near(G.screenCrop(o).b, 0.3, 'screen bottom');
    if (extra.flipX) near(o.crop.r, 0.2, 'stored in the drawing\'s own frame');
  }
});

test('a crop can be undone exactly with Remove crop, and never shrinks to nothing', () => {
  const o = icon({ rot: 20 }), start = { x: o.x, y: o.y, w: o.w, h: o.h };
  G.applyScreenCrop(o, G.fullFrame(o), { l: 0.9, t: 0, r: 0.5, b: 0 });
  assert.ok(o.w > 0 && 1 - o.crop.l - o.crop.r >= 0.03 - 1e-9, 'keeps at least 3%');
  G.applyScreenCrop(o, G.fullFrame(o), { l: 0, t: 0, r: 0, b: 0 });
  assert.equal(o.crop, null);
  for (const k of ['x', 'y', 'w', 'h']) near(o[k], start[k], k);
});

test('a cropped icon draws only the kept part of its drawing', () => {
  const o = icon();
  const whole = A.renderParts(o, [o]).inner;
  assert.match(whole, /overflow="visible"/);
  G.applyScreenCrop(o, G.fullFrame(o), { l: 0.25, t: 0, r: 0, b: 0.5 });
  const part = A.renderParts(o, [o]).inner;
  const vb = (s) => s.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const [x0, y0, w0, h0] = vb(whole), [x1, y1, w1, h1] = vb(part);
  near(x1, x0 + 0.25 * w0, 'view box x'); near(y1, y0, 'view box y'); near(w1, 0.75 * w0, 'view box width'); near(h1, 0.5 * h0, 'view box height');
  assert.match(part, /overflow="hidden"/);
  const page = A.pageSvgString({ width: 400, height: 300, background: '#fff', objects: [o] });
  assert.doesNotMatch(page, /NaN|undefined/);
});

test('side handles stretch one way; corners can keep proportions', () => {
  const start = { x: 0, y: 0, w: 100, h: 50, rot: 0 };
  const top = A.globals.computeResize({ start, h: 'n' }, { x: 50, y: -30 }, false);
  assert.equal(top.w, 100); assert.equal(top.h, 80);
  const side = A.globals.computeResize({ start, h: 'e' }, { x: 160, y: 25 }, false);
  assert.equal(side.h, 50); assert.equal(side.w, 160);
  const corner = A.globals.computeResize({ start, h: 'se' }, { x: 200, y: 60 }, true);
  near(corner.w / corner.h, 2, 'corner keeps 2:1');
});

test('the floating bar names every button, and offers Crop for icons and pictures', () => {
  const ctxBtn = inApp('ctxBtn');
  assert.match(ctxBtn('crop', 'cropStart', 'Crop (double-click a cropped object to adjust)'), /<span class="ctxlbl">Crop<\/span>/);
  assert.match(ctxBtn('flip', 'flipH', 'Flip horizontally (⇧H)'), /ctxlbl">Flip</);
  assert.match(ctxBtn('dup', 'someNewCommand', 'Do something new (⌘K)'), /ctxlbl">Do something new</, 'unknown buttons use their tooltip');
  assert.equal(typeof inApp('ARRANGE_COMMANDS.cropStart'), 'function');
  assert.equal(typeof inApp('ARRANGE_COMMANDS.cropReset'), 'function');
});
