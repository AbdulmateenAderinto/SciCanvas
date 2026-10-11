// Adds an icon library from a folder (pack.json + svg/) to SciCanvas' own icon-library folder, and removes it again.
// Used by "Icon libraries › Add a library from a folder…" (main.js). Only the listed .svg files are copied.
const fs = require('fs');
const path = require('path');

const packSlug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const PACK_FILE_OK = (f) => typeof f === 'string' && /\.svg$/i.test(f) && !/[\\/]/.test(f) && !f.includes('..');
function findPackFolder(dir) {
  if (fs.existsSync(path.join(dir, 'pack.json'))) return dir;
  const subs = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'pack.json')));
  return subs.length === 1 ? path.join(dir, subs[0].name) : null;
}
function importPackFolder(dir, root) {
  const src = findPackFolder(dir);
  if (!src) throw new Error('That folder has no pack.json. Choose the library folder itself (the one with pack.json and an svg folder inside).');
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(src, 'pack.json'), 'utf8')); } catch { throw new Error('pack.json in that folder could not be read.'); }
  if (!pack || !Array.isArray(pack.icons)) throw new Error('pack.json does not list any icons.');
  const icons = pack.icons.filter((ic) => ic && PACK_FILE_OK(ic.file) && fs.existsSync(path.join(src, 'svg', ic.file)));
  if (!icons.length) throw new Error('None of the icons listed in pack.json were found in its svg folder.');
  const id = packSlug(pack.id) || packSlug(path.basename(src)) || 'my-library';
  if (id === 'mine' || id === 'upload') throw new Error('Please give the library a different id in pack.json.');
  const dest = path.join(root, id), tmp = path.join(root, `.${id}-importing`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(path.join(tmp, 'svg'), { recursive: true });
  for (const ic of icons) fs.copyFileSync(path.join(src, 'svg', ic.file), path.join(tmp, 'svg', ic.file));
  fs.writeFileSync(path.join(tmp, 'pack.json'), JSON.stringify({ ...pack, id, imported: true, icons }));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(tmp, dest);
  return { id, name: pack.name || id, count: icons.length, skipped: pack.icons.length - icons.length };
}
function removeImportedPack(root, id) {
  const dir = path.join(root, packSlug(id));
  let pack = null;
  try { pack = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8')); } catch { return false; }
  if (!pack || !pack.imported) return false; // libraries that came with the app or were downloaded stay
  fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

module.exports = { importPackFolder, removeImportedPack, findPackFolder, packSlug };
