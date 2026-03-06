# SoundBoard

A desktop sound board app built with Electron. Add your own sounds and trigger them with a click.

![SoundBoard](https://img.shields.io/badge/Electron-28-47848f?style=flat-square&logo=electron)

## Features

- **Click to play** – Each pad plays its sound; the previous sound stops when you press another.
- **Add sounds** – Import MP3, WAV, OGG, or M4A files via “Add sounds”. They are copied into the app’s sound library.
- **Remove sounds** – Hover a pad and click the ✕ to remove it (and delete the file from the library).
- **Packaged with Electron** – Run as a normal desktop app and build installers with electron-builder.

## Quick start

```bash
npm install
npm start
```

## Build installers

```bash
npm run build        # Build for current OS
npm run build:win    # Windows (NSIS)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

Output is in the `dist/` folder.

## Adding sounds

1. Run the app and click **“+ Add sounds”**.
2. Select one or more audio files (MP3, WAV, OGG, M4A, AAC, FLAC).
3. They appear as new pads. Click a pad to play.

Sounds are stored in `assets/sounds/` (or the equivalent inside the built app). You can also drop files into that folder and restart the app.

## Tech stack

- **Electron** – Desktop app and packaging
- **Vanilla JS** – No framework; HTML, CSS, and a small amount of JavaScript
- **Custom `sound://` protocol** – Secure loading of audio from the app’s sound directory

## Creating the GitHub repository

1. On [GitHub](https://github.com/new), create a new repository named `SoundBoard` (or any name you prefer). Do **not** initialize with a README (this project already has one).
2. In this folder, add the remote and push:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/SoundBoard.git
   git branch -M main
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username. If you use SSH: `git@github.com:YOUR_USERNAME/SoundBoard.git`.

## License

MIT
