// Icon finish (v1.2). Restyles every built-in icon drawn before this file towards the calmer look of professional
// scientific illustration: softer, slightly pastel colours, thinner outlines that are only a little darker than
// their fill, and no heavy cartoon edges. It works on each icon's SVG output, so ids, names and saved figures are
// unchanged. Settings › Icon style (or the library's "Classic" toggle) switches back to the original drawings.
(() => {
  const KEY = 'scicanvas:iconStyle';
  const read = () => { try { return (globalThis.localStorage && localStorage.getItem(KEY)) || 'refined'; } catch { return 'refined'; } };
  const IconStyle = { mode: read() };
  globalThis.IconStyle = IconStyle;

  // ---------- Colour ----------
  const hsl = (hex) => {
    let [r, g, b] = Color.hexToRgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  };
  const fromHsl = (h, s, l) => {
    if (!s) return Color.rgbToHex(l * 255, l * 255, l * 255);
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const t = (x) => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
    return Color.rgbToHex(t(h + 1 / 3) * 255, t(h) * 255, t(h - 1 / 3) * 255);
  };
  const softCache = new Map();
  // Pull saturation down a little and lift mid/dark tones, so fills read as illustration rather than clip art.
  function soften(hex) {
    hex = hex.toLowerCase();
    if (hex.length === 4) hex = '#' + hex.slice(1).split('').map((x) => x + x).join('');
    let v = softCache.get(hex);
    if (v) return v;
    const [h, s, l] = hsl(hex);
    v = fromHsl(h, s * (l > 0.75 ? 0.9 : 0.8), l < 0.92 ? l + (0.92 - l) * 0.1 : l);
    softCache.set(hex, v);
    return v;
  }

  // ---------- Outlines ----------
  const attr = (s, name) => { const m = s.match(new RegExp(`\\s${name}="([^"]*)"`)); return m ? m[1] : null; };
  const setAttr = (s, name, val) => s.replace(new RegExp(`(\\s${name}=")[^"]*(")`), `$1${val}$2`);
  const isHex = (c) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c || '');
  const r1 = (n) => Math.round(n * 100) / 100;

  function refine(svg) {
    // Tube outlines are a wide stroke under a narrower stroke with the same path; find those pairs first.
    const widths = new Map();
    for (const m of svg.matchAll(/<path\s[^>]*\bd="([^"]+)"[^>]*>/g)) {
      const w = parseFloat(attr(m[0], 'stroke-width')), fill = attr(m[0], 'fill');
      if (fill !== 'none' || !Number.isFinite(w)) continue;
      const list = widths.get(m[1]) || [];
      list.push({ w, stroke: attr(m[0], 'stroke') });
      widths.set(m[1], list);
    }
    let out = svg.replace(/<(path|circle|ellipse|rect|polygon|polyline)\b[^>]*>/g, (tag) => {
      const fill = attr(tag, 'fill'), stroke = attr(tag, 'stroke'), sw = parseFloat(attr(tag, 'stroke-width'));
      if (!stroke || stroke === 'none' || !Number.isFinite(sw)) return tag;
      if (fill && fill !== 'none') {
        // A filled shape: thinner edge, a little closer to the fill colour.
        let t = setAttr(tag, 'stroke-width', r1(Math.max(0.7, sw * 0.6)));
        if (isHex(fill) && isHex(stroke)) t = setAttr(t, 'stroke', Color.mix(stroke, fill, 0.22));
        return t;
      }
      const d = attr(tag, 'd'), pair = d && widths.get(d);
      if (pair && pair.length > 1) {
        const inner = Math.min(...pair.map((p) => p.w));
        if (sw > inner) { // the outline half of a tube
          let t = setAttr(tag, 'stroke-width', r1(inner + (sw - inner) * 0.55));
          const body = pair.find((p) => p.w === inner);
          if (body && isHex(body.stroke) && isHex(stroke)) t = setAttr(t, 'stroke', Color.mix(stroke, body.stroke, 0.22));
          return t;
        }
      }
      return tag;
    });
    out = out.replace(/#[0-9a-f]{6}(?![0-9a-f])|#[0-9a-f]{3}(?![0-9a-f])/gi, soften);
    return out;
  }

  // ---------- Wrap every icon drawn so far ----------
  const MEMO = 24;
  for (const ic of ICONS) {
    if (ic.refined || ic.classicDraw) continue;
    const orig = ic.draw, memo = new Map();
    ic.classicDraw = orig;
    ic.draw = (c) => {
      if (IconStyle.mode === 'classic') return orig(c);
      const k = String(c);
      let s = memo.get(k);
      if (s === undefined) { s = refine(orig(c)); if (memo.size > MEMO) memo.clear(); memo.set(k, s); }
      return s;
    };
  }
  IconStyle.refine = refine;
  IconStyle.soften = soften;
  IconStyle.set = (mode) => {
    IconStyle.mode = mode === 'classic' ? 'classic' : 'refined';
    try { localStorage.setItem(KEY, IconStyle.mode); } catch { /* storage unavailable */ }
  };
})();
