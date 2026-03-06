const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const SOUNDS_DIR = path.join(__dirname, 'assets', 'sounds');
let mainWindow;

function ensureSoundsDir() {
  if (!fs.existsSync(SOUNDS_DIR)) fs.mkdirSync(SOUNDS_DIR, { recursive: true });
}

function createWindow() {
  ensureSoundsDir();
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

const MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac' };

app.whenReady().then(() => {
  ensureSoundsDir();
  protocol.handle('sound', (request) => {
    const url = request.url.replace('sound://', '');
    const filePath = path.join(SOUNDS_DIR, decodeURIComponent(url));
    if (!path.resolve(filePath).startsWith(path.resolve(SOUNDS_DIR))) return new Response('Forbidden', { status: 403 });
    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME[ext] || 'application/octet-stream';
      const buffer = fs.readFileSync(filePath);
      return new Response(buffer, { headers: { 'Content-Type': contentType } });
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('choose-sound-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
      { name: 'All', extensions: ['*'] },
    ],
  });
  if (result.canceled) return [];
  ensureSoundsDir();
  const added = [];
  for (const src of result.filePaths) {
    const name = path.basename(src);
    const dest = path.join(SOUNDS_DIR, name);
    fs.copyFileSync(src, dest);
    added.push(name);
  }
  return added;
});

ipcMain.handle('list-sounds', () => {
  ensureSoundsDir();
  const names = fs.readdirSync(SOUNDS_DIR).filter((n) =>
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n)
  );
  return names;
});

ipcMain.handle('remove-sound', (_, name) => {
  const filePath = path.join(SOUNDS_DIR, name);
  if (filePath.startsWith(SOUNDS_DIR) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});
