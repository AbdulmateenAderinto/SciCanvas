// Refined icon kit (v1.2): the drawing kit behind the "Refined · …" icon categories (refined1–4.js).
// The look follows professional scientific illustration: soft pastel fills, a thin outline in a darker tone of the
// same hue, a gentle highlight towards the top-left and shade towards the bottom-right, fine texture speckles,
// translucent glass, and lab instruments in light greys seen slightly from above. No gradients or filters, so icons
// stay recolourable per layer and export cleanly to SVG, PDF and PowerPoint. Every icon is built from named parts
// (<g data-part="…">) so a part can be recoloured on its own or split off after ungrouping.
(() => {
  const SW = 1.2; // outline width in a 100-unit icon
  const f = (n) => Math.round(n * 10) / 10;
  const K = globalThis.SoftKit || {};
  const rng = K.rng, hash = K.hash, cr = K.cr;

  // ---------- Colour ----------
  const line = (c) => { // outline: a darker tone of the same hue (pale colours get a blue-grey edge)
    const [r, g, b] = Color.hexToRgb(c), lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.88 ? Color.mix(c, '#7f97a8', 0.45) : D(c, 0.26);
  };
  const tone = { hi: (c, t = 0.32) => L(c, t), lo: (c, t = 0.12) => D(c, t) };
  const PAL = {
    plastic: '#eef1f3', plasticSide: '#d5dbe0', plasticDark: '#b9c1c8', steel: '#c3cad1', dark: '#3c4148', darker: '#2a2e33',
    screen: '#26365f', screenHi: '#4d74c9', glass: '#e6f2f6', glassLine: '#93acb8', liquid: '#f2cf6b', agar: '#f3e2a6',
    red: '#e36d6d', pink: '#e98bb0', blue: '#5b8fd6', sky: '#9fcbea', teal: '#3fa5a0', green: '#6bb36b', mint: '#9bd8c2',
    purple: '#9a79c9', lilac: '#c9b6e4', orange: '#ef9a4f', yellow: '#f2c94c', brown: '#a8714f', tan: '#dcb48a',
    skin: '#f3c9b1', brain: '#eab0ae', vessel: '#d0454c', vein: '#4b63b5', nerve: '#e8a93c', grey: '#9aa5ae', gold: '#e6b422',
  };

  // ---------- Primitives ----------
  const st = (c, o) => `fill="${o.fill || c}" stroke="${o.stroke || line(c)}" stroke-width="${o.w ?? SW}" stroke-linejoin="round" stroke-linecap="round"${o.op != null ? ` opacity="${o.op}"` : ''}${o.tf ? ` transform="${o.tf}"` : ''}`;
  const path = (d, c, o = {}) => `<path d="${d}" ${st(c, o)}/>`;
  const rect = (x, y, w, h, r, c, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" ${st(c, o)}/>`;
  const circ = (cx, cy, r, c, o = {}) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" ${st(c, o)}/>`;
  const ell = (cx, cy, rx, ry, c, o = {}) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" ${st(c, { ...o, tf: o.rot ? `rotate(${f(o.rot)} ${f(cx)} ${f(cy)})` : o.tf })}/>`;
  const stroke = (d, c, w = SW, o = {}) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="${o.cap || 'round'}" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
  const flat = (d, c, op) => `<path d="${d}" fill="${c}"${op != null ? ` opacity="${op}"` : ''}/>`; // no outline
  const dot = (cx, cy, r, c, op) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${c}"${op != null ? ` opacity="${op}"` : ''}/>`;
  const text = (x, y, s, size, c, o = {}) => `<text x="${f(x)}" y="${f(y)}" text-anchor="${o.anchor || 'middle'}" font-family="Roboto, Helvetica, Arial" font-weight="${o.weight || 500}" font-size="${size}" fill="${c}">${s}</text>`;
  const part = (name, svg) => `<g data-part="${name}">${svg}</g>`;
  const G = (svg, tf) => `<g transform="${tf}">${svg}</g>`;
  const poly = (pts, closed = true) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}${closed ? ' Z' : ''}`;
  const smooth = (pts, closed = true) => cr(pts, closed);
  const ellD = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
  const rrD = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} H${f(x + w - r)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} V${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} H${f(x + r)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} V${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
  // Scale a list of points about a centre (used for the inner highlight of a blob).
  const scalePts = (pts, k, cx, cy, dx = 0, dy = 0) => pts.map(([x, y]) => [cx + (x - cx) * k + dx, cy + (y - cy) * k + dy]);
  const centroid = (pts) => pts.reduce((a, [x, y]) => [a[0] + x / pts.length, a[1] + y / pts.length], [0, 0]);

  // Organic outline points (smooth, seeded): rx/ry radii, amp = wobble, n = points, mod = extra modulation.
  function wob(cx, cy, rx, ry, r, { amp = 0.06, n = 30, rot = 0, mod } = {}) {
    const pts = [], ph = r() * 6.3, p2 = r() * 6.3, p3 = r() * 6.3, p5 = r() * 6.3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ph;
      const k = 1 + amp * (Math.sin(2 * a + p2) * 0.8 + Math.sin(3 * a + p3) * 0.5 + Math.sin(5 * a + p5) * 0.25) + (mod ? mod(a) : 0);
      const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k, t = (rot * Math.PI) / 180;
      pts.push([cx + x * Math.cos(t) - y * Math.sin(t), cy + x * Math.sin(t) + y * Math.cos(t)]);
    }
    return pts;
  }
  // A soft-shaded body: base fill + outline, then a lighter inner copy offset up-left (reads as gentle volume).
  function body(pts, c, o = {}) {
    const [cx, cy] = centroid(pts), d = smooth(pts);
    let s = path(d, c, o);
    if (o.flat) return s;
    s += flat(smooth(scalePts(pts, o.k ?? 0.86, cx, cy, -(o.off ?? 2.2), -(o.off ?? 2.2))), tone.hi(c, o.hi ?? 0.22));
    return s;
  }
  const blobShape = (cx, cy, rx, ry, c, r, o = {}) => body(wob(cx, cy, rx, ry, r, o), c, o);
  // Shaded ellipse (cell bodies, nuclei, beads).
  const sball = (cx, cy, rx, ry, c, o = {}) => ell(cx, cy, rx, ry, c, o) + (o.flat ? '' : ell(cx - rx * 0.1, cy - ry * 0.12, rx * 0.84, ry * 0.8, tone.hi(c, o.hi ?? 0.22), { stroke: 'none', w: 0, rot: o.rot }))
    + (o.shine ? ell(cx - rx * 0.38, cy - ry * 0.45, rx * 0.22, ry * 0.12, '#ffffff', { stroke: 'none', w: 0, op: 0.55, rot: -30 }) : '');
  // Speckles (cytoplasm granules, scaffold pores, agar texture) scattered inside an ellipse.
  function speckle(cx, cy, rx, ry, n, c, r, o = {}) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.88;
      s += dot(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (o.min ?? 0.6) + r() * ((o.max ?? 1.4) - (o.min ?? 0.6)), c, o.op ?? 0.55);
    }
    return s;
  }
  // Glass vessel: translucent fill, blue-grey edge, white highlight streak along the left.
  const glass = (d, o = {}) => path(d, PAL.glass, { stroke: PAL.glassLine, op: o.op ?? 0.75, w: o.w });
  const glint = (x, y1, y2, w = 2.4) => stroke(`M${f(x)} ${f(y1)} V${f(y2)}`, '#ffffff', w, { op: 0.8 });
  // Plastic / instrument panel with top face for a slight 3/4 view.
  function box3(x, y, w, h, depth, c = PAL.plastic, o = {}) {
    const dx = depth * 0.55, dy = depth * 0.45, side = o.side || D(c, 0.1), topc = o.top || L(c, 0.35);
    return path(poly([[x, y], [x + dx, y - dy], [x + w + dx, y - dy], [x + w, y]]), topc, { stroke: o.line || line(c) })
      + path(poly([[x + w, y], [x + w + dx, y - dy], [x + w + dx, y + h - dy], [x + w, y + h]]), side, { stroke: o.line || line(c) })
      + rect(x, y, w, h, o.r ?? 1.5, c, { stroke: o.line || line(c) });
  }
  // Screen with a soft reflection.
  const screen = (x, y, w, h, o = {}) => rect(x, y, w, h, o.r ?? 1.5, o.c || PAL.screen, { stroke: PAL.darker }) + flat(poly([[x + w * 0.55, y + 0.8], [x + w - 0.8, y + 0.8], [x + w - 0.8, y + h * 0.55]]), '#ffffff', 0.12);
  const button = (cx, cy, r, c = PAL.plasticSide) => circ(cx, cy, r, c, { w: 0.8 });
  // Well plate seen from above at a slight angle: rows × cols wells, with optional per-well colours.
  function plate(x, y, w, h, rows, cols, o = {}) {
    const skew = o.skew ?? 0, wellC = o.well || '#ffffff';
    let s = path(poly([[x + skew, y], [x + w + skew, y], [x + w, y + h], [x, y + h]]), o.c || '#e9f1f4', { stroke: PAL.glassLine });
    s += path(poly([[x, y + h], [x + w, y + h], [x + w, y + h + 3], [x, y + h + 3]]), D(o.c || '#e9f1f4', 0.08), { stroke: PAL.glassLine });
    const px = (w - 8) / cols, py = (h - 8) / rows, rad = Math.min(px, py) * (o.fill ?? 0.38);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const t = (i + 0.5) / rows, wx = x + 4 + px * (j + 0.5) + skew * (1 - t), wy = y + 4 + py * (i + 0.5);
      const wc = typeof wellC === 'function' ? wellC(i, j) : wellC;
      s += circ(wx, wy, rad, wc, { stroke: line(wc === '#ffffff' ? '#cfe3ea' : wc), w: 0.6 });
      if (rad > 2.5) s += dot(wx - rad * 0.3, wy - rad * 0.3, rad * 0.3, '#ffffff', 0.45);
    }
    return s;
  }
  // Double helix (two strands + base-pair rungs) between x0 and x1 around y.
  function helix(x0, x1, y, amp, turns, c1, c2, o = {}) {
    const n = Math.round(turns * 16), a = [], b = [];
    let rungs = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, ph = t * turns * Math.PI * 2;
      a.push([x, y + amp * Math.sin(ph)]); b.push([x, y - amp * Math.sin(ph)]);
      if (o.rungs !== false && i % 2 === 1) rungs += stroke(`M${f(x)} ${f(y + amp * Math.sin(ph) * 0.85)} V${f(y - amp * Math.sin(ph) * 0.85)}`, o.rungC ? o.rungC(i) : '#c5ced6', o.rw ?? 1.4);
    }
    const w = o.w ?? 3;
    return rungs + stroke(smooth(b, false), line(c2), w + 1.2) + stroke(smooth(b, false), c2, w) + stroke(smooth(a, false), line(c1), w + 1.2) + stroke(smooth(a, false), c1, w);
  }
  // Wavy single strand (RNA, polymer, flagellum).
  function wave(x0, y0, x1, y1, amp, waves, c, w = 2, o = {}) {
    const n = Math.max(12, Math.round(waves * 12)), pts = [], dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    for (let i = 0; i <= n; i++) { const t = i / n, s = Math.sin(t * waves * Math.PI * 2) * amp * (o.taper ? 1 - t * 0.6 : 1); pts.push([x0 + dx * t + nx * s, y0 + dy * t + ny * s]); }
    return (o.outline ? stroke(smooth(pts, false), line(c), w + 1.2) : '') + stroke(smooth(pts, false), c, w);
  }
  // Thick outlined tube along points (protein chains, vessels, nerves).
  const tube = (pts, w, c, o = {}) => stroke(smooth(pts, false), o.edge || line(c), w + (o.ow ?? SW) * 2) + stroke(smooth(pts, false), c, w) + (o.hi === false ? '' : stroke(smooth(pts, false), tone.hi(c, 0.25), w * 0.35, { op: 0.8 }));
  // Branching tree (dendrites, vessels): returns list of segments.
  function branches(x, y, ang, len, depth, r, spread = 0.5, shrink = 0.72) {
    if (depth === 0 || len < 1.5) return [];
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len, out = [{ pts: [[x, y], [x2, y2]], depth }];
    for (const sgn of [-1, 1]) out.push(...branches(x2, y2, ang + sgn * spread * (0.6 + r() * 0.8), len * shrink * (0.8 + r() * 0.4), depth - 1, r, spread, shrink));
    return out;
  }
  const tree = (segs, c, w0 = 3, o = {}) => segs.map(({ pts, depth }) => stroke(poly(pts, false), c, Math.max(0.6, w0 * (depth / (o.depth || 5))), { op: o.op })).join('');
  // Lipid bilayer ring of heads (micelle / liposome / outer membrane).
  function headRing(cx, cy, rad, n, head, tail, o = {}) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), tl = o.tail ?? 7, dir = o.inward === false ? 1 : -1;
      s += stroke(`M${f(cx + ca * rad)} ${f(cy + sa * rad)} l${f(ca * tl * dir)} ${f(sa * tl * dir)}`, tail, o.tw ?? 1);
      if (o.double) s += stroke(`M${f(cx + Math.cos(a + 0.05) * rad)} ${f(cy + Math.sin(a + 0.05) * rad)} l${f(ca * tl * dir)} ${f(sa * tl * dir)}`, tail, o.tw ?? 1);
    }
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; s += circ(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, o.hr ?? 2.4, head, { w: 0.6 }); }
    return s;
  }

  // ---------- Registration ----------
  const used = new Set(ICONS.map((i) => i.id));
  const slug = (s) => { let id = 'r-' + s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, ''); while (used.has(id)) id += '-2'; used.add(id); return id; };
  // add(name, cat, tags, colour, [w, h], draw(c, r)) — `c` is the recolourable main colour, `r` a seeded random.
  function add(name, cat, tags, color, vb, draw) {
    const seed = hash(name), id = slug(name);
    const icon = { id, name, cat: `Refined · ${cat}`, tags: `${tags} refined`, color, vb, refined: true, draw: (c) => draw(c || color, rng(seed)) };
    ICONS.push(icon);
    ICON_MAP[id] = icon;
    return icon;
  }

  globalThis.RefinedKit = {
    SW, f, PAL, line, tone, rng, hash, path, rect, circ, ell, stroke, flat, dot, text, part, G, poly, smooth, ellD, rrD, scalePts, centroid,
    wob, body, blobShape, sball, speckle, glass, glint, box3, screen, button, plate, helix, wave, tube, branches, tree, headRing, add,
  };
})();
