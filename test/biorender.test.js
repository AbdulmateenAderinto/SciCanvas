// BioRender-style tools: icon → parts geometry, circular arrows, zoom wedges, well plates and sequence grids.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

test('path segments become nodes: curves keep handles, closed subpaths drop the duplicate end', () => {
  const segs = G.parseSvgPath('M0 0 C10 0 20 10 20 20 L0 20 Z M30 30 L40 30 L40 40 Z');
  const { nodes, closedAny } = G.segsToNodes(segs);
  assert.ok(closedAny);
  assert.equal(nodes.length, 6);
  assert.deepEqual([nodes[0].ox, nodes[0].oy, nodes[1].ix, nodes[1].iy], [10, 0, 20, 10]);
  assert.ok(nodes[3].move, 'second subpath starts with a move');
  // circle: arcs → cubics, end merged into the start
  const c = G.segsToNodes(G.parseSvgPath(G.elementPathD('circle', (k) => ({ cx: 50, cy: 50, r: 10 })[k]))).nodes;
  assert.ok(c.length >= 4 && c.length <= 8);
  assert.ok(c[0].ix != null, 'start node takes the closing handle');
  for (const n of c) assert.ok(Math.abs(Math.hypot(n.x - 50, n.y - 50) - 10) < 1e-6);
});

test('matrix mapping and quadratic curves', () => {
  const { nodes } = G.segsToNodes(G.parseSvgPath('M0 0 Q10 0 10 10'), (p) => ({ x: 2 * p.x + 5, y: 2 * p.y + 5 }));
  assert.deepEqual([nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y], [5, 5, 25, 25]);
  assert.ok(Math.abs(nodes[0].ox - (5 + 2 * 20 / 3)) < 1e-9);
  assert.equal(G.elementPathD('rect', (k) => ({ x: 1, y: 2, width: 3, height: 4 })[k]), 'M1 2H4V6H1Z');
  assert.equal(G.elementPathD('polygon', (k) => ({ points: '0,0 4,0 4,4' })[k]), 'M0 0L4 0L4 4Z');
});

test('circular arrow: ends, head size and both heads', () => {
  const o = A.Make.shape('cycle', 0, 0, 200, 200, { strokeWidth: 10, arcStart: 0, arcEnd: 270, headSize: 100, stroke: '#3366cc' });
  const g = G.cycleGeometry(o, 200, 200);
  assert.match(g.arc, /^M100 0 A/);
  assert.ok(g.heads.startsWith('M0 100'), 'head tip at 270° (9 o’clock)');
  const big = G.cycleGeometry({ ...o, headSize: 200 }, 200, 200), both = G.cycleGeometry({ ...o, headStart: 'arrow' }, 200, 200);
  assert.ok(big.heads.length && both.heads.split('M').length === 3);
  assert.deepEqual([...G.cycleArcSpan({ arcStart: 300, arcEnd: 30 })], [300, 390], 'wraps past 12 o’clock');
  const svg = A.pageSvgString({ width: 220, height: 220, objects: [o] });
  assert.match(svg, /fill="#3366cc" stroke="#3366cc"/);
});

test('zoom wedge: hull spans both objects and renders a gradient polygon', () => {
  const a = A.Make.rect(0, 0, 10, 10), b = A.Make.ellipse(100, -50, 100, 100);
  const w = A.Make.connector({ id: a.id }, { id: b.id }, { style: 'zoom', color: '#7fb8c4' });
  const hull = G.zoomWedgeHull(w, [a, b, w]);
  const bb = G.polyBounds(hull);
  assert.ok(bb.x <= 0 && bb.x + bb.w >= 199 && bb.y <= -49);
  const svg = A.pageSvgString({ width: 300, height: 200, objects: [w, a, b] });
  assert.match(svg, /<linearGradient id="zw-/);
  assert.match(svg, /<polygon points=/);
});

test('well plate: one group with a named circle per well', () => {
  const [g] = A.DIAGRAMS.wellplate.build({ format: '96', fillMode: 'dilution', colour: '#c77cb1', labels: true });
  assert.equal(g.type, 'group');
  const wells = g.children.filter((c) => c.type === 'ellipse' && /^[A-H]\d+$/.test(c.name));
  assert.equal(wells.length, 96);
  assert.ok(wells.some((w) => w.name === 'H12'));
  assert.notEqual(wells[0].fill, wells[11].fill, 'dilution shades across columns');
});

test('sequence grid: complement strand, shading and bold positions', () => {
  const list = A.DIAGRAMS.seqgrid.build({ seq: 'gatc', complement: true, highlight: '2-3 | #aabbcc', bold: '1', cell: 20, ends: true });
  const t = list.find((o) => o.type === 'table');
  assert.deepEqual(JSON.parse(JSON.stringify(t.cells[1])), ['{b|C}', 'T', 'A', 'G']);
  assert.equal(t.cells[0][0], '{b|G}');
  assert.equal(t.cellFill[0][1], '#aabbcc');
  assert.equal(t.cellFill[0][0], null);
  assert.equal(list.filter((o) => o.type === 'text').length, 4, '5′/3′ labels on both strands');
});
