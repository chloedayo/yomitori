package com.yomitori.service

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Service
import java.nio.file.FileSystems
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardWatchEventKinds.ENTRY_CREATE
import java.nio.file.WatchKey

@Service
class DictionaryWatcherService(
    private val parserService: DictionaryParserService,
    private val jobService: StartupJobService,
    @Value("\${yomitori.dictionaries.path:/app/data/dictionaries}")
    private val dictionariesPath: String
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @EventListener(ApplicationReadyEvent::class)
    fun startWatching() {
        val dictDir = Paths.get(dictionariesPath)
        val freqDir = dictDir.resolve("frequency")

        if (!Files.exists(dictDir)) {
            logger.info("Dictionary watch skipped — path does not exist: {}", dictDir)
            return
        }

        Thread({
            watchDirectories(dictDir, freqDir)
        }, "dict-watcher").apply { isDaemon = true }.start()

        logger.info("Watching for new dictionaries in {}", dictDir)
    }

    private fun watchDirectories(dictDir: Path, freqDir: Path) {
        val watchService = FileSystems.getDefault().newWatchService()
        val keyToDir = mutableMapOf<WatchKey, Path>()

        fun register(dir: Path) {
            if (Files.exists(dir)) {
                val key = dir.register(watchService, ENTRY_CREATE)
                keyToDir[key] = dir
                logger.debug("Watching {}", dir)
            }
        }

        register(dictDir)
        register(freqDir)

        while (true) {
            val key = try {
                watchService.take()
            } catch (e: InterruptedException) {
                break
            }

            val dir = keyToDir[key] ?: continue

            for (event in key.pollEvents()) {
                val filename = event.context().toString()
                if (!filename.endsWith(".zip")) continue

                val file = dir.resolve(filename).toFile()
                val isFreq = dir == freqDir

                if (isFreq) {
                    jobService.submitJob("freq-dict import [$filename]") {
                        parserService.loadFrequencyDictionary(file)
                    }
                } else {
                    jobService.submitJob("dict import [$filename]") {
                        parserService.importZip(file.toPath())
                    }
                }
            }

            if (!key.reset()) {
                keyToDir.remove(key)
                if (keyToDir.isEmpty()) break
            }
        }
    }
}
