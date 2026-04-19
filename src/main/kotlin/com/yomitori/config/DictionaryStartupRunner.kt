package com.yomitori.config

import com.yomitori.service.DictionaryParserService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Paths
import kotlin.io.path.extension
import kotlin.io.path.isRegularFile

@Component
class DictionaryStartupRunner(
    private val parserService: DictionaryParserService,
    @Value("\${yomitori.dictionaries.path:/app/data/dictionaries}")
    private val dictionariesPath: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @EventListener(ApplicationReadyEvent::class)
    fun importDictionaries() {
        logger.info("Dictionary startup runner starting...")

        val path = Paths.get(dictionariesPath)
        if (!Files.exists(path)) {
            logger.info("Dictionaries path does not exist: {}", dictionariesPath)
            return
        }

        try {
            val zipFiles = Files.list(path)
                .filter { it.isRegularFile() && it.extension == "zip" }
                .toList()

            if (zipFiles.isEmpty()) {
                logger.info("No dictionary zip files found in {}", dictionariesPath)
                return
            }

            var importedCount = 0
            var skippedCount = 0

            zipFiles.forEach { zipPath ->
                if (parserService.importZip(zipPath)) {
                    importedCount++
                } else {
                    skippedCount++
                }
            }

            logger.info("Dictionary startup complete: imported {}, skipped {}", importedCount, skippedCount)

            // Load frequency dictionaries
            logger.info("Loading frequency dictionaries...")
            parserService.loadFrequencyDictionaries()
        } catch (e: Exception) {
            logger.error("Error during dictionary import: {}", e.message, e)
        }
    }
}
