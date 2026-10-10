// Side panels you can resize or tuck away, for more room to draw.
//
// A thin bar sits on the inner edge of the left panel (Library / Uploads / Shapes) and of the right panel
// (Properties / Layers / Comments / Check):
// - drag it to make the panel narrower or wider;
// - drag it most of the way closed (or click its arrow, or double-click it) to hide the panel completely; a small tab
//   on the window edge brings it back (click it, or drag it out);
// - ⌘\ (Ctrl+\ on Windows) hides or shows both at once.
// Widths and hidden panels are remembered. The drawing stays where it is on screen while a panel changes size.
(() => {
  const KEY = 'scicanvas:panels';
  const DEF = { left: 264, right: 280 }, MIN = { left: 190, right: 220 }, MAX = { left: 560, right: 560 }, SNAP = 120;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* storage unavailable */ } };
  const st = { left: { w: DEF.left, hidden: false }, right: { w: DEF.right, hidden: false }, ...load() };
  for (const s of ['left', 'right']) st[s] = { w: Math.max(MIN[s], Math.min(MAX[s], +st[s]?.w || DEF[s])), hidden: !!st[s]?.hidden };

  const main = document.getElementById('main'), center = document.getElementById('center');
  const panel = { left: document.getElementById('left'), right: document.getElementById('right') };
  if (!main || !center || !panel.left || !panel.right) return;
  const NAME = { left: 'Library', right: 'Properties' };

  const grips = {}, tabs = {};
  for (const side of ['left', 'right']) {
    const g = document.createElement('div');
    g.className = `panel-grip panel-grip-${side}`;
    g.title = `Drag to resize the ${NAME[side]} panel · drag it closed or double-click to hide it · ⌘\\ hides both panels`;
    g.innerHTML = `<button type="button" class="panel-grip-btn" title="Hide the ${NAME[side]} panel">${side === 'left' ? '‹' : '›'}</button>`;
    grips[side] = g;
    const t = document.createElement('button');
    t.type = 'button';
    t.className = `panel-tab panel-tab-${side}`;
    t.title = `Show the ${NAME[side]} panel (or drag it out)`;
    t.innerHTML = `<span>${side === 'left' ? '›' : '‹'}</span><span class="panel-tab-name">${NAME[side]}</span>`;
    tabs[side] = t;
    if (side === 'left') { panel.left.after(g); center.append(t); } else { panel.right.before(g); center.append(t); }
  }

  // Redraw what depends on the canvas size; keep the page still on screen when the canvas's left edge moves.
  function refresh(shiftX = 0) {
    if (shiftX && typeof state !== 'undefined') { state.panX += shiftX; if (typeof applyViewport === 'function') applyViewport(); }
    if (typeof drawRulers === 'function') drawRulers();
    if (typeof renderOverlay === 'function') renderOverlay();
  }
  function apply() {
    for (const side of ['left', 'right']) {
      const p = panel[side], s = st[side];
      p.style.width = s.w + 'px';
      p.classList.toggle('panel-hidden', s.hidden);
      grips[side].classList.toggle('hidden', s.hidden);
      tabs[side].classList.toggle('hidden', !s.hidden);
      grips[side].querySelector('.panel-grip-btn').title = `Hide the ${NAME[side]} panel`;
    }
  }
  const leftEdge = () => center.getBoundingClientRect().left;
  function setHidden(side, hidden) {
    const x0 = leftEdge();
    st[side].hidden = hidden;
    apply(); save();
    refresh(x0 - leftEdge());
  }

  // Dragging a bar (or a tab, to pull a hidden panel back out).
  function startDrag(side, e, fromTab) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = st[side].hidden ? 0 : st[side].w, keepW = st[side].w; // dragged closed, it reopens at this width
    let moved = false;
    document.body.classList.add('panel-resizing');
    const move = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      if (!moved) return;
      const w = side === 'left' ? startW + dx : startW - dx;
      const before = leftEdge();
      if (w < SNAP) { st[side].hidden = true; st[side].w = keepW; }
      else { st[side].hidden = false; st[side].w = Math.max(MIN[side], Math.min(MAX[side], w)); }
      apply();
      refresh(before - leftEdge());
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      document.body.classList.remove('panel-resizing');
      if (!moved && fromTab === 'tab') { setHidden(side, false); return; }
      if (!moved && fromTab === 'button') { setHidden(side, true); return; }
      save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  for (const side of ['left', 'right']) {
    // The arrow hides the panel when clicked, and drags like the rest of the bar when pulled.
    grips[side].addEventListener('pointerdown', (e) => startDrag(side, e, e.target.closest('.panel-grip-btn') ? 'button' : 'bar'));
    grips[side].addEventListener('dblclick', (e) => { if (!e.target.closest('.panel-grip-btn')) setHidden(side, true); });
    tabs[side].addEventListener('pointerdown', (e) => startDrag(side, e, 'tab'));
  }
  function toggleBoth() {
    const hide = !(st.left.hidden && st.right.hidden);
    const x0 = leftEdge();
    st.left.hidden = hide; st.right.hidden = hide;
    apply(); save(); refresh(x0 - leftEdge());
  }
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === '\\' && !(typeof isTyping === 'function' && isTyping())) { e.preventDefault(); toggleBoth(); }
  });
  if (typeof ARRANGE_COMMANDS !== 'undefined') Object.assign(ARRANGE_COMMANDS, { togglePanels: toggleBoth, toggleLeftPanel: () => setHidden('left', !st.left.hidden), toggleRightPanel: () => setHidden('right', !st.right.hidden) });
  apply();
  globalThis.SidePanels = { setHidden, toggleBoth, state: st };
})();
