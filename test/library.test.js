// Library filters (src/packs.js): whole libraries, PhyloPic groups and clades, and the group list itself.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('PhyloPic images sort into everyday groups', () => {
  const groups = G.PHYLO_GROUPS;
  assert.ok(Object.keys(groups).length >= 15);
  for (const g of ['Mammals', 'Birds', 'Insects', 'Plants & algae', 'Fungi']) assert.ok(groups[g] && groups[g].split(' ').length > 50, g);
  const id = groups.Mammals.split(' ')[0];
  assert.equal(G.phyloGroup({ pack: 'phylopic', file: `${id}-0000-0000-0000-000000000000.svg` }), 'Mammals');
  assert.equal(G.phyloGroup({ pack: 'phylopic', file: 'zzzzzzzz.svg' }), 'Other organisms');
  assert.equal(G.phyloGroup({ pack: 'bioicons', file: `${id}.svg` }), null);
});

test('the library can be filtered by library, PhyloPic group and clade', () => {
  const builtin = G.searchIcons('', { cat: 'lib:builtin', limit: 5 });
  assert.ok(builtin.total > 1000 && builtin.items.every((i) => i.native));
  const id = G.PHYLO_GROUPS.Birds.split(' ')[0];
  const fake = [{ pack: 'phylopic', file: `${id}-x.svg`, name: 'Bird', category: 'PhyloPic · Aves', hay: 'bird', key: 'k1' }, { pack: 'phylopic', file: 'ffffffff-x.svg', name: 'Thing', category: 'PhyloPic · Organisms', hay: 'thing', key: 'k2' }];
  const saved = A.Packs.all;
  A.Packs.all = fake;
  try {
    assert.equal(G.searchIcons('', { cat: 'phylo:Birds' }).total, 1);
    assert.equal(G.searchIcons('', { cat: 'phylo:Birds|PhyloPic · Aves' }).total, 1);
    assert.equal(G.searchIcons('', { cat: 'phylo:Birds|PhyloPic · Organisms' }).total, 0);
    assert.equal(G.searchIcons('', { cat: 'lib:phylopic' }).total, 2);
  } finally { A.Packs.all = saved; }
});
