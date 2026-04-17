package com.yomitori.service

import com.yomitori.service.strategy.CoverExtractionStrategy
import com.yomitori.service.strategy.pdf.PdfFirstPageExtractor
import com.yomitori.service.strategy.pdf.PdfMetadataExtractor
import com.yomitori.service.strategy.epub.EpubFirstImageExtractor
import com.yomitori.service.strategy.epub.EpubMetadataExtractor
import com.yomitori.service.strategy.cbz.CbzExtractor
import org.springframework.stereotype.Service

@Service
class FileTypeRouter(
    private val pdfMetadataExtractor: PdfMetadataExtractor,
    private val pdfFirstPageExtractor: PdfFirstPageExtractor,
    private val epubMetadataExtractor: EpubMetadataExtractor,
    private val epubFirstImageExtractor: EpubFirstImageExtractor,
    private val cbzExtractor: CbzExtractor
) {
    fun route(filepath: String): List<CoverExtractionStrategy> {
        val extension = filepath.substringAfterLast(".").lowercase()

        return when (extension) {
            "pdf" -> listOf(pdfMetadataExtractor, pdfFirstPageExtractor)
            "epub" -> listOf(epubMetadataExtractor, epubFirstImageExtractor)
            "cbz" -> listOf(cbzExtractor)
            else -> emptyList()
        }
    }
}
