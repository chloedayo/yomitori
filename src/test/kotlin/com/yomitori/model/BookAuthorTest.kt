package com.yomitori.model

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class BookAuthorTest {
    @Test
    fun testBookAuthorCreation() {
        val book = Book(filepath = "/test/book.epub", filename = "test.epub", title = "Test", fileFormat = "epub", type = "novel")
        val author = Author(name = "Test Author")
        val bookAuthor = BookAuthor(book = book, author = author)

        assertNotNull(bookAuthor.book)
        assertNotNull(bookAuthor.author)
        assertEquals("Test Author", bookAuthor.author.name)
    }
}
