// PhyloPic in the Refined style (src/phylostyle.js), silhouettes ranked after illustrated icons (src/packs.js),
// and the Refined model organisms (src/refined7.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

const POTRACE = '<g transform="translate(0,500) scale(0.100000,-0.100000)" fill="#000000" stroke="none"><path d="M10 10 L4000 10 L4000 4000 Z"/></g>';

test('silhouettes are restyled: no black, outline compensated for the 10× potrace scale, highlight masked', () => {
  const svg = G.phyloSoft(POTRACE, '0 0 1536 500', '#8a9bad', 'o1');
  assert.doesNotMatch(svg, /#000000|stroke="none"/);
  assert.match(svg, /<mask id="ppo1m"/);
  assert.match(svg, /data-part="organism"/);
  const sw = +svg.match(/stroke-width="([\d.]+)"/)[1];
  assert.ok(Math.abs(sw - 1536 * 0.024 * 10) < 0.1, `outline ${sw} is divided by the 0.1 scale`);
  const plain = G.phyloSoft('<path d="M0 0 L10 10"/>', '0 0 100 100', '#8a9bad', 'o2');
  assert.equal(+plain.match(/stroke-width="([\d.]+)"/)[1], 2.4, 'files without the potrace group are not compensated');
});

test('the view box is widened so the outline is not clipped', () => {
  const [x, y, w, h] = G.phyloViewBox('0 0 1536 500').split(' ').map(Number);
  assert.ok(x < 0 && y < 0 && w > 1536 && h > 500);
});

test('PhyloPic silhouettes rank after illustrated icons unless the search is the species name', () => {
  const fake = { pack: 'phylopic', key: 'pack:phylopic/dr.svg', id: 'pack:phylopic/dr.svg', name: 'Danio rerio', category: 'PhyloPic · Danioninae', license: 'cc-0', hay: 'danio rerio zebrafish danioninae', kb: 3 };
  A.Packs.all.push(fake);
  try {
    const zf = A.searchIcons('zebrafish', { limit: 50 }).items;
    const firstPhylo = zf.findIndex((i) => i.pack === 'phylopic'), lastNative = zf.map((i) => !!i.native).lastIndexOf(true);
    assert.ok(firstPhylo > lastNative, 'zebrafish: illustrated icons first');
    assert.equal(A.searchIcons('danio rerio', { limit: 5 }).items[0].name, 'Danio rerio', 'species name: silhouette first');
  } finally { A.Packs.all.splice(A.Packs.all.indexOf(fake), 1); }
});

test('ten Refined model organisms are drawn from named parts', () => {
  const names = ['Zebrafish (Refined)', 'C. elegans (Refined)', 'Xenopus frog (Refined)', 'Fruit fly (Refined)', 'Hamster (Refined)', 'Guinea pig (Refined)', 'Ferret (Refined)', 'Sheep (Refined)', 'Rabbit (Refined)', 'Arabidopsis (Refined)'];
  for (const n of names) {
    const ic = A.ICONS.find((i) => i.name === n);
    assert.ok(ic && ic.refined, n);
    const svg = ic.draw(ic.color);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, n);
    assert.ok((svg.match(/data-part="/g) || []).length >= 3, `${n} has parts`);
    assert.ok(A.searchIcons(n.split(' (')[0].toLowerCase(), { limit: 10 }).items.some((i) => i.name === n), `${n} is found by search`);
  }
});
