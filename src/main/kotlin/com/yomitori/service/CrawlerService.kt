package com.yomitori.service

import com.yomitori.config.CrawlerConfig
import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
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

    fun runCrawler() {
        if (isRunning) {
            logger.warn("Crawler already running, skipping...")
            return
        }

        isRunning = true
        try {
            val startTime = System.currentTimeMillis()

            val scannedFiles = fileSystemScanner.scanDirectory(config.booksPath)
            val scannedPaths = scannedFiles.map { it.filepath }.toSet()

            var indexedCount = 0
            var updatedCount = 0
            var errorCount = 0
            scannedFiles.chunked(config.batchSize).forEach { batch ->
                batch.forEach { fileInfo ->
                    val existing = repository.findByFilepath(fileInfo.filepath)
                    if (existing == null) {
                        if (indexNewFile(fileInfo.filepath)) indexedCount++ else errorCount++
                    } else if (fileInfo.lastModified.isAfter(existing.lastIndexed)) {
                        if (updateExistingFile(existing, fileInfo.filepath)) updatedCount++ else errorCount++
                    }
                }
            }

            val allBooks = repository.findAll()
            var deletedCount = 0
            allBooks.forEach { book ->
                if (book.filepath !in scannedPaths && !book.isDeleted) {
                    deletedCount++
                    repository.save(book.copy(isDeleted = true, updatedAt = LocalDateTime.now()))
                }
            }

            val elapsed = (System.currentTimeMillis() - startTime) / 1000
            logger.info(
                "Crawler done in {}s — scanned: {}, indexed: {}, updated: {}, deleted: {}, errors: {}",
                elapsed, scannedFiles.size, indexedCount, updatedCount, deletedCount, errorCount
            )
        } finally {
            isRunning = false
        }
    }

    private fun indexNewFile(filepath: String): Boolean {
        return try {
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
            coverExtractor.extractCover(filepath, book.id)
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun updateExistingFile(existing: Book, filepath: String): Boolean {
        return try {
            if (existing.manualOverride) {
                repository.save(existing.copy(lastIndexed = LocalDateTime.now()))
                return true
            }
            val metadata = metadataExtractor.extract(filepath)
            val coverPath = coverExtractor.extractCover(filepath, existing.id)
            repository.save(existing.copy(
                title = metadata.title,
                genre = metadata.genre,
                type = metadata.type,
                coverPath = coverPath ?: existing.coverPath,
                lastIndexed = LocalDateTime.now(),
                updatedAt = LocalDateTime.now()
            ))
            true
        } catch (e: Exception) {
            false
        }
    }

    fun manualTriggerCrawl() {
        runCrawler()
    }
}
