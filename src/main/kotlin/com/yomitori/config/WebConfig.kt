package com.yomitori.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.config.annotation.CorsRegistry
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class WebConfig(
    @Value("\${yomitori.crawler.books-path:/app/data/books}")
    private val booksPath: String,
    @Value("\${yomitori.cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private val allowedOrigins: String
) : WebMvcConfigurer {
  override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
    registry
      .addResourceHandler("/books/**")
      .addResourceLocations("file:$booksPath/")
  }

  override fun addCorsMappings(registry: CorsRegistry) {
    registry.addMapping("/api/**")
      .allowedOriginPatterns(*allowedOrigins.split(",").map { it.trim() }.toTypedArray())
      .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
      .allowCredentials(true)
      .maxAge(3600)
  }
}
