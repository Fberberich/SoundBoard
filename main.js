const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// When packaged, __dirname is inside app.asar (read-only). Use userData for sounds.
function getSoundsDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'sounds')
    : path.join(__dirname, 'assets', 'sounds');
}
let mainWindow;

function ensureSoundsDir() {
  const dir = getSoundsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
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
  const soundsDir = getSoundsDir();
  const added = [];
  for (const src of result.filePaths) {
    const name = path.basename(src);
    const dest = path.join(soundsDir, name);
    fs.copyFileSync(src, dest);
    added.push(name);
  }
  return added;
});

ipcMain.handle('list-sounds', () => {
  ensureSoundsDir();
  const soundsDir = getSoundsDir();
  const names = fs.readdirSync(soundsDir).filter((n) =>
    /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(n)
  );
  return names;
});

ipcMain.handle('load-sound-buffer', (_, name) => {
  const soundsDir = getSoundsDir();
  const filePath = path.join(soundsDir, name);
  if (!path.resolve(filePath).startsWith(path.resolve(soundsDir)) || !fs.existsSync(filePath)) {
    return null;
  }
  const buf = fs.readFileSync(filePath);
  return new Uint8Array(buf).buffer;
});

ipcMain.handle('remove-sound', (_, name) => {
  const soundsDir = getSoundsDir();
  const filePath = path.join(soundsDir, name);
  if (path.resolve(filePath).startsWith(path.resolve(soundsDir)) && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
});
