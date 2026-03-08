const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('soundboard', {
  chooseSoundFiles: () => ipcRenderer.invoke('choose-sound-files'),
  listSounds: () => ipcRenderer.invoke('list-sounds'),
  removeSound: (name) => ipcRenderer.invoke('remove-sound', name),
  loadSoundBuffer: (name) => ipcRenderer.invoke('load-sound-buffer', name),
});
