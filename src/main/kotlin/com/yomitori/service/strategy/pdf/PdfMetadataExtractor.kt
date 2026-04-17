package com.yomitori.service.strategy.pdf

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage

@Service
class PdfMetadataExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(PdfMetadataExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".pdf", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            logger.debug("PDF metadata extraction not yet implemented, deferring to first-page extraction")
            null
        } catch (e: Exception) {
            logger.warn("PDF metadata extraction failed for {}: {}", filepath, e.message)
            null
        }
    }
}
