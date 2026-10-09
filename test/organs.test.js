// Organ icons drawn from professional artwork (src/organart.js, src/organicons.js): they draw valid, stable SVG, carry
// their licence so File › Credits cites them, contain nothing active, and keep their ids private to each drawing.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const art = A.ICONS.filter((i) => i.art);
const LICENCES = new Set(['cc-by-3.0', 'cc-by-4.0', 'cc-0']);

test('the organs use the professional artwork', () => {
  assert.ok(art.length >= 60, `${art.length} art icons`);
  for (const id of ['heart', 'lungs', 'liver', 'kidney', 'brain', 's-stomach', 's-small-intestine', 's-large-intestine-colon', 's-pancreas', 's-spleen', 's-urinary-bladder', 's-heart-four-chambers', 's-eye', 's-ear-outer-middle-inner', 'r-lateral-brain']) {
    assert.ok(A.ICON_MAP[id] && A.ICON_MAP[id].art, `${id} uses artwork`);
  }
});

test('art icons draw valid, stable, self-contained SVG', () => {
  for (const ic of art) {
    const svg = ic.draw(ic.color);
    assert.equal(svg, ic.draw(ic.color), `${ic.name} is stable`);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, ic.name);
    assert.doesNotMatch(svg, /<script|<foreignObject|\son\w+=|javascript:/i, `${ic.name} has nothing active`);
    assert.doesNotMatch(svg, /href="(?!#)/, `${ic.name} has no external links`);
    for (const [, id] of svg.matchAll(/\sid="([^"]+)"/g)) assert.match(id, /^oac?-/, `${ic.name}: id ${id} is private to the drawing`);
    for (const size of [24, 160]) {
      const o = A.Make.icon(ic.id, 0, 0, size);
      const page = A.pageSvgString({ width: 200, height: 200, background: '#ffffff', objects: [o] });
      assert.doesNotMatch(page, /NaN|undefined|Infinity/, ic.name);
    }
    assert.notEqual(ic.draw('#3366cc'), svg, `${ic.name} can be recoloured`);
  }
});

test('every art icon carries its licence, and File › Credits cites it', () => {
  for (const ic of art) {
    assert.ok(ic.credit && LICENCES.has(ic.credit.license), `${ic.name} licence`);
    assert.ok(ic.credit.author && ic.credit.pack && ic.credit.name, `${ic.name} credit details`);
  }
  const doc = { pages: [{ objects: [{ type: 'icon', iconId: 'heart' }, { type: 'icon', iconId: 's-thymus' }, { type: 'icon', iconId: 's-cirrhotic-liver' }] }], assets: {} };
  const { icons } = A.globals.collectCredits(doc);
  assert.equal(icons.length, 3);
  const text = A.globals.creditsText(doc);
  assert.match(text, /Servier Medical Art/);
  assert.match(text, /Reactome/);
});

test('Classic icon style still shows the earlier drawings', () => {
  const IS = A.globals.IconStyle, heart = A.ICON_MAP.heart, modern = heart.draw(heart.color);
  IS.set('classic');
  try { assert.notEqual(heart.draw(heart.color), modern); } finally { IS.set('refined'); }
});
