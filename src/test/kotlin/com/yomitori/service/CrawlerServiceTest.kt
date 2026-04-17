package com.yomitori.service

import com.yomitori.config.CrawlerConfig
import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import java.time.LocalDateTime

class CrawlerServiceTest {
    private lateinit var crawlerService: CrawlerService
    private lateinit var mockRepository: BookRepository
    private lateinit var mockScanner: FileSystemScanner
    private lateinit var mockExtractor: MetadataExtractor
    private lateinit var mockCoverExtractor: CoverExtractor
    private lateinit var mockConfig: CrawlerConfig

    @BeforeEach
    fun setup() {
        mockRepository = mock()
        mockScanner = mock()
        mockExtractor = mock()
        mockCoverExtractor = mock()
        mockConfig = mock {
            on { enabled } doReturn true
            on { booksPath } doReturn "/books"
            on { batchSize } doReturn 100
        }

        crawlerService = CrawlerService(
            mockConfig,
            mockRepository,
            mockScanner,
            mockExtractor,
            mockCoverExtractor
        )
    }

    @Test
    fun `should index new files from filesystem scan`() {
        val fileInfo = FileInfo("/books/test.pdf", LocalDateTime.now())
        val metadata = ExtractedMetadata("Test Book", "novel", "fiction", "pdf")

        whenever(mockScanner.scanDirectory("/books")).thenReturn(listOf(fileInfo))
        whenever(mockRepository.findByFilepath("/books/test.pdf")).thenReturn(null)
        whenever(mockExtractor.extract("/books/test.pdf")).thenReturn(metadata)
        whenever(mockCoverExtractor.extractCover("/books/test.pdf", null)).thenReturn("/covers/test.jpg")
        whenever(mockRepository.findAll()).thenReturn(emptyList())

        crawlerService.runCrawler()

        verify(mockRepository).save(any<Book>())
    }

    @Test
    fun `should mark deleted files as soft-deleted`() {
        val book = Book(
            id = "1",
            filepath = "/books/deleted.pdf",
            filename = "deleted.pdf",
            title = "Deleted Book",
            type = "novel",
            coverExtractionStatus = com.yomitori.model.CoverExtractionStatus.PENDING,
            fileFormat = "pdf"
        )

        whenever(mockScanner.scanDirectory("/books")).thenReturn(emptyList())
        whenever(mockRepository.findAll()).thenReturn(listOf(book))

        crawlerService.runCrawler()

        verify(mockRepository).save(argThat {
            isDeleted == true
        })
    }
}
