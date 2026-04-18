package com.yomitori.service

import com.yomitori.model.Author
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
    private val authorExtractionService: AuthorExtractionService
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
                        ?: authorRepository.save(Author(name = authorName))
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
