// Reference files for AI drafting (v0.9): attach a paper (PDF), Word document, PowerPoint deck, spreadsheet
// (Excel / CSV / TSV), text or Markdown file, or an image, and choose how Claude should use it: a visual
// summary of a paper, a figure from slides, a remake of an image, or charts from a table.
// PDFs go to Claude as document blocks; the others are read here and sent as text. Charts built from an
// attached table take their numbers from the file itself — Claude only names the columns to plot.

const AI_REF_LIMITS = { pdfBytes: 20e6, pdfPages: 100, fileChars: 60000, totalChars: 120000 };
const AI_REF_ACCEPT = '.pdf,.docx,.pptx,.xlsx,.csv,.tsv,.txt,.md,.png,.jpg,.jpeg,.webp';
const AI_REF_MODES = [
  ['auto', 'Source of facts for the figure'],
  ['summary', 'Visual summary of a paper (graphical abstract)'],
  ['slides', 'One figure from these slides'],
  ['remake', 'Remake this image as an editable figure'],
  ['data', 'Charts from this table (exact values)'],
];
const AI_REF_INSTRUCTIONS = {
  auto: 'Use the attached material as the source of facts for the figure. Do not add claims it does not support.',
  summary: 'Make a visual summary (graphical abstract) of the attached paper: the question, the approach and the main finding, in 3–5 panels read left to right. Use only claims stated in the paper, and keep its terminology.',
  slides: 'Turn the attached slides into one clear figure that captures their content and order. Merge repeated points; keep the key labels.',
  remake: 'Recreate the attached image as an editable figure: the same layout, objects, labels and arrows, cleaned up and consistently styled.',
  data: 'Show the attached table with chart elements (kind "chart"). Choose the chart type that fits the data, list the exact column headers to plot, and add a title and axis labels as text elements. Never type numbers yourself.',
};

const xmlDecode = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
// Word body XML → text: paragraphs on their own lines, headings marked with #, table cells joined by |.
function docxXmlToText(xml) {
  let out = '', line = '', heading = 0;
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:pStyle w:val="([^"]+)"\/>|<\/w:p>|<\/w:tc>|<\/w:tr>/g;
  let m;
  while ((m = re.exec(xml))) {
    const tok = m[0];
    if (m[1] !== undefined && tok.startsWith('<w:t')) line += xmlDecode(m[1]);
    else if (tok === '<w:tab/>') line += '\t';
    else if (tok === '<w:br/>') line += '\n';
    else if (m[2] !== undefined) { const h = m[2].match(/^(?:Heading|heading)\s?(\d)$/); heading = h ? +h[1] : /^Title$/i.test(m[2]) ? 1 : 0; }
    else if (tok === '</w:p>') { if (line.trim()) out += `${heading ? '#'.repeat(heading) + ' ' : ''}${line.trim()}`; out += out.endsWith(' | ') ? '' : '\n'; line = ''; heading = 0; }
    else if (tok === '</w:tc>') { out = out.replace(/\n$/, '') + ' | '; }
    else if (tok === '</w:tr>') { out = out.replace(/ \| $/, '') + '\n'; }
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}
// One slide's XML → its text, paragraph per line.
function pptxXmlToText(xml) {
  const lines = [];
  for (const p of String(xml).split(/<\/a:p>/)) {
    const t = [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((x) => xmlDecode(x[1])).join('');
    if (t.trim()) lines.push(t.trim());
  }
  return lines.join('\n');
}
// slides: [{ n, xml, notesXml }] → "Slide 1\n…\nNotes: …"
function pptxSlidesToText(slides) {
  return slides.sort((a, b) => a.n - b.n).map((s) => {
    const body = pptxXmlToText(s.xml), notes = s.notesXml ? pptxXmlToText(s.notesXml).replace(/^\d+$/m, '').trim() : '';
    return `Slide ${s.n}\n${body || '(no text)'}${notes ? `\nSpeaker notes: ${notes}` : ''}`;
  }).join('\n\n');
}
// Rough page count from the PDF's page objects (good enough to warn about the 100-page limit).
function pdfPageCount(bytes) {
  const s = typeof bytes === 'string' ? bytes : new TextDecoder('latin1').decode(bytes);
  return (s.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}
const clip = (t, n) => (t.length > n ? `${t.slice(0, n)}\n[… truncated: ${t.length - n} more characters not sent]` : t);
const bytesToBase64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };

// Read one attached file into a reference: { kind: 'pdf' | 'text' | 'table' | 'image', name, ... }.
async function readReferenceFile(file) {
  const name = file.name, ext = (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  if (ext === 'pdf') {
    if (file.size > AI_REF_LIMITS.pdfBytes) throw new Error(`${name} is ${(file.size / 1e6).toFixed(1)} MB; PDFs up to ${AI_REF_LIMITS.pdfBytes / 1e6} MB can be sent.`);
    const u8 = new Uint8Array(await file.arrayBuffer()), pages = pdfPageCount(u8);
    if (pages > AI_REF_LIMITS.pdfPages) throw new Error(`${name} has about ${pages} pages; the limit is ${AI_REF_LIMITS.pdfPages}. Attach just the relevant pages (e.g. Print › Save as PDF with a page range).`);
    return { kind: 'pdf', name, data: bytesToBase64(u8), pages, label: `PDF, ${pages || '?'} page${pages === 1 ? '' : 's'}` };
  }
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return { kind: 'image', name, dataUrl: await downscale(await readAsDataUrl(file), 1568), label: 'image' };
  if (ext === 'docx' || ext === 'pptx') {
    if (typeof JSZip === 'undefined') throw new Error('Office support not loaded');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    if (ext === 'docx') {
      const doc = zip.file('word/document.xml');
      if (!doc) throw new Error(`${name} doesn't look like a Word document`);
      const text = docxXmlToText(await doc.async('string'));
      return { kind: 'text', name, text: clip(text, AI_REF_LIMITS.fileChars), label: `Word, ${text.split(/\s+/).filter(Boolean).length} words` };
    }
    const slides = [];
    for (const path of Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))) {
      const n = +path.match(/(\d+)\.xml$/)[1], rels = zip.file(`ppt/slides/_rels/slide${n}.xml.rels`);
      const notesTarget = rels ? ((await rels.async('string')).match(/Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/) || [])[1] : null;
      const notes = notesTarget ? zip.file(`ppt/notesSlides/${notesTarget}`) : null;
      slides.push({ n, xml: await zip.file(path).async('string'), notesXml: notes ? await notes.async('string') : '' });
    }
    if (!slides.length) throw new Error(`${name} has no slides`);
    return { kind: 'text', name, text: clip(pptxSlidesToText(slides), AI_REF_LIMITS.fileChars), label: `PowerPoint, ${slides.length} slide${slides.length === 1 ? '' : 's'}` };
  }
  if (['xlsx', 'csv', 'tsv'].includes(ext)) {
    const csv = ext === 'xlsx' ? await xlsxToCsv(await file.arrayBuffer()) : (await file.text()).trim();
    const t = parseTable(csv);
    if (!t.headers.length) throw new Error(`${name} has no table`);
    return { kind: 'table', name, csv, headers: t.headers, rows: t.raw[0] ? t.raw[0].length : 0, label: `table, ${t.headers.length} columns × ${t.raw[0] ? t.raw[0].length : 0} rows` };
  }
  if (['txt', 'md'].includes(ext)) { const text = await file.text(); return { kind: 'text', name, text: clip(text, AI_REF_LIMITS.fileChars), label: 'text' }; }
  throw new Error(`${name}: attach PDF, Word, PowerPoint, Excel / CSV, text or image files`);
}

// Turn attached references into the extra parts of an AI request.
function referencesForRequest(refs, mode = 'auto') {
  const documents = refs.filter((r) => r.kind === 'pdf').map((r) => ({ name: r.name, data: r.data }));
  const image = (refs.find((r) => r.kind === 'image') || {}).dataUrl || null;
  let budget = AI_REF_LIMITS.totalChars, text = '';
  for (const r of refs) {
    if (r.kind === 'text') { const t = clip(r.text, Math.max(0, budget)); budget -= t.length; text += `\n\n--- Attached: ${r.name} (${r.label}) ---\n${t}`; }
    if (r.kind === 'table') {
      const preview = r.csv.split('\n').slice(0, 41).join('\n');
      text += `\n\n--- Attached table: ${r.name} (${r.label}) ---\nColumns: ${r.headers.join(' | ')}\nFirst rows:\n${clip(preview, 8000)}`;
    }
  }
  if (documents.length) text = `\n\nAttached PDF${documents.length > 1 ? 's' : ''}: ${documents.map((d) => d.name).join(', ')}.` + text;
  if (image) text += '\n\nThe attached image is a reference (sketch, example or figure to remake).';
  if (refs.length) text += `\n\nHow to use the attachments: ${AI_REF_INSTRUCTIONS[mode] || AI_REF_INSTRUCTIONS.auto}`;
  return { documents, image, text, tables: refs.filter((r) => r.kind === 'table') };
}

// Chart element from an AI draft: build the CSV from the attached table's columns, never from AI-typed numbers.
// e.shape = chart kind; e.text = column headers separated by | (first = X / groups as the chart kind expects).
function aiChartFromTables(e, tables) {
  const want = String(e.text || '').split('|').map((s) => s.trim()).filter(Boolean);
  if (!want.length || !tables || !tables.length) return null;
  for (const tb of tables) {
    const t = parseTable(tb.csv), idx = want.map((w) => t.headers.findIndex((h) => h.trim().toLowerCase() === w.toLowerCase()));
    if (idx.some((i) => i < 0)) continue;
    const rows = t.raw[0].map((_, r) => idx.map((i) => String(t.raw[i][r] ?? '').replace(/,/g, ';')).join(','));
    const kind = CHART_KINDS.some((k) => k[0] === e.shape) ? e.shape : 'bar';
    return Make.chart({ kind, data: [idx.map((i) => t.headers[i]).join(','), ...rows].join('\n'), title: '', xLabel: '', yLabel: '', error: 'sd', showPoints: true, test: 'auto', pStyle: 'stars', source: tb.name }, +e.x || 0, +e.y || 0, Math.max(160, +e.w || 360), Math.max(120, +e.h || 280));
  }
  return null;
}

// The attach control used by the AI dialogs: a button, chips for each file, and the "use it as" choice.
function referencePicker(st, onChange = () => {}) {
  st.refs = st.refs || []; st.refMode = st.refMode || 'auto';
  const list = el('div', { class: 'chips', style: 'margin-top:4px' }), msg = el('div', { class: 'note' });
  const mode = el('select', {}, ...AI_REF_MODES.map(([v, l]) => el('option', { value: v, textContent: l })));
  mode.value = st.refMode;
  mode.addEventListener('change', () => { st.refMode = mode.value; onChange(); });
  const modeRow = el('div', { class: 'row', style: 'margin-top:4px' }, el('label', { textContent: 'Use as' }), mode);
  const draw = () => {
    list.innerHTML = '';
    st.refs.forEach((r, i) => list.append(el('button', { class: 'on', title: 'Remove', textContent: `${r.name} · ${r.label}  ×`, onclick: () => { st.refs.splice(i, 1); draw(); onChange(); } })));
    modeRow.classList.toggle('hidden', !st.refs.length);
  };
  const input = el('input', { type: 'file', multiple: true, accept: AI_REF_ACCEPT, style: 'display:none', onchange: async (ev) => {
    msg.textContent = '';
    for (const f of ev.target.files) {
      try {
        const r = await readReferenceFile(f);
        if (r.kind === 'image') st.refs = st.refs.filter((x) => x.kind !== 'image'); // one reference image at a time
        st.refs.push(r);
        if (r.kind === 'table' && st.refMode === 'auto') { st.refMode = 'data'; mode.value = 'data'; }
        if (r.kind === 'image' && st.refMode === 'auto' && st.refs.length === 1) { st.refMode = 'remake'; mode.value = 'remake'; }
      } catch (e) { msg.textContent = e.message; }
    }
    input.value = ''; draw(); onChange();
  } });
  draw();
  return el('div', {}, el('div', { class: 'btnrow' }, btn('Attach reference file…', () => input.click()), input), list, modeRow, msg,
    el('div', { class: 'note' }, 'PDF papers, Word, PowerPoint, Excel / CSV, text or an image. Attachments are sent to Anthropic with your request.'));
}
