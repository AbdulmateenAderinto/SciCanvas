// Visual right-click menus (v1.3). The canvas menu and the toolbar flyouts show pictures instead of text lists:
// tool icons, shape thumbnails, line previews, real brush strokes and small icons for the common actions (copy,
// arrange, align, flip, lock…). Anything without a picture stays a text row, so every command in
// contextMenuTemplate() is still reachable. If building the menu fails, the native text menu is used instead.
// Loaded after shapelib.js, which shares its shape, line, tool and brush lists through globalThis.ShapeLib.
(() => {
  const SL = globalThis.ShapeLib;
  if (!SL) return;
  const { LIB, LINES, TOOLS, BRUSHES, shapeThumb, lineThumb, insertShape, useLinePreset } = SL;
  const svgI = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const R = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2"/>`;
  // [icon, short caption] for each command or edit role that has a picture.
  const ICON = {
    cut: [svgI('<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.2 16L19 3M15.8 16L5 3"/>'), 'Cut'],
    copy: [svgI('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'), 'Copy'],
    paste: [svgI('<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><path d="M9 11h6M9 15h4"/>'), 'Paste'],
    duplicate: [svgI('<rect x="3" y="3" width="12" height="12" rx="2"/><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M15 12.5v5M12.5 15h5"/>'), 'Duplicate'],
    copyImage: [svgI('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>'), 'As image'],
    copySvg: [svgI('<path d="M6 3h8l4 4v14H6z"/><path d="M9 12.5c.6-.9 2.6-.8 2.6.3 0 1.2-2.6.8-2.6 2 0 1.1 2 1.2 2.7.3M13 11.5l1.2 4.5 1.3-4.5"/>'), 'As SVG'],
    selectAll: [svgI('<rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2.5"/><path d="M9 9l7 3-3 1-1 3z"/>'), 'Select all'],
    bringFront: [svgI('<path d="M5 4h14M12 20V8M7.5 12.5L12 8l4.5 4.5"/>'), 'To front'],
    bringForward: [svgI('<path d="M12 19V6M7.5 10.5L12 6l4.5 4.5"/>'), 'Forward'],
    sendBackward: [svgI('<path d="M12 5v13M7.5 13.5L12 18l4.5-4.5"/>'), 'Backward'],
    sendBack: [svgI('<path d="M5 20h14M12 4v12M7.5 11.5L12 16l4.5-4.5"/>'), 'To back'],
    alignL: [svgI('<path d="M4 3v18"/>' + R(7, 6, 12, 4) + R(7, 14, 7, 4)), 'Left'],
    alignC: [svgI('<path d="M12 3v18"/>' + R(5, 6, 14, 4) + R(8, 14, 8, 4)), 'Centre'],
    alignR: [svgI('<path d="M20 3v18"/>' + R(5, 6, 12, 4) + R(10, 14, 7, 4)), 'Right'],
    alignT: [svgI('<path d="M3 4h18"/>' + R(6, 7, 4, 12) + R(14, 7, 4, 7)), 'Top'],
    alignM: [svgI('<path d="M3 12h18"/>' + R(6, 5, 4, 14) + R(14, 8, 4, 8)), 'Middle'],
    alignB: [svgI('<path d="M3 20h18"/>' + R(6, 5, 4, 12) + R(14, 10, 4, 7)), 'Bottom'],
    distH: [svgI('<path d="M3 3v18M21 3v18"/>' + R(9.5, 7, 5, 10)), 'Across'],
    distV: [svgI('<path d="M3 3h18M3 21h18"/>' + R(7, 9.5, 10, 5)), 'Down'],
    matchW: [svgI('<path d="M4 8h16M4 16h11M4 6v4M20 6v4M4 14v4M15 14v4"/>'), 'Width'],
    matchH: [svgI('<path d="M8 4v16M16 4v11M6 4h4M6 20h4M14 4h4M14 15h4"/>'), 'Height'],
    matchSize: [svgI(R(3, 3, 9, 9) + R(12, 12, 9, 9) + '<path d="M12 7h3a2 2 0 0 1 2 2v3"/>'), 'Both'],
    flipH: [svgI('<path d="M12 3v18" stroke-dasharray="2 2"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/>'), 'Horizontal'],
    flipV: [svgI('<path d="M3 12h18" stroke-dasharray="2 2"/><path d="M6 9L18 3v6zM6 15l12 6v-6z"/>'), 'Vertical'],
    group: [svgI('<rect x="2.5" y="2.5" width="19" height="19" rx="2" stroke-dasharray="3 2.5"/><rect x="6" y="6" width="6.5" height="6.5" rx="1"/><circle cx="15.5" cy="15.5" r="3.2"/>'), 'Group'],
    ungroup: [svgI('<rect x="3" y="3" width="10" height="10" rx="1.5" stroke-dasharray="2.5 2"/><rect x="11" y="11" width="10" height="10" rx="1.5" stroke-dasharray="2.5 2"/><rect x="5.5" y="5.5" width="5" height="5" rx="1"/><circle cx="16" cy="16" r="2.5"/>'), 'Ungroup'],
    lock: [svgI('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'), 'Lock'],
    unlockAll: [svgI('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/>'), 'Unlock all'],
    hide: [svgI('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 20L20 4"/>'), 'Hide'],
    showAll: [svgI('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), 'Show all'],
    deleteSel: [svgI('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), 'Delete'],
    commentTool: [svgI('<path d="M4 5h16v11H10l-5 4v-4H4z"/>'), 'Comment'],
    transform: [svgI(R(6, 6, 12, 12) + '<path d="M3 3l3 3M21 21l-3-3M21 3l-3 3M3 21l3-3"/>'), 'Transform'],
    editPoints: [svgI('<path d="M4 18C8 4 16 20 20 6"/><rect x="2.5" y="16.5" width="3" height="3"/><rect x="18.5" y="4.5" width="3" height="3"/>'), 'Edit points'],
  };
  const PENCIL = [
    ['free', 'Freehand', '<path d="M3 15c3-8 6 4 9-3s5 3 9-5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>'],
    ['shape', 'Closed shape', '<path d="M4 12c0-5 6-8 10-6s7 2 6 7-7 7-11 5-5-2-5-6z" fill="#e8eef8" stroke="#4a6fae" stroke-width="1.5"/>'],
    ['protein', 'Soft protein', '<path d="M4 12c0-5 6-8 10-6s7 2 6 7-7 7-11 5-5-2-5-6z" fill="#9fc0e8" stroke="#5b86bd" stroke-width="1.2"/><ellipse cx="9.5" cy="9" rx="3.5" ry="2" fill="#fff" opacity=".55"/>'],
  ];
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const node = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const toolIcon = (t, kind) => {
    const b = document.querySelector(`#tools button[data-tool="${t}"]${kind ? `[data-kind="${kind}"]` : ''}`);
    const s = b && b.querySelector('svg');
    return s ? s.outerHTML : svgI('<circle cx="12" cy="12" r="6"/>');
  };
  const brushCache = {};
  function brushThumb(k) {
    if (brushCache[k]) return brushCache[k];
    let inner = '';
    try {
      const o = Make.brush(k, 0, 0, 104, 30, [[0, 0.75], [0.25, 0.25], [0.5, 0.5], [0.75, 0.8], [1, 0.3]], { size: 6 });
      inner = renderObjectString(o, [o], true);
    } catch (e) { inner = ''; }
    return (brushCache[k] = inner ? `<svg viewBox="-10 -12 124 54">${inner}</svg>` : toolIcon('brush', k));
  }

  // ---------- panels ----------
  let panels = []; // open panels, root first; each later one is a flyout of the one before it
  function closeAll() { for (const p of panels) p.remove(); panels = []; }
  function closeFrom(level) { for (const p of panels.splice(level)) p.remove(); }
  function place(p, x, y, anchor) {
    document.body.append(p);
    const r = p.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    if (anchor) { // flyout: to the right of its row, or to the left when there is no room
      x = anchor.right + r.width + 6 > W ? anchor.left - r.width + 2 : anchor.right - 2;
      y = anchor.top - 6;
    }
    p.style.left = Math.max(4, Math.min(x, W - r.width - 4)) + 'px';
    p.style.top = Math.max(4, Math.min(y, H - r.height - 4)) + 'px';
  }
  function panel(level) { const p = node('div', 'cm-panel'); p.dataset.level = level; p.addEventListener('contextmenu', (e) => e.preventDefault()); return p; }
  // A row (or tile) that opens a flyout built by fill(panel) when hovered.
  function flyoutOn(el, level, fill) {
    let t = null;
    el.addEventListener('mouseenter', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (panels[level + 1] && panels[level + 1]._owner === el) return;
        closeFrom(level + 1);
        const p = panel(level + 1);
        p._owner = el;
        fill(p, level + 1);
        panels.push(p);
        place(p, 0, 0, el.getBoundingClientRect());
        el.classList.add('open');
      }, 90);
    });
    el.addEventListener('mouseleave', () => clearTimeout(t));
    el.addEventListener('click', () => el.dispatchEvent(new Event('mouseenter')));
  }
  // Hovering anything else in a panel closes that panel's open flyout.
  function closesFlyouts(el, level) {
    el.addEventListener('mouseenter', () => {
      const next = panels[level + 1];
      if (next && next._owner !== el) { if (next._owner) next._owner.classList.remove('open'); closeFrom(level + 1); }
    });
  }
  const act = (fn) => () => { closeAll(); fn(); };
  function runItem(it) {
    if (it.role) { if (window.native && window.native.editRole) window.native.editRole(it.role); else document.execCommand(it.role); } else if (it.cmd) runCommand(it.cmd);
  }
  function tile(label, pic, onClick, cls = '') {
    const b = node('button', 'cm-tile ' + cls, `<span class="cm-pic">${pic}</span>${label ? `<span class="cm-cap">${esc(label)}</span>` : ''}`);
    b.title = label;
    b.addEventListener('click', onClick);
    return b;
  }
  function grid(cls, tiles) { const g = node('div', 'cm-grid ' + cls); g.append(...tiles); return g; }

  // ---------- picture grids (shared by the canvas menu and the toolbar flyouts) ----------
  const toolTiles = () => TOOLS.map(([t, l, k]) => {
    const b = tile('', toolIcon(t), act(() => setTool(t)), 'tool' + (state.tool === t ? ' on' : ''));
    b.title = `${l}${k ? ` (${k})` : ''}`;
    return b;
  });
  function shapesFill(p) {
    const at = SL.menuPoint();
    p.classList.add('cm-wide');
    for (const [cat, items] of LIB) {
      p.append(node('h4', '', esc(cat)));
      p.append(grid('shapes', items.map((it) => tile('', shapeThumb(it), act(() => insertShape(it, at)), 'thumb'))));
      [...p.lastChild.children].forEach((b, i) => { b.title = items[i].label; });
    }
  }
  const lineTiles = () => LINES.map(([n, pr]) => tile(n, lineThumb(pr), act(() => useLinePreset(n)), 'line' + (globalThis.linePreset && JSON.stringify(globalThis.linePreset) === JSON.stringify(pr) ? ' on' : '')));
  const brushTiles = () => BRUSHES.map(([k, l]) => tile(l, brushThumb(k), act(() => setTool('brush', k)), 'brush' + (state.tool === 'brush' && state.brushKind === k ? ' on' : '')));
  const pencilTiles = () => PENCIL.map(([m, l, d]) => tile(l, `<svg viewBox="0 0 24 24">${d}</svg>`, act(() => runCommand('pencilmode:' + m)), 'pencil'));
  const VISUAL = {
    shapes: { pic: () => LIB[0][1].slice(0, 1).concat(LIB[1] ? LIB[1][1].slice(0, 1) : [], LIB[0][1].slice(4, 6)).map(shapeThumb).join(''), fill: shapesFill },
    lines: { pic: () => LINES.slice(0, 1).concat(LINES.slice(1, 2)).map(([, p]) => lineThumb(p)).join(''), fill: (p) => p.append(grid('lines', lineTiles())) },
    brushes: { pic: () => brushThumb('membrane') + brushThumb('dna'), fill: (p) => p.append(grid('brushes', brushTiles())) },
    pencil: { pic: () => PENCIL.map(([, , d]) => `<svg viewBox="0 0 24 24">${d}</svg>`).join(''), fill: (p) => p.append(grid('pencil', pencilTiles())) },
  };
  function visualRow(kind, label, level) {
    const v = VISUAL[kind], r = node('div', 'cm-row cm-vrow', `<span class="cm-label">${esc(label)}</span><span class="cm-strip-pics ${kind}">${v.pic()}</span><span class="cm-chev">›</span>`);
    flyoutOn(r, level, v.fill);
    return r;
  }

  // ---------- the canvas menu, built from contextMenuTemplate() ----------
  function build(items, p, level) {
    let strip = null;
    const sep = () => { strip = null; if (p.lastChild && !p.lastChild.classList.contains('cm-sep')) p.append(node('div', 'cm-sep')); };
    for (const it of items) {
      if (it.type === 'separator') { sep(); continue; }
      if (it.visual === 'tools') {
        sep(); p.append(node('div', 'cm-head', 'Tools'));
        const g = grid('tools', toolTiles()); [...g.children].forEach((b) => closesFlyouts(b, level)); p.append(g);
        p.append(visualRow('brushes', 'Brushes', level), visualRow('pencil', 'Pencil styles', level));
        sep(); continue;
      }
      if (it.visual) { strip = null; p.append(visualRow(it.visual, it.label, level)); continue; }
      const ic = !it.submenu && ICON[it.cmd || it.role];
      if (ic) {
        if (!strip) { strip = node('div', 'cm-strip'); p.append(strip); }
        const b = tile(ic[1], ic[0], act(() => runItem(it)), 'action');
        b.title = it.label;
        if (it.enabled === false) b.disabled = true;
        closesFlyouts(b, level);
        strip.append(b);
        continue;
      }
      strip = null;
      // A submenu of pictured commands (Align, Flip, Distribute…) previews them on its row.
      const kids = it.submenu ? it.submenu.filter((c) => c.type !== 'separator') : [];
      const pics = kids.length && kids.every((c) => ICON[c.cmd || c.role]) ? `<span class="cm-strip-pics">${kids.slice(0, 4).map((c) => ICON[c.cmd || c.role][0]).join('')}</span>` : '';
      const r = node('div', 'cm-row' + (it.enabled === false ? ' off' : ''), `<span class="cm-label">${esc(it.label)}</span>${pics}${it.submenu ? '<span class="cm-chev">›</span>' : ''}`);
      if (it.submenu) flyoutOn(r, level, (q, l) => build(it.submenu, q, l));
      else { closesFlyouts(r, level); if (it.enabled !== false) r.addEventListener('click', act(() => runItem(it))); }
      p.append(r);
    }
    while (p.lastChild && p.lastChild.classList.contains('cm-sep')) p.lastChild.remove();
    if (p.firstChild && p.firstChild.classList.contains('cm-sep')) p.firstChild.remove();
  }
  function openCanvasMenu(x, y) {
    closeAll();
    const p = panel(0);
    build(contextMenuTemplate(), p, 0);
    panels.push(p);
    place(p, x, y);
  }

  // ---------- toolbar flyouts: right-click a tool for its variants ----------
  const shapeToolTiles = () => SHAPES.map(([k, l]) => { const b = tile('', shapeThumb({ kind: k, w: 60, h: 50 }), act(() => runCommand('shapetool:' + k)), 'thumb'); b.title = l; return b; });
  const basicTiles = (re) => LIB[0][1].filter((it) => re.test(it.label)).map((it) => tile(it.label, shapeThumb(it), act(() => insertShape(it, null)), 'thumb cap'));
  const FLY = {
    shape: () => grid('shapes', shapeToolTiles()),
    connector: () => grid('lines', lineTiles()), arrow: () => grid('lines', lineTiles()), line: () => grid('lines', lineTiles()),
    brush: () => grid('brushes', brushTiles()),
    pencil: () => grid('pencil', pencilTiles()),
    rect: () => grid('shapes capped', basicTiles(/Rect|Square|Frame|Capsule|Rounded/)),
    ellipse: () => grid('shapes capped', basicTiles(/Circle|Ellipse|Semicircle|Ring|Pie|Crescent|Moon/)),
  };
  function openToolFlyout(b) {
    closeAll();
    const p = panel(0), t = b.dataset.tool;
    p.append(node('div', 'cm-head', esc((b.title || t).split(' — ')[0])));
    p.append(FLY[t] ? FLY[t]() : grid('tools', toolTiles()));
    if (t === 'shape') p.classList.add('cm-wide');
    panels.push(p);
    const r = b.getBoundingClientRect();
    place(p, r.right + 6, r.top - 4);
  }

  // ---------- wiring ----------
  // Capture phase, before arrange.js's native menu: same selection rules, then the picture menu.
  svg.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const o = hitObject(e.target);
    if (o && !state.sel.includes(o.id)) { state.sel = [o.id]; render({ props: true }); }
    if (!o && !e.shiftKey) { state.sel = []; render({ props: true }); }
    try { openCanvasMenu(e.clientX, e.clientY); } catch (err) {
      console.error(err); closeAll();
      if (window.native && window.native.contextMenu) window.native.contextMenu(contextMenuTemplate());
    }
  }, true);
  document.addEventListener('contextmenu', (e) => {
    const b = e.target.closest && e.target.closest('#tools [data-tool]');
    if (!b) return;
    e.preventDefault();
    try { openToolFlyout(b); } catch (err) { console.error(err); closeAll(); }
  });
  document.addEventListener('mousedown', (e) => { if (panels.length && !e.target.closest('.cm-panel')) closeAll(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panels.length) { e.stopPropagation(); closeAll(); } }, true);
  window.addEventListener('blur', closeAll);
  window.addEventListener('resize', closeAll);
  document.addEventListener('wheel', (e) => { if (panels.length && !e.target.closest('.cm-panel')) closeAll(); }, { capture: true, passive: true });
  globalThis.VisualMenu = { openCanvasMenu, openToolFlyout, closeAll, ICON, brushThumb };
})();
