// Icon-pack installers for openly licensed scientific icon libraries.
// Each writes <target>/<id>/svg/*.svg and <target>/<id>/pack.json, keeping per-icon licence + author
// so SciCanvas can generate attribution text.
//
// CLI: node scripts/packs.js <bioicons|reactome|healthicons|phylopic|all> [targetRoot]
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const UA = { 'User-Agent': 'SciCanvas/0.3 (scientific figure editor; icon pack installer)' };
const safe = (s) => String(s).replace(/[^\w.-]+/g, '_').slice(0, 150);
const getJson = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
const getText = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };

// Download many files with limited concurrency and one retry; skips files already on disk.
async function pool(items, worker, { concurrency = 8, onProgress = () => {} } = {}) {
  let i = 0, done = 0, failed = 0;
  const out = new Array(items.length);
  async function run() {
    while (i < items.length) {
      const k = i++;
      for (let attempt = 0; attempt < 2; attempt++) {
        try { out[k] = await worker(items[k]); break; } catch { if (attempt === 1) failed++; else await new Promise((r) => setTimeout(r, 800)); }
      }
      onProgress(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, run));
  return { results: out.filter(Boolean), failed };
}
async function saveSvg(dir, file, url) {
  const dest = path.join(dir, 'svg', file);
  if (!fs.existsSync(dest)) fs.writeFileSync(dest, await getText(url));
  return Math.round(fs.statSync(dest).size / 1024);
}
function writePack(dir, meta, icons) {
  icons.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify({ ...meta, icons }));
  return { count: icons.length };
}

const LIC = {
  'https://creativecommons.org/publicdomain/zero/1.0/': 'cc-0',
  'https://creativecommons.org/publicdomain/mark/1.0/': 'pd',
  'https://creativecommons.org/licenses/by/3.0/': 'cc-by-3.0',
  'https://creativecommons.org/licenses/by/4.0/': 'cc-by-4.0',
  'https://creativecommons.org/licenses/by-sa/3.0/': 'cc-by-sa-3.0',
  'https://creativecommons.org/licenses/by-sa/4.0/': 'cc-by-sa-4.0',
  'https://creativecommons.org/licenses/by-nc/3.0/': 'cc-by-nc-3.0',
  'https://creativecommons.org/licenses/by-nc/4.0/': 'cc-by-nc-4.0',
  'https://creativecommons.org/licenses/by-nc-sa/3.0/': 'cc-by-nc-sa-3.0',
  'https://creativecommons.org/licenses/by-nc-sa/4.0/': 'cc-by-nc-sa-4.0',
};

const SOURCES = {
  bioicons: {
    name: 'Bioicons', homepage: 'https://bioicons.com', approx: 2800, sizeMB: 400,
    desc: 'General life-science icons (cells, lab apparatus, anatomy, animals…). CC0 / CC BY / CC BY-SA.',
    async install(dir, onProgress) {
      const BASE = 'https://raw.githubusercontent.com/duerrsimon/bioicons/main/static/icons';
      const index = await getJson(`${BASE}/icons.json`);
      const { results, failed } = await pool(index, async (it) => {
        const rel = [it.license, it.category, it.author, it.name + '.svg'].map((x) => x.replace(/ /g, '_')).join('/');
        const file = safe(`${it.license}__${it.category}__${it.author}__${it.name}.svg`);
        const kb = await saveSvg(dir, file, `${BASE}/${rel.split('/').map(encodeURIComponent).join('/')}`);
        return { file, kb, name: it.name.replace(/[_-]+/g, ' ').trim(), category: it.category.replace(/_/g, ' '), license: it.license, author: it.author.replace(/_/g, ' ') };
      }, { concurrency: 12, onProgress });
      return { ...writePack(dir, { name: 'Bioicons', homepage: 'https://bioicons.com' }, results), failed };
    },
  },

  reactome: {
    name: 'Reactome icon library', homepage: 'https://reactome.org/icon-lib', approx: 2570, sizeMB: 25,
    desc: 'Proteins, receptors, transporters, compounds, cell elements, cell types and tissues, drawn for pathway diagrams. CC BY 4.0.',
    async install(dir, onProgress) {
      const meta = await getJson('https://reactome.org/ContentService/search/query?query=%2A&types=Icon&cluster=false&rows=5000');
      const entries = meta.results.flatMap((r) => r.entries);
      onProgress(0, entries.length);
      const tgz = Buffer.from(await (await fetch('https://reactome.org/icon/icon-lib-svg.tgz', { headers: UA })).arrayBuffer());
      const files = untar(zlib.gunzipSync(tgz));
      const icons = [];
      entries.forEach((e, k) => {
        const svg = files.get(`${e.stId}.svg`);
        if (!svg) return;
        const file = `${e.stId}.svg`;
        fs.writeFileSync(path.join(dir, 'svg', file), svg);
        const clean = (s) => String(s || '').replace(/<[^>]+>/g, '');
        icons.push({
          file, kb: Math.round(svg.length / 1024), name: clean(e.iconName || e.name), license: 'cc-by-4.0',
          category: 'Reactome · ' + (e.iconCategories || ['other']).map((c) => c.replace(/_/g, ' ')).join(', '),
          author: e.iconDesignerName ? `${e.iconDesignerName} / Reactome` : 'Reactome',
          tags: clean(e.summation).slice(0, 200),
        });
        if (k % 100 === 0) onProgress(k, entries.length);
      });
      onProgress(entries.length, entries.length);
      return writePack(dir, { name: 'Reactome', homepage: 'https://reactome.org/icon-lib' }, icons);
    },
  },

  healthicons: {
    name: 'Health Icons', homepage: 'https://healthicons.org', approx: 1500, sizeMB: 6,
    desc: 'Clean filled + outline icons for body, devices, diagnostics, medications, people, conditions and more. MIT.',
    async install(dir, onProgress) {
      const BASE = 'https://raw.githubusercontent.com/resolvetosavelives/healthicons/main/public/icons';
      const meta = await getJson(`${BASE}/meta-data.json`);
      const jobs = meta.flatMap((m) => ['filled', 'outline'].map((style) => ({ m, style })));
      const { results, failed } = await pool(jobs, async ({ m, style }) => {
        const file = safe(`${style}__${m.path.replace(/\//g, '__')}.svg`);
        const kb = await saveSvg(dir, file, `${BASE}/svg/${style}/${m.path}.svg`);
        return { file, kb, name: `${m.title}${style === 'outline' ? ' (outline)' : ''}`, category: 'Health · ' + m.category, license: 'mit', author: 'Health Icons (Resolve to Save Lives)', tags: (m.tags || []).filter((t) => !t.includes(':')).join(' ') };
      }, { concurrency: 10, onProgress });
      return { ...writePack(dir, { name: 'Health Icons', homepage: 'https://healthicons.org' }, results), failed };
    },
  },

  phylopic: {
    name: 'PhyloPic', homepage: 'https://www.phylopic.org', approx: 13000, sizeMB: 300,
    desc: 'Silhouettes of ~13,000 organisms across the tree of life — animals, plants, microbes. Mostly CC0 / CC BY; some are non-commercial only (flagged).',
    async install(dir, onProgress) {
      const root = await getJson('https://api.phylopic.org/');
      const build = root.build;
      const first = await getJson(`https://api.phylopic.org/images?build=${build}`);
      const pages = Array.from({ length: first.totalPages }, (_, p) => p);
      const listed = [];
      await pool(pages, async (p) => {
        const d = await getJson(`https://api.phylopic.org/images?build=${build}&page=${p}&embed_items=true`);
        listed.push(...d._embedded.items);
        return true;
      }, { concurrency: 4, onProgress: (d, n) => onProgress(Math.round((d / n) * 500), 500 + first.totalItems) });
      const { results, failed } = await pool(listed, async (it) => {
        const L = it._links;
        const vec = L.vectorFile || L.sourceFile;
        if (!vec || !/svg/.test(vec.type || '')) return null;
        const uuid = vec.href.split('/images/')[1].split('/')[0];
        const file = `${uuid}.svg`;
        const kb = await saveSvg(dir, file, vec.href);
        const taxa = (L.nodes || []).map((n) => n.title);
        return {
          file, kb, name: L.self.title || taxa[0] || 'Organism',
          category: 'PhyloPic · ' + (L.generalNode?.title || 'Organisms'),
          license: LIC[L.license?.href] || 'other', author: L.contributor?.title || 'PhyloPic contributor',
          tags: [...taxa, ...(it.attribution ? [it.attribution] : [])].join(' '),
          attribution: it.attribution || '',
        };
      }, { concurrency: 8, onProgress: (d, n) => onProgress(500 + d, 500 + n) });
      return { ...writePack(dir, { name: 'PhyloPic', homepage: 'https://www.phylopic.org' }, results), failed };
    },
  },
};

// Minimal tar reader (ustar) → Map<basename, Buffer>.
function untar(buf) {
  const files = new Map();
  for (let off = 0; off + 512 <= buf.length;) {
    const name = buf.toString('utf8', off, off + 100).replace(/\0.*$/, '');
    if (!name) break;
    const size = parseInt(buf.toString('utf8', off + 124, off + 136).replace(/\0.*$/, '').trim() || '0', 8);
    const type = buf[off + 156];
    if ((type === 48 || type === 0) && name.endsWith('.svg')) files.set(path.basename(name), buf.subarray(off + 512, off + 512 + size));
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

async function installPack(id, targetRoot, onProgress = () => {}) {
  const src = SOURCES[id];
  if (!src) throw new Error(`Unknown icon pack: ${id}`);
  const dir = path.join(targetRoot, id);
  fs.mkdirSync(path.join(dir, 'svg'), { recursive: true });
  return src.install(dir, onProgress);
}
const catalog = () => Object.entries(SOURCES).map(([id, s]) => ({ id, name: s.name, homepage: s.homepage, approx: s.approx, sizeMB: s.sizeMB, desc: s.desc }));

module.exports = { installPack, catalog };

if (require.main === module) {
  const which = process.argv[2] || 'all';
  const target = process.argv[3] || path.join(__dirname, '..', 'assets', 'iconpacks');
  (async () => {
    for (const id of which === 'all' ? Object.keys(SOURCES) : [which]) {
      let last = 0;
      const r = await installPack(id, target, (d, n) => { if (d - last >= Math.max(50, n / 20) || d === n) { last = d; console.log(`${id}: ${d}/${n}`); } });
      console.log(`${id}: done — ${r.count} icons${r.failed ? `, ${r.failed} failed` : ''}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
