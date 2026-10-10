// Timeline builder (v1.3): paste "Day 0: tumour implant" lines and get a timeline arrow with ticks and labels, each
// event above its tick with a matching library icon. Times can be any text (Day 0, Week 2, 0 h, E12.5, P21…).
(() => {
  const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'with', 'for', 'in', 'on', 'at', 'by', 'start', 'end', 'first', 'last', 'day', 'week']);
  // Common study steps → the built-in icon that shows them (checked before the general search).
  const STEPS = [
    [/acclimati|arriv|baseline|randomi[sz]/, ['mouse', 's-mouse-soft']], [/implant|inocul|xenograft|engraft|tumou?r (cell )?inject/, ['s-tumour-bearing-mouse-xenograft']],
    [/vaccin|immuni[sz]|boost|prime/, ['s-vaccine-vial-and-syringe', 'syringe']], [/dose|treat|inject|administ|drug|therapy|i\.?p\.?|i\.?v\.?/, ['syringe']],
    [/measur|caliper|tumou?r (size|volume|growth)/, ['r-digital-caliper']], [/bleed|blood|serum|plasma/, ['s-blood-collection-tube-edta']],
    [/biops/, ['s-biopsy-needle']], [/harvest|sacrific|euthan|necrops|endpoint|collect|dissect|tissue/, ['s-scalpel']],
    [/flow|facs|cytometr/, ['s-flow-cytometer', 'r-flow-cytometer']], [/imag|microscop|ivis|histolog|stain/, ['microscope']],
    [/infect|virus|challenge/, ['virus']], [/sequenc|rna-?seq|dna|genotyp|pcr/, ['dna']], [/culture|passage|seed|plate/, ['s-cell-culture-flask']],
  ];
  function iconFor(text) {
    const low = String(text).toLowerCase();
    for (const [re, ids] of STEPS) if (re.test(low)) { const id = ids.find((x) => typeof ICON_MAP !== 'undefined' && ICON_MAP[x]); if (id) return { native: true, id }; }
    const words = String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    for (const q of [words.join(' '), ...words]) { // whole phrase first, then each word
      if (!q) continue;
      const hit = searchIcons(q, { cat: 'All', limit: 6 }).items.find((it) => it.native || it.pack !== 'phylopic');
      if (hit) return hit;
    }
    return null;
  }
  async function packIcon(it, cx, cy, size) { // a library-pack icon, loaded into the figure
    try { await ensurePackAsset(it); } catch { return null; }
    const ar = iconAspect(it.key), w = ar >= 1 ? size : size * ar, h = ar >= 1 ? size / ar : size;
    return { id: uid(), type: 'icon', iconId: it.key, x: cx - w / 2, y: cy - h / 2, w, h, rot: 0 };
  }
  function parse(text) {
    return String(text).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = /^(.+?)\s*[:–—-]\s+(.+)$/.exec(l) || /^(.+?)\s*:\s*(.+)$/.exec(l);
      return m ? { when: m[1].trim(), what: m[2].trim() } : { when: l, what: '' };
    });
  }
  async function build(rows, withIcons) {
    const W = Math.max(700, rows.length * 160), x0 = 60, x1 = x0 + W - 60, y = 300, o = [];
    const axis = Make.connector({ x: x0, y }, { x: x1, y }, { width: 4, color: '#33475b', tickLabels: rows.map((r) => r.when).join(', '), labelSize: 14 });
    o.push(axis);
    const use = (x1 - x0) - (6 + 4 * 2.2) * 1.8, tx = (i) => (rows.length > 1 ? x0 + (use * i) / (rows.length - 1) : x0);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.what) continue;
      const cap = Make.text(r.what, 0, 0, { fontSize: 14, bold: true, color: '#33475b' });
      if (typeof postEdit === 'function') postEdit(cap);
      cap.x = tx(i) - cap.w / 2; cap.y = withIcons ? 135 : 225;
      o.push(cap);
      if (withIcons) {
        const it = iconFor(r.what);
        if (it) {
          let ic = null;
          if (it.native) ic = Make.icon(it.id, tx(i) - 36, 165, 72);
          else if (!(it.kb > 2500)) ic = await packIcon(it, tx(i), 201, 72);
          if (ic) o.push(ic);
        }
      }
      o.push(Make.connector({ x: tx(i), y: withIcons ? 250 : 255 }, { x: tx(i), y: 285 }, { head: 'arrow', width: 1.5, color: '#9aa7b4', headSize: 0.7 }));
    }
    return { objects: o, width: W };
  }
  function openTimelineBuilder() {
    const ta = el('textarea', { rows: 8, style: 'width:100%;font-family:inherit', value: 'Day -7: Acclimatise\nDay 0: Tumour implant\nDay 7: Start treatment\nDay 14: Measure tumours\nDay 21: Last dose\nDay 28: Flow cytometry' });
    const icons = el('input', { type: 'checkbox', checked: true });
    const go = el('button', { class: 'primary', textContent: 'Insert timeline', onclick: async () => {
      const rows = parse(ta.value);
      if (rows.length < 2) { toast('Add at least two lines, e.g. “Day 0: implant”'); return; }
      go.disabled = true;
      const { objects } = await build(rows, icons.checked);
      closeModal();
      const at = viewCenter(), bb = unionBounds(objects.filter((x) => x.type !== 'connector'), objects);
      const ends = objects.filter((x) => x.type === 'connector').flatMap((c) => [c.from, c.to]);
      const minX = Math.min(bb.x, ...ends.map((p) => p.x)), maxX = Math.max(bb.x + bb.w, ...ends.map((p) => p.x)), dx = at.x - (minX + maxX) / 2, dy = at.y - 300;
      for (const x of objects) { if (x.type === 'connector') { x.from = { x: x.from.x + dx, y: x.from.y + dy }; x.to = { x: x.to.x + dx, y: x.to.y + dy }; } else { x.x += dx; x.y += dy; } }
      addObjects(objects);
      groupSelection();
      const g = selected()[0];
      if (g) g.name = 'Timeline';
      render({ props: true });
    } });
    openModal('Timeline builder', el('div', { style: 'width:min(560px,80vw)' },
      el('p', { class: 'note', textContent: 'One line per time point: “time: event”. Times can be anything (Day 0, Week 2, 0 h, E12.5). Icons are picked from the library by the event’s words; swap any with Replace icon.' }),
      ta, el('label', { style: 'display:flex;gap:6px;align-items:center;margin:8px 0;width:auto' }, icons, 'Add an icon above each event'), el('div', { class: 'btnrow' }, go)));
    setTimeout(() => ta.focus(), 50);
  }
  globalThis.openTimelineBuilder = openTimelineBuilder;

  // Cohort builder: "Vehicle: 8" lines → one row per group with that many animals, a colour each, and n.
  const COHORT_COLOURS = ['#7a8a96', '#4a7fd6', '#e8743b', '#3fa58b', '#9b7fd1', '#d64545', '#e8b33c', '#5bb5e0'];
  const SUBJECTS = [['mouse', 'Mice'], ['s-mouse-soft', 'Mice (soft)'], ['rat', 'Rats'], ['human', 'People'], ['s-cell-culture-flask', 'Flasks'], ['tube', 'Tubes']];
  function parseCohorts(text) {
    return String(text).split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = /^(.+?)\s*[:=(]\s*n?\s*=?\s*(\d+)\)?\s*$/i.exec(l);
      return m ? { name: m[1].trim(), n: Math.min(40, +m[2]) } : { name: l, n: 5 };
    });
  }
  globalThis.parseCohorts = parseCohorts;
  function openCohortBuilder() {
    const ta = el('textarea', { rows: 6, style: 'width:100%;font-family:inherit', value: 'Vehicle: 8\nDrug A 10 mg/kg: 8\nDrug A 30 mg/kg: 8\nDrug A + anti-PD-1: 8' });
    const subj = el('select', {}, ...SUBJECTS.filter(([id]) => typeof ICON_MAP === 'undefined' || ICON_MAP[id]).map(([id, l]) => el('option', { value: id, textContent: l })));
    const go = el('button', { class: 'primary', textContent: 'Insert groups', onclick: () => {
      const groups = parseCohorts(ta.value);
      if (!groups.length) return;
      const at = viewCenter(), size = 44, gapX = 8, rowH = size + 26, labelW = 190, o = [];
      const maxN = Math.max(...groups.map((g) => g.n)), W = labelW + maxN * (size + gapX), H = groups.length * rowH;
      const x0 = at.x - W / 2, y0 = at.y - H / 2;
      groups.forEach((g, gi) => {
        const col = COHORT_COLOURS[gi % COHORT_COLOURS.length], y = y0 + gi * rowH;
        const label = Make.text(`{b|${g.name}}\nn = ${g.n}`, x0, y + 4, { fontSize: 13, color: '#222222' });
        if (typeof postEdit === 'function') postEdit(label);
        o.push(label);
        for (let i = 0; i < g.n; i++) o.push(Make.icon(subj.value, x0 + labelW + i * (size + gapX), y, size, { color: col }));
      });
      closeModal();
      addObjects(o);
      groupSelection();
      const grp = selected()[0];
      if (grp) grp.name = 'Study groups';
      render({ props: true });
    } });
    openModal('Cohort builder', el('div', { style: 'width:min(520px,80vw)' },
      el('p', { class: 'note', textContent: 'One line per group: “name: number”. Each group gets its own colour; ungroup to recolour or mark animals.' }),
      ta, el('div', { class: 'row', style: 'margin:8px 0' }, el('label', { textContent: 'Show as' }), subj), el('div', { class: 'btnrow' }, go)));
  }
  ARRANGE_COMMANDS.cohortBuilder = openCohortBuilder;

  // Gating strategy: "Lymphocytes > Single cells > Live > CD3+ > CD4+ / CD8+" → gated dot plots joined by arrows.
  function parseGates(text) {
    return String(text).split(/>|→|\n/).map((x) => x.trim()).filter(Boolean).map((step) => step.split(/\s*\/\s*|\s*\|\s*/).filter(Boolean));
  }
  globalThis.parseGates = parseGates;
  function openGatingBuilder() {
    const ta = el('textarea', { rows: 3, style: 'width:100%;font-family:inherit', value: 'Lymphocytes > Single cells > Live > CD3+ > CD4+ / CD8+' });
    const go = el('button', { class: 'primary', textContent: 'Insert gating strategy', onclick: () => {
      const steps = parseGates(ta.value);
      if (!steps.length) return;
      const plotId = ['s-flow-cytometry-dot-plot-with-gate', 's-flow-cytometry-quadrant-plot', 'r-flow-cytometry-plot'].find((id) => typeof ICON_MAP !== 'undefined' && ICON_MAP[id]);
      const size = 80, gapX = 70, colW = size + gapX, at = viewCenter(), o = [];
      const x0 = at.x - (steps.length * colW - gapX) / 2;
      let prev = [];
      steps.forEach((names, si) => {
        const colH = names.length * (size + 40) - 40, cur = [];
        names.forEach((nm, ni) => {
          const x = x0 + si * colW, y = at.y - colH / 2 + ni * (size + 40);
          const ic = plotId ? Make.icon(plotId, x, y, size) : Make.rect(x, y, size, size, { fill: '#f4f6fa', stroke: '#7a8a96' });
          const lab = Make.text(`{b|${nm}}`, 0, 0, { fontSize: 13, color: '#222222' });
          if (typeof postEdit === 'function') postEdit(lab);
          lab.x = x + size / 2 - lab.w / 2; lab.y = y + size + 4;
          o.push(ic, lab);
          for (const p of prev) o.push(Make.connector({ id: p.id, port: 'e' }, { id: ic.id, port: 'w' }, { head: 'arrow', width: 2, color: '#56657a', style: names.length > 1 || prev.length > 1 ? 'elbow' : 'straight', radius: 8 }));
          cur.push(ic);
        });
        prev = cur;
      });
      closeModal();
      addObjects(o);
      groupSelection();
      const g = selected()[0];
      if (g) g.name = 'Gating strategy';
      render({ props: true });
    } });
    openModal('Gating strategy builder', el('div', { style: 'width:min(560px,80vw)' },
      el('p', { class: 'note', textContent: 'Gates from parent to child separated by “>”; split a gate with “/” (CD4+ / CD8+). Each gate is a dot-plot icon you can replace with your own plots.' }),
      ta, el('div', { class: 'btnrow', style: 'margin-top:8px' }, go)));
  }
  ARRANGE_COMMANDS.gatingBuilder = openGatingBuilder;

  // Western blot schematic: lanes, then "Protein (42 kDa): 0.1, 0.8, 1" rows of band intensities (0–1).
  function parseBlot(text) {
    let lanes = [];
    const rows = [];
    for (const raw of String(text).split('\n')) {
      const l = raw.trim();
      if (!l) continue;
      const m = /^(.+?)\s*:\s*(.*)$/.exec(l);
      if (!m) continue;
      if (/^lanes?$/i.test(m[1].trim())) { lanes = m[2].split(',').map((x) => x.trim()).filter(Boolean); continue; }
      const kd = /\(([^)]*kda[^)]*)\)/i.exec(m[1]);
      rows.push({ name: m[1].replace(/\([^)]*kda[^)]*\)/i, '').trim(), kda: kd ? kd[1].trim() : '', bands: m[2].split(',').map((x) => Math.max(0, Math.min(1, parseFloat(x) || 0))) });
    }
    const n = Math.max(lanes.length, ...rows.map((r) => r.bands.length), 1);
    while (lanes.length < n) lanes.push(`Lane ${lanes.length + 1}`);
    return { lanes, rows };
  }
  globalThis.parseBlot = parseBlot;
  function openBlotBuilder() {
    const ta = el('textarea', { rows: 6, style: 'width:100%;font-family:inherit', value: "Lanes: Ctrl, EGF 5', EGF 15', EGF 30'\np-ERK (42 kDa): 0.1, 0.8, 1, 0.6\nTotal ERK (42 kDa): 1, 1, 1, 1\nGAPDH (37 kDa): 1, 1, 1, 1" });
    const go = el('button', { class: 'primary', textContent: 'Insert blot', onclick: () => {
      const { lanes, rows } = parseBlot(ta.value);
      if (!rows.length) { toast('Add at least one protein line, e.g. “GAPDH (37 kDa): 1, 1, 1”'); return; }
      const laneW = 46, stripH = 30, gap = 12, at = viewCenter(), o = [];
      const W = lanes.length * laneW, x0 = at.x - W / 2, y0 = at.y - (rows.length * (stripH + gap)) / 2;
      lanes.forEach((ln, i) => { // lane labels, angled
        const t = Make.text(ln, 0, 0, { fontSize: 12, color: '#222222' });
        if (typeof postEdit === 'function') postEdit(t);
        t.x = x0 + i * laneW + laneW / 2 - 4; t.y = y0 - 12 - t.h; t.rot = -40;
        t.x -= t.w / 2 * Math.cos(40 * Math.PI / 180) - 6; t.y -= t.w / 2 * Math.sin(40 * Math.PI / 180) - 4;
        o.push(t);
      });
      rows.forEach((r, ri) => {
        const y = y0 + ri * (stripH + gap);
        o.push(Make.rect(x0 - 4, y, W + 8, stripH, { fill: '#f1f1ef', stroke: '#b9b9b5', strokeWidth: 1, radius: 2 }));
        r.bands.forEach((v, i) => { if (v > 0) o.push(Make.ellipse(x0 + i * laneW + 6, y + stripH / 2 - 5, laneW - 12, 10, { fill: '#1d1d1d', stroke: 'none', opacity: Math.max(0.08, v), blur: 0.6 })); });
        const nm = Make.text(r.name, 0, 0, { fontSize: 13, color: '#222222', bold: true });
        if (typeof postEdit === 'function') postEdit(nm);
        nm.x = x0 - 12 - nm.w; nm.y = y + stripH / 2 - nm.h / 2;
        o.push(nm);
        if (r.kda) { const kd = Make.text(r.kda, x0 + W + 12, 0, { fontSize: 12, color: '#56657a' }); if (typeof postEdit === 'function') postEdit(kd); kd.y = y + stripH / 2 - kd.h / 2; o.push(kd); }
      });
      closeModal();
      addObjects(o);
      groupSelection();
      const g = selected()[0];
      if (g) g.name = 'Western blot';
      render({ props: true });
    } });
    openModal('Western blot builder', el('div', { style: 'width:min(560px,80vw)' },
      el('p', { class: 'note', textContent: 'First line: lane names. Then one line per protein with band intensities from 0 (none) to 1 (strongest); put the size in brackets, e.g. “GAPDH (37 kDa)”.' }),
      ta, el('div', { class: 'btnrow', style: 'margin-top:8px' }, go)));
  }
  ARRANGE_COMMANDS.blotBuilder = openBlotBuilder;
  globalThis.parseTimeline = parse;
  ARRANGE_COMMANDS.timelineBuilder = openTimelineBuilder;
})();
