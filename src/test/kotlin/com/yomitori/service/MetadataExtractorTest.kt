package com.yomitori.service

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import kotlin.test.assertEquals
import kotlin.test.assertNull

class MetadataExtractorTest {
    private lateinit var extractor: MetadataExtractor
    private lateinit var authorExtractionService: AuthorExtractionService

    @BeforeEach
    fun setup() {
        authorExtractionService = AuthorExtractionService()
        extractor = MetadataExtractor(authorExtractionService)
    }

    @Test
    fun `should extract title from plain filename`() {
        val metadata = extractor.extract("/books/ご注文はうさぎですか.epub")
        assertEquals("ご注文はうさぎですか", metadata.title)
        assertEquals("epub", metadata.fileFormat)
    }

    @Test
    fun `should remove brackets from title`() {
        val metadata = extractor.extract("/books/[SubGroup] Title Name.epub")
        assertEquals("Title Name", metadata.title)
    }

    @Test
    fun `should detect type from directory`() {
        val metadata = extractor.extract("/books/PeepoHappyBooks/manga.epub")
        assertEquals("manga", metadata.type)
    }

    @Test
    fun `should detect light-novel from TMW collection`() {
        val metadata = extractor.extract("/books/TMW eBook Collection Pt. 1/book.epub")
        assertEquals("light-novel", metadata.type)
    }

    @Test
    fun `should default to other type`() {
        val metadata = extractor.extract("/books/random_book.epub")
        assertEquals("other", metadata.type)
    }

    @Test
    fun `should infer genre from type`() {
        val metadata = extractor.extract("/books/PeepoHappyBooks/book.epub")
        assertEquals("manga", metadata.genre)
    }

    @Test
    fun `should recognize PDF format`() {
        val metadata = extractor.extract("/books/book.pdf")
        assertEquals("pdf", metadata.fileFormat)
    }

    @Test
    fun `should recognize CBR format`() {
        val metadata = extractor.extract("/books/book.cbr")
        assertEquals("cbr", metadata.fileFormat)
    }
}
