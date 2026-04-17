package com.yomitori.service

import org.springframework.stereotype.Service
import java.io.File
import java.nio.file.Files
import java.nio.file.Paths
import java.nio.file.attribute.BasicFileAttributes
import java.time.LocalDateTime
import java.time.ZoneId

data class FileInfo(
    val filepath: String,
    val lastModified: LocalDateTime,
    val exists: Boolean = true
)

@Service
class FileSystemScanner {
    private val supportedFormats = setOf("pdf", "epub", "cbr", "cbz")

    fun scanDirectory(path: String): List<FileInfo> {
        val results = mutableListOf<FileInfo>()
        scanRecursive(File(path), results)
        return results
    }

    private fun scanRecursive(dir: File, results: MutableList<FileInfo>) {
        try {
            if (!dir.isDirectory) return

            dir.listFiles()?.forEach { file ->
                when {
                    file.isDirectory -> scanRecursive(file, results)
                    isSupportedFormat(file.name) -> {
                        val attributes = Files.readAttributes(
                            file.toPath(),
                            BasicFileAttributes::class.java
                        )
                        val lastModified = LocalDateTime.ofInstant(
                            attributes.lastModifiedTime().toInstant(),
                            ZoneId.systemDefault()
                        )
                        results.add(FileInfo(file.absolutePath, lastModified))
                    }
                }
            }
        } catch (e: Exception) {
            println("Error scanning directory $dir: ${e.message}")
        }
    }

    private fun isSupportedFormat(filename: String): Boolean {
        val ext = filename.substringAfterLast('.').lowercase()
        return ext in supportedFormats
    }

    fun getFileLastModified(filepath: String): LocalDateTime? {
        return try {
            val attributes = Files.readAttributes(
                Paths.get(filepath),
                BasicFileAttributes::class.java
            )
            LocalDateTime.ofInstant(
                attributes.lastModifiedTime().toInstant(),
                ZoneId.systemDefault()
            )
        } catch (e: Exception) {
            null
        }
    }

    fun fileExists(filepath: String): Boolean {
        return Files.exists(Paths.get(filepath))
    }
}
