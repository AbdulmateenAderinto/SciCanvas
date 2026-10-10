// Scientific icon library. Each icon draws into a 100x100 viewBox (unless `vb` says otherwise)
// and takes a primary colour `c`, so every icon is recolourable from the properties panel.

const Color = {
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  },
  mix(a, b, t) {
    const A = Color.hexToRgb(a), B = Color.hexToRgb(b);
    return Color.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  },
  light: (c, t = 0.55) => Color.mix(c, '#ffffff', t),
  dark: (c, t = 0.35) => Color.mix(c, '#000000', t),
};

const L = Color.light, D = Color.dark;

const ICONS = [
  // ---------- Cells ----------
  { id: 'cell', name: 'Animal cell', cat: 'Cells', tags: 'eukaryote generic', color: '#7fb3e6',
    draw: (c) => `<ellipse cx="50" cy="50" rx="46" ry="40" fill="${L(c)}" stroke="${D(c)}" stroke-width="2.5"/>
      <circle cx="54" cy="48" r="15" fill="${L(c, 0.2)}" stroke="${D(c)}" stroke-width="2"/>
      <circle cx="57" cy="45" r="5" fill="${D(c, 0.15)}"/>
      <ellipse cx="25" cy="62" rx="8" ry="4" fill="#f2a65a" stroke="#c0763a" stroke-width="1.2" transform="rotate(-25 25 62)"/>
      <ellipse cx="78" cy="65" rx="7" ry="3.5" fill="#f2a65a" stroke="#c0763a" stroke-width="1.2" transform="rotate(30 78 65)"/>
      <circle cx="30" cy="35" r="3" fill="${D(c, 0.1)}" opacity=".6"/><circle cx="75" cy="30" r="2.5" fill="${D(c, 0.1)}" opacity=".6"/>` },
  { id: 'nucleus', name: 'Nucleus', cat: 'Cells', tags: 'organelle chromatin', color: '#9b7fd1',
    draw: (c) => `<circle cx="50" cy="50" r="44" fill="${L(c)}" stroke="${D(c)}" stroke-width="3" stroke-dasharray="7 3"/>
      <circle cx="58" cy="44" r="12" fill="${D(c, 0.1)}"/>
      <path d="M22 60 q8 -10 16 0 t16 0 M30 30 q6 8 12 0" stroke="${D(c, 0.2)}" stroke-width="2" fill="none"/>` },
  { id: 'mitochondrion', name: 'Mitochondrion', cat: 'Cells', tags: 'organelle energy ATP', color: '#f08a5d', vb: [100, 60],
    draw: (c) => `<ellipse cx="50" cy="30" rx="47" ry="26" fill="${L(c, 0.35)}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M12 30 q6 -16 12 0 q6 16 12 0 q6 -16 12 0 q6 16 12 0 q6 -16 12 0 q6 16 12 0" fill="none" stroke="${D(c)}" stroke-width="2.5"/>` },
  { id: 'rbc', name: 'Red blood cell', cat: 'Cells', tags: 'erythrocyte blood', color: '#d63b3b',
    draw: (c) => `<circle cx="50" cy="50" r="44" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <circle cx="50" cy="50" r="22" fill="${D(c, 0.2)}" opacity=".7"/><ellipse cx="38" cy="32" rx="12" ry="6" fill="#fff" opacity=".25"/>` },
  { id: 'neuron', name: 'Neuron', cat: 'Cells', tags: 'nerve brain axon', color: '#e6b84a',
    draw: (c) => `<g stroke="${D(c)}" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M30 40 L8 22 M30 40 L10 48 M34 32 L28 8 M38 48 L22 70 M44 32 L60 12"/>
      <path d="M44 44 C60 52 70 64 90 88" stroke-width="4"/><path d="M90 88 l6 -2 M90 88 l2 6 M90 88 l-4 4"/></g>
      <circle cx="37" cy="40" r="12" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/><circle cx="37" cy="40" r="4" fill="${D(c)}"/>
      <g fill="${L(c)}" stroke="${D(c)}" stroke-width="1.5"><rect x="56" y="55" width="9" height="6" rx="3" transform="rotate(42 60 58)"/><rect x="67" y="67" width="9" height="6" rx="3" transform="rotate(48 71 70)"/></g>` },
  { id: 'tcell', name: 'T cell', cat: 'Cells', tags: 'lymphocyte immune', color: '#4fb3a9',
    draw: (c) => `<circle cx="50" cy="50" r="40" fill="${L(c)}" stroke="${D(c)}" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="27" fill="${c}"/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<g transform="rotate(${a} 50 50)"><path d="M50 10 v-6 M47 4 h6" stroke="${D(c)}" stroke-width="2.5"/></g>`).join('')}` },
  { id: 'macrophage', name: 'Macrophage', cat: 'Cells', tags: 'immune phagocyte', color: '#c98bd6',
    draw: (c) => `<path d="M20 50 C5 30 30 10 45 20 C55 5 85 15 80 35 C98 45 90 75 72 75 C68 95 35 95 32 78 C10 80 5 62 20 50 Z" fill="${L(c)}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M40 45 C40 35 60 35 60 45 C68 52 55 65 46 58 C36 60 34 50 40 45 Z" fill="${c}"/>
      <circle cx="70" cy="58" r="5" fill="${D(c, 0.1)}" opacity=".5"/><circle cx="30" cy="35" r="4" fill="${D(c, 0.1)}" opacity=".5"/>` },
  { id: 'stemcell', name: 'Stem cell', cat: 'Cells', tags: 'pluripotent iPSC', color: '#6cc070',
    draw: (c) => `<circle cx="50" cy="50" r="44" fill="${L(c, 0.65)}" stroke="${D(c)}" stroke-width="2.5"/>
      <circle cx="50" cy="50" r="28" fill="${L(c, 0.25)}" stroke="${D(c)}" stroke-width="2"/><circle cx="56" cy="46" r="7" fill="${D(c, 0.1)}"/>` },

  // ---------- Microbes ----------
  { id: 'bacterium', name: 'Bacterium (rod)', cat: 'Microbes', tags: 'bacillus e. coli prokaryote', color: '#7bbf5a', vb: [100, 50],
    draw: (c) => `<path d="M85 25 C92 20 98 28 99 22 M85 30 C95 34 94 42 99 40" stroke="${D(c)}" stroke-width="1.5" fill="none"/>
      <rect x="4" y="6" width="84" height="38" rx="19" fill="${L(c, 0.35)}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M22 25 q8 -10 16 0 t16 0 t16 0" stroke="${D(c)}" stroke-width="1.5" fill="none"/>` },
  { id: 'coccus', name: 'Cocci cluster', cat: 'Microbes', tags: 'staphylococcus bacteria', color: '#d9a441',
    draw: (c) => [[35, 35], [62, 32], [50, 58], [25, 62], [75, 60], [48, 82]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="15" fill="${L(c, 0.35)}" stroke="${D(c)}" stroke-width="2.2"/>`).join('') },
  { id: 'virus', name: 'Virus', cat: 'Microbes', tags: 'virion coronavirus pathogen', color: '#e05a6b',
    draw: (c) => `${Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30} 50 50)"><path d="M50 22 V8" stroke="${D(c)}" stroke-width="3"/><circle cx="50" cy="8" r="5" fill="${c}" stroke="${D(c)}" stroke-width="1.5"/></g>`).join('')}
      <circle cx="50" cy="50" r="30" fill="${L(c, 0.45)}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M38 45 q12 -12 24 0 t-12 14" stroke="${D(c)}" stroke-width="1.5" fill="none"/>` },
  { id: 'phage', name: 'Bacteriophage', cat: 'Microbes', tags: 'virus phage', color: '#8a8fd6', vb: [70, 100],
    draw: (c) => `<polygon points="35,4 58,17 58,40 35,52 12,40 12,17" fill="${L(c, 0.4)}" stroke="${D(c)}" stroke-width="2.5"/>
      <rect x="31" y="52" width="8" height="28" fill="${c}" stroke="${D(c)}" stroke-width="1.5"/>
      <path d="M35 80 L12 96 M35 80 L58 96 M35 80 L24 98 M35 80 L46 98" stroke="${D(c)}" stroke-width="2.5" fill="none"/>` },
  { id: 'yeast', name: 'Yeast', cat: 'Microbes', tags: 'fungus budding', color: '#d8c27a',
    draw: (c) => `<ellipse cx="42" cy="55" rx="34" ry="30" fill="${L(c, 0.4)}" stroke="${D(c)}" stroke-width="2.5"/>
      <circle cx="78" cy="28" r="15" fill="${L(c, 0.4)}" stroke="${D(c)}" stroke-width="2.5"/><circle cx="40" cy="55" r="9" fill="${D(c, 0.05)}"/>` },

  // ---------- Molecules ----------
  { id: 'antibody', name: 'Antibody (IgG)', cat: 'Molecules', tags: 'immunoglobulin mab', color: '#4a7fd6',
    draw: (c) => `<g stroke="${D(c)}" stroke-width="2" stroke-linejoin="round">
      <rect x="44" y="52" width="12" height="44" rx="5" fill="${c}"/>
      <rect x="30" y="8" width="12" height="50" rx="5" fill="${c}" transform="rotate(-38 36 58)"/>
      <rect x="58" y="8" width="12" height="50" rx="5" fill="${c}" transform="rotate(38 64 58)"/>
      <rect x="18" y="20" width="9" height="30" rx="4" fill="${L(c, 0.4)}" transform="rotate(-38 36 58)"/>
      <rect x="73" y="20" width="9" height="30" rx="4" fill="${L(c, 0.4)}" transform="rotate(38 64 58)"/></g>` },
  { id: 'receptor', name: 'Receptor (transmembrane)', cat: 'Molecules', tags: 'rtk gpcr surface', color: '#3fa58b', vb: [60, 100],
    draw: (c) => `<rect x="0" y="44" width="60" height="16" fill="#e9d8a6" opacity=".7"/>
      <path d="M12 6 C12 30 24 30 24 44 V78 M48 6 C48 30 36 30 36 44 V78" stroke="${D(c)}" stroke-width="2" fill="none"/>
      <rect x="20" y="40" width="8" height="40" rx="3" fill="${c}" stroke="${D(c)}" stroke-width="1.5"/>
      <rect x="32" y="40" width="8" height="40" rx="3" fill="${c}" stroke="${D(c)}" stroke-width="1.5"/>
      <path d="M6 4 C6 26 22 28 22 40 H38 C38 28 54 26 54 4 L44 4 C44 22 32 24 30 30 C28 24 16 22 16 4 Z" fill="${L(c, 0.3)}" stroke="${D(c)}" stroke-width="2"/>
      <rect x="16" y="78" width="28" height="18" rx="8" fill="${D(c, 0.1)}"/>` },
  { id: 'ligand', name: 'Ligand', cat: 'Molecules', tags: 'agonist hormone growth factor', color: '#e8a33c',
    draw: (c) => `<path d="M50 10 L88 32 L88 68 L50 90 L12 68 L12 32 Z" fill="${c}" stroke="${D(c)}" stroke-width="3"/>
      <circle cx="40" cy="40" r="8" fill="#fff" opacity=".35"/>` },
  { id: 'enzyme', name: 'Enzyme', cat: 'Molecules', tags: 'protein kinase catalyst', color: '#5f9de0',
    draw: (c) => `<path d="M50 6 C80 6 96 30 92 56 C88 82 66 96 44 92 C20 88 6 66 8 44 C10 30 18 20 28 14 L40 40 L58 40 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <ellipse cx="62" cy="64" rx="14" ry="10" fill="${L(c, 0.35)}"/>` },
  { id: 'protein', name: 'Protein (globular)', cat: 'Molecules', tags: 'blob generic', color: '#a970d6',
    draw: (c) => `<path d="M30 15 C50 0 80 10 85 35 C95 55 85 85 60 88 C35 95 10 80 12 55 C5 40 15 22 30 15 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M30 40 q10 -10 20 0 q10 10 20 0 M28 60 q12 10 24 0" stroke="${L(c, 0.4)}" stroke-width="3" fill="none"/>` },
  { id: 'dna', name: 'DNA double helix', cat: 'Molecules', tags: 'nucleic acid gene genome', color: '#b5161e', vb: [50, 100],
    // Vertical helix drawn by the soft kit's helix (base pairs end exactly on the strands); the x/y swap turns it upright.
    draw: (c) => (globalThis.SoftKit && SoftKit.helix
      ? `<g transform="matrix(0 1 1 0 0 0)">${SoftKit.helix(3, 97, 25, 17, 1, { w: 5, c1: c, phase: Math.PI / 2 })}</g>`
      : `<path d="M8 2 C8 26 42 26 42 50 C42 74 8 74 8 98" stroke="${c}" stroke-width="5" fill="none"/><path d="M42 2 C42 26 8 26 8 50 C8 74 42 74 42 98" stroke="${D(c)}" stroke-width="5" fill="none"/>`) },
  { id: 'rna', name: 'mRNA', cat: 'Molecules', tags: 'nucleic acid transcript', color: '#d6584a', vb: [100, 40],
    draw: (c) => `<path d="M4 20 C14 4 24 4 34 20 S54 36 64 20 S84 4 96 20" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${[14, 30, 46, 62, 78].map((x, i) => `<line x1="${x}" y1="${i % 2 ? 26 : 14}" x2="${x}" y2="${i % 2 ? 36 : 4}" stroke="${L(c, 0.3)}" stroke-width="3"/>`).join('')}` },
  { id: 'chromosome', name: 'Chromosome', cat: 'Molecules', tags: 'chromatid karyotype', color: '#7a6bd1', vb: [70, 100],
    draw: (c) => `<path d="M10 6 C4 30 28 40 30 50 C28 60 4 70 10 94 L24 96 C24 74 34 60 35 50 C34 40 24 26 24 4 Z" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <path d="M60 6 C66 30 42 40 40 50 C42 60 66 70 60 94 L46 96 C46 74 36 60 35 50 C36 40 46 26 46 4 Z" fill="${L(c, 0.2)}" stroke="${D(c)}" stroke-width="2"/>
      <path d="M12 20 h10 M14 80 h10 M48 22 h10 M46 78 h10" stroke="${L(c, 0.6)}" stroke-width="3"/>` },
  { id: 'smallmol', name: 'Small molecule / drug', cat: 'Molecules', tags: 'compound inhibitor', color: '#4d4d4d',
    draw: (c) => `<g stroke="${c}" stroke-width="3" fill="none"><polygon points="30,30 50,18 70,30 70,54 50,66 30,54"/><path d="M70 54 L88 64 M50 66 V86 M30 30 L14 20"/><path d="M36 33 L50 25 M64 50 V34" stroke-width="2"/></g>
      <circle cx="88" cy="64" r="5" fill="#d64545"/><circle cx="14" cy="20" r="5" fill="#3b6fd6"/>` },

  // ---------- Anatomy ----------
  { id: 'heart', name: 'Heart', cat: 'Anatomy', tags: 'cardiac organ cardiovascular', color: '#d8504a',
    draw: (c) => `<path d="M40 12 v14 M54 8 v18 M64 14 v14" stroke="${D(c)}" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 26 C10 30 6 56 22 72 C34 84 48 94 56 96 C70 86 92 66 90 44 C88 26 70 20 58 30 C50 22 38 22 30 26 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M56 34 C52 50 58 70 56 92" stroke="${D(c, 0.2)}" stroke-width="2" fill="none"/>` },
  { id: 'lungs', name: 'Lungs', cat: 'Anatomy', tags: 'pulmonary respiratory organ', color: '#e88a9a',
    draw: (c) => `<path d="M50 4 V40 M50 36 L36 48 M50 36 L64 48" stroke="${D(c)}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M40 30 C20 24 6 50 8 76 C10 92 28 94 42 88 C46 70 46 46 40 30 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M60 30 C80 24 94 50 92 76 C90 92 72 94 58 88 C54 70 54 46 60 30 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>` },
  { id: 'liver', name: 'Liver', cat: 'Anatomy', tags: 'hepatic organ', color: '#a8473a', vb: [100, 70],
    draw: (c) => `<path d="M4 20 C10 4 60 2 96 10 C98 22 80 40 60 52 C44 62 30 66 20 60 C8 52 0 36 4 20 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M50 8 C48 24 46 40 40 60" stroke="${D(c, 0.2)}" stroke-width="2" fill="none"/>` },
  { id: 'kidney', name: 'Kidney', cat: 'Anatomy', tags: 'renal organ', color: '#b0504a', vb: [70, 100],
    draw: (c) => `<path d="M40 4 C70 4 70 96 40 96 C10 96 0 70 14 60 C22 54 22 46 14 40 C0 30 10 4 40 4 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M18 50 H2" stroke="#d6584a" stroke-width="4"/><path d="M20 54 C10 70 4 80 6 98" stroke="#e6d36a" stroke-width="3" fill="none"/>` },
  { id: 'brain', name: 'Brain', cat: 'Anatomy', tags: 'cns neural organ', color: '#e8a0b0', vb: [100, 80],
    draw: (c) => `<path d="M14 50 C0 40 6 14 26 12 C34 0 60 0 68 10 C88 6 100 26 92 42 C100 56 86 72 70 68 C60 78 36 78 28 68 C16 70 8 60 14 50 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5"/>
      <path d="M30 22 q8 10 0 20 q-6 8 4 16 M50 12 q-6 14 4 24 q8 10 -2 24 M70 20 q-8 10 2 20 q8 8 -2 18" stroke="${D(c, 0.2)}" stroke-width="2" fill="none"/>` },
  { id: 'vessel', name: 'Blood vessel', cat: 'Anatomy', tags: 'artery vein capillary', color: '#d84a4a', vb: [100, 40],
    draw: (c) => `<rect x="2" y="4" width="96" height="32" rx="4" fill="${L(c, 0.6)}" stroke="${D(c)}" stroke-width="3"/>
      ${[16, 40, 64, 86].map((x, i) => `<ellipse cx="${x}" cy="${i % 2 ? 24 : 16}" rx="8" ry="5" fill="${c}"/>`).join('')}` },

  // ---------- Organisms ----------
  { id: 'mouse', name: 'Mouse', cat: 'Organisms', tags: 'rodent animal model murine', color: '#b8b8b8', vb: [100, 60],
    draw: (c) => `<path d="M80 40 C92 44 98 56 90 58" stroke="${D(c)}" stroke-width="2" fill="none"/>
      <path d="M14 34 C18 14 46 8 64 14 C82 20 86 38 80 46 C72 54 30 54 20 48 C10 46 2 42 2 38 C4 34 10 34 14 34 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.2"/>
      <circle cx="26" cy="16" r="9" fill="${L(c, 0.3)}" stroke="${D(c)}" stroke-width="2"/><circle cx="26" cy="16" r="5" fill="#f0b6b6"/>
      <circle cx="14" cy="30" r="2.5" fill="#222"/><circle cx="3" cy="38" r="2" fill="#e88"/>
      <path d="M30 50 v6 M62 50 v6" stroke="${D(c)}" stroke-width="3" stroke-linecap="round"/>` },
  { id: 'zebrafish', name: 'Zebrafish', cat: 'Organisms', tags: 'fish animal model', color: '#e0c060', vb: [100, 40],
    draw: (c) => `<path d="M4 20 C20 4 60 4 80 18 L98 6 L94 20 L98 34 L80 22 C60 36 20 36 4 20 Z" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      ${[12, 18, 24].map((y) => `<path d="M24 ${y} H78" stroke="#3a5ab0" stroke-width="2.2"/>`).join('')}<circle cx="13" cy="18" r="2.5" fill="#222"/>` },
  { id: 'fly', name: 'Fruit fly', cat: 'Organisms', tags: 'drosophila insect', color: '#c9a36a',
    draw: (c) => `<ellipse cx="30" cy="35" rx="26" ry="14" fill="#cfe3f5" opacity=".8" stroke="#8aa" transform="rotate(-25 30 35)"/>
      <ellipse cx="70" cy="35" rx="26" ry="14" fill="#cfe3f5" opacity=".8" stroke="#8aa" transform="rotate(25 70 35)"/>
      <ellipse cx="50" cy="66" rx="13" ry="22" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <circle cx="50" cy="38" r="11" fill="${c}" stroke="${D(c)}" stroke-width="2"/><circle cx="43" cy="34" r="4" fill="#c22"/><circle cx="57" cy="34" r="4" fill="#c22"/>
      <path d="M40 62 h20 M39 70 h22 M41 78 h18" stroke="${D(c)}" stroke-width="2"/>` },
  { id: 'plant', name: 'Plant (Arabidopsis)', cat: 'Organisms', tags: 'leaf seedling', color: '#4caf50',
    draw: (c) => `<path d="M50 96 V30" stroke="${D(c)}" stroke-width="3"/>
      <path d="M50 60 C30 60 14 46 12 30 C32 30 48 44 50 60 Z M50 46 C70 46 86 32 88 16 C68 16 52 30 50 46 Z M50 30 C42 20 44 8 50 2 C56 8 58 20 50 30 Z" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <path d="M30 96 h40" stroke="#8a6a3a" stroke-width="4"/>` },
  { id: 'human', name: 'Human', cat: 'Organisms', tags: 'patient person subject', color: '#6b8fb3', vb: [50, 100],
    draw: (c) => `<circle cx="25" cy="12" r="10" fill="${c}"/><path d="M10 26 H40 C44 26 46 30 46 34 V58 H38 V96 H28 V62 H22 V96 H12 V58 H4 V34 C4 30 6 26 10 26 Z" fill="${c}"/>` },

  // ---------- Lab ----------
  { id: 'pipette', name: 'Micropipette', cat: 'Lab', tags: 'pipettor liquid handling', color: '#4a7fd6', vb: [40, 100],
    draw: (c) => `<rect x="12" y="2" width="16" height="8" rx="3" fill="${D(c)}"/>
      <path d="M8 10 H32 V52 C32 58 26 60 24 64 H16 C14 60 8 58 8 52 Z" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <rect x="28" y="22" width="8" height="12" rx="2" fill="${L(c)}"/>
      <path d="M16 64 H24 L21 98 H19 Z" fill="#f0f0f0" stroke="#999" stroke-width="1.5"/>` },
  { id: 'tube', name: 'Test tube', cat: 'Lab', tags: 'sample', color: '#5bb5e0', vb: [40, 100],
    draw: (c) => `<path d="M8 4 H32 V82 C32 98 8 98 8 82 Z" fill="#f4f8fb" stroke="#7a8a96" stroke-width="2.5"/>
      <path d="M9.5 50 H30.5 V82 C30.5 96 9.5 96 9.5 82 Z" fill="${c}" opacity=".85"/><rect x="5" y="2" width="30" height="6" rx="2" fill="#7a8a96"/>` },
  { id: 'eppendorf', name: 'Microcentrifuge tube', cat: 'Lab', tags: 'eppendorf sample', color: '#e8c04a', vb: [50, 100],
    draw: (c) => `<path d="M40 10 C52 10 52 24 40 24" stroke="#8a96a0" stroke-width="2.5" fill="none"/>
      <rect x="6" y="6" width="36" height="10" rx="3" fill="#e9eef2" stroke="#8a96a0" stroke-width="2"/>
      <path d="M8 16 H40 V54 L27 96 H21 L8 54 Z" fill="#f4f8fb" stroke="#8a96a0" stroke-width="2"/>
      <path d="M9.5 58 H38.5 L26 94 H22 Z" fill="${c}" opacity=".85"/>` },
  { id: 'flask', name: 'Erlenmeyer flask', cat: 'Lab', tags: 'culture media conical', color: '#7bc96f',
    draw: (c) => `<path d="M38 4 H62 M40 4 V34 L12 88 C10 94 14 96 18 96 H82 C86 96 90 94 88 88 L60 34 V4" fill="#f4f8fb" stroke="#7a8a96" stroke-width="2.5"/>
      <path d="M26 62 H74 L86 88 C87 92 85 94 82 94 H18 C15 94 13 92 14 88 Z" fill="${c}" opacity=".85"/>` },
  { id: 'beaker', name: 'Beaker', cat: 'Lab', tags: 'glassware', color: '#8fb8e8', vb: [80, 100],
    draw: (c) => `<path d="M8 6 H72 V90 C72 94 70 96 66 96 H14 C10 96 8 94 8 90 Z" fill="#f4f8fb" stroke="#7a8a96" stroke-width="2.5"/>
      <path d="M10 46 H70 V90 C70 93 68 94 66 94 H14 C12 94 10 93 10 90 Z" fill="${c}" opacity=".8"/>
      <path d="M8 26 h10 M8 46 h10 M8 66 h10" stroke="#7a8a96" stroke-width="2"/>` },
  { id: 'petri', name: 'Petri dish', cat: 'Lab', tags: 'agar plate culture colony', color: '#e8d08a', vb: [100, 50],
    draw: (c) => `<ellipse cx="50" cy="30" rx="46" ry="16" fill="${c}" stroke="#7a8a96" stroke-width="2.5"/>
      <path d="M4 30 V36 C4 46 96 46 96 36 V30" fill="#e9eef2" stroke="#7a8a96" stroke-width="2.5"/>
      ${[[30, 26], [56, 32], [70, 24], [42, 34], [60, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${D(c, 0.4)}"/>`).join('')}` },
  { id: 'wellplate', name: '96-well plate', cat: 'Lab', tags: 'microplate elisa assay', color: '#5fa8d3', vb: [100, 68],
    draw: (c) => { let s = `<rect x="2" y="2" width="96" height="64" rx="4" fill="#eef2f5" stroke="#7a8a96" stroke-width="2.5"/>`;
      for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) s += `<circle cx="${10 + k * 7.3}" cy="${9 + r * 7.2}" r="2.8" fill="${(r + k) % 3 ? L(c, 0.2 + ((r * k) % 5) / 8) : c}"/>`;
      return s; } },
  { id: 'microscope', name: 'Microscope', cat: 'Lab', tags: 'imaging optics', color: '#4d5b6b', vb: [80, 100],
    draw: (c) => `<rect x="10" y="88" width="60" height="10" rx="3" fill="${c}"/>
      <path d="M50 88 V60 C62 60 66 40 54 30" stroke="${c}" stroke-width="8" fill="none"/>
      <rect x="22" y="58" width="36" height="6" fill="${L(c, 0.3)}"/>
      <rect x="28" y="6" width="12" height="40" rx="3" fill="${c}" transform="rotate(-25 34 26)"/>
      <rect x="31" y="44" width="8" height="10" fill="${D(c)}"/>` },
  { id: 'centrifuge', name: 'Centrifuge', cat: 'Lab', tags: 'spin equipment', color: '#6b8fb3', vb: [100, 70],
    draw: (c) => `<rect x="4" y="16" width="92" height="50" rx="8" fill="${c}" stroke="${D(c)}" stroke-width="2"/>
      <ellipse cx="50" cy="16" rx="40" ry="10" fill="${L(c, 0.4)}" stroke="${D(c)}" stroke-width="2"/>
      <rect x="62" y="34" width="24" height="12" rx="2" fill="#1f2a36"/><circle cx="20" cy="42" r="5" fill="#6fd16f"/>` },
  { id: 'syringe', name: 'Syringe', cat: 'Lab', tags: 'injection needle dose', color: '#5fa8d3', vb: [100, 30],
    draw: (c) => `<path d="M0 15 H10" stroke="#888" stroke-width="1.5"/><rect x="10" y="12" width="10" height="6" fill="#bbb"/>
      <rect x="20" y="6" width="54" height="18" rx="2" fill="#f4f8fb" stroke="#7a8a96" stroke-width="2"/>
      <rect x="21" y="7.5" width="30" height="15" fill="${c}" opacity=".8"/>
      <path d="M74 15 H92 M92 6 V24 M98 6 V24" stroke="#7a8a96" stroke-width="3"/>` },
  { id: 'gel', name: 'Gel / blot', cat: 'Lab', tags: 'western electrophoresis bands', color: '#3a3f6b', vb: [100, 80],
    draw: (c) => { let s = `<rect x="2" y="2" width="96" height="76" rx="3" fill="${L(c, 0.85)}" stroke="#7a8a96" stroke-width="2"/>`;
      [16, 34, 52, 70, 86].forEach((x, i) => { s += `<rect x="${x - 6}" y="6" width="12" height="4" fill="#7a8a96"/>`; [22, 38, 56].forEach((y, j) => { if ((i + j) % 4) s += `<rect x="${x - 7}" y="${y + i}" width="14" height="${3 + ((i * j) % 3)}" rx="1.5" fill="${c}" opacity="${0.4 + ((i + j) % 3) / 4}"/>`; }); });
      return s; } },
  { id: 'computer', name: 'Computer / analysis', cat: 'Lab', tags: 'data sequencing bioinformatics', color: '#4d5b6b', vb: [100, 80],
    draw: (c) => `<rect x="6" y="4" width="88" height="56" rx="4" fill="${c}"/><rect x="11" y="9" width="78" height="46" fill="#eaf3fb"/>
      <path d="M16 46 L30 30 L42 38 L56 18 L70 30 L84 14" stroke="#e05a5a" stroke-width="2.5" fill="none"/>
      <path d="M40 60 L36 72 H64 L60 60" fill="${D(c, 0.1)}"/><rect x="28" y="72" width="44" height="5" rx="2" fill="${c}"/>` },

  // ---------- Symbols ----------
  { id: 'lightning', name: 'Stimulus', cat: 'Symbols', tags: 'lightning activation signal', color: '#f2c14e',
    draw: (c) => `<path d="M58 2 L18 56 H46 L36 98 L84 38 H54 Z" fill="${c}" stroke="${D(c)}" stroke-width="2.5" stroke-linejoin="round"/>` },
  { id: 'phospho', name: 'Phosphate (P)', cat: 'Symbols', tags: 'phosphorylation ptm', color: '#f2c14e',
    draw: (c) => `<circle cx="50" cy="50" r="44" fill="${c}" stroke="${D(c)}" stroke-width="3"/><text x="50" y="66" text-anchor="middle" font-family="Helvetica, Arial" font-weight="700" font-size="48" fill="${D(c, 0.6)}">P</text>` },
  { id: 'cross', name: 'Blocked', cat: 'Symbols', tags: 'x inhibition knockout', color: '#d64545',
    draw: (c) => `<path d="M14 14 L86 86 M86 14 L14 86" stroke="${c}" stroke-width="16" stroke-linecap="round"/>` },
  { id: 'check', name: 'Check', cat: 'Symbols', tags: 'tick success', color: '#3fa55b',
    draw: (c) => `<path d="M10 54 L38 82 L92 18" stroke="${c}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { id: 'clock', name: 'Time / incubation', cat: 'Symbols', tags: 'timer hours', color: '#4d5b6b',
    draw: (c) => `<circle cx="50" cy="50" r="42" fill="#fff" stroke="${c}" stroke-width="6"/><path d="M50 22 V50 L70 62" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>` },
  { id: 'thermo', name: 'Temperature', cat: 'Symbols', tags: 'heat thermometer', color: '#d64545', vb: [40, 100],
    draw: (c) => `<rect x="12" y="4" width="16" height="66" rx="8" fill="#fff" stroke="#7a8a96" stroke-width="3"/><circle cx="20" cy="80" r="15" fill="${c}" stroke="#7a8a96" stroke-width="3"/><rect x="16" y="30" width="8" height="48" fill="${c}"/>` },
];

const ICON_MAP = Object.fromEntries(ICONS.map((i) => [i.id, i]));

function iconSvgInner(id, color) {
  const ic = ICON_MAP[id];
  if (!ic) return '';
  return ic.draw(color || ic.color);
}

function iconViewBox(id) {
  const ic = ICON_MAP[id];
  const [w, h] = (ic && ic.vb) || [100, 100];
  return { w, h };
}
