# SciCanvas

A desktop app (Electron) for building scientific figures, modelled on BioRender's workflow:
library → canvas → relationships → data → review → export.

## Version 1.2

**Latest: [SciCanvas](https://github.com/AbdulmateenAderinto/SciCanvas/releases/latest)**: ready-made installers for Windows, Apple-silicon Macs and Intel Macs (see *Download* below).

**New in 1.2**
- **The whole NIH BioArt collection built in**: 4,821 images from all 958 entries of NIAID's BioArt Source (bioart.niaid.nih.gov), in every version BioArt offers (colours, black and white, views), so a search shows all of them next to the other libraries. They're public domain except the Human Reference Atlas images (CC BY); File › Credits adds NIH's credit line.
- **Organs drawn from professional medical artwork**: 75 organ, tissue and disease icons now use Servier Medical Art, Reactome and DBCLS illustrations (heart, lungs, brain, liver, kidney, gut, glands, bones, vessels, disease views such as infarct, stroke, pneumonia, aneurysm, DVT and pulmonary embolism), plus new Larynx, Aorta, Heart conduction system, Pulmonary embolism and Brain (horizontal section) icons. Classic icon style keeps the earlier drawings.
- **One shaded finish for every built-in icon**, matching the reference illustrations (Classic turns it off).
- **About 26,800 icons in all**: 2,154 built-in, the four icon libraries (about 19,900) and NIH BioArt (4,821).

**New in 1.1**
- **130 new icons** in 9 new soft-style groups: neuroscience (neuron types, synapse, myelin, brain views, retina), heart & circulation (four-chamber heart, plaque, clot, stent, ECG), channels, pumps & transporters (Na⁺/K⁺ channels and pumps, aquaporin, GLUT, ABC transporter, ATP synthase, junctions, endo-/exocytosis), metabolism & small molecules (skeletal structures of pyruvate, lactate, acetyl-CoA, glutamate, GABA, dopamine, serotonin, acetylcholine, testosterone; NADH, insulin, ions, enzyme–substrate), cell division & cell fate (every mitosis stage, crossing over, necrosis, migration, phagocytosis), tissues (epithelia, bone, cartilage, muscle, villus, alveoli, nephron, liver lobule, islet), people & places, data & computing, and environment & ecology.
- **104 clinical icons** in 4 more groups: organs & body systems (8 whole-body system views, lungs, heart exterior, oesophagus, thymus, pituitary, ear, tongue, skull, vertebra, rib cage, pelvis, hand bones, biliary tree, kidney cross-section), diseases & pathology (40: fatty / cirrhotic liver, tumours, emphysema, pneumonia, asthma, MI, aneurysm, DVT, varicose veins, ischaemic / haemorrhagic stroke, Alzheimer's, amyloid & tau, MS, Lewy body, kidney stones, PKD, UTI, ulcer, IBD, polyp, appendicitis, gallstones, coeliac, OA, RA, osteoporosis, fracture, psoriasis, melanoma, burn, cataract, diabetic retinopathy, goitre, type 1 diabetes, abscess, inflammation, malaria, caries), clinical procedures & imaging (30: X-ray, CT, ultrasound, endoscope, cannula, sutures, biopsy, vaccine, AED, oxygen, ventilator, oximeter, glucose meter, dialysis, mobility aids, ambulance, swab, rapid test, EHR, telehealth) and histopathology (11 microscope fields: H&E, dysplasia, carcinoma, granuloma, fibrosis, necrosis, IHC, blood smear, Gram stain, Pap smear, immunofluorescence).
- **All ~21,700 icons built in**: the installers now include the four icon libraries (Bioicons, Reactome, Health Icons, PhyloPic), so nothing extra to download.
- **Snapping**: resizing snaps to the width / height of other objects (shown with matching dimension marks), including icons and images that keep their proportions; new shapes snap to existing sizes as you draw; rotation locks onto 0°, 45°, 90°… and onto other tilted objects' angles, with an angle readout; lines, arrows and connectors straighten near 0° / 45° / 90°. Hold ⌘ (Ctrl on Windows) to turn snapping off; Shift still gives 15° rotation steps.
- **Smoother**: dragging and resizing redraw only what moves, clicking to select no longer rebuilds the Layers list, and the icon library draws fewer thumbnails up front and loads more as you scroll. On a busy test page (636 objects): moving one icon ~4.7 → ~2 ms per step, moving everything ~19 → ~10 ms, typing in icon search ~61 → ~36 ms per key.

SciCanvas 1.0 brings together everything built so far: drawing and design tools (v0.8), about 21,500 icons (including 1,500 soft-style icons) with new soft-style sets for anatomy, microbes, model organisms, plants, lab and clinical items, graphs with publication-grade statistics (follow-up tests, curve fitting, ROC, contingency tables, regression, factorial ANOVA), a diagram builder with 19 diagram types and flowcharts from Mermaid / JSON / steps, templates, a journal-figure checker, and AI drafting from your own PDFs, Word files, slides and tables. The sections below describe each release in detail.

## New design tools (next release)

- **Fill editor** (Properties › Fill editor): gradients with any number of colours and per-colour opacity, linear at any angle or radial, dragged directly on the canvas; presets (fade to transparent, cytoplasm, hypoxic core, viridis…); fill opacity; patterns (stripes, dots, crosshatch, hatch, checks, grid, waves, bricks) and generated textures (cytoplasm granules, collagen / ECM fibres, stroma, nuclear chromatin, lipid droplets, bone trabeculae, grain). Patterns and textures export as vectors.
- **One light source**: with nothing selected, Properties › Lighting sets the light direction for the whole figure; every shading style and drop shadow follows it.
- **Warp, perspective and isometric**: arc, arch, bulge, flag, wave, fish-eye, twist, squeeze and rise warps; free distort and perspective with four corner handles; one-click isometric top / left / right planes, floor and walls; View › Isometric Grid. Warps stay editable; text and photos move with the plane as rigid pieces.
- **Cutaway**: wedge or straight cuts (or cut with your own shape) through a cell, organ or tumour, with a cut face and an optional inside colour.
- **Path tools** (Arrange › Path): offset path, outline stroke (keeps width profiles), knife, scissors, join / close (⌘J), simplify, smooth, round corners; rectangles can have a different radius on each corner.
- **Typography**: letter spacing, line height, paragraph spacing, text boxes that wrap words, columns, justify, wrap around objects, vertical alignment, small caps and number styles. Typing `\alpha`, `\mu`, `\deg`, `->`, `<=>`, `+/-` then a space gives α, μ, °, →, ⇌, ±.
- **Labels that stay attached**: Arrange › Label Selected Objects names every selected icon in tidy columns with leader lines (straight, elbow or curved) that follow the objects when they move.
- **Graphic styles**: save a whole look (fill, gradient, pattern, outline, shading, effects, text formatting) as a named style, apply it in one click, and update every linked object at once (Arrange › Graphic Styles…).
- **Selection and navigation**: lasso (Q), ⌥⌘-click to select the object behind, select same fill / outline / effects / font / graphic style, View › Zoom to Selection (⌘2) and a mini-map.
- **Layout grids**: per-page columns and rows with gutters and margins, including Nature / Cell, Science and PNAS column presets; objects snap to columns and whole-column widths. Never exported.
- **More effects**: inner glow, halo outline (keeps labels readable over images), grain, depth-of-field blur, and background blur for frosted panels.

## Download

Get the installer from the [latest release](https://github.com/AbdulmateenAderinto/SciCanvas/releases/latest) (also linked under **Releases** on the right of the GitHub page):

- **Windows**: `SciCanvas-Setup-<version>.exe`. Double-click to install. Windows may show "Windows protected your PC" because the app isn't signed with a paid certificate: click **More info → Run anyway**.
- **Mac**: `SciCanvas-<version>-arm64.dmg` for Apple-silicon Macs (M1 and later) or `-x64.dmg` for Intel Macs. Open it and drag SciCanvas to Applications. The first time, right-click the app and choose **Open** (or allow it under System Settings › Privacy & Security), because it isn't notarised by Apple.

From 1.2 the installers include about 26,800 icons: the 2,154 built-in ones, the four icon libraries (about 19,900) and NIH BioArt (4,821), so they're big downloads (several hundred MB). Library updates can still be installed from **Insert › Icon Libraries…** in the app.

## Run (from the source code)

```bash
npm install
npm start
```

If `npm start` says *"Electron failed to install correctly"*, newer npm versions blocked Electron's download script. Finish the install once with:

```bash
npm run setup
```

Icon libraries live in `assets/iconpacks/` (about 640 MB in total). Reinstall or update them with `npm run icons`, or from **Insert › Icon Libraries…** inside the app.

## Publishing a release

Anyone with write access to the repo can publish; GitHub builds the installers (`.github/workflows/build.yml`).

1. Bump `"version"` in `package.json` and `package-lock.json` (for example `npm version 1.0.2 --no-git-tag-version`) in a pull request and merge it once its checks pass. Pull requests that touch `package.json` also run a test build of every installer.
2. On GitHub: **Releases › Draft a new release**. Type the tag (`v1.0.2`, matching the version), choose **Create new tag** on `main`, add a title and notes, and click **Publish release**.
3. A few minutes later the Windows `.exe` and both Mac `.dmg` files appear on the release (progress is under the **Actions** tab). Each build is started once as a smoke test before it's attached.

Only releases whose tag starts with `v` (like `v1.1.0`) get installers; others, such as the `icon-libraries` release, are left alone. The build downloads the icon libraries from that `icon-libraries` release (`iconpacks.tar.gz`) and puts them inside the installers. To refresh them: run `npm run icons`, then `COPYFILE_DISABLE=1 tar -czf iconpacks.tar.gz -C assets iconpacks` (on a Mac, `COPYFILE_DISABLE=1` keeps hidden `._` files out) and replace the file on that release.

NIH BioArt is a second file on the same release, `bioart.tar.gz`, built from a downloaded copy of the whole BioArt collection (a folder of `BIOART-…` entry folders plus `catalog.json` and `file_index.csv`): run `npm run icons:bioart -- <collection folder>` (AI/EPS conversion needs `pdftocairo` and Ghostscript), then `COPYFILE_DISABLE=1 tar -czf bioart.tar.gz -C assets iconpacks/bioart` and add or replace the file on the release. Installers built without it still work, just without BioArt.

## Checks

```bash
npm run lint   # ESLint
npm test       # unit tests: statistics (checked against SciPy), every chart type, diagrams and templates, chemical-formula text
```

Both run on every push and pull request via GitHub Actions (`.github/workflows/ci.yml`).

## Icon libraries (~21,700 icons)

| Library | Icons | Licence | Content |
|---|---|---|---|
| Built-in | 1,801 | — | Core cells, molecules, lab and anatomy, plus about 1,650 soft-style proteins, complexes, cells, microbes, organisms, lab items, neuroscience, transporters, molecules, tissues, organs, diseases, clinical procedures, histopathology, people and environment (drawn in code, no download needed) |
| Bioicons | 2,793 | CC0 / CC BY / CC BY-SA | General life science |
| Reactome | 2,569 | CC BY 4.0 | Proteins, receptors, transporters, compounds, cell types, tissues |
| Health Icons | 1,498 | MIT | Body, devices, diagnostics, medications, people |
| PhyloPic | 13,038 | mostly CC0 / CC BY; 751 non-commercial (marked **NC**) | Organism silhouettes across the tree of life |
| My icons | unlimited | yours | Your drawings and AI-generated icons |

Searching "mouse" also finds *Mus musculus*, because common names map to the scientific names PhyloPic uses. BioRender's own library is proprietary and can't be imported.

## Features (v0.2)

**Library**
- 51 built-in icons plus 2,793 Bioicons (CC0 / CC BY / CC BY-SA), with ranked search across all of them.
- Categories, favourites (☆), recently used, and a research-field setting that boosts relevant results.
- SVG uploads become recolourable icons. PNG/JPG uploads go to Uploads.

**Drawing**
- Pencil (D): smoothed freehand drawing. End near the start and it becomes a filled, shaded shape.
- Pen (P): Bézier paths. Click for corners, drag for curves, click the first point to close, Enter to finish.
- Line (L) and Arrow (A), with Shift for 45° angles. Arrowheads can be arrow, open, bar or dot, at either end.
- Shading airbrush (W): soft, blurred strokes for painting shadows and highlights over icons.
- Point editing: double-click any drawing to drag points and handles (Alt for sharp corners), click + to add a point, Delete to remove one, double-click a point to switch smooth/corner.
- Shading styles: Flat, Soft 3-D, Glossy, Top-lit, Inner shadow, Rim light. They work on drawings, shapes, rectangles and ellipses.
- Convert to path: turn rectangles, ellipses and polygon shapes into editable drawings.
- Save as icon: any selection becomes a reusable icon in "My icons".
- Create icon with AI: describe it and choose a style (shaded, flat, line art or textbook) to get 3 editable vector options.

**Arranging & alignment**
- Smart guides while dragging: pink lines show edge and centre alignment, purple labels show distances to neighbours, and objects snap to equal spacing. Resizing also snaps edges and shows the size.
- Floating context bar above the selection: front, forward, backward, back, align, flip, group, duplicate, lock, delete.
- Right-click menu, plus an **Arrange** menu: z-order (⌘] / ⌘[, add ⇧ for front/back), align, distribute, match size, flip (⇧H / ⇧V), group, lock (⌘L) / unlock all (⇧⌘L), hide / show all, and guide toggles.
- Layers panel: drag rows to restack, 👁 to hide, 🔒 to lock, double-click to rename, ▸ to see inside groups, Shift / ⌘-click to multi-select.

**Performance**
- GPU rasterisation enabled (Settings shows the graphics status).
- Each object only redraws when it changes, and drag updates are batched to the display's refresh rate. Dragging a figure with ~60 objects went from ~56 fps to the display's full 120 Hz.
- Blur and glow effects are skipped while panning or zooming, then restored.

**Icon editing**
- Colour (built-ins) or tint overlay (library icons).
- Colour layers: recolour or hide each distinct colour in an icon, e.g. a transparent nucleus.
- Replace an icon in place, keeping its size and position.

**Canvas**
- Move, resize, rotate, multi-select, align and distribute, z-order, lock, layers panel, undo.
- Group and ungroup, and double-click a group to edit inside it.
- Grid, snap to grid, smart alignment, and rulers with draggable guides.

**Drawing**
- Shapes: triangle, diamond, hexagon, star, block arrow, chevron, cylinder, cloud, plus, capsule. They take labels and gradient fills.
- Numbered badges: each click places the next number.
- Text with ^{superscript} and _{subscript}.

**Effects**
- Glow (fluorescence), drop shadow.
- Circle or rounded crop with a border, for zoom-in callouts.
- Image cropping.

**Connectors**
- Stay attached to objects when they move. Drop an end on one of the four side dots to pin it to that side; elbow routes leave and enter at right angles.
- Arrow, inhibition, binding or open heads; straight, curved or elbow paths; verb labels.

**Brushes**
- Lipid bilayer, DNA, actin, cell layer and vesicles, drawn freehand or along a line, arc or ellipse.

**Templates**
- Pathway, in vivo workflow, graphical abstract, comparison, poster, title slide, cell cycle, mouse timeline, decision flowchart.
- Searchable. Each opens as a new page, replaces the current page, or is added to it as a group.

**Protocols**
- Auto-numbered steps that re-wrap when resized, with presets for ELISA, western blot, RT-qPCR, flow cytometry, cytotoxicity, CRISPR and immunohistochemistry.

**Graphing**
- Bar, box, scatter with linear regression, line, dose–response (4PL fit with EC50), Kaplan–Meier survival (log-rank test) and heatmaps.
- Tests: Welch / paired t-test, Mann–Whitney, ANOVA with Holm-corrected post-hoc brackets.
- Possible outliers are flagged for investigation, not excluded.

**Structures**
- PDB: interactive 3D view with styles and colour schemes, inserted as a snapshot.
- PubChem: 2D structure from a compound name or SMILES string.

**AI drafting** (⌘K)
- Describe a figure and optionally attach a reference sketch. You get an editable draft (icons, panels, labels, arrows) and can request revisions.
- Uses Claude Opus 5.5 with your Anthropic API key, which is entered in Settings and encrypted with the OS keychain.

**Review**
- Comments pinned to the canvas, with replies and resolve. They're saved in the `.scifig` file and never exported.

**Presentations and posters**
- Multiple pages, fullscreen presenter (⌘↵), and Home › Poster / Presentation starters.

**Export**
- PNG/JPEG at up to 600 DPI (written into the file), transparent PNG, SVG, multi-page vector PDF, and PowerPoint (.pptx).
- PowerPoint export is editable: shapes, text, tables, drawn paths and groups become native PowerPoint objects, and arrows become connectors glued to the shapes they join, so they follow when you move things on the slide. Icons, brushes, charts and protocol strips go in as vector SVG pictures (right-click › Convert to Shape in PowerPoint to edit them). Choose "Picture of each page" for an exact, non-editable copy.
- Option to export only the current selection.
- Copy as image (⇧⌘C) for pasting into slides.

**Credits**
- File › Credits lists every library icon used, with its licence, and drafts the attribution text for your figure legend.

**Home**
- New-figure types and recent files with thumbnails.


## New in v0.6: soft-style icons

**About 1,000 soft-style icons** (library › **Soft** chip), drawn from code in one consistent style: flat fills, darker same-colour outlines, and rounded protein "tubes" and blobs. Everything is recolourable, and each colour layer can be edited.
- **Protein shapes**: hook, Ω, C-shape, oval adaptor, bean, globular, kinase (bilobed), dumbbell, 4-helix bundle, dimer / trimer / tetramer, LRR horseshoe, WD40 β-propeller, hexameric ring, Y-shape, cullin scaffold, open-cleft enzyme, β-trefoil, chemokine, coiled coil, TF on DNA, and membrane receptors (1–4 Ig domains, dimers, TNFR, RTK, GPCR, cytokine receptor + JAK, TLR, C-type lectin, integrin, cadherin, channel), plus shape variants.
- **Ubiquitin & degradation**: ubiquitin and K48 / K63 / branched chains, polyubiquitinated substrate, 26S / 20S proteasome, fragments, E1 / E2 ~Ub, cullin-RING ligase, CTLH complex (also with FAM72A–UNG2, and ubiquitinating UNG2), PROTAC (molecule and ternary complex), molecular glue, autophagosome, lysosome. Over 150 named E2s, E3s, DUBs, autophagy and proteasome proteins.
- **Immunology**: soft IgG / IgM / IgA / Fab / F(ab′)₂ / scFv / VHH / Fc / bispecific / BiTE / ADC / CAR, TCR–CD3, BCR, MHC I and II with peptide, TCR–pMHC synapse, PD-1 / PD-L1, perforin pore, inflammasome. About 200 named receptors and CD markers, 110 cytokines, chemokines and complement proteins, and 110 signalling proteins including AID, UNG2 and DNA repair.
- **Cancer**: about 200 named drivers, suppressors, kinases, apoptosis, metabolism and epigenetic proteins, ADC and CAR-T targets, therapeutic antibodies and small-molecule drugs.
- **Cells**: 90 soft-style cells, including T-cell subsets, CAR-T, exhausted T cells, B and plasma cells, NK cells, macrophage subsets, DCs, granulocytes, MDSC, tumour cells (including PD-L1+ and MHC-I+), CAFs and tissue cells.

- **DNA & chromatin** (about 125): DNA damage (DSB, nick, AP site, UV dimer, mismatch), repair complexes on DNA (Ku, MRN, RAD51 filament, MutSα, PCNA, UNG base flipping, NER), replication fork and origin, transcription bubble and initiation, enhancer–promoter loop, cohesin, CTCF, nucleosome arrays, heterochromatin, histone and CpG methylation marks, R-loop, G-quadruplex, Holliday junction, supercoiling and topoisomerase, telomere T-loop, AID on ssDNA, V(D)J recombination, class switch recombination, somatic hypermutation, CRISPR–Cas9 / Cas12a / base and prime editors / CRISPRi / CRISPRa, restriction enzyme, ligase, PCR, primers, transposon, provirus, gene structure, mRNA, ribosome, tRNA, siRNA, miRNA, chromosomes, plus about 70 named DNA-binding and chromatin proteins.
- **Flow cytometry** (about 57): dot / quadrant / contour plots with gates, histogram overlay, CFSE, gating strategy, flow cell with laser, cytometer, FACS sorting, labelled cell, compensation bead, CyTOF metal-tagged antibody, viability, 24 fluorochromes, 12 fluorescent proteins and luciferases, and antibody–fluorochrome conjugates.
- **Antibody discovery** (about 19): lab, immunised, xenograft and humanised mice, spleen, B cell–myeloma fusion, hybridoma, antibody-secreting cell, monoclonal vs polyclonal, HAT selection, limiting dilution, ELISA plate and sandwich well, ELISpot, protein A column, phage and yeast display, antigen-specific B-cell sorting.
- **Lab methods & engineering** (about 47): plasmid, lentivirus, retrovirus, AAV, adenovirus, transduction, LNP and mRNA–LNP, electroporation, lipofection, CRISPR RNP, knockout and knock-in, GFP and luciferase reporter cells, Yamanaka factors, iPSC reprogramming, organoid, spheroid, pooled CRISPR screen, sgRNA library, antibiotic selection, CD3/CD28 beads, MACS, leukapheresis, infusion and bioreactor bags, flask, cryovial, dewar, incubator, hood, tubes, thermocycler, sequencer, reads, gel, western blot, multichannel pipette, microfluidic chip, single-cell droplet, barcoded bead, exosome, colonies, haemocytometer.

**Soft protein pencil**: choose **Soft protein** in the pencil options. A stroke becomes a rounded, outlined protein tube; the width slider sets its thickness and the fill swatch its colour. Closing a loop gives a smooth outlined blob. Use it to sketch a custom subunit such as FAM72a, then use Save as icon to reuse it. Any open drawing can be switched to "Soft protein tube" in Properties.

## Immunology & cancer toolkit

**Soft icon set (88 icons)**: one consistent BioRender-style look (flat fill, thin darker outline, rounded ends) in the library under the **Soft** chip. *Soft · Protein shapes*: globular, C, S, U, Y-scaffold, bean, rod, two-domain, dimer, trimer, C-pair, helical bundle, unfolded chain, labelled adaptor oval, complex halo, kinase, enzyme, receptors, GPCR, channel. *Soft · Ubiquitin & degradation*: ubiquitin, polyubiquitin, tagged substrate, E1 / E2 / E3, cullin–RING ligase, 26S and 20S proteasome, degraded peptides, SUMO, DUB, autophagosome, lysosome, chaperone, PTM marks. *Soft · Immunology*: IgG, Fab, IgM, IgA, BCR, TCR–CD3, MHC I / II with peptide, CD4, CD8, PD-1, PD-L1, CTLA-4, CD28 / B7, cytokines, chemokine, cytokine receptor + JAK, STAT dimer, TLR, Fc receptor, MAC pore, perforin / granzyme, inflammasome, AID, UNG, class-switch recombination, T / B / plasma / dendritic / NK cells, macrophage, neutrophil, germinal centre. *Soft · Cancer*: tumour cell, mitosis, metastatic and apoptotic cells, CAF, CAR-T cell, CAR construct, BiTE, ADC, spheroid, tumour mass, kinase inhibitor, RAS, p53, DNA break, mutation, mouse with tumour; plus a flow cytometer. Every icon is recolourable, with colour layers.

**Protein shapes**: Insert › Protein Shape… builds an editable outlined protein (globular, bean, oval, C, S, U, J, crescent, rod, unfolded chain) with thickness, bulge, an optional lighter partner subunit and a label tag. Arrange › Make Protein Shape turns any pencil stroke into an outlined tube (or gives a closed drawing the soft style). Arrange › Add Lighter Partner Subunit and Arrange › Degrade into Fragments (also in the right-click menu under Biology).

**Coloured words**: select words in a text box or shape label and colour, bold or italicise just those (Properties › Selected words). Stored as `{#d64545|words}`, `{b|words}`, `{i|words}`, so it survives copy, templates and export.

**Brush**: ubiquitin / bead chain.

**Templates** (Immunology & cancer): 3-step mechanism panels (adaptor-mediated degradation), ubiquitin–proteasome pathway, immune synapse, class-switch recombination & SHM, tumour microenvironment, cancer–immunity cycle, CAR-T workflow, ADC mechanism, JAK–STAT, flow cytometry gating strategy, in vivo tumour model timeline.

**Data**
- Insert › Flow Cytometry Plot (FCS)…: reads FCS 2.0–3.1 list-mode files (or a CSV of channel values), pseudocolour density, dot or histogram plots, linear / log / arcsinh axes, and rectangle, range and quadrant gates drawn by dragging, with percentages.
- Graph › Tumour growth: per-mouse curves plus group mean ± error, endpoint statistics and tumour growth inhibition (TGI) against the first group.
- Insert › Western Blot Quantification…: box the target and loading-control bands on a blot image, get per-lane densitometry with local background subtraction, normalised ratios, a copyable table and a bar chart with statistics.
- Insert › Protein Domain Map…: domains and modification sites (P, Ub, Ac, Me, glycosylation, mutations) drawn to scale with an amino-acid axis.

## New in v0.9: statistics

Every result is checked against SciPy in the automatic tests (`test/fixtures/stats-reference.json`).

**Group comparisons** (bar, box, violin, dot plots): new tests: Student's t / ANOVA (equal variances), Welch's ANOVA (unequal variances), lognormal t / ANOVA (on log values, reported as geometric-mean ratios), and one-sample t, Wilcoxon and ratio tests against a value you choose. **Follow-up comparisons** after a significant overall test: Tukey (Tukey–Kramer), Dunnett (each group vs the first), Bonferroni, Šídák, Games–Howell (unequal variances) and Dunn's (after Kruskal–Wallis), each with adjusted p-values and 95% confidence intervals. Holm-adjusted pairwise tests stay the default, so existing graphs give the same results. The report also gives a Brown–Forsythe equal-variance check, Mauchly's sphericity test with the Greenhouse–Geisser correction for repeated measures, and a choice of outlier check (1.5 × IQR or iterative Grubbs).

**Insert › Statistics & Models** (also in the Graph dialog):
- *Curve fit*: Michaelis–Menten, one-site binding, exponential growth, exponential plateau, logistic and Gompertz growth, one- and two-phase decay, and 3-, 4- and 5-parameter dose–response. Parameters with standard errors and 95% CIs, R², derived values (half-life, doubling time, EC50 / IC50 with CI, any ECx), an optional confidence band, and the extra-sum-of-squares F test for whether datasets need different curves. Replicates are fitted point by point and plotted as mean ± SD.
- *Contingency table*: χ² (optional Yates correction), Fisher's exact test, odds ratio and relative risk with 95% CIs, Cramér's V, and a warning when expected counts are small. Paste counts, or raw one-row-per-subject data and it is cross-tabulated.
- *ROC curve*: AUC with DeLong 95% CI, the Youden-optimal cut-off with its sensitivity and specificity, and the DeLong test between markers measured on the same subjects.
- *Bland–Altman*: bias and 95% limits of agreement with their CIs, optional % difference, and a check for proportional bias.
- *Deming regression*: for two methods that both have measurement error, with jackknife CIs and tests of slope = 1 and intercept = 0.
- *Multiple linear regression*: coefficients with CIs and p-values, R², adjusted R², F test, variance inflation factors, and automatic coding of text columns (e.g. Sex).
- *Three-way (factorial) ANOVA*: 2–4 factors with all interactions (Type III sums of squares), drawn as grouped bars in panels.

## New in v0.9: diagram builder and templates

**Insert › Diagram › Diagram Builder…** (⇧⌘D): type a few lines and get an editable diagram made of ordinary shapes, text, icons and arrows, with a live preview. 19 types:
- *Cycles & processes*: cycle / life cycle (boxes, icons or an arrow ring), radial hub-and-spoke with two levels, process chevrons
- *Hierarchies & layers*: funnel, pyramid (labels move outside slices that are too narrow), concentric layers, hierarchy / flowchart levels / decision tree from indented text (lines ending in ? become decision diamonds; [Yes] labels an arrow)
- *Time*: timeline (line with markers or coloured segments, horizontal or vertical), Gantt chart with milestones
- *Biology*: phylogenetic tree from Newick (rectangular or circular, phylogram or cladogram, clades coloured), food web from "prey -> predator" lines stacked by trophic level, Punnett square with phenotype and genotype ratios, ELISA formats (direct, indirect, sandwich, competitive; colorimetric, fluorescent or chemiluminescent)
- *Clinical*: trial designs (parallel, crossover, 2 × 2 factorial, single-arm, basket, umbrella, platform, 3 + 3 dose escalation), risk matrix (3 × 3 to 5 × 5)
- *Layouts*: figure panels with row and column headings, Venn layout (2–4 sets), callout layout (a subject with circular zoom-ins), 2 × 2 quadrant

**18 new templates**: mRNA delivery by lipid nanoparticle, mRNA vaccine immune response, CRISPR–Cas9 editing, haematopoiesis, EMT, extracellular vesicles, gut–brain axis, bulk and single-cell RNA-seq workflows (with live volcano and UMAP charts), proteomics (LC-MS/MS), machine learning (with a live ROC curve), 2D vs 3D culture, wound-healing phases, antibiotic resistance, hybridoma antibodies, the drug development pipeline, clinical trial phases and 3D bioprinting.

## New in v0.9: AI drafting from your documents

**Attach reference files** in Generate with AI (⌘K) and in the guided planner: PDF papers (sent to Claude as documents, up to 20 MB and 100 pages), Word (.docx), PowerPoint (.pptx, including speaker notes), Excel / CSV / TSV tables, text or Markdown, and images. Choose how to use them: as the source of facts, a **visual summary of a paper** (graphical abstract), **one figure from a set of slides**, a **remake of an image** as an editable figure, or **charts from a table**. Charts made from a table take their numbers straight from the file: Claude only names the columns to plot, so values can't be mistyped or invented.

**Flowchart from Mermaid, JSON or steps** (Insert › Diagram, no AI needed): paste Mermaid flowchart code (shapes, labelled edges, chains, `&` groups, loops), JSON nodes and edges, or numbered steps (`3. Quality OK? | yes -> 4 | no -> 2`). Flowchart layout now keeps each box under its parents, so branches no longer cross other boxes (this also improves AI-generated flowcharts).

## New in v0.9: icons

**194 new soft-style icons in 11 new categories**, all drawn from scratch in the app's own style, recolourable and searchable: organelles & cytoskeleton, membranes / lipids / carbohydrates, nanoparticles & materials, human anatomy, reproduction & development, microbes & viruses, model organisms (mouse, rat, rabbit, pig, dog, cow, chicken, frog, zebrafish, fruit fly, *C. elegans*, mosquito, macaque), plants & agriculture, lab equipment (tubes, plates, pipettes, freezers, plate reader, mass spectrometer, HPLC, bioreactor, bioprinter and more), clinical & pharmacy (tablets, capsules, vials, IV and blood bags, inhaler, insulin pen, stethoscope, hospital bed, MRI) and symbols & callouts. Icons that already existed in the library weren't drawn again. The diagram builder's icon lookup finds the new icons too.

## New in v0.8: design tools from Illustrator, Figma and Canva

**Components with variants** (Figma components, Illustrator symbols): select a protein, cell or labelled group and choose Arrange › Create Component (⌥⌘K). Every copy stays linked: double-click any copy to edit the main component and all copies on every page update. Add variants for biological states (Unbound / Bound / Phosphorylated, Naive / Activated / Exhausted) and switch them per copy from Properties. Each copy can override its own colours and text, and Detach instance makes it independent. Insert › Components… lists them.

**Global colours and text styles** (Figma styles, Illustrator global swatches and paragraph styles): Properties › Global colours saves a named colour ("Treg", "PD-1 green") and links objects to it; change it in Arrange › Colour & Text Styles… and everything linked updates. Text styles (Panel letter, Title, Label, Caption, or your own) work the same way for text. Recolouring a linked property by hand unlinks just that property.

**Copy / paste style** (⌥⌘C / ⌥⌘V): fill, outline, shading, effects, blend mode, width profile and text formatting from one object onto many.

**Recolour artwork** (Illustrator Recolor Artwork): lists every colour in the selection, page or whole figure, including icon colour layers, coloured words and graph series. Change any colour, or map them all to Okabe–Ito, Paul Tol, a journal palette, grayscale, your global colours or brand kit, keeping light and dark shades of one colour paired. Live preview, one undo step.

**Repeat and blend** (Illustrator): Arrange › Repeat makes radial copies (select a receptor and the cell, and copies go round the cell facing outward), grids (96-well plates, cohorts, staggered monolayers) or copies along a drawn path, with a live preview and an "Edit repeat…" button afterwards. Arrange › Blend… creates the steps between two objects (position, size, rotation, opacity, colours, and shape for drawings with the same number of points).

**Width tool** (Illustrator): taper, swell, pinch or custom start / middle / end widths for any open drawing or arrow (Properties › Width tool).

**Image Trace** (Illustrator): Insert › Image Trace… turns a PNG / JPG into editable vector shapes (black & white line art, 3, 6 or 16 colours, with detail, smoothness and speck settings). Works offline.

**Shape Builder** (Illustrator, ⇧⌘M): select overlapping closed shapes; drag across pieces to merge them, ⌥-drag to delete pieces, Enter to finish.

**Blend modes and fades**: Multiply, Screen, Overlay and 12 more per object, plus a fade-out opacity mask (left, right, up, down or vignette) in Properties › Blending. Exported to PNG, SVG and PDF.

**Auto layout** (Figma, ⌥⌘A): a group whose items stack with fixed gaps and padding and resize to fit, with an optional background box and border. Add an item and the box grows; delete one and the rest close up. Good for legends and key boxes.

**Magic resize** (Canva): Arrange › Magic Resize… adds a copy of the page at another size (slide, poster panel, square post, A4…). Reflow keeps labels with their icons and spreads the layout to the new shape; Fit scales it.

**Smart animate** (Figma, Canva): page properties › Transition into this slide: Smart animate, Fade or Slide in. Duplicate a page, move, resize or recolour things, and the presenter glides between the two slides. File › Export Animation… saves MP4 (or WebM) or an animated GIF.

**Command palette** (⌘/): type to run any menu command, pick a tool or brush, jump to a page, insert a component or apply a global colour or text style.

**Find and replace** (⌘F) across text, labels, tables, protocol steps, graph titles, speaker notes and components on every page, plus **Check spelling**, which uses the system dictionary and skips gene, protein and CD-marker names (every icon name is in its word list).

**Outline view** (⌘Y, Illustrator): every object as a thin outline, with hidden, off-page and tiny stray objects in red.

## New in v0.7

**Omics & clinical plots** (Insert › Omics & Clinical Plot, or the Graph dialog): volcano and MA plots straight from DESeq2 / edgeR / limma tables (columns detected by name, top genes labelled without overlaps, "always label" list); UMAP / t-SNE coloured by cluster or by a gene; marker dot plots (% expressing × scaled expression); oncoprints; lollipop mutation plots on protein domains; forest plots with subgroup headings; Venn (2–3 sets) and UpSet plots; waterfall plots coloured by RECIST; swimmer plots; sequence alignments with a sequence logo.

**Microscopy** (Insert › Microscopy): split / merge channels from ImageJ / Fiji hyperstacks, OME-TIFF or one image per channel (8-, 16- and 32-bit, max projection or a single z-slice, per-channel colour and display range); calibrated scale bars that stay correct when the image is resized or cropped (pixel size read from the TIFF); zoom insets with outline and connecting lines; image grids with condition and marker labels; brightness / contrast applied equally to several images, with the original kept.

**Drawing**: Arrange › Combine Shapes (union, subtract, intersect, exclude) with holes kept; Split Brush into Pieces (each lipid of a membrane becomes its own small group); receptors snap into a membrane (or onto DNA) when dropped on it, turn to follow its curve and move with it (hold ⌘ to skip, depth slider in the panel, "Spread evenly along membrane"); Arrange › Tidy Pathway lays out a selected pathway top-down or left-right; Insert › Pathway from Text builds one from lines like `PD-1 -> SHP2 -| ZAP70`.

**Molecular biology** (Insert › Molecular Biology): plasmid maps (typed features or a GenBank file); construct diagrams with presets for CARs (CD28 / 4-1BB), lentiviral vectors, floxed alleles and HDR donors; gene structures with UTRs, shortened introns and CRISPR guides (spacer, PAM, cut site).

## New in v0.5

**Icons**: per-layer borders (colour, width, dashed / dotted) beside each colour layer; one colour overlay for many selected icons, including library icons; "Replace all like this" swaps every copy of an icon on the page; favourite / replace from the right-click menu; "request this icon" link when a search finds nothing.

**Shapes, lines & tables**: Arrange › Transform… (exact size in px or %, rotation, each object about its own centre); Crop to Shape (put any closed shape over an image or icon, select both, and the shape becomes its crop and border); Insert › Frame (rectangle / circle); colour presets (matching fill, border and text); pencil "Custom shape" mode that always closes into a filled shape; Apply Brush to Path (turn a drawn curve into a membrane, DNA, actin… brush); connector anchor points shown on hover, and a connector started on an anchor stays attached to it; table row heights; purple outline for selected groups.

**Text**: "Chemical formula" mode: H2O → H₂O, SO42- → SO₄²⁻, Ca2+ → Ca²⁺, Fe(CN)63- → Fe(CN)₆³⁻.

**Biology**: Insert › Antibody Builder…: IgG, Fab, F(ab′)₂, scFv, nanobody, heavy-chain antibody, bispecific, ADC, fluorophore-labelled, IgM pentamer and IgA dimer. Each chain colour can be set, and the result is a group of named domains you can edit. Five new "Disease mechanisms" templates: insulin resistance, Alzheimer's amyloid / tau, PD-1 / PD-L1 immune evasion, viral life cycle and atherosclerosis.

**Templates & teams**: template authors, searchable by name; a team templates folder (Settings) with "Publish to team" when saving a template; "request this template" link.

**AI & export**: AI › Narrate Slides…. Claude writes a spoken script for each slide from its text and notes; you edit it, and the presenter reads it aloud (press P, slides advance automatically). The narration can be exported as one .m4a file per slide (macOS voices). Restyle adds Realistic and Flat 2D. AI › Upscale Image… resamples 2× or 4× with sharpening, on-device and without AI. Settings › AI usage shows requests and tokens for the month, with an optional monthly request limit to cap spending.

## New in v0.4

**Drawing & text**: eraser (X, non-destructive), eyedropper, figure palette + brand kit (colours, font, logo), grayscale and colour-blindness previews (View › Colour Preview), select matching (same icon / type / colour), tables (Excel paste, cell colours, column widths), brackets, braces, arc and cycle arrows, parallelogram, dotted / dash-dot lines, vessel / microtubule / cell-row brushes, editable brush paths, curved & circular text, text along a drawn path, bullet / numbered lists, underline / strikethrough, symbol picker, 13 fonts, hyperlinks (clickable in PDF / SVG), "For you" icon suggestions.

**Graphs**: grouped bar + two-way ANOVA, violin, dot plot (mean / median), pie / donut, 96-/384-well plate heatmap, growth curves (AUC, doubling time), standard-curve interpolation (linear / 4PL, ELISA), logistic regression, polynomial fits, Spearman, Kruskal–Wallis, Wilcoxon signed-rank, repeated-measures ANOVA, Cox regression, Shapiro–Wilk normality with an automatic test recommendation, outlier sensitivity analysis, 95% CI error bars, transforms (log, % of control, z-score…), axis ranges and log Y, CSV / Excel (.xlsx) / GraphPad Prism (.pzfx) import, style matching across graphs, and Arrange › Figure Panels (A, B, C…).

**Chemistry & proteins**: vector 2D structures from a name (PubChem) or SMILES — including reaction SMILES — with themes, bond and label sizes, recolourable atoms; PDB / mmCIF file upload, outline style, ligands, 90° rotation.

**AI** (needs an Anthropic API key in Settings): guided planner (questions → 4 grayscale sketches → mark-up → colour draft), protocol from methods text, timeline, flowchart, restyle in 9 styles, edit selection with an instruction, remove text, smart (natural-language) icon search, suggested title / legend / alt text. Non-AI background removal by edge colour.

**Files & teams**: Home › figures folder (works in Dropbox / iCloud / Drive / OneDrive for sharing), version history (last 50 saves), alert + reload when a shared file is changed by someone else, template categories, save / share / import your own templates (.scitemplate), slide sorter with speaker notes (presenter: N; exported to PowerPoint), poster auto-layout (Arrange › Poster Columns), double-click .scifig files to open.

**AI connector (MCP)**: lets assistants like Claude Desktop search SciCanvas icons and templates and create editable drafts that open in SciCanvas. Add this to Claude Desktop's config (Settings › Developer › Edit Config) and restart it:

```json
{ "mcpServers": { "scicanvas": { "command": "node", "args": ["/Users/<you>/SciCanvas/scripts/mcp-server.js"] } } }
```

Drafts are saved to `~/Documents/SciCanvas Drafts/`.

### Not possible without a cloud service
Real-time co-editing and share-link permissions, PowerPoint / Google Slides add-ins with live-linked figures, publication licences, and BioRender's proprietary artwork and templates.

## Not built (yet)
- Real-time multi-user editing. Today you share the `.scifig` file and review through comments.
- A live-linked PowerPoint add-in. PPTX export is editable, but re-export after changing the figure.
- Brushes can't be split into individual editable units.
- Boolean shape operations (union / subtract) beyond crop-to-shape.
- AI image generation in photographic styles; restyle produces vector reinterpretations.

## Layout

- `main.js` / `preload.js`: window and menus, file I/O, PDF rendering, network fetches, icon packs, settings (keychain), Claude API
- `scripts/packs.js`: icon-library installers (Bioicons, Reactome, Health Icons, PhyloPic)
- `scripts/setup-electron.sh`: finishes the Electron install when npm blocks it
- `src/draw.js`: pencil, pen, line/arrow, airbrush, point editing, shading, connector ports
- `src/arrange.js`: smart guides, arrange commands, context bar, right-click menu, layers panel
- `src/more.js`: eraser, eyedropper, palettes & brand kit, colour-vision previews, tables, symbols, panel layout
- `src/graph2.js`: extended statistics, new chart types, data import
- `src/stats3.js`: v0.9 statistics: post-hoc tests, distributions, contingency, ROC, method comparison, regression, factorial ANOVA, curve fitting
- `src/statcharts.js`: Statistics & Models chart types (curve fit, contingency, ROC, Bland–Altman, Deming, multiple regression, three-way ANOVA)
- `src/diagrams.js`: diagram builder (19 generated diagram types) and icon lookup by name
- `src/templates2.js`: v0.9 templates (drug delivery, genome editing, omics and ML workflows, physiology, microbiology, clinical)
- `src/pptxexport.js`: editable PowerPoint export (native shapes, text, tables, glued connectors, groups)
- `src/aidocs.js`: reference files for AI drafting (PDF, Word, PowerPoint, tables, images) and charts from attached tables
- `src/ai.js`: AI planner, generators, restyle / edit / remove text, smart search, narration
- `src/bio.js`: antibody builder, disease-mechanism templates
- `src/files.js`: folder gallery, version history, change detection, templates, slide sorter, poster layout
- `scripts/mcp-server.js`: AI connector (Model Context Protocol server)
- `src/creator.js`: drawing options, My icons, AI icon generation, library manager
- `src/softicons.js`: soft-style icon set (proteins, degradation, immunology, cancer)
- `src/softicons3.js`: v0.9 soft-style icons (organelles, anatomy, microbes, model organisms, plants, lab equipment, clinical)
- `src/softicons4.js`: v1.1 soft-style icons (neuroscience, heart, transporters, small molecules, cell division, tissues, people, data, environment)
- `src/softicons5.js`: v1.1 clinical icons (organs & body systems, diseases & pathology, clinical procedures & imaging, histopathology)
- `src/richtext.js`: colour / bold / italic for selected words
- `src/immuno.js`: protein shapes, lighter partner, degrade, domain maps
- `src/immunotemplates.js`: immunology & cancer templates
- `src/data.js`: flow cytometry (FCS), tumour growth curves, western blot densitometry
- `src/icons.js`: built-in icons
- `src/softicons.js`: soft-style icon generator (archetypes + named catalogue)
- `src/immunoicons.js`: hand-drawn soft icons for the immunology & cancer toolkit
- `src/packs.js`: icon packs, SVG sanitising, colour layers and tint, search, credits
- `src/render.js`: object model → SVG (shapes, effects, connectors, brushes, protocols)
- `src/graph.js`: statistics and charts
- `src/model.js`: factories, templates, presets
- `src/app.js`: editor core (state, interaction, properties)
- `src/dialogs.js`: graph, protocol, chemistry, PDB, template and export dialogs
- `src/extras.js`: library UI, rulers and guides, group editing, comments, home, settings, credits, help, AI, boot
- `src/design.js`: components and variants, global colours and text styles, copy / paste style, recolour artwork
- `src/design2.js`: repeat, blend, width tool, image trace, shape builder, blend modes and fades
- `src/design3.js`: auto layout, magic resize, smart animate and animation export, command palette, find / replace and spelling, outline view
