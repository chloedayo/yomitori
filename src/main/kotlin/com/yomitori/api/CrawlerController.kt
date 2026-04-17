package com.yomitori.api

import com.yomitori.service.CrawlerService
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/crawler")
class CrawlerController(
    private val crawlerService: CrawlerService
) {
    @PostMapping("/trigger")
    fun triggerCrawler(): Map<String, String> {
        crawlerService.manualTriggerCrawl()
        return mapOf("status" to "Crawler triggered")
    }
}
