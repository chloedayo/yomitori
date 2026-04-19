# Yomitori Roadmap

## Phase 1 — Library ✅ (Complete)

- [x] Recursive crawler w/ metadata extraction
- [x] Cover extraction (PDF/EPUB/CBR/CBZ)
- [x] Author extraction + normalization
- [x] Author-book many-to-many
- [x] Paginated search (title / genre / type / author)
- [x] Favorites + hidden + in-progress tabs (localStorage)
- [x] Bookmark persistence
- [x] Reading progress tracking
- [x] Author autocomplete
- [x] Retroactive author extraction admin endpoint
- [x] Bulk book search by ID list

## Phase 2 — Reader + Word Mining ✅ (Mostly Complete)

- [x] EPUB reader (vertical + horizontal orientation)
- [x] Swipe / scroll navigation
- [x] Custom CSS with scoping + persistence
- [x] Kuromoji tokenization middleware
- [x] Local Yomichan dictionary import
- [x] Frequency dictionary support (multi-source)
- [x] Frequency range filtering (min/max/between)
- [x] Batch dictionary lookup endpoint
- [x] Bulk word mining (1000-word batches)
- [x] Async Anki queue (auto-export during mining)
- [x] Settings modal (CSS + frequency combined)
- [x] Mining indicator inline with progress
- [x] Mobile responsive reader UI
- [ ] Proper E2E validation with real 500+ word book
- [ ] Handle mining timeout / progress cancel
- [ ] Word miner panel: click word → jump to occurrence in book

## Phase 3 — Polish + Annotations (Planned)

- [ ] In-reader word lookup (click/tap → dictionary popup)
- [ ] Highlight / annotation persistence per book
- [ ] Sentence-level context capture for Anki cards
- [ ] Export annotations to Markdown
- [ ] Reading stats dashboard (chars read, books finished, mining rate)
- [ ] JLPT level estimation from mined words (optional tag)
- [ ] Kanji breakdown per word
- [ ] Per-book vocabulary review mode

## Phase 4 — Collaboration / Future

- [ ] Multi-user profiles
- [ ] Shared libraries
- [ ] Cloud sync (optional, self-hostable)
- [ ] Mobile native wrapper
- [ ] Offline-first PWA mode
- [ ] Dictionary custom definitions / user notes

---

## Tech Debt

- Migrate from custom SchemaMigration to Flyway (reduce maintenance)
- Replace `yomitori-data` Docker volume with explicit host bind for easier backups
- Add integration tests for mining pipeline (DB + middleware + batch lookup)
- Consolidate `BookController` — multiple crawler triggers (move to CrawlerController)
- Frontend: split `HomePage` into smaller views
- Deprecate jishoClient.ts (replaced by dictionaryClient)
- Frontend: consolidate `reader.tsx` entry vs `ReaderPage.tsx`

---

## Known Issues / Followups

- Dictionary import can fail on malformed JSON — currently logs + continues, should surface errors in admin UI
- Large PDFs cause cover extraction memory spike
- AnkiConnect offline: queue silently drops cards (should notify user)
- Frequency source filtering: no UI for "any source" vs "this source" mode
