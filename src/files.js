// Files & teamwork: folder gallery, version history, "file changed by someone else" detection,
// templates (categories, search, save your own, import/export to share), slide sorter with speaker
// notes, poster auto-layout, and opening files by double-click.

// ---------- Changed-on-disk banner (collaborating through a shared folder) ----------
function hideChangedBanner() { const b = $('#changedBanner'); if (b) b.classList.add('hidden'); }
function showChangedBanner(file) {
  const b = $('#changedBanner');
  b.innerHTML = '';
  b.append(el('span', { textContent: `“${file.split(/[\\/]/).pop()}” was changed outside SciCanvas (e.g. by a collaborator).` }),
    btn('Reload their version', async () => {
      if (state.dirty && !confirm('Discard your unsaved changes and load the new version? (Your current version stays in File › Version History if you saved it.)')) return;
      try { loadDoc(JSON.parse(await window.native.readFile(file)), file); toast('Reloaded'); } catch (e) { toast('Could not reload: ' + cleanErr(e)); }
    }, 'primary'),
    btn('Keep mine', hideChangedBanner));
  b.classList.remove('hidden');
}

// ---------- Version history ----------
async function openVersionHistory() {
  if (!state.filePath) { toast('Save the figure first — every save is kept in its version history'); return; }
  const list = await window.native.listVersions(state.filePath);
  const grid = el('div', { class: 'tpl-grid', style: 'grid-template-columns:repeat(4,1fr)' });
  for (const v of list) {
    const when = new Date(v.time);
    grid.append(el('div', { class: 'tpl' },
      el('div', { class: 'thumb' }, v.thumb ? el('img', { src: v.thumb, style: 'max-width:100%;max-height:100%' }) : 'No preview'),
      el('div', { class: 'cap' }, el('b', { textContent: when.toLocaleString() }), el('span', { textContent: `${(v.size / 1024).toFixed(0)} KB` })),
      el('div', { class: 'tpl-choice' },
        btn('Restore', async () => {
          if (!confirm('Replace the current figure with this version? You can still undo by restoring a newer version.')) return;
          const doc = JSON.parse(await window.native.readVersion(state.filePath, v.id));
          const fp = state.filePath; loadDoc(doc, fp); state.dirty = true; updateTitle(); closeModal(); toast('Version restored — save to keep it');
        }, 'primary'),
        btn('Open as copy', async () => { const doc = JSON.parse(await window.native.readVersion(state.filePath, v.id)); if (!confirmDiscard()) return; loadDoc(doc, null); state.dirty = true; updateTitle(); closeModal(); }))));
  }
  openModal('Version history', el('div', { style: 'max-width:900px' },
    el('div', { class: 'note', style: 'margin-bottom:10px' }, `The last 50 saves of “${state.filePath.split(/[\\/]/).pop()}”, newest first. Stored on this computer.`),
    list.length ? grid : el('div', { class: 'note', textContent: 'No earlier versions yet.' })));
}

// ---------- Folder gallery (works with Dropbox / iCloud / Google Drive / OneDrive folders for sharing) ----------
async function folderSection(onOpen) {
  const wrap = el('div');
  const draw = async (dir) => {
    wrap.innerHTML = '';
    if (!dir) {
      wrap.append(el('div', { class: 'note', style: 'margin-bottom:6px' }, 'Pick a figures folder. Put it inside Dropbox, iCloud Drive, Google Drive or OneDrive and share that folder to work on the same files as your team.'),
        btn('Choose folder…', async () => { const d = await window.native.pickFolder(); if (d) { lsSet('scicanvas:folder', d); draw(d); } }));
      return;
    }
    let res;
    try { res = await window.native.listFolder(dir); } catch { lsSet('scicanvas:folder', ''); return draw(''); }
    const root = lsGet('scicanvas:folder', '');
    const crumbs = el('div', { class: 'crumbs' });
    const rel = dir.startsWith(root) ? dir.slice(root.length).split(/[\\/]/).filter(Boolean) : [];
    crumbs.append(el('a', { textContent: root.split(/[\\/]/).pop() || root, onclick: () => draw(root) }));
    rel.forEach((part, i) => { crumbs.append(' › ', el('a', { textContent: part, onclick: () => draw([root, ...rel.slice(0, i + 1)].join('/')) })); });
    const grid = el('div', { class: 'tpl-grid', style: 'grid-template-columns:repeat(4,1fr)' });
    res.folders.forEach((f) => grid.append(el('div', { class: 'tpl folder', onclick: () => draw(f.path) }, el('div', { class: 'thumb', style: 'font-size:46px' }, '📁'), el('div', { class: 'cap' }, el('b', { textContent: f.name })))));
    res.files.forEach((f) => grid.append(el('div', { class: 'tpl', onclick: () => onOpen(f.path) },
      el('div', { class: 'thumb' }, f.thumb ? el('img', { src: f.thumb, style: 'max-width:100%;max-height:100%' }) : 'No preview'),
      el('div', { class: 'cap' }, el('b', { textContent: f.name }), el('span', { textContent: new Date(f.time).toLocaleDateString() })))));
    wrap.append(el('div', { class: 'row' }, crumbs, el('span', { style: 'flex:1' }),
      btn('New folder', async () => {
        const inp = el('input', { type: 'text', placeholder: 'Folder name', style: 'width:160px' });
        const bar = el('div', { class: 'row' }, inp, btn('Create', async () => { try { await window.native.makeFolder(dir, inp.value); draw(dir); } catch (e) { toast(cleanErr(e)); } }, 'primary'), btn('Cancel', () => bar.remove()));
        wrap.insertBefore(bar, grid); inp.focus();
      }),
      btn('Save current figure here…', () => { closeModal(); save(true); }),
      btn('Show in Finder', () => window.native.reveal(dir)),
      btn('Change folder…', async () => { const d = await window.native.pickFolder(); if (d) { lsSet('scicanvas:folder', d); draw(d); } })),
      res.folders.length || res.files.length ? grid : el('div', { class: 'note', textContent: 'No figures or folders here yet.' }));
  };
  await draw(lsGet('scicanvas:folder', ''));
  return wrap;
}
async function openFigurePath(p) {
  if (!confirmDiscard()) return;
  const res = await window.native.openPath(p);
  if (!res) { toast('That file has moved or been deleted'); return; }
  loadDoc(JSON.parse(res.content), res.path); addRecent(res.path); closeModal();
}

// ---------- Templates: categories, search, your own, import / export ----------
const TEMPLATE_CATEGORY = {
  'Receptor signalling pathway': 'Signalling pathways', 'In vivo study workflow': 'Experimental workflows', 'Graphical abstract (3 panel)': 'Graphical abstracts',
  'Control vs treatment (cells)': 'Figure layouts', 'Conference poster (36 × 48 in)': 'Posters', 'Title slide (16:9)': 'Presentations', 'Cell cycle': 'Cycles & processes',
  'Mouse study timeline': 'Experimental workflows', 'Decision flowchart': 'Flowcharts',
};
TEMPLATES.push(
  { name: 'Mechanism of action', desc: 'Drug → target → pathway → effect', category: 'Mechanisms', build() {
    const o = [Make.text('Mechanism of action', 30, 20, { fontSize: 26, bold: true })];
    const mem = Make.brush('membrane', 30, 150, 940, 36, Shapes.line(), { size: 8 });
    const drug = Make.icon('smallmol', 120, 60, 60), rec = Make.icon('receptor', 300, 110, 100), enz = Make.icon('enzyme', 470, 270, 80), tf = Make.icon('protein', 680, 290, 70, { color: '#e8743b' });
    const nuc = Make.ellipse(640, 400, 300, 170, { fill: '#f1ebfa', stroke: '#9b7fd1', dash: true });
    const out = Make.rect(40, 470, 220, 80, { label: 'Outcome:\nreduced proliferation', fill: '#eef7ee', stroke: '#3fa55b' });
    o.push(mem, drug, rec, enz, tf, nuc, out, Make.text('Drug X', 110, 128, { fontSize: 14, bold: true }));
    o.push(Make.connector(drug, rec, { label: 'binds' }), Make.connector(rec, enz, { head: 'bar', color: '#d64545', label: 'inhibits' }), Make.connector(enz, tf, { dash: true, label: 'less activation' }), Make.connector(tf, out, { style: 'curved', curve: 80 }));
    return { name: 'Mechanism', width: 1000, height: 600, background: '#ffffff', objects: o };
  } },
  { name: 'Disease mechanism', desc: 'Trigger → cellular change → tissue damage → symptoms', category: 'Mechanisms', build() {
    const o = [Make.text('Disease mechanism', 30, 20, { fontSize: 26, bold: true })];
    const steps = [['Trigger', 'virus', '#d6584a'], ['Immune activation', 'macrophage', '#9b7fd1'], ['Tissue damage', 'liver', '#a8473a'], ['Clinical signs', 'human', '#4a7fd6']];
    let prev = null;
    steps.forEach(([t, ic, c], i) => { const b = Make.rect(40 + i * 240, 120, 200, 230, { fill: Color.light(c, 0.88), stroke: c, radius: 16 }); const icon = Make.icon(ic, 90 + i * 240, 150, 100); const l = Make.text(t, 0, 290, { fontSize: 16, bold: true, align: 'center' }); l.x = 140 + i * 240 - l.w / 2; o.push(b, icon, l); if (prev) o.push(Make.connector(prev, b, { width: 3 })); prev = b; });
    return { name: 'Disease mechanism', width: 1000, height: 420, background: '#ffffff', objects: o };
  } },
  { name: 'Figure panels 2 × 2', desc: 'Four labelled panels (A–D) for a multi-part figure', category: 'Figure layouts', build() {
    const o = [];
    ['A', 'B', 'C', 'D'].forEach((L, i) => { const x = 30 + (i % 2) * 330, y = 30 + Math.floor(i / 2) * 330; o.push(Make.rect(x, y + 30, 300, 270, { fill: '#f7f8fa', stroke: '#c9d4e3', radius: 8, dash: true, label: 'Drop graph / image here', labelColor: '#9aa5b4', labelSize: 13 }), Make.text(L, x, y, { fontSize: 22, bold: true })); });
    return { name: 'Panels', width: 672, height: 672, background: '#ffffff', objects: o };
  } },
  { name: 'Slide: title + content', desc: 'Heading with a content area and footer', category: 'Presentations', build() {
    return { name: 'Content slide', width: 1280, height: 720, background: '#ffffff', objects: [Make.rect(0, 0, 1280, 110, { fill: '#23395d', stroke: 'none', radius: 0 }), Make.text('Slide title', 60, 32, { fontSize: 40, bold: true, color: '#ffffff' }), Make.text('• Key point one\n• Key point two\n• Key point three', 70, 170, { fontSize: 28, color: '#23395d' }), Make.rect(700, 160, 520, 480, { fill: '#f3f6fb', stroke: '#c9d4e3', radius: 12, label: 'Figure', labelColor: '#9aa5b4' }), Make.text('Lab name · Date', 60, 670, { fontSize: 16, color: '#7a8a96' })] };
  } },
  { name: 'Slide: two columns', desc: 'Compare two conditions side by side', category: 'Presentations', build() {
    const o = [Make.text('Comparison', 60, 40, { fontSize: 40, bold: true, color: '#23395d' })];
    [['Control', '#7a8a96'], ['Treated', '#e8743b']].forEach(([t, c], i) => { o.push(Make.rect(60 + i * 600, 130, 560, 520, { fill: Color.light(c, 0.9), stroke: c, radius: 14 }), Make.text(t, 90 + i * 600, 150, { fontSize: 28, bold: true, color: c })); });
    return { name: 'Two columns', width: 1280, height: 720, background: '#ffffff', objects: o };
  } },
  { name: 'Slide: section header', desc: 'Big section divider', category: 'Presentations', build() {
    return { name: 'Section', width: 1280, height: 720, background: '#23395d', objects: [Make.text('Section title', 100, 290, { fontSize: 64, bold: true, color: '#ffffff' }), Make.text('Subtitle or question', 104, 390, { fontSize: 28, color: '#c9d4e3' }), Make.brush('membrane', -40, 600, 1360, 120, Shapes.wave(), { size: 10, color: '#4a7fd6' })] };
  } },
);
TEMPLATES.forEach((t) => { if (!t.category) t.category = TEMPLATE_CATEGORY[t.name] || 'Other'; });

function userTemplate(t) {
  return {
    name: t.name, desc: t.desc || '', category: t.team ? 'Team templates' : 'My templates', user: !t.team, team: !!t.team, author: t.author || '', file: t.file, raw: t,
    build() {
      if (t.assets) { if (!state.doc.assets) state.doc.assets = {}; Object.assign(state.doc.assets, t.assets); }
      const p = deep(t.page);
      p.objects = cloneObjects(p.objects, p.objects, 0);
      return p;
    },
  };
}
async function openTemplatesDialog() {
  let mine = [];
  try { mine = ((await window.native.listTemplates()) || []).map(userTemplate); } catch { /* browser preview */ }
  const all = [...TEMPLATES, ...mine];
  const cats = ['All', ...new Set(all.map((t) => t.category))];
  let cat = 'All';
  const q = el('input', { type: 'search', class: 'tpl-search', placeholder: 'Search templates by topic or author (pathway, timeline, poster, Alzheimer’s…)' });
  const chips = el('div', { class: 'chips', style: 'margin:0 0 10px' });
  const grid = el('div', { class: 'tpl-grid' });
  const draw = () => {
    chips.innerHTML = '';
    cats.forEach((c) => chips.append(el('button', { class: c === cat ? 'on' : '', textContent: c, onclick: () => { cat = c; draw(); } })));
    const w = q.value.toLowerCase();
    grid.innerHTML = '';
    for (const t of all.filter((x) => (cat === 'All' || x.category === cat) && (!w || w.split(/\s+/).every((t) => `${x.name} ${x.desc} ${x.category} ${x.author || ''}`.toLowerCase().includes(t))))) {
      const thumb = el('div', { class: 'thumb' });
      if (t.raw && t.raw.thumb) thumb.append(el('img', { src: t.raw.thumb, style: 'max-width:100%;max-height:100%' }));
      else { try { thumb.innerHTML = pageSvgString(t.build()).replace('<svg ', '<svg style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet" '); } catch { thumb.textContent = t.name; } }
      const choice = el('div', { class: 'tpl-choice hidden' },
        btn('New page', (e) => { e.stopPropagation(); addTemplatePage(t, 'new'); closeModal(); }, 'primary'),
        btn('Replace page', (e) => { e.stopPropagation(); if (!objs().length || confirm('Replace everything on this page?')) { addTemplatePage(t, 'replace'); closeModal(); } }),
        btn('Add to page', (e) => { e.stopPropagation(); insertObjectsGrouped(t.build().objects, false); closeModal(); }),
        t.user ? btn('Share…', async (e) => { e.stopPropagation(); const f = await window.native.exportTemplate(t.raw); if (f) toast('Template exported — send the .scitemplate file to colleagues'); }) : null,
        t.user ? btn('Delete', async (e) => { e.stopPropagation(); if (confirm(`Delete “${t.name}”?`)) { await window.native.deleteTemplate(t.file); closeModal(); openTemplatesDialog(); } }, 'danger') : null);
      const card = el('div', { class: 'tpl', onclick: () => { $$('.tpl-choice', grid).forEach((c) => c.classList.add('hidden')); choice.classList.remove('hidden'); } }, thumb, el('div', { class: 'cap' }, el('b', { textContent: t.name }), el('span', { textContent: t.desc }), t.author ? el('span', { class: 'tpl-author', textContent: `by ${t.author}`, style: 'color:var(--accent);cursor:pointer', onclick: (e) => { e.stopPropagation(); q.value = t.author; cat = 'All'; draw(); } }) : null), choice);
      grid.append(card);
    }
    if (!grid.children.length) grid.append(el('div', { class: 'note' }, 'No templates match. ', el('a', { href: '#', textContent: 'Request this template', onclick: (e) => { e.preventDefault(); requestContent('template', q.value); } }), ' — or build it and save it with “Save this page as a template”.'));
  };
  q.addEventListener('input', draw);
  draw();
  openModal('Templates', el('div', {}, el('div', { class: 'row' }, q, btn('Save this page as a template…', () => { closeModal(); saveAsTemplate(); }), btn('Import…', async () => { const n = await window.native.importTemplate(); if (n) { toast(`Imported ${n} template${n > 1 ? 's' : ''}`); closeModal(); openTemplatesDialog(); } })),
    chips, grid,
    el('div', { class: 'note', style: 'margin-top:12px' }, 'Open as a new page, replace this page, or add as an editable group. Share your own templates as .scitemplate files. A layout carries meaning — adapt the structure, not just the labels.')));
  setTimeout(() => q.focus(), 30);
}
async function saveAsTemplate() {
  const p = page();
  const name = el('input', { type: 'text', value: p.name, style: 'flex:1' }), desc = el('input', { type: 'text', placeholder: 'Short description', style: 'flex:1' });
  let st = {};
  try { st = (await window.native.getSettings()) || {}; } catch { /* browser preview */ }
  const author = el('input', { type: 'text', value: st.author || '', placeholder: 'Your name (searchable)', style: 'flex:1' });
  const team = el('input', { type: 'checkbox', disabled: !st.teamFolder });
  openModal('Save page as template', el('div', { style: 'max-width:520px' }, field_('Name', name), field_('Description', desc), field_('Author', author),
    field_('', el('label', { style: 'width:auto;color:inherit' }, team, st.teamFolder ? ' Publish to team templates folder' : ' Publish to team (set a team folder in Settings first)')),
    el('div', { class: 'note' }, 'Saved to “My templates” on this computer, or to the shared team folder. Use Share… in Templates to send a file to colleagues.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Save template', async () => {
      const used = {};
      const walk = (o) => { if (o.type === 'icon' && state.doc.assets && state.doc.assets[o.iconId]) used[o.iconId] = state.doc.assets[o.iconId]; if (o.children) o.children.forEach(walk); };
      p.objects.forEach(walk);
      let thumb = '';
      try { thumb = await rasterize(p, Math.min(1, 300 / Math.max(p.width, p.height)), { mime: 'image/jpeg' }); } catch { /* none */ }
      await window.native.saveTemplate({ name: name.value.trim() || 'My template', desc: desc.value.trim(), author: author.value.trim(), team: team.checked, page: { ...deep(p), comments: [] }, assets: used, thumb });
      closeModal(); toast(team.checked ? 'Published to team templates' : 'Template saved');
    }, 'primary'))));
}

// ---------- Slide sorter & speaker notes ----------
function openSlideSorter() {
  const grid = el('div', { class: 'sorter' });
  let dragFrom = null;
  const draw = () => {
    grid.innerHTML = '';
    state.doc.pages.forEach((p, i) => {
      const thumb = el('div', { class: 'sthumb' });
      thumb.innerHTML = pageSvgString(p).replace('<svg ', '<svg style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet" ');
      const card = el('div', { class: 'scard' + (i === state.pageIndex ? ' on' : ''), draggable: true },
        el('div', { class: 'srow' }, el('b', { textContent: `${i + 1}` }), el('input', { type: 'text', value: p.name, oninput: (e) => { p.name = e.target.value; markDirty(); renderPages(); } })),
        thumb,
        el('textarea', { rows: 3, placeholder: 'Speaker notes…', value: p.notes || '', oninput: (e) => { p.notes = e.target.value; markDirty(); } }),
        el('div', { class: 'btnrow' },
          btn('Go to', () => { closeModal(); gotoPage(i); }),
          btn('Duplicate', () => { checkpoint(); const cp = deep(p); cp.id = uid(); cp.name += ' copy'; cp.objects = cloneObjects(p.objects, p.objects, 0); state.doc.pages.splice(i + 1, 0, cp); renderPages(); draw(); }),
          state.doc.pages.length > 1 ? btn('Delete', () => { if (!confirm(`Delete “${p.name}”?`)) return; checkpoint(); state.doc.pages.splice(i, 1); state.pageIndex = Math.min(state.pageIndex, state.doc.pages.length - 1); renderPages(); draw(); }, 'danger') : null));
      card.addEventListener('dragstart', () => { dragFrom = i; });
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('dropping'); });
      card.addEventListener('dragleave', () => card.classList.remove('dropping'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragFrom == null || dragFrom === i) return;
        checkpoint();
        const cur = state.doc.pages[state.pageIndex];
        const [mv] = state.doc.pages.splice(dragFrom, 1);
        state.doc.pages.splice(i, 0, mv);
        state.pageIndex = state.doc.pages.indexOf(cur);
        dragFrom = null; renderPages(); draw();
      });
      grid.append(card);
    });
  };
  draw();
  openModal('Slide sorter & speaker notes', el('div', { style: 'max-width:1000px' },
    el('div', { class: 'note', style: 'margin-bottom:10px' }, 'Drag slides to reorder. Speaker notes show in the presenter (press N) and are exported into PowerPoint.'),
    grid, el('div', { class: 'actions' }, btn('+ New slide', () => { checkpoint(); const c = page(); state.doc.pages.push(newPage(`Slide ${state.doc.pages.length + 1}`, c.width, c.height)); renderPages(); draw(); }), btn('▶ Present', () => { closeModal(); startPresent(); }, 'primary'))));
}

// ---------- Poster auto-layout: arrange sections into equal columns that fill the page ----------
function posterLayoutDialog() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (sel.length < 2) { toast('Select the poster sections (boxes or groups) to arrange'); return; }
  const P = page();
  const cols = el('input', { type: 'number', value: P.width > P.height ? 4 : 3, min: 1, max: 6, style: 'width:70px' });
  const gutter = el('input', { type: 'number', value: Math.round(P.width * 0.02), style: 'width:70px' });
  const margin = el('input', { type: 'number', value: Math.round(P.width * 0.03), style: 'width:70px' });
  const top = el('input', { type: 'number', value: Math.round(P.height * 0.12), style: 'width:70px' });
  openModal('Arrange as poster columns', el('div', { style: 'max-width:460px' },
    field_('Columns', cols), field_('Gutter (px)', gutter), field_('Margin (px)', margin), field_('Top band (px)', top),
    el('div', { class: 'note' }, 'Sections keep their reading order (top-to-bottom, left-to-right), are split evenly across columns, and stretch to fill each column with equal gaps. Re-run after changing the page size.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Arrange', () => { posterLayout(sel, +cols.value, +gutter.value, +margin.value, +top.value); closeModal(); }, 'primary'))));
}
function posterLayout(sel, nCols, gutter, margin, topBand) {
  checkpoint();
  const P = page();
  const items = sel.map((o) => ({ o, b: bounds(o) })).sort((a, b) => a.b.x - b.b.x || a.b.y - b.b.y);
  // Distribute sections in reading order across columns, keeping roughly equal counts.
  const ordered = items.sort((a, b) => Math.round(a.b.x / (P.width / nCols)) - Math.round(b.b.x / (P.width / nCols)) || a.b.y - b.b.y);
  const per = Math.ceil(ordered.length / nCols);
  const colW = (P.width - 2 * margin - gutter * (nCols - 1)) / nCols, colH = P.height - topBand - margin;
  for (let c = 0; c < nCols; c++) {
    const group = ordered.slice(c * per, (c + 1) * per);
    if (!group.length) continue;
    const totalH = group.reduce((s, it) => s + it.b.h, 0), avail = colH - gutter * (group.length - 1);
    let y = topBand;
    for (const it of group) {
      const h = (it.b.h / totalH) * avail, o = it.o;
      o.rot = 0;
      o.x = margin + c * (colW + gutter); o.y = y;
      if (o.type === 'group') reflowGroup(o, colW, h);
      else if (o.type !== 'text') { o.w = colW; o.h = h; postEdit(o); }
      y += h + gutter;
    }
  }
  render({ props: true });
  toast(`Arranged ${items.length} sections in ${nCols} columns`);
}

// Resize a section group without distorting it: full-width parts stretch, the tallest box takes the
// new height, and everything else (headings, text, icons) keeps its natural size.
function reflowGroup(g, W, H) {
  const sx = g.w / g.w0, sy = g.h / g.h0;
  for (const c of g.children) { c.x *= sx; c.y *= sy; if (c.type !== 'connector') { if (c.type === 'text') { c.fontSize *= Math.min(sx, sy); postEdit(c); } else { c.w *= sx; c.h *= sy; } } }
  const oldW = g.w, body = g.children.filter((c) => c.type !== 'connector' && c.type !== 'text').reduce((m, c) => (!m || c.h > m.h ? c : m), null);
  for (const c of g.children) { if (c.type !== 'connector' && c.type !== 'text' && c.w >= oldW * 0.95) c.w = W; }
  if (body) body.h = H - body.y;
  Object.assign(g, { w: W, h: H, w0: W, h0: H });
}

// Drafts written by the AI connector (scripts/mcp-server.js) carry an element layout; build it on open.
async function applyAiDraft() {
  const d = state.doc.aiDraft;
  if (!d) return;
  delete state.doc.aiDraft;
  try {
    const list = await aiToObjects(d);
    const p = state.doc.pages[0];
    p.objects = list; p.width = d.width || p.width; p.height = d.height || p.height;
    state.dirty = true; updateTitle();
    render({ props: true, pages: true }); zoomFit();
    toast('Draft from your AI assistant — every element is editable. Check the science before using it.', 4500);
  } catch (e) { toast('Could not build the draft: ' + cleanErr(e)); }
}

// ---------- Commands & startup hooks ----------
// "Request an icon / template": opens a pre-filled GitHub issue for the project.
function requestContent(kind, query) {
  const title = `Request ${kind}: ${query || ''}`.trim();
  const body = `**What ${kind} do you need?**\n${query || ''}\n\n**What will you use it for?** (field, figure type)\n\n**Reference images or links** (optional)\n`;
  const url = `https://github.com/AbdulmateenAderinto/SciCanvas/issues/new?labels=request&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  window.open(url, '_blank'); // main process routes http(s) links to the default browser
}
const FILE_COMMANDS = { versions: openVersionHistory, saveTemplate: saveAsTemplate, slideSorter: openSlideSorter, posterLayout: posterLayoutDialog, templates: openTemplatesDialog };
function setupFiles() {
  if (window.native.onFileChanged) window.native.onFileChanged((f) => { if (f === state.filePath) showChangedBanner(f); });
  if (window.native.onOpenFile) window.native.onOpenFile((r) => { if (!confirmDiscard()) return; try { loadDoc(JSON.parse(r.content), r.path); addRecent(r.path); } catch { toast('Could not open that file'); } });
}
async function openPendingFile() {
  if (!window.native.pendingOpen) return false;
  const r = await window.native.pendingOpen();
  if (!r) return false;
  try { loadDoc(JSON.parse(r.content), r.path); addRecent(r.path); return true; } catch { return false; }
}
