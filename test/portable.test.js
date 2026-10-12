// Figures carry their built-in icons' drawings, so they open in a SciCanvas that lacks those icons.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

test('a saved figure still draws an icon the library no longer has', () => {
  const id = 's-peyer-s-patch';
  const icon = A.Make.icon(id, 10, 10, 120, { color: '#9b7fd1' });
  const doc = { version: 2, pages: [{ width: 300, height: 200, objects: [icon, { id: 'g', type: 'group', x: 0, y: 0, w: 1, h: 1, children: [A.Make.icon(id, 0, 0, 60)] }] }], assets: { 'builtin:stale|': { svg: '' } } };
  A.globals.embedBuiltinIcons(doc);
  const keys = Object.keys(doc.assets);
  assert.ok(keys.includes(`builtin:${id}|#9b7fd1`), 'icon embedded with its colour');
  assert.ok(!keys.includes('builtin:stale|'), 'stale copies are dropped on save');
  const before = A.pageSvgString(doc.pages[0]);
  const saved = A.ICON_MAP[id];
  A.state.doc = doc;
  delete A.ICON_MAP[id];                      // an older SciCanvas without this icon
  try {
    const after = A.pageSvgString(doc.pages[0]);
    assert.doesNotMatch(after, />missing</, 'drawn from the copy in the file');
    assert.ok(after.length > before.length * 0.8);
  } finally { A.ICON_MAP[id] = saved; }
});
