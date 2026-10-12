// Review (v1.9): more of what a careful reader checks before submission, plus seeing the figure at print size.
//   - Check › objects that poke out of the panel box they sit in (a label running past its card), with a fix that
//     moves them back inside.
//   - View › Print Size: the page at the physical width it will print (the journal width chosen in the Check tab,
//     else 174 mm full width), so text size can be judged by eye. Screens differ, so a one-time calibration
//     (match a bank card) makes millimetres on screen real millimetres.
(() => {
  if (typeof checkFigure !== 'function') return;
  const CARD_MM = 85.6; // ISO/IEC 7810 ID-1 card width
  const KEY = 'scicanvas:pxPerMM';
  const pxPerMM = () => { try { const v = +localStorage.getItem(KEY); if (v > 1) return v; } catch { /* no storage */ } return 96 / 25.4; };

  // ---------- Check: objects poking out of their panel ----------
  const prevCheck = checkFigure;
  checkFigure = async function (p = page()) {
    const r = await prevCheck(p);
    const list = p.objects, B = (o) => bounds(o, list);
    const panels = list.filter((o) => ['rect', 'shape'].includes(o.type) && !o.hidden && o.w > 160 && o.h > 120 && !o.label);
    const nameOf = (o) => (o.name || o.text || o.label || (typeof layerName === 'function' ? layerName(o) : o.type) || '').toString().replace(/\n/g, ' ').slice(0, 40);
    for (const o of list) {
      if (o.hidden || o.locked || panels.includes(o) || o.type === 'connector') continue;
      const b = B(o), area = Math.max(1, b.w * b.h);
      // the smallest panel that holds most of this object
      const host = panels.filter((pn) => pn !== o && pn.w * pn.h > area * 2).map((pn) => {
        const ix = Math.max(0, Math.min(b.x + b.w, pn.x + pn.w) - Math.max(b.x, pn.x)), iy = Math.max(0, Math.min(b.y + b.h, pn.y + pn.h) - Math.max(b.y, pn.y));
        return { pn, frac: (ix * iy) / area };
      }).filter((h) => h.frac >= 0.35 && h.frac < 0.999).sort((a, c) => a.pn.w * a.pn.h - c.pn.w * c.pn.h)[0];
      if (!host) continue;
      const pn = host.pn, pad = 4;
      const dx = b.x < pn.x + pad ? pn.x + pad - b.x : b.x + b.w > pn.x + pn.w - pad ? pn.x + pn.w - pad - (b.x + b.w) : 0;
      const dy = b.y < pn.y + pad ? pn.y + pad - b.y : b.y + b.h > pn.y + pn.h - pad ? pn.y + pn.h - pad - (b.y + b.h) : 0;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      r.issues.push({ sev: 'warn', kind: 'Layout', id: o.id, msg: `${nameOf(o) || 'An object'} runs ${Math.round(Math.hypot(dx, dy))} px outside the panel it sits in.`,
        fix: () => { o.x += dx; o.y += dy; }, fixLabel: 'Move inside' });
    }
    return r;
  };

  // ---------- View › Print Size ----------
  function printWidthMM(p) {
    const jd = state.doc.journal;
    return jd && jd.widthMM ? jd.widthMM : 174;
  }
  function printSize() {
    const p = page(), mm = printWidthMM(p), r = svg.getBoundingClientRect();
    state.zoom = Math.max(0.05, Math.min(8, (mm * pxPerMM()) / p.width));
    state.panX = Math.max(20, (r.width - p.width * state.zoom) / 2);
    state.panY = 30;
    applyViewport(); renderOverlay();
    const calibrated = (() => { try { return !!localStorage.getItem(KEY); } catch { return false; } })();
    toast(`Print size: ${mm} mm wide${state.doc.journal && state.doc.journal.widthMM ? '' : ' (full width; pick a journal width in the Check tab)'}${calibrated ? '' : ' · approximate until you calibrate (View › Calibrate Print Size)'}`);
  }
  function calibrate() {
    let v = pxPerMM();
    const card = el('div', { style: `width:${CARD_MM * v}px;height:${54 * v}px;border-radius:${3 * v}px;background:linear-gradient(135deg,#dfe8f5,#b9cbe6);border:1px solid #7d8996;margin:14px 0` });
    const slider = el('input', { type: 'range', min: 2, max: 12, step: 0.01, value: v, style: 'width:100%', oninput: (e) => { v = +e.target.value; card.style.width = CARD_MM * v + 'px'; card.style.height = 54 * v + 'px'; } });
    const body = el('div', { style: 'max-width:640px' },
      el('p', { textContent: 'Hold a bank or ID card against the screen and drag the slider until the blue card is exactly the same width. SciCanvas then shows View › Print Size at true size on this screen.' }),
      card, slider,
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Save', () => { try { localStorage.setItem(KEY, String(v)); } catch { /* no storage */ } closeModal(); printSize(); }, 'primary')));
    openModal('Calibrate print size', body);
  }
  ARRANGE_COMMANDS.printSize = printSize;
  ARRANGE_COMMANDS.calibratePrintSize = calibrate;
  globalThis.Review = { printWidthMM, pxPerMM };
})();
