# Changelog - Yomitori

All notable changes to the Yomitori project are documented here.

## [0.3.1] - 2026-04-20

### Added

- **Hardcore Quiz Mode**
  - Toggle in quiz config — one wrong answer ends the session immediately
  - Works in both scheduled/custom and endless modes
  - Wrong answer on exit also fails the current card (consistent scoring)
  - 💀 badge in session history for hardcore sessions
  - Dedicated Hardcore stats section (tab-toggled alongside Endless stats)

- **Quiz Session Bar**
  - Always-visible strip above quiz card: mode label, questions remaining (hidden in endless), hardcore skull
  - Exit button (×) — marks current card as wrong before going to results

- **Screen Shake on Wrong Answer**
  - Damped oscillation animation on wrong answers (toggleable in quiz config)
  - Preference persisted to localStorage

- **Endless & Hardcore Stats Dashboard**
  - Endless: 8-stat grid (answered, correct, wrong, accuracy, best streak, sessions, avg, longest) + accuracy/cards-per-session charts
  - Hardcore: 3-stat grid (sessions, best streak, avg score) + "Best score — last 14 days" date-bucketed bar chart (always 14 bars, empty days shown)
  - Tab toggle animates with slide-up/down; chart bars grow from bottom on tab switch
  - Only tab toggle shown when both endless and hardcore sessions exist

- **Session History: Collapsible**
  - Shows last 5 sessions by default; `+N more` button expands to 30
  - Mode badges grouped in fixed-width div for vertical alignment of stats
  - Expanding/collapsing no longer re-renders the rest of the page (extracted to `SessionHistory` component)

### Changed

- Quiz results buttons renamed: "Config" → "New Session", "Again" → "Retry"; both stretch to fill row
- Stats grids use CSS `grid` with equal columns (4-col for endless, 3-col for hardcore) for snug fill

### Fixed

- Endless sessions were being saved with `mode: 'scheduled'` — stale closure in save effect; fixed with `sessionMetaRef` (synchronous snapshot before screen transition)
- StatsView required page refresh to show latest session — async save race fixed with module-level `_pendingSave` promise + `awaitPendingSave()` before load

## [0.3.0] - 2026-04-20

### Added

- **In-Reader Definition Popup** (Phase 3 headline)
  - Select any text in the EPUB reader → popup appears with definitions
  - Rule-based deinflection (middleware) generates conjugation candidates for selected text
  - Greedy longest-match segmentation across the selection
  - Each entry: expression, reading, definitions (up to 3), source dictionary name
  - Click any kanji in the expression → inline sub-lookup
  - "See also" section for alternate dictionary matches (collapsed by default; expression + reading only when collapsed, full definition when expanded)
  - Each alternate is independently expandable
  - +Anki / +Dict action buttons per entry and per alternate
  - Smart popup positioning — vertical mode: left/right of selection; horizontal: above/below
  - Click outside to dismiss

- **Deinflection Engine (Middleware)**
  - `deinflect.ts` — rule-based, loads `deinflect-rules.json` at startup
  - Generates all substring candidates with `startPos` for greedy matching
  - `POST /deinflect` — returns candidates for selected text
  - `POST /extract-baseForms` — bulk base form extraction for mining
  - `POST /mine-words` — full mining pipeline moved from frontend to middleware

- **Mining Pipeline Moved to Middleware**
  - `miner.ts`, `ankiClient.ts`, `ankiQueue.ts` all live in middleware
  - Frontend sends one `POST /mine-words` (full book text) — middleware tokenizes, batch-looks up, filters, queues Anki
  - Anki retry queue persists in middleware process (survives page reload)
  - `bookTitle` forwarded through pipeline for Anki card tags and `MiscInfo` field

- **Startup Job Queue** (`StartupJobService`)
  - Single-threaded executor serializes all DB-writing jobs (startup + manual)
  - Startup sequence: dictionary import → crawler → author extraction (in order, no overlap)
  - Manual triggers (`/crawler/run`, `/admin/extract-authors`) submit to the same queue
  - No more `SQLITE_BUSY` conflicts on startup
  - `AppStartupListener` (renamed from `DictionaryStartupRunner`) — thin `@EventListener` that calls `submitAll()`

- **Dictionary File Watcher** (`DictionaryWatcherService`)
  - `java.nio.WatchService` watches `/app/data/dictionaries/` and `.../frequency/` at runtime
  - Drop a new `.zip` → auto-imported without restart
  - Imports go through the job queue (no concurrent write conflicts)
  - Daemon thread, starts after `ApplicationReadyEvent`

- **DictionaryView Enhancements**
  - Kana row filter (あ/か/さ/た/な/は/ま/や/ら/わ) for browsing personal dictionary
  - Frequency filter panel with source dropdown + min/max rank inputs

- **Mined Words: localStorage → IndexedDB**
  - Per-book mined word lists now loaded from IndexedDB (`dictionaryStore`) instead of localStorage
  - `getWordsByBookId`, `getWord` added to `dictionaryStore`

### Changed

- `batchLookup` now returns `Map<string, DictionaryEntry[]>` (all matches) instead of `Map<string, DictionaryEntry | null>` (first match only) — enables alternate/see-also entries in popup
- Middleware switches to `network_mode: host` in Docker — required for Anki (localhost:8765) and backend (localhost:8080) reachability from middleware
- `BookController` no longer injects `CrawlerService` / `RetroactiveAuthorExtractionService` directly — routes through `StartupJobService` queue
- Logging reduced across all indexing services — per-file/per-entry INFO logs removed; only final summary counts logged

## [0.2.3] - 2026-04-19

### Added
- **LAN Access Support**
  - Expose Docker container to local network (configurable via .env)
  - Environment-driven CORS configuration
  - Dynamic HMR host for Vite dev server (phone hot reload)
  - Global CORS config via Spring WebConfig (replaces per-controller decorators)

- **Reader UX Improvements**
  - Proportional swipe scrolling based on gesture distance (distance × 0.6)
  - Small swipes = small scrolls, large swipes = large scrolls
  - Tighter horizontal mode margins: 40px → 8px left/right (desktop), 4px (mobile)
  - Maximize screen space for reading

### Fixed
- Firefox Android viewport width detection (responsive design works with Chrome)
- Mobile breakpoint now 600px (catches wider phones like Samsung S23)
- Improved tablet layout: minmax 150px → 140px cards, better spacing

## [0.2.2] - 2026-04-19

### Added
- **Mobile Reader UI Optimization**
  - Responsive padding adjustment (40px desktop → 16-20px mobile)
  - Smaller scrollbar width on mobile (8px → 6px)
  - Compact button styling with reduced padding and min-height
  - Stacked progress counter on top of controls (mobile only)
  - Centered control buttons with flex-wrap support
  - Responsive font sizes (18px → 16px on mobile)
  - Special vertical mode padding to prevent text clipping (40px top on mobile)

- **Bookmark Management**
  - Remove bookmark button with clear icon
  - Only displays when active bookmark exists
  - Clears bookmark and updates UI immediately

### Fixed
- Text cutoff at top of vertical reading mode on mobile
- Reader UI controls overflow on small screens
- Ruby text sizing (1em for ruby, 0.5em for rt)

## [0.2.1] - 2026-04-19

### Added
- **Progress Visualization**
  - Pie chart indicator (28px) showing reading progress
  - Off-white fill on dark background for visibility
  - Accurate progress calculation using stored character count

- **Smart UI Components**
  - BookListRow component for reusable book row display
  - Applied to TitlesView and AuthorsView (DRY pattern)
  - Consistent styling and interactions across views

- **Enhanced Filtering**
  - All/Favorites/In Progress filter buttons in TitlesView
  - All/Favorites filter buttons in AuthorsView
  - Smart lazy-loading: disabled on filtered views (prevents infinite load)
  - Dynamic filtering without pagination

- **Author Favorites**
  - Favorites system for authors (similar to books)
  - Persistent storage via localStorage
  - Visual indicator with filled/unfilled heart icon

- **Improved Hover Preview**
  - Fixed positioning (escapes container overflow)
  - Smart top/bottom placement based on viewport space
  - Dynamic height measurement (no estimation)
  - Sits precisely on row edge (zero margin)
  - Graceful fallback for missing cover images

### Fixed
- Progress bar accuracy (now stores totalChars with bookmark)
- Infinite lazy-loading on filtered views
- Cover preview cutoff at bottom of list
- Hover preview positioning at viewport boundaries

## [0.2.0] - 2026-04-18

### Added
- **Author Extraction & Search**
  - Automatic author extraction from EPUB/PDF metadata
  - Retroactive author extraction for entire collection via admin endpoint
  - Author search with autocomplete
  - Many-to-many author-to-book relationships
  - Author entity with unique name constraint

- **Book Status Management**
  - In Progress tab for books currently reading
  - Favorites tab for bookmarked books
  - Hidden tab for filtered-out books
  - Manual hide/show controls on book cards
  - Persistent storage via localStorage

- **Enhanced Search & Filtering**
  - Bulk search API supporting multiple status filters
  - Dynamic tab counts based on current search state
  - Auto-refresh tabs when book status changes
  - Genre and type filtering maintained

- **UI/UX Improvements**
  - Hamburger menu icon (replaces three-dot menu)
  - Darker, more accessible menu styling
  - Dynamic pagination (All Books tab only)
  - Improved book card compact design
  - Real-time tab count updates

### Fixed
- Border style rerender warnings
- Book visibility consistency across tabs
- localStorage cleanup on book hiding
- Tab count synchronization with bulk search state

## [0.1.0] - 2026-04-17

### Initial Release
- **Core Features**
  - Automated filesystem crawler with configurable schedule
  - Metadata extraction from EPUB/PDF files
  - Cover image extraction and caching
  - SQLite database with JPA entities
  - REST API with search, pagination, and filtering
  - React frontend with responsive grid layout

- **Book Indexing**
  - Type detection from directory patterns
  - Genre inference from file metadata
  - Batch processing for 40k+ file collections
  - Manual type/genre override support

- **Infrastructure**
  - Docker Compose orchestration (backend + frontend + file server)
  - Persistent SQLite volume
  - Configuration via environment variables
  - Development and production build modes
  - EPUB reader integration via epubjs

- **API Endpoints**
  - Search books by title/genre/type with pagination
  - Get book details and cover images
  - List available genres and types
  - Trigger crawler manually
  - Update genre/type overrides
  - Retrieve collection statistics

### Architecture Decisions
- SQLite with application-generated UUIDs (SQLite JDBC limitation workaround)
- Kubernetes-ready Docker setup with named volumes
- Separate file server for EPUB reading (CORS-safe)
- Kotlin for backend type safety and conciseness
- React + TypeScript for type-safe frontend

### Known Limitations
- Cover extraction fully supports EPUB; PDF/CBR/CBZ are stubs
- No book summaries (planned Phase 2)
- No user ratings or annotations
- File links use file:// URLs (Linux/Mac compatible)

---

**Project Goal:** Give 40,000+ books a home, not a hard drive.  
**Built with:** Kotlin, Spring Boot 3.2, React 18, SQLite  
**License:** Private

*Co-Authored-By: chloe-chan <noreply@chloe>*
