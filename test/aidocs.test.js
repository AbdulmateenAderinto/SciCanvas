// Reference files for AI drafting (src/aidocs.js) and flowcharts from Mermaid / JSON / steps.
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const plain = (v) => JSON.parse(JSON.stringify(v));

test('Word XML → text with headings, tabs and table rows', () => {
  const xml = '<w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Methods</w:t></w:r></w:p>'
    + '<w:p><w:r><w:t xml:space="preserve">Cells were </w:t></w:r><w:r><w:t>treated &amp; lysed</w:t></w:r><w:r><w:tab/><w:t>(n = 3)</w:t></w:r></w:p>'
    + '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Gene</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Fold</w:t></w:r></w:p></w:tc></w:tr>'
    + '<w:tr><w:tc><w:p><w:r><w:t>IL6</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>4.2</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body>';
  assert.equal(A.docxXmlToText(xml), '# Methods\nCells were treated & lysed\t(n = 3)\nGene | Fold\nIL6 | 4.2');
});

test('PowerPoint slides → text in slide order with speaker notes', () => {
  const sl = (t) => `<p:sld><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:sld>`;
  const out = A.pptxSlidesToText([{ n: 2, xml: sl('Results'), notesXml: '' }, { n: 1, xml: sl('Aims'), notesXml: '<a:p><a:r><a:t>Say hello</a:t></a:r></a:p><a:p><a:r><a:t>1</a:t></a:r></a:p>' }]);
  assert.equal(out, 'Slide 1\nAims\nSpeaker notes: Say hello\n\nSlide 2\nResults');
});

test('PDF page count ignores the /Pages tree node', () => {
  assert.equal(A.pdfPageCount('<< /Type /Pages /Kids [3 0 R 4 0 R] >> << /Type /Page >> << /Type/Page /Parent 2 0 R >>'), 2);
});

test('references: PDFs become documents, text and tables go in the prompt, with the chosen use', () => {
  const r = A.referencesForRequest([
    { kind: 'pdf', name: 'paper.pdf', data: 'JVBERi0=', label: 'PDF' },
    { kind: 'text', name: 'notes.docx', text: 'Key result: X up', label: 'Word' },
    { kind: 'table', name: 'data.csv', csv: 'Control,Drug\n1,2\n3,4', headers: ['Control', 'Drug'], rows: 2, label: 'table' },
  ], 'summary');
  assert.deepEqual(plain(r.documents), [{ name: 'paper.pdf', data: 'JVBERi0=' }]);
  assert.match(r.text, /Key result: X up/);
  assert.match(r.text, /Columns: Control \| Drug/);
  assert.match(r.text, /visual summary/);
  assert.equal(r.tables.length, 1);
});

test('AI chart elements take their numbers from the attached table, never from the model', () => {
  const tables = [{ name: 'data.csv', csv: 'Dose,Control,Drug\n1,10,12\n2,11,19\n3,9,25' }];
  const c = A.aiChartFromTables({ shape: 'bar', text: 'Control | Drug', x: 10, y: 20, w: 300, h: 200 }, tables);
  assert.equal(c.type, 'chart');
  assert.equal(c.cfg.data, 'Control,Drug\n10,12\n11,19\n9,25');
  assert.equal(c.cfg.source, 'data.csv');
  assert.equal(A.aiChartFromTables({ shape: 'bar', text: 'Placebo' }, tables), null, 'unknown column → no chart');
  assert.equal(A.aiChartFromTables({ shape: 'bar', text: 'Control' }, []), null, 'no table attached → no chart');
});

test('Mermaid: shapes, labelled edges, chains, & groups and loops', () => {
  const r = A.parseFlowText('graph LR\n  A([Start]) --> B{OK?}\n  B -->|yes| C[Go] -.-> D[(Store)]\n  B -- no --> A\n  E & F --> C %% comment');
  assert.equal(r.direction, 'LR');
  const kind = Object.fromEntries(r.nodes.map((n) => [n.id, n.kind]));
  assert.deepEqual(plain(kind), { A: 'end', B: 'decision', C: 'process', D: 'data', E: 'process', F: 'process' }, 'A has an incoming edge, so it is an end/terminal');
  assert.deepEqual(plain(r.edges.map((e) => `${e.from}>${e.to}${e.label ? `:${e.label}` : ''}`)), ['A>B', 'B>C:yes', 'C>D', 'B>A:no', 'E>C', 'F>C']);
});

test('numbered steps: decisions branch and loop back with | label -> step', () => {
  const r = A.parseFlowText('1. Start\n2. Collect sample\n3. Quality OK? | yes -> 4 | no -> 2\n4. Analyse\n5. End');
  assert.deepEqual(plain(r.nodes.map((n) => n.kind)), ['start', 'process', 'decision', 'process', 'end']);
  assert.deepEqual(plain(r.edges.map((e) => `${e.from}>${e.to}`)), ['1>2', '2>3', '3>4', '3>2', '4>5']);
});

test('JSON flowcharts and plain step arrays', () => {
  const r = A.parseFlowText('{"nodes":[{"id":"a","label":"Go","shape":"start"},{"id":"b","label":"Ok?","kind":"decision"}],"edges":[{"source":"a","target":"b","label":"x"}]}');
  assert.deepEqual(plain(r.edges), [{ from: 'a', to: 'b', label: 'x' }]);
  assert.equal(A.parseFlowText('["Thaw","Count","Seed"]').edges.length, 2);
});

test('flowchart layout: no two boxes overlap', () => {
  for (const src of [A.DIAGRAMS.flowtext.fields[0].def, 'flowchart TD\nA-->B\nA-->C\nA-->D\nB-->E\nC-->E\nD-->F\nE-->G\nF-->G\nG-->A']) {
    const objs = A.buildFlowchart(A.parseFlowText(src)).objects.filter((o) => o.type !== 'connector' && o.type !== 'text');
    for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
      const a = objs[i], b = objs[j], overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!overlap, `boxes ${i} and ${j} overlap`);
    }
  }
});
