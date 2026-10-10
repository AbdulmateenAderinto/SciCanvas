// Exported SVG must be well-formed XML: browsers refuse to draw (and PNG export fails on) an SVG with a repeated
// attribute, such as a dotted line that got two stroke-linecap attributes.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

function repeatedAttrs(svg) {
  const out = [];
  for (const [tag] of svg.matchAll(/<[a-zA-Z][^<>]*>/g)) {
    const seen = new Set();
    for (const [, name] of tag.matchAll(/\s([\w:-]+)=["']/g)) { if (seen.has(name)) out.push(`${name} in ${tag.slice(0, 90)}`); seen.add(name); }
  }
  return out;
}
const page = (objects) => ({ width: 800, height: 600, background: '#fff', objects });

test('no element in an exported page repeats an attribute', () => {
  const pages = A.TEMPLATES.map((t) => t.build());
  for (const [k, d] of Object.entries(A.DIAGRAMS)) { const defs = {}; for (const f of d.fields || []) defs[f.key] = f.def ?? f.default ?? ''; try { pages.push(page(d.build(defs))); } catch { /* covered by diagrams.test.js */ } void k; }
  const lines = [];
  for (const dashStyle of ['solid', 'dashed', 'dotted', 'dashdot']) {
    for (const style of ['straight', 'curved', 'elbow']) lines.push(A.Make.connector({ x: 0, y: 0 }, { x: 200, y: 80 }, { dashStyle, style }));
    for (const lineStyle of ['double', 'wavy', 'zigzag']) lines.push(A.Make.connector({ x: 0, y: 0 }, { x: 200, y: 80 }, { dashStyle, lineStyle, points: [{ x: 90, y: 10 }] }));
    lines.push(A.Make.shape('star', 0, 0, 80, 80, { dashStyle, stroke: '#333' }), A.Make.shape('cycle', 0, 0, 80, 80, { dashStyle, stroke: '#333' }));
    lines.push(A.Make.rect(0, 0, 80, 40, { dashStyle, stroke: '#333' }));
    lines.push({ id: 'p' + dashStyle, type: 'path', x: 0, y: 0, w: 100, h: 50, rot: 0, closed: false, stroke: '#333', strokeWidth: 2, dashStyle, nodes: [{ x: 0, y: 0 }, { x: 100, y: 50 }] });
  }
  pages.push(page(lines));
  for (const p of pages) {
    const svg = G.pageSvgString(p);
    assert.deepEqual(repeatedAttrs(svg), [], p.name || 'line variants');
  }
});

test('a figure using the line tools draws the same after saving and reopening', () => {
  const M = A.Make, a = M.rect(60, 60, 120, 60), b = M.rect(460, 60, 120, 60), c = M.rect(260, 300, 120, 60);
  const trunk = M.connector({ id: a.id }, { id: b.id }, {});
  const objects = [a, b, c, trunk,
    M.connector({ id: a.id }, { id: c.id }, { points: [{ x: 120, y: 330 }], style: 'curved', label: 'binds', labelAlong: true, labelPos: 0.3 }),
    M.connector({ id: a.id }, { id: b.id }, { route: 'auto', style: 'elbow', radius: 8 }),
    M.connector({ id: c.id }, { id: c.id }, { loopSide: 'e' }),
    M.connector({ id: c.id }, { id: trunk.id, t: 0.5 }, { head: 'bar' }),
    M.connector({ id: a.id, at: [1, 0.2] }, { id: c.id }, { offset: 5, endGap: 6, labelBg: 'none' }),
    M.connector({ x: 40, y: 480 }, { x: 600, y: 480 }, { lineStyle: 'zigzag', animate: true, midArrows: 2, jumps: true, gradTo: '#ff0000' }),
  ];
  const page = { width: 700, height: 620, background: '#ffffff', objects };
  const again = JSON.parse(JSON.stringify(page));
  assert.equal(G.pageSvgString(again), G.pageSvgString(page));
});
