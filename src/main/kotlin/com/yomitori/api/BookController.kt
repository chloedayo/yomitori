package com.yomitori.api

import com.yomitori.model.Book
import com.yomitori.service.BookService
import org.springframework.data.domain.Page
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class SearchRequest(
    val title: String = "",
    val genre: String? = null,
    val type: String? = null,
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
    private val bookService: BookService
) {
    @GetMapping("/search")
    fun searchBooks(
        @RequestParam(required = false, defaultValue = "") title: String,
        @RequestParam(required = false) genre: String?,
        @RequestParam(required = false) type: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") pageSize: Int
    ): ResponseEntity<Page<Book>> {
        val results = bookService.searchBooks(title, genre, type, page, pageSize)
        return ResponseEntity.ok(results)
    }

    @GetMapping("/{id}")
    fun getBook(@PathVariable id: Long): ResponseEntity<Book> {
        val book = bookService.getBookById(id) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(book)
    }

    @PostMapping("/{id}/tag")
    fun updateBookTag(
        @PathVariable id: Long,
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
}
