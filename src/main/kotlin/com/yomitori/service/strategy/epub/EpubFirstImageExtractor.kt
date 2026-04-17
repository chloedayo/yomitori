package com.yomitori.service.strategy.epub

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File
import java.util.zip.ZipFile
import javax.imageio.ImageIO

@Service
class EpubFirstImageExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(EpubFirstImageExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".epub", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            val zipFile = ZipFile(File(filepath))

            val imageEntry = zipFile.entries()
                .asSequence()
                .filter {
                    !it.isDirectory && (
                        it.name.endsWith(".jpg", ignoreCase = true) ||
                        it.name.endsWith(".png", ignoreCase = true) ||
                        it.name.endsWith(".jpeg", ignoreCase = true) ||
                        it.name.endsWith(".gif", ignoreCase = true)
                    )
                }
                .sortedBy { it.name }
                .firstOrNull()

            if (imageEntry == null) {
                zipFile.close()
                return null
            }

            val image = zipFile.getInputStream(imageEntry).use { ImageIO.read(it) }
            zipFile.close()

            logger.debug("Extracted first image from EPUB: {}", imageEntry.name)
            image
        } catch (e: Exception) {
            logger.warn("EPUB first-image extraction failed for {}: {}", filepath, e.message)
            null
        }
    }
}
