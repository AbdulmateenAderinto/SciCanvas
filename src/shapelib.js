// Shapes & lines library (v1.3): a browsable Shapes tab (basic shapes, polygons and stars, block arrows, callouts and
// banners, flowchart, 3D, brackets) with adjustable geometry (star points, polygon sides, trapezoid slant, ring
// thickness, callout tail…), ready-made line styles for the connector tool (activation, inhibition, binding, dashed,
// curved, elbow…), and right-click tool menus: a Tools / Insert shape / Line style menu on the canvas and
// Photoshop-style variant flyouts on the toolbar buttons.
(() => {
  const f = (n) => Math.round(n * 100) / 100;
  const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L') + ' Z';
  // Scale points so their bounding box fills w × h.
  const fit = (pts, w, h) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), y0 = Math.min(...ys), sx = w / (Math.max(...xs) - x0 || 1), sy = h / (Math.max(...ys) - y0 || 1);
    return pts.map(([x, y]) => [(x - x0) * sx, (y - y0) * sy]);
  };
  const regular = (n, rot) => Array.from({ length: n }, (_, i) => { const a = ((rot + (i * 360) / n) * Math.PI) / 180; return [Math.cos(a), Math.sin(a)]; });
  const ellArc = (cx, cy, rx, ry, a0, a1) => { // SVG arc from angle a0 to a1 (degrees, clockwise on screen)
    const p = (a) => [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)], [x0, y0] = p(a0), [x1, y1] = p(a1);
    return { start: `${f(x0)} ${f(y0)}`, arc: `A${f(rx)} ${f(ry)} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${f(x1)} ${f(y1)}` };
  };
  const v = (o, k, d) => (o && o[k] != null ? +o[k] : d);

  // ---------- Shape geometry ----------
  // params: [key, label, min, max, step, default]. Defaults of the existing kinds reproduce their old geometry.
  const DEFS = {
    star: { params: [['points', 'Points', 3, 24, 1, 5], ['inner', 'Inner radius', 0.1, 0.95, 0.01, 0.4]], path: (w, h, o) => {
      const n = v(o, 'points', 5), r0 = v(o, 'inner', 0.4); let d = '';
      for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r0 : 1, a = -Math.PI / 2 + (i * Math.PI) / n; d += `${i ? 'L' : 'M'}${f(w / 2 + (Math.cos(a) * r * w) / 2)} ${f(h / 2 + (Math.sin(a) * r * h) / 2)} `; }
      return d + 'Z'; } },
    hexagon: { params: [['inset', 'Corner cut', 0, 0.5, 0.01, 0.25]], path: (w, h, o) => { const k = v(o, 'inset', 0.25); return poly([[w * k, 0], [w * (1 - k), 0], [w, h / 2], [w * (1 - k), h], [w * k, h], [0, h / 2]]); } },
    arrow: { params: [['head', 'Head length', 0.1, 0.9, 0.01, 0.35], ['shaft', 'Shaft thickness', 0.1, 1, 0.01, 0.4]], path: (w, h, o) => { const hx = w * (1 - v(o, 'head', 0.35)), t = (1 - v(o, 'shaft', 0.4)) / 2; return poly([[0, h * t], [hx, h * t], [hx, 0], [w, h / 2], [hx, h], [hx, h * (1 - t)], [0, h * (1 - t)]]); } },
    chevron: { params: [['inset', 'Point depth', 0, 0.9, 0.01, 0.25]], path: (w, h, o) => { const k = v(o, 'inset', 0.25); return poly([[0, 0], [w * (1 - k), 0], [w, h / 2], [w * (1 - k), h], [0, h], [w * k, h / 2]]); } },
    parallelogram: { params: [['slant', 'Slant', 0, 0.9, 0.01, 0.2]], path: (w, h, o) => { const k = v(o, 'slant', 0.2); return poly([[w * k, 0], [w, 0], [w * (1 - k), h], [0, h]]); } },
    polygon: { label: 'Polygon', params: [['sides', 'Sides', 3, 16, 1, 5]], path: (w, h, o) => { const n = v(o, 'sides', 5); return poly(fit(regular(n, -90 + (n % 2 ? 0 : 180 / n)), w, h)); } },
    trapezoid: { label: 'Trapezoid', params: [['inset', 'Top inset', 0, 0.49, 0.01, 0.2]], path: (w, h, o) => { const k = v(o, 'inset', 0.2); return poly([[w * k, 0], [w * (1 - k), 0], [w, h], [0, h]]); } },
    rtriangle: { label: 'Right triangle', path: (w, h) => poly([[0, 0], [w, h], [0, h]]) },
    semicircle: { label: 'Semicircle', path: (w, h) => `M0 ${f(h)} A${f(w / 2)} ${f(h)} 0 0 1 ${f(w)} ${f(h)} Z` },
    pie: { label: 'Pie / wedge', params: [['angle', 'Angle', 10, 350, 5, 270]], path: (w, h, o) => { const a = v(o, 'angle', 270), e = ellArc(w / 2, h / 2, w / 2, h / 2, -90, -90 + a); return `M${f(w / 2)} ${f(h / 2)} L${e.start} ${e.arc} Z`; } },
    ring: { label: 'Ring / donut', params: [['ratio', 'Hole size', 0.1, 0.95, 0.01, 0.55]], path: (w, h, o) => {
      const k = v(o, 'ratio', 0.55), rx = w / 2, ry = h / 2, ix = rx * k, iy = ry * k;
      return `M0 ${f(ry)} A${f(rx)} ${f(ry)} 0 1 1 ${f(w)} ${f(ry)} A${f(rx)} ${f(ry)} 0 1 1 0 ${f(ry)} Z M${f(rx - ix)} ${f(ry)} A${f(ix)} ${f(iy)} 0 1 0 ${f(rx + ix)} ${f(ry)} A${f(ix)} ${f(iy)} 0 1 0 ${f(rx - ix)} ${f(ry)} Z`; } },
    blockarc: { label: 'Block arc', params: [['angle', 'Angle', 20, 350, 5, 180], ['ratio', 'Inner radius', 0.1, 0.95, 0.01, 0.6]], path: (w, h, o) => {
      const a = v(o, 'angle', 180), k = v(o, 'ratio', 0.6), s = -90 - a / 2, e = -90 + a / 2, out = ellArc(w / 2, h / 2, w / 2, h / 2, s, e), inn = ellArc(w / 2, h / 2, (w / 2) * k, (h / 2) * k, e, s);
      return `M${out.start} ${out.arc} L${inn.start} ${inn.arc} Z`; } },
    frame: { label: 'Frame', params: [['thick', 'Thickness', 0.02, 0.45, 0.01, 0.12]], path: (w, h, o) => { const t = Math.min(w, h) * v(o, 'thick', 0.12); return `${poly([[0, 0], [w, 0], [w, h], [0, h]])} ${poly([[t, t], [t, h - t], [w - t, h - t], [w - t, t]])}`; } },
    moon: { label: 'Crescent', params: [['depth', 'Thickness', 0.1, 0.9, 0.01, 0.45]], path: (w, h, o) => { const k = v(o, 'depth', 0.45); return `M${f(w * 0.62)} 0 A${f(w * 0.62)} ${f(h / 2)} 0 1 0 ${f(w * 0.62)} ${f(h)} A${f(w * 0.62 * (1 - k))} ${f(h / 2)} 0 1 1 ${f(w * 0.62)} 0 Z`; } },
    heart: { label: 'Heart', path: (w, h) => `M${f(w / 2)} ${f(h)} C${f(w * 0.1)} ${f(h * 0.7)} 0 ${f(h * 0.45)} 0 ${f(h * 0.28)} C0 ${f(h * 0.08)} ${f(w * 0.2)} 0 ${f(w * 0.3)} 0 C${f(w * 0.4)} 0 ${f(w * 0.48)} ${f(h * 0.08)} ${f(w / 2)} ${f(h * 0.2)} C${f(w * 0.52)} ${f(h * 0.08)} ${f(w * 0.6)} 0 ${f(w * 0.7)} 0 C${f(w * 0.8)} 0 ${f(w)} ${f(h * 0.08)} ${f(w)} ${f(h * 0.28)} C${f(w)} ${f(h * 0.45)} ${f(w * 0.9)} ${f(h * 0.7)} ${f(w / 2)} ${f(h)} Z` },
    teardrop: { label: 'Teardrop', path: (w, h) => `M${f(w / 2)} 0 C${f(w * 0.6)} ${f(h * 0.25)} ${f(w)} ${f(h * 0.45)} ${f(w)} ${f(h * 0.68)} A${f(w / 2)} ${f(h * 0.32)} 0 0 1 0 ${f(h * 0.68)} C0 ${f(h * 0.45)} ${f(w * 0.4)} ${f(h * 0.25)} ${f(w / 2)} 0 Z` },
    lightning: { label: 'Lightning', path: (w, h) => poly([[0.55, 0], [0.12, 0.56], [0.44, 0.56], [0.3, 1], [0.88, 0.38], [0.54, 0.38], [0.72, 0]].map(([x, y]) => [x * w, y * h])) },
    xcross: { label: 'Cross (×)', params: [['thick', 'Thickness', 0.1, 0.5, 0.01, 0.25]], path: (w, h, o) => {
      const t = v(o, 'thick', 0.25) / 2, P = [[0, t], [t, 0], [0.5, 0.5 - t], [1 - t, 0], [1, t], [0.5 + t, 0.5], [1, 1 - t], [1 - t, 1], [0.5, 0.5 + t], [t, 1], [0, 1 - t], [0.5 - t, 0.5]];
      return poly(P.map(([x, y]) => [x * w, y * h])); } },
    darrow: { label: 'Double arrow', params: [['head', 'Head length', 0.05, 0.45, 0.01, 0.25], ['shaft', 'Shaft thickness', 0.1, 1, 0.01, 0.4]], path: (w, h, o) => { const hx = w * v(o, 'head', 0.25), t = (1 - v(o, 'shaft', 0.4)) / 2; return poly([[0, h / 2], [hx, 0], [hx, h * t], [w - hx, h * t], [w - hx, 0], [w, h / 2], [w - hx, h], [w - hx, h * (1 - t)], [hx, h * (1 - t)], [hx, h]]); } },
    notched: { label: 'Notched arrow', params: [['head', 'Head length', 0.1, 0.9, 0.01, 0.35]], path: (w, h, o) => { const hx = w * (1 - v(o, 'head', 0.35)); return poly([[0, h * 0.3], [hx, h * 0.3], [hx, 0], [w, h / 2], [hx, h], [hx, h * 0.7], [0, h * 0.7], [w * 0.12, h / 2]]); } },
    homeplate: { label: 'Pentagon arrow', params: [['inset', 'Point depth', 0, 0.9, 0.01, 0.3]], path: (w, h, o) => { const k = v(o, 'inset', 0.3); return poly([[0, 0], [w * (1 - k), 0], [w, h / 2], [w * (1 - k), h], [0, h]]); } },
    carrow: { label: 'Curved arrow', path: (w, h) => `M0 ${f(h)} C0 ${f(h * 0.35)} ${f(w * 0.3)} ${f(h * 0.22)} ${f(w * 0.68)} ${f(h * 0.22)} L${f(w * 0.68)} 0 L${f(w)} ${f(h * 0.36)} L${f(w * 0.68)} ${f(h * 0.72)} L${f(w * 0.68)} ${f(h * 0.5)} C${f(w * 0.36)} ${f(h * 0.5)} ${f(w * 0.24)} ${f(h * 0.62)} ${f(w * 0.24)} ${f(h)} Z` },
    quadarrow: { label: 'Four-way arrow', path: (w, h) => poly([[0.5, 0], [0.68, 0.18], [0.57, 0.18], [0.57, 0.43], [0.82, 0.43], [0.82, 0.32], [1, 0.5], [0.82, 0.68], [0.82, 0.57], [0.57, 0.57], [0.57, 0.82], [0.68, 0.82], [0.5, 1], [0.32, 0.82], [0.43, 0.82], [0.43, 0.57], [0.18, 0.57], [0.18, 0.68], [0, 0.5], [0.18, 0.32], [0.18, 0.43], [0.43, 0.43], [0.43, 0.18], [0.32, 0.18]].map(([x, y]) => [x * w, y * h])) },
    callout: { label: 'Speech bubble', params: [['tailX', 'Tail position', 0.05, 0.95, 0.01, 0.25], ['tailLen', 'Tail length', 0.05, 0.6, 0.01, 0.25]], path: (w, h, o) => {
      const tl = v(o, 'tailLen', 0.25), bh = h * (1 - tl), tx = w * v(o, 'tailX', 0.25), r = Math.min(w, bh) * 0.16, tw = Math.min(w * 0.12, 18);
      return `M${f(r)} 0 H${f(w - r)} Q${f(w)} 0 ${f(w)} ${f(r)} V${f(bh - r)} Q${f(w)} ${f(bh)} ${f(w - r)} ${f(bh)} H${f(Math.min(w - r, tx + tw))} L${f(tx - tw * 0.4)} ${f(h)} L${f(Math.max(r, tx - tw * 0.2))} ${f(bh)} H${f(r)} Q0 ${f(bh)} 0 ${f(bh - r)} V${f(r)} Q0 0 ${f(r)} 0 Z`; } },
    ocallout: { label: 'Oval callout', params: [['tailX', 'Tail position', 0.05, 0.95, 0.01, 0.3]], path: (w, h, o) => {
      const bh = h * 0.78, tx = w * v(o, 'tailX', 0.3);
      return `M${f(w / 2)} 0 A${f(w / 2)} ${f(bh / 2)} 0 1 1 ${f(tx + w * 0.08)} ${f(bh * 0.97)} L${f(tx - w * 0.06)} ${f(h)} L${f(tx - w * 0.02)} ${f(bh * 0.95)} A${f(w / 2)} ${f(bh / 2)} 0 0 1 ${f(w / 2)} 0 Z`; } },
    ribbon: { label: 'Ribbon banner', path: (w, h) => poly([[0, h * 0.2], [w * 0.14, h * 0.2], [w * 0.14, 0], [w * 0.86, 0], [w * 0.86, h * 0.2], [w, h * 0.2], [w * 0.92, h * 0.55], [w, h * 0.9], [w * 0.86, h * 0.9], [w * 0.86, h * 0.7], [w * 0.14, h * 0.7], [w * 0.14, h * 0.9], [0, h * 0.9], [w * 0.08, h * 0.55]]) },
    wave: { label: 'Wave banner', path: (w, h) => `M0 ${f(h * 0.15)} C${f(w * 0.25)} ${f(-h * 0.1)} ${f(w * 0.5)} ${f(h * 0.4)} ${f(w)} ${f(h * 0.1)} V${f(h * 0.85)} C${f(w * 0.5)} ${f(h * 1.15)} ${f(w * 0.25)} ${f(h * 0.65)} 0 ${f(h * 0.9)} Z` },
    tag: { label: 'Tag', path: (w, h) => poly([[0, 0], [w * 0.78, 0], [w, h / 2], [w * 0.78, h], [0, h]]) + ` M${f(w * 0.78)} ${f(h / 2 - h * 0.08)} A${f(h * 0.08)} ${f(h * 0.08)} 0 1 0 ${f(w * 0.78)} ${f(h / 2 + h * 0.08)} A${f(h * 0.08)} ${f(h * 0.08)} 0 1 0 ${f(w * 0.78)} ${f(h / 2 - h * 0.08)} Z` },
    document: { label: 'Document', path: (w, h) => `M0 0 H${f(w)} V${f(h * 0.85)} C${f(w * 0.75)} ${f(h * 0.7)} ${f(w * 0.5)} ${f(h * 1.05)} ${f(w * 0.25)} ${f(h * 0.95)} C${f(w * 0.12)} ${f(h * 0.9)} ${f(w * 0.05)} ${f(h * 0.88)} 0 ${f(h * 0.9)} Z` },
    predefined: { label: 'Predefined process', path: (w, h) => `${poly([[0, 0], [w, 0], [w, h], [0, h]])} M${f(w * 0.1)} 0 V${f(h)} M${f(w * 0.9)} 0 V${f(h)}` },
    manualinput: { label: 'Manual input', path: (w, h) => poly([[0, h * 0.25], [w, 0], [w, h], [0, h]]) },
    delay: { label: 'Delay', path: (w, h) => `M0 0 H${f(w - h / 2)} A${f(h / 2)} ${f(h / 2)} 0 0 1 ${f(w - h / 2)} ${f(h)} H0 Z` },
    offpage: { label: 'Off-page connector', path: (w, h) => poly([[0, 0], [w, 0], [w, h * 0.65], [w / 2, h], [0, h * 0.65]]) },
    cube: { label: 'Cube', params: [['depth', 'Depth', 0.05, 0.6, 0.01, 0.25]], path: (w, h, o) => {
      const d = Math.min(w, h) * v(o, 'depth', 0.25);
      return `${poly([[0, d], [d, 0], [w, 0], [w, h - d], [w - d, h], [0, h]])} M0 ${f(d)} H${f(w - d)} V${f(h)} M${f(w - d)} ${f(d)} L${f(w)} 0`; } },
    cone: { label: 'Cone', path: (w, h) => { const ry = Math.min(h * 0.12, w * 0.25); return `M${f(w / 2)} 0 L${f(w)} ${f(h - ry)} A${f(w / 2)} ${f(ry)} 0 0 1 0 ${f(h - ry)} Z`; } },
    pyramid: { label: 'Pyramid', path: (w, h) => `${poly([[w * 0.45, 0], [w, h * 0.78], [w * 0.62, h], [0, h * 0.82]])} M${f(w * 0.45)} 0 L${f(w * 0.62)} ${f(h)}` },
    waveline: { label: 'Wavy line', open: true, params: [['waves', 'Waves', 1, 12, 1, 4]], path: (w, h, o) => { const n = v(o, 'waves', 4), s = w / n; let d = `M0 ${f(h / 2)}`; for (let i = 0; i < n; i++) d += ` C${f(i * s + s * 0.35)} ${f(-h * 0.1)} ${f(i * s + s * 0.65)} ${f(h * 1.1)} ${f((i + 1) * s)} ${f(h / 2)}`; return d; } },
    zigzag: { label: 'Zigzag line', open: true, params: [['waves', 'Peaks', 1, 20, 1, 6]], path: (w, h, o) => { const n = v(o, 'waves', 6) * 2; return 'M' + Array.from({ length: n + 1 }, (_, i) => `${f((i * w) / n)} ${i % 2 ? 0 : f(h)}`).join(' L'); } },
  };
  globalThis.SHAPE_DEFS = DEFS;
  const prevPath = shapePath;
  shapePath = function (kind, w, h, o) { const d = DEFS[kind]; return d ? d.path(w, h, o || {}) : prevPath(kind, w, h, o); };
  for (const [k, d] of Object.entries(DEFS)) {
    if (d.label && !SHAPES.some((s) => s[0] === k)) SHAPES.push([k, d.label]);
    if (d.open) OPEN_SHAPES.add(k);
  }
  const shapeKindSel = $('#shapeKind');
  if (shapeKindSel) shapeKindSel.innerHTML = SHAPES.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('');

  // ---------- Library entries ----------
  // [label, factory params, default size]. type rect/ellipse use the existing objects; others are 'shape' kinds.
  const S = (label, kind, w = 120, h = 120, extra = {}) => ({ label, kind, w, h, extra });
  const LIB = [
    ['Basic', [S('Rectangle', 'rect:0'), S('Rounded rectangle', 'rect:16', 140, 100), S('Circle', 'ellipse'), S('Ellipse', 'ellipse', 150, 100), S('Triangle', 'triangle'), S('Right triangle', 'rtriangle'), S('Diamond', 'diamond'),
      S('Parallelogram', 'parallelogram', 150, 100), S('Trapezoid', 'trapezoid', 150, 100), S('Semicircle', 'semicircle', 140, 70), S('Pie / wedge', 'pie'), S('Ring', 'ring'), S('Block arc', 'blockarc', 140, 70), S('Frame', 'frame'),
      S('Crescent', 'moon'), S('Heart', 'heart'), S('Teardrop', 'teardrop', 100, 130), S('Cloud', 'cloud', 150, 100), S('Lightning', 'lightning', 90, 130), S('Plus', 'plus'), S('Cross', 'xcross'), S('Capsule', 'pill', 160, 70)]],
    ['Polygons & stars', [S('Pentagon', 'polygon', 120, 120, { sides: 5 }), S('Hexagon', 'hexagon', 130, 115), S('Heptagon', 'polygon', 120, 120, { sides: 7 }), S('Octagon', 'polygon', 120, 120, { sides: 8 }), S('Decagon', 'polygon', 120, 120, { sides: 10 }),
      S('4-point star', 'star', 120, 120, { points: 4, inner: 0.35 }), S('5-point star', 'star'), S('6-point star', 'star', 120, 120, { points: 6, inner: 0.55 }), S('8-point star', 'star', 120, 120, { points: 8, inner: 0.5 }), S('Seal', 'star', 120, 120, { points: 16, inner: 0.8 }), S('Starburst', 'star', 130, 130, { points: 24, inner: 0.72 })]],
    ['Arrows', [S('Block arrow', 'arrow', 160, 80), S('Up arrow', 'arrow', 160, 80, { rot: -90 }), S('Double arrow', 'darrow', 170, 70), S('Notched arrow', 'notched', 160, 80), S('Chevron', 'chevron', 140, 80), S('Pentagon arrow', 'homeplate', 150, 70),
      S('Curved arrow', 'carrow', 140, 110), S('Four-way arrow', 'quadarrow'), S('Circular arrow', 'cycle', 130, 130)]],
    ['Callouts & banners', [S('Speech bubble', 'callout', 160, 120), S('Oval callout', 'ocallout', 160, 120), S('Ribbon banner', 'ribbon', 180, 70), S('Wave banner', 'wave', 170, 80), S('Tag', 'tag', 150, 70)]],
    ['Flowchart', [S('Process', 'rect:0', 150, 80), S('Decision', 'diamond', 140, 100), S('Terminator', 'pill', 150, 60), S('Data', 'parallelogram', 150, 80), S('Document', 'document', 140, 100), S('Predefined process', 'predefined', 150, 80),
      S('Manual input', 'manualinput', 150, 80), S('Delay', 'delay', 140, 80), S('Database', 'cylinder', 100, 130), S('Off-page', 'offpage', 90, 100)]],
    ['3D', [S('Cube', 'cube'), S('Cylinder', 'cylinder', 100, 130), S('Cone', 'cone', 100, 130), S('Pyramid', 'pyramid', 120, 120)]],
    ['Brackets & lines', [S('Curly bracket', 'brace', 160, 40), S('Square bracket', 'sqbracket', 160, 40), S('Arc line', 'arcline', 160, 60), S('Wavy line', 'waveline', 180, 40), S('Zigzag line', 'zigzag', 180, 40)]],
  ];
  function makeShape(it, x, y) {
    const [type, r] = it.kind.split(':'), { rot = 0, ...extra } = it.extra || {};
    const o = type === 'rect' ? Make.rect(x - it.w / 2, y - it.h / 2, it.w, it.h, { radius: +r || 0 }) : type === 'ellipse' ? Make.ellipse(x - it.w / 2, y - it.h / 2, it.w, it.h)
      : Make.shape(type, x - it.w / 2, y - it.h / 2, it.w, it.h, extra);
    if (OPEN_SHAPES.has(type)) Object.assign(o, { fill: 'none', strokeWidth: 3 });
    o.rot = rot;
    return o;
  }
  function insertShape(it, at) { const c = at || viewCenter(); addObjects([makeShape(it, c.x, c.y)]); setTool('select'); }
  globalThis.insertLibraryShape = insertShape;
  const shapeThumb = (it) => {
    const o = makeShape(it, it.w / 2, it.h / 2), pad = 6, open = OPEN_SHAPES.has(it.kind.split(':')[0]);
    const inner = o.type === 'rect' ? `<rect width="${o.w}" height="${o.h}" rx="${o.radius || 0}"/>` : o.type === 'ellipse' ? `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}"/>` : `<path d="${o.kind === 'cycle' ? cycleGeometry(o, o.w, o.h).arc : shapePath(o.kind, o.w, o.h, o)}"/>`;
    const m = Math.max(it.w, it.h) + pad * 2; // square box, so rotated shapes (Up arrow) fit too
    return `<svg viewBox="${f(it.w / 2 - m / 2)} ${f(it.h / 2 - m / 2)} ${m} ${m}"><g transform="rotate(${o.rot || 0} ${it.w / 2} ${it.h / 2})" fill="${open ? 'none' : '#e8eef8'}" stroke="#4a6fae" stroke-width="${Math.max(it.w, it.h) / 40}" stroke-linejoin="round">${inner}</g></svg>`;
  };

  // ---------- Line styles (connector tool presets) ----------
  const LINES = [
    ['Activation', { head: 'arrow', tail: 'none', style: 'straight' }], ['Inhibition', { head: 'bar', tail: 'none', style: 'straight' }], ['Binding', { head: 'dot', tail: 'none', style: 'straight' }],
    ['Open arrow', { head: 'open', tail: 'none', style: 'straight' }], ['Concave arrow', { head: 'stealth', tail: 'none', style: 'straight' }], ['Half arrow', { head: 'harpoon', tail: 'none', style: 'straight' }],
    ['Double-headed', { head: 'arrow', tail: 'arrow', style: 'straight' }], ['Half arrows, both ends', { head: 'harpoon', tail: 'harpoon', style: 'straight' }], ['Plain line', { head: 'none', tail: 'none', style: 'straight' }],
    ['Indirect (dashed)', { head: 'arrow', tail: 'none', style: 'straight', dashStyle: 'dashed' }], ['Dotted line', { head: 'none', tail: 'none', style: 'straight', dashStyle: 'dotted' }], ['Proposed (dotted arrow)', { head: 'arrow', tail: 'none', style: 'straight', dashStyle: 'dotted' }],
    ['Curved arrow', { head: 'arrow', tail: 'none', style: 'curved', curve: 40 }], ['Curved inhibition', { head: 'bar', tail: 'none', style: 'curved', curve: 40 }], ['Translocation (curved, dashed)', { head: 'arrow', tail: 'none', style: 'curved', curve: 40, dashStyle: 'dashed' }],
    ['Elbow arrow', { head: 'arrow', tail: 'none', style: 'elbow', radius: 0 }], ['Rounded elbow', { head: 'arrow', tail: 'none', style: 'elbow', radius: 14 }], ['Elbow inhibition', { head: 'bar', tail: 'none', style: 'elbow', radius: 10 }],
    ['Diamond end', { head: 'diamond', tail: 'none', style: 'straight' }], ['Open circle end', { head: 'circle', tail: 'none', style: 'straight' }], ['Thick arrow', { head: 'arrow', tail: 'none', style: 'straight', width: 4.5 }],
  ];
  globalThis.linePreset = null;
  const lineThumb = (p) => {
    const o = { id: 'lp', type: 'connector', from: { x: 8, y: p.style === 'elbow' ? 34 : 28 }, to: { x: 112, y: p.style === 'elbow' ? 8 : 28 }, color: '#333', width: 2, ...p, ...(p.style === 'curved' ? { curve: 22 } : {}) };
    return `<svg viewBox="0 0 120 44">${connectorSvg(o, [o], true)}</svg>`;
  };
  function useLinePreset(name) {
    const p = (LINES.find(([n]) => n === name) || [])[1];
    if (!p) return;
    const sel = selected().filter((o) => o.type === 'connector');
    globalThis.linePreset = { ...p };
    if (sel.length) { checkpoint(); for (const o of sel) Object.assign(o, { dashStyle: 'solid', radius: 0, ...p }); render({ props: true }); toast(`${name} applied to ${sel.length} connector${sel.length > 1 ? 's' : ''}`); return; }
    setTool('connector');
    toast(`${name}: drag from one object to another (or anywhere on the page)`);
  }
  globalThis.useLinePreset = useLinePreset;

  // ---------- Shapes tab ----------
  const tabs = $('#left .tabs');
  if (tabs && !$('#lib-shapes')) {
    tabs.append(el('button', { class: 'tab', 'data-ltab': 'shapes', textContent: 'Shapes' }));
    const q = el('input', { type: 'search', placeholder: 'Search shapes and lines (star, callout, inhibition…)' });
    const body = el('div', { class: 'shapelib' });
    const pane = el('div', { id: 'lib-shapes', class: 'lpane hidden' }, el('div', { class: 'searchrow' }, q), body);
    $('#lib-uploads').after(pane);
    const draw = () => {
      const w = q.value.trim().toLowerCase(), hit = (s) => !w || s.toLowerCase().includes(w);
      let html = '';
      const lines = LINES.filter(([n]) => hit(n) || hit('line arrow connector'));
      if (lines.length) html += `<h4>Lines &amp; arrows <span class="note">click, then drag between objects</span></h4><div class="shapegrid lines">${lines.map(([n, p]) => `<button class="shape-cell" data-line="${esc(n)}" title="${esc(n)}">${lineThumb(p)}<span>${esc(n)}</span></button>`).join('')}</div>`;
      for (const [cat, items] of LIB) {
        const its = items.filter((it) => hit(it.label) || hit(cat));
        if (its.length) html += `<h4>${esc(cat)}</h4><div class="shapegrid">${its.map((it) => `<button class="shape-cell" draggable="true" data-shape="${esc(cat)}|${esc(it.label)}" title="${esc(it.label)} — click or drag onto the page">${shapeThumb(it)}<span>${esc(it.label)}</span></button>`).join('')}</div>`;
      }
      body.innerHTML = html || '<div class="note">No shapes match.</div>';
    };
    q.addEventListener('input', draw);
    const find = (key) => { const [cat, label] = key.split('|'); return (LIB.find(([c]) => c === cat) || [null, []])[1].find((it) => it.label === label); };
    body.addEventListener('click', (e) => {
      const c = e.target.closest('[data-shape],[data-line]');
      if (!c) return;
      if (c.dataset.line) useLinePreset(c.dataset.line); else { const it = find(c.dataset.shape); if (it) insertShape(it); }
    });
    body.addEventListener('dragstart', (e) => { const c = e.target.closest('[data-shape]'); if (c) e.dataTransfer.setData('application/x-scicanvas-shape', c.dataset.shape); });
    stage.addEventListener('dragover', (e) => { if ([...e.dataTransfer.types].includes('application/x-scicanvas-shape')) e.preventDefault(); });
    stage.addEventListener('drop', (e) => {
      const key = e.dataTransfer.getData('application/x-scicanvas-shape');
      if (!key) return;
      e.preventDefault(); e.stopPropagation();
      const it = find(key);
      if (it) insertShape(it, toWorld(e));
    }, true);
    // The app's tab handler was attached before this tab existed, so this one switches the panes itself.
    tabs.querySelector('[data-ltab="shapes"]').addEventListener('click', (e) => {
      $$('[data-ltab]').forEach((x) => x.classList.toggle('active', x === e.currentTarget));
      $('#lib-library').classList.add('hidden'); $('#lib-uploads').classList.add('hidden'); pane.classList.remove('hidden');
      draw();
    });
    draw();
  }

  // ---------- Shape options in Properties ----------
  const prevProps = renderProps;
  renderProps = function () {
    prevProps();
    const sel = selected();
    if (sel.length !== 1 || sel[0].type !== 'shape') return;
    const o = sel[0], d = DEFS[o.kind];
    if (!d || !d.params) return;
    const rows = d.params.map(([key, label, min, max, step, def]) => {
      const val = el('span', { class: 'note', style: 'width:34px;text-align:right', textContent: String(o[key] ?? def) });
      return row(label, el('input', { type: 'range', min, max, step, value: o[key] ?? def, oninput: (e) => { setProps([o], key, +e.target.value); val.textContent = e.target.value; } }), val);
    });
    const s = sect('Shape options', ...rows, btn('Reset', () => { checkpoint(); for (const [k] of d.params) delete o[k]; render({ props: true }); }));
    const P = $('#props'), anchor = [...P.querySelectorAll('h3')].find((h) => /^Style$/i.test(h.textContent));
    if (anchor && anchor.parentElement) anchor.parentElement.after(s); else P.append(s);
  };

  // ---------- Right-click tool menus ----------
  const TOOLS = [['select', 'Select', 'V'], ['pan', 'Pan', 'H'], ['text', 'Text', 'T'], ['rect', 'Rectangle', 'R'], ['ellipse', 'Ellipse', 'E'], ['shape', 'Shapes', 'S'], ['line', 'Line', 'L'], ['arrow', 'Arrow', 'A'], ['connector', 'Connector', 'C'],
    ['pen', 'Pen', 'P'], ['pencil', 'Pencil', 'D'], ['airbrush', 'Shading airbrush', 'W'], ['eraser', 'Eraser', 'X'], ['badge', 'Numbered badge', 'N'], ['table', 'Table', ''], ['comment', 'Comment', 'M']];
  const BRUSHES = [['membrane', 'Lipid bilayer'], ['dna', 'DNA helix'], ['actin', 'Actin filament'], ['microtubule', 'Microtubule'], ['epithelium', 'Epithelial layer'], ['cells', 'Row of cells'], ['vessel', 'Blood vessel'], ['vesicles', 'Vesicles'], ['ubiquitin', 'Ubiquitin / bead chain']];
  // Shared with the visual right-click menus (ctxmenu.js).
  globalThis.ShapeLib = { LIB, LINES, TOOLS, BRUSHES, shapeThumb, lineThumb, insertShape, useLinePreset, menuPoint: () => menuAt, setMenuPoint: (p) => { menuAt = p; } };
  for (const [t] of TOOLS) ARRANGE_COMMANDS['tool:' + t] = () => setTool(t);
  for (const [k] of BRUSHES) ARRANGE_COMMANDS['brush:' + k] = () => setTool('brush', k);
  for (const k of SHAPES.map((s) => s[0])) ARRANGE_COMMANDS['shapetool:' + k] = () => { if ($('#shapeKind')) $('#shapeKind').value = k; setTool('shape'); toast(`Drag on the page to draw: ${(SHAPES.find((s) => s[0] === k) || [null, k])[1]}`); };
  for (const [n] of LINES) ARRANGE_COMMANDS['line:' + n] = () => useLinePreset(n);
  for (const m of ['free', 'shape', 'protein']) ARRANGE_COMMANDS['pencilmode:' + m] = () => { if (typeof DRAW_DEFAULTS !== 'undefined') DRAW_DEFAULTS.mode = m; setTool('pencil'); };
  let menuAt = null; // world point of the last right-click, so "Insert shape" lands there
  for (const [cat, items] of LIB) for (const it of items) ARRANGE_COMMANDS[`insertshape:${cat}|${it.label}`] = () => insertShape(it, menuAt);
  svg.addEventListener('contextmenu', (e) => { menuAt = toWorld(e); }, true);

  const toolsMenu = () => ({ label: 'Tools', visual: 'tools', submenu: [...TOOLS.map(([t, l, k]) => ({ label: `${l}${k ? `   (${k})` : ''}`, cmd: 'tool:' + t })), { type: 'separator' }, { label: 'Brushes', submenu: BRUSHES.map(([k, l]) => ({ label: l, cmd: 'brush:' + k })) }] });
  const shapesMenu = () => ({ label: 'Insert shape', visual: 'shapes', submenu: LIB.map(([cat, items]) => ({ label: cat, submenu: items.map((it) => ({ label: it.label, cmd: `insertshape:${cat}|${it.label}` })) })) });
  const linesMenu = (label = 'Line style') => ({ label, visual: 'lines', submenu: LINES.map(([n]) => ({ label: n, cmd: 'line:' + n })) });
  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const base = prevMenu(), none = !state.sel.length;
    const extra = [toolsMenu(), shapesMenu(), linesMenu(selected().some((o) => o.type === 'connector') ? 'Change line style' : 'Line style')];
    return none ? [...extra, { type: 'separator' }, ...base] : [...base, { type: 'separator' }, ...extra];
  };

  // Toolbar flyouts (right-click a tool for its variants) are drawn as picture grids by ctxmenu.js.
})();
