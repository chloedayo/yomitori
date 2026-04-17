package com.yomitori.service.strategy.pdf

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.pdmodel.graphics.PDXObject
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File

@Service
class PdfMetadataExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(PdfMetadataExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".pdf", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            val document = PDDocument.load(File(filepath))
            val result = findCoverImageInMetadata(document)
            document.close()
            result
        } catch (e: Exception) {
            logger.warn("PDF metadata extraction failed for {}: {}", filepath, e.message)
            null
        }
    }

    private fun findCoverImageInMetadata(document: PDDocument): BufferedImage? {
        return try {
            val catalog = document.documentCatalog
            if (document.numberOfPages == 0) return null

            val page = document.getPage(0)
            val resources = page.resources ?: return null
            val xobjects = resources.xobjects ?: return null

            xobjects.values
                .filterIsInstance<PDImageXObject>()
                .firstOrNull()
                ?.image
                ?.also { logger.debug("Found embedded cover image in PDF metadata") }
        } catch (e: Exception) {
            logger.debug("Could not extract metadata images: {}", e.message)
            null
        }
    }
}
