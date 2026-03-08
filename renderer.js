const padsEl = document.getElementById('pads');
const emptyState = document.getElementById('empty-state');
const addBtn = document.getElementById('add-sounds');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const devicePlaybackSelect = document.getElementById('device-playback');
const deviceVoiceChatSelect = document.getElementById('device-voice-chat');
const settingsApplyBtn = document.getElementById('settings-apply');

const sounds = new Map(); // name -> { audio: HTMLAudioElement, blobUrl?: string }
const voiceChatAudios = new Set(); // secondary Audio elements for "what others hear"

const STORAGE_PLAYBACK = 'soundboard-playback-device';
const STORAGE_VOICE_CHAT = 'soundboard-voice-chat-device';

const MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac' };

function getDisplayName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

function getMime(name) {
  const ext = name.replace(/^.*\./, '').toLowerCase();
  return MIME['.' + ext] || 'audio/mpeg';
}

async function createPad(name) {
  const arrayBuffer = await window.soundboard.loadSoundBuffer(name);
  if (!arrayBuffer) return null;
  const blob = new Blob([arrayBuffer], { type: getMime(name) });
  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);
  sounds.set(name, { audio, blobUrl });

  const pad = document.createElement('button');
  pad.type = 'button';
  pad.className = 'pad';
  pad.dataset.name = name;
  pad.innerHTML = `
    <span class="pad-icon">♪</span>
    <span class="pad-label">${getDisplayName(name)}</span>
    <button type="button" class="btn btn-danger pad-remove" aria-label="Remove">✕</button>
  `;

  const removeBtn = pad.querySelector('.pad-remove');
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeSound(name);
  });

  pad.addEventListener('click', (e) => {
    if (e.target === removeBtn) return;
    playSound(name, pad);
  });

  audio.addEventListener('play', () => pad.classList.add('playing'));
  audio.addEventListener('ended', () => pad.classList.remove('playing'));
  audio.addEventListener('pause', () => pad.classList.remove('playing'));
  audio.addEventListener('error', () => {
    console.error('Audio error:', name, audio.error?.message);
  });

  return pad;
}

async function playSound(name, padEl) {
  const playbackDeviceId = localStorage.getItem(STORAGE_PLAYBACK) || '';
  const voiceChatDeviceId = localStorage.getItem(STORAGE_VOICE_CHAT) || '';

  for (const [, entry] of sounds) {
    entry.audio.pause();
    entry.audio.currentTime = 0;
  }
  voiceChatAudios.forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });
  voiceChatAudios.clear();

  const entry = sounds.get(name);
  if (!entry) return;

  const blobUrl = entry.blobUrl;
  entry.audio.currentTime = 0;

  if (playbackDeviceId && typeof entry.audio.setSinkId === 'function') {
    try {
      await entry.audio.setSinkId(playbackDeviceId);
    } catch (e) {
      console.warn('setSinkId (playback) failed:', e);
    }
  }

  if (voiceChatDeviceId && blobUrl && typeof entry.audio.setSinkId === 'function') {
    try {
      const voiceAudio = new Audio(blobUrl);
      await voiceAudio.setSinkId(voiceChatDeviceId);
      voiceAudio.currentTime = 0;
      voiceChatAudios.add(voiceAudio);
      voiceAudio.addEventListener('ended', () => voiceChatAudios.delete(voiceAudio));
      voiceAudio.addEventListener('error', () => voiceChatAudios.delete(voiceAudio));
      voiceAudio.play().catch((err) => {
        console.warn('Voice chat playback failed:', err);
        voiceChatAudios.delete(voiceAudio);
      });
    } catch (e) {
      console.warn('setSinkId (voice chat) failed:', e);
    }
  }

  entry.audio.play().catch((err) => console.error('Play failed:', name, err));

  document.querySelectorAll('.pad.playing').forEach((el) => el.classList.remove('playing'));
  if (padEl) padEl.classList.add('playing');
}

function removeSound(name) {
  const entry = sounds.get(name);
  if (entry) {
    entry.audio.pause();
    if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl);
    sounds.delete(name);
  }
  const pad = padsEl.querySelector(`[data-name="${name}"]`);
  if (pad) pad.remove();
  window.soundboard.removeSound(name);
  updateEmptyState();
}

function updateEmptyState() {
  const count = padsEl.querySelectorAll('.pad').length;
  emptyState.classList.toggle('visible', count === 0);
}

async function loadSounds() {
  const names = await window.soundboard.listSounds();
  padsEl.innerHTML = '';
  sounds.clear();
  for (const name of names) {
    const pad = await createPad(name);
    if (pad) padsEl.appendChild(pad);
  }
  updateEmptyState();
}

addBtn.addEventListener('click', async () => {
  const added = await window.soundboard.chooseSoundFiles();
  if (added.length) await loadSounds();
});

async function getAudioOutputDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audiooutput');
}

function fillDeviceSelect(select, currentId, addEmptyOption = false) {
  const value = select.value;
  select.innerHTML = '';
  if (addEmptyOption) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = select.id === 'device-voice-chat' ? 'None' : 'Default device';
    select.appendChild(opt);
  }
  getAudioOutputDevices().then((outputs) => {
    outputs.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || d.deviceId.slice(0, 32) || 'Output device';
      select.appendChild(opt);
    });
    if (currentId) select.value = currentId;
    else if (value) select.value = value;
  });
}

function openSettings() {
  settingsPanel.classList.remove('hidden');
  fillDeviceSelect(devicePlaybackSelect, localStorage.getItem(STORAGE_PLAYBACK), true);
  fillDeviceSelect(deviceVoiceChatSelect, localStorage.getItem(STORAGE_VOICE_CHAT), true);
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
}

btnSettings.addEventListener('click', openSettings);

settingsApplyBtn.addEventListener('click', () => {
  const playback = devicePlaybackSelect.value || '';
  const voiceChat = deviceVoiceChatSelect.value || '';
  if (playback) localStorage.setItem(STORAGE_PLAYBACK, playback);
  else localStorage.removeItem(STORAGE_PLAYBACK);
  if (voiceChat) localStorage.setItem(STORAGE_VOICE_CHAT, voiceChat);
  else localStorage.removeItem(STORAGE_VOICE_CHAT);
  closeSettings();
});

settingsPanel.addEventListener('click', (e) => {
  if (e.target === settingsPanel) closeSettings();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) closeSettings();
});

loadSounds();
