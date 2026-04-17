package com.yomitori.service

import com.yomitori.config.CrawlerConfig
import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDateTime

@Service
class CrawlerService(
    private val config: CrawlerConfig,
    private val repository: BookRepository,
    private val fileSystemScanner: FileSystemScanner,
    private val metadataExtractor: MetadataExtractor,
    private val coverExtractor: CoverExtractor
) {
    private val logger = LoggerFactory.getLogger(CrawlerService::class.java)
    private var isRunning = false

    @Scheduled(cron = "\${yomitori.crawler.schedule:0 0 * * * ?}")
    fun runCrawler() {
        if (!config.enabled) {
            logger.debug("Crawler disabled, skipping")
            return
        }
        if (isRunning) {
            logger.warn("Crawler already running, skipping...")
            return
        }

        isRunning = true
        try {
            val startTime = System.currentTimeMillis()
            logger.info("Crawler started")

            val scannedFiles = fileSystemScanner.scanDirectory(config.booksPath)
            logger.info("Scanned {} files from {}", scannedFiles.size, config.booksPath)
            val scannedPaths = scannedFiles.map { it.filepath }.toSet()

            var indexedCount = 0
            var updatedCount = 0
            scannedFiles.chunked(config.batchSize).forEach { batch ->
                batch.forEach { fileInfo ->
                    val existing = repository.findByFilepath(fileInfo.filepath)

                    if (existing == null) {
                        indexedCount++
                        indexNewFile(fileInfo.filepath)
                    } else if (fileInfo.lastModified.isAfter(existing.lastIndexed)) {
                        updatedCount++
                        updateExistingFile(existing, fileInfo.filepath)
                    }
                }
            }
            logger.info("Indexed {} new files, updated {} existing files", indexedCount, updatedCount)

            val allBooks = repository.findAll()
            var deletedCount = 0
            allBooks.forEach { book ->
                if (book.filepath !in scannedPaths && !book.isDeleted) {
                    deletedCount++
                    repository.save(book.copy(isDeleted = true, updatedAt = LocalDateTime.now()))
                }
            }
            if (deletedCount > 0) {
                logger.info("Marked {} books as deleted", deletedCount)
            }

            val elapsed = (System.currentTimeMillis() - startTime) / 1000
            logger.info("Crawler completed in {}s", elapsed)
        } finally {
            isRunning = false
        }
    }

    private fun indexNewFile(filepath: String) {
        try {
            val metadata = metadataExtractor.extract(filepath)

            val book = Book(
                filepath = filepath,
                filename = filepath.substringAfterLast('/'),
                title = metadata.title,
                genre = metadata.genre,
                type = metadata.type,
                fileFormat = metadata.fileFormat,
                lastIndexed = LocalDateTime.now()
            )

            repository.save(book)
            logger.debug("Indexed new book: {} ({})", book.title, book.id)
            coverExtractor.extractCover(filepath, book.id)
        } catch (e: Exception) {
            logger.warn("Failed to index file {}: {}", filepath, e.message)
        }
    }

    private fun updateExistingFile(existing: Book, filepath: String) {
        try {
            if (existing.manualOverride) {
                repository.save(existing.copy(lastIndexed = LocalDateTime.now()))
                logger.debug("Skipped update for manually overridden book: {}", existing.title)
                return
            }

            val metadata = metadataExtractor.extract(filepath)
            val coverPath = coverExtractor.extractCover(filepath, existing.id)

            val updated = existing.copy(
                title = metadata.title,
                genre = metadata.genre,
                type = metadata.type,
                coverPath = coverPath ?: existing.coverPath,
                lastIndexed = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            )

            repository.save(updated)
            logger.debug("Updated book: {} ({})", updated.title, updated.id)
        } catch (e: Exception) {
            logger.warn("Failed to update file {}: {}", filepath, e.message)
        }
    }

    fun manualTriggerCrawl() {
        runCrawler()
    }
}
