// Every chart kind renders its example data without errors or invalid numbers.
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('./load-charts');

for (const [kind, label] of C.CHART_KINDS) {
  test(`renders example data: ${label}`, () => {
    const cfg = { kind, data: C.SAMPLE_DATA[kind], test: 'auto', error: 'sd', showPoints: true };
    for (const o of (C.CHART_META[kind] && C.CHART_META[kind].opts) || []) if (o.def != null) cfg[o.key] = o.def;
    const r = C.renderChart(cfg, 440, 340);
    assert.ok(r.svg.length > 200, 'drew something');
    assert.doesNotMatch(r.svg, /Can't plot|NaN|undefined|Infinity/);
    assert.doesNotMatch(r.report.join('\n'), /NaN|undefined/);
  });
}

test('every curve-fit model fits data generated from itself', () => {
  const S = require('./load-stats');
  const truth = { michaelis: [10, 4], onesite: [200, 12], expgrowth: [2, 0.3], expplateau: [1, 10, 0.4], logisticgrowth: [0.5, 10, 0.8], gompertz: [0.5, 10, 0.6], onephase: [100, 10, 0.5], twophase: [5, 40, 1.5, 30, 0.15], dr3: [5, 95, -7], dr3inh: [5, 95, -7], dr4: [5, 95, -7, 1.3], dr5: [5, 95, -7, 1.3, 0.7] };
  for (const [key, p] of Object.entries(truth)) {
    const M = S.CURVE_MODELS[key], log = M.xform === 'log10';
    const xs = log ? Array.from({ length: 13 }, (_, i) => 10 ** (-10 + i * 0.5)) : Array.from({ length: 13 }, (_, i) => (key === 'expgrowth' ? i * 0.6 : i * 1.5 + (key.includes('phase') ? 0 : 0.25)));
    const ys = xs.map((x) => M.f(log ? Math.log10(x) : x, p));
    const fit = S.fitCurve(key, xs, ys);
    assert.ok(!fit.error, `${key}: ${fit.error}`);
    assert.ok(fit.r2 > 0.99999, `${key}: R² ${fit.r2}`);
  }
});
