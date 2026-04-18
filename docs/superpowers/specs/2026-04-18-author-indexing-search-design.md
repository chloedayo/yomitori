# Author Indexing & Search Design

**Goal:** Enable searching and filtering books by author, with automatic extraction from EPUB/PDF metadata and support for multiple authors per book.

**Architecture:** Add Author entity with many-to-many relationship to books. Extract authors retroactively from EPUB/PDF metadata during deployment, falling back to "Unknown Author" for missing data. Provide author autocomplete endpoint and integrate author search into existing search API. Frontend adds search mode dropdown to toggle between title and author search.

**Tech Stack:** Spring Data JPA (ORM), PDFBox (PDF parsing), existing EPUB ZIP parsing, React hooks for autocomplete state, localStorage for recent searches.

---

## Database Schema

### Author Entity
```kotlin
@Entity
@Table(name = "authors", indexes = [Index(name = "idx_author_name", columnList = "name")])
data class Author(
    @Id
    val id: String = UUID.randomUUID().toString(),
    
    @Column(nullable = false, unique = true)
    val name: String,
    
    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
)
```

### BookAuthor Junction Table
```kotlin
@Entity
@Table(name = "book_authors")
@IdClass(BookAuthorId::class)
data class BookAuthor(
    @Id
    @ManyToOne
    @JoinColumn(name = "book_id")
    val book: Book,
    
    @Id
    @ManyToOne
    @JoinColumn(name = "author_id")
    val author: Author
)

data class BookAuthorId(
    val book: String = "",
    val author: String = ""
) : Serializable
```

### Modified Book Entity
Add relationship:
```kotlin
@ManyToMany
@JoinTable(
    name = "book_authors",
    joinColumns = [JoinColumn(name = "book_id")],
    inverseJoinColumns = [JoinColumn(name = "author_id")]
)
val authors: List<Author> = emptyList()
```

---

## Metadata Extraction

### ExtractedMetadata Update
```kotlin
data class ExtractedMetadata(
    val title: String,
    val type: String,
    val genre: String? = null,
    val fileFormat: String,
    val authors: List<String> = emptyList() // NEW
)
```

### EPUB Author Extraction
Parse OPF file (already accessed for cover extraction):
- Find `dc:creator` tags in the OPF metadata section
- Handle multiple creator tags (one per author)
- Fall back to "Unknown Author" if none found

### PDF Author Extraction
Use PDFBox library:
- Read document properties (`PDDocument.getDocumentInformation()`)
- Extract Author field from document metadata
- Handle multi-author format (semicolon or comma-separated)
- Fall back to "Unknown Author" if empty

### CBZ/CBR Author Extraction
- Extract from filename patterns (e.g., `[Author Name] - Title.cbz`)
- If no pattern match, use "Unknown Author"

### Retroactive Extraction
- Create migration/deployment script that:
  - Scans all books in database
  - Calls `MetadataExtractor.extract()` for each book
  - Creates Author entries (deduped by name, case-insensitive)
  - Links books to authors via BookAuthor junction table
  - Logs skipped/failed books
  - Runs as one-time task during deployment

---

## API Endpoints

### Author Autocomplete
```
GET /api/authors/autocomplete?query=<query>
Response: [
  { id: "uuid", name: "Author Name" },
  ...
]
```
- Search author names containing query (case-insensitive, indexed)
- Return top 10 results
- Return empty list if query is empty

### Modified Search Endpoint
```
GET /api/books/search?title=<title>&author=<author>&genre=<genre>&type=<type>&page=0&pageSize=20
```
- Add optional `author` parameter
- Search by author name (case-insensitive)
- If both title and author provided, AND them together
- Return matching books with author list populated

### Get Book Endpoint
Modify existing `GET /api/books/{id}` to include authors in response.

---

## Frontend Integration

### Search Mode Toggle
- Modify `SearchForm` component
- Add dropdown selector: "Title" | "Author"
- Single search input that switches autocomplete source based on mode
- Clear results on mode switch

### Autocomplete Implementation
- New hook: `useAuthorAutocomplete(query)` (parallel to existing search)
- Fetch `/api/authors/autocomplete?query=...` when user types
- Debounce requests (300ms)
- Show "No authors found" if empty results
- Store in component state, not localStorage (unlike title search)

### Search Form Flow
1. User selects "Author" mode from dropdown
2. User types in search input
3. Autocomplete fetches author suggestions
4. User selects author from dropdown
5. App calls `bookClient.search()` with `author` parameter
6. Results display books by selected author

### BookCard Display
- Keep as-is, no author display in card

---

## Error Handling

### Extraction Failures
- **EPUB parse error:** Log warning, mark book "Unknown Author", continue
- **PDF read error:** Log warning, mark book "Unknown Author", continue
- **Corrupted file:** Skip during retroactive run, log error with filepath
- **Duplicate author names:** Deduplicate case-insensitively when creating Author records

### API Failures
- **Author autocomplete returns 500:** Frontend shows empty list, user can still search by title
- **Search with invalid author ID:** Return no results, log unexpected error
- **Missing author relationship:** Should not occur (DB constraint), but treat as "Unknown Author" if it does

### Retroactive Extraction Failures
- **Database transaction rollback:** Log which book failed, continue with next
- **Missing book in database:** Skip gracefully, log filepath
- **Timeout on large library:** Break into batches, process in chunks

---

## Testing

### Unit Tests
- `AuthorExtractionTest`: Sample EPUB and PDF files with author metadata, verify correct extraction
- `AuthorExtractionTest`: Books with missing author metadata, verify "Unknown Author" fallback
- `AuthorDeduplicationTest`: Multiple books by same author, verify deduping by case-insensitive name
- `AuthorRepositoryTest`: Author CRUD, uniqueness constraint on name

### Integration Tests
- `AuthorAutocompleteApiTest`: Query by partial name, verify results ordered by relevance
- `SearchByAuthorApiTest`: Search with valid author name, verify correct books returned
- `SearchByAuthorApiTest`: Search with non-existent author, verify empty results
- `SearchByAuthorApiTest`: Combine title + author search, verify AND logic

### Frontend Tests
- `SearchForm.spec.tsx`: Toggle between title/author mode, verify autocomplete source switches
- `SearchForm.spec.tsx`: Type author name, verify debounced autocomplete fetch
- `useAuthorAutocomplete.spec.ts`: Mock API responses, verify state updates correctly

---

## Migration & Deployment

1. Create Author entity, BookAuthor table via JPA migration
2. Add author field to Book entity via migration
3. Deploy updated backend
4. Run retroactive extraction script (one-time, post-deployment)
5. Deploy updated frontend
6. Monitor extraction logs for any failures

---

## Future Extensibility

- Author roles (editor, translator, etc.) can be added to BookAuthor table later
- Author profiles (bio, image, links) can be added to Author entity later
- Author sorting/filtering in UI can be expanded as metadata grows
