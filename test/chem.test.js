// Chemical formula formatting (src/quickadd.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('./load-app');
const f = A.globals.formatChemistry;

test('formulas get subscripts and charges get superscripts; ordinary words are left alone', () => {
  const cases = {
    'H2O': 'H_{2}O', 'CO2 release': 'CO_{2} release', 'Ca2+ influx': 'Ca^{2+} influx', 'SO42-': 'SO_{4}^{2−}', 'Fe3+': 'Fe^{3+}', 'HCO3-': 'HCO_{3}^{−}', 'PO43-': 'PO_{4}^{3−}', 'Cl-': 'Cl^{−}',
    'Na+ and K+': 'Na^{+} and K^{+}', 'C6H12O6': 'C_{6}H_{12}O_{6}', 'Ca(OH)2': 'Ca(OH)_{2}', 'NH4+': 'NH_{4}^{+}',
    'Cells and CO': 'Cells and CO', 'Fig 2': 'Fig 2', 'TP53': 'TP53', 'IL6': 'IL6', 'Already H_{2}O': 'Already H_{2}O',
  };
  for (const [a, b] of Object.entries(cases)) assert.equal(f(a), b, a);
});
