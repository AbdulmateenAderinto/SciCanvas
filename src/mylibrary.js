// Your own Library (v1.8). Everything stays on this computer.
// - Add any picture to the Library: Library › "＋ Add images…", or drop picture files (PNG, JPG, SVG, WebP, GIF) onto
//   the Library, or right-click a picture on the page › Add picture to Library…. Each picture gets a Name, Related
//   words and Tags (and an optional group), and is saved into My icons, so Library search finds it like any icon.
// - Change the name and tags of any icon already in the Library: right-click it (in the Library or on the page) ›
//   Edit name & tags…. Related words and tags you type rank just below a name match in search; Reset to original
//   brings back the icon's own name and tags. (Stored by packs.js: setIconLabels / labelEntry.)
(() => {
  const MAX = 2000; // longest side kept for pictures, in pixels: sharp in print at icon sizes, small enough to stay quick
  const PICTURE = /^image\/(png|jpe?g|svg\+xml|webp|gif|bmp)$/i;
  const isPicture = (f) => PICTURE.test(f.type) || /\.(png|jpe?g|svg|webp|gif|bmp)$/i.test(f.name);
  const errText = (e) => String(e && e.message || e).replace(/^Error invoking remote method[^:]*: (Error: )?/, '');
  // "Lymph_node-02.png" → "Lymph node 02"
  const nameFromFile = (f) => f.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+-\s+|(?<=\w)-(?=\d)/g, ' ').replace(/\s+/g, ' ').trim() || 'My picture';
  // Words separated by commas (or new lines), tidied: "a,b ,, c" → "a, b, c".
  const tidy = (s) => String(s || '').split(/[,;\n]+/).map((w) => w.trim()).filter(Boolean).join(', ');

  // ---------- Pictures → icons ----------
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That picture could not be read')); i.src = src; });
  // A bitmap as an SVG icon: transparent margins trimmed, longest side at most MAX px, embedded as PNG (or JPEG for
  // photos, which have no transparency and are much smaller that way).
  function rasterIcon(img, jpeg) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('That picture is empty');
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    let x0 = 0, y0 = 0, x1 = w, y1 = h;
    if (!jpeg && w * h <= 40e6) {
      const d = g.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        const row = y * w * 4;
        for (let x = 0; x < w; x++) if (d[row + x * 4 + 3] > 8) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; maxY = y; }
      }
      if (maxX >= 0) { // keep a 2% margin so soft shadows aren't clipped
        const m = Math.round(0.02 * Math.max(maxX - minX, maxY - minY));
        x0 = Math.max(0, minX - m); y0 = Math.max(0, minY - m); x1 = Math.min(w, maxX + 1 + m); y1 = Math.min(h, maxY + 1 + m);
      }
    }
    const k = Math.min(1, MAX / Math.max(x1 - x0, y1 - y0));
    const W = Math.max(1, Math.round((x1 - x0) * k)), H = Math.max(1, Math.round((y1 - y0) * k));
    const o = document.createElement('canvas');
    o.width = W; o.height = H;
    const og = o.getContext('2d');
    og.imageSmoothingQuality = 'high';
    og.drawImage(c, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
    const data = jpeg ? o.toDataURL('image/jpeg', 0.92) : o.toDataURL('image/png');
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><image width="${W}" height="${H}" href="${data}"/></svg>`, preview: data };
  }
  async function fileToIcon(file) {
    if (/svg/i.test(file.type) || /\.svg$/i.test(file.name)) {
      const t = await file.text(), i = t.search(/<svg[\s>]/i);
      if (i < 0) throw new Error('not an SVG drawing');
      const svg = t.slice(i);
      return { svg, preview: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) };
    }
    const url = URL.createObjectURL(file);
    try { return rasterIcon(await loadImg(url), /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name)); } finally { URL.revokeObjectURL(url); }
  }

  // ---------- Add pictures to the Library ----------
  function pickFiles() {
    const inp = el('input', { type: 'file', multiple: true, accept: '.png,.jpg,.jpeg,.svg,.webp,.gif,.bmp,image/*', style: 'display:none' });
    inp.addEventListener('change', () => { const fs = [...inp.files]; inp.remove(); if (fs.length) addFiles(fs); });
    document.body.append(inp);
    inp.click();
  }
  async function addFiles(files) {
    const pics = [...files].filter(isPicture), items = [], failed = [];
    if (!pics.length) { toast('Choose PNG, JPG, SVG, WebP or GIF pictures'); return; }
    if (pics.length > 3) toast(`Preparing ${pics.length} pictures…`);
    for (const f of pics) {
      try { items.push({ ...(await fileToIcon(f)), name: nameFromFile(f.name) }); } catch (e) { failed.push(`${f.name} (${errText(e)})`); }
    }
    if (failed.length) toast(`Skipped ${failed.length}: ${failed.join(', ')}`, 5000);
    if (items.length) openAddDialog(items);
  }
  const myGroups = () => [...new Set(Packs.all.filter((i) => i.pack === 'mine').map((i) => String(i.category || '').replace(/^My icons(?: · )?/, '')).filter(Boolean))].sort();

  function openAddDialog(items) {
    const group = el('input', { type: 'text', placeholder: 'Optional, e.g. Immunology or Lab project', style: 'flex:1' });
    group.setAttribute('list', 'mylibGroups'); // (input.list is read-only as a property)
    const groups = el('datalist', { id: 'mylibGroups' }, ...myGroups().map((g) => el('option', { value: g })));
    const rows = el('div', { class: 'mylib-rows' });
    const status = el('span', { class: 'note' });
    const live = items.map((it) => {
      const name = el('input', { type: 'text', value: it.name, placeholder: 'Name' });
      const related = el('input', { type: 'text', placeholder: 'e.g. phagocyte, monocyte, Mφ' });
      const tags = el('input', { type: 'text', placeholder: 'e.g. innate immunity, figure 2' });
      const row = el('div', { class: 'mylib-row' },
        el('div', { class: 'mylib-thumb' }, el('img', { src: it.preview, alt: '' })),
        el('div', { class: 'mylib-fields' },
          el('label', {}, el('span', { textContent: 'Name' }), name),
          el('label', {}, el('span', { textContent: 'Related words' }), related),
          el('label', {}, el('span', { textContent: 'Tags' }), tags)));
      const x = el('button', { class: 'mylib-x', title: 'Leave this picture out', textContent: '×' });
      x.addEventListener('click', () => { row.remove(); entry.gone = true; if (live.every((r) => r.gone)) closeModal(); });
      row.append(x);
      rows.append(row);
      const entry = { it, name, related, tags, gone: false };
      return entry;
    });
    const save = btn(items.length > 1 ? `Add ${items.length} pictures` : 'Add to Library', async () => {
      const todo = live.filter((r) => !r.gone);
      save.disabled = true;
      let done = 0;
      try {
        for (const r of todo) {
          status.textContent = `Saving ${done + 1} of ${todo.length}…`;
          await window.native.saveUserIcon({ name: r.name.value.trim() || r.it.name, svg: r.it.svg, related: tidy(r.related.value), tags: tidy(r.tags.value), category: group.value.trim() });
          done++;
        }
      } catch (e) { status.textContent = `Saved ${done}; could not save the rest: ${errText(e)}`; save.disabled = false; if (!done) return; }
      await loadPacks();
      activeCat = 'lib:mine'; $('#search').value = ''; renderLibrary();
      closeModal();
      toast(`Added ${done} picture${done === 1 ? '' : 's'} to the Library (My icons). Search finds them by name, related words and tags.`, 4000);
    }, 'primary');
    openModal(items.length > 1 ? `Add ${items.length} pictures to the Library` : 'Add a picture to the Library', el('div', { class: 'mylib', style: 'max-width:680px' },
      el('div', { class: 'note' }, 'Give each picture a name, plus any related words (other names people might search for: synonyms, abbreviations) and tags (topic, project, figure…). Separate words with commas. Search looks at all three. Pictures are saved in My icons on this computer.'),
      el('div', { class: 'row' }, el('label', { textContent: 'Group' }), group, groups),
      rows,
      el('div', { class: 'actions' }, status, btn('Cancel', closeModal), save)));
    setTimeout(() => { live[0].name.select(); live[0].name.focus(); }, 30);
  }

  // A picture already on the page (pasted, dropped or uploaded) → the Library.
  async function addSelectedPicture() {
    const o = selected().find((x) => x.type === 'image');
    if (!o || !o.src) { toast('Select a picture on the page first'); return; }
    try {
      const it = rasterIcon(await loadImg(o.src), /^data:image\/jpe?g/i.test(o.src));
      openAddDialog([{ ...it, name: (o.name || (typeof layerName === 'function' ? layerName(o) : '') || 'My picture').replace(/\.[^.]+$/, '') }]);
    } catch (e) { toast('Could not add that picture: ' + errText(e)); }
  }

  // ---------- Edit the name and tags of any icon ----------
  function thumbFor(e) {
    if (e.native) { const d = el('div', { class: 'mylib-thumb' }); d.innerHTML = nativeThumb(e.id); return d; }
    return el('div', { class: 'mylib-thumb' }, el('img', { src: e.url, alt: '' }));
  }
  function openEditDialog(key) {
    const e = iconEntry(key);
    if (!e) { toast('That icon is not in the Library'); return; }
    const name = el('input', { type: 'text', value: e.name, placeholder: e.origName });
    const related = el('input', { type: 'text', value: e.related || '', placeholder: 'e.g. phagocyte, monocyte, Mφ' });
    const tags = el('textarea', { rows: 3, placeholder: 'e.g. innate immunity, figure 2' });
    tags.value = e.tags || '';
    const lib = e.native ? 'Built-in' : ((Packs.list.find((p) => p.id === e.pack) || {}).name || e.pack);
    const save = () => {
      const n = name.value.trim(), r = tidy(related.value), t = tags.value.trim();
      const changed = (n && n !== e.origName) || r !== (e.ownRelated || '') || t !== (e.origTags || '').trim();
      setIconLabels(key, changed ? { name: n && n !== e.origName ? n : '', related: r, tags: t !== (e.origTags || '').trim() ? t : null } : null);
      closeModal(); renderLibrary();
      toast(changed ? `Saved. Search now finds “${(iconEntry(key) || e).name}” by its name, related words and tags.` : 'No changes');
    };
    const actions = el('div', { class: 'actions' });
    if (e.edited) actions.append(btn('Reset to original', () => { setIconLabels(key, null); closeModal(); renderLibrary(); toast(`Back to “${e.origName}” with its original tags`); }));
    actions.append(btn('Cancel', closeModal), btn('Save', save, 'primary'));
    openModal('Edit name & tags', el('div', { class: 'mylib', style: 'max-width:620px' },
      el('div', { class: 'mylib-row' }, thumbFor(e), el('div', { class: 'mylib-fields' },
        el('label', {}, el('span', { textContent: 'Name' }), name),
        el('label', {}, el('span', { textContent: 'Related words' }), related),
        el('label', {}, el('span', { textContent: 'Tags' }), tags))),
      el('div', { class: 'note' }, `${lib}${e.edited ? ` · originally “${e.origName}”` : ''}. Related words: other names people might search for. Tags: any keywords (topic, project, figure…); the tags shown are the icon’s own and you can change or replace them. Separate words with commas. Saved on this computer.`),
      actions));
    name.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
    related.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') save(); });
    setTimeout(() => name.select(), 30);
  }

  // ---------- Right-click an icon in the Library ----------
  let menu = null;
  const closeMenu = () => { if (menu) { menu.remove(); menu = null; } };
  function openTileMenu(key, x, y) {
    closeMenu();
    const e = iconEntry(key);
    if (!e) return;
    const fav = getFavs().includes(key);
    const item = (label, fn, cls = '') => { const b = el('button', { type: 'button', class: 'libmenu-item ' + cls, textContent: label }); b.addEventListener('click', () => { closeMenu(); fn(); }); return b; };
    menu = el('div', { class: 'libmenu', role: 'menu' },
      el('div', { class: 'libmenu-head', textContent: e.name }),
      item('Edit name & tags…', () => openEditDialog(key)),
      item(fav ? 'Remove from favourites' : 'Add to favourites', () => { toggleFav(key); renderLibrary(); }),
      item('Add to page', () => addIcon(key)));
    if (e.pack === 'mine') menu.append(item('Delete from My icons…', async () => {
      if (!confirm(`Delete “${e.name}” from My icons? Figures that already use it keep it.`)) return;
      await window.native.deleteUserIcon(e.file); setIconLabels(key, null); await loadPacks(); renderLibrary();
    }, 'danger'));
    document.body.append(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, innerWidth - r.width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(y, innerHeight - r.height - 4)) + 'px';
  }

  function setup() {
    const grid = document.getElementById('icongrid'), pane = document.getElementById('lib-library');
    if (!grid || !pane) return;
    // "＋ Add images" and "Libraries…" sit at the top of the Library (1.9.1): the grid keeps loading more icons as you
    // scroll, so buttons at the bottom could never be reached.
    if (!document.getElementById('libtools')) {
      const add = el('button', { type: 'button', textContent: '＋ Add images', title: 'Add your own pictures to the Library, with a name, related words and tags (or drop picture files onto the Library). Right-click any icon to edit its name and tags.' });
      add.addEventListener('click', pickFiles);
      const libs = el('button', { type: 'button', textContent: 'Libraries…', title: 'Icon libraries: install, update, add a library from a folder, My icons' });
      libs.addEventListener('click', () => { if (typeof openLibrariesDialog === 'function') openLibrariesDialog(); });
      const bar = el('div', { id: 'libtools' }, add, libs);
      const before = document.getElementById('libBanner') || grid;
      before.parentNode.insertBefore(bar, before);
    }
    grid.addEventListener('contextmenu', (ev) => {
      const c = ev.target.closest('[data-key]');
      if (!c) return;
      ev.preventDefault(); ev.stopPropagation();
      openTileMenu(c.dataset.key, ev.clientX, ev.clientY);
    });
    document.addEventListener('pointerdown', (ev) => { if (menu && !menu.contains(ev.target)) closeMenu(); }, true);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && menu) { ev.stopPropagation(); closeMenu(); } }, true);
    grid.addEventListener('scroll', closeMenu, { passive: true });
    window.addEventListener('blur', closeMenu);
    // Picture files dropped onto the Library are added to it (anywhere else they go onto the page as before).
    const hasFiles = (ev) => ev.dataTransfer && [...ev.dataTransfer.types].includes('Files');
    pane.addEventListener('dragover', (ev) => { if (!hasFiles(ev)) return; ev.preventDefault(); pane.classList.add('lib-drop'); });
    pane.addEventListener('dragleave', (ev) => { if (!pane.contains(ev.relatedTarget)) pane.classList.remove('lib-drop'); });
    pane.addEventListener('drop', (ev) => {
      pane.classList.remove('lib-drop');
      if (!hasFiles(ev)) return;
      ev.preventDefault();
      addFiles([...ev.dataTransfer.files]);
    });
  }
  if (typeof ARRANGE_COMMANDS !== 'undefined') {
    Object.assign(ARRANGE_COMMANDS, {
      addImagesToLibrary: pickFiles,
      addPictureToLibrary: addSelectedPicture,
      editIconLabels: () => { const o = selected().find((x) => x.type === 'icon'); if (o) openEditDialog(o.iconId); else toast('Select an icon first'); },
    });
  }
  globalThis.MyLibrary = { pickFiles, addFiles, openAddDialog, openEditDialog, openTileMenu, rasterIcon, nameFromFile, tidy };
  setup();
})();
