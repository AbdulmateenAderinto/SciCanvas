// SciCanvas colour picker: replaces the browser's own colour popup for every colour box in the app.
//
// The built-in popup belongs to its <input type="color">, so it closed whenever the panel holding that input was
// redrawn, which happens while a colour is being changed (icon presets, layer lists, effects). It also lost the drag in
// its colour square. This picker floats above the page instead: drag freely in the square and the hue bar, type hex or
// RGB, use the eyedropper, swatches and recent colours. Every change goes to the original input's own handlers as a
// normal "input" event (and "change" when the picker closes), so each colour box keeps working exactly as before, even
// if its panel is rebuilt meanwhile. Click outside or press Esc / Enter to close.
(() => {
  const RECENT_KEY = 'scicanvas:recentColours';
  const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hex2 = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  const toHex6 = (c) => {
    const s = String(c || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s.slice(1).split('').map((x) => x + x).join('');
    return null;
  };
  const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgbToHex = (r, g, b) => '#' + hex2(r) + hex2(g) + hex2(b);
  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
  }
  function hsvToRgb(h, s, v) {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return [f(5) * 255, f(3) * 255, f(1) * 255];
  }

  let pop = null, cur = null; // cur: { input, h, s, v, start, raf }

  function build() {
    pop = document.createElement('div');
    pop.id = 'cpick';
    pop.className = 'cpick hidden';
    pop.innerHTML = `
      <div class="cp-sv" tabindex="0" aria-label="Saturation and brightness"><div class="cp-sv-thumb"></div></div>
      <div class="cp-row">
        <button class="cp-eye" type="button" title="Pick a colour from anywhere on screen">💧 Pick</button>
        <div class="cp-prev"></div>
        <div class="cp-hue" tabindex="0" aria-label="Hue"><div class="cp-hue-thumb"></div></div>
      </div>
      <div class="cp-fields">
        <label>Hex<input class="cp-hex" spellcheck="false" maxlength="7"></label>
        <label>R<input class="cp-r" type="number" min="0" max="255"></label>
        <label>G<input class="cp-g" type="number" min="0" max="255"></label>
        <label>B<input class="cp-b" type="number" min="0" max="255"></label>
      </div>
      <div class="cp-sw"></div>
      <div class="cp-recent-wrap"><div class="cp-title">Recent</div><div class="cp-recent"></div></div>
      <div class="cp-foot"><button class="cp-done primary" type="button">Done</button></div>`;
    document.body.appendChild(pop);
    const sv = pop.querySelector('.cp-sv'), hue = pop.querySelector('.cp-hue');
    // Dragging keeps working outside the square: the pointer is captured until it's released.
    const dragOn = (el, fn) => el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      fn(e);
      const mv = (ev) => fn(ev);
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    dragOn(sv, (e) => { const r = sv.getBoundingClientRect(); cur.s = clamp((e.clientX - r.left) / r.width, 0, 1); cur.v = 1 - clamp((e.clientY - r.top) / r.height, 0, 1); changed(); });
    dragOn(hue, (e) => { const r = hue.getBoundingClientRect(); cur.h = clamp((e.clientX - r.left) / r.width, 0, 1) * 359.9; changed(); });
    sv.addEventListener('keydown', (e) => { const st = e.shiftKey ? 0.1 : 0.02; const m = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key]; if (m) { e.preventDefault(); cur.s = clamp(cur.s + m[0], 0, 1); cur.v = clamp(cur.v + m[1], 0, 1); changed(); } });
    hue.addEventListener('keydown', (e) => { const m = { ArrowLeft: -2, ArrowRight: 2 }[e.key]; if (m) { e.preventDefault(); cur.h = (cur.h + m * (e.shiftKey ? 5 : 1) + 360) % 360; changed(); } });
    pop.querySelector('.cp-hex').addEventListener('input', (e) => { const h = toHex6(e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value); if (h) setHex(h, true); });
    for (const k of ['r', 'g', 'b']) pop.querySelector('.cp-' + k).addEventListener('input', () => {
      const v = ['r', 'g', 'b'].map((c) => clamp(parseInt(pop.querySelector('.cp-' + c).value, 10) || 0, 0, 255));
      setHex(rgbToHex(...v), true, 'rgb');
    });
    const eye = pop.querySelector('.cp-eye');
    if (!window.EyeDropper) eye.style.display = 'none';
    eye.addEventListener('click', async () => {
      try { const r = await new window.EyeDropper().open(); const h = toHex6(r.sRGBHex) || (r.sRGBHex.startsWith('rgb') ? rgbToHex(...r.sRGBHex.match(/\d+/g).map(Number)) : null); if (h) setHex(h); } catch { /* cancelled */ }
    });
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) setHex(b.dataset.c); });
    pop.querySelector('.cp-done').addEventListener('click', () => close());
    pop.addEventListener('pointerdown', (e) => e.stopPropagation());
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape' || (e.key === 'Enter' && !e.target.matches('input'))) { e.preventDefault(); e.stopPropagation(); close(); } });
    window.addEventListener('pointerdown', (e) => { if (cur && !pop.contains(e.target) && e.target !== cur.input) close(); }, true);
    window.addEventListener('keydown', (e) => { if (cur && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }, true);
    window.addEventListener('resize', () => cur && place());
  }

  const hexNow = () => rgbToHex(...hsvToRgb(cur.h, cur.s, cur.v));
  function setHex(h, fromField, which) {
    const [r, g, b] = hexToRgb(h), [hh, s, v] = rgbToHsv(r, g, b);
    cur.h = s && v ? hh : cur.h; cur.s = s; cur.v = v;
    changed(fromField, which, h);
  }
  // Update the picker and send the colour to the input (at most once per frame while dragging).
  function changed(fromField, which, exact) {
    const h = exact || hexNow();
    paint(h, fromField, which);
    cur.value = h;
    if (cur.raf) return;
    cur.raf = requestAnimationFrame(() => { cur && (cur.raf = 0, send('input')); });
  }
  function send(type) {
    const inp = cur.input;
    if (!cur.value || inp.value === cur.value && type === 'input') return;
    inp.value = cur.value;
    inp.dispatchEvent(new Event(type, { bubbles: true }));
  }
  function paint(h, fromField, which) {
    pop.querySelector('.cp-sv').style.background = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${cur.h}, 100%, 50%)`;
    const t = pop.querySelector('.cp-sv-thumb');
    t.style.left = cur.s * 100 + '%'; t.style.top = (1 - cur.v) * 100 + '%'; t.style.background = h;
    pop.querySelector('.cp-hue-thumb').style.left = (cur.h / 360) * 100 + '%';
    pop.querySelector('.cp-prev').style.background = h;
    if (!fromField || which === 'rgb') pop.querySelector('.cp-hex').value = h;
    if (!fromField || which !== 'rgb') { const [r, g, b] = hexToRgb(h); pop.querySelector('.cp-r').value = r; pop.querySelector('.cp-g').value = g; pop.querySelector('.cp-b').value = b; }
  }
  function place() {
    const r = cur.input.isConnected ? cur.input.getBoundingClientRect() : cur.anchor;
    cur.anchor = r;
    const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let x = r.left, y = r.bottom + 6;
    if (x + pw > vw - 8) x = Math.max(8, r.right - pw);
    if (y + ph > vh - 8) y = Math.max(8, r.top - ph - 6);
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function open(input) {
    if (!pop) build();
    if (cur) close();
    const h = toHex6(input.value) || '#000000', [r, g, b] = hexToRgb(h), [hh, s, v] = rgbToHsv(r, g, b);
    cur = { input, h: hh, s, v, start: h, value: h, raf: 0, anchor: input.getBoundingClientRect() };
    const sw = typeof SWATCHES !== 'undefined' ? SWATCHES : ['#4a7fd6', '#3fa58b', '#e8743b', '#d64545', '#9b7fd1', '#e8b33c', '#222222', '#ffffff'];
    pop.querySelector('.cp-sw').innerHTML = sw.map((c) => `<button type="button" data-c="${c}" title="${c}" style="background:${c}"></button>`).join('');
    const rec = lsGet(RECENT_KEY, []).filter((c) => toHex6(c));
    pop.querySelector('.cp-recent').innerHTML = rec.map((c) => `<button type="button" data-c="${c}" title="${c}" style="background:${c}"></button>`).join('');
    pop.querySelector('.cp-recent-wrap').style.display = rec.length ? '' : 'none';
    paint(h);
    pop.classList.remove('hidden');
    input.classList.add('cp-open');
    place();
    pop.querySelector('.cp-sv').focus({ preventScroll: true });
  }
  function close() {
    if (!cur) return;
    const c = cur;
    if (c.raf) { cancelAnimationFrame(c.raf); c.raf = 0; send('input'); }
    if (c.value && c.value !== c.start) {
      send('change');
      lsSet(RECENT_KEY, [c.value, ...lsGet(RECENT_KEY, []).filter((x) => x !== c.value)].slice(0, 12));
    }
    c.input.classList.remove('cp-open');
    cur = null;
    pop.classList.add('hidden');
  }

  // Take over every colour box: the browser's popup never opens; ours does.
  const isColour = (t) => t && t.matches && t.matches('input[type="color"]') && !t.disabled;
  document.addEventListener('click', (e) => { if (isColour(e.target)) { e.preventDefault(); if (cur && cur.input === e.target) close(); else open(e.target); } }, true);
  document.addEventListener('keydown', (e) => { if (isColour(e.target) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(e.target); } }, true);
  window.ColourPicker = { open, close, isOpen: () => !!cur };
})();
