const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  onMenu: (fn) => ipcRenderer.on('menu', (_e, cmd) => fn(cmd)),
  openFigure: () => ipcRenderer.invoke('open-figure'),
  saveFigure: (args) => ipcRenderer.invoke('save-figure', args),
  pickImages: () => ipcRenderer.invoke('pick-images'),
  exportFile: (args) => ipcRenderer.invoke('export-file', args),
  exportPdf: (args) => ipcRenderer.invoke('export-pdf', args),
  fetchPdb: (id) => ipcRenderer.invoke('fetch-pdb', id),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  listPacks: () => ipcRenderer.invoke('list-packs'),
  readPackIcon: (pack, file) => ipcRenderer.invoke('read-pack-icon', { pack, file }),
  packCatalog: () => ipcRenderer.invoke('pack-catalog'),
  installPack: (id) => ipcRenderer.invoke('install-pack', id),
  saveUserIcon: (icon) => ipcRenderer.invoke('save-user-icon', icon),
  deleteUserIcon: (file) => ipcRenderer.invoke('delete-user-icon', file),
  onPackProgress: (fn) => ipcRenderer.on('pack-progress', (_e, p) => fn(p)),
  copyImage: (dataUrl) => ipcRenderer.invoke('copy-image', dataUrl),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  aiGenerate: (req) => ipcRenderer.invoke('ai-generate', req),
  fetchImage: (url) => ipcRenderer.invoke('fetch-image', url),
});
