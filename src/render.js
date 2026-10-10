// Object model → SVG. Every object has {id, type, x, y, w, h, rot, opacity}; content is drawn in a
// local 0..w × 0..h box, and the outer transform places and rotates it.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT_STACK = {
  sans: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  times: '"Times New Roman", Times, serif',
  serif: 'Georgia, "Times New Roman", serif',
  avenir: '"Avenir Next", Avenir, Helvetica, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: '"Trebuchet MS", Helvetica, sans-serif',
  gill: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif',
  futura: 'Futura, "Century Gothic", sans-serif',
  palatino: 'Palatino, "Palatino Linotype", serif',
  mono: 'Menlo, Consolas, monospace',
  courier: '"Courier New", Courier, monospace',
};
const FONT_NAMES = [['sans', 'Helvetica (default)'], ['arial', 'Arial'], ['helvetica', 'Helvetica Neue'], ['times', 'Times New Roman'], ['serif', 'Georgia'], ['palatino', 'Palatino'], ['avenir', 'Avenir Next'], ['futura', 'Futura'], ['gill', 'Gill Sans'], ['verdana', 'Verdana'], ['trebuchet', 'Trebuchet MS'], ['mono', 'Menlo (mono)'], ['courier', 'Courier New']];

// Lists: prefix each line with a bullet or number (blank lines are skipped in numbering).
// Chemical-formula mode: H2O → H₂O, CO32- → CO₃²⁻, NH4+ → NH₄⁺, Ca2+ → Ca²⁺ (written with _{} / ^{} markup).
function formulaMarkup(t) {
  const subs = (body) => body.replace(/([A-Z][a-z]?|[)\]])(\d+)/g, '$1_{$2}');
  return t.split(/(\s+)/).map((word) => {
    const m = word.match(/^(.*?[A-Za-z)\]])(\d*)([+\-−])([,;.:)]?)$/);
    if (!m) return subs(word);
    let [, body, digits, sign, tail] = m;
    sign = sign === '-' ? '−' : sign;
    const mono = (body.match(/[A-Z]/g) || []).length === 1 && !/[\d()[\]]/.test(body);
    let sub = '', charge;
    if (mono) charge = digits + sign;
    else if (digits.length >= 2) { sub = digits.slice(0, -1); charge = digits.slice(-1) + sign; }
    else if (digits.length === 1) { sub = digits; charge = sign; }
    else charge = sign;
    return subs(body) + (sub ? `_{${sub}}` : '') + `^{${charge}}` + tail;
  }).join('');
}
function displayText(o) {
  let text = String(o.text ?? '');
  if (o.formula) text = text.split('\n').map(formulaMarkup).join('\n');
  if (!o.list || o.list === 'none') return text;
  let n = 0;
  return text.split('\n').map((l) => (l.trim() ? (o.list === 'bullet' ? '•  ' : `${++n}.  `) + l : l)).join('\n');
}
// Size of a text object (handles lists and curved text).
function textMetrics(o) {
  const t = displayText(o);
  const m = measureText(t, o.fontSize, o.family, o.bold, o.italic);
  if (o.curve) { const g = curveGeometry(m.w, o.fontSize, o.curve); return { w: g.w, h: g.h }; }
  return m;
}
// Arc that a curved label of length L sits on. curve = arc angle in degrees (+ arches up, − sags down).
function curveGeometry(L, fs, curve) {
  const th = Math.max(5, Math.min(359, Math.abs(curve))) * Math.PI / 180, R = L / th, up = curve > 0;
  const a0 = -Math.PI / 2 - th / 2; // start angle for the "up" arc (top of circle)
  const pts = [];
  for (let i = 0; i <= 60; i++) { const a = up ? a0 + (th * i) / 60 : Math.PI / 2 + th / 2 - (th * i) / 60; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const pad = fs * 1.1, mx = Math.min(...xs) - pad, my = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + 2 * pad, h = Math.max(...ys) - Math.min(...ys) + 2 * pad;
  const P = pts.map(([x, y]) => [x - mx, y - my]);
  const large = th > Math.PI ? 1 : 0;
  const d = `M${P[0][0]} ${P[0][1]} A${R} ${R} 0 ${large} ${up ? 1 : 0} ${P[60][0]} ${P[60][1]}`;
  return { w, h, d };
}
function dashAttr(o, sw) {
  const style = o.dashStyle || (o.dash ? 'dashed' : 'solid');
  if (style === 'dashed') return ` stroke-dasharray="${sw * 3} ${sw * 2.4}"`;
  if (style === 'dotted') return ` stroke-dasharray="0.01 ${sw * 2.2}" stroke-linecap="round"`;
  if (style === 'dashdot') return ` stroke-dasharray="${sw * 4} ${sw * 2} 0.01 ${sw * 2}" stroke-linecap="round"`;
  return '';
}

// ---------- Rich-ish text ----------
// ^{superscript}, _{subscript}, and styled spans for individual words: {#d64545|red words}, {b|bold},
// {i|italic}, combinable as {b#d64545|bold red}. Spans can contain ^{…} / _{…}.
const STYLE_SPAN = /\{([bius]{0,4})(#[0-9a-fA-F]{3,8})?([bius]{0,4})\|((?:[^{}]|[\^_]\{[^{}]*\})*)\}/g;
function parseMarkup(line) {
  const out = [];
  const subSup = (text, style) => {
    const re = /([\^_])\{([^}]*)\}/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), s: 0, ...style });
      out.push({ t: m[2], s: m[1] === '^' ? 1 : -1, ...style });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: text.slice(last), s: 0, ...style });
  };
  let last = 0, m;
  STYLE_SPAN.lastIndex = 0;
  while ((m = STYLE_SPAN.exec(line))) {
    const flags = m[1] + m[3];
    if (!flags && !m[2]) continue;
    if (m.index > last) subSup(line.slice(last, m.index), {});
    subSup(m[4], { color: m[2], bold: flags.includes('b') || undefined, italic: flags.includes('i') || undefined, underline: flags.includes('u') || undefined, strike: flags.includes('s') || undefined });
    last = STYLE_SPAN.lastIndex;
  }
  if (last < line.length) subSup(line.slice(last), {});
  return out;
}
// A styled span may cover a line break: close and reopen it on each line so lines parse independently.
function splitSpanLines(text) {
  text = String(text);
  if (!text.includes('|') || !text.includes('\n')) return text;
  return text.replace(/\{([bi]{0,2}(?:#[0-9a-fA-F]{3,8})?[bi]{0,2})\|((?:[^{}]|[\^_]\{[^{}]*\})*)\}/g, (m, st, inner) => (st && inner.includes('\n') ? inner.split('\n').map((l) => `{${st}|${l}}`).join('\n') : m));
}
// Plain text without any markup (for search, accessibility and AI prompts).
function stripMarkup(t) {
  return splitSpanLines(t).split('\n').map((l) => parseMarkup(l).map((g) => g.t).join('')).join('\n');
}

let _measureCtx;
function measureText(text, fontSize, family, bold, italic) {
  _measureCtx = _measureCtx || document.createElement('canvas').getContext('2d');
  const lines = splitSpanLines(text).split('\n');
  let w = 0;
  for (const line of lines) {
    let lw = 0;
    for (const seg of parseMarkup(line)) {
      const fs = seg.s ? fontSize * 0.7 : fontSize;
      _measureCtx.font = `${italic || seg.italic ? 'italic ' : ''}${bold || seg.bold ? 'bold ' : ''}${fs}px ${FONT_STACK[family] || FONT_STACK.sans}`;
      lw += _measureCtx.measureText(seg.t).width;
    }
    w = Math.max(w, lw);
  }
  return { w: Math.ceil(w) + 4, h: Math.ceil(lines.length * fontSize * 1.25) + 2 };
}

function textSvg(text, { fontSize = 16, color = '#222', family = 'sans', bold, italic, underline, strike, align = 'left', w, h, vcenter }) {
  const lines = splitSpanLines(text).split('\n');
  const lh = fontSize * 1.25;
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const x = align === 'center' ? w / 2 : align === 'right' ? w - 2 : 2;
  const top = vcenter ? (h - lines.length * lh) / 2 : 0;
  let s = `<text font-family='${FONT_STACK[family] || FONT_STACK.sans}' font-size="${fontSize}" fill="${color}"${bold ? ' font-weight="700"' : ''}${italic ? ' font-style="italic"' : ''}${underline || strike ? ` text-decoration="${[underline && 'underline', strike && 'line-through'].filter(Boolean).join(' ')}"` : ''} text-anchor="${anchor}">`;
  lines.forEach((line, i) => {
    const y = top + i * lh + fontSize;
    s += `<tspan x="${x}" y="${y}">`;
    for (const seg of parseMarkup(line)) {
      const st = `${seg.color ? ` fill="${seg.color}"` : ''}${seg.bold ? ' font-weight="700"' : ''}${seg.italic ? ' font-style="italic"' : ''}${seg.underline || seg.strike ? ` text-decoration="${[seg.underline && 'underline', seg.strike && 'line-through'].filter(Boolean).join(' ')}"` : ''}`;
      if (!seg.s) s += `<tspan${st}>${esc(seg.t)}</tspan>`;
      else {
        const shift = seg.s > 0 ? -fontSize * 0.38 : fontSize * 0.22;
        s += `<tspan dy="${shift}" font-size="${fontSize * 0.7}"${st}>${esc(seg.t)}</tspan><tspan dy="${-shift}">​</tspan>`;
      }
    }
    s += '</tspan>';
  });
  return s + '</text>';
}

// ---------- Geometry helpers ----------
const rad = (d) => (d * Math.PI) / 180;
function center(o) { return { x: o.x + o.w / 2, y: o.y + o.h / 2 }; }
function rotPt(p, c, deg) {
  const a = rad(deg), cos = Math.cos(a), sin = Math.sin(a);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}
// World-space AABB of an object, accounting for rotation.
function bounds(o, objects) {
  if (o.type === 'connector') {
    if (o.style === 'zoom' && typeof zoomWedgeHull === 'function') return polyBounds(zoomWedgeHull(o, objects || []));
    const [a, b] = connectorEnds(o, objects || []);
    const cp = connectorControl(o, a, b);
    const xs = [a.x, b.x, cp ? cp.x : a.x], ys = [a.y, b.y, cp ? cp.y : a.y];
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  if (!o.rot) return { x: o.x, y: o.y, w: o.w, h: o.h };
  const c = center(o);
  const pts = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => rotPt({ x, y }, c, o.rot));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

function polyBounds(pts) {
  if (!pts.length) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------- Connectors ----------
// Point where a ray from the object's centre toward `toward` leaves its (rotated) box.
function clipToBox(o, toward, gap = 4) {
  const c = center(o);
  const d = rotPt(toward, c, -(o.rot || 0));
  let dx = d.x - c.x, dy = d.y - c.y;
  if (!dx && !dy) return c;
  const hw = o.w / 2 + gap, hh = o.h / 2 + gap;
  let t;
  if (o.type === 'ellipse' || o.type === 'icon') {
    t = 1 / Math.sqrt((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh));
  } else {
    t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  }
  return rotPt({ x: c.x + dx * t, y: c.y + dy * t }, c, o.rot || 0);
}

function connectorEnds(o, objects) {
  const find = (end) => (end && end.id ? objects.find((x) => x.id === end.id) : null);
  const A = find(o.from), B = find(o.to);
  const ca = A ? center(A) : o.from, cb = B ? center(B) : o.to;
  const cp = connectorControl(o, ca, cb);
  const a = A ? (o.from.port ? portPoint(A, o.from.port) : clipToBox(A, cp || cb)) : { x: o.from.x, y: o.from.y };
  const b = B ? (o.to.port ? portPoint(B, o.to.port) : clipToBox(B, cp || ca)) : { x: o.to.x, y: o.to.y };
  return [a, b];
}

function connectorControl(o, a, b) {
  if (o.style !== 'curved' || !o.curve) return null;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  return { x: mx - (dy / len) * o.curve, y: my + (dx / len) * o.curve };
}

// Line ends. 'bar' is the inhibition T-bar (⊣); HEAD_INSET is how far a line stops short of the tip (× head size)
// so it doesn't poke through closed heads.
const HEAD_KINDS = [['arrow', '→ Arrow (activation)'], ['stealth', '➤ Concave arrow'], ['open', '⟶ Open arrow'], ['harpoon', '⇀ Half arrow'], ['bar', '⊣ Inhibition (T-bar)'], ['dot', '● Dot (binding)'], ['circle', '○ Open circle'], ['diamond', '◆ Diamond'], ['odiamond', '◇ Open diamond'], ['square', '■ Square'], ['cross', '✕ Cross'], ['none', '— None']];
const HEAD_INSET = { arrow: 1.2, stealth: 1.05, harpoon: 1.1, diamond: 1.6, odiamond: 1.6, square: 0.9, circle: 1.1 };
const headScale = (sw, size) => (6 + sw * 2.2) * (size || 1);
// The middle segment of a two-corner elbow, which the bend handle drags: { x, y, axis: 'x' | 'y' } or null.
function elbowBendHandle(o, a, b) {
  const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
  const endH = o.to.port ? 'ew'.includes(o.to.port) : startH;
  if (startH !== endH) return null;
  const t = o.bend ?? 0.5;
  return startH ? { x: a.x + (b.x - a.x) * t, y: (a.y + b.y) / 2, axis: 'x' } : { x: (a.x + b.x) / 2, y: a.y + (b.y - a.y) * t, axis: 'y' };
}
// Polyline through pts with each inner corner rounded to radius r (clamped to half the shorter neighbouring segment).
function roundedPolyline(pts, r) {
  const P = pts.filter((p, i) => !i || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.01);
  let d = `M${P[0].x} ${P[0].y}`;
  for (let i = 1; i < P.length - 1; i++) {
    const A = P[i - 1], C = P[i], B = P[i + 1], la = Math.hypot(A.x - C.x, A.y - C.y), lb = Math.hypot(B.x - C.x, B.y - C.y), rr = Math.min(r, la / 2, lb / 2);
    const p1 = { x: C.x + ((A.x - C.x) / la) * rr, y: C.y + ((A.y - C.y) / la) * rr }, p2 = { x: C.x + ((B.x - C.x) / lb) * rr, y: C.y + ((B.y - C.y) / lb) * rr };
    d += ` L${p1.x} ${p1.y} Q${C.x} ${C.y} ${p2.x} ${p2.y}`;
  }
  const L = P[P.length - 1];
  return d + ` L${L.x} ${L.y}`;
}
function arrowHead(kind, tip, from, color, sw, size = 1) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const s = headScale(sw, size);
  const p = (dx, dy) => {
    const c = Math.cos(ang), n = Math.sin(ang);
    return `${tip.x + dx * c - dy * n},${tip.y + dx * n + dy * c}`;
  };
  switch (kind) {
    case 'arrow': return `<polygon points="${p(0, 0)} ${p(-s * 1.4, -s * 0.7)} ${p(-s * 1.4, s * 0.7)}" fill="${color}"/>`;
    case 'open': return `<polyline points="${p(-s * 1.3, -s * 0.75)} ${p(0, 0)} ${p(-s * 1.3, s * 0.75)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    case 'bar': return `<line x1="${p(0, -s).split(',')[0]}" y1="${p(0, -s).split(',')[1]}" x2="${p(0, s).split(',')[0]}" y2="${p(0, s).split(',')[1]}" stroke="${color}" stroke-width="${sw + 1.5}" stroke-linecap="round"/>`;
    case 'dot': return `<circle cx="${tip.x}" cy="${tip.y}" r="${s * 0.55}" fill="${color}"/>`;
    case 'stealth': return `<polygon points="${p(0, 0)} ${p(-s * 1.5, -s * 0.75)} ${p(-s * 1.05, 0)} ${p(-s * 1.5, s * 0.75)}" fill="${color}" stroke="${color}" stroke-width="${sw * 0.3}" stroke-linejoin="round"/>`;
    case 'harpoon': return `<polygon points="${p(0, 0)} ${p(-s * 1.4, -s * 0.78)} ${p(-s * 1.1, 0)}" fill="${color}" stroke="${color}" stroke-width="${sw * 0.3}" stroke-linejoin="round"/>`;
    case 'circle': { const [cx, cy] = p(-s * 0.55, 0).split(','); return `<circle cx="${cx}" cy="${cy}" r="${s * 0.55}" fill="#ffffff" stroke="${color}" stroke-width="${sw}"/>`; }
    case 'diamond': case 'odiamond': return `<polygon points="${p(0, 0)} ${p(-s * 0.8, -s * 0.55)} ${p(-s * 1.6, 0)} ${p(-s * 0.8, s * 0.55)}" fill="${kind === 'diamond' ? color : '#ffffff'}" stroke="${color}" stroke-width="${kind === 'diamond' ? sw * 0.3 : sw}" stroke-linejoin="round"/>`;
    case 'square': return `<polygon points="${p(0, -s * 0.45)} ${p(0, s * 0.45)} ${p(-s * 0.9, s * 0.45)} ${p(-s * 0.9, -s * 0.45)}" fill="${color}"/>`;
    case 'cross': { const c = (dx, dy) => p(-s * 0.5 + dx, dy).split(','); const [x1, y1] = c(-s * 0.42, -s * 0.42), [x2, y2] = c(s * 0.42, s * 0.42), [x3, y3] = c(-s * 0.42, s * 0.42), [x4, y4] = c(s * 0.42, -s * 0.42); return `<path d="M${x1} ${y1} L${x2} ${y2} M${x3} ${y3} L${x4} ${y4}" stroke="${color}" stroke-width="${sw + 0.6}" stroke-linecap="round"/>`; }
    default: return '';
  }
}

function connectorSvg(o, objects, forExport) {
  if (o.style === 'zoom' && typeof zoomWedgeSvg === 'function') return zoomWedgeSvg(o, objects);
  const [a, b] = connectorEnds(o, objects);
  const color = o.color || '#333', sw = o.width || 2, hsz = o.headSize || 1;
  const cp = connectorControl(o, a, b);
  // Shorten the line so it doesn't poke through closed heads.
  const inset = (pt, toward, kind) => {
    if (!HEAD_INSET[kind]) return pt;
    const d = Math.hypot(toward.x - pt.x, toward.y - pt.y) || 1, k = Math.min(headScale(sw, hsz) * HEAD_INSET[kind], d / 2) / d;
    return { x: pt.x + (toward.x - pt.x) * k, y: pt.y + (toward.y - pt.y) * k };
  };
  let d, tanA, tanB, mid;
  if (o.style === 'elbow') {
    // Leave / enter perpendicular to a pinned side; otherwise go along the dominant axis first.
    const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const endH = o.to.port ? 'ew'.includes(o.to.port) : startH;
    let corner1, corner2;
    const bt = o.bend ?? 0.5; // where along the route the elbow turns (0 = at start, 1 = at end)
    if (startH && endH) { const mx = a.x + (b.x - a.x) * bt; corner1 = { x: mx, y: a.y }; corner2 = { x: mx, y: b.y }; }
    else if (!startH && !endH) { const my = a.y + (b.y - a.y) * bt; corner1 = { x: a.x, y: my }; corner2 = { x: b.x, y: my }; }
    else if (startH) { corner1 = corner2 = { x: b.x, y: a.y }; }
    else { corner1 = corner2 = { x: a.x, y: b.y }; }
    const a2 = inset(a, corner1, o.tail), b2 = inset(b, corner2, o.head);
    d = o.radius > 0 ? roundedPolyline([a2, corner1, corner2, b2], o.radius) : `M${a2.x} ${a2.y} L${corner1.x} ${corner1.y} L${corner2.x} ${corner2.y} L${b2.x} ${b2.y}`;
    tanA = corner1; tanB = corner2; mid = { x: (corner1.x + corner2.x) / 2, y: (corner1.y + corner2.y) / 2 };
  } else if (cp) {
    const a2 = inset(a, cp, o.tail), b2 = inset(b, cp, o.head);
    d = `M${a2.x} ${a2.y} Q${cp.x} ${cp.y} ${b2.x} ${b2.y}`;
    tanA = cp; tanB = cp; mid = { x: 0.25 * a.x + 0.5 * cp.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cp.y + 0.25 * b.y };
  } else {
    const a2 = inset(a, b, o.tail), b2 = inset(b, a, o.head);
    d = `M${a2.x} ${a2.y} L${b2.x} ${b2.y}`;
    tanA = b; tanB = a; mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  let s = '';
  if (!forExport) s += `<path d="${d}" stroke="transparent" stroke-width="${sw + 12}" fill="none"/>`;
  s += `<path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"${dashAttr(o, sw)}/>`;
  s += arrowHead(o.head, b, tanB, color, sw, hsz) + arrowHead(o.tail, a, tanA, color, sw, hsz);
  if (o.label) {
    const fs = o.labelSize || 13;
    const m = measureText(o.label, fs, 'sans', false, o.labelItalic);
    s += `<rect x="${mid.x - m.w / 2 - 3}" y="${mid.y - m.h / 2}" width="${m.w + 6}" height="${m.h}" rx="3" fill="#fff" opacity=".9"/>`;
    s += `<g transform="translate(${mid.x - m.w / 2} ${mid.y - m.h / 2})">${textSvg(o.label, { fontSize: fs, color, italic: o.labelItalic, w: m.w, h: m.h, align: 'center' })}</g>`;
  }
  return s;
}

// ---------- Brushes: repeated biological units along a path ----------
function samplePath(pts, spacing, closed) {
  const P = closed ? [...pts, pts[0]] : pts;
  const out = [];
  let carry = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!len) continue;
    const tx = (b.x - a.x) / len, ty = (b.y - a.y) / len;
    for (let d = carry; d <= len; d += spacing) out.push({ x: a.x + tx * d, y: a.y + ty * d, tx, ty });
    carry = (spacing - ((len - carry) % spacing)) % spacing;
  }
  // Smooth tangents so units don't kink at vertices.
  for (let i = 0; i < out.length; i++) {
    const p = out[Math.max(0, i - 1)], n = out[Math.min(out.length - 1, i + 1)];
    let tx = p.tx + out[i].tx + n.tx, ty = p.ty + out[i].ty + n.ty;
    const l = Math.hypot(tx, ty) || 1;
    out[i].tx = tx / l; out[i].ty = ty / l;
  }
  return out;
}

// Flatten Bézier nodes into a polyline (brushes whose path was edited as nodes).
function flattenNodes(ns, closed) {
  const out = [];
  const segs = ns.length - (closed ? 0 : 1);
  for (let i = 0; i < segs; i++) {
    const a = ns[i], b = ns[(i + 1) % ns.length];
    const curved = a.ox != null || b.ix != null;
    const steps = curved ? 16 : 1;
    for (let k = 0; k < steps; k++) {
      const t = k / steps, u = 1 - t;
      const p1 = { x: a.ox ?? a.x, y: a.oy ?? a.y }, p2 = { x: b.ix ?? b.x, y: b.iy ?? b.y };
      out.push(curved ? { x: u ** 3 * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * b.y } : { x: a.x, y: a.y });
    }
  }
  if (!closed && ns.length) out.push({ x: ns[ns.length - 1].x, y: ns[ns.length - 1].y });
  return out;
}
function brushSvg(o) {
  const pts = o.nodes ? flattenNodes(scaledNodes(o), o.closed) : o.pts.map(([u, v]) => ({ x: u * o.w, y: v * o.h }));
  const c = o.color || '#e8b45a', u = o.size || 8;
  let s = '';
  if (o.kind === 'membrane') {
    const S = samplePath(pts, u * 1.05, o.closed);
    const off = u * 1.7;
    let tails = '', heads = '';
    for (const p of S) {
      const nx = -p.ty, ny = p.tx;
      for (const side of [1, -1]) {
        const hx = p.x + nx * off * side, hy = p.y + ny * off * side;
        const tx = p.x + nx * u * 0.25 * side, ty = p.y + ny * u * 0.25 * side;
        const sp = u * 0.18;
        tails += `M${hx - p.tx * sp} ${hy - p.ty * sp} L${tx - p.tx * sp} ${ty - p.ty * sp} M${hx + p.tx * sp} ${hy + p.ty * sp} L${tx + p.tx * sp} ${ty + p.ty * sp} `;
        heads += `<circle cx="${hx}" cy="${hy}" r="${u * 0.5}"/>`;
      }
    }
    s += `<path d="${tails}" stroke="${Color.dark(c, 0.15)}" stroke-width="${Math.max(0.6, u * 0.12)}" fill="none"/>`;
    s += `<g fill="${c}" stroke="${Color.dark(c)}" stroke-width="${Math.max(0.5, u * 0.08)}">${heads}</g>`;
  } else if (o.kind === 'dna') {
    const S = samplePath(pts, u * 0.5, o.closed);
    const amp = u * 1.4, period = u * 10;
    const strand = (phase) => S.map((p, i) => { const k = Math.sin((i * u * 0.5 * 2 * Math.PI) / period + phase) * amp; return `${i ? 'L' : 'M'}${p.x - p.ty * k} ${p.y + p.tx * k}`; }).join(' ');
    S.forEach((p, i) => {
      if (i % 3) return;
      const k = Math.sin((i * u * 0.5 * 2 * Math.PI) / period) * amp;
      s += `<line x1="${p.x - p.ty * k}" y1="${p.y + p.tx * k}" x2="${p.x + p.ty * k}" y2="${p.y - p.tx * k}" stroke="${(i / 3) % 2 ? '#e05a5a' : '#f2c14e'}" stroke-width="${u * 0.3}"/>`;
    });
    s += `<path d="${strand(0)}" stroke="${c}" stroke-width="${u * 0.45}" fill="none" stroke-linecap="round"/>`;
    s += `<path d="${strand(Math.PI)}" stroke="${Color.dark(c)}" stroke-width="${u * 0.45}" fill="none" stroke-linecap="round"/>`;
  } else if (o.kind === 'actin') {
    const S = samplePath(pts, u * 0.9, o.closed);
    S.forEach((p, i) => {
      const k = (i % 2 ? 1 : -1) * u * 0.4;
      s += `<circle cx="${p.x - p.ty * k}" cy="${p.y + p.tx * k}" r="${u * 0.6}" fill="${i % 2 ? c : Color.light(c, 0.25)}" stroke="${Color.dark(c)}" stroke-width="${u * 0.08}"/>`;
    });
  } else if (o.kind === 'epithelium') {
    const S = samplePath(pts, u * 3, o.closed);
    S.forEach((p) => {
      const nx = -p.ty, ny = p.tx, hw = u * 1.5, hh = u * 3;
      const corner = (a, b) => `${p.x + p.tx * a + nx * b},${p.y + p.ty * a + ny * b}`;
      s += `<polygon points="${corner(-hw, -hh)} ${corner(hw, -hh)} ${corner(hw, hh)} ${corner(-hw, hh)}" fill="${Color.light(c, 0.45)}" stroke="${Color.dark(c)}" stroke-width="${u * 0.12}"/>`;
      s += `<ellipse cx="${p.x - nx * u * 0.8}" cy="${p.y - ny * u * 0.8}" rx="${u * 0.7}" ry="${u * 0.9}" fill="${Color.dark(c, 0.15)}" transform="rotate(${(Math.atan2(p.ty, p.tx) * 180) / Math.PI} ${p.x - nx * u * 0.8} ${p.y - ny * u * 0.8})"/>`;
    });
  } else if (o.kind === 'vessel') {
    // Blood vessel: lumen between two walls lined with endothelial nuclei, with red blood cells inside.
    const S = samplePath(pts, u * 0.6, o.closed), half = u * 2.6;
    if (S.length > 1) {
      const side = (k) => S.map((p) => `${p.x - p.ty * half * k},${p.y + p.tx * half * k}`);
      s += `<polygon points="${[...side(1), ...side(-1).reverse()].join(' ')}" fill="${Color.light(c, 0.78)}"/>`;
      for (const k of [1, -1]) s += `<polyline points="${side(k).join(' ')}" fill="none" stroke="${c}" stroke-width="${u * 0.7}" stroke-linejoin="round"/>`;
      S.forEach((p, i) => {
        if (i % 7 === 3) for (const k of [1, -1]) { const x = p.x - p.ty * half * k * 0.86, y = p.y + p.tx * half * k * 0.86; s += `<ellipse cx="${x}" cy="${y}" rx="${u * 0.9}" ry="${u * 0.3}" fill="${Color.dark(c, 0.3)}" transform="rotate(${(Math.atan2(p.ty, p.tx) * 180) / Math.PI} ${x} ${y})"/>`; }
        if (i % 9 === 0) { const off = ((i * 37) % 7 - 3) / 4 * half * 0.5, x = p.x - p.ty * off, y = p.y + p.tx * off; s += `<ellipse cx="${x}" cy="${y}" rx="${u * 0.85}" ry="${u * 0.55}" fill="#d63b3b" stroke="#a52a2a" stroke-width="${u * 0.08}" transform="rotate(${(i * 23) % 180} ${x} ${y})"/>`; }
      });
    }
  } else if (o.kind === 'microtubule') {
    const S = samplePath(pts, u * 0.95, o.closed);
    S.forEach((p, i) => {
      for (const k of [-1, 0, 1]) {
        const x = p.x - p.ty * k * u * 0.9, y = p.y + p.tx * k * u * 0.9;
        s += `<circle cx="${x}" cy="${y}" r="${u * 0.46}" fill="${(i + k + 3) % 2 ? c : Color.light(c, 0.45)}" stroke="${Color.dark(c, 0.25)}" stroke-width="${u * 0.06}"/>`;
      }
    });
  } else if (o.kind === 'cells') {
    const S = samplePath(pts, u * 3.2, o.closed);
    S.forEach((p, i) => {
      const r = u * (1.45 + ((i * 13) % 5) / 25);
      s += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${Color.light(c, 0.55)}" stroke="${Color.dark(c, 0.2)}" stroke-width="${u * 0.12}"/><circle cx="${p.x + u * 0.25}" cy="${p.y - u * 0.15}" r="${r * 0.42}" fill="${Color.dark(c, 0.1)}"/>`;
    });
  } else if (o.kind === 'ubiquitin') { // polyubiquitin / bead chain: touching outlined beads with a sheen
    const r = u * 0.8, S = samplePath(pts, r * 1.75, o.closed);
    S.forEach((p, i) => {
      const k = (i % 2 ? 1 : -1) * r * 0.25, x = p.x - p.ty * k, y = p.y + p.tx * k;
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${Color.dark(c, 0.34)}" stroke-width="${Math.max(0.6, r * 0.18)}"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff" opacity=".35"/>`;
    });
  } else if (o.kind === 'vesicles') {
    const S = samplePath(pts, u * 2.6, o.closed);
    S.forEach((p, i) => { s += `<circle cx="${p.x}" cy="${p.y}" r="${u * (0.9 + ((i * 37) % 5) / 10)}" fill="${Color.light(c, 0.4)}" stroke="${Color.dark(c)}" stroke-width="${u * 0.2}"/>`; });
  }
  return s;
}

// ---------- Protocol diagrams (Smart-Template-like): steps reflow with width ----------
const PROTOCOL_CARD = { w: 140, h: 150, gap: 44, rowGap: 46, title: 34 };

function protocolLayout(o) {
  const k = o.scale || 1, cw = PROTOCOL_CARD.w * k, gap = PROTOCOL_CARD.gap * k;
  const perRow = Math.max(1, Math.floor((o.w + gap) / (cw + gap)));
  const rows = Math.ceil((o.steps.length || 1) / perRow);
  const titleH = o.title ? PROTOCOL_CARD.title * k : 0;
  const h = titleH + rows * PROTOCOL_CARD.h * k + (rows - 1) * PROTOCOL_CARD.rowGap * k;
  return { perRow, rows, h, titleH, k };
}

function wrapWords(text, maxChars) {
  const words = String(text).split(/\s+/), lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function protocolSvg(o) {
  const { perRow, titleH, k } = protocolLayout(o);
  const cw = PROTOCOL_CARD.w * k, ch = PROTOCOL_CARD.h * k, gap = PROTOCOL_CARD.gap * k, rg = PROTOCOL_CARD.rowGap * k;
  const c = o.color || '#4a7fd6';
  const rowW = Math.min(o.steps.length, perRow) * cw + (Math.min(o.steps.length, perRow) - 1) * gap;
  const x0 = (o.w - rowW) / 2;
  const pos = (i) => ({ x: x0 + (i % perRow) * (cw + gap), y: titleH + Math.floor(i / perRow) * (ch + rg) });
  let s = '';
  if (o.title) s += `<g transform="translate(0 0)">${textSvg(o.title, { fontSize: 20 * k, bold: true, color: '#222', w: o.w, h: titleH, align: 'center' })}</g>`;
  o.steps.forEach((st, i) => {
    const p = pos(i);
    if (i > 0) {
      const q = pos(i - 1);
      if (q.y === p.y) {
        s += `<line x1="${q.x + cw + 6 * k}" y1="${p.y + ch / 2}" x2="${p.x - 12 * k}" y2="${p.y + ch / 2}" stroke="${Color.dark(c)}" stroke-width="${2.5 * k}"/>`;
        s += `<polygon points="${p.x - 4 * k},${p.y + ch / 2} ${p.x - 14 * k},${p.y + ch / 2 - 6 * k} ${p.x - 14 * k},${p.y + ch / 2 + 6 * k}" fill="${Color.dark(c)}"/>`;
      } else {
        const sx = q.x + cw / 2, sy = q.y + ch + 4 * k, ex = p.x + cw / 2, ey = p.y - 4 * k, my = sy + (ey - sy) / 2;
        s += `<path d="M${sx} ${sy} V${my} H${ex} V${ey - 8 * k}" stroke="${Color.dark(c)}" stroke-width="${2.5 * k}" fill="none" stroke-dasharray="${6 * k} ${4 * k}"/>`;
        s += `<polygon points="${ex},${ey} ${ex - 6 * k},${ey - 10 * k} ${ex + 6 * k},${ey - 10 * k}" fill="${Color.dark(c)}"/>`;
      }
    }
    s += `<rect x="${p.x}" y="${p.y}" width="${cw}" height="${ch}" rx="${12 * k}" fill="${Color.light(c, 0.88)}" stroke="${Color.light(c, 0.3)}" stroke-width="${1.5 * k}"/>`;
    s += `<circle cx="${p.x + 18 * k}" cy="${p.y + 18 * k}" r="${12 * k}" fill="${c}"/>`;
    s += `<text x="${p.x + 18 * k}" y="${p.y + 22.5 * k}" text-anchor="middle" font-family="Helvetica, Arial" font-weight="700" font-size="${13 * k}" fill="#fff">${i + 1}</text>`;
    if (st.icon && ICON_MAP[st.icon]) {
      const vb = iconViewBox(st.icon), box = 62 * k, sc = Math.min(box / vb.w, box / vb.h);
      s += `<g transform="translate(${p.x + cw / 2 - (vb.w * sc) / 2} ${p.y + 22 * k + (box - vb.h * sc) / 2}) scale(${sc})">${iconSvgInner(st.icon)}</g>`;
    } else if (st.icon && typeof getAsset === 'function' && getAsset(st.icon)) {
      const a = getAsset(st.icon), box = 62 * k;
      s += `<svg x="${p.x + cw / 2 - box / 2}" y="${p.y + 22 * k}" width="${box}" height="${box}" viewBox="${a.vb}" preserveAspectRatio="xMidYMid meet">${a.svg}</svg>`;
    }
    const lines = wrapWords(st.title, 18).slice(0, 3);
    lines.forEach((ln, j) => {
      s += `<text x="${p.x + cw / 2}" y="${p.y + 104 * k + j * 15 * k}" text-anchor="middle" font-family="Helvetica, Arial" font-size="${12.5 * k}" fill="#222"${j === 0 ? ' font-weight="600"' : ''}>${esc(ln)}</text>`;
    });
  });
  return s;
}

// ---------- Shapes ----------
const SHAPES = [['triangle', 'Triangle'], ['diamond', 'Diamond'], ['hexagon', 'Hexagon'], ['star', 'Star'], ['arrow', 'Block arrow'], ['chevron', 'Chevron'], ['cylinder', 'Cylinder'], ['cloud', 'Cloud'], ['plus', 'Plus'], ['pill', 'Capsule'], ['parallelogram', 'Parallelogram'], ['brace', 'Curly bracket'], ['sqbracket', 'Square bracket'], ['arcline', 'Arc line'], ['cycle', 'Circular arrow']];
const OPEN_SHAPES = new Set(['brace', 'sqbracket', 'arcline', 'cycle']);
function shapePath(kind, w, h, o) {
  switch (kind) {
    case 'triangle': return `M${w / 2} 0 L${w} ${h} L0 ${h} Z`;
    case 'diamond': return `M${w / 2} 0 L${w} ${h / 2} L${w / 2} ${h} L0 ${h / 2} Z`;
    case 'hexagon': return `M${w * 0.25} 0 L${w * 0.75} 0 L${w} ${h / 2} L${w * 0.75} ${h} L${w * 0.25} ${h} L0 ${h / 2} Z`;
    case 'star': {
      let d = '';
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.4 : 1, a = -Math.PI / 2 + (i * Math.PI) / 5; d += `${i ? 'L' : 'M'}${w / 2 + (Math.cos(a) * r * w) / 2} ${h / 2 + (Math.sin(a) * r * h) / 2} `; }
      return d + 'Z';
    }
    case 'arrow': return `M0 ${h * 0.3} L${w * 0.65} ${h * 0.3} L${w * 0.65} 0 L${w} ${h / 2} L${w * 0.65} ${h} L${w * 0.65} ${h * 0.7} L0 ${h * 0.7} Z`;
    case 'chevron': return `M0 0 L${w * 0.75} 0 L${w} ${h / 2} L${w * 0.75} ${h} L0 ${h} L${w * 0.25} ${h / 2} Z`;
    case 'cylinder': { const ry = Math.min(h * 0.15, w * 0.3); return `M0 ${ry} A${w / 2} ${ry} 0 0 1 ${w} ${ry} L${w} ${h - ry} A${w / 2} ${ry} 0 0 1 0 ${h - ry} Z M0 ${ry} A${w / 2} ${ry} 0 0 0 ${w} ${ry}`; }
    case 'cloud': return `M${w * 0.25} ${h * 0.85} C${w * 0.02} ${h * 0.85} ${w * 0.02} ${h * 0.45} ${w * 0.22} ${h * 0.45} C${w * 0.2} ${h * 0.1} ${w * 0.55} ${h * 0.05} ${w * 0.6} ${h * 0.3} C${w * 0.75} ${h * 0.15} ${w * 0.98} ${h * 0.3} ${w * 0.85} ${h * 0.52} C${w * 1.02} ${h * 0.6} ${w * 0.95} ${h * 0.88} ${w * 0.75} ${h * 0.85} Z`;
    case 'plus': return `M${w / 3} 0 H${(2 * w) / 3} V${h / 3} H${w} V${(2 * h) / 3} H${(2 * w) / 3} V${h} H${w / 3} V${(2 * h) / 3} H0 V${h / 3} H${w / 3} Z`;
    case 'pill': { const r = Math.min(w, h) / 2; return `M${r} 0 H${w - r} A${r} ${r} 0 0 1 ${w - r} ${h} H${r} A${r} ${r} 0 0 1 ${r} 0 Z`; }
    case 'parallelogram': return `M${w * 0.2} 0 L${w} 0 L${w * 0.8} ${h} L0 ${h} Z`;
    case 'brace': return `M0 ${h} Q0 ${h / 2} ${w * 0.1} ${h / 2} L${w * 0.4} ${h / 2} Q${w / 2} ${h / 2} ${w / 2} 0 Q${w / 2} ${h / 2} ${w * 0.6} ${h / 2} L${w * 0.9} ${h / 2} Q${w} ${h / 2} ${w} ${h}`;
    case 'sqbracket': return `M0 ${h} V0 H${w} V${h}`;
    case 'arcline': return `M0 ${h} A${w / 2} ${h} 0 0 1 ${w} ${h}`;
    case 'cycle': return cycleGeometry(o || {}, w, h).arc;
  }
  return `M0 0 H${w} V${h} H0 Z`;
}
// Circular arrow: an elliptical arc from arcStart to arcEnd (degrees clockwise from 12 o'clock; defaults 0 → 300)
// with optional heads at either end. headSize is a percentage of the default head. The arc stops short of each
// head so thick strokes don't poke through the tip. Returns { arc, heads } path data in the shape's own box.
function cycleArcSpan(o) {
  const a0 = o.arcStart ?? 0;
  let a1 = o.arcEnd ?? 300;
  while (a1 <= a0) a1 += 360;
  while (a1 - a0 > 360) a1 -= 360;
  return [a0, a1];
}
function cycleGeometry(o, w, h) {
  const rx = w / 2, ry = h / 2, sw = o.strokeWidth ?? 2, [a0, a1] = cycleArcSpan(o);
  const P = (deg) => { const a = ((deg - 90) * Math.PI) / 180; return { x: rx + rx * Math.cos(a), y: ry + ry * Math.sin(a) }; };
  const headEnd = (o.headEnd ?? 'arrow') !== 'none', headStart = (o.headStart ?? 'none') !== 'none';
  const len = (5 + sw * 2.5) * ((o.headSize ?? 100) / 100), half = len * 0.55;
  // dA: the arc angle a head covers; the stroke stops three-quarters of the way into it.
  const r = Math.max(1, (rx + ry) / 2), dA = Math.min((len / r) * (180 / Math.PI), (a1 - a0) / (headEnd && headStart ? 2.2 : 1.1));
  const s0 = headStart ? a0 + dA * 0.75 : a0, s1 = headEnd ? a1 - dA * 0.75 : a1;
  const f = (p) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`;
  let arc = `M${f(P(s0))}`;
  // Split into ≤ 180° pieces so the SVG arc flags are never ambiguous.
  const n = Math.max(1, Math.ceil((s1 - s0) / 179.9));
  for (let i = 1; i <= n; i++) arc += ` A${+rx.toFixed(2)} ${+ry.toFixed(2)} 0 0 1 ${f(P(s0 + ((s1 - s0) * i) / n))}`;
  const head = (tipDeg, baseDeg) => {
    const tip = P(tipDeg), base = P(baseDeg), dx = tip.x - base.x, dy = tip.y - base.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const bx = tip.x - (dx / L) * len, by = tip.y - (dy / L) * len;
    return `M${f(tip)} L${f({ x: bx + nx * half, y: by + ny * half })} L${f({ x: bx - nx * half, y: by - ny * half })} Z`;
  };
  const heads = (headEnd ? head(a1, a1 - dA) : '') + (headStart ? ' ' + head(a0, a0 + dA) : '');
  return { arc, heads: heads.trim(), P, a0, a1 };
}

// ---------- Effects: gradient fill, glow, drop shadow, clipping ----------
function applyEffects(o, inner) {
  let defs = '';
  if (o.fill2 && o.fill2 !== 'none' && (o.type === 'rect' || o.type === 'ellipse' || o.type === 'shape')) {
    defs += `<linearGradient id="gr-${o.id}" x1="0" y1="0" x2="${o.gradDir === 'h' ? 1 : 0}" y2="${o.gradDir === 'h' ? 0 : 1}"><stop offset="0" stop-color="${o.fill || '#fff'}"/><stop offset="1" stop-color="${o.fill2}"/></linearGradient>`;
  }
  if (o.clipPath) { // crop to a custom shape (path in the object's local box, scaled with it)
    const sx = o.w / (o.clipPath.w || o.w), sy = o.h / (o.clipPath.h || o.h);
    defs += `<clipPath id="cpx-${o.id}"><path d="${o.clipPath.d}" transform="scale(${sx} ${sy}) ${o.clipPath.tf || ''}"/></clipPath>`;
    inner = `<g clip-path="url(#cpx-${o.id})">${inner}</g>`;
    if (o.clipStroke) inner += `<path d="${o.clipPath.d}" transform="scale(${sx} ${sy}) ${o.clipPath.tf || ''}" fill="none" stroke="${o.clipStroke}" stroke-width="${(o.clipStrokeWidth || 3) / Math.min(sx, sy)}"/>`;
  }
  if (o.clip && o.clip !== 'none') {
    const r = o.clip === 'round' ? Math.min(o.w, o.h) * 0.12 : 0;
    defs += `<clipPath id="cp-${o.id}">${o.clip === 'ellipse' ? `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}"/>` : `<rect width="${o.w}" height="${o.h}" rx="${r}"/>`}</clipPath>`;
    inner = `<g clip-path="url(#cp-${o.id})">${inner}</g>`;
    if (o.clipStroke) inner += o.clip === 'ellipse'
      ? `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}" fill="none" stroke="${o.clipStroke}" stroke-width="${o.clipStrokeWidth || 3}"/>`
      : `<rect width="${o.w}" height="${o.h}" rx="${r}" fill="none" stroke="${o.clipStroke}" stroke-width="${o.clipStrokeWidth || 3}"/>`;
  }
  const filters = [];
  if (o.glow) filters.push(`<feGaussianBlur in="SourceAlpha" stdDeviation="${o.glowSize || 6}" result="b"/><feFlood flood-color="${o.glow}" flood-opacity="0.95"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  else if (o.shadow) filters.push(`<feDropShadow dx="2" dy="${o.shadow === 'strong' ? 6 : 3}" stdDeviation="${o.shadow === 'strong' ? 6 : 3}" flood-opacity="${o.shadow === 'strong' ? 0.35 : 0.22}"/>`);
  if (filters.length) {
    defs += `<filter id="fx-${o.id}" x="-50%" y="-50%" width="200%" height="200%">${filters.join('')}</filter>`;
    inner = `<g filter="url(#fx-${o.id})">${inner}</g>`;
  }
  return defs ? `<defs>${defs}</defs>${inner}` : inner;
}

// ---------- Main entry ----------
function transformFor(o) {
  if (o.type === 'connector') return '';
  return `translate(${o.x} ${o.y})${o.rot ? ` rotate(${o.rot} ${o.w / 2} ${o.h / 2})` : ''}${o.flipX ? ` translate(${o.w} 0) scale(-1 1)` : ''}${o.flipY ? ` translate(0 ${o.h}) scale(1 -1)` : ''}`;
}
// Returns { transform, inner } so the editor can move objects without re-parsing heavy content.
function renderParts(o, objects, forExport) {
  const transform = transformFor(o);
  let inner = '';
  switch (o.type) {
    case 'icon': {
      const { markup, vb } = iconMarkup(o);
      inner = `<svg class="ls-${o.id}" width="${o.w}" height="${o.h}" viewBox="${vb}" preserveAspectRatio="none" overflow="${ICON_MAP[o.iconId] ? 'visible' : 'hidden'}">${markup}</svg>`;
      break;
    }
    case 'path':
      inner = pathSvg(o);
      break;
    case 'shape': {
      const dash = dashAttr(o, o.strokeWidth || 2);
      const d = o.kind === 'cycle' ? cycleGeometry(o, o.w, o.h).arc : shapePath(o.kind, o.w, o.h, o);
      const geom = `<path d="${d}"/>`;
      const paint = OPEN_SHAPES.has(o.kind) ? { fill: 'none', defs: '', overlay: '' } : fillPaint(o, geom);
      inner = (paint.defs ? `<defs>${paint.defs}</defs>` : '') + `<path d="${d}" fill="${paint.fill}" stroke="${o.stroke || 'none'}" stroke-width="${o.strokeWidth ?? 2}" stroke-linejoin="round" stroke-linecap="${o.kind === 'cycle' ? 'butt' : 'round'}"${dash}/>` + paint.overlay;
      if (o.kind === 'cycle') { // filled heads at the ends of the arc
        const { heads } = cycleGeometry(o, o.w, o.h);
        if (heads && o.stroke && o.stroke !== 'none') inner += `<path d="${heads}" fill="${o.stroke}" stroke="${o.stroke}" stroke-width="${Math.min(1, (o.strokeWidth ?? 2) * 0.3)}" stroke-linejoin="round"/>`;
      }
      if (o.label) inner += textSvg(o.label, { fontSize: o.labelSize || 16, color: o.labelColor || '#222', bold: o.labelBold, italic: o.labelItalic, family: o.labelFamily, w: o.w, h: o.h, align: 'center', vcenter: true });
      break;
    }
    case 'rect':
    case 'ellipse': {
      const dash = dashAttr(o, o.strokeWidth || 2);
      const geom = o.type === 'rect' ? `<rect width="${o.w}" height="${o.h}" rx="${o.radius || 0}"/>` : `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}"/>`;
      const paint = fillPaint(o, geom);
      const common = `fill="${paint.fill}" stroke="${o.stroke || 'none'}" stroke-width="${o.strokeWidth ?? 2}"${dash}`;
      inner = (paint.defs ? `<defs>${paint.defs}</defs>` : '') + geom.replace('/>', ` ${common}/>`) + paint.overlay;
      if (o.label) inner += textSvg(o.label, { fontSize: o.labelSize || 16, color: o.labelColor || '#222', bold: o.labelBold, italic: o.labelItalic, family: o.labelFamily, w: o.w, h: o.h, align: 'center', vcenter: true });
      break;
    }
    case 'text':
      if (o.bg) inner += `<rect x="-4" y="-2" width="${o.w + 8}" height="${o.h + 4}" rx="4" fill="${o.bg}"/>`;
      if (o.curve) {
        const t = stripMarkup(displayText(o)).replace(/\n/g, ' ');
        const g = curveGeometry(measureText(t, o.fontSize, o.family, o.bold, o.italic).w, o.fontSize, o.curve);
        inner += `<defs><path id="tp-${o.id}" d="${g.d}"/></defs><text font-family='${FONT_STACK[o.family] || FONT_STACK.sans}' font-size="${o.fontSize}" fill="${o.color}"${o.bold ? ' font-weight="700"' : ''}${o.italic ? ' font-style="italic"' : ''}${o.underline ? ' text-decoration="underline"' : ''}><textPath href="#tp-${o.id}" startOffset="50%" text-anchor="middle">${esc(t)}</textPath></text>`;
      } else inner += textSvg(displayText(o), { fontSize: o.fontSize, color: o.color, family: o.family, bold: o.bold, italic: o.italic, underline: o.underline, strike: o.strike, align: o.align, w: o.w, h: o.h });
      break;
    case 'table':
      inner = tableSvg(o);
      break;
    case 'image': {
      const c = o.crop;
      if (c && o.nw && (c.l || c.t || c.r || c.b)) {
        const vx = c.l * o.nw, vy = c.t * o.nh, vw = Math.max(1, (1 - c.l - c.r) * o.nw), vh = Math.max(1, (1 - c.t - c.b) * o.nh);
        inner = `<svg width="${o.w}" height="${o.h}" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="none"><image href="${o.src}" width="${o.nw}" height="${o.nh}"/></svg>`;
      } else inner = `<image href="${o.src}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`;
      if (o.scaleBar && typeof scaleBarSvg === 'function') inner += scaleBarSvg(o);
      break;
    }
    case 'brush':
      inner = brushSvg(o);
      break;
    case 'chart':
      inner = `<rect width="${o.w}" height="${o.h}" fill="${o.cfg.bg || 'transparent'}"/>` + renderChart(o.cfg, o.w, o.h).svg;
      break;
    case 'protocol':
      inner = protocolSvg(o);
      break;
    case 'connector':
      inner = connectorSvg(o, objects, forExport);
      break;
    case 'group': {
      const sx = o.w / o.w0, sy = o.h / o.h0;
      inner = `<g transform="scale(${sx} ${sy})">${o.children.map((c) => renderObjectString(c, o.children, forExport)).join('')}</g>`;
      break;
    }
  }
  if (o.type !== 'connector') inner = applyErase(o, applyEffects(o, inner));
  if (o.type !== 'connector' && o.type !== 'group' && !forExport) {
    inner = `<rect width="${o.w}" height="${o.h}" fill="transparent"/>` + inner; // hit area
  }
  return { transform, inner };
}

function renderObjectString(o, objects, forExport) {
  const { transform, inner } = renderParts(o, objects, forExport);
  const g = `<g${transform ? ` transform="${transform}"` : ''}${o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : ''}${o.blend ? ` style="mix-blend-mode:${o.blend}"` : ''}>${inner}</g>`;
  return forExport && o.link && /^https?:\/\//.test(o.link) ? `<a href="${esc(o.link)}" xlink:href="${esc(o.link)}" target="_blank">${g}</a>` : g;
}
// Partial erasing: strokes stored in the object's local box (0..1) become a luminance mask.
function applyErase(o, inner) {
  if (!o.erase || !o.erase.length) return inner;
  const strokes = o.erase.map((st) => {
    const pts = st.pts.map(([u, v]) => `${u * o.w},${v * o.h}`);
    const r = st.r * Math.max(o.w, o.h);
    return pts.length === 1 ? `<circle cx="${pts[0].split(',')[0]}" cy="${pts[0].split(',')[1]}" r="${r / 2}" fill="#000"/>` : `<polyline points="${pts.join(' ')}" fill="none" stroke="#000" stroke-width="${r}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  return `<defs><mask id="er-${o.id}" maskUnits="userSpaceOnUse" x="${-o.w}" y="${-o.h}" width="${o.w * 3}" height="${o.h * 3}"><rect x="${-o.w}" y="${-o.h}" width="${o.w * 3}" height="${o.h * 3}" fill="#fff"/>${strokes}</mask></defs><g mask="url(#er-${o.id})">${inner}</g>`;
}
// Tables: rows × cols grid with optional header row, stripes, per-cell fills and column widths.
function tableSvg(o) {
  const R = o.rows, C = o.cols, fs = o.fontSize || 13, bw = o.borderWidth ?? 1;
  const widths = o.colW && o.colW.length === C ? o.colW : Array(C).fill(1 / C);
  const xs = [0]; widths.forEach((f, i) => xs.push(xs[i] + f * o.w));
  const heights = o.rowH && o.rowH.length === R ? o.rowH : Array(R).fill(1 / R);
  const ys = [0]; heights.forEach((f, i) => ys.push(ys[i] + f * o.h));
  let s = `<rect width="${o.w}" height="${o.h}" fill="${o.fill || '#ffffff'}"/>`;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const head = o.header && r === 0;
      const cellFill = (o.cellFill && o.cellFill[r] && o.cellFill[r][c]) || (head ? o.headerFill || '#23395d' : o.stripe && r % 2 === (o.header ? 0 : 1) ? o.stripeFill || '#f1f4f9' : null);
      if (cellFill) s += `<rect x="${xs[c]}" y="${ys[r]}" width="${xs[c + 1] - xs[c]}" height="${ys[r + 1] - ys[r]}" fill="${cellFill}"/>`;
      const txt = (o.cells[r] && o.cells[r][c]) || '';
      if (txt) {
        const cw = xs[c + 1] - xs[c], align = o.align || 'center';
        s += `<g transform="translate(${xs[c]} ${ys[r]})">${textSvg(txt, { fontSize: fs, color: head ? o.headerColor || '#ffffff' : o.color || '#222', bold: head, family: o.family, w: cw, h: ys[r + 1] - ys[r], align, vcenter: true })}</g>`;
      }
    }
  }
  if (bw > 0) {
    let d = '';
    for (let r = 0; r <= R; r++) d += `M0 ${ys[r]}H${o.w}`;
    for (let c = 0; c <= C; c++) d += `M${xs[c]} 0V${o.h}`;
    s += `<path d="${d}" stroke="${o.border || '#9aa5b4'}" stroke-width="${bw}" fill="none"/>`;
  }
  return s;
}

function pageSvgString(page, { transparent } = {}) {
  const body = page.objects.filter((o) => !o.hidden).map((o) => renderObjectString(o, page.objects, true)).join('');
  const bg = transparent ? '' : `<rect width="${page.width}" height="${page.height}" fill="${page.background || '#ffffff'}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">${bg}${body}</svg>`;
}
