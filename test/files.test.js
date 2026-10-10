// Opening damaged or older figure files (repairDoc in src/app.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('damaged figures are repaired so they open and export', () => {
  const cases = [{}, { pages: [] }, { pages: [null, { width: 800 }] }, { pages: [{ objects: [null, 7, { type: 'rect' }, { id: 'g', type: 'group' }, { type: 'connector' }] }] }];
  for (const d of cases) {
    const doc = G.repairDoc(JSON.parse(JSON.stringify(d)));
    assert.ok(doc.pages.length >= 1);
    for (const p of doc.pages) {
      assert.ok(p.width > 0 && p.height > 0 && Array.isArray(p.objects));
      for (const o of p.objects) assert.ok(o.id && o.type);
      const svg = G.pageSvgString(p);
      assert.doesNotMatch(svg, /NaN|undefined/, JSON.stringify(d));
    }
  }
  assert.throws(() => G.repairDoc([]), /Not a SciCanvas figure/);
  const kept = G.repairDoc({ pages: [{ width: 500, height: 400, objects: [{ id: 'keep', type: 'rect', x: 1, y: 2, w: 3, h: 4 }] }] });
  assert.equal(JSON.stringify(kept.pages[0].objects[0]), JSON.stringify({ id: 'keep', type: 'rect', x: 1, y: 2, w: 3, h: 4 }), 'good objects are untouched');
});
