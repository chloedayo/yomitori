package com.yomitori.service

import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths

data class ExtractedMetadata(
    val title: String,
    val type: String, // manga, novel, light-novel, textbook, other
    val genre: String? = null,
    val fileFormat: String, // pdf, epub, cbr, cbz
    val authors: List<String> = emptyList()
)

@Service
class MetadataExtractor(
    private val authorExtractionService: AuthorExtractionService
) {
    private val typeRules = mapOf(
        "PeepoHappyBooks" to "manga",
        "TMW eBook Collection" to "light-novel",
        "PeepoHappy" to "manga",
        "Manga" to "manga",
        "Novel" to "novel",
        "LightNovel" to "light-novel",
        "Textbook" to "textbook"
    )

    private val genreRules = mapOf(
        "manga" to "manga",
        "light-novel" to "fantasy",
        "novel" to "general",
        "textbook" to "educational"
    )

    fun extract(filepath: String): ExtractedMetadata {
        val file = File(filepath)
        val filename = file.name
        val fileFormat = getFileFormat(filename)
        val type = detectType(filepath)
        val title = extractTitle(filename)
        val genre = inferGenre(type)
        val authors = authorExtractionService.extractAuthors(filepath)

        return ExtractedMetadata(
            title = title,
            type = type,
            genre = genre,
            fileFormat = fileFormat,
            authors = authors
        )
    }

    private fun getFileFormat(filename: String): String {
        return when {
            filename.endsWith(".pdf", ignoreCase = true) -> "pdf"
            filename.endsWith(".epub", ignoreCase = true) -> "epub"
            filename.endsWith(".cbr", ignoreCase = true) -> "cbr"
            filename.endsWith(".cbz", ignoreCase = true) -> "cbz"
            else -> "other"
        }
    }

    private fun detectType(filepath: String): String {
        // Check directory names for type hints
        for ((dirPattern, detectedType) in typeRules) {
            if (filepath.contains(dirPattern, ignoreCase = true)) {
                return detectedType
            }
        }
        return "other"
    }

    private fun extractTitle(filename: String): String {
        // Remove file extension
        val withoutExt = filename.substringBeforeLast('.')

        // Remove common prefixes/suffixes
        var cleaned = withoutExt
            .replace(Regex("^\\[.*?\\]\\s*"), "") // Remove [tags]
            .replace(Regex("\\s*\\(.*?\\)$"), "") // Remove trailing (tags)
            .replace(Regex("\\s*-\\s*.*@.*$"), "") // Remove hash suffixes
            .trim()

        return if (cleaned.isEmpty()) filename else cleaned
    }

    private fun inferGenre(type: String): String? {
        return genreRules[type]
    }
}
