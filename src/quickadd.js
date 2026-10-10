// Quick add (v1.3): press "/" over the canvas, type, and add an icon right where the pointer is — no trip to the
// library. Also "Paste here" in the right-click menu (pastes at the clicked spot). Loaded after linetools.js.
(() => {
  let last = null; // last pointer position over the canvas (world units)
  svg.addEventListener('pointermove', (e) => { last = toWorld(e); }, { passive: true });
  let box = null;
  const close = () => { if (box) { box.remove(); box = null; } };
  function open(at) {
    close();
    box = el('div', { class: 'quickadd' });
    const input = el('input', { type: 'search', placeholder: 'Add an icon or shape: type a name (cell, antibody, star…)' });
    const list = el('div', { class: 'qa-grid' });
    box.append(input, list);
    document.body.append(box);
    const z = state.zoom, r = svg.getBoundingClientRect();
    const sx = r.left + at.x * z + state.panX, sy = r.top + at.y * z + state.panY;
    box.style.left = Math.min(innerWidth - 340, Math.max(8, sx)) + 'px';
    box.style.top = Math.min(innerHeight - 300, Math.max(8, sy)) + 'px';
    let items = [], active = 0;
    const draw = () => {
      const q = input.value.trim();
      const SL = globalThis.ShapeLib, ql = q.toLowerCase();
      const shapes = q && SL ? SL.LIB.flatMap(([cat, its]) => its.filter((it) => it.label.toLowerCase().includes(ql) || cat.toLowerCase() === ql).map((it) => ({ shape: it, name: it.label }))).slice(0, 4) : [];
      items = q ? [...shapes, ...searchIcons(q, { cat: 'All', limit: 12 - shapes.length, field: appSettings.field }).items] : searchIcons('', { cat: 'Recent', limit: 8 }).items; // empty box: recent icons
      active = Math.min(active, Math.max(0, items.length - 1));
      list.innerHTML = items.map((it, i) => {
        const pic = it.shape ? globalThis.ShapeLib.shapeThumb(it.shape) : it.native ? nativeThumb(it.id) : it.pack === 'phylopic' ? `<span class="pp-thumb" style="-webkit-mask-image:url('${it.url}');mask-image:url('${it.url}')"></span>` : `<img src="${it.url}" alt="">`;
        return `<button class="qa-item${i === active ? ' on' : ''}" data-i="${i}" title="${esc(it.name)}">${pic}<span>${esc(it.name)}</span></button>`;
      }).join('') || (q ? '<div class="note" style="padding:6px">No icons match</div>' : '<div class="note" style="padding:6px">↑↓ or ←→ to choose · Enter to add · Esc to close</div>');
    };
    const pick = async (i) => { const it = items[i]; if (!it) return; close(); if (it.shape) globalThis.ShapeLib.insertShape(it.shape, at); else await addIcon(it.key, at); };
    input.addEventListener('input', () => { active = 0; draw(); });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(active); }
      else if (['ArrowRight', 'ArrowDown'].includes(e.key)) { e.preventDefault(); active = Math.min(items.length - 1, active + (e.key === 'ArrowDown' ? 4 : 1)); draw(); }
      else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); active = Math.max(0, active - (e.key === 'ArrowUp' ? 4 : 1)); draw(); }
    });
    list.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
    input.addEventListener('blur', () => setTimeout(() => { if (box && document.activeElement !== input) close(); }, 150));
    draw();
    input.focus();
  }
  window.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || (typeof isTyping === 'function' && isTyping())) return;
    if (!document.querySelector('#modal').classList.contains('hidden')) return;
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    open(last || { x: (r.width / 2 - state.panX) / state.zoom, y: (r.height / 2 - state.panY) / state.zoom });
  });
  ARRANGE_COMMANDS.quickAdd = () => open(last || viewCenter());

  // Chemical formulas in text: H2O → H₂O, Ca2+ → Ca²⁺, SO42- → SO₄²⁻ (written as _{…} and ^{…} markup).
  const EL = 'He|Li|Be|Ne|Na|Mg|Al|Si|Cl|Ar|Ca|Sc|Ti|Cr|Mn|Fe|Co|Ni|Cu|Zn|Ga|Ge|As|Se|Br|Kr|Rb|Sr|Zr|Nb|Mo|Ru|Rh|Pd|Ag|Cd|In|Sn|Sb|Te|Xe|Cs|Ba|La|Ce|Gd|Pt|Au|Hg|Tl|Pb|Bi|Rn|Ra|Th|U|H|B|C|N|O|F|P|S|K|V|Y|I|W';
  function formatChemistry(text) {
    // a formula: element symbols (with counts, groups in brackets) ending in an optional charge
    const formula = new RegExp(`(?<![A-Za-z0-9_^{|])((?:(?:${EL})\\d*|\\((?:(?:${EL})\\d*)+\\)\\d*)+)(\\d*[+\\-−])?(?![A-Za-z0-9])`, 'g');
    return text.replace(formula, (m, body, charge) => {
      if (!/\d/.test(body) && !charge) return m; // "CO", "NO" without numbers or charge: leave words alone
      if (!/[A-Z]/.test(body[0])) return m;
      if (charge && /^[+\-−]$/.test(charge)) { // which trailing digit is the charge: Ca2+ and SO42- vs NH4+ and HCO3-
        const single = new RegExp(`^(?:${EL})(\\d)$`).exec(body), two = /\d(\d)$/.exec(body);
        if (single) { charge = single[1] + charge; body = body.slice(0, -1); } else if (two) { charge = two[1] + charge; body = body.slice(0, -1); }
      }
      let out = body.replace(/(\D)(\d+)/g, '$1_{$2}');
      if (charge) out += `^{${charge.replace('-', '−')}}`;
      return out;
    });
  }
  globalThis.formatChemistry = formatChemistry;
  // A button in the text bar: format the selected words (or all the text being edited).
  const tb = document.getElementById('textbar'), ta = document.getElementById('textEditor');
  if (tb && ta) {
    const b = el('button', { title: 'Format chemical formulas in the selection, or all the text (H2O → H₂O, Ca2+ → Ca²⁺)', onclick: () => {
      const s0 = ta.selectionStart, s1 = ta.selectionEnd, all = s0 === s1;
      const part = all ? ta.value : ta.value.slice(s0, s1), done = formatChemistry(part);
      if (done === part) { toast('No formulas found (e.g. H2O, CO2, Ca2+)'); return; }
      ta.value = all ? done : ta.value.slice(0, s0) + done + ta.value.slice(s1);
      ta.dispatchEvent(new Event('input')); ta.focus();
    } });
    b.innerHTML = 'H<sub>2</sub>O';
    const sep = [...tb.querySelectorAll('.tb-sep')].pop();
    if (sep) sep.before(b); else tb.append(b);
  }
  ARRANGE_COMMANDS.formatChemistry = () => {
    const list = selected().filter((o) => o.type === 'text' || o.label);
    if (!list.length) { toast('Select text (or shapes with labels) to format'); return; }
    checkpoint();
    let n = 0;
    for (const o of list) for (const k of ['text', 'label']) {
      if (typeof o[k] !== 'string') continue;
      const v = formatChemistry(o[k]);
      if (v !== o[k]) { o[k] = v; n++; if (typeof postEdit === 'function') postEdit(o); }
    }
    render({ props: true });
    toast(n ? 'Formulas formatted' : 'No formulas found (e.g. H2O, CO2, Ca2+)');
  };
  const prevMenu2 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu2();
    if (selected().some((o) => o.type === 'text' || o.label)) t.push({ label: 'Format chemical formulas (H₂O, Ca²⁺)', cmd: 'formatChemistry' });
    return t;
  };

  // Units and symbols in scientific text, conservatively (only after a number, or unambiguous arrows / ±).
  function tidyUnits(text) {
    const N = '(\\d(?:[\\d.,]*\\d)?)\\s?';
    return text
      .replace(new RegExp(N + '(u|μ)(m|M|g|L|l|mol|s|A|V|Ci)\\b', 'g'), (m, n, u, unit) => `${n} µ${unit === 'l' ? 'L' : unit}`)
      .replace(new RegExp(N + '(n|m|p|f)l\\b', 'g'), (m, n, p) => `${n} ${p}L`)
      .replace(new RegExp(N + 'ml\\b', 'g'), (m, n) => `${n} mL`)
      .replace(/\/ml\b/g, '/mL').replace(/\/ul\b/gi, '/µL').replace(/\/ug\b/g, '/µg')
      .replace(new RegExp(N + '(?:deg\\s?C|oC|º\\s?C|° C|C)(?![A-Za-z0-9])', 'g'), (m, n) => (/\d/.test(n) && Number(n.replace(',', '.')) <= 150 ? `${n} °C` : m))
      .replace(/\+\/-|\+-(?=\s?\d)/g, '±')
      .replace(/<=>/g, '⇌').replace(/<->/g, '↔').replace(/(^|[^-<])->/g, '$1→').replace(/<-(?!>|-)/g, '←')
      .replace(/(\d)\s?x\s?10\^?(-?\d+)/g, (m, a, e) => `${a} × 10^{${e.replace('-', '−')}}`)
      .replace(/(\d)x(?=\s|$|[,.;)])/g, '$1×');
  }
  globalThis.tidyUnits = tidyUnits;
  ARRANGE_COMMANDS.tidyUnits = () => {
    const list = selected().filter((o) => o.type === 'text' || o.label);
    if (!list.length) { toast('Select text (or shapes with labels) to tidy'); return; }
    checkpoint();
    let n = 0;
    for (const o of list) for (const k of ['text', 'label']) {
      if (typeof o[k] !== 'string') continue;
      const v = tidyUnits(o[k]);
      if (v !== o[k]) { o[k] = v; n++; if (typeof postEdit === 'function') postEdit(o); }
    }
    render({ props: true });
    toast(n ? 'Units and symbols tidied' : 'Nothing to tidy');
  };
  const prevMenu3 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu3();
    if (selected().some((o) => o.type === 'text' || o.label)) t.push({ label: 'Tidy units & symbols (µm, °C, ±, →)', cmd: 'tidyUnits' });
    return t;
  };

  // Significance bracket between two objects: ⊓ above them with “*” (edit to **, ns, p = 0.03…), grouped.
  ARRANGE_COMMANDS.sigBracket = () => {
    const sel = selected().filter((o) => o.type !== 'connector');
    if (sel.length !== 2) { toast('Select the two things to compare'); return; }
    const [a, b] = [...sel].sort((p, q) => center(p).x - center(q).x), ba = bounds(a, objs()), bb = bounds(b, objs());
    const xa = center(a).x, xb = center(b).x, pg = page();
    // clear everything in between too: taller bars and earlier brackets, so comparisons stack
    let top = Math.min(ba.y, bb.y);
    for (const o of objs()) {
      if (o.type === 'connector' || o.hidden || o === a || o === b) continue;
      const q = bounds(o, objs());
      if (q.w * q.h > pg.width * pg.height * 0.25 || q.x > xb || q.x + q.w < xa || q.y + q.h > Math.max(ba.y + ba.h, bb.y + bb.h)) continue;
      top = Math.min(top, q.y);
    }
    const h = Math.max(8, Math.min(ba.h, bb.h) * 0.08), y = top - 14 - h;
    checkpoint();
    const path = makePathFromNodes([{ x: xa, y: y + h }, { x: xa, y }, { x: xb, y }, { x: xb, y: y + h }], { strokeWidth: 1.6, stroke: '#222222', cap: 'butt', name: 'Significance bracket' });
    const t = Make.text('*', 0, 0, { fontSize: 18, bold: true, color: '#222222' });
    if (typeof postEdit === 'function') postEdit(t);
    t.x = (xa + xb) / 2 - t.w / 2; t.y = y - t.h - 1;
    objs().push(path, t);
    state.sel = [path.id, t.id];
    groupSelection();
    const g = selected()[0];
    if (g) g.name = 'Significance *';
    render({ props: true });
    toast('Double-click the * to change it (**, ***, ns, p = 0.03…)');
  };
  const prevMenu4 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu4();
    if (selected().filter((o) => o.type !== 'connector').length === 2) t.push({ label: 'Significance bracket (*) between these', cmd: 'sigBracket' });
    return t;
  };

  // Put a new group (legend, key) where it covers the least: the four corners, then the middles of the edges.
  function placeInFreeSpot(g) {
    if (!g) return;
    const pg = page(), m = 24, others = objs().filter((o) => o !== g && !o.hidden && o.type !== 'connector').map((o) => bounds(o, objs()));
    const spots = [[pg.width - g.w - m, pg.height - g.h - m], [m, pg.height - g.h - m], [pg.width - g.w - m, m], [m, m],
      [(pg.width - g.w) / 2, pg.height - g.h - m], [pg.width - g.w - m, (pg.height - g.h) / 2], [m, (pg.height - g.h) / 2]];
    const overlap = (x, y) => others.reduce((s, b) => s + Math.max(0, Math.min(x + g.w, b.x + b.w) - Math.max(x, b.x)) * Math.max(0, Math.min(y + g.h, b.y + b.h) - Math.max(y, b.y)), 0);
    let best = null;
    for (const [x, y] of spots) { const v = overlap(x, y); if (!best || v < best.v - 1) best = { x, y, v }; }
    g.x = best.x; g.y = best.y;
  }
  globalThis.placeInFreeSpot = placeInFreeSpot;

  // Tidy into grid: the selection in reading order, in an even grid starting where it already is.
  ARRANGE_COMMANDS.tidyGrid = () => {
    const sel = selected().filter((o) => o.type !== 'connector');
    if (sel.length < 3) { toast('Select three or more objects'); return; }
    const rowH = Math.max(...sel.map((o) => o.h)) * 0.5;
    const order = [...sel].sort((a, b) => (Math.abs(center(a).y - center(b).y) > rowH ? center(a).y - center(b).y : center(a).x - center(b).x));
    // keep the number of rows they already roughly have, if any
    let rows = 1;
    for (let i = 1; i < order.length; i++) if (center(order[i]).y - center(order[i - 1]).y > rowH) rows++;
    const cols = rows > 1 && rows < order.length ? Math.ceil(order.length / rows) : Math.ceil(Math.sqrt(order.length));
    const cw = Math.max(...sel.map((o) => o.w)), ch = Math.max(...sel.map((o) => o.h)), gap = Math.round(Math.min(cw, ch) * 0.25 + 8);
    const bb = unionBounds(sel, objs());
    checkpoint();
    order.forEach((o, i) => {
      const cx = bb.x + (i % cols) * (cw + gap) + cw / 2, cy = bb.y + Math.floor(i / cols) * (ch + gap) + ch / 2;
      o.x = cx - o.w / 2; o.y = cy - o.h / 2;
    });
    render({ props: true });
  };
  const prevMenu5 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu5();
    if (selected().filter((o) => o.type !== 'connector').length >= 3) t.push({ label: 'Tidy into grid', cmd: 'tidyGrid' });
    return t;
  };

  // Format painter: pick up the selected object's style, then click objects to apply it (Esc to stop).
  let painting = false;
  const stopPaint = () => { painting = false; stage.classList.remove('painter'); };
  ARRANGE_COMMANDS.formatPainter = () => {
    if (!selected().length) { toast('Select the object whose style you want to copy'); return; }
    copyStyle();
    painting = true; stage.classList.add('painter');
    toast('Click objects to apply this style · Esc to stop', 3500);
  };
  svg.addEventListener('pointerdown', (e) => {
    if (!painting) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const o = hitObject(e.target);
    if (!o) { stopPaint(); return; } // clicking empty canvas ends painting
    state.sel = [o.id];
    pasteStyle();
    render({ props: true });
  }, true);
  window.addEventListener('keydown', (e) => { if (painting && e.key === 'Escape') stopPaint(); }, true);
  const prevMenu6 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu6();
    if (state.sel.length === 1) t.push({ label: 'Format painter (click others to apply this style)', cmd: 'formatPainter' });
    return t;
  };

  // Move / copy the selection to another page (same position there).
  function sendToPage(i, move) {
    const sel = selected();
    if (!sel.length) return;
    let target = state.doc.pages[i];
    if (i === state.doc.pages.length) { // a new page after the last
      target = newPage(`Page ${i + 1}`, page().width, page().height);
      state.doc.pages.push(target);
    }
    if (!target || target === page()) return;
    checkpoint();
    target.objects.push(...cloneObjects(sel, objs(), 0));
    if (move) { const keep = state.undo.length; deleteSelection(); state.undo.length = keep; } // one undo step for the whole move
    render({ props: true, pages: true });
    toast(`${move ? 'Moved' : 'Copied'} ${sel.length} object${sel.length > 1 ? 's' : ''} to ${target.name || `page ${i + 1}`}`);
  }
  const prevMenu7 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu7();
    if (!state.sel.length) return t;
    const pages = state.doc.pages.map((p, i) => [i, p.name || `Page ${i + 1}`]).filter(([i]) => i !== state.pageIndex);
    const sub = (move) => [...pages.map(([i, name]) => { ARRANGE_COMMANDS[`toPage:${move ? 'm' : 'c'}:${i}`] = () => sendToPage(i, move); return { label: name, cmd: `toPage:${move ? 'm' : 'c'}:${i}` }; }),
      { type: 'separator' }, (() => { const i = state.doc.pages.length; ARRANGE_COMMANDS[`toPage:${move ? 'm' : 'c'}:${i}`] = () => sendToPage(i, move); return { label: 'New page', cmd: `toPage:${move ? 'm' : 'c'}:${i}` }; })()];
    t.push({ label: 'Move or copy to page', submenu: [{ label: 'Move to', enabled: false }, ...sub(true), { type: 'separator' }, { label: 'Copy to', enabled: false }, ...sub(false)] });
    return t;
  };

  // Trim edges: crop away the white / transparent margin around an image (non-destructive: Remove crop undoes it).
  async function contentBox(src) {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const W = im.naturalWidth, H = im.naturalHeight, k = Math.min(1, 1200 / Math.max(W, H)), w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = d[i + 3];
      if (a > 16 && !(d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    const pad = 2;
    return { l: Math.max(0, x0 - pad) / w, t: Math.max(0, y0 - pad) / h, r: Math.max(0, w - 1 - x1 - pad) / w, b: Math.max(0, h - 1 - y1 - pad) / h, W, H };
  }
  globalThis.imageContentBox = contentBox;
  ARRANGE_COMMANDS.trimImage = async () => {
    const list = selected().filter((o) => o.type === 'image' && !(o.crop && (o.crop.l || o.crop.t || o.crop.r || o.crop.b)));
    if (!list.length) { toast('Select an image (without a crop yet)'); return; }
    checkpoint();
    let n = 0;
    for (const o of list) {
      let cb;
      try { cb = await contentBox(o.src); } catch { cb = null; }
      if (!cb || cb.l + cb.r + cb.t + cb.b < 0.01) continue;
      o.nw = o.nw || cb.W; o.nh = o.nh || cb.H;
      o.x += cb.l * o.w; o.y += cb.t * o.h; o.w *= 1 - cb.l - cb.r; o.h *= 1 - cb.t - cb.b;
      o.crop = { l: cb.l, t: cb.t, r: cb.r, b: cb.b };
      n++;
    }
    render({ props: true });
    toast(n ? `Trimmed ${n} image${n > 1 ? 's' : ''} (Remove crop in Properties to undo)` : 'No blank margin to trim');
  };
  const prevMenu8 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu8();
    if (selected().some((o) => o.type === 'image')) t.push({ label: 'Trim white / transparent edges', cmd: 'trimImage' });
    return t;
  };

  // Colour legend: one swatch per colour used for shapes and icons, named after the first thing in that colour.
  ARRANGE_COMMANDS.colourLegend = () => {
    const seen = new Map();
    for (const o of objs()) {
      if (o.hidden || ['connector', 'text', 'image', 'chart', 'table', 'group', 'comment'].includes(o.type)) continue;
      const k = typeof mainColourKey === 'function' ? mainColourKey(o) : 'fill', c = String(o[k] || '').toLowerCase();
      if (!/^#[0-9a-f]{6}$/.test(c) || c === '#ffffff' || seen.has(c)) continue;
      seen.set(c, (o.name || o.label || layerName(o) || '').toString().replace(/\s*\((soft|refined)\)/i, '').slice(0, 30));
      if (seen.size >= 12) break;
    }
    if (!seen.size) { toast('No coloured shapes or icons on this page'); return; }
    checkpoint();
    const pg = page(), rows = [...seen], x0 = 30, y0 = pg.height - 40 - rows.length * 24 - 26, made = [];
    const title = Make.text('{b|Key}', x0, y0, { fontSize: 14 });
    made.push(title);
    rows.forEach(([c, name], i) => {
      const y = y0 + 30 + i * 24;
      made.push(Make.rect(x0, y, 18, 14, { fill: c, stroke: 'none', radius: 3 }), Make.text(name || 'Label', x0 + 26, y - 2, { fontSize: 13 }));
    });
    for (const m of made) if (m.type === 'text' && typeof postEdit === 'function') postEdit(m);
    objs().push(...made);
    state.sel = made.map((m) => m.id);
    groupSelection();
    const g = selected()[0];
    if (g) { g.name = 'Colour legend'; placeInFreeSpot(g); }
    render({ props: true });
    toast(`Colour key with ${rows.length} entr${rows.length > 1 ? 'ies' : 'y'}: double-click a name to edit it`);
  };

  // Paste here: what was copied in SciCanvas, centred on the spot that was right-clicked.
  ARRANGE_COMMANDS.pasteHere = async () => {
    const at = (globalThis.ShapeLib && ShapeLib.menuPoint()) || viewCenter();
    const txt = window.native.readClipboardText ? await window.native.readClipboardText() : '';
    if (!txt || !txt.startsWith('scicanvas:')) { toast('Copy objects in SciCanvas first'); return; }
    let list;
    try { list = cloneObjects(JSON.parse(txt.slice(10)), [], 0); } catch { toast('Could not paste'); return; }
    const bb = unionBounds(list, list), dx = at.x - (bb.x + bb.w / 2), dy = at.y - (bb.y + bb.h / 2);
    for (const c of list) {
      if (c.type === 'connector') { for (const k of ['from', 'to']) if (!c[k].id) c[k] = { x: c[k].x + dx, y: c[k].y + dy }; if (c.points) c.points = c.points.map((q) => ({ x: q.x + dx, y: q.y + dy })); } else { c.x += dx; c.y += dy; }
    }
    addObjects(list);
  };
  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu();
    if (!state.sel.length) {
      const i = t.findIndex((it) => it.role === 'paste');
      const extra = [{ label: 'Paste here', cmd: 'pasteHere' }, { label: 'Add icon here…  (/)', cmd: 'quickAdd' }];
      if (i >= 0) t.splice(i + 1, 0, ...extra); else t.push({ type: 'separator' }, ...extra);
    }
    return t;
  };
  // "Add icon here" from the right-click menu opens at the clicked spot.
  const prevQuick = ARRANGE_COMMANDS.quickAdd;
  ARRANGE_COMMANDS.quickAdd = () => { const p = globalThis.ShapeLib && ShapeLib.menuPoint(); if (p) open(p); else prevQuick(); };
})();
