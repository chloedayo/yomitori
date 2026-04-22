# yomitori ♡

**yomitori** (読み取り) — a love letter to your books, in code.

You've got thousands of ebooks scattered across your drive. Books with anime on the cover. Books you meant to read. Books you forgot you had. Yomitori brings them home — covers, metadata, authors, reading progress — and turns them into a Japanese reading workflow that actually works.

<center>
   <img width="1528" height="969" alt="image" src="https://github.com/user-attachments/assets/94598955-eeaa-41dd-ab46-b18c676876f7" />
   <img width="1528" height="598" alt="image" src="https://github.com/user-attachments/assets/a8e4dc0a-8d74-4683-a41d-aa97646897c1" />
   <img width="1528" height="620" alt="image" src="https://github.com/user-attachments/assets/041e9663-d643-4e03-a241-23d2a3d62247" />
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

1. **Launch yomitori** — a small native splash window appears
2. **Pick your books folder** — the root directory of your collection (first run only)
3. The splash reports progress while services start in the background
4. **Open Yomitori** — click the button on the ready pane; your default browser opens the app at `http://localhost:3000`
5. **Wait for indexing** — first crawl takes a few minutes depending on collection size; covers and metadata are extracted automatically

The Tauri window is only a launcher/splash. The actual app runs in your browser tab — use it like any other web app (bookmark it, open multiple tabs, use DevTools). The launcher keeps running in your **system tray**. Click the tray icon → **Show** to bring the splash back; **Quit** kills the services and exits.

## How it works

Yomitori ships as a native launcher that supervises two local services:

- **Middleware** on `127.0.0.1:3000` — serves the React SPA and proxies `/api/*` to the backend. This is what your browser tab connects to.
- **Backend** on `127.0.0.1:8080` — Spring Boot + SQLite. Internal only; the browser never hits it directly.

Both bind to loopback. Nothing is reachable from your LAN in desktop mode. No CORS — same-origin by design.

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Middleware (loopback) | Serves SPA, proxies `/api`, hosts `/tokenize` + `/deinflect` + mining |
| 8080 | Backend (loopback) | Spring REST + SQLite; internal only |

For server/self-host (Docker) usage see the [Docker section](#alternative-docker--server-mode) below.

---

## Features

### Library
- Covers extracted from every EPUB, PDF, CBR, and CBZ
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
- Mobile-optimized: compact controls, touch navigation, responsive layout

### Dictionary popup ♡
Select any text while reading → an instant popup appears with:
- Deinflected definitions (conjugation-aware: 食べている → 食べる)
- All matched forms with kanji drill-down (click any kanji for an inline sub-lookup)
- Alternate / "see also" forms, each independently expandable
- **+Anki** — add directly to Anki from the popup
- **+Dict** — save to your personal dictionary
- **✏ Inline** — attach a note right at that word in the text

Uses your local Yomichan dictionaries — no internet required.

### Word mining
1. Open a book in the reader
2. (Optional) Settings → Mining Filter → pick frequency source + rank range
3. Hit the **Mine** button — Kuromoji tokenizes the entire book
4. Matched words auto-export to Anki in the background
5. Every word also lands in your **Personal Dictionary**

Mining runs in the middleware process and survives page reloads. Hit Mine again to stop and clear the queue.

### Personal dictionary
Every word you mine or look up is saved locally in your browser (IndexedDB). Browse by kana row, filter by frequency source, see SRS status alongside each entry.

### SRS quiz (ARIA algorithm)
Spaced repetition for your mined vocabulary, fully offline. Modes:
- **Scheduled** — ARIA-selected due cards, ~15% new words per session
- **Custom** — filter by frequency source, rank range, or status
- **Endless** — no session limit, run until you stop
- **Hardcore** — one wrong answer ends the session (💀)

Stats dashboard: accuracy ring, interval histogram, activity heatmap, session history with per-mode charts.

### Inline annotations
Select text → **✏ Inline** in the popup → type a note. Injected right at the word in the reading flow, in the correct writing direction. Hover to dismiss, click to edit. Persists per book, survives navigation.

---

## Dictionaries

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

---

## AnkiConnect setup

Mining and popup +Anki require [AnkiConnect](https://ankiweb.net/shared/info/2055492159) installed in Anki.

1. Install AnkiConnect add-on in Anki (code: `2055492159`)
2. Keep Anki running while reading
3. That's it — yomitori finds it at `localhost:8765` automatically

Works with the [Lapis](https://github.com/donkuri/Lapis) card template.

---

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
