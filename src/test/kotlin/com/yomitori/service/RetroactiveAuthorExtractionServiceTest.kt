package com.yomitori.service

import com.yomitori.model.Author
import com.yomitori.model.Book
import com.yomitori.repository.AuthorRepository
import com.yomitori.repository.BookAuthorRepository
import com.yomitori.repository.BookRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest
class RetroactiveAuthorExtractionServiceTest {
    @Autowired
    private lateinit var retroactiveService: RetroactiveAuthorExtractionService

    @Autowired
    private lateinit var bookRepository: BookRepository

    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Autowired
    private lateinit var bookAuthorRepository: BookAuthorRepository

    @Test
    fun testExtractAuthorsForAllBooks() {
        // Setup books without authors
        val book1 = bookRepository.save(Book(filepath = "/test1.epub", filename = "test1.epub", title = "Book 1", fileFormat = "epub", type = "novel"))
        val book2 = bookRepository.save(Book(filepath = "/test2.cbz", filename = "[AuthorName] - Title.cbz", title = "Book 2", fileFormat = "cbz", type = "manga"))

        retroactiveService.extractAuthorsForAllBooks()

        val authors = authorRepository.findAll()
        assertTrue(authors.isNotEmpty())
    }
}
