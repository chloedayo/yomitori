package com.yomitori.service

import org.apache.pdfbox.Loader
import org.springframework.stereotype.Service
import java.io.File
import java.util.zip.ZipFile

@Service
class AuthorExtractionService {
    fun extractAuthors(filepath: String): List<String> {
        val file = File(filepath)
        val fileFormat = when {
            filepath.endsWith(".epub", ignoreCase = true) -> "epub"
            filepath.endsWith(".pdf", ignoreCase = true) -> "pdf"
            filepath.endsWith(".cbz", ignoreCase = true) -> "cbz"
            filepath.endsWith(".cbr", ignoreCase = true) -> "cbr"
            else -> "unknown"
        }

        return try {
            val authors = when (fileFormat) {
                "epub" -> extractEpubAuthors(filepath)
                "pdf" -> extractPdfAuthors(filepath)
                "cbz", "cbr" -> extractComicAuthors(filepath)
                else -> emptyList()
            }
            authors.ifEmpty { listOf("Unknown Author") }
        } catch (e: Exception) {
            listOf("Unknown Author")
        }
    }

    private fun extractEpubAuthors(filepath: String): List<String> {
        return try {
            val zipFile = ZipFile(File(filepath))
            val containerEntry = zipFile.getEntry("META-INF/container.xml") ?: return emptyList()
            val containerXml = zipFile.getInputStream(containerEntry).bufferedReader().use { it.readText() }
            val opfPath = extractOpfPath(containerXml) ?: return emptyList()

            val opfEntry = zipFile.getEntry(opfPath) ?: return emptyList()
            val opfXml = zipFile.getInputStream(opfEntry).bufferedReader().use { it.readText() }
            zipFile.close()

            extractAuthorsFromOpf(opfXml)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun extractPdfAuthors(filepath: String): List<String> {
        return try {
            val document = Loader.loadPDF(File(filepath))
            val info = document.documentInformation
            val authorField = info?.author ?: ""
            document.close()

            if (authorField.isBlank()) {
                emptyList()
            } else {
                // Handle multiple authors separated by semicolon or comma
                authorField.split("[,;]".toRegex()).map { it.trim() }.filter { it.isNotEmpty() }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun extractComicAuthors(filepath: String): List<String> {
        // Extract from filename pattern [Author Name] - Title.cbz
        val filename = File(filepath).nameWithoutExtension
        val pattern = """^\[([^\]]+)\]""".toRegex()
        val match = pattern.find(filename)
        return match?.groupValues?.get(1)?.split("[,;]".toRegex())?.map { it.trim() } ?: emptyList()
    }

    private fun extractOpfPath(containerXml: String): String? {
        val regex = """rootfile\s+full-path="([^"]+)""".toRegex()
        return regex.find(containerXml)?.groupValues?.get(1)
    }

    private fun extractAuthorsFromOpf(opfXml: String): List<String> {
        val creatorRegex = """<dc:creator[^>]*>([^<]+)</dc:creator>""".toRegex()
        val matches = creatorRegex.findAll(opfXml)
        return matches.map { it.groupValues[1].trim() }.filter { it.isNotEmpty() }.toList()
    }
}
