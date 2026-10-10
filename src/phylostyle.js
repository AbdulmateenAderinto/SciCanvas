// PhyloPic in the Refined style (v1.3). PhyloPic's 13,000 organism silhouettes are solid black shapes, which clash
// with the illustrated icons. In the Refined icon style each one is drawn instead with a muted fill, a thin outline in
// a darker tone and a soft highlight along the top-left edge, like the rest of the Refined set. Recolouring (Tint)
// recolours that fill, "Plain silhouette" in Properties brings back the black original for a single icon (phylogeny
// figures use silhouettes), and the Classic icon style shows every original. The library grid shows the same colour.
// Loaded after app.js: it wraps iconMarkup / iconBaseColors (packs.js) and iconColourSection (app.js).
(() => {
  const PHYLO_COLOUR = '#8a9bad'; // muted slate: neutral, sits with the Refined palette, recolour with Tint
  globalThis.PHYLO_COLOUR = PHYLO_COLOUR;
  const line = (c) => (globalThis.RefinedKit ? RefinedKit.line(c) : D(c, 0.26));
  const restyled = (o, a) => a && a.pack === 'phylopic' && !o.silhouette && !(globalThis.IconStyle && IconStyle.mode === 'classic');

  // Almost every PhyloPic file is potrace output: paths inside <g transform="… scale(0.1,-0.1)" fill="#000000"
  // stroke="none">. Strokes inherited into that group are drawn 10× thinner, so the outline width is divided by the
  // same factor. The few files without that group get scale 1.
  function phyloSoft(svg, vb, colour, uid) {
    const [, , vw, vh] = String(vb).split(/[\s,]+/).map(Number);
    const size = Math.max(vw || 100, vh || 100);
    const k = /scale\(\s*0?\.10*\s*,\s*-0?\.10*\s*\)/.test(svg) ? 0.1 : 1;
    const shape = svg.replace(/\sfill="#0{3}(?:0{3})?"/gi, '').replace(/\sstroke="none"/gi, '').replace(/fill:\s*#0{3}(?:0{3})?;?/gi, '');
    const id = `pp${String(uid || 'x').replace(/[^\w-]/g, '')}`;
    const outline = size * 0.024, shift = size * 0.02; // outline: half of it shows outside the fill
    return `<defs><g id="${id}">${shape}</g><mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="${vw}" height="${vh}"><use href="#${id}" fill="#ffffff"/></mask></defs>`
      + `<g data-part="organism"><use href="#${id}" fill="${line(colour)}" stroke="${line(colour)}" stroke-width="${(outline / k).toFixed(2)}" stroke-linejoin="round"/>`
      + `<use href="#${id}" fill="${colour}"/>`
      + `<g mask="url(#${id}m)"><use href="#${id}" fill="${L(colour, 0.34)}"/><use href="#${id}" fill="${colour}" transform="translate(${shift.toFixed(1)} ${shift.toFixed(1)})"/></g></g>`;
  }
  globalThis.phyloSoft = phyloSoft;
  // Silhouettes touch the edges of their view box; widen it by the outline so the edge isn't clipped.
  function padVb(vb) {
    const [x, y, w, h] = String(vb).split(/[\s,]+/).map(Number), p = Math.max(w || 100, h || 100) * 0.014;
    return [x - p, y - p, w + 2 * p, h + 2 * p].map((v) => +v.toFixed(2)).join(' ');
  }
  globalThis.phyloViewBox = padVb;

  const prevMarkup = iconMarkup;
  iconMarkup = function (o) {
    const a = !ICON_MAP[o.iconId] && getAsset(o.iconId);
    if (!restyled(o, a)) return prevMarkup(o);
    let markup = phyloSoft(a.svg, a.vb, o.tint || PHYLO_COLOUR, o.id);
    if (o.colorMap) markup = applyColorMap(markup, o.colorMap);
    if (o.layerStyle && Object.keys(o.layerStyle).length) markup = layerStyleCss(o) + markup;
    return { markup, vb: padVb(a.vb) };
  };
  const prevBase = iconBaseColors;
  iconBaseColors = function (o) {
    const a = !ICON_MAP[o.iconId] && getAsset(o.iconId);
    if (!restyled(o, a)) return prevBase(o);
    const c = o.tint || PHYLO_COLOUR;
    return [c, line(c), L(c, 0.34)];
  };

  // Properties › Colour: a per-icon switch back to the plain black silhouette.
  if (typeof iconColourSection === 'function') {
    const prevSection = iconColourSection;
    iconColourSection = function (o) {
      const s = prevSection(o), a = !ICON_MAP[o.iconId] && getAsset(o.iconId);
      if (a && a.pack === 'phylopic' && !(globalThis.IconStyle && IconStyle.mode === 'classic')) {
        s.append(row('', check([o], 'silhouette', 'Plain black silhouette')));
      }
      return s;
    };
  }
})();
