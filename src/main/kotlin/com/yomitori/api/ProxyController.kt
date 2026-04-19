package com.yomitori.api

import org.springframework.web.bind.annotation.*
import org.springframework.http.ResponseEntity
import org.springframework.web.client.RestTemplate
import java.net.URLEncoder

@RestController
@RequestMapping("/api/proxy")
class ProxyController(private val restTemplate: RestTemplate) {

  @GetMapping("/jisho")
  fun jishoProxy(@RequestParam word: String): ResponseEntity<String> {
    return try {
      val encodedWord = URLEncoder.encode(word, "UTF-8")
      val url = "https://jisho.org/api/v1/search/words?keyword=$encodedWord"
      val response = restTemplate.getForObject(url, String::class.java)
      ResponseEntity.ok(response)
    } catch (e: Exception) {
      ResponseEntity.status(500).body("""{"error":"${e.message}"}""")
    }
  }
}
