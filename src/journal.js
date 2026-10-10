// Journal-ready figures: real journal figure sizes, a "Check figure" panel that finds print problems
// (tiny text, hairlines, low-DPI images, red/green pairs, panel letters, off-page objects, NC icons),
// a column guide, and per-journal export (LZW TIFF with DPI tags, or vector PDF).

const MM = 96 / 25.4; // page units (96 px/in) per millimetre
// Sizes and minimums from each publisher's author guide (2026). Guides change: confirm before submission.
const JOURNALS = [
  { id: 'nature', name: 'Nature family (Nature, Nat Immunol, Nat Cancer, Nat Commun)', widths: [['Single column', 89], ['1.5 column', 120], ['Double column', 183]], maxH: 247, minPt: 5, minLine: 0.25, dpi: 300, fmt: 'pdf', formats: 'PDF / EPS (vector) or TIFF', maxMB: 30 },
  { id: 'cell', name: 'Cell Press (Cell, Immunity, Cancer Cell, Cell Reports)', widths: [['Single column', 85], ['1.5 column', 114], ['Full width', 174]], maxH: 225, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / PDF / EPS; 300 dpi colour, 500 dpi combination, 1000 dpi line art', maxMB: 30 },
  { id: 'science', name: 'Science family', widths: [['1 column', 57], ['2 columns', 121], ['3 columns', 184]], maxH: 225, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'pdf', formats: 'PDF / EPS / TIFF', maxMB: 30 },
  { id: 'pnas', name: 'PNAS', widths: [['Single column', 87], ['1.5 column', 114], ['Double column', 178]], maxH: 225, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / EPS / PDF', maxMB: 30 },
  { id: 'elife', name: 'eLife', widths: [['Single column', 85], ['Full width', 180]], maxH: 240, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / PDF; any reasonable size', maxMB: 30, approx: true },
  { id: 'rup', name: 'JEM / JCB / JGP (Rockefeller University Press)', widths: [['Single column', 85], ['1.5 column', 114], ['Double column', 176]], maxH: 230, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / EPS / PDF', maxMB: 30, approx: true },
  { id: 'plos', name: 'PLOS (Biology, Pathogens, ONE…)', widths: [['Minimum', 67], ['Single column', 89], ['Full width', 190]], maxH: 222, minPt: 8, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF (LZW) or EPS, RGB, 300–600 dpi, fonts 8–12 pt', maxMB: 10 },
  { id: 'frontiers', name: 'Frontiers', widths: [['Single column', 85], ['Double column', 180]], maxH: 225, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / JPEG / EPS', maxMB: 20, approx: true },
  { id: 'jci', name: 'JCI / JCI Insight', widths: [['Single column', 86], ['Double column', 178]], maxH: 230, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / EPS / PDF', maxMB: 30, approx: true },
  { id: 'blood', name: 'Blood (ASH)', widths: [['Single column', 85], ['Double column', 178]], maxH: 230, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF / EPS / PDF', maxMB: 30, approx: true },
  { id: 'generic', name: 'Generic (no journal)', widths: [['Current page size', 0]], maxH: 0, minPt: 6, minLine: 0.25, dpi: 300, fmt: 'tiff', formats: 'TIFF or PDF', maxMB: 0 },
];
// Journal page presets: width at 1:1 print size; height = a typical figure aspect.
JOURNALS.filter((j) => j.id !== 'generic').forEach((j) => {
  const short = j.name.split(' (')[0];
  j.widths.filter(([l]) => l !== 'Minimum').forEach(([label, mm]) => PAGE_PRESETS.push([`${short} — ${label} ${mm} mm`, Math.round(mm * MM), Math.round(Math.min(j.maxH, mm * (mm > 130 ? 0.72 : 0.9)) * MM)]));
});

const journalOf = () => JOURNALS.find((j) => j.id === (state.doc.journal && state.doc.journal.id)) || JOURNALS[JOURNALS.length - 1];
// Print scale: page units → physical size when the figure is placed at the chosen column width.
function printScale(p = page()) {
  const jd = state.doc.journal;
  return jd && jd.widthMM ? (jd.widthMM * MM) / p.width : 1;
}

// ---------- Checks ----------
function walkObjects(list, gs = 1, out = []) {
  for (const o of list) {
    if (o.hidden) continue;
    out.push({ o, gs });
    if (o.type === 'group') walkObjects(o.children, gs * Math.min(o.w / (o.w0 || o.w), o.h / (o.h0 || o.h)), out);
  }
  return out;
}
const hexOk = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
function hsl(c) {
  const [r, g, b] = Color.hexToRgb(c).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}
// Colour-vision maths: Machado et al. 2009 deuteranopia in linear RGB, compared as CIELAB ΔE.
const linRGB = (c) => Color.hexToRgb(c).map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
const DEUT_M = [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]];
const deutLin = (c) => { const l = linRGB(c); return DEUT_M.map((r) => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))); };
function labOf(l) {
  const X = (0.4124 * l[0] + 0.3576 * l[1] + 0.1805 * l[2]) / 0.95047, Y = 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2], Z = (0.0193 * l[0] + 0.1192 * l[1] + 0.9505 * l[2]) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function objColours(o) {
  const cs = [o.fill, o.stroke, o.color, o.tint, o.labelColor];
  if (o.type === 'chart' && o.cfg) cs.push(...(o.cfg.colors && o.cfg.colors.length ? o.cfg.colors : CHART_PALETTE).slice(0, Math.max(2, (parseTable(o.cfg.data || '').headers || []).length)));
  return cs.filter(hexOk).map((c) => c.toLowerCase());
}

async function checkFigure(p = page()) {
  const j = journalOf(), k = printScale(p), issues = [];
  const add = (sev, kind, msg, o) => issues.push({ sev, kind, msg, id: o && o.id });
  const pt = (px) => px * k * 0.75;
  const items = walkObjects(p.objects);
  for (const { o, gs } of items) {
    const name = (o.name || (typeof layerName === 'function' ? layerName(o) : o.type)).slice(0, 40);
    // Text size at print.
    const sizes = [];
    if (o.type === 'text') sizes.push(o.fontSize || 16);
    if (o.label && ['rect', 'ellipse', 'shape'].includes(o.type)) sizes.push(o.labelSize || 16);
    if (o.type === 'connector' && o.label) sizes.push(o.labelSize || 13);
    if (o.type === 'chart') sizes.push(10);
    if (o.type === 'table') sizes.push(o.fontSize || 13);
    if (o.type === 'path' && o.pathText) sizes.push(o.pathTextSize || 16);
    const minSz = sizes.length ? Math.min(...sizes) * gs : null;
    if (minSz != null && pt(minSz) < j.minPt - 0.05) add('error', 'Text', `${name}: text is ${pt(minSz).toFixed(1)} pt at print size (minimum ${j.minPt} pt)`, o);
    // Hairlines.
    const sw = o.type === 'connector' ? o.width : ['rect', 'ellipse', 'shape', 'path'].includes(o.type) && o.stroke && o.stroke !== 'none' ? o.strokeWidth ?? 2 : null;
    if (sw != null && sw > 0 && !o.blur && pt(sw * gs) < j.minLine) add('warn', 'Lines', `${name}: line is ${pt(sw * gs).toFixed(2)} pt (minimum ${j.minLine} pt — may disappear in print)`, o);
    // Image resolution.
    if (o.type === 'image') {
      let nw = o.nw;
      if (!nw) { try { nw = (await loadImageSize(o.src)).w; } catch { nw = 0; } }
      const vis = nw * (1 - ((o.crop && o.crop.l) || 0) - ((o.crop && o.crop.r) || 0));
      const inches = (o.w * gs * k) / 96, dpi = inches > 0 ? vis / inches : 0;
      if (dpi && dpi < j.dpi) add(dpi < j.dpi * 0.6 ? 'error' : 'warn', 'Images', `${name}: ${Math.round(dpi)} dpi at placed size (needs ${j.dpi}). Use a higher-resolution original or place it smaller.`, o);
    }
    // NC icons.
    if (o.type === 'icon' && state.doc.journal && state.doc.journal.commercial && typeof getAsset === 'function') {
      const a = getAsset(o.iconId);
      if (a && isNonCommercial(a.license)) add('error', 'Licences', `${name}: ${a.license.toUpperCase()} icon — not allowed for commercial use`, o);
    }
  }
  // Off-page objects.
  for (const o of p.objects) {
    if (o.hidden) continue;
    const b = bounds(o, p.objects);
    if (b.x < -1 || b.y < -1 || b.x + b.w > p.width + 1 || b.y + b.h > p.height + 1) add('warn', 'Layout', `${(o.name || layerName(o)).slice(0, 40)} extends outside the page and will be cropped`, o);
  }
  // Page height at print.
  if (j.maxH && (p.height * k) / MM > j.maxH + 0.5) add('warn', 'Size', `Figure is ${((p.height * k) / MM).toFixed(0)} mm tall at this width — ${j.name.split(' (')[0]} allows up to ${j.maxH} mm`);
  // Red/green pairs that look alike with deuteranopia.
  const colourUse = new Map();
  for (const { o } of items) for (const c of objColours(o)) { const h = hsl(c); if (h.s > 0.3 && h.l > 0.15 && h.l < 0.85) { if (!colourUse.has(c)) colourUse.set(c, o); } }
  const cols = [...colourUse.keys()], seen = new Set();
  for (let a = 0; a < cols.length; a++) for (let b = a + 1; b < cols.length; b++) {
    const ha = hsl(cols[a]).h, hb = hsl(cols[b]).h, red = (h) => h < 25 || h > 335, green = (h) => h > 70 && h < 165;
    if (!((red(ha) && green(hb)) || (green(ha) && red(hb)))) continue;
    if (deltaE(labOf(linRGB(cols[a])), labOf(linRGB(cols[b]))) > 40 && deltaE(labOf(deutLin(cols[a])), labOf(deutLin(cols[b]))) < 30) {
      const key = cols[a] + cols[b];
      if (!seen.has(key)) { seen.add(key); add('warn', 'Colour', `Red/green pair ${cols[a]} / ${cols[b]} is hard to tell apart for ~8% of men (deuteranopia). Use magenta/green or blue/orange, or add shapes / labels.`, colourUse.get(cols[a])); }
    }
  }
  // Panel letters.
  const letters = p.objects.filter((o) => o.type === 'text' && /^\(?[A-Za-z]\)?\.?$/.test((o.text || '').trim()) && !o.hidden)
    .map((o) => ({ o, ch: o.text.trim().replace(/[().]/g, '') }));
  const panels = p.objects.filter((o) => ['chart', 'image', 'group', 'protocol', 'table'].includes(o.type)).length;
  if (!letters.length && panels >= 2) add('info', 'Panels', `${panels} panels but no panel letters (A, B, C…). Arrange › Figure Panels adds them.`);
  if (letters.length) {
    const order = [...letters].sort((a, b) => (Math.abs(a.o.y - b.o.y) > 40 ? a.o.y - b.o.y : a.o.x - b.o.x));
    const up = order[0].ch === order[0].ch.toUpperCase(), base = (up ? 'A' : 'a').charCodeAt(0);
    const codes = order.map((x) => x.ch.charCodeAt(0));
    order.forEach((x, i) => { if (codes[i] !== base + i) add('warn', 'Panels', `Panel letter “${x.ch}” is out of sequence (expected ${String.fromCharCode(base + i)} in reading order)`, x.o); });
    if (new Set(order.map((x) => x.ch === x.ch.toUpperCase())).size > 1) add('warn', 'Panels', 'Panel letters mix upper and lower case');
    if (new Set(order.map((x) => x.o.fontSize)).size > 1) add('info', 'Panels', 'Panel letters use different font sizes');
  }
  // Format notes.
  if (/EPS|SVG/.test(j.formats)) add('info', 'Fonts', 'PDF export embeds fonts. SVG export references fonts — outline text in Illustrator if you submit SVG/EPS.');
  return { issues, k, j };
}

// ---------- Check panel (right sidebar tab) ----------
let lastCheck = null;
async function renderCheckPanel() {
  const P = $('#check');
  if (!P) return;
  const jd = state.doc.journal || (state.doc.journal = { id: 'generic', widthMM: 0, commercial: false, guide: true });
  const j = journalOf();
  const jSel = el('select', { style: 'flex:1;min-width:0' }, ...JOURNALS.map((x) => el('option', { value: x.id, textContent: x.name, selected: x.id === j.id })));
  const wSel = el('select', { style: 'flex:1' }, ...j.widths.map(([l, mm]) => el('option', { value: mm, textContent: mm ? `${l} — ${mm} mm` : l, selected: +mm === +jd.widthMM })));
  jSel.onchange = () => { const nj = JOURNALS.find((x) => x.id === jSel.value); jd.id = nj.id; jd.widthMM = nj.widths[nj.widths.length > 1 ? nj.widths.length - 1 : 0][1]; markDirty(); renderCheckPanel(); updateColGuide(); };
  wSel.onchange = () => { jd.widthMM = +wSel.value; markDirty(); renderCheckPanel(); updateColGuide(); };
  const comm = el('input', { type: 'checkbox', checked: !!jd.commercial, onchange: (e) => { jd.commercial = e.target.checked; markDirty(); renderCheckPanel(); } });
  const guide = el('input', { type: 'checkbox', checked: jd.guide !== false, onchange: (e) => { jd.guide = e.target.checked; updateColGuide(); } });
  const res = await checkFigure();
  lastCheck = res;
  const k = res.k, p = page();
  const counts = { error: 0, warn: 0, info: 0 };
  res.issues.forEach((x) => counts[x.sev]++);
  const icon = { error: '⛔', warn: '⚠️', info: 'ℹ️' };
  const list = el('div', { class: 'checklist' }, ...(res.issues.length ? res.issues.map((x) => el('div', { class: `chk chk-${x.sev}`, style: 'display:flex;gap:6px;padding:5px 2px;border-bottom:1px solid var(--line);font-size:12px;cursor:' + (x.id ? 'pointer' : 'default'), onclick: () => x.id && jumpTo(x.id) },
    el('span', { textContent: icon[x.sev] }), el('span', { style: 'flex:1' }, el('b', { textContent: x.kind + ': ' }), x.msg),
    x.fix ? el('button', { textContent: x.fixLabel || 'Fix', style: 'padding:1px 8px;font-size:11px;align-self:flex-start', onclick: (e) => { e.stopPropagation(); checkpoint(); x.fix(); render({ props: true }); renderCheckPanel(); } }) : null)) : [el('div', { class: 'note', style: 'padding:8px 0;color:#2b7f4a', textContent: '✓ No problems found for this journal.' })]));
  P.innerHTML = '';
  P.append(sect('Journal', row('Journal', jSel), j.widths.length > 1 || j.widths[0][1] ? row('Width', wSel) : null,
    el('div', { class: 'note', textContent: `Printed at ${jd.widthMM ? `${jd.widthMM} mm` : `${((p.width / 96) * 25.4).toFixed(0)} mm (current page)`} wide → ${((p.height * k) / MM).toFixed(0)} mm tall; everything scales ×${k.toFixed(2)}. Formats: ${j.formats}.${j.approx ? ' Sizes approximate — confirm in the current author guide.' : ''}` }),
    row('', el('label', { style: 'width:auto;color:inherit' }, comm, ' Commercial use (flag non-commercial icons)')),
    row('', el('label', { style: 'width:auto;color:inherit' }, guide, ' Show column guide')),
    el('div', { class: 'btnrow' }, btn('Re-check', renderCheckPanel), btn('Export for journal…', () => exportForJournal(), 'primary'))));
  P.append(sect(`Problems — ${counts.error} errors, ${counts.warn} warnings`, el('div', { class: 'note', textContent: 'Click an item to select it on the page.' }), list));
}
function jumpTo(id) {
  const o = byId(id) || objs().find((x) => x.children && JSON.stringify(x.children).includes(`"${id}"`));
  if (!o) return;
  state.sel = [o.id];
  const b = bounds(o, objs()), r = svg.getBoundingClientRect();
  state.panX = r.width / 2 - (b.x + b.w / 2) * state.zoom; state.panY = r.height / 2 - (b.y + b.h / 2) * state.zoom;
  applyViewport(); render({ props: false });
}
function updateColGuide() {
  let g = $('#colguide');
  if (!g) { g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.id = 'colguide'; g.setAttribute('pointer-events', 'none'); $('#scene').after(g); }
  const jd = state.doc.journal, j = journalOf(), p = page();
  if (!jd || jd.guide === false || !jd.widthMM || j.id === 'generic') { g.innerHTML = ''; return; }
  const k = printScale(p), z = state.zoom;
  g.innerHTML = j.widths.filter(([, mm]) => mm && mm < jd.widthMM).map(([l, mm], i) => { const x = (mm * MM) / k; return `<line x1="${x}" y1="0" x2="${x}" y2="${p.height}" stroke="#e8743b" stroke-width="${1.2 / z}" stroke-dasharray="${6 / z} ${4 / z}"/><text x="${x + 4 / z}" y="${(14 + i * 15) / z}" font-size="${11 / z}" fill="#e8743b" font-family="Helvetica">${l} ${mm} mm</text>`; }).join('')
    + (j.maxH && (p.height * k) / MM > j.maxH ? `<line x1="0" y1="${(j.maxH * MM) / k}" x2="${p.width}" y2="${(j.maxH * MM) / k}" stroke="#d64545" stroke-width="${1.2 / z}" stroke-dasharray="${6 / z} ${4 / z}"/>` : '');
}

// ---------- TIFF export (RGB, LZW, with resolution tags) ----------
function lzwEncode(bytes) {
  const out = [];
  let bitBuf = 0, bitCnt = 0, width = 9;
  const emit = (code) => { bitBuf = (bitBuf << width) | code; bitCnt += width; while (bitCnt >= 8) { out.push((bitBuf >>> (bitCnt - 8)) & 255); bitCnt -= 8; } bitBuf &= (1 << bitCnt) - 1; };
  let dict = new Map(), next = 258;
  emit(256);
  let w = -1;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (w < 0) { w = c; continue; }
    const key = w * 256 + c, hit = dict.get(key);
    if (hit !== undefined) { w = hit; continue; }
    emit(w);
    dict.set(key, next++);
    if (next === 512) width = 10; else if (next === 1024) width = 11; else if (next === 2048) width = 12;
    if (next >= 4094) { emit(256); dict = new Map(); next = 258; width = 9; }
    w = c;
  }
  if (w >= 0) { emit(w); next++; if (next === 512) width = 10; else if (next === 1024) width = 11; else if (next === 2048) width = 12; }
  emit(257);
  if (bitCnt > 0) out.push((bitBuf << (8 - bitCnt)) & 255);
  return new Uint8Array(out);
}
function encodeTiff(imageData, dpi) {
  const { width: W, height: H, data } = imageData;
  const rgb = new Uint8Array(W * H * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) { const a = data[i + 3] / 255; rgb[j] = data[i] * a + 255 * (1 - a); rgb[j + 1] = data[i + 1] * a + 255 * (1 - a); rgb[j + 2] = data[i + 2] * a + 255 * (1 - a); }
  // One strip per 64 rows keeps LZW dictionaries small and readers happy.
  const rps = 64, strips = [];
  for (let y = 0; y < H; y += rps) strips.push(lzwEncode(rgb.subarray(y * W * 3, Math.min(H, y + rps) * W * 3)));
  const nTags = 13, ifdSize = 2 + nTags * 12 + 4;
  const extra = 6 /* bps */ + 16 /* 2 rationals */ + strips.length * 8;
  const dataStart = 8 + ifdSize + extra;
  const total = dataStart + strips.reduce((s, x) => s + x.length, 0);
  const buf = new ArrayBuffer(total), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint16(0, 0x4949, true); dv.setUint16(2, 42, true); dv.setUint32(4, 8, true);
  let o = 8; dv.setUint16(o, nTags, true); o += 2;
  let ex = 8 + ifdSize;
  const bpsOff = ex; ex += 6; const xresOff = ex; ex += 8; const yresOff = ex; ex += 8; const offsOff = ex; ex += strips.length * 4; const cntOff = ex; ex += strips.length * 4;
  const tag = (id, type, count, val) => { dv.setUint16(o, id, true); dv.setUint16(o + 2, type, true); dv.setUint32(o + 4, count, true); if (type === 3 && count === 1) dv.setUint16(o + 8, val, true); else dv.setUint32(o + 8, val, true); o += 12; };
  tag(256, 4, 1, W); tag(257, 4, 1, H); tag(258, 3, 3, bpsOff); tag(259, 3, 1, 5); tag(262, 3, 1, 2);
  tag(273, 4, strips.length, strips.length === 1 ? dataStart : offsOff); tag(277, 3, 1, 3); tag(278, 4, 1, rps);
  tag(279, 4, strips.length, strips.length === 1 ? strips[0].length : cntOff); tag(282, 5, 1, xresOff); tag(283, 5, 1, yresOff); tag(284, 3, 1, 1); tag(296, 3, 1, 2);
  dv.setUint32(o, 0, true);
  dv.setUint16(bpsOff, 8, true); dv.setUint16(bpsOff + 2, 8, true); dv.setUint16(bpsOff + 4, 8, true);
  dv.setUint32(xresOff, Math.round(dpi), true); dv.setUint32(xresOff + 4, 1, true); dv.setUint32(yresOff, Math.round(dpi), true); dv.setUint32(yresOff + 4, 1, true);
  let pos = dataStart;
  strips.forEach((s, i) => { if (strips.length > 1) { dv.setUint32(offsOff + i * 4, pos, true); dv.setUint32(cntOff + i * 4, s.length, true); } u8.set(s, pos); pos += s.length; });
  return u8;
}
function rasterizeCanvas(p, scale) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([pageSvgString(p)], { type: 'image/svg+xml' }));
    const im = new Image();
    im.onload = () => { const c = document.createElement('canvas'); c.width = Math.round(p.width * scale); c.height = Math.round(p.height * scale); const g = c.getContext('2d'); g.fillStyle = p.background || '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c); };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Render failed')); };
    im.src = url;
  });
}
async function tiffDataUrl(p, widthIn, dpi) {
  const sc = maxScale(p, (widthIn * dpi) / p.width), c = await rasterizeCanvas(p, sc);
  const effDpi = (sc * p.width) / widthIn;
  const bytes = encodeTiff(c.getContext('2d').getImageData(0, 0, c.width, c.height), effDpi);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { url: 'data:image/tiff;base64,' + btoa(bin), bytes: bytes.length, px: [c.width, c.height], dpi: Math.round(effDpi) };
}
async function exportForJournal() {
  const j = journalOf(), jd = state.doc.journal || {}, p = page();
  const widthIn = jd.widthMM ? jd.widthMM / 25.4 : p.width / 96;
  const fmt = el('select', {}, el('option', { value: 'tiff', textContent: 'TIFF (RGB, LZW)', selected: j.fmt === 'tiff' }), el('option', { value: 'pdf', textContent: 'PDF (vector, fonts embedded)', selected: j.fmt === 'pdf' }));
  const dpi = el('select', {}, ...[300, 450, 600, 1000].map((d) => el('option', { value: d, textContent: `${d} dpi${d === 300 ? ' (colour / photos)' : d === 600 ? ' (combination)' : d === 1000 ? ' (line art)' : ''}`, selected: d === j.dpi })));
  const info = el('div', { class: 'note' });
  const upd = () => { const px = Math.round(widthIn * +dpi.value); info.textContent = fmt.value === 'tiff' ? `${(widthIn * 25.4).toFixed(0)} mm wide → ${px} × ${Math.round(px * (p.height / p.width))} px at ${dpi.value} dpi. RGB only — journals that need CMYK convert at production, or convert in Photoshop.` : 'Vector PDF at the column width; text stays selectable and fonts are embedded.'; dpi.parentElement && dpi.parentElement.classList.toggle('hidden', fmt.value !== 'tiff'); };
  fmt.onchange = upd; dpi.onchange = upd;
  const base = (state.filePath ? state.filePath.split(/[\\/]/).pop().replace(/\.scifig$/, '') : 'figure') + `-${j.id}`;
  const go = btn('Export…', async () => {
    const done = busy(go, 'Rendering…');
    try {
      if (fmt.value === 'pdf') {
        const k = printScale(p), pg = { ...p, width: p.width * k, height: p.height * k, objects: [{ id: 'jscale', type: 'group', x: 0, y: 0, w: p.width * k, h: p.height * k, w0: p.width, h0: p.height, rot: 0, children: p.objects }] };
        const out = await window.native.exportPdf({ defaultName: base + '.pdf', pages: [{ svg: pageSvgString(pg), width: pg.width, height: pg.height }] });
        if (out) { toast('Exported ' + out.split(/[\\/]/).pop()); closeModal(); }
      } else {
        const r = await tiffDataUrl(p, widthIn, +dpi.value);
        const mb = r.bytes / 1048576;
        const out = await window.native.exportFile({ defaultName: base + '.tif', ext: 'tif', data: r.url });
        if (out) { toast(`Exported ${out.split(/[\\/]/).pop()} — ${r.px[0]} × ${r.px[1]} px, ${r.dpi} dpi, ${mb.toFixed(1)} MB${j.maxMB && mb > j.maxMB ? ` (over the ${j.maxMB} MB limit!)` : ''}`, 6000); closeModal(); }
      }
    } catch (e) { toast('Export failed: ' + e.message, 5000); }
    done();
  }, 'primary');
  const errs = lastCheck ? lastCheck.issues.filter((x) => x.sev === 'error').length : 0;
  openModal(`Export for ${j.name.split(' (')[0]}`, el('div', { style: 'max-width:480px' },
    errs ? el('div', { class: 'note', style: 'color:#b03030;margin-bottom:8px', textContent: `The figure check found ${errs} error${errs > 1 ? 's' : ''} — fix them first (Check tab), or export anyway.` }) : null,
    field_('Format', fmt), field_('Resolution', dpi), info, el('div', { class: 'actions' }, btn('Cancel', closeModal), go)));
  upd();
}
// Busy helper (ai.js defines one; keep a fallback for safety).
if (typeof busy !== 'function') window.busy = (b, t) => { const o = b.textContent; b.disabled = true; b.textContent = t; return () => { b.disabled = false; b.textContent = o; }; };

// Add the Check tab and keep the column guide in sync with renders.
(() => {
  const tabs = $('#right .tabs'), right = $('#right');
  if (!tabs || $('#check')) return;
  tabs.append(el('button', { class: 'tab', textContent: 'Check', 'data-rtab': 'check' }));
  right.append(el('div', { id: 'check', class: 'rpane hidden' }));
  const _render = render;
  render = function (...a) { const r = _render.apply(this, a); updateColGuide(); return r; };
})();
ARRANGE_COMMANDS.checkFigure = () => { $$('[data-rtab]').forEach((x) => x.classList.toggle('active', x.dataset.rtab === 'check')); ['props', 'layers', 'comments', 'check'].forEach((k) => $('#' + k) && $('#' + k).classList.toggle('hidden', k !== 'check')); renderCheckPanel(); };
ARRANGE_COMMANDS.exportJournal = () => exportForJournal();
