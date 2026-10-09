// Icon packs (e.g. Bioicons), SVG sanitising/normalising, colour layers and tinting.
// Pack icons used in a figure are embedded in doc.assets so .scifig files stay self-contained.

const Packs = { list: [], loaded: false, all: [] };

const LICENSE_NAMES = {
  'cc-0': 'CC0 (public domain)', pd: 'Public domain', 'cc-by-3.0': 'CC BY 3.0', 'cc-by-4.0': 'CC BY 4.0',
  'cc-by-sa-3.0': 'CC BY-SA 3.0', 'cc-by-sa-4.0': 'CC BY-SA 4.0', mit: 'MIT', bsd: 'BSD', own: 'Your own',
  'cc-by-nc-3.0': 'CC BY-NC 3.0 (non-commercial)', 'cc-by-nc-4.0': 'CC BY-NC 4.0 (non-commercial)',
  'cc-by-nc-sa-3.0': 'CC BY-NC-SA 3.0 (non-commercial)', 'cc-by-nc-sa-4.0': 'CC BY-NC-SA 4.0 (non-commercial)',
};
const needsAttribution = (lic) => !!lic && !['cc-0', 'pd', 'own', 'mit', 'built-in'].includes(lic);
const isNonCommercial = (lic) => /-nc/.test(lic || '');
const PACK_LABEL = { bioicons: 'Bioicons (bioicons.com)', reactome: 'Reactome icon library (reactome.org)', healthicons: 'Health Icons (healthicons.org)', phylopic: 'PhyloPic (phylopic.org)', mine: 'Your own icons' };

// Everyday names → terms used in the libraries (PhyloPic uses scientific names).
const SYNONYMS = {
  mouse: 'mus musculus', mice: 'mus musculus', rat: 'rattus', zebrafish: 'danio rerio', 'fruit fly': 'drosophila', fly: 'drosophila',
  worm: 'caenorhabditis', nematode: 'caenorhabditis', 'c elegans': 'caenorhabditis elegans', yeast: 'saccharomyces', frog: 'xenopus',
  chicken: 'gallus', human: 'homo sapiens', person: 'homo sapiens', monkey: 'macaca', macaque: 'macaca', pig: 'sus scrofa',
  dog: 'canis', cat: 'felis', cow: 'bos taurus', cattle: 'bos', sheep: 'ovis', horse: 'equus', rabbit: 'oryctolagus', 'guinea pig': 'cavia',
  hamster: 'mesocricetus', ferret: 'mustela', 'e coli': 'escherichia', bacterium: 'bacteria', mosquito: 'culicidae', tick: 'ixodida',
  arabidopsis: 'arabidopsis thaliana', thale: 'arabidopsis', maize: 'zea mays', corn: 'zea mays', rice: 'oryza', wheat: 'triticum',
  tobacco: 'nicotiana', bat: 'chiroptera', bird: 'aves', fish: 'actinopterygii', snake: 'serpentes', shark: 'selachimorpha', whale: 'cetacea',
  bee: 'apis', ant: 'formicidae', butterfly: 'lepidoptera', beetle: 'coleoptera', spider: 'araneae', octopus: 'octopoda', squid: 'teuthida',
};

async function loadPacks() {
  try { Packs.list = (await window.native.listPacks()) || []; } catch { Packs.list = []; }
  Packs.all = [];
  for (const p of Packs.list) {
    for (const ic of p.icons) {
      Packs.all.push({ ...ic, pack: p.id, key: `pack:${p.id}/${ic.file}`, url: `${p.base}/${encodeURIComponent(ic.file)}`, hay: `${ic.name} ${ic.category} ${ic.author} ${ic.tags || ''}`.toLowerCase() });
    }
  }
  Packs.byKey = new Map(Packs.all.map((i) => [i.key, i]));
  Packs.loaded = true;
}

// ---------- Colour helpers ----------
const NAMED = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', gray: '#808080', grey: '#808080', orange: '#ffa500', purple: '#800080', none: 'none' };
function normalizeColors(markup) {
  return markup
    .replace(/#([0-9a-f]{3})(?![0-9a-f])/gi, (_, h) => '#' + h.split('').map((x) => x + x).join('').toLowerCase())
    .replace(/#([0-9a-f]{6})(?![0-9a-f])/gi, (m) => m.toLowerCase())
    .replace(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (_, r, g, b) => Color.rgbToHex(+r, +g, +b))
    .replace(/((?:fill|stroke|stop-color)\s*[:=]\s*["']?)(black|white|red|green|blue|yellow|gr[ae]y|orange|purple)\b/gi, (_, pre, n) => pre + NAMED[n.toLowerCase()]);
}
function colorsIn(markup) {
  const counts = {};
  for (const m of markup.matchAll(/#[0-9a-f]{6}(?![0-9a-f])/g)) counts[m[0]] = (counts[m[0]] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}
function applyColorMap(markup, map) {
  if (!map || !Object.keys(map).length) return markup;
  return markup.replace(/#[0-9a-f]{6}(?![0-9a-f])/g, (c) => map[c] || c);
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToHex(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return Color.rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}
// Colour overlay: keep each colour's lightness, take hue/saturation from the tint.
function tintColor(c, tint) {
  const [, , l] = rgbToHsl(Color.hexToRgb(c));
  if (l > 0.96 || l < 0.04) return c;
  const [th, ts, tl] = rgbToHsl(Color.hexToRgb(tint));
  const nl = Math.max(0.05, Math.min(0.95, l + (tl - 0.5) * 0.5));
  return hslToHex(th, ts, nl);
}
function applyTint(markup, tint) {
  return markup.replace(/#[0-9a-f]{6}(?![0-9a-f])/g, (c) => tintColor(c, tint));
}

// ---------- SVG sanitising / normalising ----------
let _svgSeq = 0;
function normalizeSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('Not a valid SVG');
  // Remove anything active or external.
  root.querySelectorAll('script, foreignObject, iframe, metadata, title, desc').forEach((n) => n.remove());
  // Drop editor-specific (Inkscape / Sodipodi / Illustrator) elements and attributes.
  [...root.querySelectorAll('*')].filter((n) => n.nodeName.includes(':')).forEach((n) => n.remove());
  for (const el of [root, ...root.querySelectorAll('*')]) {
    for (const a of [...el.attributes]) {
      if (/^on/i.test(a.name)) el.removeAttribute(a.name);
      else if (/^(inkscape|sodipodi|sketch|i|x|graph|serif):/i.test(a.name) || /^xmlns:(inkscape|sodipodi|sketch|i|x|graph|serif)$/i.test(a.name)) el.removeAttribute(a.name);
      if (/href$/i.test(a.name) && !/^(#|data:image\/(png|jpe?g|gif|webp);)/i.test(a.value)) el.removeAttribute(a.name);
    }
  }
  // Inline simple class rules so styles from different icons can't collide.
  const rules = [];
  root.querySelectorAll('style').forEach((st) => {
    const css = st.textContent.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      for (const sel of m[1].split(',').map((x) => x.trim())) {
        if (/^\.[\w-]+$/.test(sel)) rules.push([sel.slice(1), m[2].trim()]);
        else if (/^[a-z]+$/i.test(sel)) rules.push(['tag:' + sel, m[2].trim()]);
      }
    }
    st.remove();
  });
  if (rules.length) {
    for (const el of root.querySelectorAll('*')) {
      const decls = [];
      for (const [k, d] of rules) {
        if (k.startsWith('tag:') ? el.nodeName.toLowerCase() === k.slice(4).toLowerCase() : el.classList && el.classList.contains(k)) decls.push(d);
      }
      if (decls.length) el.setAttribute('style', decls.join(';') + ';' + (el.getAttribute('style') || ''));
    }
  }
  // Unique ids.
  const prefix = `ic${Date.now().toString(36)}${(_svgSeq++).toString(36)}_`;
  const ids = [...root.querySelectorAll('[id]')].map((el) => el.id);
  // View box.
  let vb = root.getAttribute('viewBox');
  if (!vb) {
    const w = parseFloat(root.getAttribute('width')) || 100, h = parseFloat(root.getAttribute('height')) || 100;
    vb = `0 0 ${w} ${h}`;
  }
  const [, , vw, vh] = vb.split(/[\s,]+/).map(Number);
  // Root-level paint attributes would be lost when we unwrap <svg>, so carry them on a <g>.
  const carry = ['fill', 'stroke', 'stroke-width', 'style', 'opacity', 'fill-rule', 'stroke-linecap', 'stroke-linejoin', 'transform']
    .filter((a) => root.hasAttribute(a)).map((a) => `${a}="${root.getAttribute(a).replace(/"/g, '&quot;')}"`).join(' ');
  let inner = new XMLSerializer().serializeToString(root).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  inner = inner.replace(/\sxmlns(:\w+)?="[^"]*"/g, '');
  for (const id of ids) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    inner = inner.replace(new RegExp(`id="${esc}"`, 'g'), `id="${prefix}${id}"`)
      .replace(new RegExp(`url\\(\\s*['"]?#${esc}['"]?\\s*\\)`, 'g'), `url(#${prefix}${id})`)
      .replace(new RegExp(`href="#${esc}"`, 'g'), `href="#${prefix}${id}"`);
  }
  if (carry) inner = `<g ${carry}>${inner}</g>`;
  return { svg: normalizeColors(inner), vb, vw: vw || 100, vh: vh || 100 };
}

function getAsset(key) {
  return (typeof state !== 'undefined' && state.doc.assets && state.doc.assets[key]) || null;
}

async function ensurePackAsset(entry) {
  if (!state.doc.assets) state.doc.assets = {};
  if (state.doc.assets[entry.key]) return state.doc.assets[entry.key];
  const text = await window.native.readPackIcon(entry.pack, entry.file);
  const n = normalizeSvg(text);
  state.doc.assets[entry.key] = { ...n, name: entry.name, category: entry.category, author: entry.author, license: entry.license, pack: entry.pack, attribution: entry.attribution || '' };
  return state.doc.assets[entry.key];
}

// Imported user SVGs become assets too, so they are recolourable like library icons.
function addSvgAsset(name, text) {
  const n = normalizeSvg(text);
  const key = `upload:${uid()}`;
  if (!state.doc.assets) state.doc.assets = {};
  state.doc.assets[key] = { ...n, name, license: 'own', author: 'You', pack: 'upload' };
  return key;
}

// The markup + view box an icon object renders with (native or asset), after colour edits.
function iconMarkup(o) {
  let markup, vb;
  if (ICON_MAP[o.iconId]) {
    const v = iconViewBox(o.iconId);
    markup = normalizeColors(iconSvgInner(o.iconId, o.color));
    vb = `0 0 ${v.w} ${v.h}`;
  } else {
    const a = getAsset(o.iconId);
    if (!a) return { markup: '<rect width="100" height="100" fill="#f3f3f3" stroke="#d64545" stroke-dasharray="6 4"/><text x="50" y="56" font-size="12" text-anchor="middle" fill="#d64545">missing</text>', vb: '0 0 100 100' };
    markup = a.svg; vb = a.vb;
    if (o.tint) markup = applyTint(markup, o.tint);
  }
  if (o.colorMap) markup = applyColorMap(markup, o.colorMap);
  if (o.layerStyle && Object.keys(o.layerStyle).length) markup = layerStyleCss(o) + markup;
  return { markup, vb };
}
// Per-layer border colour / width / dash, applied with CSS scoped to this icon. A layer is every element whose
// fill or stroke uses that (possibly recoloured) colour.
function layerStyleCss(o) {
  const scope = `.ls-${o.id}`;
  let css = '';
  for (const [hex, st] of Object.entries(o.layerStyle)) {
    const c = (o.colorMap && o.colorMap[hex]) || hex;
    if (c === 'none') continue;
    const sel = [`[fill="${c}"]`, `[style*="fill:${c}"]`, `[stroke="${c}"]`, `[style*="stroke:${c}"]`].map((x) => `${scope} ${x}`).join(',');
    const decl = [st.stroke ? `stroke:${st.stroke} !important` : '', st.width != null && st.width !== '' ? `stroke-width:${st.width}px !important` : '', st.dash && st.dash !== 'solid' ? `stroke-dasharray:${st.dash === 'dotted' ? '0.5 3' : '6 4'} !important;stroke-linecap:round !important` : ''].filter(Boolean).join(';');
    if (decl) css += `${sel}{${decl}}`;
  }
  return css ? `<style>${css}</style>` : '';
}
// Colours before any per-layer edits (what the layer panel lists).
function iconBaseColors(o) {
  if (ICON_MAP[o.iconId]) return colorsIn(normalizeColors(iconSvgInner(o.iconId, o.color)));
  const a = getAsset(o.iconId);
  if (!a) return [];
  return colorsIn(o.tint ? applyTint(a.svg, o.tint) : a.svg);
}
function iconAspect(iconId) {
  if (ICON_MAP[iconId]) { const v = iconViewBox(iconId); return v.w / v.h; }
  const a = getAsset(iconId);
  return a ? a.vw / a.vh : 1;
}

// ---------- Search across native + packs ----------
const FIELD_CATS = {
  Immunology: ['Blood Immunology', 'Cells', 'Molecules', 'Cell types'],
  Neuroscience: ['Neuroscience', 'Human physiology', 'Cell types'],
  Microbiology: ['Microbes', 'Microbiology', 'Viruses', 'Parasites'],
  Oncology: ['Oncology', 'Cells', 'Cell culture', 'Tissues'],
  'Molecular biology': ['Molecules', 'Nucleic acids', 'Genetics', 'Lab apparatus', 'Lab'],
  'Plant biology': ['Plants Algae', 'Organisms'],
  Chemistry: ['Chemistry', 'Amino-Acids', 'Molecular modelling'],
  'Animal models': ['Animals', 'Organisms', 'Procedures'],
};
// The built-in icons' search entries, built once (rebuilt only if icons are added later).
let nativeSearchCache = null;
function nativeSearchList() {
  if (!nativeSearchCache || nativeSearchCache.n !== ICONS.length) nativeSearchCache = { n: ICONS.length, list: ICONS.map((i) => ({ native: true, id: i.id, key: i.id, name: i.name, category: i.cat, hay: `${i.name} ${i.tags} ${i.cat}`.toLowerCase(), license: 'built-in' })) };
  return nativeSearchCache.list;
}
// Library thumbnail for a built-in icon, drawn once and reused.
const nativeThumbCache = new Map();
function nativeThumb(id) {
  let t = nativeThumbCache.get(id);
  if (!t) { const ic = ICON_MAP[id], vb = iconViewBox(id); t = `<svg viewBox="-4 -4 ${vb.w + 8} ${vb.h + 8}">${ic.draw(ic.color)}</svg>`; nativeThumbCache.set(id, t); }
  return t;
}
function searchIcons(query, { cat = 'All', limit = 240, field } = {}) {
  let q = query.toLowerCase().trim();
  const syn = SYNONYMS[q] || SYNONYMS[q.replace(/s$/, '')];
  const words = q.split(/\s+/).filter(Boolean);
  const synWords = syn ? syn.split(/\s+/) : null;
  const boost = new Set(FIELD_CATS[field] || []);
  const native = nativeSearchList();
  let all = [...native, ...Packs.all];
  if (cat === 'Suggested' && typeof suggestedIcons === 'function') { const sug = suggestedIcons(limit); return { total: sug.length, items: sug }; }
  if (cat === '★ Favorites') { const fav = getFavs(); all = all.filter((i) => fav.includes(i.key)); }
  else if (cat === 'Recent') { const rec = getRecentIcons(); all = rec.map((k) => all.find((i) => i.key === k)).filter(Boolean); }
  else if (cat === 'Soft style') all = all.filter((i) => i.category && i.category.startsWith('Soft'));
  else if (cat === 'Refined') all = all.filter((i) => i.category && i.category.startsWith('Refined'));
  else if (cat !== 'All') all = all.filter((i) => i.category === cat);
  const scored = [];
  for (const it of all) {
    if (!words.length) { scored.push([boost.has(it.category) ? 2 : it.native ? 1 : 0, it]); continue; }
    const name = it.name.toLowerCase();
    const score = (ws) => {
      let s = 0;
      for (const w of ws) {
        if (name === w) s += 6; else if (name.startsWith(w)) s += 4; else if (name.includes(w)) s += 3; else if (it.hay.includes(w)) s += 1; else return -1;
      }
      return s;
    };
    let s = score(words);
    if (s < 0 && synWords) { s = score(synWords); if (s >= 0) s = Math.min(s, 3.5) - 0.5; }
    if (s >= 0) scored.push([s + (it.native ? 0.5 : 0) + (it.category && it.category.startsWith('Refined') ? 0.4 : 0) + (boost.has(it.category) ? 1 : 0) - (it.kb > 1024 ? 1 : 0) - (isNonCommercial(it.license) ? 0.3 : 0) - (it.pack === 'phylopic' ? 0.2 : 0), it]);
  }
  if (cat !== 'Recent') scored.sort((a, b) => b[0] - a[0]);
  return { total: scored.length, items: scored.slice(0, limit).map((x) => x[1]) };
}
function bestIconFor(query) {
  const r = searchIcons(query, { limit: 1 });
  return r.items[0] || null;
}
function allCategories() {
  const cats = new Set(ICONS.map((i) => i.cat));
  for (const p of Packs.all) cats.add(p.category);
  return [...cats].sort((a, b) => (a === 'My icons' ? -1 : b === 'My icons' ? 1 : a.localeCompare(b)));
}

// ---------- Favourites / recent (per machine) ----------
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const getFavs = () => lsGet('scicanvas:favs', []);
function toggleFav(key) { const f = getFavs(); lsSet('scicanvas:favs', f.includes(key) ? f.filter((x) => x !== key) : [...f, key]); }
const getRecentIcons = () => lsGet('scicanvas:recentIcons', []);
function pushRecentIcon(key) { lsSet('scicanvas:recentIcons', [key, ...getRecentIcons().filter((x) => x !== key)].slice(0, 60)); }

// ---------- Attribution ----------
function collectCredits(doc) {
  const used = new Set();
  const walk = (o) => { if (o.type === 'icon') used.add(o.iconId); if (o.children) o.children.forEach(walk); };
  doc.pages.forEach((p) => p.objects.forEach(walk));
  const icons = [];
  for (const k of used) { const a = doc.assets && doc.assets[k]; if (a && a.pack !== 'upload') icons.push(a); }
  const sources = new Set();
  const walk2 = (o) => { if (o.type === 'image' && o.source) sources.add(o.source); if (o.children) o.children.forEach(walk2); };
  doc.pages.forEach((p) => p.objects.forEach(walk2));
  return { icons, sources: [...sources] };
}
function creditsText(doc) {
  const { icons, sources } = collectCredits(doc);
  const lines = [];
  const byPack = {};
  for (const a of icons) (byPack[a.pack] ||= []).push(a);
  for (const [pack, list] of Object.entries(byPack)) {
    if (pack === 'mine') continue;
    const attrib = list.filter((a) => needsAttribution(a.license));
    const free = list.length - attrib.length;
    const label = PACK_LABEL[pack] || pack;
    if (attrib.length) {
      const byAuthor = {};
      for (const a of attrib) (byAuthor[`${a.attribution || a.author} (${LICENSE_NAMES[a.license] || a.license})`] ||= new Set()).add(a.name);
      lines.push(`Icons from ${label}: ` + Object.entries(byAuthor).map(([who, names]) => `${[...names].join(', ')} by ${who}`).join('; ') + '.');
    }
    if (free) lines.push(`${free} public-domain / permissively licensed icon${free > 1 ? 's' : ''} from ${label}.`);
  }
  const pdb = sources.filter((s) => s.startsWith('PDB ')).map((s) => s.slice(4));
  if (pdb.length) lines.push(`Protein structures from the RCSB Protein Data Bank: ${[...new Set(pdb)].join(', ')}; rendered with 3Dmol.js.`);
  if (sources.some((s) => s.startsWith('PubChem'))) lines.push('Chemical structure depictions from PubChem (NCBI).');
  lines.push('Figure created with SciCanvas.');
  return lines.join(' ');
}
