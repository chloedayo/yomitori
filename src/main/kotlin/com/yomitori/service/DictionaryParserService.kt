package com.yomitori.service

import com.yomitori.model.DictionaryEntry
import com.yomitori.model.DictionaryImport
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import io.github.eb4j.EBException
import io.github.eb4j.io.BookReader
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.security.MessageDigest
import kotlin.io.path.name

@Service
class DictionaryParserService(
    private val importRepository: DictionaryImportRepository,
    private val entryRepository: DictionaryEntryRepository
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

            val tempDir = Files.createTempDirectory("yomitori-dict-")
            try {
                unzipFile(zipPath.toFile(), tempDir.toFile())

                val bookReader = BookReader(tempDir.toString())
                val subbookList = bookReader.bookList
                if (subbookList.isEmpty()) {
                    logger.warn("No subbooks found in {}", zipPath.name)
                    return false
                }

                val subbook = subbookList[0]
                var entryCount = 0
                val entries = mutableListOf<DictionaryEntry>()

                try {
                    val iterator = subbook.searchWord("")
                    while (iterator.hasNext()) {
                        val word = iterator.next()
                        val definition = word.plainText.trim()
                        if (definition.isNotEmpty()) {
                            val reading = word.reading ?: ""
                            entries.add(DictionaryEntry(
                                dictId = pathHash,
                                expression = word.surface,
                                reading = reading,
                                definition = definition
                            ))
                            entryCount++

                            if (entries.size >= 1000) {
                                entryRepository.saveAll(entries)
                                entries.clear()
                                logger.debug("Indexed {} entries from {}", entryCount, zipPath.name)
                            }
                        }
                    }
                } catch (e: EBException) {
                    logger.warn("Error reading dictionary entries: {}", e.message)
                }

                if (entries.isNotEmpty()) {
                    entryRepository.saveAll(entries)
                }

                val dictName = zipPath.name.substringBeforeLast(".")
                importRepository.save(DictionaryImport(
                    id = pathHash,
                    name = dictName,
                    path = zipPath.toString()
                ))

                logger.info("Successfully imported {}: {} entries", zipPath.name, entryCount)
                return true
            } finally {
                tempDir.toFile().deleteRecursively()
            }
        } catch (e: Exception) {
            logger.error("Error importing dictionary {}: {}", zipPath.name, e.message, e)
            return false
        }
    }

    private fun unzipFile(zipFile: File, outputDir: File) {
        val zip = java.util.zip.ZipFile(zipFile)
        zip.use {
            for (entry in it.entries()) {
                val outFile = File(outputDir, entry.name)
                if (entry.isDirectory) {
                    outFile.mkdirs()
                } else {
                    outFile.parentFile?.mkdirs()
                    it.getInputStream(entry).use { input ->
                        outFile.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                }
            }
        }
    }

    private fun hashPath(path: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(path.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 16)
    }
}
