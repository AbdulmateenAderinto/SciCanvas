// Crops each drawing in src/organart.js to what is actually drawn (labels removed in the build can leave empty
// margins), so organs fill their icon boxes. Run after tools/build-organ-art.py:  node tools/fit-organ-art.js
const fs = require('fs'), path = require('path'), sharp = require('sharp');
const file = path.join(__dirname, '..', 'src', 'organart.js');
const text = fs.readFileSync(file, 'utf8'), head = text.slice(0, text.indexOf('globalThis.ORGAN_ART'));
const art = JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;\s*$/, ''));
(async () => {
  for (const [key, a] of Object.entries(art)) {
    const [x0, y0, w, h] = a.vb, S = 800 / Math.max(w, h), W = Math.round(w * S), H = Math.round(h * S);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="${x0} ${y0} ${w} ${h}">${a.svg}</svg>`;
    const { info } = await sharp(Buffer.from(svg)).ensureAlpha().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    const left = -(info.trimOffsetLeft || 0) / S, top = -(info.trimOffsetTop || 0) / S, cw = info.width / S, ch = info.height / S, m = Math.max(cw, ch) * 0.02;
    a.vb = [x0 + left - m, y0 + top - m, cw + 2 * m, ch + 2 * m].map((v) => Math.round(v * 100) / 100);
    console.log(key.padEnd(24), a.vb.join(' '));
  }
  fs.writeFileSync(file, head + 'globalThis.ORGAN_ART = ' + JSON.stringify(art) + ';\n');
})();
