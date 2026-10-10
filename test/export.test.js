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
