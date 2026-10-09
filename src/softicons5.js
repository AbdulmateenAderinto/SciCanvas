// Soft-style icons, part 5 (v1.1, clinical): organs & body systems, diseases & pathology, clinical procedures &
// imaging, and histopathology. Drawn with the shared kit from softicons.js (same palette and outlines).
(() => {
  const K = globalThis.SoftKit;
  if (!K) return;
  const { P, OW, f, oc, rng, hash, glob, tubes, tube, ball, ell, G } = K;
  const CAT = { organ: 'Soft · Organs & body systems', dis: 'Soft · Diseases & pathology', proc: 'Soft · Clinical procedures & imaging', histo: 'Soft · Histopathology' };
  const R = (name) => rng(hash(name));
  const S = (name, cat, tags, vb, draw, color = P.navy) => K.add(name, cat, tags, color, () => draw(R(name)), vb);

  // ---------- Local helpers (same as parts 3 and 4) ----------
  const path = (d, c, o = {}) => `<path d="${d}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}" stroke-linejoin="round" stroke-linecap="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const line = (d, c, w = OW, o = {}) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
  const rr = (x, y, w, h, r, c, o = {}) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${c}" stroke="${o.oc || oc(c)}" stroke-width="${o.w || OW}"${o.op ? ` opacity="${o.op}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${f(x + w / 2)} ${f(y + h / 2)})"` : ''}/>`;
  const poly = (pts) => `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
  const ngon = (cx, cy, r, n, rot = 0) => Array.from({ length: n }, (_, k) => { const t = rot + (k / n) * Math.PI * 2; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; });
  const shine = (cx, cy, rx, ry, rot = -20) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#ffffff" opacity=".38" transform="rotate(${rot} ${f(cx)} ${f(cy)})"/>`;
  const txt = (x, y, s, size, c, w = 700) => `<text x="${f(x)}" y="${f(y)}" text-anchor="middle" font-family="Helvetica, Arial" font-weight="${w}" font-size="${size}" fill="${c}">${s}</text>`;
  const arrow = (x1, y1, x2, y2, c, w = 2.4) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 3 + w * 1.6; return line(`M${f(x1)} ${f(y1)} L${f(x2 - Math.cos(a) * h * 0.6)} ${f(y2 - Math.sin(a) * h * 0.6)}`, c, w) + `<path d="M${f(x2)} ${f(y2)} L${f(x2 - Math.cos(a - 0.45) * h)} ${f(y2 - Math.sin(a - 0.45) * h)} L${f(x2 - Math.cos(a + 0.45) * h)} ${f(y2 - Math.sin(a + 0.45) * h)} Z" fill="${c}"/>`; };
  const branches = (x, y, ang, len, depth, r, spread = 0.5, shrink = 0.72) => {
    if (depth === 0 || len < 2) return [];
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len, out = [[[x, y], [x2, y2]]];
    for (const s of [-1, 1]) out.push(...branches(x2, y2, ang + s * spread * (0.7 + r() * 0.6), len * shrink * (0.85 + r() * 0.3), depth - 1, r, spread, shrink));
    return out;
  };
  const ORG = { pink: '#e7959c', lung: '#f4a7b2', liver: '#b5524a', yellow: '#f2c36b', bone: '#efe6cf', boneO: '#bfae86', muscle: '#d4625a', skin: '#f2c4a8', spleen: '#8e4a7a', gut: '#e9a08a', kid: '#b5524a' };
  const ART = '#e53935', VEIN = '#3f51b5', NERVE = '#f9a825', LYM = '#66bb6a';

  // =====================================================================================
  // Organs & body systems
  // =====================================================================================
  // Neutral body outline (70 × 130) that the organ systems are drawn on.
  const SIL = '#eef3f7', SILO = '#b0bec5';
  const body = () => tubes([[[22, 30], [14, 56], [10, 78]], [[48, 30], [56, 56], [60, 78]], [[29, 70], [27, 98], [26, 126]], [[41, 70], [43, 98], [44, 126]]], 9, SIL, { oc: SILO })
    + path('M22 24 H48 C52 24 54 28 54 32 V62 C54 70 50 76 42 76 H28 C20 76 16 70 16 62 V32 C16 28 18 24 22 24 Z', SIL, { oc: SILO }) + rr(31, 18, 8, 8, 3, SIL, { oc: SILO, w: 1.2 }) + ball(35, 11, 9, SIL, { oc: SILO });
  S('Digestive system', CAT.organ, 'digestive system gastrointestinal GI tract oesophagus stomach liver intestines', [70, 130], () =>
    body() + line('M35 18 C35 26 36 34 38 42', ORG.pink, 3) + path('M18 40 C24 34 36 36 38 42 C34 48 26 50 18 48 Z', ORG.liver) + path('M38 41 C44 38 50 42 49 48 C48 54 42 56 38 52 C40 49 40 45 38 41 Z', '#f0a07f')
    + tube([[23, 70], [22, 55], [48, 55], [48, 68], [40, 72]], 4.5, '#d9927e') + line('M27 59 H44 M27 62.5 H44 M27 66 H43', '#f3b8a6', 2.6), '#d9927e');
  S('Respiratory system', CAT.organ, 'respiratory system lungs airways trachea bronchi breathing', [70, 130], () =>
    body() + path('M24 32 C18 36 17 48 18 54 C22 56 28 55 32 52 C32 44 31 36 28 32 Z', ORG.lung) + path('M46 32 C52 36 53 48 52 54 C48 56 42 55 38 52 C38 44 39 38 42 32 Z', ORG.lung)
    + line('M35 16 V34 M35 34 L28 40 L25 48 M35 34 L42 40 L45 48 M28 40 L30 50 M42 40 L40 50', '#c2185b', 1.8), '#c2185b');
  S('Cardiovascular system', CAT.organ, 'cardiovascular circulatory system heart arteries veins blood vessels', [70, 130], () =>
    body() + line('M37 40 V72 L28 98 L26 124 M37 72 L42 98 L43 124 M36 36 C30 30 24 34 18 50 L12 76 M38 36 C44 30 50 34 54 50 L58 76 M36 34 V8', ART, 1.6)
    + line('M33 40 V72 L26 98 L24 124 M33 72 L40 98 L41 124 M33 32 V6', VEIN, 1.4, { op: 0.8 }) + path('M36 34 C32 30 28 34 30 38 C31 42 36 46 38 46 C40 44 44 40 43 36 C42 32 38 32 36 34 Z', ART), ART);
  S('Nervous system', CAT.organ, 'nervous system brain spinal cord nerves CNS PNS', [70, 130], () =>
    body() + ell(35, 9, 7, 5, '#f8bbd0') + line('M35 14 V70', NERVE, 2.4) + line('M35 28 L22 32 L14 56 L10 76 M35 28 L48 32 L56 56 L60 76 M35 44 L22 50 M35 44 L48 50 M35 58 L24 62 M35 58 L46 62 M35 70 L28 98 L26 124 M35 70 L42 98 L44 124', NERVE, 1.3), NERVE);
  S('Skeleton', CAT.organ, 'skeleton skeletal system bones skull spine ribs pelvis', [70, 130], () => {
    const B = ORG.bone, O = { oc: ORG.boneO };
    let s = tubes([[[22, 30], [15, 54]], [[15, 56], [11, 78]], [[48, 30], [55, 54]], [[55, 56], [59, 78]], [[29, 74], [27, 98]], [[27, 100], [26, 124]], [[41, 74], [43, 98]], [[43, 100], [44, 124]]], 3.6, B, O);
    for (let k = 0; k < 6; k++) s += line(`M35 ${32 + k * 4} C${26 - k} ${30 + k * 4} ${21 - k * 0.5} ${36 + k * 4} ${24} ${40 + k * 4} M35 ${32 + k * 4} C${44 + k} ${30 + k * 4} ${49 + k * 0.5} ${36 + k * 4} ${46} ${40 + k * 4}`, ORG.boneO, 1.6);
    s += Array.from({ length: 12 }, (_, k) => rr(33, 22 + k * 4.3, 4, 3.2, 1.2, B, { oc: ORG.boneO, w: 1 })).join('') + path('M24 68 C26 64 32 66 35 70 C38 66 44 64 46 68 C48 74 42 80 35 78 C28 80 22 74 24 68 Z', B, O);
    return s + line('M22 30 H48', ORG.boneO, 2.4) + path('M27 12 C27 4 43 4 43 12 C43 16 41 19 39 20 H31 C29 19 27 16 27 12 Z', B, O) + ball(31.5, 11, 2, '#8d7b5a', { w: 0 }) + ball(38.5, 11, 2, '#8d7b5a', { w: 0 });
  }, ORG.boneO);
  S('Lymphatic system', CAT.organ, 'lymphatic system lymph nodes vessels spleen thymus immune', [70, 130], () =>
    body() + line('M35 24 V68 M35 30 L22 36 L14 60 M35 30 L48 36 L56 60 M35 68 L28 96 L26 122 M35 68 L42 96 L44 122 M30 20 L35 28 L40 20', LYM, 1.4)
    + [[30, 20], [40, 20], [22, 36], [48, 36], [29, 72], [41, 72], [35, 50]].map(([x, y]) => ball(x, y, 2.4, '#43a047', { w: 0.8 })).join('') + ell(46, 48, 4, 6, ORG.spleen, 20) + ell(35, 33, 4, 3, '#bcaaa4'), LYM);
  S('Endocrine system', CAT.organ, 'endocrine system glands hormones pituitary thyroid adrenal pancreas gonads', [70, 130], () =>
    body() + ball(35, 11, 2.4, P.purple, { w: 0.8 }) + path('M30 22 C30 19 34 19 35 21 C36 19 40 19 40 22 C40 25 36 26 35 24 C34 26 30 25 30 22 Z', '#f06292') + path('M26 48 l4 -3 l3 3 Z M44 48 l-4 -3 l-3 3 Z', ORG.yellow) + ell(36, 52, 8, 2.6, '#ffb74d') + ball(30, 70, 2.4, '#4fc3f7', { w: 0.8 }) + ball(40, 70, 2.4, '#4fc3f7', { w: 0.8 }), '#f06292');
  S('Urinary system', CAT.organ, 'urinary system kidneys ureters bladder urethra renal', [70, 130], () =>
    body() + path('M26 44 C22 44 21 50 22 54 C23 58 27 60 29 57 C28 54 29 50 30 48 C30 46 28 44 26 44 Z', ORG.kid) + path('M44 44 C48 44 49 50 48 54 C47 58 43 60 41 57 C42 54 41 50 40 48 C40 46 42 44 44 44 Z', ORG.kid)
    + line('M29 54 C31 60 31 66 33 70 M41 54 C39 60 39 66 37 70', '#f0c8a0', 1.8) + path('M30 70 C30 67 40 67 40 70 C40 75 37 77 35 77 C33 77 30 75 30 70 Z', '#f6d365'), ORG.kid);

  S('Lungs (soft)', CAT.organ, 'lungs lung lobes bronchial tree respiratory pulmonary', [100, 90], (r) =>
    path('M42 18 C26 16 10 36 8 62 C6 78 16 86 30 84 C40 82 44 76 44 64 V24 C44 20 44 18 42 18 Z', ORG.lung) + path('M58 18 C74 16 90 36 92 62 C94 78 84 86 70 84 C64 83 60 80 58 74 C66 70 66 62 58 58 V24 C58 20 58 18 58 18 Z', ORG.lung)
    + shine(24, 40, 7, 12, 15) + shine(78, 40, 7, 12, -15) + tube([[50, 0], [50, 22]], 7, '#f8bbd0', { oc: '#c2185b' }) + tubes(branches(50, 22, Math.PI * 0.62, 14, 4, r, 0.5).concat(branches(50, 22, Math.PI * 0.38, 14, 4, r, 0.5)), 2.2, '#f8bbd0', { oc: '#c2185b' }), '#c2185b');
  S('Heart (exterior, coronary arteries)', CAT.organ, 'heart exterior coronary arteries aorta pulmonary trunk cardiac', [90, 100], () =>
    line('M38 30 V6', VEIN, 9) + path('M44 30 C44 12 52 6 64 6 C76 6 82 14 82 26', 'none', { oc: ART, w: 10 }) + line('M44 30 C44 12 52 6 64 6 C76 6 82 14 82 26', '#ef5350', 7) + line('M58 30 C58 18 62 14 70 14', '#7986cb', 7)
    + path('M44 30 C30 22 10 30 10 50 C10 70 30 86 52 96 C74 84 86 66 84 48 C82 30 62 22 44 30 Z', '#d9534f') + shine(28, 46, 8, 12, 20)
    + line('M44 34 C40 48 44 62 52 92 M44 34 C56 40 66 50 74 70 M30 40 C26 52 30 66 36 74', '#ffcdd2', 2) + line('M60 38 C64 52 64 64 60 80', '#9fa8da', 1.8), '#d9534f');
  S('Oesophagus', CAT.organ, 'oesophagus esophagus gullet swallowing GI tract', [70, 110], () =>
    tube([[30, 0], [30, 30], [32, 60], [36, 80]], 11, '#f3a39a') + path('M30 78 C40 70 60 76 62 90 C62 104 46 110 36 102 C30 96 34 88 32 82 Z', '#f0a07f') + line('M30 4 V70', '#e57373', 1.2, { op: 0.6 }), '#f3a39a');
  S('Thymus', CAT.organ, 'thymus T cell maturation lymphoid organ', [80, 80], (r) =>
    glob(28, 44, 18, 30, '#d7ccc8', r, { amp: 0.1 }) + glob(52, 44, 18, 30, '#d7ccc8', r, { amp: 0.1 }) + line('M28 24 q4 6 0 12 q-4 6 0 12 M52 24 q4 6 0 12 q-4 6 0 12', '#a1887f', 1.4), '#a1887f');
  S('Pituitary gland', CAT.organ, 'pituitary gland hypothalamus anterior posterior hormones', [80, 80], () =>
    path('M10 20 C20 6 60 6 70 20 C60 26 48 26 44 28 H36 C32 26 20 26 10 20 Z', '#f8bbd0') + rr(36, 26, 8, 22, 4, '#f48fb1') + ell(32, 58, 14, 12, '#ce93d8') + ell(52, 58, 10, 11, '#f48fb1'), '#ce93d8');
  S('Ear (outer, middle, inner)', CAT.organ, 'ear anatomy pinna ear canal eardrum ossicles cochlea semicircular canals hearing', [120, 80], () =>
    path('M22 8 C6 10 2 30 8 44 C12 54 10 64 18 72 C26 78 34 70 30 60 C28 54 34 50 34 42 C34 22 34 8 22 8 Z', ORG.skin) + line('M20 20 C12 26 14 38 20 42', '#d7967a', 2)
    + rr(30, 38, 34, 10, 4, '#f6d6c4', { oc: '#d7967a' }) + ell(66, 43, 2.4, 9, '#ffe0b2', 0, { oc: '#a1887f' }) + line('M68 40 L74 36 L80 42 L84 40', '#bcaaa4', 2.6)
    + line('M90 36 C92 26 102 26 102 34 C102 40 94 40 94 34', '#ba68c8', 3) + line('M88 30 C84 18 96 14 98 22 M96 28 C104 20 112 26 106 32', '#ba68c8', 2.4) + line('M88 46 C88 58 104 60 104 50 C104 44 96 44 96 50', '#ce93d8', 4.5) + line('M84 50 L70 62 L64 72', NERVE, 2), '#ba68c8');
  S('Tongue', CAT.organ, 'tongue taste buds papillae oral cavity mouth', [80, 100], (r) => {
    let s = path('M14 6 H66 C70 6 72 10 72 16 C72 60 60 94 40 94 C20 94 8 60 8 16 C8 10 10 6 14 6 Z', '#ef9a9a') + line('M40 14 V70', '#e57373', 2);
    for (let k = 0; k < 18; k++) s += ball(16 + r() * 48, 14 + r() * 62, 1.6, '#f8bbd0', { w: 0 });
    return s + [[24, 16], [40, 12], [56, 16]].map(([x, y]) => ball(x, y, 3, '#e57373', { w: 0.8 })).join('');
  }, '#ef9a9a');
  S('Skull', CAT.organ, 'skull cranium head bones orbits mandible', [90, 100], () =>
    path('M45 4 C20 4 6 22 8 44 C9 56 16 62 20 66 V80 C20 84 24 86 28 86 H62 C66 86 70 84 70 80 V66 C74 62 81 56 82 44 C84 22 70 4 45 4 Z', ORG.bone, { oc: ORG.boneO })
    + ell(30, 48, 9, 10, '#5d4037') + ell(60, 48, 9, 10, '#5d4037') + path('M45 56 L40 68 H50 Z', '#5d4037') + [30, 37, 44, 51, 58].map((x) => rr(x - 3, 72, 6, 10, 1.5, '#ffffff', { oc: ORG.boneO, w: 1 })).join(''), ORG.boneO);
  S('Vertebra', CAT.organ, 'vertebra vertebral body spinous process spinal canal spine', [100, 90], () =>
    ell(50, 26, 26, 20, ORG.bone, 0, { oc: ORG.boneO }) + path('M28 44 C24 50 26 58 34 60 L46 86 H54 L66 60 C74 58 76 50 72 44 C64 50 36 50 28 44 Z', ORG.bone, { oc: ORG.boneO })
    + tube([[30, 50], [6, 56]], 8, ORG.bone, { oc: ORG.boneO }) + tube([[70, 50], [94, 56]], 8, ORG.bone, { oc: ORG.boneO }) + ell(50, 56, 9, 7, '#fff8e1', 0, { oc: ORG.boneO }) + ell(50, 56, 4, 3.4, NERVE), ORG.boneO);
  S('Rib cage', CAT.organ, 'rib cage thorax ribs sternum chest', [100, 100], () => {
    let s = Array.from({ length: 14 }, (_, k) => rr(47, 4 + k * 6.6, 6, 5, 2, ORG.bone, { oc: ORG.boneO, w: 1 })).join('');
    for (let k = 0; k < 9; k++) { const y = 14 + k * 8, w = 30 + Math.sin((k / 8) * Math.PI) * 14; s += line(`M47 ${y} C${50 - w} ${y - 6} ${50 - w - 2} ${y + 14} ${36 - k} ${y + 18} M53 ${y} C${50 + w} ${y - 6} ${50 + w + 2} ${y + 14} ${64 + k} ${y + 18}`, ORG.boneO, 4.4) + line(`M47 ${y} C${50 - w} ${y - 6} ${50 - w - 2} ${y + 14} ${36 - k} ${y + 18} M53 ${y} C${50 + w} ${y - 6} ${50 + w + 2} ${y + 14} ${64 + k} ${y + 18}`, ORG.bone, 2.6); }
    return s + rr(44, 12, 12, 50, 5, ORG.bone, { oc: ORG.boneO });
  }, ORG.boneO);
  S('Pelvis', CAT.organ, 'pelvis pelvic bone hip ilium sacrum pubis', [110, 80], () =>
    path('M10 24 C14 6 40 4 48 16 L50 40 C46 54 40 62 44 72 H36 C30 64 22 56 16 48 C10 40 8 32 10 24 Z', ORG.bone, { oc: ORG.boneO }) + path('M100 24 C96 6 70 4 62 16 L60 40 C64 54 70 62 66 72 H74 C80 64 88 56 94 48 C100 40 102 32 100 24 Z', ORG.bone, { oc: ORG.boneO })
    + path('M46 14 H64 L62 40 C58 46 52 46 48 40 Z', '#e8dcc0', { oc: ORG.boneO }) + ell(36, 60, 6, 7, '#fff8e1', 0, { oc: ORG.boneO }) + ell(74, 60, 6, 7, '#fff8e1', 0, { oc: ORG.boneO }) + ball(22, 48, 7, '#e8dcc0', { oc: ORG.boneO }) + ball(88, 48, 7, '#e8dcc0', { oc: ORG.boneO }), ORG.boneO);
  S('Hand (bones)', CAT.organ, 'hand bones carpals metacarpals phalanges wrist fingers', [90, 110], () => {
    const B = ORG.bone, O = { oc: ORG.boneO };
    let s = tubes([[[30, 108], [32, 92]], [[44, 108], [44, 92]]], 8, B, O) + [[30, 84], [40, 86], [50, 84], [34, 76], [44, 76], [54, 78]].map(([x, y]) => ball(x, y, 5, B, O)).join('');
    [[16, 70, -0.9], [32, 68, -0.25], [44, 66, 0], [56, 68, 0.2], [66, 72, 0.45]].forEach(([x, y, a], i) => {
      let px = x, py = y; const segs = i === 0 ? [16, 12, 10] : [18, 12, 9, 7];
      segs.forEach((len) => { const nx = px + Math.sin(a) * len, ny = py - Math.cos(a) * len; s += tube([[px, py], [nx, ny]], 5, B, O); px = nx + Math.sin(a) * 2; py = ny - Math.cos(a) * 2; });
    });
    return s;
  }, ORG.boneO);
  S('Biliary tree', CAT.organ, 'biliary tree bile ducts gallbladder common bile duct pancreas duodenum liver', [100, 100], () =>
    path('M6 24 C16 8 60 6 94 12 C96 20 88 26 80 30 C64 40 40 46 24 44 C12 42 4 34 6 24 Z', ORG.liver, { op: 0.35 }) + line('M34 22 C38 30 42 34 46 38 M62 20 C58 28 52 34 46 38 M46 38 V70', '#66bb6a', 3)
    + path('M30 44 C26 52 30 62 38 62 C44 62 46 56 46 50', '#81c784') + tube([[46, 70], [50, 78]], 3, '#66bb6a') + path('M50 74 C64 70 82 72 94 80 C84 88 66 86 52 82 Z', '#ffcc80') + path('M40 64 C34 72 36 90 50 92 C60 92 62 84 58 80', '#f3b8a6'), '#66bb6a');
  S('Kidney (cross-section)', CAT.organ, 'kidney cross section cortex medulla pyramids renal pelvis calyces ureter', [80, 100], () =>
    path('M44 6 C18 6 6 30 8 52 C10 76 24 94 44 94 C58 94 66 82 60 70 C56 62 50 58 50 50 C50 42 56 38 60 30 C66 18 58 6 44 6 Z', '#c75b4c') + path('M42 14 C24 14 14 32 16 52 C18 72 28 86 42 86 C50 86 54 80 52 72 C48 64 44 58 44 50 C44 42 48 36 52 30 C56 22 52 14 42 14 Z', '#e88c7d', { oc: '#c75b4c' })
    + [[28, 24, -40], [22, 42, -80], [22, 60, 80], [30, 76, 40]].map(([x, y, rot]) => G(path('M-6 -8 L6 -8 L0 8 Z', '#a8443a'), `translate(${x} ${y}) rotate(${rot})`)).join('') + path('M38 34 C46 40 46 60 38 66 C44 60 52 56 56 52 C52 46 44 40 38 34 Z', '#f6d6a0') + tube([[54, 52], [68, 64], [72, 98]], 5, '#f6d6a0'), '#c75b4c');

  // =====================================================================================
  // Diseases & pathology
  // =====================================================================================
  const LIVER_D = 'M8 24 C20 8 60 6 92 12 C98 14 96 22 88 28 C70 42 52 60 34 64 C20 66 8 56 6 42 C5 34 5 28 8 24 Z';
  const KIDNEY_D = 'M44 6 C18 6 6 30 8 52 C10 76 24 94 44 94 C58 94 66 82 60 70 C56 62 50 58 50 50 C50 42 56 38 60 30 C66 18 58 6 44 6 Z';
  const BRAIN_D = 'M12 46 C10 26 28 10 52 10 C78 10 98 22 98 42 C98 56 90 60 80 58 C70 56 64 58 58 62 C44 66 18 62 12 46 Z';
  const HEART_D = 'M50 24 C40 14 14 16 12 38 C10 58 30 78 50 96 C70 78 90 58 88 38 C86 16 60 14 50 24 Z';
  const LUNG_D = 'M38 6 C20 6 6 30 6 56 C6 76 18 86 32 84 C42 82 46 76 46 62 V14 C46 8 42 6 38 6 Z';
  const STOMACH_D = 'M30 6 C30 20 26 30 30 40 C36 56 24 62 22 74 C22 86 40 90 56 84 C80 76 94 52 86 32 C80 18 64 16 52 24 C46 28 42 20 42 6 Z';
  const LEG_D = 'M18 2 H42 C44 30 46 60 42 84 C42 92 46 96 54 98 C58 100 58 106 52 106 H20 C16 106 14 102 16 96 C18 80 14 40 18 2 Z';
  const brain = (c = '#efb3bf') => path('M58 60 C60 70 62 78 64 88 L72 88 C70 78 70 70 72 60 Z', '#d7a7b0') + ell(84, 62, 15, 10, '#d48a9c') + path(BRAIN_D, c) + line('M24 34 q6 -6 12 0 M40 22 q8 -4 14 2 M62 20 q8 -2 14 4 M30 52 q8 -4 16 0 M76 40 q6 -4 10 0', '#c97f8f', 1.6);
  const TUM = '#e0d6cc', TUMO = '#9e8e80';
  const tumour = (cx, cy, rad, r) => glob(cx, cy, rad, rad * 0.9, TUM, r, { amp: 0.18, oc: TUMO }) + glob(cx - rad * 0.2, cy - rad * 0.15, rad * 0.4, rad * 0.35, '#f1ebe4', r, { amp: 0.2, oc: TUMO, w: 1 });
  const SKINL = (y = 30) => rr(0, y, 110, 16, 0, '#f6cfb8', { oc: '#d7967a' }) + rr(0, y + 16, 110, 30, 0, '#fbe3d4', { oc: '#d7967a' }) + rr(0, y + 46, 110, 14, 0, '#fff3c4', { oc: '#e0c070' });

  S('Fatty liver (steatosis)', CAT.dis, 'fatty liver steatosis NAFLD MASLD hepatic fat', [100, 70], (r) => {
    let s = path(LIVER_D, '#d9a066');
    for (let k = 0; k < 16; k++) { const x = 14 + r() * 70, y = 16 + r() * 34; if (y < 62 - (x - 10) * 0.42 && y > 14) s += ball(x, y, 2 + r() * 3, '#fff8e1', { oc: '#e0c070', w: 0.8 }); }
    return s;
  }, '#d9a066');
  S('Cirrhotic liver', CAT.dis, 'cirrhosis liver fibrosis nodules chronic liver disease', [100, 70], (r) => {
    let s = path('M12 26 C22 12 58 12 86 16 C90 18 88 24 82 28 C66 40 50 56 34 58 C22 60 12 52 10 40 C9 34 9 30 12 26 Z', '#8d5a3b');
    for (let k = 0; k < 26; k++) { const x = 16 + r() * 62, y = 20 + r() * 30; if (y < 56 - (x - 14) * 0.4) s += ball(x, y, 3 + r() * 2, '#a86b47', { oc: '#6d4128', w: 0.8 }); }
    return s;
  }, '#8d5a3b');
  S('Liver tumour', CAT.dis, 'liver cancer hepatocellular carcinoma HCC metastasis tumour', [100, 70], (r) => path(LIVER_D, ORG.liver) + shine(26, 26, 10, 6) + tumour(56, 30, 13, r), ORG.liver);
  S('Lung tumour', CAT.dis, 'lung cancer tumour mass NSCLC carcinoma nodule', [60, 90], (r) => path(LUNG_D, ORG.lung) + shine(20, 36, 6, 12, 15) + tumour(28, 44, 11, r), ORG.lung);
  S('Emphysema', CAT.dis, 'emphysema COPD alveolar destruction air spaces lung', [110, 90], (r) => {
    let s = tube([[0, 14], [26, 26], [40, 40]], 10, '#f8bbd0', { oc: '#d81b60' }) + glob(64, 54, 40, 32, '#fce4ec', r, { amp: 0.08, oc: '#d81b60' });
    s += ell(56, 48, 14, 11, '#ffffff', 10, { oc: '#e91e63', w: 1.2 }) + ell(80, 62, 12, 10, '#ffffff', -10, { oc: '#e91e63', w: 1.2 }) + ell(54, 70, 9, 7, '#ffffff', 0, { oc: '#e91e63', w: 1.2 });
    return s + line('M66 40 l4 6 M90 50 l-3 5 M42 60 l5 2', '#e91e63', 1.4);
  }, '#d81b60');
  S('Pneumonia', CAT.dis, 'pneumonia lung infection consolidation infiltrate', [60, 90], (r) => {
    let s = path(LUNG_D, ORG.lung) + glob(26, 62, 15, 14, '#c2185b', r, { amp: 0.15, oc: '#ad1457', op: 0.55 });
    for (let k = 0; k < 14; k++) s += ball(16 + r() * 22, 52 + r() * 22, 1.4, '#880e4f', { w: 0 });
    return s;
  }, '#ad1457');
  S('Asthma (airway narrowing)', CAT.dis, 'asthma bronchoconstriction airway inflammation mucus bronchus normal vs', [120, 60], () =>
    ball(30, 30, 26, '#f8bbd0', { oc: '#d81b60' }) + ball(30, 30, 16, '#ffffff', { oc: '#e57373' }) + arrow(60, 30, 66, 30, '#90a4ae', 2)
    + ball(92, 30, 26, '#ef9a9a', { oc: '#c62828' }) + `<circle cx="92" cy="30" r="20" fill="none" stroke="#c62828" stroke-width="3" stroke-dasharray="4 3"/>` + ball(92, 30, 7, '#fff59d', { oc: '#f9a825' }), '#c62828');
  S('Myocardial infarction', CAT.dis, 'heart attack myocardial infarction MI coronary occlusion ischaemia', [100, 100], () =>
    path(HEART_D, '#d9534f') + path('M40 72 C46 66 58 64 64 72 C60 80 54 86 50 90 C46 86 42 80 40 72 Z', '#5d4037', { op: 0.85 }) + line('M50 26 C56 38 60 52 56 66', '#ffcdd2', 2.4) + ball(57, 46, 4, '#3e2723') + shine(30, 40, 8, 12, 20), '#d9534f');
  S('Aortic aneurysm', CAT.dis, 'aortic aneurysm abdominal AAA bulge dilation', [70, 110], () =>
    tube([[35, 2], [35, 30]], 14, '#ef5350') + path('M28 30 C14 40 14 66 28 76 H42 C56 66 56 40 42 30 Z', '#ef5350') + tubes([[[30, 76], [22, 108]], [[40, 76], [48, 108]]], 10, '#ef5350') + shine(28, 46, 4, 10, 0), '#ef5350');
  S('Deep vein thrombosis', CAT.dis, 'DVT deep vein thrombosis leg clot swelling', [60, 110], () =>
    path(LEG_D, '#f2c4a8') + line('M30 4 C32 30 30 60 32 90', '#5c6bc0', 4) + ell(31, 48, 4, 10, '#8b1a1a') + path('M42 30 C48 40 48 60 44 70', 'none', { oc: '#e57373', w: 1.4 }), '#8b1a1a');
  S('Varicose veins', CAT.dis, 'varicose veins venous insufficiency leg', [60, 110], () =>
    path(LEG_D, '#f2c4a8') + line('M28 4 C36 14 22 22 32 32 C40 40 24 48 32 58 C38 66 26 74 30 86', '#5c6bc0', 3.6) + line('M32 32 C38 36 40 44 36 50', '#7986cb', 2.6), '#5c6bc0');
  S('Ischaemic stroke', CAT.dis, 'stroke ischaemic cerebral infarct blocked artery brain clot', [110, 90], () =>
    brain() + path('M60 18 C76 20 88 30 88 42 C80 46 70 42 64 36 C58 30 56 22 60 18 Z', '#8d6e63', { op: 0.55 }) + line('M30 70 C40 56 52 44 62 34', ART, 2.4) + ball(56, 42, 4, '#4e342e'), '#8d6e63');
  S('Haemorrhagic stroke', CAT.dis, 'haemorrhagic stroke intracerebral haemorrhage bleed brain', [110, 90], (r) => brain() + glob(56, 34, 12, 10, '#b71c1c', r, { amp: 0.2 }) + ball(66, 26, 2.4, '#b71c1c', { w: 0 }) + ball(46, 26, 2, '#b71c1c', { w: 0 }), '#b71c1c');
  S("Alzheimer's disease (brain atrophy)", CAT.dis, 'Alzheimer disease dementia brain atrophy neurodegeneration shrinkage', [110, 90], () =>
    path('M58 60 C60 70 62 78 64 88 L72 88 C70 78 70 70 72 60 Z', '#d7a7b0') + ell(84, 62, 14, 9, '#d48a9c') + path('M16 46 C14 30 30 16 52 16 C76 16 94 26 94 42 C94 54 86 58 78 56 C68 54 62 56 56 60 C44 64 20 60 16 46 Z', '#e8a5b2')
    + line('M28 30 q4 10 0 20 M44 20 q4 12 0 26 M60 20 q-4 12 2 24 M76 26 q-4 8 0 18 M36 52 q10 -6 20 2', '#7b3f4d', 3), '#d48a9c');
  S('Amyloid plaques and tau tangles', CAT.dis, 'amyloid beta plaques tau neurofibrillary tangles Alzheimer neuron', [110, 90], (r) => {
    let s = tubes([[[40, 44], [22, 26], [10, 18]], [[40, 44], [16, 56], [4, 60]], [[40, 44], [44, 16], [46, 4]], [[40, 44], [70, 52], [108, 54]]], 3.4, NERVE) + glob(40, 44, 14, 12, NERVE, r) + line('M34 40 C38 46 42 38 46 46 M34 48 C40 52 44 44 48 50', '#4e342e', 1.8);
    return s + glob(82, 24, 16, 14, '#a1887f', r, { amp: 0.25, oc: '#6d4c41' }) + Array.from({ length: 10 }, (_, k) => { const t = k * 0.63; return line(`M${f(82 + Math.cos(t) * 6)} ${f(24 + Math.sin(t) * 6)} L${f(82 + Math.cos(t) * 18)} ${f(24 + Math.sin(t) * 16)}`, '#6d4c41', 1.2); }).join('');
  }, '#6d4c41');
  S('Multiple sclerosis (demyelination)', CAT.dis, 'multiple sclerosis MS demyelination myelin damage axon autoimmune lesion', [130, 60], () =>
    tube([[2, 30], [128, 30]], 6, NERVE) + rr(6, 18, 26, 24, 11, '#f6efcc', { oc: '#c9b97a' }) + rr(96, 18, 26, 24, 11, '#f6efcc', { oc: '#c9b97a' })
    + path('M40 20 C46 16 54 18 56 24 L52 40 C46 44 40 42 38 36 Z', '#f6efcc', { oc: '#c9b97a', op: 0.6 }) + line('M44 22 l4 6 M50 30 l-4 6', '#c9b97a', 1.2) + ball(72, 14, 8, '#7986cb') + ball(80, 46, 7, '#9575cd'), '#7986cb');
  S("Lewy body (Parkinson's disease)", CAT.dis, 'Lewy body Parkinson disease alpha-synuclein inclusion dopaminergic neuron', [100, 90], (r) =>
    tubes([[[50, 46], [28, 24], [16, 14]], [[50, 46], [22, 60], [8, 66]], [[50, 46], [56, 16], [58, 4]], [[50, 46], [80, 56], [98, 60]]], 3.4, '#bcaaa4') + glob(50, 46, 20, 17, '#d7ccc8', r)
    + ball(54, 44, 9, '#fce4ec', { oc: '#f48fb1' }) + ball(54, 44, 5.4, '#e91e63', { oc: '#ad1457' }) + ball(40, 50, 3.6, '#8d6e63', { w: 0.8 }), '#e91e63');
  S('Kidney stones', CAT.dis, 'kidney stones nephrolithiasis renal calculi ureter', [80, 100], () =>
    path(KIDNEY_D, '#c75b4c') + path('M38 34 C46 40 46 60 38 66 C44 60 52 56 56 52 C52 46 44 40 38 34 Z', '#f6d6a0') + tube([[54, 52], [68, 64], [72, 98]], 5, '#f6d6a0')
    + [[44, 46, 0], [48, 56, 30], [69, 76, 60]].map(([x, y, rot]) => path(poly(ngon(x, y, 4.4, 5, rot)), '#bdb08a', { oc: '#7a6c45' })).join(''), '#bdb08a');
  S('Polycystic kidney', CAT.dis, 'polycystic kidney disease PKD cysts', [80, 100], (r) => {
    let s = path('M44 4 C14 4 2 30 4 54 C6 80 22 96 44 96 C60 96 70 82 62 70 C58 62 52 58 52 50 C52 42 58 38 62 30 C68 16 60 4 44 4 Z', '#c75b4c');
    for (let k = 0; k < 14; k++) { const x = 14 + r() * 32, y = 14 + r() * 72; s += ball(x, y, 4 + r() * 4, '#fff3c4', { oc: '#d4a017', w: 1 }); }
    return s;
  }, '#d4a017');
  S('Urinary tract infection', CAT.dis, 'UTI urinary tract infection cystitis bladder bacteria E. coli', [90, 90], (r) => {
    let s = path('M20 30 C20 14 70 14 70 30 C74 58 60 76 45 76 C30 76 16 58 20 30 Z', '#f6d365', { oc: '#c9a227' }) + tube([[45, 76], [45, 90]], 5, '#f6d365', { oc: '#c9a227' }) + line('M24 24 L14 4 M66 24 L76 4', '#f0c8a0', 4);
    for (let k = 0; k < 9; k++) s += rr(26 + r() * 32, 32 + r() * 30, 9, 4.4, 2.2, '#81c784', { rot: r() * 180, w: 0.8 });
    return s;
  }, '#81c784');
  S('Gastric ulcer', CAT.dis, 'peptic gastric ulcer stomach H. pylori erosion', [100, 90], () =>
    path(STOMACH_D, '#f0a07f') + shine(64, 40, 10, 6) + ell(46, 66, 9, 6, '#c62828', -10) + ell(46, 66, 5, 3, '#fff3e0', -10, { oc: '#c62828', w: 1 }), '#c62828');
  S('Inflammatory bowel disease (colitis)', CAT.dis, 'inflammatory bowel disease IBD ulcerative colitis Crohn disease inflamed colon ulcers', [110, 70], (r) => {
    // A segment of large intestine with its pouches (haustra), swollen and red, with pale ulcers on the lining.
    const x0 = 10, x1 = 98, n = 5, sw = (x1 - x0) / n, top = 20, bot = 50, rr2 = (bot - top) / 2;
    let d = `M${x0} ${top}`;
    for (let k = 1; k <= n; k++) d += ` A${f(sw / 2)} 6 0 0 1 ${f(x0 + k * sw)} ${top}`;
    d += ` A6 ${rr2} 0 0 1 ${x1} ${bot}`;
    for (let k = n - 1; k >= 0; k--) d += ` A${f(sw / 2)} 6 0 0 1 ${f(x0 + k * sw)} ${bot}`;
    d += ` A6 ${rr2} 0 0 1 ${x0} ${top} Z`;
    let s = path(d, '#e06060') + ell(x1, 35, 5, rr2 - 2.5, '#9c2f2f', 0, { oc: '#b83a3a', w: 1.2 }); // open end shows the lumen
    for (let k = 1; k < n; k++) { const x = x0 + k * sw; s += line(`M${f(x)} ${top + 2} Q${f(x - 3)} 35 ${f(x)} ${bot - 2}`, '#b83a3a', 1.6); }
    for (let k = 0; k < n; k++) s += ell(x0 + (k + 0.5) * sw + (r() - 0.5) * 5, 30 + r() * 10, 3.6, 2.5, '#fff1c1', r() * 60, { oc: '#a31515', w: 1.2 });
    return s;
  }, '#d32f2f');
  S('Colon polyp', CAT.dis, 'colon polyp adenoma colorectal colonoscopy', [110, 70], () =>
    rr(4, 8, 102, 54, 22, '#f3b8a6', { oc: '#d9927e' }) + rr(12, 16, 86, 38, 16, '#fbe0d6', { oc: '#d9927e', w: 1.4 }) + line('M48 54 V40', '#d9927e', 4) + ball(48, 34, 10, '#e57373') + shine(45, 30, 3, 2), '#e57373');
  S('Appendicitis', CAT.dis, 'appendicitis inflamed appendix caecum acute abdomen', [90, 100], () =>
    tube([[20, 4], [20, 50], [36, 60], [70, 60]], 18, '#e9a08a') + tube([[30, 66], [34, 82], [44, 94]], 9, '#d32f2f') + shine(32, 76, 2, 5, -20) + line('M26 72 l-6 2 M40 92 l2 6 M44 80 l6 0', '#d32f2f', 1.6), '#d32f2f');
  S('Gallstones', CAT.dis, 'gallstones cholelithiasis gallbladder biliary colic', [70, 100], () =>
    path('M35 4 C46 4 50 10 48 20 C62 30 66 60 56 80 C48 96 22 96 14 80 C4 60 10 30 26 22 C24 12 26 4 35 4 Z', '#81c784') + [[30, 60, 0], [42, 66, 30], [36, 76, 15], [26, 72, 45], [44, 54, 10]].map(([x, y, rot]) => path(poly(ngon(x, y, 5, 6, rot)), '#bdb08a', { oc: '#6b5e3a' })).join(''), '#81c784');
  S('Coeliac disease (villous atrophy)', CAT.dis, 'coeliac celiac disease villous atrophy gluten small intestine', [120, 70], () => {
    let s = rr(0, 56, 120, 12, 2, '#fff3e0', { oc: '#ffcc80' });
    for (const x of [6, 22, 38]) s += path(`M${x} 56 V18 C${x} 8 ${x + 12} 8 ${x + 12} 18 V56 Z`, '#ffccbc', { oc: '#d7907a' });
    s += line('M58 30 V50', '#90a4ae', 2) + arrow(54, 40, 66, 40, '#90a4ae', 2);
    for (const x of [72, 88, 104]) s += path(`M${x} 56 V46 C${x} 40 ${x + 12} 40 ${x + 12} 46 V56 Z`, '#ffab91', { oc: '#d7907a' });
    return s;
  }, '#d7907a');
  S('Osteoarthritis', CAT.dis, 'osteoarthritis knee cartilage loss bone spurs joint degeneration', [80, 110], () =>
    path('M24 2 H56 V36 C56 46 64 50 64 56 H16 C16 50 24 46 24 36 Z', ORG.bone, { oc: ORG.boneO }) + path('M18 64 H62 C62 70 56 74 56 80 V108 H24 V80 C24 74 18 70 18 64 Z', ORG.bone, { oc: ORG.boneO })
    + path('M16 56 H40 C38 58 36 60 30 60 H18 Z', '#90caf9') + path('M18 64 H34 C32 62 28 62 20 62 Z', '#90caf9') + path('M64 56 L70 60 L62 60 Z M18 64 L10 62 L16 68 Z', ORG.bone, { oc: ORG.boneO }) + line('M44 58 H60', '#c62828', 1.6, { dash: '3 2' }), '#90caf9');
  S('Rheumatoid arthritis', CAT.dis, 'rheumatoid arthritis RA synovitis swollen joint autoimmune finger', [80, 110], () =>
    rr(28, 2, 24, 44, 10, ORG.bone, { oc: ORG.boneO }) + rr(28, 64, 24, 44, 10, ORG.bone, { oc: ORG.boneO }) + ell(40, 55, 26, 18, '#ef5350', 0, { op: 0.55, oc: '#c62828' }) + rr(30, 46, 20, 18, 4, '#bbdefb', { oc: '#64b5f6', w: 1 }) + line('M14 40 l-6 -4 M66 40 l6 -4 M14 70 l-6 4 M66 70 l6 4', '#c62828', 1.8), '#ef5350');
  S('Osteoporosis', CAT.dis, 'osteoporosis bone density porous trabecular bone loss normal vs', [120, 60], () => {
    let s = ball(30, 30, 26, ORG.bone, { oc: ORG.boneO }) + ball(92, 30, 26, ORG.bone, { oc: ORG.boneO });
    for (let k = 0; k < 16; k++) { const t = k * 2.4, d = 4 + (k % 4) * 5; s += ball(30 + Math.cos(t) * d, 30 + Math.sin(t) * d, 1.6, '#fff8e1', { oc: ORG.boneO, w: 0.6 }); }
    for (let k = 0; k < 9; k++) { const t = k * 2.4, d = 4 + (k % 3) * 7; s += ball(92 + Math.cos(t) * d, 30 + Math.sin(t) * d, 4.5, '#fff8e1', { oc: ORG.boneO, w: 0.8 }); }
    return s + arrow(58, 30, 64, 30, '#90a4ae', 2);
  }, ORG.boneO);
  S('Bone fracture', CAT.dis, 'fracture broken bone trauma long bone', [120, 60], () =>
    path('M4 22 C4 12 18 12 20 18 H52 L58 26 L50 34 L56 42 H20 C18 48 4 48 4 38 Z', ORG.bone, { oc: ORG.boneO }) + path('M116 22 C116 12 102 12 100 18 H64 L70 26 L62 34 L68 42 H100 C102 48 116 48 116 38 Z', ORG.bone, { oc: ORG.boneO }) + line('M60 10 l-4 6 M62 50 l4 -6', '#c62828', 2), ORG.boneO);
  S('Psoriasis', CAT.dis, 'psoriasis plaque skin scales keratinocyte hyperproliferation', [110, 80], () =>
    SKINL(26) + path('M30 26 C34 10 76 10 80 26 Z', '#e57373', { oc: '#c62828' }) + [[38, 18], [48, 14], [58, 13], [68, 16], [44, 22], [62, 21]].map(([x, y]) => ell(x, y, 6, 2.4, '#eceff1', -8, { oc: '#b0bec5', w: 0.8 })).join(''), '#e57373');
  S('Melanoma (skin lesion)', CAT.dis, 'melanoma mole skin cancer ABCDE asymmetric irregular border naevus', [100, 90], (r) =>
    rr(0, 0, 100, 90, 10, '#f2c4a8', { oc: '#d7967a' }) + glob(50, 46, 26, 20, '#5d4037', r, { amp: 0.25, oc: '#3e2723' }) + glob(42, 40, 10, 8, '#8d6e63', r, { amp: 0.3, w: 0 }) + glob(60, 52, 7, 6, '#212121', r, { amp: 0.3, w: 0 }) + ball(66, 36, 3, '#c62828', { w: 0 }), '#5d4037');
  S('Burn (skin depth)', CAT.dis, 'burn thermal injury skin depth superficial partial full thickness blister', [110, 80], () =>
    SKINL(20) + path('M14 20 C14 8 40 8 40 20 Z', '#fff9c4', { oc: '#f9a825' }) + rr(44, 20, 26, 26, 0, '#e57373', { w: 0 }) + rr(74, 20, 30, 46, 0, '#5d4037', { w: 0 }) + line('M44 20 V80 M72 20 V80', '#ffffff', 1.4, { dash: '3 2' }), '#e57373');
  S('Cataract', CAT.dis, 'cataract cloudy lens eye vision', [110, 70], () =>
    path('M4 35 C24 4 86 4 106 35 C86 66 24 66 4 35 Z', '#ffffff', { oc: '#90a4ae' }) + ball(55, 35, 22, '#6d8b74') + ball(55, 35, 11, '#cfd8dc', { oc: '#90a4ae' }) + ball(51, 31, 4, '#ffffff', { w: 0 }) + shine(62, 28, 4, 2), '#90a4ae');
  S('Diabetic retinopathy (fundus)', CAT.dis, 'diabetic retinopathy fundus retina haemorrhages exudates microaneurysms eye exam', [100, 100], (r) => {
    let s = ball(50, 50, 46, '#e8823a', { oc: '#b85a1c' }) + ball(30, 46, 9, '#ffe0a0', { oc: '#e0a050' });
    // vascular arcades curve above and below the macula (darker spot)
    s += ball(64, 50, 7, '#c9651f', { w: 0 }) + line('M34 40 C44 20 72 16 90 28 M34 52 C44 72 72 80 90 70 M34 42 C42 30 56 30 64 34 M34 50 C42 62 56 66 66 62 M32 38 C30 24 34 12 42 8 M32 54 C30 70 36 82 44 88', '#b71c1c', 1.8);
    for (let k = 0; k < 9; k++) s += ball(46 + r() * 36, 26 + r() * 48, 1.6 + r() * 1.8, '#8b0000', { w: 0 });
    for (let k = 0; k < 7; k++) s += ball(56 + r() * 24, 36 + r() * 30, 1.6, '#fff176', { w: 0 });
    return s;
  }, '#e8823a');
  S('Goitre (enlarged thyroid)', CAT.dis, 'goitre goiter enlarged thyroid nodules hypothyroidism hyperthyroidism', [100, 80], (r) =>
    tube([[50, 0], [50, 80]], 14, '#f8bbd0', { oc: '#d81b60' }) + glob(28, 46, 22, 26, '#f06292', r, { amp: 0.14 }) + glob(72, 46, 22, 26, '#f06292', r, { amp: 0.14 }) + rr(36, 44, 28, 14, 6, '#f06292') + ball(66, 54, 6, '#ec407a', { w: 1 }) + ball(24, 40, 5, '#ec407a', { w: 1 }), '#f06292');
  S('Type 1 diabetes (islet autoimmunity)', CAT.dis, 'type 1 diabetes autoimmune insulitis beta cells T cells islet', [100, 100], (r) => {
    let s = glob(50, 50, 40, 38, '#f1f8e9', r, { amp: 0.06, oc: '#7cb342' });
    for (let k = 0; k < 12; k++) { const t = k * 2.4, d = 6 + (k % 3) * 9; s += ball(50 + Math.cos(t) * d, 50 + Math.sin(t) * d, 4.4, k % 4 === 0 ? '#c5e1a5' : '#81c784', { w: 0.8 }); }
    return s + [[22, 30], [80, 36], [30, 78], [74, 74], [50, 16]].map(([x, y]) => ball(x, y, 6.5, '#5c6bc0') + ball(x - 1.5, y - 1.5, 2.6, '#3949ab', { w: 0 })).join('');
  }, '#5c6bc0');
  S('Abscess', CAT.dis, 'abscess pus infection skin boil Staphylococcus', [110, 80], () =>
    SKINL(14) + ell(55, 46, 26, 16, '#ef9a9a', 0, { oc: '#c62828' }) + ell(55, 46, 18, 10, '#fff176', 0, { oc: '#f9a825' }) + [[48, 44], [58, 48], [54, 40], [64, 44]].map(([x, y]) => ball(x, y, 2, '#ffb74d', { w: 0.6 })).join(''), '#c62828');
  S('Acute inflammation', CAT.dis, 'inflammation redness swelling vasodilation neutrophil extravasation oedema', [110, 90], (r) => {
    let s = rr(0, 0, 110, 90, 8, '#fff3f0', { oc: '#ef9a9a' }) + rr(0, 10, 110, 22, 11, '#ffcdd2', { oc: '#e57373' });
    for (const x of [14, 34, 54, 74, 94]) s += ell(x, 21, 6, 4, ART);
    s += path('M60 32 C62 40 58 46 62 52', 'none', { oc: '#9575cd', w: 2 }) + ball(62, 54, 6, '#b39ddb') + ball(40, 64, 6, '#b39ddb') + ball(84, 70, 6, '#b39ddb');
    for (let k = 0; k < 10; k++) s += ball(10 + r() * 90, 44 + r() * 40, 1.6, '#90caf9', { w: 0 });
    return s;
  }, '#e57373');
  S('Malaria (infected red cells)', CAT.dis, 'malaria Plasmodium falciparum infected red blood cells ring stage schizont', [100, 80], () => {
    const rbc = (x, y) => ball(x, y, 15, '#ef9a9a', { oc: '#c62828' }) + ball(x, y, 7, '#f8bbd0', { w: 0 });
    return rbc(26, 26) + `<circle cx="22" cy="22" r="4" fill="none" stroke="#6a1b9a" stroke-width="1.8"/>` + ball(25, 19, 1.4, '#4a148c', { w: 0 })
      + rbc(70, 24) + rbc(46, 56) + `<circle cx="50" cy="52" r="4" fill="none" stroke="#6a1b9a" stroke-width="1.8"/>` + ball(53, 49, 1.4, '#4a148c', { w: 0 })
      + ball(84, 60, 15, '#ef9a9a', { oc: '#c62828' }) + ngon(84, 60, 7, 8).map(([x, y]) => ball(x, y, 2.4, '#7b1fa2', { w: 0.6 })).join('');
  }, '#7b1fa2');
  S('Dental caries', CAT.dis, 'dental caries tooth decay cavity dentistry', [70, 100], () =>
    path('M10 20 C10 4 30 6 35 12 C40 6 60 4 60 20 C60 36 54 44 52 60 L48 94 C46 98 42 98 41 92 L37 66 H33 L29 92 C28 98 24 98 22 94 L18 60 C16 44 10 36 10 20 Z', '#ffffff', { oc: '#b0bec5' })
    + path('M40 16 C46 14 50 20 48 28 C46 34 40 34 38 28 C36 22 36 18 40 16 Z', '#5d4037') + line('M14 30 C22 34 48 34 56 30', '#e0e0e0', 1.4), '#5d4037');

  // =====================================================================================
  // Clinical procedures & imaging
  // =====================================================================================
  const DEV = '#eceff1', DEVO = '#90a4ae', SCR = '#263238', MET = '#cfd8dc';
  S('Chest X-ray', CAT.proc, 'chest X-ray radiograph CXR lungs ribs imaging radiology', [90, 100], () => {
    let s = rr(2, 2, 86, 96, 4, '#212121', { oc: '#000000' }) + path('M44 20 C30 18 14 34 12 60 C12 76 22 86 34 84 C40 82 42 76 42 66 V26 Z', '#455a64', { w: 0 }) + path('M46 20 C60 18 76 34 78 60 C78 76 68 86 56 84 C50 82 48 76 48 66 V26 Z', '#455a64', { w: 0 });
    for (let k = 0; k < 7; k++) s += line(`M45 ${24 + k * 8} C${30 - k} ${20 + k * 8} ${16} ${32 + k * 8} ${18 + k} ${44 + k * 8} M45 ${24 + k * 8} C${60 + k} ${20 + k * 8} ${74} ${32 + k * 8} ${72 - k} ${44 + k * 8}`, '#cfd8dc', 1.6, { op: 0.8 });
    return s + rr(42, 8, 6, 84, 3, '#cfd8dc', { w: 0, op: 0.85 }) + path('M44 52 C36 52 34 68 42 76 C50 80 60 74 58 62 C56 54 50 52 44 52 Z', '#b0bec5', { w: 0, op: 0.8 });
  }, '#212121');
  S('CT scanner', CAT.proc, 'CT scanner computed tomography radiology imaging gantry', [110, 90], () =>
    rr(28, 4, 64, 70, 30, DEV, { oc: DEVO }) + ball(60, 39, 17, '#455a64') + rr(4, 52, 100, 10, 4, MET, { oc: DEVO }) + rr(14, 62, 60, 24, 3, '#b0bec5', { oc: DEVO }) + ball(84, 18, 2.6, '#66bb6a', { w: 0 }), DEVO);
  S('CT scan (brain slice)', CAT.proc, 'CT MRI scan axial slice brain imaging radiology', [100, 100], () =>
    rr(2, 2, 96, 96, 4, '#111111', { oc: '#000000' }) + ell(50, 50, 34, 40, '#eeeeee', 0, { w: 0 }) + ell(50, 50, 30, 36, '#8a8a8a', 0, { w: 0 })
    + path('M42 42 C38 50 40 60 46 60 C48 54 48 48 46 42 Z', '#222222', { w: 0 }) + path('M58 42 C62 50 60 60 54 60 C52 54 52 48 54 42 Z', '#222222', { w: 0 }) + line('M50 16 V84', '#5a5a5a', 1.2), '#111111');
  S('Ultrasound probe', CAT.proc, 'ultrasound transducer probe sonography POCUS', [70, 110], () =>
    path('M22 50 H48 L52 86 C52 92 48 96 42 96 H28 C22 96 18 92 18 86 Z', DEV, { oc: DEVO }) + rr(16, 94, 38, 10, 5, '#455a64') + rr(26, 26, 18, 26, 6, '#b0bec5', { oc: DEVO }) + line('M35 26 C35 10 50 6 60 2', '#455a64', 3), DEVO);
  S('Ultrasound image (fetal)', CAT.proc, 'ultrasound scan fetus pregnancy obstetric sonogram', [110, 90], () =>
    rr(0, 0, 110, 90, 6, '#111111', { oc: '#000000' }) + path('M55 6 L100 80 C70 92 40 92 10 80 Z', '#3a3a3a', { w: 0 }) + path('M40 50 C40 36 54 30 62 38 C70 46 72 62 64 70 C56 76 44 72 42 64 C30 66 30 54 40 50 Z', '#cfcfcf', { w: 0 }) + ball(48, 44, 8, '#e0e0e0', { w: 0 }), '#3a3a3a');
  S('Endoscope', CAT.proc, 'endoscope endoscopy colonoscopy gastroscopy scope', [110, 90], () =>
    rr(6, 10, 26, 46, 8, '#455a64') + ball(19, 24, 4, '#90a4ae') + ball(19, 38, 4, '#90a4ae') + line('M32 34 C60 34 52 70 80 72 C92 72 96 62 100 56', '#263238', 4) + ball(102, 54, 3, '#fff59d', { oc: '#f9a825' }) + line('M19 56 V86', '#263238', 3), '#455a64');
  S('IV cannula', CAT.proc, 'intravenous cannula catheter venflon IV line', [110, 60], () =>
    rr(52, 22, 24, 16, 6, '#ffb74d') + path('M56 22 L48 4 L62 20 Z M56 38 L48 56 L62 40 Z', '#ffcc80') + rr(76, 26, 22, 8, 3, '#ffe0b2', { oc: '#ffa726' }) + line('M52 30 H6', '#b0bec5', 3) + line('M52 30 H18', '#eceff1', 1.4) + rr(56, 6, 10, 10, 3, '#ffa726'), '#ffa726');
  S('Sutures (stitched wound)', CAT.proc, 'sutures stitches wound closure surgery laceration', [110, 70], () =>
    rr(0, 0, 110, 70, 10, '#f2c4a8', { oc: '#d7967a' }) + line('M12 36 C40 30 70 40 98 34', '#c62828', 2.4) + [20, 34, 48, 62, 76, 90].map((x) => line(`M${x - 4} 26 L${x + 4} 44 M${x + 4} 26 L${x - 4} 44`, '#263238', 1.8)).join(''), '#c62828');
  S('Biopsy needle', CAT.proc, 'biopsy needle core biopsy tissue sample', [120, 50], () =>
    rr(4, 14, 30, 22, 6, '#4fc3f7') + rr(34, 20, 10, 10, 2, MET, { oc: DEVO }) + line('M44 25 H114', '#90a4ae', 3) + rr(84, 22, 18, 6, 2, '#e57373', { w: 0.8 }), '#4fc3f7');
  S('Vaccine (vial and syringe)', CAT.proc, 'vaccine vaccination immunisation vial syringe injection', [110, 90], () =>
    rr(10, 26, 26, 8, 2, '#ef5350') + rr(12, 34, 22, 48, 6, '#e1f5fe', { oc: '#8aa0b4' }) + rr(13, 54, 20, 26, 4, '#b3e5fc', { w: 0 }) + rr(13, 46, 20, 8, 1, '#ffffff', { oc: '#8aa0b4', w: 0.8 })
    + G(rr(0, -7, 44, 14, 3, '#eceff1', { oc: DEVO }) + rr(4, -5, 26, 10, 2, '#b3e5fc', { w: 0 }) + line('M8 -7 V-3 M14 -7 V-3 M20 -7 V-3 M26 -7 V-3', DEVO, 1) + rr(-10, -3, 10, 6, 1, '#90a4ae') + rr(-14, -8, 4, 16, 1.5, '#607d8b') + rr(44, -3, 5, 6, 1, '#90a4ae') + line('M49 0 H66', '#90a4ae', 1.6), 'translate(50 62) rotate(-35)'), '#4fc3f7');
  S('Defibrillator (AED)', CAT.proc, 'AED defibrillator cardiac arrest resuscitation CPR', [100, 90], () =>
    rr(10, 14, 64, 60, 10, '#43a047') + rr(18, 22, 48, 30, 5, '#ffffff', { w: 0 }) + path('M42 28 C38 24 30 26 30 32 C30 38 38 44 42 48 C46 44 54 38 54 32 C54 26 46 24 42 28 Z', '#e53935') + path('M44 30 L38 38 H44 L40 46 L48 36 H42 Z', '#ffeb3b', { w: 0.6 })
    + rr(24, 58, 36, 8, 3, '#ffeb3b') + line('M74 40 C88 40 86 66 92 70', '#263238', 2) + rr(82, 70, 16, 12, 3, '#eceff1', { oc: DEVO }), '#43a047');
  S('Oxygen mask', CAT.proc, 'oxygen mask O2 therapy respiratory support', [100, 90], () =>
    line('M14 30 C2 30 2 56 18 58 M86 30 C98 30 98 56 82 58', '#90a4ae', 2) + path('M50 12 C66 12 82 30 82 48 C82 64 66 72 50 72 C34 72 18 64 18 48 C18 30 34 12 50 12 Z', '#e0f7fa', { oc: '#4dd0e1', op: 0.9 }) + ball(50, 48, 6, '#b2ebf2', { oc: '#4dd0e1' }) + line('M50 72 C50 82 62 86 74 88', '#4dd0e1', 3.4), '#4dd0e1');
  S('Nasal cannula', CAT.proc, 'nasal cannula oxygen prongs low-flow O2', [100, 80], () =>
    line('M50 30 C30 30 14 40 16 56 C18 70 40 74 50 78 M50 30 C70 30 86 40 84 56 C82 70 60 74 50 78', '#80deea', 3) + rr(40, 24, 20, 8, 4, '#80deea') + line('M45 24 V18 M55 24 V18', '#4dd0e1', 3) + line('M50 78 V80', '#80deea', 3), '#4dd0e1');
  S('Ventilator', CAT.proc, 'mechanical ventilator ICU respiratory support intubation', [100, 100], () =>
    rr(14, 6, 60, 70, 6, DEV, { oc: DEVO }) + rr(20, 12, 48, 28, 3, SCR) + line('M22 30 L30 30 L34 18 L38 34 L42 30 H66', '#80deea', 1.6) + [26, 38, 50, 62].map((x) => ball(x, 52, 4, '#90a4ae')).join('') + rr(30, 76, 28, 6, 2, '#b0bec5') + tubes([[[74, 30], [86, 34], [92, 60], [80, 94]], [[74, 44], [84, 50], [86, 70], [80, 94]]], 3.4, '#b3e5fc', { oc: '#4fc3f7' }), DEVO);
  S('Pulse oximeter', CAT.proc, 'pulse oximeter SpO2 oxygen saturation finger', [100, 80], () =>
    rr(38, 16, 56, 44, 12, '#f2c4a8', { oc: '#d7967a' }) + rr(18, 10, 48, 56, 12, '#5c6bc0') + rr(24, 18, 36, 24, 4, SCR) + txt(42, 35, '98', 14, '#80deea') + line('M26 54 H58', '#9fa8da', 2), '#5c6bc0');
  S('Glucose meter', CAT.proc, 'glucometer blood glucose meter diabetes test strip fingerprick', [90, 100], () =>
    rr(14, 22, 50, 74, 10, '#455a64') + rr(20, 30, 38, 26, 4, '#b2dfdb', { w: 0 }) + txt(39, 49, '5.6', 13, '#004d40') + ball(30, 72, 5, '#78909c') + ball(48, 72, 5, '#78909c') + rr(32, 6, 14, 18, 2, '#ffffff', { oc: DEVO }) + path('M70 30 C74 36 78 40 78 46 C78 50 74 52 70 52 C66 52 62 50 62 46 C62 40 66 36 70 30 Z', '#d32f2f'), '#455a64');
  S('Dialysis machine', CAT.proc, 'haemodialysis dialysis machine dialyser kidney failure renal replacement', [90, 110], () =>
    rr(12, 4, 54, 102, 6, DEV, { oc: DEVO }) + rr(18, 10, 42, 22, 3, SCR) + line('M22 24 H34 L38 16 L42 26 H56', '#80deea', 1.4) + rr(70, 30, 12, 40, 6, '#fff9c4', { oc: '#fbc02d' }) + line('M66 44 H70 M66 60 H70', '#e53935', 3) + ball(30, 50, 7, '#90a4ae') + ball(48, 50, 7, '#90a4ae') + line('M76 70 C76 90 60 96 50 104', '#e53935', 2.4) + line('M76 30 C76 14 84 8 88 4', '#e53935', 2.4), DEVO);
  S('Wheelchair', CAT.proc, 'wheelchair mobility accessibility disability', [100, 100], () =>
    `<circle cx="42" cy="66" r="28" fill="none" stroke="#455a64" stroke-width="5"/>` + `<circle cx="42" cy="66" r="3" fill="#455a64"/>` + ball(82, 88, 7, '#455a64') + line('M24 14 V54 H66 L80 84 M24 40 H62', '#607d8b', 5) + line('M66 54 V30', '#607d8b', 4) + rr(18, 8, 12, 8, 3, '#263238'), '#455a64');
  S('Crutches', CAT.proc, 'crutches mobility aid injury', [80, 110], () =>
    [[24, -6], [56, 6]].map(([x, rot]) => G(line('M-8 6 H8 M-6 6 L-3 70 M6 6 L3 70 M0 70 V104 M-4 40 H4', '#90a4ae', 3.6) + rr(-10, 0, 20, 7, 3.5, '#455a64') + rr(-5, 98, 10, 8, 3, '#263238'), `translate(${x} 4) rotate(${rot} 0 50)`)).join(''), '#90a4ae');
  S('Arm cast and sling', CAT.proc, 'cast sling fracture arm immobilisation orthopaedics', [110, 90], () =>
    line('M14 48 L54 6 M98 40 L62 6', '#4fc3f7', 5) + ell(58, 7, 6, 5, '#4fc3f7') // strap round the neck
    + G(rr(0, -10, 78, 20, 9, '#f4efe6', { oc: '#b8ab95' }) + line('M18 -10 L24 10 M34 -10 L40 10 M50 -10 L56 10', '#ddd3c1', 1.4), 'translate(10 46) rotate(-5)') // forearm cast
    + ell(94, 38, 8, 6.5, ORG.skin) // hand
    + path('M8 46 L96 44 C92 62 70 78 42 80 C24 80 10 66 8 46 Z', '#81d4fa', { oc: '#4fc3f7' }), '#4fc3f7');
  S('Surgical lights (operating theatre)', CAT.proc, 'operating theatre surgical lights surgery OR operating room', [110, 90], () =>
    line('M55 0 V14 M55 14 L30 30 M55 14 L80 30', '#90a4ae', 4) + [[30, 40], [80, 40]].map(([x, y]) => ell(x, y, 22, 12, DEV, 0, { oc: DEVO }) + ngon(x, y + 2, 9, 6).map(([px, py]) => ball(px, py, 3, '#fff59d', { oc: '#fbc02d', w: 0.8 })).join('') + ball(x, y + 2, 3, '#fff59d', { oc: '#fbc02d', w: 0.8 })).join('') + rr(14, 76, 82, 10, 4, '#4db6ac'), DEVO);
  S('Ambulance', CAT.proc, 'ambulance emergency EMS paramedic transport', [120, 80], () =>
    path('M6 20 H70 V62 H6 Z', '#ffffff', { oc: DEVO }) + path('M70 30 H94 L112 46 V62 H70 Z', '#ffffff', { oc: DEVO }) + path('M76 34 H92 L104 46 H76 Z', '#b3e5fc', { oc: DEVO, w: 1 }) + rr(6, 44, 106, 6, 0, '#e53935', { w: 0 })
    + rr(32, 24, 6, 18, 1, '#e53935') + rr(26, 30, 18, 6, 1, '#e53935') + rr(44, 12, 12, 8, 3, '#2196f3') + ball(26, 64, 9, '#37474f') + ball(92, 64, 9, '#37474f'), '#e53935');
  S('Prosthetic leg', CAT.proc, 'prosthesis prosthetic leg amputation limb', [70, 110], () =>
    path('M18 4 H50 L46 34 C46 40 42 44 34 44 C26 44 22 40 22 34 Z', '#ffcc80', { oc: '#e0a050' }) + rr(30, 44, 8, 50, 3, '#90a4ae') + path('M22 94 H40 C54 94 62 98 62 104 V106 H18 V98 Z', '#455a64'), '#90a4ae');
  S('Glasses', CAT.proc, 'glasses spectacles vision optometry eye', [110, 50], () =>
    rr(8, 12, 40, 28, 12, '#e3f2fd', { oc: '#37474f' }) + rr(62, 12, 40, 28, 12, '#e3f2fd', { oc: '#37474f' }) + line('M48 22 C52 18 58 18 62 22 M8 20 L2 14 M102 20 L108 14', '#37474f', 3) + shine(20, 20, 6, 3) + shine(74, 20, 6, 3), '#37474f');
  S('Hearing aid', CAT.proc, 'hearing aid audiology deafness behind-the-ear', [80, 100], () =>
    path('M40 8 C58 8 66 26 62 46 C58 66 46 72 40 72 C30 72 28 62 32 54 C38 42 30 26 40 8 Z', '#bcaaa4') + line('M40 72 C40 86 26 92 18 88', '#90a4ae', 3) + ball(16, 86, 6, '#d7ccc8') + ball(50, 22, 2.6, '#6d4c41', { w: 0 }), '#bcaaa4');
  S('Nasopharyngeal swab', CAT.proc, 'swab nasopharyngeal PCR test sample collection COVID', [50, 110], () =>
    rr(10, 54, 30, 52, 6, '#e9f2f8', { oc: '#8aa0b4' }) + rr(8, 48, 34, 10, 3, '#ef5350') + rr(11, 80, 28, 24, 4, '#fff9c4', { w: 0 }) + line('M25 4 V64', '#eceff1', 3) + line('M25 4 V64', '#b0bec5', 1) + ell(25, 6, 3, 6, '#ffffff', 0, { oc: '#b0bec5' }), '#8aa0b4');
  S('Rapid antigen test', CAT.proc, 'rapid test lateral flow antigen cassette C T lines COVID pregnancy test', [120, 50], () =>
    rr(4, 6, 112, 38, 10, '#ffffff', { oc: DEVO }) + ball(22, 25, 7, '#eceff1', { oc: DEVO }) + rr(56, 16, 40, 18, 3, '#f5f5f5', { oc: DEVO, w: 1 }) + line('M70 18 V32 M84 18 V32', '#c2185b', 2.6) + txt(70, 42, 'T', 7, '#78909c') + txt(84, 42, 'C', 7, '#78909c'), '#c2185b');
  S('Urine sample cup', CAT.proc, 'urine sample cup urinalysis specimen container', [70, 100], () =>
    rr(10, 6, 50, 14, 4, '#ffca28') + path('M14 20 H56 L52 92 C52 96 48 98 44 98 H26 C22 98 18 96 18 92 Z', '#e9f2f8', { oc: '#8aa0b4' }) + path('M16 50 H54 L52 92 C52 96 48 97 44 97 H26 C22 97 19 96 19 92 Z', '#fff176', { w: 0 }) + rr(22, 30, 26, 14, 2, '#ffffff', { oc: '#8aa0b4', w: 0.8 }), '#ffca28');
  S('Electronic health record', CAT.proc, 'electronic health record EHR EMR patient chart clinical notes', [100, 90], () =>
    rr(6, 6, 88, 60, 5, SCR) + rr(12, 12, 76, 48, 2, '#ffffff', { w: 0 }) + ball(26, 26, 7, '#90caf9', { w: 0 }) + line('M38 22 H80 M38 30 H70 M18 42 H80 M18 50 H64', '#b0bec5', 2.4) + rr(40, 66, 20, 10, 1, '#78909c') + rr(28, 76, 44, 6, 3, '#90a4ae'), SCR);
  S('Telehealth', CAT.proc, 'telehealth telemedicine video consultation virtual care', [110, 90], () =>
    rr(10, 6, 90, 60, 5, SCR) + rr(16, 12, 78, 48, 2, '#e3f2fd', { w: 0 }) + ball(55, 30, 9, '#d7a17e') + path('M38 60 C38 46 72 46 72 60 Z', '#ffffff', { oc: '#90a4ae', w: 1 }) + line('M50 46 C48 54 54 56 56 52', '#455a64', 1.2) + rr(78, 44, 12, 10, 2, '#ffffff', { oc: '#90a4ae', w: 1 }) + path('M2 70 H108 L102 80 H8 Z', '#90a4ae'), SCR);

  // =====================================================================================
  // Histopathology (round microscope fields)
  // =====================================================================================
  const EOS = '#f6c6d8', EOSD = '#e89ab8', HEM = '#5e2b8a', HEML = '#8e5bb8';
  const field = (bg, rim = '#3a2a40') => ball(50, 50, 46, bg, { oc: rim, w: 3 });
  const inField = (r, rad = 38) => { const t = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; return [50 + Math.cos(t) * d, 50 + Math.sin(t) * d]; };
  const gland = (cx, cy, rad, n, nucC = HEM, nucR = 2.4, jitter = 0, r = null) => {
    let s = ball(cx, cy, rad + 4, '#f9d9e6', { oc: EOSD, w: 1 }) + ball(cx, cy, rad - 2, '#ffffff', { oc: EOSD, w: 0.8 });
    for (let k = 0; k < n; k++) { const t = (k / n) * Math.PI * 2, j = r ? (r() - 0.5) * jitter : 0; s += ell(cx + Math.cos(t) * (rad + 1 + j), cy + Math.sin(t) * (rad + 1 + j), nucR, nucR * 0.7, nucC, (t * 180) / Math.PI, { w: 0 }); }
    return s;
  };
  S('H&E tissue (normal glands)', CAT.histo, 'H&E haematoxylin eosin histology normal glands tissue section', [100, 100], () =>
    field(EOS) + gland(32, 34, 9, 14) + gland(66, 32, 10, 15) + gland(34, 68, 10, 15) + gland(68, 66, 9, 14) + [[50, 50], [18, 52], [82, 50], [50, 16], [50, 84]].map(([x, y]) => ell(x, y, 2.4, 1.2, HEM, 30, { w: 0 })).join(''), HEM);
  S('Dysplasia (H&E)', CAT.histo, 'dysplasia precancer atypia crowded nuclei H&E histology', [100, 100], (r) =>
    field(EOS) + gland(34, 36, 11, 20, '#3b1260', 3.4, 4, r) + gland(66, 40, 10, 18, '#3b1260', 3.4, 4, r) + gland(48, 70, 11, 20, '#3b1260', 3.6, 5, r), HEM);
  S('Invasive carcinoma (H&E)', CAT.histo, 'invasive carcinoma cancer H&E histology malignant infiltrating', [100, 100], (r) => {
    let s = field(EOS);
    for (let k = 0; k < 9; k++) { const [x, y] = inField(r, 32); s += glob(x, y, 7 + r() * 4, 4 + r() * 3, '#d9a2c4', r, { amp: 0.25, oc: EOSD, w: 0.8 }); for (let j = 0; j < 4; j++) s += ell(x + (r() - 0.5) * 10, y + (r() - 0.5) * 6, 2.8 + r(), 2.2, '#3b1260', r() * 180, { w: 0 }); }
    return s;
  }, HEM);
  S('Granuloma', CAT.histo, 'granuloma tuberculosis caseating necrosis Langhans giant cell epithelioid histiocytes', [100, 100], (r) => {
    let s = field(EOS) + ball(50, 50, 30, '#f3d9e4', { oc: EOSD, w: 1 }) + glob(50, 50, 14, 12, '#fbeef3', r, { amp: 0.15, oc: '#e8b4c8', w: 1 });
    for (let k = 0; k < 18; k++) { const t = (k / 18) * Math.PI * 2; s += ell(50 + Math.cos(t) * 22, 50 + Math.sin(t) * 22, 3.4, 1.6, HEML, (t * 180) / Math.PI + 90, { w: 0 }); }
    for (let k = 0; k < 26; k++) { const t = (k / 26) * Math.PI * 2 + r() * 0.2; s += ball(50 + Math.cos(t) * 36, 50 + Math.sin(t) * 36, 1.8, '#3b1260', { w: 0 }); }
    s += ell(72, 34, 9, 7, '#f0c6d8', 0, { oc: EOSD, w: 0.8 }) + Array.from({ length: 7 }, (_, k) => { const t = Math.PI * 0.2 + (k / 6) * Math.PI * 1.1; return ball(72 + Math.cos(t) * 6, 34 + Math.sin(t) * 4.5, 1.4, HEM, { w: 0 }); }).join('');
    return s;
  }, HEM);
  S('Fibrosis (H&E)', CAT.histo, 'fibrosis collagen scarring fibrotic tissue H&E', [100, 100], (r) => {
    let s = field('#f9dbe6');
    for (let k = 0; k < 9; k++) { // each streak runs across the round field at its height, staying inside it
      const y = 18 + k * 8, half = Math.sqrt(Math.max(0, 40 * 40 - (y - 50) ** 2)), x0 = 50 - half, x1 = 50 + half;
      s += line(`M${f(x0)} ${f(y)} C${f(x0 + half * 0.6)} ${f(y - 5 + r() * 4)} ${f(x1 - half * 0.6)} ${f(y + 5 - r() * 4)} ${f(x1)} ${f(y + (r() - 0.5) * 3)}`, '#e68fb1', 3.4, { op: 0.9 });
    }
    for (let k = 0; k < 10; k++) { const [x, y] = inField(r, 34); s += ell(x, y, 3.6, 1, HEM, -8, { w: 0 }); }
    return s;
  }, '#e68fb1');
  S('Necrosis (H&E)', CAT.histo, 'necrosis coagulative necrosis karyorrhexis cell death H&E', [100, 100], (r) => {
    let s = field('#f8e1ea');
    for (let k = 0; k < 10; k++) { const [x, y] = inField(r, 32); s += glob(x, y, 7, 5, '#fbeef3', r, { amp: 0.15, oc: '#efc3d4', w: 0.8 }); }
    for (let k = 0; k < 40; k++) { const [x, y] = inField(r, 38); s += ball(x, y, 0.8 + r() * 1.2, '#4a1c6e', { w: 0 }); }
    return s;
  }, '#4a1c6e');
  S('Immunohistochemistry (IHC)', CAT.histo, 'immunohistochemistry IHC DAB brown staining antibody biomarker HER2 Ki-67 PD-L1', [100, 100], (r) => {
    let s = field('#eef0f6');
    for (let k = 0; k < 26; k++) { const [x, y] = inField(r, 36); const pos = r() < 0.55; s += ball(x, y, 4.4, pos ? '#e8d3b8' : '#f4f2f7', { oc: pos ? '#7a4a1f' : '#c5c0d6', w: pos ? 1.6 : 0.8 }) + ball(x, y, 2, pos ? '#7a4a1f' : '#6a75b8', { w: 0 }); }
    return s;
  }, '#7a4a1f');
  S('Blood smear', CAT.histo, 'blood smear peripheral blood film red cells neutrophil lymphocyte platelets haematology', [100, 100], (r) => {
    let s = field('#fbf3f6');
    for (let k = 0; k < 18; k++) { const [x, y] = inField(r, 36); s += ball(x, y, 6, '#f2a7b5', { oc: '#d9788c', w: 0.8 }) + ball(x, y, 2.4, '#f8d3da', { w: 0 }); }
    s += ball(40, 46, 9, '#efe3f0', { oc: '#b39ddb', w: 0.8 }) + [[36, 44], [41, 49], [45, 43], [39, 40]].map(([x, y]) => ball(x, y, 2.6, HEM, { w: 0 })).join('');
    s += ball(66, 64, 7, '#e3e8f8', { oc: '#9fa8da', w: 0.8 }) + ball(66, 64, 5.4, '#3b1260', { w: 0 });
    return s + [[60, 30], [30, 70], [72, 44]].map(([x, y]) => ball(x, y, 1.6, '#8e5bb8', { w: 0 })).join('');
  }, '#d9788c');
  S('Gram stain', CAT.histo, 'Gram stain Gram-positive cocci Gram-negative rods bacteria microbiology smear', [100, 100], (r) => {
    let s = field('#fdf6f2');
    for (let c = 0; c < 3; c++) { const [cx, cy] = inField(r, 24); for (let k = 0; k < 7; k++) s += ball(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 12, 2.6, '#4a148c', { w: 0 }); }
    for (let k = 0; k < 12; k++) { const [x, y] = inField(r, 34); s += rr(x - 4, y - 1.6, 8, 3.2, 1.6, '#e91e63', { w: 0, rot: r() * 180 }); }
    return s;
  }, '#4a148c');
  S('Cervical cytology (Pap smear)', CAT.histo, 'Pap smear cervical cytology squamous cells screening', [100, 100], (r) => {
    let s = field('#f4f7fb');
    for (let k = 0; k < 9; k++) { const [x, y] = inField(r, 30); const c = r() < 0.5 ? '#f8bbd0' : '#b3e5fc'; s += path(poly(ngon(x, y, 10 + r() * 3, 6, r()).map(([px, py]) => [px + (r() - 0.5) * 4, py + (r() - 0.5) * 4])), c, { oc: '#90a4ae', w: 0.8, op: 0.85 }) + ball(x, y, 1.8, HEM, { w: 0 }); }
    return s;
  }, '#90a4ae');
  S('Immunofluorescence (tissue)', CAT.histo, 'immunofluorescence confocal tissue DAPI multiplex staining microscopy', [100, 100], (r) => {
    let s = field('#0b0f1a', '#000000');
    for (let k = 0; k < 24; k++) { const [x, y] = inField(r, 36); s += ball(x, y, 4, '#1f2a6b', { w: 0 }) + ball(x, y, 2.6, '#3d5afe', { w: 0 }); if (r() < 0.4) s += `<circle cx="${f(x)}" cy="${f(y)}" r="5.4" fill="none" stroke="#00e676" stroke-width="1.4"/>`; else if (r() < 0.3) s += `<circle cx="${f(x)}" cy="${f(y)}" r="5.4" fill="none" stroke="#ff1744" stroke-width="1.4"/>`; }
    return s;
  }, '#3d5afe');
})();
