package com.yomitori.api

import com.yomitori.service.DictionaryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class DictionaryEntryDto(
    val expression: String,
    val reading: String,
    val definitions: List<String>,
    val dictionaryName: String
)

@RestController
@RequestMapping("/api/dictionary")
class DictionaryController(private val dictionaryService: DictionaryService) {

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
                dictionaryName = result.dictionaryName
            )
        }

        return ResponseEntity.ok(dtos)
    }
}
