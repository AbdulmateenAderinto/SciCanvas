// New icon categories (src/softicons3.js, v0.9; softicons4.js and softicons5.js, v1.1): every icon draws cleanly, names don't collide with
// icons that already existed, and the search used by the diagram builder can find them.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const NEW_CATS = {
  'Soft · Organelles & cytoskeleton': 15,
  'Soft · Membranes, lipids & carbohydrates': 10,
  'Soft · Nanoparticles & materials': 8,
  'Soft · Human anatomy': 20,
  'Soft · Reproduction & development': 10,
  'Soft · Microbes & viruses': 15,
  'Soft · Model organisms & animals': 10,
  'Soft · Plants & agriculture': 15,
  'Soft · Lab equipment': 20,
  'Soft · Clinical & pharmacy': 12,
  'Soft · Symbols & callouts': 8,
  // v1.1 (softicons4.js)
  'Soft · Neuroscience': 15,
  'Soft · Heart & circulation': 10,
  'Soft · Channels, pumps & transporters': 15,
  'Soft · Metabolism & small molecules': 18,
  'Soft · Cell division & cell fate': 10,
  'Soft · Tissues': 12,
  'Soft · People & places': 8,
  'Soft · Data & computing': 8,
  'Soft · Environment & ecology': 12,
  // v1.1 clinical (softicons5.js)
  'Soft · Organs & body systems': 18,
  'Soft · Diseases & pathology': 35,
  'Soft · Clinical procedures & imaging': 25,
  'Soft · Histopathology': 9,
};
const fresh = A.ICONS.filter((i) => i.cat in NEW_CATS);

test('each new category is filled', () => {
  for (const [cat, min] of Object.entries(NEW_CATS)) {
    const n = fresh.filter((i) => i.cat === cat).length;
    assert.ok(n >= min, `${cat}: ${n} icons (expected at least ${min})`);
  }
});

test('every new icon draws valid SVG at several sizes', () => {
  for (const ic of fresh) {
    for (const size of [24, 84, 300]) {
      const o = A.Make.icon(ic.id, 0, 0, size);
      assert.ok([o.x, o.y, o.w, o.h].every(Number.isFinite), `${ic.name}: finite box`);
      const svg = A.pageSvgString({ width: 320, height: 320, background: '#ffffff', objects: [o] });
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, ic.name);
    }
  }
});

test('drawings are stable (same icon, same picture every time)', () => {
  for (const ic of fresh) assert.equal(ic.draw(ic.color), ic.draw(ic.color), ic.name);
});

test('new icon names are unique and do not repeat older icons', () => {
  const older = new Set(A.ICONS.filter((i) => !(i.cat in NEW_CATS) && !i.refined).map((i) => i.name)); // refined icons are a parallel set
  const seen = new Set();
  for (const ic of fresh) {
    assert.ok(!older.has(ic.name), `${ic.name} already existed`);
    assert.ok(!seen.has(ic.name), `${ic.name} listed twice`);
    seen.add(ic.name);
  }
});

test('search finds the new icons by name and by tag', () => {
  const nameOf = (q) => A.ICON_MAP[A.findIcon(q)]?.name;
  assert.equal(nameOf('Stethoscope'), 'Stethoscope');
  assert.equal(nameOf('Plate reader'), 'Plate reader');
  assert.match(nameOf('zebrafish'), /Zebrafish/);
  assert.match(nameOf('NanoDrop') || '', /spectrophotometer/i);
});
