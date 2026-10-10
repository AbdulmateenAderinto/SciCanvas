// Icons for sequencing and immunology figures (src/figureicons.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');

const IDS = ['s-peyer-s-patch', 's-germinal-centre-dark-and-light-zones', 's-germinal-centre-b-cell-b220-gl7-fas',
  's-nanopore-sequencer-minion-style', 's-nanopore-sequencer-lid-open-minion-style', 's-nanopore-flow-cell', 's-nanopore-current-trace-squiggle', 's-nanopore-sequencing-strand-through-pore',
  's-long-read-sequencer-pacbio-style', 's-short-read-sequencer-illumina-style', 's-capillary-sequencer-sanger',
  's-sanger-chromatogram-abi-trace', 's-gamma-retrovirus-gfp-vector', 's-retroviral-transduction-gfp',
  's-gfp-transduced-cell', 's-nanopore-sequencer-benchtop-promethion-style', 's-nanopore-flow-cell-promethion-style',
  's-germinal-centre-b-cells-group', 's-germinal-centre-b-cell-soft-with-markers',
  's-mouse-c57bl-6-black-realistic', 's-mouse-albino-white-realistic', 's-mouse-agouti-brown-realistic', 's-retroviral-plasmid-insert-gfp-puror', 's-retroviral-plasmid-empty-gfp-puror'];

test('figure icons are in the library and draw clean SVG', () => {
  for (const id of IDS) {
    assert.ok(A.ICON_MAP[id], id);
    const svg = A.pageSvgString({ width: 200, height: 200, background: '#fff', objects: [A.Make.icon(id, 10, 10, 160)] });
    assert.doesNotMatch(svg, /NaN|undefined/, id);
    assert.ok((svg.match(/<(path|rect|circle|ellipse|text)\b/g) || []).length >= 6, `${id} draws something`);
  }
});

test('the figure icons can be found by the words people search for', () => {
  for (const [q, id] of [["Peyer's patch", 's-peyer-s-patch'], ['MinION', 's-nanopore-sequencer-minion-style'], ['PacBio', 's-long-read-sequencer-pacbio-style'], ['chromatogram', 's-sanger-chromatogram-abi-trace'], ['transduction', 's-retroviral-transduction-gfp']]) {
    assert.ok(A.searchIcons(q).items.some((ic) => (ic.id || ic) === id), q);
  }
});

test('the Sanger trace uses the ABI base colours', () => {
  const svg = A.pageSvgString({ width: 200, height: 100, background: '#fff', objects: [A.Make.icon('s-sanger-chromatogram-abi-trace', 0, 0, 160)] });
  // The icon style tunes exact tones, so check the four colour families: A green, C blue, G black, T red.
  const rgb = [...new Set(svg.match(/#[0-9a-f]{6}/gi))].map((h) => A.Color.hexToRgb(h));
  const has = (test) => rgb.some(([r, g, b]) => test(r, g, b));
  assert.ok(has((r, g, b) => g > 140 && r < 90 && b < 110), 'green A');
  assert.ok(has((r, g, b) => b > 160 && r < 90), 'blue C');
  assert.ok(has((r, g, b) => r < 70 && g < 70 && b < 70), 'black G');
  assert.ok(has((r, g, b) => r > 180 && g < 90 && b < 90), 'red T');
});
