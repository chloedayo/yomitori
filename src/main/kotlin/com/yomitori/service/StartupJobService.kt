package com.yomitori.service

import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import com.yomitori.repository.FrequencySourceRepository
import com.yomitori.repository.WordFrequencyRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Paths
import java.util.concurrent.Executors
import kotlin.io.path.extension
import kotlin.io.path.isRegularFile

@Service
class StartupJobService(
    private val parserService: DictionaryParserService,
    private val crawlerService: CrawlerService,
    private val authorExtractionService: RetroactiveAuthorExtractionService,
    private val dictionaryEntryRepository: DictionaryEntryRepository,
    private val dictionaryImportRepository: DictionaryImportRepository,
    private val frequencySourceRepository: FrequencySourceRepository,
    private val wordFrequencyRepository: WordFrequencyRepository,
    @Value("\${yomitori.dictionaries.path:/app/data/dictionaries}")
    private val dictionariesPath: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val executor = Executors.newSingleThreadExecutor { r -> Thread(r, "job-queue") }

    fun submitJob(name: String, block: () -> Unit) = executor.submit {
        logger.info("[job-queue] {} starting...", name)
        try {
            block()
            logger.info("[job-queue] {} done", name)
        } catch (e: Exception) {
            logger.error("[job-queue] {} error: {}", name, e.message, e)
        }
    }

    fun submitAll() {
        submitDictionaryImport()
        submitCrawler()
        submitAuthorExtraction()
    }

    fun submitDictionaryImport() = executor.submit {
        logger.info("[job-queue] dictionary import starting...")
        val path = Paths.get(dictionariesPath)
        if (!Files.exists(path)) {
            logger.info("[job-queue] dictionaries path does not exist: {}", dictionariesPath)
            return@submit
        }
        try {
            val zipFiles = Files.list(path)
                .filter { it.isRegularFile() && it.extension == "zip" }
                .toList()
            if (zipFiles.isEmpty()) {
                logger.info("[job-queue] no dictionary zip files found")
            } else {
                var imported = 0; var skipped = 0
                zipFiles.forEach { if (parserService.importZip(it)) imported++ else skipped++ }
                logger.info("[job-queue] dictionary import done — imported {}, skipped {}", imported, skipped)
            }
            parserService.loadFrequencyDictionaries()
            logger.info("[job-queue] frequency dictionaries loaded")
        } catch (e: Exception) {
            logger.error("[job-queue] dictionary import error: {}", e.message, e)
        }
    }

    fun submitDictionaryReimport() = executor.submit {
        logger.info("[job-queue] dictionary reimport — clearing existing data...")
        try {
            wordFrequencyRepository.deleteAll()
            frequencySourceRepository.deleteAll()
            dictionaryEntryRepository.deleteAll()
            dictionaryImportRepository.deleteAll()
            logger.info("[job-queue] dictionary data cleared, re-importing...")
        } catch (e: Exception) {
            logger.error("[job-queue] dictionary reimport clear error: {}", e.message, e)
            return@submit
        }
        val path = Paths.get(dictionariesPath)
        if (!Files.exists(path)) {
            logger.info("[job-queue] dictionaries path does not exist: {}", dictionariesPath)
            return@submit
        }
        try {
            val zipFiles = Files.list(path)
                .filter { it.isRegularFile() && it.extension == "zip" }
                .toList()
            var imported = 0; var skipped = 0
            zipFiles.forEach { if (parserService.importZip(it)) imported++ else skipped++ }
            logger.info("[job-queue] reimport done — imported {}, skipped {}", imported, skipped)
            parserService.loadFrequencyDictionaries()
            logger.info("[job-queue] frequency dictionaries reloaded")
        } catch (e: Exception) {
            logger.error("[job-queue] dictionary reimport error: {}", e.message, e)
        }
    }

    fun submitCrawler() = executor.submit {
        logger.info("[job-queue] crawler starting...")
        try {
            crawlerService.runCrawler()
            logger.info("[job-queue] crawler done")
        } catch (e: Exception) {
            logger.error("[job-queue] crawler error: {}", e.message, e)
        }
    }

    fun submitAuthorExtraction() = executor.submit {
        logger.info("[job-queue] author extraction starting...")
        try {
            authorExtractionService.extractAuthorsForAllBooks()
            logger.info("[job-queue] author extraction done")
        } catch (e: Exception) {
            logger.error("[job-queue] author extraction error: {}", e.message, e)
        }
    }
}
