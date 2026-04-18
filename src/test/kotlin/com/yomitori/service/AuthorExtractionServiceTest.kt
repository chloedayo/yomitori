package com.yomitori.service

import org.junit.jupiter.api.Test
import kotlin.test.assertTrue

class AuthorExtractionServiceTest {
    private val service = AuthorExtractionService()

    @Test
    fun testExtractAuthorsFromEpubPath() {
        val filepath = "/books/manga/[AuthorName] - Title.epub"
        val authors = service.extractAuthors(filepath)
        assertTrue(authors.isNotEmpty())
    }

    @Test
    fun testFallbackToUnknownAuthor() {
        val filepath = "/books/unknown_book.epub"
        val authors = service.extractAuthors(filepath)
        assertTrue(authors.isNotEmpty())
        assertTrue(authors.any { it == "Unknown Author" })
    }
}
