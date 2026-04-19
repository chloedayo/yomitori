package com.yomitori.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.core.type.TypeReference
import com.yomitori.model.DictionaryEntry
import com.yomitori.model.DictionaryImport
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import java.util.zip.ZipFile
import kotlin.io.path.deleteRecursively
import kotlin.io.path.name

@Service
class DictionaryParserService(
    private val importRepository: DictionaryImportRepository,
    private val entryRepository: DictionaryEntryRepository,
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

            logger.info("Starting import of dictionary: {}", zipPath.name)

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
            logger.info("Parsing {}", file.name)
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
                val def = item as? Map<*, *> ?: return@mapNotNull null
                when (def["type"]) {
                    "text" -> def["content"] as? String
                    "structured-content" -> extractStructuredContent(def["content"])
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
        extractTextFromContent(content, sb)
        return sb.toString().trim().takeIf { it.isNotEmpty() }
    }

    private fun extractTextFromContent(content: Any?, sb: StringBuilder) {
        when (content) {
            is String -> sb.append(content)
            is Map<*, *> -> {
                val data = content["data"] as? Map<*, *>
                val name = data?.get("name") as? String
                val innerContent = content["content"]

                if (name in listOf("語釈", "見出部", "見出仮名")) {
                    if (innerContent is String) {
                        sb.append(innerContent).append(" ")
                    } else {
                        extractTextFromContent(innerContent, sb)
                    }
                } else if (innerContent != null) {
                    extractTextFromContent(innerContent, sb)
                }
            }
            is List<*> -> content.forEach { extractTextFromContent(it, sb) }
        }
    }

    private fun hashPath(path: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(path.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 16)
    }
}
