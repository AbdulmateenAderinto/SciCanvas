// Draft polish (v1.9): AI-generated figure drafts go through the same review a person would apply, before you see
// them. Antibodies are turned to face the nearest object they could bind (drafts often draw them backwards), and the
// review's safe fixes are applied: overlapping text separated, labels that run outside their panel moved back in.
// The draft dialog then says what was fixed.
(() => {
  if (typeof aiToObjects !== 'function') return;
  const SAFE_FIXES = new Set(['Separate', 'Move inside']);

  async function polishDraft(objs, width, height) {
    let aimed = 0, fixed = 0;
    if (typeof antibodyAnchors === 'function' && typeof aimAntibody === 'function') {
      const targets = objs.filter((o) => !antibodyAnchors(o) && ['icon', 'ellipse', 'rect', 'shape', 'image'].includes(o.type) && o.w * o.h < width * height * 0.25);
      for (const ab of objs.filter((o) => antibodyAnchors(o))) {
        const c = { x: ab.x + ab.w / 2, y: ab.y + ab.h / 2 }, reach = 2.5 * Math.max(ab.w, ab.h);
        let best = null, bestD = Infinity;
        for (const t of targets) {
          const tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 }, d = Math.hypot(tc.x - c.x, tc.y - c.y) - Math.max(t.w, t.h) / 2;
          if (d < reach && d < bestD) { best = t; bestD = d; }
        }
        if (best) { aimAntibody(ab, best, false); aimed++; }
      }
    }
    if (typeof checkFigure === 'function') {
      const pg = { width, height, background: '#ffffff', objects: objs, name: 'AI draft' };
      try {
        const r = await checkFigure(pg);
        for (const i of r.issues) if (i.fix && SAFE_FIXES.has(i.fixLabel)) { i.fix(); fixed++; }
      } catch { /* a check that needs the live page; skip */ }
    }
    return { aimed, fixed };
  }

  const prev = aiToObjects;
  aiToObjects = async function (draft, ...rest) {
    const objs = await prev(draft, ...rest);
    const r = await polishDraft(objs, (draft && draft.width) || 1000, (draft && draft.height) || 650);
    globalThis.lastDraftPolish = r;
    if (r.aimed || r.fixed) setTimeout(() => toast(`Draft reviewed: ${[r.aimed && `${r.aimed} antibod${r.aimed > 1 ? 'ies' : 'y'} aimed at ${r.aimed > 1 ? 'their targets' : 'its target'}`, r.fixed && `${r.fixed} layout fix${r.fixed > 1 ? 'es' : ''}`].filter(Boolean).join(', ')}`, 4000), 0);
    return objs;
  };
  globalThis.polishDraft = polishDraft;
})();
