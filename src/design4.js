// Design tools (part 4): fill editor (multi-stop gradients, patterns, generated biological textures,
// fill opacity), one light source for the whole figure, and extra effects (inner glow, halo / knock-out
// outline, background blur, depth-of-field blur, grain). Also the on-canvas handle editor used by the
// gradient, warp and cutaway tools.

// ---------- Small helpers ----------
function seededRandom(seed) { // mulberry32: the same texture every time it is drawn
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const fmt4 = (v) => Math.round(v * 100) / 100;
function hexAlpha(c, a) {
  if (a == null || a >= 1 || !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c || '')) return c;
  const [r, g, b] = Color.hexToRgb(c);
  return `rgba(${r},${g},${b},${fmt4(Math.max(0, a))})`;
}
// Object-local point ↔ page point (rotation about the centre; flips are ignored).
function localToWorld(o, lx, ly) { return rotPt({ x: o.x + lx, y: o.y + ly }, center(o), o.rot || 0); }
function worldToLocal(o, p) { const q = rotPt(p, center(o), -(o.rot || 0)); return { x: q.x - o.x, y: q.y - o.y }; }
const FILLABLE = (o) => ['rect', 'ellipse', 'shape'].includes(o.type) && !(o.type === 'shape' && OPEN_SHAPES.has(o.kind)) || (o.type === 'path' && o.closed);

// ---------- Gradients ----------
// fillSpec = { kind: 'linear' | 'radial', x1, y1, x2, y2 (linear, 0..1 of the box), cx, cy, r (radial),
//              stops: [{ at: 0..1, color, alpha }] }
const GRADIENT_PRESETS = [
  ['Two-tone', (c) => [{ at: 0, color: Color.light(c, 0.45) }, { at: 1, color: Color.dark(c, 0.2) }]],
  ['Fade to transparent', (c) => [{ at: 0, color: c, alpha: 1 }, { at: 1, color: c, alpha: 0 }]],
  ['Cytoplasm (soft edge)', (c) => [{ at: 0, color: Color.light(c, 0.75) }, { at: 0.7, color: Color.light(c, 0.45) }, { at: 1, color: c, alpha: 0.85 }]],
  ['Glow centre', (c) => [{ at: 0, color: '#ffffff' }, { at: 0.35, color: Color.light(c, 0.3) }, { at: 1, color: c, alpha: 0 }]],
  ['Hypoxic core', () => [{ at: 0, color: '#5a3d7a' }, { at: 0.45, color: '#b05a8a' }, { at: 1, color: '#f2b8a0' }]],
  ['Viridis', () => ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'].map((color, i) => ({ at: i / 4, color }))],
  ['Heat', () => ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'].map((color, i) => ({ at: i / 4, color }))],
];
function defaultGradient(o, kind = 'linear') {
  const c = normHex(o.fill) || '#4a7fd6';
  return kind === 'radial'
    ? { kind, cx: 0.5, cy: 0.5, r: 0.5, stops: [{ at: 0, color: Color.light(c, 0.6) }, { at: 1, color: Color.dark(c, 0.15) }] }
    : { kind, x1: 0.5, y1: 0, x2: 0.5, y2: 1, stops: [{ at: 0, color: Color.light(c, 0.45) }, { at: 1, color: Color.dark(c, 0.2) }] };
}
function gradientDef(spec, id, alpha = 1) {
  const stops = [...(spec.stops || [])].sort((a, b) => a.at - b.at)
    .map((s) => `<stop offset="${fmt4(Math.max(0, Math.min(1, s.at)))}" stop-color="${s.color}"${(s.alpha ?? 1) * alpha < 1 ? ` stop-opacity="${fmt4((s.alpha ?? 1) * alpha)}"` : ''}/>`).join('');
  return spec.kind === 'radial'
    ? `<radialGradient id="${id}" cx="${spec.cx ?? 0.5}" cy="${spec.cy ?? 0.5}" r="${spec.r ?? 0.5}" fx="${spec.cx ?? 0.5}" fy="${spec.cy ?? 0.5}">${stops}</radialGradient>`
    : `<linearGradient id="${id}" x1="${spec.x1 ?? 0}" y1="${spec.y1 ?? 0}" x2="${spec.x2 ?? 1}" y2="${spec.y2 ?? 0}">${stops}</linearGradient>`;
}
const gradientAngle = (s) => Math.round((Math.atan2((s.y2 ?? 0) - (s.y1 ?? 0), (s.x2 ?? 1) - (s.x1 ?? 0)) * 180) / Math.PI);
function setGradientAngle(s, deg) {
  const a = (deg * Math.PI) / 180;
  Object.assign(s, { x1: fmt4(0.5 - Math.cos(a) / 2), y1: fmt4(0.5 - Math.sin(a) / 2), x2: fmt4(0.5 + Math.cos(a) / 2), y2: fmt4(0.5 + Math.sin(a) / 2) });
}

// ---------- Patterns and textures ----------
// pattern = { kind, color, scale, angle, opacity, seed } drawn on top of the fill, inside the shape.
const PATTERNS = [
  ['', 'None'],
  ['stripes', 'Stripes'], ['dots', 'Dots'], ['cross', 'Crosshatch'], ['hatch', 'Diagonal hatch'], ['checks', 'Checks'], ['grid', 'Grid'], ['waves', 'Waves'], ['bricks', 'Bricks'],
  ['granules', 'Texture: cytoplasm granules'], ['fibres', 'Texture: collagen / ECM fibres'], ['stroma', 'Texture: stroma'], ['chromatin', 'Texture: nuclear chromatin'],
  ['droplets', 'Texture: lipid droplets'], ['trabeculae', 'Texture: bone trabeculae'], ['noise', 'Texture: noise / grain'],
];
// Tile content for a T × T pattern tile. Texture elements are repeated across the tile edges so tiles join seamlessly.
function patternTile(kind, T, c, seed) {
  const rnd = seededRandom(seed || 7), sw = T * 0.08;
  const wrap = (f) => { let s = ''; for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) s += f(dx, dy); return s; };
  switch (kind) {
    case 'stripes': return `<rect width="${T}" height="${T * 0.32}" fill="${c}"/>`;
    case 'dots': return `<circle cx="${T / 2}" cy="${T / 2}" r="${T * 0.17}" fill="${c}"/>`;
    case 'cross': return `<path d="M0 0L${T} ${T}M${T} 0L0 ${T}M${-T / 2} ${T / 2}L${T / 2} ${-T / 2}M${T / 2} ${T * 1.5}L${T * 1.5} ${T / 2}M${-T / 2} ${T / 2}L${T / 2} ${T * 1.5}M${T / 2} ${-T / 2}L${T * 1.5} ${T / 2}" stroke="${c}" stroke-width="${sw}"/>`;
    case 'hatch': return `<path d="M0 ${T}L${T} 0M${-T / 2} ${T / 2}L${T / 2} ${-T / 2}M${T / 2} ${T * 1.5}L${T * 1.5} ${T / 2}" stroke="${c}" stroke-width="${sw}"/>`;
    case 'checks': return `<rect width="${T / 2}" height="${T / 2}" fill="${c}"/><rect x="${T / 2}" y="${T / 2}" width="${T / 2}" height="${T / 2}" fill="${c}"/>`;
    case 'grid': return `<path d="M0 0H${T}M0 0V${T}" stroke="${c}" stroke-width="${sw}"/>`;
    case 'waves': return `<path d="M0 ${T * 0.5} C${T * 0.25} ${T * 0.2} ${T * 0.25} ${T * 0.2} ${T * 0.5} ${T * 0.5} S${T * 0.75} ${T * 0.8} ${T} ${T * 0.5}" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    case 'bricks': return `<path d="M0 0H${T}M0 ${T / 2}H${T}M${T / 2} 0V${T / 2}M0 ${T / 2}V${T}" stroke="${c}" stroke-width="${sw * 0.8}" fill="none"/>`;
    case 'granules': {
      const g = Array.from({ length: 16 }, () => [rnd() * T, rnd() * T, T * (0.02 + rnd() * 0.045), 0.35 + rnd() * 0.55]);
      return wrap((dx, dy) => g.map(([x, y, r, a]) => `<circle cx="${fmt4(x + dx)}" cy="${fmt4(y + dy)}" r="${fmt4(r)}" fill="${c}" opacity="${fmt4(a)}"/>`).join(''));
    }
    case 'fibres': {
      const f = Array.from({ length: 7 }, () => { const y = rnd() * T, a = (rnd() - 0.5) * T * 0.3, b = (rnd() - 0.5) * T * 0.3; return [y, a, b, 0.4 + rnd() * 0.6, sw * (0.4 + rnd() * 0.8)]; });
      return wrap((dx, dy) => f.map(([y, a, b, o, w]) => `<path d="M${dx} ${fmt4(y + dy)} C${fmt4(dx + T * 0.33)} ${fmt4(y + dy + a)} ${fmt4(dx + T * 0.66)} ${fmt4(y + dy + b)} ${dx + T} ${fmt4(y + dy)}" fill="none" stroke="${c}" stroke-width="${fmt4(w)}" opacity="${fmt4(o)}" stroke-linecap="round"/>`).join(''));
    }
    case 'stroma': {
      const f = Array.from({ length: 5 }, () => [rnd() * T, (rnd() - 0.5) * T * 0.4, 0.35 + rnd() * 0.4]);
      const n = Array.from({ length: 3 }, () => [rnd() * T, rnd() * T, (rnd() - 0.5) * 40]);
      return wrap((dx, dy) => f.map(([y, a, o]) => `<path d="M${dx} ${fmt4(y + dy)} Q${fmt4(dx + T / 2)} ${fmt4(y + dy + a)} ${dx + T} ${fmt4(y + dy)}" fill="none" stroke="${c}" stroke-width="${fmt4(sw * 0.6)}" opacity="${fmt4(o)}"/>`).join('')
        + n.map(([x, y, r]) => `<ellipse cx="${fmt4(x + dx)}" cy="${fmt4(y + dy)}" rx="${fmt4(T * 0.12)}" ry="${fmt4(T * 0.035)}" fill="${c}" opacity=".75" transform="rotate(${fmt4(r)} ${fmt4(x + dx)} ${fmt4(y + dy)})"/>`).join(''));
    }
    case 'chromatin': {
      const blobs = Array.from({ length: 6 }, () => [rnd() * T, rnd() * T, T * (0.05 + rnd() * 0.08), 0.45 + rnd() * 0.4]);
      const dots = Array.from({ length: 14 }, () => [rnd() * T, rnd() * T, T * 0.015 + rnd() * T * 0.02]);
      return wrap((dx, dy) => blobs.map(([x, y, r, a]) => `<ellipse cx="${fmt4(x + dx)}" cy="${fmt4(y + dy)}" rx="${fmt4(r)}" ry="${fmt4(r * 0.7)}" fill="${c}" opacity="${fmt4(a)}"/>`).join('')
        + dots.map(([x, y, r]) => `<circle cx="${fmt4(x + dx)}" cy="${fmt4(y + dy)}" r="${fmt4(r)}" fill="${c}"/>`).join(''));
    }
    case 'droplets': {
      const d = Array.from({ length: 5 }, () => [rnd() * T, rnd() * T, T * (0.06 + rnd() * 0.09)]);
      return wrap((dx, dy) => d.map(([x, y, r]) => `<circle cx="${fmt4(x + dx)}" cy="${fmt4(y + dy)}" r="${fmt4(r)}" fill="${Color.light(c, 0.55)}" stroke="${c}" stroke-width="${fmt4(sw * 0.5)}"/><circle cx="${fmt4(x + dx - r * 0.35)}" cy="${fmt4(y + dy - r * 0.35)}" r="${fmt4(r * 0.25)}" fill="#fff" opacity=".7"/>`).join(''));
    }
    case 'trabeculae': {
      const P = Array.from({ length: 9 }, () => [rnd() * T, rnd() * T]);
      let segs = '';
      P.forEach((p, i) => {
        const near = P.map((q, j) => [j, Math.hypot(q[0] - p[0], q[1] - p[1])]).filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 2);
        near.forEach(([j]) => { segs += `M${fmt4(p[0])} ${fmt4(p[1])}L${fmt4(P[j][0])} ${fmt4(P[j][1])}`; });
      });
      return wrap((dx, dy) => `<path d="${segs}" transform="translate(${dx} ${dy})" fill="none" stroke="${c}" stroke-width="${fmt4(sw * 1.4)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  }
  return '';
}
function patternLayer(o, geom) {
  const p = o.pattern;
  if (!p || !p.kind) return { defs: '', overlay: '' };
  const c = p.color || Color.dark(normHex(o.fill) || '#888888', 0.35), op = p.opacity ?? 0.8, id = `pt-${o.id}`;
  if (p.kind === 'noise') {
    const k = fmt4(op * 1.8);
    const defs = `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fmt4(0.9 / (p.scale || 1))}" numOctaves="2" seed="${p.seed || 3}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 ${fmt4(Color.hexToRgb(normHex(c) || '#000000')[0] / 255)} 0 0 0 0 ${fmt4(Color.hexToRgb(normHex(c) || '#000000')[1] / 255)} 0 0 0 0 ${fmt4(Color.hexToRgb(normHex(c) || '#000000')[2] / 255)} ${k} 0 0 0 ${fmt4(-k * 0.45)}" result="g"/><feComposite in="g" in2="SourceAlpha" operator="in"/></filter>`;
    return { defs, overlay: geom.replace(/^<(\w+)/, `<$1 fill="#000" filter="url(#${id})"`) };
  }
  const T = 14 * (p.scale || 1) * (['granules', 'fibres', 'stroma', 'chromatin', 'droplets', 'trabeculae'].includes(p.kind) ? 4 : 1);
  const defs = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${fmt4(T)}" height="${fmt4(T)}"${p.angle ? ` patternTransform="rotate(${p.angle})"` : ''}>${patternTile(p.kind, T, c, p.seed)}</pattern>`;
  return { defs, overlay: geom.replace(/^<(\w+)/, `<$1 fill="url(#${id})" stroke="none" opacity="${op}"`) };
}

// ---------- One light source for the figure ----------
// state.doc.light: the direction light comes from, in compass degrees (0 = top, 90 = right; 315 = top-left).
// When set, every shading style and drop shadow is lit from that side.
function figureLight() { const v = typeof state !== 'undefined' && state.doc ? state.doc.light : null; return v == null || v === '' ? null : +v; }
function lightVec(deg) { const a = (deg * Math.PI) / 180; return { lx: Math.sin(a), ly: -Math.cos(a) }; }
function litPaint(o, geom, deg) {
  const base = o.fill, hex = normHex(base), shade = o.shade || 'flat';
  if (!hex || shade === 'flat') return null;
  const { lx, ly } = lightVec(deg), id = `sh-${o.id}`, Lt = (t) => Color.light(hex, t), Dk = (t) => Color.dark(hex, t);
  let defs = '', overlay = '', fill = `url(#${id})`;
  switch (shade) {
    case 'soft': case 'gloss':
      defs = `<radialGradient id="${id}" cx="${fmt4(0.5 + 0.17 * lx)}" cy="${fmt4(0.5 + 0.2 * ly)}" r="0.78"><stop offset="0" stop-color="${Lt(0.55)}"/><stop offset="0.55" stop-color="${hex}"/><stop offset="1" stop-color="${Dk(0.3)}"/></radialGradient>`;
      if (shade === 'gloss') {
        defs += `<clipPath id="cl-${o.id}">${geom}</clipPath><radialGradient id="hl-${o.id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
        overlay = `<g clip-path="url(#cl-${o.id})"><ellipse cx="${fmt4(o.w * (0.5 + 0.2 * lx))}" cy="${fmt4(o.h * (0.5 + 0.33 * ly))}" rx="${fmt4(o.w * 0.26)}" ry="${fmt4(o.h * 0.15)}" fill="url(#hl-${o.id})"/></g>`;
      }
      break;
    case 'linear':
      defs = `<linearGradient id="${id}" x1="${fmt4(0.5 + 0.5 * lx)}" y1="${fmt4(0.5 + 0.5 * ly)}" x2="${fmt4(0.5 - 0.5 * lx)}" y2="${fmt4(0.5 - 0.5 * ly)}"><stop offset="0" stop-color="${Lt(0.45)}"/><stop offset="1" stop-color="${Dk(0.25)}"/></linearGradient>`;
      break;
    case 'inner': {
      fill = hex;
      const k = Math.max(2, Math.min(o.w, o.h) * 0.06);
      defs = `<clipPath id="cl-${o.id}">${geom}</clipPath><filter id="ib-${o.id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${fmt4(Math.max(2, Math.min(o.w, o.h) * 0.08))}"/></filter>`;
      overlay = `<g clip-path="url(#cl-${o.id})"><g filter="url(#ib-${o.id})" transform="translate(${fmt4(-lx * k)} ${fmt4(-ly * k)})">${geom.replace(/fill="[^"]*"/, '').replace(/^<(\w+)/, `<$1 fill="none" stroke="${Dk(0.45)}" stroke-width="${fmt4(Math.max(4, Math.min(o.w, o.h) * 0.16))}"`)}</g></g>`;
      break;
    }
    case 'rim':
      defs = `<radialGradient id="${id}" cx="${fmt4(0.5 - 0.1 * lx)}" cy="${fmt4(0.5 - 0.1 * ly)}" r="0.55"><stop offset="0" stop-color="${Dk(0.12)}"/><stop offset="0.75" stop-color="${hex}"/><stop offset="1" stop-color="${Lt(0.6)}"/></radialGradient>`;
      break;
    default: return null;
  }
  return { fill, defs, overlay };
}

// ---------- Fill paint: gradients, patterns, fill opacity, light ----------
const _fillPaintD4 = fillPaint;
fillPaint = function (o, geom) {
  const base = o.fill && o.fill !== 'none' ? o.fill : null;
  if (!base) return _fillPaintD4(o, geom);
  const alpha = o.fillAlpha ?? 1;
  let r;
  if (o.fillSpec && (o.fillSpec.stops || []).length >= 2) r = { fill: `url(#fs-${o.id})`, defs: gradientDef(o.fillSpec, `fs-${o.id}`, alpha), overlay: '' };
  else if (o.fill2 && o.fill2 !== 'none') {
    r = _fillPaintD4(o, geom);
    if (o.type === 'path') r.defs += `<linearGradient id="gr-${o.id}" x1="0" y1="0" x2="${o.gradDir === 'h' ? 1 : 0}" y2="${o.gradDir === 'h' ? 0 : 1}"><stop offset="0" stop-color="${o.fill}"/><stop offset="1" stop-color="${o.fill2}"/></linearGradient>`;
  } else {
    const deg = figureLight();
    r = (deg != null && litPaint(o, geom, deg)) || _fillPaintD4(o, geom);
    if (alpha < 1 && r.fill === base) r = { ...r, fill: hexAlpha(base, alpha) };
  }
  if (o.pattern && o.pattern.kind) { const p = patternLayer(o, geom); r = { ...r, defs: r.defs + p.defs, overlay: p.overlay + r.overlay }; }
  return r;
};

// ---------- Extra effects ----------
// innerGlow {color, size} · halo {color, width} (outline that knocks text out of busy backgrounds) ·
// grain (0..1) · depthBlur (px, "in the background") · backdropBlur (px, frosted panel over what's behind)
function effectsFilter(o) {
  const parts = [];
  let cur = 'SourceGraphic', n = 0;
  const next = () => `e${++n}`;
  if (o.halo && o.halo.color) {
    const r = next();
    parts.push(`<feMorphology in="SourceAlpha" operator="dilate" radius="${fmt4(o.halo.width ?? 2.5)}" result="${r}d"/><feFlood flood-color="${o.halo.color}"/><feComposite in2="${r}d" operator="in" result="${r}h"/><feMerge result="${r}"><feMergeNode in="${r}h"/><feMergeNode in="${cur}"/></feMerge>`);
    cur = r;
  }
  if (o.innerGlow && o.innerGlow.color) {
    const r = next();
    parts.push(`<feFlood flood-color="${o.innerGlow.color}" result="${r}f"/><feComposite in="${r}f" in2="SourceAlpha" operator="out" result="${r}o"/><feGaussianBlur in="${r}o" stdDeviation="${fmt4(o.innerGlow.size ?? 6)}" result="${r}b"/><feComposite in="${r}b" in2="SourceAlpha" operator="in" result="${r}g"/><feMerge result="${r}"><feMergeNode in="${cur}"/><feMergeNode in="${r}g"/></feMerge>`);
    cur = r;
  }
  if (o.grain > 0) {
    const r = next(), k = fmt4(o.grain * 1.6);
    parts.push(`<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5" result="${r}n"/><feColorMatrix in="${r}n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${k} 0 0 0 ${fmt4(-k * 0.4)}" result="${r}m"/><feComposite in="${r}m" in2="SourceAlpha" operator="in" result="${r}g"/><feMerge result="${r}"><feMergeNode in="${cur}"/><feMergeNode in="${r}g"/></feMerge>`);
    cur = r;
  }
  if (o.depthBlur > 0) { const r = next(); parts.push(`<feGaussianBlur in="${cur}" stdDeviation="${fmt4(o.depthBlur)}" result="${r}"/>`); cur = r; }
  if (!parts.length) return '';
  return `<filter id="fz-${o.id}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">${parts.join('')}</filter>`;
}
// Inverse of transformFor(o): page coordinates → the object's local box.
function inverseTransform(o) {
  return `${o.flipY ? `translate(0 ${o.h}) scale(1 -1) ` : ''}${o.flipX ? `translate(${o.w} 0) scale(-1 1) ` : ''}${o.rot ? `rotate(${-o.rot} ${o.w / 2} ${o.h / 2}) ` : ''}translate(${-o.x} ${-o.y})`;
}
function objectsBehind(o, objects) {
  const i = (objects || []).findIndex((x) => x.id === o.id);
  if (i <= 0) return [];
  const b = bounds(o);
  return objects.slice(0, i).filter((x) => !x.hidden && x.type !== 'connector' && (() => { const c = bounds(x, objects); return c.x < b.x + b.w && b.x < c.x + c.w && c.y < b.y + b.h && b.y < c.y + c.h; })());
}
function backdropSvg(o, objects) {
  const behind = objectsBehind(o, objects);
  if (!behind.length) return '';
  const rx = o.type === 'rect' ? o.radius || 0 : 0;
  const shape = o.type === 'ellipse' ? `<ellipse cx="${o.w / 2}" cy="${o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}"/>` : o.type === 'shape' ? `<path d="${shapePath(o.kind, o.w, o.h)}"/>` : `<rect width="${o.w}" height="${o.h}" rx="${rx}"/>`;
  return `<defs><clipPath id="bdc-${o.id}">${shape}</clipPath><filter id="bdf-${o.id}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${fmt4(o.backdropBlur)}"/></filter></defs><g clip-path="url(#bdc-${o.id})"><g filter="url(#bdf-${o.id})"><g transform="${inverseTransform(o)}">${behind.map((x) => renderObjectString(x, objects, true)).join('')}</g></g></g>`;
}
const _renderPartsD4 = renderParts;
renderParts = function (o, objects, forExport) {
  const r = _renderPartsD4(o, objects, forExport);
  if (o.type === 'connector') return r;
  const deg = figureLight();
  if (deg != null && r.inner.includes('<feDropShadow dx="2"')) { // drop shadows fall away from the light
    const { lx, ly } = lightVec(deg);
    r.inner = r.inner.replace(/<feDropShadow dx="2" dy="(3|6)"/g, (m, dy) => { const d = dy === '6' ? 6.3 : 3.6; return `<feDropShadow dx="${fmt4(-lx * d)}" dy="${fmt4(-ly * d)}"`; });
  }
  const f = effectsFilter(o);
  if (f) r.inner = `<defs>${f}</defs><g filter="url(#fz-${o.id})">${r.inner}</g>`;
  if (o.backdropBlur > 0) r.inner = backdropSvg(o, objects) + r.inner;
  return r;
};
const _innerKeyD4 = innerKey;
innerKey = function (o, list) {
  let k = _innerKeyD4(o, list) + `|L${figureLight()}`;
  if (o.backdropBlur > 0) k += `|${o.x},${o.y},${o.rot || 0}|` + objectsBehind(o, list).map((x) => `${x.id}:${x.x},${x.y}:${_innerKeyD4(x, list).length}`).join(';');
  return k;
};
// Copy / paste style and graphic styles carry the new properties too.
STYLE_SETS.fillable.push('fillSpec', 'pattern', 'fillAlpha');
STYLE_SETS.common.push('innerGlow', 'halo', 'grain', 'depthBlur', 'backdropBlur');

// ---------- On-canvas handles (gradient, warp corners, cutaway) ----------
// spec: { handles() → [{ id, x, y, color? }], lines() → svg, drag(id, p, e), end?(), hint }
let handleMode = null;
function startHandles(spec) {
  if (handleMode) endHandles();
  handleMode = { ...spec, active: null };
  drawHandles();
  if (spec.hint) toast(spec.hint, 5000);
}
function endHandles() {
  const m = handleMode;
  handleMode = null;
  drawHandles();
  if (m && m.end) m.end();
}
function drawHandles() {
  let layer = document.getElementById('hdLayer');
  if (!handleMode) { if (layer) layer.remove(); return; }
  if (!layer) { layer = document.createElementNS(SVGNS, 'g'); layer.id = 'hdLayer'; $('#viewport').append(layer); }
  const z = state.zoom;
  layer.innerHTML = (handleMode.lines ? handleMode.lines(z) : '') + handleMode.handles().map((h) =>
    `<circle data-hd="${h.id}" cx="${h.x}" cy="${h.y}" r="${(h.r || 6) / z}" fill="${h.color || '#fff'}" stroke="#3b6fd6" stroke-width="${1.6 / z}" style="cursor:move"/>`).join('');
}
svg.addEventListener('pointerdown', (e) => {
  if (!handleMode) return;
  const h = e.target.closest && e.target.closest('[data-hd]');
  if (!h) { endHandles(); return; }
  e.stopImmediatePropagation(); e.preventDefault();
  checkpoint();
  handleMode.active = h.dataset.hd;
}, true);
svg.addEventListener('pointermove', (e) => {
  if (!handleMode || !handleMode.active || !(e.buttons & 1)) return;
  e.stopImmediatePropagation();
  handleMode.drag(handleMode.active, toWorld(e), e);
  renderScene(); renderOverlay(); drawHandles();
}, true);
window.addEventListener('pointerup', () => { if (handleMode && handleMode.active) { handleMode.active = null; markDirty(); renderProps(); } }, true);
window.addEventListener('keydown', (e) => {
  if (!handleMode || isTyping()) return;
  if (e.key === 'Escape' || e.key === 'Enter') { e.stopImmediatePropagation(); e.preventDefault(); endHandles(); }
}, true);
const _applyViewportD4 = applyViewport;
applyViewport = function () { _applyViewportD4(); if (handleMode) drawHandles(); };

function editGradientOnCanvas(o) {
  if (!o.fillSpec) return;
  const s = o.fillSpec, W = (u, v) => localToWorld(o, u * o.w, v * o.h), Lc = (p) => { const q = worldToLocal(o, p); return { u: fmt4(q.x / o.w), v: fmt4(q.y / o.h) }; };
  startHandles({
    hint: 'Drag the handles to move the gradient. Enter or Esc when done',
    handles: () => {
      if (s.kind === 'radial') { const c = W(s.cx ?? 0.5, s.cy ?? 0.5), e = W((s.cx ?? 0.5) + (s.r ?? 0.5), s.cy ?? 0.5); return [{ id: 'c', ...c, color: s.stops[0].color }, { id: 'r', ...e, color: s.stops[s.stops.length - 1].color }]; }
      return [{ id: 'a', ...W(s.x1, s.y1), color: s.stops[0].color }, { id: 'b', ...W(s.x2, s.y2), color: s.stops[s.stops.length - 1].color }];
    },
    lines: (z) => {
      const [a, b] = s.kind === 'radial' ? [W(s.cx ?? 0.5, s.cy ?? 0.5), W((s.cx ?? 0.5) + (s.r ?? 0.5), s.cy ?? 0.5)] : [W(s.x1, s.y1), W(s.x2, s.y2)];
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#3b6fd6" stroke-width="${1.5 / z}" stroke-dasharray="${5 / z} ${3 / z}"/>`;
    },
    drag: (id, p) => {
      const q = Lc(p);
      if (id === 'a') { s.x1 = q.u; s.y1 = q.v; } else if (id === 'b') { s.x2 = q.u; s.y2 = q.v; } else if (id === 'c') { s.cx = q.u; s.cy = q.v; } else s.r = Math.max(0.02, fmt4(Math.abs(q.u - (s.cx ?? 0.5))));
    },
  });
}

// ---------- Properties: fill editor, lighting, effects ----------
function stopsEditor(o) {
  const s = o.fillSpec, upd = () => { renderScene(); markDirty(); };
  const rowFor = (st, i) => el('div', { class: 'row' },
    el('input', { type: 'color', value: toHex(st.color), title: 'Stop colour', style: 'width:34px;min-width:34px;flex:none', oninput: (e) => { checkpoint('stop' + o.id + i); st.color = e.target.value; upd(); } }),
    el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: st.at, title: 'Position', style: 'flex:1', oninput: (e) => { checkpoint('stopat' + o.id + i); st.at = +e.target.value; upd(); } }),
    el('input', { type: 'number', min: 0, max: 100, step: 5, value: Math.round((st.alpha ?? 1) * 100), title: 'Opacity %', style: 'width:52px', oninput: (e) => { checkpoint('stopa' + o.id + i); st.alpha = Math.max(0, Math.min(1, +e.target.value / 100)); upd(); } }),
    s.stops.length > 2 ? btn('✕', () => { checkpoint(); s.stops.splice(i, 1); render({ props: true }); }) : null);
  return el('div', {}, el('div', { class: 'note', textContent: 'Stops: colour · position · opacity %' }), ...s.stops.map(rowFor),
    el('div', { class: 'btnrow' },
      btn('＋ Stop', () => { checkpoint(); const a = s.stops[s.stops.length - 2], b = s.stops[s.stops.length - 1]; s.stops.splice(s.stops.length - 1, 0, { at: (a.at + b.at) / 2, color: Color.mix(toHex(a.color), toHex(b.color), 0.5) }); render({ props: true }); }),
      btn('Reverse', () => { checkpoint(); s.stops = s.stops.map((x) => ({ ...x, at: 1 - x.at })).reverse(); render({ props: true }); }),
      btn('Edit on canvas', () => editGradientOnCanvas(o), 'primary')));
}
function fillEditorSection(o) {
  const s = o.fillSpec, p = o.pattern || {};
  const setKind = (k) => {
    checkpoint();
    if (k === 'solid') delete o.fillSpec;
    else { o.fillSpec = o.fillSpec && o.fillSpec.kind === k ? o.fillSpec : { ...defaultGradient(o, k), stops: o.fillSpec ? o.fillSpec.stops : defaultGradient(o, k).stops }; o.fill2 = null; if (!o.fill || o.fill === 'none') o.fill = '#4a7fd6'; }
    render({ props: true });
  };
  const setPat = (k, v) => { checkpoint('pat' + o.id + k); o.pattern = { ...(o.pattern || {}), [k]: v }; if (k === 'kind' && !v) delete o.pattern; renderScene(); markDirty(); if (k === 'kind') renderProps(); };
  return sect('Fill editor',
    row('Type', el('select', { onchange: (e) => setKind(e.target.value) }, ...[['solid', 'Solid / shading'], ['linear', 'Linear gradient'], ['radial', 'Radial gradient']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (s ? s.kind : 'solid') === v })))),
    s && s.kind === 'linear' ? row('Angle', el('input', { type: 'range', min: -180, max: 180, step: 5, value: gradientAngle(s), oninput: (e) => { checkpoint('gang' + o.id); setGradientAngle(s, +e.target.value); renderScene(); } })) : null,
    s ? stopsEditor(o) : null,
    s ? row('Preset', el('select', { onchange: (e) => { const pr = GRADIENT_PRESETS[+e.target.value]; if (!pr) return; checkpoint(); s.stops = pr[1](normHex(o.fill) || '#4a7fd6'); render({ props: true }); } }, el('option', { textContent: 'Apply a preset…', value: '' }), ...GRADIENT_PRESETS.map(([n], i) => el('option', { value: i, textContent: n })))) : null,
    row('Fill opacity', el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.fillAlpha ?? 1, oninput: (e) => { checkpoint('falpha' + o.id); if (+e.target.value >= 1) delete o.fillAlpha; else o.fillAlpha = +e.target.value; renderScene(); markDirty(); } })),
    row('Pattern', el('select', { onchange: (e) => setPat('kind', e.target.value) }, ...PATTERNS.map(([v, l]) => el('option', { value: v, textContent: l, selected: (p.kind || '') === v })))),
    p.kind ? row('Colour', el('input', { type: 'color', value: toHex(p.color || Color.dark(normHex(o.fill) || '#888888', 0.35)), oninput: (e) => setPat('color', e.target.value) })) : null,
    p.kind ? row('Scale', el('input', { type: 'range', min: 0.3, max: 4, step: 0.1, value: p.scale || 1, oninput: (e) => setPat('scale', +e.target.value) })) : null,
    p.kind && p.kind !== 'noise' ? row('Angle', el('input', { type: 'range', min: 0, max: 180, step: 5, value: p.angle || 0, oninput: (e) => setPat('angle', +e.target.value) })) : null,
    p.kind ? row('Strength', el('input', { type: 'range', min: 0.05, max: 1, step: 0.05, value: p.opacity ?? 0.8, oninput: (e) => setPat('opacity', +e.target.value) })) : null,
    p.kind && !['stripes', 'dots', 'cross', 'hatch', 'checks', 'grid', 'waves', 'bricks'].includes(p.kind) ? btn('Shuffle texture', () => setPat('seed', 1 + Math.floor(Math.random() * 9999))) : null,
    el('div', { class: 'note', textContent: 'Patterns and textures sit on top of the fill, inside the shape, and export as vectors (noise exports as a filter).' }));
}
function effects4Section(o) {
  const set = (k, v) => { checkpoint('fx4' + o.id + k); if (v == null) delete o[k]; else o[k] = v; renderScene(); markDirty(); };
  const sub = (k, f, v) => set(k, { ...(o[k] || {}), [f]: v });
  return sect('More effects',
    row('Inner glow', el('input', { type: 'color', value: toHex(o.innerGlow?.color || '#ffffff'), oninput: (e) => sub('innerGlow', 'color', e.target.value) }), btn(o.innerGlow ? 'Off' : 'On', () => { set('innerGlow', o.innerGlow ? null : { color: '#ffffff', size: 6 }); renderProps(); })),
    o.innerGlow ? row('Glow size', el('input', { type: 'range', min: 1, max: 30, step: 0.5, value: o.innerGlow.size ?? 6, oninput: (e) => sub('innerGlow', 'size', +e.target.value) })) : null,
    row('Halo outline', el('input', { type: 'color', value: toHex(o.halo?.color || '#ffffff'), oninput: (e) => sub('halo', 'color', e.target.value) }), btn(o.halo ? 'Off' : 'On', () => { set('halo', o.halo ? null : { color: '#ffffff', width: 2.5 }); renderProps(); })),
    o.halo ? row('Halo width', el('input', { type: 'range', min: 0.5, max: 10, step: 0.5, value: o.halo.width ?? 2.5, oninput: (e) => sub('halo', 'width', +e.target.value) })) : null,
    row('Grain', el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: o.grain || 0, oninput: (e) => set('grain', +e.target.value || null) })),
    row('Depth blur', el('input', { type: 'range', min: 0, max: 12, step: 0.5, value: o.depthBlur || 0, oninput: (e) => set('depthBlur', +e.target.value || null) })),
    ['rect', 'ellipse', 'shape'].includes(o.type) ? row('Background blur', el('input', { type: 'range', min: 0, max: 20, step: 1, value: o.backdropBlur || 0, oninput: (e) => set('backdropBlur', +e.target.value || null) })) : null,
    ['rect', 'ellipse', 'shape'].includes(o.type) && o.backdropBlur ? el('div', { class: 'note', textContent: 'Frosted panel: lower Fill opacity in the Fill editor to see the blurred figure behind it.' }) : null,
    el('div', { class: 'note', textContent: 'Halo keeps labels readable over busy images. Depth blur pushes cells into the background.' }));
}
function lightingSection() {
  const deg = figureLight(), set = (v) => { checkpoint('light'); state.doc.light = v; renderScene(); markDirty(); };
  const dirs = [['↖', 315], ['↑', 0], ['↗', 45], ['←', 270], ['→', 90], ['↙', 225], ['↓', 180], ['↘', 135]];
  return sect('Lighting (whole figure)',
    row('', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: deg != null, onchange: (e) => { set(e.target.checked ? 315 : null); renderProps(); } }), 'One light source for every shaded object')),
    deg != null ? row('Light from', el('input', { type: 'range', min: 0, max: 359, step: 1, value: deg, oninput: (e) => set(+e.target.value) }), el('span', { textContent: `${deg}°` })) : null,
    deg != null ? el('div', { class: 'btnrow' }, ...dirs.map(([a, v]) => btn(a, () => { set(v); renderProps(); }))) : null,
    el('div', { class: 'note', textContent: 'Soft 3-D, glossy, top-lit, inner shadow and rim light shading, and drop shadows, all follow this direction.' }));
}
const _renderPropsD4 = renderProps;
renderProps = function () {
  _renderPropsD4();
  const sel = selected(), P = $('#props');
  if (!sel.length) { P.append(lightingSection()); return; }
  if (sel.length !== 1) return;
  const o = sel[0];
  if (FILLABLE(o)) placeSection(P, [o.type === 'path' ? 'Drawing' : 'Style'], fillEditorSection(o), true);
  if (o.type !== 'connector') placeSection(P, ['Effects'], effects4Section(o));
};
// Insert a Properties section after the last (or first) section whose title is in `anchors`.
function placeSection(P, anchors, node, first = false) {
  const hits = [...P.querySelectorAll('.sect')].filter((x) => anchors.includes(x.querySelector('h3')?.textContent || ''));
  const at = first ? hits[0] : hits[hits.length - 1];
  if (at) at.after(node); else P.append(node);
}
const SECTION_CHAIN = ['Effects', 'More effects', 'Path tools', 'Warp & perspective', 'Cutaway', 'Graphic style'];
