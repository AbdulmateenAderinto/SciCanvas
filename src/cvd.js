// Colour-vision preview (v1.9): View › Simulate Colour Vision shows the canvas as seen with deuteranopia,
// protanopia or tritanopia (Machado, Oliveira & Fernandes 2009, full severity) or in greyscale, so colour choices can
// be judged by eye. Only the on-screen view changes; exports are unaffected. A banner says which is on.
(() => {
  const M = {
    deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
    protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
    greyscale: [0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722, 0.2126, 0.7152, 0.0722],
  };
  const NAMES = { deuteranopia: 'Deuteranopia (green-weak, most common)', protanopia: 'Protanopia (red-weak)', tritanopia: 'Tritanopia (blue-weak)', greyscale: 'Greyscale (printing)' };
  const svgEl = document.getElementById('svg');
  if (!svgEl) return;
  const NS = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(NS, 'defs');
  for (const [k, m] of Object.entries(M)) {
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', `cvd-${k}`); f.setAttribute('color-interpolation-filters', 'linearRGB');
    const cm = document.createElementNS(NS, 'feColorMatrix');
    cm.setAttribute('type', 'matrix');
    cm.setAttribute('values', `${m.slice(0, 3).join(' ')} 0 0 ${m.slice(3, 6).join(' ')} 0 0 ${m.slice(6, 9).join(' ')} 0 0 0 0 0 1 0`);
    f.append(cm); defs.append(f);
  }
  svgEl.prepend(defs);
  const banner = el('div', { id: 'cvdBanner', class: 'hidden', style: 'position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:20;background:#1d2733;color:#fff;padding:6px 12px;border-radius:16px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.25)' });
  document.getElementById('stage').append(banner);
  let mode = 'normal';
  function setMode(m) {
    mode = M[m] ? m : 'normal';
    const scene = document.getElementById('scene');
    if (mode === 'normal') scene.removeAttribute('filter'); else scene.setAttribute('filter', `url(#cvd-${mode})`);
    banner.classList.toggle('hidden', mode === 'normal');
    banner.innerHTML = '';
    if (mode !== 'normal') banner.append(`Simulating ${NAMES[mode]} · view only `, el('a', { href: '#', style: 'color:#9fd0ff;margin-left:6px', textContent: 'Back to normal', onclick: (e) => { e.preventDefault(); setMode('normal'); } }));
  }
  for (const k of ['normal', ...Object.keys(M)]) ARRANGE_COMMANDS[`cvd:${k}`] = () => setMode(k);
  globalThis.ColourVision = { setMode, get mode() { return mode; } };
})();
