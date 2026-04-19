# Changelog - Yomitori

All notable changes to the Yomitori project are documented here.

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
