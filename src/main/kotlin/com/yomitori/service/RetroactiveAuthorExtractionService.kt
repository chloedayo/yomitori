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

        allBooks.chunked(100).forEach { bookChunk ->
            transactionTemplate.executeWithoutResult { _ ->
                val bookAuthorsToSave = mutableListOf<BookAuthor>()
                for (book in bookChunk) {
                    try {
                        val authorNames = authorExtractionService.extractAuthors(book.filepath)
                        val authors = authorNames.map { authorName ->
                            authorRepository.findByNameIgnoreCase(authorName)
                                ?: authorRepository.save(Author(name = authorName))
                        }
                        bookAuthorRepository.deleteByBookId(book.id)
                        authors.forEach { bookAuthorsToSave.add(BookAuthor(book = book, author = it)) }
                        successCount++
                    } catch (e: Exception) {
                        errorCount++
                    }
                }
                if (bookAuthorsToSave.isNotEmpty()) bookAuthorRepository.saveAll(bookAuthorsToSave)
            }
        }

        logger.info(
            "Author extraction done — processed: {}, errors: {} (authors: {}, links: {})",
            successCount, errorCount, authorRepository.count(), bookAuthorRepository.count()
        )
    }
}
