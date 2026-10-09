// Diagram builder (Insert › Diagram…): type a few lines, get an editable diagram made of ordinary shapes,
// text, icons and connectors. Each DIAGRAMS entry has form fields and a pure build(params) → objects.
// Layout families: cycles / life cycles, radial (hub and spoke), process chevrons, funnel, pyramid,
// concentric layers, timeline, Gantt chart, hierarchy / decision tree, phylogenetic tree (Newick),
// food web, clinical trial designs, risk matrix, Punnett square, panel grids, Venn layouts, callouts,
// 2 × 2 quadrant, and ELISA formats.

const DG_PAL = ['#4a7fd6', '#e8743b', '#3fa58b', '#d6584a', '#9b7fd1', '#e8b33c', '#5bb5e0', '#c77cb1', '#7a8a96', '#5a9e4b'];
const dgLines = (t) => String(t || '').split('\n').map((l) => l.replace(/\s+#.*$/, '').replace(/^#.*$/, '')).filter((l) => l.trim());
const dgParts = (l) => l.split('|').map((s) => s.trim());
const dgW = (t, size = 14, bold = false) => Math.max(...String(t).split('\n').map((ln) => measureText(ln, size, 'sans', bold).w));
const dgCol = (i, p) => (p && p.palette && p.palette.length ? p.palette : DG_PAL)[i % ((p && p.palette && p.palette.length) || DG_PAL.length)];

// Find a library icon by name (built-in and soft-style sets); exact name, then word match, then tags.
function findIcon(q, { strict = false } = {}) {
  if (!q) return null;
  const s = String(q).toLowerCase().trim();
  if (!s) return null;
  if (ICON_MAP[s]) return s;
  const words = s.split(/[^a-z0-9+]+/).filter((w) => w.length > 1);
  let best = null, score = 0;
  for (const ic of ICONS) {
    const n = String(ic.name || '').toLowerCase(), tags = String(ic.tags || '').toLowerCase();
    let sc = 0;
    if (n === s) sc = 100;
    else if (n.replace(/\s*\(.*\)$/, '') === s) sc = 90;
    else if (n.startsWith(s)) sc = 70;
    else if (words.length && words.every((w) => new RegExp(`\\b${w.replace(/[^a-z0-9]/g, '')}`).test(n))) sc = 50 - n.length / 100;
    else if (words.length && words.every((w) => n.includes(w) || tags.includes(w))) sc = 20 - n.length / 100;
    if (ic.soft) sc += 0.5; // prefer the consistent soft style when equal
    if (sc > score) { score = sc; best = ic.id; }
  }
  return score >= (strict ? 90 : 20) ? best : null;
}
function dgBox(label, x, y, w, h, col, extra = {}) {
  return Make.rect(x, y, w, h, { fill: Color.light(col, 0.85), stroke: col, strokeWidth: 1.8, radius: 10, label, labelSize: 14, labelBold: true, labelColor: Color.dark(col, 0.5), ...extra });
}
function dgText(t, x, y, extra = {}) { return Make.text(t, x, y, { fontSize: 14, ...extra }); }
function dgCenteredText(t, cx, cy, extra = {}) { const o = dgText(t, 0, 0, extra); o.x = cx - o.w / 2; o.y = cy - o.h / 2; return o; }
function dgPoly(pts, extra = {}) { return makePathFromNodes(pts.map(([x, y]) => ({ x, y })), { closed: true, fill: '#e8f0fb', stroke: '#4a7fd6', strokeWidth: 1.5, cap: 'round', join: 'round', ...extra }); }
function dgLine(pts, extra = {}) { return makePathFromNodes(pts.map(([x, y]) => ({ x, y })), { closed: false, fill: 'none', stroke: '#333333', strokeWidth: 2, cap: 'round', ...extra }); }
// Compound polyline (several separate strokes in one editable path object).
function dgStrokes(lines, extra = {}) { return makePathFromNodes(lines.flatMap((ln) => ln.map(([x, y], i) => ({ x, y, ...(i === 0 ? { move: true } : {}) }))), { closed: false, fill: 'none', stroke: '#333333', strokeWidth: 1.6, cap: 'round', ...extra }); }
// Curved connector bulging away from (cx, cy).
function dgArc(a, b, cx, cy, bulge = 30, extra = {}) {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const mx = (ax + bx) / 2 - cx, my = (ay + by) / 2 - cy, side = Math.sign(((-dy) / len) * mx + (dx / len) * my) || 1;
  return Make.connector(a, b, { style: 'curved', curve: side * bulge, color: '#555555', width: 2, ...extra });
}
// An icon when one matches (any match for a named icon; exact names only when guessing from the label).
const dgIconOrBox = (label, key, cx, cy, size, col) => {
  const id = key && key !== label ? findIcon(key) : findIcon(label, { strict: true });
  if (id) { const ic = Make.icon(id, 0, 0, size); ic.x = cx - ic.w / 2; ic.y = cy - ic.h / 2; ic.name = label; return ic; }
  const w = Math.max(90, dgW(label, 14, true) + 24);
  return dgBox(label, cx - w / 2, cy - 22, w, 44, col, { name: label });
};

const DIAGRAMS = {};
const DIAGRAM_GROUPS = [];
function addDiagram(key, def) { DIAGRAMS[key] = def; if (!DIAGRAM_GROUPS.includes(def.group)) DIAGRAM_GROUPS.push(def.group); }

// ---------- Cycles ----------
addDiagram('cycle', {
  label: 'Cycle / life cycle', group: 'Cycles & processes', desc: 'Steps around a circle with arrows: life cycles, cell cycle, feedback loops.',
  fields: [
    { key: 'steps', label: 'Steps (one per line; optional | icon)', type: 'textarea', rows: 7, def: 'Attachment | virus\nEntry\nUncoating\nReplication | dna\nAssembly\nRelease' },
    { key: 'center', label: 'Centre label', type: 'text', def: 'Viral life cycle' },
    { key: 'style', label: 'Style', type: 'select', def: 'boxes', options: [['boxes', 'Boxes'], ['icons', 'Icons with labels'], ['ring', 'Arrow ring segments']] },
  ],
  build(p) {
    const steps = dgLines(p.steps).map(dgParts), n = steps.length, o = [];
    if (n < 2) return o;
    const R = Math.max(150, n * 42), cx = R + 120, cy = R + 70;
    if (p.style === 'ring') {
      const ro = R, ri = R - 52, gap = 0.035, tipA = 0.09;
      steps.forEach(([lab], i) => {
        const a0 = -Math.PI / 2 + (i / n) * 2 * Math.PI + gap, a1 = -Math.PI / 2 + ((i + 1) / n) * 2 * Math.PI - gap, col = dgCol(i, p), pts = [];
        for (let k = 0; k <= 24; k++) { const a = a0 + ((a1 - tipA - a0) * k) / 24; pts.push([cx + ro * Math.cos(a), cy + ro * Math.sin(a)]); }
        pts.push([cx + ((ro + ri) / 2) * Math.cos(a1), cy + ((ro + ri) / 2) * Math.sin(a1)]);
        for (let k = 24; k >= 0; k--) { const a = a0 + ((a1 - tipA - a0) * k) / 24; pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); }
        pts.push([cx + ((ro + ri) / 2) * Math.cos(a0 + tipA), cy + ((ro + ri) / 2) * Math.sin(a0 + tipA)]);
        o.push(dgPoly(pts, { fill: col, stroke: Color.dark(col, 0.25), name: lab }));
        const am = (a0 + a1) / 2, lr = ro + 26, tx = cx + lr * Math.cos(am), ty = cy + lr * Math.sin(am);
        const t = dgText(lab, 0, 0, { bold: true, color: Color.dark(col, 0.45) });
        t.x = Math.cos(am) > 0.2 ? tx : Math.cos(am) < -0.2 ? tx - t.w : tx - t.w / 2; t.y = ty - t.h / 2;
        o.push(t);
      });
    } else {
      const nodes = steps.map(([lab, ic], i) => {
        const a = -Math.PI / 2 + (i / n) * 2 * Math.PI, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a), col = dgCol(i, p);
        if (p.style === 'icons') {
          const node = dgIconOrBox(lab, ic || lab, x, y - 10, 72, col);
          o.push(node);
          if (node.type === 'icon') o.push(dgCenteredText(lab, x, node.y + node.h + 12, { bold: true }));
          return node;
        }
        const w = Math.max(110, dgW(lab, 14, true) + 26), b = dgBox(lab, x - w / 2, y - 22, w, 44, col, { name: lab });
        o.push(b);
        return b;
      });
      nodes.forEach((a, i) => o.push(dgArc(a, nodes[(i + 1) % n], cx, cy, Math.max(18, (R * 2 * Math.PI) / n / 7))));
    }
    if (p.center) o.push(dgCenteredText(p.center, cx, cy, { fontSize: 20, bold: true, color: '#23395d' }));
    return o;
  },
});

// ---------- Radial / hub and spoke ----------
addDiagram('radial', {
  label: 'Radial (hub and spoke, 1–2 levels)', group: 'Cycles & processes', desc: 'A central concept with branches; indent lines for a second level.',
  fields: [
    { key: 'center', label: 'Centre', type: 'text', def: 'Risk factors' },
    { key: 'items', label: 'Branches (indent with 2 spaces for sub-items)', type: 'textarea', rows: 10, def: 'Genetic\n  Family history\n  BRCA1/2\nLifestyle\n  Smoking\n  Diet\n  Exercise\nEnvironmental\n  Radiation\n  Pollution\nMedical\n  Hormone therapy' },
  ],
  build(p) {
    const tree = [];
    dgLines(p.items).forEach((l) => { if (/^\s{2,}|^\t/.test(l) && tree.length) tree[tree.length - 1].kids.push(l.trim()); else tree.push({ name: l.trim(), kids: [] }); });
    const n = tree.length, o = [];
    if (!n) return o;
    const anyKids = tree.some((t) => t.kids.length), R1 = Math.max(170, n * 36), R2 = R1 + 150, cx = (anyKids ? R2 : R1) + 120, cy = (anyKids ? R2 : R1) + 60;
    const cw = Math.max(150, dgW(p.center || '', 18, true) + 40), hub = Make.ellipse(cx - cw / 2, cy - 50, cw, 100, { fill: '#23395d', stroke: 'none', label: p.center || '', labelColor: '#ffffff', labelBold: true, labelSize: 18 });
    o.push(hub);
    tree.forEach((t, i) => {
      const a = -Math.PI / 2 + (i / n) * 2 * Math.PI, col = dgCol(i, p), w = Math.max(110, dgW(t.name, 15, true) + 26);
      const b = dgBox(t.name, cx + R1 * Math.cos(a) - w / 2, cy + R1 * Math.sin(a) - 23, w, 46, col, { fill: col, labelColor: '#ffffff', labelSize: 15, stroke: 'none', radius: 23 });
      o.push(b, Make.connector(hub, b, { head: 'none', color: col, width: 2.5 }));
      const spread = Math.min(((2 * Math.PI) / n) * 0.8, 0.32 * t.kids.length);
      t.kids.forEach((k, j) => {
        const ak = a + (t.kids.length === 1 ? 0 : -spread / 2 + (spread * j) / (t.kids.length - 1)), kw = Math.max(80, dgW(k, 13) + 20);
        const kb = Make.rect(cx + R2 * Math.cos(ak) - kw / 2, cy + R2 * Math.sin(ak) - 16, kw, 32, { fill: Color.light(col, 0.88), stroke: col, strokeWidth: 1.2, radius: 16, label: k, labelSize: 13, labelColor: Color.dark(col, 0.5) });
        o.push(kb, Make.connector(b, kb, { head: 'none', color: Color.light(col, 0.3), width: 1.5 }));
      });
    });
    return o;
  },
});

// A chevron whose label sits on its visible part (the left notch hides the first quarter); grouped so they move together.
function dgChevron(lab, x, y, w, h, col, kind = 'chevron') {
  const sh = Make.shape(kind, x, y, w, h, { fill: col, stroke: 'none', name: lab });
  if (kind !== 'chevron') { sh.label = lab; sh.labelColor = '#ffffff'; sh.labelBold = true; sh.labelSize = 14; return sh; }
  const t = dgCenteredText(lab, x + w * 0.58, y + h / 2, { bold: true, color: '#ffffff', fontSize: 14 });
  return makeGroup([sh, t], lab);
}
const dgChevronW = (labels) => Math.max(170, ...labels.map((l) => dgW(l, 14, true) * 1.15 * 1.45 + 40));

// ---------- Process chevrons ----------
addDiagram('process', {
  label: 'Process steps (chevrons)', group: 'Cycles & processes', desc: 'A left-to-right sequence of steps; wraps onto new rows.',
  fields: [
    { key: 'steps', label: 'Steps (one per line; optional | detail)', type: 'textarea', rows: 7, def: 'Sample collection | Blood draw, PBMC isolation\nLibrary prep | 10x Genomics 3′\nSequencing | NovaSeq, 50k reads/cell\nQC & filtering | Seurat\nClustering | UMAP, Leiden\nAnnotation | Marker genes' },
    { key: 'perRow', label: 'Steps per row', type: 'number', def: 6 },
  ],
  build(p) {
    const steps = dgLines(p.steps).map(dgParts), o = [], per = Math.max(1, +p.perRow || 6), h = 70, gx = -14;
    const w = dgChevronW(steps.map(([lab]) => lab));
    steps.forEach(([lab, det], i) => {
      const r = Math.floor(i / per), c = i % per, x = 20 + c * (w + gx), y = 20 + r * (h + 90), col = dgCol(i, p);
      o.push(dgChevron(lab, x, y, w, h, col));
      o.push(dgText(String(i + 1).padStart(2, '0'), x + w * 0.3, y - 22, { fontSize: 12, bold: true, color: col }));
      if (det) { const t = dgText(det, x + 14, y + h + 8, { fontSize: 12, color: '#555555' }); o.push(t); }
    });
    return o;
  },
});

// ---------- Funnel, pyramid, concentric ----------
addDiagram('funnel', {
  label: 'Funnel', group: 'Hierarchies & layers', desc: 'Narrowing stages: screening cascades, drug discovery attrition, patient flow.',
  fields: [
    { key: 'layers', label: 'Layers, widest first (optional | note)', type: 'textarea', rows: 6, def: 'Compound library | 2,000,000 compounds\nHigh-throughput screen | 20,000 hits\nHit-to-lead | 500 leads\nLead optimisation | 20 candidates\nPreclinical | 5 candidates\nClinical trials | 1 drug' },
  ],
  build(p) {
    const L = dgLines(p.layers).map(dgParts), n = L.length, o = [], W = 520, h = 62, gap = 6, x0 = 30, y0 = 30, minW = 120;
    L.forEach(([lab, note], i) => {
      const wt = W - ((W - minW) * i) / n, wb = W - ((W - minW) * (i + 1)) / n, y = y0 + i * (h + gap), cx = x0 + W / 2, col = dgCol(i, p);
      o.push(dgPoly([[cx - wt / 2, y], [cx + wt / 2, y], [cx + wb / 2, y + h], [cx - wb / 2, y + h]], { fill: col, stroke: 'none', name: lab }));
      o.push(dgCenteredText(lab, cx, y + h / 2, { bold: true, color: '#ffffff', fontSize: wb < 200 ? 13 : 15 }));
      if (note) { o.push(dgLine([[cx + wt / 2 + 8, y + h / 2], [x0 + W + 30, y + h / 2]], { stroke: '#999999', strokeWidth: 1, dash: true })); o.push(dgText(note, x0 + W + 38, y + h / 2 - 9, { color: Color.dark(col, 0.3), bold: true })); }
    });
    return o;
  },
});
addDiagram('pyramid', {
  label: 'Pyramid / hierarchy', group: 'Hierarchies & layers', desc: 'Levels of evidence, trophic pyramids, Maslow-style hierarchies.',
  fields: [
    { key: 'layers', label: 'Layers, top first (optional | note)', type: 'textarea', rows: 7, def: 'Systematic reviews | highest quality\nRandomised controlled trials\nCohort studies\nCase–control studies\nCase series & reports\nExpert opinion | lowest quality' },
    { key: 'inverted', label: 'Inverted (point down)', type: 'check', def: false },
  ],
  build(p) {
    const L = dgLines(p.layers).map(dgParts), n = L.length, o = [], W = 560, H = Math.max(260, n * 64), x0 = 30, y0 = 30, cx = x0 + W / 2, gap = 5;
    const half = (y) => (W / 2) * ((p.inverted ? H - (y - y0) : y - y0) / H);
    L.forEach(([lab, note], i) => {
      const ya = y0 + (i * H) / n + (i ? gap / 2 : 0), yb = y0 + ((i + 1) * H) / n - (i < n - 1 ? gap / 2 : 0), col = dgCol(i, p);
      const ha = half(ya), hb = half(yb);
      const pts = ha < 0.5 ? [[cx, ya], [cx + hb, yb], [cx - hb, yb]] : hb < 0.5 ? [[cx - ha, ya], [cx + ha, ya], [cx, yb]] : [[cx - ha, ya], [cx + ha, ya], [cx + hb, yb], [cx - hb, yb]];
      o.push(dgPoly(pts, { fill: col, stroke: 'none', name: lab }));
      const ym = (ya + yb) / 2, tw = dgW(lab, 14, true), fits = 2 * Math.min(ha, hb) + (ha < 0.5 || hb < 0.5 ? Math.max(ha, hb) * 0.6 : 0) > tw + 16;
      if (fits) o.push(dgCenteredText(lab, cx, ym + (ha < 0.5 ? (yb - ya) * 0.15 : hb < 0.5 ? -(yb - ya) * 0.15 : 0), { bold: true, color: '#ffffff', fontSize: 14 }));
      else { // too narrow: label to the left with a leader line
        const xe = cx - (ha + hb) / 2 - 8;
        o.push(dgLine([[xe, ym], [x0 - 10, ym]], { stroke: col, strokeWidth: 1 }));
        const t = dgText(lab, 0, ym - 9, { bold: true, color: Color.dark(col, 0.35), fontSize: 14 }); t.x = x0 - 16 - t.w; o.push(t);
      }
      if (note) { const xe = cx + Math.max(ha, hb) + 10; o.push(dgLine([[xe, ym], [x0 + W + 20, ym]], { stroke: '#999999', strokeWidth: 1, dash: true }), dgText(note, x0 + W + 28, ym - 9, { italic: true, color: '#555555' })); }
    });
    return o;
  },
});
addDiagram('concentric', {
  label: 'Concentric layers', group: 'Hierarchies & layers', desc: 'Nested levels: socio-ecological models, cell → tissue → organ, scopes.',
  fields: [{ key: 'layers', label: 'Layers, innermost first', type: 'textarea', rows: 5, def: 'Individual\nRelationships\nCommunity\nSociety' }],
  build(p) {
    const L = dgLines(p.layers), n = L.length, o = [], step = 70, R = 60 + n * step, cx = R + 30, cy = R + 30;
    for (let i = n - 1; i >= 0; i--) {
      const r = 60 + (i + 1) * step - step / 2, col = dgCol(i, p);
      o.push(Make.ellipse(cx - r, cy - r, 2 * r, 2 * r, { fill: Color.light(col, 0.75 - i * 0.03), stroke: col, strokeWidth: 2, name: L[i] }));
      o.push(dgCenteredText(L[i], cx, cy - r + (i ? step / 2 - 6 : r), { bold: true, color: Color.dark(col, 0.45), fontSize: 15 }));
    }
    return o;
  },
});

// ---------- Timeline & Gantt ----------
addDiagram('timeline', {
  label: 'Timeline', group: 'Time', desc: 'Dated events on a line, or coloured segments; horizontal or vertical.',
  fields: [
    { key: 'events', label: 'Events: date | label (| detail)', type: 'textarea', rows: 7, def: 'Day 0 | Tumour inoculation | 1×10⁶ cells s.c.\nDay 7 | Randomisation | ~100 mm³\nDay 8 | Treatment start | q3d × 4\nDay 21 | Imaging\nDay 28 | Endpoint | tissue harvest' },
    { key: 'orient', label: 'Direction', type: 'select', def: 'h', options: [['h', 'Horizontal'], ['v', 'Vertical']] },
    { key: 'style', label: 'Style', type: 'select', def: 'line', options: [['line', 'Line with markers'], ['segments', 'Coloured segments']] },
  ],
  build(p) {
    const ev = dgLines(p.events).map(dgParts), n = ev.length, o = [];
    if (!n) return o;
    if (p.style === 'segments') {
      const sw = p.orient === 'v' ? 200 : dgChevronW(ev.map((e) => e[1] || '')), sh = 56;
      ev.forEach(([d, lab, det], i) => {
        const col = dgCol(i, p), x = p.orient === 'v' ? 40 : 30 + i * (sw - 12), y = p.orient === 'v' ? 30 + i * (sh + 50) : 60;
        o.push(dgChevron(lab || '', x, y, sw, sh, col, p.orient === 'v' ? 'arrow' : 'chevron'));
        o.push(dgText(d, p.orient === 'v' ? x + sw + 14 : x + sw * 0.3, p.orient === 'v' ? y + 8 : y - 26, { bold: true, color: col }));
        if (det) o.push(dgText(det, p.orient === 'v' ? x + sw + 14 : x + sw * 0.3, p.orient === 'v' ? y + 28 : y + sh + 10, { fontSize: 12, color: '#555555' }));
      });
      return o;
    }
    const sp = 170, L = (n - 1) * sp;
    if (p.orient === 'v') {
      const x = 260, y0 = 40;
      o.push(dgLine([[x, y0 - 20], [x, y0 + L + 20]], { stroke: '#23395d', strokeWidth: 4 }));
      ev.forEach(([d, lab, det], i) => {
        const y = y0 + i * sp * 0.6, col = dgCol(i, p), left = i % 2 === 1;
        o.push(Make.ellipse(x - 10, y - 10, 20, 20, { fill: col, stroke: '#ffffff', strokeWidth: 3 }));
        const dt = dgText(d, 0, y - 22, { bold: true, color: col }), lt = dgText(lab || '', 0, y - 2, { bold: true }), dtl = det ? dgText(det, 0, y + 18, { fontSize: 12, color: '#555555' }) : null;
        [dt, lt, dtl].filter(Boolean).forEach((t) => { t.x = left ? x - 26 - t.w : x + 26; o.push(t); });
      });
      return o;
    }
    const y = 150, x0 = 60;
    o.push(dgLine([[x0 - 30, y], [x0 + L + 30, y]], { stroke: '#23395d', strokeWidth: 4, headEnd: 'arrow' }));
    ev.forEach(([d, lab, det], i) => {
      const x = x0 + i * sp, col = dgCol(i, p), up = i % 2 === 0;
      o.push(Make.ellipse(x - 10, y - 10, 20, 20, { fill: col, stroke: '#ffffff', strokeWidth: 3 }));
      o.push(dgLine([[x, up ? y - 14 : y + 14], [x, up ? y - 48 : y + 48]], { stroke: col, strokeWidth: 1.5 }));
      const lines = [dgText(d, 0, 0, { bold: true, color: col }), dgText(lab || '', 0, 0, { bold: true }), det ? dgText(det, 0, 0, { fontSize: 12, color: '#555555' }) : null].filter(Boolean);
      let yy = up ? y - 54 - lines.reduce((s, t) => s + t.h + 2, 0) : y + 54;
      lines.forEach((t) => { t.x = x - t.w / 2; t.y = yy; yy += t.h + 2; o.push(t); });
    });
    return o;
  },
});
addDiagram('gantt', {
  label: 'Gantt chart', group: 'Time', desc: 'Project or study schedule; a task with equal start and end is a milestone.',
  fields: [
    { key: 'tasks', label: 'Tasks: name | start | end (| group)', type: 'textarea', rows: 8, def: 'Ethics approval | 0 | 3 | Setup\nRecruitment | 2 | 14 | Data\nIntervention | 4 | 16 | Data\nFollow-up visits | 6 | 20 | Data\nInterim analysis | 12 | 12 | Analysis\nFinal analysis | 20 | 23 | Analysis\nManuscript | 22 | 26 | Writing' },
    { key: 'unit', label: 'Time unit', type: 'text', def: 'Month' },
  ],
  build(p) {
    const T = dgLines(p.tasks).map(dgParts).map(([nm, s, e, g]) => ({ nm, s: +s, e: +e, g: g || '' })).filter((t) => isFinite(t.s) && isFinite(t.e));
    const o = [];
    if (!T.length) return o;
    const groups = [...new Set(T.map((t) => t.g))], lo = Math.min(...T.map((t) => t.s)), hi = Math.max(...T.map((t) => t.e));
    const ticks = niceTicks(lo, hi, 8), labW = Math.max(...T.map((t) => dgW(t.nm, 13))) + 30, x0 = 20 + labW, pw = 640, rh = 34, y0 = 60;
    const X = (v) => x0 + ((v - ticks[0]) / (ticks[ticks.length - 1] - ticks[0])) * pw;
    o.push(dgText(`${p.unit || 'Time'}`, x0, 10, { bold: true, color: '#555555', fontSize: 12 }));
    ticks.forEach((v) => { o.push(dgLine([[X(v), y0 - 8], [X(v), y0 + T.length * rh]], { stroke: '#dde3ea', strokeWidth: 1 })); o.push(dgCenteredText(String(v), X(v), y0 - 18, { fontSize: 12, color: '#555555' })); });
    T.forEach((t, i) => {
      const y = y0 + i * rh, col = dgCol(groups.indexOf(t.g), p);
      o.push(dgText(t.nm, 20, y + 8, { fontSize: 13 }));
      if (t.e > t.s) o.push(Make.rect(X(t.s), y + 6, X(t.e) - X(t.s), rh - 12, { fill: col, stroke: 'none', radius: 5, name: t.nm }));
      else o.push(Make.shape('diamond', X(t.s) - 10, y + 6, 20, rh - 12, { fill: '#23395d', stroke: 'none', name: t.nm }));
    });
    if (groups.length > 1 || groups[0]) groups.forEach((g, i) => { o.push(Make.rect(x0 + i * 130, y0 + T.length * rh + 18, 14, 14, { fill: dgCol(i, p), stroke: 'none', radius: 3 }), dgText(g || '—', x0 + i * 130 + 20, y0 + T.length * rh + 16, { fontSize: 12 })); });
    return o;
  },
});

// ---------- Trees ----------
function dgParseIndented(text) {
  const root = { kids: [], depth: -1 }, stack = [root];
  String(text || '').split('\n').forEach((raw) => {
    if (!raw.trim() || /^\s*#/.test(raw)) return;
    const depth = (raw.match(/^[ \t]*/)[0].replace(/\t/g, '  ').length) / 2;
    let s = raw.trim(), edge = '';
    const m = s.match(/^\[([^\]]+)\]\s*(.+)$/);
    if (m) { edge = m[1]; s = m[2]; }
    const node = { name: s, edge, kids: [], depth };
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    stack[stack.length - 1].kids.push(node);
    stack.push(node);
  });
  return root.kids;
}
// Tidy layout: leaves take consecutive slots; parents centre over children.
function dgTidy(nodes, depth = 0, cur = { v: 0 }) {
  nodes.forEach((n) => {
    n.level = depth;
    if (n.kids.length) { dgTidy(n.kids, depth + 1, cur); n.pos = (n.kids[0].pos + n.kids[n.kids.length - 1].pos) / 2; }
    else n.pos = cur.v++;
  });
}
addDiagram('tree', {
  label: 'Hierarchy / flowchart levels / decision tree', group: 'Hierarchies & layers', desc: 'Indent lines to nest them. Lines ending in ? become decision diamonds; start a line with [Yes] to label its arrow.',
  fields: [
    { key: 'text', label: 'Tree (2-space indent)', type: 'textarea', rows: 11, def: 'Suspected sepsis?\n  [Yes] Blood cultures + lactate\n    Lactate ≥ 4?\n      [Yes] 30 mL/kg fluids\n      [No] Reassess in 1 h\n    Start antibiotics within 1 h\n  [No] Look for other causes' },
    { key: 'dir', label: 'Direction', type: 'select', def: 'TB', options: [['TB', 'Top to bottom'], ['LR', 'Left to right']] },
  ],
  build(p) {
    const roots = dgParseIndented(p.text), o = [], all = [];
    if (!roots.length) return o;
    dgTidy(roots);
    const walk = (ns) => ns.forEach((n) => { all.push(n); walk(n.kids); });
    walk(roots);
    const TB = p.dir !== 'LR', slot = TB ? 190 : 74, lev = TB ? 120 : 260;
    all.forEach((n) => {
      const q = /\?\s*$/.test(n.name), w = Math.min(220, Math.max(q ? 150 : 120, dgW(n.name, 13, true) + (q ? 60 : 26))), h = q ? 74 : 46;
      const cx = 40 + (TB ? n.pos * slot : n.level * lev) + w / 2, cy = 40 + (TB ? n.level * lev : n.pos * slot) + 24;
      const col = q ? '#e8b33c' : n.kids.length ? '#4a7fd6' : '#3fa58b';
      n.obj = q ? Make.shape('diamond', cx - w / 2, cy - h / 2, w, h, { fill: Color.light(col, 0.8), stroke: col, strokeWidth: 1.8, label: n.name, labelSize: 13, labelBold: true, labelColor: Color.dark(col, 0.55), name: n.name })
        : dgBox(n.name, cx - w / 2, cy - h / 2, w, h, col, { labelSize: 13, name: n.name });
      o.push(n.obj);
    });
    all.forEach((n) => n.kids.forEach((k) => o.push(Make.connector({ id: n.obj.id, port: TB ? 's' : 'e' }, { id: k.obj.id, port: TB ? 'n' : 'w' }, { style: 'elbow', color: '#555555', width: 1.8, ...(k.edge ? { label: k.edge } : {}) }))));
    return o;
  },
});

// Newick parser: returns { name, len, kids }.
function parseNewick(s) {
  let i = 0;
  s = String(s || '').trim().replace(/;\s*$/, '');
  const name = () => {
    if (s[i] === "'") { const j = s.indexOf("'", i + 1); const v = s.slice(i + 1, j); i = j + 1; return v; }
    let v = ''; while (i < s.length && !',():;'.includes(s[i])) v += s[i++];
    return v.trim().replace(/_/g, ' ');
  };
  const node = () => {
    const n = { kids: [], name: '', len: null };
    if (s[i] === '(') { i++; n.kids.push(node()); while (s[i] === ',') { i++; n.kids.push(node()); } if (s[i] !== ')') throw new Error('unbalanced parentheses'); i++; }
    n.name = name();
    if (s[i] === ':') { i++; let v = ''; while (i < s.length && !',();'.includes(s[i])) v += s[i++]; n.len = parseFloat(v); }
    return n;
  };
  const t = node();
  if (i < s.length) throw new Error(`unexpected "${s[i]}" at character ${i + 1}`);
  return t;
}
addDiagram('phylo', {
  label: 'Phylogenetic tree (Newick)', group: 'Biology', desc: 'Paste a Newick tree (from MEGA, IQ-TREE, RAxML…). Rectangular or circular; branch lengths optional.',
  fields: [
    { key: 'newick', label: 'Newick', type: 'textarea', rows: 6, def: '((((Homo_sapiens:0.007,Pan_troglodytes:0.007):0.002,Gorilla_gorilla:0.009):0.007,Pongo_abelii:0.016):0.012,(Macaca_mulatta:0.008,Papio_anubis:0.008):0.020,Callithrix_jacchus:0.040);' },
    { key: 'layout', label: 'Layout', type: 'select', def: 'rect', options: [['rect', 'Rectangular'], ['circ', 'Circular']] },
    { key: 'lengths', label: 'Use branch lengths (phylogram)', type: 'check', def: true },
    { key: 'colorClades', label: 'Colour the top-level clades', type: 'check', def: true },
  ],
  build(p) {
    let t;
    try { t = parseNewick(p.newick); } catch (e) { return [dgText(`Newick error: ${e.message}`, 20, 20, { color: '#c0392b' })]; }
    const leaves = [], o = [];
    const useLen = p.lengths !== false && (function has(n) { return n.len != null || n.kids.some(has); }(t));
    const setD = (n, d) => { n.d = d; n.kids.forEach((k) => setD(k, d + (useLen ? (k.len || 0) : 1))); if (!n.kids.length) leaves.push(n); };
    setD(t, 0);
    if (!useLen) { const maxD = Math.max(...leaves.map((l) => l.d)); leaves.forEach((l) => { l.d = maxD; }); }
    leaves.forEach((l, k) => { l.y = k; });
    const setY = (n) => { if (n.kids.length) { n.kids.forEach(setY); n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2; } };
    setY(t);
    const maxD = Math.max(...leaves.map((l) => l.d)) || 1, clades = t.kids;
    const cladeOf = new Map();
    const tag = (n, c) => { cladeOf.set(n, c); n.kids.forEach((k) => tag(k, c)); };
    clades.forEach((c, i) => tag(c, i));
    const strokes = clades.map(() => []), rootStrokes = [];
    const add = (n, seg) => (cladeOf.has(n) && p.colorClades !== false ? strokes[cladeOf.get(n)] : rootStrokes).push(seg);
    if (p.layout === 'circ') {
      const R = Math.max(160, leaves.length * 14), cx = R + 160, cy = R + 120, A = (y) => -Math.PI / 2 + (y / leaves.length) * 2 * Math.PI, rr = (d) => (d / maxD) * R;
      const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const walk = (n) => n.kids.forEach((k) => {
        const a = A(k.y);
        add(k, [pt(rr(n.d), a), pt(rr(k.d), a)]);
        walk(k);
      });
      walk(t);
      const arcs = (n) => { if (n.kids.length > 1) { const a0 = A(n.kids[0].y), a1 = A(n.kids[n.kids.length - 1].y), seg = []; for (let s = 0; s <= 24; s++) seg.push(pt(rr(n.d), a0 + ((a1 - a0) * s) / 24)); add(n === t ? n.kids[0] : n, seg); } n.kids.forEach(arcs); };
      if (p.colorClades !== false) { const a0 = A(t.kids[0].y), a1 = A(t.kids[t.kids.length - 1].y), seg = []; for (let s = 0; s <= 48; s++) seg.push(pt(0.0001, a0 + ((a1 - a0) * s) / 48)); rootStrokes.push(seg); t.kids.forEach(arcs); } else arcs(t);
      leaves.forEach((l) => {
        const a = A(l.y), tx = dgText(l.name, 0, 0, { italic: true, fontSize: 12, color: p.colorClades !== false && cladeOf.has(l) ? Color.dark(dgCol(cladeOf.get(l), p), 0.2) : '#222222' });
        const [x, y] = pt(rr(l.d) + 8 + tx.w / 2, a), deg = (a * 180) / Math.PI;
        tx.x = x - tx.w / 2; tx.y = y - tx.h / 2; tx.rot = Math.cos(a) < -1e-6 ? deg + 180 : deg;
        o.push(tx);
      });
    } else {
      const W = 520, rowH = 26, x0 = 30, y0 = 30, X = (d) => x0 + (d / maxD) * W, Y = (y) => y0 + y * rowH;
      const walk = (n) => {
        if (n.kids.length) add(n === t ? n.kids[0] : n, [[X(n.d), Y(n.kids[0].y)], [X(n.d), Y(n.kids[n.kids.length - 1].y)]]);
        n.kids.forEach((k) => { add(k, [[X(n.d), Y(k.y)], [X(k.d), Y(k.y)]]); walk(k); });
        if (n.kids.length && n.name && n !== t) o.push(dgText(n.name, X(n.d) + 3, Y(n.y) - 15, { fontSize: 10, color: '#777777' }));
      };
      walk(t);
      leaves.forEach((l) => o.push(dgText(l.name, X(l.d) + 8, Y(l.y) - 9, { italic: true, fontSize: 13, color: p.colorClades !== false && cladeOf.has(l) ? Color.dark(dgCol(cladeOf.get(l), p), 0.2) : '#222222' })));
      if (useLen) { const sb = niceTicks(0, maxD / 4, 2)[1] || maxD / 4; const yb = Y(leaves.length) + 6; o.push(dgLine([[x0, yb], [X(sb), yb]], { strokeWidth: 2 }), dgText(String(+sb.toPrecision(3)), x0, yb + 6, { fontSize: 11, color: '#555555' })); }
    }
    const lineObjs = [];
    if (rootStrokes.length) lineObjs.push(dgStrokes(rootStrokes, { stroke: '#333333', name: 'Tree (root)' }));
    strokes.forEach((s, i) => { if (s.length) lineObjs.push(dgStrokes(s, { stroke: p.colorClades !== false ? dgCol(i, p) : '#333333', strokeWidth: 2, name: `Clade ${i + 1}` })); });
    return [...lineObjs, ...o];
  },
});

// ---------- Food web ----------
addDiagram('foodweb', {
  label: 'Food web', group: 'Biology', desc: 'One "eaten -> eater" per line (arrows follow energy flow). Organisms are stacked by trophic level.',
  fields: [{ key: 'links', label: 'Links (prey -> predator)', type: 'textarea', rows: 10, def: 'Phytoplankton -> Zooplankton\nPhytoplankton -> Krill\nZooplankton -> Small fish\nKrill -> Small fish\nKrill -> Whale\nSmall fish -> Squid\nSmall fish -> Seal\nSquid -> Seal\nSquid -> Penguin\nSmall fish -> Penguin\nSeal -> Orca\nPenguin -> Orca' }],
  build(p) {
    const links = [], names = [];
    dgLines(p.links).forEach((l) => { const m = l.split(/\s*(?:->|→)\s*/); for (let k = 0; k + 1 < m.length; k++) { const a = m[k].trim(), b = m[k + 1].trim(); if (a && b) { links.push([a, b]); [a, b].forEach((x) => { if (!names.includes(x)) names.push(x); }); } } });
    const o = [];
    if (!names.length) return o;
    const level = new Map(names.map((n) => [n, 0]));
    for (let it = 0; it < names.length; it++) links.forEach(([a, b]) => { if (level.get(b) < level.get(a) + 1) level.set(b, Math.min(names.length, level.get(a) + 1)); });
    const maxL = Math.max(...level.values()), rows = Array.from({ length: maxL + 1 }, (_, L) => names.filter((n) => level.get(n) === L));
    const LEVELS = ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers', 'Quaternary consumers'], rowH = 120, W = Math.max(...rows.map((r) => r.length)) * 170;
    const objOf = new Map();
    rows.forEach((r, L) => {
      const y = 40 + (maxL - L) * rowH, col = ['#5a9e4b', '#e8b33c', '#e8743b', '#d6584a', '#9b7fd1'][Math.min(L, 4)];
      o.push(dgText(L === maxL && maxL >= 3 ? 'Apex predators' : LEVELS[Math.min(L, 4)], 10, y + 12, { fontSize: 11, bold: true, color: col }));
      r.forEach((n, i) => { const cx = 190 + ((i + 0.5) * W) / r.length, node = dgIconOrBox(n, n, cx, y + 24, 56, col); objOf.set(n, node); o.push(node); if (node.type === 'icon') o.push(dgCenteredText(n, cx, node.y + node.h + 10, { fontSize: 12, bold: true })); });
    });
    links.forEach(([a, b]) => o.push(Make.connector(objOf.get(a), objOf.get(b), { color: '#777777', width: 1.6 })));
    return o;
  },
});

// ---------- Clinical trial designs ----------
const TRIAL_DESIGNS = [['parallel', 'Parallel-group RCT'], ['crossover', 'Crossover'], ['factorial', '2 × 2 factorial'], ['singlearm', 'Single-arm'], ['basket', 'Basket trial'], ['umbrella', 'Umbrella trial'], ['platform', 'Platform trial'], ['dose3', 'Dose escalation (3 + 3)']];
// Example text per design, used while the fields still hold another design's example.
const TRIAL_EXAMPLES = {
  parallel: { population: 'Adults with type 2 diabetes (n = 400)', arms: 'Drug A 10 mg daily\nPlacebo', endpoint: 'Change in HbA1c at 24 weeks' },
  crossover: { population: 'Adults with mild hypertension (n = 60)', arms: 'Drug A\nPlacebo', endpoint: 'Mean 24-h systolic BP' },
  factorial: { population: 'Adults at high cardiovascular risk (n = 2,000)', arms: 'Aspirin\nStatin', endpoint: 'Major cardiovascular events at 5 years' },
  singlearm: { population: 'Relapsed lymphoma (n = 40)', arms: 'Drug A', endpoint: 'Objective response rate' },
  basket: { population: 'Advanced solid tumours, BRAF V600E (n = 120)', arms: 'NSCLC\nColorectal\nThyroid\nCholangiocarcinoma', endpoint: 'Objective response rate per basket' },
  umbrella: { population: 'Advanced NSCLC (n = 600)', arms: 'EGFR mutation | Osimertinib\nALK fusion | Alectinib\nKRAS G12C | Sotorasib\nNo actionable marker | Chemotherapy', endpoint: 'Progression-free survival per arm' },
  platform: { population: 'Hospitalised COVID-19 (n = 4,000+)', arms: 'Standard of care\nDrug A\nDrug B\nDrug C', endpoint: '28-day mortality vs shared control' },
  dose3: { population: 'Advanced solid tumours (first in human)', arms: '10 mg\n20 mg\n40 mg\n80 mg\n160 mg', endpoint: 'Maximum tolerated dose' },
};
addDiagram('trial', {
  label: 'Clinical trial design', group: 'Clinical', desc: 'Parallel, crossover, factorial, single-arm, basket, umbrella, platform and 3 + 3 dose-escalation schematics.',
  fields: [
    { key: 'design', label: 'Design', type: 'select', def: 'parallel', options: TRIAL_DESIGNS },
    { key: 'population', label: 'Population', type: 'text', def: TRIAL_EXAMPLES.parallel.population },
    { key: 'arms', label: 'Arms / subgroups (one per line; umbrella: biomarker | drug)', type: 'textarea', rows: 5, def: TRIAL_EXAMPLES.parallel.arms },
    { key: 'endpoint', label: 'Primary endpoint', type: 'text', def: TRIAL_EXAMPLES.parallel.endpoint },
  ],
  build(p0) {
    const o = trialLayout(p0), pop = o.find((q) => q.name === 'Population'), shift = pop ? pop.w - 250 : 0;
    if (shift > 0) o.forEach((q) => { if (q !== pop && q.type !== 'connector' && q.x > 270) q.x += shift; });
    return o;
  },
});
function trialLayout(p0) {
  {
    const d = TRIAL_EXAMPLES[p0.design] ? p0.design : 'parallel', ex = TRIAL_EXAMPLES[d], p = { ...p0 };
    for (const k of ['population', 'arms', 'endpoint']) if (Object.values(TRIAL_EXAMPLES).some((e) => e[k] === p0[k])) p[k] = ex[k];
    const o = [], arms = dgLines(p.arms).map(dgParts);
    const fitW = (lab, w) => Math.max(w, dgW(lab, 13, true) * 1.15 + 30);
    const box = (lab, x, y, w, col, extra = {}) => { const b = dgBox(lab, x, y, fitW(lab, w), Math.max(46, 18 * String(lab).split('\n').length + 16), col, { labelSize: 13, ...extra }); o.push(b); return b; };
    const arrow = (a, b, extra = {}) => o.push(Make.connector({ id: a.id, port: 'e' }, { id: b.id, port: 'w' }, { color: '#555555', width: 1.8, style: 'elbow', ...extra }));
    const mid = (bs) => (Math.min(...bs.map((b) => b.y)) + Math.max(...bs.map((b) => b.y + b.h))) / 2;
    const at = (b, cy) => { b.y = cy - b.h / 2; return b; };
    const R = (x, cy) => { const c = Make.ellipse(x, cy - 27, 54, 54, { fill: '#23395d', stroke: 'none', label: 'R', labelColor: '#ffffff', labelBold: true, labelSize: 18, name: 'Randomisation' }); o.push(c); return c; };
    const note = (t) => o.push(dgText(t, 20, 0, { fontSize: 12, italic: true, color: '#555555' }));
    const pop = box(p.population || 'Population', 20, 40, 250, '#7a8a96', { name: 'Population' });
    const endBox = (x, cy) => at(box(`Primary endpoint:\n${p.endpoint || '—'}`, x, 0, 250, '#23395d', { fill: '#eef1f6' }), cy);
    if (d === 'singlearm') { const a = box(arms[0] ? arms[0][0] : 'Intervention', 330, 40, 220, DG_PAL[0]); arrow(pop, a, { style: 'straight' }); arrow(a, endBox(610, a.y + a.h / 2), { style: 'straight' }); return o; }
    if (d === 'dose3') {
      const levels = arms.length ? arms.map((x) => x[0]) : ['Dose level 1', 'Dose level 2', 'Dose level 3'], top = 40, step = 56;
      const bs = levels.map((lab, i) => { const b = box(lab, 330 + i * 150, top + (levels.length - 1 - i) * step, 130, dgCol(i, p)); o.push(dgText('3–6 pts', b.x + 36, b.y + b.h + 4, { fontSize: 11, color: '#555555' })); return b; });
      bs.forEach((b, i) => { if (i) arrow(bs[i - 1], b); });
      at(pop, bs[0].y + bs[0].h / 2); arrow(pop, bs[0], { style: 'straight' });
      o.push(dgText('3 + 3 rules: 0/3 dose-limiting toxicities (DLT) → escalate · 1/3 → add 3 more (≤ 1/6 → escalate) · ≥ 2 DLT → stop; MTD = the level below', 20, top + levels.length * step + 30, { fontSize: 12, color: '#555555' }));
      return o;
    }
    if (d === 'basket') {
      const types = arms.length ? arms.map((x) => x[0]) : ['Tumour type 1', 'Tumour type 2'];
      const bs = types.map((t, i) => box(`${t}\nbiomarker +`, 340, 40 + i * 70, 200, dgCol(i, p))), cy = mid(bs);
      const drug = at(box(arms.length ? 'Targeted drug' : 'Drug', 610, 0, 170, '#d6584a'), cy);
      at(pop, cy); bs.forEach((b) => { arrow(pop, b); arrow(b, drug); }); arrow(drug, endBox(840, cy), { style: 'straight' });
      note('Basket: one drug for one biomarker, tested across several tumour types'); o[o.length - 1].y = 6;
      return o;
    }
    if (d === 'umbrella') {
      const ar = arms.length && arms[0][1] ? arms : TRIAL_EXAMPLES.umbrella.arms.split('\n').map(dgParts);
      const bs = ar.map(([bm], i) => box(bm, 540, 40 + i * 70, 170, dgCol(i, p))), cy = mid(bs), scr = at(box('Biomarker\nscreening', 340, 0, 140, '#e8b33c'), cy);
      at(pop, cy); arrow(pop, scr, { style: 'straight' });
      ar.forEach(([, drug], i) => { const dr = box(drug || 'Matched drug', 770, bs[i].y, 170, dgCol(i, p), { fill: '#ffffff' }); arrow(scr, bs[i]); arrow(bs[i], dr, { style: 'straight' }); });
      note('Umbrella: one disease, several biomarker-matched treatments'); o[o.length - 1].y = 6;
      return o;
    }
    if (d === 'crossover') {
      const [A, B] = [arms[0] ? arms[0][0] : 'Treatment A', arms[1] ? arms[1][0] : 'Treatment B'], rows = [];
      [[A, B], [B, A]].forEach(([x1, x2], i) => {
        const y = 50 + i * 120, a = box(`Period 1\n${x1}`, 430, y, 160, dgCol(i, p)), w = box('Washout', 640, y + 3, 110, '#7a8a96', { fill: '#ffffff', dash: true }), b = box(`Period 2\n${x2}`, 800, y, 160, dgCol(1 - i, p));
        arrow(a, w, { style: 'straight' }); arrow(w, b, { style: 'straight' }); rows.push(a, b);
        o.push(dgText(`Sequence ${i ? 'BA' : 'AB'}`, 430, y - 20, { fontSize: 12, bold: true, color: '#555555' }));
      });
      const cy = mid(rows), r = R(330, cy);
      at(pop, cy); arrow(pop, r, { style: 'straight' }); arrow(r, rows[0]); arrow(r, rows[2]);
      const e = endBox(1010, cy); arrow(rows[1], e); arrow(rows[3], e);
      return o;
    }
    let names, platform = d === 'platform';
    if (d === 'factorial') { const [A, B] = [arms[0] ? arms[0][0] : 'Drug A', arms[1] ? arms[1][0] : 'Drug B']; names = [`${A} + ${B}`, `${A} + placebo`, `Placebo + ${B}`, 'Placebo + placebo']; }
    else names = arms.length ? arms.map((x) => x[0]) : ['Treatment', 'Control'];
    const bs = names.map((lab, i) => {
      const control = /placebo \+ placebo|^placebo$|control|standard|^soc$/i.test(lab);
      return box(lab, 440, 40 + i * 76, 230, control ? '#7a8a96' : dgCol(i, p), platform && i >= 2 ? { dash: true } : {});
    });
    const cy = mid(bs), r = R(340, cy), e = endBox(740, cy);
    at(pop, cy); arrow(pop, r, { style: 'straight', ...(d === 'parallel' && names.length === 2 ? { label: '1:1' } : {}) });
    bs.forEach((b, i) => { arrow(r, b); arrow(b, e); if (platform && i >= 2) o.push(dgText('added later', b.x + 4, b.y + b.h + 2, { fontSize: 11, italic: true, color: '#888888' })); });
    if (platform) { note('Platform: shared control arm; arms join or stop at interim analyses (master protocol)'); o[o.length - 1].y = 6; }
    if (d === 'factorial') { note('2 × 2 factorial: each participant is randomised for both factors'); o[o.length - 1].y = 6; }
    return o;
  }
}

// ---------- Risk matrix ----------
addDiagram('risk', {
  label: 'Risk matrix', group: 'Clinical', desc: 'Likelihood × impact grid, coloured from low to high, with numbered items.',
  fields: [
    { key: 'size', label: 'Size', type: 'select', def: '5', options: [['3', '3 × 3'], ['4', '4 × 4'], ['5', '5 × 5']] },
    { key: 'items', label: 'Items: name | likelihood | impact', type: 'textarea', rows: 6, def: 'Recruitment slower than planned | 4 | 3\nSample degradation in transit | 2 | 4\nKey staff leave | 2 | 3\nAssay batch effect | 3 | 4\nData loss | 1 | 5' },
    { key: 'xLabel', label: 'Across', type: 'text', def: 'Likelihood' }, { key: 'yLabel', label: 'Up', type: 'text', def: 'Impact' },
  ],
  build(p) {
    const n = +p.size || 5, cs = 78, x0 = 70, y0 = 30, o = [];
    // Bands as in the usual 5 × 5 matrix: score 1–4 low, 5–9 medium, 10–16 high, 20–25 extreme (scaled for 3 × 3, 4 × 4).
    const heat = (s) => (s <= 0.16 ? '#5cb85c' : s <= 0.36 ? '#ffd54f' : s <= 0.64 ? '#ffa726' : '#ef5350');
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) o.push(Make.rect(x0 + i * cs, y0 + (n - 1 - j) * cs, cs - 3, cs - 3, { fill: heat(((i + 1) * (j + 1)) / (n * n)), stroke: 'none', radius: 4, opacity: 0.85 }));
    for (let i = 0; i < n; i++) { o.push(dgCenteredText(String(i + 1), x0 + i * cs + cs / 2, y0 + n * cs + 12, { fontSize: 12, color: '#555555' }), dgCenteredText(String(i + 1), x0 - 14, y0 + (n - 1 - i) * cs + cs / 2, { fontSize: 12, color: '#555555' })); }
    o.push(dgCenteredText(p.xLabel || 'Likelihood', x0 + (n * cs) / 2, y0 + n * cs + 36, { bold: true }));
    const yl = dgCenteredText(p.yLabel || 'Impact', x0 - 44, y0 + (n * cs) / 2, { bold: true }); yl.rot = -90; o.push(yl);
    const items = dgLines(p.items).map(dgParts), used = {};
    items.forEach(([nm, L, I], k) => {
      const li = Math.min(n, Math.max(1, Math.round(+L || 1))), ii = Math.min(n, Math.max(1, Math.round(+I || 1))), key = `${li},${ii}`, off = (used[key] = (used[key] || 0) + 1) - 1;
      o.push(Make.badge(k + 1, x0 + (li - 1) * cs + 22 + (off % 2) * 30, y0 + (n - ii) * cs + 22 + Math.floor(off / 2) * 30, { w: 28, h: 28, x: 0, y: 0, labelSize: 14 }));
      const b = o[o.length - 1]; b.x = x0 + (li - 1) * cs + 8 + (off % 2) * 30; b.y = y0 + (n - ii) * cs + 8 + Math.floor(off / 2) * 30;
      o.push(dgText(`${k + 1}. ${nm}`, x0 + n * cs + 30, y0 + k * 24, { fontSize: 13 }));
    });
    return o;
  },
});

// ---------- Punnett square ----------
function gametes(gt) {
  const s = String(gt).replace(/\s+/g, '');
  if (!s || s.length % 2 || /[^A-Za-z]/.test(s)) return [];
  const pairs = [];
  for (let i = 0; i < s.length; i += 2) { if (s[i].toLowerCase() !== s[i + 1].toLowerCase()) return []; pairs.push([s[i], s[i + 1]]); }
  return pairs.reduce((acc, [a, b]) => acc.flatMap((g) => [...new Set([a, b])].map((x) => g + x)), ['']);
}
const sortAlleles = (x, y) => { const lx = x.toLowerCase(), ly = y.toLowerCase(); return lx !== ly ? lx.localeCompare(ly) : x === x.toUpperCase() ? -1 : 1; };
addDiagram('punnett', {
  label: 'Punnett square', group: 'Biology', desc: 'Mono- or dihybrid crosses; capitals are dominant. Phenotype and genotype ratios are counted for you.',
  fields: [{ key: 'p1', label: 'Parent 1', type: 'text', def: 'AaBb' }, { key: 'p2', label: 'Parent 2', type: 'text', def: 'AaBb' }],
  build(p) {
    const g1 = gametes(p.p1), g2 = gametes(p.p2), o = [];
    if (!g1.length || !g2.length || g1[0].length !== g2[0].length) return [dgText('Enter genotypes with the same genes, e.g. Aa × Aa or AaBb × AaBb', 20, 20, { color: '#c0392b' })];
    const cs = g1.length > 2 || g2.length > 2 ? 74 : 100, x0 = 90, y0 = 80, phenos = new Map(), genos = new Map();
    o.push(dgCenteredText(`${p.p1} × ${p.p2}`, x0 + (g2.length * cs) / 2, 24, { fontSize: 20, bold: true }));
    g2.forEach((g, j) => o.push(dgCenteredText(g, x0 + j * cs + cs / 2, y0 - 18, { bold: true, color: '#4a7fd6', fontSize: 16 })));
    g1.forEach((g, i) => o.push(dgCenteredText(g, x0 - 30, y0 + i * cs + cs / 2, { bold: true, color: '#e8743b', fontSize: 16 })));
    const keys = [];
    g1.forEach((a, i) => g2.forEach((b, j) => {
      const gt = a.split('').map((x, k) => [x, b[k]].sort(sortAlleles).join('')).join('');
      const ph = gt.match(/../g).map((pair) => (pair[0] === pair[0].toUpperCase() ? pair[0].toUpperCase() + '_' : pair)).join('');
      if (!keys.includes(ph)) keys.push(ph);
      phenos.set(ph, (phenos.get(ph) || 0) + 1); genos.set(gt, (genos.get(gt) || 0) + 1);
      o.push(Make.rect(x0 + j * cs, y0 + i * cs, cs - 3, cs - 3, { fill: Color.light(DG_PAL[keys.indexOf(ph) % DG_PAL.length], 0.7), stroke: '#ffffff', radius: 6, label: gt, labelSize: cs > 80 ? 20 : 15, labelBold: true, labelColor: '#23395d' }));
    }));
    const total = g1.length * g2.length, ty = y0 + g1.length * cs + 20;
    o.push(dgText(`Phenotypes: ${[...phenos.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' : ')}  (of ${total})`, x0 - 60, ty, { fontSize: 13 }));
    o.push(dgText(`Genotypes: ${[...genos.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`, x0 - 60, ty + 22, { fontSize: 12, color: '#555555' }));
    return o;
  },
});

// ---------- Layouts ----------
addDiagram('panels', {
  label: 'Figure panels / comparison grid', group: 'Layouts', desc: 'Lettered placeholder panels with optional column and row headings.',
  fields: [
    { key: 'rows', label: 'Rows', type: 'number', def: 2 }, { key: 'cols', label: 'Columns', type: 'number', def: 3 },
    { key: 'colHeads', label: 'Column headings (comma-separated)', type: 'text', def: 'Control, Drug A, Drug B' },
    { key: 'rowHeads', label: 'Row headings (comma-separated)', type: 'text', def: '24 h, 72 h' },
    { key: 'letters', label: 'Panel letters', type: 'check', def: true },
  ],
  build(p) {
    const R = Math.max(1, Math.min(10, +p.rows || 1)), C = Math.max(1, Math.min(10, +p.cols || 1)), pw = 220, ph = 170, gap = 16, o = [];
    const ch = String(p.colHeads || '').split(',').map((s) => s.trim()).filter(Boolean), rh = String(p.rowHeads || '').split(',').map((s) => s.trim()).filter(Boolean);
    const x0 = rh.length ? 70 : 20, y0 = ch.length ? 50 : 20;
    ch.slice(0, C).forEach((h, j) => o.push(dgCenteredText(h, x0 + j * (pw + gap) + pw / 2, y0 - 22, { bold: true, fontSize: 16 })));
    rh.slice(0, R).forEach((h, i) => { const t = dgCenteredText(h, x0 - 30, y0 + i * (ph + gap) + ph / 2, { bold: true, fontSize: 16 }); t.rot = -90; o.push(t); });
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      const x = x0 + j * (pw + gap), y = y0 + i * (ph + gap);
      o.push(Make.rect(x, y, pw, ph, { fill: '#f7f8fa', stroke: '#c9d4e3', strokeWidth: 1.5, radius: 6, dash: true, name: `Panel ${String.fromCharCode(65 + i * C + j)}` }));
      if (p.letters !== false) o.push(dgText(String.fromCharCode(65 + i * C + j), x + 8, y + 6, { fontSize: 20, bold: true }));
    }
    return o;
  },
});
addDiagram('venn', {
  label: 'Venn layout (2–4 sets)', group: 'Layouts', desc: 'Overlapping translucent circles you can label by hand. For counts from real lists use Graph › Venn.',
  fields: [{ key: 'sets', label: 'Set names (one per line, 2–4)', type: 'textarea', rows: 4, def: 'Genomics\nProteomics\nMetabolomics' }],
  build(p) {
    const S = dgLines(p.sets).slice(0, 4), n = S.length, o = [];
    if (n < 2) return o;
    const r = 130, cx = 300, cy = 260;
    const pos = n === 2 ? [[-0.55, 0], [0.55, 0]] : n === 3 ? [[-0.5, -0.35], [0.5, -0.35], [0, 0.5]] : null;
    if (pos) pos.forEach(([dx, dy], i) => {
      const x = cx + dx * r, y = cy + dy * r, col = dgCol(i, p);
      o.push(Make.ellipse(x - r, y - r, 2 * r, 2 * r, { fill: col, stroke: Color.dark(col, 0.2), strokeWidth: 2, opacity: 0.45, name: S[i] }));
      const ly = n === 2 ? y - r - 18 : dy > 0 ? y + r + 16 : y - r * 0.55;
      o.push(dgCenteredText(S[i], n === 2 ? x : x + dx * r * 0.7, ly, { bold: true, fontSize: 16, color: Color.dark(col, 0.4) }));
    });
    else S.forEach((s, i) => { // four ellipses
      const col = dgCol(i, p), w = 330, h = 190, ang = [45, 45, -45, -45][i], dx = [-70, -10, 10, 70][i], dy = [20, -30, -30, 20][i];
      o.push(Make.ellipse(cx + dx - w / 2, cy + dy - h / 2, w, h, { fill: col, stroke: Color.dark(col, 0.2), strokeWidth: 2, opacity: 0.4, rot: ang, name: s }));
      o.push(dgCenteredText(s, cx + [-200, -110, 110, 200][i], cy + [-110, -190, -190, -110][i], { bold: true, fontSize: 15, color: Color.dark(col, 0.4) }));
    });
    return o;
  },
});
addDiagram('callout', {
  label: 'Callout layout', group: 'Layouts', desc: 'A central subject with circular zoom-in callouts around it, e.g. an organ with its cell types.',
  fields: [
    { key: 'subject', label: 'Central subject (icon name)', type: 'text', def: 'Lungs' },
    { key: 'callouts', label: 'Callouts (one per line; optional | icon)', type: 'textarea', rows: 5, def: 'Alveolar macrophage | macrophage\nType II pneumocyte | epithelial cell\nCapillary | endothelial cell\nNeutrophil' },
  ],
  build(p) {
    const items = dgLines(p.callouts).map(dgParts), n = items.length, o = [], cx = 380, cy = 280;
    const subj = dgIconOrBox(p.subject || 'Subject', p.subject, cx, cy, 220, '#4a7fd6');
    o.push(subj);
    const R = 260, cr = 62;
    items.forEach(([lab, ic], i) => {
      const a = Math.PI + (n === 1 ? 0 : (i / (n - 1)) * Math.PI) * (n > 3 ? 1.6 : 1) - (n > 3 ? 0.3 * Math.PI : 0), col = dgCol(i, p);
      const x = cx + R * Math.cos(a) * 1.25, y = cy + R * Math.sin(a) * 0.9;
      const circ = Make.ellipse(x - cr, y - cr, 2 * cr, 2 * cr, { fill: '#ffffff', stroke: col, strokeWidth: 3, name: lab });
      o.push(circ);
      const iid = findIcon(ic || lab);
      if (iid) { const ico = Make.icon(iid, 0, 0, cr * 1.3); ico.x = x - ico.w / 2; ico.y = y - ico.h / 2; o.push(ico); }
      o.push(dgCenteredText(lab, x, y + cr + 14, { bold: true, fontSize: 13, color: Color.dark(col, 0.35) }));
      const tx = cx + Math.cos(a) * subj.w * 0.25, ty = cy + Math.sin(a) * subj.h * 0.25;
      o.push(Make.connector(circ, { x: tx, y: ty }, { head: 'none', color: col, width: 2, dashStyle: 'dashed' }), Make.ellipse(tx - 5, ty - 5, 10, 10, { fill: col, stroke: '#ffffff', strokeWidth: 1.5 }));
    });
    return o;
  },
});
addDiagram('quadrant', {
  label: '2 × 2 quadrant', group: 'Layouts', desc: 'Two axes and four labelled quadrants (e.g. hot vs cold tumours, effort vs impact).',
  fields: [
    { key: 'x', label: 'X axis: low | high | title', type: 'text', def: 'Low | High | T-cell infiltration' },
    { key: 'y', label: 'Y axis: low | high | title', type: 'text', def: 'Low | High | PD-L1 expression' },
    { key: 'q', label: 'Quadrants (TL, TR, BL, BR)', type: 'textarea', rows: 4, def: 'Immune-excluded\nHot (inflamed)\nCold (desert)\nAdaptive resistance' },
  ],
  build(p) {
    const [xl, xh, xt] = dgParts(p.x || ''), [yl, yh, yt] = dgParts(p.y || ''), Q = dgLines(p.q), s = 220, x0 = 90, y0 = 40, o = [];
    [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], k) => { const col = dgCol(k, p); o.push(Make.rect(x0 + i * s, y0 + j * s, s - 4, s - 4, { fill: Color.light(col, 0.85), stroke: col, strokeWidth: 1.5, radius: 8, label: Q[k] || '', labelBold: true, labelSize: 15, labelColor: Color.dark(col, 0.45) })); });
    o.push(dgLine([[x0 - 10, y0 + 2 * s + 10], [x0 + 2 * s + 10, y0 + 2 * s + 10]], { strokeWidth: 2, headEnd: 'arrow' }), dgLine([[x0 - 10, y0 + 2 * s + 10], [x0 - 10, y0 - 10]], { strokeWidth: 2, headEnd: 'arrow' }));
    o.push(dgText(xl || '', x0, y0 + 2 * s + 16, { fontSize: 12, color: '#555555' }), dgText(xh || '', x0 + 2 * s - dgW(xh || '', 12), y0 + 2 * s + 16, { fontSize: 12, color: '#555555' }), dgCenteredText(xt || '', x0 + s, y0 + 2 * s + 44, { bold: true }));
    const t1 = dgCenteredText(yt || '', x0 - 50, y0 + s, { bold: true }); t1.rot = -90;
    o.push(t1, dgText(yh || '', x0 - 36 - dgW(yh || '', 12) / 2, y0, { fontSize: 12, color: '#555555' }), dgText(yl || '', x0 - 36 - dgW(yl || '', 12) / 2, y0 + 2 * s - 20, { fontSize: 12, color: '#555555' }));
    return o;
  },
});

// ---------- ELISA formats ----------
addDiagram('elisa', {
  label: 'ELISA format', group: 'Lab methods', desc: 'Direct, indirect, sandwich or competitive ELISA at the well surface, with the signal step.',
  fields: [
    { key: 'format', label: 'Format', type: 'select', def: 'sandwich', options: [['direct', 'Direct'], ['indirect', 'Indirect'], ['sandwich', 'Sandwich'], ['competitive', 'Competitive']] },
    { key: 'signal', label: 'Readout', type: 'select', def: 'colour', options: [['colour', 'Colorimetric (HRP + TMB)'], ['fluor', 'Fluorescent'], ['chemi', 'Chemiluminescent']] },
    { key: 'antigen', label: 'Antigen name', type: 'text', def: 'IL-6' },
  ],
  build(p) {
    const o = [], f = p.format || 'sandwich', ag = p.antigen || 'Antigen', x0 = 40, base = 330, W = 420;
    o.push(Make.rect(x0, base, W, 26, { fill: '#cfd8e3', stroke: '#8a9bb0', strokeWidth: 1.5, radius: 3, name: 'Well surface' }), dgText('Well surface (polystyrene)', x0 + 8, base + 32, { fontSize: 11, color: '#6b7a8c' }));
    const ab = (x, yTop, h, col, down, name) => { const id = findIcon('antibody') || 'antibody', a = Make.icon(id, 0, 0, h, { color: col, name }); a.x = x - a.w / 2; a.y = yTop; if (down) a.rot = 180; o.push(a); return a; };
    const antigen = (x, y, col = '#e8743b', name = ag) => { const id = findIcon('protein') || 'protein', a = Make.icon(id, 0, 0, 34, { color: col, name }); a.x = x - a.w / 2; a.y = y; o.push(a); return a; };
    const enzyme = (x, y) => { const id = p.signal === 'fluor' ? null : findIcon('enzyme') || 'enzyme'; let e; if (id) { e = Make.icon(id, 0, 0, 26, { color: '#d6584a', name: p.signal === 'chemi' ? 'HRP' : 'HRP' }); e.x = x - e.w / 2; e.y = y; } else e = Make.shape('star', x - 13, y, 26, 26, { fill: '#4cd964', stroke: '#2e8b57', name: 'Fluorophore' }); o.push(e); return e; };
    const cols = [x0 + 90, x0 + 210, x0 + 330], legend = [];
    if (f === 'direct') {
      cols.forEach((x) => { antigen(x, base - 34); const d = ab(x, base - 34 - 60, 74, '#4a7fd6', true, 'Labelled primary antibody'); enzyme(x - 2, d.y - 20); });
      legend.push(['Antigen coated on well', '#e8743b'], ['Enzyme-labelled primary antibody', '#4a7fd6']);
    }
    if (f === 'indirect') {
      cols.forEach((x) => { antigen(x, base - 34); const pr = ab(x, base - 34 - 56, 70, '#3fa58b', true, 'Primary antibody'); const s2 = ab(x + 8, pr.y - 50, 62, '#4a7fd6', true, 'Labelled secondary antibody'); enzyme(x + 6, s2.y - 20); });
      legend.push(['Antigen coated on well', '#e8743b'], ['Primary antibody', '#3fa58b'], ['Enzyme-labelled secondary antibody', '#4a7fd6']);
    }
    if (f === 'sandwich') {
      cols.forEach((x) => { const c = ab(x, base - 72, 72, '#7a8a96', false, 'Capture antibody'), a = antigen(x, c.y - 14); const d = ab(x, a.y - 52, 70, '#4a7fd6', true, 'Detection antibody'); enzyme(x - 2, d.y - 20); });
      legend.push(['Capture antibody', '#7a8a96'], [`${ag} (sample)`, '#e8743b'], ['Enzyme-labelled detection antibody', '#4a7fd6']);
    }
    if (f === 'competitive') {
      cols.forEach((x, i) => { const c = ab(x, base - 72, 72, '#7a8a96', false, 'Capture antibody'), lab = i === 1, a = antigen(x, c.y - 14, lab ? '#e8743b' : '#9b7fd1', lab ? `${ag} (sample)` : `Labelled ${ag}`); if (!lab) enzyme(x, a.y - 22); });
      legend.push(['Capture antibody', '#7a8a96'], [`${ag} from sample (unlabelled)`, '#e8743b'], [`Enzyme-labelled ${ag} (competitor)`, '#9b7fd1']);
      o.push(dgText('More antigen in the sample → less labelled antigen bound → weaker signal', x0, 30, { fontSize: 12, italic: true, color: '#555555' }));
    }
    const sx = x0 + W + 40, sy = 120;
    if (p.signal === 'fluor') o.push(dgText('Excite → emit light', sx, sy, { bold: true, color: '#2e8b57' }));
    else {
      const sub = Make.ellipse(sx, sy, 22, 22, { fill: '#e8eaf0', stroke: '#9aa5b5', strokeWidth: 1.2, name: 'Substrate' }), prod = Make.ellipse(sx + 110, sy, 22, 22, { fill: p.signal === 'chemi' ? '#fff59d' : '#3b5bdb', stroke: p.signal === 'chemi' ? '#fbc02d' : '#2c3e9b', strokeWidth: 1.2, name: 'Product', ...(p.signal === 'chemi' ? { glow: '#ffeb3b', glowSize: 8 } : {}) });
      o.push(sub, prod, Make.connector(sub, prod, { label: 'HRP', color: '#555555' }), dgText(p.signal === 'chemi' ? 'Substrate → light' : 'TMB → blue product\n(stop: yellow, read 450 nm)', sx, sy + 34, { fontSize: 12, color: '#555555' }));
    }
    legend.forEach(([t, c], i) => o.push(Make.rect(sx, 220 + i * 26, 14, 14, { fill: c, stroke: 'none', radius: 3 }), dgText(t, sx + 22, 218 + i * 26, { fontSize: 12 })));
    o.push(dgText(`${{ direct: 'Direct', indirect: 'Indirect', sandwich: 'Sandwich', competitive: 'Competitive' }[f]} ELISA`, x0, 6, { fontSize: 22, bold: true }));
    return o;
  },
});

// ---------- Dialog ----------
function diagramPreviewSvg(list) {
  const shapes = list.filter((o) => o.type !== 'connector');
  if (!shapes.length) return '';
  const x0 = Math.min(...shapes.map((o) => o.x)) - 20, y0 = Math.min(...shapes.map((o) => o.y)) - 20;
  shapes.forEach((o) => { o.x -= x0; o.y -= y0; });
  list.filter((o) => o.type === 'connector').forEach((cn) => [cn.from, cn.to].forEach((e) => { if (e && e.x != null && !e.id) { e.x -= x0; e.y -= y0; } }));
  const W = Math.max(...shapes.map((o) => o.x + o.w)) + 20, H = Math.max(...shapes.map((o) => o.y + o.h)) + 20;
  return pageSvgString({ width: W, height: H, background: '#ffffff', objects: list });
}
function openDiagramDialog(startKey) {
  let key = DIAGRAMS[startKey] ? startKey : 'cycle';
  const params = {};
  const listEl = el('div', { class: 'dg-list', style: 'display:flex;flex-direction:column;gap:2px;max-height:520px;overflow:auto' });
  const form = el('div', {}), prev = el('div', { class: 'preview', style: 'min-height:300px;display:flex;align-items:center;justify-content:center' }), desc = el('div', { class: 'note', style: 'margin:4px 0 8px' });
  const build = () => { try { return DIAGRAMS[key].build({ ...params[key] }); } catch (e) { return [Make.text(`Can't draw this: ${e.message}`, 0, 0, { color: '#c0392b', fontSize: 14 })]; } };
  const draw = () => { prev.innerHTML = diagramPreviewSvg(build()).replace('<svg ', '<svg style="max-width:100%;max-height:440px" '); };
  const showForm = () => {
    const D = DIAGRAMS[key];
    if (!params[key]) params[key] = Object.fromEntries(D.fields.map((f) => [f.key, f.def]));
    form.innerHTML = '';
    desc.textContent = D.desc || '';
    D.fields.forEach((f) => {
      let input;
      if (f.type === 'textarea') input = el('textarea', { rows: f.rows || 5, spellcheck: false, style: 'font-family:Menlo,monospace;font-size:12px;width:100%;box-sizing:border-box' });
      else if (f.type === 'select') input = el('select', {}, ...f.options.map(([v, l]) => el('option', { value: v, textContent: l })));
      else if (f.type === 'check') input = el('input', { type: 'checkbox' });
      else input = el('input', { type: f.type === 'number' ? 'number' : 'text', style: f.type === 'number' ? 'width:80px' : 'width:100%' });
      if (f.type === 'check') input.checked = params[key][f.key] !== false; else input.value = params[key][f.key] ?? '';
      input.addEventListener(f.type === 'select' || f.type === 'check' ? 'change' : 'input', () => { params[key][f.key] = f.type === 'check' ? input.checked : input.value; draw(); });
      form.append(f.type === 'textarea' ? el('div', { style: 'margin:6px 0' }, el('div', { class: 'note', textContent: f.label }), input) : field(f.label, input));
    });
    [...listEl.children].forEach((b) => b.classList.toggle('primary', b.dataset.key === key));
    draw();
  };
  DIAGRAM_GROUPS.forEach((g) => {
    listEl.append(el('div', { class: 'note', style: 'margin-top:8px;font-weight:700', textContent: g }));
    Object.entries(DIAGRAMS).filter(([, d]) => d.group === g).forEach(([k, d]) => { const b = btn(d.label, () => { key = k; showForm(); }); b.dataset.key = k; b.style.textAlign = 'left'; listEl.append(b); });
  });
  openModal('Diagram builder', el('div', { style: 'width:1100px;max-width:94vw;display:grid;grid-template-columns:230px 330px 1fr;gap:14px' },
    listEl, el('div', {}, desc, form),
    el('div', {}, prev, el('div', { class: 'note', style: 'margin-top:6px' }, 'Everything is inserted as ordinary shapes, text, icons and arrows, so you can edit any part afterwards.'),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert diagram', () => {
        const list = build(), c = viewCenter(), shapes = list.filter((o) => o.type !== 'connector');
        if (!shapes.length) return;
        const x0 = Math.min(...shapes.map((o) => o.x)), y0 = Math.min(...shapes.map((o) => o.y)), W = Math.max(...shapes.map((o) => o.x + o.w)) - x0, H = Math.max(...shapes.map((o) => o.y + o.h)) - y0;
        shapes.forEach((o) => { o.x += c.x - W / 2 - x0; o.y += c.y - H / 2 - y0; });
        list.filter((o) => o.type === 'connector').forEach((cn) => [cn.from, cn.to].forEach((e) => { if (e && e.x != null && !e.id) { e.x += c.x - W / 2 - x0; e.y += c.y - H / 2 - y0; } }));
        closeModal(); addObjects(list);
      }, 'primary')))));
  showForm();
}
ARRANGE_COMMANDS.diagramBuilder = () => openDiagramDialog();
Object.keys(DIAGRAMS).forEach((k) => { ARRANGE_COMMANDS['diagram_' + k] = () => openDiagramDialog(k); });
