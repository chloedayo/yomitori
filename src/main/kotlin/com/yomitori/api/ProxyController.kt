package com.yomitori.api

import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import org.springframework.web.client.RestTemplate
import org.springframework.web.util.UriComponentsBuilder

@RestController
@RequestMapping("/api/proxy")
class ProxyController(private val restTemplate: RestTemplate) {

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
      ResponseEntity.status(500).body("""{"error":"${e.message}"}""")
    }
  }
}
