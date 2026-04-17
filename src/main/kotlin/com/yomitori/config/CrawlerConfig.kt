package com.yomitori.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration

@Configuration
class CrawlerConfig(
    @Value("\${yomitori.crawler.enabled:true}")
    val enabled: Boolean,

    @Value("\${yomitori.crawler.schedule:0 0 * * * ?}")
    val schedule: String,

    @Value("\${yomitori.crawler.books-path:/run/media/stella/stella-drive/books}")
    val booksPath: String,

    @Value("\${yomitori.crawler.covers-path:./covers}")
    val coversPath: String,

    @Value("\${yomitori.crawler.batch-size:100}")
    val batchSize: Int
)
