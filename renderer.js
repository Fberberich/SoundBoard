const padsEl = document.getElementById('pads');
const emptyState = document.getElementById('empty-state');
const addBtn = document.getElementById('add-sounds');

const sounds = new Map(); // name -> HTMLAudioElement

function getDisplayName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

function createPad(name) {
  const url = `sound://${encodeURIComponent(name)}`;
  const audio = new Audio(url);
  sounds.set(name, audio);

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

  return pad;
}

function playSound(name, padEl) {
  for (const [, a] of sounds) {
    a.pause();
    a.currentTime = 0;
  }
  const audio = sounds.get(name);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
  document.querySelectorAll('.pad.playing').forEach((el) => el.classList.remove('playing'));
  if (padEl) padEl.classList.add('playing');
}

function removeSound(name) {
  const audio = sounds.get(name);
  if (audio) {
    audio.pause();
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
    padsEl.appendChild(createPad(name));
  }
  updateEmptyState();
}

addBtn.addEventListener('click', async () => {
  const added = await window.soundboard.chooseSoundFiles();
  if (added.length) await loadSounds();
});

loadSounds();
