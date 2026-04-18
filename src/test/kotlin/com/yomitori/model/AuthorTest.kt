package com.yomitori.model

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class AuthorTest {
    @Test
    fun testAuthorCreation() {
        val author = Author(name = "J.K. Rowling")
        assertEquals("J.K. Rowling", author.name)
        assertNotNull(author.id)
        assertNotNull(author.createdAt)
    }
}
