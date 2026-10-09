// AI suite (Claude via your Anthropic API key): Leo-style figure planner, protocol / timeline / flowchart
// generation, icon restyling, edit-with-instructions, text removal, smart icon search, title & legend
// narration. Plus non-AI background removal by edge colour.

const cleanErr = (e) => String(e && e.message ? e.message : e).replace(/^Error invoking remote method[^:]*: (Error: )?/, '');
async function aiCall({ system, prompt, schema, image }) {
  if (!appSettings.hasApiKey) { toast('Add your Anthropic API key in Settings first'); openSettingsDialog(); throw new Error('No API key set'); }
  return window.native.aiGenerate({ system, prompt, image, schema });
}
const sObj = (props, req = Object.keys(props)) => ({ type: 'object', additionalProperties: false, required: req, properties: props });
const sArr = (items) => ({ type: 'array', items });
const sStr = { type: 'string' }, sNum = { type: 'number' };
const AI_NOTE = 'Uses Claude via your Anthropic API key (Settings). What you send is processed by Anthropic.';
async function pageImage(p, max = 1400) {
  const k = Math.min(1, max / Math.max(p.width, p.height));
  return rasterize(p, k, { mime: 'image/jpeg' });
}
function selectionImage() { const p = selectionPage(8); return rasterize(p, Math.min(3, 1024 / Math.max(p.width, p.height)), { mime: 'image/png', transparent: true }); }
async function resolveIcon(query) {
  const best = bestIconFor(query || 'cell');
  if (!best) return '';
  if (!best.native) { try { await ensurePackAsset(best); } catch { return ''; } }
  return best.key;
}
function busy(button, text) { const old = button.textContent; button.disabled = true; button.textContent = text; return () => { button.disabled = false; button.textContent = old; }; }

// ---------- Smart (natural-language) icon search ----------
const smartCache = new Map();
async function smartSearch() {
  const q = $('#search').value.trim();
  if (!q) { toast('Type what you are looking for, e.g. “immune cell attacking a tumour”'); $('#search').focus(); return; }
  if (!smartCache.has(q)) {
    toast('Smart search: asking Claude for matching icon terms…');
    try {
      const r = await aiCall({
        system: 'You help researchers find icons in scientific icon libraries (Bioicons, Reactome — proteins/receptors/compounds by gene name —, PhyloPic — organisms by scientific name — and Health Icons). Respond with the JSON schema.',
        prompt: `Find icons for: "${q}". Return 4–10 short search terms (1–3 words each) that are likely to appear in icon names: concrete objects, cell types, molecules (gene symbols where relevant), organisms (include the scientific name), lab equipment.`,
        schema: sObj({ terms: sArr(sStr) }),
      });
      smartCache.set(q, r.terms.slice(0, 10));
    } catch (e) { toast('Smart search failed: ' + cleanErr(e), 4000); return; }
  }
  Packs.smart = { query: q, terms: smartCache.get(q) };
  renderLibrary();
}
function smartResults(q) {
  if (!Packs.smart || Packs.smart.query !== q) return null;
  const seen = new Set(), items = [];
  for (const t of Packs.smart.terms) for (const it of searchIcons(t, { limit: 30 }).items) if (!seen.has(it.key)) { seen.add(it.key); items.push(it); }
  return { total: items.length, items, terms: Packs.smart.terms };
}

// ---------- Title & legend (Narrate) ----------
async function narrateFigure() {
  const out = el('div', { class: 'report', style: 'min-height:120px' }, 'Reading the figure…');
  openModal('Suggest title & legend', el('div', { style: 'max-width:640px' }, out, el('div', { class: 'note', style: 'margin-top:8px' }, AI_NOTE)));
  try {
    const labels = objs().flatMap((o) => [o.text, o.label, o.cfg && o.cfg.title, o.name].filter(Boolean)).join(' | ').slice(0, 3000);
    const r = await aiCall({
      system: 'You write concise, accurate figure titles and legends for scientific papers. Describe only what is shown; do not invent results or claims. Respond with the JSON schema.',
      prompt: `Write a title and legend for this figure. Text on the figure: ${labels || '(none)'}`,
      image: await pageImage(page()),
      schema: sObj({ title: sStr, short_description: sStr, figure_legend: sStr, alt_text: sStr }),
    });
    out.innerHTML = '';
    const blockF = (label, text, insert) => el('div', { style: 'margin-bottom:12px' }, el('b', { textContent: label }), el('div', { style: 'white-space:pre-wrap;margin:4px 0', textContent: text }),
      el('div', { class: 'btnrow' }, btn('Copy', () => { navigator.clipboard.writeText(text); toast('Copied'); }), insert ? btn('Add to figure', () => { insert(text); closeModal(); }) : null));
    out.append(
      blockF('Title', r.title, (t) => addObjects([Make.text(t, 30, 16, { fontSize: 24, bold: true })])),
      blockF('Short description', r.short_description),
      blockF('Figure legend', r.figure_legend, (t) => { const P = page(); addObjects([Make.text(t.replace(/(.{1,110})(\s|$)/g, '$1\n').trim(), 30, P.height - 120, { fontSize: 12, color: '#444444' })]); }),
      blockF('Alt text (accessibility)', r.alt_text),
      el('div', { class: 'note' }, 'Check every statement against your data before using it.'));
  } catch (e) { out.textContent = cleanErr(e); }
}

// ---------- Generate protocol from written methods ----------
async function generateProtocol() {
  const ta = el('textarea', { rows: 9, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Paste your methods text, e.g. “PBMCs were isolated by Ficoll gradient, stained with anti-CD3/CD28 for 30 min at 4 °C, washed twice and analysed on a BD Fortessa…”' });
  const status = el('div', { class: 'note' });
  const go = btn('Generate protocol', async () => {
    const done = busy(go, 'Generating…');
    try {
      const r = await aiCall({
        system: 'You turn written experimental methods into a clear step-by-step protocol diagram. Keep only real steps from the text, in order, merged into 4–10 concise steps (≤ 6 words each, include key conditions like time/temperature when short). Respond with the JSON schema.',
        prompt: ta.value,
        schema: sObj({ title: sStr, steps: sArr(sObj({ title: sStr, icon: sStr })) }),
      });
      status.textContent = 'Finding icons…';
      const steps = [];
      for (const s of r.steps) steps.push({ title: s.title, icon: await resolveIcon(s.icon) });
      const c = viewCenter();
      const o = Make.protocol(steps, c.x - 380, c.y - 120, 760, { title: r.title });
      addObjects([o]);
      closeModal();
      toast('Protocol added — double-click it to edit steps');
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  }, 'primary');
  openModal('Generate protocol from methods', el('div', { style: 'max-width:640px' }, ta, el('div', { class: 'actions' }, status, btn('Cancel', closeModal), go), el('div', { class: 'note' }, 'Each step gets an icon "query" in the instruction field. ' + AI_NOTE)));
  setTimeout(() => ta.focus(), 30);
}

// ---------- Generate timeline ----------
function buildTimeline(r, width = 1100) {
  const o = [], times = r.events.map((e) => +e.time).filter(isFinite);
  const t0 = Math.min(...times), t1 = Math.max(...times), span = t1 - t0 || 1, x0 = 80, x1 = width - 80, y = 230;
  o.push(Make.text(r.title, 40, 20, { fontSize: 24, bold: true }));
  o.push(Make.rect(x0 - 20, y - 7, x1 - x0 + 40, 14, { fill: '#7a8a96', stroke: 'none', radius: 7 }), Make.shape('arrow', x1 + 10, y - 21, 50, 42, { fill: '#7a8a96', stroke: 'none' }));
  r.events.forEach((e, i) => {
    const x = x0 + ((+e.time - t0) / span) * (x1 - x0), above = i % 2 === 0;
    o.push(Make.badge(i + 1, x, y));
    if (e._icon) o.push({ id: uid(), type: 'icon', iconId: e._icon, x: x - 30, y: above ? 90 : 268, w: 60, h: 60 / iconAspect(e._icon), rot: 0, color: ICON_MAP[e._icon] ? ICON_MAP[e._icon].color : undefined });
    const t = Make.text(`${r.unit ? `${r.unit} ` : ''}${e.time}`.trim(), 0, above ? 62 : 340, { fontSize: 13, bold: true, align: 'center' }); t.x = x - t.w / 2;
    const l = Make.text(e.label + (e.detail ? `\n${e.detail}` : ''), 0, above ? y - 62 : y + 24 + 120, { fontSize: 12, align: 'center', color: '#444444' }); l.x = x - l.w / 2;
    if (above) l.y = y - 16 - l.h - 4 - 0; // keep labels clear of the axis
    o.push(t, l);
  });
  // Lay above-axis labels between icon and axis.
  return { objects: o, width, height: 420 };
}
async function generateTimeline() {
  const ta = el('textarea', { rows: 7, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Describe the schedule, e.g. “Mice implanted with B16 tumours on day 0, randomised day 7, anti-PD-1 on days 8, 11, 14, bleeds on day 10 and 17, endpoint day 21 for flow and histology.”' });
  const status = el('div', { class: 'note' });
  const go = btn('Generate timeline', async () => {
    const done = busy(go, 'Generating…');
    try {
      const r = await aiCall({
        system: 'You turn an experimental schedule into timeline events. Use only events in the text. time is a number on one consistent scale (e.g. day number); unit is the scale word (e.g. "Day"). label ≤ 4 words, detail ≤ 6 words or "". icon is a 1–3 word icon search query. Respond with the JSON schema.',
        prompt: ta.value,
        schema: sObj({ title: sStr, unit: sStr, events: sArr(sObj({ time: sNum, label: sStr, detail: sStr, icon: sStr })) }),
      });
      status.textContent = 'Finding icons…';
      for (const e of r.events) e._icon = await resolveIcon(e.icon);
      const t = buildTimeline(r);
      checkpoint();
      const p = newPage(r.title || 'Timeline', t.width + 40, t.height);
      p.objects = t.objects;
      state.doc.pages.splice(state.pageIndex + 1, 0, p);
      closeModal(); gotoPage(state.pageIndex + 1);
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  }, 'primary');
  openModal('Generate timeline', el('div', { style: 'max-width:640px' }, ta, el('div', { class: 'actions' }, status, btn('Cancel', closeModal), go), el('div', { class: 'note' }, 'Opens as a new page you can edit. ' + AI_NOTE)));
  setTimeout(() => ta.focus(), 30);
}

// ---------- Generate flowchart ----------
function buildFlowchart(r) {
  const nodes = r.nodes, edges = r.edges.filter((e) => nodes.some((n) => n.id === e.from) && nodes.some((n) => n.id === e.to));
  const rank = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  for (let it = 0; it < nodes.length; it++) for (const e of edges) if (rank[e.to] <= rank[e.from] && it < nodes.length - 1) { const back = nodes.findIndex((n) => n.id === e.to) < nodes.findIndex((n) => n.id === e.from); if (!back) rank[e.to] = rank[e.from] + 1; }
  // Pull nodes down so they sit just above their nearest child (shorter edges, fewer crossings).
  for (let it = 0; it < nodes.length; it++) {
    for (const n of nodes) {
      const kids = edges.filter((e) => e.from === n.id && rank[e.to] > rank[n.id]).map((e) => rank[e.to]);
      const hasParent = edges.some((e) => e.to === n.id);
      if (kids.length && hasParent) rank[n.id] = Math.max(rank[n.id], Math.min(...kids) - 1);
    }
  }
  const byRank = {};
  nodes.forEach((n) => (byRank[rank[n.id]] ||= []).push(n));
  // Order each row by the average position of its parents (barycentre heuristic).
  const pos = {};
  Object.keys(byRank).sort((a, b) => a - b).forEach((rk) => {
    const list = byRank[rk];
    const bary = (n) => { const ps = edges.filter((e) => e.to === n.id && pos[e.from] != null).map((e) => pos[e.from]); return ps.length ? ps.reduce((x, y) => x + y, 0) / ps.length : list.indexOf(n); };
    list.sort((a, b) => bary(a) - bary(b));
    list.forEach((n, i) => { pos[n.id] = i - (list.length - 1) / 2; });
  });
  const LR = r.direction === 'LR', NW = 190, NH = 74, GX = 70, GY = 70;
  const maxPer = Math.max(...Object.values(byRank).map((l) => l.length));
  const objsOut = [], map = {};
  const shapeFor = (n, x, y) => {
    const base = { label: n.label, labelSize: 14 };
    switch (n.kind) {
      case 'decision': return Make.shape('diamond', x - 10, y - 14, NW + 20, NH + 28, { ...base, fill: '#fdf0e6', stroke: '#e8743b' });
      case 'start': case 'end': return Make.shape('pill', x, y, NW, NH - 10, { ...base, fill: '#e9f6ee', stroke: '#3fa55b' });
      case 'data': return Make.shape('parallelogram', x, y, NW, NH, { ...base, fill: '#f1ebfa', stroke: '#9b7fd1' });
      default: return Make.rect(x, y, NW, NH, { ...base, fill: '#e8f0fb', stroke: '#4a7fd6', radius: 10 });
    }
  };
  Object.entries(byRank).forEach(([rk, list]) => {
    list.forEach((n, i) => {
      const offset = ((maxPer - list.length) * (LR ? NH + GY : NW + GX)) / 2;
      const x = LR ? 40 + +rk * (NW + GX + 40) : 40 + offset + i * (NW + GX);
      const y = LR ? 90 + offset + i * (NH + GY) : 90 + +rk * (NH + GY + 20);
      const s = shapeFor(n, x, y); objsOut.push(s); map[n.id] = s;
    });
  });
  for (const e of edges) {
    const a = map[e.from], b = map[e.to], forward = rank[e.to] > rank[e.from];
    const span = rank[e.to] - rank[e.from];
    const src = nodes.find((n) => n.id === e.from), ac = a.x + a.w / 2, bc = b.x + b.w / 2, am = a.y + a.h / 2, bm = b.y + b.h / 2;
    // Decision branches that go sideways leave from the diamond's side, then turn toward the target.
    const sideways = forward && src.kind === 'decision' && (LR ? Math.abs(am - bm) > 10 : Math.abs(ac - bc) > 10);
    if (sideways) {
      objsOut.push(Make.connector({ id: a.id, port: LR ? (bm < am ? 'n' : 's') : (bc < ac ? 'w' : 'e') }, { id: b.id, port: LR ? 'w' : 'n' }, { style: 'elbow', label: e.label || '', color: '#444444' }));
      continue;
    }
    objsOut.push(Make.connector({ id: a.id, ...(forward ? { port: LR ? 'e' : 's' } : {}) }, { id: b.id, ...(forward ? { port: LR ? 'w' : 'n' } : {}) }, { style: forward ? 'elbow' : 'curved', curve: 60, label: e.label || '', color: '#444444', ...(span > 1 ? { bend: 1 - 0.5 / span } : {}) }));
  }
  const W = Math.max(...objsOut.filter((o) => o.type !== 'connector').map((o) => o.x + o.w)) + 50, H = Math.max(...objsOut.filter((o) => o.type !== 'connector').map((o) => o.y + o.h)) + 50;
  objsOut.unshift(Make.text(r.title, 40, 24, { fontSize: 22, bold: true }));
  return { objects: objsOut, width: Math.max(600, W), height: Math.max(400, H) };
}
async function generateFlowchart() {
  const ta = el('textarea', { rows: 7, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Describe the process or decision logic, e.g. “Screen patients for HER2. Positive → trastuzumab arm; negative → test ER status; ER+ → endocrine therapy, ER− → chemotherapy. All arms followed up at 12 months.”' });
  const dir = el('select', {}, el('option', { value: 'TB', textContent: 'Top → bottom' }), el('option', { value: 'LR', textContent: 'Left → right' }));
  const status = el('div', { class: 'note' });
  const go = btn('Generate flowchart', async () => {
    const done = busy(go, 'Generating…');
    try {
      const r = await aiCall({
        system: 'You turn a described process into a flowchart. kind: start | end | process | decision | data. Decisions have 2+ outgoing edges labelled with the condition (e.g. "yes"/"no"). Labels ≤ 6 words. Use only what is described. Respond with the JSON schema.',
        prompt: ta.value,
        schema: sObj({ title: sStr, nodes: sArr(sObj({ id: sStr, label: sStr, kind: { type: 'string', enum: ['start', 'end', 'process', 'decision', 'data'] } })), edges: sArr(sObj({ from: sStr, to: sStr, label: sStr })) }),
      });
      r.direction = dir.value;
      const f = buildFlowchart(r);
      checkpoint();
      const p = newPage(r.title || 'Flowchart', f.width, f.height);
      p.objects = f.objects;
      state.doc.pages.splice(state.pageIndex + 1, 0, p);
      closeModal(); gotoPage(state.pageIndex + 1);
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  }, 'primary');
  openModal('Generate flowchart', el('div', { style: 'max-width:640px' }, ta, el('div', { class: 'row', style: 'margin-top:6px' }, el('label', { textContent: 'Direction' }), dir),
    el('div', { class: 'actions' }, status, btn('Cancel', closeModal), go), el('div', { class: 'note' }, 'Opens as a new page; boxes stay connected when you move them. ' + AI_NOTE)));
  setTimeout(() => ta.focus(), 30);
}

// ---------- Leo-style planner: questions → 4 grayscale sketches → mark-up → colour draft ----------
function openPlanner() {
  const st = { desc: '', source: '', image: null, questions: [], answers: {}, sketches: [], chosen: -1, final: null, finalObjs: null };
  const area = el('div');
  const header = el('div', { class: 'steps' });
  const stepNames = ['Describe', 'Plan', 'Sketch', 'Draft'];
  const setStep = (i) => { header.innerHTML = ''; stepNames.forEach((n, k) => header.append(el('span', { class: k === i ? 'on' : k < i ? 'done' : '', textContent: `${k + 1}. ${n}` }))); };
  const err = (e) => area.prepend(el('div', { class: 'note', style: 'color:#d64545;margin-bottom:8px', textContent: cleanErr(e) }));

  const step1 = () => {
    setStep(0); area.innerHTML = '';
    const d = el('textarea', { rows: 5, style: 'width:100%;font-family:inherit;font-size:13px', value: st.desc, placeholder: 'What should the figure explain? e.g. “How our bispecific antibody bridges CD3 on T cells and HER2 on tumour cells to trigger killing.”' });
    const src = el('textarea', { rows: 4, style: 'width:100%;font-family:inherit;font-size:12px', value: st.source, placeholder: 'Optional: paste source material — abstract, methods, results, slide notes.' });
    const ref = el('span', { class: 'note', textContent: st.image ? 'Reference image attached' : '' });
    const file = el('input', { type: 'file', accept: 'image/png,image/jpeg', style: 'display:none', onchange: async (e) => { const f = e.target.files[0]; if (f) { st.image = await downscale(await readAsDataUrl(f), 1400); ref.textContent = `Reference: ${f.name}`; } } });
    const next = btn('Next: planning questions →', async () => {
      st.desc = d.value.trim(); st.source = src.value.trim();
      if (!st.desc) return toast('Describe the figure first');
      const done = busy(next, 'Thinking…');
      try {
        const r = await aiCall({
          system: 'You are a scientific figure designer planning a figure with a researcher. Ask the 2–4 most useful questions about audience/venue, the single main message, which entities and relationships must appear, and preferred layout or emphasis. Give 2–4 short answer options for each. Respond with the JSON schema.',
          prompt: `Figure idea: ${st.desc}${st.source ? `\n\nSource material:\n${st.source.slice(0, 8000)}` : ''}`,
          image: st.image,
          schema: sObj({ questions: sArr(sObj({ id: sStr, question: sStr, options: sArr(sStr) })) }),
        });
        st.questions = r.questions.slice(0, 4);
        step2();
      } catch (e) { err(e); }
      done();
    }, 'primary');
    area.append(d, el('div', { style: 'height:6px' }), src, el('div', { class: 'btnrow', style: 'margin:8px 0' }, btn('Attach reference image / sketch…', () => file.click()), file, ref), el('div', { class: 'actions' }, next));
  };

  const step2 = () => {
    setStep(1); area.innerHTML = '';
    for (const q of st.questions) {
      const other = el('input', { type: 'text', placeholder: 'Or write your own answer', style: 'flex:1', value: st.answers[q.id] && !q.options.includes(st.answers[q.id]) ? st.answers[q.id] : '', oninput: (e) => { st.answers[q.id] = e.target.value; chips.querySelectorAll('button').forEach((b) => b.classList.remove('on')); } });
      const chips = el('div', { class: 'chips' }, ...q.options.map((o) => el('button', { class: st.answers[q.id] === o ? 'on' : '', textContent: o, onclick: (e) => { st.answers[q.id] = o; chips.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target)); other.value = ''; } })));
      area.append(el('div', { class: 'qblock' }, el('b', { textContent: q.question }), chips, el('div', { class: 'row' }, other)));
    }
    const next = btn('Next: 4 layout sketches →', async () => {
      const done = busy(next, 'Sketching 4 layouts… (can take a minute)');
      try {
        const qa = st.questions.map((q) => `Q: ${q.question}\nA: ${st.answers[q.id] || '(no preference)'}`).join('\n');
        const SKETCH_ITEM = { ...AI_SCHEMA, required: [...AI_SCHEMA.required, 'concept'], properties: { ...AI_SCHEMA.properties, concept: sStr } };
        const r = await aiCall({
          system: AI_SYSTEM + '\n\nYou are producing 4 alternative LAYOUT SKETCHES for the same figure: genuinely different compositions (e.g. left-to-right flow, central hub, side-by-side comparison, zoom-in panels). Keep each sketch simple (≤ 25 elements). "concept" is one sentence naming the composition idea.',
          prompt: `Figure: ${st.desc}\n${qa}${st.source ? `\n\nSource material:\n${st.source.slice(0, 6000)}` : ''}`,
          image: st.image,
          schema: sObj({ sketches: sArr(SKETCH_ITEM) }),
        });
        st.sketches = [];
        for (const sk of r.sketches.slice(0, 4)) st.sketches.push({ json: sk, objs: await aiToObjects(sk) });
        step3();
      } catch (e) { err(e); }
      done();
    }, 'primary');
    area.append(el('div', { class: 'actions' }, btn('← Back', step1), next));
  };

  const step3 = () => {
    setStep(2); area.innerHTML = '';
    const grid = el('div', { class: 'sketch-grid' });
    const markWrap = el('div');
    const notes = el('textarea', { rows: 3, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Comments on the chosen sketch, e.g. “move the tumour cell to the right, enlarge the synapse, add a perforin label”.' });
    let canvas = null;
    const pick = (i) => {
      st.chosen = i;
      grid.querySelectorAll('.sketch').forEach((c, k) => c.classList.toggle('on', k === i));
      const sk = st.sketches[i], pg = { width: sk.json.width || 1000, height: sk.json.height || 650, background: '#fff', objects: sk.objs };
      markWrap.innerHTML = '';
      const holder = el('div', { class: 'markup' });
      holder.innerHTML = pageSvgString(pg).replace('<svg ', '<svg style="width:100%;height:auto;display:block;filter:grayscale(1)" ');
      canvas = el('canvas', { width: pg.width, height: pg.height });
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#e8263b'; ctx.lineWidth = Math.max(3, pg.width / 220); ctx.lineCap = 'round';
      let drawing = false;
      const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * pg.width, ((e.clientY - r.top) / r.height) * pg.height]; };
      canvas.addEventListener('pointerdown', (e) => { drawing = true; ctx.beginPath(); ctx.moveTo(...pos(e)); try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ } });
      canvas.addEventListener('pointermove', (e) => { if (drawing) { ctx.lineTo(...pos(e)); ctx.stroke(); } });
      canvas.addEventListener('pointerup', () => { drawing = false; });
      holder.append(canvas);
      markWrap.append(el('div', { class: 'note', style: 'margin:8px 0 4px' }, `Sketch ${i + 1}: ${sk.json.concept || ''} — draw on it in red to mark changes.`), holder, btn('Clear marks', () => ctx.clearRect(0, 0, canvas.width, canvas.height)));
    };
    st.sketches.forEach((sk, i) => {
      const pg = { width: sk.json.width || 1000, height: sk.json.height || 650, background: '#fff', objects: sk.objs };
      const card = el('div', { class: 'sketch', onclick: () => pick(i) });
      card.innerHTML = pageSvgString(pg).replace('<svg ', '<svg style="width:100%;height:100%;filter:grayscale(1)" preserveAspectRatio="xMidYMid meet" ');
      card.append(el('div', { class: 'cap', textContent: `${i + 1}. ${sk.json.concept || ''}` }));
      grid.append(card);
    });
    const next = btn('Next: colour draft →', async () => {
      if (st.chosen < 0) return toast('Pick a sketch first');
      const done = busy(next, 'Drawing the colour draft…');
      try {
        const sk = st.sketches[st.chosen], pg = { width: sk.json.width || 1000, height: sk.json.height || 650, background: '#fff', objects: sk.objs };
        // Composite the sketch and the red mark-up into one image for Claude.
        const base = await rasterize(pg, Math.min(1, 1400 / pg.width), { mime: 'image/png' });
        const im = new Image(); await new Promise((r) => { im.onload = r; im.src = base; });
        const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
        const cx = c.getContext('2d'); cx.filter = 'grayscale(1)'; cx.drawImage(im, 0, 0); cx.filter = 'none'; cx.drawImage(canvas, 0, 0, c.width, c.height);
        const r = await aiCall({
          system: AI_SYSTEM + '\n\nNow produce the FINAL colour version of the chosen sketch: keep its composition, apply the researcher\'s comments and red mark-up (shown on the attached image), use a restrained, consistent colour palette, and add any labels needed for clarity.',
          prompt: `Figure: ${st.desc}\nChosen sketch (JSON):\n${JSON.stringify(sk.json)}\nComments: ${notes.value.trim() || '(none)'}`,
          image: c.toDataURL('image/jpeg', 0.9),
          schema: AI_SCHEMA,
        });
        st.final = r; st.finalObjs = await aiToObjects(r);
        step4();
      } catch (e) { err(e); }
      done();
    }, 'primary');
    area.append(el('div', { class: 'note', style: 'margin-bottom:6px' }, 'Grayscale sketches let you judge composition before colour. Pick one:'), grid, markWrap, notes, el('div', { class: 'actions' }, btn('← Back', step2), next));
    if (st.sketches.length) pick(Math.max(0, st.chosen));
  };

  const step4 = () => {
    setStep(3); area.innerHTML = '';
    const pv = el('div', { class: 'preview', style: 'min-height:360px' });
    const draw = () => { const pg = { width: st.final.width || 1000, height: st.final.height || 650, background: '#fff', objects: st.finalObjs }; pv.innerHTML = pageSvgString(pg).replace('<svg ', '<svg style="width:100%;max-height:440px" preserveAspectRatio="xMidYMid meet" '); };
    draw();
    const rev = el('textarea', { rows: 2, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: 'Request changes, e.g. “use blue for T cells, make the arrows thicker”' });
    const revise = btn('Revise', async () => {
      const done = busy(revise, 'Revising…');
      try { st.final = await aiCall({ system: AI_SYSTEM, prompt: `Current figure (JSON):\n${JSON.stringify(st.final)}\n\nRevise it with these changes, keeping everything else:\n${rev.value.trim()}`, schema: AI_SCHEMA }); st.finalObjs = await aiToObjects(st.final); draw(); }
      catch (e) { err(e); }
      done();
    });
    area.append(pv, el('div', { class: 'note', style: 'margin:6px 0' }, 'Every element is editable once added. Check the science: compartments, arrow directions and labels.'), rev,
      el('div', { class: 'actions' }, btn('← Back to sketches', step3), revise,
        btn('Open as new page', () => { checkpoint(); const p = newPage(st.final.title || 'Figure', st.final.width || 1000, st.final.height || 650); p.objects = st.finalObjs; state.doc.pages.splice(state.pageIndex + 1, 0, p); closeModal(); gotoPage(state.pageIndex + 1); }),
        btn('Add to page', () => { insertObjectsGrouped(st.finalObjs, false); closeModal(); }, 'primary')));
  };

  openModal('Plan a figure with AI', el('div', { style: 'max-width:900px' }, header, area, el('div', { class: 'note', style: 'margin-top:8px' }, AI_NOTE)));
  step1();
}

// ---------- Restyle icon / image ----------
const RESTYLES = {
  scientific: 'clean scientific-illustration ("BioRender-like") style: flat fills with soft radial shading and one highlight, darker outlines, harmonious palette',
  textbook: 'textbook illustration: gentle gradients, soft shadows, thin darker outlines, more anatomical detail',
  watercolor: 'watercolour: soft translucent washes with uneven edges (use feTurbulence/feDisplacementMap filters and low-opacity layered fills)',
  pencil: 'coloured-pencil drawing: hatched strokes and textured fills (use stroke hatching patterns or feTurbulence texture)',
  '3d': 'glossy 3D rendering: strong radial gradients, specular highlights, cast shadow ellipse beneath',
  ink: 'pen & ink: black linework with cross-hatching for shading, no colour fills',
  lineart: 'minimal line art: uniform 3 px strokes, no fills, round caps',
  sketch: 'graphite pencil sketch: grey loose strokes and light shading',
  silhouette: 'solid silhouette: a single dark fill colour, no internal detail',
  realistic: 'realistic scientific illustration: naturalistic colours, layered gradients for volume, fine surface texture and subtle ambient-occlusion shadows (still vector, no photo)',
  flat2d: 'flat 2D: solid flat fills only, no gradients or shadows, simplified geometric shapes, thin uniform outlines',
};
async function restyleSelection() {
  const sel = selected().filter((o) => o.type !== 'connector');
  if (!sel.length) { toast('Select an icon or image to restyle'); return; }
  const style = el('select', {}, ...Object.keys(RESTYLES).map((k) => el('option', { value: k, textContent: { scientific: 'Apply SciCanvas house style', textbook: 'Textbook', watercolor: 'Watercolour', pencil: 'Coloured pencil', '3d': '3D', ink: 'Pen & ink', lineart: 'Line art', sketch: 'Pencil sketch', silhouette: 'Silhouette', realistic: 'Realistic', flat2d: 'Flat 2D' }[k] })));
  const grid = el('div', { class: 'ai-icon-grid' }), status = el('div', { class: 'note' });
  const go = btn('Restyle', async () => {
    const done = busy(go, 'Redrawing…'); grid.innerHTML = '';
    try {
      const res = await aiCall({ system: AI_ICON_SYSTEM.replace('Return exactly 3 distinct variants', 'Return exactly 2 variants'), prompt: `Redraw the subject of the attached image (same subject, pose and recognisable features) in this style: ${RESTYLES[style.value]}.`, image: await selectionImage(), schema: AI_ICON_SCHEMA });
      const base = bounds(sel[0]);
      for (const v of res.variants.slice(0, 2)) {
        let norm; try { norm = normalizeSvg(v.svg); } catch { continue; }
        const pic = el('div', { class: 'ai-pic' }); pic.innerHTML = `<svg viewBox="${norm.vb}" style="width:100%;height:100%">${norm.svg}</svg>`;
        const place = (replace) => {
          const key = addSvgAsset(v.name, v.svg), a = getAsset(key), ar = a.vw / a.vh;
          const h = base.h, w = h * ar;
          const o = { id: uid(), type: 'icon', iconId: key, x: replace ? base.x : base.x + base.w + 20, y: base.y, w, h, rot: 0, name: `${v.name} (${style.value})` };
          checkpoint();
          if (replace && sel.length === 1) { const i = objs().indexOf(sel[0]); objs()[i] = { ...o, id: sel[0].id }; state.sel = [sel[0].id]; }
          else { objs().push(o); state.sel = [o.id]; }
          render({ props: true }); closeModal();
        };
        grid.append(el('div', { class: 'ai-icon' }, pic, el('b', { textContent: v.name }), el('div', { class: 'btnrow' }, btn('Replace', () => place(true), 'primary'), btn('Add beside', () => place(false)))));
      }
      status.textContent = 'AI restyles are reinterpretations — check structures are still depicted correctly.';
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  }, 'primary');
  openModal('Restyle with AI', el('div', { style: 'max-width:720px' }, el('div', { class: 'row' }, el('label', { textContent: 'Style' }), style, go), status, grid, el('div', { class: 'note', style: 'margin-top:8px' }, AI_NOTE)));
}

// ---------- Edit selection with an instruction ----------
function selectionToElements(sel) {
  const bb = unionBounds(sel, objs()), map = {};
  const els = [];
  sel.forEach((o, i) => {
    const id = `e${i}`; map[o.id] = id;
    const base = { id, x: Math.round(o.x - bb.x), y: Math.round(o.y - bb.y), w: Math.round(o.w || 0), h: Math.round(o.h || 0), text: '', icon: '', color: '', from: '', to: '', arrow: '', shape: '' };
    if (o.type === 'icon') els.push({ ...base, kind: 'icon', icon: '@key:' + o.iconId, color: o.tint || (ICON_MAP[o.iconId] ? o.color : '') || '', text: layerName(o) });
    else if (o.type === 'text') els.push({ ...base, kind: 'text', text: o.text, color: o.color });
    else if (o.type === 'rect') els.push({ ...base, kind: 'box', text: o.label || '', color: o.stroke || '' });
    else if (o.type === 'ellipse') els.push({ ...base, kind: o.badge ? 'badge' : 'ellipse', text: o.label || '', color: o.stroke || '' });
    else if (o.type === 'shape') els.push({ ...base, kind: 'shape', shape: o.kind, text: o.label || '', color: o.stroke || '' });
  });
  sel.forEach((o) => { if (o.type === 'connector' && map[o.from.id] && map[o.to.id]) els.push({ id: `c${els.length}`, kind: 'arrow', x: 0, y: 0, w: 0, h: 0, text: o.label || '', icon: '', color: o.color || '', from: map[o.from.id], to: map[o.to.id], arrow: { bar: 'inhibit', dot: 'bind', none: 'line' }[o.head] || 'arrow', shape: '' }); });
  return { els, bb };
}
async function editWithAI() {
  const sel = selected();
  if (!sel.length) { toast('Select what you want to change'); return; }
  const single = sel.length === 1 ? sel[0] : null;
  const iconMode = single && single.type === 'icon' && (ICON_MAP[single.iconId] || (getAsset(single.iconId) && getAsset(single.iconId).svg.length < 90000));
  const ta = el('textarea', { rows: 3, style: 'width:100%;font-family:inherit;font-size:13px', placeholder: iconMode ? 'e.g. “add a second nucleus”, “make the membrane dashed”, “give the antibody a fluorescent tag”' : 'e.g. “align these in a row and label each one”, “turn the arrows into inhibition”, “colour the treated group orange”' });
  const status = el('div', { class: 'note' });
  const go = btn('Apply', async () => {
    const done = busy(go, 'Editing…');
    try {
      if (iconMode) {
        const { markup, vb } = iconMarkup(single);
        const svgIn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${markup}</svg>`;
        const r = await aiCall({ system: 'You edit SVG scientific icons precisely. Apply only the requested change, keep everything else identical (same viewBox, style and colours unless asked). No text, scripts, images or external references. Respond with the JSON schema.', prompt: `Instruction: ${ta.value}\n\nSVG:\n${svgIn}`, schema: sObj({ svg: sStr, summary: sStr }) });
        normalizeSvg(r.svg); // validates
        checkpoint();
        const key = addSvgAsset(layerName(single) + ' (edited)', r.svg);
        Object.assign(single, { iconId: key, tint: null, colorMap: null });
        render({ props: true }); closeModal(); toast(r.summary || 'Icon edited');
      } else {
        const { els, bb } = selectionToElements(sel);
        if (!els.length) throw new Error('The selection has no icons, text or shapes that can be edited this way');
        const r = await aiCall({ system: AI_SYSTEM + '\n\nYou are EDITING an existing selection. Keep elements unchanged unless the instruction affects them; keep "@key:" icon values as they are to preserve the same icons.', prompt: `Instruction: ${ta.value}\n\nCurrent selection (coordinates relative to its top-left):\n${JSON.stringify({ title: 'selection', width: Math.round(bb.w), height: Math.round(bb.h), elements: els })}`, schema: AI_SCHEMA });
        const fresh = await aiToObjects(r);
        fresh.forEach((o) => { if (o.type !== 'connector') { o.x += bb.x; o.y += bb.y; } });
        checkpoint();
        const editable = new Set(sel.filter((o) => ['icon', 'text', 'rect', 'ellipse', 'shape', 'connector'].includes(o.type)).map((o) => o.id));
        const at = Math.min(...[...editable].map((id) => objs().findIndex((o) => o.id === id)));
        page().objects = objs().filter((o) => !editable.has(o.id));
        objs().splice(Math.max(0, at), 0, ...fresh);
        state.sel = fresh.map((o) => o.id);
        render({ props: true }); closeModal(); toast('Selection updated — Undo (⌘Z) reverts');
      }
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  }, 'primary');
  openModal('Edit with AI', el('div', { style: 'max-width:600px' }, el('div', { class: 'note', style: 'margin-bottom:6px' }, iconMode ? 'Describe a change to this icon.' : `Describe a change to the ${sel.length} selected object${sel.length > 1 ? 's' : ''}.`), ta,
    el('div', { class: 'actions' }, status, btn('Cancel', closeModal), go), el('div', { class: 'note' }, AI_NOTE)));
  setTimeout(() => ta.focus(), 30);
}

// ---------- Remove text ----------
async function removeTextFromSelection() {
  const o = selected()[0];
  if (!o || (o.type !== 'icon' && o.type !== 'image')) { toast('Select an icon or image'); return; }
  if (o.type === 'icon') {
    const { markup, vb } = iconMarkup(o);
    if (!/<text[\s>]/.test(markup)) { toast('This icon has no text'); return; }
    checkpoint();
    const key = addSvgAsset(layerName(o) + ' (no text)', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${markup.replace(/<text[\s\S]*?<\/text>/g, '')}</svg>`);
    Object.assign(o, { iconId: key, tint: null, colorMap: null });
    render({ props: true }); toast('Text removed'); return;
  }
  toast('Finding text in the image…');
  try {
    const r = await aiCall({ system: 'You locate every piece of text (labels, letters, numbers, scale-bar captions) in an image. Return tight boxes as fractions of image width/height (0–1). Respond with the JSON schema.', prompt: 'Locate all text in this image.', image: await downscale(o.src, 1568), schema: sObj({ boxes: sArr(sObj({ x: sNum, y: sNum, w: sNum, h: sNum })) }) });
    if (!r.boxes.length) { toast('No text found'); return; }
    const im = new Image(); await new Promise((res) => { im.onload = res; im.src = o.src; });
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0);
    for (const b of r.boxes) { // fill each box with the median colour of the ring just outside it
      const pad = 3, x = Math.max(0, Math.floor(b.x * c.width) - pad), y = Math.max(0, Math.floor(b.y * c.height) - pad);
      const w = Math.min(c.width - x, Math.ceil(b.w * c.width) + 2 * pad), h = Math.min(c.height - y, Math.ceil(b.h * c.height) + 2 * pad);
      const ring = ctx.getImageData(Math.max(0, x - 4), Math.max(0, y - 4), Math.min(c.width - x + 4, w + 8), Math.min(c.height - y + 4, h + 8)).data;
      const rs = [], gs = [], bs = [];
      for (let i = 0; i < ring.length; i += 16) { rs.push(ring[i]); gs.push(ring[i + 1]); bs.push(ring[i + 2]); }
      const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
      ctx.fillStyle = `rgb(${med(rs)},${med(gs)},${med(bs)})`; ctx.fillRect(x, y, w, h);
    }
    checkpoint(); o.src = c.toDataURL('image/png'); renderScene(); toast(`Removed ${r.boxes.length} text region${r.boxes.length > 1 ? 's' : ''}`);
  } catch (e) { toast('Remove text failed: ' + cleanErr(e), 4000); }
}

// ---------- Background removal by edge colour (no AI) ----------
async function removeBackgroundEdge(src, tol = 38) {
  const im = new Image(); await new Promise((r) => { im.onload = r; im.src = src; });
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height), px = d.data, W = c.width, H = c.height;
  // Background colour = median of the border pixels; flood-fill from the edges within tolerance.
  const border = [];
  for (let x = 0; x < W; x += 2) border.push((x) * 4, ((H - 1) * W + x) * 4);
  for (let y = 0; y < H; y += 2) border.push((y * W) * 4, (y * W + W - 1) * 4);
  const med = (k) => border.map((i) => px[i + k]).sort((a, b) => a - b)[border.length >> 1];
  const bg = [med(0), med(1), med(2)];
  const near = (i) => Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) <= tol * 3;
  const seen = new Uint8Array(W * H), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!near(p * 4)) continue;
    px[p * 4 + 3] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
async function removeBackgroundSelection() {
  const o = selected()[0];
  if (!o || o.type !== 'image') { toast('Select an image'); return; }
  checkpoint(); o.src = await trimTransparent(await removeBackgroundEdge(o.src)); const s = await loadImageSize(o.src); o.nw = s.w; o.nh = s.h; o.crop = null; o.h = o.w * (s.h / s.w); render({ props: true }); toast('Background removed');
}

// ---------- AI menu (toolbar ✦ button) ----------
const AI_COMMANDS = {
  ai: () => openAIDialog(), aiPlan: openPlanner, aiProtocol: generateProtocol, aiTimeline: generateTimeline, aiFlowchart: generateFlowchart,
  aiIcon: () => openAIIconDialog(), aiRestyle: restyleSelection, aiEdit: editWithAI, aiRemoveText: removeTextFromSelection, removeBg: removeBackgroundSelection,
  aiNarrate: narrateFigure, aiSmartSearch: smartSearch, aiNarrateSlides: narrateSlides, upscale: upscaleSelection,
};

// ---------- Image upscale (on-device, no AI): high-quality resample + unsharp mask ----------
async function upscaleImage(src, factor, amount = 0.6) {
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  let w = im.naturalWidth, h = im.naturalHeight, cur = im;
  const target = Math.min(factor, Math.floor(8192 / Math.max(w, h)) || 1);
  // Upscale in ×2 steps — sharper than one big jump.
  for (let f = 1; f < target; f *= 2) {
    const k = Math.min(2, target / f), c = document.createElement('canvas');
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, c.width, c.height);
    cur = c; w = c.width; h = c.height;
  }
  const c = cur instanceof HTMLCanvasElement ? cur : (() => { const x = document.createElement('canvas'); x.width = w; x.height = h; x.getContext('2d').drawImage(cur, 0, 0); return x; })();
  if (amount > 0) {
    const g = c.getContext('2d'), orig = g.getImageData(0, 0, w, h);
    const blur = document.createElement('canvas'); blur.width = w; blur.height = h;
    const bg = blur.getContext('2d'); bg.filter = `blur(${Math.max(1, target / 2)}px)`; bg.drawImage(c, 0, 0);
    const b = bg.getImageData(0, 0, w, h).data, d = orig.data;
    for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) d[i + j] = Math.max(0, Math.min(255, d[i + j] + amount * (d[i + j] - b[i + j])));
    g.putImageData(orig, 0, 0);
  }
  return { src: c.toDataURL('image/png'), w, h };
}
function upscaleSelection() {
  const o = selected()[0];
  if (!o || o.type !== 'image') { toast('Select an image to upscale'); return; }
  const factor = el('select', {}, el('option', { value: 2, textContent: '2× (recommended)' }), el('option', { value: 4, textContent: '4×' }));
  const sharp = el('input', { type: 'range', min: 0, max: 1.5, step: 0.1, value: 0.6 });
  const info = el('div', { class: 'note' });
  loadImageSize(o.src).then((s) => { info.textContent = `Current resolution: ${s.w} × ${s.h} px (${Math.round((s.w / o.w) * 72)} ppi at this size on a 72-ppi page).`; });
  const go = btn('Upscale', async () => {
    const done = busy(go, 'Upscaling…');
    try {
      const r = await upscaleImage(o.src, +factor.value, +sharp.value);
      checkpoint(); o.src = r.src; o.nw = r.w; o.nh = r.h; o.crop = null;
      closeModal(); render({ props: true }); toast(`Upscaled to ${r.w} × ${r.h} px`);
    } catch (e) { toast('Could not upscale: ' + e.message); }
    done();
  }, 'primary');
  openModal('Upscale image', el('div', { style: 'max-width:440px' }, info, field_('Scale', factor), field_('Sharpen', sharp),
    el('div', { class: 'note', style: 'margin:8px 0' }, 'Smooth resampling with sharpening — done on this computer, no AI. It makes pixels smaller and edges crisper for print, but cannot add real detail; for micrographs, export from the original data at higher resolution instead.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), go)));
}

// ---------- Narrated slides: AI writes a script per slide; presenter reads it aloud ----------
async function narrateSlides() {
  const pages = state.doc.pages;
  const texts = pages.map((p) => p.narration || '');
  const list = el('div', { style: 'max-height:46vh;overflow:auto;display:grid;gap:8px' });
  const drawList = () => {
    list.innerHTML = '';
    pages.forEach((p, i) => list.append(el('div', {}, el('b', { textContent: `${i + 1}. ${p.name}` }),
      el('textarea', { rows: 3, style: 'width:100%;font-family:inherit;font-size:13px', value: texts[i], placeholder: 'Narration for this slide (read aloud when presenting)…', oninput: (e) => { texts[i] = e.target.value; } }))));
  };
  drawList();
  const audience = el('select', {}, ...['Conference talk (scientific peers)', 'Lab meeting (informal)', 'Students (teaching)', 'General public'].map((v) => el('option', { value: v, textContent: v })));
  const length = el('select', {}, el('option', { value: '2-3 sentences', textContent: 'Short (2–3 sentences)' }), el('option', { value: '4-6 sentences', textContent: 'Medium (4–6 sentences)' }));
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  const voice = el('select', {}, el('option', { value: '', textContent: 'System default voice' }), ...voices.map((v) => el('option', { value: v.name, textContent: `${v.name} (${v.lang})`, selected: v.name === state.doc.narrationVoice })));
  const rate = el('input', { type: 'range', min: 0.7, max: 1.4, step: 0.05, value: state.doc.narrationRate || 1 });
  const status = el('div', { class: 'note' });
  const apply = () => { checkpoint(); pages.forEach((p, i) => { p.narration = texts[i].trim() || undefined; }); state.doc.narrationVoice = voice.value || undefined; state.doc.narrationRate = +rate.value; markDirty(); };
  const gen = btn('✦ Write narration', async () => {
    const done = busy(gen, 'Writing…');
    try {
      const outline = pages.map((p, i) => `Slide ${i + 1} "${p.name}": text on slide: ${p.objects.flatMap((o) => [o.text, o.label, o.title, o.cfg && o.cfg.title].filter(Boolean)).join(' | ').slice(0, 800) || '(no text)'}${p.notes ? ` · speaker notes: ${p.notes.slice(0, 600)}` : ''}`).join('\n');
      const r = await aiCall({
        system: 'You write spoken narration scripts for scientific slide decks. Explain only what each slide shows or what its notes say; never invent data, results or claims. Write for the ear: short sentences, no markdown, spell out abbreviations on first use. Respond with the JSON schema, one entry per slide in order.',
        prompt: `Audience: ${audience.value}. Length: ${length.value} per slide.\n${outline}`,
        image: await pageImage(page()),
        schema: sObj({ slides: sArr(sObj({ index: sNum, narration: sStr })) }),
      });
      r.slides.forEach((s) => { const i = Math.round(s.index) - 1; if (i >= 0 && i < pages.length) texts[i] = s.narration; });
      drawList(); status.textContent = 'Review every line — narration should match what the slide actually shows.';
    } catch (e) { status.textContent = cleanErr(e); }
    done();
  });
  openModal('Narrated slides', el('div', { style: 'max-width:720px' },
    el('div', { class: 'row' }, el('label', { textContent: 'Audience' }), audience, length, gen), status, list,
    el('div', { class: 'row', style: 'margin-top:8px' }, el('label', { textContent: 'Voice' }), voice, el('span', { textContent: 'Speed', style: 'color:var(--muted)' }), rate),
    el('div', { class: 'note' }, 'Present (F5) and press P to play narration — slides advance automatically when each one finishes. Export audio saves one .m4a per slide (Mac) for adding to PowerPoint or video.'),
    el('div', { class: 'actions' },
      btn('▶ Preview this slide', () => { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(texts[state.pageIndex] || 'No narration for this slide yet.'); const v = voices.find((x) => x.name === voice.value); if (v) u.voice = v; u.rate = +rate.value; speechSynthesis.speak(u); }),
      btn('Export audio…', async () => {
        apply();
        try { const n = await window.native.ttsExport({ slides: pages.map((p, i) => ({ index: i + 1, name: p.name, text: texts[i] })), rate: Math.round(175 * +rate.value) }); if (n != null) toast(`Saved ${n} audio file${n === 1 ? '' : 's'}`); }
        catch (e) { toast(cleanErr(e), 4000); }
      }),
      btn('Cancel', () => { speechSynthesis.cancel(); closeModal(); }),
      btn('Save narration', () => { speechSynthesis.cancel(); apply(); closeModal(); toast('Narration saved — present and press P to play'); }, 'primary'))));
}
function showAIMenu(anchor) {
  const pop = $('#pop');
  pop.innerHTML = '';
  const item = (cmd, label, sub) => el('button', { class: 'aimenu', onclick: () => { pop.classList.add('hidden'); AI_COMMANDS[cmd](); } }, el('b', { textContent: label }), el('span', { textContent: sub }));
  pop.append(
    item('aiPlan', 'Plan a figure (guided)', 'Questions → 4 sketches → mark-up → colour draft'),
    item('ai', 'Generate editable figure', 'Describe it, get a draft, revise'),
    item('aiProtocol', 'Protocol from methods', 'Paste methods text → numbered steps'),
    item('aiTimeline', 'Timeline', 'Study schedule → timeline page'),
    item('aiFlowchart', 'Flowchart', 'Process / decision logic → connected boxes'),
    item('aiIcon', 'Create icon', '3 vector options from a description'),
    item('aiRestyle', 'Restyle selection', 'Textbook, watercolour, 3D, line art…'),
    item('aiEdit', 'Edit selection with AI', 'Describe a change'),
    item('aiRemoveText', 'Remove text from image', 'Clean labels off an image or icon'),
    item('aiNarrate', 'Suggest title & legend', 'Title, legend and alt text'),
    item('aiSmartSearch', 'Smart icon search', 'Natural-language search in the library'));
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.min(window.innerWidth - 310, r.left) + 'px';
  pop.style.top = r.bottom + 6 + 'px';
  pop.classList.remove('hidden');
  const close = (e) => { if (!pop.contains(e.target) && e.target !== anchor) { pop.classList.add('hidden'); window.removeEventListener('pointerdown', close, true); } };
  setTimeout(() => window.addEventListener('pointerdown', close, true), 0);
}
