// Picture pickers in Properties (v1.3): line ends, path shape, dash pattern, line style and brush type are chosen from
// previews instead of text lists. Each picker drives the original <select> (it sets the value and fires "change"),
// so applying a choice works exactly as before. Loaded after linetools.js.
(() => {
  const line = (inner, w = 64, h = 22) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
  const headPic = (kind, start) => {
    const a = { x: 6, y: 11 }, b = { x: 58, y: 11 }, tip = start ? a : b, from = start ? b : a;
    const inset = typeof HEAD_INSET !== 'undefined' && HEAD_INSET[kind] ? headScale(2, 1) * HEAD_INSET[kind] : 0;
    const end = { x: tip.x + (from.x > tip.x ? inset : -inset), y: 11 };
    return line(`<line x1="${from.x}" y1="11" x2="${end.x}" y2="11" stroke="#333" stroke-width="2" stroke-linecap="round"/>${kind === 'none' ? '' : arrowHead(kind, tip, from, '#333', 2, 1)}`);
  };
  const pathPic = (v) => line(v === 'curved' ? '<path d="M6 17 Q32 -3 58 17" fill="none" stroke="#333" stroke-width="2"/>' : v === 'elbow' ? '<path d="M6 17 H32 V5 H58" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round"/>' : '<line x1="6" y1="11" x2="58" y2="11" stroke="#333" stroke-width="2"/>');
  const dashPic = (v) => line(`<line x1="6" y1="11" x2="58" y2="11" stroke="#333" stroke-width="2.4"${dashAttr({ dashStyle: v }, 2.4) || ' stroke-linecap="round"'}/>`);
  const stylePic = (v) => {
    if (!v) return dashPic('solid');
    const o = { id: 'pp', type: 'connector', from: { x: 6, y: 11 }, to: { x: 58, y: 11 }, head: 'none', tail: 'none', style: 'straight', width: 2, color: '#333', lineStyle: v };
    return line(connectorSvg(o, [o], true));
  };
  const brushPic = (v) => (globalThis.VisualMenu && VisualMenu.brushThumb ? VisualMenu.brushThumb(v).replace('<svg ', '<svg width="72" height="30" ') : v);
  const vals = (sel) => [...sel.options].map((x) => x.value);
  const has = (sel, want) => { const o = vals(sel); return want.every((v) => o.includes(v)); };
  const same = (sel, want) => has(sel, want) && vals(sel).length === want.length;
  const KINDS = [
    { test: (s) => has(s, ['arrow', 'stealth', 'bar', 'dot', 'none']), pic: (v, s) => headPic(v, s.dataset.ppStart === '1') },
    { test: (s) => same(s, ['straight', 'curved', 'elbow']), pic: pathPic },
    { test: (s) => same(s, ['solid', 'dashed', 'dotted', 'dashdot']), pic: dashPic },
    { test: (s) => same(s, ['', 'double', 'wavy', 'zigzag']), pic: stylePic },
    { test: (s) => has(s, ['membrane', 'dna', 'actin', 'vesicles']) && vals(s).length <= 14, pic: brushPic, wide: true },
  ];
  let pop = null;
  const close = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('mousedown', (e) => { if (pop && !e.target.closest('.pp-pop') && !e.target.closest('.pp-btn')) close(); }, true);
  function picturise(sel, kind) {
    sel.style.display = 'none';
    const b = document.createElement('button');
    b.className = 'pp-btn';
    b.type = 'button';
    const show = () => { const opt = sel.options[sel.selectedIndex]; b.innerHTML = kind.pic(sel.value, sel) + '<span class="pp-caret">▾</span>'; b.title = opt ? opt.textContent : ''; };
    show();
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (pop && pop._for === sel) { close(); return; }
      close();
      pop = document.createElement('div');
      pop.className = 'pp-pop' + (kind.wide ? ' wide' : '');
      pop._for = sel;
      for (const opt of sel.options) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'pp-tile' + (opt.value === sel.value ? ' on' : '');
        t.innerHTML = kind.pic(opt.value, sel) + `<span>${opt.textContent.replace(/^[^\w(]+\s*/, '')}</span>`;
        t.title = opt.textContent;
        t.addEventListener('click', () => { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); show(); close(); });
        pop.append(t);
      }
      document.body.append(pop);
      const r = b.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      pop.style.left = Math.max(4, Math.min(r.left, innerWidth - pr.width - 8)) + 'px';
      pop.style.top = (r.bottom + pr.height + 6 > innerHeight ? Math.max(4, r.top - pr.height - 4) : r.bottom + 4) + 'px';
    });
    sel.after(b);
  }
  const prev = renderProps;
  renderProps = function () {
    close();
    prev();
    const P = document.querySelector('#props');
    if (!P) return;
    for (const sel of P.querySelectorAll('select')) {
      if (sel.dataset.pp) continue;
      const kind = KINDS.find((k) => { try { return k.test(sel); } catch { return false; } });
      if (!kind) continue;
      sel.dataset.pp = '1';
      const label = sel.closest('.row') && sel.closest('.row').querySelector('label');
      if (label && /^(Start|Tail)/i.test(label.textContent.trim())) sel.dataset.ppStart = '1';
      picturise(sel, kind);
    }
  };
})();
