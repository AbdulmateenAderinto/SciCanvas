// Loads the chart scripts (graph, graph2, stats3, model's SAMPLE_DATA, omics, data, statcharts) into one
// scope with small stubs for the browser-only helpers, so every chart kind can be rendered in Node.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
// SAMPLE_DATA lives in model.js among editor code; pull out just that object literal.
const model = read('model.js');
const start = model.indexOf('const SAMPLE_DATA = {');
let depth = 0, end = start;
for (let i = model.indexOf('{', start); i < model.length; i++) { if (model[i] === '{') depth++; else if (model[i] === '}' && --depth === 0) { end = i + 1; break; } }
const sample = model.slice(start, end) + ';';
// Colour helpers live at the top of icons.js.
const icons = read('icons.js');
const colorStart = icons.indexOf('const Color = {');
let cd = 0, colorEnd = colorStart;
for (let i = icons.indexOf('{', colorStart); i < icons.length; i++) { if (icons[i] === '{') cd++; else if (icons[i] === '}' && --cd === 0) { colorEnd = i + 1; break; } }
const color = icons.slice(colorStart, colorEnd) + ';';
const files = ['graph.js', 'graph2.js', 'stats3.js', 'omics.js', 'data.js', 'statcharts.js'].map(read);
const stubs = 'const measureText = (t, fs) => ({ w: String(t).length * fs * 0.55, h: fs }); const ARRANGE_COMMANDS = {}; function openGraphDialog() {}';
const load = vm.runInThisContext(
  `(function () {${stubs}\n${color}\n${files[0]}\n${sample}\n${files.slice(1).join('\n;\n')}\nreturn { renderChart, CHART_KINDS, SAMPLE_DATA, CHART_META };\n})`,
  { filename: 'charts-bundle.js' },
);
module.exports = load();
