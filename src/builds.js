// Slide builds (v1.9). Any object can carry a build step (1, 2, 3…). In Present mode a slide starts with the
// objects that have no step; → (or a click) reveals the next step, fading it in, before moving to the next slide,
// and ← steps back. PowerPoint export turns the steps into click-triggered fade-in animations. Set steps in
// Properties › Build, or select objects in the order they should appear and right-click › Build in selection order.
(() => {
  let step = 0;
  const stepOf = (o) => (o && o.build > 0 ? Math.round(o.build) : 0);
  const maxStep = (p) => (p ? Math.max(0, ...p.objects.filter((o) => !o.hidden).map(stepOf)) : 0);
  const curPage = () => state.doc.pages[presentIndex];

  // The slide at a given step: objects up to that step; the newest ones wrapped so they fade in. Lines measure against
  // the full page, so a line to an object revealed later still points the right way.
  function slideSvg(p, s) {
    const visible = p.objects.filter((o) => !o.hidden && stepOf(o) <= s);
    const body = visible.map((o) => { const str = renderObjectString(o, p.objects, true); return s > 0 && stepOf(o) === s ? `<g class="build-in">${str}</g>` : str; }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}"><rect width="${p.width}" height="${p.height}" fill="${p.background || '#ffffff'}"/>${body}</svg>`;
  }
  const css = document.createElement('style');
  css.textContent = '#presentStage .build-in{animation:sc-build-in .45s ease-out both}@keyframes sc-build-in{from{opacity:0}to{opacity:1}}';
  document.head.append(css);

  const prevShow = showSlide;
  showSlide = function () {
    const p = curPage();
    if (!maxStep(p)) return prevShow();
    const orig = pageSvgString;
    pageSvgString = (pg, opts) => (pg === p ? slideSvg(pg, step) : orig(pg, opts));
    try { prevShow(); } finally { pageSvgString = orig; }
    const hint = $('#presentHint');
    if (hint) hint.textContent += ` · build ${step}/${maxStep(p)}`;
  };
  const prevStart = startPresent;
  startPresent = function (...a) { step = 0; return prevStart.apply(this, a); };

  const FWD = ['ArrowRight', 'ArrowDown', ' ', 'PageDown'], BACK = ['ArrowLeft', 'ArrowUp', 'PageUp'];
  const prevKey = presentKey;
  presentKey = function (e) {
    const p = curPage();
    if (FWD.includes(e.key) && step < maxStep(p)) { step++; showSlide(); return; }
    if (BACK.includes(e.key) && step > 0) { step--; showSlide(); return; }
    const before = presentIndex;
    prevKey(e);
    if (presentIndex !== before) { step = presentIndex < before ? maxStep(curPage()) : 0; showSlide(); }
  };
  $('#present').addEventListener('click', (e) => {
    if (step < maxStep(curPage())) { step++; showSlide(); e.stopImmediatePropagation(); } else step = 0;
  }, true);

  // ---------- Editing builds ----------
  const tops = () => selected().filter((o) => state.doc.pages[state.pageIndex].objects.includes(o));
  ARRANGE_COMMANDS.buildInOrder = () => {
    const sel = state.sel.map((id) => byId(id)).filter((o) => o && page().objects.includes(o));
    if (!sel.length) { toast('Select objects in the order they should appear'); return; }
    checkpoint('build');
    const start = maxStep(page()) - Math.max(0, ...sel.map(stepOf)) + 1;
    sel.forEach((o, i) => { o.build = Math.max(1, start) + i; });
    renderProps(); markDirty(); toast(`Build steps ${sel[0].build}–${sel[sel.length - 1].build} set; ⌘↵ to present`);
  };
  ARRANGE_COMMANDS.clearBuilds = () => { const sel = tops(); if (!sel.length) return; checkpoint('build'); sel.forEach((o) => delete o.build); renderProps(); markDirty(); };
  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu();
    if (tops().length) { t.push({ label: 'Build in selection order (Present mode)', cmd: 'buildInOrder' }); if (tops().some(stepOf)) t.push({ label: 'Clear build steps', cmd: 'clearBuilds' }); }
    return t;
  };
  const prevProps = renderProps;
  renderProps = function () {
    prevProps();
    const sel = tops();
    if (!sel.length) return;
    const v = stepOf(sel[0]);
    const input = el('input', { type: 'number', min: 0, step: 1, value: v || '', placeholder: 'always shown', style: 'width:90px', onchange: (e) => {
      checkpoint('build'); const n = Math.max(0, Math.round(+e.target.value || 0)); sel.forEach((o) => { if (n) o.build = n; else delete o.build; }); markDirty();
    } });
    $('#props').append(sect('Build (Present mode)', row('Appears at step', input), el('div', { class: 'note', textContent: 'Step 0 / empty: shown from the start. → reveals each step before the next slide.' })));
  };

  // ---------- PowerPoint: click-triggered fade-in for each step ----------
  // Shape ids follow pptxexport.js: visible top-level objects get 2, 3, 4… in page order.
  function buildTimingXml(p) {
    const vis = p.objects.filter((o) => !o.hidden), steps = maxStep(p);
    if (!steps) return '';
    const spid = new Map(vis.map((o, i) => [o.id, i + 2]));
    let n = 3, clicks = '';
    for (let s = 1; s <= steps; s++) {
      const shapes = vis.filter((o) => stepOf(o) === s);
      if (!shapes.length) continue;
      const effects = shapes.map((o, k) => {
        const id = spid.get(o.id);
        return `<p:par><p:cTn id="${n++}" presetID="10" presetClass="entr" presetSubtype="0" fill="hold" nodeType="${k ? 'withEffect' : 'clickEffect'}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>`
          + `<p:set><p:cBhvr><p:cTn id="${n++}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn><p:tgtEl><p:spTgt spid="${id}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`
          + `<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="${n++}" dur="400"/><p:tgtEl><p:spTgt spid="${id}"/></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>`;
      }).join('');
      clicks += `<p:par><p:cTn id="${n++}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst><p:par><p:cTn id="${n++}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${effects}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
    }
    return '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
      + clicks + '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst><p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>';
  }
  Object.assign(globalThis, { buildTimingXml, slideBuildSvg: slideSvg });
})();
