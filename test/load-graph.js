// src/graph.js is a classic browser <script> that defines globals. Wrap it in a
// function so its declarations stay local, and return the pieces the tests need.
// (Running it in this realm keeps arrays comparable with assert.deepEqual.)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'src', 'graph.js'), 'utf8');
const load = vm.runInThisContext(
  `(function () {${code}\nreturn { Stats, fmtP, stars, parseTable, niceTicks, invert };\n})`,
  { filename: 'src/graph.js' },
);

module.exports = load();
