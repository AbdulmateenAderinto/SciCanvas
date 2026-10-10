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
    { test: (s) => same(s, ['', 'auto']), pic: (v) => line(v === 'auto' ? '<rect x="26" y="4" width="12" height="14" rx="2" fill="#e8eef8" stroke="#8a9bb0"/><path d="M6 11 H18 V20 H46 V11 H58" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round"/>' : '<rect x="26" y="4" width="12" height="14" rx="2" fill="#e8eef8" stroke="#8a9bb0"/><line x1="6" y1="11" x2="58" y2="11" stroke="#333" stroke-width="2"/>') },
    { test: (s) => has(s, ['membrane', 'dna', 'actin', 'vesicles']) && vals(s).length <= 14, pic: brushPic, wide: true },
  ];
  let pop = null;
  const close = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('mousedown', (e) => { if (pop && !e.target.closest('.pp-pop') && !e.target.closest('.pp-btn')) close(); }, true);
  function picturise(sel, kind) {
    sel.style.display = 'none';
    const b = document.createElement('button');
    b.className = 'pp-btn' + (kind.compact ? ' compact' : '');
    b.type = 'button';
    const show = () => { const opt = sel.options[sel.selectedIndex]; b.innerHTML = kind.pic(sel.value, sel) + (kind.compact ? '' : '<span class="pp-caret">▾</span>'); b.title = `${sel.title ? sel.title + ': ' : ''}${opt ? opt.textContent : ''}`; };
    sel.addEventListener('change', show); // kept in step when something else changes the value
    sel._ppShow = show;
    show();
    b.addEventListener('click', (e) => {
      e.preventDefault();
      if (pop && pop._for === sel) { close(); return; }
      close();
      pop = document.createElement('div');
      pop.className = 'pp-pop' + (kind.wide ? ' wide' : '') + (kind.popClass ? ' ' + kind.popClass : '');
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
      if (kind.compact) { // toolbar: open to the right of the button
        pop.style.left = (r.right + 6) + 'px';
        pop.style.top = Math.max(4, Math.min(r.top - 6, innerHeight - pr.height - 8)) + 'px';
      } else {
        pop.style.left = Math.max(4, Math.min(r.left, innerWidth - pr.width - 8)) + 'px';
        pop.style.top = (r.bottom + pr.height + 6 > innerHeight ? Math.max(4, r.top - pr.height - 4) : r.bottom + 4) + 'px';
      }
    });
    sel.after(b);
  }
  // The toolbar's own option lists (shape tool, pencil mode, brush path) are 34 px wide: pictures read better there.
  const icon = (d) => `<svg viewBox="0 0 24 24" width="24" height="24">${d}</svg>`;
  const TOOLBAR = {
    shapeKind: { pic: (v) => (globalThis.ShapeLib ? ShapeLib.shapeThumb({ kind: v, w: 60, h: 50 }) : v), compact: true, popClass: 'shapes' },
    drawMode: { pic: (v) => icon({ free: '<path d="M3 15c3-8 6 4 9-3s5 3 9-5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>', shape: '<path d="M4 12c0-5 6-8 10-6s7 2 6 7-7 7-11 5-5-2-5-6z" fill="#e8eef8" stroke="#4a6fae" stroke-width="1.5"/>', protein: '<path d="M4 12c0-5 6-8 10-6s7 2 6 7-7 7-11 5-5-2-5-6z" fill="#9fc0e8" stroke="#5b86bd" stroke-width="1.2"/><ellipse cx="9.5" cy="9" rx="3.5" ry="2" fill="#fff" opacity=".55"/>' }[v] || ''), compact: true },
    brushMode: { pic: (v) => icon({ free: '<path d="M3 16c3-9 6 3 9-4s5 2 9-6" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>', line: '<line x1="3" y1="19" x2="21" y2="5" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>', arc: '<path d="M3 18 Q12 0 21 18" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>', ellipse: '<ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="#333" stroke-width="1.8"/>' }[v] || ''), compact: true },
  };
  const setupToolbar = () => {
    for (const [id, kind] of Object.entries(TOOLBAR)) {
      const sel = document.getElementById(id);
      if (sel && sel._ppShow) { sel._ppShow(); continue; }
      if (!sel || sel.dataset.pp || !sel.options.length) continue;
      sel.dataset.pp = '1';
      picturise(sel, kind);
    }
  };
  setTimeout(setupToolbar, 0);
  if (typeof setTool === 'function') { const prevTool = setTool; setTool = function (...a) { const r = prevTool.apply(this, a); setupToolbar(); return r; }; }

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
