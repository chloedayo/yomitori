# yomitori ♡

**yomitori** (読み取り) — a love letter to your books, in code.

You've got 40,000+ ebooks scattered across your hard drive. Books with anime on the cover. Books you meant to read. Books you forgot you had. Books that deserve better than a folder named `_ebooks_final_v2` or `vol-03-[broken-encoding].epub`.

Yomitori brings them home. ♡

**What it does:** Crawls your collection automatically, extracts covers and metadata, learns author relationships, tracks where you left off, lets you favorite and search like you mean it.

**What it feels like:** Searching for 百合 and seeing all your covers at once. Clicking an author and seeing every book they wrote. Resuming exactly where you stopped. Mining vocab from your novels and sending it straight to Anki. Progress bars that actually mean something.

Built with care. Built with Kotlin, React, and the kind of attention to detail that makes your heart smile when you hover over a cover and everything just... works.

✧

<center>
   <img width="1528" height="969" alt="image" src="https://github.com/user-attachments/assets/94598955-eeaa-41dd-ab46-b18c676876f7" />
   <img width="1528" height="598" alt="image" src="https://github.com/user-attachments/assets/a8e4dc0a-8d74-4683-a41d-aa97646897c1" />
   <img width="1528" height="620" alt="image" src="https://github.com/user-attachments/assets/041e9663-d643-4e03-a241-23d2a3d62247" />
</center>

---

## The Good Stuff ♡

- **Books. With anime on the cover.** That's the whole pitch.
- **In-Reader Dictionary Popup** — Select any text while reading → instant deinflected definition popup. Kanji drill-down, alternate forms, add to Anki or personal dictionary without leaving the page.
- **Local Yomichan Dictionaries** — Drop zips into `/dictionaries/`. No internet, no Jisho rate limits, no one knowing what words you're looking up at 2am. Add new dicts while running — auto-imported, no restart needed.
- **Word Mining with Frequency Filtering** — Tokenize your novel with Kuromoji, filter by frequency rank, auto-export to Anki as you read. Entire pipeline runs in middleware — mine 5000-word novels in seconds.
- **Personal Dictionary** — Every word you look up or mine gets saved locally (IndexedDB). Searchable, sortable, filterable by kana row or frequency. Yours forever.
- **Anki Integration (AnkiConnect)** — Mining results stream into Anki on your LAN. Works with Lapis template. Retry queue lives in middleware — survives page reloads.
- **Vertical + Horizontal Reading** — 縦書き and 横書き, with persistent preference per session.
- **Custom CSS Editor** — Live validation + preview. Style the reader however you want.

## The Rest of the Stuff

- Smart auto-indexing from directory structure (title, type, author extraction)
- Reading status: In Progress, Favorites, Hidden
- Bookmark save/restore with jump-to and progress percent display
- Pie chart progress visualization
- Author search with autocomplete + author favorites
- Bulk lazy-loading for favorites/in-progress (server-side, not client-side filtering)
- Mobile-optimized reader: compact controls, stacked layout, centered progress, swipe navigation
- Proportional swipe: swipe harder, scroll further
- REST API for everything (see below)
- SQLite for local, no-setup persistence

---

## Documentation

- [Architecture Deep Dive](ARCHITECTURE.md) — tech reference, DB schema, full API tables
- [Roadmap](ROADMAP.md) — what's built, what's next

---

## Quick Start

### Prerequisites

- Docker & Docker Compose ← the easy path
- OR: Java 17+, Node 18+, Gradle 8.4+

### Option 1: Docker (Recommended ~)

```bash
# Copy environment template
cp .env.example .env

# Point it at your books
# BOOKS_MOUNT=/path/to/your/books

# For phone/tablet LAN access, set your IP too:
# LAN_IP=192.168.x.x
# CORS_ALLOWED_ORIGINS=http://localhost:5173,http://192.168.x.x:5173

docker-compose up --build
```

- Backend API: `http://localhost:8080`
- Frontend: `http://localhost:5173` (or `http://YOUR_LAN_IP:5173` on phone)
- File server (EPUB reader): `http://localhost:8888`

### Option 2: Build & Run Locally

```bash
# Build both frontend and backend
./build.sh
# → frontend/dist/  +  build/libs/yomitori-0.1.0.jar

# Run without Docker
# Terminal 1:
./gradlew bootRun
# Terminal 2:
cd frontend && npm install && npm run dev
```

### First Run

1. App starts (backend :8080, frontend :5173)
2. On startup: dictionary import → crawler → author extraction run automatically in sequence
3. For 40k+ files, expect 2-5 minutes on first pass
4. To re-index manually (queues behind any running job):
   ```bash
   curl -X POST http://localhost:8080/api/books/crawler/run
   ```

---

## Dictionaries & Word Mining ♡

Yomitori uses **Yomichan-format dictionaries** — the same ones you'd use in Yomichan/Yomitan, just served locally from your backend.

**Setup:**
1. Get a Yomichan dictionary zip (definition dict + frequency dict)
2. Drop **definition dicts** into `./dictionaries/`
3. Drop **frequency dicts** into `./dictionaries/frequency/`
4. Backend imports on startup automatically — no restart needed for new dicts added while running

**Mining:**
1. Open a book in the reader
2. (Optional) Settings → Frequency Filter → pick source + rank range
3. Hit the 🎓 mine button — it's a toggle; hit it again to stop + clear queue
4. Words auto-export to Anki (requires AnkiConnect + Anki running)
5. Every exported word also lands in your **Personal Dictionary** (accessible from the homepage)

---

## API Reference

Full schema with request/response tables: [docs/ARCHITECTURE.md](ARCHITECTURE.md)

### Quick Reference

**Books:**
```
GET  /api/books/search?title=&genre=&type=&author=&page=0&pageSize=20
POST /api/books/search/bulk          { ids: string[] }
GET  /api/books/{id}
GET  /api/books/{id}/cover
GET  /api/books/{id}/file
POST /api/books/{id}/tag             { genre, type }
GET  /api/books/genres | /types | /stats
```

**Authors:**
```
GET /api/authors/autocomplete?query=
GET /api/authors/{id}
```

**Dictionary:**
```
GET  /api/dictionary/lookup?word=
POST /api/dictionary/batch-lookup    { words: string[] }  → { [word]: entry[] }
GET  /api/dictionary/frequency-sources
```

**Admin:**
```
POST /api/books/crawler/run
POST /api/books/admin/extract-authors
```

**Proxy:**
```
POST /api/proxy/anki                 (forwards to AnkiConnect)
GET  /api/proxy/jisho?word=          (legacy)
```

---

## Configuration

### .env (Copy from `.env.example`)

```bash
BOOKS_MOUNT=./books          # Path to your book collection
BOOKS_PATH=/app/data/books   # Internal container path (usually don't change)
FRONTEND_PORT=5173
BACKEND_PORT=8080
```

### application.properties (Advanced)

```properties
# Database
spring.datasource.url=jdbc:sqlite:/app/data/yomitori.db

# Crawler
yomitori.crawler.enabled=true
yomitori.crawler.schedule=0 */1 * * * ?   # every hour
yomitori.crawler.books-path=/app/data/books
yomitori.crawler.batch-size=100

# Logging
logging.level.com.yomitori=DEBUG
```

**Cron schedule examples:**
```
0 0 * * * ?        — midnight daily
0 */1 * * * ?      — every hour (default)
0 */15 * * * ?     — every 15 min
```

### Docker Services

| Service | Base | Port | Notes |
|---------|------|------|-------|
| backend | eclipse-temurin:17 | 8080 | Spring Boot + SQLite |
| frontend | node:20-alpine | 5173 | Vite dev server |
| file-server | python | 8888 | Serves books for reader |

---

## Database

**SQLite** persisted via Docker named volume `yomitori-db:/app`.

**Note on IDs:** SQLite JDBC doesn't support `getGeneratedKeys()`, so all IDs are application-generated UUIDs. Never use `@GeneratedValue` with SQLite — it breaks silently. All entities use `@Id val id: String = UUID.randomUUID().toString()`.

**Access the DB from your IDE:**
```bash
docker cp yomitori-backend-1:/app/yomitori.db ./yomitori.db
# Then connect with driver: SQLite, file: ./yomitori.db, no credentials
```

---

## Project Structure

```
yomitori/
├── src/main/kotlin/com/yomitori/
│   ├── api/               REST endpoints
│   ├── service/           Business logic
│   ├── model/             JPA entities
│   └── repository/        Database access
├── frontend/src/
│   ├── components/        Shared React components
│   ├── views/             Page-level views
│   ├── reader/            Reader + mining + settings
│   ├── api/               API + Anki clients
│   └── services/          IndexedDB, Anki queue
├── dictionaries/          Drop your Yomichan zips here
├── docs/                  Architecture + Roadmap
├── build.sh               Builds frontend + backend
├── docker-compose.yml
└── .env.example
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Kotlin, Spring Boot 3.2, Spring Data JPA |
| Database | SQLite, Flyway migrations |
| NLP | Kuromoji tokenizer |
| EPWING/Yomichan | Custom parser (zip → SQLite) |
| Frontend | React 18, TypeScript, Vite |
| Client Storage | IndexedDB via `idb` |
| Covers | Apache PDFBox 3.0 |
| Build | Gradle (backend), Vite (frontend) |

---

## Troubleshooting

**Books not appearing?**
```bash
docker-compose logs backend | grep -i crawler
curl -X POST http://localhost:8080/api/books/crawler/run
```

**Backend won't start?**
```bash
docker-compose down
docker rmi yomitori-backend yomitori-frontend
docker-compose up --build
```

**No space left on device?**
```bash
docker system prune -a
docker volume prune
```

**Port conflict?**
```bash
lsof -i :8080  # or 5173, 8888
# or just change ports in .env
```

**Slow first run?** Normal for 40k+ files. Watch progress:
```bash
docker-compose logs backend | grep "job-queue\|Crawler done\|Author extraction"
```

---

## Known Limitations

- Cover extraction: solid for ePub; PDF/CBR/CBZ is stubbed
- No book summaries (Phase 2 plan)
- No user ratings or annotations yet
- No cross-device sync
- SQLite JDBC `getGeneratedKeys()` limitation: all IDs are UUIDs, not auto-increment (by design)

---

*Built with Kotlin, React, and too much love for the books.*  
*Co-Authored-By: chloe-chan <noreply@chloe> ♡*
