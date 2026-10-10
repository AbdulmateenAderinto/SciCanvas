// NIH BioArt library (scripts/bioart.js): every distinct image in a downloaded collection becomes one icon, copies and
// previews of an included SVG are not added twice, versions are told apart by name, and File › Credits cites BioArt.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const B = require('../scripts/bioart');
const A = require('./load-app');

const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const svg = (c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${c}"/></svg>`;

function makeCollection() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bioart-test-'));
  const entry = (id, title, extra = {}) => ({ id: `A${id}`, fields: { id: [String(id)], title: [title], license: ['Public Domain'], creator: ['Ryan Kissinger'], ontologykey: ['Cells and Organelles'], keywords: ['immune', 'lymphocyte'], description: ['<p>A cell</p>'], collection: ['NIAID Visual & Medical Arts'], ...extra } });
  const catalog = [entry(1, 'T Cell'), entry(2, 'Nephron', { license: ['CC-BY'], collection: ['Human Reference Atlas'], creator: [''], ontologykey: ['Nephrons'] }), entry(3, 'Filovirus', { ontologykey: ['Viruses'] }), entry(4, 'NF-k B')];
  const files = {
    'BIOART-000001-T-Cell/T_Cell0001.svg': svg('#336699'),
    'BIOART-000001-T-Cell/T_Cell0001-blue.svg': svg('#0000ff'),
    'BIOART-000001-T-Cell/T_Cell0001-BlackandWhite.svg': svg('#000000'),
    'BIOART-000001-T-Cell/T_Cell0002.svg': svg('#993366'),
    'BIOART-000001-T-Cell/T_Cell0001.png': PNG_1PX, // another format of an SVG
    'BIOART-000001-T-Cell/T_Cell0001-blue-01web.jpg': 'jpg', // web preview
    'BIOART-000002-Nephron/2d-ftu-kidney-nephron.svg': svg('#cc6655'),
    'BIOART-000002-Nephron/thumb-2d-ftu-kidney-nephron-01.jpg': 'jpg', // thumbnail
    'BIOART-000002-Nephron/2d-ftu-kidney-nephron-(1).ai': 'ai', // source copy
    'BIOART-000002-Nephron/T_Cell0002-web.jpg': 'jpg', // a copy of entry 1's SVG filed under the wrong entry
    'BIOART-000003-Filovirus/Filovirus0001.png': PNG_1PX, // picture only
    'BIOART-000003-Filovirus/Filovirus0001-web.jpg': 'jpg',
    'BIOART-000004-NF-k-B/NF-kB0001.svg': svg('#558844'),
    'BIOART-000004-NF-k-B/NF-кB0001.jpg': 'jpg', // Cyrillic к: a copy of the SVG
  };
  const rows = ['path,entry_id,title,source_url,license,creator,format,size,crc,original_name,collection'];
  for (const [p, body] of Object.entries(files)) {
    fs.mkdirSync(path.join(dir, path.dirname(p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), body);
    const id = +p.slice(7, 13), fmt = path.extname(p).slice(1).toUpperCase();
    rows.push([p, id, 'x', `https://bioart.niaid.nih.gov/bioart/${id}`, 'Public Domain', 'x', fmt, 1, '0', path.basename(p), 'BioArt catalog'].join(','));
  }
  rows.push('Website_images/logo.svg,,NIH logo,https://bioart.niaid.nih.gov/,,,SVG,1,0,logo.svg,Website images');
  fs.writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify(catalog));
  fs.writeFileSync(path.join(dir, 'file_index.csv'), '﻿' + rows.join('\n') + '\n');
  return dir;
}

test('copies and previews share one image key', () => {
  const k = B.imageKey('T_Cell0001-blue.svg');
  for (const f of ['T_Cell0001-blue-01web.jpg', 'T_Cell0001-Blue.png', 't_cell0001-blue (1).ai', 'thumb-T_Cell0001-blue-01.jpg', 'T_Cell0001-bluewebweb.jpg']) assert.equal(B.imageKey(f), k, f);
  assert.equal(B.imageKey('NF-кB0001.jpg'), B.imageKey('NF-kB0001.svg'));
  assert.equal(B.imageKey('UnisexIcon0001-Biege-01web.jpg'), B.imageKey('UnisexIcon0001-Beige.svg'));
  assert.equal(B.imageKey('DentriticCell0004web.jpg'), B.imageKey('DendriticCell0004.svg'));
  assert.notEqual(B.imageKey('T_Cell0002.svg'), B.imageKey('T_Cell0001.svg'));
});

test('versions of one entry get distinct, readable labels', () => {
  assert.deepEqual(B.variantLabels(['T_Cell0001', 'T_Cell0001-blue', 'T_Cell0001-BlackandWhite', 'T_Cell0002']), ['version 1', 'version 1, blue', 'version 1, black and white', 'version 2']);
  assert.deepEqual(B.variantLabels(['Mast0001', 'Mast0001-BW', 'Mast0001-grey']), ['', 'black and white', 'grey']);
});

test('every distinct image in the collection becomes one icon', () => {
  const src = makeCollection(), out = fs.mkdtempSync(path.join(os.tmpdir(), 'bioart-out-'));
  const r = B.build(src, out);
  const pack = JSON.parse(fs.readFileSync(path.join(out, 'bioart', 'pack.json'), 'utf8'));
  const names = pack.icons.map((i) => i.name).sort();
  // 4 T cell SVGs, the nephron, the filovirus picture and NF-kB; the copies and previews are not added again.
  assert.deepEqual(names, ['Filovirus', 'NF-k B', 'Nephron', 'T Cell (version 1)', 'T Cell (version 1, black and white)', 'T Cell (version 1, blue)', 'T Cell (version 2)']);
  assert.equal(r.count, 7);
  assert.equal(r.entries, 4);
  assert.deepEqual(r.skipped, []);
  for (const ic of pack.icons) {
    const body = fs.readFileSync(path.join(out, 'bioart', 'svg', ic.file), 'utf8');
    assert.match(body, /^<svg[\s>]/, ic.name);
    assert.match(ic.attribution, /^NIAID NIH BioArt Source \(bioart\.niaid\.nih\.gov\/bioart\/\d+\)$/);
    assert.match(ic.category, /^BioArt · /);
    assert.ok(ic.tags.includes('BioArt'));
  }
  const filo = pack.icons.find((i) => i.name === 'Filovirus');
  assert.match(fs.readFileSync(path.join(out, 'bioart', 'svg', filo.file), 'utf8'), /<image width="1" height="1" href="data:image\/png;base64,/);
  assert.equal(pack.icons.find((i) => i.name === 'Nephron').license, 'cc-by');
  assert.equal(pack.icons.find((i) => i.name === 'T Cell (version 2)').license, 'pd');
  assert.ok(!pack.icons.some((i) => /logo/i.test(i.name)), 'website decoration is not a catalogue image');
});

test('File › Credits cites NIH BioArt for every BioArt image', () => {
  const asset = (n, lic) => ({ name: 'T Cell', pack: 'bioart', license: lic, author: 'Ryan Kissinger', attribution: `NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/${n})` });
  const doc = { pages: [{ objects: [{ type: 'icon', iconId: 'pack:bioart/a.svg' }, { type: 'icon', iconId: 'pack:bioart/b.svg' }] }], assets: { 'pack:bioart/a.svg': asset(972, 'pd'), 'pack:bioart/b.svg': asset(560, 'cc-by') } };
  const text = A.globals.creditsText(doc);
  assert.match(text, /Illustrations from NIAID NIH BioArt Source \(bioart\.niaid\.nih\.gov\/bioart\/972, bioart\.niaid\.nih\.gov\/bioart\/560\)\./);
  assert.match(text, /CC BY/);
});
