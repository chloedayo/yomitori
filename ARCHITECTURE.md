# Yomitori Architecture (v1.0)

Deep technical reference for yomitori — book library + Japanese reader + word mining pipeline.

**Shipping model (v1.0):** Tauri launcher shows a native splash that manages sidecars (backend + middleware). The full React SPA runs in the user's default browser at `http://localhost:3000`. Same-origin — no CORS anywhere in desktop mode.

---

## 1. High-Level Shape

```
┌─ Tauri launcher (Rust, launcher/) ──────────────────────────────┐
│                                                                 │
│  Splash window (splash/index.html, splash/loading.js)           │
│    • first-run wizard (folder picker via IPC)                   │
│    • progress UI driven by `splash://progress` events           │
│    • "Open Yomitori" button → open system browser + hide window │
│                                                                 │
│  Sidecar supervisor:                                            │
│    spawn_backend      →  Spring Boot, 127.0.0.1:8080            │
│    spawn_middleware   →  bun binary,  127.0.0.1:3000            │
│    health poll (30s)  →  GET http://localhost:3000/health       │
│    splash://ready | splash://error on terminal state            │
│                                                                 │
│  Tray: Show, Quit (kills sidecars then exits)                   │
└───────────┬──────────────────────────────┬──────────────────────┘
            │ sidecar                      │ sidecar
            ▼                              ▼
┌─ Middleware (bun, 127.0.0.1:3000) ─────┐   ┌─ Backend (Spring, 127.0.0.1:8080) ─┐
│  • Static: serves frontend/dist + SPA  │   │  REST /api/books /api/authors      │
│    fallback                            │◄──│       /api/dictionary /api/proxy   │
│  • Proxy: /api/* → backend             │   │  SQLite + JPA (single-writer)      │
│  • Japanese: /tokenize /deinflect      │   │  Crawler, dict import, author svc  │
│              /extract-baseForms        │   │  Streams /books/** (file:)         │
│  • Mining:   /mine-words               │   │  No CORS. No bind outside loopback │
│  • Anki:     /anki/can-add             │   └───────────────┬────────────────────┘
│  • Health:   /health                   │                   │
└───────────────┬────────────────────────┘                   ▼
                │                                   ┌─────────────────┐
                ▼ (same-origin to browser)          │  SQLite + FS    │
        http://localhost:3000 ◄── user's browser    │  books / dicts  │
                                                    └─────────────────┘
```

The browser tab is the app. The Tauri window exists only as a native launcher / splash / error surface.

---

## 2. Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Launcher shell | Tauri 2 (Rust) | Native window, sidecar lifecycle, system tray, IPC |
| Splash UI | Static HTML/CSS/JS (`launcher/splash/`) | Setup wizard, progress, ready pane |
| Backend | Kotlin / Spring Boot 3.x | REST API, crawler, dictionary service |
| Database | SQLite (file-based) | Books, authors, dictionary entries, frequencies |
| ORM | Hibernate / JPA | Entity persistence |
| Frontend | React 18 + TypeScript + Vite | SPA reader + library UI (runs in browser tab) |
| Middleware | bun + restify + Kuromoji | Serves SPA, proxies API, tokenization, mining |
| Containerization | Docker Compose | Server/self-host mode (orthogonal to desktop) |
| Distribution | Tauri installers via GitHub Actions | `.deb` / `.rpm` / `.exe` (NSIS) / `.dmg` |
| Integration | AnkiConnect (external) | Flashcard export |

---

## 3. Ports, Hosts, Origins

| Component | Bind | Port | Origin |
|-----------|------|------|--------|
| Middleware (desktop) | 127.0.0.1 | 3000 | `http://localhost:3000` (SPA + API proxy) |
| Middleware (Docker) | 0.0.0.0 | 3000 | `http://<host>:3000` (`HOST=0.0.0.0` env) |
| Backend (desktop) | 127.0.0.1 | 8080 | internal-only; never hit directly by browser |
| Backend (Docker) | 0.0.0.0 | 8080 | `http://<host>:8080` |
| Tauri splash | n/a | n/a | `tauri://localhost` (splash/index.html) |

**Same-origin by design.** The SPA always fetches from its own origin (relative paths); middleware proxies `/api/*` to the backend over loopback. No `Access-Control-*` headers anywhere. No CORS config in Spring.

---

## 4. Launcher (`launcher/`)

```
launcher/
├── src/
│   ├── main.rs          Entry — calls lib::run()
│   ├── lib.rs           Tauri builder: plugins, commands, tray, exit handler, health poll
│   ├── commands.rs      IPC: get_books_path, open_file_dialog, save_books_path,
│   │                         start_sidecars, open_path (allowlisted), open_logs_dir,
│   │                         open_in_browser_and_hide, get_data_dir, splash_ready, quit_app
│   ├── sidecar.rs       SidecarState (Mutex<Option<CommandChild>>), spawn_backend/middleware, kill_all
│   └── tray.rs          Show / Quit menu, left-click to show, kill on quit
├── splash/              Static splash (frontendDist). index.html + loading.css + loading.js
├── capabilities/
│   └── local.json       ACL for the splash window — local.json only (no remote.json)
├── icons/               Platform icon set
├── binaries/            yomitori-backend-*, yomitori-middleware-* (built by build-desktop.sh)
├── resources/           jre/, yomitori.jar, dist/ (SPA), deinflect-rules.json, kuromoji-dict/
├── Cargo.toml           tauri, tauri-plugin-shell/dialog/store, serde
└── tauri.conf.json      window, tray, externalBin, resources, CSP (default-src 'none')
```

### Health poll

On startup, if `booksPath` is already saved, Rust auto-spawns both sidecars and kicks off a 30-second poll of `http://localhost:3000/health`. Each progress step emits a `splash://progress` event to the splash UI; success emits `splash://ready`; failure or timeout emits `splash://error`. A `splash://trigger-poll` listener lets the splash re-arm the poll after user-driven setup (wizard → `start_sidecars` → trigger-poll).

### `start_sidecars` idempotency

`start_sidecars` is safe to call repeatedly: if both sidecars are already running and the persisted `booksPath` matches the argument, it no-ops. This eliminates the Spring spawn race between launcher auto-spawn and splash-initiated spawn.

### Capabilities

Only `local.json` is shipped — no `remote.json`. The splash page lives at `tauri://localhost`; it is the only origin with IPC access. The main browser tab is pure SPA + HTTP and has no IPC surface.

Key entries in `local.json`:
- `shell:allow-execute` / `shell:allow-kill` — sidecar lifecycle
- `shell:allow-open` scoped to `http://localhost:3000/**` — only app URL can be opened
- `dialog:allow-open` — native folder picker
- `store:allow-*` — persist `booksPath`
- `core:window:allow-hide/show/close/set-focus`

### `open_path` Rust allowlist

`commands.rs::open_path` canonicalizes the requested path and rejects anything that does not live under one of:
- `app_data_dir` (logs, store, kuromoji cache, dictionaries subfolder)
- the persisted `booksPath`
- `resource_dir` (bundled assets)

URLs, sibling dirs, `/etc/passwd`, etc. all fail the `starts_with` predicate. Unit tests in `commands.rs` lock the predicate down.

### CSP

`default-src 'none'; connect-src 'self' ipc: http://ipc.localhost; img-src 'self' data: asset: https://asset.localhost; script-src 'self'; style-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'`

CSP applies to the splash window only. The browser tab is served by the middleware under its own response headers.

---

## 5. Middleware (`middleware/`)

bun + restify. Entry: `middleware/src/server.ts`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Liveness (also gates the launcher's readiness poll) |
| POST | `/tokenize` | Kuromoji tokenization |
| POST | `/deinflect` | Rule-based deinflection (selection popup) |
| POST | `/extract-baseForms` | Bulk base form extraction |
| POST | `/mine-words` | Full mining pipeline (tokenize → lookup → filter → Anki queue) |
| POST | `/anki/can-add` | Batch `canAddNotes` via AnkiConnect; `{ [expression]: boolean }` |
| ALL | `/api/*` | Reverse-proxy to backend (`BACKEND_URL`) |
| GET | everything else | Static serve `YOMITORI_STATIC_DIR` (frontend/dist) + SPA fallback |

Bind: `HOST` env defaults to `127.0.0.1`. Docker mode sets `HOST=0.0.0.0`.

Env passed by the launcher at spawn time:
- `YOMITORI_STATIC_DIR` → resolved to `resource_dir/dist`
- `DEINFLECT_RULES_PATH` → resolved to `resource_dir/deinflect-rules.json`
- `BACKEND_URL` → `http://127.0.0.1:8080`
- kuromoji dictionary path → `resource_dir/kuromoji-dict` (bundled; `bun --compile` breaks `__dirname`)

---

## 6. Backend (`src/main/kotlin/com/yomitori/`)

```
api/               REST controllers (Spring MVC)
config/            Startup runners, schema migration, web config, RestTemplate
dto/               Data transfer objects
model/             JPA entities
repository/        Spring Data JPA repositories
service/           Business logic
  └── strategy/    Cover extraction strategies (pluggable per format)
YomitoriApplication.kt
```

Bind: `SERVER_ADDRESS=127.0.0.1` in desktop mode (set by launcher). `0.0.0.0` in Docker mode.

**No CORS configuration.** `WebConfig` registers no CORS mappings; no controller-level `@CrossOrigin`. Browser traffic arrives same-origin via the middleware proxy.

### Key services

| Service | Role |
|---------|------|
| `CrawlerService` | Scheduled walker; extracts metadata + covers |
| `CoverExtractor` | Strategy per format (EPUB / PDF / CBR / CBZ) |
| `DictionaryParserService` | Unzips Yomichan dicts; emits HTML (`<ruby>` preserved) |
| `StartupJobService` | Single-threaded executor serializing all DB-writing jobs — avoids `SQLITE_BUSY` |
| `AppStartupListener` | `@EventListener(ApplicationReadyEvent)` → `startupJobService.submitAll()` |
| `DictionaryWatcherService` | `WatchService` on dictionaries dir — drop `.zip` → auto-import through queue |
| `DictionaryService` | `lookup` / `batchLookup` joining entries + frequencies |

---

## 7. Database Schema

### `books`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID (app-generated — SQLite JDBC has no `getGeneratedKeys`) |
| filepath | TEXT NOT NULL | Absolute path |
| filename | TEXT NOT NULL | |
| title | TEXT NOT NULL | Extracted from metadata |
| genre | TEXT | |
| type | TEXT NOT NULL | manga / novel / light-novel / textbook / other |
| cover_path | TEXT | Filename in covers dir |
| file_format | TEXT NOT NULL | pdf / epub / cbr / cbz |
| last_indexed | TIMESTAMP | |
| is_deleted | BOOLEAN | Soft-delete |
| manual_override | BOOLEAN | Blocks auto-tag updates |
| created_at / updated_at | TIMESTAMP | |

### `authors`, `book_authors`
Standard name-unique + join table.

### `dictionary_imports`, `dictionary_entries`
UUID-keyed imports. Entries keyed by auto BIGINT; `expression` + `reading` indexed; `definition` is HTML.

### `frequency_sources`, `word_frequency`
Per-source ranks. `is_numeric` bit; string labels land in `frequency_tag`. `source_id` indexed.

### Schema migrations

Custom runner — not Flyway. `SchemaMigration.kt` listens for `ApplicationReadyEvent`, executes `db/migration/V*__*.sql` in order, tracks applied versions.

Current migrations:
- V001 — initial books + authors
- V002 — cover extraction status + retroactive author extraction
- V003 — dictionary tables
- V004 — frequency source + word frequency
- V005 — `frequency_tag`, `is_numeric`

---

## 8. Backend REST API

### Books (`/api/books`)

| Method | Endpoint | |
|--------|----------|-|
| GET | `/search` | Paginated search with filters |
| POST | `/search/bulk` | Search by list of book IDs |
| GET | `/{id}` | Single book |
| GET | `/{id}/cover` | Cover JPEG |
| GET | `/{id}/file` | Stream EPUB/PDF |
| POST | `/{id}/tag` | Update genre/type |
| GET | `/genres` / `/types` / `/stats` | Enumerations + library stats |
| POST | `/crawler/run` | Manual crawl |
| POST | `/admin/extract-authors` | Retroactive author pass |
| GET | `/cover-file/{bookId}` | Alternate cover route |

### Authors (`/api/authors`)
`/autocomplete?query=`, `/{id}`, `/?query=&page=&pageSize=`.

### Dictionary (`/api/dictionary`)
`/imports`, `/frequency-sources`, `/lookup?word=`, `/batch-lookup`, `/reimport`.

### Crawler / Proxy (`/api/crawler`, `/api/proxy`)
`/trigger`; `/jisho?word=`, `/anki` (forwards to AnkiConnect LAN).

See the previous section's component list for service boundaries.

---

## 9. Frontend (`frontend/`)

React 18 + Vite. **All network calls use relative paths** via `lib/resolvePath.ts`:

```ts
export function resolvePath(path: string): string { return path; }
export function resolveMiddlewarePath(path: string): string { return path; }
```

Pass-through helpers (not React hooks — the earlier `useProxy` name tripped `react-hooks/rules-of-hooks`; renamed in v1.0).

```
frontend/src/
├── api/              REST clients (bookClient, dictionaryClient, jishoClient)
├── components/       Reusable UI (BookCard, BookGrid, SearchForm, CardMenu, TabsMenu)
├── hooks/            useLibrary, useLocalStorage, useAuthorAutocomplete, useInlineAnnotations
├── lib/              resolvePath, tauriApi (isTauri guard for SetupWizard only)
├── reader/           EpubReader, ReaderPage, ReaderUI, DefinitionPopup, InlineAnnotationInput,
│                     SettingsModal, useSelectionDefinition, useWordMiner, useCustomCSS, WordMinerPanel
├── services/         ankiService, ankiQueueService, dictionaryStore, reviewStore, inlineAnnotationStore (IDB)
├── views/
│   ├── QuizView, StatsView, AuthorsView, DictionaryView, HomePage, TitlesView
│   └── SetupWizard   Shown by main.tsx inside Tauri splash (IPC-driven); non-Tauri jumps straight to App
└── styles/           SCSS variables, mixins, global
```

`main.tsx` renders three views: `checking` (brief IPC probe, only inside Tauri), `wizard` (SetupWizard), `app` (full App). Browser tabs skip the IPC probe entirely and mount `App` directly.

---

## 10. SRS System (Client-Side)

All review state in **IndexedDB** — no backend involvement.

### ARIA Algorithm (`reviewStore.ts`)

Adaptive Response Interval Algorithm — SM2 + three layers:

| Layer | What it does |
|-------|--------------|
| Speed weighting | Response time < 30% of limit → ease bonus; > 70% → penalty |
| Consistency factor | Rolling 5-answer window: ≥80% correct → 10% interval bonus |
| Difficulty penalty | Lifetime wrong ratio shrinks future intervals (max 30% reduction) |

**Status transitions:** `new` → `learning` (first answer) → `reviewing` (interval ≥ 7d) → `known` (interval ≥ 21d AND streak ≥ 5). Wrong → interval = 1 day.

### Quiz modes
Scheduled (ARIA-selected, ~15% new cards), Custom (filter-driven, optional size cap), Endless (no limit), Hardcore (session ends on first wrong).

### IndexedDB schema

- `reviews` (key `baseForm`): `{ baseForm, interval, easeFactor, dueDate, streak, correctCount, incorrectCount, recentResults, status, lastReviewed }`
- `inline-annotations` (DB `yomitori-inline-annotations`, key `id`): `{ id, bookId, selectedText, noteText, charPos, createdAt }`; indexed on `bookId`
- `meta`: `streak`, `activity` (date→count), `sessions` (last 100)

`saveSession()` returns a tracked promise; StatsView calls `awaitPendingSave()` to avoid save/load races.

---

## 11. Key Flows

**Library:**
```
HomePage → bookClient.searchBooks() → /api/books/search
  → middleware proxy → backend → SQLite → BookGrid
```

**In-reader dictionary popup:**
```
mouseup in EpubReader
  → POST /deinflect (middleware, Kuromoji + rules)
  → POST /api/dictionary/batch-lookup (middleware proxy → backend)
  → smartMatch (greedy longest-match segmentation)
  → DefinitionPopup
```

**Word mining (bulk):**
```
Mine button → extractText() from rendered EPUB
  → POST /mine-words (middleware)
      ├ tokenize (Kuromoji)
      ├ batch-lookup (proxied)
      ├ filter by frequency source + rank window
      └ enqueue → ankiQueue → POST /api/proxy/anki (proxied) → AnkiConnect
  → IDB upsert in frontend (dictionaryStore)
```

**Inline annotations:**
```
Popup "✏ Inline" → InlineAnnotationInput → save to IDB
  → injectInlineAnnotation (splitText + marker span, inherits writing-mode)
  → onContentLoaded: re-inject all, sorted by charPos
```

**Anki queue (middleware):** 50-note batches, 10 retries, 2.5s interval; survives frontend reloads because the worker lives in the middleware process.

---

## 12. Configuration

### Environment variables (desktop launcher sets these)

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATA_DIR` | `${app_data_dir}` | DB + covers base |
| `BOOKS_PATH` | wizard selection | Crawler root |
| `SERVER_ADDRESS` | `127.0.0.1` | Spring bind |
| `SPRING_DATASOURCE_URL` | `jdbc:sqlite:${DATA_DIR}/yomitori.db` | |
| `YOMITORI_CRAWLER_ENABLED` | `true` | |
| `YOMITORI_CRAWLER_SCHEDULE` | `0 */1 * * * ?` | Cron |
| `ANKI_CONNECT_URL` | `http://localhost:8765` | |
| `HOST` (middleware) | `127.0.0.1` | Bind; Docker overrides to `0.0.0.0` |
| `YOMITORI_STATIC_DIR` | `${resource_dir}/dist` | SPA assets |
| `DEINFLECT_RULES_PATH` | `${resource_dir}/deinflect-rules.json` | |
| `BACKEND_URL` | `http://127.0.0.1:8080` | Middleware → backend |

No `VITE_BACKEND_URL` / `VITE_MIDDLEWARE_URL` — frontend uses relative paths only.

### Docker mode (server / self-host)

Orthogonal to desktop packaging. `docker-compose.yml` runs backend + middleware + (optional) file server. `BOOKS_MOUNT` / `DICTIONARIES_MOUNT` bind host paths. Middleware uses `network_mode: host` to reach AnkiConnect on localhost:8765.

---

## 13. Build & Distribution

### Desktop (Tauri)
```bash
./build-desktop.sh      # frontend (Vite) → JAR (Gradle) → jlink JRE → bun --compile middleware → tauri build
```
Artifacts in `launcher/target/release/bundle/` — one installer per platform.

### Docker / server
```bash
./build.sh              # frontend, middleware, backend JAR
docker-compose up
```

### Dev loop
```bash
cd launcher && tauri dev   # Vite on :5173; beforeDevCommand auto-starts frontend dev server
```

### Release (CI)
`v*` tag push or `workflow_dispatch` → `release.yml` builds Linux / Windows / macOS-arm. Linux ships `.deb` + `.rpm` (AppImage skipped — `linuxdeploy` needs FUSE which is unavailable on GH runners).

### Artifact map

| Artifact | Path | Used by |
|----------|------|---------|
| SPA bundle | `frontend/dist/` | Docker; also copied to `launcher/resources/dist` for Tauri |
| Middleware binary | `launcher/binaries/yomitori-middleware-*` | Tauri sidecar (bun `--compile`) |
| Backend sidecar | `launcher/binaries/yomitori-backend-*` | Tauri sidecar (shell wrapper → JRE + JAR) |
| Minimal JRE | `launcher/resources/jre/` | Tauri resource (jlink from JAR deps) |
| `deinflect-rules.json` | `launcher/resources/deinflect-rules.json` | Tauri resource; path passed via `DEINFLECT_RULES_PATH` |
| `kuromoji-dict/` | `launcher/resources/kuromoji-dict/` | Tauri resource; bundled because `bun --compile` breaks `__dirname` |

---

## 14. Security Posture (Desktop)

- **Network exposure:** loopback only. Nothing bound outside 127.0.0.1.
- **IPC surface:** splash window only (`local.json`); the browser tab has no IPC at all.
- **`shell:allow-open`** scoped to `http://localhost:3000/**` — cannot be abused to open arbitrary URLs.
- **`open_path`** gated by Rust-side path-prefix allowlist (books / app_data / resource).
- **CSP** on splash: `default-src 'none'` + explicit per-directive allow list.
- **No auth** on backend — justified by loopback-only bind in desktop mode. Docker mode is the user's responsibility.

---

## 15. Design Decisions

### Why the browser tab (v1.0 shape)

Earlier desktop releases (v0.3–0.4) rendered the full app inside the Tauri WebView. v0.9.0 pivoted to a browser-tab model: the Tauri window became a setup shell + service manager, middleware started serving the SPA statically, and Spring CORS was deleted in favour of same-origin. The browser is a better host for a long-lived reader — DevTools, tab management, extensions, multi-window all "just work".

### The middleware-pivot detour (explored and reverted pre-v1.0)

During v1.0 planning we investigated shrinking the Tauri window into a feature-rich splash/launcher that used Tauri v2 *remote IPC* (`remote.urls`) so the browser-hosted SPA could still reach native capabilities (folder picker, system tray, `open_path`). Detailed specs live in `docs/requirements-middleware-pivot.md` and `docs/tech-spec-middleware-pivot.md`.

**Reverted before shipping.** Reasons:
1. Remote IPC injects `__TAURI_INTERNALS__` into whatever origin is listed in `remote.urls`. Anything with a foothold at `http://localhost:3000` inherits the whole IPC surface. Mitigation surface (scoping every command, tightening CSP on middleware responses) grew faster than the feature.
2. The browser tab did not actually need native capabilities — all native work happens once during setup (folder picker) and lives in the Tauri splash.
3. Same-origin + loopback-only gives the guarantees remote IPC was meant to preserve, at a fraction of the attack surface.

v1.0 ships **splash-only**: no `remote.json` capability, no remote IPC, browser tab has zero IPC. Native UI lives in the Tauri splash; the browser tab is a plain SPA talking to a same-origin HTTP server.

### Why SQLite + single-writer executor

SQLite is a single-writer store. Concurrent writes during startup (dict import + crawler + author extraction) hit `SQLITE_BUSY`. `StartupJobService` serializes every DB-writing job through one executor, including manual triggers from the API.

### Why kuromoji dict bundled as a resource

`bun --compile` replaces `__dirname` / `import.meta.url` with compile-time values that don't resolve at runtime. The kuromoji dict must be discoverable via an explicit env path (`KUROMOJI_DICT_PATH`), so it ships as a Tauri resource and the launcher passes the path at spawn time.

---

## 16. Known Constraints

- **SQLite**: single-writer bottleneck (mitigated by `StartupJobService`).
- **Dictionary imports** on first run block the job queue for 30-60s — crawler and author extraction wait their turn.
- **Kuromoji middleware** has ~100MB memory footprint.
- **Mining pipeline** depends on the EPUB DOM being fully rendered — caller must wait for `onContentLoaded`.
- **AnkiConnect** requires Anki running with the AnkiConnect add-on; middleware retry queue handles transient unavailability.
- **AppImage** skipped in CI — FUSE unavailable on GitHub-hosted runners.

---

*Co-Authored-By: chloe-chan <noreply@chloe>*
