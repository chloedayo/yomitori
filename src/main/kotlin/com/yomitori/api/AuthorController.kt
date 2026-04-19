package com.yomitori.api

import com.yomitori.dto.AuthorWithBooks
import com.yomitori.model.Author
import com.yomitori.repository.AuthorRepository
import com.yomitori.repository.BookAuthorRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/authors")
class AuthorController(
    private val authorRepository: AuthorRepository,
    private val bookAuthorRepository: BookAuthorRepository
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

    @GetMapping("/{id}")
    fun getAuthorWithBooks(@PathVariable id: String): ResponseEntity<AuthorWithBooks> {
        val author = authorRepository.findById(id)
        if (author.isEmpty) {
            return ResponseEntity.notFound().build()
        }
        val bookAuthors = bookAuthorRepository.findByAuthorId(id)
        val books = bookAuthors.map { it.book }
        return ResponseEntity.ok(AuthorWithBooks.from(author.get(), books))
    }

    @GetMapping
    fun listAuthors(
        @RequestParam(defaultValue = "") query: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "50") pageSize: Int
    ): ResponseEntity<Page<Author>> {
        val pageable: Pageable = PageRequest.of(page, pageSize)
        val results = if (query.isEmpty()) {
            authorRepository.findAllByOrderByNameAsc(pageable)
        } else {
            val allMatches = authorRepository.findByNameContainingIgnoreCase(query)
            val sorted = allMatches.sortedBy { it.name }
            val start = page * pageSize
            val end = minOf(start + pageSize, sorted.size)
            val paginatedContent = if (start < sorted.size) sorted.subList(start, end) else emptyList()
            org.springframework.data.domain.PageImpl(paginatedContent, pageable, sorted.size.toLong())
        }
        return ResponseEntity.ok(results)
    }
}
