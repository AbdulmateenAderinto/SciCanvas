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

test('units and symbols are tidied only where unambiguous', () => {
  const t = A.globals.tidyUnits;
  const cases = {
    '10 um beads': '10 µm beads', '5ug/ml': '5 µg/mL', '200 ul': '200 µL', '50uM drug': '50 µM drug', '2 ml': '2 mL',
    'at 37 C for 1 h': 'at 37 °C for 1 h', '37oC': '37 °C', '4 degC': '4 °C', 'mean +/- SD': 'mean ± SD',
    'A -> B': 'A → B', 'A <=> B': 'A ⇌ B', '2 x 10^6 cells': '2 × 10^{6} cells', 'diluted 10x.': 'diluted 10×.',
    'Group C': 'Group C', 'umbrella': 'umbrella', 'xml': 'xml', 'Figure 2': 'Figure 2', '300 C-terminal': '300 C-terminal', 'pH 7': 'pH 7',
  };
  for (const [a, b] of Object.entries(cases)) assert.equal(t(a), b, a);
});

test('timeline builder reads "time: event" lines in several notations', () => {
  const p = A.globals.parseTimeline;
  assert.equal(JSON.stringify(p('Day 0: implant\nWeek 2 - boost\n E12.5: harvest \n\n48 h')), JSON.stringify([
    { when: 'Day 0', what: 'implant' }, { when: 'Week 2', what: 'boost' }, { when: 'E12.5', what: 'harvest' }, { when: '48 h', what: '' }]));
});

test('cohort builder reads group sizes', () => {
  assert.equal(JSON.stringify(A.globals.parseCohorts('Vehicle: 8\nDrug (n=6)\nControl = 10\nNo number')), JSON.stringify([
    { name: 'Vehicle', n: 8 }, { name: 'Drug', n: 6 }, { name: 'Control', n: 10 }, { name: 'No number', n: 5 }]));
});

test('gating strategy steps and splits', () => {
  assert.equal(JSON.stringify(A.globals.parseGates('Lymphocytes > Live → CD3+ > CD4+ / CD8+')), JSON.stringify([['Lymphocytes'], ['Live'], ['CD3+'], ['CD4+', 'CD8+']]));
});

test('western blot builder reads lanes, sizes and intensities', () => {
  const b = A.globals.parseBlot("Lanes: Ctrl, EGF\np-ERK (42 kDa): 0.1, 1.4\nGAPDH: 1, 1, 1");
  assert.equal(JSON.stringify(b), JSON.stringify({ lanes: ['Ctrl', 'EGF', 'Lane 3'], rows: [{ name: 'p-ERK', kda: '42 kDa', bands: [0.1, 1] }, { name: 'GAPDH', kda: '', bands: [1, 1, 1] }] }));
});
