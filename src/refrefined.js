// Reference-style anatomy for the Refined brain icons (v1.2). These icons keep their ids, names, categories and
// viewBoxes; in the default (Refined) icon style they now use the anatomically accurate drawings from refanatomy.js
// (lobes, sulci and gyri, cerebellar folia, midline structures, basal ganglia), split into named parts like the rest of
// the Refined set. The Classic icon style still shows the original drawings. Loaded after refined4.js and before
// iconfinish.js, so the shared shading applies.
(() => {
  const O = globalThis.Organs;
  if (!O) return;
  const refine = (svg) => (globalThis.IconStyle && IconStyle.refine ? IconStyle.refine(svg) : svg);
  const part = (name, svg) => `<g data-part="${name}">${svg}</g>`;
  const swap = (id, draw) => {
    const ic = ICON_MAP[id];
    if (!ic) return;
    const orig = ic.draw;
    ic.draw = (c) => (globalThis.IconStyle && IconStyle.mode === 'classic' ? orig(c) : refine(draw(c)));
  };
  const fit = O.fit, ART = '#c8323c', VEIN = '#4a6fc0';
  const vessels = (paths, col, w) => paths.map((d) => `<path d="${d}" fill="none" stroke="${D(col, 0.25)}" stroke-width="${w + 0.7}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`).join('');
  // Superficial cortical veins draining up towards the superior sagittal sinus.
  const VEINS = ['M60 30 C62 22 63.6 14 64.4 5.4', 'M72 34 C76 26 78 18 80.6 11', 'M40 26 C40.6 18 42 11 44 4', 'M28 30 C26 22 26 15 28 8.6'];
  swap('r-lateral-brain', (c) => part('brain', fit(O.brainLateral(c), 1.12, 1.12, 4, 0.2)));
  swap('r-lateral-brain-with-vessels', (c) => part('brain', fit(O.brainLateral(c), 1.12, 1.12, 4, 0.2))
    + part('arteries', fit(vessels(O.MCA, ART, 1.3), 1.12, 1.12, 4, 0.2)) + part('veins', fit(vessels(VEINS, VEIN, 1.1), 1.12, 1.12, 4, 0.2)));
  swap('r-brain-sagittal-cut', (c) => part('brain', fit(O.brainSagittal(c), 1.12, 1.12, 4, 0.2)));
  swap('r-brain-superior-view', (c) => part('brain', O.brainSuperior(c)));
  swap('r-brain-coronal-cut', (c) => part('brain', O.brainCoronal(c)));
  swap('r-brain-with-regions-coronal', (c) => part('brain', O.brainCoronal(c, { regions: true })));
  swap('r-lateral-brain-in-head', (c) => part('head', O.headWithBrain(c)));
})();
