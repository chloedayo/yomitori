package com.yomitori.service

import com.yomitori.model.Book
import com.yomitori.model.CoverExtractionStatus
import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class BookService(
    private val repository: BookRepository,
    private val coverExtractor: CoverExtractor
) {
    private val logger = LoggerFactory.getLogger(BookService::class.java)
    fun searchBooks(
        title: String = "",
        genre: String? = null,
        type: String? = null,
        page: Int = 0,
        pageSize: Int = 20
    ): Page<Book> {
        println("DEBUG: searchBooks called with title=$title")
        val pageable: Pageable = PageRequest.of(page, pageSize)
        val results = if (genre != null || type != null) {
            repository.searchByTitleGenreType(title, genre, type, pageable)
        } else {
            repository.searchByTitle(title, pageable)
        }

        println("DEBUG: Search returned ${results.content.size} results")
        logger.info("Search returned {} results, checking for covers to extract", results.content.size)

        val pendingBooks = results.content
            .filter { it.coverExtractionStatus == CoverExtractionStatus.PENDING || it.coverExtractionStatus == null }

        println("DEBUG: Found ${pendingBooks.size} pending books out of ${results.content.size}")
        if (pendingBooks.isNotEmpty()) {
            println("DEBUG: Triggering async extraction for ${pendingBooks.size} books")
            logger.info("Found {} books with PENDING cover extraction, triggering async extraction", pendingBooks.size)
            pendingBooks.forEach {
                logger.debug("Async extracting cover for: {} ({})", it.title, it.id)
                coverExtractor.extractCoverAsync(it.filepath, it.id)
            }
        } else {
            logger.debug("No PENDING covers to extract in search results")
        }

        return results
    }

    fun getBookById(id: String): Book? {
        return repository.findById(id).orElse(null)
    }

    fun getAllGenres(): List<String> {
        return repository.findAllGenres()
    }

    fun getAllTypes(): List<String> {
        return repository.findAllTypes()
    }

    fun updateBookTag(id: String, genre: String?, type: String?): Book? {
        val book = repository.findById(id).orElse(null) ?: return null
        val updated = book.copy(
            genre = genre ?: book.genre,
            type = type ?: book.type,
            manualOverride = true,
            updatedAt = LocalDateTime.now()
        )
        return repository.save(updated)
    }

    fun getStats(): Map<String, Any> {
        val allBooks = repository.findAll()
        val total = allBooks.size
        val deleted = allBooks.count { it.isDeleted }
        val active = total - deleted

        return mapOf(
            "total" to total,
            "active" to active,
            "deleted" to deleted,
            "genres" to getAllGenres().size,
            "types" to getAllTypes().size
        )
    }
}
