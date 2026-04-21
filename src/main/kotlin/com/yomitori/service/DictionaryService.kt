package com.yomitori.service

import com.yomitori.model.DictionaryEntry
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import com.yomitori.repository.WordFrequencyRepository
import com.yomitori.repository.FrequencySourceRepository
import org.springframework.stereotype.Service

data class FrequencyInfo(
    val sourceName: String,
    val frequency: Long,
    val frequencyTag: String? = null
)

data class DefinitionEntry(
    val dictionaryName: String,
    val definition: String
)

data class DictionaryLookupResult(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
    val definitionEntries: List<DefinitionEntry>,
    val dictionaryName: String,
    val frequencies: List<FrequencyInfo> = emptyList()
)

@Service
class DictionaryService(
    private val entryRepository: DictionaryEntryRepository,
    private val importRepository: DictionaryImportRepository,
    private val wordFrequencyRepository: WordFrequencyRepository,
    private val frequencySourceRepository: FrequencySourceRepository
) {
    fun lookup(word: String, primaryDictName: String? = null, primaryDictOnly: Boolean = false): List<DictionaryLookupResult> {
        val entries = (entryRepository.findByExpression(word) + entryRepository.findByReading(word))
            .distinctBy { it.id }

        if (entries.isEmpty()) return emptyList()

        val frequencies = wordFrequencyRepository.findByWord(word)
            .groupBy { it.sourceId }
            .map { (sourceId, freqs) ->
                val source = frequencySourceRepository.findById(sourceId).orElse(null)
                val best = freqs.minByOrNull { it.frequency } ?: freqs.first()
                FrequencyInfo(
                    sourceName = source?.name ?: "Unknown",
                    frequency = best.frequency,
                    frequencyTag = best.frequencyTag
                )
            }

        return entries
            .groupBy { "${it.expression}::${it.reading}" }
            .map { (_, group) ->
                var defEntries = group.map { entry ->
                    val dictName = importRepository.findById(entry.dictId).orElse(null)?.name ?: "Unknown"
                    DefinitionEntry(dictionaryName = dictName, definition = entry.definition)
                }
                if (primaryDictName != null) {
                    defEntries = if (primaryDictOnly) {
                        val preferred = defEntries.filter { it.dictionaryName == primaryDictName }
                        preferred.ifEmpty { listOf(defEntries.first()) }
                    } else {
                        defEntries.sortedWith(compareBy { if (it.dictionaryName == primaryDictName) 0 else 1 })
                    }
                }
                DictionaryLookupResult(
                    expression = group.first().expression,
                    reading = group.first().reading,
                    definitions = defEntries.map { it.definition },
                    definitionEntries = defEntries,
                    dictionaryName = defEntries.first().dictionaryName,
                    frequencies = frequencies
                )
            }
    }

    fun batchLookup(words: List<String>, primaryDictName: String? = null, primaryDictOnly: Boolean = false): Map<String, List<DictionaryLookupResult>> {
        return words.associate { word ->
            word to lookup(word, primaryDictName, primaryDictOnly)
        }
    }
}
