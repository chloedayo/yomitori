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
        coverImageSaver.setCoversPath(coversPath)
    }

    fun extractCover(filepath: String, bookId: String?): String? {
        return try {
            if (bookId != null && bookRepository != null) {
                val book = bookRepository.findById(bookId).orElse(null)
                if (book != null && book.coverPath != null) {
                    logger.debug("Cover already exists for book {}, skipping extraction", bookId)
                    return book.coverPath
                }
            }

            val strategies = fileTypeRouter.route(filepath)
            if (strategies.isEmpty()) {
                logger.debug("No extraction strategies available for {}", filepath)
                return null
            }

            for (strategy in strategies) {
                try {
                    val image = strategy.extract(filepath) ?: continue

                    val filename = generateFilename(filepath, bookId)
                    val savedPath = coverImageSaver.save(image, filename)

                    logger.info("Cover extracted and saved for {}: {}", filepath, savedPath)
                    saveCoverPath(bookId, savedPath)

                    return savedPath
                } catch (e: Exception) {
                    logger.debug("Strategy {} failed for {}: {}", strategy.javaClass.simpleName, filepath, e.message)
                    continue
                }
            }

            logger.warn("All extraction strategies failed for {}", filepath)
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
        return if (filename.length > 255) {
            val maxBase = 200
            val truncated = baseFilename.take(maxBase)
            "${truncated}_${id}.jpg"
        } else {
            filename
        }
    }

    private fun saveCoverPath(bookId: String?, coverPath: String) {
        if (bookId == null || bookRepository == null) return

        try {
            val book = bookRepository.findById(bookId).orElse(null) ?: return
            val updated = book.copy(
                coverPath = coverPath,
                updatedAt = java.time.LocalDateTime.now()
            )
            bookRepository.save(updated)
            logger.debug("Saved cover path for book {}: {}", bookId, coverPath)
        } catch (e: Exception) {
            logger.warn("Failed to save cover path for book {}: {}", bookId, e.message)
        }
    }

    @Async
    fun extractCoverAsync(filepath: String, bookId: String) {
        logger.info("Async extraction started for book {}", bookId)
        val result = extractCover(filepath, bookId)
        if (result != null) {
            logger.info("Async extraction succeeded for book {}: {}", bookId, result)
        } else {
            logger.warn("Async extraction returned no cover for book {}", bookId)
        }
    }
}
