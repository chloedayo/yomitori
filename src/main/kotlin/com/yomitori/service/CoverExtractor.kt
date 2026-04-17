package com.yomitori.service

import com.yomitori.model.CoverExtractionStatus
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
                if (book != null) {
                    when (book.coverExtractionStatus) {
                        CoverExtractionStatus.FOUND -> {
                            logger.debug("Cover already found for book {}, skipping extraction", bookId)
                            return book.coverPath
                        }
                        CoverExtractionStatus.NOT_FOUND -> {
                            logger.debug("Cover extraction previously failed for book {}, skipping retry", bookId)
                            return null
                        }
                        CoverExtractionStatus.PENDING, null -> {}
                    }
                }
            }

            val strategies = fileTypeRouter.route(filepath)
            if (strategies.isEmpty()) {
                logger.debug("No extraction strategies available for {}", filepath)
                markExtractionAttempted(bookId, CoverExtractionStatus.NOT_FOUND)
                return null
            }

            for (strategy in strategies) {
                try {
                    val image = strategy.extract(filepath) ?: continue

                    val filename = generateFilename(filepath, bookId)
                    val savedPath = coverImageSaver.save(image, filename)

                    logger.info("Cover extracted and saved for {}: {}", filepath, savedPath)
                    markExtractionAttempted(bookId, CoverExtractionStatus.FOUND, savedPath)

                    return savedPath
                } catch (e: Exception) {
                    logger.debug("Strategy {} failed for {}: {}", strategy.javaClass.simpleName, filepath, e.message)
                    continue
                }
            }

            logger.warn("All extraction strategies failed for {}", filepath)
            markExtractionAttempted(bookId, CoverExtractionStatus.NOT_FOUND)
            null
        } catch (e: Exception) {
            logger.error("Cover extraction failed for {}: {}", filepath, e.message)
            markExtractionAttempted(bookId, CoverExtractionStatus.NOT_FOUND)
            null
        }
    }

    private fun generateFilename(filepath: String, bookId: String?): String {
        val baseFilename = filepath.substringAfterLast('/').substringBeforeLast('.')
        val id = bookId ?: System.nanoTime()
        return "${baseFilename}_${id}.jpg"
    }

    private fun markExtractionAttempted(bookId: String?, status: CoverExtractionStatus, coverPath: String? = null) {
        if (bookId == null || bookRepository == null) return

        try {
            val book = bookRepository.findById(bookId).orElse(null) ?: return
            println("DEBUG: Updating book $bookId with status=$status, coverPath=$coverPath")
            val updated = book.copy(
                coverExtractionStatus = status,
                coverPath = coverPath ?: book.coverPath,
                updatedAt = java.time.LocalDateTime.now()
            )
            println("DEBUG: Updated object - status=${updated.coverExtractionStatus}, coverPath=${updated.coverPath}")
            val saved = bookRepository.save(updated)
            println("DEBUG: Saved book - id=${saved.id}, status=${saved.coverExtractionStatus}")
            logger.debug("Updated extraction status for book {} to {}", bookId, status)
        } catch (e: Exception) {
            println("DEBUG: Error updating book $bookId: ${e.message}")
            e.printStackTrace()
            logger.warn("Failed to update extraction status for book {}: {}", bookId, e.message)
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
