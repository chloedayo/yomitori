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
import org.springframework.transaction.support.TransactionTemplate

@Service
class RetroactiveAuthorExtractionService(
    private val bookRepository: BookRepository,
    private val authorRepository: AuthorRepository,
    private val bookAuthorRepository: BookAuthorRepository,
    private val authorExtractionService: AuthorExtractionService,
    private val transactionTemplate: TransactionTemplate
) {
    private val logger = LoggerFactory.getLogger(RetroactiveAuthorExtractionService::class.java)

    fun extractAuthorsForAllBooks() {
        val allBooks = bookRepository.findAll()
        var successCount = 0
        var errorCount = 0
        val COMMIT_BATCH = 100

        logger.info("Starting retroactive author extraction for ${allBooks.size} books")

        allBooks.chunked(COMMIT_BATCH).forEach { bookChunk ->
            transactionTemplate.executeWithoutResult { _ ->
                val bookAuthorsToSave = mutableListOf<BookAuthor>()

                for (book in bookChunk) {
                    try {
                        logger.debug("Processing book ${book.id}: ${book.filepath}")

                        val authorNames = authorExtractionService.extractAuthors(book.filepath)
                        logger.debug("Extracted ${authorNames.size} authors: $authorNames")

                        // Create or find authors (save immediately)
                        val authors = authorNames.map { authorName ->
                            logger.debug("Finding or creating author: $authorName")
                            val existing = authorRepository.findByNameIgnoreCase(authorName)
                            if (existing != null) {
                                logger.debug("Found existing author: ${existing.id}")
                                existing
                            } else {
                                val newAuthor = authorRepository.save(Author(name = authorName))
                                logger.debug("Created new author: ${newAuthor.id} - $authorName")
                                newAuthor
                            }
                        }

                        // Link book to authors (clear existing first)
                        logger.debug("Deleting existing book_authors for book ${book.id}")
                        bookAuthorRepository.deleteByBookId(book.id)
                        logger.debug("Adding ${authors.size} book_author links")
                        authors.forEach { author ->
                            bookAuthorsToSave.add(BookAuthor(book = book, author = author))
                        }

                        successCount++
                    } catch (e: Exception) {
                        errorCount++
                        logger.warn("Failed to extract authors for book ${book.id} (${book.filepath}): ${e.message}", e)
                    }
                }

                // Flush all book_authors for this chunk
                if (bookAuthorsToSave.isNotEmpty()) {
                    bookAuthorRepository.saveAll(bookAuthorsToSave)
                    logger.info("Committed batch: $successCount books processed (authors: ${authorRepository.count()}, book_authors: ${bookAuthorRepository.count()})")
                }
            }
        }

        logger.info("Retroactive extraction complete: $successCount success, $errorCount errors (authors: ${authorRepository.count()}, book_authors: ${bookAuthorRepository.count()})")
    }
}
