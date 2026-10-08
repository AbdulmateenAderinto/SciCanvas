// SciCanvas — Electron main process: window, menus, file I/O, network fetches, PDF export.
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, clipboard, nativeImage, safeStorage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const { installPack, catalog } = require('./scripts/packs');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'SciCanvas',
    backgroundColor: '#f4f5f7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('closed', () => { win = null; });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  buildMenu();
}

// Menu commands go to the focused window; if every window was closed (the app stays running on macOS),
// open a fresh one and deliver the command once it has loaded.
const send = (cmd) => () => {
  const w = BrowserWindow.getFocusedWindow() || (win && !win.isDestroyed() ? win : null);
  if (w) { w.webContents.send('menu', cmd); return; }
  createWindow();
  win.webContents.once('did-finish-load', () => win.webContents.send('menu', cmd));
};

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
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: send('saveAs') },
        { type: 'separator' },
        { label: 'Import Image…', accelerator: 'CmdOrCtrl+I', click: send('importImage') },
        { label: 'Export…', accelerator: 'CmdOrCtrl+E', click: send('export') },
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
        { label: 'Duplicate', accelerator: 'CmdOrCtrl+D', click: send('duplicate') },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: send('selectAll') },
        { label: 'Copy as Image', accelerator: 'CmdOrCtrl+Shift+C', click: send('copyImage') },
        { type: 'separator' },
        { label: 'Group', accelerator: 'CmdOrCtrl+G', click: send('group') },
        { label: 'Ungroup', accelerator: 'CmdOrCtrl+Shift+G', click: send('ungroup') },
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
        { label: 'Generate with AI…', accelerator: 'CmdOrCtrl+K', click: send('ai') },
        { label: 'Numbered Badge', click: send('badgeTool') },
        { label: 'Comment', click: send('commentTool') },
        { type: 'separator' },
        { label: 'Create Icon with AI…', click: send('aiIcon') },
        { label: 'Save Selection as Icon…', click: send('saveIcon') },
        { label: 'Icon Libraries…', click: send('libraries') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: send('zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: send('zoomOut') },
        { label: 'Fit to Window', accelerator: 'CmdOrCtrl+0', click: send('zoomFit') },
        { type: 'separator' },
        { label: 'Toggle Grid', accelerator: "CmdOrCtrl+'", click: send('toggleGrid') },
        { label: 'Toggle Rulers', accelerator: 'CmdOrCtrl+R', click: send('toggleRulers') },
        { label: 'Toggle Smart Alignment', click: send('toggleSnap') },
        { label: 'Snap to Grid', click: send('toggleSnapGrid') },
        { type: 'separator' },
        { label: 'Present Slides', accelerator: 'CmdOrCtrl+Enter', click: send('present') },
        { type: 'separator' },
        { label: 'Help', accelerator: 'F1', click: send('help') },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- IPC ----------
const FIG_FILTER = [{ name: 'SciCanvas Figure', extensions: ['scifig'] }];

ipcMain.handle('open-figure', async () => {
  const r = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow() || win, { filters: FIG_FILTER, properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return null;
  app.addRecentDocument(r.filePaths[0]);
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
  return target;
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
      try { const pack = JSON.parse(fs.readFileSync(f, 'utf8')); pack.id = id; pack.base = pathToFileURL(path.join(root, id, 'svg')).href; packs.push(pack); } catch { /* skip broken pack */ }
    }
  }
  return packs;
});
ipcMain.handle('read-pack-icon', (_e, { pack, file }) => {
  const d = packDir(pack);
  if (!d || typeof file !== 'string' || file.includes('/') || file.includes('..')) throw new Error('Bad icon reference');
  return fs.readFileSync(path.join(d, 'svg', file), 'utf8');
});
ipcMain.handle('pack-catalog', () => catalog());
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
  return { hasApiKey: !!getApiKey(), keyFromEnv: !s.apiKeyEnc && !!process.env.ANTHROPIC_API_KEY, author: s.author || '', field: s.field || '' };
});
ipcMain.handle('save-settings', (_e, { apiKey, clearKey, author, field }) => {
  const s = readSettings();
  if (clearKey) delete s.apiKeyEnc;
  if (apiKey) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Secure storage is not available on this system');
    s.apiKeyEnc = safeStorage.encryptString(apiKey.trim()).toString('base64');
  }
  if (author !== undefined) s.author = author;
  if (field !== undefined) s.field = field;
  writeSettings(s);
  return true;
});

// ---------- AI figure drafting (Claude API) ----------
ipcMain.handle('ai-generate', async (_e, { system, prompt, image, schema }) => {
  const key = getApiKey();
  if (!key) throw new Error('Add your Anthropic API key in Settings first.');
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey: key });
  const content = [];
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
