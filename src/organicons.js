// Organ icons drawn from professional medical illustration (v1.2). The built-in anatomy icons below use the openly
// licensed artwork in organart.js (Servier Medical Art, Reactome, DBCLS, Jan Clusmann) so they are anatomically
// accurate and realistic. Each icon keeps its id, name, category, tags and viewBox (the art is scaled to fit, centred),
// carries its licence in `credit` (File › Credits cites it), and can still be recoloured: a new colour tints the
// drawing while keeping its shading. The Classic icon style shows the earlier drawings. Loaded after refanatomy.js and
// before iconstyle.js; art icons skip the generic outline/shading passes, which they don't need.
(() => {
  const ART = globalThis.ORGAN_ART;
  if (!ART) return;
  const r2 = (n) => Math.round(n * 100) / 100;
  // The drawing for `key`, scaled uniformly and centred in a W x H box.
  // Where the drawing for `key` lands in a W x H box: scale k and offset (tx, ty), art units -> box units.
  function placement(key, W, H, pad = 2, vb = ART[key].vb) {
    const [x0, y0, w, h] = vb, k = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    return { k, tx: (W - w * k) / 2 - x0 * k, ty: (H - h * k) / 2 - y0 * k };
  }
  // Markup drawn in the coordinates of the drawing as placed in a refW x refH box (how annotations such as an infarct
  // or a clot are positioned), converted to the drawing's own units so it follows the drawing into any icon.
  function overlayIn(key, refW, refH, markup) {
    const p = placement(key, refW, refH);
    return `<g transform="scale(${(1 / p.k).toFixed(5)}) translate(${r2(-p.tx)} ${r2(-p.ty)})">${markup}</g>`;
  }
  // A rectangle given in refW x refH box units, as a view box in the drawing's units (to show part of a drawing).
  function cropIn(key, refW, refH, [x, y, w, h]) {
    const p = placement(key, refW, refH);
    return [(x - p.tx) / p.k, (y - p.ty) / p.k, w / p.k, h / p.k];
  }
  // rot: 90 (clockwise) or -90 turns a drawing on its side to suit the box (only for things with no fixed orientation,
  // e.g. a vessel). extra: markup in the drawing's units, drawn over it (see overlayIn). vb: view box override (cropIn).
  function placed(key, W, H, pad = 2, rot = 0, extra = '', vbOver = null) {
    const a = ART[key], [x0, y0, w0, h0] = vbOver || a.vb, w = rot ? h0 : w0, h = rot ? w0 : h0, k = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const turn = rot > 0 ? `translate(${r2(h0 + y0)} ${r2(-x0)}) rotate(90)` : `translate(${r2(-y0)} ${r2(x0 + w0)}) rotate(-90)`;
    const inner = rot ? `<g transform="${turn}">${a.svg}${extra}</g>` : a.svg + extra;
    const ox = rot ? 0 : x0, oy = rot ? 0 : y0;
    const clip = vbOver && !rot ? ` data-crop="1"` : '';
    return `<g data-art="${key}"${clip} transform="translate(${r2((W - w * k) / 2 - ox * k)} ${r2((H - h * k) / 2 - oy * k)}) scale(${k.toFixed(5)})">${inner}</g>`;
  }
  // Two drawings side by side (e.g. healthy and diseased), each in half of the box.
  const pair = (k1, k2, W, H) => `<g>${placed(k1, W / 2, H, 3)}</g><g transform="translate(${W / 2} 0)">${placed(k2, W / 2, H, 3)}</g>`;
  const tint = (svg, c) => (typeof applyTint === 'function' ? applyTint(svg, c) : svg);
  // o.tint: default colour for a tinted variant (e.g. a fatty liver); o.art: overlay markup in the drawing's units
  // (overlayIn); o.vb: part of the drawing to show (cropIn); o.rot; o.pairWith: a second drawing beside the first.
  function useArt(id, key, o = {}) {
    const ic = ICON_MAP[id];
    if (!ic || !ART[key]) return;
    const [W, H] = ic.vb || [100, 100], prev = ic.draw, a = ART[key];
    let base = o.pairWith ? pair(key, o.pairWith, W, H) : placed(key, W, H, o.pad ?? 2, o.rot || 0, o.art || '', o.vb || null);
    // Showing part of a drawing: clip to the icon box (icons are drawn with overflow visible). The clip sits on an
    // untransformed group with an id unique to this icon, so warping, ungrouping and export keep working.
    if (o.vb) base = `<clipPath id="oac-${id}"><rect width="${W}" height="${H}"/></clipPath><g clip-path="url(#oac-${id})">${base}</g>`;
    const def = (o.tint || a.colour).toLowerCase();
    let tinted = null;
    ic.color = def;
    ic.art = true;
    ic.credit = { ...a.credit };
    ic.classicDraw = prev; // iconstyle.js leaves icons that already have a classic drawing alone
    ic.draw = (c) => {
      if (globalThis.IconStyle && IconStyle.mode === 'classic') return prev(c);
      if (!c || String(c).toLowerCase() === def) return o.tint ? (tinted ||= tint(base, o.tint)) : base;
      return tint(base, c);
    };
  }
  // Base anatomy.
  useArt('heart', 'heart');
  useArt('lungs', 'lung');
  useArt('liver', 'liver');
  useArt('kidney', 'kidney');
  useArt('brain', 'brain');
  // Organs and body systems.
  useArt('s-heart-exterior-coronary-arteries', 'heart-vessels');
  useArt('s-heart-four-chambers', 'heart-interior');
  useArt('s-lungs-soft', 'lung-pleura');
  useArt('s-trachea-and-bronchi', 'trachea-bronchi');
  useArt('s-liver-soft', 'liver-3d');
  useArt('s-kidney-soft', 'kidney-2');
  useArt('s-stomach', 'stomach');
  useArt('s-small-intestine', 'small-intestine');
  useArt('s-large-intestine-colon', 'colon');
  useArt('s-pancreas', 'pancreas');
  useArt('s-spleen', 'spleen');
  useArt('s-urinary-bladder', 'bladder');
  useArt('s-digestive-system', 'digestive-system');
  // Diseases.
  useArt('s-cirrhotic-liver', 'liver-cirrhotic');
  useArt('s-liver-tumour', 'liver-hcc');
  useArt('s-fatty-liver-steatosis', 'liver', { tint: '#d6ab5c' });
  useArt('s-gastric-ulcer', 'stomach-ulcer');
  useArt('s-emphysema', 'emphysema');
  useArt('s-lung-tumour', 'lung-cancer');
  useArt('s-colon-polyp', 'colon-polyp');
  useArt('s-gallstones', 'gallstones');
  useArt('s-inflammatory-bowel-disease-colitis', 'crohns');
  useArt('s-asthma-airway-narrowing', 'bronchus', { pairWith: 'bronchus-inflamed' });
  useArt('s-varicose-veins', 'varicose-vein');
  useArt('s-burn-skin-depth', 'burn');
  useArt('s-melanoma-skin-lesion', 'melanoma');
  useArt('s-cataract', 'cataract');
  useArt('s-diabetic-retinopathy-fundus', 'retinopathy');
  // More organs and structures.
  useArt('s-gallbladder', 'gallbladder');
  useArt('s-oesophagus', 'oesophagus');
  useArt('s-ear-outer-middle-inner', 'ear');
  useArt('s-tongue', 'tongue');
  useArt('s-tooth', 'tooth');
  useArt('s-eye', 'eye');
  useArt('s-skin-cross-section', 'skin');
  useArt('s-thymus', 'thymus');
  useArt('s-lymph-node', 'lymph-node');
  useArt('s-knee-joint', 'knee');
  useArt('s-rib-cage', 'rib-cage');
  useArt('s-pelvis', 'pelvis');
  useArt('s-hand-bones', 'hand-bones');
  useArt('s-skeletal-muscle', 'muscle');
  useArt('s-skeletal-muscle-striated-fibres', 'muscle-fibre');
  useArt('s-artery-cross-section', 'artery-wall');
  useArt('s-vein-with-valve', 'vein-valve', { rot: 90 });
  useArt('s-capillary-bed', 'capillaries');
  useArt('s-intestinal-villus', 'villi');
  useArt('s-alveoli', 'alveolus');
  useArt('s-liver-lobule', 'liver-lobule');
  useArt('s-islet-of-langerhans', 'islet');
  useArt('s-uterus-and-ovaries', 'uterus-ovaries');
  useArt('s-long-bone-femur', 'femur');
  useArt('s-goitre-enlarged-thyroid', 'goitre');
  // Deep vein thrombosis: thrombus packed behind the valves, a fragment breaking off past the next valve. Turned so the
  // blood flows up, towards the heart.
  useArt('s-deep-vein-thrombosis', 'dvt', { rot: -90 });
  // Spinal cord segment (dorsal horns up, ventral horns and anterior median fissure down) with its roots and spinal
  // nerve, cropped from the DBCLS motor-pathway drawing.
  useArt('s-spinal-cord-cross-section', 'spinal-cord', { vb: cropIn('spinal-cord', 100, 100, [28.5, 44.5, 45.5, 25]) });
  // ---------- Disease and variant icons drawn over the professional artwork ----------
  // Myocardial infarction: thrombus occluding the left anterior descending artery and the infarcted anterior and apical
  // wall of the left ventricle downstream of it (heart drawing in its 100 x 100 icon box).
  const infarct = 'M63.6 64 C69.6 62.4 77.4 64.6 81 71 C83.4 78 81.6 85.6 76.4 90.8 C72.4 93.8 67.6 93.4 65.8 89.2 C63.8 82.4 63 73 63.6 64 Z';
  useArt('s-myocardial-infarction', 'heart', { art: overlayIn('heart', 100, 100,
    `<path d="${infarct}" fill="#6e3a5c" opacity="0.42"/><path d="${infarct}" fill="none" stroke="#5a2a4a" stroke-width="0.6" stroke-dasharray="1.6 1.1"/>`
    + '<ellipse cx="62.4" cy="56.8" rx="1.9" ry="1.2" fill="#3a0d14" stroke="#1f0609" stroke-width="0.3" transform="rotate(62 62.4 56.8)"/>') });
  // Pneumonia: the right lung (viewer's left) with consolidation filling the middle lobe.
  const consol = 'M9.6 59 C18 57.4 32 57.6 44.6 58.6 C46.2 66 46 76 44 84.4 C36 87 27 87.4 20.6 86.4 C14.6 78.6 11 69.6 9.6 59 Z';
  let patches = '';
  { const r = SoftKit.rng(11); for (let k = 0; k < 16; k++) { const x = 14 + r() * 28, y = 61 + r() * 22; patches += `<ellipse cx="${r2(x)}" cy="${r2(y)}" rx="${r2(1.4 + r() * 2.6)}" ry="${r2(1 + r() * 1.8)}" fill="#9e2a3e" opacity="0.32"/>`; } }
  useArt('s-pneumonia', 'lung', { vb: cropIn('lung', 100, 100, [1.5, 9, 45.6, 85.6]), art: overlayIn('lung', 100, 100,
    `<path d="${consol}" fill="#b4374d" opacity="0.4"/>${patches}`) });
  // Strokes, on the brain drawn from the right (frontal lobe on the viewer's right, cerebellum behind and below).
  // Middle cerebral artery: out of the lateral (Sylvian) fissure, branches fanning over the frontal, parietal and
  // temporal convexity.
  const MCA2 = ['M57 39.6 C52 38.4 46 37.4 40 36.6 C34 35.8 28 35 23 34', 'M53 38.8 C52 33 51 27 48.6 20', 'M46.6 37.8 C44.4 31.6 42.4 26 38.6 19', 'M40 36.8 C37 31.6 33.6 27.4 29 23.6', 'M33 35.8 C29.6 32.4 25.6 30 20.6 28.4', 'M48 38.4 C46 42 43.6 45.4 40 48', 'M36 36.4 C33.6 40.6 30.4 44 26 46.4'];
  const arteries = MCA2.map((d, k) => `<path d="${d}" fill="none" stroke="#8e1b25" stroke-width="${k ? 1 : 1.3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#d8343f" stroke-width="${k ? 0.55 : 0.8}" stroke-linecap="round"/>`).join('');
  const territory = 'M30 20.4 C36 15.4 46 14.6 51.6 18.4 C55 22 54 29 50.6 33.6 C46 36.2 38 35.6 32.6 33.6 C28 31.4 26.6 24.6 30 20.4 Z';
  useArt('s-ischaemic-stroke', 'brain', { art: overlayIn('brain', 100, 80,
    `<path d="${territory}" fill="#5f4a6e" opacity="0.4"/><path d="${territory}" fill="none" stroke="#4a3557" stroke-width="0.6" stroke-dasharray="1.6 1.1"/>${arteries}`
    + '<ellipse cx="51.8" cy="37.6" rx="1.8" ry="1.2" fill="#3a0d14" stroke="#1f0609" stroke-width="0.3" transform="rotate(-80 51.8 37.6)"/>') });
  let bleed = '';
  { const r = SoftKit.rng(77), pts = SoftKit.wob(42, 26, 7.4, 5.4, r, { amp: 0.16, n: 22, rot: -10 }); bleed = `<path d="${SoftKit.cr(pts, true)}" fill="#8f0f1c" stroke="#5e0a12" stroke-width="0.6"/>`;
    for (let k = 0; k < 7; k++) { const t = r() * 6.28, d = 8.6 + r() * 2.6; bleed += `<circle cx="${r2(42 + Math.cos(t) * d)}" cy="${r2(26 + Math.sin(t) * d * 0.74)}" r="${r2(0.4 + r() * 0.6)}" fill="#8f0f1c"/>`; } }
  useArt('s-haemorrhagic-stroke', 'brain', { art: overlayIn('brain', 100, 80, arteries + bleed) });
  // Prostate: the gland around the first part of the urethra, just below the neck of the bladder.
  useArt('s-prostate', 'bladder', { art: overlayIn('bladder', 100, 100,
    '<path d="M50 75.6 C57.4 75 63.4 78 64 84 C64.6 90 58.2 94.2 50 94.2 C41.8 94.2 35.4 90 36 84 C36.6 78 42.6 75 50 75.6 Z" fill="#d79c80" stroke="#99604a" stroke-width="0.6"/>'
    + '<path d="M50 77 C49.6 82 49.6 88 50 93" fill="none" stroke="#b8796b" stroke-width="0.4" stroke-dasharray="1 1"/>'
    + '<path d="M50 75 V96" fill="none" stroke="#a24a5c" stroke-width="2.6"/><path d="M50 75 V96" fill="none" stroke="#efb3bf" stroke-width="1.3"/>') });

  // ---------- Organs the earlier set had no icon for ----------
  // New soft icons drawn straight from the artwork (Classic shows the same drawing).
  function addArt(name, cat, tags, key, vb, o = {}) {
    const K = globalThis.SoftKit;
    if (!K || !ART[key]) return;
    const before = new Set(ICONS.map((i) => i.id));
    K.add(name, cat, `${tags} anatomy organ realistic`, ART[key].colour, (c) => {
      const s = placed(key, vb[0], vb[1], o.pad ?? 2, o.rot || 0, o.art || '');
      return !c || String(c).toLowerCase() === ART[key].colour.toLowerCase() ? s : tint(s, c);
    }, vb);
    const ic = ICONS.find((i) => !before.has(i.id));
    if (ic) useArt(ic.id, key, o);
  }
  addArt('Larynx', 'Soft · Organs & body systems', 'larynx voice box hyoid thyroid cartilage cricoid trachea airway throat', 'larynx', [60, 110]);
  addArt('Aorta', 'Soft · Heart & circulation', 'aorta aortic arch descending abdominal thoracic artery great vessel', 'aorta', [40, 120]);
  addArt('Heart (conduction system)', 'Soft · Heart & circulation', 'heart conduction system sinoatrial SA node atrioventricular AV node bundle of His Purkinje electrical ECG', 'heart-conduction', [80, 100]);
  addArt('Pulmonary embolism', 'Soft · Diseases & pathology', 'pulmonary embolism PE clot embolus DVT lung artery thrombus', 'pulmonary-embolism', [110, 95]);
  addArt('Brain (horizontal section)', 'Soft · Neuroscience', 'brain horizontal axial transverse section slice basal ganglia internal capsule thalamus ventricles', 'brain-horizontal', [80, 100]);

  // Thyroid: a normal gland on the Servier larynx (hyoid, thyroid cartilage, cricoid, trachea). Upper poles at the
  // oblique line, halfway down the thyroid cartilage; lobes beside the cricoid and trachea; isthmus over tracheal rings
  // 2-3; lower poles beside ring 4-5. The drawing's trachea stops after ring 2, so rings are added below in its style.
  // Coordinates: the larynx placed in a 100 x 90 box.
  {
    const ring = (t) => `<path d="M42.2 ${t + 0.6} C42.2 ${t - 0.4} 43.2 ${t - 0.6} 44.2 ${t - 0.5} C48 ${t} 53 ${t} 56.8 ${t - 0.5} C57.8 ${t - 0.6} 58.8 ${t - 0.4} 58.8 ${t + 0.6} L58.8 ${t + 4.8} C58.8 ${t + 5.8} 57.6 ${t + 6.2} 56.6 ${t + 6.1} C53 ${t + 6.6} 48 ${t + 6.6} 44.4 ${t + 6.1} C43.4 ${t + 6.2} 42.2 ${t + 5.8} 42.2 ${t + 4.8} Z" fill="#e1ecf7" stroke="#343434" stroke-width="0.3"/>`
      + `<path d="M42.6 ${t + 4} C46 ${t + 4.9} 55 ${t + 4.9} 58.4 ${t + 4} L58.4 ${t + 4.8} C58.4 ${t + 5.6} 57.4 ${t + 5.9} 56.6 ${t + 5.8} C53 ${t + 6.2} 48 ${t + 6.2} 44.4 ${t + 5.8} C43.6 ${t + 5.9} 42.6 ${t + 5.6} 42.6 ${t + 4.8} Z" fill="#c2dff3"/>`
      + `<path d="M44.6 ${t + 1} C48.6 ${t + 1.5} 52.4 ${t + 1.5} 56.4 ${t + 1}" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-linecap="round"/>`;
    const trachea = '<path d="M42.4 80 H58.6 V100 C55 101 46 101 42.4 100 Z" fill="#f4b6d0"/>'
      + [45, 48, 51.5, 55].map((x) => `<path d="M${x} 82 V99.6" stroke="#fbe1ec" stroke-width="0.3"/>`).join('')
      + '<path d="M42.4 80 V100 M58.6 80 V100" stroke="#343434" stroke-width="0.3"/>' + ring(83) + ring(91);
    // Cone-shaped lobes, widest in their lower third, together about as wide as the thyroid cartilage; the isthmus
    // (about a third of the lobe height) joins them across the trachea.
    const gland = 'M63 43 C66 46.5 70 54 72 62 C73.8 69 74.6 77 74 84 C73.4 91 70 96 66 96.2 C62.6 96.4 60.4 93 59.2 89.4 C56.4 88 53.4 87.6 50 87.6 '
      + 'C46.6 87.6 43.6 88 40.8 89.4 C39.6 93 37.4 96.4 34 96.2 C30 96 26.6 91 26 84 C25.4 77 26.2 69 28 62 C30 54 34 46.5 37 43 '
      + 'C37.8 47 38.6 52 39.2 58 C39.8 64 40.4 70 41.2 76 C44 76.6 47 76.8 50 76.8 C53 76.8 56 76.6 58.8 76 C59.6 70 60.2 64 60.8 58 C61.4 52 62.2 47 63 43 Z';
    const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${r2(100 - +x)} ${y}`);
    // Shade along the lateral and lower edge of each lobe (its outer side follows the gland's own outline).
    const shade = 'M72 62 C73.8 69 74.6 77 74 84 C73.4 91 70 96 66 96.2 C62.6 96.4 60.4 93 59.2 89.4 C61.4 92 64.2 93.2 66.6 92.6 C69.8 91.6 71.6 87.4 71.8 82 C72 75 71.6 68 72 62 Z';
    const lit = 'M63.6 52 C64.2 60 64.8 68 65.4 76';
    const dashes = ['M65.4 58 C67.6 60 68.8 63 69.2 66', 'M64.6 72 C67.2 73.4 69.4 76 70.2 79.4', 'M64 85 C66.4 86.4 68.4 88.6 69 91.2'];
    const dash = (d) => `<path d="${d}" fill="none" stroke="#343434" stroke-width="0.3" stroke-dasharray="0.7 0.55" stroke-linecap="round"/>`;
    const thyroid = `<path d="${gland}" fill="#f6b9ad"/>`
      + [shade, mirror(shade)].map((d) => `<path d="${d}" fill="#ec9c8e"/>`).join('')
      + [lit, mirror(lit)].map((d) => `<path d="${d}" fill="none" stroke="#fde7e2" stroke-width="1.6" stroke-linecap="round" opacity="0.85"/>`).join('')
      + [...dashes, ...dashes.map(mirror), 'M45.6 82 C48 81 52 81 54.4 82.2'].map(dash).join('')
      + `<path d="${gland}" fill="none" stroke="#343434" stroke-width="0.4" stroke-linejoin="round"/>`;
    useArt('s-thyroid', 'larynx', { vb: cropIn('larynx', 100, 90, [-5.6, 2, 111.2, 100]), art: overlayIn('larynx', 100, 90, trachea + thyroid) });
  }
  // Abdominal aortic aneurysm: fusiform dilatation of the infrarenal aorta, from below the renal arteries to the
  // bifurcation (aorta placed in its 70 x 110 icon box).
  {
    const sac = 'M32.6 68 C31.4 69.6 29.2 71.4 29 74.8 C28.8 78.4 30.4 80.6 32.6 82.4 C33.2 82.8 33.6 83 34 83.2 L36 83.2 C36.4 83 36.8 82.8 37.4 82.4 C39.6 80.6 41.2 78.4 41 74.8 C40.8 71.4 38.6 69.6 37.4 68 Z';
    useArt('s-aortic-aneurysm', 'aorta', { art: overlayIn('aorta', 70, 110, `<path d="${sac}" fill="#e67857"/>`
      + '<path d="M38.4 69.8 C40.2 71.6 41 73 41 74.8 C41.2 78.4 39.6 80.6 37.4 82.4 C38.6 80 39.6 77.6 39.6 75 C39.6 73 39.2 71.4 38.4 69.8 Z" fill="#d64e2e"/>'
      + '<path d="M31 72.6 C30.2 74.6 30.2 77.2 31.2 79.2" fill="none" stroke="#ec907a" stroke-width="1.4" stroke-linecap="round"/>'
      + '<path d="M31 73.4 C30.6 74.8 30.6 76.4 31.1 77.8" fill="none" stroke="#efb6ac" stroke-width="0.6" stroke-linecap="round"/>'
      + `<path d="${sac}" fill="none" stroke="#b8442a" stroke-width="0.3"/>`) });
  }

  globalThis.OrganArt = { placed, pair, useArt, placement, overlayIn, cropIn };
})();
