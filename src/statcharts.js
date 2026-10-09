// Statistics & models chart kinds (v0.9): contingency tables (χ² / Fisher / OR / RR), ROC curves (DeLong),
// Bland–Altman, Deming regression, multiple linear regression, n-way factorial ANOVA, and nonlinear curve
// fitting (enzyme kinetics, binding, growth, decay, 3/4/5-parameter dose–response, extra-sum-of-squares F).
// Same pattern as omics.js: an EXTRA_CHARTS renderer per kind, with CHART_META for hints and options.
// Statistics come from stats3.js.

const STATS_HEAD = 'Statistics & models';
const scEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const fmt3 = (v) => (!isFinite(v) ? 'n/a' : Math.abs(v) >= 1e4 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(2) : +v.toPrecision(4));
const supNum = (n) => String(n).split('').map((d) => ({ '-': '⁻' })[d] || '⁰¹²³⁴⁵⁶⁷⁸⁹'[d] || d).join('');
const isNumCol = (t, k) => t.cols[k] && t.cols[k].filter(isFinite).length >= Math.max(1, t.raw[k].filter((x) => String(x).trim() !== '').length * 0.8);
function legendBox(items, x, y) { // items: [{ name, color, dash }]
  return items.map((it, i) => `<line x1="${x}" x2="${x + 16}" y1="${y + i * 14}" y2="${y + i * 14}" stroke="${it.color}" stroke-width="2"${it.dash ? ' stroke-dasharray="4 3"' : ''}/><text x="${x + 20}" y="${y + i * 14 + 4}" font-size="10">${scEsc(it.name)}</text>`).join('');
}

// ---------- Contingency table ----------
CHART_KINDS.push(['contingency', 'Contingency table (χ², Fisher, odds ratio)', STATS_HEAD]);
SAMPLE_DATA.contingency = 'Group,Responded,Did not respond\nDrug,24,11\nPlacebo,13,22';
CHART_META.contingency = { hint: 'Either a table of counts (first column = group, header = outcomes), or raw data with one row per subject: Group, Outcome — it is cross-tabulated for you.', labels: ['', '% of group'], noTransform: true,
  opts: [{ key: 'yates', label: 'Yates correction (2×2 χ²)', type: 'check', def: false }, { key: 'counts', label: 'Show counts instead of %', type: 'check', def: false }] };
function contingencyFrom(t) {
  const numeric = t.headers.slice(1).every((_, k) => isNumCol(t, k + 1));
  if (numeric && t.headers.length >= 3) return { rows: t.raw[0].map((s) => String(s).trim()), cols: t.headers.slice(1), table: t.raw[0].map((_, i) => t.cols.slice(1).map((c) => c[i] || 0)) };
  // raw two-column data → cross-tabulate
  const a = t.raw[0].map((s) => String(s).trim()), b = (t.raw[1] || []).map((s) => String(s).trim());
  const keep = a.map((x, i) => x && b[i]);
  const rows = [...new Set(a.filter((_, i) => keep[i]))], cols = [...new Set(b.filter((_, i) => keep[i]))];
  const table = rows.map((r) => cols.map((c) => a.filter((x, i) => keep[i] && x === r && b[i] === c).length));
  return { rows, cols, table, crossTab: true };
}
EXTRA_CHARTS.contingency = (cfg, t, w, h, pal) => {
  const { rows, cols, table, crossTab } = contingencyFrom(t);
  if (rows.length < 2 || cols.length < 2) throw new Error('needs at least 2 groups and 2 outcomes');
  const report = [];
  if (crossTab) report.push(`Cross-tabulated ${sumAll(table)} subjects: ${rows.length} groups × ${cols.length} outcomes.`);
  report.push(rows.map((r, i) => `${r}: ${cols.map((c, j) => `${c} ${table[i][j]}`).join(', ')}`).join('; '));
  const chi = Stats.chiSquare(table, !!cfg.yates);
  if (cfg.test !== 'none') {
    report.push(`${chi.name}: χ²(${chi.df}) = ${chi.chi.toFixed(3)}, ${fmtP(chi.p)}; Cramér's V = ${chi.cramersV.toFixed(3)}`);
    if (rows.length === 2 && cols.length === 2) {
      const f = Stats.fisher2x2(table), o = Stats.oddsRisk(table);
      report.push(`${f.name}: two-sided ${fmtP(f.p)}`);
      report.push(`Odds ratio (${rows[0]} vs ${rows[1]}, outcome "${cols[0]}") = ${fmt3(o.or)} (95% CI ${fmt3(o.orLo)}–${fmt3(o.orHi)}); relative risk = ${fmt3(o.rr)} (95% CI ${fmt3(o.rrLo)}–${fmt3(o.rrHi)}); risk difference = ${(o.riskDiff * 100).toFixed(1)} percentage points${o.corrected ? ' (0.5 added to every cell because one was zero)' : ''}`);
      if (chi.smallCells) report.push(`${chi.smallCells} expected count(s) below 5 — use Fisher's exact test.`);
    } else if (chi.smallCells) report.push(`${chi.smallCells} of ${rows.length * cols.length} expected counts are below 5, so the χ² p-value may be unreliable; consider merging categories.`);
  }
  // 100% stacked bars (or counts)
  const pct = !cfg.counts, tot = table.map((r) => r.reduce((s, v) => s + v, 0));
  const yMax = pct ? 100 : Math.max(...tot);
  const f = axesFrame(cfg, w - 92, h, { xCats: rows, yTicks: pct ? [0, 25, 50, 75, 100] : niceTicks(0, yMax) });
  let s = f.s;
  const bw = f.band * 0.6;
  rows.forEach((r, i) => {
    let acc = 0;
    cols.forEach((c, j) => {
      const v = pct ? (100 * table[i][j]) / (tot[i] || 1) : table[i][j];
      const y1 = f.Y(acc), y2 = f.Y(acc + v);
      s += `<rect x="${f.X(i) - bw / 2}" y="${y2}" width="${bw}" height="${Math.max(0, y1 - y2)}" fill="${pal[j % pal.length]}" stroke="#fff" stroke-width="0.6"/>`;
      if (y1 - y2 > 13) s += `<text x="${f.X(i)}" y="${(y1 + y2) / 2 + 4}" text-anchor="middle" fill="#fff" font-size="10">${pct ? `${Math.round(v)}%` : v}</text>`;
      acc += v;
    });
  });
  s += cols.map((c, j) => `<rect x="${w - 86}" y="${f.m.t + j * 16}" width="10" height="10" fill="${pal[j % pal.length]}"/><text x="${w - 72}" y="${f.m.t + j * 16 + 9}" font-size="10">${scEsc(c)}</text>`).join('');
  if (cfg.test !== 'none') s += `<text x="${f.m.l + f.pw / 2}" y="${f.m.t - 4}" text-anchor="middle" font-size="11">${rows.length === 2 && cols.length === 2 ? `Fisher's exact ${fmtP(Stats.fisher2x2(table).p)}` : `χ² ${fmtP(chi.p)}`}</text>`;
  return { svg: s + titles(cfg, w, h, f), report };
};
const sumAll = (tab) => tab.flat().reduce((s, v) => s + v, 0);

// ---------- ROC curve ----------
CHART_KINDS.push(['roc', 'ROC curve (AUC, cut-off, DeLong comparison)', STATS_HEAD]);
SAMPLE_DATA.roc = (() => {
  let r = 11; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const g = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  const rows = ['Diagnosis,Biomarker A,Biomarker B'];
  for (let i = 0; i < 60; i++) { const d = i % 2 ? 'Disease' : 'Healthy', s = d === 'Disease'; rows.push(`${d},${(10 + (s ? 6 : 0) + 4 * g()).toFixed(1)},${(50 + (s ? 9 : 0) + 12 * g()).toFixed(0)}`); }
  return rows.join('\n');
})();
CHART_META.roc = { hint: 'First column = true outcome (1 / 0, or two labels such as Disease / Healthy), then one column of scores per marker. Higher scores are assumed to mean "positive"; markers that run the other way are flipped and noted.', labels: ['1 − specificity (false-positive rate)', 'Sensitivity (true-positive rate)'], noTransform: true,
  opts: [{ key: 'positive', label: 'Positive label', type: 'text', def: '', placeholder: 'auto (e.g. Disease)' }, { key: 'cutoff', label: 'Mark best cut-off (Youden)', type: 'check', def: true }] };
function rocOutcome(raw, positive) {
  const vals = raw.map((s) => String(s).trim());
  const uniq = [...new Set(vals.filter(Boolean))];
  if (uniq.length !== 2) throw new Error(`the outcome column needs exactly 2 values (found ${uniq.length})`);
  let pos = positive && uniq.includes(String(positive).trim()) ? String(positive).trim() : null;
  if (!pos) pos = uniq.find((u) => u === '1') || uniq.find((u) => /^(disease|diseased|case|cases|positive|pos|yes|true|tumou?r|cancer|patient|sick|responder|event)$/i.test(u)) || uniq[1];
  return { labels: vals.map((v) => (v === pos ? 1 : v ? 0 : NaN)), pos, neg: uniq.find((u) => u !== pos) };
}
EXTRA_CHARTS.roc = (cfg, t, w, h, pal) => {
  const { labels, pos, neg } = rocOutcome(t.raw[0], cfg.positive);
  const markers = t.headers.slice(1).map((name, k) => ({ name, scores: t.cols[k + 1] })).filter((m) => m.scores && m.scores.some(isFinite));
  if (!markers.length) throw new Error('needs one or more numeric score columns after the outcome');
  const report = [`Positive = "${pos}", negative = "${neg}".`];
  const f = axesFrame(cfg, w, h, { xTicks: [0, 0.2, 0.4, 0.6, 0.8, 1], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1] });
  let s = f.s + `<line x1="${f.X(0)}" y1="${f.Y(0)}" x2="${f.X(1)}" y2="${f.Y(1)}" stroke="#aaa" stroke-dasharray="4 3"/>`;
  const leg = [];
  markers.forEach((m, k) => {
    const r = Stats.roc(m.scores, labels);
    if (!r) { report.push(`${m.name}: needs both positive and negative cases.`); return; }
    m.r = r;
    const col = pal[k % pal.length];
    s += `<path d="${r.pts.map((p, i) => `${i ? 'L' : 'M'}${f.X(p.fpr).toFixed(1)} ${f.Y(p.tpr).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2"/>`;
    if (cfg.cutoff !== false && r.best.t !== undefined) s += `<circle cx="${f.X(1 - r.best.spec)}" cy="${f.Y(r.best.sens)}" r="4" fill="#fff" stroke="${col}" stroke-width="2"/>`;
    leg.push({ name: `${m.name} AUC ${r.auc.toFixed(3)}`, color: col });
    report.push(`${m.name}: AUC = ${r.auc.toFixed(3)} (95% CI ${r.lo.toFixed(3)}–${r.hi.toFixed(3)}, DeLong), vs 0.5 ${fmtP(r.p)}; n = ${r.nPos} positive, ${r.nNeg} negative${r.dir < 0 ? '; lower scores indicate positive, so the marker was flipped' : ''}. Best cut-off (Youden) ${r.dir < 0 ? '≤' : '≥'} ${fmt3(r.best.t)}: sensitivity ${(100 * r.best.sens).toFixed(1)}%, specificity ${(100 * r.best.spec).toFixed(1)}%.`);
  });
  const ok = markers.filter((m) => m.r && m.r.dir > 0);
  for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) {
    const d = Stats.delongPaired(ok[i].scores, ok[j].scores, labels);
    if (d) report.push(`${d.name}, ${ok[i].name} vs ${ok[j].name}: ΔAUC = ${(d.aucA - d.aucB).toFixed(3)}, z = ${d.z.toFixed(2)}, ${fmtP(d.p)}`);
  }
  s += legendBox(leg, f.X(0.45), f.Y(0.06) - 14 * (leg.length - 1));
  return { svg: s + titles(cfg, w, h, f), report };
};

// ---------- Bland–Altman ----------
CHART_KINDS.push(['blandaltman', 'Bland–Altman (agreement of two methods)', STATS_HEAD]);
SAMPLE_DATA.blandaltman = 'Method A,Method B\n102,105\n88,86\n130,134\n95,99\n110,108\n76,80\n121,125\n140,147\n99,98\n85,89\n117,119\n128,131\n92,95\n105,110\n111,112\n83,85\n136,141\n97,97\n124,129\n101,104';
CHART_META.blandaltman = { hint: 'Two columns: the same samples measured by method A and method B. Plots the difference against the mean, with the bias and 95% limits of agreement.', labels: ['Mean of A and B', 'A − B'], noTransform: true,
  opts: [{ key: 'pctDiff', label: 'Difference as % of the mean', type: 'check', def: false }, { key: 'baCI', label: 'Show 95% CIs of bias and limits', type: 'check', def: true }] };
EXTRA_CHARTS.blandaltman = (cfg, t, w, h, pal) => {
  if (!t.cols[1]) throw new Error('needs two columns (method A, method B)');
  const ba = Stats.blandAltman(t.cols[0], t.cols[1], { percent: !!cfg.pctDiff });
  if (ba.n < 3) throw new Error('needs at least 3 paired measurements');
  const lo = Math.min(...ba.diff, ba.loaCI[0][0]), hi = Math.max(...ba.diff, ba.loaCI[1][1]);
  const f = axesFrame(cfg, w - 70, h, { xTicks: niceTicks(Math.min(...ba.mean), Math.max(...ba.mean)), yTicks: yRange(cfg, lo, hi) });
  let s = f.s;
  const x0 = f.m.l, x1 = f.m.l + f.pw, col = pal[0];
  const band = (a, b, c) => `<rect x="${x0}" y="${f.Y(b)}" width="${f.pw}" height="${Math.max(0, f.Y(a) - f.Y(b))}" fill="${c}" opacity="0.13"/>`;
  if (cfg.baCI !== false) s += band(ba.biasLo, ba.biasHi, '#4a7fd6') + band(...ba.loaCI[0], '#d6584a') + band(...ba.loaCI[1], '#d6584a');
  const hline = (v, c, dash, label) => `<line x1="${x0}" x2="${x1}" y1="${f.Y(v)}" y2="${f.Y(v)}" stroke="${c}" stroke-width="1.5"${dash ? ' stroke-dasharray="5 4"' : ''}/><text x="${x1 + 4}" y="${f.Y(v) + 4}" font-size="10" fill="${c}">${label}</text>`;
  s += hline(0, '#999', true, '');
  s += hline(ba.bias, '#23395d', false, `Bias ${fmt3(ba.bias)}`) + hline(ba.loa[0], '#c0392b', true, `−1.96 SD ${fmt3(ba.loa[0])}`) + hline(ba.loa[1], '#c0392b', true, `+1.96 SD ${fmt3(ba.loa[1])}`);
  ba.mean.forEach((m, i) => { s += `<circle cx="${f.X(m)}" cy="${f.Y(ba.diff[i])}" r="3.2" fill="${col}" fill-opacity="0.75"/>`; });
  const u = cfg.pctDiff ? '%' : '';
  const report = [
    `n = ${ba.n} pairs. Bias (mean A − B${cfg.pctDiff ? ', % of mean' : ''}) = ${fmt3(ba.bias)}${u} (95% CI ${fmt3(ba.biasLo)} to ${fmt3(ba.biasHi)}), ${ba.pBias < 0.05 ? 'significantly different from 0' : 'not significantly different from 0'} (${fmtP(ba.pBias)}).`,
    `95% limits of agreement: ${fmt3(ba.loa[0])}${u} to ${fmt3(ba.loa[1])}${u} (SD of differences ${fmt3(ba.sd)}). CI of lower limit ${fmt3(ba.loaCI[0][0])} to ${fmt3(ba.loaCI[0][1])}; upper ${fmt3(ba.loaCI[1][0])} to ${fmt3(ba.loaCI[1][1])}.`,
    `Proportional bias check (difference vs mean): slope ${fmt3(ba.propSlope)}, ${fmtP(ba.propP)}${ba.propP < 0.05 ? ' — the difference changes with magnitude; consider the % difference view or a log transform.' : '.'}`,
    'Whether these limits are acceptable is a clinical judgement, decided before looking at the data.',
  ];
  return { svg: s + titles(cfg, w - 70, h, f), report };
};

// ---------- Deming regression ----------
CHART_KINDS.push(['deming', 'Deming regression (both variables measured with error)', STATS_HEAD]);
SAMPLE_DATA.deming = SAMPLE_DATA.blandaltman;
CHART_META.deming = { hint: 'Two columns: X and Y, both measured with error (e.g. two assays on the same samples). Set the ratio of the error variances if known (1 = equal; orthogonal regression).', labels: ['Method A', 'Method B'], noTransform: true,
  opts: [{ key: 'delta', label: 'Error variance ratio (Y / X)', def: 1 }, { key: 'showOls', label: 'Also show ordinary (OLS) line', type: 'check', def: false }] };
EXTRA_CHARTS.deming = (cfg, t, w, h, pal) => {
  const pts = t.cols[0].map((x, i) => [x, t.cols[1]?.[i]]).filter(([x, y]) => isFinite(x) && isFinite(y));
  if (pts.length < 4) throw new Error('needs two numeric columns with at least 4 rows');
  const x = pts.map((p) => p[0]), y = pts.map((p) => p[1]), delta = isFinite(+cfg.delta) && +cfg.delta > 0 ? +cfg.delta : 1;
  const d = Stats.deming(x, y, delta), ols = Stats.linreg(x, y);
  const lo = Math.min(...x, ...y), hi = Math.max(...x, ...y);
  // Same scale on both axes, so the line of identity sits at 45°.
  const common = niceTicks(lo, hi);
  const f = axesFrame(cfg, w, h, { xTicks: common, yTicks: common });
  const xa = f.X.bind(null), X0 = common[0], X1 = common[common.length - 1];
  const clipLine = (a, b, c, dash, wdt = 2) => `<line x1="${xa(X0)}" y1="${f.Y(a + b * X0)}" x2="${xa(X1)}" y2="${f.Y(a + b * X1)}" stroke="${c}" stroke-width="${wdt}"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
  let s = `<defs><clipPath id="dm-clip"><rect x="${f.m.l}" y="${f.m.t}" width="${f.pw}" height="${f.ph}"/></clipPath></defs>` + f.s + `<g clip-path="url(#dm-clip)">`;
  s += clipLine(0, 1, '#aaa', true, 1.2) + clipLine(d.intercept, d.slope, pal[0]) + (cfg.showOls ? clipLine(ols.intercept, ols.slope, pal[1], true, 1.5) : '');
  pts.forEach(([a, b]) => { s += `<circle cx="${xa(a)}" cy="${f.Y(b)}" r="3.2" fill="${pal[0]}" fill-opacity="0.6"/>`; });
  s += '</g>' + legendBox([{ name: 'Deming', color: pal[0] }, ...(cfg.showOls ? [{ name: 'OLS', color: pal[1], dash: true }] : []), { name: 'Line of identity', color: '#aaa', dash: true }], f.m.l + 10, f.m.t + 10);
  const report = [
    `Deming regression (error variance ratio ${delta}; CIs by jackknife): slope = ${fmt3(d.slope)} (95% CI ${fmt3(d.slopeCI[0])} to ${fmt3(d.slopeCI[1])}), intercept = ${fmt3(d.intercept)} (95% CI ${fmt3(d.interceptCI[0])} to ${fmt3(d.interceptCI[1])}).`,
    `Slope vs 1: ${fmtP(d.pSlope1)} (${d.pSlope1 < 0.05 ? 'proportional difference' : 'no evidence of proportional difference'}); intercept vs 0: ${fmtP(d.pIntercept0)} (${d.pIntercept0 < 0.05 ? 'constant difference' : 'no evidence of constant difference'}).`,
    `For comparison, ordinary least squares gives slope ${fmt3(ols.slope)}, which is biased toward 0 when X has measurement error. n = ${pts.length}, range ${fmt3(lo)}–${fmt3(hi)}.`,
  ];
  return { svg: s + titles(cfg, w, h, f), report };
};

// ---------- Multiple linear regression ----------
CHART_KINDS.push(['mlr', 'Multiple linear regression', STATS_HEAD]);
SAMPLE_DATA.mlr = (() => {
  let r = 5; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const rows = ['Systolic BP,Age,BMI,Sodium (g/day),Sex'];
  for (let i = 0; i < 40; i++) { const age = 30 + Math.round(rnd() * 40), bmi = +(20 + rnd() * 14).toFixed(1), na = +(2 + rnd() * 3).toFixed(1), sex = rnd() < 0.5 ? 'F' : 'M'; rows.push(`${(90 + 0.55 * age + 0.9 * bmi + 3 * na + (sex === 'M' ? 4 : 0) + (rnd() - 0.5) * 16).toFixed(0)},${age},${bmi},${na},${sex}`); }
  return rows.join('\n');
})();
CHART_META.mlr = { hint: 'First column = outcome (Y), then one column per predictor. Text columns (e.g. Sex) are coded as indicator variables against their first level. Rows with a missing value are dropped.', labels: ['Predicted', 'Observed'], noTransform: true };
EXTRA_CHARTS.mlr = (cfg, t, w, h, pal) => {
  if (t.headers.length < 2) throw new Error('needs an outcome column and at least one predictor');
  const n0 = t.raw[0].length, names = [], design = Array.from({ length: n0 }, () => []), refs = [];
  t.headers.slice(1).forEach((hd, j) => {
    const k = j + 1;
    if (isNumCol(t, k)) { names.push(hd); t.cols[k].forEach((v, i) => design[i].push(v)); }
    else {
      const lv = [...new Set(t.raw[k].map((s) => String(s).trim()).filter(Boolean))];
      refs.push(`${hd} (reference: ${lv[0]})`);
      lv.slice(1).forEach((l) => { names.push(`${hd}: ${l}`); t.raw[k].forEach((v, i) => design[i].push(String(v).trim() ? (String(v).trim() === l ? 1 : 0) : NaN)); });
    }
  });
  const rows = design.map((r, i) => ({ x: r, y: t.cols[0][i] })).filter((r) => isFinite(r.y) && r.x.every(isFinite));
  if (rows.length <= names.length + 1) throw new Error(`needs more rows than predictors (have ${rows.length} complete rows)`);
  const m = Stats.multipleRegression(rows.map((r) => r.x), rows.map((r) => r.y), names);
  const y = rows.map((r) => r.y), lo = Math.min(...y, ...m.fitted), hi = Math.max(...y, ...m.fitted);
  const ticks = niceTicks(lo, hi);
  const f = axesFrame(cfg, w, h, { xTicks: ticks, yTicks: ticks });
  let s = f.s + `<line x1="${f.X(ticks[0])}" y1="${f.Y(ticks[0])}" x2="${f.X(ticks[ticks.length - 1])}" y2="${f.Y(ticks[ticks.length - 1])}" stroke="#aaa" stroke-dasharray="4 3"/>`;
  m.fitted.forEach((v, i) => { s += `<circle cx="${f.X(v)}" cy="${f.Y(y[i])}" r="3.2" fill="${pal[0]}" fill-opacity="0.65"/>`; });
  s += `<text x="${f.m.l + 8}" y="${f.m.t + 12}" font-size="11">R² = ${m.r2.toFixed(3)}, adj. R² = ${m.adjR2.toFixed(3)}</text>`;
  const report = [
    `Outcome: ${t.headers[0]}; n = ${m.n} complete rows${rows.length < n0 ? ` (${n0 - rows.length} dropped for missing values)` : ''}.${refs.length ? ` Categorical: ${refs.join('; ')}.` : ''}`,
    `Model: F(${m.d1}, ${m.d2}) = ${m.F.toFixed(3)}, ${fmtP(m.p)}; R² = ${m.r2.toFixed(3)}, adjusted R² = ${m.adjR2.toFixed(3)}, residual SD = ${fmt3(m.sy)}.`,
    'Coefficient (95% CI), p:',
    ...m.coefs.map((c, i) => `  ${c.name}: ${fmt3(c.b)} (${fmt3(c.lo)} to ${fmt3(c.hi)}), ${fmtP(c.p)} ${stars(c.p)}${i && m.vif[i - 1] > 5 ? ` — VIF ${m.vif[i - 1].toFixed(1)}: strongly correlated with other predictors` : ''}`),
    'Each coefficient is the change in the outcome per unit of that predictor, holding the others fixed. Check residuals before trusting p-values.',
  ];
  return { svg: s + titles(cfg, w, h, f), report };
};

// ---------- Factorial (n-way) ANOVA ----------
CHART_KINDS.push(['anova3', 'Three-way (factorial) ANOVA', STATS_HEAD]);
SAMPLE_DATA.anova3 = (() => {
  let r = 3; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  const rows = ['Genotype,Treatment,Sex,Value'];
  for (const g of ['WT', 'KO']) for (const tr of ['Vehicle', 'Drug']) for (const sx of ['F', 'M']) for (let k = 0; k < 4; k++) rows.push(`${g},${tr},${sx},${(10 + (g === 'KO' ? 4 : 0) + (tr === 'Drug' ? -1 : 0) + (g === 'KO' && tr === 'Drug' ? -3 : 0) + (sx === 'M' ? 1 : 0) + (rnd() - 0.5) * 3).toFixed(2)}`);
  return rows.join('\n');
})();
CHART_META.anova3 = { hint: 'Long format, one row per measurement: each factor in its own text column, then the value in the last column (2, 3 or 4 factors). Bars show mean ± error, split into panels by the last factor.', labels: ['', 'Value'], noTransform: true };
EXTRA_CHARTS.anova3 = (cfg, t, w, h, pal) => {
  const vk = t.headers.length - 1;
  if (vk < 2 || vk > 4) throw new Error('needs 2–4 factor columns followed by a value column');
  const rows = t.raw[0].map((_, i) => ({ f: t.raw.slice(0, vk).map((c) => String(c[i]).trim()), v: t.cols[vk][i] })).filter((r) => r.f.every(Boolean) && isFinite(r.v));
  const names = t.headers.slice(0, vk), levels = names.map((_, k) => [...new Set(rows.map((r) => r.f[k]))]);
  const res = Stats.factorialAnova(names.map((_, k) => rows.map((r) => r.f[k])), rows.map((r) => r.v), names);
  if (!res) throw new Error('not enough replicates: every combination needs at least 2 values');
  // panels by the last factor; groups = first factor; colours = second factor (if any)
  const panelK = vk >= 3 ? vk - 1 : -1, panels = panelK >= 0 ? levels[panelK] : [''], colK = 1, xK = 0;
  const err = cfg.error || 'sd', cell = (pred) => rows.filter(pred).map((r) => r.v);
  const allTop = [];
  levels[xK].forEach((a) => levels[colK].forEach((b) => panels.forEach((p) => { const g = cell((r) => r.f[xK] === a && r.f[colK] === b && (panelK < 0 || r.f[panelK] === p)); if (g.length) allTop.push(Stats.mean(g) + errOf(g, err)); })));
  const yt = yRange(cfg, Math.min(0, ...rows.map((r) => r.v)), Math.max(...allTop) * 1.05);
  const legW = 80, pwAll = w - legW;
  let s = '';
  panels.forEach((p, pi) => {
    const fw = pwAll / panels.length, sub = { ...cfg, title: '', yLabel: pi ? '' : cfg.yLabel, xLabel: cfg.xLabel };
    const f = axesFrame(sub, fw, h, { xCats: levels[xK], yTicks: yt });
    s += `<g transform="translate(${pi * fw} 0)">${f.s}`;
    if (p) s += `<text x="${f.m.l + f.pw / 2}" y="${f.m.t - 4}" text-anchor="middle" font-weight="700">${scEsc(names[panelK])}: ${scEsc(p)}</text>`;
    const nb = levels[colK].length, bw = (f.band * 0.8) / nb;
    levels[xK].forEach((a, i) => levels[colK].forEach((b, j) => {
      const g = cell((r) => r.f[xK] === a && r.f[colK] === b && (panelK < 0 || r.f[panelK] === p));
      if (!g.length) return;
      const x = f.X(i) - (f.band * 0.8) / 2 + bw * (j + 0.5), mu = Stats.mean(g), e = errOf(g, err);
      s += `<rect x="${x - bw * 0.42}" y="${f.Y(mu)}" width="${bw * 0.84}" height="${Math.max(0, f.Y(yt[0] < 0 ? 0 : yt[0]) - f.Y(mu))}" fill="${pal[j % pal.length]}"/>`;
      if (e) s += `<path d="M${x} ${f.Y(mu - e)}V${f.Y(mu + e)}M${x - 4} ${f.Y(mu + e)}H${x + 4}M${x - 4} ${f.Y(mu - e)}H${x + 4}" stroke="#333" fill="none"/>`;
      if (cfg.showPoints) g.forEach((v, q) => { s += `<circle cx="${x + ((q % 5) - 2) * 1.6}" cy="${f.Y(v)}" r="1.8" fill="#333" fill-opacity="0.55"/>`; });
    }));
    if (!pi && cfg.title) s += `<text x="${pwAll / 2}" y="18" text-anchor="middle" font-size="14" font-weight="700">${scEsc(cfg.title)}</text>`;
    s += titles({ xLabel: sub.xLabel, yLabel: sub.yLabel }, fw, h, f) + '</g>';
  });
  s += `<text x="${w - legW + 6}" y="${(cfg.title ? 34 : 14) + 4}" font-weight="700" font-size="10">${scEsc(names[colK])}</text>` + levels[colK].map((b, j) => `<rect x="${w - legW + 6}" y="${(cfg.title ? 34 : 14) + 12 + j * 15}" width="10" height="10" fill="${pal[j % pal.length]}"/><text x="${w - legW + 20}" y="${(cfg.title ? 34 : 14) + 21 + j * 15}" font-size="10">${scEsc(b)}</text>`).join('');
  const report = [`${res.name}, n = ${rows.length}; residual df = ${res.dfE}, MSE = ${fmt3(res.mse)}. Bars: mean ± ${errName(err)}.`, ...res.rows.map((r) => `  ${r.term}: F(${r.df}, ${res.dfE}) = ${r.F.toFixed(3)}, ${fmtP(r.p)} ${stars(r.p)}`), 'A significant interaction means the effect of one factor depends on the level of another; interpret main effects with care when it is present.'];
  return { svg: s, report };
};

// ---------- Nonlinear curve fitting ----------
CHART_KINDS.push(['curvefit', 'Curve fit (kinetics, binding, growth, decay, dose–response)', STATS_HEAD]);
SAMPLE_DATA.curvefit = 'Substrate (µM),Wild type,Wild type,Mutant,Mutant\n0.5,0.9,1.1,0.5,0.6\n1,1.8,1.6,0.9,1.1\n2,3.1,3.3,1.9,1.7\n4,5.0,4.7,3.0,3.2\n8,6.6,6.9,4.6,4.4\n16,8.1,7.8,5.8,6.1\n32,8.9,9.2,6.9,6.6\n64,9.5,9.6,7.3,7.5';
CHART_META.curvefit = { hint: 'First column = X; then one column per dataset. Repeat a header name for replicates (e.g. Wild type, Wild type, Mutant, Mutant) — every replicate point is fitted, and the plot shows mean ± SD. Dose–response models need doses > 0 (plotted on a log axis).', labels: ['X', 'Y'], noTransform: true,
  opts: [{ key: 'model', label: 'Model', type: 'select', def: 'michaelis', options: Object.entries(CURVE_MODELS).map(([k, m]) => [k, m.label]) }, { key: 'compare', label: 'Compare datasets (extra sum-of-squares F test)', type: 'check', def: true }, { key: 'ecx', label: 'Also report ECx / ICx at %', placeholder: 'e.g. 90' }, { key: 'cband', label: 'Show 95% confidence band', type: 'check', def: false }] };
EXTRA_CHARTS.curvefit = (cfg, t, w, h, pal) => {
  const M = CURVE_MODELS[cfg.model] || CURVE_MODELS.michaelis, key = CURVE_MODELS[cfg.model] ? cfg.model : 'michaelis';
  const xs = t.cols[0], names = [...new Set(t.headers.slice(1))];
  const sets = names.map((name) => {
    const ks = t.headers.map((hd, k) => (k && hd === name ? k : -1)).filter((k) => k > 0), x = [], y = [];
    ks.forEach((k) => xs.forEach((v, i) => { if (isFinite(v) && isFinite(t.cols[k][i])) { x.push(v); y.push(t.cols[k][i]); } }));
    return { name, x, y, reps: ks.length };
  }).filter((d) => d.x.length);
  if (!sets.length) throw new Error('needs an X column and at least one Y column');
  const logX = M.xform === 'log10';
  if (logX && sets.some((d) => d.x.some((v) => v <= 0))) sets.forEach((d) => { const keep = d.x.map((v) => v > 0); d.x = d.x.filter((_, i) => keep[i]); d.y = d.y.filter((_, i) => keep[i]); });
  const report = [`Model: ${M.label}${M.xform === 'log10' ? ', fitted against log₁₀(X)' : ''}. Least squares (Levenberg–Marquardt); SEs from the covariance matrix, 95% CIs with t(n − p).`];
  const allX = sets.flatMap((d) => d.x), allY = sets.flatMap((d) => d.y);
  const tx = logX ? (v) => Math.log10(v) : (v) => v;
  const xLo = Math.min(...allX.map(tx)), xHi = Math.max(...allX.map(tx));
  const xticks = logX ? Array.from({ length: Math.ceil(xHi) - Math.floor(xLo) + 1 }, (_, i) => Math.floor(xLo) + i) : niceTicks(Math.min(0, xLo), xHi);
  const fits = sets.map((d) => ({ d, fit: fitCurve(key, d.x, d.y) }));
  const fy = fits.flatMap(({ fit }) => (fit.error ? [] : Array.from({ length: 30 }, (_, i) => { const v = xticks[0] + ((xticks[xticks.length - 1] - xticks[0]) * i) / 29; return fit.f(logX ? 10 ** v : v); }))).filter(isFinite);
  const f = axesFrame(cfg, w, h, { xTicks: xticks, yTicks: yRange(cfg, Math.min(0, ...allY), Math.max(...allY, ...fy.filter((v) => v < Math.max(...allY) * 1.5))), xFmt: logX ? (v) => `10${supNum(v)}` : undefined });
  let s = `<defs><clipPath id="cf-clip"><rect x="${f.m.l}" y="${f.m.t - 2}" width="${f.pw}" height="${f.ph + 4}"/></clipPath></defs>` + f.s + '<g clip-path="url(#cf-clip)">';
  const leg = [];
  fits.forEach(({ d, fit }, k) => {
    const col = pal[k % pal.length];
    // points: mean ± SD per X when there are replicates
    const byX = new Map();
    d.x.forEach((v, i) => { if (!byX.has(v)) byX.set(v, []); byX.get(v).push(d.y[i]); });
    byX.forEach((ys, v) => {
      const mu = Stats.mean(ys), sd = ys.length > 1 ? Stats.sd(ys) : 0, X = f.X(tx(v));
      if (sd) s += `<path d="M${X} ${f.Y(mu - sd)}V${f.Y(mu + sd)}M${X - 3} ${f.Y(mu + sd)}H${X + 3}M${X - 3} ${f.Y(mu - sd)}H${X + 3}" stroke="${col}" fill="none"/>`;
      s += `<circle cx="${X}" cy="${f.Y(mu)}" r="3.4" fill="${col}"/>`;
    });
    if (fit.error) { report.push(`${d.name}: could not fit (${fit.error}).`); return; }
    const n = 120, xs2 = Array.from({ length: n + 1 }, (_, i) => xticks[0] + ((xticks[xticks.length - 1] - xticks[0]) * i) / n);
    if (cfg.cband) { // delta-method 95% confidence band for the curve
      const Mf = M.f, tc = Stats.qt(0.975, fit.dfE), up = [], dn = [];
      xs2.forEach((v) => {
        const u = v, g = fit.p.map((pj, j) => { const hh = 1e-6 * Math.max(Math.abs(pj), 1e-3), a = [...fit.p], b = [...fit.p]; a[j] += hh; b[j] -= hh; return (Mf(u, a) - Mf(u, b)) / (2 * hh); });
        const vr = g.reduce((acc, gi, i) => acc + gi * g.reduce((q, gj, j) => q + fit.cov[i][j] * gj, 0), 0), yv = Mf(u, fit.p), hw = tc * Math.sqrt(Math.max(0, vr));
        if (isFinite(yv)) { up.push(`${f.X(v).toFixed(1)} ${f.Y(yv + hw).toFixed(1)}`); dn.unshift(`${f.X(v).toFixed(1)} ${f.Y(yv - hw).toFixed(1)}`); }
      });
      if (up.length) s += `<path d="M${up.join('L')}L${dn.join('L')}Z" fill="${col}" opacity="0.15"/>`;
    }
    s += `<path d="${xs2.map((v, i) => { const yv = fit.f(logX ? 10 ** v : v); return isFinite(yv) ? `${i ? 'L' : 'M'}${f.X(v).toFixed(1)} ${f.Y(yv).toFixed(1)}` : ''; }).join(' ').replace(/^ *L/, 'M')}" fill="none" stroke="${col}" stroke-width="2"/>`;
    leg.push({ name: d.name, color: col });
    report.push(`${d.name} (n = ${fit.n}${d.reps > 1 ? `, ${d.reps} replicates` : ''}): R² = ${fit.r2.toFixed(4)}, Sy.x = ${fmt3(fit.sy)}`);
    fit.params.forEach((pn, j) => report.push(`  ${pn} = ${fmt3(fit.p[j])} ± ${fmt3(fit.se[j])} SE (95% CI ${fmt3(fit.lo[j])} to ${fmt3(fit.hi[j])})`));
    fit.derived.forEach(([nm, v, lo, hi]) => report.push(`  ${nm} = ${fmt3(v)}${lo !== undefined ? ` (95% CI ${fmt3(lo)} to ${fmt3(hi)})` : ''}`));
    if (key === 'dr4' && isFinite(+cfg.ecx) && +cfg.ecx > 0 && +cfg.ecx < 100) report.push(`  EC${+cfg.ecx} = ${fmt3(ecx4(fit, +cfg.ecx))} (point estimate)`);
  });
  s += '</g>' + legendBox(leg, f.m.l + 10, f.m.t + 10);
  if (sets.length > 1 && cfg.compare !== false) {
    const cmp = compareCurves(key, sets.map((d) => ({ x: d.x, y: d.y })));
    if (cmp && cmp.d1 > 0 && cmp.d2 > 0) report.push(`${cmp.name}: F(${cmp.d1}, ${cmp.d2}) = ${cmp.F.toFixed(3)}, ${fmtP(cmp.p)} — ${cmp.p < 0.05 ? 'the datasets need different curves.' : 'one curve fits all datasets (no evidence they differ).'}`);
  }
  return { svg: s + titles(cfg, w, h, f), report };
};

// Insert › Statistics & Models › … opens the graph dialog on that kind with example data.
const STATS_SIZES = { contingency: [440, 320], roc: [420, 380], blandaltman: [500, 340], deming: [420, 380], mlr: [420, 380], anova3: [560, 340], curvefit: [460, 340] };
CHART_KINDS.filter((k) => k[2] === STATS_HEAD).forEach(([kind]) => {
  ARRANGE_COMMANDS['stats_' + kind] = () => { const [w, h] = STATS_SIZES[kind] || [440, 340]; openGraphDialog(null, { kind, w, h }); };
});
