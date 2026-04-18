package com.yomitori.api

import com.yomitori.model.Book
import com.yomitori.service.BookService
import com.yomitori.service.CrawlerService
import com.yomitori.service.RetroactiveAuthorExtractionService
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.Page
import org.springframework.http.ResponseEntity
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.*
import java.nio.file.Files
import java.nio.file.Paths

data class SearchRequest(
    val title: String = "",
    val genre: String? = null,
    val type: String? = null,
    val author: String? = null,
    val page: Int = 0,
    val pageSize: Int = 20
)

data class TagUpdateRequest(
    val genre: String? = null,
    val type: String? = null
)

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

    @PostMapping("/search/bulk")
    fun searchBulk(
        @RequestBody request: BulkSearchRequest
    ): ResponseEntity<PageResponse<Book>> {
        val (page, missingIds) = bookService.searchByIds(request.bookIds, request.page, request.pageSize)
        val response = PageResponse.from(page, missingIds)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{bookId}/cover")
    fun getCover(@PathVariable bookId: String): ResponseEntity<ByteArray> {
        val book = bookService.getBookById(bookId) ?: return ResponseEntity.notFound().build()
        if (book.coverPath == null) return ResponseEntity.notFound().build()

        return try {
            val imagePath = Paths.get(book.coverPath)
            if (!Files.exists(imagePath)) {
                return ResponseEntity.notFound().build()
            }
            val imageBytes = Files.readAllBytes(imagePath)
            ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(imageBytes)
        } catch (e: Exception) {
            ResponseEntity.internalServerError().build()
        }
    }

    @GetMapping("/{id}/file")
    fun getBookFile(@PathVariable id: String): ResponseEntity<ByteArray> {
        val book = bookService.getBookById(id) ?: return ResponseEntity.notFound().build()

        return try {
            val file = java.io.File(book.filepath)
            if (!file.exists()) return ResponseEntity.notFound().build()

            val fileBytes = file.readBytes()
            val contentType = when {
                book.filepath.endsWith(".epub", ignoreCase = true) -> "application/epub+zip"
                book.filepath.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
                else -> "application/octet-stream"
            }

            ResponseEntity.ok()
                .header("Content-Disposition", "inline; filename=\"${file.name}\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(fileBytes)
        } catch (e: Exception) {
            ResponseEntity.internalServerError().build()
        }
    }

    @GetMapping("/{id}")
    fun getBook(@PathVariable id: String): ResponseEntity<Book> {
        val book = bookService.getBookById(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(book)
    }

    @PostMapping("/{id}/tag")
    fun updateBookTag(
        @PathVariable id: String,
        @RequestBody request: TagUpdateRequest
    ): ResponseEntity<Book> {
        val updated = bookService.updateBookTag(id, request.genre, request.type)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(updated)
    }

    @GetMapping("/genres")
    fun getGenres(): ResponseEntity<List<String>> {
        return ResponseEntity.ok(bookService.getAllGenres())
    }

    @GetMapping("/types")
    fun getTypes(): ResponseEntity<List<String>> {
        return ResponseEntity.ok(bookService.getAllTypes())
    }

    @GetMapping("/stats")
    fun getStats(): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.ok(bookService.getStats())
    }

    @GetMapping("/test")
    fun testEndpoint(): ResponseEntity<String> {
        return ResponseEntity.ok("TEST WORKS")
    }

    @PostMapping("/crawler/run")
    fun runCrawler(): ResponseEntity<Map<String, String>> {
        crawlerService.runCrawler()
        return ResponseEntity.ok(mapOf("status" to "Crawler triggered"))
    }

    @PostMapping("/admin/extract-authors")
    fun extractAuthorsRetroactive(): ResponseEntity<Map<String, String>> {
        return try {
            retroactiveAuthorExtractionService.extractAuthorsForAllBooks()
            ResponseEntity.ok(mapOf("status" to "Author extraction completed successfully"))
        } catch (e: Exception) {
            ResponseEntity.internalServerError()
                .body(mapOf("status" to "Author extraction failed: ${e.message}"))
        }
    }

    @GetMapping("/cover-file/{bookId}")
    fun coverFile(@PathVariable bookId: String): ResponseEntity<ByteArray>? {
        val book = bookService.getBookById(bookId) ?: return ResponseEntity.notFound().build()
        val coverPath = book.coverPath ?: return ResponseEntity.notFound().build()

        val file = if (coverPath.startsWith('/')) {
            // Absolute path (old format) or Docker path - use as-is
            java.io.File(coverPath)
        } else {
            // Relative filename (new format) - prepend covers path
            java.io.File(coversPath, coverPath)
        }

        return if (file.exists()) {
            ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(file.readBytes())
        } else {
            ResponseEntity.notFound().build()
        }
    }
}
