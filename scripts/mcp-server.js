#!/usr/bin/env node
// SciCanvas MCP server (stdio). Lets AI assistants that support the Model Context Protocol (e.g. Claude
// Desktop) search SciCanvas's icon libraries and templates, and create editable figure drafts that open
// in SciCanvas. Run: node scripts/mcp-server.js  (see README → "AI connector").
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const VERSION = require(path.join(ROOT, 'package.json')).version;
const DRAFTS = process.env.SCICANVAS_DRAFTS || path.join(os.homedir(), 'Documents', 'SciCanvas Drafts');
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ---------- Data ----------
let iconIndex = null;
function loadIcons() {
  if (iconIndex) return iconIndex;
  const out = [];
  // Built-in icons (parsed from the source so this script needs no browser code).
  // Built-in + soft-style icons: evaluate the icon scripts in a sandbox (they only build data).
  try {
    const code = ['icons.js', 'softicons.js', 'immunoicons.js'].map((f) => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n') + '\n;ICONS.map((i) => ({ id: i.id, name: i.name, cat: i.cat, tags: i.tags }));';
    for (const i of require('vm').runInNewContext(code, {})) out.push({ key: i.id, name: i.name, category: i.cat, tags: i.tags || '', library: i.cat.startsWith('Soft') ? 'soft style' : 'built-in', license: 'built-in' });
  } catch (e) { log('Could not index built-in icons:', e.message); }
  // Installed packs: bundled with the source, inside an installed app, and downloaded into user data.
  const roots = [
    path.join(ROOT, 'assets', 'iconpacks'),
    '/Applications/SciCanvas.app/Contents/Resources/iconpacks',
    path.join(os.homedir(), 'Library', 'Application Support', 'SciCanvas', 'iconpacks'),
    path.join(os.homedir(), 'AppData', 'Roaming', 'SciCanvas', 'iconpacks'),
    path.join(os.homedir(), '.config', 'SciCanvas', 'iconpacks'),
  ];
  const seen = new Set();
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    for (const id of fs.readdirSync(r)) {
      const f = path.join(r, id, 'pack.json');
      if (seen.has(id) || !fs.existsSync(f)) continue;
      seen.add(id);
      try { for (const ic of JSON.parse(fs.readFileSync(f, 'utf8')).icons) out.push({ key: `pack:${id}/${ic.file}`, name: ic.name, category: ic.category, tags: ic.tags || '', library: id, license: ic.license, author: ic.author }); } catch { /* skip */ }
    }
  }
  iconIndex = out;
  log(`SciCanvas MCP: ${out.length} icons indexed`);
  return out;
}
function searchIcons(query, limit = 20) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const scored = [];
  for (const it of loadIcons()) {
    const name = it.name.toLowerCase(), hay = `${name} ${it.category} ${it.tags} ${it.author || ''}`.toLowerCase();
    let s = 0, ok = true;
    for (const w of words) { if (name === w) s += 6; else if (name.startsWith(w)) s += 4; else if (name.includes(w)) s += 3; else if (hay.includes(w)) s += 1; else { ok = false; break; } }
    if (ok) scored.push([s + (it.library === 'built-in' ? 0.5 : 0), it]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, it]) => it);
}
function listTemplates() {
  const out = [];
  for (const f of ['model.js', 'files.js', 'bio.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    for (const m of src.matchAll(/name: '([^']+)',\s*desc: '([^']+)'/g)) out.push({ name: m[1], description: m[2] });
  }
  return out;
}
function createDraft(args) {
  const { title = 'Figure draft', width = 1000, height = 650, elements = [], open = true } = args;
  if (!Array.isArray(elements) || !elements.length) throw new Error('elements must be a non-empty array');
  fs.mkdirSync(DRAFTS, { recursive: true });
  const safe = String(title).replace(/[^\w -]+/g, '').trim().slice(0, 60) || 'Figure draft';
  let file = path.join(DRAFTS, `${safe}.scifig`), n = 2;
  while (fs.existsSync(file)) file = path.join(DRAFTS, `${safe} ${n++}.scifig`);
  const draft = { title, width, height, elements: elements.map((e, i) => ({ id: e.id || `e${i}`, kind: e.kind, x: +e.x || 0, y: +e.y || 0, w: +e.w || 0, h: +e.h || 0, text: e.text || '', icon: e.icon || '', color: e.color || '', from: e.from || '', to: e.to || '', arrow: e.arrow || '', shape: e.shape || '' })) };
  const doc = { version: 2, pages: [{ id: 'p1', name: safe, width, height, background: '#ffffff', objects: [] }], uploads: [], assets: {}, aiDraft: draft };
  fs.writeFileSync(file, JSON.stringify(doc));
  if (open) execFile(process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open', [file], () => {});
  return file;
}

// ---------- MCP tool definitions ----------
const ELEMENT = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'Short unique id (arrows reference these)' },
    kind: { type: 'string', enum: ['icon', 'text', 'box', 'ellipse', 'shape', 'arrow', 'membrane', 'dna', 'badge'] },
    x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
    text: { type: 'string', description: 'Label text (^{sup} / _{sub} supported)' },
    icon: { type: 'string', description: 'For kind=icon: a short search query (e.g. "T cell") or an exact key from search_icons prefixed with "@key:"' },
    color: { type: 'string', description: 'Hex colour, optional' },
    from: { type: 'string' }, to: { type: 'string' },
    arrow: { type: 'string', enum: ['arrow', 'inhibit', 'bind', 'line', ''] },
    shape: { type: 'string', description: 'For kind=shape: triangle, diamond, hexagon, star, arrow, chevron, cylinder, cloud, pill, parallelogram; for membrane: "ellipse" for a closed cell outline' },
  },
  required: ['kind'],
};
const TOOLS = [
  { name: 'search_icons', description: 'Search SciCanvas\'s ~21,000 scientific icons (built-in, ~1,000 soft-style proteins / complexes / cells, Bioicons, Reactome proteins/receptors/compounds, PhyloPic organisms by scientific name, Health Icons). Returns names, libraries, licences and keys usable as "@key:<key>" in create_figure_draft.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 20 } }, required: ['query'] } },
  { name: 'list_templates', description: 'List SciCanvas\'s built-in figure templates (pathways, workflows, graphical abstracts, posters, slides…).', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_figure_draft', description: 'Create an editable SciCanvas figure from a layout of elements (pixel coordinates, origin top-left) and open it in SciCanvas. Icons are resolved from the libraries when the file opens. Every element stays editable.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, width: { type: 'number', default: 1000 }, height: { type: 'number', default: 650 }, elements: { type: 'array', items: ELEMENT }, open: { type: 'boolean', default: true, description: 'Open the draft in SciCanvas immediately' } }, required: ['title', 'elements'] } },
];
function callTool(name, args) {
  switch (name) {
    case 'search_icons': {
      const r = searchIcons(args.query, Math.min(100, args.limit || 20));
      return r.length ? r.map((it) => `${it.name} — ${it.library}${it.category ? ` / ${it.category}` : ''} (${it.license}${it.author ? `, ${it.author}` : ''}) — key: ${it.key}`).join('\n') : `No icons match "${args.query}". Try a broader or scientific name.`;
    }
    case 'list_templates': return listTemplates().map((t) => `${t.name}: ${t.description}`).join('\n');
    case 'create_figure_draft': {
      const file = createDraft(args);
      return `Created ${file}${args.open === false ? '' : ' and asked SciCanvas to open it'}. The user can edit every element there. Remind them to check the science (compartments, arrow directions, labels).`;
    }
  }
  throw new Error(`Unknown tool: ${name}`);
}

// ---------- JSON-RPC over stdio (newline-delimited) ----------
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification
  try {
    switch (method) {
      case 'initialize': return send({ jsonrpc: '2.0', id, result: { protocolVersion: (params && params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'scicanvas', version: VERSION } } });
      case 'ping': return send({ jsonrpc: '2.0', id, result: {} });
      case 'tools/list': return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      case 'tools/call': {
        try { return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: callTool(params.name, params.arguments || {}) }] } }); }
        catch (e) { return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true } }); }
      }
      default: return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) { send({ jsonrpc: '2.0', id, error: { code: -32603, message: e.message } }); }
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try { handle(JSON.parse(line)); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); }
  }
});
log(`SciCanvas MCP server ${VERSION} ready`);
