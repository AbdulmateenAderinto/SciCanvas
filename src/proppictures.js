// Picture pickers in Properties (v1.3): line ends, path shape, dash pattern, line style and brush type are chosen from
// previews instead of text lists. Each picker drives the original <select> (it sets the value and fires "change"),
// so applying a choice works exactly as before. Loaded after linetools.js.
(() => {
  const icon = (d) => `<svg viewBox="0 0 24 24" width="24" height="24">${d}</svg>`;
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
    { test: (s) => has(s, ['triangle', 'diamond', 'hexagon', 'star']) && s.id !== 'shapeKind', pic: (v) => (globalThis.ShapeLib ? ShapeLib.shapeThumb({ kind: v, w: 60, h: 50 }).replace('<svg ', '<svg width="34" height="34" ') : v), popClass: 'shapes' },
    { test: (s) => has(s, ['membrane', 'dna', 'actin', 'vesicles']) && vals(s).length <= 14, pic: brushPic, wide: true },
  ];
  // Live previews: a small sample object drawn with the option applied (shading, pattern, warp, shadow, fade, taper).
  let pv = 0;
  const objPic = (o, w = 64, h = 40) => {
    o.id = `pv${pv++}`;
    let inner = '';
    try { inner = renderObjectString(o, [o], true); } catch (e) { inner = ''; }
    return `<svg viewBox="${-(w - o.w) / 2} ${-(h - o.h) / 2} ${w} ${h}" width="${w}" height="${h}">${inner}</svg>`;
  };
  const sample = {
    shade: (v) => objPic(Make.ellipse(12, 0, 40, 40, { fill: '#6fa0e0', stroke: '#3d6db0', shade: v }), 64, 44),
    pattern: (v) => objPic(Make.rect(0, 0, 54, 34, { fill: '#e8eef8', stroke: '#4a6fae', radius: 4, ...(v ? { pattern: { kind: v, color: '#4a6fae' } } : {}) })),
    warp: (v) => (['free', 'perspective'].includes(v) ? line('<path d="M14 6 L52 3 L58 19 L8 17 Z" fill="#9fc0e8" stroke="#4a6fae"/>') : objPic(Make.rect(0, 0, 54, 26, { fill: '#9fc0e8', stroke: '#4a6fae', radius: 3, pattern: { kind: 'grid', color: '#4a6fae' }, ...(v ? { warp: { kind: v, amount: 0.6 } } : {}) }))),
    shadow: (v) => objPic(Make.rect(0, 0, 44, 28, { fill: '#ffffff', stroke: '#4a6fae', radius: 4, ...(v ? { shadow: v } : {}) })),
    fade: (v) => objPic(Make.rect(0, 0, 56, 30, { fill: '#3b6fd6', stroke: 'none', radius: 3, ...(v ? { fade: v } : {}) })),
    profile: (v) => objPic({ type: 'path', x: 0, y: 0, w: 52, h: 14, rot: 0, closed: false, stroke: '#33475b', strokeWidth: 7, nodes: [{ x: 0, y: 7 }, { x: 52, y: 7 }], ...(v ? { widthProfile: v } : {}) }, 64, 30),
  };
  const vlist = (arr) => arr.map(([v]) => v);
  const capPic = (v) => line(`<line x1="16" y1="11" x2="48" y2="11" stroke="#33475b" stroke-width="9" stroke-linecap="${v}"/><line x1="16" y1="11" x2="48" y2="11" stroke="#9fc0e8" stroke-width="1"/>`);
  const alignPic = (v) => icon(['M4 6h16', v === 'left' ? 'M4 10h10' : v === 'right' ? 'M10 10h10' : v === 'justify' ? 'M4 10h16' : 'M7 10h10', 'M4 14h16', v === 'left' ? 'M4 18h12' : v === 'right' ? 'M8 18h12' : v === 'justify' ? 'M4 18h16' : 'M6 18h12'].map((d) => `<path d="${d}" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>`).join(''));
  const listPic = (v) => icon(v === 'none' ? '<path d="M4 7h16M4 12h16M4 17h12" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>' : (v === 'bullet' ? '<circle cx="5" cy="7" r="1.6" fill="#333"/><circle cx="5" cy="12" r="1.6" fill="#333"/><circle cx="5" cy="17" r="1.6" fill="#333"/>' : '<text x="2.5" y="9" font-size="6.5" font-family="sans-serif">1</text><text x="2.5" y="14" font-size="6.5" font-family="sans-serif">2</text><text x="2.5" y="19" font-size="6.5" font-family="sans-serif">3</text>') + '<path d="M9 7h11M9 12h11M9 17h9" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>');
  const clipPic = (v) => icon(v === 'none' ? '<rect x="3" y="5" width="18" height="14" fill="#9fc0e8"/><path d="M3 15l5-4 4 3 4-5 5 6v4H3z" fill="#4a6fae"/>' : v === 'ellipse' ? '<ellipse cx="12" cy="12" rx="9" ry="8" fill="#9fc0e8" stroke="#4a6fae"/>' : v === 'round' ? '<rect x="3" y="5" width="18" height="14" rx="4" fill="#9fc0e8" stroke="#4a6fae"/>' : '<rect x="3" y="5" width="18" height="14" fill="#9fc0e8" stroke="#4a6fae"/>');
  const fontPic = (v) => `<svg viewBox="0 0 64 26" width="64" height="26"><text x="32" y="19" text-anchor="middle" font-size="17" fill="#222" style="font-family:${String((typeof FONT_STACK !== 'undefined' && FONT_STACK[v]) || 'sans-serif').replace(/"/g, "'")}">Aa Bb</text></svg>`;
  KINDS.push(
    { test: (s) => has(s, ['sans', 'arial', 'times', 'serif']) && typeof FONT_STACK !== 'undefined', pic: fontPic, popClass: 'four fonts' },
    { test: (s) => typeof SHADES !== 'undefined' && same(s, vlist(SHADES)), pic: sample.shade },
    { test: (s) => typeof PATTERNS !== 'undefined' && same(s, vlist(PATTERNS)), pic: sample.pattern, popClass: 'four' },
    { test: (s) => has(s, ['arc', 'arch', 'bulge', 'flag']), pic: sample.warp, popClass: 'four' },
    { test: (s) => same(s, ['', 'soft', 'strong']), pic: sample.shadow },
    { test: (s) => typeof FADES !== 'undefined' && same(s, vlist(FADES)), pic: sample.fade },
    { test: (s) => typeof WIDTH_PRESETS !== 'undefined' && same(s, vlist(WIDTH_PRESETS)), pic: sample.profile },
    { test: (s) => same(s, ['round', 'butt', 'square']), pic: capPic },
    { test: (s) => same(s, ['left', 'center', 'right']) || same(s, ['left', 'center', 'right', 'justify']), pic: alignPic, compact: false, small: true },
    { test: (s) => same(s, ['none', 'bullet', 'number']), pic: listPic, small: true },
    { test: (s) => same(s, ['none', 'ellipse', 'round', 'rect']), pic: clipPic, small: true },
  );
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

  // Library hover preview: rest on an icon for a moment to see it large, with its name and licence.
  const grid = document.getElementById('icongrid');
  if (grid) {
    const tip = document.createElement('div');
    tip.className = 'icon-preview hidden';
    document.body.append(tip);
    let timer = null, cur = null;
    const hide = () => { clearTimeout(timer); tip.classList.add('hidden'); cur = null; };
    grid.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.icon-cell');
      if (!cell || cell === cur) return;
      hide(); cur = cell;
      timer = setTimeout(() => {
        const pic = cell.querySelector('svg, img, .pp-thumb');
        if (!pic) return;
        const [name, ...rest] = (cell.title || '').split(' — ');
        tip.innerHTML = '';
        const big = pic.cloneNode(true);
        big.removeAttribute('loading');
        big.classList.add('big');
        tip.append(big);
        const cap = document.createElement('div'); cap.className = 'cap'; cap.textContent = name; tip.append(cap);
        if (rest.length) { const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = rest.join(' — '); tip.append(sub); }
        tip.classList.remove('hidden');
        const r = cell.getBoundingClientRect(), tr = tip.getBoundingClientRect();
        tip.style.left = Math.min(innerWidth - tr.width - 8, grid.getBoundingClientRect().right + 12) + 'px'; // beside the library, not over it
        tip.style.top = Math.max(8, Math.min(innerHeight - tr.height - 8, r.top + r.height / 2 - tr.height / 2)) + 'px';
      }, 450);
    });
    grid.addEventListener('mouseleave', hide);
    grid.addEventListener('mousedown', hide);
    grid.addEventListener('dragstart', hide);
    grid.addEventListener('scroll', hide, { passive: true });
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
