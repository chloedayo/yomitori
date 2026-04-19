package com.yomitori.api

import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder
import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.LoggerFactory

@RestController
@RequestMapping("/api/proxy")
class ProxyController(private val restTemplate: RestTemplate) {

  private val logger = LoggerFactory.getLogger(ProxyController::class.java)

  @GetMapping("/jisho")
  fun jishoProxy(@RequestParam word: String): ResponseEntity<String> {
    return try {
      val uri = UriComponentsBuilder.fromHttpUrl("https://jisho.org/api/v1/search/words")
        .queryParam("keyword", word)
        .encode()
        .build()
        .toUri()
      val response = restTemplate.getForObject(uri, String::class.java)
      ResponseEntity.ok(response)
    } catch (e: Exception) {
      logger.error("Error connecting to Jisho API", e)
      ResponseEntity.status(500).body("""{"error":"${e.message}"}""")
    }
  }

  @PostMapping("/anki")
  fun ankiProxy(@RequestBody body: ByteArray): ResponseEntity<String> {
    val ankiUrl = System.getenv("ANKI_CONNECT_URL") ?: "http://localhost:8765"
    return try {
      val headers = org.springframework.http.HttpHeaders()
      headers.contentType = org.springframework.http.MediaType.APPLICATION_JSON
      logger.info("Forwarding AnkiConnect request: ${String(body)}")
      val entity = org.springframework.http.HttpEntity<ByteArray>(body, headers)
      val response = restTemplate.exchange(ankiUrl, org.springframework.http.HttpMethod.POST, entity, String::class.java)
      ResponseEntity.ok(response.body)
    } catch (e: Exception) {
      logger.error("Error connecting to AnkiConnect", e)
      ResponseEntity.status(500).body("""{"error":"AnkiConnect not found. Is Anki running with AnkiConnect add-on?"}""")
    }
  }
}
