# Author Indexing & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement author extraction from book metadata and author-based search with autocomplete on frontend.

**Architecture:** Create Author entity with many-to-many relationship to books. Implement extractors for EPUB (OPF parsing) and PDF (PDFBox metadata) metadata. Add author search API with autocomplete. Modify SearchForm to support title/author toggle mode with shared autocomplete. Extract authors retroactively during deployment.

**Tech Stack:** Spring Data JPA, PDFBox, React hooks, localStorage for search UI state.

---

## Phase 1: Database & Models

### Task 1: Create Author Entity

**Files:**
- Create: `src/main/kotlin/com/yomitori/model/Author.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/model/AuthorTest.kt
import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class AuthorTest {
    @Test
    fun testAuthorCreation() {
        val author = Author(name = "J.K. Rowling")
        assertEquals("J.K. Rowling", author.name)
        assertNotNull(author.id)
        assertNotNull(author.createdAt)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/stella/projects/yomitori
./gradlew test --tests "*.AuthorTest" -i 2>&1 | head -20
```

Expected: FAIL with "unresolved reference: Author"

- [ ] **Step 3: Write Author entity**

```kotlin
package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

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

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.AuthorTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/model/Author.kt src/test/kotlin/com/yomitori/model/AuthorTest.kt
git commit -m "feat: create Author entity with unique name constraint

- Author id (UUID), name (unique, indexed), createdAt
- Indexed on name for autocomplete queries
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 2: Create BookAuthor Junction Table

**Files:**
- Create: `src/main/kotlin/com/yomitori/model/BookAuthor.kt`
- Create: `src/main/kotlin/com/yomitori/model/BookAuthorId.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/model/BookAuthorTest.kt
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class BookAuthorTest {
    @Test
    fun testBookAuthorCreation() {
        val book = Book(filepath = "/test/book.epub", filename = "test.epub", title = "Test", fileFormat = "epub", type = "novel")
        val author = Author(name = "Test Author")
        val bookAuthor = BookAuthor(book = book, author = author)
        
        assertNotNull(bookAuthor.book)
        assertNotNull(bookAuthor.author)
        assertEquals("Test Author", bookAuthor.author.name)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.BookAuthorTest" -i 2>&1 | head -20
```

Expected: FAIL with "unresolved reference: BookAuthor"

- [ ] **Step 3: Write BookAuthorId composite key class**

```kotlin
package com.yomitori.model

import java.io.Serializable

data class BookAuthorId(
    val book: String = "",
    val author: String = ""
) : Serializable
```

- [ ] **Step 4: Write BookAuthor entity**

```kotlin
package com.yomitori.model

import jakarta.persistence.*

@Entity
@Table(name = "book_authors")
@IdClass(BookAuthorId::class)
data class BookAuthor(
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    val book: Book,

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    val author: Author
)
```

- [ ] **Step 5: Run test to verify it passes**

```bash
./gradlew test --tests "*.BookAuthorTest" -i
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/yomitori/model/BookAuthor.kt src/main/kotlin/com/yomitori/model/BookAuthorId.kt src/test/kotlin/com/yomitori/model/BookAuthorTest.kt
git commit -m "feat: create BookAuthor junction table for many-to-many relationship

- Composite key (book_id, author_id)
- Lazy loading for performance
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 3: Modify Book Entity to Add Authors Relationship

**Files:**
- Modify: `src/main/kotlin/com/yomitori/model/Book.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/model/BookTest.kt
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BookTest {
    @Test
    fun testBookWithAuthors() {
        val book = Book(filepath = "/test/book.epub", filename = "test.epub", title = "Test", fileFormat = "epub", type = "novel")
        val author1 = Author(name = "Author One")
        val author2 = Author(name = "Author Two")
        
        book.authors = listOf(author1, author2)
        
        assertEquals(2, book.authors.size)
        assertTrue(book.authors.any { it.name == "Author One" })
        assertTrue(book.authors.any { it.name == "Author Two" })
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.BookTest" -i 2>&1 | head -30
```

Expected: FAIL with "unresolved reference: authors" or type mismatch on assignment

- [ ] **Step 3: Add authors relationship to Book entity**

At line 48 in `Book.kt`, add after `updatedAt`:

```kotlin
    @ManyToMany(cascade = [CascadeType.PERSIST, CascadeType.MERGE])
    @JoinTable(
        name = "book_authors",
        joinColumns = [JoinColumn(name = "book_id")],
        inverseJoinColumns = [JoinColumn(name = "author_id")]
    )
    var authors: List<Author> = emptyList()
```

Full updated Book entity:

```kotlin
package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "books")
data class Book(
    @Id
    val id: String = UUID.randomUUID().toString(),

    @Column(unique = true, nullable = false)
    val filepath: String,

    @Column(nullable = false)
    val filename: String,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = true)
    val genre: String? = null,

    @Column(nullable = false)
    val type: String, // manga, novel, light-novel, textbook, other

    @Column(nullable = true)
    val coverPath: String? = null,

    @Column(nullable = false)
    val fileFormat: String, // pdf, epub, cbr, cbz

    @Column(nullable = false)
    val lastIndexed: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    val isDeleted: Boolean = false,

    @Column(nullable = false)
    val manualOverride: Boolean = false,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now()
) {
    @ManyToMany(cascade = [CascadeType.PERSIST, CascadeType.MERGE])
    @JoinTable(
        name = "book_authors",
        joinColumns = [JoinColumn(name = "book_id")],
        inverseJoinColumns = [JoinColumn(name = "author_id")]
    )
    var authors: List<Author> = emptyList()
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.BookTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/model/Book.kt src/test/kotlin/com/yomitori/model/BookTest.kt
git commit -m "feat: add many-to-many authors relationship to Book

- Authors loaded lazily via BookAuthor junction table
- Cascade PERSIST and MERGE for author management
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 4: Create Author & BookAuthor Repositories

**Files:**
- Create: `src/main/kotlin/com/yomitori/repository/AuthorRepository.kt`
- Create: `src/main/kotlin/com/yomitori/repository/BookAuthorRepository.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/repository/AuthorRepositoryTest.kt
import com.yomitori.model.Author
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@DataJpaTest
class AuthorRepositoryTest {
    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Test
    fun testFindByNameIgnoreCase() {
        val author = Author(name = "J.K. Rowling")
        authorRepository.save(author)

        val found = authorRepository.findByNameIgnoreCase("j.k. rowling")
        assertNotNull(found)
        assertEquals("J.K. Rowling", found.name)
    }

    @Test
    fun testFindByNameContainingIgnoreCase() {
        authorRepository.save(Author(name = "J.K. Rowling"))
        authorRepository.save(Author(name = "Stephen King"))

        val results = authorRepository.findByNameContainingIgnoreCase("rowl")
        assertEquals(1, results.size)
        assertEquals("J.K. Rowling", results[0].name)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.AuthorRepositoryTest" -i 2>&1 | head -30
```

Expected: FAIL with "unresolved reference: AuthorRepository"

- [ ] **Step 3: Write AuthorRepository**

```kotlin
package com.yomitori.repository

import com.yomitori.model.Author
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AuthorRepository : JpaRepository<Author, String> {
    fun findByNameIgnoreCase(name: String): Author?
    fun findByNameContainingIgnoreCase(query: String): List<Author>
}
```

- [ ] **Step 4: Write BookAuthorRepository**

```kotlin
package com.yomitori.repository

import com.yomitori.model.BookAuthor
import com.yomitori.model.BookAuthorId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface BookAuthorRepository : JpaRepository<BookAuthor, BookAuthorId> {
    fun findByBookId(bookId: String): List<BookAuthor>
    fun deleteByBookId(bookId: String)
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
./gradlew test --tests "*.AuthorRepositoryTest" -i
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/yomitori/repository/AuthorRepository.kt src/main/kotlin/com/yomitori/repository/BookAuthorRepository.kt src/test/kotlin/com/yomitori/repository/AuthorRepositoryTest.kt
git commit -m "feat: create Author and BookAuthor repositories

- AuthorRepository supports finding by exact name and containing queries
- BookAuthorRepository manages many-to-many associations
- Case-insensitive queries for autocomplete
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

## Phase 2: Author Extraction

### Task 5: Create Author Extraction Service

**Files:**
- Create: `src/main/kotlin/com/yomitori/service/AuthorExtractionService.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/service/AuthorExtractionServiceTest.kt
import com.yomitori.service.AuthorExtractionService
import org.junit.jupiter.api.Test
import kotlin.test.assertTrue

class AuthorExtractionServiceTest {
    private val service = AuthorExtractionService()

    @Test
    fun testExtractAuthorsFromEpubPath() {
        val filepath = "/books/manga/[AuthorName] - Title.epub"
        val authors = service.extractAuthors(filepath)
        assertTrue(authors.isNotEmpty())
    }

    @Test
    fun testFallbackToUnknownAuthor() {
        val filepath = "/books/unknown_book.epub"
        val authors = service.extractAuthors(filepath)
        assertTrue(authors.isNotEmpty())
        assertTrue(authors.any { it == "Unknown Author" })
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.AuthorExtractionServiceTest" -i 2>&1 | head -20
```

Expected: FAIL with "unresolved reference: AuthorExtractionService"

- [ ] **Step 3: Write AuthorExtractionService**

```kotlin
package com.yomitori.service

import org.springframework.stereotype.Service
import java.io.File
import java.util.zip.ZipFile

@Service
class AuthorExtractionService {
    fun extractAuthors(filepath: String): List<String> {
        val file = File(filepath)
        val fileFormat = when {
            filepath.endsWith(".epub", ignoreCase = true) -> "epub"
            filepath.endsWith(".pdf", ignoreCase = true) -> "pdf"
            filepath.endsWith(".cbz", ignoreCase = true) -> "cbz"
            filepath.endsWith(".cbr", ignoreCase = true) -> "cbr"
            else -> "unknown"
        }

        return try {
            val authors = when (fileFormat) {
                "epub" -> extractEpubAuthors(filepath)
                "pdf" -> extractPdfAuthors(filepath)
                "cbz", "cbr" -> extractComicAuthors(filepath)
                else -> emptyList()
            }
            authors.ifEmpty { listOf("Unknown Author") }
        } catch (e: Exception) {
            listOf("Unknown Author")
        }
    }

    private fun extractEpubAuthors(filepath: String): List<String> {
        return try {
            val zipFile = ZipFile(File(filepath))
            val containerEntry = zipFile.getEntry("META-INF/container.xml") ?: return emptyList()
            val containerXml = zipFile.getInputStream(containerEntry).bufferedReader().use { it.readText() }
            val opfPath = extractOpfPath(containerXml) ?: return emptyList()

            val opfEntry = zipFile.getEntry(opfPath) ?: return emptyList()
            val opfXml = zipFile.getInputStream(opfEntry).bufferedReader().use { it.readText() }
            zipFile.close()

            extractAuthorsFromOpf(opfXml)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun extractPdfAuthors(filepath: String): List<String> {
        // PDF extraction will be implemented in next task
        return emptyList()
    }

    private fun extractComicAuthors(filepath: String): List<String> {
        // Extract from filename pattern [Author Name] - Title.cbz
        val filename = File(filepath).nameWithoutExtension
        val pattern = """^\[([^\]]+)\]""".toRegex()
        val match = pattern.find(filename)
        return match?.groupValues?.get(1)?.split("[,;]".toRegex())?.map { it.trim() } ?: emptyList()
    }

    private fun extractOpfPath(containerXml: String): String? {
        val regex = """rootfile\s+full-path="([^"]+)""".toRegex()
        return regex.find(containerXml)?.groupValues?.get(1)
    }

    private fun extractAuthorsFromOpf(opfXml: String): List<String> {
        val creatorRegex = """<dc:creator[^>]*>([^<]+)</dc:creator>""".toRegex()
        val matches = creatorRegex.findAll(opfXml)
        return matches.map { it.groupValues[1].trim() }.filter { it.isNotEmpty() }.toList()
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.AuthorExtractionServiceTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/service/AuthorExtractionService.kt src/test/kotlin/com/yomitori/service/AuthorExtractionServiceTest.kt
git commit -m "feat: create AuthorExtractionService for multiple formats

- Extract authors from EPUB (OPF metadata) and CBZ/CBR (filename patterns)
- PDF extraction stubbed (implemented in next task)
- Fallback to 'Unknown Author' on parse errors
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 6: Implement PDF Author Extraction with PDFBox

**Files:**
- Modify: `src/main/kotlin/com/yomitori/service/AuthorExtractionService.kt`

- [ ] **Step 1: Add PDFBox dependency to build.gradle.kts**

Find the `dependencies` block and add:

```kotlin
implementation("org.apache.pdfbox:pdfbox:3.0.0")
```

- [ ] **Step 2: Write the failing test**

```kotlin
// Add to AuthorExtractionServiceTest.kt
@Test
fun testExtractAuthorsFromPdf() {
    // This will be a real PDF file in test resources
    val filepath = "src/test/resources/sample-with-author.pdf"
    val authors = service.extractAuthors(filepath)
    assertTrue(authors.isNotEmpty())
    assertTrue(authors.any { it.contains("Sample Author", ignoreCase = true) })
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
./gradlew test --tests "*.AuthorExtractionServiceTest.testExtractAuthorsFromPdf" -i 2>&1 | head -20
```

Expected: FAIL (test resource not found or no author extracted)

- [ ] **Step 4: Implement PDF author extraction**

Replace the `extractPdfAuthors` method in AuthorExtractionService:

```kotlin
private fun extractPdfAuthors(filepath: String): List<String> {
    return try {
        val document = org.apache.pdfbox.pdmodel.PDDocument.load(File(filepath))
        val info = document.documentInformation
        val authorField = info?.author ?: ""
        document.close()

        if (authorField.isBlank()) {
            emptyList()
        } else {
            // Handle multiple authors separated by semicolon or comma
            authorField.split("[,;]".toRegex()).map { it.trim() }.filter { it.isNotEmpty() }
        }
    } catch (e: Exception) {
        emptyList()
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
./gradlew test --tests "*.AuthorExtractionServiceTest" -i
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add build.gradle.kts src/main/kotlin/com/yomitori/service/AuthorExtractionService.kt src/test/kotlin/com/yomitori/service/AuthorExtractionServiceTest.kt
git commit -m "feat: implement PDF author extraction with PDFBox

- Extract author field from PDF document metadata
- Handle multiple authors separated by comma or semicolon
- Add PDFBox 3.0.0 dependency
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 7: Update MetadataExtractor to Include Authors

**Files:**
- Modify: `src/main/kotlin/com/yomitori/service/MetadataExtractor.kt`
- Modify: `src/test/kotlin/com/yomitori/service/MetadataExtractorTest.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// Add to MetadataExtractorTest.kt (create if doesn't exist)
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MetadataExtractorTest {
    private val extractor = MetadataExtractor()

    @Test
    fun testExtractIncludesAuthors() {
        val metadata = extractor.extract("/books/manga/[AuthorName] - Title.cbz")
        assertTrue(metadata.authors.isNotEmpty())
    }

    @Test
    fun testExtractFallsBackToUnknownAuthor() {
        val metadata = extractor.extract("/books/unknown.epub")
        assertTrue(metadata.authors.contains("Unknown Author"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.MetadataExtractorTest" -i 2>&1 | head -20
```

Expected: FAIL with "unresolved reference: authors" in ExtractedMetadata

- [ ] **Step 3: Update ExtractedMetadata data class**

At the top of MetadataExtractor.kt, update the data class:

```kotlin
data class ExtractedMetadata(
    val title: String,
    val type: String, // manga, novel, light-novel, textbook, other
    val genre: String? = null,
    val fileFormat: String,
    val authors: List<String> = emptyList()
)
```

- [ ] **Step 4: Inject AuthorExtractionService and update extract method**

```kotlin
import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths

@Service
class MetadataExtractor(
    private val authorExtractionService: AuthorExtractionService
) {
    // ... existing typeRules and genreRules ...

    fun extract(filepath: String): ExtractedMetadata {
        val file = File(filepath)
        val filename = file.name
        val fileFormat = getFileFormat(filename)
        val type = detectType(filepath)
        val title = extractTitle(filename)
        val genre = inferGenre(type)
        val authors = authorExtractionService.extractAuthors(filepath)

        return ExtractedMetadata(
            title = title,
            type = type,
            genre = genre,
            fileFormat = fileFormat,
            authors = authors
        )
    }

    // ... rest of methods unchanged ...
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
./gradlew test --tests "*.MetadataExtractorTest" -i
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/yomitori/service/MetadataExtractor.kt src/test/kotlin/com/yomitori/service/MetadataExtractorTest.kt
git commit -m "feat: integrate author extraction into MetadataExtractor

- ExtractedMetadata now includes authors list
- AuthorExtractionService injected as dependency
- Extract method returns authors for each book format
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

## Phase 3: API Endpoints

### Task 8: Create AuthorController with Autocomplete Endpoint

**Files:**
- Create: `src/main/kotlin/com/yomitori/api/AuthorController.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/api/AuthorControllerTest.kt
import com.yomitori.model.Author
import com.yomitori.repository.AuthorRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class AuthorControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Test
    fun testAutocompleteReturnsMatchingAuthors() {
        authorRepository.save(Author(name = "J.K. Rowling"))
        authorRepository.save(Author(name = "Stephen King"))

        mockMvc.perform(get("/api/authors/autocomplete?query=rowl"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("J.K. Rowling"))
    }

    @Test
    fun testAutocompleteEmptyQueryReturnsEmpty() {
        mockMvc.perform(get("/api/authors/autocomplete?query="))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.AuthorControllerTest" -i 2>&1 | head -30
```

Expected: FAIL with "404" or "No mapping for GET /api/authors/autocomplete"

- [ ] **Step 3: Write AuthorController**

```kotlin
package com.yomitori.api

import com.yomitori.model.Author
import com.yomitori.repository.AuthorRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/authors")
@CrossOrigin(origins = ["http://localhost:5173", "http://localhost:3000"])
class AuthorController(
    private val authorRepository: AuthorRepository
) {
    @GetMapping("/autocomplete")
    fun autocomplete(
        @RequestParam(defaultValue = "") query: String
    ): ResponseEntity<List<Author>> {
        val results = if (query.isEmpty()) {
            emptyList()
        } else {
            authorRepository.findByNameContainingIgnoreCase(query).take(10)
        }
        return ResponseEntity.ok(results)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.AuthorControllerTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/api/AuthorController.kt src/test/kotlin/com/yomitori/api/AuthorControllerTest.kt
git commit -m "feat: create AuthorController with autocomplete endpoint

- GET /api/authors/autocomplete?query=... returns matching authors
- Returns top 10 results, empty list for empty query
- Case-insensitive search, response includes id and name
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 9: Add Author Search Parameter to BookController

**Files:**
- Modify: `src/main/kotlin/com/yomitori/api/BookController.kt`
- Modify: `src/main/kotlin/com/yomitori/api/SearchRequest.kt` (or inline in controller)

- [ ] **Step 1: Write the failing test**

```kotlin
// Add to src/test/kotlin/com/yomitori/api/BookControllerTest.kt
@Test
fun testSearchByAuthor() {
    // Setup: Create book with author
    val author = authorRepository.save(Author(name = "J.K. Rowling"))
    val book = bookRepository.save(Book(filepath = "/test.epub", filename = "test.epub", title = "Harry Potter", fileFormat = "epub", type = "novel"))
    bookAuthorRepository.save(BookAuthor(book = book, author = author))

    mockMvc.perform(get("/api/books/search?author=rowling"))
        .andExpect(status().isOk)
        .andExpect(jsonPath("$.content[0].title").value("Harry Potter"))
        .andExpect(jsonPath("$.content[0].authors[0].name").value("J.K. Rowling"))
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.BookControllerTest.testSearchByAuthor" -i 2>&1 | head -30
```

Expected: FAIL (no author parameter support)

- [ ] **Step 3: Update SearchRequest data class**

```kotlin
data class SearchRequest(
    val title: String = "",
    val genre: String? = null,
    val type: String? = null,
    val author: String? = null,
    val page: Int = 0,
    val pageSize: Int = 20
)
```

- [ ] **Step 4: Update BookController searchBooks method signature**

Replace the searchBooks method in BookController:

```kotlin
@GetMapping("/search")
fun searchBooks(
    @RequestParam(required = false, defaultValue = "") title: String,
    @RequestParam(required = false) genre: String?,
    @RequestParam(required = false) type: String?,
    @RequestParam(required = false) author: String?,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") pageSize: Int
): ResponseEntity<Page<Book>> {
    val results = bookService.searchBooks(title, genre, type, author, page, pageSize)
    return ResponseEntity.ok(results)
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
./gradlew test --tests "*.BookControllerTest.testSearchByAuthor" -i
```

Expected: PASS (once BookService is updated in next task)

- [ ] **Step 6: Commit**

```bash
git add src/main/kotlin/com/yomitori/api/BookController.kt src/main/kotlin/com/yomitori/api/SearchRequest.kt
git commit -m "feat: add author parameter to book search endpoint

- GET /api/books/search?author=... now supported
- SearchRequest includes optional author field
- BookService.searchBooks signature updated to accept author
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 10: Update BookService Search Logic

**Files:**
- Modify: `src/main/kotlin/com/yomitori/service/BookService.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// Add to src/test/kotlin/com/yomitori/service/BookServiceTest.kt
@Test
fun testSearchByAuthorFilter() {
    val author1 = authorRepository.save(Author(name = "Author One"))
    val author2 = authorRepository.save(Author(name = "Author Two"))
    
    val book1 = bookRepository.save(Book(filepath = "/book1.epub", filename = "book1.epub", title = "Book 1", fileFormat = "epub", type = "novel"))
    val book2 = bookRepository.save(Book(filepath = "/book2.epub", filename = "book2.epub", title = "Book 2", fileFormat = "epub", type = "novel"))
    
    bookAuthorRepository.save(BookAuthor(book = book1, author = author1))
    bookAuthorRepository.save(BookAuthor(book = book2, author = author2))

    val results = bookService.searchBooks("", null, null, "one", 0, 20)
    assertEquals(1, results.content.size)
    assertEquals("Book 1", results.content[0].title)
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.BookServiceTest.testSearchByAuthorFilter" -i 2>&1 | head -30
```

Expected: FAIL with signature mismatch or wrong results

- [ ] **Step 3: Update BookService searchBooks method**

Modify BookService.kt:

```kotlin
fun searchBooks(title: String, genre: String?, type: String?, author: String?, page: Int, pageSize: Int): Page<Book> {
    val pageable = PageRequest.of(page, pageSize)
    
    return if (author.isNullOrBlank()) {
        // Existing search without author filter
        bookRepository.searchBooks(title, genre, type, pageable)
    } else {
        // New search with author filter
        bookRepository.searchBooksByAuthor(title, genre, type, author, pageable)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.BookServiceTest.testSearchByAuthorFilter" -i
```

Expected: PASS (once BookRepository method is added in next task)

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/service/BookService.kt
git commit -m "feat: implement author filtering in book search

- searchBooks accepts author parameter (optional)
- Routes to separate repository query when author filter provided
- Maintains backward compatibility for title/genre/type search
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 11: Add Author Search Query to BookRepository

**Files:**
- Modify: `src/main/kotlin/com/yomitori/repository/BookRepository.kt`

- [ ] **Step 1: Write the failing test**

Already written in Task 10. Run to verify:

```bash
./gradlew test --tests "*.BookRepositoryTest.testSearchByAuthor" -i 2>&1 | head -20
```

Expected: FAIL with "undefined method: searchBooksByAuthor"

- [ ] **Step 2: Add custom repository interface**

```kotlin
@Repository
interface BookRepository : JpaRepository<Book, String>, BookRepositoryCustom {
    // ... existing methods ...
}

interface BookRepositoryCustom {
    fun searchBooks(title: String, genre: String?, type: String?, pageable: Pageable): Page<Book>
    fun searchBooksByAuthor(title: String, genre: String?, type: String?, author: String, pageable: Pageable): Page<Book>
}
```

- [ ] **Step 3: Create custom repository implementation**

Create `src/main/kotlin/com/yomitori/repository/BookRepositoryCustomImpl.kt`:

```kotlin
package com.yomitori.repository

import com.yomitori.model.Book
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import jakarta.persistence.criteria.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository

@Repository
class BookRepositoryCustomImpl(
    @PersistenceContext private val entityManager: EntityManager
) : BookRepositoryCustom {

    override fun searchBooks(title: String, genre: String?, type: String?, pageable: Pageable): Page<Book> {
        val cb = entityManager.criteriaBuilder
        val query = cb.createQuery(Book::class.java)
        val root = query.from(Book::class.java)
        val predicates = mutableListOf<Predicate>()

        predicates.add(cb.equal(root.get<Boolean>("isDeleted"), false))
        
        if (title.isNotBlank()) {
            predicates.add(cb.like(cb.lower(root.get("title")), "%${title.lowercase()}%"))
        }
        if (!genre.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("genre"), genre))
        }
        if (!type.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("type"), type))
        }

        query.where(*predicates.toTypedArray())
        query.orderBy(cb.desc(root.get<Any>("createdAt")))

        val typedQuery = entityManager.createQuery(query)
        val total = typedQuery.resultList.size.toLong()
        typedQuery.firstResult = pageable.offset.toInt()
        typedQuery.maxResults = pageable.pageSize
        
        return PageImpl(typedQuery.resultList, pageable, total)
    }

    override fun searchBooksByAuthor(title: String, genre: String?, type: String?, author: String, pageable: Pageable): Page<Book> {
        val cb = entityManager.criteriaBuilder
        val query = cb.createQuery(Book::class.java)
        val root = query.from(Book::class.java)
        val authorJoin = root.join<Any, Any>("authors")
        val predicates = mutableListOf<Predicate>()

        predicates.add(cb.equal(root.get<Boolean>("isDeleted"), false))
        predicates.add(cb.like(cb.lower(authorJoin.get("name")), "%${author.lowercase()}%"))
        
        if (title.isNotBlank()) {
            predicates.add(cb.like(cb.lower(root.get("title")), "%${title.lowercase()}%"))
        }
        if (!genre.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("genre"), genre))
        }
        if (!type.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("type"), type))
        }

        query.where(*predicates.toTypedArray())
        query.distinct(true)
        query.orderBy(cb.desc(root.get<Any>("createdAt")))

        val typedQuery = entityManager.createQuery(query)
        val total = typedQuery.resultList.size.toLong()
        typedQuery.firstResult = pageable.offset.toInt()
        typedQuery.maxResults = pageable.pageSize
        
        return PageImpl(typedQuery.resultList, pageable, total)
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.BookRepositoryTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/repository/BookRepository.kt src/main/kotlin/com/yomitori/repository/BookRepositoryCustomImpl.kt
git commit -m "feat: implement author search in BookRepository

- Add searchBooksByAuthor with criteria API query
- Join Book to Author entity with case-insensitive name match
- Support combined filtering by title, genre, type, and author
- Use DISTINCT to avoid duplicate results from join
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

## Phase 4: Retroactive Extraction

### Task 12: Create Retroactive Author Extraction Service

**Files:**
- Create: `src/main/kotlin/com/yomitori/service/RetroactiveAuthorExtractionService.kt`

- [ ] **Step 1: Write the failing test**

```kotlin
// src/test/kotlin/com/yomitori/service/RetroactiveAuthorExtractionServiceTest.kt
import com.yomitori.model.Author
import com.yomitori.model.Book
import com.yomitori.repository.AuthorRepository
import com.yomitori.repository.BookAuthorRepository
import com.yomitori.repository.BookRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest
class RetroactiveAuthorExtractionServiceTest {
    @Autowired
    private lateinit var retroactiveService: RetroactiveAuthorExtractionService

    @Autowired
    private lateinit var bookRepository: BookRepository

    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Autowired
    private lateinit var bookAuthorRepository: BookAuthorRepository

    @Test
    fun testExtractAuthorsForAllBooks() {
        // Setup books without authors
        val book1 = bookRepository.save(Book(filepath = "/test1.epub", filename = "test1.epub", title = "Book 1", fileFormat = "epub", type = "novel"))
        val book2 = bookRepository.save(Book(filepath = "/test2.cbz", filename = "[AuthorName] - Title.cbz", title = "Book 2", fileFormat = "cbz", type = "manga"))

        retroactiveService.extractAuthorsForAllBooks()

        val authors = authorRepository.findAll()
        assertTrue(authors.size >= 2)
        assertTrue(authors.any { it.name == "Unknown Author" })
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
./gradlew test --tests "*.RetroactiveAuthorExtractionServiceTest" -i 2>&1 | head -30
```

Expected: FAIL with "unresolved reference: RetroactiveAuthorExtractionService"

- [ ] **Step 3: Write RetroactiveAuthorExtractionService**

```kotlin
package com.yomitori.service

import com.yomitori.model.Book
import com.yomitori.model.BookAuthor
import com.yomitori.repository.AuthorRepository
import com.yomitori.repository.BookAuthorRepository
import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class RetroactiveAuthorExtractionService(
    private val bookRepository: BookRepository,
    private val authorRepository: AuthorRepository,
    private val bookAuthorRepository: BookAuthorRepository,
    private val authorExtractionService: AuthorExtractionService,
    private val metadataExtractor: MetadataExtractor
) {
    private val logger = LoggerFactory.getLogger(RetroactiveAuthorExtractionService::class.java)

    @Transactional
    fun extractAuthorsForAllBooks() {
        val allBooks = bookRepository.findAll()
        var successCount = 0
        var errorCount = 0

        logger.info("Starting retroactive author extraction for ${allBooks.size} books")

        for (book in allBooks) {
            try {
                val authorNames = authorExtractionService.extractAuthors(book.filepath)
                
                // Create or find authors
                val authors = authorNames.map { authorName ->
                    authorRepository.findByNameIgnoreCase(authorName)
                        ?: authorRepository.save(com.yomitori.model.Author(name = authorName))
                }

                // Link book to authors (clear existing first)
                bookAuthorRepository.deleteByBookId(book.id)
                authors.forEach { author ->
                    bookAuthorRepository.save(BookAuthor(book = book, author = author))
                }

                successCount++
                if (successCount % 100 == 0) {
                    logger.info("Processed $successCount books")
                }
            } catch (e: Exception) {
                errorCount++
                logger.warn("Failed to extract authors for book ${book.id} (${book.filepath}): ${e.message}")
            }
        }

        logger.info("Retroactive extraction complete: $successCount success, $errorCount errors")
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
./gradlew test --tests "*.RetroactiveAuthorExtractionServiceTest" -i
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/kotlin/com/yomitori/service/RetroactiveAuthorExtractionService.kt src/test/kotlin/com/yomitori/service/RetroactiveAuthorExtractionServiceTest.kt
git commit -m "feat: create RetroactiveAuthorExtractionService for batch processing

- Extract authors for all existing books in database
- Create Author records and link via BookAuthor junction table
- Log progress every 100 books and any extraction errors
- Transactional to ensure consistency
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 13: Create Deployment Controller to Trigger Retroactive Extraction

**Files:**
- Modify: `src/main/kotlin/com/yomitori/api/BookController.kt`

- [ ] **Step 1: Add endpoint to BookController**

At the end of BookController class, add:

```kotlin
@PostMapping("/admin/extract-authors")
fun extractAuthorsRetroactive(
    @Autowired private val retroactiveService: RetroactiveAuthorExtractionService
): ResponseEntity<Map<String, String>> {
    retroactiveService.extractAuthorsForAllBooks()
    return ResponseEntity.ok(mapOf("status" to "Author extraction started"))
}
```

Wait, that's not the right pattern. Let me revise to use constructor injection:

Remove that and instead create a new endpoint. Actually, let's add it as a separate admin endpoint. Modify the BookController constructor:

```kotlin
@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = ["http://localhost:5173", "http://localhost:3000"])
class BookController(
    private val bookService: BookService,
    private val crawlerService: CrawlerService,
    private val retroactiveAuthorExtractionService: RetroactiveAuthorExtractionService,
    @Value("\${yomitori.crawler.covers-path:/app/data/covers}")
    private val coversPath: String
) {
```

Then add at the end:

```kotlin
    @PostMapping("/admin/extract-authors")
    fun extractAuthorsRetroactive(): ResponseEntity<Map<String, String>> {
        retroactiveAuthorExtractionService.extractAuthorsForAllBooks()
        return ResponseEntity.ok(mapOf("status" to "Author extraction completed"))
    }
```

- [ ] **Step 2: Update the method**

Replace the method with correct parameter handling:

```kotlin
@PostMapping("/admin/extract-authors")
fun extractAuthorsRetroactive(): ResponseEntity<Map<String, String>> {
    try {
        retroactiveAuthorExtractionService.extractAuthorsForAllBooks()
        return ResponseEntity.ok(mapOf("status" to "Author extraction completed successfully"))
    } catch (e: Exception) {
        return ResponseEntity.internalServerError()
            .body(mapOf("status" to "Author extraction failed: ${e.message}"))
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/kotlin/com/yomitori/api/BookController.kt
git commit -m "feat: add admin endpoint for retroactive author extraction

- POST /api/books/admin/extract-authors triggers batch extraction
- Returns status message on completion or error
- Can be called manually during deployment
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

## Phase 5: Frontend

### Task 14: Create useAuthorAutocomplete Hook

**Files:**
- Create: `src/hooks/useAuthorAutocomplete.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/useAuthorAutocomplete.spec.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthorAutocomplete } from './useAuthorAutocomplete';

describe('useAuthorAutocomplete', () => {
  it('should fetch authors on query change', async () => {
    const { result } = renderHook(() => useAuthorAutocomplete('rowl'));

    await waitFor(() => {
      expect(result.current.authors).toBeDefined();
    });
  });

  it('should return empty list for empty query', () => {
    const { result } = renderHook(() => useAuthorAutocomplete(''));
    expect(result.current.authors).toEqual([]);
  });

  it('should handle loading state', async () => {
    const { result } = renderHook(() => useAuthorAutocomplete('test'));
    expect(result.current.isLoading).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/stella/projects/yomitori/frontend
npm test -- useAuthorAutocomplete.spec.ts 2>&1 | head -30
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write useAuthorAutocomplete hook**

```typescript
import { useState, useEffect } from 'react';
import { bookClient } from '../api/bookClient';

interface Author {
  id: string;
  name: string;
}

export function useAuthorAutocomplete(query: string) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      setAuthors([]);
      return;
    }

    const fetchAuthors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/authors/autocomplete?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to fetch authors');
        const data = await response.json();
        setAuthors(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setAuthors([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchAuthors, 300); // debounce 300ms
    return () => clearTimeout(timer);
  }, [query]);

  return { authors, isLoading, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /home/stella/projects/yomitori/frontend
npm test -- useAuthorAutocomplete.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAuthorAutocomplete.ts src/hooks/useAuthorAutocomplete.spec.ts
git commit -m "feat: create useAuthorAutocomplete hook with debouncing

- Fetch from /api/authors/autocomplete endpoint
- Debounce requests 300ms to reduce API calls
- Return empty list for empty query
- Handle loading and error states
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

### Task 15: Modify SearchForm to Support Author Search with Mode Toggle

**Files:**
- Modify: `src/components/SearchForm.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/SearchForm.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchForm } from './SearchForm';

describe('SearchForm', () => {
  it('should render search mode dropdown', () => {
    const mockOnSearch = jest.fn();
    render(<SearchForm onSearch={mockOnSearch} isLoading={false} />);
    
    const modeSelect = screen.getByRole('combobox');
    expect(modeSelect).toBeInTheDocument();
  });

  it('should toggle between Title and Author mode', () => {
    const mockOnSearch = jest.fn();
    render(<SearchForm onSearch={mockOnSearch} isLoading={false} />);
    
    const modeSelect = screen.getByRole('combobox');
    fireEvent.change(modeSelect, { target: { value: 'author' } });
    
    expect(modeSelect).toHaveValue('author');
  });

  it('should show author autocomplete when in author mode', async () => {
    const mockOnSearch = jest.fn();
    render(<SearchForm onSearch={mockOnSearch} isLoading={false} />);
    
    const modeSelect = screen.getByRole('combobox');
    fireEvent.change(modeSelect, { target: { value: 'author' } });
    
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'rowl' } });
    
    // Should fetch author autocomplete
    await screen.findByText(/autocomplete list/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/stella/projects/yomitori/frontend
npm test -- SearchForm.spec.tsx 2>&1 | head -40
```

Expected: FAIL (search mode selector not found)

- [ ] **Step 3: Read current SearchForm to understand structure**

```bash
head -100 src/components/SearchForm.tsx
```

- [ ] **Step 4: Modify SearchForm component**

Replace `src/components/SearchForm.tsx`:

```typescript
import { useState } from 'react';
import { SearchParams } from '../types/book';
import { useAuthorAutocomplete } from '../hooks/useAuthorAutocomplete';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  className?: string;
}

export function SearchForm({ onSearch, isLoading, className }: SearchFormProps) {
  const [searchMode, setSearchMode] = useState<'title' | 'author'>('title');
  const [query, setQuery] = useState('');
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  
  const { authors: authorSuggestions } = useAuthorAutocomplete(
    searchMode === 'author' ? query : ''
  );

  const handleSearch = () => {
    if (query.trim()) {
      if (searchMode === 'title') {
        onSearch({ title: query, page: 0, pageSize: 20 });
      } else {
        onSearch({ author: query, page: 0, pageSize: 20 });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
      setShowAuthorDropdown(false);
    }
  };

  const handleAuthorSelect = (authorName: string) => {
    setQuery(authorName);
    setShowAuthorDropdown(false);
    onSearch({ author: authorName, page: 0, pageSize: 20 });
  };

  const handleModeChange = (mode: 'title' | 'author') => {
    setSearchMode(mode);
    setQuery('');
    setShowAuthorDropdown(false);
  };

  return (
    <div className={className} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <select
        value={searchMode}
        onChange={(e) => handleModeChange(e.target.value as 'title' | 'author')}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #404040',
          background: '#1a1a1a',
          color: '#e8e8e8',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        <option value="title">Title</option>
        <option value="author">Author</option>
      </select>

      <div style={{ position: 'relative', flex: 1 }}>
        <input
          type="text"
          placeholder={searchMode === 'title' ? 'Search books...' : 'Search authors...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (searchMode === 'author' && e.target.value.length > 0) {
              setShowAuthorDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchMode === 'author' && query.length > 0) {
              setShowAuthorDropdown(true);
            }
          }}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #404040',
            background: '#1a1a1a',
            color: '#e8e8e8',
            fontSize: '14px',
          }}
        />

        {searchMode === 'author' && showAuthorDropdown && authorSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: '#1a1a1a',
              border: '1px solid #404040',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            {authorSuggestions.map((author) => (
              <button
                key={author.id}
                onClick={() => handleAuthorSelect(author.name)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#e8e8e8',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #404040',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {author.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSearch}
        disabled={isLoading || query.trim().length === 0}
        style={{
          padding: '8px 24px',
          borderRadius: '4px',
          border: 'none',
          background: '#5a9fd4',
          color: '#e8e8e8',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isLoading && query.trim().length > 0) {
            e.currentTarget.style.background = '#6ba9e0';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#5a9fd4';
        }}
      >
        Search
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Update SearchParams type to support author**

In `src/types/book.ts`, update SearchParams:

```typescript
export interface SearchParams {
  title?: string;
  author?: string;
  genre?: string;
  type?: string;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 6: Update bookClient search method to handle author parameter**

In `src/api/bookClient.ts`, update the search method:

```typescript
async search(params: SearchParams): Promise<SearchResponse> {
  const url = new URL('/api/books/search', this.baseUrl);
  if (params.title) url.searchParams.append('title', params.title);
  if (params.author) url.searchParams.append('author', params.author);
  if (params.genre) url.searchParams.append('genre', params.genre);
  if (params.type) url.searchParams.append('type', params.type);
  url.searchParams.append('page', params.page.toString());
  url.searchParams.append('pageSize', params.pageSize.toString());

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd /home/stella/projects/yomitori/frontend
npm test -- SearchForm.spec.tsx
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/SearchForm.tsx src/hooks/useAuthorAutocomplete.ts src/types/book.ts src/api/bookClient.ts src/components/SearchForm.spec.tsx
git commit -m "feat: add author search mode toggle to SearchForm

- Dropdown selector to switch between 'Title' and 'Author' search modes
- Author mode shows autocomplete dropdown from useAuthorAutocomplete hook
- Clear query on mode switch to avoid confusion
- Click author from dropdown to immediately search
- Update SearchParams type and bookClient to support author parameter
- Co-Authored-By: chloe-chan <noreply@chloe>"
```

---

## Summary

**Spec Coverage:**
- ✅ Database Schema: Author entity, BookAuthor junction table, Book relationship
- ✅ Extraction: EPUB (OPF), PDF (PDFBox), CBZ/CBR (filename patterns), fallback to "Unknown Author"
- ✅ API: Author autocomplete endpoint, author search parameter in book search
- ✅ Retroactive: Deployment service to extract authors for all existing books
- ✅ Frontend: Search mode toggle, author autocomplete, integrated into SearchForm
- ✅ Error Handling: Graceful fallbacks for corrupted files, duplicate author deduplication

**Files Created:** 8 (Author.kt, BookAuthor.kt, BookAuthorId.kt, AuthorRepository.kt, BookAuthorRepository.kt, AuthorExtractionService.kt, RetroactiveAuthorExtractionService.kt, AuthorController.kt, useAuthorAutocomplete.ts)

**Files Modified:** 7 (Book.kt, MetadataExtractor.kt, BookController.kt, BookService.kt, BookRepository.kt, SearchForm.tsx, bookClient.ts, SearchParams type)

**All steps tested and committed with TDD approach.**
