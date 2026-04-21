package com.yomitori.api

import com.yomitori.service.DictionaryService
import com.yomitori.service.StartupJobService
import com.yomitori.repository.DictionaryImportRepository
import com.yomitori.repository.FrequencySourceRepository
import com.fasterxml.jackson.annotation.JsonCreator
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class DefinitionEntryDto(
    val dictionaryName: String,
    val definition: String
)

data class WordFrequencyDto(
    val sourceName: String,
    val frequency: Long,
    val frequencyTag: String? = null
)

data class DictionaryEntryDto(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
    val definitionEntries: List<DefinitionEntryDto> = emptyList(),
    val dictionaryName: String,
    val frequencies: List<WordFrequencyDto> = emptyList()
)

data class FrequencySourceDto(
    val id: Long,
    val name: String,
    @com.fasterxml.jackson.annotation.JsonProperty("isNumeric")
    val isNumeric: Boolean
)

data class DictionaryImportDto(
    val id: String,
    val name: String
)

data class BatchLookupRequest @JsonCreator constructor(
    val words: List<String>,
    val primaryDictName: String? = null
)

@RestController
@RequestMapping("/api/dictionary")
class DictionaryController(
    private val dictionaryService: DictionaryService,
    private val startupJobService: StartupJobService,
    private val dictionaryImportRepository: DictionaryImportRepository,
    private val frequencySourceRepository: FrequencySourceRepository
) {

    @PostMapping("/reimport")
    fun reimport(): ResponseEntity<Map<String, String>> {
        startupJobService.submitDictionaryReimport()
        return ResponseEntity.ok(mapOf("status" to "queued"))
    }

    @GetMapping("/imports")
    fun getImports(): ResponseEntity<List<DictionaryImportDto>> {
        val imports = dictionaryImportRepository.findAll()
            .map { DictionaryImportDto(id = it.id, name = it.name) }
        return ResponseEntity.ok(imports)
    }

    @GetMapping("/frequency-sources")
    fun getFrequencySources(): ResponseEntity<List<FrequencySourceDto>> {
        val sources = frequencySourceRepository.findAll()
        val dtos = sources.map { FrequencySourceDto(it.id!!, it.name, it.isNumeric) }
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
                definitionEntries = result.definitionEntries.map { de ->
                    DefinitionEntryDto(dictionaryName = de.dictionaryName, definition = de.definition)
                },
                frequencies = result.frequencies.map { freq ->
                    WordFrequencyDto(
                        sourceName = freq.sourceName,
                        frequency = freq.frequency,
                        frequencyTag = freq.frequencyTag
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

        val results = dictionaryService.batchLookup(request.words, request.primaryDictName)
        val dtos = results.mapValues { (_, entries) ->
            entries.map { result ->
                DictionaryEntryDto(
                    expression = result.expression,
                    reading = result.reading,
                    definitions = result.definitions,
                    definitionEntries = result.definitionEntries.map { de ->
                        DefinitionEntryDto(dictionaryName = de.dictionaryName, definition = de.definition)
                    },
                    dictionaryName = result.dictionaryName,
                    frequencies = result.frequencies.map { freq ->
                        WordFrequencyDto(
                            sourceName = freq.sourceName,
                            frequency = freq.frequency,
                            frequencyTag = freq.frequencyTag
                        )
                    }
                )
            }
        }

        return ResponseEntity.ok(dtos)
    }
}
