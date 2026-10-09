// Loads the browser statistics scripts (graph.js, graph2.js, stats3.js) into one function scope so the
// tests can call them. graph2.js registers chart kinds into SAMPLE_DATA at load, so a stub is provided.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
const code = ['graph.js', 'graph2.js', 'stats3.js'].map(read).join('\n;\n');
const load = vm.runInThisContext(
  `(function () {const SAMPLE_DATA = {};\n${code}\nreturn { Stats, fitCurve, compareCurves, ecx4, CURVE_MODELS, groupAnalysis };\n})`,
  { filename: 'stats-bundle.js' },
);

module.exports = load();
