// Figure kit: automatic panel letters, plot-grid shared legends and dark versions of pages.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const G = A.globals;

const panel = (x, y, w = 300, h = 200) => A.Make.rect(x, y, w, h, { name: 'panel' });
function setPage(objects, extra = {}) {
  const p = { id: 'p1', name: 'Fig 1', width: 1000, height: 800, background: '#ffffff', objects, ...extra };
  A.state.doc = { version: 2, pages: [p], assets: {} };
  A.state.pageIndex = 0; A.state.sel = [];
  return p;
}

test('panel labels follow the chosen numbering', () => {
  assert.deepEqual([0, 1, 25, 26].map((i) => G.formatLabel(i, 'A')), ['A', 'B', 'Z', 'AA']);
  assert.equal(G.formatLabel(1, '(a)'), '(b)');
  assert.equal(G.formatLabel(2, 'A.'), 'C.');
  assert.equal(G.formatLabel(3, 'a)'), 'd)');
  assert.equal(G.formatLabel(8, '1'), '9');
  assert.equal(G.formatLabel(3, 'i'), 'iv');
});

test('reading order is rows top to bottom, then left to right; a tall panel shares the first row', () => {
  const it = (id, x, y, w, h) => ({ id, b: { x, y, w, h } });
  const order = G.readingOrder([it('c', 520, 230, 300, 190), it('b', 520, 10, 300, 190), it('a', 10, 0, 480, 420), it('d', 10, 450, 300, 200)]);
  assert.deepEqual([...order.map((x) => x.id)], ['a', 'b', 'c', 'd']);
});

test('letters are re-lettered in reading order and follow their panels', () => {
  const a = panel(50, 60), b = panel(500, 60), c = panel(50, 400);
  const p = setPage([a, b, c]);
  G.letterPanels([a, b, c]);
  const L = () => p.objects.filter((o) => o.panelLetter);
  const of = (t) => L().find((o) => o.panelLetter.target === t.id);
  assert.equal(L().length, 3);
  assert.deepEqual([of(a).text, of(b).text, of(c).text], ['A', 'B', 'C']);
  // Swap the top-right and bottom-left panels: letters move with them and re-letter.
  const lb = { x: of(b).x, y: of(b).y };
  [b.x, b.y, c.x, c.y] = [50, 400, 500, 60];
  G.followPanels(p.objects); G.reletter(p);
  assert.deepEqual([of(a).text, of(c).text, of(b).text], ['A', 'B', 'C']);
  assert.equal(Math.round(of(b).x - lb.x), -450, 'letter moved with its panel');
  assert.equal(Math.round(of(b).y - lb.y), 340);
  // Moving panel and letter together doesn't move the letter twice.
  A.state.sel = [a.id, of(a).id];
  const la = of(a).x; a.x += 10; of(a).x += 10;
  G.followPanels(p.objects);
  assert.equal(of(a).x, la + 10);
  A.state.sel = [];
});

test('a letter typed over keeps its text and leaves the sequence; deleting a panel re-letters', () => {
  const a = panel(50, 60), b = panel(500, 60), c = panel(50, 400);
  const p = setPage([a, b, c]);
  G.letterPanels([a, b, c]);
  const of = (t) => p.objects.find((o) => o.panelLetter && o.panelLetter.target === t.id);
  of(a).text = 'A′';
  G.reletter(p);
  assert.equal(of(a).text, 'A′');
  assert.deepEqual([of(b).text, of(c).text], ['A', 'B']);
  p.objects.splice(p.objects.indexOf(b), 1);
  p.objects.splice(p.objects.findIndex((o) => o.panelLetter && o.panelLetter.target === b.id), 1);
  G.reletter(p);
  assert.equal(of(c).text, 'A');
  A.state.doc.panelLabels = { ...A.state.doc.panelLabels, format: '(a)' };
  G.reletter(p, { force: true });
  assert.deepEqual([of(a).text, of(c).text], ['(a)', '(b)'], 'forcing clears the typed-over text');
});

test('existing lone letters can be adopted', () => {
  const a = panel(50, 60), b = panel(500, 60);
  const la = A.Make.text('B', 30, 20, { fontSize: 24, bold: true }), lb = A.Make.text('A', 480, 20, { fontSize: 24, bold: true });
  const p = setPage([a, b, la, lb, A.Make.text('Body text', 100, 300)]);
  assert.equal(G.adoptLetters(p), 2);
  G.reletter(p, { force: true });
  assert.equal(la.panelLetter.target, a.id);
  assert.deepEqual([la.text, lb.text], ['A', 'B']);
});

test('shared legend: entries once each, drawn as editable shapes and text', () => {
  const p1 = { id: 'q1', type: 'icon', x: 0, y: 0, w: 300, h: 200, plot: { lang: 'python', legend: [{ label: 'WT', kind: 'line', color: '#0072b2' }, { label: 'KO', kind: 'line', color: '#d55e00', dash: true }] } };
  const p2 = { id: 'q2', type: 'icon', x: 320, y: 0, w: 300, h: 200, plot: { lang: 'python', legend: [{ label: 'KO', kind: 'line', color: '#d55e00' }, { label: 'Het', kind: 'patch', color: '#009e73', edge: '#ffffff' }] } };
  setPage([p1, p2]);
  const entries = G.legendEntries([p1, p2]);
  assert.deepEqual([...entries.map((e) => e.label)], ['WT', 'KO', 'Het']);
  const g = G.buildLegend(entries, [p1, p2], 'right', { x: 640, y: 0, w: 150, h: 200 });
  assert.equal(g.type, 'group');
  assert.deepEqual([...g.sharedLegend.plots], ['q1', 'q2']);
  const texts = [...g.children.filter((c) => c.type === 'text').map((c) => c.text)];
  assert.deepEqual(texts, ['WT', 'KO', 'Het']);
  assert.equal(g.children.filter((c) => c.type === 'rect' && c.fill === '#d55e00').length, 3, 'dashed line drawn as three dashes');
  const het = g.children.find((c) => c.type === 'rect' && c.fill === '#009e73');
  assert.equal(het.stroke, 'none', 'white bar edges are left out');
  const bottom = G.buildLegend(entries, [p1, p2], 'bottom', { x: 0, y: 220, w: 620, h: 40 });
  const ys = new Set(bottom.children.filter((c) => c.type === 'text').map((c) => Math.round(c.y)));
  assert.equal(ys.size, 1, 'bottom legend is one row');
});

test('dark colours: neutrals swap lightness, real colours stay', () => {
  assert.equal(G.darkColour('#000000'), '#ffffff');
  assert.equal(G.darkColour('#ffffff'), '#000000');
  assert.equal(G.darkColour('#222'), '#dddddd');
  assert.equal(G.darkColour('black'), '#ffffff');
  assert.equal(G.darkColour('#e69f00'), '#e69f00');
  assert.equal(G.darkColour('#0072b2'), '#0072b2');
  assert.equal(G.darkColour('none'), 'none');
  assert.equal(G.darkColour('#00000080'), '#ffffff80');
  const s = G.darkSvg('<path style="fill: #ffffff; stroke: #000000" fill="#333"/><use xlink:href="#abc" fill="#e69f00"/><stop stop-color="black"/>');
  assert.match(s, /fill: #000000; stroke: #ffffff/);
  assert.match(s, /fill="#cccccc"/);
  assert.match(s, /href="#abc"/, 'references are left alone');
  assert.match(s, /fill="#e69f00"/);
  assert.match(s, /stop-color="#ffffff"/);
});

test('dark version of a page: new ids, re-pointed links, recoloured ink, pictures untouched', () => {
  const box = A.Make.rect(100, 100, 200, 100, { fill: '#ffffff', stroke: '#222222', label: 'Step 1' });
  const box2 = A.Make.rect(400, 100, 200, 100, { fill: '#e8f0fb', stroke: '#4a7fd6' });
  const arrow = A.Make.connector({ id: box.id }, { id: box2.id }, { color: '#333333' });
  const t = A.Make.text('Title', 100, 20, { color: '#111111' });
  const pic = { id: 'img1', type: 'image', src: 'data:image/png;base64,AAAA', x: 0, y: 300, w: 100, h: 100, rot: 0 };
  const chart = A.Make.chart({ kind: 'bar' }, 600, 300);
  const p = setPage([box, box2, arrow, t, pic, chart]);
  G.letterPanels([box]);
  const d = G.darkPage(p);
  assert.equal(d.background, '#000000');
  assert.equal(d.darkOf, 'p1');
  assert.notEqual(d.id, p.id);
  const ids = new Set(p.objects.map((o) => o.id));
  assert.ok(d.objects.every((o) => !ids.has(o.id)), 'objects get new ids');
  const [dbox, dbox2, darrow, dt, dpic, dchart] = d.objects;
  assert.equal(darrow.from.id, dbox.id); assert.equal(darrow.to.id, dbox2.id);
  assert.equal(dbox.fill, '#000000'); assert.equal(dbox.stroke, '#dddddd'); assert.equal(dbox.labelColor, '#dddddd');
  assert.equal(dbox2.stroke, '#4a7fd6', 'colours stay');
  assert.equal(darrow.color, '#cccccc');
  assert.equal(dt.color, '#eeeeee');
  assert.equal(dpic.src, pic.src);
  assert.equal(dchart.darkInk, true);
  const letter = d.objects.find((o) => o.panelLetter);
  assert.equal(letter.panelLetter.target, dbox.id);
  assert.equal(p.objects[0].fill, '#ffffff', 'the original page is unchanged');
  // Charts on the dark page are recoloured as they are drawn.
  const svg = A.pageSvgString(d);
  assert.match(svg, /<g fill="#ffffff" color="#ffffff">/);
});
