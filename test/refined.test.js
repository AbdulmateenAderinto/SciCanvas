// Refined icons (src/refinedkit.js, refined1–4.js) and the icon finish (src/iconstyle.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const refined = A.ICONS.filter((i) => i.refined);
const CATS = ['Immune cells', 'Cells & organelles', 'Cancer', 'Engineering & biomaterials', 'Microbiology', 'Lab instruments', 'Lab consumables', 'Computational biology', 'Neuroscience', 'Molecules & proteins', 'Immune molecules'];

test('every refined category is filled', () => {
  assert.ok(refined.length >= 250, `${refined.length} refined icons`);
  for (const c of CATS) assert.ok(refined.filter((i) => i.cat === `Refined · ${c}`).length >= 10, c);
});

test('refined icons draw valid, stable SVG built from named parts', () => {
  for (const ic of refined) {
    const svg = ic.draw(ic.color);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, ic.name);
    assert.match(svg, /data-part="/, `${ic.name} has named parts`);
    assert.equal(svg, ic.draw(ic.color), `${ic.name} is stable`);
    assert.doesNotMatch(svg, /<(linearGradient|radialGradient|filter|clipPath)/, `${ic.name} stays recolourable`);
    const o = A.Make.icon(ic.id, 0, 0, 120);
    assert.ok([o.x, o.y, o.w, o.h].every(Number.isFinite), ic.name);
  }
});

test('refined ids are unique and prefixed', () => {
  const ids = new Set();
  for (const ic of refined) { assert.match(ic.id, /^r-/); assert.ok(!ids.has(ic.id), ic.id); ids.add(ic.id); assert.equal(A.ICON_MAP[ic.id], ic); }
  const names = refined.map((i) => i.name);
  assert.equal(new Set(names).size, names.length, 'refined names are unique');
});

test('recolouring changes the main colour', () => {
  for (const ic of refined.slice(0, 60)) {
    if (!ic.draw(ic.color).includes(ic.color)) continue;
    assert.notEqual(ic.draw('#123456'), ic.draw(ic.color), ic.name);
  }
});

test('icon finish thins outlines, keeps ids, and can switch back to classic', () => {
  const S = A.globals.IconStyle;
  const ic = A.ICON_MAP['tcell'];
  assert.ok(ic.classicDraw, 'older icons are wrapped');
  const refinedSvg = ic.draw(ic.color), classicSvg = ic.classicDraw(ic.color);
  assert.notEqual(refinedSvg, classicSvg);
  const body = (svg) => svg.match(/<circle cx="50" cy="50" r="40"[^>]*>/)[0];
  assert.match(body(classicSvg), /stroke-width="2.5"/);
  assert.match(body(refinedSvg), /stroke-width="1.5"/);
  S.set('classic');
  assert.equal(ic.draw(ic.color), classicSvg);
  S.set('refined');
  assert.equal(ic.draw(ic.color), refinedSvg);
});

test('library finds refined icons first and through the Refined chip', () => {
  const r = A.globals.searchIcons('T cell', { limit: 3 });
  assert.ok(r.items.some((i) => i.category === 'Refined · Immune cells'));
  const chip = A.globals.searchIcons('', { cat: 'Refined', limit: 9999 });
  assert.equal(chip.total, refined.length);
});
