// "Soft" icon set: one consistent BioRender-like style for proteins, immunology, protein degradation and
// cancer. Flat fills with a thin outline in a darker shade of the same hue, rounded ends and a faint sheen.
// Every icon takes a main colour `c` (recolourable); partner subunits use a lighter shade of it.

const SOFT = (() => {
  const O = (c) => D(c, 0.34); // outline colour
  const sw = 1.8;
  // Outlined tube along a centreline: the basis of C / S / U / Y protein shapes.
  const tube = (d, c, w, { sheen = true, outline } = {}) => `<path d="${d}" fill="none" stroke="${outline || O(c)}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/>`
    + `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
    + (sheen ? `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="${w * 0.26}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${-w * 0.15} ${-w * 0.15})"/>` : '');
  const blob = (d, c, extra = '') => `<path d="${d}" fill="${c}" stroke="${O(c)}" stroke-width="${sw}" stroke-linejoin="round"${extra}/>`;
  const ell = (cx, cy, rx, ry, c, rot = 0, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" stroke="${O(c)}" stroke-width="${sw}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}${extra}/>`;
  const dot = (cx, cy, r, c) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${O(c)}" stroke-width="${Math.min(sw, r * 0.35)}"/>`;
  const shine = (cx, cy, rx, ry, rot = -30) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".3" transform="rotate(${rot} ${cx} ${cy})"/>`;
  const label = (x, y, t, size = 11, col = '#2b2b2b', rot = 0) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="600" fill="${col}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${t}</text>`;
  const mem = (y, w = 100, x0 = 0) => { // short lipid bilayer strip
    let s = `<rect x="${x0}" y="${y - 7}" width="${w}" height="14" fill="#fbe6bf"/>`;
    for (let x = x0 + 3; x < x0 + w; x += 6) s += `<circle cx="${x}" cy="${y - 7}" r="2.6" fill="#e8b45a" stroke="#b9852f" stroke-width=".6"/><circle cx="${x}" cy="${y + 7}" r="2.6" fill="#e8b45a" stroke="#b9852f" stroke-width=".6"/>`;
    return s;
  };
  const UB = '#d4a531', P_COL = '#f2c14e';
  const ubBead = (x, y, r = 5) => dot(x, y, r, UB) + `<circle cx="${x - r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff" opacity=".35"/>`;
  const ubChain = (pts, r = 5) => pts.map(([x, y]) => ubBead(x, y, r)).join('');
  const cellBody = (d, c, nuc) => blob(d, L(c, 0.55)) + (nuc || '');
  const nucleus = (cx, cy, rx, ry, c) => ell(cx, cy, rx, ry, D(c, 0.05)) + shine(cx - rx * 0.35, cy - ry * 0.4, rx * 0.35, ry * 0.18);
  // Rounded antibody: two Fab arms + Fc, heavy chain = c, light chain = lighter.
  const igg = (c, x = 50, y = 54, k = 1, rot = 0) => {
    const h = c, l = L(c, 0.5);
    const s = tube(`M${x - 4} ${y} L${x - 27} ${y - 30}`, h, 9 * k) + tube(`M${x + 4} ${y} L${x + 27} ${y - 30}`, h, 9 * k)
      + tube(`M${x - 14} ${y - 4} L${x - 33} ${y - 28}`, l, 7 * k) + tube(`M${x + 14} ${y - 4} L${x + 33} ${y - 28}`, l, 7 * k)
      + tube(`M${x - 4} ${y + 4} L${x - 4} ${y + 36}`, h, 8.5 * k) + tube(`M${x + 4} ${y + 4} L${x + 4} ${y + 36}`, h, 8.5 * k);
    return rot ? `<g transform="rotate(${rot} ${x} ${y})">${s}</g>` : s;
  };

  return [
    // ---------- Proteins (soft) ----------
    { id: 'sp-globular', name: 'Protein, globular (soft)', cat: 'Soft · Protein shapes', tags: 'protein generic domain blob subunit', color: '#5b9bd5',
      draw: (c) => blob('M50 10 C72 8 90 24 88 46 C92 66 78 88 54 90 C30 94 10 78 12 54 C8 32 26 12 50 10 Z', c) + shine(36, 30, 14, 7) },
    { id: 'sp-c', name: 'Protein, C-shape (soft)', cat: 'Soft · Protein shapes', tags: 'subunit adaptor crescent hook substrate receptor', color: '#8b62c4',
      draw: (c) => tube('M68 22 C48 8 22 20 22 46 C22 72 46 88 68 76', c, 20) },
    { id: 'sp-s', name: 'Protein, S-shape (soft)', cat: 'Soft · Protein shapes', tags: 'subunit scaffold ligase domain', color: '#4e9a4e',
      draw: (c) => tube('M74 18 C50 6 22 14 28 32 C34 48 66 46 72 64 C78 84 50 94 26 82', c, 17) },
    { id: 'sp-u', name: 'Protein, horseshoe (soft)', cat: 'Soft · Protein shapes', tags: 'U shape clamp leucine-rich repeat', color: '#e07b39',
      draw: (c) => tube('M24 18 C18 60 30 84 50 84 C70 84 82 60 76 18', c, 18) },
    { id: 'sp-y', name: 'Protein, Y-scaffold (soft)', cat: 'Soft · Protein shapes', tags: 'scaffold Y-shaped subunit cullin', color: '#3e6db5',
      draw: (c) => tube('M10 22 C28 28 40 40 50 52 M90 22 C72 28 60 40 50 52 M50 52 C50 66 48 80 46 92', c, 15) },
    { id: 'sp-bean', name: 'Protein, bean (soft)', cat: 'Soft · Protein shapes', tags: 'kidney domain subunit', color: '#d6584a',
      draw: (c) => blob('M30 18 C50 6 82 16 86 42 C90 66 72 90 48 86 C34 84 34 68 42 60 C48 54 46 46 36 46 C20 46 12 30 30 18 Z', c) + shine(56, 26, 14, 6, -15) },
    { id: 'sp-rod', name: 'Protein, rod (soft)', cat: 'Soft · Protein shapes', tags: 'capsule helix coiled-coil fibre', color: '#3fa58b',
      draw: (c) => tube('M14 78 L86 22', c, 22) },
    { id: 'sp-dumbbell', name: 'Protein, two-domain (soft)', cat: 'Soft · Protein shapes', tags: 'dumbbell bilobed linker calmodulin', color: '#c9578c',
      draw: (c) => tube('M36 40 L64 60', c, 7) + ell(28, 34, 22, 18, c, -20) + ell(72, 66, 22, 18, L(c, 0.35), -20) + shine(22, 26, 9, 4) + shine(66, 58, 9, 4) },
    { id: 'sp-dimer', name: 'Protein dimer (soft)', cat: 'Soft · Protein shapes', tags: 'homodimer heterodimer two subunits partner', color: '#5b9bd5',
      draw: (c) => blob('M48 16 C62 22 64 46 56 64 C48 84 22 90 14 70 C6 50 20 26 48 16 Z', c) + blob('M52 16 C38 22 36 46 44 64 C52 84 78 90 86 70 C94 50 80 26 52 16 Z', L(c, 0.5)) + shine(26, 40, 8, 4) + shine(70, 40, 8, 4, 30) },
    { id: 'sp-trimer', name: 'Protein trimer (soft)', cat: 'Soft · Protein shapes', tags: 'trimeric complex three subunits', color: '#e8a33c',
      draw: (c) => ell(50, 30, 22, 20, c) + ell(30, 64, 22, 20, L(c, 0.35)) + ell(70, 64, 22, 20, D(c, 0.12)) + shine(44, 22, 9, 4) },
    { id: 'sp-cpair', name: 'Protein C-pair (soft)', cat: 'Soft · Protein shapes', tags: 'heterodimer interlocking subunits partner light dark', color: '#8b62c4',
      draw: (c) => tube('M44 18 C26 14 18 36 26 50 C34 64 30 80 44 84', L(c, 0.5), 13) + tube('M56 18 C74 14 82 36 74 50 C66 64 70 80 56 84', c, 13) },
    { id: 'sp-helix', name: 'Helical bundle (soft)', cat: 'Soft · Protein shapes', tags: 'alpha helix four-helix bundle cylinder', color: '#d6584a',
      draw: (c) => [18, 38, 58, 78].map((x, i) => `<rect x="${x - 9}" y="${14 + (i % 2) * 8}" width="18" height="64" rx="9" fill="${i % 2 ? L(c, 0.35) : c}" stroke="${O(c)}" stroke-width="${sw}"/><rect x="${x - 5}" y="${20 + (i % 2) * 8}" width="4" height="50" rx="2" fill="#fff" opacity=".3"/>`).join('') },
    { id: 'sp-coil', name: 'Unfolded protein (soft)', cat: 'Soft · Protein shapes', tags: 'random coil disordered misfolded polypeptide chain', color: '#8b62c4',
      draw: (c) => tube('M8 70 C18 40 30 84 40 56 C48 32 58 74 64 50 C70 28 84 40 78 58 C74 70 88 76 92 60', c, 6, { sheen: false }) },
    { id: 'sp-adaptor', name: 'Adaptor oval (soft, labelled)', cat: 'Soft · Protein shapes', tags: 'adaptor label oval tag cream FAM72A', color: '#f4ecc4',
      draw: (c) => ell(50, 50, 40, 26, c, -18) + label(50, 54, 'Adaptor', 13, D(c, 0.75), -18) },
    { id: 'sp-halo', name: 'Complex halo (soft)', cat: 'Soft · Protein shapes', tags: 'complex outline background scaffold envelope ring', color: '#cfe3f2',
      draw: (c) => `<path d="M50 14 C62 4 92 4 94 30 C96 44 88 50 88 50 C88 50 96 56 94 70 C92 96 62 96 50 86 C38 96 8 96 6 70 C4 56 12 50 12 50 C12 50 4 44 6 30 C8 4 38 4 50 14 Z M50 30 C42 22 24 20 22 32 C21 40 30 46 30 50 C30 54 21 60 22 68 C24 80 42 78 50 70 C58 78 76 80 78 68 C79 60 70 54 70 50 C70 46 79 40 78 32 C76 20 58 22 50 30 Z" fill="${L(c, 0.6)}" fill-rule="evenodd" stroke="${D(c, 0.2)}" stroke-width="1.2"/>` },
    { id: 'sp-kinase', name: 'Kinase (soft)', cat: 'Soft · Protein shapes', tags: 'kinase bilobed N-lobe C-lobe ATP enzyme', color: '#3e6db5',
      draw: (c) => blob('M20 40 C16 22 34 10 52 14 C70 18 78 32 70 42 C60 48 34 50 20 40 Z', L(c, 0.35)) + blob('M18 54 C34 46 66 46 80 52 C92 66 80 90 54 90 C28 92 10 76 18 54 Z', c) + dot(44, 47, 6, P_COL) + label(44, 50, 'ATP', 5.5, '#5a4300') + shine(40, 22, 10, 4, -10) + shine(36, 62, 12, 5, -10) },
    { id: 'sp-enzyme', name: 'Enzyme with active site (soft)', cat: 'Soft · Protein shapes', tags: 'enzyme pocket catalytic substrate pac-man', color: '#3fa58b',
      draw: (c) => blob('M86 40 L56 50 L86 62 C78 84 58 92 40 88 C18 84 8 64 10 48 C12 26 32 10 52 12 C68 12 82 24 86 40 Z', c) + shine(34, 28, 12, 6) + dot(78, 51, 6, '#e8743b') },
    { id: 'sp-receptor', name: 'Receptor, single-pass (soft)', cat: 'Soft · Protein shapes', tags: 'transmembrane receptor RTK EGFR membrane', color: '#5b9bd5',
      draw: (c) => mem(60) + ell(42, 18, 12, 14, c) + ell(58, 34, 12, 12, L(c, 0.3)) + tube('M50 44 L50 82', c, 6) + blob('M38 80 C38 72 62 72 62 80 C62 92 38 92 38 80 Z', D(c, 0.08)) },
    { id: 'sp-gpcr', name: 'GPCR, 7-TM (soft)', cat: 'Soft · Protein shapes', tags: 'G protein-coupled receptor seven transmembrane', color: '#c9578c',
      draw: (c) => mem(50) + [14, 25, 36, 47, 58, 69, 80].map((x, i) => `<rect x="${x - 5}" y="30" width="10" height="40" rx="5" fill="${i % 2 ? L(c, 0.3) : c}" stroke="${O(c)}" stroke-width="1.4"/>`).join('') + tube('M14 30 C14 20 25 20 25 30 M36 30 C36 20 47 20 47 30 M58 30 C58 20 69 20 69 30', c, 3, { sheen: false }) + tube('M25 70 C25 80 36 80 36 70 M47 70 C47 80 58 80 58 70 M69 70 C69 80 80 80 80 70 L84 88', c, 3, { sheen: false }) },
    { id: 'sp-channel', name: 'Ion channel (soft)', cat: 'Soft · Protein shapes', tags: 'pore transporter channel membrane ion', color: '#3fa58b',
      draw: (c) => mem(50) + blob('M18 20 C18 14 40 14 40 22 L40 78 C40 86 18 86 18 78 Z', c) + blob('M60 22 C60 14 82 14 82 20 L82 78 C82 86 60 86 60 78 Z', L(c, 0.3)) + [30, 50, 70].map((y) => dot(50, y, 3.2, '#5bb5e0')).join('') },

    // ---------- Protein degradation ----------
    { id: 'pd-ub', name: 'Ubiquitin (Ub)', cat: 'Soft · Ubiquitin & degradation', tags: 'ubiquitin ub ubiquitination tag ptm', color: UB,
      draw: (c) => dot(50, 50, 30, c) + shine(40, 38, 10, 6) + label(50, 58, 'Ub', 22, D(c, 0.65)) },
    { id: 'pd-polyub', name: 'Polyubiquitin chain', cat: 'Soft · Ubiquitin & degradation', tags: 'ubiquitin chain K48 polyubiquitination degradation signal', color: UB, vb: [100, 50],
      draw: (c) => [[14, 30], [32, 22], [50, 28], [68, 20], [86, 26]].map(([x, y]) => dot(x, y, 9.5, c) + `<circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#fff" opacity=".35"/>`).join('') },
    { id: 'pd-ubsubstrate', name: 'Ubiquitinated substrate', cat: 'Soft · Ubiquitin & degradation', tags: 'ubiquitin tagged protein substrate marked for degradation', color: '#8b62c4',
      draw: (c) => tube('M30 30 C46 18 70 26 70 46 C70 66 52 72 52 86', c, 13) + ubChain([[24, 22], [14, 30], [12, 42], [22, 48]], 6) },
    { id: 'pd-e1', name: 'E1 activating enzyme', cat: 'Soft · Ubiquitin & degradation', tags: 'E1 UBA1 ubiquitin activating enzyme', color: '#5b9bd5',
      draw: (c) => blob('M14 50 C10 26 36 12 56 16 C78 20 90 38 86 56 C82 78 62 88 42 86 C24 84 16 70 14 50 Z', c) + shine(36, 28, 12, 6) + ubBead(76, 22, 9) + label(46, 58, 'E1', 18, D(c, 0.65)) },
    { id: 'pd-e2', name: 'E2 conjugating enzyme', cat: 'Soft · Ubiquitin & degradation', tags: 'E2 UBC ubiquitin conjugating enzyme', color: '#3fa58b',
      draw: (c) => blob('M22 30 C30 14 60 12 72 24 C86 38 80 64 66 76 C50 90 24 82 18 64 C14 52 16 40 22 30 Z', c) + shine(38, 26, 11, 5) + ubBead(80, 72, 9) + label(46, 58, 'E2', 18, D(c, 0.65)) },
    { id: 'pd-e3', name: 'E3 ligase (RING) + substrate', cat: 'Soft · Ubiquitin & degradation', tags: 'E3 ubiquitin ligase RING MDM2 substrate', color: '#4e9a4e',
      draw: (c) => tube('M20 80 C10 56 20 30 44 28 C60 28 64 44 56 54', c, 15) + ell(76, 40, 14, 16, '#8b62c4') + ell(30, 18, 10, 9, L(c, 0.4)) + ubBead(84, 64, 6) + ubBead(92, 74, 6) + label(28, 21, 'RING', 6.5, D(c, 0.6)) },
    { id: 'pd-crl', name: 'Cullin–RING ligase (CRL)', cat: 'Soft · Ubiquitin & degradation', tags: 'cullin scaffold RBX1 SKP1 F-box substrate receptor CRL E3 complex', color: '#3e6db5',
      draw: (c) => tube('M22 88 C30 60 40 36 66 18', c, 13) + ell(22, 84, 12, 10, '#e8a33c') + ell(76, 18, 11, 10, '#5bb5e0') + tube('M84 26 C92 42 84 56 72 58', '#8b62c4', 11) + ell(64, 62, 9, 9, '#d6584a') + label(22, 87, 'RBX1', 6, '#5a3a00') + label(76, 21, 'SKP1', 6, '#08405a') },
    { id: 'pd-proteasome', name: 'Proteasome (26S)', cat: 'Soft · Ubiquitin & degradation', tags: 'proteasome 26S 20S 19S degradation barrel', color: '#3a8dc4', vb: [60, 100],
      draw: (c) => {
        const rows = [[8, c], [22, D(c, 0.25)], [36, '#e08a86'], [50, '#e08a86'], [64, D(c, 0.25)], [78, c]];
        let s = '';
        for (const [y, col] of rows) for (let i = 0; i < 4; i++) s += dot(13 + i * 11.3, y + 8, 7.4, col);
        return `<rect x="6" y="6" width="48" height="88" rx="10" fill="${L(c, 0.75)}"/>` + s;
      } },
    { id: 'pd-proteasome20', name: 'Proteasome core (20S)', cat: 'Soft · Ubiquitin & degradation', tags: 'proteasome 20S core particle alpha beta rings', color: '#3a8dc4', vb: [60, 70],
      draw: (c) => { let s = ''; [[10, c], [24, '#e08a86'], [38, '#e08a86'], [52, c]].forEach(([y, col]) => { for (let i = 0; i < 4; i++) s += dot(13 + i * 11.3, y + 4, 7.2, col); }); return s; } },
    { id: 'pd-fragments', name: 'Degraded peptides', cat: 'Soft · Ubiquitin & degradation', tags: 'peptides fragments degraded protein products', color: '#8b62c4',
      draw: (c) => ['M14 24 C20 14 30 22 26 30', 'M44 12 C52 18 46 28 54 32', 'M74 18 C84 20 80 32 88 34', 'M18 56 C10 66 22 74 16 82', 'M40 50 L46 70 C48 78 40 80 38 74', 'M62 52 C72 46 80 56 72 62', 'M84 66 C90 76 80 82 76 90', 'M50 86 L66 80', 'M30 40 L36 36'].map((d) => tube(d, c, 4.5, { sheen: false })).join('') },
    { id: 'pd-sumo', name: 'SUMO', cat: 'Soft · Ubiquitin & degradation', tags: 'SUMO sumoylation small ubiquitin-like modifier ptm', color: '#5bb5e0',
      draw: (c) => dot(50, 50, 30, c) + shine(40, 38, 10, 6) + label(50, 56, 'SUMO', 15, D(c, 0.65)) },
    { id: 'pd-dub', name: 'Deubiquitinase (DUB)', cat: 'Soft · Ubiquitin & degradation', tags: 'DUB deubiquitinating enzyme USP isopeptidase', color: '#e07b39',
      draw: (c) => blob('M90 34 L60 48 L90 60 C84 82 62 90 44 88 C22 86 10 68 12 50 C14 28 34 12 54 14 C72 14 86 22 90 34 Z', c) + shine(34, 30, 12, 6) + ubBead(84, 47, 7) + ubBead(96, 47, 5) + label(40, 56, 'DUB', 14, D(c, 0.65)) },
    { id: 'pd-autophagosome', name: 'Autophagosome', cat: 'Soft · Ubiquitin & degradation', tags: 'autophagy double membrane LC3 cargo', color: '#e8b45a',
      draw: (c) => `<circle cx="50" cy="50" r="42" fill="${L(c, 0.75)}" stroke="${D(c, 0.25)}" stroke-width="3"/><circle cx="50" cy="50" r="35" fill="${L(c, 0.85)}" stroke="${D(c, 0.25)}" stroke-width="3"/>` + tube('M34 40 C42 30 54 44 62 36', '#8b62c4', 5, { sheen: false }) + ell(56, 62, 10, 7, '#d6584a') + dot(36, 60, 5, '#5b9bd5') },
    { id: 'pd-lysosome', name: 'Lysosome', cat: 'Soft · Ubiquitin & degradation', tags: 'lysosome acidic hydrolases degradation organelle', color: '#d6584a',
      draw: (c) => `<circle cx="50" cy="50" r="40" fill="${L(c, 0.7)}" stroke="${D(c, 0.2)}" stroke-width="3"/>` + [[38, 40], [60, 36], [50, 58], [34, 62], [66, 60]].map(([x, y]) => dot(x, y, 5, c)).join('') + shine(36, 26, 12, 5) },
    { id: 'pd-chaperone', name: 'Chaperone (HSP70)', cat: 'Soft · Ubiquitin & degradation', tags: 'chaperone HSP70 HSP90 folding clamp', color: '#4e9a4e',
      draw: (c) => tube('M24 82 C10 56 22 26 46 22 C70 18 86 34 82 52', c, 15) + tube('M70 50 C80 60 76 76 62 78', L(c, 0.4), 11) + tube('M44 54 C50 46 58 58 62 50', '#8b62c4', 5, { sheen: false }) },
    { id: 'pd-ptm', name: 'PTM marks (P, Ac, Me)', cat: 'Soft · Ubiquitin & degradation', tags: 'post-translational modification phosphorylation acetylation methylation', color: P_COL, vb: [100, 40],
      draw: (c) => dot(18, 20, 15, c) + label(18, 25, 'P', 14, D(c, 0.65)) + dot(50, 20, 15, '#5bb5e0') + label(50, 25, 'Ac', 12, '#08405a') + dot(82, 20, 15, '#9bd06b') + label(82, 25, 'Me', 12, '#2a4a10') },

    // ---------- Immunology ----------
    { id: 'im-igg', name: 'IgG antibody (soft)', cat: 'Soft · Immunology', tags: 'antibody IgG immunoglobulin mAb Fab Fc', color: '#3e6db5', draw: (c) => igg(c, 50, 50) },
    { id: 'im-fab', name: 'Fab fragment (soft)', cat: 'Soft · Immunology', tags: 'Fab antibody fragment', color: '#3e6db5', draw: (c) => tube('M44 84 L56 18', c, 13) + tube('M60 86 L72 22', L(c, 0.5), 11) },
    { id: 'im-igm', name: 'IgM pentamer (soft)', cat: 'Soft · Immunology', tags: 'IgM pentamer antibody', color: '#c9578c',
      draw: (c) => Array.from({ length: 5 }, (_, i) => `<g transform="rotate(${i * 72} 50 50)">${tube('M50 44 L50 26', c, 5) + tube('M50 26 L40 8', c, 5) + tube('M50 26 L60 8', c, 5) + tube('M45 24 L35 8', L(c, 0.5), 3.5, { sheen: false }) + tube('M55 24 L65 8', L(c, 0.5), 3.5, { sheen: false })}</g>`).join('') + dot(50, 50, 6, '#e8a33c') },
    { id: 'im-iga', name: 'IgA dimer (soft)', cat: 'Soft · Immunology', tags: 'IgA secretory dimer J chain mucosal', color: '#3fa58b', vb: [100, 60],
      draw: (c) => `<g transform="translate(50 30) scale(.6) rotate(90) translate(-50 -92)">${igg(c)}</g><g transform="translate(50 30) scale(.6) rotate(-90) translate(-50 -92)">${igg(c)}</g>` + dot(50, 30, 5, '#e8a33c') },
    { id: 'im-bcr', name: 'B-cell receptor (BCR)', cat: 'Soft · Immunology', tags: 'BCR B cell receptor membrane immunoglobulin Ig-alpha Ig-beta CD79', color: '#3e6db5',
      draw: (c) => mem(78) + `<g transform="translate(9 4) scale(.82)">${igg(c, 50, 42)}</g>` + tube('M28 66 L28 92', '#e8a33c', 6) + tube('M72 66 L72 92', '#e8a33c', 6) },
    { id: 'im-tcr', name: 'T-cell receptor + CD3', cat: 'Soft · Immunology', tags: 'TCR alpha beta CD3 complex zeta T cell receptor', color: '#3fa58b',
      draw: (c) => mem(74) + ell(40, 22, 10, 14, c) + ell(60, 22, 10, 14, L(c, 0.45)) + ell(40, 48, 9, 12, c) + ell(60, 48, 9, 12, L(c, 0.45)) + tube('M42 60 L42 92 M58 60 L58 92', c, 4) + ell(18, 54, 8, 9, '#e8a33c') + ell(82, 54, 8, 9, '#e8a33c') + tube('M18 62 L18 92 M82 62 L82 92', '#e8a33c', 3.5) },
    { id: 'im-mhc1', name: 'MHC class I + peptide', cat: 'Soft · Immunology', tags: 'MHC I HLA class I peptide antigen presentation beta2-microglobulin', color: '#e07b39',
      draw: (c) => mem(84) + blob('M24 30 C22 16 46 12 52 22 C58 12 80 14 78 30 C76 40 66 42 50 42 C34 42 26 40 24 30 Z', c) + tube('M38 24 C46 30 54 22 64 26', '#d6584a', 4, { sheen: false }) + ell(42, 58, 12, 13, c) + ell(66, 60, 10, 11, L(c, 0.5)) + tube('M42 70 L42 94', c, 5) },
    { id: 'im-mhc2', name: 'MHC class II + peptide', cat: 'Soft · Immunology', tags: 'MHC II HLA-DR class II peptide antigen presentation', color: '#9b6bc4',
      draw: (c) => mem(84) + blob('M22 30 C20 16 46 12 52 22 C58 12 82 16 78 30 C76 40 66 42 50 42 C34 42 24 40 22 30 Z', c) + tube('M30 24 C42 30 56 20 72 26', '#d6584a', 4, { sheen: false }) + ell(38, 58, 11, 13, c) + ell(62, 58, 11, 13, L(c, 0.45)) + tube('M38 70 L38 94', c, 4.5) + tube('M62 70 L62 94', L(c, 0.45), 4.5) },
    { id: 'im-cd4', name: 'CD4 co-receptor', cat: 'Soft · Immunology', tags: 'CD4 coreceptor helper T cell', color: '#5b9bd5',
      draw: (c) => mem(84) + [14, 30, 46, 62].map((y, i) => ell(50, y, 12, 9, i % 2 ? L(c, 0.3) : c)).join('') + tube('M50 70 L50 94', c, 4) },
    { id: 'im-cd8', name: 'CD8 co-receptor', cat: 'Soft · Immunology', tags: 'CD8 alpha beta coreceptor cytotoxic', color: '#d6584a',
      draw: (c) => mem(84) + ell(38, 20, 11, 13, c) + ell(62, 20, 11, 13, L(c, 0.45)) + tube('M40 32 L42 94', c, 4) + tube('M60 32 L58 94', L(c, 0.45), 4) },
    { id: 'im-pd1', name: 'PD-1 (checkpoint)', cat: 'Soft · Immunology', tags: 'PD-1 PDCD1 CD279 checkpoint inhibitory receptor exhaustion', color: '#8b62c4',
      draw: (c) => mem(84) + ell(50, 26, 15, 17, c) + shine(44, 18, 6, 3) + tube('M50 42 L50 96', c, 4.5) + label(50, 30, 'PD-1', 9, '#fff') },
    { id: 'im-pdl1', name: 'PD-L1 (ligand)', cat: 'Soft · Immunology', tags: 'PD-L1 CD274 B7-H1 checkpoint ligand tumour', color: '#e07b39',
      draw: (c) => mem(16) + tube('M50 4 L50 30', c, 4.5) + ell(50, 46, 13, 14, L(c, 0.3)) + ell(50, 74, 15, 16, c) + label(50, 78, 'PD-L1', 8, '#fff') },
    { id: 'im-ctla4', name: 'CTLA-4 (checkpoint)', cat: 'Soft · Immunology', tags: 'CTLA-4 CD152 checkpoint inhibitory receptor dimer', color: '#c9578c',
      draw: (c) => mem(84) + ell(36, 30, 12, 16, c) + ell(64, 30, 12, 16, c) + tube('M38 46 L40 94 M62 46 L60 94', c, 4) + tube('M38 48 L62 48', D(c, 0.2), 2, { sheen: false }) },
    { id: 'im-cd28', name: 'CD28 / B7 co-stimulation', cat: 'Soft · Immunology', tags: 'CD28 CD80 CD86 B7 costimulation signal 2', color: '#4e9a4e',
      draw: (c) => mem(8) + mem(92) + tube('M50 2 L50 22', '#e07b39', 4) + ell(50, 34, 13, 13, '#e07b39') + ell(50, 62, 13, 13, c) + tube('M50 74 L50 98', c, 4) },
    { id: 'im-cytokine', name: 'Cytokine (4-helix)', cat: 'Soft · Immunology', tags: 'cytokine interleukin IL-2 IL-6 interferon signalling', color: '#e8a33c',
      draw: (c) => [[34, 30, -20], [60, 26, 15], [36, 62, 15], [64, 62, -20]].map(([x, y, r], i) => `<rect x="${x - 11}" y="${y - 20}" width="22" height="40" rx="11" fill="${i % 2 ? L(c, 0.3) : c}" stroke="${O(c)}" stroke-width="${sw}" transform="rotate(${r} ${x} ${y})"/>`).join('') },
    { id: 'im-chemokine', name: 'Chemokine', cat: 'Soft · Immunology', tags: 'chemokine CXCL CCL chemotaxis gradient', color: '#5bb5e0',
      draw: (c) => blob('M30 30 C40 12 70 14 76 34 C82 54 66 60 56 56 C48 74 24 80 18 62 C14 48 22 40 30 30 Z', c) + tube('M56 56 C62 70 74 74 84 70', c, 5) + shine(46, 26, 12, 5) },
    { id: 'im-cytokiner', name: 'Cytokine receptor + JAK', cat: 'Soft · Immunology', tags: 'cytokine receptor JAK kinase dimer type I', color: '#3e6db5',
      draw: (c) => mem(50) + ell(36, 14, 10, 12, c) + ell(64, 14, 10, 12, L(c, 0.4)) + ell(36, 36, 9, 9, c) + ell(64, 36, 9, 9, L(c, 0.4)) + tube('M38 44 L38 64 M62 44 L62 64', c, 4) + blob('M22 66 C22 58 40 58 40 68 C40 84 22 86 22 76 Z', '#3fa58b') + blob('M78 66 C78 58 60 58 60 68 C60 84 78 86 78 76 Z', '#3fa58b') + label(31, 75, 'JAK', 6, '#0b3d30') + label(69, 75, 'JAK', 6, '#0b3d30') },
    { id: 'im-stat', name: 'STAT dimer (phospho)', cat: 'Soft · Immunology', tags: 'STAT transcription factor dimer phosphorylated JAK-STAT', color: '#9b6bc4',
      draw: (c) => tube('M30 80 C18 60 26 34 46 30', c, 14) + tube('M70 80 C82 60 74 34 54 30', L(c, 0.4), 14) + dot(40, 22, 7, P_COL) + label(40, 25, 'P', 8, '#5a4300') + dot(60, 22, 7, P_COL) + label(60, 25, 'P', 8, '#5a4300') },
    { id: 'im-tlr', name: 'Toll-like receptor (TLR)', cat: 'Soft · Immunology', tags: 'TLR toll-like receptor PRR innate LRR horseshoe', color: '#e07b39',
      draw: (c) => mem(66) + tube('M26 20 C12 40 26 52 40 50', c, 10) + tube('M74 20 C88 40 74 52 60 50', L(c, 0.35), 10) + tube('M42 52 L42 86 M58 52 L58 86', c, 3.5) + ell(42, 88, 7, 6, D(c, 0.1)) + ell(58, 88, 7, 6, D(c, 0.1)) },
    { id: 'im-fcr', name: 'Fc receptor', cat: 'Soft · Immunology', tags: 'Fc gamma receptor FcR CD16 CD32 CD64', color: '#c9578c',
      draw: (c) => mem(84) + ell(46, 30, 11, 14, c) + ell(52, 56, 11, 13, L(c, 0.35)) + tube('M50 68 L50 96', c, 4.5) },
    { id: 'im-complement', name: 'Complement MAC pore', cat: 'Soft · Immunology', tags: 'complement membrane attack complex C5b-9 pore lysis', color: '#d6584a',
      draw: (c) => mem(50) + Array.from({ length: 7 }, (_, i) => `<rect x="${24 + i * 8}" y="22" width="7" height="56" rx="3.5" fill="${i % 2 ? L(c, 0.3) : c}" stroke="${O(c)}" stroke-width="1.2"/>`).join('') + `<ellipse cx="50" cy="22" rx="28" ry="5" fill="${L(c, 0.6)}" stroke="${O(c)}" stroke-width="1.2"/>` },
    { id: 'im-perforin', name: 'Perforin & granzymes', cat: 'Soft · Immunology', tags: 'perforin granzyme cytotoxic granule killing pore', color: '#d6584a',
      draw: (c) => `<circle cx="50" cy="50" r="40" fill="${L(c, 0.8)}" stroke="${D(c, 0.15)}" stroke-width="2.5"/>` + [[36, 36, c], [60, 32, '#8b62c4'], [52, 56, c], [34, 62, '#8b62c4'], [66, 64, c]].map(([x, y, col]) => dot(x, y, 7, col)).join('') },
    { id: 'im-inflammasome', name: 'Inflammasome (NLRP3)', cat: 'Soft · Immunology', tags: 'inflammasome NLRP3 ASC caspase-1 IL-1 pyroptosis ring', color: '#e07b39',
      draw: (c) => Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4, x = 50 + 30 * Math.cos(a), y = 50 + 30 * Math.sin(a); return ell(x, y, 11, 8, i % 2 ? L(c, 0.35) : c, (i * 45) + 90); }).join('') + dot(50, 50, 11, '#d6584a') + label(50, 54, 'Casp1', 6, '#fff') },
    { id: 'im-aid', name: 'AID deaminase on DNA', cat: 'Soft · Immunology', tags: 'AID AICDA activation-induced cytidine deaminase class switch somatic hypermutation', color: '#4e9a4e',
      draw: (c) => (globalThis.SoftKit ? SoftKit.dnaH(0, 58, 100) : tube('M4 70 C20 62 30 78 46 70 C62 62 72 78 96 70', '#3b82c4', 5, { sheen: false })) + blob('M30 52 C26 30 46 16 62 22 C78 28 80 48 68 58 C56 68 34 68 30 52 Z', c) + shine(46, 30, 10, 5) + label(52, 48, 'AID', 13, D(c, 0.7)) + dot(58, 72, 4, '#d6584a') },
    { id: 'im-ung', name: 'UNG glycosylase', cat: 'Soft · Immunology', tags: 'UNG UNG2 uracil DNA glycosylase base excision repair', color: '#8b62c4',
      draw: (c) => (globalThis.SoftKit ? SoftKit.dnaH(0, 60, 100) : tube('M4 72 C20 64 30 80 46 72 C62 64 72 80 96 72', '#3b82c4', 5, { sheen: false })) + tube('M70 22 C50 10 28 22 30 42 C32 58 52 62 62 54', c, 15) + dot(58, 74, 4, '#e8a33c') },
    { id: 'im-csr', name: 'Class-switch recombination', cat: 'Soft · Immunology', tags: 'CSR class switch switch region looping excision circle IgM IgG', color: '#3b82c4',
      draw: (c) => tube('M4 80 L34 80 C40 80 40 44 50 44 C60 44 60 80 66 80 L96 80', c, 5, { sheen: false }) + `<circle cx="50" cy="22" r="14" fill="none" stroke="${c}" stroke-width="5"/>` + `<rect x="10" y="74" width="16" height="12" rx="3" fill="#e8a33c"/><rect x="74" y="74" width="16" height="12" rx="3" fill="#3fa58b"/>` + label(18, 83, 'Sμ', 7, '#5a3a00') + label(82, 83, 'Sγ', 7, '#0b3d30') },
    { id: 'im-tcell', name: 'T cell (soft)', cat: 'Soft · Immunology', tags: 'T cell lymphocyte CD4 CD8 cytotoxic helper', color: '#3fa58b',
      draw: (c) => cellBody('M50 8 C74 8 92 26 92 50 C92 74 74 92 50 92 C26 92 8 74 8 50 C8 26 26 8 50 8 Z', c, nucleus(52, 52, 30, 28, c)) + shine(30, 26, 12, 5) },
    { id: 'im-bcell', name: 'B cell (soft)', cat: 'Soft · Immunology', tags: 'B cell lymphocyte', color: '#3e6db5',
      draw: (c) => cellBody('M50 8 C74 8 92 26 92 50 C92 74 74 92 50 92 C26 92 8 74 8 50 C8 26 26 8 50 8 Z', c, nucleus(50, 52, 28, 27, c)) + [0, 60, 120, 180, 240, 300].map((a) => `<g transform="rotate(${a} 50 50)">${tube('M50 8 L50 0 M50 2 L45 -4 M50 2 L55 -4', D(c, 0.1), 2, { sheen: false })}</g>`).join('') },
    { id: 'im-plasma', name: 'Plasma cell (soft)', cat: 'Soft · Immunology', tags: 'plasma cell antibody-secreting B cell ER', color: '#c9578c',
      draw: (c) => cellBody('M52 10 C80 10 94 32 92 54 C90 78 70 92 48 90 C22 88 8 70 10 48 C12 26 28 10 52 10 Z', c, nucleus(34, 56, 18, 18, c)) + [0, 1, 2, 3].map((i) => `<path d="M${56 + i * 7} 24 C${64 + i * 7} 40 ${64 + i * 7} 62 ${56 + i * 7} 78" fill="none" stroke="${D(c, 0.2)}" stroke-width="2"/>`).join('') },
    { id: 'im-dc', name: 'Dendritic cell (soft)', cat: 'Soft · Immunology', tags: 'dendritic cell DC antigen-presenting APC', color: '#e8a33c',
      draw: (c) => blob('M50 30 C56 18 58 6 64 4 C66 14 62 24 64 32 C76 26 90 22 96 26 C88 34 76 38 70 46 C80 54 94 64 92 72 C80 70 70 60 62 60 C64 74 62 88 54 96 C50 84 52 70 46 64 C36 72 22 84 12 82 C20 70 32 64 36 54 C24 50 10 50 4 42 C16 38 30 42 38 40 C34 30 26 18 28 10 C38 16 44 26 50 30 Z', L(c, 0.45)) + nucleus(52, 48, 11, 10, c) },
    { id: 'im-macrophage', name: 'Macrophage (soft)', cat: 'Soft · Immunology', tags: 'macrophage phagocyte TAM M1 M2 myeloid', color: '#9b6bc4',
      draw: (c) => blob('M20 50 C6 30 28 12 44 20 C54 6 84 14 82 34 C98 44 92 74 74 76 C70 94 38 94 32 80 C10 82 4 62 20 50 Z', L(c, 0.5)) + blob('M40 44 C40 34 60 34 62 44 C70 52 56 64 48 58 C38 62 34 52 40 44 Z', c) + dot(70, 60, 5, D(c, 0.1)) + dot(30, 34, 4, D(c, 0.1)) + shine(36, 26, 10, 4) },
    { id: 'im-neutrophil', name: 'Neutrophil (soft)', cat: 'Soft · Immunology', tags: 'neutrophil granulocyte PMN multilobed', color: '#e07b39',
      draw: (c) => cellBody('M50 8 C74 8 92 26 92 50 C92 74 74 92 50 92 C26 92 8 74 8 50 C8 26 26 8 50 8 Z', c, tube('M28 42 C30 30 42 30 44 42 C46 54 56 54 58 42 C60 30 72 32 72 46 C72 60 60 66 54 62', D(c, 0.05), 11)) + [[28, 70], [70, 72], [40, 78], [78, 30], [24, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${D(c, 0.15)}"/>`).join('') },
    { id: 'im-nk', name: 'NK cell (soft)', cat: 'Soft · Immunology', tags: 'NK natural killer cell granules cytotoxic innate', color: '#5bb5e0',
      draw: (c) => cellBody('M50 8 C74 8 92 26 92 50 C92 74 74 92 50 92 C26 92 8 74 8 50 C8 26 26 8 50 8 Z', c, nucleus(42, 46, 22, 22, c)) + [[70, 64], [62, 76], [76, 50], [50, 80]].map(([x, y]) => dot(x, y, 4.5, '#d6584a')).join('') },
    { id: 'im-gc', name: 'Germinal centre', cat: 'Soft · Immunology', tags: 'germinal centre dark zone light zone B cells follicle lymph node', color: '#3e6db5',
      draw: (c) => `<ellipse cx="50" cy="50" rx="46" ry="40" fill="${L(c, 0.85)}" stroke="${D(c, 0.1)}" stroke-width="2"/><path d="M50 10 C70 30 70 70 50 90 C30 90 4 70 4 50 C4 30 30 10 50 10 Z" fill="${L(c, 0.55)}"/>` + [[24, 38], [30, 60], [40, 26], [44, 48], [40, 72], [20, 52]].map(([x, y]) => dot(x, y, 6, c)).join('') + [[66, 34], [76, 54], [64, 68], [82, 40]].map(([x, y]) => dot(x, y, 6, L(c, 0.3))).join('') + label(27, 92, 'DZ', 9, D(c, 0.5)) + label(73, 92, 'LZ', 9, D(c, 0.5)) },

    // ---------- Cancer ----------
    { id: 'ca-tumour', name: 'Tumour cell (soft)', cat: 'Soft · Cancer', tags: 'tumour cancer malignant cell neoplastic tumor', color: '#d6584a',
      draw: (c) => blob('M48 8 C66 4 80 16 86 30 C98 40 94 60 86 70 C84 86 66 96 50 90 C34 96 14 86 12 70 C2 58 6 38 16 28 C22 14 34 10 48 8 Z', L(c, 0.5)) + blob('M36 38 C44 26 64 28 68 42 C74 56 64 70 50 70 C34 72 28 52 36 38 Z', c) + dot(54, 46, 4.5, D(c, 0.3)) + shine(30, 24, 12, 5) },
    { id: 'ca-mitosis', name: 'Dividing cell (mitosis)', cat: 'Soft · Cancer', tags: 'mitosis proliferation dividing cell cytokinesis', color: '#d6584a', vb: [100, 70],
      draw: (c) => blob('M50 18 C40 4 6 6 4 34 C2 62 40 66 50 50 C60 66 98 62 96 34 C94 6 60 4 50 18 Z', L(c, 0.5)) + tube('M22 24 L26 46 M30 22 L28 46', D(c, 0.1), 3.5, { sheen: false }) + tube('M72 24 L74 46 M80 22 L78 46', D(c, 0.1), 3.5, { sheen: false }) },
    { id: 'ca-metastatic', name: 'Metastatic cell', cat: 'Soft · Cancer', tags: 'metastasis invasive migrating EMT mesenchymal', color: '#d6584a',
      draw: (c) => blob('M30 40 C34 26 52 22 62 30 C74 22 96 24 98 30 C88 34 76 36 74 44 C84 52 92 64 86 68 C76 62 70 56 62 60 C60 76 50 88 42 86 C44 74 44 66 38 62 C26 66 12 70 4 66 C12 58 24 52 30 40 Z', L(c, 0.5)) + nucleus(48, 44, 11, 10, c) },
    { id: 'ca-apoptotic', name: 'Apoptotic cell', cat: 'Soft · Cancer', tags: 'apoptosis cell death blebbing apoptotic bodies', color: '#7a8a96',
      draw: (c) => blob('M50 18 C70 18 80 34 78 50 C78 68 66 80 50 80 C32 80 20 68 22 50 C22 32 32 18 50 18 Z', L(c, 0.5)) + [[20, 26, 8], [82, 24, 7], [86, 70, 9], [16, 72, 7], [50, 92, 6]].map(([x, y, r]) => dot(x, y, r, L(c, 0.4))).join('') + [[44, 44], [56, 50], [46, 58]].map(([x, y]) => dot(x, y, 5, D(c, 0.15))).join('') },
    { id: 'ca-caf', name: 'Cancer-associated fibroblast', cat: 'Soft · Cancer', tags: 'CAF fibroblast stroma spindle tumour microenvironment', color: '#9bd06b', vb: [100, 50],
      draw: (c) => blob('M2 26 C20 20 34 8 50 10 C66 8 80 20 98 24 C80 30 66 42 50 40 C34 42 20 32 2 26 Z', L(c, 0.35)) + ell(50, 25, 12, 7, D(c, 0.1)) },
    { id: 'ca-cart', name: 'CAR-T cell', cat: 'Soft · Cancer', tags: 'CAR-T chimeric antigen receptor T cell therapy', color: '#3fa58b',
      draw: (c) => cellBody('M50 14 C72 14 88 30 88 52 C88 74 72 90 50 90 C28 90 12 74 12 52 C12 30 28 14 50 14 Z', c, nucleus(50, 54, 24, 22, c)) + [-50, -20, 20, 50].map((a) => `<g transform="rotate(${a} 50 52)">${tube('M50 14 L50 4', '#7a8a96', 2.5, { sheen: false }) + ell(46, 2, 4, 5, '#e07b39') + ell(54, 2, 4, 5, '#e8a33c')}</g>`).join('') },
    { id: 'ca-car', name: 'CAR construct', cat: 'Soft · Cancer', tags: 'chimeric antigen receptor scFv hinge transmembrane CD28 4-1BB CD3 zeta', color: '#e07b39', vb: [60, 100],
      draw: (c) => mem(50, 60) + ell(22, 10, 8, 9, c) + ell(38, 10, 8, 9, L(c, 0.4)) + tube('M30 20 L30 64', '#7a8a96', 4) + `<rect x="21" y="64" width="18" height="10" rx="5" fill="#3e6db5" stroke="${D('#3e6db5', 0.34)}" stroke-width="1.4"/><rect x="21" y="76" width="18" height="10" rx="5" fill="#9b6bc4" stroke="${D('#9b6bc4', 0.34)}" stroke-width="1.4"/><rect x="21" y="88" width="18" height="10" rx="5" fill="#3fa58b" stroke="${D('#3fa58b', 0.34)}" stroke-width="1.4"/>` },
    { id: 'ca-bite', name: 'Bispecific T-cell engager', cat: 'Soft · Cancer', tags: 'BiTE bispecific CD3 tumour antigen blinatumomab engager', color: '#3e6db5', vb: [100, 50],
      draw: (c) => ell(18, 25, 10, 14, c) + ell(36, 25, 10, 14, L(c, 0.45)) + tube('M46 25 L54 25', '#7a8a96', 3, { sheen: false }) + ell(64, 25, 10, 14, '#e07b39') + ell(82, 25, 10, 14, L('#e07b39', 0.45)) },
    { id: 'ca-adc', name: 'Antibody–drug conjugate (soft)', cat: 'Soft · Cancer', tags: 'ADC antibody drug conjugate payload linker', color: '#3e6db5',
      draw: (c) => igg(c, 50, 50) + [[26, 50], [74, 50], [40, 86], [60, 86]].map(([x, y]) => dot(x, y, 5.5, '#d6584a')).join('') },
    { id: 'ca-spheroid', name: 'Tumour spheroid / organoid', cat: 'Soft · Cancer', tags: 'spheroid organoid 3D culture tumoroid', color: '#d6584a',
      draw: (c) => { let s = ''; for (let r = 0; r < 3; r++) { const n = [1, 7, 12][r], R = [0, 18, 34][r]; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI + r; s += ell(50 + R * Math.cos(a), 50 + R * Math.sin(a), 10, 9, r === 0 ? D(c, 0.15) : L(c, 0.25 + r * 0.12), (i * 40) % 180); } } return s; } },
    { id: 'ca-tumourmass', name: 'Tumour mass', cat: 'Soft · Cancer', tags: 'solid tumour mass lesion vascularised neoplasm', color: '#d6584a',
      draw: (c) => blob('M50 8 C70 4 92 22 90 44 C96 64 82 88 60 90 C42 98 18 88 12 68 C2 52 10 26 26 18 C34 10 42 10 50 8 Z', L(c, 0.35)) + [[36, 34], [58, 28], [70, 50], [46, 56], [30, 64], [60, 72], [76, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${D(c, 0.12)}" opacity=".7"/>`).join('') + `<path d="M8 80 C24 66 34 70 44 60 C52 52 62 58 70 46" fill="none" stroke="#b02a2a" stroke-width="3" stroke-linecap="round"/>` },
    { id: 'ca-inhibitor', name: 'Kinase inhibitor in pocket', cat: 'Soft · Cancer', tags: 'small molecule inhibitor kinase TKI drug targeted therapy', color: '#3e6db5',
      draw: (c) => blob('M20 40 C16 22 34 10 52 14 C70 18 78 32 70 42 C60 48 34 50 20 40 Z', L(c, 0.35)) + blob('M18 54 C34 46 66 46 80 52 C92 66 80 90 54 90 C28 92 10 76 18 54 Z', c) + `<polygon points="44,40 52,44 52,52 44,56 36,52 36,44" fill="#e07b39" stroke="#8a3e10" stroke-width="1.4"/><circle cx="60" cy="48" r="3" fill="#e07b39" stroke="#8a3e10" stroke-width="1"/><path d="M52 48 L57 48" stroke="#8a3e10" stroke-width="1.6"/>` },
    { id: 'ca-ras', name: 'RAS (GTPase) · GTP', cat: 'Soft · Cancer', tags: 'RAS KRAS GTPase oncogene GTP GDP', color: '#d6584a',
      draw: (c) => mem(86) + blob('M24 36 C22 16 50 8 66 18 C82 28 80 52 66 62 C52 72 28 66 24 36 Z', c) + shine(40, 24, 10, 5) + tube('M50 64 L50 80', c, 3) + dot(64, 40, 9, '#9bd06b') + label(64, 43, 'GTP', 6.5, '#2a4a10') },
    { id: 'ca-p53', name: 'p53 tetramer on DNA', cat: 'Soft · Cancer', tags: 'p53 TP53 tumour suppressor transcription factor tetramer', color: '#9b6bc4',
      draw: (c) => (globalThis.SoftKit ? SoftKit.dnaH(0, 66, 100) : tube('M4 78 C20 70 30 86 46 78 C62 70 72 86 96 78', '#3b82c4', 5, { sheen: false })) + ell(36, 36, 14, 13, c) + ell(64, 36, 14, 13, L(c, 0.4)) + ell(36, 60, 14, 12, L(c, 0.4)) + ell(64, 60, 14, 12, c) + label(50, 52, 'p53', 10, '#2b1a40') },
    { id: 'ca-dsb', name: 'DNA double-strand break', cat: 'Soft · Cancer', tags: 'DSB DNA damage break genotoxic radiation', color: '#3b82c4',
      // Two broken helix ends (the kit's helix, so it matches every other DNA icon) and the break between them.
      draw: (c) => (globalThis.SoftKit ? SoftKit.helix(4, 40, 49, 11, 0.62, { w: 4 }) + SoftKit.helix(60, 96, 49, 11, 0.62, { w: 4, phase: Math.PI * 0.2 })
        : tube('M4 40 C14 34 24 46 36 40 M4 58 C14 52 24 64 36 58', c, 5, { sheen: false }) + tube('M64 40 C76 34 86 46 96 40 M64 58 C76 52 86 64 96 58', c, 5, { sheen: false }))
        + `<path d="M46 26 L54 36 L46 44 L56 52 L48 62 L56 72" fill="none" stroke="#f2c14e" stroke-width="4" stroke-linejoin="round"/>` },
    { id: 'ca-mutation', name: 'DNA mutation', cat: 'Soft · Cancer', tags: 'point mutation SNV variant mismatch driver mutation', color: '#3b82c4',
      draw: (c) => tube('M6 30 L94 30 M6 70 L94 70', c, 6, { sheen: false }) + [16, 30, 44, 58, 72, 86].map((x, i) => `<rect x="${x - 3}" y="34" width="6" height="32" rx="2" fill="${i === 3 ? '#d6584a' : i % 2 ? '#e8a33c' : '#3fa58b'}"/>`).join('') + `<circle cx="58" cy="50" r="13" fill="none" stroke="#d6584a" stroke-width="2.5" stroke-dasharray="4 3"/>` },
    { id: 'ca-xenograft', name: 'Mouse with tumour', cat: 'Soft · Cancer', tags: 'xenograft PDX syngeneic mouse tumour model in vivo subcutaneous', color: '#c4c9cf', vb: [100, 60],
      draw: (c) => blob('M14 40 C10 26 26 16 46 16 C60 14 74 18 82 26 C90 26 96 32 94 38 C92 42 86 42 84 42 C80 50 66 52 46 52 C30 52 16 50 14 40 Z', c) + ell(78, 18, 6, 7, L(c, 0.2)) + `<circle cx="88" cy="32" r="1.8" fill="#222"/><path d="M14 40 C4 44 2 54 10 58" fill="none" stroke="${D(c, 0.2)}" stroke-width="2"/>` + dot(44, 20, 9, '#d6584a') },
    { id: 'ca-flow', name: 'Flow cytometer', cat: 'Lab', tags: 'flow cytometry FACS cytometer sorter analyser', color: '#5b6b7b', vb: [100, 70],
      draw: (c) => `<rect x="4" y="16" width="92" height="50" rx="8" fill="${L(c, 0.75)}" stroke="${D(c, 0.2)}" stroke-width="2"/><rect x="12" y="24" width="40" height="28" rx="3" fill="#1f2a36"/>` + [[18, 44], [22, 36], [26, 40], [30, 30], [36, 34], [40, 28], [44, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#7cf2a8"/>`).join('') + `<rect x="64" y="6" width="10" height="18" rx="3" fill="#f4f8fb" stroke="#7a8a96" stroke-width="1.5"/><circle cx="82" cy="44" r="5" fill="#3fa58b"/>` },
  ];
})();
for (const ic of SOFT) { ICONS.push(ic); ICON_MAP[ic.id] = ic; }
