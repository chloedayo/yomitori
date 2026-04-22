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

## Phase 2 — Reader + Word Mining ✅ (Complete)

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
- [x] Proper E2E validation with real 500+ word book
- [x] Handle mining timeout / progress cancel
- [x] Word miner panel: click word → jump to occurrence in book

## Phase 3 — Polish + Annotations (In Progress / v0.3.3)

- [x] In-reader word lookup (select text → deinflect → definition popup)
- [x] Kanji drill-down per word (click kanji in popup → inline lookup)
- [x] +Anki / +Dict from popup (save without leaving reader)
- [x] Alternate forms (see also) with independent expand/collapse
- [x] Startup job queue — dict import → crawler → author extraction, serialized, no SQLITE_BUSY
- [x] Dictionary file watcher — drop zip → auto-import, no restart needed
- [x] SRS quiz system (ARIA algorithm — SM2 + speed/consistency/difficulty layers)
- [x] Hardcore quiz mode (one strike ends session, 💀 tagged in history)
- [x] Endless mode + per-mode stats dashboards with animated charts
- [x] Session history (collapsible, mode-tagged)
- [x] Inline annotation persistence per book (IDB, injected at exact word position, writing-mode aware)
- [x] Inline annotation editing + dismiss (click to edit, hover to dismiss)
- [x] HTML definitions with furigana (DOMPurify-sanitized, all surfaces)
- [x] DictionaryView full definition popup (grouped by dict, HTML rendered)
- [x] Romaji input in quiz (wanakana normalization)
- [x] Quiz session size respected + loop mode with warning
- [x] Word count in quiz stats grid
- [x] Anki duplicate pre-filter via canAddNotes (batch + DefinitionPopup)
- [x] Mining completion notification
- [x] Pagination preserves search criteria
- [ ] Inline annotation manager UI (list, search, export per book)
- [ ] Sentence-level context capture for Anki cards
- [ ] Export annotations to Markdown
- [ ] Touch / mobile support for definition popup (tap to select)
- [ ] Reading stats dashboard (chars read, books finished, mining rate)
- [ ] JLPT level estimation from mined words (optional tag)
- [ ] Per-book vocabulary review mode

## Phase 5 — Tauri Desktop App ✅ (Complete)

- [x] Wrap frontend in Tauri shell (native window, no browser needed)
- [x] Native file picker for book collection path (tauri-plugin-dialog)
- [x] System tray integration (hide-to-tray, show/quit menu)
- [x] Auto-launch backend + middleware on app start (sidecar lifecycle)
- [x] Bundled distribution (jlink JRE + bun-compiled middleware + JAR — zero user deps)
- [x] Setup wizard for first-run books folder selection
- [x] GitHub Actions CI (backend/frontend/launcher-check)
- [x] GitHub Actions Release (Linux .deb/.AppImage, Windows .exe, macOS .dmg)

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
- Tauri: test actual sidecar launch end-to-end (binaries are placeholder until first real desktop build)
- CI: fix `npm run test` step — currently skipped in `ci.yml` (vitest not yet wired)

---

## Known Issues / Followups

- Dictionary import can fail on malformed JSON — currently logs + continues, should surface errors in admin UI
- Large PDFs cause cover extraction memory spike
- AnkiConnect offline: queue silently drops cards (should notify user)
- Frequency source filtering: no UI for "any source" vs "this source" mode
