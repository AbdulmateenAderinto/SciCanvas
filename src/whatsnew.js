// What's new (v1.3): a short tour of the features added since 1.2, shown once after updating and from Help.
(() => {
  const VERSION = '1.3';
  const ITEMS = [
    ['Pictures instead of lists', 'Right-click menus, toolbar flyouts and many Properties choices (arrowheads, shading, warps, fonts, patterns…) show previews.'],
    ['Quick connect', 'Select an object and drag one of the small side arrows onto another object, or click one (⌥⇧Arrow) to add a connected copy.'],
    ['Line tools', 'Bend points, routing around objects, hops, branches and merges, feedback loops, cofactor arrows (ATP → ADP), scale bars, timelines, flow and animated arrows, SBGN.'],
    ['Pathway editing', 'Drop an icon onto a line to insert it; right-click › Remove from pathway; Select connected; Connect in order; Straighten.'],
    ['Quick add', 'Press / over the canvas and type to add an icon or shape at the pointer.'],
    ['Text helpers', 'Format chemical formulas (H₂O, Ca²⁺), tidy units (µm, °C, ±), LaTeX equations, and gene / protein name styling.'],
    ['Figure check fixes', 'The Check tab now fixes what it finds: small text, hairlines, off-page objects, labels that don’t fit, red/green colours, loose line ends, near-misalignments, mixed fonts — or Fix all.'],
    ['Timeline and cohort builders', 'Insert › Builders › Timeline (“Day 0: implant” lines → a study timeline with icons) Cohort Builder (“Vehicle: 8” → rows of coloured animals with n) Gating Strategy Builder (“Live > CD3+ > CD4+ / CD8+”) and Western Blot Builder (lanes and band intensities → a blot schematic).'],
    ['Legends and brackets', 'Insert a line legend or a colour legend (placed where there is room), and significance brackets between two bars.'],
    ['Faster arranging', 'Smart duplicate (⌘D repeats the step), paste in place (⇧⌘V) or right-click › Paste here, Tidy into grid, Move / Copy to page, Format painter, Tab through objects.'],
    ['Library', 'Library → category → clade dropdowns (PhyloPic in 20 groups), hover previews, Find similar icons.'],
    ['Alt text', 'Properties › Page › Alt text, with Draft from figure (what’s on the page and what the arrows say); saved in exported SVGs.'],
    ['Images', 'Right-click › Trim white / transparent edges crops pasted plots and screenshots to their content.'],
    ['Pathway from text', 'New notation: <=> reversible, -o catalysis, “ : verb” labels and [ATP → ADP] cofactors.'],
    ['Copy as SVG', 'Edit › Copy as SVG pastes into Figma, Illustrator or Inkscape as editable vectors.'],
  ];
  function openWhatsNew() {
    const body = el('div', { style: 'max-width:620px' },
      el('p', { class: 'note', textContent: 'Everything is also in Help (F1), with the keyboard shortcuts at the end.' }),
      ...ITEMS.map(([t, d]) => el('div', { class: 'help' }, el('b', { textContent: t }), el('div', { textContent: d }))));
    openModal(`What’s new in SciCanvas ${VERSION}`, body);
  }
  globalThis.openWhatsNew = openWhatsNew;
  ARRANGE_COMMANDS.whatsNew = openWhatsNew;
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
