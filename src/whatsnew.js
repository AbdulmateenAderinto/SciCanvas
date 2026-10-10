// What's new (v1.3): a short tour of the features added since 1.2, shown once after updating and from Help.
(() => {
  const VERSION = '1.3';
  const ITEMS = [
    ['Pictures instead of lists', 'Right-click menus, toolbar flyouts and many Properties choices (arrowheads, shading, warps, fonts, patterns…) show previews.'],
    ['Quick connect', 'Select an object and drag one of the small side arrows onto another object, or click one (⌥⇧Arrow) to add a connected copy.'],
    ['Line tools', 'Bend points, routing around objects, hops, branches and merges, feedback loops, cofactor arrows (ATP → ADP), scale bars, timelines, flow and animated arrows, SBGN.'],
    ['Pathway editing', 'Drop an icon onto a line to insert it; right-click › Remove from pathway; Select connected; Connect in order; Straighten.'],
    ['Quick add', 'Press / over the canvas and type to add an icon or shape at the pointer.'],
    ['Text helpers', 'Format chemical formulas (H₂O, Ca²⁺), tidy units, statistics and species names (µm, °C, ±, p < 0.05, E. coli), LaTeX equations, and gene / protein name styling.'],
    ['Figure check fixes', 'The Check tab now fixes what it finds: small text, hairlines, off-page objects, labels that don’t fit, red/green colours, loose line ends, near-misalignments, mixed fonts — or Fix all.'],
    ['Timeline and cohort builders', 'Insert › Builders › Timeline (“Day 0: implant” lines → a study timeline with icons) Cohort Builder (“Vehicle: 8” → rows of coloured animals with n) Gating Strategy Builder (“Live > CD3+ > CD4+ / CD8+”) and Western Blot Builder (lanes and band intensities → a blot schematic).'],
    ['Legends and brackets', 'Insert a line legend or a colour legend (placed where there is room), and significance brackets between two bars.'],
    ['Faster arranging', 'Smart duplicate (⌘D repeats the step), paste in place (⇧⌘V) or right-click › Paste here, Tidy into grid, Arrange in a circle (with Connect in order for cycle diagrams), Move / Copy to page, Format painter, Tab through objects.'],
    ['Library', 'Library → category → clade dropdowns (PhyloPic in 20 groups), hover previews, Find similar icons.'],
    ['Alt text', 'Properties › Page › Alt text, with Draft from figure (what’s on the page and what the arrows say); saved in exported SVGs.'],
    ['Images', 'Double-click an image to crop it on the canvas; right-click › Trim white / transparent edges crops pasted plots and screenshots to their content.'],
    ['Pathway from text', 'New notation: <=> reversible, -o catalysis, “ : verb” labels and [ATP → ADP] cofactors.'],
    ['Presenting', 'In Present mode, L toggles a laser pointer and B blanks the screen.'],
    ['Copy as SVG', 'Edit › Copy as SVG pastes into Figma, Illustrator or Inkscape as editable vectors.'],
  ];
  function openWhatsNew() {
    const body = el('div', { style: 'max-width:620px' },
      el('p', { class: 'note', textContent: 'Everything is also in Help (F1), with the keyboard shortcuts at the end.' }),
      el('div', { class: 'btnrow' }, btn('Take the tour', () => ARRANGE_COMMANDS.tour(), 'primary')),
      ...ITEMS.map(([t, d]) => el('div', { class: 'help' }, el('b', { textContent: t }), el('div', { textContent: d }))));
    openModal(`What’s new in SciCanvas ${VERSION}`, body);
  }
  globalThis.openWhatsNew = openWhatsNew;
  ARRANGE_COMMANDS.whatsNew = openWhatsNew;

  // Present mode extras: L laser pointer (red dot following the mouse), B blank (black) screen.
  if (typeof presentKey === 'function') {
    const pres = document.getElementById('present');
    const dot = el('div', { class: 'laser hidden' }), blank = el('div', { class: 'present-blank hidden' });
    if (pres) pres.append(dot, blank);
    let laser = false;
    if (pres) pres.addEventListener('mousemove', (e) => { if (laser) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; } });
    const prevKey = presentKey;
    presentKey = function (e) {
      const k = e.key.toLowerCase();
      if (k === 'l') { laser = !laser; dot.classList.toggle('hidden', !laser); pres.classList.toggle('laser-on', laser); return; }
      if (k === 'b' || k === '.') { blank.classList.toggle('hidden'); return; }
      if (e.key === 'Escape') { laser = false; dot.classList.add('hidden'); blank.classList.add('hidden'); pres.classList.remove('laser-on'); }
      if (!blank.classList.contains('hidden')) blank.classList.add('hidden');
      return prevKey(e);
    };
  }

  // A short guided tour: a bubble beside each part of the window, Next / Back / Done.
  const TOUR = [
    ['#lib-library, #left', 'Icons', 'Search about 26,800 icons; pick a library and category from the dropdowns. Drag an icon onto the page, or rest on one for a large preview. Press / over the page to add one at the pointer.'],
    ['[data-ltab="shapes"]', 'Shapes and lines', 'Shapes, SBGN glyphs and ready-made line styles. Drag a line style onto a line to restyle it.'],
    ['#tools', 'Tools', 'Right-click any tool for a picture grid of its variants (shapes, line styles, brushes, pencil modes).'],
    ['#stage', 'The page', 'Right-click for picture menus. Select one object and drag a small side arrow to another object to connect them, or click the arrow to add a connected copy.'],
    ['[data-rtab="props"]', 'Properties', 'Everything about the selection, with picture choices for arrowheads, shading, warps and fonts. Lines have Line extras: bend, route, labels, cofactors, scale bars.'],
    ['[data-rtab="check"]', 'Check', 'Checks the figure for print size, colours, overlaps and loose line ends, and fixes most of it in one click.'],
    ['#topbar', 'Builders and more', 'Insert › Builders makes timelines, study groups, gating strategies and western blots from a few lines of text. Help (F1) lists every feature and shortcut.'],
  ];
  let tourStep = -1, tourBox = null;
  const endTour = () => { tourStep = -1; if (tourBox) { tourBox.remove(); tourBox = null; } document.querySelectorAll('.tour-hi').forEach((x) => x.classList.remove('tour-hi')); };
  function showTour(i) {
    endTour();
    tourStep = i;
    const [sel, title, text] = TOUR[i];
    const target = sel.split(',').map((x) => document.querySelector(x.trim())).find((x) => x && x.getBoundingClientRect().width);
    if (target) target.classList.add('tour-hi');
    tourBox = el('div', { class: 'tour-box' },
      el('div', { class: 'note', textContent: `${i + 1} of ${TOUR.length}` }), el('b', { textContent: title }), el('p', { textContent: text }),
      el('div', { class: 'btnrow' },
        i > 0 ? btn('Back', () => showTour(i - 1)) : null,
        i < TOUR.length - 1 ? btn('Next', () => showTour(i + 1), 'primary') : btn('Done', endTour, 'primary'),
        btn('Skip', endTour)));
    document.body.append(tourBox);
    const r = target ? target.getBoundingClientRect() : { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 3, bottom: innerHeight / 3, width: 0 };
    const b = tourBox.getBoundingClientRect();
    let x = r.right + 12, y = r.top + 8;
    if (x + b.width > innerWidth - 8) x = Math.max(8, r.left - b.width - 12);
    if (r.width > innerWidth * 0.5) { x = (innerWidth - b.width) / 2; y = Math.min(innerHeight - b.height - 20, r.top + 80); } // big targets: centre the bubble
    tourBox.style.left = Math.max(8, x) + 'px';
    tourBox.style.top = Math.max(8, Math.min(innerHeight - b.height - 8, y)) + 'px';
  }
  ARRANGE_COMMANDS.tour = () => { closeModal(); showTour(0); };
  window.addEventListener('keydown', (e) => { if (tourStep >= 0 && e.key === 'Escape') endTour(); }, true);
  const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  globalThis.versionNewer = newer;
  ARRANGE_COMMANDS.checkUpdates = async () => {
    if (!window.native.checkUpdates) return;
    toast('Checking for updates…');
    try {
      const u = await window.native.checkUpdates();
      if (u.latest && newer(u.latest, u.current)) {
        openModal('Update available', el('div', { style: 'max-width:420px' },
          el('p', { textContent: `SciCanvas ${u.latest} is available (you have ${u.current}).` }),
          el('div', { class: 'btnrow' }, el('button', { class: 'primary', textContent: 'Open the download page', onclick: () => { window.open(u.url); closeModal(); } }))));
      } else toast(`You have the latest version (${u.current})`);
    } catch (e) { toast('Could not check for updates: ' + e.message); }
  };
  setTimeout(() => {
    try {
      if (localStorage.getItem('scicanvas:whatsnew') === VERSION) return;
      if (!document.querySelector('#modal') || !document.querySelector('#modal').classList.contains('hidden')) return; // another dialog is up: next time
      localStorage.setItem('scicanvas:whatsnew', VERSION);
      openWhatsNew();
    } catch { /* storage unavailable: skip */ }
  }, 1500);
})();
