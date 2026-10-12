// Compare versions (v1.9): what changed between a saved version and the figure now. Version History › Compare shows
// the two side by side (saved version left, current right) with removed objects outlined red, added green and
// changed orange, and lists the changes in words (moved, resized, text changed, restyled).
(() => {
  const GEOM = ['x', 'y', 'w', 'h', 'rot'], SKIP = new Set(['id', 'w0', 'h0', 'thumb']);
  const flat = (list) => { const out = []; const walk = (l) => { for (const o of l || []) { out.push(o); if (o.type === 'group') walk(o.children); } }; walk(list); return out; };
  const label = (o) => String(o.name || (o.type === 'text' ? `“${String(o.text).replace(/\{[^|{}]*\||\}|[\^_]\{/g, '').slice(0, 30)}”` : '') || o.label || (typeof layerName === 'function' ? layerName(o) : o.type)).slice(0, 48);

  function diffPage(oldP, newP) {
    const a = new Map(flat(oldP ? oldP.objects : []).map((o) => [o.id, o])), b = new Map(flat(newP ? newP.objects : []).map((o) => [o.id, o]));
    const added = [], removed = [], changed = [];
    for (const [id, o] of b) if (!a.has(id)) added.push(o);
    for (const [id, o] of a) if (!b.has(id)) removed.push(o);
    for (const [id, nb] of b) {
      const na = a.get(id);
      if (!na) continue;
      const what = [];
      if (Math.abs((na.x || 0) - (nb.x || 0)) > 0.5 || Math.abs((na.y || 0) - (nb.y || 0)) > 0.5) what.push('moved');
      if (Math.abs((na.w || 0) - (nb.w || 0)) > 0.5 || Math.abs((na.h || 0) - (nb.h || 0)) > 0.5) what.push('resized');
      if ((na.rot || 0) !== (nb.rot || 0)) what.push('rotated');
      if (na.text !== nb.text || na.label !== nb.label) what.push('text changed');
      const style = Object.keys({ ...na, ...nb }).some((k) => !SKIP.has(k) && !GEOM.includes(k) && k !== 'text' && k !== 'label' && k !== 'children' && JSON.stringify(na[k]) !== JSON.stringify(nb[k]));
      if (style) what.push(na.type === 'chart' && JSON.stringify(na.cfg) !== JSON.stringify(nb.cfg) ? 'data or chart settings changed' : 'restyled');
      if (what.length) changed.push({ o: nb, old: na, what });
    }
    return { added, removed, changed };
  }
  function outlined(p, marks) {
    const list = flat(p.objects);
    const rects = marks.map(([o, colour]) => { const b = bounds(o, list); return `<rect x="${b.x - 4}" y="${b.y - 4}" width="${b.w + 8}" height="${b.h + 8}" rx="4" fill="${colour}" fill-opacity=".08" stroke="${colour}" stroke-width="${Math.max(2, p.width / 500)}" stroke-dasharray="${p.width / 160} ${p.width / 320}"/>`; }).join('');
    return pageSvgString(p).replace(/<\/svg>$/, rects + '</svg>');
  }
  function openVersionCompare(oldDoc, whenText) {
    const pages = Math.max(oldDoc.pages.length, state.doc.pages.length);
    let idx = Math.min(state.pageIndex, pages - 1);
    const body = el('div', { style: 'max-width:1200px' });
    const draw = () => {
      const oldP = oldDoc.pages[idx], newP = state.doc.pages[idx], d = diffPage(oldP, newP);
      const pane = (title, svgText) => el('div', { style: 'flex:1;min-width:0' }, el('div', { class: 'note', style: 'margin-bottom:4px;font-weight:600', textContent: title }),
        (() => { const box = el('div', { style: 'border:1px solid #c9d3e0;border-radius:8px;background:#fff;padding:6px' }); box.innerHTML = svgText ? svgText.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ') : '<div class="note">No such page</div>'; return box; })());
      const items = [...d.removed.map((o) => ['#d64545', `Removed ${label(o)}`]), ...d.added.map((o) => ['#2f8f47', `Added ${label(o)}`]), ...d.changed.map((c) => ['#e8843b', `${label(c.o)}: ${c.what.join(', ')}`])];
      body.innerHTML = '';
      if (pages > 1) body.append(el('div', { class: 'btnrow', style: 'margin-bottom:8px' }, ...Array.from({ length: pages }, (_, i) => btn(`Page ${i + 1}`, () => { idx = i; draw(); }, i === idx ? 'primary' : undefined))));
      body.append(el('div', { style: 'display:flex;gap:12px' },
        pane(`Saved ${whenText}`, oldP ? outlined(oldP, [...d.removed.map((o) => [o, '#d64545']), ...d.changed.map((c) => [c.old, '#e8843b'])]) : ''),
        pane('Now', newP ? outlined(newP, [...d.added.map((o) => [o, '#2f8f47']), ...d.changed.map((c) => [c.o, '#e8843b'])]) : '')));
      body.append(el('div', { style: 'margin-top:10px;max-height:180px;overflow:auto' }, items.length
        ? el('div', {}, el('div', { class: 'note', textContent: `${d.removed.length} removed · ${d.added.length} added · ${d.changed.length} changed` }), ...items.map(([c, t]) => el('div', { style: `border-left:4px solid ${c};padding:2px 8px;margin:3px 0`, textContent: t })))
        : el('div', { class: 'note', textContent: 'No differences on this page.' })));
    };
    draw();
    openModal('Compare with saved version', body);
  }
  Object.assign(globalThis, { openVersionCompare, diffPage });
})();
