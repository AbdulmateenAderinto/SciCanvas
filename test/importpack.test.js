// "Add a library from a folder…" (scripts/importpack.js): copies a pack.json + svg/ folder into the app's own icon-library
// folder, skips unsafe or missing files, and only removes libraries that were added this way.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { importPackFolder, removeImportedPack } = require('../scripts/importpack');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'scicanvas-pack-'));
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>';
function makeLibrary(parent, name, pack, files) {
  const dir = path.join(parent, name);
  fs.mkdirSync(path.join(dir, 'svg'), { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(dir, 'svg', f), svg);
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify(pack));
  return dir;
}

test('a library folder is copied in, with only the icons that exist and are safe', () => {
  const src = tmp(), root = tmp();
  const dir = makeLibrary(src, 'Our pictures', {
    id: 'Our Pictures!', name: 'Our pictures',
    icons: [{ file: 'a.svg', name: 'A' }, { file: 'b.svg', name: 'B' }, { file: 'missing.svg', name: 'gone' }, { file: '../evil.svg', name: 'x' }, { file: 'c.png', name: 'png' }],
  }, ['a.svg', 'b.svg', 'c.png']);
  const r = importPackFolder(dir, root);
  assert.deepEqual(r, { id: 'our-pictures', name: 'Our pictures', count: 2, skipped: 3 });
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'our-pictures', 'pack.json'), 'utf8'));
  assert.equal(pack.imported, true);
  assert.deepEqual(pack.icons.map((i) => i.file), ['a.svg', 'b.svg']);
  assert.deepEqual(fs.readdirSync(path.join(root, 'our-pictures', 'svg')).sort(), ['a.svg', 'b.svg']);
  assert.deepEqual(fs.readdirSync(root), ['our-pictures'], 'no leftover temporary folder');
});

test('choosing the folder that contains the library also works, and adding again replaces it', () => {
  const src = tmp(), root = tmp();
  makeLibrary(src, 'lib', { name: 'Lib', icons: [{ file: 'a.svg' }] }, ['a.svg']);
  assert.equal(importPackFolder(src, root).id, 'lib', 'id falls back to the folder name');
  makeLibrary(src, 'lib', { name: 'Lib', icons: [{ file: 'a.svg' }, { file: 'b.svg' }] }, ['a.svg', 'b.svg']);
  assert.equal(importPackFolder(src, root).count, 2);
});

test('helpful errors for folders that are not libraries', () => {
  const root = tmp(), empty = tmp();
  assert.throws(() => importPackFolder(empty, root), /no pack\.json/);
  const bad = makeLibrary(tmp(), 'x', { icons: [{ file: 'nope.svg' }] }, []);
  assert.throws(() => importPackFolder(bad, root), /None of the icons/);
  const mine = makeLibrary(tmp(), 'mine', { id: 'mine', icons: [{ file: 'a.svg' }] }, ['a.svg']);
  assert.throws(() => importPackFolder(mine, root), /different id/);
});

test('only libraries added from a folder can be removed', () => {
  const root = tmp();
  importPackFolder(makeLibrary(tmp(), 'ours', { icons: [{ file: 'a.svg' }] }, ['a.svg']), root);
  makeLibrary(root, 'bioicons', { name: 'Bioicons', icons: [] }, []);
  assert.equal(removeImportedPack(root, 'bioicons'), false);
  assert.ok(fs.existsSync(path.join(root, 'bioicons')));
  assert.equal(removeImportedPack(root, 'ours'), true);
  assert.ok(!fs.existsSync(path.join(root, 'ours')));
  assert.equal(removeImportedPack(root, '../bioicons'), false);
});
