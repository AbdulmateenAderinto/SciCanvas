// Words under the icons in the left tool column, so nobody has to guess what a tool does. The short name comes from
// this list, or else from the tool's tooltip (the part before its shortcut or description); the tooltip keeps the
// full description. Runs once at start-up and again if tools are added later.
(() => {
  const SHORT = {
    select: 'Select', pan: 'Pan', text: 'Text', rect: 'Rectangle', ellipse: 'Ellipse', shape: 'Shapes', badge: 'Number',
    pencil: 'Pencil', pen: 'Pen', line: 'Line', arrow: 'Arrow', airbrush: 'Shading', eraser: 'Eraser', table: 'Table',
    connector: 'Connect', comment: 'Comment',
    'brush:membrane': 'Membrane', 'brush:dna': 'DNA', 'brush:actin': 'Actin', 'brush:epithelium': 'Cell layer', 'brush:ubiquitin': 'Beads', 'brush:vesicles': 'Vesicles',
  };
  const fromTitle = (t) => String(t || '').split(/\s[(—–-]\s?|\s\(|…|:/)[0].replace(/\s+brush$/i, '').trim();
  function label() {
    for (const b of document.querySelectorAll('#tools button')) {
      if (b.querySelector(':scope > .tlabel') || !b.querySelector('svg')) continue;
      const key = b.dataset.tool ? b.dataset.tool + (b.dataset.kind ? ':' + b.dataset.kind : '') : '';
      const text = SHORT[key] || (b.dataset.tool && SHORT[b.dataset.tool] && !b.dataset.kind ? SHORT[b.dataset.tool] : '') || fromTitle(b.title || b.getAttribute('aria-label'));
      if (!text) continue;
      const s = document.createElement('span');
      s.className = 'tlabel';
      s.textContent = text;
      b.append(s);
      b.classList.add('labelled');
    }
  }
  label();
  const tools = document.getElementById('tools');
  if (tools) new MutationObserver(() => label()).observe(tools, { childList: true, subtree: true });
})();
