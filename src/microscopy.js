// Microscopy panels: calibrated scale bars, multi-channel TIFF split / merge, brightness & contrast,
// zoom insets and image grids. Images stay ordinary image objects; a scale bar is stored on the image
// (o.scaleBar + o.umPerPx) and drawn by render.js, so it stays correct when the image is resized or cropped.

// ---------- Scale bar ----------
function scaleBarSvg(o) {
  const sb = o.scaleBar, umPerPx = +o.umPerPx;
  if (!sb || !(umPerPx > 0) || !o.nw) return '';
  const c = o.crop || {}, visW = o.nw * (1 - (c.l || 0) - (c.r || 0));
  const k = { nm: 0.001, mm: 1000 }[sb.unit] || 1; // the bar length is entered in the bar's own unit
  const len = (((+sb.um || 10) * k) / umPerPx) * (o.w / visW);
  const th = Math.max(1, (sb.thick || 0.012) * Math.min(o.w, o.h) * 1.4), pad = Math.min(o.w, o.h) * 0.05;
  const fs = Math.max(6, (sb.fontScale || 1) * Math.min(o.w, o.h) * 0.055);
  const right = sb.pos !== 'bl' && sb.pos !== 'tl', bottom = sb.pos !== 'tr' && sb.pos !== 'tl';
  const x = right ? o.w - pad - len : pad, y = bottom ? o.h - pad - th : pad + (sb.label !== false ? fs + 3 : 0);
  const col = sb.color || '#ffffff';
  let s = `<rect x="${x}" y="${y}" width="${len}" height="${th}" fill="${col}"/>`;
  if (sb.label !== false) s += `<text x="${x + len / 2}" y="${bottom ? y - 3 : y - 3}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="${col}">${sb.um} ${sb.unit || 'µm'}</text>`;
  return s;
}
const niceBarLength = (umVisible) => { const target = umVisible / 5, mag = 10 ** Math.floor(Math.log10(target)); return [1, 2, 5, 10].map((k) => k * mag).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a)); };
function scaleBarSection(o) {
  const L = [o];
  const set = (k, v) => { checkpoint('sb' + o.id); o.scaleBar = { ...(o.scaleBar || {}), [k]: v }; renderScene(); };
  const visUm = o.umPerPx > 0 && o.nw ? o.umPerPx * o.nw * (1 - ((o.crop || {}).l || 0) - ((o.crop || {}).r || 0)) : 0;
  const sb = o.scaleBar;
  return sect('Microscopy',
    row('µm / pixel', el('input', { type: 'number', step: 'any', min: 0, value: o.umPerPx || '', placeholder: 'calibration', oninput: (e) => setProps(L, 'umPerPx', parseFloat(e.target.value) || 0) })),
    el('div', { class: 'note' }, o.umPerPx ? `Image is ${visUm.toPrecision(3)} µm wide.` : 'Type the pixel size from the microscope (or load the image as a TIFF through Insert › Microscopy Channels to read it from the file).'),
    sb ? el('div', {},
      row('Bar length', el('input', { type: 'number', step: 'any', min: 0, value: sb.um, style: 'width:70px', oninput: (e) => set('um', parseFloat(e.target.value) || 1) }), el('select', { onchange: (e) => set('unit', e.target.value) }, ...['µm', 'nm', 'mm'].map((u) => el('option', { value: u, textContent: u, selected: (sb.unit || 'µm') === u })))),
      row('Position', el('select', { onchange: (e) => set('pos', e.target.value) }, ...[['br', 'Bottom right'], ['bl', 'Bottom left'], ['tr', 'Top right'], ['tl', 'Top left']].map(([v, l]) => el('option', { value: v, textContent: l, selected: (sb.pos || 'br') === v })))),
      row('Colour', el('input', { type: 'color', value: sb.color || '#ffffff', oninput: (e) => set('color', e.target.value) })),
      row('Thickness', el('input', { type: 'range', min: 0.004, max: 0.04, step: 0.002, value: sb.thick || 0.012, oninput: (e) => set('thick', +e.target.value) })),
      row('Text size', el('input', { type: 'range', min: 0.5, max: 2, step: 0.05, value: sb.fontScale || 1, oninput: (e) => set('fontScale', +e.target.value) })),
      row('', el('label', { style: 'width:auto;color:inherit' }, el('input', { type: 'checkbox', checked: sb.label !== false, onchange: (e) => set('label', e.target.checked) }), ' Show length'))) : null,
    el('div', { class: 'btnrow' },
      sb ? btn('Remove scale bar', () => { checkpoint(); o.scaleBar = null; render({ props: true }); })
        : btn('Add scale bar', () => { if (!(o.umPerPx > 0)) { toast('Enter the µm / pixel calibration first'); return; } checkpoint(); o.scaleBar = { um: niceBarLength(visUm), pos: 'br', color: '#ffffff' }; render({ props: true }); }, 'primary'),
      btn('Brightness / contrast…', () => openLevelsDialog()),
      btn('Zoom inset…', () => openInsetDialog(o))));
}
// ---------- TIFF reading (UTIF) ----------
// Returns { width, height, channels: [{ name, data: Float32Array, max }], umPerPx, slices, note }.
function readTiffStack(buf, { slice = 'max' } = {}) {
  if (typeof UTIF === 'undefined') throw new Error('TIFF support is not loaded');
  const ifds = UTIF.decode(buf).filter((d) => d.t256);
  if (!ifds.length) throw new Error('no images in this TIFF');
  const first = ifds[0], desc = String((first.t270 && first.t270[0]) || '');
  const W = first.t256[0], H = first.t257[0];
  // Dimensions: ImageJ hyperstack (channels / slices / frames, CZT order) or OME-XML.
  let C = 0, Z = 1, T = 1, order = 'XYCZT', umPerPx = 0, names = [];
  const ij = (k) => { const m = desc.match(new RegExp(`(?:^|\\n)${k}=([^\\n]+)`)); return m ? m[1].trim() : null; };
  if (/ImageJ=/.test(desc)) {
    C = +ij('channels') || 0; Z = +ij('slices') || 1; T = +ij('frames') || 1;
    const unit = (ij('unit') || '').replace(/\\u00B5/i, 'µ').toLowerCase(), xr = first.t282 ? first.t282[0] : 0;
    const k = /^(micron|µm|um|microns)$/.test(unit) ? 1 : unit === 'nm' ? 0.001 : unit === 'mm' ? 1000 : 0;
    if (k && xr > 0) umPerPx = k / xr;
  } else if (/<OME/i.test(desc)) {
    const att = (a) => { const m = desc.match(new RegExp(`<Pixels[^>]*\\b${a}="([^"]+)"`, 'i')); return m ? m[1] : null; };
    C = +att('SizeC') || 0; Z = +att('SizeZ') || 1; T = +att('SizeT') || 1; order = att('DimensionOrder') || order;
    const ps = parseFloat(att('PhysicalSizeX')), u = att('PhysicalSizeXUnit') || 'µm';
    if (ps > 0) umPerPx = ps * ({ nm: 0.001, mm: 1000, 'Å': 0.0001 }[u] || 1);
    names = [...desc.matchAll(/<Channel[^>]*\bName="([^"]*)"/gi)].map((m) => m[1]);
  } else if (first.t296 && first.t296[0] === 3 && first.t282) umPerPx = 10000 / first.t282[0]; // pixels per cm
  const spp = first.t277 ? first.t277[0] : 1;
  const decode = (ifd) => {
    UTIF.decodeImage(buf, ifd, ifds);
    const bps = ifd.t258 ? ifd.t258[0] : 8, fmt = ifd.t339 ? ifd.t339[0] : 1, n = ifd.width * ifd.height, sp = ifd.t277 ? ifd.t277[0] : 1;
    const dv = new DataView(ifd.data.buffer, ifd.data.byteOffset, ifd.data.byteLength), le = bps === 16 ? true : ifd.isLE;
    const out = Array.from({ length: sp }, () => new Float32Array(n));
    for (let i = 0; i < n; i++) for (let c = 0; c < sp; c++) {
      const k = i * sp + c;
      out[c][i] = bps === 8 ? ifd.data[k] : bps === 16 ? dv.getUint16(k * 2, le) : bps === 32 ? (fmt === 3 ? dv.getFloat32(k * 4, le) : dv.getUint32(k * 4, le)) : 0;
    }
    return out;
  };
  let chans, note = '';
  if (spp >= 3 && ifds.length === 1) { chans = decode(first).slice(0, 3); names = names.length ? names : ['Red', 'Green', 'Blue']; }
  else {
    if (!C) { C = ifds.length; Z = 1; T = 1; }
    const idx = (c, z, t) => (order === 'XYZCT' ? z + Z * (c + C * t) : c + C * (z + Z * t));
    chans = [];
    for (let c = 0; c < C; c++) {
      if (Z > 1 && slice === 'max') {
        const acc = new Float32Array(W * H).fill(-Infinity);
        for (let z = 0; z < Z; z++) { const d = ifds[idx(c, z, 0)]; if (!d) continue; const px = decode(d)[0]; for (let i = 0; i < px.length; i++) if (px[i] > acc[i]) acc[i] = px[i]; }
        chans.push(acc);
      } else { const z = Z > 1 ? Math.min(Z - 1, Math.max(0, (+slice || 1) - 1)) : 0; const d = ifds[idx(c, z, 0)]; if (d) chans.push(decode(d)[0]); }
    }
    if (Z > 1) note = slice === 'max' ? `Maximum-intensity projection of ${Z} z-slices.` : `z-slice ${slice} of ${Z}.`;
    if (T > 1) note += ` First of ${T} time points.`;
  }
  return { width: W, height: H, channels: chans.map((data, i) => ({ name: names[i] || `Channel ${i + 1}`, data })), umPerPx, slices: Z, note };
}
async function readImageAsChannel(file) {
  const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('cannot read ' + file.name)); i.src = url; });
  const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  return { width: cv.width, height: cv.height, data: out };
}
// Display range that saturates `sat` of the pixels at each end (like ImageJ's Auto).
function autoRange(data, sat = 0.0035) {
  const n = data.length, step = Math.max(1, Math.floor(n / 200000)), sample = [];
  for (let i = 0; i < n; i += step) if (isFinite(data[i])) sample.push(data[i]);
  sample.sort((a, b) => a - b);
  const lo = sample[Math.floor(sample.length * sat)] ?? 0, hi = sample[Math.min(sample.length - 1, Math.floor(sample.length * (1 - sat)))] ?? 1;
  return { lo, hi: hi > lo ? hi : lo + 1, max: sample[sample.length - 1] ?? 1 };
}
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(toHex(h).slice(i, i + 2), 16));
// Composite channels into an RGBA canvas; each channel: { data, lo, hi, color, gamma, on }.
function compositeCanvas(W, H, chans, maxSide = 1600) {
  const k = Math.min(1, maxSide / Math.max(W, H)), w = Math.round(W * k), h = Math.round(H * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'), img = g.createImageData(w, h), px = img.data;
  const act = chans.filter((c) => c.on !== false).map((c) => ({ ...c, rgb: hexRgb(c.color) }));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = Math.min(H - 1, Math.floor(y / k)) * W + Math.min(W - 1, Math.floor(x / k)), o = (y * w + x) * 4;
    let r = 0, gg = 0, b = 0;
    for (const c of act) {
      let v = (c.data[si] - c.lo) / (c.hi - c.lo); v = v < 0 ? 0 : v > 1 ? 1 : v;
      if (c.gamma && c.gamma !== 1) v = v ** (1 / c.gamma);
      r += v * c.rgb[0]; gg += v * c.rgb[1]; b += v * c.rgb[2];
    }
    px[o] = Math.min(255, r); px[o + 1] = Math.min(255, gg); px[o + 2] = Math.min(255, b); px[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
const CHANNEL_COLOURS = ['#0055ff', '#00e000', '#ff1a1a', '#ff00ff', '#00e5e5', '#ffd400', '#ffffff'];
const guessChannelColour = (name, i, n) => {
  const s = String(name).toLowerCase();
  if (/dapi|hoechst|nuc|blue|405/.test(s)) return '#0055ff';
  if (/gfp|488|fitc|green|alexa ?488/.test(s)) return '#00e000';
  if (/cy3|555|568|594|red|rfp|mcherry|tritc|tdtom/.test(s)) return '#ff1a1a';
  if (/cy5|647|633|far|magenta/.test(s)) return '#ff00ff';
  return n === 3 ? ['#0055ff', '#00e000', '#ff1a1a'][i] : CHANNEL_COLOURS[i % CHANNEL_COLOURS.length];
};

// ---------- Channels dialog: split / merge panel row ----------
function openChannelsDialog() {
  const st = { W: 0, H: 0, chans: [], umPerPx: 0, note: '', buf: null, slice: 'max', slices: 1, gray: false, layout: 'row', panelW: 220, labels: true, scaleBar: true, gap: 8 };
  const prev = el('div', { class: 'preview', style: 'min-height:180px;display:flex;align-items:center;justify-content:center;background:#222' }, el('div', { class: 'note', style: 'color:#ccc' }, 'Load a multi-channel TIFF (ImageJ / Fiji, OME-TIFF) or one image per channel.'));
  const list = el('div', {});
  const info = el('div', { class: 'note' });
  const umIn = el('input', { type: 'number', step: 'any', min: 0, placeholder: 'µm / pixel', style: 'width:90px', oninput: (e) => { st.umPerPx = parseFloat(e.target.value) || 0; } });
  const sliceRow = el('div', { class: 'row hidden' });
  const draw = () => {
    if (!st.chans.length) return;
    const cv = compositeCanvas(st.W, st.H, st.chans, 420);
    prev.innerHTML = ''; cv.style.maxWidth = '100%'; cv.style.maxHeight = '300px'; prev.append(cv);
  };
  const rows = () => {
    list.innerHTML = '';
    st.chans.forEach((c, i) => {
      const lo = el('input', { type: 'number', step: 'any', value: +c.lo.toPrecision(5), style: 'width:72px', oninput: (e) => { c.lo = +e.target.value; draw(); } });
      const hi = el('input', { type: 'number', step: 'any', value: +c.hi.toPrecision(5), style: 'width:72px', oninput: (e) => { c.hi = +e.target.value; draw(); } });
      list.append(el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' },
        el('input', { type: 'checkbox', checked: c.on !== false, title: 'Include in the merge', onchange: (e) => { c.on = e.target.checked; draw(); } }),
        el('input', { type: 'text', value: c.name, style: 'width:110px', oninput: (e) => { c.name = e.target.value; } }),
        el('input', { type: 'color', value: c.color, oninput: (e) => { c.color = e.target.value; draw(); } }),
        el('span', { class: 'note', textContent: 'min' }), lo, el('span', { class: 'note', textContent: 'max' }), hi,
        btn('Auto', () => { const r = autoRange(c.data); c.lo = r.lo; c.hi = r.hi; rows(); draw(); }),
        el('span', { class: 'note', textContent: 'γ' }), el('input', { type: 'number', step: 0.1, min: 0.2, max: 3, value: c.gamma || 1, style: 'width:52px', oninput: (e) => { c.gamma = +e.target.value || 1; draw(); } })));
    });
  };
  const load = (res, fromTiff) => {
    st.W = res.width; st.H = res.height; st.note = res.note || '';
    st.chans = res.channels.map((c, i) => { const r = autoRange(c.data); return { name: c.name, data: c.data, lo: r.lo, hi: r.hi, color: guessChannelColour(c.name, i, res.channels.length), gamma: 1, on: true }; });
    if (res.umPerPx) { st.umPerPx = res.umPerPx; umIn.value = +res.umPerPx.toPrecision(5); }
    sliceRow.classList.toggle('hidden', !(fromTiff && res.slices > 1));
    info.textContent = `${st.W} × ${st.H} px, ${st.chans.length} channel${st.chans.length === 1 ? '' : 's'}. ${st.note} ${res.umPerPx ? `Calibration read from the file: ${res.umPerPx.toPrecision(4)} µm / pixel.` : 'No calibration in the file: type µm / pixel for a scale bar.'}`;
    rows(); draw();
  };
  const fileIn = el('input', { type: 'file', multiple: true, accept: '.tif,.tiff,.png,.jpg,.jpeg', style: 'display:none', onchange: async (e) => {
    const files = [...e.target.files]; fileIn.value = '';
    if (!files.length) return;
    try {
      if (files.length === 1 && /\.tiff?$/i.test(files[0].name)) {
        st.buf = await files[0].arrayBuffer();
        const r = readTiffStack(st.buf, { slice: st.slice });
        st.slices = r.slices;
        sliceSel.innerHTML = ''; sliceSel.append(el('option', { value: 'max', textContent: 'Max projection' }), ...Array.from({ length: r.slices }, (_, i) => el('option', { value: i + 1, textContent: `Slice ${i + 1}` })));
        load(r, true);
      } else {
        const parts = [];
        for (const f of files) {
          if (/\.tiff?$/i.test(f.name)) { const r = readTiffStack(await f.arrayBuffer()); r.channels.forEach((c) => parts.push({ width: r.width, height: r.height, data: c.data, name: f.name.replace(/\.[^.]+$/, '') })); if (r.umPerPx) st.umPerPx = r.umPerPx; }
          else { const r = await readImageAsChannel(f); parts.push({ ...r, name: f.name.replace(/\.[^.]+$/, '') }); }
        }
        const W = parts[0].width, H = parts[0].height;
        if (parts.some((p) => p.width !== W || p.height !== H)) throw new Error('all channel images must have the same size');
        load({ width: W, height: H, channels: parts.map((p) => ({ name: p.name, data: p.data })), umPerPx: st.umPerPx }, false);
      }
    } catch (err) { toast('Could not read: ' + err.message, 4000); }
  } });
  const sliceSel = el('select', { onchange: (e) => { st.slice = e.target.value; try { const keep = st.chans.map((c) => ({ name: c.name, color: c.color, on: c.on })); load(readTiffStack(st.buf, { slice: st.slice }), true); st.chans.forEach((c, i) => Object.assign(c, keep[i] || {})); rows(); draw(); } catch (err) { toast(err.message); } } });
  sliceRow.append(el('label', { textContent: 'Z' }), sliceSel);
  const insert = () => {
    if (!st.chans.length) { toast('Load an image first'); return; }
    const singles = st.chans.map((c) => compositeCanvas(st.W, st.H, [{ ...c, on: true, color: st.gray ? '#ffffff' : c.color }]));
    const merge = compositeCanvas(st.W, st.H, st.chans);
    const panels = [...singles.map((cv, i) => ({ cv, name: st.chans[i].name, color: st.gray ? '#222222' : Color.dark(st.chans[i].color, 0.15) })), { cv: merge, name: 'Merge', color: '#222222' }];
    const pw = +st.panelW || 220, ph = pw * (st.H / st.W), gap = +st.gap || 0, c = viewCenter(), out = [];
    const cols = st.layout === 'grid' ? Math.ceil(Math.sqrt(panels.length)) : st.layout === 'column' ? 1 : panels.length;
    const labH = st.labels ? 20 : 0, tw = cols * pw + (cols - 1) * gap, rowsN = Math.ceil(panels.length / cols);
    const x0 = c.x - tw / 2, y0 = c.y - (rowsN * (ph + labH + gap)) / 2;
    panels.forEach((p, i) => {
      const col = i % cols, rw = Math.floor(i / cols), x = x0 + col * (pw + gap), y = y0 + rw * (ph + labH + gap) + labH;
      const im = Make.image(p.cv.toDataURL('image/png'), x, y, pw, ph, { nw: p.cv.width, nh: p.cv.height, name: p.name, umPerPx: st.umPerPx ? st.umPerPx * (st.W / p.cv.width) : 0 });
      if (st.scaleBar && st.umPerPx && i === panels.length - 1) im.scaleBar = { um: niceBarLength(st.umPerPx * st.W), pos: 'br', color: '#ffffff' };
      out.push(im);
      if (st.labels) { const t = Make.text(p.name, x, y - labH + 2, { fontSize: 13, bold: true, color: p.color }); t.x = x + pw / 2 - t.w / 2; out.push(t); }
    });
    closeModal();
    addObjects(out);
    const legend = st.chans.map((ch) => `${ch.name}: display range ${+ch.lo.toPrecision(4)}–${+ch.hi.toPrecision(4)}${ch.gamma && ch.gamma !== 1 ? `, γ ${ch.gamma}` : ''}`).join('; ');
    toast(`Inserted ${panels.length} panels. For the legend — ${st.note} ${legend}`, 7000);
  };
  const opt = (k, input) => { input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => { st[k] = input.type === 'checkbox' ? input.checked : input.value; }); return input; };
  openModal('Microscopy channels', el('div', { style: 'width:820px;max-width:92vw' },
    el('div', { class: 'dlg-cols' },
      el('div', {}, prev, info),
      el('div', {},
        el('div', { class: 'btnrow' }, btn('Open TIFF or images…', () => fileIn.click(), 'primary'), fileIn),
        sliceRow,
        field_('Calibration', umIn),
        field_('Layout', opt('layout', el('select', {}, ...[['row', 'One row'], ['column', 'One column'], ['grid', 'Grid']].map(([v, l]) => el('option', { value: v, textContent: l }))))),
        field_('Panel width', opt('panelW', el('input', { type: 'number', value: st.panelW, min: 40, style: 'width:80px' }))),
        field_('Gap', opt('gap', el('input', { type: 'number', value: st.gap, min: 0, style: 'width:80px' }))),
        field_('', el('label', { style: 'width:auto;color:inherit' }, opt('gray', el('input', { type: 'checkbox' })), ' Single channels in greyscale')),
        field_('', el('label', { style: 'width:auto;color:inherit' }, opt('labels', el('input', { type: 'checkbox', checked: true })), ' Channel names above')),
        field_('', el('label', { style: 'width:auto;color:inherit' }, opt('scaleBar', el('input', { type: 'checkbox', checked: true })), ' Scale bar on the merge')))),
    el('h3', { textContent: 'Channels' }), list,
    el('div', { class: 'note' }, 'The same display range is used for a channel in every panel. Linear min / max changes are generally acceptable if applied to the whole image and reported; state them (and any γ ≠ 1) in the figure legend.'),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert panels', insert, 'primary'))));
}

// ---------- Brightness / contrast for selected images ----------
async function imageToCanvas(src) {
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('cannot read image')); i.src = src; });
  const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  cv.getContext('2d').drawImage(im, 0, 0);
  return cv;
}
function openLevelsDialog() {
  const imgs = selected().filter((o) => o.type === 'image');
  if (!imgs.length) { toast('Select one or more images'); return; }
  const st = { lo: 0, hi: 255, gamma: 1 }, prev = el('div', { class: 'preview', style: 'min-height:200px;display:flex;align-items:center;justify-content:center;background:#222' });
  let base = null;
  const adjust = (cv) => {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height), p = d.data, lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) { let u = (v - st.lo) / Math.max(1, st.hi - st.lo); u = u < 0 ? 0 : u > 1 ? 1 : u; lut[v] = 255 * u ** (1 / st.gamma); }
    for (let i = 0; i < p.length; i += 4) { p[i] = lut[p[i]]; p[i + 1] = lut[p[i + 1]]; p[i + 2] = lut[p[i + 2]]; }
    g.putImageData(d, 0, 0);
    return cv;
  };
  const draw = () => {
    if (!base) return;
    const cv = document.createElement('canvas'), k = Math.min(1, 420 / Math.max(base.width, base.height));
    cv.width = base.width * k; cv.height = base.height * k; cv.getContext('2d').drawImage(base, 0, 0, cv.width, cv.height);
    adjust(cv); cv.style.maxWidth = '100%'; prev.innerHTML = ''; prev.append(cv);
  };
  imageToCanvas(imgs[0].srcOriginal || imgs[0].src).then((cv) => { base = cv; draw(); }).catch((e) => toast(e.message));
  const slider = (k, min, max, step) => el('input', { type: 'range', min, max, step, value: st[k], oninput: (e) => { st[k] = +e.target.value; draw(); } });
  openModal('Brightness & contrast', el('div', { style: 'width:520px;max-width:90vw' }, prev,
    field_('Black point', slider('lo', 0, 254, 1)), field_('White point', slider('hi', 1, 255, 1)), field_('Gamma', slider('gamma', 0.3, 3, 0.05)),
    el('div', { class: 'note' }, `Applies the same linear adjustment to ${imgs.length === 1 ? 'the selected image' : `all ${imgs.length} selected images`}, starting from the original pixels each time. Report adjustments in the legend; gamma changes in particular must be stated.`),
    el('div', { class: 'actions' },
      btn('Restore originals', () => { checkpoint(); imgs.forEach((o) => { if (o.srcOriginal) { o.src = o.srcOriginal; delete o.srcOriginal; delete o.levels; } }); closeModal(); render({ props: true }); }),
      btn('Cancel', closeModal),
      btn('Apply', async () => {
        checkpoint();
        for (const o of imgs) { const cv = adjust(await imageToCanvas(o.srcOriginal || o.src)); o.srcOriginal = o.srcOriginal || o.src; o.src = cv.toDataURL('image/png'); o.levels = { ...st }; }
        closeModal(); render({ props: true }); toast(`Adjusted ${imgs.length} image${imgs.length === 1 ? '' : 's'}: black ${st.lo}, white ${st.hi}${st.gamma !== 1 ? `, γ ${st.gamma}` : ''}`, 4000);
      }, 'primary'))));
}

// ---------- Zoom inset ----------
function openInsetDialog(img) {
  img = img || selected().find((o) => o.type === 'image');
  if (!img) { toast('Select an image first'); return; }
  const c0 = img.crop || { l: 0, t: 0, r: 0, b: 0 };
  const st = { box: { x: 0.55, y: 0.55, w: 0.25, h: 0.25 }, pos: 'right', mag: 2.5, color: '#ffffff', dashed: true, lines: true };
  const vw = 460, vh = vw * (img.h / img.w);
  const wrap = el('div', { style: `position:relative;width:${vw}px;height:${vh}px;max-width:100%;cursor:crosshair;user-select:none` });
  const pic = el('div', { style: `position:absolute;inset:0;pointer-events:none` });
  pic.innerHTML = `<svg width="${vw}" height="${vh}">${renderObjectString({ ...img, x: 0, y: 0, w: vw, h: vh, rot: 0, scaleBar: null }, [], true)}</svg>`;
  const boxEl = el('div', { style: 'position:absolute;border:2px dashed #ffd400;box-shadow:0 0 0 1px #000;pointer-events:none' });
  const place = () => Object.assign(boxEl.style, { left: st.box.x * vw + 'px', top: st.box.y * vh + 'px', width: st.box.w * vw + 'px', height: st.box.h * vh + 'px' });
  wrap.append(pic, boxEl); place();
  let start = null;
  wrap.addEventListener('pointerdown', (e) => { const r = wrap.getBoundingClientRect(); start = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; wrap.setPointerCapture(e.pointerId); });
  wrap.addEventListener('pointermove', (e) => {
    if (!start) return;
    const r = wrap.getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    let w = Math.abs(x - start.x), h = Math.abs(y - start.y);
    if (!e.shiftKey) { const s = Math.max(w * img.w, h * img.h); w = s / img.w; h = s / img.h; } // square by default; Shift = free
    st.box = { x: x < start.x ? start.x - w : start.x, y: y < start.y ? start.y - h : start.y, w, h };
    st.box.x = Math.max(0, Math.min(1 - st.box.w, st.box.x)); st.box.y = Math.max(0, Math.min(1 - st.box.h, st.box.y));
    place();
  });
  wrap.addEventListener('pointerup', () => { start = null; });
  const make = () => {
    const b = st.box;
    if (b.w < 0.01 || b.h < 0.01) { toast('Drag a box over the region to enlarge'); return; }
    const out = [], bx = img.x + b.x * img.w, by = img.y + b.y * img.h, bw = b.w * img.w, bh = b.h * img.h;
    const frame = Make.rect(bx, by, bw, bh, { fill: 'none', stroke: st.color, strokeWidth: 1.5, radius: 0, dashStyle: st.dashed ? 'dashed' : 'solid', name: 'Inset region' });
    // Crop of the inset in native-pixel fractions, composed with the image's own crop.
    const vx = 1 - c0.l - c0.r, vy = 1 - c0.t - c0.b;
    const crop = { l: c0.l + b.x * vx, t: c0.t + b.y * vy, r: 1 - (c0.l + (b.x + b.w) * vx), b: 1 - (c0.t + (b.y + b.h) * vy) };
    let iw = bw * st.mag, ih = bh * st.mag;
    // Keep the asked-for zoom unless the inset would outgrow the image beside it.
    const fit = st.pos === 'right' || st.pos === 'left' ? img.h / ih : st.pos === 'below' ? img.w / iw : 0.45 * Math.min(img.w / iw, img.h / ih);
    if (fit < 1) { iw *= fit; ih *= fit; }
    const gap = 10;
    const pos = { right: [img.x + img.w + gap, img.y], left: [img.x - gap - iw, img.y], below: [img.x, img.y + img.h + gap], inside_tr: [img.x + img.w - iw - 6, img.y + 6], inside_br: [img.x + img.w - iw - 6, img.y + img.h - ih - 6] }[st.pos];
    const inset = Make.image(img.src, pos[0], pos[1], iw, ih, { nw: img.nw, nh: img.nh, crop, clip: 'rect', clipStroke: st.color, clipStrokeWidth: 2, name: 'Zoom inset', umPerPx: img.umPerPx });
    if (img.scaleBar && img.umPerPx) inset.scaleBar = { ...img.scaleBar, um: niceBarLength(img.umPerPx * img.nw * (1 - crop.l - crop.r)) };
    out.push(frame, inset);
    if (st.lines) {
      const corners = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
      const A = corners(bx, by, bw, bh), B = corners(inset.x, inset.y, iw, ih);
      const pair = st.pos === 'right' ? [[1, 0], [2, 3]] : st.pos === 'left' ? [[0, 1], [3, 2]] : st.pos === 'below' ? [[3, 0], [2, 1]] : [[1, 0], [3, 2]];
      pair.forEach(([i, j]) => out.push(makePathFromNodes([{ x: A[i][0], y: A[i][1] }, { x: B[j][0], y: B[j][1] }], { stroke: st.color, strokeWidth: 1.2, dashStyle: st.dashed ? 'dashed' : 'solid', name: 'Inset line' })));
    }
    closeModal();
    addObjects(out);
    toast(`Inset magnified ${(iw / bw).toFixed(1)}×`);
  };
  const opt = (k, input, num) => { input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => { st[k] = input.type === 'checkbox' ? input.checked : num ? +input.value : input.value; }); return input; };
  openModal('Zoom inset', el('div', { style: 'width:760px;max-width:92vw;display:grid;grid-template-columns:auto 230px;gap:14px' }, wrap,
    el('div', {},
      el('div', { class: 'note' }, 'Drag over the region to enlarge (square; hold Shift for any shape).'),
      field_('Inset', opt('pos', el('select', {}, ...[['right', 'Right of the image'], ['left', 'Left'], ['below', 'Below'], ['inside_tr', 'Inside, top right'], ['inside_br', 'Inside, bottom right']].map(([v, l]) => el('option', { value: v, textContent: l }))))),
      field_('Zoom', opt('mag', el('input', { type: 'number', value: st.mag, min: 1, step: 0.5, style: 'width:70px' }), true)),
      field_('Colour', opt('color', el('input', { type: 'color', value: st.color }))),
      field_('', el('label', { style: 'width:auto;color:inherit' }, opt('dashed', el('input', { type: 'checkbox', checked: true })), ' Dashed outline')),
      field_('', el('label', { style: 'width:auto;color:inherit' }, opt('lines', el('input', { type: 'checkbox', checked: true })), ' Connecting lines')),
      el('div', { class: 'note' }, 'If the inset would be larger than the image, the zoom is reduced to fit. The inset is a crop of the same pixels, not a resampled image.'),
      el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Insert inset', make, 'primary')))));
}

// ---------- Image grid ----------
function openImageGridDialog() {
  const fromSel = selected().filter((o) => o.type === 'image');
  const st = { files: [], cols: Math.max(1, Math.min(4, fromSel.length || 3)), cellW: 180, gap: 6, fill: true, colLabels: '', rowLabels: '', letters: false, fs: 13 };
  const info = el('div', { class: 'note' }, fromSel.length >= 2 ? `${fromSel.length} selected images will be arranged.` : 'Add images (PNG, JPEG or TIFF), or select images on the page first.');
  const fileIn = el('input', { type: 'file', multiple: true, accept: '.png,.jpg,.jpeg,.tif,.tiff', style: 'display:none', onchange: async (e) => {
    const fs = [...e.target.files]; fileIn.value = '';
    for (const f of fs) {
      try {
        if (/\.tiff?$/i.test(f.name)) { const r = readTiffStack(await f.arrayBuffer()); const cv = compositeCanvas(r.width, r.height, r.channels.map((c, i) => ({ ...autoRange(c.data), data: c.data, color: r.channels.length === 1 ? '#ffffff' : guessChannelColour(c.name, i, r.channels.length) }))); st.files.push({ name: f.name, src: cv.toDataURL('image/png'), w: cv.width, h: cv.height, umPerPx: r.umPerPx * (r.width / cv.width) }); }
        else { const src = await new Promise((res) => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.readAsDataURL(f); }); const s = await loadImageSize(src); st.files.push({ name: f.name, src, w: s.w, h: s.h }); }
      } catch (err) { toast(`${f.name}: ${err.message}`); }
    }
    info.textContent = `${st.files.length} image${st.files.length === 1 ? '' : 's'} added (in file-name order: ${st.files.map((x) => x.name).join(', ')})`;
    st.files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  } });
  const make = () => {
    const items = st.files.length ? st.files.map((f) => ({ src: f.src, nw: f.w, nh: f.h, umPerPx: f.umPerPx || 0, name: f.name.replace(/\.[^.]+$/, '') }))
      : [...fromSel].sort((a, b) => (Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x)).map((o) => ({ src: o.src, nw: o.nw, nh: o.nh, crop: o.crop, umPerPx: o.umPerPx, scaleBar: o.scaleBar, name: o.name, old: o }));
    if (!items.length) { toast('Add images first'); return; }
    const cols = Math.max(1, +st.cols || 1), cw = +st.cellW || 180, gap = +st.gap || 0;
    const ar0 = items[0].crop ? (items[0].nw * (1 - items[0].crop.l - items[0].crop.r)) / (items[0].nh * (1 - items[0].crop.t - items[0].crop.b)) : items[0].nw / items[0].nh;
    const ch = cw / (ar0 || 1);
    const colL = st.colLabels.split(/[,;|]/).map((s) => s.trim()).filter((s, i, a) => s || i < a.length - 1);
    const rowL = st.rowLabels.split(/[,;|]/).map((s) => s.trim()).filter((s, i, a) => s || i < a.length - 1);
    const topPad = colL.length ? st.fs + 10 : 0, leftPad = rowL.length ? st.fs + 12 : 0, c = viewCenter();
    const rowsN = Math.ceil(items.length / cols), x0 = c.x - (cols * (cw + gap)) / 2 + leftPad / 2, y0 = c.y - (rowsN * (ch + gap)) / 2 + topPad / 2;
    const out = [];
    items.forEach((it, i) => {
      const x = x0 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
      let crop = it.crop || null;
      if (st.fill) { // centre-crop every image to the first image's aspect so the grid is even
        const base = it.crop || { l: 0, t: 0, r: 0, b: 0 }, vw = it.nw * (1 - base.l - base.r), vh = it.nh * (1 - base.t - base.b), ar = vw / vh;
        crop = { ...base };
        if (ar > ar0) { const cut = (1 - ar0 / ar) * (1 - base.l - base.r) / 2; crop.l += cut; crop.r += cut; } else if (ar < ar0) { const cut = (1 - ar / ar0) * (1 - base.t - base.b) / 2; crop.t += cut; crop.b += cut; }
      }
      out.push(Make.image(it.src, x, y, cw, st.fill ? ch : cw * (it.nh / it.nw), { nw: it.nw, nh: it.nh, crop, name: it.name, umPerPx: it.umPerPx, scaleBar: it.scaleBar }));
      if (st.letters) out.push(Make.text(String.fromCharCode(65 + i), x + 5, y + 3, { fontSize: st.fs + 2, bold: true, color: '#ffffff' }));
    });
    colL.forEach((lab, j) => { if (!lab || j >= cols) return; const t = Make.text(lab, 0, y0 - topPad + 2, { fontSize: st.fs, bold: true }); t.x = x0 + j * (cw + gap) + cw / 2 - t.w / 2; out.push(t); });
    rowL.forEach((lab, r) => { if (!lab || r >= rowsN) return; const t = Make.text(lab, 0, 0, { fontSize: st.fs, bold: true, rot: -90 }); t.x = x0 - leftPad / 2 - t.w / 2 - 4; t.y = y0 + r * (ch + gap) + ch / 2 - t.h / 2; out.push(t); });
    closeModal();
    if (!st.files.length) { checkpoint(); page().objects = objs().filter((o) => !fromSel.includes(o)); }
    addObjects(out);
  };
  const opt = (k, input) => { input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => { st[k] = input.type === 'checkbox' ? input.checked : input.value; }); return input; };
  openModal('Image grid', el('div', { style: 'width:520px;max-width:90vw' }, info,
    el('div', { class: 'btnrow', style: 'margin:6px 0' }, btn('Add images…', () => fileIn.click()), fileIn),
    field_('Columns', opt('cols', el('input', { type: 'number', min: 1, value: st.cols, style: 'width:70px' }))),
    field_('Cell width', opt('cellW', el('input', { type: 'number', min: 20, value: st.cellW, style: 'width:70px' }))),
    field_('Gap', opt('gap', el('input', { type: 'number', min: 0, value: st.gap, style: 'width:70px' }))),
    field_('Columns are', opt('colLabels', el('input', { type: 'text', placeholder: 'e.g. Vehicle, Anti-PD-1, Combination' }))),
    field_('Rows are', opt('rowLabels', el('input', { type: 'text', placeholder: 'e.g. CD8, Granzyme B, DAPI' }))),
    field_('', el('label', { style: 'width:auto;color:inherit' }, opt('fill', el('input', { type: 'checkbox', checked: true })), ' Crop all to the same shape (centre)')),
    field_('', el('label', { style: 'width:auto;color:inherit' }, opt('letters', el('input', { type: 'checkbox' })), ' Letter each image (A, B, C…)')),
    el('div', { class: 'actions' }, btn('Cancel', closeModal), btn('Make grid', make, 'primary'))));
}

// ---------- Hooks ----------
const _renderPropsMicro = renderProps;
renderProps = function () {
  _renderPropsMicro();
  const sel = selected();
  if (sel.length === 1 && sel[0].type === 'image') {
    const P = $('#props'), s = scaleBarSection(sel[0]), anchor = [...P.children].find((c) => c.querySelector('h3')?.textContent === 'Image');
    if (anchor) anchor.after(s); else P.append(s);
  }
};
ARRANGE_COMMANDS.microChannels = openChannelsDialog;
ARRANGE_COMMANDS.imageLevels = openLevelsDialog;
ARRANGE_COMMANDS.zoomInset = () => openInsetDialog();
ARRANGE_COMMANDS.imageGrid = openImageGridDialog;
ARRANGE_COMMANDS.scaleBar = () => {
  const o = selected().find((x) => x.type === 'image');
  if (!o) { toast('Select an image first'); return; }
  if (!(o.umPerPx > 0)) { toast('Enter the µm / pixel calibration in the Microscopy section on the right'); return; }
  checkpoint(); o.scaleBar = o.scaleBar || { um: niceBarLength(o.umPerPx * o.nw), pos: 'br', color: '#ffffff' }; render({ props: true });
};
