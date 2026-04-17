package com.yomitori.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import javax.imageio.ImageIO
import kotlin.math.min

@Service
class CoverExtractor(
    @Value("\${yomitori.crawler.covers-path}")
    private val coversPath: String
) {
    init {
        Files.createDirectories(Paths.get(coversPath))
    }

    fun extractCover(filepath: String, bookId: Long?): String? {
        return try {
            when {
                filepath.endsWith(".pdf", ignoreCase = true) -> null
                filepath.endsWith(".epub", ignoreCase = true) -> null
                filepath.endsWith(".cbr", ignoreCase = true) -> null
                filepath.endsWith(".cbz", ignoreCase = true) -> extractCbzCover(filepath, bookId)
                else -> null
            }
        } catch (e: Exception) {
            println("Failed to extract cover from $filepath: ${e.message}")
            null
        }
    }

    private fun extractCbzCover(filepath: String, bookId: Long?): String? {
        return try {
            val zipFile = java.util.zip.ZipFile(File(filepath))
            val entries = zipFile.entries()
            val firstImage = entries.asSequence()
                .filter { it.name.endsWith(".jpg", ignoreCase = true) || it.name.endsWith(".png", ignoreCase = true) }
                .sortedBy { it.name }
                .firstOrNull()

            if (firstImage == null) {
                zipFile.close()
                return null
            }

            zipFile.getInputStream(firstImage).use { inputStream ->
                val image = ImageIO.read(inputStream)
                zipFile.close()
                saveCoverImage(image, "cbz_${bookId ?: System.nanoTime()}.jpg")
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun saveCoverImage(image: BufferedImage, filename: String): String {
        val targetSize = 300
        val scaled = scaleImage(image, targetSize)

        val coverFile = Paths.get(coversPath, filename).toFile()
        ImageIO.write(scaled, "jpg", coverFile)

        return coverFile.absolutePath
    }

    private fun scaleImage(image: BufferedImage, maxDim: Int): BufferedImage {
        val width = image.width
        val height = image.height
        val scaleFactor = min(maxDim / width.toFloat(), maxDim / height.toFloat())

        if (scaleFactor >= 1.0f) return image

        val newWidth = (width * scaleFactor).toInt()
        val newHeight = (height * scaleFactor).toInt()

        val scaled = BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB)
        val g2d = scaled.createGraphics()
        g2d.drawImage(image, 0, 0, newWidth, newHeight, null)
        g2d.dispose()

        return scaled
    }
}
