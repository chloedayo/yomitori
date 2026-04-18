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
