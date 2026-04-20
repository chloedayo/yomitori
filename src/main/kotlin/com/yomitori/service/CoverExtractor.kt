package com.yomitori.service

import com.yomitori.repository.BookRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Paths

@Service
class CoverExtractor(
    @Value("\${yomitori.crawler.covers-path}")
    private val coversPath: String,
    private val fileTypeRouter: FileTypeRouter,
    private val coverImageSaver: CoverImageSaver,
    private val bookRepository: BookRepository?
) {
    private val logger = LoggerFactory.getLogger(CoverExtractor::class.java)

    init {
        Files.createDirectories(Paths.get(coversPath))
    }

    fun extractCover(filepath: String, bookId: String?): String? {
        return try {
            if (bookId != null && bookRepository != null) {
                val book = bookRepository.findById(bookId).orElse(null)
                if (book != null && book.coverPath != null) return book.coverPath
            }

            val strategies = fileTypeRouter.route(filepath)
            if (strategies.isEmpty()) return null

            for (strategy in strategies) {
                try {
                    val image = strategy.extract(filepath) ?: continue
                    val filename = generateFilename(filepath, bookId)
                    val savedPath = coverImageSaver.save(image, filename)
                    saveCoverPath(bookId, savedPath)
                    return savedPath
                } catch (e: Exception) {
                    continue
                }
            }
            null
        } catch (e: Exception) {
            logger.error("Cover extraction failed for {}: {}", filepath, e.message)
            null
        }
    }

    private fun generateFilename(filepath: String, bookId: String?): String {
        val baseFilename = filepath.substringAfterLast('/').substringBeforeLast('.')
        val id = bookId ?: System.nanoTime()
        val filename = "${baseFilename}_${id}.jpg"
        return if (filename.length > 255) "${baseFilename.take(200)}_${id}.jpg" else filename
    }

    private fun saveCoverPath(bookId: String?, coverPath: String) {
        if (bookId == null || bookRepository == null) return
        try {
            val book = bookRepository.findById(bookId).orElse(null) ?: return
            bookRepository.save(book.copy(
                coverPath = coverPath,
                updatedAt = java.time.LocalDateTime.now()
            ))
        } catch (e: Exception) {
            logger.error("Failed to save cover path for book {}: {}", bookId, e.message)
        }
    }

    @Async
    fun extractCoverAsync(filepath: String, bookId: String) {
        extractCover(filepath, bookId)
    }
}
