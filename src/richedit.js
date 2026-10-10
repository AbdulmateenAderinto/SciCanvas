// Edit text right on the canvas, looking exactly as it will (v1.5).
//
// Double-clicking text (or a shape's / line's label) used to open a white box showing the stored markup, e.g.
// "{#e8743b|Happy …}", in a different font. Now the text itself becomes editable in place: same font, size, colour,
// weight, alignment and rotation, with coloured / bold / italic / underlined / struck words, superscripts and
// subscripts shown as they are, on a transparent background, while the drawn copy is hidden.
//
// How it fits the existing editor: #textEditor (the textarea in app.js) still holds the text as markup and keeps doing
// what it did (undo, live resize, the formatting bar, Properties); this contenteditable layer sits on top, and every
// change is converted back to markup and sent to it as an "input" event. The formatting bar (textfmt.js) calls
// RichEdit for selections, so B / I / U / S / x² / x₂ / colour / symbols act on the selected words here.
(() => {
  const ta = document.getElementById('textEditor'), stage = document.getElementById('stage');
  if (!ta || !stage) return;
  const rich = document.createElement('div');
  rich.id = 'richEditor';
  rich.className = 'hidden';
  rich.contentEditable = 'true';
  rich.spellcheck = true;
  stage.append(rich);
  const hideStyle = document.createElement('style');
  document.head.append(hideStyle);
  let active = false, guard = 0, base = { color: '#222222', bold: false, italic: false };

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hex = (c) => {
    if (!c) return null;
    const m = String(c).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if (m) return '#' + [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('');
    const h = String(c).trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(h)) return '#' + h.slice(1).split('').map((x) => x + x).join('');
    return /^#[0-9a-f]{6}$/.test(h) ? h : null;
  };

  // ---------- markup → HTML ----------
  function toHtml(markup) {
    const lines = splitSpanLines(String(markup || '')).split('\n');
    return lines.map((line) => parseMarkup(line).map((g) => {
      let h = esc(g.t);
      if (g.s > 0) h = `<sup>${h}</sup>`; else if (g.s < 0) h = `<sub>${h}</sub>`;
      if (g.strike) h = `<s>${h}</s>`;
      if (g.underline) h = `<u>${h}</u>`;
      if (g.italic) h = `<i>${h}</i>`;
      if (g.bold) h = `<b>${h}</b>`;
      if (g.color) h = `<font color="${g.color}">${h}</font>`;
      return h;
    }).join('')).join('<br>') + (lines[lines.length - 1] === '' ? '<br>' : '');
  }

  // ---------- HTML → markup ----------
  function segments(root) {
    const out = [];
    const walk = (node, st) => {
      if (node.nodeType === 3) { const t = node.data.replace(/\u200b/g, '').replace(/\u00a0/g, ' '); if (t) out.push({ t, ...st }); return; }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === 'BR') { out.push({ t: '\n', ...st }); return; }
      const s = { ...st }, cs = node.style || {};
      if (tag === 'B' || tag === 'STRONG') s.bold = true;
      if (tag === 'I' || tag === 'EM') s.italic = true;
      if (tag === 'U') s.underline = true;
      if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') s.strike = true;
      if (tag === 'SUP') s.s = 1;
      if (tag === 'SUB') s.s = -1;
      if (tag === 'FONT' && node.getAttribute('color')) s.color = hex(node.getAttribute('color')) || s.color;
      if (cs.color) s.color = hex(cs.color) || s.color;
      if (cs.fontWeight) s.bold = cs.fontWeight === 'bold' || +cs.fontWeight >= 600;
      if (cs.fontStyle) s.italic = cs.fontStyle === 'italic';
      const td = cs.textDecorationLine || cs.textDecoration || '';
      if (td.includes('underline')) s.underline = true;
      if (td.includes('line-through')) s.strike = true;
      if (cs.verticalAlign === 'super') s.s = 1; else if (cs.verticalAlign === 'sub') s.s = -1;
      const block = tag === 'DIV' || tag === 'P';
      if (block && out.length && out[out.length - 1].t !== '\n') out.push({ t: '\n', ...st });
      for (const c of node.childNodes) walk(c, s);
    };
    for (const c of root.childNodes) walk(c, {});
    return out;
  }
  function toMarkup(root) {
    const segs = segments(root);
    // The browser keeps an extra line break at the very end for the caret; it isn't text.
    if (root.lastChild && root.lastChild.nodeName === 'BR' && segs.length && segs[segs.length - 1].t === '\n') segs.pop();
    let out = '', run = null;
    const key = (g) => [g.bold && !base.bold ? 'b' : '', g.italic && !base.italic ? 'i' : '', g.underline && !base.underline ? 'u' : '', g.strike && !base.strike ? 's' : '', g.color && g.color !== base.color ? g.color : ''];
    const flush = () => {
      if (!run) return;
      const [b, i, u, s, c] = run.k, flags = b + i + u + s;
      out += flags || c ? `{${flags}${c}|${run.t}}` : run.t;
      run = null;
    };
    for (const g of segs) {
      for (const [n, piece] of g.t.split('\n').entries()) {
        if (n > 0) { flush(); out += '\n'; }
        if (!piece) continue;
        const k = key(g), txt = g.s ? `${g.s > 0 ? '^' : '_'}{${piece}}` : piece;
        if (run && run.k.join() === k.join()) run.t += txt; else { flush(); run = { k, t: txt }; }
      }
    }
    flush();
    return out;
  }

  // ---------- Showing the editor over the object ----------
  const isTable = (key) => String(key).startsWith('__cell_');
  function place() {
    if (!active || !editing) return;
    const { o, key } = editing, z = state.zoom, lab = key !== 'text';
    const fs = (lab ? o.labelSize || (o.type === 'connector' ? 13 : 16) : o.fontSize || 16) * z;
    const fam = lab ? o.labelFamily : o.family;
    base = { color: hex(lab ? o.labelColor || '#222222' : o.color || '#222222') || '#222222', bold: !!(lab ? o.labelBold : o.bold), italic: !!(lab ? o.labelItalic : o.italic), underline: !lab && !!o.underline, strike: !lab && !!o.strike };
    const lh = !lab && o.lineHeight ? o.lineHeight : 1.25;
    const st = rich.style;
    st.fontFamily = FONT_STACK[fam] || FONT_STACK.sans;
    st.fontSize = fs + 'px'; st.lineHeight = lh;
    st.color = base.color; st.fontWeight = base.bold ? '700' : '400'; st.fontStyle = base.italic ? 'italic' : 'normal';
    st.textDecoration = [base.underline && 'underline', base.strike && 'line-through'].filter(Boolean).join(' ') || 'none';
    st.textAlign = lab ? 'center' : o.align === 'justify' ? 'justify' : o.align || 'left';
    st.letterSpacing = !lab && o.tracking ? (o.tracking / 1000) + 'em' : '';
    const sr = stage.getBoundingClientRect(), vr = svg.getBoundingClientRect(), ox = vr.left - sr.left + state.panX, oy = vr.top - sr.top + state.panY;
    let left, top, width, minH, rot = o.rot || 0, wrap = false;
    if (o.type === 'connector') {
      const [a, b] = connectorEnds(o, objs());
      width = 200; left = ((a.x + b.x) / 2) * z + ox - width / 2; top = ((a.y + b.y) / 2) * z + oy - fs * 0.75; rot = 0; minH = fs * lh;
    } else if (lab) {
      width = o.w * z; left = o.x * z + ox; minH = fs * lh;
      const lines = String(o[key] || '').split('\n').length;
      top = (o.y + o.h / 2) * z + oy - (lines * fs * lh) / 2; wrap = true;
    } else {
      wrap = o.boxW > 0;
      width = wrap ? o.boxW * z : null; left = o.x * z + ox; top = o.y * z + oy; minH = fs * lh;
    }
    st.left = left + 'px'; st.top = top + 'px';
    st.width = width ? width + 'px' : 'auto';
    st.minWidth = (o.type === 'text' && !wrap ? Math.max(24, o.w * z) : 0) + 'px';
    st.minHeight = minH + 'px';
    st.whiteSpace = wrap ? 'pre-wrap' : 'pre';
    st.padding = o.type === 'text' ? `0 ${2 * z}px` : '0';
    st.transformOrigin = o.type === 'text' ? `${(o.w * z) / 2}px ${(o.h * z) / 2}px` : `${(o.w * z) / 2}px ${(o.h * z) / 2 - (top - (o.y * z + oy))}px`;
    st.transform = rot ? `rotate(${rot}deg)` : '';
  }
  function show() {
    const { o } = editing;
    rich.innerHTML = toHtml(ta.value);
    active = true;
    rich.classList.remove('hidden');
    ta.classList.add('ta-model'); // still "open" for the formatting bar, but invisible
    hideStyle.textContent = `#scene > g[data-id="${o.id}"] text { visibility: hidden; }`;
    place();
    guard++;
    try {
      rich.focus();
      const r = document.createRange(); r.selectNodeContents(rich);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    } finally { guard--; }
  }
  function hide() {
    active = false;
    rich.classList.add('hidden');
    rich.innerHTML = '';
    ta.classList.remove('ta-model');
    hideStyle.textContent = '';
  }
  // Send the editor's content to the markup box, which updates the object (size, undo, Properties).
  function sync() {
    if (!active) return;
    const m = toMarkup(rich);
    if (m !== ta.value) { ta.value = m; ta.dispatchEvent(new Event('input')); }
    place();
  }

  // ---------- Hook into the existing editor ----------
  const prevEdit = editText;
  editText = function (o, key, isNew) {
    guard++;
    try { prevEdit(o, key, isNew); } finally { guard--; }
    if (o.type === 'table' || isTable(key) || (o.type === 'text' && o.curve)) return; // tables and curved text keep the plain box
    show();
  };
  const prevCommit = commitTextEdit;
  commitTextEdit = function () {
    if (guard) return; // focus moving between the two editors isn't the end of editing
    if (active) { const m = toMarkup(rich); if (m !== ta.value) ta.value = m; }
    hide();
    prevCommit();
  };
  // Typing shortcuts (design6.js): \alpha → α, -> → →, +/- → ±… when the space after them is typed.
  function shortcuts(e) {
    if (e.inputType !== 'insertText' || e.data !== ' ' || typeof applyTypeShortcuts !== 'function') return;
    if (typeof state !== 'undefined' && state.view && state.view.typeShortcuts === false) return;
    const s = getSelection(), n = s.anchorNode;
    if (!n || n.nodeType !== 3 || !s.isCollapsed) return;
    const text = n.data.replace(/\u00a0/g, ' '), r = applyTypeShortcuts(text, s.anchorOffset);
    if (!r) return;
    n.data = r.text;
    s.collapse(n, Math.min(r.caret, n.data.length));
  }
  rich.addEventListener('input', (e) => { shortcuts(e); sync(); });
  rich.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); commitTextEdit(); return; }
    if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
    if (e.metaKey || e.ctrlKey) {
      const k = e.key.toLowerCase(), cmd = { b: 'bold', u: 'underline', i: 'italic' }[k];
      if (cmd) { e.preventDefault(); format(cmd); }
    }
  });
  rich.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData && e.clipboardData.getData('text/plain')) || ''); });
  rich.addEventListener('drop', (e) => e.preventDefault());
  // Leaving the text (not for the formatting bar, a colour picker or the symbols) finishes editing.
  rich.addEventListener('blur', () => setTimeout(() => {
    if (!active) return;
    const a = document.activeElement;
    if (a === rich || (a && a.closest && a.closest('#textbar, #cpick, #pop, .textbar-pop'))) return;
    if (a === ta) return;
    commitTextEdit();
  }, 0));
  // Keep the editor over the object while zooming or scrolling.
  const prevViewport = applyViewport;
  applyViewport = function (...args) { const r = prevViewport.apply(this, args); if (active) place(); return r; };

  // ---------- Formatting the selection (called by textfmt.js) ----------
  let saved = null;
  const sel = () => getSelection();
  const inside = (r) => r && rich.contains(r.commonAncestorContainer);
  function remember() { const s = sel(); if (s.rangeCount && inside(s.getRangeAt(0))) saved = s.getRangeAt(0).cloneRange(); }
  function restore() {
    rich.focus();
    if (saved) { const s = sel(); s.removeAllRanges(); s.addRange(saved); }
  }
  document.addEventListener('selectionchange', () => { if (active) remember(); });
  const hasSelection = () => { const s = sel(); return !!(s.rangeCount && inside(s.getRangeAt(0)) && !s.isCollapsed) || !!(saved && !saved.collapsed); };
  function run(cmd, value) {
    restore();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand(cmd, false, value);
    remember();
    sync();
  }
  function format(prop) { run({ bold: 'bold', italic: 'italic', underline: 'underline', strike: 'strikeThrough' }[prop]); }
  // textfmt.js's wrapSelection(pre, post): style codes become the matching command; anything else is inserted text.
  function wrap(pre, post) {
    const m = /^\{([bius]*)(#[0-9a-fA-F]{3,8})?\|$/.exec(pre);
    if (m) { if (m[2]) run('foreColor', m[2]); for (const f of m[1]) format({ b: 'bold', i: 'italic', u: 'underline', s: 'strike' }[f]); return; }
    if (pre === '^{') return run('superscript');
    if (pre === '_{') return run('subscript');
    run('insertText', pre + (post || ''));
  }
  function clear() { run('removeFormat'); }
  function refresh() { if (active) { place(); sync(); } }
  globalThis.RichEdit = { active: () => active, hasSelection, wrap, format, colour: (c) => run('foreColor', c), clear, insert: (t) => run('insertText', t), refresh, toHtml, toMarkup, remember, restore };
})();
