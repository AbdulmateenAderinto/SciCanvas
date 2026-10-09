// Graphing: data parsing, statistics, and SVG chart rendering.

const Stats = {
  mean: (a) => a.reduce((s, v) => s + v, 0) / a.length,
  variance(a) { const m = Stats.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); },
  sd: (a) => Math.sqrt(Stats.variance(a)),
  sem: (a) => Stats.sd(a) / Math.sqrt(a.length),
  quantile(a, q) {
    const s = [...a].sort((x, y) => x - y);
    const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  },

  // Regularised incomplete beta function I_x(a, b) (Numerical Recipes, continued fraction).
  betai(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lbeta = Stats.lgamma(a + b) - Stats.lgamma(a) - Stats.lgamma(b);
    const bt = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return (bt * Stats.betacf(a, b, x)) / a;
    return 1 - (bt * Stats.betacf(b, a, 1 - x)) / b;
  },
  betacf(a, b, x) {
    const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  },
  lgamma(x) {
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - Stats.lgamma(1 - x);
    x -= 1;
    let a = c[0];
    const t = x + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  },
  normCdf(z) { // Abramowitz–Stegun 7.1.26
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  },
  tTwoSidedP: (t, df) => Stats.betai(df / 2, 0.5, df / (df + t * t)),
  fP: (F, d1, d2) => Stats.betai(d2 / 2, d1 / 2, d2 / (d2 + d1 * F)),

  welch(a, b) {
    const va = Stats.variance(a) / a.length, vb = Stats.variance(b) / b.length;
    const t = (Stats.mean(a) - Stats.mean(b)) / Math.sqrt(va + vb);
    const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
    return { name: "Welch's t-test", t, df, p: Stats.tTwoSidedP(t, df) };
  },
  pairedT(a, b) {
    const d = a.map((v, i) => v - b[i]);
    const t = Stats.mean(d) / Stats.sem(d), df = d.length - 1;
    return { name: 'Paired t-test', t, df, p: Stats.tTwoSidedP(t, df) };
  },
  mannWhitney(a, b) { // normal approximation with tie correction
    const all = [...a.map((v) => [v, 0]), ...b.map((v) => [v, 1])].sort((x, y) => x[0] - y[0]);
    const ranks = new Array(all.length);
    let tieSum = 0;
    for (let i = 0; i < all.length;) {
      let j = i;
      while (j + 1 < all.length && all[j + 1][0] === all[i][0]) j++;
      const r = (i + j + 2) / 2, n = j - i + 1;
      tieSum += n ** 3 - n;
      for (let k = i; k <= j; k++) ranks[k] = r;
      i = j + 1;
    }
    const n1 = a.length, n2 = b.length, N = n1 + n2;
    const R1 = all.reduce((s, x, i) => s + (x[1] === 0 ? ranks[i] : 0), 0);
    const U = R1 - (n1 * (n1 + 1)) / 2;
    const sigma = Math.sqrt(((n1 * n2) / 12) * (N + 1 - tieSum / (N * (N - 1))));
    const z = (U - (n1 * n2) / 2) / sigma;
    return { name: 'Mann–Whitney U (normal approx.)', U, z, p: 2 * (1 - Stats.normCdf(Math.abs(z))) };
  },
  anova(groups) {
    const all = groups.flat(), gm = Stats.mean(all), k = groups.length, N = all.length;
    const ssb = groups.reduce((s, g) => s + g.length * (Stats.mean(g) - gm) ** 2, 0);
    const ssw = groups.reduce((s, g) => { const m = Stats.mean(g); return s + g.reduce((t, v) => t + (v - m) ** 2, 0); }, 0);
    const d1 = k - 1, d2 = N - k, F = ssb / d1 / (ssw / d2);
    return { name: 'One-way ANOVA', F, d1, d2, p: Stats.fP(F, d1, d2) };
  },
  linreg(x, y) {
    const mx = Stats.mean(x), my = Stats.mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    const slope = sxy / sxx, intercept = my - slope * mx, r = sxy / Math.sqrt(sxx * syy), n = x.length;
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    return { slope, intercept, r, r2: r * r, p: n > 2 ? Stats.tTwoSidedP(t, n - 2) : NaN };
  },
  outliersIQR(a) {
    const q1 = Stats.quantile(a, 0.25), q3 = Stats.quantile(a, 0.75), iqr = q3 - q1;
    return a.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
  },
};


// ---------- More statistics ----------
Object.assign(Stats, {
  // Regularised lower incomplete gamma P(a, x).
  gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) {
      let sum = 1 / a, del = sum, ap = a;
      for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
      return sum * Math.exp(-x + a * Math.log(x) - Stats.lgamma(a));
    }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a); b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d; const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - Stats.lgamma(a)) * h;
  },
  chi2P: (x, df) => 1 - Stats.gammaP(df / 2, x / 2),
  holm(ps) {
    const order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
    const adj = new Array(ps.length);
    let running = 0;
    order.forEach(([p, i], k) => { running = Math.max(running, Math.min(1, p * (ps.length - k))); adj[i] = running; });
    return adj;
  },
  // Kaplan–Meier estimate. times/events arrays (event 1 = event, 0 = censored).
  kaplanMeier(times, events) {
    const idx = times.map((t, i) => i).sort((a, b) => times[a] - times[b]);
    let atRisk = times.length, S = 1;
    const steps = [{ t: 0, s: 1 }], censored = [];
    for (let k = 0; k < idx.length;) {
      const t = times[idx[k]];
      let d = 0, c = 0;
      while (k < idx.length && times[idx[k]] === t) { if (events[idx[k]]) d++; else c++; k++; }
      if (d) { S *= 1 - d / atRisk; steps.push({ t, s: S }); }
      if (c) censored.push({ t, s: S });
      atRisk -= d + c;
    }
    const median = (steps.find((p) => p.s <= 0.5) || {}).t;
    return { steps, censored, median };
  },
  // Log-rank test across k groups.
  logRank(groups) {
    const all = [...new Set(groups.flatMap((g) => g.times.filter((t, i) => g.events[i])))].sort((a, b) => a - b);
    const k = groups.length, O = new Array(k).fill(0), E = new Array(k).fill(0);
    const V = Array.from({ length: k }, () => new Array(k).fill(0));
    for (const t of all) {
      const n = groups.map((g) => g.times.filter((x) => x >= t).length);
      const d = groups.map((g) => g.times.filter((x, i) => x === t && g.events[i]).length);
      const N = n.reduce((a, b) => a + b, 0), D = d.reduce((a, b) => a + b, 0);
      if (N < 2) continue;
      for (let i = 0; i < k; i++) {
        O[i] += d[i]; E[i] += (D * n[i]) / N;
        for (let j = 0; j < k; j++) V[i][j] += (D * (N - D) * n[i] * ((i === j ? N : 0) - n[j])) / (N * N * (N - 1));
      }
    }
    // chi2 = (O-E)' V^-1 (O-E) using the first k-1 groups.
    const m = k - 1, z = O.slice(0, m).map((o, i) => o - E[i]);
    const A = V.slice(0, m).map((r) => r.slice(0, m));
    const inv = invert(A);
    let chi2 = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) chi2 += z[i] * inv[i][j] * z[j];
    return { name: 'Log-rank (Mantel–Cox)', chi2, df: m, p: Stats.chi2P(chi2, m), O, E };
  },
  // Four-parameter logistic fit (Nelder–Mead on SSE) in log10(dose).
  fit4PL(x, y) {
    const lx = x.map(Math.log10);
    const f = ([bot, top, logec, hill], v) => bot + (top - bot) / (1 + 10 ** ((logec - v) * hill));
    const sse = (p) => lx.reduce((s, v, i) => s + (f(p, v) - y[i]) ** 2, 0);
    const ymin = Math.min(...y), ymax = Math.max(...y);
    let simplex = [[ymin, ymax, (Math.min(...lx) + Math.max(...lx)) / 2, 1]];
    for (let i = 0; i < 4; i++) { const q = [...simplex[0]]; q[i] += i < 2 ? (ymax - ymin) * 0.1 || 1 : 0.5; simplex.push(q); }
    for (let it = 0; it < 4000; it++) {
      simplex.sort((a, b) => sse(a) - sse(b));
      const c = [0, 1, 2, 3].map((j) => simplex.slice(0, 4).reduce((s, p) => s + p[j], 0) / 4);
      const w = simplex[4], refl = c.map((v, j) => v + (v - w[j]));
      if (sse(refl) < sse(simplex[0])) { const exp = c.map((v, j) => v + 2 * (v - w[j])); simplex[4] = sse(exp) < sse(refl) ? exp : refl; }
      else if (sse(refl) < sse(simplex[3])) simplex[4] = refl;
      else {
        const con = c.map((v, j) => v + 0.5 * (w[j] - v));
        if (sse(con) < sse(w)) simplex[4] = con;
        else simplex = simplex.map((p) => p.map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j])));
      }
      if (Math.abs(sse(simplex[0]) - sse(simplex[4])) < 1e-12) break;
    }
    const p = simplex[0], my = Stats.mean(y);
    const r2 = 1 - sse(p) / y.reduce((s, v) => s + (v - my) ** 2, 0);
    return { bottom: p[0], top: p[1], ec50: 10 ** p[2], hill: p[3], r2, f: (v) => f(p, Math.log10(v)) };
  },
});
function invert(M) {
  const n = M.length, A = M.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
    [A[i], A[piv]] = [A[piv], A[i]];
    const d = A[i][i] || 1e-12;
    for (let j = 0; j < 2 * n; j++) A[i][j] /= d;
    for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i]; for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[i][j]; }
  }
  return A.map((r) => r.slice(n));
}

function fmtP(p) {
  if (!isFinite(p)) return 'p = n/a';
  return p < 0.0001 ? 'p < 0.0001' : `p = ${p.toPrecision(2)}`;
}
function stars(p) { return p < 0.0001 ? '****' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : 'ns'; }

// Parse pasted CSV / TSV: first row = headers. Returns numeric columns plus the raw strings.
function parseTable(text) {
  const lines = String(text || '').trim().split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], cols: [], raw: [] };
  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : /\s+/;
  const rows = lines.map((l) => l.split(delim).map((s) => s.trim()));
  const headerIsText = rows[0].some((v) => v !== '' && isNaN(Number(v)));
  const headers = headerIsText ? rows.shift() : rows[0].map((_, i) => `Group ${i + 1}`);
  const cols = headers.map((_, c) => rows.map((r) => (r[c] === undefined || r[c] === '' ? NaN : Number(r[c]))));
  const raw = headers.map((_, c) => rows.map((r) => r[c] ?? ''));
  return { headers, cols, raw };
}

function niceTicks(min, max, count = 5) {
  if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / count, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toPrecision(10));
  return ticks;
}

const CHART_PALETTE = ['#4a7fd6', '#e8743b', '#3fa58b', '#d6584a', '#9b7fd1', '#e8b33c', '#5bb5e0', '#7a8a96'];
const CHART_KINDS = [['bar', 'Bar / column (mean ± error)'], ['box', 'Box plot'], ['scatter', 'Scatter + linear regression'], ['line', 'Line (XY)'], ['dose', 'Dose–response (4PL, EC50)'], ['survival', 'Survival (Kaplan–Meier)'], ['heatmap', 'Heatmap']];

// Returns { svg, report } where svg renders into a w x h box and report summarises the analysis.
function renderChart(cfg, w, h) {
  const parsed = parseTable(cfg.data || '');
  const { headers, cols, raw } = typeof transformTable === 'function' ? transformTable(parsed, cfg) : parsed;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const font = 'font-family="Helvetica, Arial, sans-serif"';
  const pal = cfg.colors && cfg.colors.length ? cfg.colors : CHART_PALETTE;
  const report = [], groupLines = [];
  if (!cols.length || !cols[0].length) return { svg: `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" ${font} font-size="14" fill="#888">No data</text>`, report: ['No data'] };
  if (cfg.kind === 'heatmap') return renderHeatmap(cfg, headers, cols, raw, w, h, esc, font);
  if (typeof EXTRA_CHARTS !== 'undefined' && EXTRA_CHARTS[cfg.kind]) {
    try {
      const r = EXTRA_CHARTS[cfg.kind](cfg, { headers, cols, raw }, w, h, pal);
      return { svg: `<g ${font} font-size="11" fill="#333">${r.svg}</g>`, report: r.report.filter(Boolean), suggestion: r.suggestion };
    } catch (e) { return { svg: `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" ${font} font-size="13" fill="#d64545">Can't plot this data: ${esc(e.message)}</text>`, report: ['Check the data format (see the hint above the data box).'] }; }
  }
  let suggestion;

  const anovaLine = ['bar', 'box'].includes(cfg.kind) && cols.length > 2 && cfg.test !== 'none';
  const m = { l: 62, r: 16, t: (cfg.title ? 34 : 14) + (anovaLine ? 16 : 0), b: cfg.xLabel ? 54 : 38 };
  const pw = Math.max(10, w - m.l - m.r), ph = Math.max(10, h - m.t - m.b);
  let out = '';
  const isXY = ['scatter', 'line', 'dose', 'survival'].includes(cfg.kind);
  let series = [], X, Y, yt, xt, logX = cfg.kind === 'dose';
  let brackets = [];

  if (cfg.kind === 'survival') {
    // Columns: time, event (1/0), optional group.
    const gcol = raw[2], groupsMap = new Map();
    cols[0].forEach((t, i) => {
      if (!isFinite(t) || !isFinite(cols[1][i])) return;
      const g = gcol ? gcol[i] || 'All' : 'All';
      if (!groupsMap.has(g)) groupsMap.set(g, { name: g, times: [], events: [] });
      groupsMap.get(g).times.push(t); groupsMap.get(g).events.push(cols[1][i] ? 1 : 0);
    });
    series = [...groupsMap.values()];
    const tmax = Math.max(...series.flatMap((g) => g.times));
    xt = niceTicks(0, tmax); yt = [0, 0.25, 0.5, 0.75, 1];
    series.forEach((g) => { g.km = Stats.kaplanMeier(g.times, g.events); report.push(`${g.name}: n = ${g.times.length}, events = ${g.events.filter(Boolean).length}, median survival = ${g.km.median ?? 'not reached'}`); });
    if (series.length > 1 && cfg.test !== 'none') { const lr = Stats.logRank(series); report.push(`${lr.name}: χ²(${lr.df}) = ${lr.chi2.toFixed(3)}, ${fmtP(lr.p)}`); series.lr = lr; }
    if (series.length === 2 && cfg.test !== 'none' && typeof Stats.coxUnivariate === 'function') {
      const tt = [...series[0].times, ...series[1].times], ev = [...series[0].events, ...series[1].events], xx = [...series[0].times.map(() => 0), ...series[1].times.map(() => 1)];
      const cx = Stats.coxUnivariate(tt, ev, xx);
      report.push(Math.abs(cx.beta) > 10 ? `${cx.name}: not estimable — the groups are completely separated (every event in one group precedes the other's), so the hazard ratio is unbounded.` : `${cx.name}: hazard ratio ${series[1].name} vs ${series[0].name} = ${cx.hr.toPrecision(3)} (95% CI ${cx.lo.toPrecision(3)}–${cx.hi.toPrecision(3)}), ${fmtP(cx.p)}`);
    }
  } else if (isXY) {
    const xs = cols[0];
    series = cols.slice(1).map((ys, i) => ({ name: headers[i + 1], pts: xs.map((x, k) => [x, ys[k]]).filter(([x, y]) => isFinite(x) && isFinite(y) && (!logX || x > 0)) }));
    if (logX && xs.some((x) => x <= 0)) report.push('Doses ≤ 0 omitted from the log-scale fit and plot.');
    const allX = series.flatMap((s) => s.pts.map((p) => p[0])), allY = series.flatMap((s) => s.pts.map((p) => p[1]));
    xt = logX ? (() => { const a = Math.floor(Math.log10(Math.min(...allX))), b = Math.ceil(Math.log10(Math.max(...allX))); return Array.from({ length: b - a + 1 }, (_, i) => a + i); })() : niceTicks(Math.min(...allX), Math.max(...allX));
    yt = niceTicks(Math.min(...allY, cfg.kind === 'dose' ? Infinity : Math.min(...allY)), Math.max(...allY) * 1.02);
  } else {
    series = cols.map((c, i) => ({ name: headers[i], g: c.filter(isFinite) }));
    const groups = series.map((s) => s.g);
    const tops = groups.map((g) => !g.length ? 0 : cfg.kind === 'box' || cfg.showPoints ? Math.max(...g) : Stats.mean(g) + (g.length > 1 ? (cfg.error === 'sem' ? Stats.sem(g) : Stats.sd(g)) : 0));
    if (typeof groupAnalysis === 'function') {
      const an = groupAnalysis(groups, headers, cfg);
      report.push(...an.lines); brackets = an.brackets; suggestion = an.suggestion;
    }
    yt = niceTicks(Math.min(0, ...groups.flat()), Math.max(...tops) * (1.02 + 0.1 * brackets.length));
  }
  const yLog = cfg.yLog && ['scatter', 'line'].includes(cfg.kind);
  if (yLog) {
    for (const sr of series) sr.pts = (sr.pts || []).filter((p) => p[1] > 0).map((p) => [p[0], Math.log10(p[1])]);
    const ly = series.flatMap((sr) => sr.pts.map((p) => p[1]));
    yt = Array.from({ length: Math.ceil(Math.max(...ly)) - Math.floor(Math.min(...ly)) + 1 }, (_, i) => Math.floor(Math.min(...ly)) + i);
    report.push('Y axis on log₁₀ scale (values ≤ 0 omitted); regression is fitted to log₁₀(y).');
  } else if ((cfg.yMin !== '' && cfg.yMin != null && isFinite(+cfg.yMin)) || (cfg.yMax !== '' && cfg.yMax != null && isFinite(+cfg.yMax))) {
    yt = niceTicks(cfg.yMin !== '' && cfg.yMin != null && isFinite(+cfg.yMin) ? +cfg.yMin : yt[0], cfg.yMax !== '' && cfg.yMax != null && isFinite(+cfg.yMax) ? +cfg.yMax : yt[yt.length - 1]);
  }
  const y0 = yt[0], y1 = yt[yt.length - 1];
  Y = (v) => m.t + ph - ((Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0)) * ph;

  out += `<g ${font} font-size="11" fill="#333">`;
  yt.forEach((v) => {
    out += `<line x1="${m.l - 5}" y1="${Y(v)}" x2="${m.l}" y2="${Y(v)}" stroke="#333"/>`;
    out += `<text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${yLog ? (v === 0 ? '1' : `10${v < 0 ? '⁻' : ''}${String(Math.abs(v)).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}`) : +v.toPrecision(6)}</text>`;
    if (cfg.grid) out += `<line x1="${m.l}" y1="${Y(v)}" x2="${m.l + pw}" y2="${Y(v)}" stroke="#e3e6ea"/>`;
  });
  out += `<line x1="${m.l}" y1="${m.t}" x2="${m.l}" y2="${m.t + ph}" stroke="#333" stroke-width="1.5"/>`;
  out += `<line x1="${m.l}" y1="${m.t + ph}" x2="${m.l + pw}" y2="${m.t + ph}" stroke="#333" stroke-width="1.5"/>`;

  if (isXY) {
    const xa = xt[0], xb = xt[xt.length - 1];
    X = (v) => m.l + (((logX ? Math.log10(v) : v) - xa) / (xb - xa)) * pw;
    xt.forEach((v) => {
      const xv = logX ? 10 ** v : v;
      out += `<line x1="${X(xv)}" y1="${m.t + ph}" x2="${X(xv)}" y2="${m.t + ph + 5}" stroke="#333"/>`;
      out += `<text x="${X(xv)}" y="${m.t + ph + 18}" text-anchor="middle">${logX ? (v === 0 ? '1' : `10${v < 0 ? '⁻' : ''}${String(Math.abs(v)).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('')}`) : +v.toPrecision(6)}</text>`;
    });
    series.forEach((sr, si) => {
      const col = pal[si % pal.length];
      if (cfg.kind === 'survival') {
        let d = `M${X(0)} ${Y(1)}`, last = { s: 1 };
        for (const st of sr.km.steps.slice(1)) { d += ` H${X(st.t)} V${Y(st.s)}`; last = st; }
        d += ` H${X(Math.max(...sr.times))}`;
        out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`;
        sr.km.censored.forEach((c) => { out += `<path d="M${X(c.t)} ${Y(c.s) - 4} V${Y(c.s) + 4}" stroke="${col}" stroke-width="1.5"/>`; });
        return;
      }
      if (cfg.kind === 'line' && typeof Stats.auc === 'function' && sr.pts.length > 1) report.push(`${sr.name}: AUC (trapezoidal) = ${Stats.auc(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1])).toPrecision(4)}`);
      if (cfg.kind === 'line') out += `<polyline points="${sr.pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2"/>`;
      sr.pts.forEach(([x, y]) => { out += `<circle cx="${X(x)}" cy="${Y(y)}" r="3.5" fill="${col}" stroke="#fff" stroke-width="0.8"/>`; });
      if (cfg.kind === 'scatter' && cfg.test !== 'none' && sr.pts.length > 3 && (cfg.fit === 'poly2' || cfg.fit === 'poly3')) {
        const deg = cfg.fit === 'poly2' ? 2 : 3, pf = Stats.polyfit(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1]), deg);
        let d = '';
        for (let k = 0; k <= 80; k++) { const v = xa + ((xb - xa) * k) / 80; d += `${k ? 'L' : 'M'}${X(v)} ${Y(pf.f(v))} `; }
        out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
        const sp = Stats.spearman(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1]));
        report.push(`${sr.name}: degree-${deg} polynomial y = ${pf.coef.map((c, k) => `${c.toPrecision(3)}${k ? `x${k > 1 ? '^' + k : ''}` : ''}`).join(' + ')}, R² = ${pf.r2.toFixed(3)}; Spearman ρ = ${sp.rho.toFixed(3)}, ${fmtP(sp.p)}`);
        out += `<text x="${m.l + pw - 4}" y="${m.t + 14 + si * 14}" text-anchor="end" fill="${col}">R² = ${pf.r2.toFixed(3)}</text>`;
      } else if (cfg.kind === 'scatter' && cfg.test !== 'none' && cfg.fit !== 'none' && sr.pts.length > 2) {
        const lr = Stats.linreg(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1]));
        if (typeof Stats.spearman === 'function') { const sp = Stats.spearman(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1])); report.push(`${sr.name}: Spearman ρ = ${sp.rho.toFixed(3)}, ${fmtP(sp.p)}${sp.exact ? ' (exact permutation p)' : ''}`); }
        out += `<line x1="${X(xa)}" y1="${Y(lr.intercept + lr.slope * xa)}" x2="${X(xb)}" y2="${Y(lr.intercept + lr.slope * xb)}" stroke="${col}" stroke-width="1.5" stroke-dasharray="5 3"/>`;
        report.push(`${sr.name}: y = ${lr.slope.toPrecision(3)}x + ${lr.intercept.toPrecision(3)}, R² = ${lr.r2.toFixed(3)}, Pearson r = ${lr.r.toFixed(3)}, ${fmtP(lr.p)} (n = ${sr.pts.length})`);
        out += `<text x="${m.l + pw - 4}" y="${m.t + 14 + si * 14}" text-anchor="end" fill="${col}">R² = ${lr.r2.toFixed(3)}</text>`;
      }
      if (cfg.kind === 'dose' && sr.pts.length >= 4) {
        const fit = Stats.fit4PL(sr.pts.map((p) => p[0]), sr.pts.map((p) => p[1]));
        let d = '';
        for (let k = 0; k <= 80; k++) { const lv = xa + ((xb - xa) * k) / 80, v = 10 ** lv, yv = Math.max(y0, Math.min(y1, fit.f(v))); d += `${k ? 'L' : 'M'}${X(v)} ${Y(yv)} `; }
        out += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2"/>`;
        const inhib = fit.f(10 ** xb) < fit.f(10 ** xa);
        report.push(`${sr.name}: 4PL fit — ${inhib ? 'IC50' : 'EC50'} = ${fit.ec50.toPrecision(3)}, Hill slope = ${fit.hill.toFixed(2)}, bottom = ${fit.bottom.toPrecision(3)}, top = ${fit.top.toPrecision(3)}, R² = ${fit.r2.toFixed(3)}`);
        if (cfg.showEC50 !== false) out += `<line x1="${X(fit.ec50)}" y1="${m.t + ph}" x2="${X(fit.ec50)}" y2="${Y(fit.f(fit.ec50))}" stroke="${col}" stroke-dasharray="3 3"/>`;
      }
    });
    if (series.length > 1) series.forEach((sr, si) => { out += `<rect x="${m.l + pw - 110}" y="${m.t + 4 + si * 15}" width="10" height="10" fill="${pal[si % pal.length]}"/><text x="${m.l + pw - 96}" y="${m.t + 13 + si * 15}">${esc(sr.name)}</text>`; });
    if (series.lr) out += `<text x="${m.l + 8}" y="${m.t + ph - 8}">Log-rank ${fmtP(series.lr.p)}</text>`;
  } else {
    const n = series.length, band = pw / n, bw = Math.min(band * 0.6, 70);
    const cx = (i) => m.l + band * (i + 0.5);
    series.forEach(({ name, g }, i) => {
      const col = pal[i % pal.length];
      out += `<text x="${cx(i)}" y="${m.t + ph + 18}" text-anchor="middle">${esc(name)}</text>`;
      if (!g.length) return;
      if (cfg.kind === 'box') {
        const q1 = Stats.quantile(g, 0.25), med = Stats.quantile(g, 0.5), q3 = Stats.quantile(g, 0.75);
        const iqr = q3 - q1, lo = Math.min(...g.filter((v) => v >= q1 - 1.5 * iqr)), hi = Math.max(...g.filter((v) => v <= q3 + 1.5 * iqr));
        out += `<line x1="${cx(i)}" y1="${Y(lo)}" x2="${cx(i)}" y2="${Y(hi)}" stroke="#333"/>`;
        out += `<line x1="${cx(i) - bw / 4}" y1="${Y(lo)}" x2="${cx(i) + bw / 4}" y2="${Y(lo)}" stroke="#333"/><line x1="${cx(i) - bw / 4}" y1="${Y(hi)}" x2="${cx(i) + bw / 4}" y2="${Y(hi)}" stroke="#333"/>`;
        out += `<rect x="${cx(i) - bw / 2}" y="${Y(q3)}" width="${bw}" height="${Math.max(1, Y(q1) - Y(q3))}" fill="${Color.light(col, 0.45)}" stroke="${col}" stroke-width="1.5"/>`;
        out += `<line x1="${cx(i) - bw / 2}" y1="${Y(med)}" x2="${cx(i) + bw / 2}" y2="${Y(med)}" stroke="${Color.dark(col)}" stroke-width="2.5"/>`;
        g.filter((v) => v < lo || v > hi).forEach((v) => { out += `<circle cx="${cx(i)}" cy="${Y(v)}" r="3" fill="none" stroke="${col}"/>`; });
      } else {
        const mu = Stats.mean(g), err = g.length > 1 ? (cfg.error === 'sem' ? Stats.sem(g) : Stats.sd(g)) : 0;
        out += `<rect x="${cx(i) - bw / 2}" y="${Math.min(Y(mu), Y(0))}" width="${bw}" height="${Math.abs(Y(0) - Y(mu))}" fill="${Color.light(col, 0.25)}" stroke="${col}" stroke-width="1.5"/>`;
        if (err) out += `<line x1="${cx(i)}" y1="${Y(mu - err)}" x2="${cx(i)}" y2="${Y(mu + err)}" stroke="#333" stroke-width="1.5"/><line x1="${cx(i) - bw / 6}" y1="${Y(mu + err)}" x2="${cx(i) + bw / 6}" y2="${Y(mu + err)}" stroke="#333" stroke-width="1.5"/>`;
      }
      if (cfg.showPoints) g.forEach((v, k) => { const j = ((k * 7919) % 13) / 13 - 0.5; out += `<circle cx="${cx(i) + j * bw * 0.5}" cy="${Y(v)}" r="2.8" fill="${Color.dark(col, 0.2)}" opacity=".8"/>`; });
      const outl = g.length >= 4 ? Stats.outliersIQR(g) : [];
      groupLines.push(`${name}: n = ${g.length}, mean = ${Stats.mean(g).toPrecision(4)}, SD = ${g.length > 1 ? Stats.sd(g).toPrecision(3) : 'n/a'}, median = ${Stats.quantile(g, 0.5).toPrecision(4)}${outl.length ? `, possible outliers (1.5×IQR): ${outl.join(', ')} — investigate, don't auto-exclude` : ''}`);
    });
    // Significance brackets, stacked above the data.
    const dataTop = Math.max(...series.flatMap((s) => (s.g.length ? [Math.max(...s.g), Stats.mean(s.g) + (s.g.length > 1 ? Stats.sd(s.g) : 0)] : [0])));
    brackets.sort((a, b) => (a.b - a.a) - (b.b - b.a)).forEach((br, k) => {
      const top = Y(dataTop) - 14 - k * 18;
      out += `<path d="M${cx(br.a)} ${top + 6} V${top} H${cx(br.b)} V${top + 6}" stroke="#333" fill="none" stroke-width="1.2"/>`;
      out += `<text x="${(cx(br.a) + cx(br.b)) / 2}" y="${top - 4}" text-anchor="middle" font-size="12">${cfg.pStyle === 'value' ? fmtP(br.p) : stars(br.p)}</text>`;
    });
    if (series.length > 2 && report.some((r) => r.startsWith('One-way'))) out += `<text x="${m.l + pw / 2}" y="${m.t - 8}" text-anchor="middle" font-size="11" fill="#555">${esc(report.find((r) => r.startsWith('One-way')).replace(/^One-way ANOVA: .*?, /, 'ANOVA '))}</text>`;
  }
  if (cfg.title) out += `<text x="${m.l + pw / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${esc(cfg.title)}</text>`;
  if (cfg.xLabel) out += `<text x="${m.l + pw / 2}" y="${h - 10}" text-anchor="middle" font-size="12">${esc(cfg.xLabel)}</text>`;
  if (cfg.yLabel) out += `<text transform="translate(16 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12">${esc(cfg.yLabel)}</text>`;
  out += '</g>';
  return { svg: out, report: [...groupLines, ...report], suggestion };
}

function renderHeatmap(cfg, headers, cols, raw, w, h, esc, font) {
  const rowLabels = raw[0], colLabels = headers.slice(1), vals = cols.slice(1);
  const nR = rowLabels.length, nC = colLabels.length;
  const flat = vals.flat().filter(isFinite), lo = Math.min(...flat), hi = Math.max(...flat);
  const longest = Math.max(...colLabels.map((l) => l.length));
  const m = { l: 80, r: 60, t: (cfg.title ? 34 : 10) + Math.max(22, Math.min(70, longest * 4.5)), b: 10 };
  const cw = (w - m.l - m.r) / nC, ch = (h - m.t - m.b) / nR;
  const ramp = cfg.scheme === 'diverging' ? ['#3b6fd6', '#f7f7f7', '#d64545'] : ['#f7fbff', '#6baed6', '#08306b'];
  const colorAt = (t) => t < 0.5 ? Color.mix(ramp[0], ramp[1], t * 2) : Color.mix(ramp[1], ramp[2], (t - 0.5) * 2);
  let out = `<g ${font} font-size="11" fill="#333">`;
  for (let r = 0; r < nR; r++) {
    out += `<text x="${m.l - 6}" y="${m.t + ch * (r + 0.5) + 4}" text-anchor="end">${esc(rowLabels[r])}</text>`;
    for (let c = 0; c < nC; c++) {
      const v = vals[c][r], t = isFinite(v) ? (v - lo) / (hi - lo || 1) : null;
      out += `<rect x="${m.l + c * cw}" y="${m.t + r * ch}" width="${cw}" height="${ch}" fill="${t === null ? '#ddd' : colorAt(t)}" stroke="#fff"/>`;
      if (cfg.showValues && isFinite(v)) out += `<text x="${m.l + c * cw + cw / 2}" y="${m.t + r * ch + ch / 2 + 4}" text-anchor="middle" fill="${t > 0.6 && cfg.scheme !== 'diverging' ? '#fff' : '#222'}" font-size="10">${+v.toPrecision(3)}</text>`;
    }
  }
  const rot = colLabels.some((l) => l.length * 6.2 > cw);
  colLabels.forEach((l, c) => { const x = m.l + c * cw + cw / 2; out += rot ? `<text transform="translate(${x + 3} ${m.t - 5}) rotate(-35)" font-size="10">${esc(l)}</text>` : `<text x="${x}" y="${m.t - 6}" text-anchor="middle">${esc(l)}</text>`; });
  for (let k = 0; k < 40; k++) out += `<rect x="${w - m.r + 16}" y="${m.t + (h - m.t - m.b) * (1 - (k + 1) / 40)}" width="12" height="${(h - m.t - m.b) / 40 + 0.5}" fill="${colorAt(k / 39)}"/>`;
  out += `<text x="${w - m.r + 32}" y="${m.t + 8}">${+hi.toPrecision(3)}</text><text x="${w - m.r + 32}" y="${h - m.b}">${+lo.toPrecision(3)}</text>`;
  if (cfg.title) out += `<text x="${w / 2}" y="20" text-anchor="middle" font-size="14" font-weight="700">${esc(cfg.title)}</text>`;
  return { svg: out + '</g>', report: [`${nR} rows × ${nC} columns, range ${+lo.toPrecision(4)} – ${+hi.toPrecision(4)}`] };
}
