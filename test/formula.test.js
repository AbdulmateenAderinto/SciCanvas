// Chemical-formula mode (src/render.js): H2O → H_{2}O, Ca2+ → Ca^{2+}, …
// render.js is a browser script, so pull out just formulaMarkup and evaluate it on its own.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'render.js'), 'utf8');
const start = src.indexOf('function formulaMarkup');
const end = src.indexOf('\n}\n', start);
assert.ok(start >= 0 && end > start, 'formulaMarkup not found in src/render.js');
const formulaMarkup = new Function(`${src.slice(start, end + 2)}\nreturn formulaMarkup;`)();

test('subscripts plain formulas', () => {
  assert.equal(formulaMarkup('H2O'), 'H_{2}O');
  assert.equal(formulaMarkup('C6H12O6'), 'C_{6}H_{12}O_{6}');
  assert.equal(formulaMarkup('Mg(OH)2'), 'Mg(OH)_{2}');
});

test('charges on single-element ions', () => {
  assert.equal(formulaMarkup('Ca2+'), 'Ca^{2+}');
  assert.equal(formulaMarkup('Na+'), 'Na^{+}');
  assert.equal(formulaMarkup('Cl-'), 'Cl^{−}');
});

test('charges on polyatomic ions split subscript from charge', () => {
  assert.equal(formulaMarkup('SO42-'), 'SO_{4}^{2−}');
  assert.equal(formulaMarkup('NH4+'), 'NH_{4}^{+}');
  assert.equal(formulaMarkup('Fe(CN)63-'), 'Fe(CN)_{6}^{3−}');
});

test('keeps spacing and trailing punctuation', () => {
  assert.equal(formulaMarkup('H2SO4 and NaCl'), 'H_{2}SO_{4} and NaCl');
  assert.equal(formulaMarkup('PO43-.'), 'PO_{4}^{3−}.');
});
