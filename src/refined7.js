// Refined model organisms (v1.3): the species that only had PhyloPic silhouettes or flat drawings, redrawn in the
// Refined style. Animals are in side view facing right (like "Lab mouse (side)") except the fly and the frog, which
// read best from above. Each is built from named parts, so parts can be recoloured or split off after ungrouping.
(() => {
  const K = globalThis.RefinedKit;
  if (!K) return;
  const { f, PAL, line, path, rect, circ, ell, stroke, flat, dot, part, G, poly, smooth, wob, body, taper, add } = K;
  const ANI = 'Model organisms', PLANT = 'Model organisms';
  const PINK = '#eeb2b4', NOSE = '#e98b97', EYE = '#2a2e33';
  const eye = (x, y, r = 2, c = EYE) => circ(x, y, r, c, { w: 0.5 }) + dot(x - r * 0.35, y - r * 0.35, r * 0.32, '#ffffff');
  const whiskers = (x, y, dir = 1) => stroke(`M${x} ${y} l${9 * dir} -3.5 M${x} ${y + 1} l${10 * dir} 0 M${x} ${y + 2} l${9 * dir} 3.5`, '#9aa3ab', 0.4);
  const mirror = (svg, w) => G(svg, `translate(${w} 0) scale(-1 1)`);

  // Points along a Catmull-Rom curve through pts (n samples per segment).
  function sample(pts, n = 10) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // A body of varying width along a centreline: width(t) for t = 0 (start) … 1 (end).
  function along(pts, width) {
    const S = sample(pts, 12), L1 = [], R1 = [];
    S.forEach((p, i) => {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, w = width(i / (S.length - 1)) / 2;
      L1.push([p[0] + nx * w, p[1] + ny * w]); R1.push([p[0] - nx * w, p[1] - ny * w]);
    });
    return { d: poly([...L1, ...R1.reverse()]), S };
  }

  // ---------- Zebrafish (Danio rerio): golden body with blue horizontal stripes, forked tail ----------
  add('Zebrafish (Refined)', ANI, 'zebrafish Danio rerio fish model organism teleost stripes', '#f1dfa6', [120, 60], (c) => {
    const BLUE = '#4a66ad', fin = L(c, 0.25);
    return part('fins', path('M24 27 C18 21 12 15 5 11 C8 19 10 25 12 30 C10 35 8 41 5 49 C12 45 18 39 24 33 Z', fin, { stroke: line(c) })
        + stroke('M8 15 L21 27 M7 45 L21 33 M10 30 H22', BLUE, 1.6, { op: 0.75 })
        + path('M56 21 C60 13 69 11 77 19 Z', fin) + path('M48 38.5 C52 47 66 49 75 41 Z', fin) + stroke('M54 41 L60 46 M62 42 L68 46', BLUE, 1.2, { op: 0.6 }))
      + part('body', path('M114 30 C112 24 104 20.5 94 19.6 C76 18 54 20 36 23.6 C30 25 26 26 22 27 L22 33 C26 34 30 35 36 36.4 C54 40 76 42 94 40.4 C104 39.5 112 36 114 30 Z', c)
        + flat('M38 24.4 C56 21 78 19.6 98 21.6 C80 21.8 56 23.2 38 24.4 Z', '#ffffff', 0.5))
      + part('stripes', (stroke('M30 27 C50 24.2 76 23.2 97 24.8', BLUE, 2) + stroke('M26 30 C50 29.4 78 29.6 101 30.2', BLUE, 2.2) + stroke('M30 33.2 C52 36 76 37 97 35.6', BLUE, 2) + stroke('M40 37.4 C56 39.4 72 39.8 86 38.8', BLUE, 1.4, { op: 0.7 })))
      + part('head', stroke('M98 22.4 C95 27 95 33 98 38', line(c), 0.9, { op: 0.6 }) + ell(92, 35.5, 5, 2.2, fin, { rot: 22 }) + eye(105, 27.5, 3.4, '#cfd5dc') + circ(105, 27.5, 1.9, EYE, { w: 0 }) + dot(104.2, 26.7, 0.6, '#ffffff') + stroke('M111 31.4 l3 -0.4', line(c), 0.7));
  });

  // ---------- C. elegans: translucent tapering worm, pharynx bulbs, granular intestine, eggs ----------
  add('C. elegans (Refined)', ANI, 'C. elegans Caenorhabditis elegans nematode worm hermaphrodite model organism', '#eadfc2', [120, 50], (c) => {
    const pts = [[6, 33], [20, 22], [38, 18], [56, 28], [74, 36], [94, 30], [114, 19]];
    const w = (t) => 1.2 + 7.6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.04)), 0.55) + (t > 0.9 ? (t - 0.9) * 8 : 0);
    const { d, S } = along(pts, w), at = (t) => S[Math.round(t * (S.length - 1))];
    let gut = '';
    for (let i = Math.round(S.length * 0.12); i < S.length * 0.84; i += 2) gut += dot(S[i][0] + Math.sin(i) * 0.6, S[i][1] + Math.cos(i) * 0.6, 0.9, '#b48a55', 0.55);
    const eggs = [0.42, 0.47, 0.52, 0.57, 0.62].map((t, k) => { const p = at(t); return ell(p[0], p[1] + (k % 2 ? 1 : -1), 2, 1.3, '#f6efdc', { w: 0.5, stroke: line(c) }); }).join('');
    const ph1 = at(0.9), ph2 = at(0.955);
    return part('body', path(d, c) + stroke(smooth(S.filter((_, i) => i % 4 === 0).slice(3, -3).map(([x, y]) => [x - 0.4, y - 2.4]), false), '#ffffff', 1.2, { op: 0.5 }))
      + part('intestine', stroke(smooth(S.slice(Math.round(S.length * 0.12), Math.round(S.length * 0.86)).filter((_, i) => i % 3 === 0), false), '#d2b384', 2.4, { op: 0.6 }) + gut)
      + part('eggs', eggs)
      + part('pharynx', ell(ph1[0], ph1[1], 2.6, 2.2, L(c, 0.1), { w: 0.6, stroke: line(c) }) + ell(ph2[0], ph2[1], 1.8, 1.6, L(c, 0.1), { w: 0.6, stroke: line(c) }) + stroke(`M${f(ph1[0])} ${f(ph1[1])} L${f(at(0.99)[0])} ${f(at(0.99)[1])}`, line(c), 0.7, { op: 0.7 }));
  });

  // ---------- Xenopus laevis (top view): flat body, dorsal eyes, small arms, big webbed clawed feet ----------
  add('Xenopus frog (Refined)', ANI, 'Xenopus laevis African clawed frog amphibian tadpole oocyte model organism', '#9fa77e', [100, 112], (c) => {
    const limbs = (s) => part('arm', path('M32 38 C24 38 17 34 12 27 C11 25 13 24 15 25 C19 30 25 33 32 33 Z', c) + stroke('M12 27 l-3 -4 M12 27 l-4 -1 M12 27 l-2 -5', line(c), 0.9))
      + part('leg', path('M34 72 C24 74 14 78 13 86 C12 92 18 94 24 92 C28 91 30 94 28 98 L26 104 C30 104 34 100 36 94 C38 88 40 82 40 76 Z', c)
        + path('M26 98 C20 101 14 106 12 110 L18 109 L21 106 L24 110 L28 107 L31 110 L33 104 C32 101 30 99 26 98 Z', L(c, 0.18))
        + stroke('M18 109 l-1 2 M24 110 l0 2 M31 110 l1 2', '#3c4148', 1));
    return limbs() + mirror(limbs(), 100)
      + part('body', path('M50 8 C64 8 72 17 72 29 C76 43 76 61 70 73 C64 83 57 88 50 88 C43 88 36 83 30 73 C24 61 24 43 28 29 C28 17 36 8 50 8 Z', c)
        + flat('M36 22 C40 14 46 11 52 11 C44 14 39 18 36 22 Z', '#ffffff', 0.4)
        + [[40, 46], [58, 40], [46, 62], [60, 66], [38, 76], [54, 80], [64, 54], [34, 58]].map(([x, y], k) => ell(x, y, 2.6 + (k % 3), 2 + (k % 2), D(c, 0.18), { stroke: 'none', w: 0, op: 0.55 })).join('')
        + stroke('M29 34 C27 46 27 58 31 70 M71 34 C73 46 73 58 69 70', line(c), 0.9, { dash: '1.6 2.2', op: 0.7 }))
      + part('eyes', eye(42, 19, 2.6, '#3c4148') + eye(58, 19, 2.6, '#3c4148'));
  });

  // ---------- Drosophila melanogaster (top view): red eyes, bristled thorax, banded abdomen, clear wings ----------
  add('Fruit fly (Refined)', ANI, 'Drosophila melanogaster fruit fly insect genetics model organism', '#cfa264', [100, 100], (c) => {
    const legs = stroke('M40 33 L27 25 L21 15 M38 39 L22 41 L13 47 M40 45 L27 56 L21 70', '#5a4636', 1.3);
    const wing = path('M44 46 C34 52 26 66 28 82 C30 90 38 90 42 82 C46 72 48 58 46 47 Z', PAL.glass, { stroke: PAL.glassLine, op: 0.7 }) + stroke('M44 50 C38 62 34 74 34 86 M45 54 C42 66 40 76 39 84', PAL.glassLine, 0.6, { op: 0.8 });
    return part('legs', legs + mirror(legs, 100))
      + part('abdomen', ell(50, 64, 12, 17, L(c, 0.12)) + stroke('M39 60 C46 63 54 63 61 60 M39.6 67 C46 70 54 70 60.4 67 M41.6 74 C46.5 76.6 53.5 76.6 58.4 74', '#4a3a30', 2.6, { op: 0.85 }))
      + part('wings', wing + mirror(wing, 100))
      + part('thorax', ell(50, 37, 12.5, 11.5, c) + flat('M42 31 C46 27 52 26 57 29 C52 29 46 30 42 31 Z', '#ffffff', 0.45)
        + stroke('M44 30 l-1.5 -2.5 M50 28 l0 -3 M56 30 l1.5 -2.5 M46 36 l-1 -2.5 M54 36 l1 -2.5', '#3c3028', 0.6))
      + part('head', ell(50, 19.5, 9.5, 6.5, c) + ell(41.5, 19, 4.8, 6, '#c8392f', { rot: -10 }) + ell(58.5, 19, 4.8, 6, '#c8392f', { rot: 10 })
        + dot(40.5, 17, 1.1, '#ffffff', 0.7) + dot(57.5, 17, 1.1, '#ffffff', 0.7) + stroke('M47 13.6 L45 9 M53 13.6 L55 9', '#5a4636', 0.8));
  });

  // ---------- Syrian hamster: round golden body, white belly, round ears, short tail ----------
  add('Hamster (Refined)', ANI, 'hamster Syrian golden hamster rodent animal model infection', '#e2ab6c', [110, 80], (c) =>
    part('tail', ell(16, 54, 3, 2.2, c, { rot: -20 }))
    + part('feet', path('M30 66 C34 66 40 67 44 68 C45 70 43 71 40 71 L31 70 C29 70 28 67 30 66 Z', PINK, { w: 0.7 }) + path('M82 64 L84 69 C85 71 90 71 90 69 L88 63 Z', PINK, { w: 0.7 }))
    + part('body', path('M16 52 C14 36 28 22 50 20 C66 18 80 22 88 30 C96 32 102 38 102 46 C102 52 98 56 92 58 C88 64 78 68 64 68 L30 68 C20 68 16 60 16 52 Z', c)
      + flat('M54 66 C70 66 84 62 92 56 C94 61 88 66 76 68 Z', '#f7efe3', 0.95) + flat('M90 50 C94 52 98 52 101 50 C100 55 96 57 92 58 Z', '#f7efe3', 0.95)
      + flat('M30 28 C38 22 50 20 62 21 C50 22 38 25 30 28 Z', '#ffffff', 0.4) + stroke('M86 42 C84 48 86 54 90 57', line(c), 0.8, { op: 0.5 }))
    + part('ears', ell(76, 24, 6.4, 7, c, { rot: -10 }) + ell(76.4, 24.6, 4, 4.8, PINK, { stroke: 'none', w: 0, rot: -10 }))
    + part('face', eye(90, 36, 2.2) + ell(101.4, 45, 1.7, 1.4, NOSE, { w: 0.5 }) + whiskers(99, 46)));

  // ---------- Guinea pig: long barrel body, no tail, petal ears, white with ginger patches ----------
  add('Guinea pig (Refined)', ANI, 'guinea pig Cavia porcellus cavy rodent animal model', '#d58a4f', [120, 72], (c) =>
    part('feet', path('M30 60 C34 60 40 61 42 62 C43 64 41 65 38 65 L30 64 C28 64 28 61 30 60 Z', PINK, { w: 0.7 }) + path('M90 58 L92 63 C93 65 98 65 98 63 L96 57 Z', PINK, { w: 0.7 }))
    + part('body', path('M8 42 C8 28 22 18 42 16 C62 14 84 16 96 22 C106 26 114 34 115 42 C115 50 108 56 98 58 C90 62 80 62 70 61 L30 61 C16 61 8 53 8 42 Z', '#f5f0e8')
      + flat('M8 42 C8 28 22 18 42 16 C40 30 38 46 34 61 L30 61 C16 61 8 53 8 42 Z', c, 0.92)
      + flat('M88 20 C100 24 110 32 113 40 C106 40 98 36 92 33 C88 30 86 25 88 20 Z', c, 0.92)
      + flat('M50 19 C62 17 74 18 84 20 C72 20 60 20 50 19 Z', '#ffffff', 0.5) + stroke('M88 40 C86 48 88 54 92 58', '#9aa5ae', 0.7, { op: 0.5 }))
    + part('ear', path('M86 20 C84 14 90 11 94 14 C96 17 93 21 88 22 Z', D(c, 0.1)))
    + part('face', eye(102, 31, 2.2) + ell(114, 42, 1.6, 1.4, NOSE, { w: 0.5 }) + whiskers(112, 43)));

  // ---------- Ferret: long slender arched body, short legs, bushy tail, face mask ----------
  add('Ferret (Refined)', ANI, 'ferret Mustela putorius furo animal model influenza respiratory virus', '#8d6c52', [130, 72], (c) => {
    const legC = D(c, 0.28);
    // Short, slightly bent legs ending in small paws; the bushy tail rises from the rump and droops.
    const leg = (d) => path(d, legC, { w: 0.8 });
    return part('tail', path(taper([[16, 41], [7, 43], [2, 49], [2, 57]], 7, 3.4), legC, { w: 0.8 }))
      + part('legs', leg('M26 47 C25 52 24 56 22 59 C21 61 23 62 27 62 L30 61 C29 57 31 52 33 49 Z') + leg('M40 49 C41 54 41 58 40 61 C40 63 43 63 46 63 L47 62 C46 57 47 53 48 49 Z')
        + leg('M86 48 C86 53 85 57 84 60 C84 62 87 62 90 62 L91 61 C90 57 91 52 93 48 Z') + leg('M97 46 C98 51 98 55 97 59 C97 61 100 61 103 61 L104 60 C103 56 103 51 104 46 Z'))
      + part('body', path('M12 44 C16 34 28 28 42 28 C56 28 66 21 80 21 C92 21 100 25 106 29 C114 30 122 35 124 39 C124 43 118 45 112 45 C108 49 100 51 92 50 L84 52 C76 54 60 52 48 50 L30 52 C22 53 14 51 12 44 Z', c)
        + flat('M40 30 C54 29 66 22 80 22.4 C66 25 54 31 40 30 Z', '#ffffff', 0.25))
      + part('mask', path('M106 29 C114 30 122 35 124 39 C121 42 115 43 110 42 C107 38 105 33 106 29 Z', '#efe3cf', { stroke: 'none', w: 0 }) + ell(111, 33.5, 4.4, 2.6, '#4a3b30', { stroke: 'none', w: 0, rot: 12, op: 0.85 }))
      + part('ear', ell(101, 24, 4, 3.6, '#efe3cf', { stroke: line(c) }))
      + part('face', eye(111.4, 33.4, 1.7) + ell(124, 39.6, 1.5, 1.3, NOSE, { w: 0.5 }) + whiskers(122, 40.6));
  });

  // ---------- Sheep: scalloped woolly body, pale face and legs, dark hooves ----------
  add('Sheep (Refined)', ANI, 'sheep Ovis aries ewe lamb wool livestock animal model', '#f2eee5', [120, 100], (c, r) => {
    const legC = '#e7dccb', hoof = '#5b5048';
    const leg = (x, y) => rect(x, y, 5, 26, 2.4, legC) + rect(x - 0.4, y + 23, 5.8, 4.6, 1.6, hoof, { w: 0.6 });
    const wool = wob(54, 44, 42, 25, r, { amp: 0.02, n: 72, mod: (a) => 0.07 * Math.abs(Math.sin(9 * a)) });
    let curls = '';
    for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.75; curls += stroke(`M${f(54 + Math.cos(a) * 38 * d)} ${f(44 + Math.sin(a) * 21 * d)} a2.2 2.2 0 1 1 3 1.4`, D(c, 0.12), 0.8, { op: 0.6 }); }
    return part('legs', leg(28, 60) + leg(40, 62) + leg(68, 62) + leg(80, 60))
      + part('fleece', body(wool, c, { hi: 0.4 }) + curls + circ(12, 40, 5.5, c))
      + part('head', path('M90 30 C98 22 110 24 115 32 C118 39 115 46 108 48 C101 49 95 46 91 40 Z', legC)
        + ell(92, 31, 7, 3, legC, { rot: -24 }) + ell(92.4, 31.4, 4.6, 1.6, PINK, { stroke: 'none', w: 0, rot: -24 })
        + eye(103.5, 33.5, 1.7) + ell(115, 38.4, 1.4, 1.1, '#8a6a5c', { w: 0.4 }) + stroke('M112 43 C113 44 114.5 44 115.5 43', '#8a6a5c', 0.6)
        + circ(97, 26, 4.6, c));
  });

  // ---------- New Zealand white rabbit (sitting): long ears, red albino eye, cotton tail ----------
  add('Rabbit (Refined)', ANI, 'rabbit New Zealand white rabbit NZW Oryctolagus cuniculus antibody production polyclonal animal model', '#f2f0ec', [110, 100], (c) =>
    part('tail', circ(13, 70, 6.5, c))
    + part('ears', ell(71, 20, 5, 17, c, { rot: -22 }) + ell(71.3, 21, 2.8, 13, PINK, { stroke: 'none', w: 0, rot: -22 })
      + ell(80, 19, 5, 17, c, { rot: -8 }) + ell(80.2, 20, 2.8, 13, PINK, { stroke: 'none', w: 0, rot: -8 }))
    + part('feet', path('M30 86 C40 85 56 86 64 87 C67 88 66 91 62 91 L30 91 C26 91 26 87 30 86 Z', L(c, 0.1)) + path('M80 84 C84 84 89 85 91 87 C92 89 90 90 87 90 L80 89 Z', L(c, 0.1)))
    + part('body', path('M18 78 C12 62 18 46 34 39 C46 34 60 36 69 42 C74 34 86 32 93 39 C100 46 100 56 95 61 C91 65 85 66 81 64 C83 72 82 80 77 85 L28 87 C21 87 19 83 18 78 Z', c)
      + flat('M28 46 C38 39 52 37 64 41 C52 41 38 43 28 46 Z', '#ffffff', 0.6) + stroke('M44 56 C38 66 40 78 48 86', line(c), 0.9, { op: 0.5 }) + stroke('M78 64 C74 70 74 78 78 85', line(c), 0.9, { op: 0.5 }))
    + part('face', eye(89, 46, 2.3, '#c0393f') + ell(98.6, 54, 1.6, 1.3, NOSE, { w: 0.5 }) + whiskers(97, 55)));

  // ---------- Arabidopsis thaliana: basal rosette, flowering stem, white flowers, siliques ----------
  add('Arabidopsis (Refined)', PLANT, 'Arabidopsis thaliana thale cress plant rosette model organism flowering', '#6fa85a', [90, 112], (c, r) => {
    // Rosette seen slightly from above: leaves behind the stem are drawn first and a touch darker.
    const ls = Array.from({ length: 11 }, (_, k) => { const a = (k / 11) * Math.PI * 2 + 0.3; return { a, len: 17 + (k % 3) * 3 }; }).sort((p, q) => Math.sin(p.a) - Math.sin(q.a));
    const leaves = ls.map(({ a, len }) => ell(45 + Math.cos(a) * len * 0.62, 96 + Math.sin(a) * len * 0.26, len * 0.55, 4.6, Math.sin(a) < 0 ? D(c, 0.06) : c, { rot: (Math.atan2(Math.sin(a) * 0.42, Math.cos(a)) * 180) / Math.PI })
      + stroke(`M${f(45 + Math.cos(a) * 4)} ${f(96 + Math.sin(a) * 1.7)} L${f(45 + Math.cos(a) * len * 0.95)} ${f(96 + Math.sin(a) * len * 0.42)}`, L(c, 0.3), 0.6, { op: 0.8 })).join('');
    const stemC = D(c, 0.12);
    const siliques = [[45, 52, -28], [45, 60, 30], [45, 68, -34], [41, 44, 26], [53, 40, -30], [52, 48, 30]].map(([x, y, a]) => G(rect(-0.9, -11, 1.8, 11, 0.9, L(c, 0.1), { w: 0.4 }), `translate(${x} ${y}) rotate(${a})`)).join('');
    const flower = (x, y) => [0, 90, 180, 270].map((d) => circ(x + 1.6 * Math.cos((d * Math.PI) / 180), y + 1.6 * Math.sin((d * Math.PI) / 180), 1.6, '#ffffff', { stroke: '#c9d3cf', w: 0.4 })).join('') + dot(x, y, 0.8, '#e6c14a');
    return part('stem', stroke('M45 92 C44 76 46 56 45 30 C45 22 46 16 47 10', stemC, 1.6) + stroke('M45 66 C50 58 54 50 56 38 M45 72 C40 64 37 56 37 46', stemC, 1.1)
      + ell(48.5, 74, 4, 1.8, c, { rot: -30 }) + ell(41.5, 80, 4, 1.8, c, { rot: 30 }))
      + part('siliques', siliques)
      + part('flowers', flower(47, 9) + flower(43, 13) + flower(51, 14) + flower(56, 36) + flower(37, 44))
      + part('rosette', leaves);
  });
})();
