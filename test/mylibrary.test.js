// Your own Library (v1.8): names, related words and tags you give an icon change what the Library shows and what
// search finds (packs.js setIconLabels / labelEntry), and pictures you add are named and tidied sensibly (mylibrary.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;
const inApp = (code) => require('vm').runInContext(code, G);

const store = new Map(); // working localStorage for this test
G.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
const find = (q) => A.searchIcons(q, { limit: 8 }).items.map((i) => i.key);
const someIcon = () => A.ICONS.find((i) => i.id === 'neuron') || A.ICONS[0];

test('renaming and re-tagging a built-in icon changes its name and what search finds', () => {
  const ic = someIcon(), setIconLabels = inApp('setIconLabels'), iconEntry = inApp('iconEntry');
  assert.ok(!find('zzfigurethree').includes(ic.id));
  setIconLabels(ic.id, { name: 'My special cell', related: 'zzalias, other name', tags: 'zzfigurethree, project x' });
  const e = iconEntry(ic.id);
  assert.equal(e.name, 'My special cell');
  assert.equal(e.edited, true);
  assert.equal(find('zzfigurethree')[0], ic.id, 'a tag finds it');
  assert.equal(find('zzalias')[0], ic.id, 'a related word finds it');
  assert.equal(find('my special')[0], ic.id, 'the new name finds it');
  assert.deepEqual(JSON.parse(store.get('scicanvas:iconLabels'))[ic.id].tags, 'zzfigurethree, project x');
  // Reset brings back the original name and tags.
  setIconLabels(ic.id, null);
  assert.equal(iconEntry(ic.id).name, ic.name);
  assert.equal(iconEntry(ic.id).edited, false);
  assert.ok(!find('zzfigurethree').includes(ic.id));
});

test('your tags replace the icon\'s own tags, and rank above words only in a description', () => {
  const ic = someIcon(), setIconLabels = inApp('setIconLabels'), iconEntry = inApp('iconEntry');
  const own = (ic.tags || '').split(/\s+/).find((w) => w.length > 4 && !ic.name.toLowerCase().includes(w) && !ic.cat.toLowerCase().includes(w));
  setIconLabels(ic.id, { name: '', related: '', tags: 'zzonlythis' });
  assert.equal(iconEntry(ic.id).name, ic.name, 'an empty name keeps the original');
  assert.equal(iconEntry(ic.id).tags, 'zzonlythis');
  if (own) assert.ok(!iconEntry(ic.id).hay.includes(own.toLowerCase()), 'the old tag is gone');
  setIconLabels(ic.id, null);
});

test('pictures you add (My icons) are found by their related words and tags', () => {
  const { Packs } = A;
  Packs.list = [{ id: 'mine', name: 'My icons', base: 'file:///x', icons: [{ file: 'icon-a.svg', kb: 3, name: 'Activated macrophage', category: 'My icons · Immunology', license: 'own', author: 'You', tags: 'innate immunity, zzfig3', related: 'phagocyte, zzmphi' }] }];
  Packs.all = [{ ...Packs.list[0].icons[0], ownRelated: 'phagocyte, zzmphi', pack: 'mine', key: 'pack:mine/icon-a.svg', url: 'file:///x/icon-a.svg' }];
  Packs.byKey = new Map(Packs.all.map((i) => [i.key, i]));
  inApp('relabelIcons')();
  assert.equal(find('zzmphi')[0], 'pack:mine/icon-a.svg');
  assert.equal(find('zzfig3')[0], 'pack:mine/icon-a.svg');
  assert.equal(inApp('iconEntry')('pack:mine/icon-a.svg').related, 'phagocyte, zzmphi');
  Packs.list = []; Packs.all = []; Packs.byKey = new Map();
});

test('names from file names, and tidy word lists', () => {
  const M = G.MyLibrary;
  assert.equal(M.nameFromFile('Lymph_node-02.png'), 'Lymph node 02');
  assert.equal(M.nameFromFile('Brain sagittal view.svg'), 'Brain sagittal view');
  assert.equal(M.nameFromFile('.png'), 'My picture');
  assert.equal(M.tidy(' a,b ,, c;d\ne '), 'a, b, c, d, e');
});
