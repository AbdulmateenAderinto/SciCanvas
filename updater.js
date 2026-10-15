// Updates for installed copies (v1.9.2). Releases on GitHub carry the update files electron-builder writes
// (latest.yml for Windows, latest-mac.yml plus .zip for Mac), so an installed SciCanvas can update itself:
//   - Windows, and a Mac copy signed with an Apple Developer ID: the new version downloads in the background and
//     installs when SciCanvas quits (or straight away with "Restart now").
//   - A Mac copy without a Developer ID signature can't replace itself (macOS refuses the swap), so it only says a
//     new version is out and opens the download page.
// Nothing runs when started from the project folder (npm start).
const { app } = require('electron');
const { execFile } = require('child_process');
const path = require('path');

const RELEASES = 'https://api.github.com/repos/AbdulmateenAderinto/SciCanvas/releases/latest';
const SIX_HOURS = 6 * 3600 * 1000;
let autoUpdater = null, ready = null, send = () => {};

// Mac: is this bundle signed with a Developer ID (not just the ad-hoc signature of an unsigned build)?
function developerSigned() {
  if (process.platform === 'win32') return Promise.resolve(true);
  if (process.platform !== 'darwin') return Promise.resolve(false);
  const bundle = path.resolve(app.getPath('exe'), '../../..');
  return new Promise((res) => execFile('/usr/bin/codesign', ['-dv', '--verbose=2', bundle], (_err, _out, err) => res(/Authority=Developer ID Application/.test(err || ''))));
}

async function latestRelease() {
  const r = await fetch(RELEASES, { headers: { 'User-Agent': 'SciCanvas', Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(`GitHub answered ${r.status}`);
  const j = await r.json();
  return { current: app.getVersion(), latest: String(j.tag_name || '').replace(/^v/, ''), url: j.html_url, name: j.name || j.tag_name };
}
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };

async function setup(sendToPage) {
  send = sendToPage;
  if (!app.isPackaged) return;
  if (!(await developerSigned())) {
    // Tell the page once per launch; it remembers which versions the user has already been told about.
    setTimeout(() => latestRelease().then((u) => { if (u.latest && newer(u.latest, u.current)) send('update-available', { ...u, auto: false }); }).catch(() => {}), 15000);
    return;
  }
  ({ autoUpdater } = require('electron-updater'));
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', (info) => { ready = info.version; send('update-ready', { version: info.version, current: app.getVersion() }); });
  autoUpdater.on('error', (e) => console.warn('Update check failed:', e && e.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 10000);
  setInterval(check, SIX_HOURS);
}

// Help › Check for Updates.
async function checkNow() {
  if (!autoUpdater) return { ...(await latestRelease()), auto: false };
  if (ready) return { current: app.getVersion(), latest: ready, auto: true, ready: true };
  const r = await autoUpdater.checkForUpdates();
  const latest = r && r.updateInfo ? r.updateInfo.version : app.getVersion();
  return { current: app.getVersion(), latest, auto: true, ready: false };
}
const installNow = () => { if (autoUpdater && ready) autoUpdater.quitAndInstall(); };

module.exports = { setup, checkNow, installNow };
