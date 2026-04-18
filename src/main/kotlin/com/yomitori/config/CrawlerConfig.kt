package com.yomitori.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration

@Configuration
class CrawlerConfig(
    @Value("\${yomitori.crawler.books-path:/app/data/books}")
    val booksPath: String,

    @Value("\${yomitori.crawler.covers-path:/app/data/covers}")
    val coversPath: String,

    @Value("\${yomitori.crawler.batch-size:100}")
    val batchSize: Int
)
