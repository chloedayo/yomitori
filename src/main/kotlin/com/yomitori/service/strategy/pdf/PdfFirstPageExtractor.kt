package com.yomitori.service.strategy.pdf

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.apache.pdfbox.pdmodel.PDDocument
import org.apache.pdfbox.rendering.PDFRenderer
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File

@Service
class PdfFirstPageExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(PdfFirstPageExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".pdf", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            val document = PDDocument.load(java.io.FileInputStream(File(filepath)))
            val image = try {
                if (document.numberOfPages == 0) {
                    return null
                }

                val renderer = PDFRenderer(document)
                renderer.renderImage(0, 2.0f)
            } finally {
                document.close()
            }
            logger.debug("Extracted first page from PDF: {}", filepath)
            image
        } catch (e: Exception) {
            logger.warn("PDF first-page extraction failed for {}: {}", filepath, e.message)
            null
        }
    }
}
