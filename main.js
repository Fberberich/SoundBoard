const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
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

  if (process.env.DEBUG_SOUNDBOARD) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Open external links (e.g. VB-Cable, VoiceMeeter) in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  ensureSoundsDir();
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

// Fallback: load sound as ArrayBuffer for Blob URL playback (if protocol fails)
ipcMain.handle('load-sound-buffer', (_, name) => {
  const filePath = path.join(SOUNDS_DIR, name);
  if (!path.resolve(filePath).startsWith(path.resolve(SOUNDS_DIR)) || !fs.existsSync(filePath)) {
    return null;
  }
  const buf = fs.readFileSync(filePath);
  return new Uint8Array(buf).buffer;
});

ipcMain.handle('remove-sound', (_, name) => {
  const filePath = path.join(SOUNDS_DIR, name);
  if (filePath.startsWith(SOUNDS_DIR) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});
