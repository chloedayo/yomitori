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

1. Go to http://localhost:5173
2. Click "Search" with empty filters to trigger initial crawl
3. Crawler will scan `/run/media/stella/stella-drive/books/` and index all books
4. This may take 1-2 minutes for 40,000 files

## API Endpoints

- `GET /api/books/search?title=...&genre=...&type=...` - Search books
- `GET /api/books/{id}` - Get book details
- `POST /api/books/{id}/tag` - Update genre/type (manual override)
- `GET /api/books/genres` - List available genres
- `GET /api/books/types` - List available types
- `GET /api/books/stats` - Collection statistics

## Configuration

Edit `src/main/resources/application.properties`:

```properties
yomitori.crawler.schedule=0 0 * * * ?          # Cron expression (default: hourly)
yomitori.crawler.books-path=/path/to/books     # Books directory
yomitori.crawler.covers-path=./covers          # Cover storage
yomitori.crawler.batch-size=100                # Batch processing size
```

## Database

SQLite database stored in `yomitori.db`. Schema automatically created on startup.

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

## Future Enhancements

- Add summaries (batch LLM processing)
- Ebook reader integration
- User ratings and reading list
- Series/collection grouping
- Full-text search of book content
- Genre as many-to-many relationship

## Co-Authored-By

chloe-chan <noreply@chloe>
