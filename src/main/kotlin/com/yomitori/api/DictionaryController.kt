package com.yomitori.api

import com.yomitori.service.DictionaryService
import com.yomitori.repository.FrequencySourceRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class WordFrequencyDto(
    val sourceName: String,
    val frequency: Long
)

data class DictionaryEntryDto(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
    val dictionaryName: String,
    val frequencies: List<WordFrequencyDto> = emptyList()
)

data class FrequencySourceDto(
    val id: Long,
    val name: String
)

data class BatchLookupRequest(
    val words: List<String>
)

@RestController
@RequestMapping("/api/dictionary")
class DictionaryController(
    private val dictionaryService: DictionaryService,
    private val frequencySourceRepository: FrequencySourceRepository
) {

    @GetMapping("/frequency-sources")
    fun getFrequencySources(): ResponseEntity<List<FrequencySourceDto>> {
        val sources = frequencySourceRepository.findAll()
        val dtos = sources.map { FrequencySourceDto(it.id!!, it.name) }
        return ResponseEntity.ok(dtos)
    }

    @GetMapping("/lookup")
    fun lookup(@RequestParam word: String): ResponseEntity<List<DictionaryEntryDto>> {
        if (word.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        val results = dictionaryService.lookup(word)
        val dtos = results.map { result ->
            DictionaryEntryDto(
                expression = result.expression,
                reading = result.reading,
                definitions = result.definitions,
                dictionaryName = result.dictionaryName,
                frequencies = result.frequencies.map { freq ->
                    WordFrequencyDto(
                        sourceName = freq.sourceName,
                        frequency = freq.frequency
                    )
                }
            )
        }

        return ResponseEntity.ok(dtos)
    }

    @PostMapping("/batch-lookup")
    fun batchLookup(@RequestBody request: BatchLookupRequest): ResponseEntity<Map<String, List<DictionaryEntryDto>>> {
        if (request.words.isEmpty()) {
            return ResponseEntity.badRequest().build()
        }

        val results = dictionaryService.batchLookup(request.words)
        val dtos = results.mapValues { (_, entries) ->
            entries.map { result ->
                DictionaryEntryDto(
                    expression = result.expression,
                    reading = result.reading,
                    definitions = result.definitions,
                    dictionaryName = result.dictionaryName,
                    frequencies = result.frequencies.map { freq ->
                        WordFrequencyDto(
                            sourceName = freq.sourceName,
                            frequency = freq.frequency
                        )
                    }
                )
            }
        }

        return ResponseEntity.ok(dtos)
    }
}
