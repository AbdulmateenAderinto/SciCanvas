# SciCanvas

A desktop app (Electron) for building scientific figures, modelled on BioRender's workflow:
library → canvas → relationships → data → review → export.

## Run

```bash
npm install
npm start
```

If `npm start` says *"Electron failed to install correctly"*, newer npm versions blocked Electron's download script. Finish the install once with:

```bash
npm run setup
```

Icon libraries live in `assets/iconpacks/` (about 640 MB in total). Reinstall or update them with `npm run icons`, or from **Insert › Icon Libraries…** inside the app.

## Icon libraries (~19,950 icons)

| Library | Icons | Licence | Content |
|---|---|---|---|
| Built-in | 51 | — | Core cells, molecules, lab and anatomy |
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
- Option to export only the current selection.
- Copy as image (⇧⌘C) for pasting into slides.

**Credits**
- File › Credits lists every library icon used, with its licence, and drafts the attribution text for your figure legend.

**Home**
- New-figure types and recent files with thumbnails.

## Not built (yet)
- Real-time multi-user editing. Today you share the `.scifig` file and review through comments.
- A live-linked PowerPoint add-in. PPTX export embeds each page as a picture.
- Brushes can't be split into individual editable units.
- Text on a curve, eraser and boolean shape operations.
- Two-way ANOVA and Cox regression.

## Layout

- `main.js` / `preload.js`: window and menus, file I/O, PDF rendering, network fetches, icon packs, settings (keychain), Claude API
- `scripts/packs.js`: icon-library installers (Bioicons, Reactome, Health Icons, PhyloPic)
- `scripts/setup-electron.sh`: finishes the Electron install when npm blocks it
- `src/draw.js`: pencil, pen, line/arrow, airbrush, point editing, shading, connector ports
- `src/arrange.js`: smart guides, arrange commands, context bar, right-click menu, layers panel
- `src/creator.js`: drawing options, My icons, AI icon generation, library manager
- `src/icons.js`: built-in icons
- `src/packs.js`: icon packs, SVG sanitising, colour layers and tint, search, credits
- `src/render.js`: object model → SVG (shapes, effects, connectors, brushes, protocols)
- `src/graph.js`: statistics and charts
- `src/model.js`: factories, templates, presets
- `src/app.js`: editor core (state, interaction, properties)
- `src/dialogs.js`: graph, protocol, chemistry, PDB, template and export dialogs
- `src/extras.js`: library UI, rulers and guides, group editing, comments, home, settings, credits, help, AI, boot
