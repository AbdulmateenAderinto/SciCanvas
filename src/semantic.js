// Icons with meaning (v1.9), starting with antibodies. Each full-IgG icon knows which way its antigen-binding
// arms (Fab) point at rotation 0 (measured from the drawings; all point up) and how far the arm tips sit from the
// centre. With antibodies and one target selected:
//   - Aim at target turns each antibody so its arms face the target;
//   - Dock on target also moves it so the arm tips just touch the target's outline (Fc pointing away).
// This replaces rotating by eye, which is easy to get backwards (Fc towards the antigen).
(() => {
  const FAB_UP = ['antibody', 'im-igg', 's-igg-antibody-soft', 's-bispecific-antibody', 's-fluorophore-labelled-antibody', 'r-antibody-igg', 'r-antibody-simple',
    's-antibody-fitc-conjugate', 's-antibody-pe-conjugate', 's-antibody-apc-conjugate', 's-antibody-bv421-conjugate', 's-antibody-pe-cy7-conjugate',
    's-antibody-alexa-fluor-647-conjugate', 's-antibody-percp-cy5-5-conjugate', 's-antibody-alexa-fluor-488-conjugate'];
  const ANCHORS = Object.fromEntries(FAB_UP.map((id) => [id, { fab: -90, tip: 0.47 }]));
  const anchorsOf = (o) => (o && o.type === 'icon' && ANCHORS[o.iconId]) || null;
  const isAntibody = (o) => !!anchorsOf(o);
  const centre = (o) => ({ x: o.x + o.w / 2, y: o.y + o.h / 2 });
  // Distance from the centre of the target's ellipse-ish outline to its edge, along angle t.
  const edgeRadius = (o, t) => { const a = o.w / 2, b = o.h / 2; return (a * b) / Math.sqrt((b * Math.cos(t)) ** 2 + (a * Math.sin(t)) ** 2 || 1); };

  function aim(ab, target, dock) {
    const an = anchorsOf(ab), c = centre(target), m = centre(ab);
    const t = Math.atan2(c.y - m.y, c.x - m.x);
    ab.rot = ((((t * 180) / Math.PI - an.fab) % 360) + 360) % 360;
    if (!dock) return;
    const reach = edgeRadius(target, t) + an.tip * Math.max(ab.w, ab.h) - 1;
    ab.x = c.x - Math.cos(t) * reach - ab.w / 2;
    ab.y = c.y - Math.sin(t) * reach - ab.h / 2;
  }
  function pick() {
    const sel = selected(), abs = sel.filter(isAntibody), others = sel.filter((o) => !isAntibody(o) && o.type !== 'connector');
    if (!abs.length || others.length !== 1) { toast('Select one or more antibodies and the one object they should bind'); return null; }
    return { abs, target: others[0] };
  }
  const run = (dock) => () => {
    const p = pick();
    if (!p) return;
    checkpoint(dock ? 'dock' : 'aim');
    p.abs.forEach((ab) => aim(ab, p.target, dock));
    render(); markDirty();
    toast(`${dock ? 'Docked' : 'Aimed'} ${p.abs.length} antibod${p.abs.length > 1 ? 'ies' : 'y'} on the target`);
  };
  ARRANGE_COMMANDS.aimAntibodies = run(false);
  ARRANGE_COMMANDS.dockAntibodies = run(true);

  const prevMenu = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu(), sel = selected();
    if (sel.some(isAntibody) && sel.filter((o) => !isAntibody(o) && o.type !== 'connector').length === 1) {
      t.push({ label: 'Dock antibodies on target (arms touching)', cmd: 'dockAntibodies' }, { label: 'Aim antibodies at target', cmd: 'aimAntibodies' });
    }
    return t;
  };
  Object.assign(globalThis, { antibodyAnchors: anchorsOf, aimAntibody: aim });
})();
