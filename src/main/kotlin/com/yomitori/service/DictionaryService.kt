package com.yomitori.service

import com.yomitori.model.DictionaryEntry
import com.yomitori.repository.DictionaryEntryRepository
import com.yomitori.repository.DictionaryImportRepository
import org.springframework.stereotype.Service

data class DictionaryLookupResult(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
    val dictionaryName: String
)

@Service
class DictionaryService(
    private val entryRepository: DictionaryEntryRepository,
    private val importRepository: DictionaryImportRepository
) {
    fun lookup(word: String): List<DictionaryLookupResult> {
        val results = mutableListOf<DictionaryLookupResult>()

        val byExpression = entryRepository.findByExpression(word)
        val byReading = entryRepository.findByReading(word)

        (byExpression + byReading).distinctBy { it.id }.forEach { entry ->
            val dictName = importRepository.findById(entry.dictId).orElse(null)?.name ?: "Unknown"
            results.add(DictionaryLookupResult(
                expression = entry.expression,
                reading = entry.reading,
                definitions = listOf(entry.definition),
                dictionaryName = dictName
            ))
        }

        return results
    }
}
