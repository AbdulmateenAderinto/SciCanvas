// Design tools (part 6): typography (letter spacing, line height, paragraph spacing, text boxes with
// wrapping, columns, text wrap around objects, vertical alignment, small caps, numerals, symbol
// shortcuts), labels with leader lines that stay attached, graphic styles, selection and navigation
// (lasso, select behind, select same outline / style / font, zoom to selection, mini-map) and layout grids.

// ---------- Typography ----------
// Text properties: tracking (letter spacing, fraction of the font size), lineHeight (× font size),
// paraSpacing (px after each paragraph), boxW / boxH (fixed text box: words wrap to boxW), columns,
// gutter, valign ('top' | 'middle' | 'bottom'), wrapAround (flow around objects overlapping the box),
// smallCaps, numerals ('lining' | 'oldstyle' | 'tabular'), align can also be 'justify'.
const TYPE_KEYS = ['tracking', 'lineHeight', 'paraSpacing', 'boxW', 'boxH', 'columns', 'gutter', 'valign', 'wrapAround', 'smallCaps', 'numerals'];
const usesTypeset = (o) => o.type === 'text' && !o.curve && (o.boxW > 0 || o.tracking || (o.lineHeight && o.lineHeight !== 1.25) || o.paraSpacing || o.smallCaps || o.numerals || o.align === 'justify');
let _typeCtx;
function runWidth(t, fs, family, bold, italic, tracking, smallCaps) {
  if (!t) return 0;
  _typeCtx = _typeCtx || document.createElement('canvas').getContext('2d');
  _typeCtx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fs}px ${FONT_STACK[family] || FONT_STACK.sans}`;
  if ('fontVariantCaps' in _typeCtx) _typeCtx.fontVariantCaps = smallCaps ? 'small-caps' : 'normal';
  return _typeCtx.measureText(t).width + (tracking || 0) * fs * [...t].length;
}
// Paragraph → words, each a list of styled pieces (so {b|bold words} spanning several words still works).
function paragraphWords(line) {
  const words = [];
  let cur = [];
  for (const seg of parseMarkup(line)) {
    const parts = seg.t.split(/( +)/);
    parts.forEach((p) => {
      if (/^ +$/.test(p)) { if (cur.length) words.push(cur); cur = []; return; }
      if (p) cur.push({ ...seg, t: p });
    });
  }
  if (cur.length) words.push(cur);
  return words;
}
// Free horizontal slots for a text line between y0 and y1 (box-local), avoiding obstacles.
function lineSlots(x0, x1, y0, y1, obstacles, minW) {
  let free = [[x0, x1]];
  for (const b of obstacles) {
    if (b.y >= y1 || b.y + b.h <= y0) continue;
    free = free.flatMap(([a, c]) => (b.x >= c || b.x + b.w <= a ? [[a, c]] : [[a, b.x], [b.x + b.w, c]]).filter(([p, q]) => q - p > 0));
  }
  return free.filter(([a, c]) => c - a >= minW);
}
function textObstacles(o, list) {
  if (!o.wrapAround || !o.boxW) return [];
  const pad = Math.max(4, o.fontSize * 0.4);
  return (list || []).filter((x) => x !== o && x.id !== o.id && !x.hidden && x.type !== 'connector' && x.type !== 'text').map((x) => bounds(x, list))
    .map((b) => ({ x: b.x - o.x - pad, y: b.y - o.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }))
    .filter((b) => b.x < o.boxW && b.x + b.w > 0 && b.y < (o.boxH || 1e6) && b.y + b.h > 0);
}
function typesetLayout(o, list) {
  const fs = o.fontSize || 16, lh = fs * (o.lineHeight || 1.25), tr = o.tracking || 0, ps = o.paraSpacing || 0;
  const W = o.boxW > 0 ? o.boxW : Infinity, ncol = W < Infinity ? Math.max(1, Math.min(6, o.columns || 1)) : 1, gut = o.gutter ?? fs * 1.2;
  const cw = W < Infinity ? (W - (ncol - 1) * gut) / ncol : Infinity, obst = ncol === 1 ? textObstacles(o, list) : [];
  const meas = (piece) => runWidth(piece.t, piece.s ? fs * 0.7 : fs, o.family, o.bold || piece.bold, o.italic || piece.italic, tr, o.smallCaps);
  const space = runWidth(' ', fs, o.family, o.bold, o.italic, tr, o.smallCaps);
  const lines = []; // { words: [{pieces, w}], slot: [x0, x1], y, last, para }
  let y = 0;
  const paras = splitSpanLines(displayText(o)).split('\n');
  paras.forEach((para, pi) => {
    const words = paragraphWords(para).map((pieces) => ({ pieces, w: pieces.reduce((s, p) => s + meas(p), 0) }));
    if (!words.length) { lines.push({ words: [], slot: [0, cw], y, last: true, para: pi }); y += lh + ps; return; }
    let i = 0;
    while (i < words.length) {
      const slots = obst.length ? lineSlots(0, cw, y, y + lh, obst, Math.min(cw, fs * 3)) : [[0, cw]];
      if (!slots.length) { y += lh; if (y > 20000) break; continue; }
      for (const slot of slots) {
        if (i >= words.length) break;
        const L = { words: [], slot, y, para: pi };
        let used = 0;
        while (i < words.length) {
          const add = (L.words.length ? space : 0) + words[i].w;
          if (L.words.length && used + add > slot[1] - slot[0] + 0.5) break;
          L.words.push(words[i]); used += add; i++;
        }
        L.used = used;
        L.last = i >= words.length;
        lines.push(L);
      }
      y += lh;
    }
    y += ps;
  });
  // Columns: fill each column to the box height, or balance them.
  let colH = Infinity;
  if (ncol > 1) colH = o.boxH > 0 ? o.boxH : Math.ceil(lines.length / ncol) * lh;
  if (ncol > 1) {
    let col = 0, cy = 0, prevPara = null;
    for (const L of lines) {
      if (cy + lh > colH + 0.5 && col < ncol - 1) { col++; cy = 0; }
      if (cy > 0 && prevPara !== null && L.para !== prevPara) cy += ps;
      L.y = cy; L.col = col; cy += lh; prevPara = L.para;
    }
  }
  const contentW = W < Infinity ? W : Math.max(0, ...lines.map((L) => L.used || 0));
  const contentH = lines.length ? Math.max(...lines.map((L) => L.y)) + lh : lh;
  return { lines, lh, fs, space, cw: W < Infinity ? cw : contentW, gut, contentW, contentH };
}
function typesetSvg(o, list) {
  const T = typesetLayout(o, list), fs = T.fs, align = o.align || 'left';
  const boxH = o.boxH > 0 ? o.boxH : T.contentH;
  const top = o.boxH > 0 ? (boxH - T.contentH) * ({ middle: 0.5, bottom: 1 }[o.valign] || 0) : 0;
  const variant = [o.numerals === 'oldstyle' ? 'oldstyle-nums' : o.numerals === 'tabular' ? 'tabular-nums' : o.numerals === 'lining' ? 'lining-nums' : ''].filter(Boolean);
  let s = `<text font-family='${FONT_STACK[o.family] || FONT_STACK.sans}' font-size="${fs}" fill="${o.color || '#222'}"${o.bold ? ' font-weight="700"' : ''}${o.italic ? ' font-style="italic"' : ''}${o.underline || o.strike ? ` text-decoration="${[o.underline && 'underline', o.strike && 'line-through'].filter(Boolean).join(' ')}"` : ''}${o.tracking ? ` letter-spacing="${fmt4(o.tracking * fs)}"` : ''}${o.smallCaps ? ' font-variant="small-caps"' : ''}${variant.length ? ` style="font-variant-numeric:${variant.join(' ')}"` : ''}>`;
  for (const L of T.lines) {
    if (!L.words.length) continue;
    const colX = (L.col || 0) * (T.cw + T.gut), [sx0, sx1] = L.slot, slotW = (sx1 === Infinity ? T.contentW : sx1) - sx0;
    let x = colX + sx0, gap = T.space;
    const used = L.used || 0;
    if (align === 'center') x += (slotW - used) / 2;
    else if (align === 'right') x += slotW - used;
    else if (align === 'justify' && !L.last && L.words.length > 1) gap = T.space + (slotW - used) / (L.words.length - 1);
    const y = top + L.y + fs;
    L.words.forEach((wd) => {
      s += `<tspan x="${fmt4(x)}" y="${fmt4(y)}">`;
      for (const seg of wd.pieces) {
        const st = `${seg.color ? ` fill="${seg.color}"` : ''}${seg.bold ? ' font-weight="700"' : ''}${seg.italic ? ' font-style="italic"' : ''}`;
        if (!seg.s) s += `<tspan${st}>${esc(seg.t)}</tspan>`;
        else { const sh = seg.s > 0 ? -fs * 0.38 : fs * 0.22; s += `<tspan dy="${sh}" font-size="${fs * 0.7}"${st}>${esc(seg.t)}</tspan><tspan dy="${-sh}">​</tspan>`; }
      }
      s += '</tspan>';
      x += wd.w + gap;
    });
  }
  return s + '</text>';
}
const _textMetricsD6 = textMetrics;
textMetrics = function (o) {
  if (!usesTypeset(o)) return _textMetricsD6(o);
  const T = typesetLayout(o, typeof objs === 'function' && typeof state !== 'undefined' && state.doc ? objs() : []);
  return { w: Math.ceil(o.boxW > 0 ? o.boxW : T.contentW + 4), h: Math.ceil(o.boxH > 0 ? o.boxH : T.contentH + 2) };
};
const _renderPartsD6 = renderParts;
renderParts = function (o, objects, forExport) {
  if (!usesTypeset(o)) return _renderPartsD6(o, objects, forExport);
  // Let the normal text path draw the highlight / hit area, then swap in the typeset text.
  const mark = `TSMARK${o.id}`, r = _renderPartsD6({ ...o, text: mark, formula: false, list: 'none' }, objects, forExport);
  const t = typesetSvg(o, objects), re = new RegExp(`<text[^>]*>(?:(?!</text>)[\\s\\S])*?${mark}(?:(?!</text>)[\\s\\S])*</text>`, 'g');
  r.inner = re.test(r.inner) ? r.inner.replace(re, () => t) : r.inner + t;
  return r;
};

// Symbol shortcuts while typing: \alpha → α, -> → →, +/- → ±, ...
const TYPE_SHORTCUTS = [
  ...['alpha:α', 'beta:β', 'gamma:γ', 'delta:δ', 'epsilon:ε', 'zeta:ζ', 'eta:η', 'theta:θ', 'kappa:κ', 'lambda:λ', 'mu:μ', 'nu:ν', 'xi:ξ', 'pi:π', 'rho:ρ', 'sigma:σ', 'tau:τ', 'phi:φ', 'chi:χ', 'psi:ψ', 'omega:ω',
    'Gamma:Γ', 'Delta:Δ', 'Theta:Θ', 'Lambda:Λ', 'Sigma:Σ', 'Phi:Φ', 'Psi:Ψ', 'Omega:Ω', 'deg:°', 'micro:µ', 'angstrom:Å', 'times:×', 'pm:±', 'approx:≈', 'leq:≤', 'geq:≥', 'neq:≠', 'inf:∞', 'dagger:†', 'female:♀', 'male:♂', 'check:✓']
    .map((p) => { const [k, v] = p.split(':'); return [`\\${k}`, v]; }),
  ['->', '→'], ['<-', '←'], ['<=>', '⇌'], ['<->', '↔'], ['+/-', '±'], ['+-', '±'], ['=>', '⇒'], ['-|', '⊣'], ['...', '…'], ['>=', '≥'], ['<=', '≤'], ['!=', '≠'], ['~=', '≈'],
].sort((a, b) => b[0].length - a[0].length);
// A shortcut turns into its symbol when you type the space (or new line) after it, so <= can still become <=>.
function applyTypeShortcuts(text, caret) {
  const sep = text[caret - 1];
  if (sep !== ' ' && sep !== '\n') return null;
  const before = text.slice(0, caret - 1);
  for (const [k, v] of TYPE_SHORTCUTS) {
    if (!before.endsWith(k)) continue;
    return { text: before.slice(0, -k.length) + v + sep + text.slice(caret), caret: caret - k.length + v.length };
  }
  return null;
}
$('#textEditor').addEventListener('input', (e) => {
  if (typeof state !== 'undefined' && state.view && state.view.typeShortcuts === false) return;
  if (e.inputType && !e.inputType.startsWith('insert')) return;
  const ta = e.target, r = applyTypeShortcuts(ta.value, ta.selectionStart);
  if (!r) return;
  ta.value = r.text; ta.setSelectionRange(r.caret, r.caret);
  if (typeof ta.oninput === 'function') ta.oninput();
}, true);

// Box text: dragging a corner changes the box instead of the font size.
const _handlePointerMoveD6 = handlePointerMove;
handlePointerMove = function (e) {
  if (typeof drag !== 'undefined' && drag && drag.mode === 'resize' && drag.o.type === 'text' && drag.o.boxW > 0) {
    const o = drag.o, r = computeResize(drag, toWorld(e), false);
    o.boxW = Math.max(30, Math.round(r.w)); o.x = r.x;
    if (o.boxH > 0) { o.boxH = Math.max(o.fontSize, Math.round(r.h)); o.y = r.y; } else if (drag.h.includes('n')) o.y = r.y;
    postEdit(o);
    renderSceneOnly(new Set([o.id])); renderOverlay();
    return;
  }
  return _handlePointerMoveD6(e);
};
function typographySection(o) {
  const L = [o], set = (k, v) => { checkpoint('type' + o.id + k); if (v === null || v === '' || v === false) delete o[k]; else o[k] = v; postEdit(o); renderScene(); renderOverlay(); markDirty(); };
  const numIn = (k, step, min, def, ph) => el('input', { type: 'number', step, min, value: o[k] ?? def ?? '', placeholder: ph || '', style: 'width:64px', oninput: (e) => set(k, e.target.value === '' ? null : +e.target.value) });
  const boxed = o.boxW > 0;
  return sect('Typography',
    row('Letter spacing', el('input', { type: 'range', min: -0.1, max: 0.5, step: 0.01, value: o.tracking || 0, oninput: (e) => set('tracking', +e.target.value || null) })),
    row('Line height', el('input', { type: 'range', min: 0.8, max: 2.5, step: 0.05, value: o.lineHeight || 1.25, oninput: (e) => set('lineHeight', +e.target.value === 1.25 ? null : +e.target.value) }), el('span', { textContent: `${o.lineHeight || 1.25}×` })),
    row('Paragraph space', numIn('paraSpacing', 1, 0, '', '0')),
    row('Align', el('select', { onchange: (e) => setProps(L, 'align', e.target.value) }, ...[['left', 'Left'], ['center', 'Centre'], ['right', 'Right'], ['justify', 'Justify (text box)']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (o.align || 'left') === v })))),
    row('', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: boxed, onchange: (e) => { set('boxW', e.target.checked ? Math.max(120, Math.round(o.w)) : null); if (!e.target.checked) { delete o.boxH; delete o.columns; delete o.wrapAround; postEdit(o); } renderProps(); } }), 'Text box (wrap to width)')),
    boxed ? row('Box size', numIn('boxW', 1, 30), el('span', { textContent: '×', class: 'note' }), numIn('boxH', 1, 10, '', 'auto')) : null,
    boxed ? row('Columns', numIn('columns', 1, 1, 1), el('span', { textContent: 'gutter', class: 'note' }), numIn('gutter', 1, 0, '', String(Math.round((o.fontSize || 16) * 1.2)))) : null,
    boxed && o.boxH > 0 ? row('Vertical', el('select', { onchange: (e) => set('valign', e.target.value === 'top' ? null : e.target.value) }, ...[['top', 'Top'], ['middle', 'Middle'], ['bottom', 'Bottom']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (o.valign || 'top') === v })))) : null,
    boxed ? row('', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: !!o.wrapAround, onchange: (e) => set('wrapAround', e.target.checked) }), 'Wrap around objects')) : null,
    row('Caps & figures', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: !!o.smallCaps, onchange: (e) => set('smallCaps', e.target.checked) }), 'Small caps'),
      el('select', { onchange: (e) => set('numerals', e.target.value || null) }, ...[['', 'Numbers'], ['lining', 'Lining'], ['oldstyle', 'Old-style'], ['tabular', 'Tabular']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (o.numerals || '') === v })))),
    el('div', { class: 'note', style: 'font-variant-ligatures:none;font-feature-settings:"calt" 0,"liga" 0', textContent: 'While typing, these turn into symbols when you press space: \\alpha → α, \\mu → μ, \\deg → °, -> → →, <=> → ⇌, +/- → ±, -| → ⊣.' }));
}

// ---------- Labels with leader lines that stay attached ----------
// A text object with leader = { target, u, v (anchor on the target, 0..1 of its box), style: 'straight' |
// 'elbow' | 'curved', color, width, dot, ax, ay (last anchor position, to follow the target) }.
function leaderAnchor(o, list) {
  const t = list.find((x) => x.id === o.leader.target);
  if (!t) return null;
  return t.type === 'connector' ? null : localToPage(t, { x: (o.leader.u ?? 0.5) * t.w, y: (o.leader.v ?? 0.5) * t.h });
}
function leaderSvg(o, list) {
  const A = leaderAnchor(o, list);
  if (!A) return '';
  const Ld = o.leader, a = worldToLocal(o, A), w = o.w, h = o.h;
  const dx = a.x < 0 ? a.x : a.x > w ? a.x - w : 0, dy = a.y < 0 ? a.y : a.y > h ? a.y - h : 0;
  if (!dx && !dy) return '';
  const side = Math.abs(dx) >= Math.abs(dy) * 0.6 ? (dx < 0 ? 'l' : 'r') : dy < 0 ? 't' : 'b';
  const pad = 3, s = side === 'l' ? { x: -pad, y: h / 2 } : side === 'r' ? { x: w + pad, y: h / 2 } : side === 't' ? { x: w / 2, y: -pad } : { x: w / 2, y: h + pad };
  const col = Ld.color || '#444444', sw = Ld.width || 1.2, gap = Ld.dot === false ? 0 : sw * 1.8;
  let d;
  if (Ld.style === 'elbow' && (side === 'l' || side === 'r')) { const kx = s.x + (a.x - s.x) * 0.55; d = `M${fmt4(s.x)} ${fmt4(s.y)}H${fmt4(kx)}L${fmt4(a.x)} ${fmt4(a.y)}`; }
  else if (Ld.style === 'curved') d = `M${fmt4(s.x)} ${fmt4(s.y)}Q${fmt4(side === 'l' || side === 'r' ? a.x : s.x)} ${fmt4(side === 'l' || side === 'r' ? s.y : a.y)} ${fmt4(a.x)} ${fmt4(a.y)}`;
  else d = `M${fmt4(s.x)} ${fmt4(s.y)}L${fmt4(a.x)} ${fmt4(a.y)}`;
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${Ld.dash ? ` stroke-dasharray="${sw * 3} ${sw * 2.4}"` : ''}/>` + (gap ? `<circle cx="${fmt4(a.x)}" cy="${fmt4(a.y)}" r="${fmt4(gap)}" fill="${col}"/>` : '');
}
const _renderPartsD6b = renderParts;
renderParts = function (o, objects, forExport) {
  const r = _renderPartsD6b(o, objects, forExport);
  if (o.leader && o.type !== 'connector') r.inner = leaderSvg(o, objects || []) + r.inner;
  return r;
};
const _innerKeyD6 = innerKey;
innerKey = function (o, list) {
  let k = _innerKeyD6(o, list);
  if (o.leader) { const A = leaderAnchor(o, list); k += `|ld${o.x},${o.y},${o.rot || 0},${A ? `${fmt4(A.x)},${fmt4(A.y)}` : '-'}`; }
  if (o.type === 'text' && o.wrapAround && o.boxW) k += '|wr' + textObstacles(o, list).map((b) => `${fmt4(b.x)},${fmt4(b.y)},${fmt4(b.w)},${fmt4(b.h)}`).join(';');
  return k;
};
// Labels follow their objects: when an anchor moves, its label moves by the same amount.
function syncLeaders(list) {
  for (const o of list) {
    if (!o.leader) continue;
    const A = leaderAnchor(o, list);
    if (!A) continue;
    if (o.leader.ax != null && (Math.abs(A.x - o.leader.ax) > 1e-6 || Math.abs(A.y - o.leader.ay) > 1e-6)) { o.x += A.x - o.leader.ax; o.y += A.y - o.leader.ay; }
    o.leader.ax = A.x; o.leader.ay = A.y;
  }
  for (const o of list) if (o.type === 'text' && o.wrapAround && o.boxW) { const m = textMetrics(o); o.h = m.h; }
}
const _renderSceneD6 = renderScene;
renderScene = function () { try { syncLeaders(objs()); } catch (e) { console.warn(e); } return _renderSceneD6(); };
const _renderSceneOnlyD6 = renderSceneOnly;
renderSceneOnly = function (ids, moveOnly) {
  const extra = new Set(ids);
  for (const o of objs()) if (o.leader && ids.has(o.leader.target)) extra.add(o.id);
  return _renderSceneOnlyD6(extra, moveOnly);
};
function displayNameOf(o) {
  if (o.name) return o.name;
  if (o.type === 'icon') { const n = ICON_MAP[o.iconId] ? ICON_MAP[o.iconId].name : (typeof getAsset === 'function' && getAsset(o.iconId) || {}).name; if (n) return n.replace(/^Soft · /, ''); }
  if (o.label) return stripMarkup(o.label).split('\n')[0];
  return layerName(o);
}
function makeLabelFor(t, text, side, x, y, style = 'elbow') {
  const lab = Make.text(text, 0, 0, { fontSize: 14, color: '#222222', align: side === 'l' ? 'right' : 'left' });
  lab.x = side === 'l' ? x - lab.w : x; lab.y = y - lab.h / 2;
  const A = localToPage(t, { x: t.w / 2, y: t.h / 2 });
  lab.leader = { target: t.id, u: 0.5, v: 0.5, style, color: '#444444', width: 1.2, ax: A.x, ay: A.y };
  lab.name = `Label: ${text}`;
  return lab;
}
// Label every selected object with its name, in tidy columns on either side, without overlaps.
function labelSelected() {
  const sel = selected().filter((o) => o.type !== 'connector' && o.type !== 'text' && !o.leader);
  if (!sel.length) { toast('Select the icons or shapes to label'); return; }
  checkpoint();
  const B = unionBounds(sel), cx = B.x + B.w / 2, gap = 36, made = [];
  const sides = { l: [], r: [] };
  sel.forEach((o) => { const c = center(o); (sel.length === 1 || c.x >= cx ? sides.r : sides.l).push(o); });
  for (const [side, items] of Object.entries(sides)) {
    items.sort((a, b) => center(a).y - center(b).y);
    const labels = items.map((t) => makeLabelFor(t, displayNameOf(t), side, side === 'l' ? B.x - gap : B.x + B.w + gap, center(t).y));
    for (let i = 1; i < labels.length; i++) { const p = labels[i - 1], q = labels[i]; if (q.y < p.y + p.h + 4) q.y = p.y + p.h + 4; }
    if (labels.length) { // centre the stack on the objects again after pushing down
      const want = items.reduce((s, t) => s + center(t).y, 0) / items.length, have = labels.reduce((s, l) => s + l.y + l.h / 2, 0) / labels.length;
      labels.forEach((l) => { l.y += want - have; });
    }
    made.push(...labels);
  }
  objs().push(...made);
  state.sel = made.map((l) => l.id);
  render({ props: true });
  toast(`${made.length} label${made.length === 1 ? '' : 's'} added. They follow their objects when moved`);
}
function attachLabel() {
  const sel = selected(), txt = sel.find((o) => o.type === 'text'), t = sel.find((o) => o !== txt && o.type !== 'connector');
  if (!txt || !t || sel.length !== 2) { toast('Select a text label and the object it names'); return; }
  checkpoint();
  const A = localToPage(t, { x: t.w / 2, y: t.h / 2 });
  txt.leader = { target: t.id, u: 0.5, v: 0.5, style: 'elbow', color: '#444444', width: 1.2, ax: A.x, ay: A.y };
  state.sel = [txt.id];
  render({ props: true });
}
function editLeaderAnchor(o) {
  const t = objs().find((x) => x.id === o.leader.target);
  if (!t) return;
  startHandles({
    hint: 'Drag the dot to where the label should point. Enter or Esc when done',
    handles: () => [{ id: 'a', ...localToPage(t, { x: (o.leader.u ?? 0.5) * t.w, y: (o.leader.v ?? 0.5) * t.h }), color: '#e8743b' }],
    drag: (id, p) => { const q = worldToLocal(t, p); o.leader.u = fmt4(q.x / t.w); o.leader.v = fmt4(q.y / t.h); const A = leaderAnchor(o, objs()); o.leader.ax = A.x; o.leader.ay = A.y; },
  });
}
function leaderSection(o) {
  const Ld = o.leader, set = (k, v) => { checkpoint('ld' + o.id + k); Ld[k] = v; renderScene(); markDirty(); };
  const t = objs().find((x) => x.id === Ld.target);
  return sect('Leader line',
    el('div', { class: 'note', textContent: t ? `Points at “${displayNameOf(t)}” and moves with it.` : 'The object this label pointed at was deleted.' }),
    row('Style', el('select', { onchange: (e) => set('style', e.target.value) }, ...[['straight', 'Straight'], ['elbow', 'Elbow'], ['curved', 'Curved']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (Ld.style || 'straight') === v })))),
    row('Colour', el('input', { type: 'color', value: toHex(Ld.color || '#444444'), oninput: (e) => set('color', e.target.value) })),
    row('Width', el('input', { type: 'number', min: 0.25, step: 0.25, value: Ld.width || 1.2, style: 'width:60px', oninput: (e) => set('width', +e.target.value || 1.2) })),
    row('', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: Ld.dot !== false, onchange: (e) => set('dot', e.target.checked) }), 'Dot at the end'),
      el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: !!Ld.dash, onchange: (e) => set('dash', e.target.checked) }), 'Dashed')),
    el('div', { class: 'btnrow' }, t ? btn('Move the pointed spot', () => editLeaderAnchor(o)) : null, btn('Detach', () => { checkpoint(); delete o.leader; render({ props: true }); })));
}

// ---------- Graphic styles ----------
// state.doc.graphicStyles = [{ id, name, type ('shape' | 'line' | 'text' | 'other'), props }]; o.gstyle links to one.
const gstyles = () => (state.doc.graphicStyles = state.doc.graphicStyles || []);
const gstyleType = (o) => (o.type === 'text' ? 'text' : o.type === 'path' && !o.closed ? 'line' : FILLABLE(o) ? 'shape' : o.type === 'connector' ? 'connector' : 'other');
const GS_SKIP = new Set(['textStyle', 'name', 'swatchRefs', 'gstyle', 'repeatCfg', 'blendCfg']);
function styleProps(o) { return Object.fromEntries(styleKeysFor(o).filter((k) => !GS_SKIP.has(k) && o[k] !== undefined).map((k) => [k, deep(o[k])])); }
function applyGraphicStyle(list, gs) {
  for (const o of list) {
    const keys = new Set(styleKeysFor(o));
    for (const k of keys) if (!GS_SKIP.has(k) && k in gs.props === false && ['fillSpec', 'pattern', 'innerGlow', 'halo', 'glow', 'shadow', 'grain', 'depthBlur', 'blend', 'fade'].includes(k)) delete o[k];
    for (const [k, v] of Object.entries(gs.props)) if (keys.has(k)) o[k] = deep(v);
    o.gstyle = gs.id;
    postEdit(o);
  }
}
function syncGraphicStyle(gs) {
  allDocObjectLists().forEach((list) => walkDeep(list, (o) => { if (o.gstyle === gs.id) applyGraphicStyle([o], gs); }));
  if (typeof comps === 'function' && typeof syncComponent === 'function') comps().forEach((c) => syncComponent(c.id));
}
function newGraphicStyle(o) {
  const gs = { id: uid(), name: `${{ text: 'Text', line: 'Line', shape: 'Shape', connector: 'Arrow' }[gstyleType(o)] || 'Style'} style ${gstyles().length + 1}`, type: gstyleType(o), props: styleProps(o) };
  checkpoint();
  gstyles().push(gs);
  o.gstyle = gs.id;
  return gs;
}
function gstylePreview(gs) {
  const fake = gs.type === 'text' ? { ...Make.text('Aa', 0, 0), ...gs.props, x: 0, y: 0, id: 'pv' + gs.id } : gs.type === 'line' ? { ...makePathFromNodes([{ x: 4, y: 26 }, { x: 22, y: 6, ix: 14, iy: 6 }, { x: 52, y: 18 }]), ...gs.props, id: 'pv' + gs.id } : { ...Make.rect(4, 4, 48, 28, { radius: 6 }), ...gs.props, id: 'pv' + gs.id };
  if (fake.type === 'text') { const m = textMetrics(fake); fake.w = m.w; fake.h = m.h; fake.x = (56 - m.w) / 2; fake.y = (36 - m.h) / 2; }
  let inner = '';
  try { inner = renderObjectString(fake, [fake], true); } catch { inner = ''; }
  return el('span', { innerHTML: `<svg width="56" height="36" viewBox="0 0 56 36" style="background:#fff;border:1px solid var(--border, #ddd);border-radius:4px">${inner}</svg>`, style: 'display:inline-flex' });
}
function graphicStyleSection(o) {
  const cur = gstyles().find((g) => g.id === o.gstyle), mine = gstyles().filter((g) => g.type === gstyleType(o));
  return sect('Graphic style',
    row('Style', el('select', { onchange: (e) => { const gs = gstyles().find((g) => g.id === e.target.value); checkpoint(); if (gs) applyGraphicStyle([o], gs); else delete o.gstyle; render({ props: true }); } },
      el('option', { value: '', textContent: cur ? 'Detach from style' : 'None' }), ...mine.map((g) => el('option', { value: g.id, textContent: g.name, selected: g === cur })))),
    cur ? el('div', { style: 'display:flex;gap:8px;align-items:center;margin:4px 0' }, gstylePreview(cur), el('span', { class: 'note', textContent: `Linked: changes to “${cur.name}” update every object using it.` })) : null,
    el('div', { class: 'btnrow' },
      btn('New style from this', () => { const gs = newGraphicStyle(o); render({ props: true }); toast(`Saved “${gs.name}”. Apply it from Graphic style on other objects`); }),
      cur ? btn('Update style from this', () => { checkpoint(); cur.props = styleProps(o); syncGraphicStyle(cur); render({ props: true }); toast(`“${cur.name}” updated everywhere`); }, 'primary') : null,
      btn('Manage…', openGraphicStylesDialog)));
}
function openGraphicStylesDialog() {
  const wrap = el('div');
  const draw = () => {
    wrap.innerHTML = '';
    if (!gstyles().length) wrap.append(el('div', { class: 'note', textContent: 'No graphic styles yet. Select a styled object and choose Properties › Graphic style › New style from this.' }));
    gstyles().forEach((gs) => {
      const n = []; allDocObjectLists().forEach((l) => walkDeep(l, (o) => { if (o.gstyle === gs.id) n.push(o); }));
      wrap.append(el('div', { class: 'row', style: 'gap:8px' }, gstylePreview(gs),
        el('input', { type: 'text', value: gs.name, style: 'flex:1', oninput: (e) => { gs.name = e.target.value; markDirty(); } }),
        el('span', { class: 'note', textContent: `${gs.type} · ${n.length} use${n.length === 1 ? '' : 's'}` }),
        btn('Apply to selection', () => { const s = selected().filter((o) => gstyleType(o) === gs.type || gs.type === 'other'); if (!s.length) { toast(`Select ${gs.type} objects first`); return; } checkpoint(); applyGraphicStyle(s, gs); render({ props: true }); }),
        btn('Select uses', () => { state.sel = objs().filter((o) => o.gstyle === gs.id).map((o) => o.id); closeModal(); render({ props: true }); }),
        btn('Delete', () => { checkpoint(); state.doc.graphicStyles = gstyles().filter((g) => g !== gs); n.forEach((o) => delete o.gstyle); draw(); }, 'danger')));
    });
  };
  draw();
  openModal('Graphic styles', wrap);
}
const _setPropsD6 = setProps;
setProps = function (list, key, value, opts) { // editing a styled property by hand detaches the object
  for (const o of list) { const gs = o.gstyle && gstyles().find((g) => g.id === o.gstyle); if (gs && key in gs.props) delete o.gstyle; }
  return _setPropsD6(list, key, value, opts);
};
STYLE_SETS.text.push(...TYPE_KEYS.filter((k) => !['boxW', 'boxH', 'wrapAround'].includes(k)));

// ---------- Selection and navigation ----------
let lasso = null;
function startLasso() { lasso = { pts: [] }; stage.style.cursor = 'crosshair'; toast('Lasso: drag around objects to select them (Shift adds). Esc to stop', 4000); }
function stopLasso() { lasso = null; stage.style.cursor = ''; $('#guides').innerHTML = ''; }
function pointInPoly(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside; }
  return inside;
}
function lassoSelect(poly, add) {
  const hits = objs().filter((o) => !o.locked && !o.hidden && o.type !== 'connector' && pointInPoly(center(o), poly)).map((o) => o.id);
  state.sel = add ? [...new Set([...state.sel, ...hits])] : hits;
  return hits.length;
}
svg.addEventListener('pointerdown', (e) => {
  if (lasso && e.button === 0) { e.stopImmediatePropagation(); e.preventDefault(); lasso.pts = [toWorld(e)]; lasso.add = e.shiftKey; return; }
  // ⌥⌘-click (Ctrl+Alt-click on Windows): select the next object behind the one under the pointer.
  if (e.button === 0 && e.altKey && (e.metaKey || e.ctrlKey) && state.tool === 'select' && !handleMode && !cutTool) {
    const stack = [];
    for (const n of document.elementsFromPoint(e.clientX, e.clientY)) { const g = n.closest && n.closest('#scene > g[data-id]'); if (g && !stack.includes(g.dataset.id)) { const o = byId(g.dataset.id); if (o && !o.locked) stack.push(o.id); } }
    if (!stack.length) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const i = stack.indexOf(state.sel[state.sel.length - 1]);
    state.sel = [stack[(i + 1) % stack.length]];
    render({ props: true });
  }
}, true);
svg.addEventListener('pointermove', (e) => {
  if (!lasso || !lasso.pts.length || !(e.buttons & 1)) return;
  e.stopImmediatePropagation();
  lasso.pts.push(toWorld(e));
  const z = state.zoom;
  $('#guides').innerHTML = `<polygon points="${lasso.pts.map((q) => `${q.x},${q.y}`).join(' ')}" fill="rgba(59,111,214,.08)" stroke="#3b6fd6" stroke-width="${1.2 / z}" stroke-dasharray="${4 / z} ${3 / z}"/>`;
}, true);
window.addEventListener('pointerup', () => {
  if (!lasso || lasso.pts.length < 3) { if (lasso) lasso.pts = []; return; }
  const n = lassoSelect(lasso.pts, lasso.add);
  stopLasso();
  render({ props: true });
  toast(`${n} object${n === 1 ? '' : 's'} selected`);
}, true);
window.addEventListener('keydown', (e) => {
  if (lasso && e.key === 'Escape') { e.stopImmediatePropagation(); stopLasso(); return; }
  if (isTyping() || e.metaKey || e.ctrlKey || e.altKey || !$('#modal').classList.contains('hidden')) return;
  if (e.key === 'q' || e.key === 'Q') { e.preventDefault(); startLasso(); }
});
function selectSame(kind) {
  const ref = selected()[0];
  if (!ref) { toast('Select an object first'); return; }
  const m = {
    stroke: (o) => (o.stroke || o.color) && (o.stroke || o.color) === (ref.stroke || ref.color) && (o.strokeWidth ?? o.width) === (ref.strokeWidth ?? ref.width) && (o.stroke !== undefined) === (ref.stroke !== undefined),
    gstyle: (o) => ref.gstyle && o.gstyle === ref.gstyle,
    font: (o) => o.type === 'text' && ref.type === 'text' && (o.family || 'sans') === (ref.family || 'sans') && o.fontSize === ref.fontSize && !!o.bold === !!ref.bold,
    fill: (o) => normHex(o.fill) && normHex(o.fill) === normHex(ref.fill) && JSON.stringify(o.fillSpec || null) === JSON.stringify(ref.fillSpec || null),
    effects: (o) => ['glow', 'shadow', 'innerGlow', 'halo', 'grain', 'depthBlur', 'blend'].every((k) => JSON.stringify(o[k] ?? null) === JSON.stringify(ref[k] ?? null)) && ['glow', 'shadow', 'innerGlow', 'halo', 'grain', 'depthBlur', 'blend'].some((k) => ref[k]),
  }[kind];
  state.sel = objs().filter((o) => !o.locked && !o.hidden && m(o)).map((o) => o.id);
  render({ props: true });
  toast(`${state.sel.length} matching object${state.sel.length === 1 ? '' : 's'} selected`);
}
function zoomToSelection() {
  const sel = selected();
  if (!sel.length) { zoomFit(); return; }
  const b = unionBounds(sel, objs()), r = svg.getBoundingClientRect(), pad = 60;
  state.zoom = Math.max(0.05, Math.min(8, Math.min((r.width - 2 * pad) / Math.max(b.w, 1), (r.height - 2 * pad) / Math.max(b.h, 1))));
  state.panX = r.width / 2 - (b.x + b.w / 2) * state.zoom;
  state.panY = r.height / 2 - (b.y + b.h / 2) * state.zoom;
  applyViewport(); renderOverlay();
}
// Mini-map: a live thumbnail of the page (it reuses the canvas drawing) with the visible area; click or drag to move.
function updateMinimap() {
  let mm = document.getElementById('minimap');
  if (!state.view.minimap) { if (mm) mm.remove(); return; }
  const p = page(), W = 180, H = Math.max(40, Math.min(180, (W * p.height) / p.width));
  if (!mm) {
    mm = el('div', { id: 'minimap', style: 'position:absolute;right:14px;bottom:14px;z-index:30;background:var(--panel, #fff);border:1px solid var(--border, #ccc);border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.18);padding:6px;cursor:pointer' });
    stage.append(mm);
    const go = (e) => { const r = mm.querySelector('svg').getBoundingClientRect(), pg = page(), k = pg.width / r.width, s = svg.getBoundingClientRect(); const wx = (e.clientX - r.left) * k, wy = (e.clientY - r.top) * k; state.panX = s.width / 2 - wx * state.zoom; state.panY = s.height / 2 - wy * state.zoom; applyViewport(); renderOverlay(); };
    mm.addEventListener('pointerdown', (e) => { e.stopPropagation(); mm.setPointerCapture(e.pointerId); go(e); mm.onpointermove = (ev) => { if (ev.buttons & 1) go(ev); }; });
    mm.addEventListener('pointerup', () => { mm.onpointermove = null; });
  }
  const s = svg.getBoundingClientRect(), vx = -state.panX / state.zoom, vy = -state.panY / state.zoom, vw = s.width / state.zoom, vh = s.height / state.zoom;
  mm.innerHTML = `<svg width="${W}" height="${fmt4(H)}" viewBox="0 0 ${p.width} ${p.height}" style="display:block"><rect width="${p.width}" height="${p.height}" fill="${p.background || '#fff'}"/><use href="#scene"/><rect x="${fmt4(vx)}" y="${fmt4(vy)}" width="${fmt4(vw)}" height="${fmt4(vh)}" fill="rgba(59,111,214,.12)" stroke="#3b6fd6" stroke-width="${fmt4(Math.max(p.width, p.height) / 150)}"/></svg>`;
}
const _applyViewportD6 = applyViewport;
applyViewport = function () { _applyViewportD6(); if (state.view.minimap) updateMinimap(); };

// ---------- Layout grids ----------
// page.layoutGrid = { cols, gutter, margin, rows, rowGutter, show }: drawn on screen only (never exported),
// and objects snap to column edges and to whole-column widths.
const LAYOUT_PRESETS = [
  ['2 columns', { cols: 2, gutter: 24, margin: 24 }], ['3 columns', { cols: 3, gutter: 24, margin: 24 }], ['4 columns', { cols: 4, gutter: 20, margin: 24 }],
  ['6 columns', { cols: 6, gutter: 16, margin: 24 }], ['12 columns', { cols: 12, gutter: 12, margin: 24 }],
  ['Nature / Cell: 2 columns (89 + 89 mm)', { cols: 2, gutterFrac: 5 / 183, margin: 0 }],
  ['Science: 3 columns (57 mm each)', { cols: 3, gutterFrac: 6.5 / 184, margin: 0 }],
  ['PNAS: 2 columns (87 mm each)', { cols: 2, gutterFrac: 4 / 178, margin: 0 }],
  ['Panels: 2 × 2', { cols: 2, rows: 2, gutter: 24, rowGutter: 24, margin: 24 }], ['Panels: 3 × 2', { cols: 3, rows: 2, gutter: 24, rowGutter: 24, margin: 24 }],
];
function gridColumns(p) {
  const g = p.layoutGrid;
  if (!g || !g.cols) return { cols: [], rows: [] };
  const m = g.margin ?? 0, gut = g.gutterFrac ? g.gutterFrac * p.width : g.gutter ?? 20, n = Math.max(1, g.cols), cw = (p.width - 2 * m - (n - 1) * gut) / n;
  const cols = Array.from({ length: n }, (_, i) => ({ x: m + i * (cw + gut), w: cw }));
  const rn = Math.max(0, g.rows || 0), rg = g.rowGutter ?? gut, rh = rn ? (p.height - 2 * m - (rn - 1) * rg) / rn : 0;
  const rows = Array.from({ length: rn }, (_, i) => ({ y: m + i * (rh + rg), h: rh }));
  return { cols, rows, m, gut, cw, rh, rg };
}
const _renderOverlayD6 = renderOverlay;
renderOverlay = function (extra = '') {
  const p = page(), g = p.layoutGrid;
  let s = '';
  if (g && g.show !== false && g.cols) {
    const G = gridColumns(p);
    s += G.cols.map((c) => `<rect x="${fmt4(c.x)}" y="0" width="${fmt4(c.w)}" height="${p.height}" fill="rgba(232,67,123,.07)" stroke="rgba(232,67,123,.35)" stroke-width="${0.8 / state.zoom}" pointer-events="none"/>`).join('');
    s += G.rows.map((r) => `<rect x="0" y="${fmt4(r.y)}" width="${p.width}" height="${fmt4(r.h)}" fill="rgba(59,111,214,.05)" stroke="rgba(59,111,214,.3)" stroke-width="${0.8 / state.zoom}" pointer-events="none"/>`).join('');
  }
  const r = _renderOverlayD6(s + extra);
  if (state.view.minimap) updateMinimap();
  return r;
};
const _guideTargetsD6 = guideTargets;
guideTargets = function () {
  const fresh = !(typeof drag !== 'undefined' && drag && drag.snapTargets);
  const out = _guideTargetsD6();
  const p = page();
  if (fresh && p.layoutGrid && p.layoutGrid.cols && p.layoutGrid.show !== false && !out._grid) {
    const G = gridColumns(p);
    G.cols.forEach((c) => out.push({ x: c.x, y: -1e5, w: c.w, h: 0 }));
    G.rows.forEach((r) => out.push({ x: -1e5, y: r.y, w: 0, h: r.h }));
    out._grid = true;
  }
  return out;
};
const _sizeTargetsD6 = sizeTargets;
sizeTargets = function () {
  const fresh = !(typeof drag !== 'undefined' && drag && drag.sizeTargets);
  const out = _sizeTargetsD6();
  const p = page();
  if (fresh && p.layoutGrid && p.layoutGrid.cols && p.layoutGrid.show !== false && !out._grid) {
    const G = gridColumns(p);
    for (let k = 1; k <= G.cols.length; k++) out.push({ w: k * G.cw + (k - 1) * G.gut, h: -1, b: { x: G.cols[0].x, y: 0, w: k * G.cw + (k - 1) * G.gut, h: 0 } });
    for (let k = 1; k <= G.rows.length; k++) out.push({ w: -1, h: k * G.rh + (k - 1) * G.rg, b: { x: 0, y: G.rows[0].y, w: 0, h: k * G.rh + (k - 1) * G.rg } });
    out._grid = true;
  }
  return out;
};
function layoutGridSection() {
  const p = page(), g = p.layoutGrid || {}, set = (k, v) => { checkpoint('lg' + k); p.layoutGrid = { ...(p.layoutGrid || { cols: 2, gutter: 24, margin: 24 }), [k]: v }; if (k === 'gutter') delete p.layoutGrid.gutterFrac; renderOverlay(); markDirty(); };
  const n = (k, def, min = 0) => el('input', { type: 'number', min, step: 1, value: g[k] ?? def, style: 'width:60px', oninput: (e) => set(k, Math.max(min, +e.target.value || 0)) });
  return sect('Layout grid',
    row('Preset', el('select', { onchange: (e) => { const v = e.target.value; if (v === '') return; checkpoint(); if (v === 'none') delete p.layoutGrid; else p.layoutGrid = { ...LAYOUT_PRESETS[+v][1], show: true }; renderOverlay(); renderProps(); } },
      el('option', { value: '', textContent: g.cols ? `${g.cols} columns${g.rows ? ` × ${g.rows} rows` : ''}` : 'Choose…', selected: true }), g.cols ? el('option', { value: 'none', textContent: 'No grid' }) : null, ...LAYOUT_PRESETS.map(([name], i) => el('option', { value: i, textContent: name })))),
    g.cols ? row('Columns', n('cols', 2, 1), el('span', { textContent: 'gutter', class: 'note' }), g.gutterFrac ? el('input', { type: 'number', value: Math.round(g.gutterFrac * p.width), style: 'width:60px', oninput: (e) => set('gutter', +e.target.value || 0) }) : n('gutter', 24)) : null,
    g.cols ? row('Rows', n('rows', 0), el('span', { textContent: 'margin', class: 'note' }), n('margin', 24)) : null,
    g.cols ? row('', el('label', { style: 'display:flex;gap:4px;align-items:center;width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: g.show !== false, onchange: (e) => set('show', e.target.checked) }), 'Show and snap to the grid')) : null,
    el('div', { class: 'note', textContent: 'Objects snap to column edges and resize to whole-column widths, so multi-panel figures line up. The grid is never exported.' }));
}

// ---------- Panels and commands ----------
const _renderPropsD6 = renderProps;
renderProps = function () {
  _renderPropsD6();
  const sel = selected(), P = $('#props');
  if (!sel.length) { const l = [...P.querySelectorAll('.sect')].find((x) => x.querySelector('h3')?.textContent === 'Page'); (l ? l.after(layoutGridSection()) : P.append(layoutGridSection())); return; }
  if (sel.length > 1) {
    const tools = [btn('Label these', labelSelected)];
    if (sel.length === 2 && sel.some((o) => o.type === 'text')) tools.push(btn('Attach label to object', attachLabel));
    P.append(sect('Labels', el('div', { class: 'btnrow' }, ...tools)));
    return;
  }
  const o = sel[0];
  if (o.type === 'text' && !o.curve) placeSection(P, ['Text'], typographySection(o));
  if (o.leader) placeSection(P, ['Typography', 'Text'], leaderSection(o));
  if (o.type !== 'connector' && o.type !== 'group') placeSection(P, SECTION_CHAIN, graphicStyleSection(o));
  if (o.type !== 'text' && o.type !== 'connector') P.append(sect('Labels', el('div', { class: 'btnrow' }, btn('Add label with leader line', labelSelected))));
};
Object.assign(ARRANGE_COMMANDS, {
  labelSelected, attachLabel, graphicStyles: openGraphicStylesDialog, lassoTool: startLasso, zoomSelection: zoomToSelection,
  selectSameStroke: () => selectSame('stroke'), selectSameStyle: () => selectSame('gstyle'), selectSameFont: () => selectSame('font'), selectSameFill: () => selectSame('fill'), selectSameEffects: () => selectSame('effects'),
  toggleMinimap: () => { state.view.minimap = !state.view.minimap; updateMinimap(); },
  layoutGrid: () => { state.sel = []; render({ props: true }); const s = [...$('#props').querySelectorAll('.sect')].find((x) => x.querySelector('h3')?.textContent === 'Layout grid'); if (s) s.scrollIntoView({ block: 'center' }); },
  toggleLayoutGrid: () => { const p = page(); if (!p.layoutGrid) { checkpoint(); p.layoutGrid = { cols: 2, gutter: 24, margin: 24, show: true }; } else p.layoutGrid.show = p.layoutGrid.show === false; renderOverlay(); },
});
document.addEventListener('DOMContentLoaded', () => {
  if (typeof HELP === 'undefined') return;
  HELP.push(
    ['Fill editor', 'Select a shape or closed drawing: Properties › Fill editor gives gradients with any number of colours (linear or radial, dragged on the canvas), fill opacity, patterns (stripes, dots, hatch…) and generated textures (cytoplasm granules, collagen fibres, stroma, chromatin, lipid droplets, bone, grain).'],
    ['One light source', 'With nothing selected, Properties › Lighting sets one light direction for the whole figure. All shading styles and drop shadows follow it.'],
    ['Warp, perspective and isometric', 'Properties › Warp & perspective bends any object (arc, bulge, flag, wave, fish-eye, twist) or places it on a 3-D plane (isometric top / sides, floor, walls). Edit corners on canvas for free distort. View › Isometric Grid helps line things up.'],
    ['Cutaway', 'Properties › Cutaway: wedge or straight cut through a cell, organ or tumour, with a cut face and optional inside colour. Or select an object and a closed shape on top and choose Arrange › Cutaway › With Top Shape.'],
    ['Path tools', 'Arrange › Path: offset path (double membranes, halos), outline stroke, knife (drag across shapes), scissors (click a drawing), join / close, simplify, smooth and round corners. Rectangles can have a different radius per corner.'],
    ['Typography', 'Text: letter spacing, line height, paragraph spacing, text boxes that wrap words, columns, wrap around objects, vertical alignment, small caps and number styles. Type \\alpha, \\mu, ->, <=> or +/- for α, μ, →, ⇌, ±.'],
    ['Labels with leader lines', 'Select icons and choose Arrange › Label Selected Objects: names go in tidy columns with leader lines that follow the objects when they move.'],
    ['Graphic styles', 'Properties › Graphic style › New style from this saves the whole look (fill, gradient, pattern, outline, shading, effects, text formatting). Apply it to other objects; Update style from this changes every linked object.'],
    ['Lasso, select behind, mini-map', 'Q: lasso select. ⌥⌘-click (Ctrl+Alt-click on Windows) selects the object behind. Edit › Select Matching has same outline, fill, effects, font and graphic style. View › Zoom to Selection and View › Mini-map.'],
    ['Layout grids', 'With nothing selected, Properties › Layout grid adds columns (and rows) with gutters and margins, including journal column presets. Objects snap to the columns.'],
  );
});
