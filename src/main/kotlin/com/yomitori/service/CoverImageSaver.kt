package com.yomitori.service

import org.springframework.stereotype.Service
import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import javax.imageio.ImageIO
import kotlin.math.min

@Service
class CoverImageSaver {
    private var coversPath: String = "/app/covers"

    init {
        Files.createDirectories(Paths.get(coversPath))
    }

    fun setCoversPath(path: String) {
        coversPath = path
        Files.createDirectories(Paths.get(coversPath))
    }

    fun save(image: BufferedImage, filename: String): String {
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
