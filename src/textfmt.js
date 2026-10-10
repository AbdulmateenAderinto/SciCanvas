// Text tools (v1.3): a formatting bar while you type on the canvas (font, size, bold / italic / underline /
// strikethrough, superscript and subscript, colour, Greek letters and symbols, clear), the same per-word buttons in
// Properties, and a larger font list: 12 bundled open-licence fonts (src/fonts, embedded into exported SVG / PDF /
// images so figures look the same everywhere) plus common system fonts with sensible fallbacks.
(() => {
  // ---------- Fonts ----------
  const SANS = 'Helvetica, Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", serif', MONO = 'Menlo, Consolas, monospace';
  const BUNDLED = [['inter', 'Inter', SANS], ['roboto', 'Roboto', SANS], ['open-sans', 'Open Sans', SANS], ['lato', 'Lato', SANS], ['montserrat', 'Montserrat', SANS], ['source-sans-3', 'Source Sans 3', SANS],
    ['noto-sans', 'Noto Sans', SANS], ['ibm-plex-sans', 'IBM Plex Sans', SANS], ['fira-sans', 'Fira Sans', SANS], ['merriweather', 'Merriweather', SERIF], ['source-serif-4', 'Source Serif 4', SERIF], ['jetbrains-mono', 'JetBrains Mono', MONO]];
  const SYSTEM = [['system', 'System UI', 'system-ui, -apple-system, "Segoe UI", ' + SANS], ['calibri', 'Calibri', `Calibri, Carlito, ${SANS}`], ['cambria', 'Cambria', `Cambria, Caladea, ${SERIF}`],
    ['garamond', 'Garamond', `Garamond, "EB Garamond", ${SERIF}`], ['baskerville', 'Baskerville', `Baskerville, "Baskerville Old Face", ${SERIF}`], ['optima', 'Optima', `Optima, Candara, ${SANS}`],
    ['segoe', 'Segoe UI', `"Segoe UI", ${SANS}`], ['tahoma', 'Tahoma', `Tahoma, ${SANS}`], ['arial-narrow', 'Arial Narrow', `"Arial Narrow", ${SANS}`], ['arial-black', 'Arial Black', `"Arial Black", ${SANS}`],
    ['rockwell', 'Rockwell', `Rockwell, ${SERIF}`], ['didot', 'Didot', `Didot, "Bodoni MT", ${SERIF}`], ['american-typewriter', 'American Typewriter', `"American Typewriter", "Courier New", ${MONO}`], ['comic', 'Comic Sans', '"Comic Sans MS", "Comic Neue", sans-serif']];
  for (const [k, name, fb] of BUNDLED) { FONT_STACK[k] = `"${name}", ${fb}`; if (!FONT_NAMES.some((x) => x[0] === k)) FONT_NAMES.push([k, `${name} ✦`]); }
  for (const [k, name, stack] of SYSTEM) { FONT_STACK[k] = stack; if (!FONT_NAMES.some((x) => x[0] === k)) FONT_NAMES.push([k, name]); }
  globalThis.BUNDLED_FONTS = BUNDLED;
  // Unicode ranges of the two subsets (as Fontsource / Google Fonts split them).
  const RANGE = { latin: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD', greek: 'U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF' };
  const STYLES = [['400', 'normal'], ['700', 'normal'], ['400', 'italic'], ['700', 'italic']];
  const fontData = new Map(); // "file" → base64, for embedding into exports
  const fontFile = (k, sub, w, st) => `${k}-${sub}-${w}-${st}.woff2`;
  // Lato, Montserrat and Merriweather have no Greek letters (Greek falls back to the system font), so there are no
  // Greek files to load for them.
  const NO_GREEK = new Set(['lato', 'montserrat', 'merriweather']);
  const subsets = (k) => (NO_GREEK.has(k) ? ['latin'] : ['latin', 'greek']);
  async function loadFonts() {
    if (typeof FontFace === 'undefined' || typeof fetch === 'undefined') return;
    const jobs = [];
    for (const [k, name] of BUNDLED) for (const sub of subsets(k)) for (const [w, st] of STYLES) {
      const file = fontFile(k, sub, w, st);
      jobs.push(fetch(`fonts/${file}`).then((r) => (r.ok ? r.arrayBuffer() : null)).then(async (buf) => {
        if (!buf) return;
        const face = new FontFace(name, buf, { weight: w, style: st, unicodeRange: RANGE[sub] });
        await face.load(); document.fonts.add(face);
        let bin = ''; const u8 = new Uint8Array(buf);
        for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        fontData.set(file, btoa(bin));
      }).catch(() => {}));
    }
    await Promise.all(jobs);
    // Text measured before the fonts arrived used fallback widths: re-measure and redraw.
    if (typeof state !== 'undefined' && state.doc) {
      const walk = (o) => { if (o.type === 'text' && BUNDLED.some(([k]) => k === o.family) && typeof postEdit === 'function') postEdit(o); (o.children || []).forEach(walk); };
      state.doc.pages.forEach((p) => p.objects.forEach(walk));
      if (typeof elCache !== 'undefined') for (const c of elCache.values()) c.key = null;
      if (typeof render === 'function') render();
    }
  }
  setTimeout(loadFonts, 0);

  // Embed the bundled fonts a page uses, so exports (SVG, PDF, PNG/TIFF via an <img>) render them anywhere.
  const usedFamilies = (list, out = new Set()) => { for (const o of list || []) { for (const k of [o.family, o.labelFamily, o.pathTextFamily]) if (k) out.add(k); usedFamilies(o.children, out); } return out; };
  function fontFaceCss(families) {
    let css = '';
    for (const [k, name] of BUNDLED) if (families.has(k)) for (const sub of subsets(k)) for (const [w, st] of STYLES) {
      const b64 = fontData.get(fontFile(k, sub, w, st));
      if (b64) css += `@font-face{font-family:"${name}";src:url(data:font/woff2;base64,${b64}) format("woff2");font-weight:${w};font-style:${st};unicode-range:${RANGE[sub]};}`;
    }
    return css;
  }
  globalThis.fontFaceCss = fontFaceCss;
  const prevPageSvg = pageSvgString;
  pageSvgString = function (page, opts) {
    const svgText = prevPageSvg(page, opts), css = page && fontFaceCss(usedFamilies(page.objects));
    return css ? svgText.replace(/^(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`) : svgText;
  };

  // ---------- Formatting on the focused text box ----------
  const ta = () => $('#textEditor');
  const isEditing = () => typeof editing !== 'undefined' && editing && !ta().classList.contains('hidden');
  // While editing on the canvas (richedit.js) formatting applies to the words selected there.
  const RE = () => typeof RichEdit !== 'undefined' && RichEdit.active();
  function wrapSelection(pre, post, placeholder = '') {
    if (RE()) { RichEdit.wrap(pre, post, placeholder); return; }
    const t = ta(), s = t.selectionStart, e = t.selectionEnd, v = t.value, sel = v.slice(s, e) || placeholder;
    t.value = v.slice(0, s) + pre + sel + post + v.slice(e);
    t.setSelectionRange(s + pre.length, s + pre.length + sel.length);
    t.dispatchEvent(new Event('input'));
    t.focus();
  }
  const hasSelection = () => (RE() ? RichEdit.hasSelection() : ta().selectionEnd > ta().selectionStart);
  // Toggle a whole-object property when nothing is selected (text boxes and shape labels name them differently).
  function toggleWhole(prop) {
    const { o, key } = editing, label = key !== 'text';
    const k = label ? { bold: 'labelBold', italic: 'labelItalic', underline: null, strike: null }[prop] : prop;
    if (!k) { toast('Select the words to format'); return; }
    o[k] = !o[k]; postEdit(o); renderScene(); if (RE()) RichEdit.refresh(); positionBar(); syncBar();
  }
  const SPAN = { bold: 'b', italic: 'i', underline: 'u', strike: 's' };
  const format = (prop) => (hasSelection() ? wrapSelection(`{${SPAN[prop]}|`, '}') : toggleWhole(prop));
  const sizeKey = () => (editing.key === 'text' ? 'fontSize' : 'labelSize');
  const familyKey = () => (editing.key === 'text' ? 'family' : 'labelFamily');
  function setSize(d) { const { o } = editing, k = sizeKey(); o[k] = Math.max(4, Math.min(400, Math.round((o[k] || (o.type === 'connector' ? 13 : 16)) + d))); postEdit(o); renderScene(); ta().style.fontSize = o[k] * state.zoom + 'px'; if (RE()) RichEdit.refresh(); positionBar(); syncBar(); }
  function setFamily(k) { const { o } = editing; if (o.type === 'connector') { toast('Connector labels use the default font'); return; } o[familyKey()] = k; postEdit(o); renderScene(); if (RE()) RichEdit.refresh(); syncBar(); }
  function setColour(c) { if (RE() && RichEdit.hasSelection()) { RichEdit.colour(c); return; } if (RE()) { const { o } = editing; o[editing.key === 'text' ? 'color' : 'labelColor'] = c; postEdit(o); renderScene(); RichEdit.refresh(); return; } if (hasSelection()) wrapSelection(`{${c}|`, '}'); else { const { o } = editing; o[editing.key === 'text' ? 'color' : 'labelColor'] = c; postEdit(o); renderScene(); } }
  function clearFormatting() {
    if (RE()) { RichEdit.clear(); return; }
    const t = ta(), s = t.selectionStart, e = t.selectionEnd, all = s === e;
    const strip = (x) => x.replace(STYLE_SPAN, (m, a, c, b, inner) => inner).replace(/[\^_]\{([^{}]*)\}/g, '$1');
    t.value = all ? strip(t.value) : t.value.slice(0, s) + strip(t.value.slice(s, e)) + t.value.slice(e);
    t.dispatchEvent(new Event('input')); t.focus();
  }
  const SYMBOLS = 'α β γ δ ε ζ η θ κ λ μ ν ξ π ρ σ τ φ χ ψ ω Γ Δ Θ Λ Σ Φ Ψ Ω ± × ÷ · ≤ ≥ ≠ ≈ ∝ ∞ √ ∑ ∫ ∂ ° ℃ µ Å ‰ → ← ↑ ↓ ↔ ⇌ ⇒ ⊣ ⁺ ⁻ ² ³ ½ ♂ ♀ ✓ ✗ •'.split(' ');

  // ---------- The floating bar ----------
  const bar = el('div', { id: 'textbar', class: 'textbar hidden' });
  stage.append(bar);
  bar.addEventListener('mousedown', (e) => { if (!e.target.closest('input')) e.preventDefault(); }); // keep focus and selection in the text box
  const b = (html, title, fn, cls = '') => { const x = el('button', { title, class: cls, onclick: fn }); x.innerHTML = html; return x; };
  const pop = el('div', { class: 'textbar-pop hidden' });
  const openPop = (anchor, content) => {
    pop.innerHTML = ''; pop.append(content); pop.classList.remove('hidden');
    pop.style.left = anchor.offsetLeft + 'px'; pop.style.top = bar.offsetHeight + 4 + 'px';
    // Keep it on screen: shift left if it would run past the canvas edge.
    const sr = stage.getBoundingClientRect(), pr = pop.getBoundingClientRect();
    if (pr.right > sr.right - 6) pop.style.left = Math.max(-bar.offsetLeft + 6, anchor.offsetLeft - (pr.right - sr.right + 6)) + 'px';
  };
  const closePop = () => pop.classList.add('hidden');
  const fontBtn = b('Font', 'Font', (e) => {
    const list = el('div', { class: 'fontlist' }, ...FONT_NAMES.map(([k, l]) => { const it = el('button', { textContent: l.replace(' ✦', ''), title: l.includes('✦') ? 'Bundled with SciCanvas: looks the same on every computer and in exports' : 'System font: needs to be installed on the computer opening the file', onclick: () => { setFamily(k); closePop(); } }); it.style.fontFamily = FONT_STACK[k]; if (l.includes('✦')) it.append(el('em', { textContent: ' ✦' })); return it; }));
    openPop(e.currentTarget, list);
  }, 'tb-font');
  const sizeLabel = el('span', { class: 'tb-size' });
  // Text colour: a full palette (10 hues in 6 shades, plus greys), recent colours and any colour via the picker.
  const PALETTE_HUES = [['#e53935', 'red'], ['#f4511e', 'orange'], ['#fb8c00', 'amber'], ['#fdd835', 'yellow'], ['#7cb342', 'light green'], ['#2e7d32', 'green'], ['#00897b', 'teal'], ['#039be5', 'sky blue'], ['#3949ab', 'indigo'], ['#8e24aa', 'purple']];
  const mixHex = (a, b, t) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
  const TEXT_PALETTE = [
    ['#000000', '#222222', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#e0e0e0', '#f3f3f3', '#ffffff'],
    ...[0.75, 0.5, 0.25].map((t) => PALETTE_HUES.map(([c]) => mixHex(c, '#ffffff', t))),
    PALETTE_HUES.map(([c]) => c),
    ...[0.25, 0.5].map((t) => PALETTE_HUES.map(([c]) => mixHex(c, '#000000', t))),
  ];
  const RECENT_TEXT = 'scicanvas:recentTextColours';
  const recentText = () => { try { return JSON.parse(localStorage.getItem(RECENT_TEXT)) || []; } catch { return []; } };
  const useColour = (c) => { setColour(c); try { localStorage.setItem(RECENT_TEXT, JSON.stringify([c, ...recentText().filter((x) => x !== c)].slice(0, 10))); } catch { /* storage unavailable */ } };
  const colourBtn = b('<span class="tb-a">A</span>', 'Text colour (selected words, or the whole text)', (e) => {
    if (RE()) RichEdit.remember();
    const sw = (c) => el('button', { class: 'tc-sw', style: `background:${c}`, title: c, onclick: () => { useColour(c); closePop(); } });
    const rec = recentText();
    const custom = el('input', { type: 'color', value: '#e8743b', class: 'tc-custom-in', oninput: (ev) => useColour(ev.target.value) });
    openPop(e.currentTarget, el('div', { class: 'tc-pop' },
      ...TEXT_PALETTE.map((row) => el('div', { class: 'tc-row' }, ...row.map(sw))),
      rec.length ? el('div', { class: 'tc-label', textContent: 'Recent' }) : null,
      rec.length ? el('div', { class: 'tc-row' }, ...rec.map(sw)) : null,
      el('div', { class: 'tc-foot' }, el('label', { class: 'tc-more' }, custom, el('span', { textContent: 'More colours…' })))));
  });
  const symBtn = b('Ω', 'Greek letters and symbols', (e) => openPop(e.currentTarget, el('div', { class: 'symgrid' }, ...SYMBOLS.map((s) => el('button', { textContent: s, onclick: () => { wrapSelection(s, '', ''); const t = ta(); t.setSelectionRange(t.selectionEnd, t.selectionEnd); } })))));
  const boldBtn = b('<b>B</b>', 'Bold (⌘B)', () => format('bold')), italBtn = b('<i>I</i>', 'Italic', () => format('italic'));
  const undBtn = b('<u>U</u>', 'Underline (⌘U)', () => format('underline')), strBtn = b('<s>S</s>', 'Strikethrough', () => format('strike'));
  bar.append(fontBtn, b('−', 'Smaller', () => setSize(-1)), sizeLabel, b('+', 'Larger', () => setSize(1)), el('span', { class: 'tb-sep' }),
    boldBtn, italBtn, undBtn, strBtn, el('span', { class: 'tb-sep' }),
    b('x<sup>2</sup>', 'Superscript (selected text, e.g. Ca2+)', () => wrapSelection('^{', '}', '')), b('x<sub>2</sub>', 'Subscript (selected text, e.g. CO2)', () => wrapSelection('_{', '}', '')), el('span', { class: 'tb-sep' }),
    colourBtn, symBtn, b('⌫', 'Clear formatting (selection, or all)', clearFormatting), pop);
  function syncBar() {
    if (!isEditing()) return;
    const { o, key } = editing, fam = o[key === 'text' ? 'family' : 'labelFamily'] || 'sans';
    fontBtn.textContent = (FONT_NAMES.find(([k]) => k === fam) || [null, 'Helvetica'])[1].replace(' ✦', '').replace(' (default)', '');
    fontBtn.style.fontFamily = FONT_STACK[fam] || '';
    sizeLabel.textContent = Math.round(o[sizeKey()] || (o.type === 'connector' ? 13 : 16));
    boldBtn.classList.toggle('on', !!(key === 'text' ? o.bold : o.labelBold)); italBtn.classList.toggle('on', !!(key === 'text' ? o.italic : o.labelItalic));
    undBtn.classList.toggle('on', key === 'text' && !!o.underline); strBtn.classList.toggle('on', key === 'text' && !!o.strike);
  }
  function positionBar() {
    if (!isEditing()) return;
    const r = (RE() ? $('#richEditor') : ta()).getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const top = r.top - sr.top - bar.offsetHeight - 8;
    bar.style.left = Math.max(6, Math.min(sr.width - bar.offsetWidth - 6, r.left - sr.left)) + 'px';
    bar.style.top = (top < 6 ? r.bottom - sr.top + 8 : top) + 'px';
  }
  new MutationObserver((muts) => {
    // While editing on the canvas the markup box is only moved or resized: keep any open menu (e.g. colours).
    if (RE() && muts.every((m) => m.attributeName === 'style')) { requestAnimationFrame(positionBar); return; }
    const on = !ta().classList.contains('hidden') && typeof editing !== 'undefined' && editing;
    bar.classList.toggle('hidden', !on); closePop();
    if (on) { syncBar(); requestAnimationFrame(positionBar); }
  }).observe(ta(), { attributes: true, attributeFilter: ['class', 'style'] });
  ta().addEventListener('input', () => requestAnimationFrame(positionBar));
  // Keyboard shortcuts while typing.
  ta().addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || !isEditing()) return;
    const k = e.key.toLowerCase();
    // ⌘I and ⌘= belong to menu items (Import Image, Zoom In), so only ⌘B and ⌘U are taken here.
    if (k === 'b' || k === 'u') { e.preventDefault(); e.stopPropagation(); format(k === 'b' ? 'bold' : 'underline'); }
  }, true);

  // ---------- Per-word buttons in Properties (next to Colour / B / I) ----------
  if (typeof wordStyleRow === 'function') {
    const prevRow = wordStyleRow;
    wordStyleRow = function (o, key) {
      const r = prevRow(o, key), row1 = r.querySelector('.btnrow');
      const keep = (x) => { x.addEventListener('mousedown', (e) => e.preventDefault()); return x; };
      const wrapWords = (pre, post) => {
        const s = wordSel;
        if (!s || s.id !== o.id || s.key !== key || s.end <= s.start) { toast('Select some words in the text first'); return; }
        checkpoint();
        const t = o[key] || '';
        o[key] = t.slice(0, s.start) + pre + t.slice(s.start, s.end) + post + t.slice(s.end);
        wordSel = null; postEdit(o); render({ props: true });
      };
      if (row1) row1.append(keep(btn('U', () => wrapWords('{u|', '}'))), keep(btn('S̶', () => wrapWords('{s|', '}'))), keep(btn('x²', () => wrapWords('^{', '}'))), keep(btn('x₂', () => wrapWords('_{', '}'))));
      return r;
    };
  }
})();
