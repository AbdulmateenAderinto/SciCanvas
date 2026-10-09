// Bench data tools: tumour growth curves, flow cytometry (FCS) plots with gates, and western blot
// densitometry. Tumour curves are a regular chart kind; flow plots are charts with kind 'flow'.

// ---------- Tumour growth (per-mouse curves + group mean) ----------
CHART_KINDS.push(['tumour', 'Tumour growth (per mouse + group mean, TGI)']);
SAMPLE_DATA.tumour = (() => {
  const rows = ['Group,Mouse,Day,Volume'];
  const groups = [['Vehicle', 1, 0.19], ['Anti-PD-1', 2, 0.11], ['Combination', 3, 0.05]];
  let r = 11;
  const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  for (const [g, k, rate] of groups) for (let m = 1; m <= 6; m++) {
    const v0 = 80 + rnd() * 40, rr = rate * (0.75 + rnd() * 0.5);
    for (const d of [7, 10, 13, 16, 19, 21]) rows.push(`${g},${g[0]}${k}-${m},${d},${Math.round(v0 * Math.exp(rr * (d - 7)))}`);
  }
  return rows.join('\n');
})();
EXTRA_CHARTS.tumour = (cfg, t, w, h, pal) => {
  const G = t.raw[0] || [], M = t.raw[1] || [], Dd = t.cols[2] || [], V = t.cols[3] || [];
  const rows = G.map((g, i) => ({ g, m: M[i], d: Dd[i], v: V[i] })).filter((x) => x.g !== '' && isFinite(x.d) && isFinite(x.v));
  if (!rows.length) throw new Error('needs columns Group, Mouse, Day, Volume');
  const names = [...new Set(rows.map((x) => x.g))];
  const days = [...new Set(rows.map((x) => x.d))].sort((a, b) => a - b);
  const groups = names.map((n) => {
    const mice = new Map();
    rows.filter((x) => x.g === n).forEach((x) => { if (!mice.has(x.m)) mice.set(x.m, []); mice.get(x.m).push([x.d, x.v]); });
    mice.forEach((pts) => pts.sort((a, b) => a[0] - b[0]));
    const at = (d) => [...mice.values()].map((p) => (p.find((q) => q[0] === d) || [])[1]).filter(isFinite);
    const mean = days.map((d) => { const v = at(d); return v.length ? { d, m: Stats.mean(v), e: errOf(v, cfg.error), n: v.length } : null; }).filter(Boolean);
    return { n, mice, at, mean };
  });
  const showMice = cfg.showPoints !== false;
  const allY = [...(showMice ? rows.map((x) => x.v) : []), ...groups.flatMap((g) => g.mean.map((p) => p.m + p.e))];
  const f = axesFrame(cfg, w, h, { xTicks: niceTicks(Math.min(...days), Math.max(...days)), yTicks: yRange(cfg, 0, Math.max(...allY) * 1.05) });
  let s = f.s;
  groups.forEach((g, i) => {
    const col = pal[i % pal.length];
    if (showMice) g.mice.forEach((pts) => { s += `<polyline points="${pts.map(([d, v]) => `${f.X(d)},${f.Y(v)}`).join(' ')}" fill="none" stroke="${Color.light(col, 0.35)}" stroke-width="1" opacity=".75"/>`; });
    g.mean.forEach((p) => { if (p.e) s += `<path d="M${f.X(p.d)} ${f.Y(p.m - p.e)}V${f.Y(p.m + p.e)}M${f.X(p.d) - 3} ${f.Y(p.m + p.e)}H${f.X(p.d) + 3}M${f.X(p.d) - 3} ${f.Y(p.m - p.e)}H${f.X(p.d) + 3}" stroke="${col}" stroke-width="1.3"/>`; });
    s += `<polyline points="${g.mean.map((p) => `${f.X(p.d)},${f.Y(p.m)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.6"/>`;
    g.mean.forEach((p) => { s += `<circle cx="${f.X(p.d)}" cy="${f.Y(p.m)}" r="3.6" fill="${col}" stroke="#fff" stroke-width="1"/>`; });
    s += `<rect x="${f.m.l + 8}" y="${f.m.t + 4 + i * 15}" width="12" height="3" fill="${col}"/><text x="${f.m.l + 24}" y="${f.m.t + 9 + i * 15}">${String(g.n).replace(/</g, '&lt;')} (n = ${g.mice.size})</text>`;
  });
  const report = [`Thin lines = individual mice; thick = group mean ± ${errName(cfg.error)}`];
  // Last day measured in every group: endpoint comparison and tumour growth inhibition vs the first group.
  const endDay = [...days].reverse().find((d) => groups.every((g) => g.at(d).length >= 2));
  if (endDay != null) {
    const finals = groups.map((g) => g.at(endDay));
    report.push(`Day ${endDay}: ` + groups.map((g, i) => `${g.n} ${Stats.mean(finals[i]).toFixed(1)} ± ${errOf(finals[i], cfg.error).toFixed(1)}`).join('; '));
    const d0 = days.find((d) => groups.every((g) => g.at(d).length));
    const c = groups[0], c0 = Stats.mean(c.at(d0)), c1 = Stats.mean(c.at(endDay));
    groups.slice(1).forEach((g) => { const t0 = Stats.mean(g.at(d0)), t1 = Stats.mean(g.at(endDay)); if (c1 - c0 !== 0) report.push(`TGI ${g.n} vs ${c.n} (day ${d0}→${endDay}) = ${((1 - (t1 - t0) / (c1 - c0)) * 100).toFixed(1)}%`); });
    const an = groupAnalysis(finals, names, cfg);
    report.push(...an.lines.map((l) => (l.startsWith('  ') ? l : `Day ${endDay} — ${l}`)));
    if (an.brackets.length) { const xe = f.m.l + f.pw - 4; an.brackets.forEach((b, k) => { s += `<text x="${xe}" y="${f.m.t + 12 + k * 13}" font-size="10" text-anchor="end">${names[b.b]} vs ${names[b.a]}: ${cfg.pStyle === 'value' ? fmtP(b.p) : stars(b.p)}</text>`; }); }
    return { svg: s + titles(cfg, w, h, f), report, suggestion: an.suggestion };
  }
  return { svg: s + titles(cfg, w, h, f), report };
};

// ---------- Flow cytometry ----------
// FCS 2.0 / 3.0 / 3.1 list-mode parser (float, double and 8/16/32-bit integer data).
function parseFCS(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  const ascii = (a, b) => String.fromCharCode(...u8.subarray(a, b));
  const ver = ascii(0, 6);
  if (!/^FCS\d\.\d/.test(ver)) throw new Error('not an FCS file');
  const num = (a) => parseInt(ascii(a, a + 8).trim(), 10) || 0;
  const tStart = num(10), tEnd = num(18);
  let dStart = num(26), dEnd = num(34);
  const raw = new TextDecoder('latin1').decode(u8.subarray(tStart, tEnd + 1));
  const delim = raw[0], kv = {};
  // Split on single delimiters (a doubled delimiter is an escaped literal).
  const parts = [];
  let cur = '';
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] === delim) { if (raw[i + 1] === delim) { cur += delim; i++; } else { parts.push(cur); cur = ''; } } else cur += raw[i];
  }
  if (cur) parts.push(cur);
  for (let i = 0; i + 1 < parts.length; i += 2) kv[parts[i].trim().toUpperCase()] = parts[i + 1];
  if (!dStart) { dStart = +kv.$BEGINDATA; dEnd = +kv.$ENDDATA; }
  const P = +kv.$PAR, N = +kv.$TOT, type = (kv.$DATATYPE || 'F').toUpperCase();
  if ((kv.$MODE || 'L').toUpperCase() !== 'L') throw new Error('only list-mode FCS files are supported');
  const little = (kv.$BYTEORD || '1,2,3,4').trim().startsWith('1');
  const ch = Array.from({ length: P }, (_, i) => {
    const k = i + 1, bits = +kv[`$P${k}B`] || 32, range = +kv[`$P${k}R`] || 0, [f1, f2] = String(kv[`$P${k}E`] || '0,0').split(',').map(Number);
    return { name: kv[`$P${k}N`] || `P${k}`, label: kv[`$P${k}S`] || '', bits, range, f1, f2 };
  });
  const bytes = ch.map((c) => (type === 'I' ? c.bits / 8 : type === 'D' ? 8 : 4));
  if (type === 'I' && ch.some((c) => ![8, 16, 32].includes(c.bits))) throw new Error('packed integer FCS data is not supported');
  const stride = bytes.reduce((a, b) => a + b, 0);
  const total = Math.min(N, Math.floor((dEnd - dStart + 1) / stride));
  const keep = Math.min(total, 50000), step = total / keep;
  const data = ch.map(() => new Float64Array(keep));
  for (let e = 0; e < keep; e++) {
    let off = dStart + Math.floor(e * step) * stride;
    for (let p = 0; p < P; p++) {
      let v;
      if (type === 'F') v = dv.getFloat32(off, little);
      else if (type === 'D') v = dv.getFloat64(off, little);
      else v = bytes[p] === 1 ? dv.getUint8(off) : bytes[p] === 2 ? dv.getUint16(off, little) : dv.getUint32(off, little);
      if (type === 'I' && ch[p].f1 > 0 && ch[p].range) v = 10 ** ((ch[p].f1 * v) / ch[p].range) * (ch[p].f2 || 1);
      data[p][e] = v;
      off += bytes[p];
    }
  }
  return { channels: ch.map((c) => (c.label && c.label !== c.name ? `${c.name} (${c.label})` : c.name)), data, total, file: kv.$FIL || '' };
}
// Event table from CSV (e.g. FlowJo "channel values" export): header row of channel names.
function parseEventCSV(text) {
  const t = parseTable(text.trim());
  const n = Math.min(t.cols[0].length, 50000);
  return { channels: t.headers, data: t.cols.map((c) => Float64Array.from(c.slice(0, n), (v) => (isFinite(v) ? v : NaN))), total: t.cols[0].length, file: '' };
}

const FLOW_SCALES = [['lin', 'Linear'], ['log', 'Log'], ['asinh', 'Biexponential (arcsinh)']];
function flowScale(kind, cof = 150) {
  if (kind === 'log') return { f: (v) => Math.log10(Math.max(v, 1)), inv: (u) => 10 ** u };
  if (kind === 'asinh') return { f: (v) => Math.asinh(v / cof), inv: (u) => Math.sinh(u) * cof };
  return { f: (v) => v, inv: (u) => u };
}
// Axis ticks in data units for a scale; decades for log / arcsinh.
function flowTicks(kind, lo, hi) {
  if (kind === 'lin') return niceTicks(lo, hi).map((v) => ({ v, label: Math.abs(v) >= 1e4 ? `${+(v / 1000).toPrecision(3)}K` : String(+v.toPrecision(4)) }));
  const out = kind === 'asinh' ? [{ v: 0, label: '0' }] : [];
  for (let e = 0; e <= 7; e++) { const v = 10 ** e; if (v >= lo && v <= hi && (kind === 'log' || v >= 1000)) out.push({ v, label: `10${'⁰¹²³⁴⁵⁶⁷'[e]}` }); if (kind === 'asinh' && -v >= lo && v >= 1000) out.unshift({ v: -v, label: `−10${'⁰¹²³⁴⁵⁶⁷'[e]}` }); }
  return out;
}
const flowCache = new Map();
function densityColor(t) { // white → blue → green → yellow → red
  const stops = [[0, [32, 64, 200]], [0.35, [40, 180, 220]], [0.55, [60, 200, 80]], [0.75, [250, 220, 40]], [1, [230, 40, 30]]];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i], k = (t - a) / (b - a); return ca.map((c, j) => Math.round(c + (cb[j] - c) * k)); }
  return stops[stops.length - 1][1];
}
// Compute plot geometry and transformed event coordinates (in 0..1 of the plot area).
function flowGeometry(cfg) {
  const xs = cfg.events.x, ys = cfg.events.y || [];
  const sx = flowScale(cfg.xScale, cfg.cofactor), sy = flowScale(cfg.yScale, cfg.cofactor);
  const fin = (a) => a.filter((v) => isFinite(v));
  const q = (a, p) => { const b = [...a].sort((m, n) => m - n); return b[Math.max(0, Math.min(b.length - 1, Math.floor(p * (b.length - 1))))]; };
  const rng = (a, sc, kind) => { const f = fin(a); let lo = cfg[`${kind}Min`] !== '' && cfg[`${kind}Min`] != null ? +cfg[`${kind}Min`] : Math.min(q(f, 0.001), 0); let hi = cfg[`${kind}Max`] !== '' && cfg[`${kind}Max`] != null ? +cfg[`${kind}Max`] : q(f, 0.999) * 1.05; if (cfg[`${kind}Scale`] === 'log') lo = Math.max(lo, 1); if (hi <= lo) hi = lo + 1; return { lo, hi, u0: sc.f(lo), u1: sc.f(hi) }; };
  const X = rng(xs, sx, 'x'), Y = cfg.plot === 'histogram' ? null : rng(ys, sy, 'y');
  return { sx, sy, X, Y, ux: (v) => (sx.f(v) - X.u0) / (X.u1 - X.u0), uy: Y ? (v) => (sy.f(v) - Y.u0) / (Y.u1 - Y.u0) : null };
}
function flowGateStats(cfg, geo) {
  const xs = cfg.events.x, ys = cfg.events.y || [], n = xs.length;
  const inRect = (g, i) => xs[i] >= Math.min(g.x0, g.x1) && xs[i] <= Math.max(g.x0, g.x1) && (cfg.plot === 'histogram' || (ys[i] >= Math.min(g.y0, g.y1) && ys[i] <= Math.max(g.y0, g.y1)));
  return (cfg.gates || []).map((g) => {
    if (g.type === 'quad') {
      const c = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) { if (!isFinite(xs[i]) || !isFinite(ys[i])) continue; c[(ys[i] >= g.y ? 0 : 2) + (xs[i] >= g.x ? 1 : 0)]++; }
      return { g, pct: c.map((k) => (100 * k) / n) }; // [UL, UR, LL, LR]
    }
    let k = 0;
    for (let i = 0; i < n; i++) if (inRect(g, i)) k++;
    return { g, pct: [(100 * k) / n], count: k };
  });
}
function renderFlow(cfg, w, h) {
  const font = 'font-family="Helvetica, Arial, sans-serif"';
  if (!cfg.events || !cfg.events.x || !cfg.events.x.length) return { svg: `<text x="${w / 2}" y="${h / 2}" text-anchor="middle" ${font} font-size="13" fill="#888">Load an FCS or CSV file</text>`, report: ['No events'] };
  const m = { l: 58, r: 14, t: cfg.title ? 30 : 12, b: 44 }, pw = Math.max(20, w - m.l - m.r), ph = Math.max(20, h - m.t - m.b);
  const geo = flowGeometry(cfg), xs = cfg.events.x, ys = cfg.events.y || [];
  const PX = (v) => m.l + geo.ux(v) * pw, PY = (v) => m.t + ph - geo.uy(v) * ph;
  let s = '';
  // Raster layer (dots or pseudocolour density, or histogram path).
  if (cfg.plot === 'histogram') {
    const bins = 128, cnt = new Array(bins).fill(0);
    for (const v of xs) { const u = geo.ux(v); if (u >= 0 && u < 1) cnt[Math.floor(u * bins)]++; }
    const sm = cnt.map((_, i) => (cnt[i - 1] || 0) * 0.25 + cnt[i] * 0.5 + (cnt[i + 1] || 0) * 0.25), mx = Math.max(...sm) || 1;
    const col = cfg.color || '#4a7fd6';
    s += `<path d="M${m.l} ${m.t + ph} ${sm.map((c, i) => `L${m.l + ((i + 0.5) / bins) * pw} ${m.t + ph - (c / mx) * ph * 0.92}`).join(' ')} L${m.l + pw} ${m.t + ph} Z" fill="${Color.light(col, 0.55)}" stroke="${col}" stroke-width="1.4"/>`;
  } else {
    const key = `${cfg.uid}|${cfg.plot}|${cfg.xScale}|${cfg.yScale}|${cfg.cofactor}|${cfg.xMin}|${cfg.xMax}|${cfg.yMin}|${cfg.yMax}|${Math.round(pw)}x${Math.round(ph)}|${cfg.color}|${xs.length}`;
    let url = flowCache.get(key);
    if (!url && typeof document !== 'undefined') {
      const S = 2, cw = Math.round(pw * S), chh = Math.round(ph * S), cv = document.createElement('canvas');
      cv.width = cw; cv.height = chh;
      const ctx = cv.getContext('2d');
      if (cfg.plot === 'dot') {
        ctx.fillStyle = cfg.color || '#1f2a36';
        for (let i = 0; i < xs.length; i++) { const u = geo.ux(xs[i]), v = geo.uy(ys[i]); if (u >= 0 && u <= 1 && v >= 0 && v <= 1) ctx.fillRect(u * cw - 1, (1 - v) * chh - 1, 2, 2); }
      } else {
        const B = 160, grid = new Float32Array(B * B);
        for (let i = 0; i < xs.length; i++) { const u = geo.ux(xs[i]), v = geo.uy(ys[i]); if (u >= 0 && u < 1 && v >= 0 && v < 1) grid[Math.floor((1 - v) * B) * B + Math.floor(u * B)]++; }
        const sm = new Float32Array(B * B);
        for (let r = 0; r < B; r++) for (let c = 0; c < B; c++) { let a = 0, wt = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < B && cc >= 0 && cc < B) { const k = dr || dc ? 0.5 : 1; a += grid[rr * B + cc] * k; wt += k; } } sm[r * B + c] = a / wt; }
        let mx = 0;
        for (const v of sm) mx = Math.max(mx, v);
        const img = ctx.createImageData(B, B);
        for (let i = 0; i < B * B; i++) { if (sm[i] < 0.08) continue; const [r, g, b] = densityColor(Math.log1p(sm[i]) / Math.log1p(mx)); img.data.set([r, g, b, 255], i * 4); }
        const tmp = document.createElement('canvas'); tmp.width = B; tmp.height = B; tmp.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, cw, chh);
      }
      url = cv.toDataURL('image/png');
      if (flowCache.size > 40) flowCache.delete(flowCache.keys().next().value);
      flowCache.set(key, url);
    }
    if (url) s += `<image href="${url}" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" preserveAspectRatio="none"/>`;
  }
  // Axes.
  const xt = flowTicks(cfg.xScale, geo.X.lo, geo.X.hi), yt = geo.Y ? flowTicks(cfg.yScale, geo.Y.lo, geo.Y.hi) : [];
  s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="#333" stroke-width="1.2"/>`;
  xt.forEach(({ v, label }) => { const x = PX(v); if (x < m.l - 0.5 || x > m.l + pw + 0.5) return; s += `<line x1="${x}" y1="${m.t + ph}" x2="${x}" y2="${m.t + ph + 4}" stroke="#333"/><text x="${x}" y="${m.t + ph + 16}" text-anchor="middle">${label}</text>`; });
  yt.forEach(({ v, label }) => { const y = PY(v); if (y < m.t - 0.5 || y > m.t + ph + 0.5) return; s += `<line x1="${m.l - 4}" y1="${y}" x2="${m.l}" y2="${y}" stroke="#333"/><text x="${m.l - 6}" y="${y + 4}" text-anchor="end">${label}</text>`; });
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  s += `<text x="${m.l + pw / 2}" y="${h - 8}" text-anchor="middle" font-size="12">${esc(cfg.xLabel || cfg.xName || '')}</text>`;
  if (cfg.plot !== 'histogram') s += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12">${esc(cfg.yLabel || cfg.yName || '')}</text>`;
  else s += `<text transform="translate(14 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="12">Count</text>`;
  if (cfg.title) s += `<text x="${m.l + pw / 2}" y="18" text-anchor="middle" font-size="13" font-weight="700">${esc(cfg.title)}</text>`;
  // Gates.
  const clampX = (x) => Math.max(m.l, Math.min(m.l + pw, x)), clampY = (y) => Math.max(m.t, Math.min(m.t + ph, y));
  const stats = flowGateStats(cfg, geo), report = [`${xs.length.toLocaleString()} events plotted${cfg.total && cfg.total > xs.length ? ` (subsampled from ${cfg.total.toLocaleString()})` : ''}`];
  stats.forEach(({ g, pct, count }) => {
    if (g.type === 'quad') {
      const x = clampX(PX(g.x)), y = clampY(PY(g.y));
      s += `<path d="M${x} ${m.t}V${m.t + ph}M${m.l} ${y}H${m.l + pw}" stroke="#111" stroke-width="1.3"/>`;
      const lab = (t, px, py, anchor) => `<text x="${px}" y="${py}" text-anchor="${anchor}" font-size="11" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${t}</text>`;
      s += lab(`${pct[0].toFixed(1)}%`, m.l + 4, m.t + 13, 'start') + lab(`${pct[1].toFixed(1)}%`, m.l + pw - 4, m.t + 13, 'end') + lab(`${pct[2].toFixed(1)}%`, m.l + 4, m.t + ph - 5, 'start') + lab(`${pct[3].toFixed(1)}%`, m.l + pw - 4, m.t + ph - 5, 'end');
      report.push(`Quadrants (${esc(g.name || 'Q')}): UL ${pct[0].toFixed(1)}%, UR ${pct[1].toFixed(1)}%, LL ${pct[2].toFixed(1)}%, LR ${pct[3].toFixed(1)}%`);
    } else {
      const x0 = clampX(PX(Math.min(g.x0, g.x1))), x1 = clampX(PX(Math.max(g.x0, g.x1)));
      const y0 = cfg.plot === 'histogram' ? m.t + ph * 0.06 : clampY(PY(Math.max(g.y0, g.y1))), y1 = cfg.plot === 'histogram' ? m.t + ph : clampY(PY(Math.min(g.y0, g.y1)));
      if (cfg.plot === 'histogram') s += `<path d="M${x0} ${y0 + 8}V${y0}H${x1}V${y0 + 8}" stroke="#111" stroke-width="1.4" fill="none"/>`;
      else s += `<rect x="${x0}" y="${y0}" width="${Math.max(1, x1 - x0)}" height="${Math.max(1, y1 - y0)}" rx="6" fill="none" stroke="#111" stroke-width="1.4"/>`;
      const above = y0 - m.t > 16;
      s += `<text x="${(x0 + x1) / 2}" y="${above ? y0 - 4 : y0 + 13}" text-anchor="middle" font-size="11" font-weight="700" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(g.name || 'Gate')} ${pct[0].toFixed(1)}%</text>`;
      report.push(`${esc(g.name || 'Gate')}: ${pct[0].toFixed(2)}% (${count.toLocaleString()} events)`);
    }
  });
  return { svg: `<g ${font} font-size="10" fill="#333">${s}</g>`, report };
}
// Route flow charts to their own renderer.
const _renderChart = renderChart;
renderChart = function (cfg, w, h) { return cfg && cfg.kind === 'flow' ? renderFlow(cfg, w, h) : _renderChart(cfg, w, h); };

function openFlowDialog(existing) {
  const cfg = existing ? deep(existing.cfg) : { kind: 'flow', uid: uid(), plot: 'density', xScale: 'lin', yScale: 'lin', cofactor: 150, gates: [], title: '', xMin: '', xMax: '', yMin: '', yMax: '' };
  const W = existing ? existing.w : 340, H = existing ? existing.h : 320;
  let sample = null; // full parsed file (all channels) while the dialog is open
  const preview = el('div', { class: 'preview', style: 'position:relative;cursor:crosshair' });
  const report = el('div', { class: 'report', style: 'margin-top:8px' });
  const xSel = el('select'), ySel = el('select');
  const gateList = el('div');
  let gateMode = 'rect';
  const subsample = (arr, n = 20000) => { const k = Math.max(1, arr.length / n), out = []; for (let i = 0; i < arr.length && out.length < n; i += k) out.push(+arr[Math.floor(i)].toPrecision(5)); return out; };
  const pickChannels = () => {
    if (!sample) return;
    const xi = +xSel.value, yi = +ySel.value;
    cfg.xName = sample.channels[xi]; cfg.yName = sample.channels[yi];
    const n = Math.min(sample.data[xi].length, 20000);
    cfg.events = { x: subsample(sample.data[xi], n), y: subsample(sample.data[yi], n) };
    cfg.total = sample.total;
    cfg.uid = uid();
    const auto = (name) => (/FSC|SSC|Time/i.test(name) ? 'lin' : 'asinh');
    cfg.xScale = auto(cfg.xName); cfg.yScale = auto(cfg.yName);
    xScale.value = cfg.xScale; yScale.value = cfg.yScale;
    cfg.gates = [];
    update();
  };
  const fill = (sel, names, def) => { sel.innerHTML = ''; names.forEach((n, i) => sel.append(el('option', { value: i, textContent: n }))); sel.value = def; };
  const load = async (file) => {
    try {
      sample = /\.fcs$/i.test(file.name) ? parseFCS(await file.arrayBuffer()) : parseEventCSV(await file.text());
      const idx = (re, d) => { const i = sample.channels.findIndex((c) => re.test(c)); return i >= 0 ? i : d; };
      fill(xSel, sample.channels, idx(/^FSC-A|^FSC/i, 0)); fill(ySel, sample.channels, idx(/^SSC-A|^SSC/i, Math.min(1, sample.channels.length - 1)));
      fileNote.textContent = `${file.name}: ${sample.total.toLocaleString()} events, ${sample.channels.length} channels`;
      pickChannels();
    } catch (e) { toast('Could not read file: ' + e.message, 4000); }
  };
  const fileIn = el('input', { type: 'file', accept: '.fcs,.csv,.txt', style: 'display:none', onchange: (e) => { if (e.target.files[0]) load(e.target.files[0]); fileIn.value = ''; } });
  const fileNote = el('div', { class: 'note', textContent: existing ? `${cfg.xName || ''} vs ${cfg.yName || ''} — load the file again to change channels` : 'Load an .fcs file (FCS 2.0–3.1) or a CSV of channel values exported from FlowJo / FCS Express.' });
  xSel.onchange = pickChannels; ySel.onchange = pickChannels;
  const opt = (pairs, v) => pairs.map(([k, l]) => el('option', { value: k, textContent: l, selected: k === v }));
  const plot = el('select', { onchange: (e) => { cfg.plot = e.target.value; cfg.gates = cfg.gates.filter((g) => (cfg.plot === 'histogram') === (g.type === 'range')); update(); } }, ...opt([['density', 'Pseudocolour density'], ['dot', 'Dot plot'], ['histogram', 'Histogram (X channel)']], cfg.plot));
  const xScale = el('select', { onchange: (e) => { cfg.xScale = e.target.value; update(); } }, ...opt(FLOW_SCALES, cfg.xScale));
  const yScale = el('select', { onchange: (e) => { cfg.yScale = e.target.value; update(); } }, ...opt(FLOW_SCALES, cfg.yScale));
  const modeSel = el('select', { onchange: (e) => { gateMode = e.target.value; } }, ...opt([['rect', 'Rectangle gate (drag)'], ['quad', 'Quadrant gate (click)']], 'rect'));
  const update = () => {
    const r = renderFlow(cfg, W, H);
    preview.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-height:420px;display:block">${r.svg}</svg>`;
    report.textContent = r.report.join('\n');
    gateList.innerHTML = '';
    (cfg.gates || []).forEach((g, i) => gateList.append(el('div', { class: 'row' },
      el('input', { type: 'text', value: g.name || '', style: 'width:120px', oninput: (e) => { g.name = e.target.value; const rr = renderFlow(cfg, W, H); preview.querySelector('svg').innerHTML = rr.svg; report.textContent = rr.report.join('\n'); } }),
      el('span', { class: 'note', textContent: g.type === 'quad' ? 'quadrants' : 'gate' }),
      btn('✕', () => { cfg.gates.splice(i, 1); update(); }))));
  };
  // Drag on the plot to draw gates (coordinates converted back to data units).
  const toData = (ev) => {
    const svgEl = preview.querySelector('svg'); if (!svgEl || !cfg.events) return null;
    const r = svgEl.getBoundingClientRect(), k = W / r.width;
    const px = (ev.clientX - r.left) * k, py = (ev.clientY - r.top) * k;
    const m = { l: 58, r: 14, t: cfg.title ? 30 : 12, b: 44 }, pw = W - m.l - m.r, ph = H - m.t - m.b, geo = flowGeometry(cfg);
    const u = Math.max(0, Math.min(1, (px - m.l) / pw)), v = Math.max(0, Math.min(1, 1 - (py - m.t) / ph));
    return { x: geo.sx.inv(geo.X.u0 + u * (geo.X.u1 - geo.X.u0)), y: geo.Y ? geo.sy.inv(geo.Y.u0 + v * (geo.Y.u1 - geo.Y.u0)) : 0 };
  };
  let drag = null;
  preview.addEventListener('pointerdown', (ev) => {
    const p = toData(ev); if (!p) return;
    if (gateMode === 'quad' && cfg.plot !== 'histogram') { cfg.gates = cfg.gates.filter((g) => g.type !== 'quad'); cfg.gates.push({ type: 'quad', name: 'Q', x: p.x, y: p.y }); update(); return; }
    const g = { type: cfg.plot === 'histogram' ? 'range' : 'rect', name: `Gate ${cfg.gates.length + 1}`, x0: p.x, x1: p.x, y0: p.y, y1: p.y };
    cfg.gates.push(g); drag = g; preview.setPointerCapture(ev.pointerId);
  });
  preview.addEventListener('pointermove', (ev) => { if (!drag) return; const p = toData(ev); if (!p) return; drag.x1 = p.x; drag.y1 = p.y; const r = renderFlow(cfg, W, H); preview.querySelector('svg').innerHTML = r.svg; report.textContent = r.report.join('\n'); });
  preview.addEventListener('pointerup', () => { if (!drag) return; const g = drag; drag = null; if (g.x0 === g.x1) cfg.gates.splice(cfg.gates.indexOf(g), 1); update(); });
  const title = el('input', { type: 'text', value: cfg.title || '', oninput: (e) => { cfg.title = e.target.value; update(); } });
  const lim = (k) => el('input', { type: 'number', placeholder: 'auto', value: cfg[k] ?? '', style: 'width:72px', oninput: (e) => { cfg[k] = e.target.value; update(); } });
  const colorIn = el('input', { type: 'color', value: cfg.color || '#4a7fd6', oninput: (e) => { cfg.color = e.target.value; update(); } });
  openModal('Flow cytometry plot', el('div', {},
    el('div', { class: 'dlg-cols' },
      el('div', {},
        el('div', { class: 'btnrow' }, btn('Load FCS / CSV…', () => fileIn.click(), 'primary'), fileIn), fileNote,
        field_('X channel', xSel), field_('Y channel', ySel), field_('Plot', plot),
        field_('X scale', xScale), field_('Y scale', yScale),
        field_('X range', el('span', { style: 'display:flex;gap:4px;align-items:center' }, lim('xMin'), '–', lim('xMax'))),
        field_('Y range', el('span', { style: 'display:flex;gap:4px;align-items:center' }, lim('yMin'), '–', lim('yMax'))),
        field_('Colour', colorIn), field_('Title', title),
        field_('Gate tool', modeSel), gateList,
        el('div', { class: 'note' }, 'Drag on the plot to draw a gate; click for quadrants. Percentages are of the events plotted. FSC / SSC default to linear and fluorescence to arcsinh (cofactor 150).')),
      el('div', {}, preview, report)),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn(existing ? 'Update' : 'Insert', () => {
      if (!cfg.events) { toast('Load a file first'); return; }
      if (existing) { checkpoint(); existing.cfg = cfg; closeModal(); render({ props: true }); return; }
      const c = viewCenter();
      closeModal();
      addObjects([Make.chart(cfg, c.x - W / 2, c.y - H / 2, W, H)]);
    }, 'primary'))));
  if (existing && sample == null) { xSel.append(el('option', { textContent: cfg.xName || 'X' })); ySel.append(el('option', { textContent: cfg.yName || 'Y' })); }
  update();
}

// ---------- Western blot densitometry ----------
function openBlotDialog() {
  const selImg = selected().find((o) => o.type === 'image');
  const st = { src: selImg ? selImg.src : null, lanes: 6, boxes: { target: null, control: null }, active: 'target', dark: true, labels: '' };
  const cv = el('canvas', { style: 'max-width:100%;border:1px solid var(--line);cursor:crosshair;display:block' });
  const out = el('div', { style: 'margin-top:8px' });
  const img = new Image();
  let scale = 1, pix = null, results = null;
  const draw = () => {
    if (!img.width) return;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    for (const [k, col] of [['target', '#d64545'], ['control', '#3e6db5']]) {
      const b = st.boxes[k]; if (!b) continue;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
      ctx.setLineDash([4, 3]);
      for (let i = 1; i < st.lanes; i++) { const x = (b.x + (b.w * i) / st.lanes) * scale; ctx.beginPath(); ctx.moveTo(x, b.y * scale); ctx.lineTo(x, (b.y + b.h) * scale); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = '12px Helvetica'; ctx.fillText(k === 'target' ? 'Target' : 'Loading control', b.x * scale + 3, b.y * scale - 4);
    }
  };
  // Integrated band density per lane: background = median of the lane's top and bottom rows (local),
  // signal = Σ max(0, background − pixel) for dark bands (or pixel − background for light bands).
  const quantify = (b) => {
    if (!b || !pix) return null;
    const { data, width } = pix, vals = [];
    for (let l = 0; l < st.lanes; l++) {
      const x0 = Math.round(b.x + (b.w * l) / st.lanes), x1 = Math.round(b.x + (b.w * (l + 1)) / st.lanes), y0 = Math.round(b.y), y1 = Math.round(b.y + b.h);
      const g = (x, y) => { const i = (y * width + x) * 4; return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; };
      const edge = [];
      for (let x = x0; x < x1; x++) { edge.push(g(x, y0), g(x, Math.max(y0, y1 - 1))); }
      edge.sort((a, c) => a - c);
      const bg = edge[Math.floor(edge.length / 2)] ?? 0;
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = g(x, y); sum += Math.max(0, st.dark ? bg - v : v - bg); }
      vals.push(sum);
    }
    return vals;
  };
  const recompute = () => {
    draw();
    const t = quantify(st.boxes.target), c = quantify(st.boxes.control);
    if (!t) { out.innerHTML = '<div class="note">Drag a box around the target bands (red), then switch to “Loading control” and box those (blue).</div>'; results = null; return; }
    const labs = st.labels.split(/[,;\t]/).map((s) => s.trim());
    const ratio = t.map((v, i) => (c && c[i] ? v / c[i] : v));
    const rel = ratio.map((r) => (ratio[0] ? r / ratio[0] : 0));
    results = t.map((v, i) => ({ lane: i + 1, label: labs[i] || `Lane ${i + 1}`, target: v, control: c ? c[i] : null, ratio: ratio[i], rel: rel[i] }));
    const cell = (t, b) => `<td style="padding:2px 8px;text-align:right${b ? ';font-weight:600' : ''}">${t}</td>`;
    out.innerHTML = `<table style="border-collapse:collapse;font-size:12px"><tr>${['Lane', 'Label', 'Target', 'Control', 'Ratio', 'Rel. to lane 1'].map((h) => cell(h, true)).join('')}</tr>`
      + results.map((r) => `<tr>${cell(r.lane)}${cell(esc(r.label))}${cell(Math.round(r.target))}${cell(r.control == null ? '—' : Math.round(r.control))}${cell(r.ratio.toPrecision(3))}${cell(r.rel.toFixed(2), true)}</tr>`).join('') + '</table>'
      + `<div class="note" style="margin-top:6px">${c ? '' : 'No loading-control box: values are raw target densities. '}Check that no band is saturated (pure black or white): saturated bands under-report differences.</div>`;
  };
  const loadSrc = (src) => {
    st.src = src;
    img.onload = () => {
      const maxW = 560; scale = Math.min(1, maxW / img.width);
      cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      const full = document.createElement('canvas'); full.width = img.width; full.height = img.height;
      const fx = full.getContext('2d'); fx.drawImage(img, 0, 0);
      pix = fx.getImageData(0, 0, img.width, img.height);
      // Guess polarity: mostly bright image → dark bands.
      let s = 0; for (let i = 0; i < pix.data.length; i += 400) s += pix.data[i];
      st.dark = s / (pix.data.length / 400) > 110; darkCb.checked = st.dark;
      recompute();
    };
    img.src = src;
  };
  let drag = null;
  const at = (ev) => { const r = cv.getBoundingClientRect(); return { x: ((ev.clientX - r.left) * (cv.width / r.width)) / scale, y: ((ev.clientY - r.top) * (cv.height / r.height)) / scale }; };
  cv.addEventListener('pointerdown', (ev) => { if (!img.width) return; drag = at(ev); cv.setPointerCapture(ev.pointerId); });
  cv.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = at(ev), cl = (v, m) => Math.max(0, Math.min(m, v));
    const x0 = cl(Math.min(drag.x, p.x), img.width), x1 = cl(Math.max(drag.x, p.x), img.width), y0 = cl(Math.min(drag.y, p.y), img.height), y1 = cl(Math.max(drag.y, p.y), img.height);
    st.boxes[st.active] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    draw();
  });
  cv.addEventListener('pointerup', () => { if (!drag) return; drag = null; const b = st.boxes[st.active]; if (b && (b.w < 4 || b.h < 2)) st.boxes[st.active] = null; recompute(); });
  const fileIn = el('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => loadSrc(r.result); r.readAsDataURL(f); fileIn.value = ''; } });
  const which = el('select', { onchange: (e) => { st.active = e.target.value; } }, el('option', { value: 'target', textContent: 'Target bands (red box)' }), el('option', { value: 'control', textContent: 'Loading control (blue box)' }));
  const darkCb = el('input', { type: 'checkbox', checked: true, onchange: (e) => { st.dark = e.target.checked; recompute(); } });
  openModal('Western blot quantification', el('div', { style: 'width:900px;max-width:92vw' },
    el('div', { class: 'dlg-cols' },
      el('div', {}, el('div', { class: 'btnrow', style: 'margin-bottom:6px' }, btn('Load blot image…', () => fileIn.click(), 'primary'), fileIn), cv,
        el('div', { class: 'note' }, selImg ? 'Using the selected image. ' : '', 'Drag a box tightly around one row of bands; it is split into equal lanes.')),
      el('div', {},
        field_('Drawing', which),
        field_('Lanes', el('input', { type: 'number', min: 1, max: 30, value: st.lanes, style: 'width:70px', oninput: (e) => { st.lanes = Math.max(1, +e.target.value || 1); recompute(); } })),
        field_('Lane groups', el('input', { type: 'text', placeholder: 'Ctrl, Ctrl, Ctrl, Drug, Drug, Drug', oninput: (e) => { st.labels = e.target.value; recompute(); } })),
        field_('', el('label', { style: 'width:auto;color:inherit' }, darkCb, ' Dark bands on light background')),
        out)),
    el('div', { class: 'actions' },
      btn('Copy table', () => { if (results) { navigator.clipboard.writeText(['Lane\tLabel\tTarget\tControl\tRatio\tRelative', ...results.map((r) => [r.lane, r.label, Math.round(r.target), r.control == null ? '' : Math.round(r.control), r.ratio, r.rel].join('\t'))].join('\n')); toast('Copied — paste into Excel or Prism'); } }),
      btn('Cancel', closeModal),
      btn('Insert bar chart', () => {
        if (!results) { toast('Box the bands first'); return; }
        // One column per lane group (replicate lanes share a label) → bar chart with statistics.
        const groups = [...new Set(results.map((r) => r.label))];
        const cols = groups.map((g) => results.filter((r) => r.label === g).map((r) => +r.rel.toFixed(4)));
        const n = Math.max(...cols.map((c) => c.length));
        const data = [groups.join(','), ...Array.from({ length: n }, (_, i) => cols.map((c) => c[i] ?? '').join(','))].join('\n');
        const c = viewCenter();
        closeModal();
        addObjects([Make.chart({ kind: 'bar', data, title: '', xLabel: '', yLabel: st.boxes.control ? 'Target / loading control (rel.)' : 'Band density (rel.)', error: 'sd', showPoints: true, test: n > 1 ? 'auto' : 'none', pStyle: 'stars', grid: false }, c.x - 190, c.y - 150)]);
      }, 'primary'))));
  if (st.src) loadSrc(st.src); else recompute();
}

ARRANGE_COMMANDS.flowPlot = () => openFlowDialog();
ARRANGE_COMMANDS.blotQuant = openBlotDialog;
const _openGraphDialog = openGraphDialog;
openGraphDialog = function (o) { return o && o.cfg && o.cfg.kind === 'flow' ? openFlowDialog(o) : _openGraphDialog(o); };
