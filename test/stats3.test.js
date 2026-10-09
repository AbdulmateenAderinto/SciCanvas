// New statistics (src/stats3.js) checked against reference values from SciPy 1.18
// (test/fixtures/stats-reference.json), plus a few exact values computed independently.
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./load-stats');
const cases = require('./fixtures/stats-reference.json');

// Resolve a path such as 'p', 'loa.1', '[].p', 'coefs[].b' or '' (the whole result).
function pick(res, path) {
  if (!path) return res;
  const m = path.match(/^(\w*)\[\]\.(\w+)$/);
  if (m) return (m[1] ? res[m[1]] : res).map((x) => x[m[2]]);
  return path.split('.').reduce((o, k) => o[k], res);
}
function run([fn, ...args]) {
  if (fn === 'fitCurve') return S.fitCurve(...args);
  if (fn === 'compareCurves') return S.compareCurves(...args);
  return S.Stats[fn](...args);
}

for (const c of cases) {
  test(`matches SciPy: ${c.label}`, () => {
    const got = [pick(run(c.cmd), c.path)].flat().map(Number);
    assert.equal(got.length, c.ref.length, 'result length');
    got.forEach((g, i) => {
      const r = c.ref[i], err = Math.abs(g - r) / Math.max(1, Math.abs(r));
      assert.ok(err <= c.tol, `item ${i}: got ${g}, expected ${r} (relative error ${err.toExponential(2)} > ${c.tol})`);
    });
  });
}

test("Dunnett's distribution matches high-precision integration (10 digits)", () => {
  const lam = Math.SQRT1_2, L = [lam, lam, lam];
  for (const [c, exact] of [[1.5, 0.6763830520], [2.2, 0.9090204029], [2.48, 0.9496668339], [3.1, 0.9880720327]]) {
    assert.ok(Math.abs(S.Stats.dunnettCdf(c, L, 28) - exact) < 2e-10, `c = ${c}`);
  }
});

test('Dunnett critical value matches the published table (k = 3, df = 20, two-sided 5%: 2.54)', () => {
  const lam = Math.SQRT1_2, cdf = (c) => S.Stats.dunnettCdf(c, [lam, lam, lam], 20);
  let lo = 0, hi = 5;
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (cdf(mid) < 0.95) lo = mid; else hi = mid; }
  assert.equal(+lo.toFixed(2), 2.54);
});

test('existing default analyses are unchanged (Holm-adjusted Welch after ANOVA)', () => {
  const G = [[10.1, 9.8, 11.2, 10.5, 9.9, 10.7], [12.3, 11.8, 13.1, 12.6, 12.0, 12.9], [10.4, 10.9, 10.2, 11.1, 10.6, 10.0]];
  const r = S.groupAnalysis(G, ['A', 'B', 'C'], { test: 'welch' });
  assert.match(r.lines[0], /^One-way ANOVA: F\(2, 15\)/);
  assert.match(r.lines[1], /Holm-adjusted/);
  assert.deepEqual(r.brackets.map((b) => [b.a, b.b]), [[0, 1], [1, 2]]);
});

test('named follow-up tests replace Holm only when chosen, and fall back with a note when unsuitable', () => {
  const G = [[10.1, 9.8, 11.2, 10.5, 9.9, 10.7], [12.3, 11.8, 13.1, 12.6, 12.0, 12.9], [10.4, 10.9, 10.2, 11.1, 10.6, 10.0]];
  const tk = S.groupAnalysis(G, ['A', 'B', 'C'], { test: 'welch', posthoc: 'tukey' });
  assert.ok(tk.lines.some((l) => /Tukey/.test(l)));
  const fb = S.groupAnalysis(G, ['A', 'B', 'C'], { test: 'mw', posthoc: 'tukey' });
  assert.ok(fb.lines.some((l) => /doesn't apply/.test(l)));
  const none = S.groupAnalysis(G, ['A', 'B', 'C'], { test: 'welch', posthoc: 'none' });
  assert.equal(none.brackets.length, 0);
});

test('one-sample tests report each group against the chosen value', () => {
  const r = S.groupAnalysis([[5.1, 4.9, 5.3, 5.2], [6.0, 6.2, 5.9, 6.1]], ['A', 'B'], { test: 'onesample', mu: 5 });
  assert.equal(r.lines.filter((l) => / vs 5:/.test(l)).length, 2);
  assert.equal(r.brackets.length, 0);
});

test('lognormal tests refuse values ≤ 0', () => {
  const r = S.groupAnalysis([[1, 2, 0], [3, 4, 5]], ['A', 'B'], { test: 'lognormal' });
  assert.match(r.lines[0], /> 0/);
});

test('Grubbs flags one clear outlier and nothing in clean data', () => {
  assert.deepEqual(S.Stats.grubbs([2.1, 2.3, 2.2, 2.4, 2.25, 2.35, 2.15, 2.3, 2.2, 4.0]), [4.0]);
  assert.deepEqual(S.Stats.grubbs([1, 2, 3, 4, 5, 6, 7, 8]), []);
});

test('Fisher exact handles the degenerate all-in-one-cell table', () => {
  assert.equal(S.Stats.fisher2x2([[5, 0], [0, 5]]).p.toFixed(6), (2 / 252).toFixed(6));
});
