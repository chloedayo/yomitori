# Yomitori - Book Collection Search

**yomitori** (読み取り) — a love letter to your books, in code.

You've got 40,000+ ebooks scattered across your hard drive. They're books with anime on the cover. Books you meant to read. Books you forgot you had. Books that deserve better than a folder named `_ebooks` or `vol-03-[broken-encoding].epub`.

Yomitori brings them home.

**What it does:** Crawls your collection automatically, extracts covers and metadata, learns author relationships, tracks where you left off, lets you favorite and search like you mean it. A beautiful, fast search interface for everything. Your books deserve a home that knows their names.

**What it feels like:** Searching for "百合" and seeing all your covers at once. Clicking an author and seeing every book they wrote. Resuming exactly where you stopped. Favoriting the ones that matter. Progress bars that actually mean something.

Built with care. Built with Kotlin, React, and the kind of attention to detail that makes your heart smile when you hover over a book title and the preview appears exactly where you need it.

✧  

<center>
   <img width="1528" height="969" alt="image" src="https://github.com/user-attachments/assets/94598955-eeaa-41dd-ab46-b18c676876f7" />
   <img width="1528" height="598" alt="image" src="https://github.com/user-attachments/assets/a8e4dc0a-8d74-4683-a41d-aa97646897c1" />
   <img width="1528" height="620" alt="image" src="https://github.com/user-attachments/assets/041e9663-d643-4e03-a241-23d2a3d62247" />
</center>

## Important Features

- **BOOKS WITH ANIME ON THE COVER**
- **Yomitan Support:** Now you can be more dekiru by the day!

## Not-So-Important Features 
- **Smart Indexing:** Type detection from directory patterns, author extraction
- **Reading Status Tracking:** In Progress, Favorites, Hidden tabs
- **Author Search & Favorites:** Find books by author with autocomplete, favorite authors
- **Reading Progress:** Pie chart visualization + character position tracking
- **Smart Filtering:** All/Favorites/In Progress tabs with smart lazy-loading
- **REST API:** Search by title/genre/type/author with pagination, bulk filtering
- **SQLite Database:** Local, file-based persistence with author relationships

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended for easiest setup)
- OR: Java 17+, Node 18+, Gradle 8.4+

### Option 1: Docker (Recommended)

**First time setup:**
```bash
# Copy environment template
cp .env.example .env

# Edit .env to point to your books directory
# Example: BOOKS_MOUNT=/path/to/your/books
```

**Start services:**
```bash
docker-compose up --build
```

- Backend API: http://localhost:8080
- Frontend: http://localhost:5173
- File server (for EPUB reading): http://localhost:8888

### Option 2: Build & Run Locally

**Build both frontend and backend:**
```bash
./build.sh
```

This produces:
- `frontend/dist/` (pre-built React app)
- `build/libs/yomitori-0.1.0.jar` (Spring Boot JAR)

**Then run Docker with pre-built artifacts:**
```bash
# Use production frontend (Dockerfile.prod)
# Edit docker-compose.yml and change:
# dockerfile: Dockerfile → dockerfile: Dockerfile.prod
docker-compose up
```

**OR run locally without Docker:**
```bash
# Terminal 1: Backend
./gradlew bootRun

# Terminal 2: Frontend
cd frontend && npm install && npm run dev
```

### First Run / Indexing

1. Application starts (backend at 8080, frontend at 5173)
2. Crawler runs automatically on schedule (default: every hour)
3. **To index immediately for testing:**
   ```bash
   curl -X POST http://localhost:8080/api/books/crawler/run
   ```
4. Crawler scans books directory and indexes all files
5. For 40,000+ files, indexing takes 2-5 minutes depending on system speed

## API Endpoints

### Book Search & Filtering
- `GET /api/books/search?title=...&genre=...&type=...&author=...` - Search books (supports pagination: `page=0&pageSize=20`)
- `POST /api/books/bulk-search` - Search with multiple status filters (In Progress, Favorites, Hidden)
- `GET /api/books/{id}` - Get book details
- `POST /api/books/{id}/tag` - Update genre/type (manual override)

### Browse & Metadata
- `GET /api/books/genres` - List available genres
- `GET /api/books/types` - List available types
- `GET /api/books/stats` - Collection statistics
- `GET /api/authors/autocomplete?q=...` - Author search with autocomplete
- `GET /api/authors/{id}` - Get author details

### Admin & Management
- `POST /api/books/crawler/run` - Manually trigger the book crawler (useful for testing)
- `POST /api/admin/authors/extract` - Retroactively extract authors from entire collection

## Configuration

### Environment Variables (.env)

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Path to your book collection on the host machine
# Can be relative (./books) or absolute (/path/to/books)
BOOKS_MOUNT=./books

# Internal container path (usually no change needed)
BOOKS_PATH=/app/data/books

# Frontend port
FRONTEND_PORT=5173

# Backend port
BACKEND_PORT=8080
```

### Docker Compose Services

The `docker-compose.yml` defines three services:

1. **backend** (Spring Boot + Kotlin)
   - Exposes: `SPRING_PROFILES_ACTIVE=dev`
   - Database: SQLite at `/app/data/yomitori.db` (persisted via volume)
   - Books mount: Read-only access to `BOOKS_MOUNT`

2. **frontend** (React + Vite dev server)
   - Runs development server on port 5173
   - Connected to backend via bridge network

3. **file-server** (Python HTTP server)
   - Serves books for the EPUB reader
   - Mounts books directory at `/books`
   - Port: 8888

### Spring Boot Configuration

Edit `src/main/resources/application.properties` for advanced tuning:

```properties
# Database
spring.datasource.url=jdbc:sqlite:/app/data/yomitori.db
spring.jpa.hibernate.ddl-auto=update                   # auto, create, create-drop, update, validate

# Crawler settings
yomitori.crawler.enabled=true                          # Enable/disable automatic crawling
yomitori.crawler.schedule=0 */1 * * * ?                # Cron expression (default: every hour)
yomitori.crawler.books-path=/app/data/books            # Books directory inside container
yomitori.crawler.covers-path=/app/data/covers          # Cover cache directory
yomitori.crawler.batch-size=100                        # Batch size for database inserts

# Logging
logging.level.com.yomitori=DEBUG                       # Yomitori app logs
logging.level.org.springframework.web=WARN             # Spring framework logs
```

**Crawler Schedule Format (Cron):**
- `0 0 * * * ?` - Every day at midnight UTC
- `0 */1 * * * ?` - Every hour (used in Docker by default)
- `0 */15 * * * ?` - Every 15 minutes
- `0 9-17 * * MON-FRI ?` - Weekdays 9am-5pm

### Environment Variables in Docker

The backend container receives these environment variables (set in `docker-compose.yml`):

```bash
SPRING_PROFILES_ACTIVE=dev                             # Development profile
SPRING_DATASOURCE_URL=jdbc:sqlite:/app/data/yomitori.db
YOMITORI_CRAWLER_ENABLED=true
YOMITORI_CRAWLER_SCHEDULE=0 */1 * * * ?                # Run every hour
YOMITORI_CRAWLER_BOOKS_PATH=/app/data/books            # Internal path
YOMITORI_CRAWLER_COVERS_PATH=/app/data/covers
```

To override at runtime:
```bash
docker-compose run -e YOMITORI_CRAWLER_SCHEDULE="0 0 * * * ?" backend
```

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

## Build Artifacts

### Using `./build.sh`

The build script compiles both frontend and backend into artifacts ready for Docker:

```bash
./build.sh
```

**Output:**
- `frontend/dist/` - Pre-built React application (static files)
- `build/libs/yomitori-0.1.0.jar` - Spring Boot JAR with all dependencies

**Why build locally?**
- Docker builds can be slow for 40k+ file indexing
- Pre-built JAR reduces container image size
- Faster iteration during development

### Docker Stages

1. **Dockerfile** (production runtime)
   - Base: `eclipse-temurin:17-jdk-jammy` (Eclipse Temurin JDK 17)
   - Expects pre-built JAR at `build/libs/yomitori-0.1.0.jar`
   - Minimal size, optimized for runtime only

2. **Dockerfile.build** (optional: build inside container)
   - Base: `gradle:8.4-jdk17`
   - Builds JAR from source
   - Use only if you don't want to build locally

3. **frontend/Dockerfile** (development mode)
   - Base: `node:20-alpine`
   - Runs Vite dev server on port 5173
   - Watches for file changes (live reload)

4. **frontend/Dockerfile.prod** (production mode)
   - Base: `node:20-alpine`
   - Serves pre-built `frontend/dist/` with http-server
   - Smaller, no build step in container

### Using Dockerfile.prod

For production deployments, use the pre-built frontend:

```bash
# 1. Build locally
./build.sh

# 2. Edit docker-compose.yml
# Change: dockerfile: Dockerfile → dockerfile: Dockerfile.prod

# 3. Build and run
docker-compose up --build
```

### Docker Cache Optimization

The Dockerfile uses layer caching for faster rebuilds:

```dockerfile
# Copies build/libs/yomitori-0.1.0.jar from host
COPY build/libs/yomitori-0.1.0.jar /app/app.jar
```

**Before rebuilding:**
```bash
# Clear Docker cache if needed
docker system prune
```

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
│           ├── application.properties    # Spring config
│           └── db/migration/            # Flyway migrations
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── api/                   # API client
│   │   ├── types/                 # TypeScript types
│   │   └── styles/                # CSS
│   ├── Dockerfile                 # Dev mode (Vite)
│   ├── Dockerfile.prod            # Production (http-server)
│   └── package.json
├── build.sh                        # Build script (frontend + backend)
├── Dockerfile                      # Backend production image
├── Dockerfile.build               # Optional: build inside container
├── docker-compose.yml             # Orchestration config
├── .env.example                   # Environment template
├── build.gradle.kts              # Gradle build config
└── README.md                      # This file
```

## Tech Stack

- **Backend:** Kotlin, Spring Boot 3.2, Spring Data JPA, Quartz
- **Database:** SQLite, Flyway migrations
- **Frontend:** React 18, TypeScript, Vite
- **Cover Extraction:** Apache PDFBox 3.0
- **Build:** Gradle

## Troubleshooting

### Docker Issues

**"No space left on device"**
```bash
# Docker images and volumes accumulate over time
docker system prune -a
docker volume prune
```

**Backend failing to start after rebuild**
```bash
# Clear cached images and rebuild from scratch
docker-compose down
docker rmi yomitori-backend yomitori-frontend
docker-compose up --build
```

**Books not appearing in search**
```bash
# Check crawler logs
docker-compose logs backend | grep -i crawler

# Manually trigger crawler
curl -X POST http://localhost:8080/api/books/crawler/run
```

**Port already in use**
```bash
# Check what's using port 8080, 5173, or 8888
lsof -i :8080
lsof -i :5173

# Or change ports in .env and docker-compose.yml
```

### Performance

**Slow crawler on first run?**
- Indexing 40,000+ files takes 2-5 minutes depending on disk speed
- Watch progress: `docker-compose logs backend | grep "Indexed"`
- Adjust batch size in `application.properties` (yomitori.crawler.batch-size)

**Out of memory?**
```bash
# Increase Docker memory allocation
# (Edit Docker Desktop settings or docker-compose.yml)

# Or limit from Java side:
# Add to Dockerfile ENTRYPOINT:
# -Xmx2g -Xms512m (sets max heap to 2GB)
```

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

- Cover extraction works reliably for ePub; PDF/CBR/CBZ support is stub
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
