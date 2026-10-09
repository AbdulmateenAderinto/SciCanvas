// PowerPoint export with native, editable objects. Rectangles, ellipses, shapes, drawn paths, text and tables become
// real PowerPoint shapes, text boxes and tables; arrows become connectors glued to the shapes they join; groups stay
// groups. Things PowerPoint has no equivalent for (icons, brushes, charts, protocol strips, curved text…) go in as
// vector SVG pictures with a PNG fallback — in PowerPoint, right-click › Convert to Shape makes those editable too.
// pptxgenjs builds the package (slides, size, background, notes); each slide's shape tree is then written here.

const PX_EMU = 9525; // 96 px per inch, 914400 EMU per inch
const emu = (v) => Math.round(v * PX_EMU);
const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// '#abc' / '#aabbcc' / '#aabbccdd' / rgb() / rgba() / a few names → { hex: 'AABBCC', alpha: 0..1 }, or null for none.
function pptColor(c) {
  if (!c || c === 'none' || c === 'transparent') return null;
  c = String(c).trim().toLowerCase();
  const named = { white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', green: '#008000', gray: '#808080', grey: '#808080' };
  if (named[c]) c = named[c];
  let m = c.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { hex: h.slice(0, 6).toUpperCase(), alpha: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  m = c.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    const hex = p.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hex, alpha: p.length > 3 ? p[3] : 1 };
  }
  return null;
}
function clrXml(c, alpha = 1) {
  const p = typeof c === 'string' ? pptColor(c) : c;
  if (!p) return '';
  const a = Math.max(0, Math.min(1, p.alpha * alpha));
  return `<a:srgbClr val="${p.hex}">${a < 0.999 ? `<a:alpha val="${Math.round(a * 100000)}"/>` : ''}</a:srgbClr>`;
}
const solidFill = (c, alpha) => { const s = clrXml(c, alpha); return s ? `<a:solidFill>${s}</a:solidFill>` : '<a:noFill/>'; };

// ---------- SVG path data → DrawingML custom geometry ----------
// Absolute segments: M/L [x,y], C [x1,y1,x2,y2,x,y], Q [x1,y1,x,y], Z. Arcs become cubic Béziers.
function parseSvgPath(d) {
  const toks = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') { out.push({ t: 'Z' }); x = sx; y = sy; lc = lq = null; continue; }
    if (i >= toks.length || /[a-zA-Z]/.test(toks[i])) { i++; continue; } // malformed: skip
    if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; out.push({ t: 'M', p: [x, y] }); cmd = rel ? 'l' : 'L'; lc = lq = null; }
    else if (C === 'L') { x = ox + num(); y = oy + num(); out.push({ t: 'L', p: [x, y] }); lc = lq = null; }
    else if (C === 'H') { x = ox + num(); out.push({ t: 'L', p: [x, y] }); lc = lq = null; }
    else if (C === 'V') { y = (rel ? y : 0) + num(); out.push({ t: 'L', p: [x, y] }); lc = lq = null; }
    else if (C === 'C' || C === 'S') {
      let x1, y1;
      if (C === 'C') { x1 = ox + num(); y1 = oy + num(); } else { x1 = lc ? 2 * x - lc[0] : x; y1 = lc ? 2 * y - lc[1] : y; }
      const x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
      out.push({ t: 'C', p: [x1, y1, x2, y2, ex, ey] }); lc = [x2, y2]; lq = null; x = ex; y = ey;
    } else if (C === 'Q' || C === 'T') {
      let x1, y1;
      if (C === 'Q') { x1 = ox + num(); y1 = oy + num(); } else { x1 = lq ? 2 * x - lq[0] : x; y1 = lq ? 2 * y - lq[1] : y; }
      const ex = ox + num(), ey = oy + num();
      out.push({ t: 'Q', p: [x1, y1, ex, ey] }); lq = [x1, y1]; lc = null; x = ex; y = ey;
    } else if (C === 'A') {
      const rx = num(), ry = num(), phi = num(), fa = num(), fs = num(), ex = ox + num(), ey = oy + num();
      for (const c of arcToCubics(x, y, rx, ry, phi, fa, fs, ex, ey)) out.push({ t: 'C', p: c });
      x = ex; y = ey; lc = lq = null;
    } else i++;
  }
  return out;
}
// SVG endpoint arc → cubic Bézier segments (each ≤ 90°).
function arcToCubics(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [[x1, y1, x2, y2, x2, y2]];
  rx = Math.abs(rx); ry = Math.abs(ry);
  const phi = (phiDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy, yp = -sin * dx + cos * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
  const k = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (k * rx * yp) / ry, cyp = (-k * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)), step = dt / n, kk = (4 / 3) * Math.tan(step / 4);
  const pt = (t) => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const der = (t) => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  const segs = [];
  for (let j = 0; j < n; j++) {
    const a = t1 + j * step, b = a + step, p0 = pt(a), p3 = pt(b), d0 = der(a), d3 = der(b);
    segs.push([p0[0] + kk * d0[0], p0[1] + kk * d0[1], p3[0] - kk * d3[0], p3[1] - kk * d3[1], j === n - 1 ? x2 : p3[0], j === n - 1 ? y2 : p3[1]]);
  }
  return segs;
}
// Segments (in px, relative to the shape's top-left) → <a:path> content, in EMU scaled by (sx, sy).
function segsToPathXml(segs, sx, sy) {
  const P = (x, y) => `<a:pt x="${emu(x * sx)}" y="${emu(y * sy)}"/>`;
  return segs.map((s) => {
    const p = s.p;
    if (s.t === 'M') return `<a:moveTo>${P(p[0], p[1])}</a:moveTo>`;
    if (s.t === 'L') return `<a:lnTo>${P(p[0], p[1])}</a:lnTo>`;
    if (s.t === 'C') return `<a:cubicBezTo>${P(p[0], p[1])}${P(p[2], p[3])}${P(p[4], p[5])}</a:cubicBezTo>`;
    if (s.t === 'Q') return `<a:quadBezTo>${P(p[0], p[1])}${P(p[2], p[3])}</a:quadBezTo>`;
    return '<a:close/>';
  }).join('');
}
// Custom geometry with four connection sites in rectangle order (top, left, bottom, right) so connectors can glue to it.
const RECT_SITES = '<a:cxnLst><a:cxn ang="3cd4"><a:pos x="hc" y="t"/></a:cxn><a:cxn ang="cd2"><a:pos x="l" y="vc"/></a:cxn><a:cxn ang="cd4"><a:pos x="hc" y="b"/></a:cxn><a:cxn ang="0"><a:pos x="r" y="vc"/></a:cxn></a:cxnLst>';
function custGeomXml(paths, wPx, hPx, { sites = true } = {}) {
  const W = Math.max(1, emu(wPx)), H = Math.max(1, emu(hPx));
  return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/>${sites ? RECT_SITES : '<a:cxnLst/>'}<a:rect l="l" t="t" r="r" b="b"/><a:pathLst>${paths.map((p) => `<a:path w="${W}" h="${H}"${p.fill === false ? ' fill="none"' : ''}${p.stroke === false ? ' stroke="0"' : ''}>${p.xml}</a:path>`).join('')}</a:pathLst></a:custGeom>`;
}
const prstGeom = (prst, adj) => `<a:prstGeom prst="${prst}"><a:avLst>${adj != null ? `<a:gd name="adj" fmla="val ${Math.round(adj)}"/>` : ''}</a:avLst></a:prstGeom>`;

// ---------- Text ----------
function pptFontFace(family) {
  const stack = FONT_STACK[family] || FONT_STACK.sans;
  return stack.split(',')[0].replace(/["']/g, '').trim();
}
// Markup text (^{sup}, _{sub}, {b#c|spans}, newlines) → <a:p> paragraphs. fontPx is in slide pixels.
function paragraphsXml(text, { fontPx = 16, color = '#222222', family = 'sans', bold, italic, underline, strike, align = 'left', alpha = 1 }) {
  const face = xmlEsc(pptFontFace(family));
  const sz = Math.min(400000, Math.max(100, Math.round(fontPx * 75))); // px → hundredths of a point
  const lnSpc = `<a:lnSpc><a:spcPts val="${Math.max(100, Math.round(fontPx * 1.25 * 75))}"/></a:lnSpc>`;
  const algn = align === 'center' ? 'ctr' : align === 'right' ? 'r' : 'l';
  const rPr = (seg, extra = '') => {
    const b = bold || seg.bold, i = italic || seg.italic;
    return `<a:rPr lang="en-US" sz="${sz}"${b ? ' b="1"' : ''}${i ? ' i="1"' : ''}${underline ? ' u="sng"' : ''}${strike ? ' strike="sngStrike"' : ''}${seg.s ? ` baseline="${seg.s > 0 ? 30000 : -25000}"` : ''} dirty="0"${extra}>${solidFill(seg.color || color, alpha)}<a:latin typeface="${face}"/><a:cs typeface="${face}"/></a:rPr>`;
  };
  return splitSpanLines(String(text ?? '')).split('\n').map((line) => {
    const runs = parseMarkup(line).filter((g) => g.t).map((g) => `<a:r>${rPr(g)}<a:t>${xmlEsc(g.t)}</a:t></a:r>`).join('');
    return `<a:p><a:pPr algn="${algn}">${lnSpc}</a:pPr>${runs}<a:endParaRPr lang="en-US" sz="${sz}" dirty="0"/></a:p>`;
  }).join('');
}
function txBodyXml(paras, { anchor = 't', insets = [0, 0, 0, 0], autofit = false } = {}) {
  const [l, t, r, b] = insets.map(emu);
  return `<p:txBody><a:bodyPr wrap="none" lIns="${l}" tIns="${t}" rIns="${r}" bIns="${b}" anchor="${anchor}" rtlCol="0">${autofit ? '<a:spAutoFit/>' : '<a:noAutofit/>'}</a:bodyPr><a:lstStyle/>${paras}</p:txBody>`;
}

// ---------- Fill, line and effects ----------
function fillXml(o, alpha) {
  const base = pptColor(o.fill);
  if (!base) return '<a:noFill/>';
  if (o.fill2 && o.fill2 !== 'none' && pptColor(o.fill2)) {
    return `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${clrXml(base, alpha)}</a:gs><a:gs pos="100000">${clrXml(o.fill2, alpha)}</a:gs></a:gsLst><a:lin ang="${o.gradDir === 'h' ? 0 : 5400000}" scaled="0"/></a:gradFill>`;
  }
  const hex = '#' + base.hex.toLowerCase(), shade = o.shade || 'flat';
  if (shade === 'linear') return `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${clrXml(Color.light(hex, 0.45), alpha)}</a:gs><a:gs pos="100000">${clrXml(Color.dark(hex, 0.25), alpha)}</a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>`;
  if (shade === 'soft' || shade === 'gloss') {
    return `<a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0">${clrXml(Color.light(hex, 0.55), alpha)}</a:gs><a:gs pos="55000">${clrXml(hex, alpha)}</a:gs><a:gs pos="100000">${clrXml(Color.dark(hex, 0.3), alpha)}</a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="38000" t="32000" r="62000" b="68000"/></a:path></a:gradFill>`;
  }
  return solidFill(base, alpha);
}
const DASH = { dashed: 'dash', dotted: 'sysDot', dashdot: 'dashDot' };
const LINE_END = { arrow: 'triangle', open: 'arrow', dot: 'oval' };
function lineXml(color, widthPx, { dash, alpha = 1, head, tail, cap } = {}) {
  if (!pptColor(color) || !(widthPx > 0)) return '<a:ln><a:noFill/></a:ln>';
  const size = widthPx <= 3 ? 'lg' : 'med';
  const end = (tag, kind) => (LINE_END[kind] ? `<a:${tag} type="${LINE_END[kind]}" w="${size}" len="${size}"/>` : '');
  return `<a:ln w="${emu(widthPx)}"${cap ? ` cap="${cap}"` : ''}>${solidFill(color, alpha)}${DASH[dash] ? `<a:prstDash val="${DASH[dash]}"/>` : ''}<a:round/>${end('headEnd', tail)}${end('tailEnd', head)}</a:ln>`;
}
function effectsXml(o, k = 1) {
  if (o.glow) { const c = pptColor(o.glow); if (c) return `<a:effectLst><a:glow rad="${emu((o.glowSize || 6) * 2 * k)}">${clrXml(c, 0.95)}</a:glow></a:effectLst>`; }
  if (o.shadow) {
    const strong = o.shadow === 'strong';
    return `<a:effectLst><a:outerShdw blurRad="${emu((strong ? 12 : 6) * k)}" dist="${emu((strong ? 6.3 : 3.6) * k)}" dir="${strong ? 4290000 : 3960000}" algn="tl" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="${strong ? 35000 : 22000}"/></a:srgbClr></a:outerShdw></a:effectLst>`;
  }
  return '';
}
function xfrmXml(box, { rot, flipH, flipV, tag = 'a:xfrm' } = {}) {
  const r = rot ? Math.round((((rot % 360) + 360) % 360) * 60000) : 0;
  return `<${tag}${r ? ` rot="${r}"` : ''}${flipH ? ' flipH="1"' : ''}${flipV ? ' flipV="1"' : ''}><a:off x="${emu(box.x)}" y="${emu(box.y)}"/><a:ext cx="${Math.max(0, emu(box.w))}" cy="${Math.max(0, emu(box.h))}"/></${tag}>`;
}
function spXml(id, name, { box, rot, flipH, flipV, geom, fill, line, effects = '', txBody = '', txBox = false }) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvSpPr${txBox ? ' txBox="1"' : ''}/><p:nvPr/></p:nvSpPr><p:spPr>${xfrmXml(box, { rot, flipH, flipV })}${geom}${fill}${line}${effects}</p:spPr>${txBody || txBodyXml('<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>', { anchor: 'ctr' })}</p:sp>`;
}

// ---------- Placement ----------
// T maps an object's own coordinates to slide pixels: X = ox + x·sx, Y = oy + y·sy.
const slideBox = (T, x, y, w, h) => ({ x: T.ox + x * T.sx, y: T.oy + y * T.sy, w: w * T.sx, h: h * T.sy });
const slidePt = (T, p) => ({ x: T.ox + p.x * T.sx, y: T.oy + p.y * T.sy });
const slideK = (T) => Math.sqrt(Math.abs(T.sx * T.sy));

// Which objects PowerPoint gets as native shapes (and how a connector glues to them: rectangle-style or ellipse sites).
function nativeKind(o) {
  if (o.erase && o.erase.length) return null;
  if (o.clipPath || (o.clip && o.clip !== 'none' && o.type !== 'image')) return null;
  if (o.blend && o.blend !== 'normal') return null;
  switch (o.type) {
    case 'rect': case 'shape': return 'sp';
    case 'ellipse': return 'sp';
    case 'text': return o.curve ? null : 'sp';
    case 'path': return o.tube || o.pathText || o.blur || !o.nodes || o.nodes.length < 2 ? null : 'sp';
    case 'table': return o.rot ? null : 'table';
    case 'image': return o.scaleBar || !/^data:image\//.test(o.src || '') ? null : 'image';
    case 'group': return 'group';
    case 'connector': return 'connector';
    default: return null;
  }
}
// Connection-site index for one end of a connector glued to `t` (PowerPoint numbers rectangle sites t,l,b,r and
// ellipse sites counter-clockwise from the top, eight in all).
function siteIndex(t, port, pt) {
  const PORT_UV = { n: [0.5, 0], w: [0, 0.5], s: [0.5, 1], e: [1, 0.5] };
  const order = ['n', 'w', 's', 'e'];
  let k = port && PORT_UV[port] ? order.indexOf(port) : -1;
  if (k < 0) {
    const c = center(t);
    let best = Infinity;
    order.forEach((key, i) => {
      const [u, v] = PORT_UV[key], q = rotPt({ x: t.x + u * t.w, y: t.y + v * t.h }, c, t.rot || 0), d = Math.hypot(q.x - pt.x, q.y - pt.y);
      if (d < best) { best = d; k = i; }
    });
  }
  return t.type === 'ellipse' ? k * 2 : k;
}
// Box, rotation and flips for a preset connector whose path runs from (0,0) to (w,h) of its box — straight or bent —
// so that it starts at a and ends at b. vertical = the first leg runs vertically (box turned 90°).
function connectorFrame(a, b, vertical) {
  const W = Math.abs(b.x - a.x), H = Math.abs(b.y - a.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
  const w = vertical ? H : W, h = vertical ? W : H, rot = vertical ? 90 : 0;
  const box = { x: cx - w / 2, y: cy - h / 2, w, h };
  let best = null;
  for (const flipH of [false, true]) for (const flipV of [false, true]) {
    const map = (u, v) => { // OOXML: flip inside the box, then rotate about its centre
      let x = (flipH ? w - u : u) - w / 2, y = (flipV ? h - v : v) - h / 2;
      if (rot) [x, y] = [-y, x];
      return { x: cx + x, y: cy + y };
    };
    const s = map(0, 0), e = map(w, h), err = Math.hypot(s.x - a.x, s.y - a.y) + Math.hypot(e.x - b.x, e.y - b.y);
    if (!best || err < best.err) best = { err, flipH, flipV };
  }
  return { box, rot, flipH: best.flipH, flipV: best.flipV };
}

// ---------- The slide writer ----------
// ctx: { nextId, media: [{ rid, file, data(base64) }], slideNo, pictures: {kind: count}, rasterize(miniPage, scale) → dataURL }
async function objectsXml(objects, T, ctx, alpha = 1) {
  const ids = new Map();
  for (const o of objects) if (!o.hidden) ids.set(o.id, ctx.nextId++);
  let out = '';
  for (const o of objects) {
    if (o.hidden) continue;
    out += await objectXml(o, objects, T, ctx, ids, alpha);
  }
  return out;
}

async function objectXml(o, objects, T, ctx, ids, alpha) {
  const id = ids.get(o.id), name = o.name || `${o.type} ${id}`;
  const a = alpha * (o.opacity != null ? o.opacity : 1), k = slideK(T);
  const kind = nativeKind(o);
  if (!kind) return pictureXml(o, objects, T, ctx, id, name, a);
  const box = slideBox(T, o.x, o.y, o.w, o.h);
  const common = { box, rot: o.rot, flipH: !!o.flipX, flipV: !!o.flipY };
  const sw = (o.strokeWidth ?? 2) * k, dash = o.dashStyle || (o.dash ? 'dashed' : 'solid');
  const label = () => (o.label ? txBodyXml(paragraphsXml(o.label, { fontPx: (o.labelSize || 16) * k, color: o.labelColor || '#222222', bold: o.labelBold, align: 'center', alpha: a }), { anchor: 'ctr' }) : '');
  switch (o.type) {
    case 'rect': {
      const r = Math.min(o.radius || 0, Math.min(o.w, o.h) / 2);
      const geom = r > 0 ? prstGeom('roundRect', (r / Math.min(o.w, o.h)) * 100000) : prstGeom('rect');
      return spXml(id, name, { ...common, geom, fill: fillXml(o, a), line: lineXml(o.stroke, sw, { dash, alpha: a }), effects: effectsXml(o, k), txBody: label() });
    }
    case 'ellipse':
      return spXml(id, name, { ...common, geom: prstGeom('ellipse'), fill: fillXml(o, a), line: lineXml(o.stroke, sw, { dash, alpha: a }), effects: effectsXml(o, k), txBody: label() });
    case 'shape': {
      const open = OPEN_SHAPES.has(o.kind);
      let geom;
      if (o.kind === 'pill') geom = prstGeom('roundRect', 50000);
      else if (o.kind === 'triangle') geom = prstGeom('triangle');
      else if (o.kind === 'diamond') geom = prstGeom('diamond');
      else if (o.kind === 'cycle') { // the arc is the outline; its heads are a filled second path in the same shape
        const cg = cycleGeometry(o, o.w, o.h), paths = [{ xml: segsToPathXml(parseSvgPath(cg.arc), T.sx, T.sy), fill: false }];
        if (cg.heads) paths.push({ xml: segsToPathXml(parseSvgPath(cg.heads), T.sx, T.sy), stroke: false });
        const stroke = o.stroke || '#333333';
        return spXml(id, name, { ...common, geom: custGeomXml(paths, box.w, box.h, { sites: false }), fill: solidFill(stroke, a), line: lineXml(stroke, sw, { dash, alpha: a, cap: 'flat' }), effects: effectsXml(o, k), txBody: label() });
      } else geom = custGeomXml([{ xml: segsToPathXml(parseSvgPath(shapePath(o.kind, o.w, o.h, o)), T.sx, T.sy), fill: !open }], box.w, box.h);
      const line = lineXml(o.stroke || (open ? '#333333' : null), sw, { dash, alpha: a });
      return spXml(id, name, { ...common, geom, fill: open ? '<a:noFill/>' : fillXml(o, a), line, effects: effectsXml(o, k), txBody: label() });
    }
    case 'path': {
      const segs = parseSvgPath(nodesToD(scaledNodes(o), o.closed));
      const geom = custGeomXml([{ xml: segsToPathXml(segs, T.sx, T.sy), fill: !!o.closed }], box.w, box.h);
      const line = lineXml(o.stroke, sw, { dash, alpha: a * (o.strokeOpacity ?? 1), head: o.closed ? null : o.headEnd, tail: o.closed ? null : o.headStart, cap: o.cap === 'butt' ? 'flat' : o.cap === 'square' ? 'sq' : 'rnd' });
      return spXml(id, name, { ...common, geom, fill: o.closed ? fillXml(o, a) : '<a:noFill/>', line, effects: effectsXml(o, k) });
    }
    case 'text': {
      const pad = o.bg ? [4, 2] : [0, 0];
      const b = slideBox(T, o.x - pad[0], o.y - pad[1], o.w + 2 * pad[0], o.h + 2 * pad[1]);
      const ins = [2 * k + pad[0] * T.sx, pad[1] * T.sy, 2 * k + pad[0] * T.sx, pad[1] * T.sy];
      const paras = paragraphsXml(displayText(o), { fontPx: o.fontSize * k, color: o.color, family: o.family, bold: o.bold, italic: o.italic, underline: o.underline, strike: o.strike, align: o.align, alpha: a });
      return spXml(id, name, { ...common, box: b, geom: o.bg ? prstGeom('roundRect', (4 / Math.min(b.w, b.h)) * 100000) : prstGeom('rect'), fill: solidFill(o.bg, a), line: '<a:ln><a:noFill/></a:ln>', effects: effectsXml(o, k), txBody: txBodyXml(paras, { insets: ins }), txBox: !o.bg });
    }
    case 'table': return tableXml(o, T, id, name, a);
    case 'image': return imageXml(o, T, ctx, id, name, a);
    case 'group': {
      const sx = o.w / (o.w0 || o.w), sy = o.h / (o.h0 || o.h);
      const inner = { ox: box.x, oy: box.y, sx: T.sx * sx, sy: T.sy * sy };
      const kids = await objectsXml(o.children || [], inner, ctx, a);
      const xf = xfrmXml(box, { rot: o.rot, flipH: !!o.flipX, flipV: !!o.flipY });
      const grpXfrm = xf.replace('</a:xfrm>', `<a:chOff x="${emu(box.x)}" y="${emu(box.y)}"/><a:chExt cx="${Math.max(0, emu(box.w))}" cy="${Math.max(0, emu(box.h))}"/></a:xfrm>`);
      return `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr>${grpXfrm}</p:grpSpPr>${kids}</p:grpSp>`;
    }
    case 'connector': return connectorXml(o, objects, T, id, name, a, ids, ctx);
  }
  return '';
}

function connectorXml(o, objects, T, id, name, alpha, ids, ctx) {
  if (o.style === 'zoom') return zoomWedgeXml(o, objects, T, id, name, alpha);
  const k = slideK(T);
  const [la, lb] = connectorEnds(o, objects);
  const a = slidePt(T, la), b = slidePt(T, lb);
  const color = o.color || '#333333', sw = (o.width || 2) * k, dash = o.dashStyle || (o.dash ? 'dashed' : 'solid');
  const glueable = (end) => {
    const t = end && end.id ? objects.find((x) => x.id === end.id) : null;
    return t && !t.hidden && ids.has(t.id) && nativeKind(t) !== 'group' && nativeKind(t) !== 'table' ? t : null;
  };
  const bar = o.head === 'bar' || o.tail === 'bar';
  let shape = '', mid;
  if (!bar && (o.style === 'elbow' || !connectorControl(o, la, lb))) {
    // A real PowerPoint connector, glued to the objects it joins: it follows them when they move.
    let prst, frame, adj = '';
    if (o.style === 'elbow') {
      const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
      const endH = o.to.port ? 'ew'.includes(o.to.port) : startH;
      prst = startH === endH ? 'bentConnector3' : 'bentConnector2';
      frame = connectorFrame(a, b, !startH);
      if (prst === 'bentConnector3') adj = `<a:gd name="adj1" fmla="val ${Math.round((o.bend ?? 0.5) * 100000)}"/>`;
      const bt = o.bend ?? 0.5;
      mid = startH === endH ? (startH ? { x: a.x + (b.x - a.x) * bt, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: a.y + (b.y - a.y) * bt }) : startH ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    } else { prst = 'straightConnector1'; frame = connectorFrame(a, b, false); mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    const ta = glueable(o.from), tb = glueable(o.to);
    const glue = (ta ? `<a:stCxn id="${ids.get(ta.id)}" idx="${siteIndex(ta, o.from.port, la)}"/>` : '') + (tb ? `<a:endCxn id="${ids.get(tb.id)}" idx="${siteIndex(tb, o.to.port, lb)}"/>` : '');
    shape = `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvCxnSpPr>${glue}</p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrmXml(frame.box, frame)}<a:prstGeom prst="${prst}"><a:avLst>${adj}</a:avLst></a:prstGeom>${lineXml(color, sw, { dash, alpha, head: o.head, tail: o.tail })}</p:spPr></p:cxnSp>`;
  } else {
    // Curved, or ending in an inhibition bar: a freeform line (bars are drawn as a second stroke).
    const cpL = connectorControl(o, la, lb), cp = cpL ? slidePt(T, cpL) : null;
    let pts, segs;
    if (o.style === 'elbow') {
      const startH = o.from.port ? 'ew'.includes(o.from.port) : Math.abs(b.x - a.x) >= Math.abs(b.y - a.y), endH = o.to.port ? 'ew'.includes(o.to.port) : startH, bt = o.bend ?? 0.5;
      let c1, c2;
      if (startH && endH) { const mx = a.x + (b.x - a.x) * bt; c1 = { x: mx, y: a.y }; c2 = { x: mx, y: b.y }; }
      else if (!startH && !endH) { const my = a.y + (b.y - a.y) * bt; c1 = { x: a.x, y: my }; c2 = { x: b.x, y: my }; }
      else if (startH) c1 = c2 = { x: b.x, y: a.y };
      else c1 = c2 = { x: a.x, y: b.y };
      pts = [a, c1, c2, b]; segs = [{ t: 'M', p: [a.x, a.y] }, { t: 'L', p: [c1.x, c1.y] }, { t: 'L', p: [c2.x, c2.y] }, { t: 'L', p: [b.x, b.y] }];
      mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
    } else if (cp) {
      pts = [a, cp, b]; segs = [{ t: 'M', p: [a.x, a.y] }, { t: 'Q', p: [cp.x, cp.y, b.x, b.y] }];
      mid = { x: 0.25 * a.x + 0.5 * cp.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cp.y + 0.25 * b.y };
    } else {
      pts = [a, b]; segs = [{ t: 'M', p: [a.x, a.y] }, { t: 'L', p: [b.x, b.y] }];
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    const bars = [];
    const barAt = (tip, from) => {
      const ang = Math.atan2(tip.y - from.y, tip.x - from.x), s = 6 + sw * 2.2, nx = -Math.sin(ang) * s, ny = Math.cos(ang) * s;
      bars.push({ t: 'M', p: [tip.x - nx, tip.y - ny] }, { t: 'L', p: [tip.x + nx, tip.y + ny] });
      pts.push({ x: tip.x - nx, y: tip.y - ny }, { x: tip.x + nx, y: tip.y + ny });
    };
    if (o.head === 'bar') barAt(b, cp || pts[pts.length - 2]);
    if (o.tail === 'bar') barAt(a, cp || pts[1]);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const bx = { x: Math.min(...xs), y: Math.min(...ys) };
    bx.w = Math.max(...xs) - bx.x; bx.h = Math.max(...ys) - bx.y;
    const rel = (ss) => ss.map((s) => (s.p ? { t: s.t, p: s.p.map((v, i) => v - (i % 2 ? bx.y : bx.x)) } : s));
    const paths = [{ xml: segsToPathXml(rel(segs), 1, 1), fill: false }];
    if (bars.length) paths.push({ xml: segsToPathXml(rel(bars), 1, 1), fill: false });
    const line = lineXml(color, sw, { dash, alpha, head: o.head === 'bar' ? null : o.head, tail: o.tail === 'bar' ? null : o.tail });
    shape = spXml(id, name, { box: bx, geom: custGeomXml(paths, bx.w, bx.h, { sites: false }), fill: '<a:noFill/>', line });
  }
  if (o.label) {
    const fs = (o.labelSize || 13) * k, m = measureText(o.label, o.labelSize || 13, 'sans', false, o.labelItalic);
    const w = (m.w + 6) * k, h = m.h * k;
    const paras = paragraphsXml(o.label, { fontPx: fs, color, italic: o.labelItalic, align: 'center', alpha });
    shape += spXml(ctx.nextId++, `${name} label`, { box: { x: mid.x - w / 2, y: mid.y - h / 2, w, h }, geom: prstGeom('roundRect', (3 / Math.min(w, h)) * 100000), fill: solidFill('#ffffff', 0.9 * alpha), line: '<a:ln><a:noFill/></a:ln>', txBody: txBodyXml(paras, { anchor: 'ctr' }) });
  }
  return shape;
}

function tableXml(o, T, id, name, alpha) {
  const k = slideK(T), box = slideBox(T, o.x, o.y, o.w, o.h);
  const R = o.rows, C = o.cols, fs = (o.fontSize || 13) * k, bw = (o.borderWidth ?? 1) * k;
  const widths = o.colW && o.colW.length === C ? o.colW : Array(C).fill(1 / C);
  const heights = o.rowH && o.rowH.length === R ? o.rowH : Array(R).fill(1 / R);
  const border = bw > 0 ? (tag) => `<a:${tag} w="${emu(bw)}">${solidFill(o.border || '#9aa5b4', alpha)}</a:${tag}>` : (tag) => `<a:${tag} w="0"><a:noFill/></a:${tag}>`;
  let rows = '';
  for (let r = 0; r < R; r++) {
    let cells = '';
    for (let c = 0; c < C; c++) {
      const head = o.header && r === 0;
      const fill = (o.cellFill && o.cellFill[r] && o.cellFill[r][c]) || (head ? o.headerFill || '#23395d' : o.stripe && r % 2 === (o.header ? 0 : 1) ? o.stripeFill || '#f1f4f9' : o.fill || '#ffffff');
      const txt = (o.cells[r] && o.cells[r][c]) || '';
      const paras = paragraphsXml(txt, { fontPx: fs, color: head ? o.headerColor || '#ffffff' : o.color || '#222222', bold: head, family: o.family, align: o.align || 'center', alpha });
      cells += `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${paras}</a:txBody><a:tcPr marL="${emu(3 * k)}" marR="${emu(3 * k)}" marT="${emu(1 * k)}" marB="${emu(1 * k)}" anchor="ctr">${border('lnL')}${border('lnR')}${border('lnT')}${border('lnB')}${solidFill(fill, alpha)}</a:tcPr></a:tc>`;
    }
    rows += `<a:tr h="${emu(heights[r] * box.h)}">${cells}</a:tr>`;
  }
  const grid = widths.map((f) => `<a:gridCol w="${emu(f * box.w)}"/>`).join('');
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>${xfrmXml(box, { tag: 'p:xfrm' })}<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr${o.header ? ' firstRow="1"' : ''}/><a:tblGrid>${grid}</a:tblGrid>${rows}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
}

function addMedia(ctx, dataUrl, ext) {
  const n = ctx.media.length + 1, rid = `rIdSc${n}`, file = `sc-s${ctx.slideNo}-${n}.${ext}`;
  const m = String(dataUrl).match(/^data:[^,]*?(;base64)?,(.*)$/s);
  const data = m ? (m[1] ? m[2] : btoa(unescape(encodeURIComponent(decodeURIComponent(m[2]))))) : '';
  ctx.media.push({ rid, file, data });
  return rid;
}
function picXml(id, name, { box, rot, flipH, flipV, rid, svgRid, alpha = 1, srcRect = '', geom = prstGeom('rect'), line = '', effects = '' }) {
  const blipExt = svgRid ? `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${svgRid}"/></a:ext></a:extLst>` : '';
  return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${xmlEsc(name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}">${alpha < 0.999 ? `<a:alphaModFix amt="${Math.round(alpha * 100000)}"/>` : ''}${blipExt}</a:blip>${srcRect}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrmXml(box, { rot, flipH, flipV })}${geom}${line}${effects}</p:spPr></p:pic>`;
}
const IMG_EXT = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/gif': 'gif' };
async function imageXml(o, T, ctx, id, name, alpha) {
  const mime = (o.src.match(/^data:([^;,]+)/) || [])[1];
  if (!IMG_EXT[mime]) return pictureXml(o, [o], T, ctx, id, name, alpha);
  const k = slideK(T), c = o.crop, rid = addMedia(ctx, o.src, IMG_EXT[mime]);
  const srcRect = c && (c.l || c.t || c.r || c.b) ? `<a:srcRect l="${Math.round((c.l || 0) * 100000)}" t="${Math.round((c.t || 0) * 100000)}" r="${Math.round((c.r || 0) * 100000)}" b="${Math.round((c.b || 0) * 100000)}"/>` : '';
  const geom = o.clip === 'ellipse' ? prstGeom('ellipse') : o.clip === 'round' || o.clip === 'rounded' ? prstGeom('roundRect', 12000) : prstGeom('rect');
  const line = o.clip && o.clip !== 'none' && o.clipStroke ? lineXml(o.clipStroke, (o.clipStrokeWidth || 3) * k) : '';
  return picXml(id, name, { box: slideBox(T, o.x, o.y, o.w, o.h), rot: o.rot, flipH: !!o.flipX, flipV: !!o.flipY, rid, alpha, srcRect, geom, line, effects: effectsXml(o, k) });
}

// Nested <svg width height viewBox> elements (icons) → <g transform>, which Office's SVG renderer handles reliably.
function flattenNestedSvg(s) {
  const open = /<svg\b([^>]*)>/g;
  let out = s, guard = 0;
  for (;;) {
    open.lastIndex = out.indexOf('>') + 1; // skip the outer <svg>
    const m = open.exec(out);
    if (!m || guard++ > 5000) return out;
    const attr = (n) => { const r = m[1].match(new RegExp(`\\s${n}="([^"]*)"`)); return r ? r[1] : null; };
    const w = parseFloat(attr('width')), h = parseFloat(attr('height')), vb = (attr('viewBox') || '').split(/[\s,]+/).map(parseFloat);
    let depth = 1, i = m.index + m[0].length;
    const tag = /<svg\b|<\/svg>/g;
    tag.lastIndex = i;
    let t, end = -1;
    while ((t = tag.exec(out))) { depth += t[0] === '</svg>' ? -1 : 1; if (!depth) { end = t.index; break; } }
    if (end < 0) return out;
    let g = '<g>';
    if (vb.length === 4 && w && h && vb[2] && vb[3]) {
      const clip = attr('overflow') === 'visible' ? '' : (() => { const cid = `fl${guard}`; return `<defs><clipPath id="${cid}"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}"/></clipPath></defs>`; })();
      g = `<g transform="scale(${w / vb[2]} ${h / vb[3]}) translate(${-vb[0]} ${-vb[1]})"${clip ? ` clip-path="url(#fl${guard})"` : ''}>${clip}`;
    }
    out = out.slice(0, m.index) + g + out.slice(i, end) + '</g>' + out.slice(end + 6);
  }
}
// Anything without a native equivalent: an SVG picture (PNG fallback), or PNG only when it uses SVG features Office
// can't draw (filters, masks, text on a path, blend modes).
const PICTURE_KIND = { icon: 'icons', brush: 'brushes', chart: 'charts', protocol: 'protocol strips', text: 'curved text', image: 'images with scale bars or masks', path: 'tube / blurred paths' };
async function pictureXml(o, objects, T, ctx, id, name, alpha) {
  const k = slideK(T);
  const pad = Math.max(6, (o.size || 0) * 1.5, (o.strokeWidth || 0) * 2, o.type === 'icon' ? Math.max(o.w, o.h) * 0.08 : 0);
  const solo = { ...o, x: pad, y: pad, rot: 0, flipX: false, flipY: false, opacity: 1, shadow: null, glow: null, link: null };
  const mini = { width: o.w + 2 * pad, height: o.h + 2 * pad, background: '#ffffff', objects: [solo] };
  const box = slideBox(T, o.x - pad, o.y - pad, o.w + 2 * pad, o.h + 2 * pad);
  const label = PICTURE_KIND[o.type] || (o.type === 'group' ? 'masked groups' : `${o.type} objects`);
  ctx.pictures[label] = (ctx.pictures[label] || 0) + 1;
  let svg = pageSvgString(mini, { transparent: true });
  const officeSafe = !/<filter|<mask|<textPath|mix-blend|<foreignObject/.test(svg);
  const scale = Math.max(1, Math.min(4, 2400 / Math.max(box.w, box.h))) * Math.max(1, k);
  const png = ctx.rasterize ? await ctx.rasterize(mini, scale) : null;
  let svgRid = null, rid;
  if (officeSafe) {
    svg = flattenNestedSvg(svg).replace(/<(image|use|textPath)\b([^>]*?)\shref=/g, '<$1$2 xlink:href=');
    svgRid = addMedia(ctx, 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))), 'svg');
  }
  if (png) rid = addMedia(ctx, png, 'png');
  else if (svgRid) rid = svgRid; // no rasteriser (tests): the SVG is the only image
  else return '';
  return picXml(id, name, { box, rot: o.rot, flipH: !!o.flipX, flipV: !!o.flipY, rid, svgRid: png ? svgRid : null, alpha, effects: effectsXml(o, k) });
}

// The whole deck. editable=false keeps the old behaviour: one high-resolution picture per page.
// deps: { PptxGenJS, JSZip, rasterizePage(page, scale) → PNG data URL, rasterizeObject(miniPage, scale) → PNG data URL }
async function buildPptx(pages, { editable = true, PptxGenJS: Pptx, JSZip: Zip, rasterizePage, rasterizeObject } = {}) {
  const pptx = new Pptx();
  const first = pages[0];
  const W = first.width / 96, H = first.height / 96;
  pptx.defineLayout({ name: 'SCI', width: W, height: H });
  pptx.layout = 'SCI';
  const frames = [];
  for (const pg of pages) {
    const k = Math.min(first.width / pg.width, first.height / pg.height);
    const T = { ox: (first.width - pg.width * k) / 2, oy: (first.height - pg.height * k) / 2, sx: k, sy: k };
    frames.push(T);
    const slide = pptx.addSlide();
    slide.background = { color: (pptColor(pg.background) || { hex: 'FFFFFF' }).hex };
    if (!editable) {
      const img = await rasterizePage(pg, maxScale(pg, 300 / 96));
      slide.addImage({ data: img, x: T.ox / 96, y: T.oy / 96, w: (pg.width * k) / 96, h: (pg.height * k) / 96 });
    }
    const notes = [pg.notes || '', ...(pg.comments || []).filter((c) => !c.resolved && c.text).map((c) => `${c.author}: ${c.text}`)].filter(Boolean).join('\n');
    if (notes) slide.addNotes(notes);
  }
  const pictures = {};
  if (!editable) return { base64: await pptx.write({ outputType: 'base64' }), pictures };
  const zip = await Zip.loadAsync(await pptx.write({ outputType: 'arraybuffer' }));
  for (let i = 0; i < pages.length; i++) {
    const ctx = { nextId: 2, media: [], slideNo: i + 1, pictures, rasterize: rasterizeObject };
    const shapes = await objectsXml(pages[i].objects, frames[i], ctx);
    const path = `ppt/slides/slide${i + 1}.xml`, relPath = `ppt/slides/_rels/slide${i + 1}.xml.rels`;
    let xml = await zip.file(path).async('string');
    xml = xml.replace(/(<p:spTree>[\s\S]*?<\/p:grpSpPr>)[\s\S]*?(<\/p:spTree>)/, (m, head, tail) => head + shapes.replace(/\$/g, '$$$$') + tail);
    zip.file(path, xml);
    if (ctx.media.length) {
      let rels = await zip.file(relPath).async('string');
      rels = rels.replace('</Relationships>', ctx.media.map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${m.file}"/>`).join('') + '</Relationships>');
      zip.file(relPath, rels);
      for (const m of ctx.media) zip.file(`ppt/media/${m.file}`, m.data, { base64: true });
    }
  }
  let types = await zip.file('[Content_Types].xml').async('string');
  for (const [ext, ct] of [['png', 'image/png'], ['jpeg', 'image/jpeg'], ['gif', 'image/gif'], ['svg', 'image/svg+xml']]) {
    if (!types.includes(`Extension="${ext}"`)) types = types.replace('<Default ', `<Default Extension="${ext}" ContentType="${ct}"/><Default `);
  }
  zip.file('[Content_Types].xml', types);
  return { base64: await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' }), pictures };
}
