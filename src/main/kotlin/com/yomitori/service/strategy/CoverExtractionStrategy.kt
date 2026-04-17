package com.yomitori.service.strategy

import java.awt.image.BufferedImage

interface CoverExtractionStrategy {
    fun extract(filepath: String): BufferedImage?
    fun accepts(filepath: String): Boolean
}
