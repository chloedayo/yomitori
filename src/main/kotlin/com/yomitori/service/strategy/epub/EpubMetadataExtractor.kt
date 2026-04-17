package com.yomitori.service.strategy.epub

import com.yomitori.service.strategy.CoverExtractionStrategy
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File
import java.util.zip.ZipFile
import javax.imageio.ImageIO

@Service
class EpubMetadataExtractor : CoverExtractionStrategy {
    private val logger = LoggerFactory.getLogger(EpubMetadataExtractor::class.java)

    override fun accepts(filepath: String): Boolean {
        return filepath.endsWith(".epub", ignoreCase = true)
    }

    override fun extract(filepath: String): BufferedImage? {
        return try {
            val zipFile = ZipFile(File(filepath))

            val containerEntry = zipFile.getEntry("META-INF/container.xml")
            if (containerEntry == null) {
                zipFile.close()
                return null
            }

            val containerXml = zipFile.getInputStream(containerEntry).bufferedReader().use { it.readText() }
            val opfPath = extractOpfPath(containerXml) ?: run {
                zipFile.close()
                return null
            }

            val opfEntry = zipFile.getEntry(opfPath)
            if (opfEntry == null) {
                zipFile.close()
                return null
            }

            val opfXml = zipFile.getInputStream(opfEntry).bufferedReader().use { it.readText() }
            val coverImagePath = extractCoverImagePath(opfXml, opfPath) ?: run {
                zipFile.close()
                return null
            }

            val imageEntry = zipFile.getEntry(coverImagePath)
            if (imageEntry == null) {
                zipFile.close()
                return null
            }

            val image = zipFile.getInputStream(imageEntry).use { ImageIO.read(it) }
            zipFile.close()

            logger.debug("Extracted cover image from EPUB manifest: {}", coverImagePath)
            image
        } catch (e: Exception) {
            logger.warn("EPUB metadata extraction failed for {}: {}", filepath, e.message)
            null
        }
    }

    private fun extractOpfPath(containerXml: String): String? {
        val regex = """rootfile\s+full-path="([^"]+)""".toRegex()
        return regex.find(containerXml)?.groupValues?.get(1)
    }

    private fun extractCoverImagePath(opfXml: String, opfPath: String): String? {
        val coverIdRegex = """meta\s+name="cover"\s+content="([^"]+)""".toRegex()
        val coverId = coverIdRegex.find(opfXml)?.groupValues?.get(1) ?: return null

        val itemRegex = """item\s+id="$coverId"\s+href="([^"]+)""".toRegex()
        val coverFile = itemRegex.find(opfXml)?.groupValues?.get(1) ?: return null

        val opfDir = opfPath.substringBeforeLast('/')
        return if (opfDir.isEmpty()) coverFile else "$opfDir/$coverFile"
    }
}
