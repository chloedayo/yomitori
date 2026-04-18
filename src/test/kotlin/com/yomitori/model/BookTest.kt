package com.yomitori.model

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class BookTest {
    @Test
    fun testBookWithAuthors() {
        val book = Book(filepath = "/test/book.epub", filename = "test.epub", title = "Test", fileFormat = "epub", type = "novel")
        val author1 = Author(name = "Author One")
        val author2 = Author(name = "Author Two")

        book.authors = listOf(author1, author2)

        assertEquals(2, book.authors.size)
        assertTrue(book.authors.any { it.name == "Author One" })
        assertTrue(book.authors.any { it.name == "Author Two" })
    }
}
