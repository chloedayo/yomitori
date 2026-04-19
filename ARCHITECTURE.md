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
| loaded_at | TIMESTAMP | |

### `word_frequency`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK AUTO | |
| word | TEXT NOT NULL | Indexed |
| reading | TEXT NOT NULL | |
| frequency | BIGINT NOT NULL | Rank (lower = more common) |
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

### DictionaryStartupRunner
- `@EventListener(ApplicationReadyEvent)`
- Scans `YOMITORI_DICTIONARIES_PATH` for zips
- Hash check against `dictionary_imports.path` — skips already-imported
- Scans `{path}/frequency/` subdir for frequency dictionaries

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
│   ├── EpubReader.tsx       Renders parsed EPUB chapters
│   ├── EpubParser.ts        Parses EPUB zip → HTML chapters
│   ├── ReaderPage.tsx       Top-level reader page + state
│   ├── ReaderUI.tsx         Bottom control bar
│   ├── SettingsModal.tsx    CSS editor + frequency filter settings
│   ├── WordMinerPanel/      Results panel for mined words
│   ├── useCustomCSS.ts      CSS persistence + scoping
│   ├── useSwipeGesture.ts   Touch navigation
│   └── useWordMiner.ts      Mining pipeline orchestration
├── services/         ankiService, ankiQueueService
├── views/            AuthorsView, HomePage, TitlesView
└── styles/           SCSS variables, mixins, global
```

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
tokenizeText() → middleware Kuromoji (POST /tokenize)
  ↓
dedupeAndCount() → Map<baseForm, {word, count}>
  ↓
Chunked batches (1000 words) → POST /api/dictionary/batch-lookup
  ↓
Filter by frequencySource + min/max rank
  ↓
For each valid word: ankiQueue.addToQueue(word, deck)
  ↓
ankiQueueService worker → POST /api/proxy/anki
  ↓
AnkiConnect (LAN) → card created with Lapis template
```

**Anki Queue (async):**
- `ankiQueueService` uses internal `setInterval` worker
- One card at a time → `addNote` AnkiConnect action
- Dedupe by baseForm+bookId
- Per-book mined count stored in `localStorage` (`yomitori-stats`)

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

---

## Known Constraints

- **SQLite**: single-writer bottleneck. For concurrent imports, serialize.
- **Dictionary imports** blocking on startup — large dicts can delay backend readiness by ~30-60s.
- **Kuromoji middleware** has ~100MB memory footprint.
- **Mining pipeline** depends on EPUB DOM being fully rendered — caller must wait for chapters.
- **AnkiConnect** requires Anki desktop running on LAN with AnkiConnect add-on.
