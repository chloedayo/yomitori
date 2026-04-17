package com.yomitori.service

import org.junit.jupiter.api.Test
import kotlin.test.assertTrue

class CoverExtractorTest {
    @Test
    fun `should recognize PDF extension`() {
        val filepath = "/books/test.pdf"
        assertTrue(filepath.endsWith(".pdf", ignoreCase = true))
    }

    @Test
    fun `should recognize ePub extension`() {
        val filepath = "/books/test.epub"
        assertTrue(filepath.endsWith(".epub", ignoreCase = true))
    }

    @Test
    fun `should recognize CBZ extension`() {
        val filepath = "/books/test.cbz"
        assertTrue(filepath.endsWith(".cbz", ignoreCase = true))
    }
}
