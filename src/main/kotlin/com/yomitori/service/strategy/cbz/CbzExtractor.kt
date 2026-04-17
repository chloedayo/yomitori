package com.yomitori.service.strategy.cbz

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File
import java.util.zip.ZipFile
import javax.imageio.ImageIO

@Service
class CbzExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(CbzExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".cbz", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            val zipFile = ZipFile(File(filepath))
            val entries = zipFile.entries()
            val firstImage = entries.asSequence()
                .filter { !it.isDirectory && (it.name.endsWith(".jpg", ignoreCase = true) || it.name.endsWith(".png", ignoreCase = true)) }
                .sortedBy { it.name }
                .firstOrNull()

            if (firstImage == null) {
                zipFile.close()
                return null
            }

            val image = zipFile.getInputStream(firstImage).use { ImageIO.read(it) }
            zipFile.close()

            logger.debug("Extracted cover from CBZ: {}", firstImage.name)
            image
        } catch (e: Exception) {
            logger.warn("CBZ extraction failed for {}: {}", filepath, e.message)
            null
        }
    }
}
