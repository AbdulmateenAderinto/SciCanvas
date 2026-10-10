// SciCanvas — Electron main process: window, menus, file I/O, network fetches, PDF export.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, clipboard, nativeImage, safeStorage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { installPack, catalog } = require('./scripts/packs');

let win;

// Hardware acceleration: rasterise the canvas on the GPU and keep it on the GPU path even on
// machines Chromium would otherwise block-list.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-oop-rasterization');

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'SciCanvas',
    backgroundColor: '#f4f5f7',
    ...(!app.isPackaged && process.platform !== 'darwin' ? { icon: path.join(__dirname, 'build', 'icon.png') } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('closed', () => { win = null; });
  // Never navigate the app window away (a file or link dropped outside the canvas would replace the app and the
  // open figure); web links go to the browser instead.
  win.webContents.on('will-navigate', (e, url) => {
    if (url === win.webContents.getURL()) return;
    e.preventDefault();
    if (/^https?:/.test(url)) shell.openExternal(url);
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  buildMenu();
}

// Menu commands go to the focused window; if every window was closed (the app stays running on macOS),
// open a fresh one and deliver the command once it has loaded.
const send = (cmd) => Object.assign(() => {
  const w = BrowserWindow.getFocusedWindow() || (win && !win.isDestroyed() ? win : null);
  if (w) { w.webContents.send('menu', cmd); return; }
  createWindow();
  win.webContents.once('did-finish-load', () => win.webContents.send('menu', cmd));
}, { cmd });
// Flattened menu commands for the command palette.
let menuCommandList = [];
function flattenMenu(items, trail = []) {
  return items.flatMap((it) => {
    if (it.submenu && Array.isArray(it.submenu)) return flattenMenu(it.submenu, it.label ? [...trail, it.label] : trail);
    return it.click && it.click.cmd ? [{ path: [...trail, it.label], cmd: it.click.cmd, accel: (it.accelerator || '').replace('CmdOrCtrl', process.platform === 'darwin' ? '⌘' : 'Ctrl').replace(/Shift\+/g, '⇧').replace(/Alt\+/g, process.platform === 'darwin' ? '⌥' : 'Alt+').replace(/\+/g, '') }] : [];
  });
}
ipcMain.handle('menu-commands', () => menuCommandList);

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Figure', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Home / Recent…', accelerator: 'CmdOrCtrl+Shift+H', click: send('home') },
        { label: 'Open…', accelerator: 'CmdOrCtrl+O', click: send('open') },
        { label: 'Version History…', click: send('versions') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: send('saveAs') },
        { type: 'separator' },
        { label: 'Import Image…', accelerator: 'CmdOrCtrl+I', click: send('importImage') },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: send('export') },
        { label: 'Check Figure for Journal…', accelerator: 'Shift+CmdOrCtrl+J', click: send('checkFigure') },
        { label: 'Export for Journal…', click: send('exportJournal') },
        { label: 'Export Animation (MP4 / GIF)…', click: send('exportAnimation') },
        { label: 'Credits & Licences…', click: send('credits') },
        { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: send('settings') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: send('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: send('redo') },
        { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' },
        { label: 'Paste in Place', accelerator: 'Shift+CmdOrCtrl+V', click: send('pasteInPlace') },
        { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: send('duplicate') },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: send('selectAll') },
        { label: 'Copy as Image', accelerator: 'CmdOrCtrl+Shift+C', click: send('copyImage') },
        { label: 'Copy as SVG (Figma, Illustrator)', click: send('copySvg') },
        { label: 'Copy Style', accelerator: 'Alt+CmdOrCtrl+C', click: send('copyStyle') },
        { label: 'Paste Style', accelerator: 'Alt+CmdOrCtrl+V', click: send('pasteStyle') },
        { type: 'separator' },
        { label: 'Find and Replace…', accelerator: 'CmdOrCtrl+F', click: send('find') },
        { label: 'Check Spelling…', click: send('spellCheck') },
        { label: 'Gene & Protein Names…', click: send('geneStyle') },
        { label: 'Format Chemical Formulas (H₂O, Ca²⁺)', click: send('formatChemistry') },
        { label: 'Tidy Units & Symbols (µm, °C, ±, →)', click: send('tidyUnits') },
        { label: 'Select Matching', submenu: [{ label: 'Same Icon', click: send('selectSameIcon') }, { label: 'Same Type', click: send('selectSameType') }, { label: 'Same Colour', click: send('selectSameColour') },
          { label: 'Same Fill (incl. gradient)', click: send('selectSameFill') }, { label: 'Same Outline', click: send('selectSameStroke') }, { label: 'Same Effects', click: send('selectSameEffects') },
          { label: 'Same Font', click: send('selectSameFont') }, { label: 'Same Graphic Style', click: send('selectSameStyle') }] },
        { label: 'Lasso Select (Q)', click: send('lassoTool') },
      ],
    },
    {
      label: 'Insert',
      submenu: [
        { label: 'Graph…', click: send('graph') },
        { label: 'Protocol Diagram…', click: send('protocol') },
        { label: 'Chemical Structure…', click: send('chem') },
        { label: 'Protein Structure (PDB)…', click: send('pdb') },
        { label: 'Template…', click: send('templates') },
        { label: 'Save Page as Template…', click: send('saveTemplate') },
        { label: 'Numbered Badge', click: send('badgeTool') },
        { label: 'Circular Arrow', click: send('circularArrow') },
        { label: 'Well Plate (Editable Wells)…', click: send('diagram_wellplate') },
        { label: 'DNA Sequence Grid…', click: send('diagram_seqgrid') },
        { label: 'Zoom Callout Wedge (Select Two Objects)', click: send('zoomWedge') },
        { label: 'Ungroup Icon into Editable Parts', click: send('ungroupIcon') },
        { label: 'Table', click: send('insertTable') },
        { label: 'Equation (LaTeX)…', click: send('equation') },
        { label: 'Builders', submenu: [
          { label: 'Timeline…', click: send('timelineBuilder') }, { label: 'Cohort / Study Groups…', click: send('cohortBuilder') },
          { label: 'Gating Strategy…', click: send('gatingBuilder') }, { label: 'Western Blot…', click: send('blotBuilder') },
        ] },
        { label: 'Line Legend', click: send('lineLegend') },
        { label: 'Colour Legend', click: send('colourLegend') },
        { label: 'Significance Bracket (Select Two Objects)', click: send('sigBracket') },
        { label: 'Frame', submenu: [{ label: 'Rectangle Frame', click: send('frameRect') }, { label: 'Circle Frame', click: send('frameCircle') }] },
        { label: 'Antibody Builder…', click: send('antibody') },
        { label: 'Protein Shape…', click: send('proteinShape') },
        { label: 'Protein Domain Map…', click: send('domainMap') },
        { label: 'Flow Cytometry Plot (FCS)…', click: send('flowPlot') },
        { label: 'Western Blot Quantification…', click: send('blotQuant') },
        { type: 'separator' },
        { label: 'Omics & Clinical Plot', submenu: [
          { label: 'Volcano Plot…', click: send('omics_volcano') }, { label: 'MA Plot…', click: send('omics_ma') },
          { label: 'UMAP / t-SNE…', click: send('omics_embedding') }, { label: 'Marker Dot Plot…', click: send('omics_markerdot') },
          { type: 'separator' },
          { label: 'Oncoprint…', click: send('omics_oncoprint') }, { label: 'Lollipop Mutation Plot…', click: send('omics_lollipop') },
          { label: 'Forest Plot…', click: send('omics_forest') }, { label: 'Waterfall Plot…', click: send('omics_waterfall') }, { label: 'Swimmer Plot…', click: send('omics_swimmer') },
          { type: 'separator' },
          { label: 'Venn Diagram…', click: send('omics_venn') }, { label: 'UpSet Plot…', click: send('omics_upset') },
        ] },
        { label: 'Diagram', submenu: [
          { label: 'Diagram Builder…', accelerator: 'CmdOrCtrl+Shift+D', click: send('diagramBuilder') },
          { type: 'separator' },
          { label: 'Cycle / Life Cycle…', click: send('diagram_cycle') }, { label: 'Radial (Hub and Spoke)…', click: send('diagram_radial') }, { label: 'Process Steps…', click: send('diagram_process') },
          { label: 'Funnel…', click: send('diagram_funnel') }, { label: 'Pyramid…', click: send('diagram_pyramid') }, { label: 'Concentric Layers…', click: send('diagram_concentric') },
          { label: 'Hierarchy / Decision Tree…', click: send('diagram_tree') },
          { label: 'Flowchart from Mermaid / JSON / Steps…', click: send('diagram_flowtext') },
          { type: 'separator' },
          { label: 'Timeline…', click: send('diagram_timeline') }, { label: 'Gantt Chart…', click: send('diagram_gantt') },
          { type: 'separator' },
          { label: 'Phylogenetic Tree (Newick)…', click: send('diagram_phylo') }, { label: 'Food Web…', click: send('diagram_foodweb') }, { label: 'Punnett Square…', click: send('diagram_punnett') },
          { label: 'ELISA Format…', click: send('diagram_elisa') },
          { type: 'separator' },
          { label: 'Clinical Trial Design…', click: send('diagram_trial') }, { label: 'Risk Matrix…', click: send('diagram_risk') },
          { type: 'separator' },
          { label: 'Figure Panels…', click: send('diagram_panels') }, { label: 'Venn Layout…', click: send('diagram_venn') }, { label: 'Callout Layout…', click: send('diagram_callout') }, { label: '2 × 2 Quadrant…', click: send('diagram_quadrant') },
        ] },
        { label: 'Statistics & Models', submenu: [
          { label: 'Curve Fit (Kinetics, Binding, Growth, Dose–Response)…', click: send('stats_curvefit') },
          { label: 'Contingency Table (χ², Fisher)…', click: send('stats_contingency') },
          { label: 'ROC Curve…', click: send('stats_roc') },
          { type: 'separator' },
          { label: 'Bland–Altman…', click: send('stats_blandaltman') }, { label: 'Deming Regression…', click: send('stats_deming') },
          { type: 'separator' },
          { label: 'Multiple Linear Regression…', click: send('stats_mlr') }, { label: 'Three-way ANOVA…', click: send('stats_anova3') },
        ] },
        { label: 'Microscopy', submenu: [
          { label: 'Channels: Split & Merge (TIFF)…', click: send('microChannels') },
          { label: 'Image Grid…', click: send('imageGrid') },
          { label: 'Zoom Inset…', click: send('zoomInset') },
          { label: 'Scale Bar', click: send('scaleBar') },
          { label: 'Brightness & Contrast…', click: send('imageLevels') },
        ] },
        { label: 'Molecular Biology', submenu: [
          { label: 'Plasmid Map…', click: send('plasmidMap') },
          { label: 'Construct Diagram (CAR, vector, allele)…', click: send('constructMap') },
          { label: 'Gene Structure & CRISPR Guides…', click: send('geneMap') },
          { label: 'Sequence Alignment & Logo…', click: send('alignmentChart') },
        ] },
        { label: 'Pathway from Text…', click: send('pathwayText') },
        { label: 'Components…', click: send('componentsDialog') },
        { label: 'Image Trace…', click: send('imageTrace') },
        { type: 'separator' },
        { label: 'Brand Logo', click: send('insertLogo') },
        { label: 'Comment', click: send('commentTool') },
        { type: 'separator' },
        { label: 'Save Selection as Icon…', click: send('saveIcon') },
        { label: 'Icon Libraries…', click: send('libraries') },
      ],
    },
    {
      label: 'AI',
      submenu: [
        { label: 'Plan a Figure (guided)…', accelerator: 'Shift+CmdOrCtrl+K', click: send('aiPlan') },
        { label: 'Generate Editable Figure…', accelerator: 'CmdOrCtrl+K', click: send('ai') },
        { label: 'Protocol from Methods…', click: send('aiProtocol') },
        { label: 'Timeline…', click: send('aiTimeline') },
        { label: 'Flowchart…', click: send('aiFlowchart') },
        { label: 'Create Icon…', click: send('aiIcon') },
        { type: 'separator' },
        { label: 'Restyle Selection…', click: send('aiRestyle') },
        { label: 'Edit Selection with AI…', click: send('aiEdit') },
        { label: 'Remove Text from Image', click: send('aiRemoveText') },
        { label: 'Remove Image Background', click: send('removeBg') },
        { label: 'Upscale Image…', click: send('upscale') },
        { type: 'separator' },
        { label: 'Suggest Title & Legend…', click: send('aiNarrate') },
        { label: 'Narrate Slides…', click: send('aiNarrateSlides') },
        { label: 'Smart Icon Search', click: send('aiSmartSearch') },
      ],
    },
    {
      label: 'Arrange',
      submenu: [
        { label: 'Bring to Front', accelerator: 'Shift+CmdOrCtrl+]', click: send('bringFront') },
        { label: 'Bring Forward', accelerator: 'CmdOrCtrl+]', click: send('bringForward') },
        { label: 'Send Backward', accelerator: 'CmdOrCtrl+[', click: send('sendBackward') },
        { label: 'Send to Back', accelerator: 'Shift+CmdOrCtrl+[', click: send('sendBack') },
        { type: 'separator' },
        { label: 'Align', submenu: [
          { label: 'Left', click: send('alignL') }, { label: 'Centre', click: send('alignC') }, { label: 'Right', click: send('alignR') },
          { type: 'separator' },
          { label: 'Top', click: send('alignT') }, { label: 'Middle', click: send('alignM') }, { label: 'Bottom', click: send('alignB') },
        ] },
        { label: 'Distribute', submenu: [{ label: 'Horizontally', click: send('distH') }, { label: 'Vertically', click: send('distV') }] },
        { label: 'Tidy into Grid', click: send('tidyGrid') },
        { label: 'Arrange in a Circle', click: send('arrangeCircle') },
        { label: 'Swap Positions (Select Two)', click: send('swapPositions') },
        { label: 'Match Size', submenu: [{ label: 'Width', click: send('matchW') }, { label: 'Height', click: send('matchH') }, { label: 'Width and Height', click: send('matchSize') }] },
        { label: 'Lines', submenu: [
          { label: 'Straighten (Move the End Object)', click: send('lineStraighten') }, { label: 'Route Around Objects', click: send('lineAutoRoute') }, { label: 'Remove Bend Points / Routing', click: send('lineClearBends') },
          { label: 'Hop over Crossing Lines', click: send('lineJumps') }, { type: 'separator' },
          { label: 'Two-way Arrows (Parallel)', click: send('lineTwoWay') }, { label: 'Add Branch from Line', click: send('lineAddBranch') },
          { label: 'Branch: One → Many (Select 3+ Objects)', click: send('lineBranch') }, { label: 'Merge: Many → One (Select 3+ Objects)', click: send('lineMerge') },
          { label: 'Add Feedback Loop', click: send('lineSelfLoop') },
          { type: 'separator' }, { label: 'Connect Selected in Order', click: send('lineConnectOrder') }, { label: 'Select Connected (Whole Pathway)', click: send('selectConnected') },
        ] },
        { label: 'Transform…', accelerator: 'Alt+CmdOrCtrl+T', click: send('transform') },
        { label: 'Crop to Shape', click: send('cropToShape') },
        { label: 'Apply Brush to Path…', click: send('brushToPath') },
        { type: 'separator' },
        { label: 'Make Protein Shape', click: send('makeProtein') },
        { label: 'Add Lighter Partner Subunit', click: send('lighterPartner') },
        { label: 'Degrade into Fragments', click: send('degrade') },
        { type: 'separator' },
        { label: 'Combine Shapes', submenu: [
          { label: 'Union', click: send('boolUnion') }, { label: 'Subtract Front from Back', click: send('boolSubtract') },
          { label: 'Intersect', click: send('boolIntersect') }, { label: 'Exclude Overlap', click: send('boolExclude') },
        ] },
        { label: 'Split Brush into Pieces', click: send('splitBrush') },
        { label: 'Snap into Membrane', click: send('snapMembrane') },
        { label: 'Spread Evenly along Membrane', click: send('spreadMembrane') },
        { label: 'Snap Objects into Membranes when Dropped', click: send('toggleMembraneSnap') },
        { label: 'Tidy Pathway', submenu: [{ label: 'Top to Bottom', click: send('layoutTB') }, { label: 'Left to Right', click: send('layoutLR') }] },
        { type: 'separator' },
        { label: 'Create Component', accelerator: 'Alt+CmdOrCtrl+K', click: send('createComponent') },
        { label: 'Detach Instance', click: send('detachInstance') },
        { label: 'Colour & Text Styles…', click: send('stylesDialog') },
        { label: 'Recolour Artwork…', click: send('recolour') },
        { label: 'Repeat', submenu: [
          { label: 'Radial (around a cell)…', click: send('repeatRadial') }, { label: 'Grid (plate, cohort)…', click: send('repeatGrid') },
          { label: 'Along a Path…', click: send('repeatPath') },
        ] },
        { label: 'Blend…', click: send('blend') },
        { label: 'Shape Builder', accelerator: 'Shift+CmdOrCtrl+M', click: send('shapeBuilder') },
        { label: 'Add Auto Layout', accelerator: 'Alt+CmdOrCtrl+A', click: send('autoLayout') },
        { label: 'Magic Resize…', click: send('magicResize') },
        { label: 'Graphic Styles…', click: send('graphicStyles') },
        { type: 'separator' },
        { label: 'Path', submenu: [
          { label: 'Offset Path…', click: send('offsetPath') }, { label: 'Outline Stroke', click: send('outlineStroke') },
          { label: 'Join / Close Paths', accelerator: 'CmdOrCtrl+J', click: send('joinPaths') },
          { type: 'separator' },
          { label: 'Simplify', click: send('simplifyPath') }, { label: 'Smooth Points', click: send('smoothPath') }, { label: 'Round Corners', click: send('roundCorners') },
          { type: 'separator' },
          { label: 'Knife (drag across shapes)', click: send('knifeTool') }, { label: 'Scissors (click a drawing)', click: send('scissorsTool') },
        ] },
        { label: 'Warp & Perspective', submenu: [
          { label: 'Free Distort / Perspective (edit corners)', click: send('warpCorners') },
          { label: 'Isometric Top', click: send('isoTop') }, { label: 'Isometric Left Side', click: send('isoLeft') }, { label: 'Isometric Right Side', click: send('isoRight') },
          { type: 'separator' },
          { label: 'Remove Warp', click: send('removeWarp') },
        ] },
        { label: 'Cutaway', submenu: [
          { label: 'Wedge Cut', click: send('cutWedge') }, { label: 'Straight Cut', click: send('cutLine') }, { label: 'With Top Shape', click: send('cutShape') },
          { type: 'separator' },
          { label: 'Remove Cutaway', click: send('removeCut') },
        ] },
        { label: 'Label Selected Objects', click: send('labelSelected') },
        { label: 'Attach Label to Object', click: send('attachLabel') },
        { type: 'separator' },
        { label: 'Arrange as Figure Panels (A, B, C…)', click: send('panelLayout') },
        { label: 'Arrange as Poster Columns…', click: send('posterLayout') },
        { label: 'Flip Horizontally', accelerator: 'Shift+H', click: send('flipH') },
        { label: 'Flip Vertically', accelerator: 'Shift+V', click: send('flipV') },
        { type: 'separator' },
        { label: 'Group', accelerator: 'CmdOrCtrl+G', click: send('group') },
        { label: 'Ungroup', accelerator: 'CmdOrCtrl+Shift+G', click: send('ungroup') },
        { type: 'separator' },
        { label: 'Lock', accelerator: 'CmdOrCtrl+L', click: send('lock') },
        { label: 'Unlock All', accelerator: 'CmdOrCtrl+Shift+L', click: send('unlockAll') },
        { label: 'Hide', click: send('hide') },
        { label: 'Show All', click: send('showAll') },
        { type: 'separator' },
        { label: 'Smart Alignment Guides', click: send('toggleSnap') },
        { label: 'Distance Labels', click: send('toggleDistances') },
        { label: 'Snap to Grid', click: send('toggleSnapGrid') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: send('zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: send('zoomOut') },
        { label: 'Fit to Window', accelerator: 'CmdOrCtrl+0', click: send('zoomFit') },
        { label: 'Zoom to Selection', accelerator: 'CmdOrCtrl+2', click: send('zoomSelection') },
        { label: 'Mini-map', click: send('toggleMinimap') },
        { type: 'separator' },
        { label: 'Toggle Grid', accelerator: "CmdOrCtrl+'", click: send('toggleGrid') },
        { label: 'Toggle Rulers', accelerator: 'CmdOrCtrl+R', click: send('toggleRulers') },
        { label: 'Toggle Smart Alignment', click: send('toggleSnap') },
        { label: 'Toggle Quick-connect Arrows', click: send('toggleQuickConnect') },
        { label: 'Snap to Grid', click: send('toggleSnapGrid') },
        { label: 'Outline View', accelerator: 'CmdOrCtrl+Y', click: send('outlineView') },
        { label: 'Isometric Grid', click: send('toggleIsoGrid') },
        { label: 'Layout Grid (columns)', click: send('toggleLayoutGrid') },
        { label: 'Layout Grid Settings…', click: send('layoutGrid') },
        { label: 'Command Palette…', accelerator: 'CmdOrCtrl+/', click: send('commandPalette') },
        { type: 'separator' },
        { label: 'Colour Preview', submenu: [
          { label: 'Normal', click: send('visionNormal') },
          { label: 'Grayscale (check contrast & legibility)', click: send('visionGray') },
          { type: 'separator' },
          { label: 'Deuteranopia (red–green)', click: send('visionDeut') },
          { label: 'Protanopia (red–green)', click: send('visionProt') },
          { label: 'Tritanopia (blue–yellow)', click: send('visionTrit') },
        ] },
        { type: 'separator' },
        { label: 'Slide Sorter & Speaker Notes…', click: send('slideSorter') },
        { label: 'Present Slides', accelerator: 'CmdOrCtrl+Enter', click: send('present') },
        { type: 'separator' },
        { label: 'Help', accelerator: 'F1', click: send('help') },
        { label: 'What’s New', click: send('whatsNew') },
        { label: 'Take the Tour', click: send('tour') },
        { label: 'Check for Updates…', click: send('checkUpdates') },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  menuCommandList = flattenMenu(template);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC ----------
const FIG_FILTER = [{ name: 'SciCanvas Figure', extensions: ['scifig'] }];

ipcMain.handle('open-figure', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { filters: FIG_FILTER, properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return null;
  app.addRecentDocument(r.filePaths[0]);
  watchFile(r.filePaths[0]);
  return { path: r.filePaths[0], content: fs.readFileSync(r.filePaths[0], 'utf8') };
});

ipcMain.handle('save-figure', async (_e, { path: p, content, saveAs }) => {
  let target = p;
  if (!target || saveAs) {
    const r = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() || win, { filters: FIG_FILTER, defaultPath: target || 'figure.scifig' });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  fs.writeFileSync(target, content, 'utf8');
  saveVersion(target, content);
  watchFile(target);
  return target;
});

// ---------- Version history (last 50 saves per file, kept in the app's data folder) ----------
const crypto = require('crypto');
const versionsDir = (file) => path.join(app.getPath('userData'), 'versions', crypto.createHash('sha1').update(path.resolve(file)).digest('hex').slice(0, 16));
function saveVersion(file, content) {
  try {
    const dir = versionsDir(file);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'source.txt'), path.resolve(file));
    fs.writeFileSync(path.join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.scifig`), content);
    const old = fs.readdirSync(dir).filter((f) => f.endsWith('.scifig')).sort();
    for (const f of old.slice(0, Math.max(0, old.length - 50))) fs.unlinkSync(path.join(dir, f));
  } catch { /* history is best-effort */ }
}
const readThumb = (file) => { // the thumbnail is stored first in the JSON, so the head of the file is enough
  try { const fd = fs.openSync(file, 'r'), buf = Buffer.alloc(240000), n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd); const m = buf.toString('utf8', 0, n).match(/^\{"thumb":"(data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+)"/); return m ? m[1] : ''; } catch { return ''; }
};
ipcMain.handle('list-versions', (_e, file) => {
  if (typeof file !== 'string') return [];
  const dir = versionsDir(file);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.scifig')).sort().reverse().map((f) => {
    const full = path.join(dir, f);
    return { id: f, time: fs.statSync(full).mtimeMs, size: fs.statSync(full).size, thumb: readThumb(full) };
  });
});
ipcMain.handle('read-version', (_e, { file, id }) => {
  if (typeof id !== 'string' || id.includes('/') || id.includes('..')) throw new Error('Bad version id');
  return fs.readFileSync(path.join(versionsDir(file), id), 'utf8');
});

// ---------- Watch the open file for changes made by someone else (shared Dropbox / Drive / iCloud folders) ----------
let watched = null;
function watchFile(file) {
  try {
    if (watched && watched.file === file) { watched.mtime = fs.statSync(file).mtimeMs; return; }
    if (watched) watched.w.close();
    const w = fs.watch(file, () => {
      setTimeout(() => {
        try {
          const m = fs.statSync(file).mtimeMs;
          if (watched && watched.file === file && m > watched.mtime + 500) { watched.mtime = m; const target = BrowserWindow.getFocusedWindow() || win; if (target) target.webContents.send('file-changed', file); }
        } catch { /* file moved */ }
      }, 400);
    });
    watched = { file, w, mtime: fs.statSync(file).mtimeMs };
  } catch { watched = null; }
}
ipcMain.on('watch-file', (_e, file) => { if (typeof file === 'string' && file.endsWith('.scifig') && fs.existsSync(file)) watchFile(file); });
ipcMain.handle('read-file', (_e, file) => { if (typeof file !== 'string' || !file.endsWith('.scifig')) throw new Error('Not a figure file'); return fs.readFileSync(file, 'utf8'); });

// ---------- Folder gallery ----------
ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('list-folder', (_e, dir) => {
  if (typeof dir !== 'string' || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error('Folder not found');
  const out = { dir, folders: [], files: [] };
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (st.isDirectory()) out.folders.push({ name, path: full });
    else if (name.endsWith('.scifig')) out.files.push({ name: name.replace(/\.scifig$/, ''), path: full, time: st.mtimeMs, thumb: readThumb(full) });
  }
  out.folders.sort((a, b) => a.name.localeCompare(b.name));
  out.files.sort((a, b) => b.time - a.time);
  return out;
});
ipcMain.handle('make-folder', (_e, { dir, name }) => {
  if (typeof name !== 'string' || !name.trim() || /[/:]/.test(name)) throw new Error('Invalid folder name');
  const full = path.join(dir, name.trim());
  fs.mkdirSync(full);
  return full;
});
ipcMain.handle('reveal', (_e, p) => { if (typeof p === 'string' && fs.existsSync(p)) shell.showItemInFolder(p); });

// ---------- User templates ----------
const templatesDir = () => path.join(app.getPath('userData'), 'templates');
ipcMain.handle('list-templates', () => {
  const read = (dir, team) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json') || f.endsWith('.scitemplate')).map((f) => { try { const t = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return t && t.page ? { file: f, ...t, team } : null; } catch { return null; } }).filter(Boolean) : []);
  // Team templates: a shared folder (Dropbox, OneDrive, network drive…) chosen in Settings.
  const team = readSettings().teamFolder;
  return [...read(templatesDir(), false), ...(team ? read(team, true) : [])];
});
ipcMain.handle('save-template', (_e, tpl) => {
  const team = tpl.team && readSettings().teamFolder;
  const dir = team || templatesDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = team ? `${String(tpl.name || 'template').replace(/[^\w -]+/g, '').slice(0, 50)} ${Date.now().toString(36)}.scitemplate` : `tpl-${Date.now().toString(36)}.json`;
  const { team: _t, ...data } = tpl;
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data));
  return file;
});
ipcMain.handle('pick-folder-path', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('delete-template', (_e, file) => { if (typeof file === 'string' && /^tpl-[a-z0-9]+\.json$/.test(file)) fs.rmSync(path.join(templatesDir(), file), { force: true }); return true; });
ipcMain.handle('export-template', async (_e, tpl) => {
  const r = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() || win, { defaultPath: `${(tpl.name || 'template').replace(/[^\w -]+/g, '')}.scitemplate`, filters: [{ name: 'SciCanvas Template', extensions: ['scitemplate'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, JSON.stringify(tpl));
  return r.filePath;
});
ipcMain.handle('import-template', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { filters: [{ name: 'SciCanvas Template', extensions: ['scitemplate'] }], properties: ['openFile', 'multiSelections'] });
  if (r.canceled) return 0;
  fs.mkdirSync(templatesDir(), { recursive: true });
  let n = 0;
  for (const f of r.filePaths) { try { const t = JSON.parse(fs.readFileSync(f, 'utf8')); if (t && t.page) { fs.writeFileSync(path.join(templatesDir(), `tpl-${Date.now().toString(36)}${n}.json`), JSON.stringify(t)); n++; } } catch { /* skip */ } }
  return n;
});

ipcMain.handle('pick-images', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, {
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (r.canceled) return [];
  return r.filePaths.map(fileToDataUrl);
});

function fileToDataUrl(p) {
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg';
  return { name: path.basename(p), dataUrl: `data:${mime};base64,${fs.readFileSync(p).toString('base64')}` };
}

// Save an export. `data` is either a base64 data URL (png/jpg) or text (svg).
ipcMain.handle('export-file', async (_e, { defaultName, ext, data }) => {
  const r = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() || win, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (r.canceled || !r.filePath) return null;
  if (data.startsWith('data:')) {
    fs.writeFileSync(r.filePath, Buffer.from(data.split(',')[1], 'base64'));
  } else {
    fs.writeFileSync(r.filePath, data, 'utf8');
  }
  return r.filePath;
});

// Render one or more SVG pages to a multi-page PDF using an offscreen window.
ipcMain.handle('export-pdf', async (_e, { defaultName, pages }) => {
  const r = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow() || win, {
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (r.canceled || !r.filePath) return null;
  const { width, height } = pages[0];
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${width}px ${height}px; margin: 0 }
    html,body{margin:0;padding:0}
    .p{width:${width}px;height:${height}px;page-break-after:always;overflow:hidden}
    .p:last-child{page-break-after:auto}
    svg{display:block}
  </style></head><body>${pages.map((p) => `<div class="p">${p.svg}</div>`).join('')}</body></html>`;
  const tmp = path.join(app.getPath('temp'), `scicanvas-pdf-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const off = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  await off.loadFile(tmp);
  const pdf = await off.webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
    margins: { marginType: 'none' },
  });
  off.destroy();
  fs.unlinkSync(tmp);
  fs.writeFileSync(r.filePath, pdf);
  return r.filePath;
});

// Fetch a remote image (PubChem / RCSB) and return it as a data URL — done here to avoid CORS.
const ALLOWED_HOSTS = ['pubchem.ncbi.nlm.nih.gov', 'cdn.rcsb.org'];
ipcMain.handle('fetch-image', async (_e, url) => {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.includes(u.hostname)) throw new Error('Host not allowed');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const type = res.headers.get('content-type') || 'image/png';
  if (!type.startsWith('image/')) throw new Error('Not an image');
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buf.toString('base64')}`;
});

// Fetch a structure file (PDB format) from RCSB.
ipcMain.handle('fetch-pdb', async (_e, id) => {
  if (!/^[0-9][A-Za-z0-9]{3}$/.test(id)) throw new Error('PDB IDs are 4 characters, e.g. 1CRN');
  const res = await fetch(`https://files.rcsb.org/download/${id.toUpperCase()}.pdb`);
  if (!res.ok) throw new Error(`Structure ${id} not found (${res.status})`);
  return res.text();
});

// ---------- Opening recent files ----------
ipcMain.handle('open-path', async (_e, p) => {
  if (typeof p !== 'string' || !p.endsWith('.scifig') || !fs.existsSync(p)) return null;
  app.addRecentDocument(p);
  return { path: p, content: fs.readFileSync(p, 'utf8') };
});

// ---------- Icon packs ----------
// Packs live in <app>/assets/iconpacks/<id>/ (bundled) or <userData>/iconpacks/<id>/ (downloaded in-app).
// Installed app: bundled packs ship in Contents/Resources/iconpacks; updates/downloads go to userData,
// which is listed first so an updated pack takes precedence over the bundled copy.
const bundledPacks = () => (app.isPackaged ? path.join(process.resourcesPath, 'iconpacks') : path.join(__dirname, 'assets', 'iconpacks'));
const packRoots = () => [path.join(app.getPath('userData'), 'iconpacks'), bundledPacks()];
function packDir(id) {
  for (const root of packRoots()) { const d = path.join(root, id); if (fs.existsSync(path.join(d, 'pack.json'))) return d; }
  return null;
}
ipcMain.handle('list-packs', () => {
  const packs = [];
  for (const root of packRoots()) {
    if (!fs.existsSync(root)) continue;
    for (const id of fs.readdirSync(root)) {
      const f = path.join(root, id, 'pack.json');
      if (!fs.existsSync(f) || packs.some((p) => p.id === id)) continue;
      try {
        const pack = JSON.parse(fs.readFileSync(f, 'utf8')); pack.id = id; pack.base = pathToFileURL(path.join(root, id, 'svg')).href;
        // A few downloaded files are empty (0 bytes) and would show as blank tiles; small icons are listed as 0 KB too,
        // so only those entries are checked on disk.
        const empty = (ic) => { try { return !fs.statSync(path.join(root, id, 'svg', ic.file)).size; } catch { return true; } };
        pack.icons = (pack.icons || []).filter((ic) => ic.kb > 0 || !empty(ic));
        packs.push(pack);
      } catch { /* skip broken pack */ }
    }
  }
  return packs;
});
ipcMain.handle('read-pack-icon', (_e, { pack, file }) => {
  const d = packDir(pack);
  if (!d || typeof file !== 'string' || file.includes('/') || file.includes('..')) throw new Error('Bad icon reference');
  return fs.readFileSync(path.join(d, 'svg', file), 'utf8');
});
// PubChem compound lookup by name → SMILES + basic properties (for vector structure drawing).
ipcMain.handle('pubchem-lookup', async (_e, name) => {
  if (typeof name !== 'string' || !name.trim() || name.length > 200) throw new Error('Enter a compound name');
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name.trim())}/property/IsomericSMILES,SMILES,MolecularFormula,MolecularWeight,IUPACName/JSON`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? `No compound called “${name}” in PubChem` : `PubChem error ${res.status}`);
  const p = (await res.json()).PropertyTable.Properties[0];
  return { cid: p.CID, smiles: p.IsomericSMILES || p.SMILES, formula: p.MolecularFormula, mw: p.MolecularWeight, iupac: p.IUPACName };
});
// Narration audio: macOS text-to-speech ("say") → one .m4a per slide in a chosen folder.
ipcMain.handle('tts-voices', () => new Promise((resolve) => {
  if (process.platform !== 'darwin') return resolve([]);
  require('child_process').execFile('say', ['-v', '?'], (err, out) => resolve(err ? [] : out.split('\n').map((l) => l.match(/^(.+?)\s{2,}(\w\w[_-]\w+)/)).filter(Boolean).filter((m) => m[2].startsWith('en')).map((m) => m[1].trim())));
}));
ipcMain.handle('tts-export', async (_e, { slides, voice, rate }) => {
  if (process.platform !== 'darwin') throw new Error('Audio export uses macOS text-to-speech and is only available on Mac.');
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { title: 'Choose a folder for the narration audio', properties: ['openDirectory', 'createDirectory'] });
  if (r.canceled) return null;
  const { execFile } = require('child_process');
  const run = (args) => new Promise((res, rej) => execFile('say', args, (err) => (err ? rej(err) : res())));
  let n = 0;
  for (const sl of slides) {
    if (!sl.text || !sl.text.trim()) continue;
    const file = path.join(r.filePaths[0], `${String(sl.index).padStart(2, '0')} ${sl.name.replace(/[^\w -]+/g, '').slice(0, 40)}.m4a`);
    const args = ['-o', file, '--file-format=m4af', '--data-format=aac', ...(voice ? ['-v', voice] : []), ...(rate ? ['-r', String(rate)] : []), sl.text];
    await run(args); n++;
  }
  shell.openPath(r.filePaths[0]);
  return n;
});
ipcMain.handle('pack-catalog', () => catalog());
ipcMain.handle('gpu-status', () => app.getGPUFeatureStatus());

// Right-click menu: the renderer describes the items; clicks come back as normal menu commands.
ipcMain.on('context-menu', (e, items) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  const build = (list) => list.map((it) => {
    if (it.type === 'separator') return { type: 'separator' };
    if (it.role) return { label: it.label, role: it.role };
    if (it.enabled === false) return { label: it.label, enabled: false };
    if (it.submenu) return { label: it.label, submenu: build(it.submenu) };
    return { label: it.label, click: () => e.sender.send('menu', it.cmd) };
  });
  Menu.buildFromTemplate(build(items)).popup({ window: w });
});
// Cut / Copy / Paste from the picture menus (ctxmenu.js), the same as the native menu's edit roles.
ipcMain.on('edit-role', (e, role) => { if (['cut', 'copy', 'paste'].includes(role)) e.sender[role](); });
ipcMain.handle('install-pack', async (e, id) => {
  // Bundled packs (app folder) are updated in place when writable; otherwise install to userData.
  const root = app.isPackaged ? path.join(app.getPath('userData'), 'iconpacks') : bundledPacks();
  return installPack(id, root, (d, n) => { if (d % 20 === 0 || d === n) e.sender.send('pack-progress', { id, done: d, total: n }); });
});

// "My icons": drawings and AI-generated icons the user saves into their own library.
const myIconsDir = () => path.join(app.getPath('userData'), 'iconpacks', 'mine');
ipcMain.handle('save-user-icon', (_e, { name, svg, tags }) => {
  if (typeof svg !== 'string' || !svg.startsWith('<svg') || svg.length > 5e6) throw new Error('Invalid icon');
  const dir = myIconsDir();
  fs.mkdirSync(path.join(dir, 'svg'), { recursive: true });
  const f = path.join(dir, 'pack.json');
  const pack = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { name: 'My icons', icons: [] };
  const file = `icon-${Date.now().toString(36)}.svg`;
  fs.writeFileSync(path.join(dir, 'svg', file), svg);
  pack.icons.unshift({ file, kb: Math.round(svg.length / 1024), name: String(name || 'My icon').slice(0, 80), category: 'My icons', license: 'own', author: 'You', tags: String(tags || '') });
  fs.writeFileSync(f, JSON.stringify(pack));
  return file;
});
ipcMain.handle('delete-user-icon', (_e, file) => {
  const dir = myIconsDir(), f = path.join(dir, 'pack.json');
  if (!fs.existsSync(f) || typeof file !== 'string' || file.includes('/') || file.includes('..')) return false;
  const pack = JSON.parse(fs.readFileSync(f, 'utf8'));
  pack.icons = pack.icons.filter((i) => i.file !== file);
  fs.writeFileSync(f, JSON.stringify(pack));
  try { fs.unlinkSync(path.join(dir, 'svg', file)); } catch { /* already gone */ }
  return true;
});

// ---------- Clipboard ----------
// SVG markup as text: Figma, Illustrator and Inkscape paste it as editable vectors.
ipcMain.handle('read-clipboard-text', () => clipboard.readText());
// Help › Check for Updates: compares this version with the latest GitHub release (only when asked).
ipcMain.handle('check-updates', async () => {
  const r = await fetch('https://api.github.com/repos/AbdulmateenAderinto/SciCanvas/releases/latest', { headers: { 'User-Agent': 'SciCanvas', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
  const j = await r.json();
  return { current: app.getVersion(), latest: String(j.tag_name || '').replace(/^v/, ''), url: j.html_url, name: j.name || j.tag_name };
});
// Autosave for figures too big for browser storage (written atomically).
const autosavePath = () => path.join(app.getPath('userData'), 'autosave.json');
ipcMain.on('autosave-file', (_e, text) => {
  if (typeof text !== 'string' || text.length > 2e9) return;
  try { fs.writeFileSync(autosavePath() + '.tmp', text); fs.renameSync(autosavePath() + '.tmp', autosavePath()); } catch { /* disk full: nothing to do */ }
});
ipcMain.handle('read-autosave-file', () => { try { return fs.readFileSync(autosavePath(), 'utf8'); } catch { return null; } });
ipcMain.handle('copy-svg', (_e, svg) => { if (typeof svg === 'string' && svg.startsWith('<svg') && svg.length < 50e6) clipboard.writeText(svg); });
ipcMain.handle('copy-image', (_e, dataUrl) => {
  clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
  return true;
});

// ---------- Settings (API key encrypted with the OS keychain via safeStorage) ----------
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() { try { return JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); } catch { return {}; } }
function writeSettings(s) { fs.mkdirSync(path.dirname(settingsFile()), { recursive: true }); fs.writeFileSync(settingsFile(), JSON.stringify(s)); }
function getApiKey() {
  const s = readSettings();
  if (s.apiKeyEnc && safeStorage.isEncryptionAvailable()) {
    try { return safeStorage.decryptString(Buffer.from(s.apiKeyEnc, 'base64')); } catch { /* fall through */ }
  }
  return process.env.ANTHROPIC_API_KEY || null;
}
ipcMain.handle('get-settings', () => {
  const s = readSettings();
  return { hasApiKey: !!getApiKey(), keyFromEnv: !s.apiKeyEnc && !!process.env.ANTHROPIC_API_KEY, author: s.author || '', field: s.field || '', teamFolder: s.teamFolder || '', aiLimit: s.aiLimit || 0, usage: s.usage || {} };
});
ipcMain.handle('save-settings', (_e, { apiKey, clearKey, author, field, teamFolder, aiLimit }) => {
  const s = readSettings();
  if (clearKey) delete s.apiKeyEnc;
  if (apiKey) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this system');
    s.apiKeyEnc = safeStorage.encryptString(apiKey.trim()).toString('base64');
  }
  if (author !== undefined) s.author = author;
  if (field !== undefined) s.field = field;
  if (teamFolder !== undefined) s.teamFolder = teamFolder;
  if (aiLimit !== undefined) s.aiLimit = Math.max(0, +aiLimit || 0);
  writeSettings(s);
  return true;
});

// ---------- AI figure drafting (Claude API) ----------
ipcMain.handle('ai-generate', async (_e, { system, prompt, image, schema, documents }) => {
  const key = getApiKey();
  if (!key) throw new Error('Add your Anthropic API key in Settings first.');
  // Usage tracking + optional monthly request limit (Settings › AI usage).
  const month = new Date().toISOString().slice(0, 7), st = readSettings();
  const used = (st.usage && st.usage[month]) || { requests: 0, input: 0, output: 0 };
  if (st.aiLimit && used.requests >= st.aiLimit) throw new Error(`Monthly AI limit reached (${st.aiLimit} requests). Raise it in Settings › AI usage.`);
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: key });
  const content = [];
  // Attached PDFs (base64) go first, as document blocks; the API caps a request at 32 MB.
  const docs = Array.isArray(documents) ? documents.filter((d) => d && typeof d.data === 'string') : [];
  if (docs.reduce((n, d) => n + d.data.length, 0) > 30e6) throw new Error('The attached PDFs are too large to send together (limit about 20 MB in total). Attach fewer or smaller files.');
  for (const d of docs) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.data }, ...(d.name ? { title: String(d.name).slice(0, 200) } : {}) });
  if (image) {
    const [meta, data] = image.split(',');
    content.push({ type: 'image', source: { type: 'base64', media_type: meta.slice(5, meta.indexOf(';')), data } });
  }
  content.push({ type: 'text', text: prompt });
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    });
    try {
      const st2 = readSettings(); st2.usage = st2.usage || {};
      const u = st2.usage[month] || { requests: 0, input: 0, output: 0 };
      u.requests++; u.input += response.usage?.input_tokens || 0; u.output += response.usage?.output_tokens || 0;
      st2.usage[month] = u; writeSettings(st2);
    } catch { /* tracking is best-effort */ }
    if (response.stop_reason === 'refusal') throw new Error('The request was declined. Try rephrasing the description.');
    if (response.stop_reason === 'max_tokens') throw new Error('The figure was too large to generate in one go. Try a simpler description.');
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return JSON.parse(text);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error('Your API key was rejected. Check it in Settings.');
    if (err instanceof Anthropic.RateLimitError) throw new Error('Rate limited by the API — wait a moment and try again.');
    if (err instanceof Anthropic.APIConnectionError) throw new Error('Could not reach the Anthropic API. Check your connection.');
    if (err instanceof Anthropic.APIError) throw new Error(`API error ${err.status}: ${err.message}`);
    throw err;
  }
});

// Double-clicking a .scifig file (macOS "open-file"; Windows/Linux pass it on the command line).
let pendingOpen = process.argv.find((a) => a.endsWith('.scifig')) || null;
app.on('open-file', (e, file) => {
  e.preventDefault();
  if (win && !win.isDestroyed()) { app.addRecentDocument(file); watchFile(file); win.webContents.send('open-file', { path: file, content: fs.readFileSync(file, 'utf8') }); }
  else pendingOpen = file;
});
ipcMain.handle('pending-open', () => {
  if (!pendingOpen || !fs.existsSync(pendingOpen)) return null;
  const file = pendingOpen; pendingOpen = null;
  watchFile(file);
  return { path: file, content: fs.readFileSync(file, 'utf8') };
});

// Run from the project folder (npm start), the app is the stock Electron.app, so the Dock, app switcher and About
// box would show Electron's logo. Installed builds already carry the SciCanvas icon.
const DEV_ICON = path.join(__dirname, 'build', 'icon.png');
app.whenReady().then(() => {
  if (!app.isPackaged && fs.existsSync(DEV_ICON)) {
    if (process.platform === 'darwin' && app.dock) app.dock.setIcon(nativeImage.createFromPath(DEV_ICON));
    app.setAboutPanelOptions({ applicationName: 'SciCanvas', applicationVersion: app.getVersion(), iconPath: DEV_ICON });
  }
  createWindow();
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
