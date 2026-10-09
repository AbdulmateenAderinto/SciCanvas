// More statistics (v0.9): accurate normal / t distributions, studentized range (Tukey), Dunnett's
// multivariate t, post-hoc comparisons (Tukey–Kramer, Dunnett, Games–Howell, Bonferroni, Šídák, Dunn),
// Welch's ANOVA, Brown–Forsythe / Levene, Greenhouse–Geisser / Mauchly, one-sample and lognormal tests,
// Grubbs outliers, contingency tables (χ², Fisher's exact, OR / RR), ROC with DeLong, Bland–Altman,
// Deming regression, multiple linear regression, n-way ANOVA, and Levenberg–Marquardt curve fitting with
// standard errors and the extra-sum-of-squares F test. Pure functions only; charts live in statcharts.js.

// ---------- Distributions ----------
// Standard normal CDF to double precision (Hart 1968, as given by West 2005).
function pnorm(x) {
  const a = Math.abs(x);
  let c;
  if (a > 37) c = 0;
  else {
    const e = Math.exp(-a * a / 2);
    if (a < 7.07106781186547) {
      let n = 3.52624965998911e-2 * a + 0.700383064443688;
      n = n * a + 6.37396220353165; n = n * a + 33.912866078383; n = n * a + 112.079291497871;
      n = n * a + 221.213596169931; n = n * a + 220.206867912376;
      let d = 8.83883476483184e-2 * a + 1.75566716318264;
      d = d * a + 16.064177579207; d = d * a + 86.7807322029461; d = d * a + 296.564248779674;
      d = d * a + 637.333633378831; d = d * a + 793.826512519948; d = d * a + 440.413735824752;
      c = (e * n) / d;
    } else {
      let b = a + 0.65;
      b = a + 4 / b; b = a + 3 / b; b = a + 2 / b; b = a + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}
const pnormUpper = (x) => pnorm(-x);
// Two-sided normal p-value that keeps precision in the far tail.
const pnorm2 = (z) => Math.min(1, 2 * pnormUpper(Math.abs(z)));
// Student t CDF (lower tail).
function pt(t, df) {
  const tail = 0.5 * Stats.betai(df / 2, 0.5, df / (df + t * t));
  return t > 0 ? 1 - tail : tail;
}
// Quantile of Student t (two-sided level → positive critical value) by bisection on the accurate tail.
function qt(p, df) { // lower-tail quantile
  if (p === 0.5) return 0;
  const upper = p > 0.5, tail = upper ? 1 - p : p;
  let lo = 0, hi = 1;
  while (0.5 * Stats.betai(df / 2, 0.5, df / (df + hi * hi)) > tail && hi < 1e8) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (0.5 * Stats.betai(df / 2, 0.5, df / (df + mid * mid)) > tail) lo = mid; else hi = mid;
    if (hi - lo < 1e-12 * Math.max(1, mid)) break;
  }
  const v = (lo + hi) / 2;
  return upper ? v : -v;
}
// Lower-tail CDF of the F distribution.
const pf = (F, d1, d2) => (F <= 0 ? 0 : 1 - Stats.fP(F, d1, d2));
const qnorm = (p) => invNorm(p);

// Studentized range distribution P(Q < q) for cc means and df degrees of freedom (rr = 1).
// Port of R's ptukey / wprob (Copenhaver & Holland 1988, AS 190).
function tukeyWprob(w, rr, cc) {
  const nleg = 12, ihalf = 6, C1 = -30, C2 = -50, C3 = 60, bb = 8, wlar = 3, wincr1 = 2, wincr2 = 3;
  const xleg = [0.9815606342467192, 0.9041172563704749, 0.7699026741943047, 0.5873179542866175, 0.3678314989981802, 0.1252334085114689];
  const aleg = [0.04717533638651183, 0.10693932599531843, 0.16007832854334622, 0.20316742672306592, 0.2334925365383548, 0.24914704581340277];
  const qsqz = w * 0.5;
  if (qsqz >= bb) return 1;
  let prW = 2 * pnorm(qsqz) - 1;
  prW = prW >= Math.exp(C2 / cc) ? prW ** cc : 0;
  const wincr = w > wlar ? wincr1 : wincr2;
  let blb = qsqz;
  const binc = (bb - qsqz) / wincr;
  let bub = blb + binc, einsum = 0;
  const cc1 = cc - 1;
  for (let wi = 1; wi <= wincr; wi++) {
    let elsum = 0;
    const a = 0.5 * (bub + blb), b = 0.5 * (bub - blb);
    for (let jj = 1; jj <= nleg; jj++) {
      let j, xx;
      if (ihalf < jj) { j = nleg - jj + 1; xx = xleg[j - 1]; } else { j = jj; xx = -xleg[j - 1]; }
      const ac = a + b * xx, qexpo = ac * ac;
      if (qexpo > C3) break;
      const pplus = 2 * pnorm(ac), pminus = 2 * pnorm(ac - w);
      let rinsum = pplus * 0.5 - pminus * 0.5;
      if (rinsum >= Math.exp(C1 / cc1)) { rinsum = aleg[j - 1] * Math.exp(-(0.5 * qexpo)) * rinsum ** cc1; elsum += rinsum; }
    }
    elsum *= (2 * b * cc) / Math.sqrt(2 * Math.PI);
    einsum += elsum;
    blb = bub; bub += binc;
  }
  prW += einsum;
  if (prW <= Math.exp(C1 / rr)) return 0;
  prW = prW ** rr;
  return prW >= 1 ? 1 : prW;
}
function ptukey(q, cc, df, rr = 1) {
  if (!(q > 0)) return 0;
  if (!isFinite(q)) return 1;
  if (df > 25000) return tukeyWprob(q, rr, cc);
  const nlegq = 16, ihalfq = 8, eps1 = -30, eps2 = 1e-14;
  const xlegq = [0.9894009349916499, 0.9445750230732326, 0.8656312023878318, 0.755404408355003, 0.6178762444026438, 0.45801677765722737, 0.2816035507792589, 0.09501250983763744];
  const alegq = [0.027152459411754096, 0.062253523938647894, 0.09515851168249279, 0.12462897125553388, 0.14959598881657674, 0.16915651939500254, 0.18260341504492358, 0.1894506104550685];
  const f2 = df * 0.5;
  let f2lf = f2 * Math.log(df) - df * Math.LN2 - Stats.lgamma(f2);
  const f21 = f2 - 1, ff4 = df * 0.25;
  const ulen = df <= 100 ? 1 : df <= 800 ? 0.5 : df <= 5000 ? 0.25 : 0.125;
  f2lf += Math.log(ulen);
  let ans = 0, otsum = 0;
  for (let i = 1; i <= 50; i++) {
    otsum = 0;
    const twa1 = (2 * i - 1) * ulen;
    for (let jj = 1; jj <= nlegq; jj++) {
      let j, t1;
      if (ihalfq < jj) { j = jj - ihalfq - 1; t1 = f2lf + f21 * Math.log(twa1 + xlegq[j] * ulen) - (xlegq[j] * ulen + twa1) * ff4; }
      else { j = jj - 1; t1 = f2lf + f21 * Math.log(twa1 - xlegq[j] * ulen) + (xlegq[j] * ulen - twa1) * ff4; }
      if (t1 >= eps1) {
        const qsqz = ihalfq < jj ? q * Math.sqrt((xlegq[j] * ulen + twa1) * 0.5) : q * Math.sqrt((-(xlegq[j] * ulen) + twa1) * 0.5);
        otsum += tukeyWprob(qsqz, rr, cc) * alegq[j] * Math.exp(t1);
      }
    }
    if (i * ulen >= 1 && otsum <= eps2) break;
    ans += otsum;
  }
  return Math.min(1, ans);
}
const ptukeyUpper = (q, k, df) => Math.max(0, 1 - ptukey(q, k, df));

// Dunnett: P(max_i |T_i| <= c) for comparisons of k treatments with one control, where the T_i share
// a pooled SD with df degrees of freedom and correlations λ_i λ_j (λ_i = sqrt(n_i / (n_i + n_0))).
// One-dimensional integral over the shared control term, then over the SD (chi / sqrt(df)).
function dunnettCdf(c, lambdas, df) {
  const sq = lambdas.map((l) => Math.sqrt(1 - l * l));
  const inner = (cs) => { // integrate over u ~ N(0,1) with Simpson's rule on [-8, 8]
    const n = 160, a = -8, h = 16 / n;
    let s = 0;
    for (let i = 0; i <= n; i++) {
      const u = a + i * h;
      let prod = Math.exp(-u * u / 2) / Math.sqrt(2 * Math.PI);
      for (let j = 0; j < lambdas.length; j++) prod *= pnorm((cs - lambdas[j] * u) / sq[j]) - pnorm((-cs - lambdas[j] * u) / sq[j]);
      s += prod * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
    }
    return (s * h) / 3;
  };
  if (!isFinite(df) || df > 2000) return inner(c);
  // density of s = sqrt(chi2_df / df)
  const logC = Math.log(2) + (df / 2) * Math.log(df / 2) - Stats.lgamma(df / 2);
  const dens = (s) => (s <= 0 ? 0 : Math.exp(logC + (df - 1) * Math.log(s) - (df * s * s) / 2));
  const sd = 1 / Math.sqrt(2 * df), lo = Math.max(1e-9, 1 - 9 * sd - 0.2), hi = 1 + 12 * sd + 0.5;
  const n = 120, h = (hi - lo) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) { const x = lo + i * h; s += dens(x) * inner(c * x) * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2); }
  return Math.min(1, (s * h) / 3);
}

// ---------- Helpers ----------
const sum = (a) => a.reduce((s, v) => s + v, 0);
const sq = (v) => v * v;
const ssDev = (a) => { const m = Stats.mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0); };
function rankAll(values) { // average ranks with tie groups
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]), r = new Array(values.length), ties = [];
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    if (j > i) ties.push(j - i + 1);
    i = j + 1;
  }
  return { r, ties };
}
const adjust = {
  bonferroni: (ps) => ps.map((p) => Math.min(1, p * ps.length)),
  sidak: (ps) => ps.map((p) => Math.min(1, 1 - (1 - p) ** ps.length)),
  holm: (ps) => Stats.holm(ps),
  holmSidak(ps) {
    const order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), out = new Array(ps.length);
    let run = 0;
    order.forEach(([p, i], k) => { run = Math.max(run, Math.min(1, 1 - (1 - p) ** (ps.length - k))); out[i] = run; });
    return out;
  },
  bh(ps) { // Benjamini–Hochberg
    const m = ps.length, order = ps.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]), out = new Array(m);
    let run = 1;
    order.forEach(([p, i], k) => { run = Math.min(run, (p * m) / (m - k)); out[i] = Math.min(1, run); });
    return out;
  },
};

Object.assign(Stats, {
  pnorm, pt, qt, pf, ptukey, dunnettCdf, adjust,

  // ---------- One-sample, lognormal ----------
  oneSampleT(a, mu = 0) {
    const n = a.length, m = Stats.mean(a), se = Stats.sem(a), t = (m - mu) / se, df = n - 1, tc = qt(0.975, df);
    return { name: 'One-sample t-test', t, df, p: Stats.tTwoSidedP(t, df), mean: m, diff: m - mu, lo: m - mu - tc * se, hi: m - mu + tc * se };
  },
  // Wilcoxon signed-rank against mu: exact distribution when n <= 50 with no ties or zeros, otherwise
  // the normal approximation with tie correction (zeros dropped, as in R / SciPy's default "wilcox").
  wilcoxonOne(a, mu = 0) {
    const d = a.map((v) => v - mu).filter((v) => v !== 0), n = d.length;
    if (n < 1) return { name: 'One-sample Wilcoxon signed-rank', W: 0, p: 1 };
    const { r, ties } = rankAll(d.map(Math.abs));
    const Wp = d.reduce((s, v, i) => s + (v > 0 ? r[i] : 0), 0), Wm = (n * (n + 1)) / 2 - Wp;
    if (n <= 50 && !ties.length && d.length === a.length) {
      // exact null distribution of W+ by dynamic programming
      const max = (n * (n + 1)) / 2, cnt = new Array(max + 1).fill(0);
      cnt[0] = 1;
      for (let k = 1; k <= n; k++) for (let s = max; s >= k; s--) cnt[s] += cnt[s - k];
      const total = 2 ** n, lowW = Math.min(Wp, Wm);
      let tail = 0;
      for (let s = 0; s <= lowW; s++) tail += cnt[s];
      return { name: 'One-sample Wilcoxon signed-rank (exact)', W: Wp, p: Math.min(1, (2 * tail) / total) };
    }
    const tie = ties.reduce((s, t) => s + t ** 3 - t, 0);
    const z = (Wp - (n * (n + 1)) / 4) / Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tie / 48);
    return { name: 'One-sample Wilcoxon signed-rank (normal approx.)', W: Wp, z, p: pnorm2(z) };
  },
  // Tests the geometric mean against mu (one-sample t on log values).
  oneSampleRatio(a, mu = 1) {
    if (a.some((v) => v <= 0) || mu <= 0) return null;
    const r = Stats.oneSampleT(a.map(Math.log), Math.log(mu));
    return { ...r, name: 'One-sample ratio t-test (log scale)', gmean: Math.exp(r.mean), ratio: Math.exp(r.diff), lo: Math.exp(r.lo), hi: Math.exp(r.hi) };
  },
  // Student's (pooled) t-test, for completeness alongside Welch.
  studentT(a, b) {
    const n1 = a.length, n2 = b.length, sp2 = (ssDev(a) + ssDev(b)) / (n1 + n2 - 2);
    const t = (Stats.mean(a) - Stats.mean(b)) / Math.sqrt(sp2 * (1 / n1 + 1 / n2)), df = n1 + n2 - 2;
    return { name: "Student's t-test (equal variances)", t, df, p: Stats.tTwoSidedP(t, df) };
  },

  // ---------- Variance checks ----------
  // Brown–Forsythe (center = median, default) or Levene (center = mean).
  levene(groups, center = 'median') {
    const z = groups.map((g) => { const c = center === 'mean' ? Stats.mean(g) : Stats.quantile(g, 0.5); return g.map((v) => Math.abs(v - c)); });
    const a = Stats.anova(z);
    return { name: center === 'mean' ? "Levene's test" : 'Brown–Forsythe test', F: a.F, d1: a.d1, d2: a.d2, p: a.p };
  },
  welchAnova(groups) {
    const k = groups.length, w = groups.map((g) => g.length / Stats.variance(g)), W = sum(w);
    const m = groups.map(Stats.mean), mw = sum(m.map((v, i) => w[i] * v)) / W;
    const A = sum(m.map((v, i) => w[i] * (v - mw) ** 2)) / (k - 1);
    const tmp = sum(groups.map((g, i) => (1 - w[i] / W) ** 2 / (g.length - 1)));
    const B = 1 + ((2 * (k - 2)) / (k * k - 1)) * tmp;
    const F = A / B, d1 = k - 1, d2 = (k * k - 1) / (3 * tmp);
    return { name: "Welch's ANOVA", F, d1, d2, p: Stats.fP(F, d1, d2) };
  },
  // Sphericity for repeated measures: Mauchly's W and the Greenhouse–Geisser / Huynh–Feldt epsilons.
  sphericity(cols) {
    const n = Math.min(...cols.map((c) => c.length)), k = cols.length;
    if (k < 3 || n < k) return null;
    // Orthonormal Helmert contrasts (k-1 x k).
    const C = [];
    for (let i = 1; i < k; i++) { const row = new Array(k).fill(0), s = Math.sqrt(i * (i + 1)); for (let j = 0; j < i; j++) row[j] = 1 / s; row[i] = -i / s; C.push(row); }
    const means = cols.map((c) => Stats.mean(c.slice(0, n)));
    const S = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => sum(Array.from({ length: n }, (_, i) => (cols[a][i] - means[a]) * (cols[b][i] - means[b]))) / (n - 1)));
    const p = k - 1, CS = C.map((r) => S[0].map((_, j) => sum(r.map((v, a) => v * S[a][j]))));
    const M = CS.map((r) => C.map((c) => sum(r.map((v, j) => v * c[j])))); // C S C'
    const tr = sum(M.map((r, i) => r[i])), tr2 = sum(M.map((r) => sum(r.map((v) => v * v))));
    const gg = (tr * tr) / (p * tr2);
    const hf = Math.min(1, (n * p * gg - 2) / (p * (n - 1 - p * gg)));
    // Mauchly's W = det(M) / (tr(M)/p)^p
    const det = (A) => { const B = A.map((r) => [...r]); let d = 1; for (let i = 0; i < B.length; i++) { let piv = i; for (let r = i + 1; r < B.length; r++) if (Math.abs(B[r][i]) > Math.abs(B[piv][i])) piv = r; if (!B[piv][i]) return 0; if (piv !== i) { [B[i], B[piv]] = [B[piv], B[i]]; d = -d; } d *= B[i][i]; for (let r = i + 1; r < B.length; r++) { const f = B[r][i] / B[i][i]; for (let c = i; c < B.length; c++) B[r][c] -= f * B[i][c]; } } return d; };
    const W = det(M) / (tr / p) ** p;
    const f = 1 - (2 * p * p + p + 2) / (6 * p * (n - 1)), chi = -(n - 1) * f * Math.log(Math.max(W, 1e-300)), dfm = (p * (p + 1)) / 2 - 1;
    return { mauchlyW: W, chi, df: dfm, p: dfm > 0 ? Stats.chi2P(chi, dfm) : NaN, gg, hf };
  },

  // ---------- Post-hoc comparisons (k >= 3 groups) ----------
  // Returns [{ i, j, diff, lo, hi, stat, p }] with adjusted p-values.
  postHoc(groups, method, { control = 0 } = {}) {
    const k = groups.length, n = groups.map((g) => g.length), m = groups.map(Stats.mean), N = sum(n);
    const mse = sum(groups.map(ssDev)) / (N - k), dfE = N - k;
    const pairs = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) pairs.push([i, j]);
    if (method === 'tukey') {
      // Tukey–Kramer; 95% CI from the studentized-range critical value.
      const qc = qtukey(0.95, k, dfE);
      return pairs.map(([i, j]) => {
        const se = Math.sqrt((mse / 2) * (1 / n[i] + 1 / n[j])), q = Math.abs(m[i] - m[j]) / se, d = m[i] - m[j];
        return { i, j, diff: d, lo: d - qc * se, hi: d + qc * se, stat: q, statName: 'q', p: ptukeyUpper(q, k, dfE) };
      });
    }
    if (method === 'gameshowell') {
      return pairs.map(([i, j]) => {
        const vi = Stats.variance(groups[i]) / n[i], vj = Stats.variance(groups[j]) / n[j];
        const df = (vi + vj) ** 2 / (vi ** 2 / (n[i] - 1) + vj ** 2 / (n[j] - 1)), se = Math.sqrt((vi + vj) / 2), d = m[i] - m[j];
        const q = Math.abs(d) / se, qc = qtukey(0.95, k, df);
        return { i, j, diff: d, lo: d - qc * se, hi: d + qc * se, stat: q, statName: 'q', df, p: ptukeyUpper(q, k, df) };
      });
    }
    if (method === 'dunnett') {
      const c = control, others = groups.map((_, i) => i).filter((i) => i !== c);
      const lam = others.map((i) => Math.sqrt(n[i] / (n[i] + n[c])));
      const crit = (() => { let lo = 0, hi = 10; for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (dunnettCdf(mid, lam, dfE) < 0.95) lo = mid; else hi = mid; } return (lo + hi) / 2; })();
      return others.map((i) => {
        const se = Math.sqrt(mse * (1 / n[i] + 1 / n[c])), d = m[i] - m[c], t = d / se;
        return { i, j: c, diff: d, lo: d - crit * se, hi: d + crit * se, stat: t, statName: 't', p: Math.max(0, Math.min(1, 1 - dunnettCdf(Math.abs(t), lam, dfE))) };
      });
    }
    if (method === 'bonferroni' || method === 'sidak') {
      // Pooled-variance t-tests (the ANOVA's MSE), then adjusted.
      const raw = pairs.map(([i, j]) => { const se = Math.sqrt(mse * (1 / n[i] + 1 / n[j])), t = (m[i] - m[j]) / se; return { i, j, diff: m[i] - m[j], se, stat: t, statName: 't', p: Stats.tTwoSidedP(t, dfE) }; });
      const adj = adjust[method](raw.map((r) => r.p)), M = raw.length;
      const alpha = method === 'sidak' ? 1 - 0.95 ** (1 / M) : 0.05 / M, tc = qt(1 - alpha / 2, dfE);
      return raw.map((r, q) => ({ ...r, p: adj[q], lo: r.diff - tc * r.se, hi: r.diff + tc * r.se }));
    }
    if (method === 'dunn') {
      // Dunn's test on Kruskal–Wallis mean ranks with tie correction, Bonferroni-adjusted.
      const all = groups.flat(), { r, ties } = rankAll(all);
      let off = 0;
      const mr = groups.map((g) => { const s = r.slice(off, off + g.length); off += g.length; return Stats.mean(s); });
      const tieTerm = ties.reduce((s, t) => s + t ** 3 - t, 0) / (12 * (N - 1));
      const raw = pairs.map(([i, j]) => { const z = (mr[i] - mr[j]) / Math.sqrt(((N * (N + 1)) / 12 - tieTerm) * (1 / n[i] + 1 / n[j])); return { i, j, diff: mr[i] - mr[j], stat: z, statName: 'z', p: pnorm2(z) }; });
      const adj = adjust.bonferroni(raw.map((r2) => r2.p));
      return raw.map((x, q) => ({ ...x, p: adj[q], diffLabel: 'mean-rank difference' }));
    }
    return null;
  },

  // ---------- Outliers ----------
  // Iterative two-sided Grubbs test; returns the values flagged (most extreme first).
  grubbs(a, alpha = 0.05) {
    let x = [...a];
    const out = [];
    while (x.length > 2) {
      const n = x.length, m = Stats.mean(x), s = Stats.sd(x);
      if (!(s > 0)) break;
      let idx = 0;
      x.forEach((v, i) => { if (Math.abs(v - m) > Math.abs(x[idx] - m)) idx = i; });
      const G = Math.abs(x[idx] - m) / s, t = qt(1 - alpha / (2 * n), n - 2);
      const Gc = ((n - 1) / Math.sqrt(n)) * Math.sqrt((t * t) / (n - 2 + t * t));
      if (G <= Gc) break;
      out.push(x[idx]);
      x = x.filter((_, i) => i !== idx);
    }
    return out;
  },

  // ---------- Contingency tables ----------
  // table: rows x cols of counts. Pearson χ² (Yates for 2x2 if requested), expected counts, Cramér's V.
  chiSquare(table, yates = false) {
    const R = table.length, C = table[0].length, rs = table.map(sum), cs = table[0].map((_, j) => sum(table.map((r) => r[j]))), N = sum(rs);
    const E = table.map((_, i) => cs.map((c) => (rs[i] * c) / N));
    const useYates = yates && R === 2 && C === 2;
    let chi = 0;
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { const d = Math.abs(table[i][j] - E[i][j]); chi += (useYates ? Math.max(0, d - 0.5) : d) ** 2 / E[i][j]; }
    const df = (R - 1) * (C - 1), small = E.flat().filter((e) => e < 5).length;
    return { name: `χ² test${useYates ? ' (Yates continuity correction)' : ''}`, chi, df, p: Stats.chi2P(chi, df), expected: E, smallCells: small, cramersV: Math.sqrt(chi / (N * (Math.min(R, C) - 1))) };
  },
  // Fisher's exact test for 2x2: two-sided p sums all tables as or less likely than the observed one.
  fisher2x2([[a, b], [c, d]]) {
    const r1 = a + b, r2 = c + d, c1 = a + c, N = r1 + r2;
    const lf = (x) => Stats.lgamma(x + 1);
    const logP = (x) => lf(r1) + lf(r2) + lf(c1) + lf(N - c1) - lf(N) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x);
    const lo = Math.max(0, c1 - r2), hi = Math.min(r1, c1), p0 = logP(a);
    let p = 0, less = 0, greater = 0;
    for (let x = lo; x <= hi; x++) {
      const lp = logP(x), px = Math.exp(lp);
      if (lp <= p0 + 1e-7 * Math.abs(p0) + 1e-12) p += px;
      if (x <= a) less += px;
      if (x >= a) greater += px;
    }
    return { name: "Fisher's exact test", p: Math.min(1, p), pLess: Math.min(1, less), pGreater: Math.min(1, greater) };
  },
  // Odds ratio (Woolf / log CI, Haldane +0.5 if a cell is zero) and relative risk (Katz log CI), rows = groups, cols = outcome yes/no.
  oddsRisk([[a, b], [c, d]]) {
    const z = 1.959963984540054, h = [a, b, c, d].some((v) => v === 0) ? 0.5 : 0;
    const A = a + h, B = b + h, Cc = c + h, D = d + h;
    const or = (A * D) / (B * Cc), seOr = Math.sqrt(1 / A + 1 / B + 1 / Cc + 1 / D);
    const r1 = A / (A + B), r2 = Cc / (Cc + D), rr = r1 / r2, seRr = Math.sqrt(1 / A - 1 / (A + B) + 1 / Cc - 1 / (Cc + D));
    return { or, orLo: Math.exp(Math.log(or) - z * seOr), orHi: Math.exp(Math.log(or) + z * seOr), rr, rrLo: Math.exp(Math.log(rr) - z * seRr), rrHi: Math.exp(Math.log(rr) + z * seRr), riskDiff: a / (a + b) - c / (c + d), corrected: h > 0 };
  },

  // ---------- ROC ----------
  // scores: numeric, labels: 1 = positive (case), 0 = negative. Higher score = more likely positive
  // (direction flipped automatically if AUC < 0.5 and flip is allowed). DeLong standard error.
  roc(scores, labels, { allowFlip = true } = {}) {
    const pos = [], neg = [];
    scores.forEach((s, i) => { if (!isFinite(s) || (labels[i] !== 0 && labels[i] !== 1)) return; (labels[i] ? pos : neg).push(s); });
    if (!pos.length || !neg.length) return null;
    let dir = 1;
    const psi = (x, y) => (x > y ? 1 : x === y ? 0.5 : 0);
    const compute = (sgn) => {
      const P = pos.map((v) => sgn * v), Nn = neg.map((v) => sgn * v);
      const V10 = P.map((x) => Stats.mean(Nn.map((y) => psi(x, y)))), V01 = Nn.map((y) => Stats.mean(P.map((x) => psi(x, y))));
      return { auc: Stats.mean(V10), V10, V01 };
    };
    let r = compute(1);
    if (allowFlip && r.auc < 0.5) { dir = -1; r = compute(-1); }
    const m = pos.length, n = neg.length;
    const se = Math.sqrt(Stats.variance(r.V10) / m + Stats.variance(r.V01) / n);
    // curve points + Youden-optimal threshold
    const thr = [...new Set([...pos, ...neg])].sort((a, b) => dir * (b - a));
    const pts = [{ fpr: 0, tpr: 0, t: Infinity }];
    let best = { j: -1 };
    for (const t of thr) {
      const tp = pos.filter((v) => dir * v >= dir * t).length, fp = neg.filter((v) => dir * v >= dir * t).length;
      const pt2 = { fpr: fp / n, tpr: tp / m, t };
      pts.push(pt2);
      const j = pt2.tpr - pt2.fpr;
      if (j > best.j) best = { j, t, sens: pt2.tpr, spec: 1 - pt2.fpr };
    }
    pts.push({ fpr: 1, tpr: 1, t: -Infinity });
    const z = 1.959963984540054;
    return { auc: r.auc, se, lo: Math.max(0, r.auc - z * se), hi: Math.min(1, r.auc + z * se), p: pnorm2((r.auc - 0.5) / se), pts, best, dir, nPos: m, nNeg: n, V10: r.V10, V01: r.V01 };
  },
  // DeLong test for two correlated AUCs (same subjects, two markers).
  delongPaired(s1, s2, labels) {
    const keep = labels.map((l, i) => (l === 0 || l === 1) && isFinite(s1[i]) && isFinite(s2[i]));
    const f = (a) => a.filter((_, i) => keep[i]);
    const L = f(labels), A = Stats.roc(f(s1), L, { allowFlip: false }), B = Stats.roc(f(s2), L, { allowFlip: false });
    if (!A || !B) return null;
    const m = A.V10.length, n = A.V01.length;
    const cov = (x, y) => { const mx = Stats.mean(x), my = Stats.mean(y); return sum(x.map((v, i) => (v - mx) * (y[i] - my))) / (x.length - 1); };
    const S10 = [[cov(A.V10, A.V10), cov(A.V10, B.V10)], [0, cov(B.V10, B.V10)]], S01 = [[cov(A.V01, A.V01), cov(A.V01, B.V01)], [0, cov(B.V01, B.V01)]];
    const v = S10[0][0] / m + S01[0][0] / n + S10[1][1] / m + S01[1][1] / n - 2 * (S10[0][1] / m + S01[0][1] / n);
    const zz = (A.auc - B.auc) / Math.sqrt(v);
    return { name: 'DeLong test (paired AUCs)', z: zz, p: pnorm2(zz), aucA: A.auc, aucB: B.auc };
  },

  // ---------- Method comparison ----------
  blandAltman(a, b, { percent = false } = {}) {
    const pairs = a.map((v, i) => [v, b[i]]).filter(([x, y]) => isFinite(x) && isFinite(y));
    const mean = pairs.map(([x, y]) => (x + y) / 2), diff = pairs.map(([x, y], i) => (percent ? (100 * (x - y)) / mean[i] : x - y));
    const n = diff.length, bias = Stats.mean(diff), s = Stats.sd(diff), tc = qt(0.975, n - 1), z = 1.959963984540054;
    const seBias = s / Math.sqrt(n), seLoA = Math.sqrt((3 * s * s) / n);
    const lr = Stats.linreg(mean, diff);
    return { n, bias, sd: s, biasLo: bias - tc * seBias, biasHi: bias + tc * seBias, loa: [bias - z * s, bias + z * s], loaCI: [[bias - z * s - tc * seLoA, bias - z * s + tc * seLoA], [bias + z * s - tc * seLoA, bias + z * s + tc * seLoA]], mean, diff, propSlope: lr.slope, propP: lr.p, pBias: Stats.tTwoSidedP(bias / seBias, n - 1) };
  },
  // Deming regression; delta = ratio of error variances (var(y errors) / var(x errors)). Jackknife CIs.
  deming(x, y, delta = 1) {
    const fit = (X, Y) => {
      const mx = Stats.mean(X), my = Stats.mean(Y);
      let sxx = 0, syy = 0, sxy = 0;
      X.forEach((v, i) => { sxx += (v - mx) ** 2; syy += (Y[i] - my) ** 2; sxy += (v - mx) * (Y[i] - my); });
      const slope = (syy - delta * sxx + Math.sqrt((syy - delta * sxx) ** 2 + 4 * delta * sxy * sxy)) / (2 * sxy);
      return { slope, intercept: my - slope * mx };
    };
    const n = x.length, full = fit(x, y);
    const js = [], ji = [];
    for (let i = 0; i < n; i++) { const f2 = fit(x.filter((_, k) => k !== i), y.filter((_, k) => k !== i)); js.push(f2.slope); ji.push(f2.intercept); }
    const jse = (vals) => { const m = Stats.mean(vals); return Math.sqrt(((n - 1) / n) * sum(vals.map((v) => (v - m) ** 2))); };
    const seS = jse(js), seI = jse(ji), tc = qt(0.975, n - 2);
    return { ...full, seSlope: seS, seIntercept: seI, slopeCI: [full.slope - tc * seS, full.slope + tc * seS], interceptCI: [full.intercept - tc * seI, full.intercept + tc * seI], pSlope1: Stats.tTwoSidedP((full.slope - 1) / seS, n - 2), pIntercept0: Stats.tTwoSidedP(full.intercept / seI, n - 2) };
  },

  // ---------- Regression ----------
  // Multiple linear regression with intercept. X: rows of predictor values, names: predictor names.
  multipleRegression(X, y, names) {
    const n = y.length, p = X[0].length + 1, D = X.map((r) => [1, ...r]);
    const { beta, rss, XtXinv } = Stats.lsq(D, y), dfE = n - p, s2 = rss / dfE, tc = qt(0.975, dfE);
    const tss = ssDev(y), r2 = 1 - rss / tss, adjR2 = 1 - (1 - r2) * ((n - 1) / dfE);
    const F = ((tss - rss) / (p - 1)) / s2;
    const coefs = beta.map((b, i) => { const se = Math.sqrt(s2 * XtXinv[i][i]), t = b / se; return { name: i ? names[i - 1] : 'Intercept', b, se, t, p: Stats.tTwoSidedP(t, dfE), lo: b - tc * se, hi: b + tc * se }; });
    // Variance inflation factors
    const vif = X[0].map((_, j) => {
      if (X[0].length < 2) return 1;
      const others = X.map((r) => r.filter((_, k) => k !== j)), yj = X.map((r) => r[j]);
      const f = Stats.lsq(others.map((r) => [1, ...r]), yj), r2j = 1 - f.rss / ssDev(yj);
      return 1 / Math.max(1e-12, 1 - r2j);
    });
    const fitted = D.map((r) => sum(r.map((v, i) => v * beta[i])));
    return { coefs, r2, adjR2, F, d1: p - 1, d2: dfE, p: Stats.fP(F, p - 1, dfE), sy: Math.sqrt(s2), vif, fitted, n };
  },
  // N-way factorial ANOVA with all interactions, Type III sums of squares (effect coding).
  // factors: array of level arrays (one per factor, each length n); y: values.
  factorialAnova(factors, y, names) {
    const N = y.length, levels = factors.map((f) => [...new Set(f)]);
    const eff = (lv, v) => lv.slice(0, -1).map((l) => (v === l ? 1 : v === lv[lv.length - 1] ? -1 : 0));
    const main = factors.map((f, k) => f.map((v) => eff(levels[k], v)));
    // all non-empty subsets of factors, ordered by size
    const subsets = [];
    for (let mask = 1; mask < 1 << factors.length; mask++) subsets.push(factors.map((_, k) => k).filter((k) => mask & (1 << k)));
    subsets.sort((a, b) => a.length - b.length || a[0] - b[0]);
    const cols = subsets.map((sub) => Array.from({ length: N }, (_, i) => sub.reduce((acc, k) => acc.flatMap((x) => main[k][i].map((z) => x * z)), [1])));
    const build = (skip) => Array.from({ length: N }, (_, i) => [1, ...cols.flatMap((c, t) => (t === skip ? [] : c[i]))]);
    const full = Stats.lsq(build(-1), y), p = build(-1)[0].length, dfE = N - p;
    if (dfE < 1) return null;
    const mse = full.rss / dfE;
    const rows = subsets.map((sub, t) => {
      const red = Stats.lsq(build(t), y), df = cols[t][0].length, ss = red.rss - full.rss, F = ss / df / mse;
      return { term: sub.map((k) => names[k]).join(' × '), ss, df, ms: ss / df, F, p: Stats.fP(F, df, dfE) };
    });
    return { name: `${['', 'One', 'Two', 'Three', 'Four'][factors.length] || factors.length}-way ANOVA (Type III)`, rows, dfE, ssE: full.rss, mse };
  },
});

// Studentized range quantile by bisection on ptukey.
function qtukey(p, k, df) {
  let lo = 0, hi = 50;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (ptukey(mid, k, df) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
Stats.qtukey = qtukey;

// ---------- Nonlinear curve fitting ----------
// Each model: params (names), f(x, p), guess(x, y) → initial p, optional xform ('log10' fits in log10 x).
const CURVE_MODELS = {
  michaelis: { label: 'Michaelis–Menten (Vmax, Km)', params: ['Vmax', 'Km'], f: (x, [V, K]) => (V * x) / (K + x), guess: (x, y) => [Math.max(...y) * 1.1, xAtFrac(x, y, 0.5)] },
  onesite: { label: 'One-site specific binding (Bmax, Kd)', params: ['Bmax', 'Kd'], f: (x, [B, K]) => (B * x) / (K + x), guess: (x, y) => [Math.max(...y) * 1.1, xAtFrac(x, y, 0.5)] },
  expgrowth: { label: 'Exponential growth (Y0, k)', params: ['Y0', 'k'], f: (x, [Y0, k]) => Y0 * Math.exp(k * x), guess: (x, y) => { const pos = x.map((v, i) => [v, y[i]]).filter((q) => q[1] > 0); const l = Stats.linreg(pos.map((q) => q[0]), pos.map((q) => Math.log(q[1]))); return [Math.exp(l.intercept), l.slope]; }, derived: (p) => [['Doubling time', Math.LN2 / p[1]]] },
  expplateau: { label: 'Exponential plateau (Y0, YM, k)', params: ['Y0', 'YM', 'k'], f: (x, [Y0, YM, k]) => YM - (YM - Y0) * Math.exp(-k * x), guess: (x, y) => [y[argmin(x)], Math.max(...y) * 1.05, 1 / (Stats.mean(x) || 1)] },
  logisticgrowth: { label: 'Logistic growth (Y0, YM, k)', params: ['Y0', 'YM', 'k'], f: (x, [Y0, YM, k]) => (YM * Y0) / ((YM - Y0) * Math.exp(-k * x) + Y0), guess: (x, y) => [Math.max(1e-9, y[argmin(x)]), Math.max(...y) * 1.05, 4 / ((Math.max(...x) - Math.min(...x)) || 1)] },
  gompertz: { label: 'Gompertz growth (Y0, YM, k)', params: ['Y0', 'YM', 'k'], f: (x, [Y0, YM, k]) => YM * (Y0 / YM) ** Math.exp(-k * x), guess: (x, y) => [Math.max(1e-9, y[argmin(x)]), Math.max(...y) * 1.05, 3 / ((Math.max(...x) - Math.min(...x)) || 1)] },
  onephase: { label: 'One-phase decay (Y0, Plateau, K)', params: ['Y0', 'Plateau', 'K'], f: (x, [Y0, P, K]) => (Y0 - P) * Math.exp(-K * x) + P, guess: (x, y) => [y[argmin(x)], Math.min(...y), 3 / ((Math.max(...x) - Math.min(...x)) || 1)], derived: (p) => [['Half-life', Math.LN2 / p[2]]] },
  twophase: { label: 'Two-phase decay (Plateau, SpanFast, Kfast, SpanSlow, Kslow)', params: ['Plateau', 'SpanFast', 'Kfast', 'SpanSlow', 'Kslow'], f: (x, [P, SF, KF, SS, KS]) => P + SF * Math.exp(-KF * x) + SS * Math.exp(-KS * x), guess: (x, y) => { const span = y[argmin(x)] - Math.min(...y), r = (Math.max(...x) - Math.min(...x)) || 1; return [Math.min(...y), span * 0.6, 10 / r, span * 0.4, 1 / r]; }, derived: (p) => [['Half-life (fast)', Math.LN2 / p[2]], ['Half-life (slow)', Math.LN2 / p[4]]] },
  dr3: { label: 'Dose–response, 3 parameters (Hill slope = 1)', params: ['Bottom', 'Top', 'logEC50'], xform: 'log10', f: (lx, [b, t, e]) => b + (t - b) / (1 + 10 ** (e - lx)), guess: (lx, y) => [Math.min(...y), Math.max(...y), xAtFrac(lx, y, 0.5)] },
  dr3inh: { label: 'Inhibition, 3 parameters (Hill slope = −1)', params: ['Bottom', 'Top', 'logIC50'], xform: 'log10', f: (lx, [b, t, e]) => b + (t - b) / (1 + 10 ** (lx - e)), guess: (lx, y) => [Math.min(...y), Math.max(...y), xAtFrac(lx, y, 0.5)] },
  dr4: { label: 'Dose–response, 4 parameters (variable slope)', params: ['Bottom', 'Top', 'logEC50', 'HillSlope'], xform: 'log10', f: (lx, [b, t, e, h]) => b + (t - b) / (1 + 10 ** ((e - lx) * h)), guess: (lx, y) => { const up = Stats.linreg(lx, y).slope >= 0; return [Math.min(...y), Math.max(...y), xAtFrac(lx, y, 0.5), up ? 1 : -1]; } },
  dr5: { label: 'Dose–response, 5 parameters (asymmetric)', params: ['Bottom', 'Top', 'logEC50', 'HillSlope', 'S'], xform: 'log10', f: (lx, [b, t, e, h, s]) => { const lxb = e + (1 / h) * Math.log10(2 ** (1 / s) - 1); return b + (t - b) / (1 + 10 ** ((lxb - lx) * h)) ** s; }, guess: (lx, y) => { const up = Stats.linreg(lx, y).slope >= 0; return [Math.min(...y), Math.max(...y), xAtFrac(lx, y, 0.5), up ? 1 : -1, 1]; } },
};
function argmin(a) { let k = 0; a.forEach((v, i) => { if (v < a[k]) k = i; }); return k; }
// x at which y first crosses lo + frac*(hi-lo) (by sorted x), for starting values.
function xAtFrac(x, y, frac) {
  const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]), lo = Math.min(...y), hi = Math.max(...y), target = lo + frac * (hi - lo);
  for (let k = 1; k < idx.length; k++) { const a = y[idx[k - 1]], b = y[idx[k]]; if ((a - target) * (b - target) <= 0 && a !== b) return x[idx[k - 1]] + ((target - a) / (b - a)) * (x[idx[k]] - x[idx[k - 1]]); }
  return Stats.mean(x);
}

// Levenberg–Marquardt least squares with numerical Jacobian. Returns params, SEs (from (JᵀJ)⁻¹ s²), 95% CIs.
function lmFit(f, x, y, p0, { maxIter = 400 } = {}) {
  let p = [...p0];
  const n = y.length, k = p.length;
  const resid = (q) => y.map((v, i) => v - f(x[i], q));
  const ssr = (r) => sum(r.map(sq));
  const jac = (q) => {
    const J = Array.from({ length: n }, () => new Array(k));
    for (let j = 0; j < k; j++) {
      const h = 1e-6 * Math.max(Math.abs(q[j]), 1e-3), qp = [...q], qm = [...q];
      qp[j] += h; qm[j] -= h;
      for (let i = 0; i < n; i++) J[i][j] = (f(x[i], qp) - f(x[i], qm)) / (2 * h);
    }
    return J;
  };
  let r = resid(p), S = ssr(r), lambda = 1e-3;
  if (!isFinite(S)) return null;
  for (let it = 0; it < maxIter; it++) {
    const J = jac(p), JtJ = Array.from({ length: k }, () => new Array(k).fill(0)), Jtr = new Array(k).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) { if (!isFinite(J[i][a])) continue; Jtr[a] += J[i][a] * r[i]; for (let b = 0; b < k; b++) JtJ[a][b] += J[i][a] * J[i][b]; }
    let improved = false;
    for (let tries = 0; tries < 30; tries++) {
      const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lambda) + 1e-12 : v)));
      const delta = invert(A).map((row) => sum(row.map((v, b) => v * Jtr[b])));
      const pn = p.map((v, j) => v + delta[j]), rn = resid(pn), Sn = ssr(rn);
      if (isFinite(Sn) && Sn < S) {
        const rel = (S - Sn) / Math.max(S, 1e-300);
        p = pn; r = rn; S = Sn; lambda = Math.max(lambda / 10, 1e-12); improved = true;
        if (rel < 1e-12) it = maxIter;
        break;
      }
      lambda *= 10;
    }
    if (!improved) break;
  }
  const J = jac(p), JtJ = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) JtJ[a][b] += J[i][a] * J[i][b];
  const dfE = n - k, s2 = dfE > 0 ? S / dfE : NaN, cov = invert(JtJ).map((row) => row.map((v) => v * s2));
  const se = cov.map((row, j) => Math.sqrt(Math.max(0, row[j])));
  const tc = dfE > 0 ? qt(0.975, dfE) : NaN;
  return { p, se, lo: p.map((v, j) => v - tc * se[j]), hi: p.map((v, j) => v + tc * se[j]), ss: S, dfE, sy: Math.sqrt(s2), cov };
}

// Fit one dataset with a named model. Returns parameters, SEs, R², and derived values.
function fitCurve(modelKey, xs, ys) {
  const M = CURVE_MODELS[modelKey];
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([a, b]) => isFinite(a) && isFinite(b) && (M.xform !== 'log10' || a > 0));
  const x = pts.map((q) => (M.xform === 'log10' ? Math.log10(q[0]) : q[0])), y = pts.map((q) => q[1]);
  if (x.length <= M.params.length) return { error: `needs more than ${M.params.length} points` };
  const fit = lmFit(M.f, x, y, M.guess(x, y));
  if (!fit) return { error: 'did not converge' };
  const r2 = 1 - fit.ss / ssDev(y);
  const out = { model: modelKey, params: M.params, ...fit, r2, n: x.length, f: (v) => M.f(M.xform === 'log10' ? Math.log10(v) : v, fit.p), derived: M.derived ? M.derived(fit.p) : [] };
  if (M.xform === 'log10') {
    const ei = M.params.findIndex((nm) => /^log(EC|IC)50$/.test(nm));
    out.derived.unshift([M.params[ei].slice(3), 10 ** fit.p[ei], 10 ** fit.lo[ei], 10 ** fit.hi[ei]]);
  }
  return out;
}
// ECx (x = % of the way from Bottom to Top) for the 4PL: ECx = EC50 · (F / (100 − F))^(1/H).
function ecx4(fit, F) { const [, , e, h] = fit.p; return 10 ** e * (F / (100 - F)) ** (1 / h); }

// Extra-sum-of-squares F test: does one shared curve fit all datasets as well as separate curves?
function compareCurves(modelKey, datasets) {
  const M = CURVE_MODELS[modelKey];
  const fits = datasets.map((d) => fitCurve(modelKey, d.x, d.y));
  if (fits.some((f) => f.error)) return null;
  const ssSep = sum(fits.map((f) => f.ss)), dfSep = sum(fits.map((f) => f.dfE));
  const X = [], Y = [];
  datasets.forEach((d) => d.x.forEach((v, i) => { if (isFinite(v) && isFinite(d.y[i]) && (M.xform !== 'log10' || v > 0)) { X.push(v); Y.push(d.y[i]); } }));
  const shared = fitCurve(modelKey, X, Y);
  if (shared.error) return null;
  const dn = shared.dfE - dfSep, F = ((shared.ss - ssSep) / dn) / (ssSep / dfSep);
  return { name: 'Extra sum-of-squares F test (one curve for all vs separate curves)', F, d1: dn, d2: dfSep, p: Stats.fP(F, dn, dfSep), fits, shared };
}
