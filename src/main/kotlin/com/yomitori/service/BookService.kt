package com.yomitori.service

import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class BookService(
    private val repository: BookRepository
) {
    fun searchBooks(
        title: String = "",
        genre: String? = null,
        type: String? = null,
        page: Int = 0,
        pageSize: Int = 20
    ): Page<Book> {
        val pageable: Pageable = PageRequest.of(page, pageSize)
        return if (genre != null || type != null) {
            repository.searchByTitleGenreType(title, genre, type, pageable)
        } else {
            repository.searchByTitle(title, pageable)
        }
    }

    fun getBookById(id: Long): Book? {
        return repository.findById(id).orElse(null)
    }

    fun getAllGenres(): List<String> {
        return repository.findAllGenres()
    }

    fun getAllTypes(): List<String> {
        return repository.findAllTypes()
    }

    fun updateBookTag(id: Long, genre: String?, type: String?): Book? {
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
