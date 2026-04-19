package com.yomitori.service

import com.yomitori.model.DictionaryEntry
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import com.yomitori.repository.WordFrequencyRepository
import com.yomitori.repository.FrequencySourceRepository
import org.springframework.stereotype.Service

data class FrequencyInfo(
    val sourceName: String,
    val frequency: Long
)

data class DictionaryLookupResult(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
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
    fun lookup(word: String): List<DictionaryLookupResult> {
        val results = mutableListOf<DictionaryLookupResult>()

        val byExpression = entryRepository.findByExpression(word)
        val byReading = entryRepository.findByReading(word)

        (byExpression + byReading).distinctBy { it.id }.forEach { entry ->
            val dictName = importRepository.findById(entry.dictId).orElse(null)?.name ?: "Unknown"
            val frequencies = wordFrequencyRepository.findByWord(word).map { freq ->
                val source = frequencySourceRepository.findById(freq.sourceId).orElse(null)
                FrequencyInfo(
                    sourceName = source?.name ?: "Unknown",
                    frequency = freq.frequency
                )
            }

            results.add(DictionaryLookupResult(
                expression = entry.expression,
                reading = entry.reading,
                definitions = listOf(entry.definition),
                dictionaryName = dictName,
                frequencies = frequencies
            ))
        }

        return results
    }

    fun batchLookup(words: List<String>): Map<String, List<DictionaryLookupResult>> {
        return words.associate { word ->
            word to lookup(word)
        }
    }
}
