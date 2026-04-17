# Yomitori - Book Collection Search

A full-stack web application for indexing and searching a large personal book collection (40,000+ files, focus on Japanese titles).

## Features

- **Automated Crawler:** Scheduled crawl of filesystem, extracts metadata, extracts covers
- **Smart Indexing:** Type detection from directory patterns, genre inference
- **REST API:** Search by title, genre, type with pagination
- **React Frontend:** Responsive search UI with grid display and cover images
- **SQLite Database:** Local, file-based persistence

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- OR: Java 17+, Node 18+, Kotlin 1.9

### Development (Docker)

```bash
docker-compose up --build
```

- Backend API: http://localhost:8080
- Frontend: http://localhost:5173

### Development (Local)

**Backend:**
```bash
cd ~/projects/yomitori
./gradlew bootRun
```

**Frontend:**
```bash
cd ~/projects/yomitori/frontend
npm install
npm run dev
```

### First Run

1. Start the application: `docker-compose up --build`
2. Backend API available at http://localhost:8080
3. Frontend available at http://localhost:5173
4. Crawler runs on schedule (default: midnight daily)
5. **To index immediately during testing:** `curl -X POST http://localhost:8080/api/books/crawler/run`
6. Crawler will scan the configured books directory and index all files
7. For 40,000+ files, indexing may take 2-5 minutes depending on system speed

## API Endpoints

- `GET /api/books/search?title=...&genre=...&type=...` - Search books (supports pagination: `page=0&pageSize=20`)
- `GET /api/books/{id}` - Get book details
- `POST /api/books/{id}/tag` - Update genre/type (manual override)
- `GET /api/books/genres` - List available genres
- `GET /api/books/types` - List available types
- `GET /api/books/stats` - Collection statistics
- `POST /api/books/crawler/run` - Manually trigger the book crawler (useful for testing)

## Configuration

Edit `src/main/resources/application.properties`:

```properties
yomitori.crawler.enabled=true                           # Enable/disable crawler
yomitori.crawler.schedule=0 0 * * * ?                  # Cron (default: midnight daily)
yomitori.crawler.books-path=/run/media/stella/...      # Books directory
yomitori.crawler.covers-path=/app/covers               # Cover storage (relative or absolute)
yomitori.crawler.batch-size=100                        # Batch processing size
```

**Crawler Scheduling:**
- Default: `0 0 * * * ?` (every day at midnight UTC)
- For testing: `POST /api/books/crawler/run` to trigger manually (useful during development)

## Database

**SQLite** with persistent storage via Docker named volume `yomitori-db:/app`.

### Architecture Notes

- **ID Generation:** Uses application-generated UUIDs (String type) instead of auto-increment integers
  - Reason: SQLite JDBC driver doesn't support `getGeneratedKeys()`, which breaks Hibernate's auto-increment ID generation
  - All IDs are generated in code (`@Id val id: String = UUID.randomUUID().toString()`)
  - Never use `@GeneratedValue` annotations with SQLite

### Connecting from IDE

The database is persistent but stored in Docker's named volume:

```bash
# Extract DB to host for IDE access
docker cp yomitori-backend-1:/app/yomitori.db ./yomitori.db
```

Then configure your IDE (IntelliJ, DataGrip, etc.) to use the local `yomitori.db` file:
- **Driver:** SQLite
- **File:** `./yomitori.db`
- **No credentials needed** (SQLite is file-based)

## Project Structure

```
yomitori/
├── src/
│   └── main/
│       ├── kotlin/com/yomitori/
│       │   ├── api/               # REST endpoints
│       │   ├── service/           # Business logic
│       │   ├── model/             # JPA entities
│       │   └── repository/        # Database access
│       └── resources/
│           └── db/migration/      # Flyway migrations
├── frontend/
│   └── src/
│       ├── components/            # React components
│       ├── api/                   # API client
│       ├── types/                 # TypeScript types
│       └── styles/                # CSS
├── build.gradle.kts
└── docker-compose.yml
```

## Tech Stack

- **Backend:** Kotlin, Spring Boot 3.2, Spring Data JPA, Quartz
- **Database:** SQLite, Flyway migrations
- **Frontend:** React 18, TypeScript, Vite
- **Cover Extraction:** Apache PDFBox 3.0
- **Build:** Gradle

## Testing

**Backend:**
```bash
./gradlew test
```

**Frontend:**
```bash
cd frontend
npm test
```

## Known Limitations (MVP)

- Cover extraction works reliably for PDFs; ePub/CBR/CBZ support is stub
- No book summaries (Phase 2)
- No user ratings/annotations
- No sync across devices
- File links use `file://` URLs (works on Linux/Mac, needs adjustment for Windows)
- **SQLite JDBC limitation:** SQLite JDBC driver doesn't support `getGeneratedKeys()`, so all IDs are application-generated UUIDs (not auto-increment). This is by design; see Database section for details.

## Future Enhancements

- Add summaries (batch LLM processing)
- Ebook reader integration
- User ratings and reading list
- Series/collection grouping
- Full-text search of book content
- Genre as many-to-many relationship

## Co-Authored-By

chloe-chan <noreply@chloe>
