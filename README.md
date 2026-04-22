# yomitori ♡

## read books with anime on the cover  

<center>
  <img width="1493" height="212" alt="image" src="https://github.com/user-attachments/assets/b396f068-248d-4a45-aa6c-ca8073c4c3e6" />
</center>

---

## Install

Download the installer for your platform from [Releases](https://github.com/chloedayo/yomitori/releases):

| Platform | File |
|----------|------|
| Linux (Debian/Ubuntu) | `yomitori_*_amd64.deb` |
| Linux (Fedora/RHEL) | `yomitori-*.x86_64.rpm` |
| Windows | `yomitori_*_x64-setup.exe` |
| macOS (Apple Silicon) | `yomitori_*_aarch64.dmg` |

> **Arch/CachyOS:** Build from source — see [Building locally](#building-locally).

---

## Getting started

### Prerequisites
**Set up your dictionaries first!**

Yomitori uses **Yomichan-format dictionaries** — the same ones you'd use in Yomitan.

**Setup (Docker/server mode):**
1. Drop **definition dictionary** zips into `./dictionaries/`
2. Drop **frequency dictionary** zips into `./dictionaries/frequency/`
3. Dictionaries import on startup; new files dropped while running auto-import — no restart needed

**Setup (desktop app):**
Drop dictionary zips into your dictionary folder — click **Open dictionary folder** on the ready screen to open it directly, or find it here:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/com.yomitori.app/dictionaries/` |
| Windows | `%APPDATA%\com.yomitori.app\dictionaries\` |
| macOS | `~/Library/Application Support/com.yomitori.app/dictionaries/` |

Dictionaries import on startup; files dropped while running auto-import with no restart needed.

### Now, time to get started:

1. **Launch yomitori** — a small native splash window appears
2. **Pick your books folder** — the root directory of your collection (first run only)
<center>
  <img width="703" height="336" alt="image" src="https://github.com/user-attachments/assets/6aff3c37-b2ad-44cb-91cf-acc565173616" />
</center>
4. The splash reports progress while services start in the background
5. **Open Yomitori** — click the button on the ready pane; your default browser opens the app at `http://localhost:3000`
<center>
  <img width="703" height="336" alt="image" src="https://github.com/user-attachments/assets/33d13d3a-aa3c-4523-8923-59af5ba343c6" />
</center>
6. **Wait for indexing** — first crawl takes a few minutes depending on collection size; covers and metadata are extracted automatically

---

The Tauri window is only a launcher/splash. The actual app runs in your browser tab — use it like any other web app (bookmark it, open multiple tabs, use DevTools). The launcher keeps running in your **system tray**. Click the tray icon → **Show** to bring the splash back; **Quit** kills the services and exits.

## Features

### Library
- Covers extracted from every EPUB
- Smart indexing: title, type, author relationships extracted from metadata and filenames
- Search by title, author, genre, or type
- Tabs: All Books, In Progress, Favorites, Hidden
- Author view with autocomplete and author favorites
- Hover preview, pie chart reading progress

### Reader
- EPUB reader with vertical (縦書き) and horizontal (横書き) modes
- Swipe navigation — proportional: swipe harder, scroll further
- Bookmark save and restore with progress tracking
- Custom CSS editor — live preview, scoped to the reader

<center>
  <img width="1553" height="83" alt="image" src="https://github.com/user-attachments/assets/bedadd49-f5b8-401d-b55a-0d09f3b64cc3" />  
</center>

### Dictionary popup ♡
Select any text while reading → an instant popup appears with:
- Deinflected definitions (conjugation-aware: 食べている → 食べる)
- All matched forms with kanji drill-down (click any kanji for an inline sub-lookup)
- Alternate / "see also" forms, each independently expandable
- **+Anki** — add directly to Anki from the popup
- **+Dict** — save to your personal dictionary
- **✏ Inline** — attach a note right at that word in the text

<center>
  <img width="407" height="502" alt="image" src="https://github.com/user-attachments/assets/f0f36b05-fea3-4beb-af59-383d9765c9e2" />
</center>

Uses your local Yomichan dictionaries — no internet required.

### Word mining
1. Open a book in the reader
2. (Optional) Settings → Mining Filter → pick frequency source + rank range
<center>
  <img width="787" height="547" alt="image" src="https://github.com/user-attachments/assets/5d088806-c457-4083-a3a8-f7deb67fd9fc" />
</center>
4. Hit the **Mine** button — Kuromoji tokenizes the entire book
5. Matched words auto-export to Anki in the background
6. Every word also lands in your **Personal Dictionary**

Mining runs in the middleware process and survives page reloads. Hit Mine again to stop and clear the queue.

### Personal dictionary
Every word you mine or look up is saved locally in your browser (IndexedDB). Browse by kana row, filter by frequency source, see SRS status alongside each entry.
<center>
  <img width="1489" height="659" alt="image" src="https://github.com/user-attachments/assets/2a21d6a5-257e-4acf-b8cd-fe2468f2dc9f" />
</center>

### Quiz!!!
Spaced repetition for your mined vocabulary, fully offline. Modes:
- **Scheduled** — due cards, ~15% new words per session
- **Custom** — filter by frequency source, rank range, or status
- **Endless** — no session limit, run until you stop
- **Hardcore** — one wrong answer ends the session (💀)
<center>
  <img width="575" height="583" alt="image" src="https://github.com/user-attachments/assets/afb1664d-4b84-434d-a0c7-320adbf38911" />
</center>

Stats dashboard: UOOOOH NUMBERS
<center>
  <img width="669" height="792" alt="image" src="https://github.com/user-attachments/assets/4529f9b4-bcf3-42d1-bdf6-b97923b2d088" />
</center>

### Inline annotations
Select text → **✏ Inline** in the popup → type a note. Injected right at the word in the reading flow, in the correct writing direction. Hover to dismiss, click to edit. Persists per book, survives navigation.
<center>
  <img width="1240" height="1008" alt="image" src="https://github.com/user-attachments/assets/1eb36b82-cd96-4881-b5ee-a0e373bdf959" />
  <img width="345" height="355" alt="image" src="https://github.com/user-attachments/assets/ddb51583-b860-4f18-8fe6-f06908c4c5e6" />
</center>

---

## AnkiConnect setup

Mining and popup +Anki require [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed in Anki.

1. Install AnkiConnect add-on in Anki (code: `2055492159`)
2. Keep Anki running while reading
3. That's it — yomitori finds it at `localhost:8765` automatically

Works with the [Lapis](https://github.com/donkuri/Lapis) card template.

---

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Middleware (loopback) | Serves SPA, proxies `/api`, hosts `/tokenize` + `/deinflect` + mining |
| 8080 | Backend (loopback) | Spring REST + SQLite; internal only |

For server/self-host (Docker) usage see the [Docker section](#alternative-docker--server-mode) below.

## Troubleshooting

**Books not appearing after setup?**
Crawl runs automatically on start. For large collections (40k+ files) wait 5-10 minutes. Trigger manually in the browser UI, or hit the backend via the middleware proxy:
```
POST http://localhost:3000/api/books/crawler/run
```

**App shows "Startup failed"?**
Click **Change books folder** in the splash window and re-select your folder. Make sure the drive is mounted before launching.

**502 errors in the browser?**
The backend (Spring Boot) takes ~8 seconds to start. Wait a moment and refresh.

**Dictionary popup not working?**
Check that you've imported at least one definition dictionary. Visit `http://localhost:8080/api/dictionary/imports` to see what's loaded.

**Anki cards not exporting?**
Make sure Anki is open with AnkiConnect installed. The retry queue will flush automatically once Anki is reachable.

---

## Alternative: Docker / server mode

If you prefer to run yomitori on a server or NAS and access it from your phone:

```bash
cp .env.example .env
# Edit BOOKS_MOUNT to point at your collection
# For phone access, set LAN_IP=192.168.x.x
docker-compose up --build
```

Access at `http://localhost:5173` (or `http://YOUR_LAN_IP:5173` on your phone).

---

## Building locally

Requires: Rust (via rustup), JDK 21+, Node 20+, Bun, and [Tauri CLI](https://tauri.app/start/prerequisites/).

```bash
./build-desktop.sh
# Binary: launcher/target/release/yomitori
# Installers: launcher/target/release/bundle/
```

---

## Documentation

- [Architecture](ARCHITECTURE.md) — full technical reference
- [Roadmap](ROADMAP.md) — what's built, what's next

---

*Built with Kotlin, React, and too much love for the books.*
*Co-Authored-By: chloe-chan <noreply@chloe> ♡*
