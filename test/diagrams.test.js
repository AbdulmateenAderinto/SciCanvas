// Diagram builder (src/diagrams.js) and templates: everything builds and renders, and the parts with
// real logic (Newick parsing, Punnett ratios, food-web levels, indented trees) give the right answers.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

// The app runs in its own sandbox, so copy its arrays before comparing them structurally.
const plain = (v) => JSON.parse(JSON.stringify(v));
const defaults = (d) => Object.fromEntries(d.fields.map((f) => [f.key, f.def]));
const render = (objects) => A.pageSvgString({ width: 1200, height: 900, background: '#ffffff', objects });

for (const [key, d] of Object.entries(A.DIAGRAMS)) {
  test(`diagram builds and renders: ${d.label}`, () => {
    const list = d.build(defaults(d));
    assert.ok(list.length > 3 || list.some((o) => o.type === 'group' && o.children.length > 3), 'drew objects');
    const svg = render(list);
    assert.doesNotMatch(svg, /NaN|undefined/);
    for (const o of list) if (o.type !== 'connector') assert.ok([o.x, o.y, o.w, o.h].every(Number.isFinite), `${key}: finite geometry for ${o.type}`);
  });
}

test('every clinical trial design builds', () => {
  for (const [design] of [['parallel'], ['crossover'], ['factorial'], ['singlearm'], ['basket'], ['umbrella'], ['platform'], ['dose3']]) {
    const list = A.DIAGRAMS.trial.build({ ...defaults(A.DIAGRAMS.trial), design });
    assert.doesNotMatch(render(list), /NaN|undefined/, design);
  }
});

test('every ELISA format and readout builds', () => {
  for (const format of ['direct', 'indirect', 'sandwich', 'competitive']) for (const signal of ['colour', 'fluor', 'chemi']) {
    assert.doesNotMatch(render(A.DIAGRAMS.elisa.build({ format, signal, antigen: 'IL-6' })), /NaN|undefined/, `${format}/${signal}`);
  }
});

test('Newick: names, branch lengths, internal labels and quoted names', () => {
  const t = A.parseNewick("((A:0.1,B:0.2)95:0.3,'C d':0.4);");
  assert.equal(t.kids.length, 2);
  assert.equal(t.kids[0].name, '95');
  assert.equal(t.kids[0].kids[1].len, 0.2);
  assert.equal(t.kids[1].name, 'C d');
  assert.throws(() => A.parseNewick('((A,B);'), /unbalanced|unexpected/);
});

test('Punnett: monohybrid 3:1 and dihybrid 9:3:3:1', () => {
  assert.deepEqual(plain(A.gametes('Aa')), ['A', 'a']);
  assert.deepEqual(plain(A.gametes('AaBb')).sort(), ['AB', 'Ab', 'aB', 'ab']);
  assert.deepEqual(plain(A.gametes('AB')), [], 'not a gene pair');
  const text = (p1, p2) => A.DIAGRAMS.punnett.build({ p1, p2 }).filter((o) => o.type === 'text').map((o) => o.text).join('\n');
  assert.match(text('Aa', 'Aa'), /A_ 3 : aa 1/);
  assert.match(text('AaBb', 'AaBb'), /A_B_ 9 : (A_bb|aaB_) 3 : (A_bb|aaB_) 3 : aabb 1/);
});

test('food web stacks organisms by trophic level', () => {
  const list = A.DIAGRAMS.foodweb.build({ links: 'Grass -> Rabbit\nRabbit -> Fox\nGrass -> Grasshopper\nGrasshopper -> Bird\nBird -> Fox' });
  const y = (n) => list.find((o) => o.name === n).y;
  assert.ok(y('Grass') > y('Rabbit') && y('Rabbit') > y('Bird') && y('Bird') > y('Fox'), 'producers at the bottom, top predator at the top');
});

test('indented text becomes a tree with edge labels', () => {
  const t = A.dgParseIndented('Root?\n  [Yes] Left\n    Leaf\n  [No] Right');
  assert.equal(t.length, 1);
  assert.deepEqual(plain(t[0].kids.map((k) => [k.edge, k.name])), [['Yes', 'Left'], ['No', 'Right']]);
  assert.equal(t[0].kids[0].kids[0].name, 'Leaf');
});

test('every template builds and renders', () => {
  assert.ok(A.TEMPLATES.length >= 49);
  for (const t of A.TEMPLATES) {
    const page = t.build();
    assert.doesNotMatch(A.pageSvgString(page), /NaN|undefined/, t.name);
    assert.ok(t.category, `${t.name} has a category`);
  }
});

test('icon lookup: exact names, and no guessing in strict mode', () => {
  assert.equal(A.findIcon('Mouse'), 'mouse');
  assert.equal(A.findIcon('Seal', { strict: true }), null);
});
