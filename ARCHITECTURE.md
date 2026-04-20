# Yomitori Architecture

Deep technical reference for yomitori — book library + Japanese reader + word mining pipeline.

## Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Kotlin / Spring Boot 3.x | REST API, crawler, dictionary service |
| Database | SQLite (file-based) | Books, authors, dictionary entries, frequencies |
| ORM | Hibernate / JPA | Entity persistence |
| Frontend | React 18 + TypeScript + Vite | SPA reader + library UI |
| Middleware | Node.js + Kuromoji | Japanese tokenization service |
| Containerization | Docker Compose | Orchestration |
| Integration | AnkiConnect (external) | Flashcard export |

---

## System Architecture

```
┌─────────────┐   HTTP    ┌──────────────┐   JPA    ┌──────────┐
│  Frontend   ├──────────►│   Backend    ├─────────►│  SQLite  │
│  (React)    │           │  (Spring)    │          │          │
└─────────────┘           └──────┬───────┘          └──────────┘
      │                          │
      │ HTTP (tokenize)          │ Reads
      ▼                          ▼
┌─────────────┐           ┌──────────────┐
│ Middleware  │           │  Filesystem  │
│ (Kuromoji)  │           │  books/dicts │
└─────────────┘           └──────────────┘
      ▲                          
      │                          
┌─────┴───────┐                  
│  Anki (LAN) │  ← POST via backend /api/proxy/anki
└─────────────┘                  
```

---

## Backend Module Layout

```
src/main/kotlin/com/yomitori/
├── api/               REST controllers (Spring MVC)
├── config/            Startup runners, schema migration, web config
├── dto/               Data transfer objects
├── model/             JPA entities
├── repository/        Spring Data JPA repositories
├── service/           Business logic
│   └── strategy/      Cover extraction strategies (pluggable)
└── YomitoriApplication.kt
```

---

## Database Schema

### `books`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| filepath | TEXT NOT NULL | Absolute path |
| filename | TEXT NOT NULL | Derived from path |
| title | TEXT NOT NULL | Extracted from metadata |
| genre | TEXT | Optional |
| type | TEXT NOT NULL | manga / novel / light-novel / textbook / other |
| cover_path | TEXT | Filename in covers dir |
| file_format | TEXT NOT NULL | pdf / epub / cbr / cbz |
| last_indexed | TIMESTAMP | Crawler run timestamp |
| is_deleted | BOOLEAN | Soft-delete flag |
| manual_override | BOOLEAN | Blocks auto-updates to tags |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `authors`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL UNIQUE | Indexed |
| created_at | TIMESTAMP | |

### `book_authors` (join)
| Column | Type | Notes |
|--------|------|-------|
| book_id | TEXT FK | → books.id |
| author_id | TEXT FK | → authors.id |

### `dictionary_imports`
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | Display name |
| path | TEXT NOT NULL UNIQUE | Source zip path |
| imported_at | TIMESTAMP | |

### `dictionary_entries`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK AUTO | |
| dict_id | TEXT NOT NULL | → dictionary_imports.id |
| expression | TEXT NOT NULL | Indexed |
| reading | TEXT NOT NULL | Indexed |
| definition | TEXT NOT NULL | HTML/structured content |

### `frequency_sources`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK AUTO | |
| name | TEXT NOT NULL UNIQUE | Display name |
| path | TEXT NOT NULL | Source zip path |
| is_numeric | INTEGER NOT NULL DEFAULT 1 | 1 = numeric ranks, 0 = string labels |
| loaded_at | TIMESTAMP | |

### `word_frequency`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK AUTO | |
| word | TEXT NOT NULL | Indexed |
| reading | TEXT NOT NULL | |
| frequency | BIGINT NOT NULL | Numeric rank; 0 for string-label dicts |
| frequency_tag | TEXT | String label (e.g. "A1", "idol") — null for numeric dicts |
| source_id | BIGINT NOT NULL | → frequency_sources.id, indexed |

---

## REST API Reference

### Books API (`/api/books`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Paginated book search with filters |
| POST | `/search/bulk` | Search by list of book IDs |
| GET | `/{id}` | Get single book by ID |
| GET | `/{id}/cover` | Get cover image (JPEG) |
| GET | `/{id}/file` | Stream EPUB/PDF file |
| POST | `/{id}/tag` | Update book genre/type |
| GET | `/genres` | All unique genres |
| GET | `/types` | All unique types |
| GET | `/stats` | Library statistics |
| POST | `/crawler/run` | Trigger manual crawl |
| POST | `/admin/extract-authors` | Retroactive author extraction |
| GET | `/cover-file/{bookId}` | Alternate cover route |

**GET /search query params:**
| Param | Type | Default |
|-------|------|---------|
| title | string | "" |
| genre | string | null |
| type | string | null |
| author | string | null |
| page | int | 0 |
| pageSize | int | 20 |

**POST /search/bulk body:**
```json
{ "bookIds": ["uuid1", "uuid2"], "page": 0, "pageSize": 20 }
```

### Authors API (`/api/authors`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/autocomplete?query=` | Top 10 matches |
| GET | `/{id}` | Author + all their books |
| GET | `/?query=&page=&pageSize=` | Paginated author list |

### Dictionary API (`/api/dictionary`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/frequency-sources` | List available frequency dictionaries |
| GET | `/lookup?word=` | Single word lookup |
| POST | `/batch-lookup` | Bulk word lookup (up to 1000 words) |

**GET /lookup response:**
```json
[
  {
    "expression": "食べる",
    "reading": "たべる",
    "definitions": ["to eat (HTML content)"],
    "dictionaryName": "大辞林",
    "frequencies": [
      { "sourceName": "JPDB", "frequency": 142 },
      { "sourceName": "BCCWJ", "frequency": 98 }
    ]
  }
]
```

**POST /batch-lookup request/response:**
```json
// Request
{ "words": ["食べる", "飲む", "走る"] }

// Response
{
  "食べる": [ /* DictionaryEntryDto[] */ ],
  "飲む": [ /* DictionaryEntryDto[] */ ],
  "走る": []
}
```

### Crawler API (`/api/crawler`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trigger` | Manual crawler trigger |

### Proxy API (`/api/proxy`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jisho?word=` | Proxy to jisho.org (CORS bypass) |
| POST | `/anki` | Forward to AnkiConnect (LAN) |

---

## Middleware API (Node / Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Liveness check |
| POST | `/tokenize` | Kuromoji tokenization |
| POST | `/deinflect` | Rule-based deinflection (selection popup) |
| POST | `/extract-baseForms` | Bulk base form extraction |
| POST | `/mine-words` | Full mining pipeline (tokenize → lookup → filter → Anki queue) |

**POST /deinflect:**
```json
// Request
{ "text": "食べている" }

// Response
{ "candidates": [
  { "startPos": 0, "surface": "食べている", "baseForm": "食べる", "reason": "te-iru" },
  ...
]}
```

**POST /mine-words:**
```json
// Request
{ "text": "...", "frequencySource": "JPDB", "minFrequencyRank": 1, "maxFrequencyRank": 5000, "bookTitle": "本のタイトル" }

// Response
{ "words": [ { "expression": "...", "reading": "...", "definitions": [...], "frequencies": [...] } ], "anki": { "added": 0, "skipped": 0, "error": null } }
```

**POST /tokenize:**
```json
// Request
{ "text": "私は日本語を勉強します" }

// Response
{ "tokens": [
  { "surface": "私", "baseForm": "私", "partOfSpeech": "noun", "reading": "わたし" },
  ...
]}
```

---

## Key Services

### CrawlerService
- Scheduled job (cron: `YOMITORI_CRAWLER_SCHEDULE`)
- Walks `YOMITORI_CRAWLER_BOOKS_PATH`
- New files: extract metadata (filename patterns), extract cover (strategy pattern per format), insert book
- Missing files: mark `is_deleted = true`
- Batch processing via `batchSize` config

### CoverExtractor (strategy pattern)
| Format | Strategy |
|--------|----------|
| EPUB | Parse OPF manifest, find cover property |
| PDF | Render first page via PDFBox |
| CBR/CBZ | Extract first image from archive |

### DictionaryParserService
- Unzips Yomichan-format dictionary zips
- Parses `term_bank_*.json` (entries) and `term_meta_bank_*.json` (frequency)
- Handles structured content definitions (HTML generation)
- Batch inserts (1000 per transaction)

### StartupJobService
- Single-threaded executor (`Executors.newSingleThreadExecutor`) — all DB-writing jobs serialized
- `submitAll()` — called on startup; queues dict import → crawler → author extraction in order
- `submitCrawler()`, `submitAuthorExtraction()`, `submitDictionaryImport()` — manual triggers from controllers go through the same queue
- `submitJob(name, block)` — generic slot for watcher-triggered imports
- Eliminates `SQLITE_BUSY` caused by concurrent writes on startup

### AppStartupListener
- `@EventListener(ApplicationReadyEvent)` → calls `startupJobService.submitAll()`
- Thin — no logic of its own

### DictionaryWatcherService
- `java.nio.file.WatchService` on `YOMITORI_DICTIONARIES_PATH` and `.../frequency/`
- `ENTRY_CREATE` events on `.zip` files → submits import to `StartupJobService` queue
- Daemon thread, no restart needed to pick up new dictionaries

### DictionaryService
- `lookup(word)`: joins `dictionary_entries` + `word_frequency` + `frequency_sources`
- `batchLookup(words)`: map each word → list of results (N+1 acceptable on SQLite with indexes)

---

## Frontend Architecture

### Structure

```
frontend/src/
├── api/              REST clients (bookClient, dictionaryClient, jishoClient)
├── components/       Reusable UI (BookCard, BookGrid, SearchForm, CardMenu, TabsMenu)
├── hooks/            useLibrary, useProxy, useLocalStorage, useAuthorAutocomplete
├── reader/           EPUB reader subsystem
│   ├── EpubReader.tsx            Renders parsed EPUB chapters; wires useSelectionDefinition; fires onContentLoaded
│   ├── EpubParser.ts             Parses EPUB zip → HTML chapters
│   ├── ReaderPage.tsx            Top-level reader page + state; mounts DefinitionPopup + InlineAnnotationInput
│   ├── ReaderUI.tsx              Bottom control bar (two-row: title + labeled controls, separator before mining)
│   ├── SettingsModal.tsx         CSS editor + mining filter + annotation color settings
│   ├── DefinitionPopup.tsx       In-reader dictionary popup; "✏ Inline" button triggers inline annotation
│   ├── DefinitionPopup.css       Popup styles
│   ├── InlineAnnotationInput.tsx Floating input panel for creating/editing inline annotations
│   ├── InlineAnnotationInput.css Styles for floating input panel
│   ├── useSelectionDefinition.ts mouseup → /deinflect → batchLookup → greedy match; exposes rawText
│   ├── WordMinerPanel/           Results panel for bulk-mined words
│   ├── useCustomCSS.ts           CSS persistence + scoping
│   ├── useSwipeGesture.ts        Touch navigation
│   └── useWordMiner.ts           POST /mine-words to middleware (full pipeline)
├── hooks/            useInlineAnnotations (IDB CRUD + DOM inject/remove/edit for inline annotations)
├── services/         ankiService, ankiQueueService, dictionaryStore, reviewStore, inlineAnnotationStore (IndexedDB)
├── views/
│   ├── QuizView/     SRS quiz UI — config, quiz card, results, session bar
│   ├── StatsView/    Review stats dashboard + session history
│   ├── AuthorsView, DictionaryView, HomePage, TitlesView
└── styles/           SCSS variables, mixins, global
```

---

## SRS System (Client-Side)

All review state lives in **IndexedDB** (`yomitori-reviews`) — no backend involvement.

### ARIA Algorithm (`reviewStore.ts`)
Adaptive Response Interval Algorithm — extends SM2 with three layers:

| Layer | What it does |
|-------|-------------|
| Speed weighting | Response time < 30% of limit → ease bonus; > 70% → ease penalty |
| Consistency factor | Rolling 5-answer window: ≥80% correct → 10% interval bonus |
| Difficulty penalty | Lifetime wrong ratio shrinks future intervals (max 30% reduction) |

**Status transitions:**
- `new` → `learning` (first answer)
- `learning` → `reviewing` (interval ≥ 7 days)
- `reviewing` → `known` (interval ≥ 21 days AND streak ≥ 5)
- Any wrong → back to interval = 1 day

### Quiz Modes

| Mode | Description |
|------|-------------|
| Scheduled | ARIA-selected due cards; new words injected at ~15% of session size |
| Custom | Filter by frequency source, rank range, or status; optional session size cap |
| Endless | No card limit; runs until manually exited |
| Hardcore | Any of the above + one wrong answer ends the session immediately |

### IndexedDB Schema

**`reviews` store** (key: `baseForm`):
```ts
{ baseForm, interval, easeFactor, dueDate, streak, correctCount, incorrectCount, recentResults, status, lastReviewed }
```

**`inline-annotations` store** (DB: `yomitori-inline-annotations`, key: `id`):
```ts
{ id: string, bookId: string, selectedText: string, noteText: string, charPos: number, createdAt: number }
```
Index: `bookId` — all annotations for a book loaded on epub open.

**`meta` store** (key: string):
| Key | Value |
|-----|-------|
| `streak` | `{ streak: number, lastDate: string }` |
| `activity` | `{ dates: Record<string, number> }` (reviews per day) |
| `sessions` | `{ sessions: QuizSession[] }` (last 100) |

### Session Save Race Fix
`saveSession()` returns a `Promise<void>` tracked in module-level `_pendingSave`. StatsView calls `awaitPendingSave()` before loading — ensures the last session is persisted before stats render.

### Key Flows

**Book Library Flow:**
```
HomePage
  → bookClient.searchBooks()
  → /api/books/search
  → SQLite query (paginated)
  → BookGrid renders cards
  → Click → /reader?id={bookId}
```

**Word Mining Flow (Bulk):**
```
User clicks Mine button
  ↓
extractText() from rendered EPUB DOM
  ↓
POST /mine-words → middleware
  ↓
  tokenizeText() via Kuromoji (internal)
  ↓
  batchLookupBackend() → POST /api/dictionary/batch-lookup (8 parallel batches)
  ↓
  Filter by frequencySource + min/max rank
  ↓
  enqueue() → ankiQueue (middleware-internal, setInterval worker)
    → POST /api/proxy/anki → AnkiConnect → Lapis card
  ↓
Return word list to frontend
  ↓
Frontend upserts each word into IndexedDB (dictionaryStore)
```

**In-Reader Definition Popup Flow:**
```
User selects text in EpubReader
  ↓
useSelectionDefinition: mouseup handler
  ↓
POST /deinflect → middleware → candidates[]
  ↓
batchLookup(uniqueBaseForms) → POST /api/dictionary/batch-lookup
  ↓
smartMatch(): greedy longest-match segmentation → SelectionEntry[]
  ↓
DefinitionPopup renders: expression, reading, definitions, alternates (see also)
  ↓
User clicks +Anki → addNote() via /api/proxy/anki
User clicks +Dict → upsertWord() into IndexedDB
User clicks kanji → lookupWord() → inline kanji result
```

**Inline Annotation Flow:**
```
User selects text → DefinitionPopup → clicks "✏ Inline"
  ↓
ReaderPage sets pendingInlineAnnotation { rawText, rect }
  ↓
InlineAnnotationInput renders (floating, near selection rect)
  ↓
User types note → Enter / "Add"
  ↓
useInlineAnnotations.createInlineAnnotation()
  → saveInlineAnnotation() → IndexedDB (yomitori-inline-annotations)
  → injectInlineAnnotation(epubContentRef, ann, onDismiss, onEdit)
    collectTextNodes(root) — concatenates non-rt/rp text, skips existing annotation spans
    find charPos match → targetNode.splitText(localOffset) → afterNode
    findInlineRoot(afterNode, root) — highest inline ancestor of block parent
    build <span.epub-inline-annotation>: dismiss button + annotation label
    insertBefore(marker, insertBefore)
  ↓
On epub load: injectAllInlineAnnotations() re-injects all stored annotations (sorted by charPos)
Click dismiss → marker.remove() + deleteInlineAnnotation(id)
Click label → onEdit callback → InlineAnnotationInput with initialText → editInlineAnnotation() + DOM patch
```

**Anki Queue (middleware):**
- Retry queue lives in `ankiQueue.ts` (middleware process)
- 50 notes per batch → `addNotes` AnkiConnect action
- Max 10 attempts per batch, 2.5s retry interval
- Persists across frontend page reloads

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `YOMITORI_CRAWLER_BOOKS_PATH` | `/app/data/books` | Books to index |
| `YOMITORI_CRAWLER_COVERS_PATH` | `/app/data/covers` | Cover output dir |
| `YOMITORI_DICTIONARIES_PATH` | `/app/data/dictionaries` | Yomichan zips + `frequency/` subdir |
| `YOMITORI_CRAWLER_ENABLED` | `true` | |
| `YOMITORI_CRAWLER_SCHEDULE` | `0 */1 * * * ?` | Cron format |
| `SPRING_DATASOURCE_URL` | `jdbc:sqlite:/app/data/yomitori.db` | |
| `ANKI_CONNECT_URL` | `http://localhost:8765` | LAN/localhost |
| `YOMITORI_CORS_ALLOWED_ORIGINS` | | CSV of origins |
| `BOOKS_MOUNT` | `./.books` | Host path |
| `DICTIONARIES_MOUNT` | `./dictionaries` | Host path |
| `VITE_BACKEND_URL` | `http://localhost:8080` | Frontend → backend |
| `VITE_MIDDLEWARE_URL` | `http://localhost:3000` | Frontend → middleware |
| `LAN_IP` | `localhost` | Phone access |

### Docker Volumes

| Volume | Mount | Mode |
|--------|-------|------|
| `${BOOKS_MOUNT}` | `/app/data/books` | ro |
| `${DICTIONARIES_MOUNT}` | `/app/data/dictionaries` | ro |
| `yomitori-data` | `/app/data` | rw (DB + covers) |

---

## Build + Deploy

### Local dev
```bash
./build.sh              # Build all artifacts (frontend, middleware, backend JAR)
docker-compose up       # Run stack
```

### Artifacts
- `frontend/dist/` — SPA bundle
- `middleware/dist/` — compiled TS
- `build/libs/yomitori-0.1.0.jar` — Spring Boot fat JAR

### Hot Reload
- Frontend: Vite HMR via bind mount (`./frontend/src:/app/src`)
- Backend: rebuild JAR + restart container

---

## Schema Migration

Custom pattern — NOT Flyway. `SchemaMigration.kt` listens for `ApplicationReadyEvent`, executes `db/migration/V*__*.sql` in order. Tracks applied versions.

Current migrations:
- V001 — initial books + authors schema
- V002 — cover extraction status + retroactive author extraction
- V003 — dictionary tables
- V004 — frequency source + word frequency tables
- V005 — frequency_tag on word_frequency, is_numeric on frequency_sources

---

## Known Constraints

- **SQLite**: single-writer bottleneck. All writes go through `StartupJobService` single-threaded executor to prevent `SQLITE_BUSY`.
- **Dictionary imports** on first run block the job queue for 30-60s — crawler and author extraction wait their turn.
- **Kuromoji middleware** has ~100MB memory footprint.
- **Mining pipeline** depends on EPUB DOM being fully rendered — caller must wait for chapters.
- **AnkiConnect** requires Anki desktop running on LAN with AnkiConnect add-on.
- **Middleware uses `network_mode: host`** — required for Anki (localhost:8765) and backend (localhost:8080) reachability; means middleware port is not exposed in docker-compose port mapping.
