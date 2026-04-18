package com.yomitori.service

import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
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
        val pageable: Pageable = PageRequest.of(page, pageSize)
        val results = if (genre != null || type != null) {
            repository.searchByTitleGenreType(title, genre, type, pageable)
        } else {
            repository.searchByTitle(title, pageable)
        }

        logger.info("Search returned {} results, checking for covers to extract", results.content.size)

        val pendingBooks = results.content
            .filter { it.coverPath == null }

        if (pendingBooks.isNotEmpty()) {
            logger.info("Found {} books without covers, triggering async extraction", pendingBooks.size)
            pendingBooks.forEach {
                logger.debug("Async extracting cover for: {} ({})", it.title, it.id)
                coverExtractor.extractCoverAsync(it.filepath, it.id)
            }
        }

        return results
    }

    fun searchByIds(bookIds: List<String>, page: Int, pageSize: Int): Pair<Page<Book>, List<String>> {
        val validIds = bookIds.filter { it.isNotBlank() }
        if (validIds.isEmpty()) {
            return Pair(PageImpl(emptyList(), PageRequest.of(page, pageSize), 0), bookIds)
        }

        val foundBooks = repository.findAllById(validIds)
        val foundIds = foundBooks.map { it.id }.toSet()
        val missingIds = validIds.filter { it !in foundIds }

        val sorted = foundBooks.sortedBy { it.title }
        val start = page * pageSize
        val end = minOf(start + pageSize, sorted.size)

        val paginatedContent = if (start < sorted.size) sorted.subList(start, end) else emptyList()
        val pageable = PageRequest.of(page, pageSize)
        val pageImpl = PageImpl(paginatedContent, pageable, sorted.size.toLong())

        return Pair(pageImpl, missingIds)
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
