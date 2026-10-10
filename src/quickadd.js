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
