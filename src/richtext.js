// Styling individual words: colour, bold or italic part of a text box or shape label.
// Stored as markup in the text itself ({#d64545|word}, {b|word}, {i|word}; see parseMarkup in render.js),
// so it survives copy / paste, templates and every export format.

let wordSel = null; // { id, key, start, end } — last text selection in the canvas editor or the properties box
document.addEventListener('selectionchange', () => {
  const a = document.activeElement;
  if (!a || (a.tagName !== 'TEXTAREA' && a.tagName !== 'INPUT') || a.selectionStart == null) return;
  let o, key;
  if (a.id === 'textEditor' && typeof editing !== 'undefined' && editing) ({ o, key } = editing);
  else if (a.closest('#props') && state.sel.length === 1) { o = byId(state.sel[0]); key = o && o.type === 'text' ? 'text' : 'label'; if (o && a.value !== (o[key] || '')) return; }
  if (!o) return;
  wordSel = { id: o.id, key, start: a.selectionStart, end: a.selectionEnd };
});

function styleSelectedWords(o, key, { color, bold, italic }) {
  const s = wordSel;
  if (!s || s.id !== o.id || s.key !== key || s.end <= s.start) { toast('Select some words in the text first (in the box above, or double-click the text on the canvas)'); return; }
  if (typeof editing !== 'undefined' && editing && editing.o === o) commitTextEdit();
  const t = o[key] || '';
  const flags = (bold ? 'b' : '') + (italic ? 'i' : '');
  checkpoint();
  o[key] = t.slice(0, s.start) + `{${flags}${color || ''}|` + t.slice(s.start, s.end) + '}' + t.slice(s.end);
  wordSel = null;
  postEdit(o);
  render({ props: true });
}
function clearWordStyles(o, key) {
  checkpoint();
  o[key] = String(o[key] || '').replace(STYLE_SPAN, (m, a, c, b, inner) => (a || b || c ? inner : m));
  postEdit(o);
  render({ props: true });
}
let lastWordColor = '#d64545';
function wordStyleRow(o, key) {
  const col = el('input', { type: 'color', value: lastWordColor, title: 'Colour for the selected words', oninput: (e) => { lastWordColor = e.target.value; } });
  // Keep the text selection when clicking these buttons.
  const keep = (b) => { b.addEventListener('mousedown', (e) => e.preventDefault()); return b; };
  return el('div', { style: 'margin:4px 0 8px' },
    el('div', { class: 'btnrow', style: 'align-items:center' }, el('span', { class: 'note', textContent: 'Selected words:' }), col,
      keep(btn('Colour', () => styleSelectedWords(o, key, { color: col.value }))),
      keep(btn('B', () => styleSelectedWords(o, key, { bold: true }))),
      keep(btn('I', () => styleSelectedWords(o, key, { italic: true }))),
      /\{[bi#]/.test(o[key] || '') ? btn('Clear', () => clearWordStyles(o, key)) : null),
    el('div', { class: 'note', textContent: 'Select words in the box above (or on the canvas), then colour or bold just those.' }));
}
