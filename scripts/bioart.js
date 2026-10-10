// NIH BioArt Source (bioart.niaid.nih.gov) → SciCanvas icon pack.
//
// Builds <target>/bioart/pack.json + svg/*.svg from a downloaded copy of the whole BioArt collection: one folder per
// entry (BIOART-000123-Title/…) plus catalog.json and file_index.csv, as in "NIH_BioArt_Complete_Collection".
//
// Every distinct image becomes an icon, so a search shows every version BioArt has (colours, black & white, views):
// - every SVG file;
// - every image that BioArt has only in other formats: AI / EPS artwork is converted to SVG (needs pdftocairo, and
//   Ghostscript for EPS), and pictures that exist only as PNG / JPG are wrapped in an SVG.
// Files that are just another format or preview of an SVG already included (PNG/AI/EPS/JPG copies, "…web.jpg",
// "thumb-…" previews, "(1)" copies, misspelt copies) are not added twice; the match is by file name across the whole
// collection, so a copy filed under the wrong entry isn't shown with the wrong title either.
//
// Licences: BioArt entries are public domain except the Human Reference Atlas ones (CC BY). NIH asks for the
// credit "Illustration from NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/###)", stored with each icon.
//
// CLI: node scripts/bioart.js <collection folder> [target root, default assets/iconpacks]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const safe = (s) => String(s).normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 150);
// Cyrillic letters that look like Latin ones (a file named "NF-кB…" is a copy of "NF-kB…").
const LOOKALIKE = { а: 'a', в: 'b', е: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x' };
const TYPOS = [[/biege/g, 'beige'], [/dentritic/g, 'dendritic']];

// File name → a key shared by every format and preview of the same image.
function imageKey(file) {
  let s = path.basename(file).replace(/\.[^.]+$/, '').normalize('NFKC').toLowerCase().trim();
  s = s.replace(/[авекмнорстух]/g, (c) => LOOKALIKE[c]);
  for (const [re, to] of TYPOS) s = s.replace(re, to);
  s = s.replace(/[\s_]+/g, '-').replace(/^thumb-/, '');
  for (let k = 0; k < 3; k++) s = s.replace(/-?web$/, '').replace(/-?\(\d+\)$/, '').replace(/-0?1$/, '').replace(/-+$/, '');
  return s;
}

// Minimal CSV reader (quoted fields, commas and quotes inside quotes).
function readCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map((h) => h.replace(/^﻿/, ''));
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, k) => [h, r[k]])));
}

// Pixel size of a PNG or JPEG.
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), type: 'jpeg' };
      i += 2 + len;
    }
  }
  return null;
}
const rasterSvg = (buf) => {
  const s = imageSize(buf);
  if (!s || !s.w || !s.h) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.w} ${s.h}" width="${s.w}" height="${s.h}"><image width="${s.w}" height="${s.h}" href="data:image/${s.type};base64,${buf.toString('base64')}"/></svg>`;
};
const has = (cmd) => { try { execFileSync(cmd, ['-v'], { stdio: 'ignore' }); return true; } catch { try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; } } };

// AI files are PDF-compatible; EPS goes through Ghostscript first. Returns SVG text or null.
function vectorToSvg(file, tmp, tools) {
  try {
    let pdf = file;
    if (/\.eps$/i.test(file)) {
      if (!tools.gs) return null;
      pdf = path.join(tmp, 'eps.pdf');
      execFileSync('gs', ['-q', '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dEPSCrop', '-sDEVICE=pdfwrite', `-sOutputFile=${pdf}`, file], { stdio: 'ignore', timeout: 120000 });
    }
    if (!tools.pdftocairo) return null;
    const out = path.join(tmp, 'out.svg');
    execFileSync('pdftocairo', ['-svg', '-f', '1', '-l', '1', pdf, out], { stdio: 'ignore', timeout: 120000 });
    const svg = fs.readFileSync(out, 'utf8');
    return /<svg[\s>]/.test(svg) ? svg : null;
  } catch { return null; }
}

// About 2,000 BioArt SVGs were written with a namespace prefix on every tag (<ns0:svg>, <ns0:path>…, xlink as
// ns1:href). Browsers draw that, but SciCanvas' SVG cleaner expects plain <svg> tags, so write them in the usual form.
// Only names change; the drawing is untouched.
function plainSvg(text) {
  let s = text.replace(/^﻿/, '');
  const esc = (p) => p.replace(/[.-]/g, '\\$&');
  const ns = /\sxmlns:([\w.-]+)\s*=\s*(["'])http:\/\/www\.w3\.org\/2000\/svg\2/.exec(s);
  if (ns && !/<svg[\s>]/.test(s)) {
    s = s.replace(new RegExp(`<(/?)${esc(ns[1])}:`, 'g'), '<$1').replace(ns[0], /\sxmlns\s*=/.test(s) ? '' : ' xmlns="http://www.w3.org/2000/svg"');
  }
  const xl = /\sxmlns:([\w.-]+)\s*=\s*(["'])http:\/\/www\.w3\.org\/1999\/xlink\2/.exec(s);
  if (xl && xl[1] !== 'xlink') {
    s = s.replace(new RegExp(`(\\s)${esc(xl[1])}:(?=[\\w-]+\\s*=)`, 'g'), '$1xlink:').replace(xl[0], /\sxmlns:xlink\s*=/.test(s) ? '' : ' xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  return s;
}

const clean = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
// Words of a file name: "T_Cell0002-BlackandWhite-01" → t, cell, 0002, blackand, white, 01.
const words = (s) => s.normalize('NFKC').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-zA-Z])(\d)/g, '$1 $2').replace(/(\d)([a-zA-Z])/g, '$1 $2')
  .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// Short labels that tell the versions of one entry apart: the words their file names don't share
// ("blue", "black and white", "version 2, grey"…).
function variantLabels(stems) {
  const ws = stems.map((s) => { const w = words(s); while (w.length > 1 && (w[w.length - 1] === 'web' || w[w.length - 1] === '01')) w.pop(); return w; });
  const common = ws[0].filter((w) => ws.every((x) => x.includes(w)));
  const seen = new Map();
  return ws.map((w) => {
    const rest = w.filter((x) => !common.includes(x));
    const nums = rest.filter((x) => /^\d+$/.test(x)).map((x) => String(+x)), other = rest.filter((x) => !/^\d+$/.test(x)).join(' ')
      .replace(/\b(bw|black ?and ?white|blackand white|black white|blackwhite)\b/g, 'black and white').replace(/\bgray\b/g, 'grey');
    let r = [nums.length ? `version ${nums.join('.')}` : '', other].filter(Boolean).join(', ');
    const n = (seen.get(r) || 0) + 1;
    seen.set(r, n);
    if (n > 1) r = r ? `${r} ${n}` : `${n}`;
    return r;
  });
}

function build(src, targetRoot, { log = () => {} } = {}) {
  const catalog = JSON.parse(fs.readFileSync(path.join(src, 'catalog.json'), 'utf8'));
  let index = readCsv(fs.readFileSync(path.join(src, 'file_index.csv'), 'utf8')).filter((r) => r.collection !== 'Website images');
  const f = (e, k) => ((e.fields || {})[k] || [])[0] || '';
  const entries = new Map(catalog.map((e) => [String(f(e, 'id') || e.id).replace(/^A/, ''), e]));
  const dir = path.join(targetRoot, 'bioart'), svgDir = path.join(dir, 'svg');
  fs.mkdirSync(svgDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bioart-'));
  const tools = { pdftocairo: has('pdftocairo'), gs: has('gs') };

  // Group files into images: every format and preview of one picture shares a key.
  // An SVG only counts if it has content (one BioArt SVG is an empty file; its other formats are used instead).
  const size = (r) => { try { return fs.statSync(path.join(src, r.path)).size; } catch { return -1; } };
  const missing = index.filter((r) => size(r) < 0).map((r) => r.path);
  index = index.filter((r) => size(r) >= 0);
  for (const r of index) if (r.format === 'SVG' && size(r) === 0) r.format = 'SVG (empty)';
  const svgKeys = new Set(index.filter((r) => r.format === 'SVG').map((r) => imageKey(r.path)));
  const images = new Map(); // entry → [{ key, stem, files: { format: path } }]
  for (const r of index) {
    const e = String(r.entry_id), list = images.get(e) || images.set(e, []).get(e);
    if (r.format === 'SVG (empty)') continue;
    if (r.format === 'SVG') { list.push({ stem: path.basename(r.path).replace(/\.svg$/i, ''), files: { SVG: r.path } }); continue; }
    const key = imageKey(r.path);
    if (svgKeys.has(key)) continue; // another format / preview of an SVG that is included
    let im = list.find((x) => !x.files.SVG && x.key === key);
    if (!im) list.push(im = { key, stem: path.basename(r.path).replace(/\.[^.]+$/, '').replace(/-?web$/i, ''), files: {} });
    if (!im.files[r.format] || /web/i.test(im.files[r.format])) im.files[r.format] = r.path;
  }

  const icons = [], skipped = [];
  let n = 0;
  const total = [...images.values()].reduce((s, l) => s + l.length, 0);
  for (const [id, list] of images) {
    const e = entries.get(id);
    if (!e) { skipped.push(...list.map((im) => `${Object.values(im.files)[0]} (no catalogue entry)`)); continue; }
    list.sort((a, b) => a.stem.localeCompare(b.stem));
    const labels = list.length > 1 ? variantLabels(list.map((im) => im.stem)) : [''];
    const title = clean(f(e, 'title')), lic = /cc[-\s]?by/i.test(f(e, 'license')) ? 'cc-by' : 'pd';
    const tags = [f(e, 'subtitle'), ...(e.fields.keywords || []), clean(f(e, 'description')), f(e, 'collection'), 'BioArt NIH NIAID'].map(clean).filter(Boolean).join(' ');
    list.forEach((im, k) => {
      n++;
      let svg = null, kind = 'vector';
      if (im.files.SVG) svg = fs.readFileSync(path.join(src, im.files.SVG), 'utf8');
      else {
        // Vector source first, then the picture. A conversion that is huge or built from thousands of nested
        // references (patterns) would be slow to draw, so the picture is used instead when there is one.
        let heavy = null;
        for (const fmt of ['AI', 'EPS']) if (!svg && im.files[fmt]) svg = vectorToSvg(path.join(src, im.files[fmt]), tmp, tools);
        if (svg && (svg.length > 2e6 || (svg.match(/<use[\s>]/g) || []).length > 50) && (im.files.PNG || im.files.JPG)) { heavy = svg; svg = null; }
        for (const fmt of ['PNG', 'JPG']) if (!svg && im.files[fmt]) { svg = rasterSvg(fs.readFileSync(path.join(src, im.files[fmt]))); kind = 'picture'; }
        if (!svg && heavy) { svg = heavy; kind = 'vector'; }
      }
      if (svg) svg = plainSvg(svg);
      if (!svg || !/<svg[\s>]/.test(svg)) { skipped.push(`${Object.values(im.files).join(', ')} (no SVG and couldn't convert: ${tools.pdftocairo ? '' : 'pdftocairo missing; '}${tools.gs ? '' : 'Ghostscript missing'})`); return; }
      const file = safe(`${id.padStart(6, '0')}__${im.stem}`) + '.svg';
      fs.writeFileSync(path.join(svgDir, file), svg);
      icons.push({
        file, kb: Math.round(Buffer.byteLength(svg) / 1024),
        name: labels[k] ? `${title} (${labels[k]})` : title,
        category: 'BioArt · ' + (clean(f(e, 'ontologykey')) || 'Other'),
        license: lic, author: clean(f(e, 'creator')) || clean(f(e, 'collection')) || 'NIAID Visual & Medical Arts',
        tags: `${tags} ${labels[k]}${kind === 'picture' ? ' picture' : ''}`.trim(),
        attribution: `NIAID NIH BioArt Source (bioart.niaid.nih.gov/bioart/${id})`,
        source: `https://bioart.niaid.nih.gov/bioart/${id}`, entry: +id,
      });
      if (n % 200 === 0) log(`${n}/${total}`);
    });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  icons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify({ name: 'NIH BioArt', homepage: 'https://bioart.niaid.nih.gov', icons }));
  return { count: icons.length, entries: new Set(icons.map((i) => i.entry)).size, skipped, missing, dir };
}

module.exports = { build, imageKey, variantLabels, readCsv, imageSize, plainSvg };

if (require.main === module) {
  const [src, target = path.join(__dirname, '..', 'assets', 'iconpacks')] = process.argv.slice(2);
  if (!src) { console.error('Usage: node scripts/bioart.js <BioArt collection folder> [target root]'); process.exit(1); }
  const r = build(src, target, { log: console.log });
  console.log(`BioArt: ${r.count} icons from ${r.entries} entries → ${r.dir}`);
  if (r.missing.length) console.log(`${r.missing.length} files listed in file_index.csv are not in the folder (copies of other formats are fine to miss).`);
  if (r.skipped.length) { console.log(`Not included (${r.skipped.length}):`); for (const s of r.skipped) console.log('  ' + s); process.exitCode = 2; }
}
