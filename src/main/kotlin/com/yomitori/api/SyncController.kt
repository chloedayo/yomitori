package com.yomitori.api

import com.yomitori.model.SaveState
import com.yomitori.repository.SaveStateRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class SaveRequest(
    val clientId: String,
    val reviewsJson: String? = null,
    val dictionaryJson: String? = null,
)

data class SaveResponse(
    val clientId: String,
    val reviewsJson: String?,
    val dictionaryJson: String?,
    val savedAt: String,
)

@RestController
@RequestMapping("/api/sync")
class SyncController(private val saveStateRepository: SaveStateRepository) {

    @PostMapping("/save")
    fun save(@RequestBody request: SaveRequest): ResponseEntity<SaveResponse> {
        val savedAt = Instant.now().toString()
        val state = SaveState(
            clientId = request.clientId,
            reviewsJson = request.reviewsJson,
            dictionaryJson = request.dictionaryJson,
            savedAt = savedAt,
        )
        saveStateRepository.save(state)
        return ResponseEntity.ok(SaveResponse(state.clientId, state.reviewsJson, state.dictionaryJson, savedAt))
    }

    @GetMapping("/load/{clientId}")
    fun load(@PathVariable clientId: String): ResponseEntity<SaveResponse> {
        val state = saveStateRepository.findById(clientId).orElse(null)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(SaveResponse(state.clientId, state.reviewsJson, state.dictionaryJson, state.savedAt))
    }
}
