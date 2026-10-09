// Library UI, rulers & guides, group editing, comments, recent files, settings, credits, help, AI drafting, boot.

let appSettings = { hasApiKey: false, author: '', field: '' };
const saveView = () => lsSet('scicanvas:view', state.view);

// ---------- Library ----------
let activeCat = 'All', libLimit = 240;
function renderLibrary() {
  const q = $('#search').value.trim();
  $$('#cats [data-cat]').forEach((b) => b.classList.toggle('active', b.dataset.cat === activeCat));
  const sel = $('#catSel');
  const cats = allCategories();
  if (sel.options.length !== cats.length + 1) sel.innerHTML = '<option value="">Category…</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  sel.value = cats.includes(activeCat) ? activeCat : '';
  const smart = activeCat === 'All' && typeof smartResults === 'function' ? smartResults(q) : null;
  $('#smartNote').classList.toggle('hidden', !smart);
  if (smart) $('#smartNote').textContent = `✦ Smart search: ${smart.terms.join(' · ')}`;
  const { total, items } = smart || searchIcons(q, { cat: activeCat, limit: libLimit, field: appSettings.field });
  const favs = new Set(getFavs());
  $('#icongrid').innerHTML = items.map((it) => {
    let pic;
    if (it.native) { const vb = iconViewBox(it.id); pic = `<svg viewBox="-4 -4 ${vb.w + 8} ${vb.h + 8}">${ICON_MAP[it.id].draw(ICON_MAP[it.id].color)}</svg>`; }
    else pic = `<img loading="lazy" decoding="async" src="${it.url}" alt="">`;
    const tip = it.native ? it.name : `${it.name} — ${it.author} (${LICENSE_NAMES[it.license] || it.license})${it.kb > 1024 ? ` · ${(it.kb / 1024).toFixed(1)} MB` : ''}`;
    const nc = isNonCommercial(it.license) ? '<em class="nc" title="Non-commercial licence">NC</em>' : '';
    return `<div class="icon-cell" draggable="true" data-key="${esc(it.key)}" title="${esc(tip)}">${nc}<button class="fav${favs.has(it.key) ? ' on' : ''}" data-fav="${esc(it.key)}" title="Favourite">${favs.has(it.key) ? '★' : '☆'}</button>${pic}<span>${esc(it.name)}</span></div>`;
  }).join('') || `<div class="note" style="grid-column:1/-1">${activeCat === '★ Favorites' ? 'No favourites yet — click the ☆ on any icon.' : activeCat === 'Recent' ? 'Icons you use will appear here.' : `No icons match “${esc(q)}”. Try a broader term, upload your own SVG, insert a structure from PubChem / PDB, or <a href="#" data-request-icon="${esc(q)}">request this icon</a>.`}</div>`;
  const foot = $('#libfoot');
  foot.innerHTML = '';
  foot.append(el('span', { textContent: `${total.toLocaleString()} icon${total === 1 ? '' : 's'}` }));
  if (total > items.length) foot.append(btn(`Show more (${(total - items.length).toLocaleString()})`, () => { libLimit += 480; renderLibrary(); }));
  foot.append(el('div', { class: 'btnrow' }, btn('✦ Create icon with AI', () => openAIIconDialog($('#search').value.trim())), btn('Libraries…', openLibrariesDialog)));
  foot.append(el('div', { class: 'note', style: 'margin-top:4px' }, `${(ICONS.length + Packs.all.length).toLocaleString()} icons from ${Packs.list.filter((p) => p.id !== 'mine').length + 1} libraries (CC0 / CC BY / MIT). Non-commercial icons are marked NC. File › Credits drafts your attributions.`));
}
function renderLibraryBanner() {
  const b = $('#libBanner');
  if (!replaceTarget) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  b.innerHTML = '';
  b.append(el('span', { textContent: replaceAll ? 'Replace all — click an icon to swap it in for every matching icon on this page.' : 'Replace mode — click an icon to swap it in.' }), btn('Cancel', () => { replaceTarget = null; replaceAll = false; renderLibraryBanner(); }));
}
function setupLibrary() {
  let t;
  $('#search').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { libLimit = 240; if (activeCat !== 'All' && $('#search').value && !['★ Favorites', 'Recent'].includes(activeCat)) activeCat = 'All'; renderLibrary(); }, 120); });
  $('#cats').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { activeCat = b.dataset.cat; libLimit = 240; renderLibrary(); } });
  $('#catSel').addEventListener('change', (e) => { activeCat = e.target.value || 'All'; libLimit = 240; renderLibrary(); });
  $('#icongrid').addEventListener('click', (e) => {
    const req = e.target.closest('[data-request-icon]');
    if (req) { e.preventDefault(); requestContent('icon', req.dataset.requestIcon); return; }
    const f = e.target.closest('[data-fav]');
    if (f) { e.stopPropagation(); toggleFav(f.dataset.fav); renderLibrary(); return; }
    const c = e.target.closest('[data-key]');
    if (c) addIcon(c.dataset.key);
  });
  $('#icongrid').addEventListener('dragstart', (e) => { const c = e.target.closest('[data-key]'); if (c) e.dataTransfer.setData('application/x-scicanvas-icon', c.dataset.key); });
}

// ---------- Rulers & guides ----------
function niceStep(raw) { const mag = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw); }
function drawRulers() {
  const top = $('#rulerTop'), left = $('#rulerLeft');
  top.classList.toggle('hidden', !state.view.rulers); left.classList.toggle('hidden', !state.view.rulers);
  $('#rulerCorner').classList.toggle('hidden', !state.view.rulers);
  if (!state.view.rulers) return;
  const dpr = window.devicePixelRatio || 1, r = stage.getBoundingClientRect();
  const step = niceStep(70 / state.zoom);
  for (const [cv, horiz] of [[top, true], [left, false]]) {
    const W = horiz ? r.width : 20, H = horiz ? 20 : r.height;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#f7f8fa'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#c3c9d1'; ctx.fillStyle = '#6b7785'; ctx.font = '9px -apple-system, Helvetica, Arial';
    const pan = horiz ? state.panX : state.panY, len = horiz ? W : H;
    const start = Math.floor(-pan / state.zoom / step) * step, end = (len - pan) / state.zoom;
    ctx.beginPath();
    for (let v = start; v <= end; v += step / 5) {
      const sc = pan + v * state.zoom, major = Math.abs(v / step - Math.round(v / step)) < 1e-6, tl = major ? 10 : 4;
      if (horiz) { ctx.moveTo(sc + 0.5, 20); ctx.lineTo(sc + 0.5, 20 - tl); if (major) ctx.fillText(String(Math.round(v)), sc + 2, 9); }
      else { ctx.moveTo(20, sc + 0.5); ctx.lineTo(20 - tl, sc + 0.5); if (major) { ctx.save(); ctx.translate(9, sc - 2); ctx.rotate(-Math.PI / 2); ctx.fillText(String(Math.round(v)), 0, 0); ctx.restore(); } }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(59,111,214,.12)';
    const p = page();
    if (horiz) ctx.fillRect(state.panX, 0, p.width * state.zoom, 20); else ctx.fillRect(0, state.panY, 20, p.height * state.zoom);
  }
}
function renderUserGuides() {
  const g = $('#userguides'), p = page();
  if (!state.view.rulers || !p.guides) { g.innerHTML = ''; return; }
  const z = state.zoom;
  let s = '';
  p.guides.v.forEach((x, i) => { s += `<line x1="${x}" y1="-100000" x2="${x}" y2="100000" stroke="#00a3d9" stroke-width="${1 / z}"/><line data-guide="v" data-index="${i}" x1="${x}" y1="-100000" x2="${x}" y2="100000" stroke="transparent" stroke-width="${8 / z}" style="cursor:ew-resize"/>`; });
  p.guides.h.forEach((y, i) => { s += `<line x1="-100000" y1="${y}" x2="100000" y2="${y}" stroke="#00a3d9" stroke-width="${1 / z}"/><line data-guide="h" data-index="${i}" x1="-100000" y1="${y}" x2="100000" y2="${y}" stroke="transparent" stroke-width="${8 / z}" style="cursor:ns-resize"/>`; });
  g.innerHTML = s;
}
function isOverRuler(e, axis) {
  const r = stage.getBoundingClientRect();
  return axis === 'h' ? e.clientY < r.top + 20 : e.clientX < r.left + 20;
}
function setupRulers() {
  for (const [id, axis] of [['#rulerTop', 'h'], ['#rulerLeft', 'v']]) {
    $(id).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      checkpoint();
      const p = page();
      if (!p.guides) p.guides = { v: [], h: [] };
      const w = toWorld(e);
      p.guides[axis].push(Math.round(axis === 'v' ? w.x : w.y));
      drag = { mode: 'guide', axis, index: p.guides[axis].length - 1 };
      renderUserGuides();
    });
  }
  window.addEventListener('resize', drawRulers);
}

// ---------- Editing inside a group ----------
function enterGroupEdit(g) {
  state.sel = [g.id];
  ungroupSelection();
  groupEdit = { ids: new Set(state.sel) };
  state.sel = [];
  toast('Editing inside group — click outside it or press Esc when done');
  render({ props: true });
}
function exitGroupEdit() {
  if (!groupEdit) return;
  const ids = [...groupEdit.ids].filter((id) => byId(id));
  groupEdit = null;
  if (ids.length >= 2) { state.sel = ids; groupSelection(); state.sel = []; }
  render({ props: true });
}

// ---------- Comments ----------
function addComment(p) {
  checkpoint();
  const pg = page();
  if (!pg.comments) pg.comments = [];
  const c = { id: uid(), x: p.x, y: p.y, text: '', author: appSettings.author || 'Me', time: new Date().toISOString(), resolved: false, replies: [] };
  pg.comments.push(c);
  renderComments();
  openComment(c.id, true);
}
function renderComments() {
  const layer = $('#commentlayer'), list = (page().comments || []).filter((c) => !c.resolved);
  const z = state.zoom;
  layer.innerHTML = list.map((c, i) => `<g data-comment="${c.id}" transform="translate(${c.x} ${c.y}) scale(${1 / z})" style="cursor:pointer"><path d="M0 0 L0 -14 A12 12 0 1 1 10 -6 Z" fill="#e8743b" stroke="#fff" stroke-width="2"/><text x="10" y="-15" font-size="11" font-weight="700" fill="#fff" text-anchor="middle" font-family="Helvetica, Arial">${i + 1}</text></g>`).join('');
  if (!$('#comments').classList.contains('hidden')) renderCommentsPanel();
  const n = list.length;
  $('[data-rtab="comments"]').textContent = n ? `Comments (${n})` : 'Comments';
}
function openComment(id, focus) {
  $$('[data-rtab]').forEach((x) => x.classList.toggle('active', x.dataset.rtab === 'comments'));
  ['props', 'layers', 'comments'].forEach((k) => $('#' + k).classList.toggle('hidden', k !== 'comments'));
  renderCommentsPanel(id);
  if (focus) setTimeout(() => { const t = $(`#comments [data-cid="${id}"] textarea`); if (t) t.focus(); }, 30);
}
function renderCommentsPanel(activeId) {
  const P = $('#comments'), pg = page();
  P.innerHTML = '';
  const all = pg.comments || [];
  const showResolved = !!renderCommentsPanel.showResolved;
  P.append(el('div', { class: 'btnrow', style: 'margin-bottom:8px' }, btn('＋ Add comment (M)', () => setTool('comment')),
    el('label', { style: 'display:flex;gap:4px;align-items:center;margin-left:auto' }, el('input', { type: 'checkbox', checked: showResolved, onchange: (e) => { renderCommentsPanel.showResolved = e.target.checked; renderCommentsPanel(); } }), 'Show resolved')));
  const list = all.filter((c) => showResolved || !c.resolved);
  if (!list.length) P.append(el('div', { class: 'note', textContent: 'No comments on this page. Use the comment tool to pin feedback to a spot on the figure. Comments are saved in the file but never exported.' }));
  list.forEach((c) => {
    const idx = all.filter((x) => !x.resolved).indexOf(c) + 1;
    const card = el('div', { class: 'comment' + (c.id === activeId ? ' active' : '') + (c.resolved ? ' resolved' : ''), 'data-cid': c.id },
      el('div', { class: 'chead' }, el('b', { textContent: `${c.resolved ? '✓' : '#' + idx} ${c.author}` }), el('span', { class: 'note', textContent: new Date(c.time).toLocaleString() })),
      el('textarea', { rows: 2, value: c.text, placeholder: 'Write a comment…', oninput: (e) => { c.text = e.target.value; markDirty(); } }),
      ...c.replies.map((r) => el('div', { class: 'reply' }, el('b', { textContent: r.author + ': ' }), r.text)),
      el('div', { class: 'btnrow' },
        el('input', { type: 'text', placeholder: 'Reply…', style: 'flex:1', onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { checkpoint(); c.replies.push({ author: appSettings.author || 'Me', text: e.target.value.trim(), time: new Date().toISOString() }); renderCommentsPanel(c.id); } } }),
        btn(c.resolved ? 'Reopen' : 'Resolve', () => { checkpoint(); c.resolved = !c.resolved; renderComments(); }),
        btn('Go to', () => { state.panX = svg.getBoundingClientRect().width / 2 - c.x * state.zoom; state.panY = svg.getBoundingClientRect().height / 2 - c.y * state.zoom; applyViewport(); renderComments(); }),
        btn('Delete', () => { checkpoint(); pg.comments = all.filter((x) => x !== c); renderComments(); }, 'danger')));
    P.append(card);
  });
}

// ---------- Selection → page (copy / export just the selection) ----------
function selectionPage(margin = 16) {
  const sel = selected();
  if (!sel.length) return page();
  const bb = unionBounds(sel, objs()), ids = new Set(state.sel);
  const dx = -bb.x + margin, dy = -bb.y + margin;
  const objsOut = sel.map((o) => {
    const c = deep(o);
    if (c.type === 'connector') {
      const [a, b] = connectorEnds(o, objs());
      c.from = o.from.id && ids.has(o.from.id) ? { id: o.from.id } : { x: a.x + dx, y: a.y + dy };
      c.to = o.to.id && ids.has(o.to.id) ? { id: o.to.id } : { x: b.x + dx, y: b.y + dy };
    } else { c.x += dx; c.y += dy; }
    return c;
  });
  return { ...page(), width: Math.ceil(bb.w + 2 * margin), height: Math.ceil(bb.h + 2 * margin), background: page().background, objects: objsOut };
}
async function copyAsImage() {
  const p = selectionPage();
  try {
    const data = await rasterize(p, maxScale(p, 3), { mime: 'image/png', transparent: state.sel.length > 0 });
    await window.native.copyImage(data);
    toast(`Copied ${state.sel.length ? 'selection' : 'page'} as image — paste into PowerPoint, Keynote, Word or Slides`);
  } catch (e) { toast('Copy failed: ' + e.message); }
}

// ---------- Recent files / home ----------
async function addRecent(path) {
  let thumb = '';
  try { const p = state.doc.pages[0]; thumb = await rasterize(p, Math.min(1, 300 / p.width), { mime: 'image/jpeg' }); } catch { /* ignore */ }
  const name = path.split(/[\\/]/).pop().replace(/\.scifig$/, '');
  lsSet('scicanvas:recent', [{ path, name, thumb, time: Date.now() }, ...lsGet('scicanvas:recent', []).filter((r) => r.path !== path)].slice(0, 18));
}
async function openHomeDialog() {
  const recent = lsGet('scicanvas:recent', []);
  const start = (fn) => () => { if (!confirmDiscard()) return; closeModal(); fn(); };
  const kinds = [
    ['Illustration', 'Blank canvas for any figure', () => loadDoc(newDoc())],
    ['Graph', 'Data → analysis → plot', () => { loadDoc(newDoc()); openGraphDialog(); }],
    ['Poster', '36 × 48 in conference poster', () => { const d = newDoc(); d.pages = [{ id: uid(), ...TEMPLATES.find((t) => t.name.startsWith('Conference poster')).build() }]; loadDoc(d); }],
    ['Presentation', '16:9 slides with presenter mode', () => { const d = newDoc(); d.pages = [{ id: uid(), ...TEMPLATES.find((t) => t.name.startsWith('Title slide')).build() }, newPage('Slide 2', 1280, 720)]; loadDoc(d); }],
    ['Protocol', 'Smart, auto-numbered method steps', () => { loadDoc(newDoc()); openProtocolDialog(); }],
    ['Generate with AI', 'Describe a figure, get an editable draft', () => { loadDoc(newDoc()); openAIDialog(); }],
  ];
  const grid = el('div', { class: 'tpl-grid', style: 'grid-template-columns:repeat(4,1fr)' });
  for (const r of recent) {
    grid.append(el('div', { class: 'tpl', onclick: async () => {
      if (!confirmDiscard()) return;
      const res = await window.native.openPath(r.path);
      if (!res) { toast('That file has moved or been deleted'); lsSet('scicanvas:recent', recent.filter((x) => x.path !== r.path)); closeModal(); return; }
      loadDoc(JSON.parse(res.content), res.path); addRecent(res.path); closeModal();
    } }, el('div', { class: 'thumb' }, r.thumb ? el('img', { src: r.thumb, style: 'max-width:100%;max-height:100%' }) : 'No preview'),
      el('div', { class: 'cap' }, el('b', { textContent: r.name }), el('span', { textContent: new Date(r.time).toLocaleDateString() }))));
  }
  openModal('Home', el('div', {},
    el('h3', { class: 'dlg-sub', textContent: 'Create new' }),
    el('div', { class: 'newgrid' }, ...kinds.map(([t, d, fn]) => el('div', { class: 'newcard', onclick: start(fn) }, el('b', { textContent: t }), el('span', { textContent: d })))),
    el('h3', { class: 'dlg-sub', textContent: 'Recent figures' }),
    recent.length ? grid : el('div', { class: 'note', textContent: 'Figures you save or open will appear here.' }),
    el('h3', { class: 'dlg-sub', textContent: 'Figures folder' }),
    await folderSection(openFigurePath)));
}

// ---------- Settings ----------
const RESEARCH_FIELDS = ['', ...Object.keys(FIELD_CATS)];
async function openSettingsDialog() {
  appSettings = await window.native.getSettings();
  const author = el('input', { type: 'text', value: appSettings.author, placeholder: 'Your name (for comments)' });
  const field = el('select', {}, ...RESEARCH_FIELDS.map((f) => el('option', { value: f, textContent: f || 'Not set', selected: f === appSettings.field })));
  const key = el('input', { type: 'password', placeholder: appSettings.hasApiKey ? (appSettings.keyFromEnv ? 'Using ANTHROPIC_API_KEY from environment' : '•••••••• saved — type to replace') : 'sk-ant-…', autocomplete: 'off', style: 'flex:1' });
  let teamFolder = appSettings.teamFolder || '';
  const teamLabel = el('span', { class: 'note', style: 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', textContent: teamFolder || 'Not set' });
  const limit = el('input', { type: 'number', min: 0, step: 10, value: appSettings.aiLimit || '', placeholder: 'No limit', style: 'width:110px' });
  const month = new Date().toISOString().slice(0, 7), u = (appSettings.usage || {})[month] || { requests: 0, input: 0, output: 0 };
  const months = Object.entries(appSettings.usage || {}).sort().reverse().slice(0, 6);
  let gpu = '';
  try {
    const g = await window.native.gpuStatus();
    const hw = (v) => /enabled/.test(v || '') && !/software/.test(v || '');
    gpu = g ? `${hw(g.gpu_compositing) && hw(g.rasterization) ? '✓ Hardware accelerated' : '⚠ Partly software'} — compositing: ${g.gpu_compositing}, rasterization: ${g.rasterization}, WebGL: ${g.webgl}` : '';
  } catch { /* browser preview */ }
  openModal('Settings', el('div', { style: 'max-width:560px' },
    gpu ? el('div', { class: 'note', style: 'margin-bottom:12px' }, el('b', { textContent: 'Graphics: ' }), gpu) : null,
    field_('Your name', author),
    field_('Research field', field),
    el('div', { class: 'note', style: 'margin:-2px 0 12px 84px' }, 'Used to rank library search results toward your field.'),
    brandKitSection(),
    el('h3', { class: 'dlg-sub', textContent: 'Team templates' }),
    field_('Folder', el('span', { style: 'display:flex;gap:6px;align-items:center;flex:1;min-width:0' }, teamLabel,
      btn('Choose…', async () => { const f = await window.native.pickFolderPath(); if (f) { teamFolder = f; teamLabel.textContent = f; } }),
      btn('Clear', () => { teamFolder = ''; teamLabel.textContent = 'Not set'; }))),
    el('div', { class: 'note', style: 'margin:0 0 12px 84px' }, 'A shared folder (Dropbox, OneDrive, Google Drive, network drive). Templates published there appear under “Team templates” for everyone who points SciCanvas at the same folder.'),
    el('h3', { class: 'dlg-sub', textContent: 'AI figure drafting' }),
    field_('API key', key),
    el('div', { class: 'note', style: 'margin:0 0 8px 84px' }, 'An Anthropic API key (console.anthropic.com). It is encrypted with your system keychain and only sent to Anthropic when you generate a figure. Usage is billed to your account.'),
    appSettings.hasApiKey && !appSettings.keyFromEnv ? el('div', { style: 'margin-left:84px' }, btn('Remove saved key', async () => { await window.native.saveSettings({ clearKey: true }); toast('Key removed'); openSettingsDialog(); }, 'danger')) : null,
    el('h3', { class: 'dlg-sub', textContent: 'AI usage' }),
    el('div', { class: 'note', style: 'margin-bottom:6px' }, `This month: ${u.requests} request${u.requests === 1 ? '' : 's'}${appSettings.aiLimit ? ` of ${appSettings.aiLimit}` : ''} · ${(u.input / 1000).toFixed(1)}k input + ${(u.output / 1000).toFixed(1)}k output tokens.`),
    appSettings.aiLimit ? el('div', { class: 'meter', style: 'height:6px;background:var(--line);border-radius:3px;margin:0 0 8px;overflow:hidden' }, el('div', { style: `height:100%;width:${Math.min(100, (100 * u.requests) / appSettings.aiLimit)}%;background:${u.requests >= appSettings.aiLimit ? '#d64545' : 'var(--accent)'}` })) : null,
    months.length > 1 ? el('div', { class: 'note', style: 'margin-bottom:6px' }, months.map(([m, x]) => `${m}: ${x.requests}`).join(' · ')) : null,
    field_('Monthly limit', el('span', { style: 'display:flex;gap:6px;align-items:center' }, limit, el('span', { class: 'note', textContent: 'requests (blank = no limit)' }))),
    el('div', { class: 'note', style: 'margin:0 0 8px 84px' }, 'AI features stop for the rest of the month once the limit is reached — a simple way to cap spending. Exact costs are on console.anthropic.com.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Save', async () => {
      try {
        await window.native.saveSettings({ author: author.value.trim(), field: field.value, apiKey: key.value.trim() || undefined, teamFolder, aiLimit: +limit.value || 0 });
        appSettings = await window.native.getSettings();
        renderLibrary(); closeModal(); toast('Settings saved');
      } catch (e) { toast(e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''), 4000); }
    }, 'primary'))));
}
function field_(label, input) { return el('div', { class: 'row' }, el('label', { textContent: label }), input); }

// ---------- Credits ----------
function openCreditsDialog() {
  const { icons, sources } = collectCredits(state.doc);
  const text = creditsText(state.doc);
  const ta = el('textarea', { rows: 5, value: text, style: 'width:100%' });
  const rows = icons.map((a) => el('tr', {}, el('td', { textContent: a.name }), el('td', { textContent: a.author }), el('td', { textContent: LICENSE_NAMES[a.license] || a.license })));
  openModal('Credits & licences', el('div', { style: 'max-width:720px' },
    el('div', { class: 'note', style: 'margin-bottom:8px' }, 'Paste this into your figure legend or acknowledgements. CC BY icons require attribution; CC BY-SA also requires sharing adaptations of the icon under the same licence. Check your journal’s policy on third-party artwork.'),
    ta,
    el('div', { class: 'btnrow', style: 'margin:8px 0 12px' }, btn('Copy text', () => { navigator.clipboard.writeText(ta.value); toast('Copied'); })),
    icons.length ? el('table', { class: 'credits' }, el('tr', {}, el('th', { textContent: 'Icon' }), el('th', { textContent: 'Author' }), el('th', { textContent: 'Licence' })), ...rows) : el('div', { class: 'note', textContent: 'This figure uses only built-in icons and your own content.' }),
    sources.length ? el('div', { class: 'note', style: 'margin-top:8px', textContent: 'Other sources: ' + sources.join(', ') }) : null));
}

// ---------- Help ----------
const HELP = [
  ['Add icons', 'Search the library on the left (built-in + Bioicons). Click to add at the centre, or drag onto the canvas. ☆ marks favourites; “Recent” shows what you used.'],
  ['Recolour an icon', 'Select it. Built-in icons have a Colour; library icons have a Tint (colour overlay). “Colour layers” lists every colour in the icon — recolour or hide each one (e.g. make a nucleus transparent).'],
  ['Replace an icon', 'Select it, click “Replace icon…”, then click a different icon in the library. Size and position are kept.'],
  ['Group / edit inside a group', 'Select several objects and press ⌘G. Double-click a group to edit its parts in place; click outside or press Esc to regroup.'],
  ['Connect objects', 'Press C, then drag from one object to another. The arrow stays attached when objects move. Choose activation, inhibition (⊣) or binding heads, and add a verb label — arrow shape alone is ambiguous.'],
  ['Membranes & DNA', 'Pick a brush (B), choose Freehand / Line / Arc / Ellipse, and drag. Change unit size, colour and type in Properties.'],
  ['Number steps', 'Press N (or Insert › Numbered badge) and click — each click places the next number.'],
  ['Shapes', 'Press S, pick a shape (diamond, hexagon, arrow, cylinder…) and drag. Shapes and rectangles can hold centred labels and gradient fills.'],
  ['Zoom-in callouts', 'Duplicate an object, enlarge it, then set Effects › Crop shape to Circle with a border.'],
  ['Glow / fluorescence', 'Effects › Glow adds a coloured halo — useful for fluorescent labels.'],
  ['Align things', 'Select objects and use Align / Distribute. Smart alignment snaps to edges and centres while dragging (hold ⌘ to suspend). View › Rulers lets you drag guides out of the rulers; drag a guide back onto the ruler to delete it. View › Grid / Snap to grid for graph-paper layouts.'],
  ['Templates', 'Templates: search, then Replace page, Add to page (as a group), or open as a New page. Adapt the structure, not just the labels.'],
  ['Protocols', 'Protocol builds numbered method diagrams from presets (ELISA, western, qPCR…). Resize the width and steps re-wrap; edit lines to reorder.'],
  ['Graphs', 'Graph: paste data from Excel. Bar, box, scatter/regression, line, dose–response (4PL, EC50), Kaplan–Meier survival (log-rank) and heatmaps. Tests: Welch / paired t, Mann–Whitney, ANOVA with Holm-corrected post-hoc comparisons. Double-click a graph to edit.'],
  ['Proteins & chemicals', 'Protein (PDB) loads a structure by ID with rotatable 3D, style and colour options. Chemistry draws 2D structures from a name or SMILES via PubChem.'],
  ['AI drafts', 'Generate with AI (⌘K): describe the figure (message, entities, relationships, layout, audience), optionally attach a sketch. You get an editable draft; request changes until it’s right. Always check the science — drafts can misplace compartments or reverse arrows. Needs an Anthropic API key (Settings).'],
  ['Comments', 'Press M and click to pin a comment. Reply, resolve and review them in the Comments tab. Comments live in the file and are never exported — share the .scifig file for review.'],
  ['Slides & posters', 'Each page can be a slide. ⌘↵ presents full screen. Home › Poster starts a 36×48 in layout.'],
  ['Export', 'PNG/JPEG up to 600 DPI (DPI is written into the file), transparent PNG, vector SVG and PDF, and PowerPoint (.pptx). “Selection only” exports just what’s selected. ⇧⌘C copies as an image for pasting into slides.'],
  ['Credits', 'File › Credits lists every library icon you used with its licence and drafts the attribution text for your legend.'],
];
function openHelpDialog() {
  const q = el('input', { type: 'search', placeholder: 'Search help…', style: 'width:100%;margin-bottom:10px' });
  const list = el('div');
  const draw = () => {
    const w = q.value.toLowerCase();
    list.innerHTML = '';
    HELP.filter(([t, b]) => !w || (t + ' ' + b).toLowerCase().includes(w)).forEach(([t, b]) => list.append(el('div', { class: 'help' }, el('b', { textContent: t }), el('div', { textContent: b }))));
  };
  q.addEventListener('input', draw);
  draw();
  openModal('Help', el('div', { style: 'max-width:680px' }, q, list));
  setTimeout(() => q.focus(), 30);
}

// ---------- AI figure drafting ----------
const AI_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'width', 'height', 'elements'],
  properties: {
    title: { type: 'string' }, width: { type: 'integer' }, height: { type: 'integer' },
    elements: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'kind', 'x', 'y', 'w', 'h', 'text', 'icon', 'color', 'from', 'to', 'arrow', 'shape'],
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['icon', 'text', 'box', 'ellipse', 'shape', 'arrow', 'membrane', 'dna', 'badge', 'chart'] },
          x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' },
          text: { type: 'string' }, icon: { type: 'string' }, color: { type: 'string' },
          from: { type: 'string' }, to: { type: 'string' },
          arrow: { type: 'string', enum: ['arrow', 'inhibit', 'bind', 'line', ''] },
          shape: { type: 'string' },
        },
      },
    },
  },
};
const AI_SYSTEM = `You lay out clear, publication-style scientific figures for a vector figure editor. Respond with the JSON the schema describes.

Canvas: pixel coordinates, origin top-left. Choose width × height to suit the request (default 1000 × 650; slides 1280 × 720; graphical abstracts 1328 × 560). Every element (except arrows) has a bounding box x, y, w, h inside the canvas with at least 16 px margin; avoid unintended overlaps and leave room for labels.

Element kinds:
- icon: a picture from a scientific icon library. "icon" is a short search query of 1–3 words naming the object (e.g. "T cell", "mouse", "antibody", "96-well plate", "mitochondrion", "neutrophil", "liver", "pipette"). Typical size 70–140 px. "color" is an optional hex tint, else "".
- text: a label in "text" (\\n for line breaks; ^{...} superscript, _{...} subscript, e.g. Ca^{2+}). Height ≈ 1.3 × font size × lines; titles use 24–30 px boxes, labels 14–18 px.
- box / ellipse / shape: a panel, compartment or process step; "text" is centred inside (use "" for background panels); "color" is the accent hex. For kind "shape", "shape" is one of triangle, diamond, hexagon, star, arrow, chevron, cylinder, cloud, pill.
- membrane: a lipid bilayer drawn along the box (a horizontal band), or a closed cell outline when "shape" is "ellipse". dna: a double helix along the box.
- badge: a numbered step marker; "text" is the number; size about 34 × 34.
- chart: ONLY when the request includes an attached table. "shape" is the chart type (bar, box, violin, dotplot, scatter, line, dose, survival, heatmap, pie, groupedbar, growth); "text" lists the exact column headers to plot, separated by | (scatter / line / dose: the X column first; survival: time | event | group; groupedbar: factor A | factor B | value). Never write numbers: the editor reads them from the file. Typical size 340 × 260.
- arrow: connects two elements by id ("from", "to"). "arrow" is arrow (leads to / activates), inhibit (blocks), bind (binds / associates) or line. "text" is a short verb label or "". Set x, y, w, h to 0.
Fill every unused field with "" or 0. Give each element a short unique "id"; arrows must reference ids that exist.

Design: one clear reading direction (usually left → right or top → bottom); group related content in light background boxes with short headings; keep each entity in one consistent colour; use a restrained palette of 2–4 accents on white; label every important object; prefer a verb on each arrow. Draw elements back-to-front (panels before their contents). Represent only what the user describes — don't add mechanisms, data or claims they didn't mention; when something is hypothetical, say "proposed" in its label.`;

async function aiToObjects(result, tables) {
  const objsOut = [], byKey = {};
  const hexOr = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.toLowerCase() : d);
  for (const e of result.elements) {
    const x = +e.x || 0, y = +e.y || 0, w = Math.max(+e.w || 0, 8), h = Math.max(+e.h || 0, 8);
    let o = null;
    switch (e.kind) {
      case 'icon': {
        // "@key:<iconId>" keeps an icon that is already in the figure (used by Edit-with-AI).
        const keep = String(e.icon || '').startsWith('@key:') ? e.icon.slice(5) : null;
        const best = keep && (ICON_MAP[keep] || getAsset(keep)) ? { key: keep, native: !!ICON_MAP[keep] } : bestIconFor(e.icon || e.text || 'cell');
        if (!best) break;
        if (!best.native) { try { await ensurePackAsset(best); } catch { break; } }
        const ar = iconAspect(best.key);
        let iw = w, ih = w / ar;
        if (ih > h) { ih = h; iw = h * ar; }
        o = { id: uid(), type: 'icon', iconId: best.key, x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, rot: 0, color: best.native ? hexOr(e.color, ICON_MAP[best.key].color) : undefined, tint: !best.native && hexOr(e.color, null) ? e.color : undefined };
        break;
      }
      case 'text': {
        const lines = String(e.text || '').split('\n').length;
        const fs = Math.max(10, Math.min(40, Math.round(h / (1.3 * lines))));
        o = Make.text(e.text || '', x, y, { fontSize: fs, color: hexOr(e.color, '#222222'), bold: fs >= 22 });
        if (o.w > w * 1.15 && w > 40) o.x = x; // keep left edge; long text simply extends
        break;
      }
      case 'box': {
        const c = hexOr(e.color, '#4a7fd6');
        o = Make.rect(x, y, w, h, { fill: Color.light(c, e.text ? 0.85 : 0.92), stroke: Color.light(c, 0.3), radius: 12, label: e.text, labelSize: 16 });
        break;
      }
      case 'ellipse': { const c = hexOr(e.color, '#3fa58b'); o = Make.ellipse(x, y, w, h, { fill: Color.light(c, 0.85), stroke: c, label: e.text }); break; }
      case 'shape': { const c = hexOr(e.color, '#e8743b'); o = Make.shape(SHAPES.some((s) => s[0] === e.shape) ? e.shape : 'hexagon', x, y, w, h, { fill: Color.light(c, 0.85), stroke: c, label: e.text }); break; }
      case 'membrane': o = Make.brush('membrane', x, y, w, h, e.shape === 'ellipse' ? Shapes.ellipse() : Shapes.line(), { closed: e.shape === 'ellipse', color: hexOr(e.color, '#e8b45a') }); break;
      case 'dna': o = Make.brush('dna', x, y, w, h, Shapes.line(), { size: 6, color: hexOr(e.color, '#3b82c4') }); break;
      case 'badge': o = Make.badge(e.text || '1', x + w / 2, y + h / 2); break;
      case 'chart': o = typeof aiChartFromTables === 'function' ? aiChartFromTables(e, tables) : null; break;
    }
    if (o) { objsOut.push(o); byKey[e.id] = o; }
  }
  for (const e of result.elements) {
    if (e.kind !== 'arrow' || !byKey[e.from] || !byKey[e.to]) continue;
    const head = { inhibit: 'bar', bind: 'dot', line: 'none' }[e.arrow] || 'arrow';
    objsOut.push(Make.connector(byKey[e.from], byKey[e.to], { head, label: e.text || '', color: hexOr(e.color, head === 'bar' ? '#d64545' : '#333333') }));
  }
  return objsOut;
}

function openAIDialog() {
  let last = null, lastObjs = null;
  const refs = {};
  const prompt = el('textarea', { rows: 6, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Describe the figure: the message, the entities, how they relate, the layout, and the audience.\n\ne.g. “Graphical abstract: tumour-bearing mice receive drug X or vehicle; after 14 days tumours are harvested for flow cytometry (CD8 T cells) and RNA-seq. Show the two arms left-to-right with both readouts on the right.”' });
  const revise = el('textarea', { rows: 2, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Request changes to this draft, e.g. “put the readouts in separate panels”, “use blue for the treated arm”…' });
  const preview = el('div', { class: 'preview', style: 'min-height:360px' }, el('span', { class: 'note', textContent: 'Your draft will appear here.' }));
  const status = el('div', { class: 'note' });
  const refUI = referencePicker(refs);
  const addBtn = btn('Add to page', () => { if (!lastObjs) return; insertObjectsGrouped(lastObjs, false); closeModal(); }, 'primary');
  const newBtn = btn('Open as new page', () => {
    if (!lastObjs) return;
    checkpoint();
    const p = newPage(last.title || 'AI draft', Math.max(200, last.width || 1000), Math.max(200, last.height || 650));
    p.objects = lastObjs;
    state.doc.pages.splice(state.pageIndex + 1, 0, p);
    closeModal(); gotoPage(state.pageIndex + 1);
  });
  const reviseBtn = btn('Revise', () => run(true));
  [addBtn, newBtn, reviseBtn].forEach((b) => (b.disabled = true));
  async function run(isRevision) {
    if (!appSettings.hasApiKey) { status.textContent = ''; toast('Add your Anthropic API key in Settings first'); openSettingsDialog(); return; }
    const desc = prompt.value.trim() || (refs.refs.length ? 'Make a figure from the attached material.' : '');
    if (!desc) { status.textContent = 'Describe the figure, or attach a reference file.'; return; }
    const att = referencesForRequest(refs.refs, refs.refMode);
    let text = `Figure request:\n${desc}${att.text}`;
    if (isRevision && last) text += `\n\nCurrent draft (JSON):\n${JSON.stringify(last)}\n\nRevise the draft with these changes, keeping everything else:\n${revise.value.trim() || 'Improve spacing and readability.'}`;
    [addBtn, newBtn, reviseBtn, genBtn].forEach((b) => (b.disabled = true));
    status.textContent = isRevision ? 'Revising draft…' : 'Drafting figure… (this can take up to a minute)';
    try {
      last = await window.native.aiGenerate({ system: AI_SYSTEM, prompt: text, image: att.image, schema: AI_SCHEMA, ...(att.documents.length ? { documents: att.documents } : {}) });
      lastObjs = await aiToObjects(last, att.tables);
      const pg = { width: last.width || 1000, height: last.height || 650, background: '#ffffff', objects: lastObjs };
      preview.innerHTML = pageSvgString(pg).replace('<svg ', '<svg style="width:100%;max-height:420px" preserveAspectRatio="xMidYMid meet" ');
      status.textContent = `${lastObjs.length} editable objects. Check the science before using it — drafts can misplace compartments, reverse arrows or overstate certainty.`;
      [addBtn, newBtn, reviseBtn].forEach((b) => (b.disabled = false));
    } catch (e) {
      status.textContent = e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, '');
    } finally { genBtn.disabled = false; }
  }
  const genBtn = btn('Generate draft', () => run(false), 'primary');
  openModal('Generate figure with AI', el('div', {},
    el('div', { class: 'dlg-cols', style: 'grid-template-columns:360px 1fr' },
      el('div', {}, prompt,
        el('div', { style: 'margin:6px 0' }, refUI),
        el('div', { class: 'btnrow', style: 'margin:6px 0 12px' }, genBtn),
        el('h3', { class: 'dlg-sub', textContent: 'Refine' }), revise, el('div', { class: 'btnrow', style: 'margin-top:6px' }, reviseBtn),
        el('div', { class: 'note', style: 'margin-top:10px' }, 'Uses Claude via your Anthropic API key (Settings). Your description and any attachments are sent to Anthropic.')),
      el('div', {}, preview, status)),
    el('div', { class: 'actions' }, btn('Close', closeModal), newBtn, addBtn)));
  setTimeout(() => prompt.focus(), 30);
}
async function downscale(dataUrl, max) {
  const im = new Image();
  await new Promise((r) => { im.onload = r; im.src = dataUrl; });
  const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
  if (k === 1) return dataUrl;
  const c = document.createElement('canvas');
  c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}
// Add objects (keeping their relative layout) to the current page as one group, fitted & centred.
function insertObjectsGrouped(list, replace) {
  checkpoint();
  if (replace) page().objects = [];
  const fresh = cloneObjects(list, list, 0);
  objs().push(...fresh);
  if (fresh.length > 1) { state.sel = fresh.map((o) => o.id); groupSelection(); }
  const g = byId(state.sel[0]) || fresh[0];
  if (g && g.type === 'group') {
    const P = page(), k = Math.min(1, (P.width * 0.9) / g.w, (P.height * 0.9) / g.h);
    g.w *= k; g.h *= k;
    const c = replace ? { x: P.width / 2, y: P.height / 2 } : viewCenter();
    g.x = c.x - g.w / 2; g.y = c.y - g.h / 2;
  }
  render({ props: true });
}

// ---------- Boot ----------
(async function boot() {
  state.view = { ...state.view, ...lsGet('scicanvas:view', {}) };
  setupLibrary();
  setupRulers();
  setupDrawOpts();
  setupContextBar();
  setupFiles();
  $('#aiMenuBtn').addEventListener('click', (e) => showAIMenu(e.currentTarget));
  $('#smartBtn').addEventListener('click', () => smartSearch());
  $('#search').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) smartSearch(); });
  setupContextMenu();
  $$('[data-rtab]').forEach((t) => t.addEventListener('click', () => {
    $$('[data-rtab]').forEach((x) => x.classList.toggle('active', x === t));
    ['props', 'layers', 'comments', 'check'].forEach((k) => $('#' + k) && $('#' + k).classList.toggle('hidden', t.dataset.rtab !== k));
    if (t.dataset.rtab === 'comments') renderCommentsPanel();
    if (t.dataset.rtab === 'check' && typeof renderCheckPanel === 'function') renderCheckPanel();
  }));
  $('#shapeKind').innerHTML = SHAPES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  try { appSettings = await window.native.getSettings() || appSettings; } catch { /* browser preview */ }
  await loadPacks();
  renderLibrary();
  let restored = false;
  try {
    const saved = JSON.parse(localStorage.getItem('scicanvas:autosave') || 'null');
    if (saved && saved.doc && saved.doc.pages && saved.doc.pages.some((p) => p.objects.length)) {
      loadDoc(saved.doc, saved.filePath);
      state.dirty = true; updateTitle();
      restored = true;
      toast('Restored your last session');
    }
  } catch { /* ignore */ }
  if (!restored) loadDoc(newDoc());
  await openPendingFile();
  requestAnimationFrame(zoomFit);
})();
