// Object model → SVG. Every object has {id, type, x, y, w, h, rot, opacity}; content is drawn in a
// local 0..w × 0..h box, and the outer transform places and rotates it.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FONT_STACK = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Menlo, Consolas, monospace',
};

// ---------- Rich-ish text: supports ^{superscript} and _{subscript} ----------
function parseMarkup(line) {
  const out = [];
  const re = /([\^_])\{([^}]*)\}/g;
  let last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), s: 0 });
    out.push({ t: m[2], s: m[1] === '^' ? 1 : -1 });
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ t: line.slice(last), s: 0 });
  return out;
}

let _measureCtx;
function measureText(text, fontSize, family, bold, italic) {
  _measureCtx = _measureCtx || document.createElement('canvas').getContext('2d');
  const lines = String(text).split('\n');
  let w = 0;
  for (const line of lines) {
    let lw = 0;
    for (const seg of parseMarkup(line)) {
      const fs = seg.s ? fontSize * 0.7 : fontSize;
      _measureCtx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fs}px ${FONT_STACK[family] || FONT_STACK.sans}`;
      lw += _measureCtx.measureText(seg.t).width;
    }
    w = Math.max(w, lw);
  }
  return { w: Math.ceil(w) + 4, h: Math.ceil(lines.length * fontSize * 1.25) + 2 };
}

function textSvg(text, { fontSize = 16, color = '#222', family = 'sans', bold, italic, align = 'left', w, h, vcenter }) {
  const lines = String(text).split('\n');
  const lh = fontSize * 1.25;
  const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start';
  const x = align === 'center' ? w / 2 : align === 'right' ? w - 2 : 2;
  const top = vcenter ? (h - lines.length * lh) / 2 : 0;
  let s = `<text font-family='${FONT_STACK[family] || FONT_STACK.sans}' font-size="${fontSize}" fill="${color}"${bold ? ' font-weight="700"' : ''}${italic ? ' font-style="italic"' : ''} text-anchor="${anchor}">`;
  lines.forEach((line, i) => {
    const y = top + i * lh + fontSize;
    s += `<tspan x="${x}" y="${y}">`;
    for (const seg of parseMarkup(line)) {
      if (!seg.s) s += `<tspan>${esc(seg.t)}</tspan>`;
      else {
        const shift = seg.s > 0 ? -fontSize * 0.38 : fontSize * 0.22;
        s += `<tspan dy="${shift}" font-size="${fontSize * 0.7}">${esc(seg.t)}</tspan><tspan dy="${-shift}">​</tspan>`;
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

function arrowHead(kind, tip, from, color, sw) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x);
  const s = 6 + sw * 2.2;
  const p = (dx, dy) => {
    const c = Math.cos(ang), n = Math.sin(ang);
    return `${tip.x + dx * c - dy * n},${tip.y + dx * n + dy * c}`;
  };
  switch (kind) {
    case 'arrow': return `<polygon points="${p(0, 0)} ${p(-s * 1.4, -s * 0.7)} ${p(-s * 1.4, s * 0.7)}" fill="${color}"/>`;
    case 'open': return `<polyline points="${p(-s * 1.3, -s * 0.75)} ${p(0, 0)} ${p(-s * 1.3, s * 0.75)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`;
    case 'bar': return `<line x1="${p(0, -s).split(',')[0]}" y1="${p(0, -s).split(',')[1]}" x2="${p(0, s).split(',')[0]}" y2="${p(0, s).split(',')[1]}" stroke="${color}" stroke-width="${sw + 1.5}" stroke-linecap="round"/>`;
    case 'dot': return `<circle cx="${tip.x}" cy="${tip.y}" r="${s * 0.55}" fill="${color}"/>`;
    default: return '';
  }
}

function connectorSvg(o, objects, forExport) {
  const [a, b] = connectorEnds(o, objects);
  const color = o.color || '#333', sw = o.width || 2;
  const cp = connectorControl(o, a, b);
  // Shorten the line so it doesn't poke through heads.
  const inset = (pt, toward, kind) => {
    if (kind !== 'arrow') return pt;
    const d = Math.hypot(toward.x - pt.x, toward.y - pt.y) || 1, k = Math.min((6 + sw * 2.2) * 1.2, d / 2) / d;
    return { x: pt.x + (toward.x - pt.x) * k, y: pt.y + (toward.y - pt.y) * k };
  };
  let d, tanA, tanB, mid;
  if (o.style === 'elbow') {
    // Leave / enter perpendicular to a pinned side; otherwise go along the dominant axis first.
    const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    const endH = o.to.port ? 'ew'.includes(o.to.port) : startH;
    let corner1, corner2;
    if (startH && endH) { corner1 = { x: (a.x + b.x) / 2, y: a.y }; corner2 = { x: (a.x + b.x) / 2, y: b.y }; }
    else if (!startH && !endH) { corner1 = { x: a.x, y: (a.y + b.y) / 2 }; corner2 = { x: b.x, y: (a.y + b.y) / 2 }; }
    else if (startH) { corner1 = corner2 = { x: b.x, y: a.y }; }
    else { corner1 = corner2 = { x: a.x, y: b.y }; }
    const a2 = inset(a, corner1, o.tail), b2 = inset(b, corner2, o.head);
    d = `M${a2.x} ${a2.y} L${corner1.x} ${corner1.y} L${corner2.x} ${corner2.y} L${b2.x} ${b2.y}`;
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
  s += `<path d="${d}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round"${o.dash ? ` stroke-dasharray="${sw * 3} ${sw * 2.5}"` : ''}/>`;
  s += arrowHead(o.head, b, tanB, color, sw) + arrowHead(o.tail, a, tanA, color, sw);
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

function brushSvg(o) {
  const pts = o.pts.map(([u, v]) => ({ x: u * o.w, y: v * o.h }));
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
    }
    const lines = wrapWords(st.title, 18).slice(0, 3);
    lines.forEach((ln, j) => {
      s += `<text x="${p.x + cw / 2}" y="${p.y + 104 * k + j * 15 * k}" text-anchor="middle" font-family="Helvetica, Arial" font-size="${12.5 * k}" fill="#222"${j === 0 ? ' font-weight="600"' : ''}>${esc(ln)}</text>`;
    });
  });
  return s;
}

// ---------- Shapes ----------
const SHAPES = [['triangle', 'Triangle'], ['diamond', 'Diamond'], ['hexagon', 'Hexagon'], ['star', 'Star'], ['arrow', 'Block arrow'], ['chevron', 'Chevron'], ['cylinder', 'Cylinder'], ['cloud', 'Cloud'], ['plus', 'Plus'], ['pill', 'Capsule']];
function shapePath(kind, w, h) {
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
  }
  return `M0 0 H${w} V${h} H0 Z`;
}

// ---------- Effects: gradient fill, glow, drop shadow, clipping ----------
function applyEffects(o, inner) {
  let defs = '';
  if (o.fill2 && o.fill2 !== 'none' && (o.type === 'rect' || o.type === 'ellipse' || o.type === 'shape')) {
    defs += `<linearGradient id="gr-${o.id}" x1="0" y1="0" x2="${o.gradDir === 'h' ? 1 : 0}" y2="${o.gradDir === 'h' ? 0 : 1}"><stop offset="0" stop-color="${o.fill || '#fff'}"/><stop offset="1" stop-color="${o.fill2}"/></linearGradient>`;
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
// Returns { transform, inner } so the editor can move objects without re-parsing heavy content.
function renderParts(o, objects, forExport) {
  const transform = o.type === 'connector' ? '' : `translate(${o.x} ${o.y})${o.rot ? ` rotate(${o.rot} ${o.w / 2} ${o.h / 2})` : ''}${o.flipX ? ` translate(${o.w} 0) scale(-1 1)` : ''}`;
  let inner = '';
  switch (o.type) {
    case 'icon': {
      const { markup, vb } = iconMarkup(o);
      inner = `<svg width="${o.w}" height="${o.h}" viewBox="${vb}" preserveAspectRatio="none" overflow="${ICON_MAP[o.iconId] ? 'visible' : 'hidden'}">${markup}</svg>`;
      break;
    }
    case 'path':
      inner = pathSvg(o);
      break;
    case 'shape': {
      const dash = o.dash ? ` stroke-dasharray="${(o.strokeWidth || 2) * 3} ${(o.strokeWidth || 2) * 2}"` : '';
      const geom = `<path d="${shapePath(o.kind, o.w, o.h)}"/>`;
      const paint = fillPaint(o, geom);
      inner = (paint.defs ? `<defs>${paint.defs}</defs>` : '') + `<path d="${shapePath(o.kind, o.w, o.h)}" fill="${paint.fill}" stroke="${o.stroke || 'none'}" stroke-width="${o.strokeWidth ?? 2}" stroke-linejoin="round"${dash}/>` + paint.overlay;
      if (o.label) inner += textSvg(o.label, { fontSize: o.labelSize || 16, color: o.labelColor || '#222', bold: o.labelBold, w: o.w, h: o.h, align: 'center', vcenter: true });
      break;
    }
    case 'rect':
    case 'ellipse': {
      const dash = o.dash ? ` stroke-dasharray="${(o.strokeWidth || 2) * 3} ${(o.strokeWidth || 2) * 2}"` : '';
      const geom = o.type === 'rect' ? `<rect width="${o.w}" height="${o.h}" rx="${o.radius || 0}"/>` : `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}"/>`;
      const paint = fillPaint(o, geom);
      const common = `fill="${paint.fill}" stroke="${o.stroke || 'none'}" stroke-width="${o.strokeWidth ?? 2}"${dash}`;
      inner = (paint.defs ? `<defs>${paint.defs}</defs>` : '') + geom.replace('/>', ` ${common}/>`) + paint.overlay;
      if (o.label) inner += textSvg(o.label, { fontSize: o.labelSize || 16, color: o.labelColor || '#222', bold: o.labelBold, w: o.w, h: o.h, align: 'center', vcenter: true });
      break;
    }
    case 'text':
      if (o.bg) inner += `<rect x="-4" y="-2" width="${o.w + 8}" height="${o.h + 4}" rx="4" fill="${o.bg}"/>`;
      inner += textSvg(o.text, { fontSize: o.fontSize, color: o.color, family: o.family, bold: o.bold, italic: o.italic, align: o.align, w: o.w, h: o.h });
      break;
    case 'image': {
      const c = o.crop;
      if (c && o.nw && (c.l || c.t || c.r || c.b)) {
        const vx = c.l * o.nw, vy = c.t * o.nh, vw = Math.max(1, (1 - c.l - c.r) * o.nw), vh = Math.max(1, (1 - c.t - c.b) * o.nh);
        inner = `<svg width="${o.w}" height="${o.h}" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="none"><image href="${o.src}" width="${o.nw}" height="${o.nh}"/></svg>`;
      } else inner = `<image href="${o.src}" width="${o.w}" height="${o.h}" preserveAspectRatio="none"/>`;
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
  if (o.type !== 'connector') inner = applyEffects(o, inner);
  if (o.type !== 'connector' && o.type !== 'group' && !forExport) {
    inner = `<rect width="${o.w}" height="${o.h}" fill="transparent"/>` + inner; // hit area
  }
  return { transform, inner };
}

function renderObjectString(o, objects, forExport) {
  const { transform, inner } = renderParts(o, objects, forExport);
  return `<g${transform ? ` transform="${transform}"` : ''}${o.opacity != null && o.opacity < 1 ? ` opacity="${o.opacity}"` : ''}>${inner}</g>`;
}

function pageSvgString(page, { transparent } = {}) {
  const body = page.objects.map((o) => renderObjectString(o, page.objects, true)).join('');
  const bg = transparent ? '' : `<rect width="${page.width}" height="${page.height}" fill="${page.background || '#ffffff'}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">${bg}${body}</svg>`;
}
