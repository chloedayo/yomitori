package com.yomitori.service

import com.yomitori.model.DictionaryEntry
import com.yomitori.model.DictionaryImport
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
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

            val dictName = zipPath.name.substringBeforeLast(".")
            val entryCount = 0

            try {
                importRepository.save(DictionaryImport(
                    id = pathHash,
                    name = dictName,
                    path = zipPath.toString()
                ))
                logger.info("Registered dictionary: {} (parsing deferred)", dictName)
                return true
            } catch (e: Exception) {
                logger.error("Error registering dictionary {}: {}", zipPath.name, e.message, e)
                return false
            }
        } catch (e: Exception) {
            logger.error("Error importing dictionary {}: {}", zipPath.name, e.message, e)
            return false
        }
    }

    private fun hashPath(path: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(path.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }.substring(0, 16)
    }
}
