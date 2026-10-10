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
    const input = el('input', { type: 'search', placeholder: 'Add an icon: type a name (cell, antibody, mouse…)' });
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
      items = q ? searchIcons(q, { cat: 'All', limit: 12, field: appSettings.field }).items : [];
      active = Math.min(active, Math.max(0, items.length - 1));
      list.innerHTML = items.map((it, i) => {
        const pic = it.native ? nativeThumb(it.id) : it.pack === 'phylopic' ? `<span class="pp-thumb" style="-webkit-mask-image:url('${it.url}');mask-image:url('${it.url}')"></span>` : `<img src="${it.url}" alt="">`;
        return `<button class="qa-item${i === active ? ' on' : ''}" data-i="${i}" title="${esc(it.name)}">${pic}<span>${esc(it.name)}</span></button>`;
      }).join('') || (q ? '<div class="note" style="padding:6px">No icons match</div>' : '<div class="note" style="padding:6px">↑↓ or ←→ to choose · Enter to add · Esc to close</div>');
    };
    const pick = async (i) => { const it = items[i]; if (!it) return; close(); await addIcon(it.key, at); };
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
