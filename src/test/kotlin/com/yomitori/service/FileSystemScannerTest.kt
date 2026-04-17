package com.yomitori.service

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class FileSystemScannerTest {
    private val scanner = FileSystemScanner()

    @Test
    fun `should scan supported file formats`(@TempDir tempDir: Path) {
        File(tempDir.toFile(), "book1.pdf").createNewFile()
        File(tempDir.toFile(), "book2.epub").createNewFile()
        File(tempDir.toFile(), "book3.cbz").createNewFile()
        File(tempDir.toFile(), "readme.txt").createNewFile()

        val files = scanner.scanDirectory(tempDir.toString())

        assertEquals(3, files.size)
        assertTrue(files.any { it.filepath.endsWith("book1.pdf") })
        assertTrue(files.any { it.filepath.endsWith("book2.epub") })
        assertTrue(files.any { it.filepath.endsWith("book3.cbz") })
    }

    @Test
    fun `should scan nested directories`(@TempDir tempDir: Path) {
        val subdir = tempDir.resolve("nested").toFile()
        subdir.mkdirs()
        File(subdir, "book.pdf").createNewFile()

        val files = scanner.scanDirectory(tempDir.toString())

        assertEquals(1, files.size)
        assertTrue(files[0].filepath.endsWith("book.pdf"))
    }

    @Test
    fun `should return empty list for empty directory`(@TempDir tempDir: Path) {
        val files = scanner.scanDirectory(tempDir.toString())
        assertEquals(0, files.size)
    }
}
