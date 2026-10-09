// Editable PowerPoint export (src/pptxexport.js): every template and diagram becomes a valid deck of native shapes,
// connectors glue to real shapes, and the geometry helpers (SVG paths, bent connectors) land where the app draws.
const test = require('node:test');
const assert = require('node:assert/strict');
const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');
const A = require('./load-app');
const G = A.globals;

const defaults = (d) => Object.fromEntries(d.fields.map((f) => [f.key, f.def]));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const build = (pages, extra) => G.buildPptx(pages, { PptxGenJS, JSZip, rasterizeObject: async () => PNG, ...extra });

// Tags open and close in order (enough to catch broken string-built XML).
function assertWellFormed(xml, where) {
  const stack = [];
  for (const m of xml.matchAll(/<(\/?)([A-Za-z][\w:.-]*)(?:\s[^<>]*?)?(\/?)>/g)) {
    if (m[3]) continue;
    if (!m[1]) stack.push(m[2]);
    else assert.equal(stack.pop(), m[2], `${where}: </${m[2]}> closes the wrong tag`);
  }
  assert.equal(stack.length, 0, `${where}: unclosed ${stack.join(', ')}`);
}
async function checkDeck(base64, where) {
  const zip = await JSZip.loadAsync(Buffer.from(base64, 'base64'));
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  const out = [];
  for (const f of slides) {
    const xml = await zip.file(f).async('string');
    assertWellFormed(xml, `${where} ${f}`);
    assert.doesNotMatch(xml, /NaN|undefined|Infinity/, `${where} ${f}: bad numbers`);
    const ids = [...xml.matchAll(/<p:cNvPr id="(\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `${where} ${f}: shape ids are unique`);
    for (const m of xml.matchAll(/<a:(?:st|end)Cxn id="(\d+)"/g)) assert.ok(ids.includes(m[1]), `${where} ${f}: connector glued to a shape that exists`);
    const rels = await zip.file(f.replace('slides/', 'slides/_rels/') + '.rels').async('string');
    for (const m of xml.matchAll(/r:embed="([^"]+)"/g)) {
      const rel = rels.match(new RegExp(`Id="${m[1]}"[^>]*Target="\\.\\./media/([^"]+)"`));
      assert.ok(rel && zip.file(`ppt/media/${rel[1]}`), `${where} ${f}: image ${m[1]} is in the package`);
    }
    out.push(xml);
  }
  return out;
}

test('every template exports to a valid, editable deck', async () => {
  const pages = A.TEMPLATES.map((t) => t.build());
  const r = await build(pages);
  const slides = await checkDeck(r.base64, 'templates');
  assert.equal(slides.length, pages.length);
  const all = slides.join('');
  assert.match(all, /<p:sp>/, 'native shapes');
  assert.match(all, /<p:cxnSp>/, 'native connectors');
  assert.match(all, /<a:stCxn id="\d+" idx="\d"\/>/, 'connectors glued to shapes');
  assert.match(all, /txBox="1"/, 'text boxes');
  assert.match(all, /asvg:svgBlip/, 'icons as SVG pictures with a PNG fallback');
  assert.ok(r.pictures.icons > 0);
});

test('every diagram exports to a valid deck', async () => {
  const pages = Object.values(A.DIAGRAMS).map((d) => ({ name: d.label, width: 1200, height: 900, background: '#ffffff', objects: d.build(defaults(d)) }));
  await checkDeck((await build(pages)).base64, 'diagrams');
});

test('groups, tables, photos, rich text and pictures-only mode', async () => {
  const { Make, makeGroup } = A;
  const objects = [
    makeGroup([Make.rect(10, 10, 100, 40, { label: 'in group' }), Make.ellipse(130, 10, 40, 40)], 'G'),
    { id: 'tb', type: 'table', x: 10, y: 100, w: 300, h: 60, rot: 0, rows: 2, cols: 2, header: true, cells: [['a', 'b'], ['x^{2}', 'H_{2}O']] },
    Make.image(PNG, 400, 10, 80, 80, { clip: 'ellipse', crop: { l: 0.1, t: 0, r: 0.1, b: 0 } }),
    Make.text('Plain {b#d64545|bold red} x^{2}', 10, 200, { underline: true }),
  ];
  const [xml] = await checkDeck((await build([{ width: 600, height: 300, background: '#f0f0f0', objects }])).base64, 'mixed');
  assert.match(xml, /<p:grpSp>[\s\S]*in group[\s\S]*<\/p:grpSp>/, 'group kept with its children inside');
  assert.match(xml, /<a:tbl>/, 'native table');
  assert.match(xml, /<a:srcRect l="10000" t="0" r="10000" b="0"\/>/, 'photo crop kept as an editable crop');
  assert.match(xml, /prst="ellipse"[\s\S]*?<\/p:pic>/, 'ellipse clip on the photo');
  assert.match(xml, /b="1"[^>]*><a:solidFill><a:srgbClr val="D64545"/, 'styled span');
  assert.match(xml, /baseline="30000"/, 'superscript');
  const flat = await checkDeck((await build([{ width: 600, height: 300, objects }], { editable: false, rasterizePage: async () => PNG })).base64, 'flat');
  assert.doesNotMatch(flat[0], /<p:sp>|<p:cxnSp>/, 'picture mode has no shapes');
  assert.match(flat[0], /<p:pic>/);
});

test('SVG arcs become Béziers that end where the arc ends', () => {
  const segs = G.parseSvgPath('M0 50 A50 50 0 0 1 100 50 L100 100 Z');
  const cubic = segs.filter((s) => s.t === 'C');
  assert.ok(cubic.length >= 2, 'half circle split into ≤90° pieces');
  const last = cubic[cubic.length - 1].p;
  assert.deepEqual([last[4], last[5]], [100, 50]);
  const top = cubic[0].p; // first quarter ends at the top of the circle
  assert.ok(Math.abs(top[4] - 50) < 1e-6 && Math.abs(top[5]) < 1e-6);
});

test('bent connectors start, turn and end where the app draws them', () => {
  // Map a point of the preset path (box-local) through OOXML's flip-then-rotate, as PowerPoint draws it.
  const place = (f, u, v) => {
    const { box, rot } = f, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    let x = (f.flipH ? box.w - u : u) - box.w / 2, y = (f.flipV ? box.h - v : v) - box.h / 2;
    if (rot) [x, y] = [-y, x];
    return { x: cx + x, y: cy + y };
  };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;
  for (const b of [{ x: 300, y: 200 }, { x: -300, y: 200 }, { x: 300, y: -200 }, { x: -300, y: -200 }]) {
    const a = { x: 0, y: 0 };
    for (const vertical of [false, true]) {
      const f = G.connectorFrame(a, b, vertical), w = f.box.w, h = f.box.h;
      assert.ok(near(place(f, 0, 0), a) && near(place(f, w, h), b), 'ends');
      const turn = place(f, w * 0.5, 0); // bentConnector3's first turn at adj1 = 50%
      assert.ok(vertical ? near(turn, { x: 0, y: b.y / 2 }) : near(turn, { x: b.x / 2, y: 0 }), `first leg runs ${vertical ? 'vertically' : 'horizontally'}`);
    }
  }
});
