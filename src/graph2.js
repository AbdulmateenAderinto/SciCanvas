// Extended statistics and chart types: normality testing & test recommendation, paired / repeated-measures /
// non-parametric tests, two-way ANOVA, Cox regression, logistic & polynomial regression, Spearman, AUC,
// transforms, and grouped-bar / violin / dot (mean–median) / pie / well-plate / growth / standard-curve /
// logistic charts. Also file import (CSV, TSV, Excel .xlsx, GraphPad Prism .pzfx).

// ---------- Distributions ----------
function invNorm(p) { // Acklam
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function tCrit(df, alpha = 0.05) { // two-sided critical t by bisection
  let lo = 0, hi = 100;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (Stats.tTwoSidedP(mid, df) > alpha) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const ranks = (arr) => {
  const idx = arr.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(arr.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; }
  return r;
};

Object.assign(Stats, {
  ci95(a) { return a.length > 1 ? tCrit(a.length - 1) * Stats.sem(a) : 0; },
  // Shapiro–Wilk W with Royston's (1995) approximation for the p-value.
  shapiroWilk(data) {
    const x = [...data].sort((p, q) => p - q), n = x.length;
    if (n < 3 || n > 5000) return null;
    const mean = Stats.mean(x), ss = x.reduce((s, v) => s + (v - mean) ** 2, 0);
    if (ss === 0) return { W: 1, p: 1 };
    const m = x.map((_, i) => invNorm((i + 1 - 0.375) / (n + 0.25)));
    const mm = m.reduce((s, v) => s + v * v, 0), u = 1 / Math.sqrt(n);
    const a = new Array(n).fill(0);
    const an = m[n - 1] / Math.sqrt(mm) + 0.221157 * u - 0.147981 * u ** 2 - 2.07119 * u ** 3 + 4.434685 * u ** 4 - 2.706056 * u ** 5;
    if (n === 3) { a[0] = -Math.SQRT1_2; a[2] = Math.SQRT1_2; }
    else if (n > 5) {
      const an1 = m[n - 2] / Math.sqrt(mm) + 0.042981 * u - 0.293762 * u ** 2 - 1.752461 * u ** 3 + 5.682633 * u ** 4 - 3.582633 * u ** 5;
      const phi = (mm - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an ** 2 - 2 * an1 ** 2);
      for (let i = 2; i < n - 2; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an; a[0] = -an; a[n - 2] = an1; a[1] = -an1;
    } else {
      const phi = (mm - 2 * m[n - 1] ** 2) / (1 - 2 * an ** 2);
      for (let i = 1; i < n - 1; i++) a[i] = m[i] / Math.sqrt(phi);
      a[n - 1] = an; a[0] = -an;
    }
    const W = Math.min(1, a.reduce((s, ai, i) => s + ai * x[i], 0) ** 2 / ss);
    let p;
    if (n === 3) p = Math.max(0, Math.min(1, (6 / Math.PI) * (Math.asin(Math.sqrt(W)) - Math.asin(Math.sqrt(0.75)))));
    else if (n <= 11) {
      const g = -2.273 + 0.459 * n, mu = 0.544 - 0.39978 * n + 0.025054 * n ** 2 - 0.0006714 * n ** 3;
      const sg = Math.exp(1.3822 - 0.77857 * n + 0.062767 * n ** 2 - 0.0020322 * n ** 3);
      const z = (-Math.log(g - Math.log(1 - W)) - mu) / sg; p = 1 - Stats.normCdf(z);
    } else {
      const L = Math.log(n), mu = 0.0038915 * L ** 3 - 0.083751 * L ** 2 - 0.31082 * L - 1.5861, sg = Math.exp(0.0030302 * L ** 2 - 0.082676 * L - 0.4803);
      p = 1 - Stats.normCdf((Math.log(1 - W) - mu) / sg);
    }
    return { W, p };
  },
  wilcoxonSigned(a, b) {
    const d = a.map((v, i) => v - b[i]).filter((v) => v !== 0), n = d.length;
    if (n < 2) return { name: 'Wilcoxon signed-rank', p: NaN, W: 0, z: 0 };
    const r = ranks(d.map(Math.abs)), Wp = d.reduce((s, v, i) => s + (v > 0 ? r[i] : 0), 0);
    const counts = {}; d.map(Math.abs).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const tie = Object.values(counts).reduce((s, t) => s + t ** 3 - t, 0);
    const sd = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tie / 48), z = (Wp - (n * (n + 1)) / 4) / sd;
    return { name: 'Wilcoxon signed-rank (normal approx.)', W: Wp, z, p: 2 * (1 - Stats.normCdf(Math.abs(z))) };
  },
  kruskal(groups) {
    const all = groups.flat(), N = all.length, r = ranks(all);
    let off = 0, H = 0;
    for (const g of groups) { const R = r.slice(off, off + g.length).reduce((s, v) => s + v, 0); H += R * R / g.length; off += g.length; }
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
    const counts = {}; all.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const C = 1 - Object.values(counts).reduce((s, t) => s + t ** 3 - t, 0) / (N ** 3 - N);
    H /= C || 1;
    return { name: 'Kruskal–Wallis', H, df: groups.length - 1, p: Stats.chi2P(H, groups.length - 1) };
  },
  rmAnova(cols) { // columns = conditions, rows = subjects (complete rows only)
    const n = Math.min(...cols.map((c) => c.length)), k = cols.length;
    const M = Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
    const gm = Stats.mean(M.flat());
    const ssCond = n * cols.reduce((s, c) => s + (Stats.mean(c.slice(0, n)) - gm) ** 2, 0);
    const ssSubj = k * M.reduce((s, r) => s + (Stats.mean(r) - gm) ** 2, 0);
    const ssTot = M.flat().reduce((s, v) => s + (v - gm) ** 2, 0);
    const ssErr = ssTot - ssCond - ssSubj, d1 = k - 1, d2 = (k - 1) * (n - 1), F = ssCond / d1 / (ssErr / d2);
    return { name: 'Repeated-measures ANOVA', F, d1, d2, p: Stats.fP(F, d1, d2), n };
  },
  // Least squares: returns { beta, rss, XtXinv } for design matrix X and response y.
  lsq(X, y) {
    const p = X[0].length, XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
    X.forEach((row, i) => { for (let a = 0; a < p; a++) { Xty[a] += row[a] * y[i]; for (let b = 0; b < p; b++) XtX[a][b] += row[a] * row[b]; } });
    const inv = invert(XtX), beta = inv.map((r) => r.reduce((s, v, j) => s + v * Xty[j], 0));
    const rss = X.reduce((s, row, i) => s + (y[i] - row.reduce((t, v, j) => t + v * beta[j], 0)) ** 2, 0);
    return { beta, rss, XtXinv: inv };
  },
  // Two-way ANOVA with interaction, Type III sums of squares via effect (sum-to-zero) coding.
  twoWayAnova(A, B, y) {
    const la = [...new Set(A)], lb = [...new Set(B)], N = y.length;
    const eff = (levels, v) => levels.slice(0, -1).map((l) => (v === l ? 1 : v === levels[levels.length - 1] ? -1 : 0));
    const terms = { A: A.map((v) => eff(la, v)), B: B.map((v) => eff(lb, v)) };
    terms.AB = terms.A.map((ra, i) => ra.flatMap((x) => terms.B[i].map((z) => x * z)));
    const build = (skip) => y.map((_, i) => [1, ...(skip === 'A' ? [] : terms.A[i]), ...(skip === 'B' ? [] : terms.B[i]), ...(skip === 'AB' ? [] : terms.AB[i])]);
    const full = Stats.lsq(build(), y), p = build()[0].length, dfE = N - p, mse = full.rss / dfE;
    const out = {};
    for (const t of ['A', 'B', 'AB']) {
      const red = Stats.lsq(build(t), y), df = terms[t][0].length, ss = red.rss - full.rss, F = ss / df / mse;
      out[t] = { ss, df, F, p: Stats.fP(F, df, dfE) };
    }
    return { name: 'Two-way ANOVA (Type III)', ...out, dfE, mse };
  },
  polyfit(x, y, deg) {
    const X = x.map((v) => Array.from({ length: deg + 1 }, (_, k) => v ** k));
    const { beta, rss } = Stats.lsq(X, y), my = Stats.mean(y);
    return { coef: beta, r2: 1 - rss / y.reduce((s, v) => s + (v - my) ** 2, 0), f: (v) => beta.reduce((s, b, k) => s + b * v ** k, 0) };
  },
  spearman(x, y) {
    const rx = ranks(x), ry = ranks(y), r = Stats.linreg(rx, ry).r, n = x.length;
    // Small samples: exact permutation distribution of ρ (the t approximation is far too liberal for n < 10).
    if (n >= 3 && n < 10) {
      const perm = ry.slice(), mx = Stats.mean(rx), my = Stats.mean(ry), dx = rx.map((v) => v - mx), sxx = dx.reduce((s, v) => s + v * v, 0), syy = ry.reduce((s, v) => s + (v - my) ** 2, 0);
      const obs = Math.abs(r) - 1e-12;
      let hit = 0, tot = 0;
      const heap = (k) => { // Heap's algorithm over all n! orderings of the y ranks
        if (k === 1) { let sxy = 0; for (let i = 0; i < n; i++) sxy += dx[i] * (perm[i] - my); tot++; if (Math.abs(sxy / Math.sqrt(sxx * syy)) >= obs) hit++; return; }
        for (let i = 0; i < k; i++) { heap(k - 1); const j = k % 2 ? 0 : i; [perm[j], perm[k - 1]] = [perm[k - 1], perm[j]]; }
      };
      if (sxx > 0 && syy > 0) { heap(n); return { rho: r, p: hit / tot, exact: true }; }
    }
    const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
    return { rho: r, p: n > 2 ? Stats.tTwoSidedP(t, n - 2) : NaN };
  },
  friedman(cols) { // columns = conditions, rows = subjects (complete rows only)
    const n = Math.min(...cols.map((c) => c.length)), k = cols.length;
    const R = new Array(k).fill(0);
    let tieAdj = 0;
    for (let i = 0; i < n; i++) {
      const row = cols.map((c) => c[i]), r = ranks(row);
      r.forEach((v, j) => { R[j] += v; });
      const counts = {}; row.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      tieAdj += Object.values(counts).reduce((s, t) => s + t ** 3 - t, 0);
    }
    const Q = ((12 / (n * k * (k + 1))) * R.reduce((s, v) => s + v * v, 0) - 3 * n * (k + 1)) / (1 - tieAdj / (n * k * (k * k - 1)) || 1);
    return { name: 'Friedman test', H: Q, df: k - 1, p: Stats.chi2P(Q, k - 1), n };
  },
  logistic(x, y) { // IRLS for logit(p) = b0 + b1 x
    let b = [0, 0], inv;
    for (let it = 0; it < 50; it++) {
      const W = [], z = [];
      const X = x.map((v) => [1, v]);
      x.forEach((v, i) => { const eta = b[0] + b[1] * v, p = 1 / (1 + Math.exp(-eta)), w = Math.max(1e-9, p * (1 - p)); W.push(w); z.push(eta + (y[i] - p) / w); });
      const XtWX = [[0, 0], [0, 0]], XtWz = [0, 0];
      X.forEach((r, i) => { for (let a = 0; a < 2; a++) { XtWz[a] += r[a] * W[i] * z[i]; for (let c = 0; c < 2; c++) XtWX[a][c] += r[a] * W[i] * r[c]; } });
      inv = invert(XtWX);
      const nb = inv.map((r) => r[0] * XtWz[0] + r[1] * XtWz[1]);
      const done = Math.abs(nb[0] - b[0]) + Math.abs(nb[1] - b[1]) < 1e-9;
      b = nb;
      if (done) break;
    }
    const se = Math.sqrt(inv[1][1]), z = b[1] / se;
    const ll = x.reduce((s, v, i) => { const p = 1 / (1 + Math.exp(-(b[0] + b[1] * v))); return s + (y[i] ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12))); }, 0);
    return { b0: b[0], b1: b[1], se, or: Math.exp(b[1]), orLo: Math.exp(b[1] - 1.96 * se), orHi: Math.exp(b[1] + 1.96 * se), p: 2 * (1 - Stats.normCdf(Math.abs(z))), aic: 4 - 2 * ll, f: (v) => 1 / (1 + Math.exp(-(b[0] + b[1] * v))) };
  },
  coxUnivariate(times, events, x) { // Breslow ties, Newton–Raphson
    let beta = 0, info = 1;
    const order = times.map((t, i) => i).sort((a, b) => times[a] - times[b]);
    const evTimes = [...new Set(order.filter((i) => events[i]).map((i) => times[i]))];
    for (let it = 0; it < 30; it++) {
      let U = 0; info = 0;
      for (const t of evTimes) {
        let S0 = 0, S1 = 0, S2 = 0, d = 0, sx = 0;
        times.forEach((ti, i) => { if (ti >= t) { const e = Math.exp(beta * x[i]); S0 += e; S1 += x[i] * e; S2 += x[i] * x[i] * e; } if (ti === t && events[i]) { d++; sx += x[i]; } });
        U += sx - (d * S1) / S0; info += d * (S2 / S0 - (S1 / S0) ** 2);
      }
      if (!info) break;
      const step = U / info;
      beta += step;
      if (Math.abs(step) < 1e-10) break;
    }
    const se = 1 / Math.sqrt(info || 1e-12);
    return { name: 'Cox proportional hazards (univariate)', beta, se, hr: Math.exp(beta), lo: Math.exp(beta - 1.96 * se), hi: Math.exp(beta + 1.96 * se), p: 2 * (1 - Stats.normCdf(Math.abs(beta / se))) };
  },
  auc(x, y) { let s = 0; for (let i = 1; i < x.length; i++) s += ((y[i] + y[i - 1]) / 2) * (x[i] - x[i - 1]); return s; },
  kde(data, nPts = 60) {
    const sd = Stats.sd(data), iqr = Stats.quantile(data, 0.75) - Stats.quantile(data, 0.25);
    const h = 0.9 * Math.min(sd, iqr / 1.34 || sd) * data.length ** -0.2 || 1;
    const lo = Math.min(...data), hi = Math.max(...data), pts = [];
    for (let i = 0; i <= nPts; i++) { const v = lo + ((hi - lo) * i) / nPts; pts.push([v, data.reduce((s, d) => s + Math.exp(-0.5 * ((v - d) / h) ** 2), 0) / (data.length * h * Math.sqrt(2 * Math.PI))]); }
    return pts;
  },
});

// ---------- Group comparisons: test selection, recommendation, post-hoc, outlier sensitivity ----------
function recommendTest(groups, paired) {
  const norm = groups.map((g) => (g.length >= 3 ? Stats.shapiroWilk(paired && groups.length === 2 ? g.map((v, i) => v - groups[1][i]) : g) : null));
  const nonNormal = norm.some((r) => r && r.p < 0.05);
  const k = groups.length;
  let key, why;
  if (paired) { key = nonNormal ? 'wilcoxon' : 'paired'; why = k === 2 ? (nonNormal ? 'paired data, differences not normal → Wilcoxon signed-rank' : 'paired data, differences look normal → paired t-test') : 'repeated measures on the same subjects → repeated-measures ANOVA'; if (k > 2) key = 'paired'; }
  else { key = nonNormal ? 'mw' : 'welch'; why = nonNormal ? `at least one group deviates from normality → ${k === 2 ? 'Mann–Whitney U' : 'Kruskal–Wallis + Holm-adjusted Mann–Whitney'}` : `groups look normal → ${k === 2 ? "Welch's t-test (no equal-variance assumption)" : 'one-way ANOVA + Holm-adjusted Welch t-tests'}`; }
  return { key, why, norm };
}
function groupAnalysis(groups, names, cfg) {
  const lines = [], brackets = [];
  const k = groups.length;
  if (cfg.test === 'none' || groups.some((g) => g.length < 2)) return { lines, brackets };
  // One-sample tests: each group against a hypothetical value (no between-group brackets).
  if (['onesample', 'onesamplew', 'ratio'].includes(cfg.test) && typeof Stats.oneSampleT === 'function') {
    const mu = cfg.mu === '' || cfg.mu == null || !isFinite(+cfg.mu) ? (cfg.test === 'ratio' ? 1 : 0) : +cfg.mu;
    groups.forEach((g, i) => {
      const r = cfg.test === 'onesamplew' ? Stats.wilcoxonOne(g, mu) : cfg.test === 'ratio' ? Stats.oneSampleRatio(g, mu) : Stats.oneSampleT(g, mu);
      if (!r) { lines.push(`${names[i]}: the ratio test needs all values > 0.`); return; }
      lines.push(`${names[i]} vs ${mu}: ${r.name}, ${r.t !== undefined ? `t(${r.df}) = ${r.t.toFixed(3)}, ` : `W⁺ = ${r.W}, `}${fmtP(r.p)}${r.ratio !== undefined ? `; geometric mean ratio ${r.ratio.toPrecision(3)} (95% CI ${r.lo.toPrecision(3)}–${r.hi.toPrecision(3)})` : r.lo !== undefined ? `; difference ${r.diff.toPrecision(3)} (95% CI ${r.lo.toPrecision(3)} to ${r.hi.toPrecision(3)})` : ''} ${stars(r.p)}`);
    });
    if (groups.length > 1) lines.push('Each group is tested separately; p-values are not adjusted for multiple groups.');
    return { lines, brackets };
  }
  const paired = cfg.test === 'paired' || cfg.test === 'wilcoxon';
  const rec = recommendTest(groups, paired || cfg.paired);
  let test = cfg.test === 'auto' || !cfg.test ? rec.key : cfg.test;
  // Lognormal: run the parametric tests on log-transformed values (all values must be > 0).
  const logged = test === 'lognormal';
  if (logged) {
    if (groups.some((g) => g.some((v) => v <= 0))) { lines.push('Lognormal tests need every value > 0.'); return { lines, brackets }; }
    lines.push(`Lognormal: tests run on ln(values). Geometric means: ${groups.map((g, i) => `${names[i]} ${Math.exp(Stats.mean(g.map(Math.log))).toPrecision(4)}`).join(', ')}.`);
  }
  const POSTHOC_NAMES = { tukey: "Tukey's multiple comparisons (Tukey–Kramer)", dunnett: `Dunnett's multiple comparisons vs ${names[0]}`, bonferroni: 'Bonferroni-corrected t-tests (pooled SD)', sidak: 'Šídák-corrected t-tests (pooled SD)', gameshowell: 'Games–Howell (unequal variances)', dunn: "Dunn's multiple comparisons (Bonferroni)" };
  const run = (G0) => {
    const out = { lines: [], brackets: [] };
    const G = logged ? G0.map((g) => g.map(Math.log)) : G0;
    if (G.length === 2) {
      const [a, b] = G;
      const t = test === 'mw' ? Stats.mannWhitney(a, b) : test === 'wilcoxon' && a.length === b.length ? Stats.wilcoxonSigned(a, b) : test === 'paired' && a.length === b.length ? Stats.pairedT(a, b) : test === 'student' && Stats.studentT ? Stats.studentT(a, b) : Stats.welch(a, b);
      out.brackets.push({ a: 0, b: 1, p: t.p });
      out.lines.push(`${t.name}: ${t.t !== undefined ? `t = ${t.t.toFixed(3)}, df = ${t.df.toFixed(1)}` : t.U !== undefined ? `U = ${t.U}, z = ${t.z.toFixed(3)}` : `W⁺ = ${t.W}, z = ${t.z.toFixed(3)}`}, ${fmtP(t.p)}`);
      out.p = t.p;
    } else {
      const omni = test === 'wilcoxon' ? Stats.friedman(G) : test === 'mw' ? Stats.kruskal(G) : test === 'paired' ? Stats.rmAnova(G) : test === 'welchanova' && Stats.welchAnova ? Stats.welchAnova(G) : Stats.anova(G);
      const sph = test === 'paired' && Stats.sphericity ? Stats.sphericity(G) : null;
      out.lines.push(omni.name === 'Friedman test' ? `${omni.name}: χ²(${omni.df}) = ${omni.H.toFixed(3)}, ${fmtP(omni.p)} (n = ${omni.n} subjects)` : omni.H !== undefined ? `${omni.name}: H(${omni.df}) = ${omni.H.toFixed(3)}, ${fmtP(omni.p)}` : `${omni.name}: F(${omni.d1}, ${+omni.d2.toFixed(2)}) = ${omni.F.toFixed(3)}, ${fmtP(omni.p)}${omni.n ? ` (n = ${omni.n} subjects; sphericity assumed)` : ''}`);
      if (sph) {
        const pGG = Stats.fP(omni.F, omni.d1 * sph.gg, omni.d2 * sph.gg);
        out.lines.push(`Sphericity: Mauchly's W = ${sph.mauchlyW.toFixed(3)}, ${fmtP(sph.p)}; Greenhouse–Geisser ε = ${sph.gg.toFixed(3)} → corrected ${fmtP(pGG)}${sph.p < 0.05 ? ' (sphericity violated: report the corrected p)' : ''}`);
      }
      out.p = omni.p;
      // Named post-hoc procedures (Tukey, Dunnett, …) where they suit the test; otherwise Holm-adjusted pairwise tests.
      const ph = cfg.posthoc || 'holm';
      const parametric = ['welch', 'welchanova', 'student', 'lognormal'].includes(test);
      const usable = ph === 'dunn' ? test === 'mw' : parametric && ['tukey', 'dunnett', 'bonferroni', 'sidak', 'gameshowell'].includes(ph);
      if (ph === 'none') return out;
      if (usable && Stats.postHoc) {
        const res = Stats.postHoc(G, ph, { control: 0 });
        out.lines.push(`Post-hoc: ${POSTHOC_NAMES[ph]}, multiplicity-adjusted:`);
        res.forEach((r) => {
          const ci = r.lo !== undefined && !logged ? `, diff ${r.diff.toPrecision(3)} (95% CI ${r.lo.toPrecision(3)} to ${r.hi.toPrecision(3)})` : r.lo !== undefined ? `, ratio ${Math.exp(r.diff).toPrecision(3)} (95% CI ${Math.exp(r.lo).toPrecision(3)}–${Math.exp(r.hi).toPrecision(3)})` : '';
          out.lines.push(`  ${names[r.i]} vs ${names[r.j]}: ${r.statName} = ${Math.abs(r.stat).toFixed(3)}${ci}, adj. ${fmtP(r.p)} ${stars(r.p)}`);
          if (r.p < 0.05 && cfg.posthocBrackets !== false) out.brackets.push({ a: Math.min(r.i, r.j), b: Math.max(r.i, r.j), p: r.p });
        });
        return out;
      }
      if (ph !== 'holm') out.lines.push(`(${POSTHOC_NAMES[ph] || ph} doesn't apply to this test, so Holm-adjusted pairwise tests are shown instead.)`);
      const pairs = [];
      for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
        const f = test === 'mw' ? Stats.mannWhitney : test === 'wilcoxon' ? Stats.wilcoxonSigned : test === 'paired' ? Stats.pairedT : Stats.welch;
        pairs.push([i, j, f(G[i], G[j]).p]);
      }
      const adj = Stats.holm(pairs.map((p) => p[2]));
      out.lines.push(`Post-hoc ${test === 'mw' ? 'Mann–Whitney' : test === 'wilcoxon' ? 'Wilcoxon' : test === 'paired' ? 'paired t' : 'Welch t'} tests, Holm-adjusted:`);
      pairs.forEach(([i, j], q) => { out.lines.push(`  ${names[i]} vs ${names[j]}: adj. ${fmtP(adj[q])}`); if (adj[q] < 0.05 && cfg.posthocBrackets !== false) out.brackets.push({ a: i, b: j, p: adj[q] }); });
    }
    return out;
  };
  const main = run(groups);
  lines.push(...main.lines);
  brackets.push(...main.brackets.slice(0, 6));
  // Normality + recommendation.
  const normTxt = rec.norm.map((r, i) => (r ? `${names[i]} W = ${r.W.toFixed(3)}, p = ${r.p.toPrecision(2)}` : null)).filter(Boolean);
  if (normTxt.length) lines.push(`Shapiro–Wilk normality: ${normTxt.join('; ')}`);
  // Equal-variance check for the unpaired parametric tests (a note only; never changes the test used).
  if (!paired && Stats.levene && groups.every((g) => g.length >= 2)) {
    const bf = Stats.levene(groups);
    if (isFinite(bf.p)) lines.push(`${bf.name} for equal variances: F(${bf.d1}, ${bf.d2}) = ${bf.F.toFixed(3)}, ${fmtP(bf.p)}${bf.p < 0.05 && ['welch', 'student', 'lognormal'].includes(test) && k > 2 ? " — variances differ; consider Welch's ANOVA with Games–Howell." : bf.p < 0.05 && test === 'student' ? " — variances differ; consider Welch's t-test." : ''}`);
  }
  lines.push(`Suggested test: ${rec.why}.${cfg.test === 'auto' || !cfg.test ? ' (used)' : test === rec.key ? '' : ' Consider switching.'}`);
  // Sensitivity to flagged outliers (report only — never auto-exclude). IQR rule by default, or iterative Grubbs.
  const flag = (g) => (g.length < 4 ? [] : cfg.outliers === 'grubbs' && Stats.grubbs ? Stats.grubbs(g) : Stats.outliersIQR(g));
  if (cfg.outliers !== 'off' && !paired && groups.some((g) => flag(g).length)) {
    const flagged = groups.map(flag);
    lines.push(`Possible outliers (${cfg.outliers === 'grubbs' ? 'Grubbs, α = 0.05' : '1.5 × IQR rule'}): ${flagged.map((o, i) => (o.length ? `${names[i]} ${o.map((v) => +v.toPrecision(6)).join(', ')}` : null)).filter(Boolean).join('; ')}`);
    const trimmed = groups.map((g, i) => g.filter((v) => !flagged[i].includes(v)));
    if (trimmed.every((g) => g.length >= 2)) { const alt = run(trimmed); lines.push(`Sensitivity — excluding flagged outliers: ${fmtP(alt.p)} (vs ${fmtP(main.p)} with all data). Report both if you exclude anything, and say why.`); }
  }
  return { lines, brackets, suggestion: rec.key };
}

// ---------- Transforms ----------
const TRANSFORMS = [['none', 'None'], ['log10', 'log₁₀(y)'], ['log2', 'log₂(y)'], ['ln', 'ln(y)'], ['pctFirst', '% of first group / first point'], ['zscore', 'z-score'], ['minmax', 'Normalise 0–1']];
function transformTable(t, cfg) {
  if (!cfg.transform || cfg.transform === 'none') return t;
  const xy = ['scatter', 'line', 'dose', 'growth'].includes(cfg.kind);
  const start = xy ? 1 : 0;
  const cols = t.cols.map((c, i) => {
    if (i < start) return c;
    const f = c.filter(isFinite);
    const ref = cfg.transform === 'pctFirst' ? (xy ? f[0] : Stats.mean(t.cols[start].filter(isFinite))) : 0;
    const mu = f.length ? Stats.mean(f) : 0, sd = f.length > 1 ? Stats.sd(f) : 1, lo = Math.min(...f), hi = Math.max(...f);
    return c.map((v) => {
      if (!isFinite(v)) return v;
      switch (cfg.transform) {
        case 'log10': return v > 0 ? Math.log10(v) : NaN;
        case 'log2': return v > 0 ? Math.log2(v) : NaN;
        case 'ln': return v > 0 ? Math.log(v) : NaN;
        case 'pctFirst': return (v / ref) * 100;
        case 'zscore': return (v - mu) / (sd || 1);
        case 'minmax': return (v - lo) / ((hi - lo) || 1);
      }
      return v;
    });
  });
  return { ...t, cols };
}

// ---------- Shared axes for the new chart types ----------
function axesFrame(cfg, w, h, { xCats, xTicks, yTicks, xFmt = (v) => +v.toPrecision(6), yFmt = (v) => +v.toPrecision(6), extraTop = 0 }) {
  const m = { l: 62, r: 16, t: (cfg.title ? 34 : 14) + extraTop, b: cfg.xLabel ? 54 : 38 };
  const pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, h - m.t - m.b);
  const y0 = yTicks[0], y1 = yTicks[yTicks.length - 1];
  const Y = (v) => m.t + ph - ((v - y0) / (y1 - y0)) * ph;
  let X, band = 0;
  if (xCats) { band = pw / xCats.length; X = (i) => m.l + band * (i + 0.5); }
  else { const x0 = xTicks[0], x1 = xTicks[xTicks.length - 1]; X = (v) => m.l + ((v - x0) / (x1 - x0)) * pw; }
  let s = '';
  yTicks.forEach((v) => {
    s += `<line x1="${m.l - 5}" y1="${Y(v)}" x2="${m.l}" y2="${Y(v)}" stroke="#333"/><text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${yFmt(v)}</text>`;
    if (cfg.grid) s += `<line x1="${m.l}" y1="${Y(v)}" x2="${m.l + pw}" y2="${Y(v)}" stroke="#e3e6ea"/>`;
  });
  if (xCats) xCats.forEach((c, i) => { s += `<text x="${X(i)}" y="${m.t + ph + 18}" text-anchor="middle">${String(c).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`; });
  else xTicks.forEach((v) => { s += `<line x1="${X(v)}" y1="${m.t + ph}" x2="${X(v)}" y2="${m.t + ph + 5}" stroke="#333"/><text x="${X(v)}" y="${m.t + ph + 18}" text-anchor="middle">${xFmt(v)}</text>`; });
  s += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ph}" stroke="#333" stroke-width="1.5"/><line x1="${m.l}" y1="${m.t + ph}" x2="${m.l + pw}" y2="${m.t + ph}" stroke="#333" stroke-width="1.5"/>`;
  return { m, pw, ph, X, Y, band, s };
}
function titles(cfg, w, h, f) {
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let s = '';
  if (cfg.title) s += `<text x="${f.m.l + f.pw / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${esc(cfg.title)}</text>`;
  if (cfg.xLabel) s += `<text x="${f.m.l + f.pw / 2}" y="${h - 10}" text-anchor="middle" font-size="12">${esc(cfg.xLabel)}</text>`;
  if (cfg.yLabel) s += `<text transform="translate(16 ${f.m.t + f.ph / 2}) rotate(-90)" text-anchor="middle" font-size="12">${esc(cfg.yLabel)}</text>`;
  return s;
}
const yRange = (cfg, lo, hi) => niceTicks(cfg.yMin !== '' && cfg.yMin != null && isFinite(+cfg.yMin) ? +cfg.yMin : lo, cfg.yMax !== '' && cfg.yMax != null && isFinite(+cfg.yMax) ? +cfg.yMax : hi);
const errOf = (g, kind) => (g.length < 2 ? 0 : kind === 'sem' ? Stats.sem(g) : kind === 'ci95' ? Stats.ci95(g) : Stats.sd(g));
const errName = (kind) => ({ sem: 'SEM', ci95: '95% CI', sd: 'SD' }[kind || 'sd']);
function drawBrackets(brackets, X, Y, top, cfg) {
  let s = '';
  brackets.sort((a, b) => (a.b - a.a) - (b.b - b.a)).forEach((br, k) => {
    const y = Y(top) - 14 - k * 18;
    s += `<path d="M${X(br.a)} ${y + 6} V${y} H${X(br.b)} V${y + 6}" stroke="#333" fill="none" stroke-width="1.2"/><text x="${(X(br.a) + X(br.b)) / 2}" y="${y - 4}" text-anchor="middle" font-size="12">${cfg.pStyle === 'value' ? fmtP(br.p) : stars(br.p)}</text>`;
  });
  return s;
}

// ---------- New chart renderers ----------
const EXTRA_CHARTS = {
  groupedbar(cfg, t, w, h, pal) { // long format: FactorA, FactorB, Value
    const A = t.raw[0], B = t.raw[1], V = t.cols[2] || [];
    const rows = A.map((a, i) => ({ a, b: B[i], v: V[i] })).filter((r) => r.a !== '' && r.b !== '' && isFinite(r.v));
    const la = [...new Set(rows.map((r) => r.a))], lb = [...new Set(rows.map((r) => r.b))];
    const cell = (a, b) => rows.filter((r) => r.a === a && r.b === b).map((r) => r.v);
    const tops = [];
    la.forEach((a) => lb.forEach((b) => { const g = cell(a, b); if (g.length) tops.push(cfg.showPoints ? Math.max(...g) : Stats.mean(g) + errOf(g, cfg.error)); }));
    const f = axesFrame(cfg, w, h, { xCats: la, yTicks: yRange(cfg, Math.min(0, ...rows.map((r) => r.v)), Math.max(...tops) * 1.08) });
    const bw = (f.band * 0.8) / lb.length;
    let s = f.s;
    la.forEach((a, i) => lb.forEach((b, j) => {
      const g = cell(a, b); if (!g.length) return;
      const col = pal[j % pal.length], cx = f.X(i) - (f.band * 0.8) / 2 + bw * (j + 0.5), mu = Stats.mean(g), e = errOf(g, cfg.error);
      s += `<rect x="${cx - bw * 0.42}" y="${Math.min(f.Y(mu), f.Y(0))}" width="${bw * 0.84}" height="${Math.abs(f.Y(0) - f.Y(mu))}" fill="${Color.light(col, 0.25)}" stroke="${col}" stroke-width="1.3"/>`;
      if (e) s += `<path d="M${cx} ${f.Y(mu - e)}V${f.Y(mu + e)}M${cx - bw * 0.15} ${f.Y(mu + e)}H${cx + bw * 0.15}" stroke="#333" stroke-width="1.3"/>`;
      if (cfg.showPoints) g.forEach((v, k) => { s += `<circle cx="${cx + (((k * 7919) % 11) / 11 - 0.5) * bw * 0.5}" cy="${f.Y(v)}" r="2.4" fill="${Color.dark(col, 0.25)}" opacity=".8"/>`; });
    }));
    lb.forEach((b, j) => { s += `<rect x="${f.m.l + f.pw - 110}" y="${f.m.t + 4 + j * 15}" width="10" height="10" fill="${pal[j % pal.length]}"/><text x="${f.m.l + f.pw - 96}" y="${f.m.t + 13 + j * 15}">${b}</text>`; });
    const report = [`${la.length} × ${lb.length} groups; bars = mean ± ${errName(cfg.error)}`];
    if (cfg.test !== 'none' && rows.length > la.length * lb.length) {
      const r = Stats.twoWayAnova(rows.map((x) => x.a), rows.map((x) => x.b), rows.map((x) => x.v));
      const hd = t.headers;
      report.push(`${r.name}: ${hd[0]} F(${r.A.df}, ${r.dfE}) = ${r.A.F.toFixed(2)}, ${fmtP(r.A.p)}; ${hd[1]} F(${r.B.df}, ${r.dfE}) = ${r.B.F.toFixed(2)}, ${fmtP(r.B.p)}; interaction F(${r.AB.df}, ${r.dfE}) = ${r.AB.F.toFixed(2)}, ${fmtP(r.AB.p)}`);
      if (r.AB.p < 0.05) report.push('Significant interaction — interpret main effects with care; compare simple effects within each level.');
    }
    return { svg: s + titles(cfg, w, h, f), report };
  },
  violin(cfg, t, w, h, pal) {
    const groups = t.cols.map((c) => c.filter(isFinite));
    const f = axesFrame(cfg, w, h, { xCats: t.headers, yTicks: yRange(cfg, Math.min(...groups.flat()), Math.max(...groups.flat()) * 1.04) });
    let s = f.s;
    const an = groupAnalysis(groups, t.headers, cfg);
    groups.forEach((g, i) => {
      if (g.length < 2) return;
      const col = pal[i % pal.length], d = Stats.kde(g), peak = Math.max(...d.map((p) => p[1])), half = f.band * 0.38;
      const right = d.map(([v, dens]) => `${f.X(i) + (dens / peak) * half},${f.Y(v)}`), left = d.map(([v, dens]) => `${f.X(i) - (dens / peak) * half},${f.Y(v)}`).reverse();
      s += `<polygon points="${[...right, ...left].join(' ')}" fill="${Color.light(col, 0.5)}" stroke="${col}" stroke-width="1.3"/>`;
      const q1 = Stats.quantile(g, 0.25), med = Stats.quantile(g, 0.5), q3 = Stats.quantile(g, 0.75);
      s += `<rect x="${f.X(i) - 4}" y="${f.Y(q3)}" width="8" height="${Math.max(1, f.Y(q1) - f.Y(q3))}" fill="${Color.dark(col, 0.3)}"/><circle cx="${f.X(i)}" cy="${f.Y(med)}" r="3.5" fill="#fff" stroke="${Color.dark(col, 0.3)}"/>`;
      if (cfg.showPoints) g.forEach((v, k) => { s += `<circle cx="${f.X(i) + (((k * 7919) % 13) / 13 - 0.5) * half * 0.6}" cy="${f.Y(v)}" r="2" fill="${Color.dark(col, 0.35)}" opacity=".6"/>`; });
    });
    s += drawBrackets(an.brackets, f.X, f.Y, Math.max(...groups.flat()), cfg);
    return { svg: s + titles(cfg, w, h, f), report: [...groups.map((g, i) => `${t.headers[i]}: n = ${g.length}, median = ${g.length ? Stats.quantile(g, 0.5).toPrecision(4) : '—'}, IQR ${g.length ? `${Stats.quantile(g, 0.25).toPrecision(3)}–${Stats.quantile(g, 0.75).toPrecision(3)}` : '—'}`), ...an.lines], suggestion: an.suggestion };
  },
  dotplot(cfg, t, w, h, pal) { // individual points with mean or median ± error
    const groups = t.cols.map((c) => c.filter(isFinite)), useMedian = cfg.center === 'median';
    const an = groupAnalysis(groups, t.headers, cfg);
    const top = Math.max(...groups.flat());
    const f = axesFrame(cfg, w, h, { xCats: t.headers, yTicks: yRange(cfg, Math.min(0, ...groups.flat()), top * (1.04 + 0.1 * an.brackets.length)) });
    let s = f.s;
    groups.forEach((g, i) => {
      if (!g.length) return;
      const col = pal[i % pal.length], c = useMedian ? Stats.quantile(g, 0.5) : Stats.mean(g);
      g.forEach((v, k) => { s += `<circle cx="${f.X(i) + (((k * 7919) % 13) / 13 - 0.5) * f.band * 0.35}" cy="${f.Y(v)}" r="3.4" fill="${col}" opacity=".85"/>`; });
      s += `<line x1="${f.X(i) - f.band * 0.25}" y1="${f.Y(c)}" x2="${f.X(i) + f.band * 0.25}" y2="${f.Y(c)}" stroke="#222" stroke-width="2.2"/>`;
      if (useMedian) { const q1 = Stats.quantile(g, 0.25), q3 = Stats.quantile(g, 0.75); s += `<path d="M${f.X(i)} ${f.Y(q1)}V${f.Y(q3)}M${f.X(i) - 6} ${f.Y(q1)}h12M${f.X(i) - 6} ${f.Y(q3)}h12" stroke="#222" stroke-width="1.3"/>`; }
      else { const e = errOf(g, cfg.error); if (e) s += `<path d="M${f.X(i)} ${f.Y(c - e)}V${f.Y(c + e)}M${f.X(i) - 6} ${f.Y(c - e)}h12M${f.X(i) - 6} ${f.Y(c + e)}h12" stroke="#222" stroke-width="1.3"/>`; }
    });
    s += drawBrackets(an.brackets, f.X, f.Y, top, cfg);
    return { svg: s + titles(cfg, w, h, f), report: [`Lines = ${useMedian ? 'median with interquartile range' : `mean ± ${errName(cfg.error)}`}`, ...groups.map((g, i) => `${t.headers[i]}: n = ${g.length}, mean = ${g.length ? Stats.mean(g).toPrecision(4) : '—'}, median = ${g.length ? Stats.quantile(g, 0.5).toPrecision(4) : '—'}`), ...an.lines], suggestion: an.suggestion };
  },
  pie(cfg, t, w, h, pal) {
    const items = t.raw[0].map((l, i) => ({ l, v: t.cols[1][i] })).filter((x) => x.l !== '' && isFinite(x.v) && x.v > 0);
    const tot = items.reduce((s, x) => s + x.v, 0);
    const cx = w * 0.38, cy = h / 2 + (cfg.title ? 10 : 0), r = Math.min(w * 0.33, h * 0.4), inner = cfg.donut ? r * 0.55 : 0;
    let a0 = -Math.PI / 2, s = '';
    items.forEach((it, i) => {
      const a1 = a0 + (it.v / tot) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0, col = pal[i % pal.length];
      const P = (a, rr) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      s += inner ? `<path d="M${P(a0, r)} A${r} ${r} 0 ${large} 1 ${P(a1, r)} L${P(a1, inner)} A${inner} ${inner} 0 ${large} 0 ${P(a0, inner)} Z" fill="${col}" stroke="#fff" stroke-width="1.5"/>`
        : `<path d="M${cx} ${cy} L${P(a0, r)} A${r} ${r} 0 ${large} 1 ${P(a1, r)} Z" fill="${col}" stroke="#fff" stroke-width="1.5"/>`;
      const am = (a0 + a1) / 2, pct = (it.v / tot) * 100;
      if (pct >= 4) s += `<text x="${cx + (inner ? (r + inner) / 2 : r * 0.62) * Math.cos(am)}" y="${cy + (inner ? (r + inner) / 2 : r * 0.62) * Math.sin(am) + 4}" text-anchor="middle" fill="#fff" font-weight="700">${pct.toFixed(pct < 10 ? 1 : 0)}%</text>`;
      s += `<rect x="${w * 0.74}" y="${cy - items.length * 9 + i * 18}" width="11" height="11" fill="${col}"/><text x="${w * 0.74 + 16}" y="${cy - items.length * 9 + i * 18 + 10}">${String(it.l).replace(/</g, '&lt;')}</text>`;
      a0 = a1;
    });
    if (cfg.title) s += `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${String(cfg.title).replace(/</g, '&lt;')}</text>`;
    return { svg: s, report: items.map((it) => `${it.l}: ${it.v} (${((it.v / tot) * 100).toFixed(1)}%)`) };
  },
  plate(cfg, t, w, h) { // rows labelled A–H (or A–P), columns 1–12 (or 1–24)
    const rowL = t.raw[0], colL = t.headers.slice(1), vals = t.cols.slice(1);
    const flat = vals.flat().filter(isFinite), lo = Math.min(...flat), hi = Math.max(...flat);
    const m = { l: 34, r: 70, t: (cfg.title ? 34 : 12) + 18, b: 12 };
    const cw = (w - m.l - m.r) / colL.length, ch = (h - m.t - m.b) / rowL.length, rr = Math.min(cw, ch) * 0.42;
    const ramp = cfg.scheme === 'diverging' ? ['#3b6fd6', '#f7f7f7', '#d64545'] : ['#f7fbff', '#6baed6', '#08306b'];
    const colorAt = (q) => (q < 0.5 ? Color.mix(ramp[0], ramp[1], q * 2) : Color.mix(ramp[1], ramp[2], (q - 0.5) * 2));
    let s = `<rect x="${m.l - 8}" y="${m.t - 8}" width="${w - m.l - m.r + 16}" height="${h - m.t - m.b + 16}" rx="10" fill="#eef1f4" stroke="#b9c2cc"/>`;
    colL.forEach((c, j) => { s += `<text x="${m.l + cw * (j + 0.5)}" y="${m.t - 12}" text-anchor="middle" font-size="10">${c}</text>`; });
    rowL.forEach((r, i) => {
      s += `<text x="${m.l - 14}" y="${m.t + ch * (i + 0.5) + 4}" text-anchor="middle" font-size="10" font-weight="700">${r}</text>`;
      colL.forEach((_, j) => {
        const v = vals[j][i], q = isFinite(v) ? (v - lo) / ((hi - lo) || 1) : null;
        s += `<circle cx="${m.l + cw * (j + 0.5)}" cy="${m.t + ch * (i + 0.5)}" r="${rr}" fill="${q === null ? '#fff' : colorAt(q)}" stroke="#9aa5b4" stroke-width=".8"/>`;
        if (cfg.showValues && isFinite(v)) s += `<text x="${m.l + cw * (j + 0.5)}" y="${m.t + ch * (i + 0.5) + 3}" text-anchor="middle" font-size="${Math.max(6, rr * 0.6)}" fill="${q > 0.6 ? '#fff' : '#222'}">${+v.toPrecision(3)}</text>`;
      });
    });
    for (let k = 0; k < 40; k++) s += `<rect x="${w - m.r + 18}" y="${m.t + (h - m.t - m.b) * (1 - (k + 1) / 40)}" width="12" height="${(h - m.t - m.b) / 40 + 0.5}" fill="${colorAt(k / 39)}"/>`;
    s += `<text x="${w - m.r + 34}" y="${m.t + 8}" font-size="10">${+hi.toPrecision(3)}</text><text x="${w - m.r + 34}" y="${h - m.b}" font-size="10">${+lo.toPrecision(3)}</text>`;
    if (cfg.title) s += `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${String(cfg.title).replace(/</g, '&lt;')}</text>`;
    return { svg: s, report: [`${rowL.length} × ${colL.length} plate, range ${+lo.toPrecision(4)} – ${+hi.toPrecision(4)}`] };
  },
  growth(cfg, t, w, h, pal) { // time column, then replicate columns sharing a series name
    const x = t.cols[0], names = [...new Set(t.headers.slice(1))];
    const series = names.map((n) => {
      const idx = t.headers.map((hd, i) => (i > 0 && hd === n ? i : -1)).filter((i) => i > 0);
      return { n, pts: x.map((xv, r) => { const g = idx.map((i) => t.cols[i][r]).filter(isFinite); return isFinite(xv) && g.length ? { x: xv, m: Stats.mean(g), e: errOf(g, cfg.error), n: g.length } : null; }).filter(Boolean) };
    });
    const allY = series.flatMap((sr) => sr.pts.flatMap((p) => [p.m + p.e, p.m - p.e]));
    const f = axesFrame(cfg, w, h, { xTicks: niceTicks(Math.min(...x.filter(isFinite)), Math.max(...x.filter(isFinite))), yTicks: yRange(cfg, Math.min(0, ...allY), Math.max(...allY) * 1.04) });
    let s = f.s;
    const report = [`Points = mean ± ${errName(cfg.error)} of replicates`];
    series.forEach((sr, i) => {
      const col = pal[i % pal.length];
      if (cfg.band !== false) s += `<polygon points="${[...sr.pts.map((p) => `${f.X(p.x)},${f.Y(p.m + p.e)}`), ...[...sr.pts].reverse().map((p) => `${f.X(p.x)},${f.Y(p.m - p.e)}`)].join(' ')}" fill="${col}" opacity=".15"/>`;
      s += `<polyline points="${sr.pts.map((p) => `${f.X(p.x)},${f.Y(p.m)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2"/>`;
      sr.pts.forEach((p) => { s += `<circle cx="${f.X(p.x)}" cy="${f.Y(p.m)}" r="3" fill="${col}"/>`; });
      const auc = Stats.auc(sr.pts.map((p) => p.x), sr.pts.map((p) => p.m));
      // Max specific growth rate from log(y) slope over consecutive points.
      let mu = -Infinity;
      for (let k = 1; k < sr.pts.length; k++) { const a = sr.pts[k - 1], b = sr.pts[k]; if (a.m > 0 && b.m > 0) mu = Math.max(mu, (Math.log(b.m) - Math.log(a.m)) / (b.x - a.x)); }
      report.push(`${sr.n}: AUC = ${auc.toPrecision(4)}${isFinite(mu) && mu > 0 ? `, max growth rate µ = ${mu.toPrecision(3)} per unit time, doubling time = ${(Math.LN2 / mu).toPrecision(3)}` : ''}`);
      s += `<rect x="${f.m.l + 8}" y="${f.m.t + 4 + i * 15}" width="10" height="10" fill="${col}"/><text x="${f.m.l + 22}" y="${f.m.t + 13 + i * 15}">${sr.n}</text>`;
    });
    return { svg: s + titles(cfg, w, h, f), report };
  },
  standard(cfg, t, w, h, pal) { // Conc, Signal (blank Conc = unknown), optional Sample name
    const conc = t.cols[0], sig = t.cols[1], names = t.raw[2] || [];
    const std = conc.map((c, i) => [c, sig[i]]).filter(([c, y]) => isFinite(c) && isFinite(y));
    const unk = conc.map((c, i) => ({ s: sig[i], name: names[i] || `Unknown ${i + 1}` })).filter((u, i) => !isFinite(conc[i]) && isFinite(u.s));
    const pos = std.filter(([c]) => c > 0);
    const use4pl = cfg.fit === '4pl' && pos.length >= 4;
    const droppedBlank = use4pl && pos.length < std.length;
    let fit, inv;
    if (use4pl) {
      fit = Stats.fit4PL(pos.map((p) => p[0]), pos.map((p) => p[1]));
      inv = (y) => { const r = (fit.top - fit.bottom) / (y - fit.bottom) - 1; return r > 0 ? fit.ec50 * r ** (-1 / fit.hill) : NaN; };
    } else {
      const lr = Stats.linreg(std.map((p) => p[0]), std.map((p) => p[1]));
      fit = { f: (c) => lr.intercept + lr.slope * c, r2: lr.r2, lr };
      inv = (y) => (y - lr.intercept) / lr.slope;
    }
    const unkC = unk.map((u) => ({ ...u, c: inv(u.s) }));
    const allC = [...std.map((p) => p[0]), ...unkC.map((u) => u.c).filter(isFinite)], allY = [...std.map((p) => p[1]), ...unk.map((u) => u.s)];
    const logX = use4pl;
    const xt = logX ? (() => { const a = Math.floor(Math.log10(Math.min(...allC.filter((c) => c > 0)))), b = Math.ceil(Math.log10(Math.max(...allC))); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : niceTicks(Math.min(0, ...allC), Math.max(...allC));
    const f = axesFrame(cfg, w, h, { xTicks: xt, yTicks: yRange(cfg, Math.min(0, ...allY), Math.max(...allY) * 1.05), xFmt: logX ? (v) => `1e${v}` : undefined });
    const X = (c) => f.X(logX ? Math.log10(c) : c);
    let s = f.s, d = '';
    for (let k = 0; k <= 80; k++) { const v = xt[0] + ((xt[xt.length - 1] - xt[0]) * k) / 80, c = logX ? 10 ** v : v; d += `${k ? 'L' : 'M'}${X(c)} ${f.Y(fit.f(c))} `; }
    s += `<path d="${d}" fill="none" stroke="${pal[0]}" stroke-width="2"/>`;
    (use4pl ? pos : std).forEach(([c, y]) => { s += `<circle cx="${X(c)}" cy="${f.Y(y)}" r="3.5" fill="${pal[0]}"/>`; });
    const minS = Math.min(...(use4pl ? pos : std).map((p) => p[0])), maxS = Math.max(...std.map((p) => p[0]));
    unkC.forEach((u) => { if (isFinite(u.c) && u.c > 0) s += `<circle cx="${X(u.c)}" cy="${f.Y(u.s)}" r="4.5" fill="#fff" stroke="${pal[1]}" stroke-width="2"/><path d="M${X(u.c)} ${f.Y(u.s)}V${f.m.t + f.ph}" stroke="${pal[1]}" stroke-dasharray="3 3"/>`; });
    const report = [use4pl ? `Standard curve: 4PL, EC50 = ${fit.ec50.toPrecision(3)}, Hill = ${fit.hill.toFixed(2)}, R² = ${fit.r2.toFixed(4)}` : `Standard curve: linear, y = ${fit.lr.slope.toPrecision(4)}x + ${fit.lr.intercept.toPrecision(4)}, R² = ${fit.r2.toFixed(4)}`];
    if (droppedBlank) report.push('Zero-concentration (blank) standards are excluded from the 4PL fit, which uses a log concentration axis.');
    unkC.forEach((u) => report.push(`  ${u.name}: signal ${u.s} → ${isFinite(u.c) ? u.c.toPrecision(4) : 'outside curve'}${isFinite(u.c) && (u.c < minS || u.c > maxS) ? ' ⚠ extrapolated beyond standards' : ''}`));
    return { svg: s + titles(cfg, w, h, f), report };
  },
  logistic(cfg, t, w, h, pal) { // X, Outcome (0/1)
    const pts = t.cols[0].map((x, i) => [x, t.cols[1][i]]).filter(([x, y]) => isFinite(x) && (y === 0 || y === 1));
    const fit = Stats.logistic(pts.map((p) => p[0]), pts.map((p) => p[1]));
    const xs = pts.map((p) => p[0]);
    const f = axesFrame(cfg, w, h, { xTicks: niceTicks(Math.min(...xs), Math.max(...xs)), yTicks: [0, 0.25, 0.5, 0.75, 1] });
    let s = f.s, d = '';
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let k = 0; k <= 80; k++) { const v = x0 + ((x1 - x0) * k) / 80; d += `${k ? 'L' : 'M'}${f.X(v)} ${f.Y(fit.f(v))} `; }
    pts.forEach(([x, y], k) => { s += `<circle cx="${f.X(x)}" cy="${f.Y(y) + (y ? 1 : -1) * (((k * 7919) % 9) - 4)}" r="3" fill="${pal[y ? 1 : 0]}" opacity=".7"/>`; });
    s += `<path d="${d}" fill="none" stroke="#333" stroke-width="2"/>`;
    const x50 = -fit.b0 / fit.b1;
    return { svg: s + titles(cfg, w, h, f), report: [`Logistic regression (n = ${pts.length}): odds ratio per unit = ${fit.or.toPrecision(3)} (95% CI ${fit.orLo.toPrecision(3)}–${fit.orHi.toPrecision(3)}), ${fmtP(fit.p)}, AIC = ${fit.aic.toFixed(1)}`, isFinite(x50) ? `50% probability at x = ${x50.toPrecision(3)}` : ''] };
  },
};

CHART_KINDS.push(['groupedbar', 'Grouped bar + two-way ANOVA'], ['violin', 'Violin plot'], ['dotplot', 'Dot plot (mean / median lines)'], ['pie', 'Pie / donut'], ['plate', 'Well-plate heatmap (96 / 384)'], ['growth', 'Growth curve (replicates)'], ['standard', 'Standard curve + interpolation (ELISA)'], ['logistic', 'Logistic regression (binary outcome)']);
Object.assign(SAMPLE_DATA, {
  groupedbar: 'Genotype,Treatment,Value\nWT,Vehicle,5.1\nWT,Vehicle,4.8\nWT,Vehicle,5.5\nWT,Drug,6.0\nWT,Drug,6.4\nWT,Drug,5.8\nKO,Vehicle,8.9\nKO,Vehicle,9.6\nKO,Vehicle,9.1\nKO,Drug,6.2\nKO,Drug,5.9\nKO,Drug,6.6',
  violin: 'Control,Treated\n4.1,6.2\n5.3,7.9\n4.8,8.4\n5.9,6.8\n4.4,9.1\n5.1,7.2\n4.9,8.8\n5.6,7.5\n4.2,6.9\n5.0,8.1',
  dotplot: 'Naive,Memory,Effector\n12,25,41\n15,29,38\n11,31,45\n14,22,49\n13,27,40\n16,30,44',
  pie: 'Cell type,Count\nT cells,420\nB cells,180\nNK cells,90\nMonocytes,210\nOther,60',
  plate: 'Row,1,2,3,4,5,6,7,8,9,10,11,12\nA,0.05,0.12,0.25,0.51,1.02,1.8,0.05,0.13,0.27,0.49,0.98,1.75\nB,0.06,0.11,0.24,0.52,1.05,1.82,0.06,0.12,0.26,0.5,1.0,1.79\nC,0.31,0.44,0.62,0.29,0.33,0.71,0.66,0.41,0.38,0.59,0.47,0.35\nD,0.28,0.47,0.6,0.3,0.36,0.69,0.63,0.43,0.4,0.61,0.45,0.33\nE,0.52,0.48,0.91,0.22,0.18,0.77,0.84,0.29,0.56,0.62,0.71,0.4\nF,0.5,0.46,0.88,0.24,0.2,0.74,0.81,0.31,0.58,0.6,0.7,0.42\nG,0.05,0.05,0.06,0.05,0.04,0.06,0.05,0.05,0.06,0.04,0.05,0.05\nH,1.9,1.88,1.91,1.87,1.93,1.9,1.89,1.92,1.9,1.88,1.91,1.9',
  growth: 'Hour,Control,Control,Control,Drug,Drug,Drug\n0,0.05,0.05,0.06,0.05,0.05,0.05\n2,0.09,0.1,0.09,0.07,0.06,0.07\n4,0.2,0.22,0.19,0.1,0.11,0.1\n6,0.45,0.49,0.43,0.16,0.17,0.15\n8,0.82,0.86,0.79,0.24,0.25,0.23\n10,1.12,1.15,1.09,0.33,0.34,0.31\n12,1.25,1.27,1.22,0.4,0.42,0.39',
  standard: 'Conc (pg/mL),OD450,Sample\n0,0.05,\n15.6,0.11,\n31.3,0.18,\n62.5,0.33,\n125,0.61,\n250,1.05,\n500,1.62,\n1000,2.05,\n,0.42,Patient 1\n,0.88,Patient 2\n,1.37,Patient 3',
  logistic: 'Dose,Response\n0.5,0\n1,0\n1.5,0\n2,0\n2.5,1\n3,0\n3.5,1\n4,0\n4.5,1\n5,1\n5.5,1\n6,1\n2.2,0\n3.2,1\n4.2,1\n1.2,0',
});

// ---------- File import (CSV / TSV / Excel / Prism) ----------
async function importDataFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) return (await file.text()).trim();
  if (name.endsWith('.xlsx')) return xlsxToCsv(await file.arrayBuffer());
  if (name.endsWith('.pzfx')) return pzfxToCsv(await file.text());
  throw new Error('Supported: .csv, .tsv, .txt, .xlsx, .pzfx');
}
async function xlsxToCsv(buf) {
  if (typeof JSZip === 'undefined') throw new Error('Excel support not loaded');
  const zip = await JSZip.loadAsync(buf);
  const shared = [];
  const ss = zip.file('xl/sharedStrings.xml');
  if (ss) { const d = new DOMParser().parseFromString(await ss.async('string'), 'application/xml'); d.querySelectorAll('si').forEach((si) => shared.push([...si.querySelectorAll('t')].map((t) => t.textContent).join(''))); }
  const sheetPath = Object.keys(zip.files).filter((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort()[0];
  const d = new DOMParser().parseFromString(await zip.file(sheetPath).async('string'), 'application/xml');
  const grid = [];
  const colIdx = (ref) => ref.replace(/\d+/g, '').split('').reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  d.querySelectorAll('sheetData row').forEach((row) => {
    const r = +row.getAttribute('r') - 1, line = [];
    row.querySelectorAll('c').forEach((c) => {
      const t = c.getAttribute('t'), v = c.querySelector('v'), is = c.querySelector('is t');
      line[colIdx(c.getAttribute('r'))] = t === 's' ? shared[+v.textContent] : t === 'inlineStr' ? (is ? is.textContent : '') : v ? v.textContent : '';
    });
    grid[r] = line;
  });
  const width = Math.max(...grid.filter(Boolean).map((l) => l.length));
  return grid.filter(Boolean).map((l) => Array.from({ length: width }, (_, i) => String(l[i] ?? '').replace(/,/g, ';')).join(',')).join('\n');
}
function pzfxToCsv(text) { // GraphPad Prism XML: first data table → columns (replicate subcolumns repeat the title)
  const d = new DOMParser().parseFromString(text, 'application/xml');
  const table = d.querySelector('Table');
  if (!table) throw new Error('No data table found in the Prism file');
  const cols = [];
  const xc = table.querySelector('XColumn');
  if (xc) cols.push({ title: (xc.querySelector('Title') || {}).textContent || 'X', vals: [...xc.querySelectorAll('Subcolumn d')].map((x) => x.textContent) });
  table.querySelectorAll('YColumn').forEach((yc) => {
    const title = (yc.querySelector('Title') || {}).textContent || `Y${cols.length}`;
    yc.querySelectorAll('Subcolumn').forEach((sub) => cols.push({ title, vals: [...sub.querySelectorAll('d')].map((x) => x.textContent) }));
  });
  const n = Math.max(...cols.map((c) => c.vals.length));
  return [cols.map((c) => c.title.replace(/,/g, ';')).join(','), ...Array.from({ length: n }, (_, i) => cols.map((c) => c.vals[i] ?? '').join(','))].join('\n');
}
// Long (label, value) → wide (one column per label), for group charts.
function tidyToWide(text) {
  const t = parseTable(text);
  if (t.headers.length !== 2 || !t.raw[0].some((v) => isNaN(Number(v)))) return null;
  const labels = [...new Set(t.raw[0].filter((v) => v !== ''))], cols = labels.map((l) => t.raw[0].map((v, i) => (v === l ? t.raw[1][i] : null)).filter((v) => v !== null && v !== ''));
  const n = Math.max(...cols.map((c) => c.length));
  return [labels.join(','), ...Array.from({ length: n }, (_, i) => cols.map((c) => c[i] ?? '').join(','))].join('\n');
}
