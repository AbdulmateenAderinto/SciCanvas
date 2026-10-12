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
  // ---------- Ring around a target ----------
  // Evenly spaced copies of an icon around a target's outline, either sitting on the surface facing out (base on the
  // outline, like a B-cell receptor) or binding it (arms on the outline). Icons without anchors face "up" at rot 0.
  // The drawn outline of an icon or picture, measured from a render (its box has padding around the drawing):
  // a function giving the distance from the box centre to the last painted pixel at angle t. Shapes use geometry.
  async function measureOutline(o) {
    if (!['icon', 'image'].includes(o.type) || typeof rasterize !== 'function') return null;
    const k = Math.min(2, 240 / Math.max(o.w, o.h)), W = Math.ceil(o.w * k), H = Math.ceil(o.h * k);
    const url = await rasterize({ width: o.w, height: o.h, background: 'transparent', objects: [{ ...o, x: 0, y: 0, rot: 0 }] }, k, { mime: 'image/png', transparent: true });
    const im = new Image(); await new Promise((r) => { im.onload = r; im.src = url; });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(im, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data, cx = W / 2, cy = H / 2, N = 120, radii = [];
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2; let last = 0;
      for (let r = 0; r < Math.hypot(W, H) / 2; r += 0.5) { const x = Math.round(cx + r * Math.cos(t)), y = Math.round(cy + r * Math.sin(t)); if (x < 0 || y < 0 || x >= W || y >= H) break; if (d[(y * W + x) * 4 + 3] > 60) last = r; }
      radii.push(last / k);
    }
    return (t) => { const f = ((((t / (Math.PI * 2)) % 1) + 1) % 1) * N, i0 = Math.floor(f) % N, i1 = (i0 + 1) % N, w = f - Math.floor(f); return radii[i0] * (1 - w) + radii[i1] * w; };
  }
  function ringAround(item, target, { n = 8, facing = 'out', start = -90, gap = 0, outline = null } = {}) {
    const an = anchorsOf(item) || { fab: -90, tip: 0.47 }, c = centre(target), size = Math.max(item.w, item.h), out = [];
    for (let k = 0; k < n; k++) {
      const deg = start + (k * 360) / n, t = (deg * Math.PI) / 180, u = [Math.cos(t), Math.sin(t)];
      const edge = outline ? outline(t) : edgeRadius(target, t), reach = edge + an.tip * size + gap;
      const o = JSON.parse(JSON.stringify(item));
      o.id = uid();
      const face = facing === 'out' ? deg : deg + 180;            // direction the arms (top) point
      o.rot = ((((face - an.fab) % 360) + 360) % 360);
      o.x = c.x + u[0] * reach - o.w / 2; o.y = c.y + u[1] * reach - o.h / 2;
      out.push(o);
    }
    return out;
  }
  function ringDialog() {
    const sel = selected();
    if (sel.length !== 2 || sel.some((o) => o.type === 'connector')) { toast('Select the item to repeat and the target to ring it around'); return; }
    const [item, target] = sel[0].w * sel[0].h <= sel[1].w * sel[1].h ? sel : [sel[1], sel[0]];
    const v = { n: 8, facing: isAntibody(item) ? 'in' : 'out', start: -90, gap: 0, keep: false };
    const num = (k, min, max) => el('input', { type: 'number', min, max, value: v[k], style: 'width:80px', oninput: (e) => { v[k] = +e.target.value; } });
    const face = el('select', { onchange: (e) => { v.facing = e.target.value; } },
      el('option', { value: 'out', textContent: 'On its surface, facing out (e.g. B-cell receptors)', selected: v.facing === 'out' }),
      el('option', { value: 'in', textContent: 'Binding it, facing in (e.g. antibodies on an antigen)', selected: v.facing === 'in' }));
    const keep = el('input', { type: 'checkbox', onchange: (e) => { v.keep = e.target.checked; } });
    openModal('Ring around target', el('div', { style: 'min-width:420px' },
      row('Copies', num('n', 2, 72)), row('Facing', face), row('Start angle (°)', num('start', -360, 360)), row('Gap (px)', num('gap', -50, 200)),
      row('', el('label', { style: 'display:flex;gap:6px;align-items:center;width:auto' }, keep, 'Keep the original where it is')),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Place', async () => {
        checkpoint('ring');
        const outline = await measureOutline(target).catch(() => null);
        const copies = ringAround(item, target, { ...v, outline }), list = page().objects;
        if (!v.keep) { const i = list.indexOf(item); if (i >= 0) list.splice(i, 1); }
        list.push(...copies);
        state.sel = copies.map((o) => o.id);
        closeModal(); render(); markDirty();
        toast(`${copies.length} copies placed around the target`);
      }, 'primary'))));
  }
  ARRANGE_COMMANDS.ringAround = ringDialog;
  const prevMenu2 = contextMenuTemplate;
  contextMenuTemplate = function () {
    const t = prevMenu2(), sel = selected();
    if (sel.length === 2 && !sel.some((o) => o.type === 'connector')) t.push({ label: 'Ring around target…', cmd: 'ringAround' });
    return t;
  };
  Object.assign(globalThis, { antibodyAnchors: anchorsOf, aimAntibody: aim, ringAround, measureOutline });
})();
