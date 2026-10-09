const test = require('node:test');
const assert = require('node:assert/strict');
const { Stats, fmtP, stars, parseTable, niceTicks } = require('./load-graph');

// Reference values below come from SciPy 1.x unless noted otherwise.
const close = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected}, got ${actual}`);

test('descriptive statistics', () => {
  const a = [2, 4, 4, 4, 5, 5, 7, 9];
  assert.equal(Stats.mean(a), 5);
  close(Stats.variance(a), 32 / 7, 1e-12);
  close(Stats.sd(a), Math.sqrt(32 / 7), 1e-12);
  close(Stats.sem(a), Math.sqrt(32 / 7) / Math.sqrt(8), 1e-12);
  assert.equal(Stats.quantile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(Stats.quantile([1, 2, 3, 4], 0.25), 1.75);
  assert.deepEqual(Stats.outliersIQR([1, 2, 3, 4, 5, 100]), [100]);
});

test('distribution helpers', () => {
  close(Stats.lgamma(5), Math.log(24), 1e-10, 'lgamma(5)');
  close(Stats.normCdf(1.96), 0.9750021, 1e-6, 'normCdf');
  close(Stats.tTwoSidedP(2.0, 10), 0.0733880, 1e-6, 't p');
  close(Stats.fP(4.0, 2, 12), 0.046656, 1e-6, 'F p');
  close(Stats.chi2P(3.84, 1), 0.0500435, 1e-6, 'chi2 df1');
  close(Stats.chi2P(7.5, 3), 0.0575585, 1e-6, 'chi2 df3');
});

test("Welch's t-test", () => {
  const r = Stats.welch([5.1, 4.9, 5.6, 5.8, 6.0, 5.3], [6.2, 6.8, 6.1, 7.0, 6.6, 6.4, 7.1]);
  close(r.t, -5.0792603, 1e-6, 't');
  close(r.df, 10.3238094, 1e-6, 'df');
  close(r.p, 0.00043311, 1e-7, 'p');
});

test('paired t-test', () => {
  const r = Stats.pairedT([1.2, 2.3, 1.9, 2.8, 3.1], [1.0, 2.0, 2.1, 2.2, 2.5]);
  close(r.t, 2.0225996, 1e-6, 't');
  assert.equal(r.df, 4);
  close(r.p, 0.1131621, 1e-6, 'p');
});

test('Mann-Whitney U (normal approximation, no continuity correction)', () => {
  const r = Stats.mannWhitney([5.1, 4.9, 5.6, 5.8, 6.0, 5.3], [6.2, 6.8, 6.1, 7.0, 6.6, 6.4, 7.1]);
  assert.equal(r.U, 0);
  close(r.p, 0.0026998, 1e-6, 'p');
});

test('one-way ANOVA', () => {
  const r = Stats.anova([[4.2, 4.8, 5.1, 4.6], [5.9, 6.3, 5.7, 6.1, 6.0], [4.9, 5.2, 5.5, 5.0]]);
  close(r.F, 24.4190586, 1e-6, 'F');
  assert.equal(r.d1, 2);
  assert.equal(r.d2, 10);
  close(r.p, 0.00014181, 1e-7, 'p');
});

test('linear regression', () => {
  const r = Stats.linreg([1, 2, 3, 4, 5, 6], [2.1, 3.9, 6.2, 7.8, 10.1, 12.2]);
  close(r.slope, 2.02, 1e-10, 'slope');
  close(r.intercept, -0.02, 1e-10, 'intercept');
  close(r.r, 0.9991049, 1e-6, 'r');
  close(r.p, 1.20136e-6, 1e-9, 'p');
});

test('Holm adjustment keeps order and is monotone', () => {
  const adj = Stats.holm([0.01, 0.04, 0.03]);
  [0.03, 0.06, 0.06].forEach((v, i) => close(adj[i], v, 1e-12));
  assert.deepEqual(Stats.holm([0.5, 0.9]), [1, 1]);
});

test('Kaplan-Meier with ties and censoring', () => {
  // Hand-computed: n=6, events at 1, 2, 3, 5; censored at 2 and 4.
  const km = Stats.kaplanMeier([5, 2, 1, 4, 3, 2], [1, 0, 1, 0, 1, 1]);
  const expected = [[0, 1], [1, 5 / 6], [2, 4 / 6], [3, 4 / 9], [5, 0]];
  assert.equal(km.steps.length, expected.length);
  km.steps.forEach((s, i) => { assert.equal(s.t, expected[i][0]); close(s.s, expected[i][1], 1e-12); });
  assert.deepEqual(km.censored.map((c) => c.t), [2, 4]);
  assert.equal(km.median, 3);
  assert.equal(Stats.kaplanMeier([1, 2, 3], [0, 0, 1]).median, 3);
  assert.equal(Stats.kaplanMeier([1, 2], [0, 0]).median, undefined);
});

test('log-rank test (Gehan 6-MP leukaemia data)', () => {
  // Published log-rank chi-square for this data set is 16.79 (1 df).
  const drug = {
    times: [6, 6, 6, 7, 10, 13, 16, 22, 23, 6, 9, 10, 11, 17, 19, 20, 25, 32, 32, 34, 35],
    events: [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  const placebo = {
    times: [1, 1, 2, 2, 3, 4, 4, 5, 5, 8, 8, 8, 8, 11, 11, 12, 12, 15, 17, 22, 23],
    events: new Array(21).fill(1),
  };
  const r = Stats.logRank([drug, placebo]);
  close(r.chi2, 16.792941, 1e-5, 'chi2');
  assert.equal(r.df, 1);
  close(r.p, 4.1688e-5, 1e-8, 'p');
});

test('4PL fit recovers known parameters', () => {
  const truth = { bottom: 5, top: 95, ec50: 1.5, hill: 1.2 };
  const dose = [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100];
  const y = dose.map((d) => truth.bottom + (truth.top - truth.bottom) / (1 + (truth.ec50 / d) ** truth.hill));
  const fit = Stats.fit4PL(dose, y);
  close(fit.bottom, truth.bottom, 0.5, 'bottom');
  close(fit.top, truth.top, 0.5, 'top');
  close(fit.ec50, truth.ec50, 0.05, 'ec50');
  close(fit.hill, truth.hill, 0.05, 'hill');
  assert.ok(fit.r2 > 0.9999, `r2 ${fit.r2}`);
  close(fit.f(truth.ec50), (truth.bottom + truth.top) / 2, 0.5, 'f(ec50)');
});

test('p-value formatting', () => {
  assert.equal(fmtP(0.00001), 'p < 0.0001');
  assert.equal(fmtP(0.0123), 'p = 0.012');
  assert.equal(fmtP(NaN), 'p = n/a');
  assert.deepEqual([0.00001, 0.0005, 0.005, 0.04, 0.2].map(stars), ['****', '***', '**', '*', 'ns']);
});

test('parseTable handles CSV, TSV, headerless input and blanks', () => {
  const csv = parseTable('Control,Treated\n1,2\n3,\n');
  assert.deepEqual(csv.headers, ['Control', 'Treated']);
  assert.deepEqual(csv.cols[0], [1, 3]);
  assert.ok(Number.isNaN(csv.cols[1][1]));

  const tsv = parseTable('A\tB\r\n1.5\t2.5');
  assert.deepEqual(tsv.cols, [[1.5], [2.5]]);

  const bare = parseTable('1 2\n3 4');
  assert.deepEqual(bare.headers, ['Group 1', 'Group 2']);
  assert.deepEqual(bare.cols, [[1, 3], [2, 4]]);

  assert.deepEqual(parseTable(''), { headers: [], cols: [], raw: [] });
});

test('niceTicks', () => {
  assert.deepEqual(niceTicks(0, 10), [0, 2, 4, 6, 8, 10]);
  assert.deepEqual(niceTicks(0.13, 0.87), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  assert.deepEqual(niceTicks(3, 3), [2, 2.5, 3, 3.5, 4]);
});
