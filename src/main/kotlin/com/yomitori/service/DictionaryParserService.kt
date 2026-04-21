package com.yomitori.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.core.type.TypeReference
import com.yomitori.model.DictionaryEntry
import com.yomitori.model.DictionaryImport
import com.yomitori.model.FrequencySource
import com.yomitori.model.WordFrequency
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import com.yomitori.repository.FrequencySourceRepository
import com.yomitori.repository.WordFrequencyRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.time.LocalDateTime
import java.util.zip.ZipFile
import kotlin.io.path.deleteRecursively
import kotlin.io.path.name

@Service
class DictionaryParserService(
    private val importRepository: DictionaryImportRepository,
    private val entryRepository: DictionaryEntryRepository,
    private val frequencySourceRepository: FrequencySourceRepository,
    private val wordFrequencyRepository: WordFrequencyRepository,
    private val objectMapper: ObjectMapper
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    fun importZip(zipPath: Path): Boolean {
        try {
            val pathHash = hashPath(zipPath.toString())

            if (importRepository.findByPath(zipPath.toString()) != null) {
                logger.info("Dictionary already imported: {}", zipPath.name)
                return false
            }

            val dictName = zipPath.name.substringBeforeLast(".")

            try {
                importRepository.save(DictionaryImport(
                    id = pathHash,
                    name = dictName,
                    path = zipPath.toString()
                ))

                val tempDir = Files.createTempDirectory("yomitori-dict-")
                try {
                    unzipFile(zipPath.toFile(), tempDir.toFile())
                    parseYomichanDictionary(tempDir.toFile(), pathHash, dictName)
                    logger.info("Successfully imported dictionary: {} with {} entries", dictName, entryRepository.countByDictId(pathHash))
                } finally {
                    @OptIn(kotlin.io.path.ExperimentalPathApi::class)
                    tempDir.deleteRecursively()
                }

                return true
            } catch (e: Exception) {
                logger.error("Error importing dictionary {}: {}", zipPath.name, e.message, e)
                entryRepository.deleteByDictId(pathHash)
                importRepository.deleteById(pathHash)
                return false
            }
        } catch (e: Exception) {
            logger.error("Error importing {}: {}", zipPath.name, e.message, e)
            return false
        }
    }

    private fun unzipFile(zipFile: File, destDir: File) {
        destDir.mkdirs()
        ZipFile(zipFile).use { zip ->
            zip.entries().asSequence().forEach { entry ->
                val file = File(destDir, entry.name)
                if (entry.isDirectory) {
                    file.mkdirs()
                } else {
                    file.parentFile?.mkdirs()
                    zip.getInputStream(entry).use { input ->
                        file.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                }
            }
        }
    }

    @Transactional
    private fun parseYomichanDictionary(dictDir: File, dictId: String, dictName: String) {
        val termBankFiles = dictDir.listFiles { file ->
            file.name.matches(Regex("term_bank_\\d+\\.json"))
        }?.sortedBy { it.name } ?: emptyList()

        var totalEntries = 0
        val batchSize = 1000
        val batch = mutableListOf<DictionaryEntry>()

        termBankFiles.forEach { file ->
            try {
                val entries: List<Any> = objectMapper.readValue(file, object : TypeReference<List<Any>>() {})

                entries.forEach { entryObj ->
                    if (entryObj is List<*>) {
                        try {
                            val entry = parseTermEntry(entryObj, dictId)
                            if (entry != null) {
                                batch.add(entry)
                                totalEntries++

                                if (batch.size >= batchSize) {
                                    entryRepository.saveAll(batch)
                                    batch.clear()
                                }
                            }
                        } catch (e: Exception) {
                            logger.debug("Error parsing entry: {}", e.message)
                        }
                    }
                }
            } catch (e: Exception) {
                logger.warn("Error parsing file {}: {}", file.name, e.message)
            }
        }

        if (batch.isNotEmpty()) {
            entryRepository.saveAll(batch)
        }

        logger.info("Imported {} entries", totalEntries)
    }

    private fun parseTermEntry(entry: List<*>, dictId: String): DictionaryEntry? {
        if (entry.size < 6) return null

        val expression = (entry[0] as? String) ?: return null
        val reading = (entry[1] as? String) ?: return null
        val definitions = (entry[5] as? List<*>) ?: emptyList<Any>()

        val definition = definitions
            .mapNotNull { item ->
                when (item) {
                    is String -> item.takeIf { it.isNotBlank() }
                    is Map<*, *> -> when (item["type"]) {
                        "text" -> item["content"] as? String
                        "structured-content" -> extractStructuredContent(item["content"])
                        else -> extractStructuredContent(item)
                    }
                    else -> null
                }
            }
            .firstOrNull()
            ?: return null

        return DictionaryEntry(
            dictId = dictId,
            expression = expression,
            reading = reading,
            definition = definition
        )
    }

    private fun extractStructuredContent(content: Any?): String? {
        val sb = StringBuilder()
        buildHtmlFromContent(content, sb)
        return sb.toString().trim().takeIf { it.isNotEmpty() }
    }

    private fun escapeHtml(text: String): String = text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    private fun buildHtmlFromContent(content: Any?, sb: StringBuilder) {
        when (content) {
            is String -> sb.append(escapeHtml(content))
            is Map<*, *> -> {
                val tag = content["tag"] as? String
                val inner = content["content"]
                when (tag) {
                    null -> content.values.forEach { buildHtmlFromContent(it, sb) }
                    "img" -> (content["title"] as? String)?.let { sb.append(escapeHtml(it)) }
                    in VOID_TAGS -> sb.append("<$tag>")
                    else -> {
                        sb.append("<$tag")
                        (content["lang"] as? String)?.let { sb.append(" lang=\"${escapeHtml(it)}\"") }
                        (content["class"] as? String)?.let { sb.append(" class=\"${escapeHtml(it)}\"") }
                        (content["href"] as? String)?.let { sb.append(" href=\"${escapeHtml(it)}\"") }
                        (content["style"] as? Map<*, *>)?.let { styleMap ->
                            val css = styleMap.entries
                                .filter { (k, v) -> k is String && v is String }
                                .joinToString(";") { (k, v) ->
                                    val prop = (k as String).replace(Regex("([A-Z])")) { "-${it.value.lowercase()}" }
                                    "$prop:${v as String}"
                                }
                            if (css.isNotEmpty()) sb.append(" style=\"${escapeHtml(css)}\"")
                        }
                        sb.append(">")
                        if (inner != null) buildHtmlFromContent(inner, sb)
                        sb.append("</$tag>")
                    }
                }
            }
            is List<*> -> content.forEach { buildHtmlFromContent(it, sb) }
        }
    }

    companion object {
        private val VOID_TAGS = setOf("br", "hr", "img")
    }

    fun loadFrequencyDictionaries() {
        val frequencyDir = File("/app/data/dictionaries/frequency")

        if (!frequencyDir.exists()) {
            logger.debug("Frequency dictionary folder not found at {}", frequencyDir.absolutePath)
            return
        }

        val freqZipFiles = frequencyDir.listFiles { file ->
            file.name.endsWith(".zip")
        }?.sortedBy { it.name } ?: emptyList()

        if (freqZipFiles.isEmpty()) {
            logger.debug("No frequency zip files found in {}", frequencyDir.absolutePath)
            return
        }

        freqZipFiles.forEach { zipFile ->
            loadFrequencyDictionary(zipFile)
        }
    }

    @Transactional
    fun loadFrequencyDictionary(zipFile: File) {
        val dictName = zipFile.name.substringBeforeLast(".zip")

        if (frequencySourceRepository.findByName(dictName) != null) {
            logger.info("Frequency dictionary already loaded: {}", dictName)
            return
        }

        val tempDir = Files.createTempDirectory("yomitori-freq-")
        try {
            unzipFile(zipFile, tempDir.toFile())

            var source = frequencySourceRepository.save(FrequencySource(
                name = dictName,
                path = zipFile.absolutePath,
                loadedAt = LocalDateTime.now()
            ))

            val metaBankFiles = tempDir.toFile().listFiles { file ->
                file.name.matches(Regex("term_meta_bank_\\d+\\.json"))
            }?.sortedBy { it.name } ?: emptyList()

            var totalFreq = 0
            val batchSize = 1000
            val batch = mutableListOf<WordFrequency>()
            var hasStringFreq = false

            metaBankFiles.forEach { file ->
                try {
                    val entries: List<Any> = objectMapper.readValue(file, object : TypeReference<List<Any>>() {})
                    entries.forEach { entryObj ->
                        val entry = entryObj as? List<*> ?: return@forEach
                        if (entry.size >= 2) {
                            val expression = entry[0] as? String
                            val mode = entry[1] as? String

                            if (expression != null && mode == "freq") {
                                val (reading, frequency, tag) = parseFrequencyEntry(entry)

                                if (tag != null) hasStringFreq = true

                                batch.add(WordFrequency(
                                    word = expression,
                                    reading = reading,
                                    frequency = frequency,
                                    frequencyTag = tag,
                                    sourceId = source.id!!
                                ))
                                totalFreq++

                                if (batch.size >= batchSize) {
                                    wordFrequencyRepository.saveAll(batch)
                                    batch.clear()
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    logger.warn("Error parsing frequency file {}: {}", file.name, e.message)
                }
            }

            if (batch.isNotEmpty()) {
                wordFrequencyRepository.saveAll(batch)
            }

            if (hasStringFreq) {
                source = frequencySourceRepository.save(source.copy(isNumeric = false))
            }

            logger.info("Loaded {} frequency entries from {} (numeric={})", totalFreq, dictName, source.isNumeric)
        } finally {
            @OptIn(kotlin.io.path.ExperimentalPathApi::class)
            tempDir.deleteRecursively()
        }
    }

    private fun parseFrequencyEntry(entry: List<*>): Triple<String, Long, String?> {
        val freqData = entry.getOrNull(2) as? Map<*, *> ?: return Triple("", 0L, null)

        val reading = (freqData["reading"] as? String) ?: ""

        val rawFreq = when {
            freqData.containsKey("frequency") -> freqData["frequency"]
            freqData.containsKey("value") -> freqData["value"]
            else -> null
        }

        return when {
            rawFreq is Number -> Triple(reading, rawFreq.toLong(), null)
            rawFreq is Map<*, *> -> {
                val value = rawFreq["value"]
                val displayValue = rawFreq["displayValue"] as? String
                when {
                    value is Number -> Triple(reading, value.toLong(), displayValue)
                    displayValue != null -> Triple(reading, 0L, displayValue)
                    else -> Triple(reading, 0L, null)
                }
            }
            rawFreq is String -> Triple(reading, 0L, rawFreq)
            else -> Triple(reading, 0L, null)
        }
    }

    private fun hashPath(path: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(path.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 16)
    }
}
