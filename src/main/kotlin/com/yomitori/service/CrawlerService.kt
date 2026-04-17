package com.yomitori.service

import com.yomitori.config.CrawlerConfig
import com.yomitori.model.Book
import com.yomitori.repository.BookRepository
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
    private var isRunning = false

    @Scheduled(cron = "\${yomitori.crawler.schedule:0 0 * * * ?}")
    fun runCrawler() {
        if (!config.enabled) return
        if (isRunning) {
            println("Crawler already running, skipping...")
            return
        }

        isRunning = true
        try {
            val startTime = System.currentTimeMillis()
            println("Crawler started at ${LocalDateTime.now()}")

            val scannedFiles = fileSystemScanner.scanDirectory(config.booksPath)
            val scannedPaths = scannedFiles.map { it.filepath }.toSet()

            scannedFiles.chunked(config.batchSize).forEach { batch ->
                batch.forEach { fileInfo ->
                    val existing = repository.findByFilepath(fileInfo.filepath)

                    if (existing == null) {
                        indexNewFile(fileInfo.filepath)
                    } else if (fileInfo.lastModified.isAfter(existing.lastIndexed)) {
                        updateExistingFile(existing, fileInfo.filepath)
                    }
                }
            }

            val allBooks = repository.findAll()
            allBooks.forEach { book ->
                if (book.filepath !in scannedPaths && !book.isDeleted) {
                    repository.save(book.copy(isDeleted = true, updatedAt = LocalDateTime.now()))
                }
            }

            val elapsed = (System.currentTimeMillis() - startTime) / 1000
            println("Crawler completed in ${elapsed}s at ${LocalDateTime.now()}")
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
                coverExtractionStatus = com.yomitori.model.CoverExtractionStatus.PENDING,
                fileFormat = metadata.fileFormat,
                lastIndexed = LocalDateTime.now()
            )

            repository.save(book)
            coverExtractor.extractCover(filepath, book.id)
            println("Indexed new: ${book.title}")
        } catch (e: Exception) {
            println("Error indexing $filepath: ${e.message}")
        }
    }

    private fun updateExistingFile(existing: Book, filepath: String) {
        try {
            if (existing.manualOverride) {
                repository.save(existing.copy(lastIndexed = LocalDateTime.now()))
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
            println("Updated: ${updated.title}")
        } catch (e: Exception) {
            println("Error updating $filepath: ${e.message}")
        }
    }

    fun manualTriggerCrawl() {
        runCrawler()
    }
}
