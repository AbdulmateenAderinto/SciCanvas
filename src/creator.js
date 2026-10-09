// Drawing options bar, "My icons" (save selection as icon), AI icon generation, icon-library manager.

// ---------- Drawing options (shown while a drawing tool is active) ----------
function syncDrawOpts() {
  const shade = state.tool === 'airbrush', er = state.tool === 'eraser';
  $('#drawColor').value = shade ? DRAW_DEFAULTS.shadeColor : DRAW_DEFAULTS.stroke;
  $('#drawColor').classList.toggle('hidden', er);
  $('#drawWidth').max = shade || er ? 80 : 20;
  $('#drawWidth').value = er ? DRAW_DEFAULTS.eraserSize : shade ? DRAW_DEFAULTS.shadeSize : DRAW_DEFAULTS.strokeWidth;
  $('#drawFill').value = DRAW_DEFAULTS.fill;
  $('#drawFillWrap').classList.toggle('hidden', !['pencil', 'pen'].includes(state.tool));
  $('#drawCloseWrap').classList.toggle('hidden', state.tool !== 'pencil');
  $('#drawClose').checked = !!DRAW_DEFAULTS.autoClose;
  $('#drawHint').textContent = {
    pencil: DRAW_DEFAULTS.autoClose ? 'Draw an outline — it closes into a filled custom shape.' : 'Draw freely. End near the start to make a filled shape.',
    pen: 'Click = corner · drag = curve · click first point to close · Enter to finish',
    line: 'Drag a line (Shift = 45°)', arrow: 'Drag an arrow (Shift = 45°)',
    airbrush: 'Paint soft shading over icons',
    eraser: 'Erase parts of the selected object (non-destructive — restore any time in Properties)',
  }[state.tool] || '';
}
function setupDrawOpts() {
  $('#drawColor').addEventListener('input', (e) => { if (state.tool === 'airbrush') DRAW_DEFAULTS.shadeColor = e.target.value; else DRAW_DEFAULTS.stroke = e.target.value; });
  $('#drawWidth').addEventListener('input', (e) => { if (state.tool === 'eraser') DRAW_DEFAULTS.eraserSize = +e.target.value; else if (state.tool === 'airbrush') DRAW_DEFAULTS.shadeSize = +e.target.value; else DRAW_DEFAULTS.strokeWidth = +e.target.value; });
  $('#drawFill').addEventListener('input', (e) => { DRAW_DEFAULTS.fill = e.target.value; });
  $('#drawClose').addEventListener('change', (e) => { DRAW_DEFAULTS.autoClose = e.target.checked; syncDrawOpts(); });
}

// ---------- My icons ----------
function saveSelectionAsIcon() {
  if (!state.sel.length) { toast('Select what you want to save as an icon first'); return; }
  const p = selectionPage(4);
  const svgText = pageSvgString(p, { transparent: true });
  const name = el('input', { type: 'text', value: selected().length === 1 ? layerName(selected()[0]) : 'My icon', style: 'flex:1' });
  const tags = el('input', { type: 'text', placeholder: 'Search words, e.g. organoid 3D culture', style: 'flex:1' });
  const prev = el('div', { class: 'preview', style: 'min-height:200px' });
  prev.innerHTML = svgText.replace('<svg ', '<svg style="max-width:100%;max-height:240px" ');
  openModal('Save as icon', el('div', { style: 'max-width:520px' }, prev,
    field_('Name', name), field_('Keywords', tags),
    el('div', { class: 'note' }, 'Saved to “My icons” in the library, available in every figure. Icons are stored on this computer.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Save icon', async () => {
      try {
        await window.native.saveUserIcon({ name: name.value.trim() || 'My icon', svg: svgText, tags: tags.value });
        await loadPacks(); activeCat = 'My icons'; renderLibrary();
        closeModal(); toast('Saved to My icons');
      } catch (e) { toast('Could not save: ' + e.message); }
    }, 'primary'))));
  setTimeout(() => name.select(), 30);
}

// ---------- AI icon generation ----------
const AI_ICON_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['variants'],
  properties: {
    variants: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['name', 'keywords', 'svg'], properties: { name: { type: 'string' }, keywords: { type: 'string' }, svg: { type: 'string' } } },
    },
  },
};
const AI_ICON_STYLES = {
  biorender: 'clean scientific-illustration style: flat colour fills with a soft radial-gradient shading and one subtle highlight, outlines 1.5–2.5 px in a darker shade of each fill, rounded joins',
  flat: 'flat vector style: solid fills only, no gradients, 1.5–2 px darker outlines',
  outline: 'line-art style: no fills (or white fills), uniform 3 px dark strokes, round caps and joins',
  textbook: 'textbook-illustration style: gentle gradients, soft shadows, more anatomical detail, thin darker outlines',
};
const AI_ICON_SYSTEM = `You are a scientific illustrator who draws icons as SVG for a figure editor used by researchers.
Return exactly 3 distinct variants (different poses, views or levels of detail) of the requested subject.

Each "svg" must be a complete, standalone SVG document:
- root <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">, subject centred with about 10 px padding, filling the frame;
- only shapes (path, circle, ellipse, rect, polygon, polyline, line, g) and, if the style uses them, linearGradient/radialGradient in <defs>; give every id a unique prefix per variant (e.g. v1-, v2-, v3-);
- no text, no <image>, no <script>, no external references, no CSS classes or <style> blocks — use attributes;
- under about 12 KB each.

Make the subject scientifically recognisable: include the defining structural features a researcher would expect (e.g. a mitochondrion's double membrane and cristae; an IgG antibody's Y shape with heavy/light chains), while keeping it simple enough to read at 60 px. Use a restrained palette of 2–4 harmonious colours per icon. "name" is a short title; "keywords" are search words.`;

function openAIIconDialog(initial = '') {
  const prompt = el('textarea', { rows: 3, style: 'width:100%;font-family:inherit;font-size:13px', value: initial, placeholder: 'What should the icon show? e.g. “a dendritic cell presenting antigen”, “organoid in Matrigel dome”, “CAR T cell”, “Western blot imager”' });
  const style = el('select', {}, ...Object.keys(AI_ICON_STYLES).map((k) => el('option', { value: k, textContent: { biorender: 'Scientific (shaded)', flat: 'Flat', outline: 'Line art', textbook: 'Textbook' }[k] })));
  const colour = el('input', { type: 'text', placeholder: 'optional, e.g. blues and purples', style: 'flex:1' });
  const grid = el('div', { class: 'ai-icon-grid' });
  const status = el('div', { class: 'note', style: 'margin-top:8px' });
  const go = btn('Generate 3 options', async () => {
    if (!appSettings.hasApiKey) { toast('Add your Anthropic API key in Settings first'); openSettingsDialog(); return; }
    if (!prompt.value.trim()) { status.textContent = 'Describe the icon first.'; return; }
    go.disabled = true; status.textContent = 'Drawing three options… (up to a minute)'; grid.innerHTML = '';
    try {
      const res = await window.native.aiGenerate({
        system: AI_ICON_SYSTEM, schema: AI_ICON_SCHEMA,
        prompt: `Subject: ${prompt.value.trim()}\nStyle: ${AI_ICON_STYLES[style.value]}${colour.value.trim() ? `\nColours: ${colour.value.trim()}` : ''}`,
      });
      let shown = 0;
      for (const v of res.variants.slice(0, 3)) {
        let norm;
        try { norm = normalizeSvg(v.svg); } catch { continue; }
        shown++;
        const card = el('div', { class: 'ai-icon' });
        const pic = el('div', { class: 'ai-pic' });
        pic.innerHTML = `<svg viewBox="${norm.vb}" style="width:100%;height:100%">${norm.svg}</svg>`;
        card.append(pic, el('b', { textContent: v.name }),
          el('div', { class: 'btnrow' },
            btn('Add', () => { const key = addSvgAsset(v.name, v.svg); placeAssetIcon(key); closeModal(); }, 'primary'),
            btn('Save to My icons', async (e) => { await window.native.saveUserIcon({ name: v.name, svg: v.svg, tags: v.keywords + ' ai generated' }); await loadPacks(); renderLibrary(); e.target.textContent = 'Saved ✓'; e.target.disabled = true; })));
        grid.append(card);
      }
      status.textContent = shown ? 'AI-drawn icons are schematic — check that structures are depicted correctly before publishing.' : 'No usable icons came back — try rephrasing.';
    } catch (e) { status.textContent = e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''); }
    go.disabled = false;
  }, 'primary');
  openModal('Create icon with AI', el('div', { style: 'max-width:760px' }, prompt,
    el('div', { class: 'row', style: 'margin-top:8px' }, el('label', { textContent: 'Style' }), style, colour), go, status, grid,
    el('div', { class: 'note', style: 'margin-top:8px' }, 'Uses Claude via your Anthropic API key (Settings). Generated icons are fully editable vector art — recolour layers, or Save as icon after editing.')));
  setTimeout(() => prompt.focus(), 30);
}
function placeAssetIcon(key) {
  const a = getAsset(key), ar = a.vw / a.vh, c = viewCenter(), size = 140;
  const w = ar >= 1 ? size : size * ar, h = ar >= 1 ? size / ar : size;
  addObjects([{ id: uid(), type: 'icon', iconId: key, x: c.x - w / 2, y: c.y - h / 2, w, h, rot: 0 }]);
}

// ---------- Icon library manager ----------
async function openLibrariesDialog() {
  let cat = [];
  try { cat = await window.native.packCatalog(); } catch { /* browser preview */ }
  const installed = Object.fromEntries(Packs.list.map((p) => [p.id, p.icons.length]));
  const total = ICONS.length + Packs.all.length;
  const list = el('div');
  const progress = {};
  window.native.onPackProgress(({ id, done, total }) => { if (progress[id]) progress[id].textContent = `Installing… ${done.toLocaleString()} / ${total.toLocaleString()}`; });
  for (const c of cat) {
    const n = installed[c.id];
    const prog = el('span', { class: 'note' });
    progress[c.id] = prog;
    const b = btn(n ? 'Update' : `Install (~${c.sizeMB} MB)`, async () => {
      b.disabled = true; prog.textContent = 'Starting…';
      try { const r = await window.native.installPack(c.id); await loadPacks(); renderLibrary(); prog.textContent = `Installed ${r.count.toLocaleString()} icons${r.failed ? ` (${r.failed} unavailable)` : ''}`; }
      catch (e) { prog.textContent = 'Failed: ' + e.message.replace(/^Error invoking remote method[^:]*: (Error: )?/, ''); }
      b.disabled = false;
    }, n ? '' : 'primary');
    list.append(el('div', { class: 'libcard' },
      el('div', { style: 'flex:1' }, el('b', { textContent: c.name }), ' ', el('a', { href: c.homepage, target: '_blank', textContent: c.homepage.replace(/^https?:\/\//, '') }),
        el('div', { class: 'note', textContent: c.desc }),
        el('div', { class: 'note', textContent: n ? `✓ ${n.toLocaleString()} icons installed` : `≈ ${c.approx.toLocaleString()} icons` }), prog),
      b));
  }
  const mine = Packs.list.find((p) => p.id === 'mine');
  const mineGrid = el('div', { class: 'mine-grid' });
  if (mine) for (const ic of mine.icons) {
    const entry = Packs.all.find((x) => x.pack === 'mine' && x.file === ic.file);
    mineGrid.append(el('div', { class: 'icon-cell' }, el('img', { src: entry.url }), el('span', { textContent: ic.name }),
      btn('Delete', async () => { if (!confirm(`Delete “${ic.name}” from My icons?`)) return; await window.native.deleteUserIcon(ic.file); await loadPacks(); renderLibrary(); openLibrariesDialog(); }, 'danger')));
  }
  openModal('Icon libraries', el('div', { style: 'max-width:760px' },
    el('div', { class: 'note', style: 'margin-bottom:10px' }, `${total.toLocaleString()} icons available: ${ICONS.length} built-in + ${Packs.list.map((p) => `${p.icons.length.toLocaleString()} ${p.name || p.id}`).join(' + ')}.`),
    list,
    el('h3', { class: 'dlg-sub', textContent: `My icons (${mine ? mine.icons.length : 0})` }),
    mine && mine.icons.length ? mineGrid : el('div', { class: 'note', textContent: 'Draw something (pencil / pen), select it and choose “Save as icon”, or create icons with AI.' }),
    el('h3', { class: 'dlg-sub', textContent: 'More sources (manual import)' }),
    el('div', { class: 'note' }, 'These openly licensed collections don’t offer a bulk download SciCanvas can install automatically, but you can download individual images and drop them onto the canvas (SVGs become recolourable icons): ',
      el('a', { href: 'https://bioart.niaid.nih.gov', target: '_blank', textContent: 'NIAID NIH BIOART (public domain)' }), ' · ',
      el('a', { href: 'https://smart.servier.com', target: '_blank', textContent: 'Servier Medical Art (CC BY 4.0)' }), ' · ',
      el('a', { href: 'https://scidraw.io', target: '_blank', textContent: 'SciDraw (CC BY)' }), ' · ',
      el('a', { href: 'https://togotv.dbcls.jp/en/pics.html', target: '_blank', textContent: 'TogoTV (CC BY 4.0)' }), '. BioRender’s own library is proprietary and cannot be imported.')));
}
