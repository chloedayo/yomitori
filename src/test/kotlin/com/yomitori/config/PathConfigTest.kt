package com.yomitori.config

import org.junit.jupiter.api.Test
import java.io.File
import kotlin.test.assertTrue

class PathConfigTest {

    private val props = File("src/main/resources/application.properties").readText()

    @Test
    fun `application properties use BOOKS_PATH env var with fallback`() {
        assertTrue(
            props.contains("\${BOOKS_PATH:"),
            "application.properties must use \${BOOKS_PATH:...} placeholder"
        )
    }

    @Test
    fun `application properties use DATA_DIR env var with fallback`() {
        assertTrue(
            props.contains("\${DATA_DIR:"),
            "application.properties must use \${DATA_DIR:...} placeholder"
        )
    }

    @Test
    fun `SQLite url uses DATA_DIR`() {
        assertTrue(
            props.contains("jdbc:sqlite:\${DATA_DIR:"),
            "datasource url must use DATA_DIR env var"
        )
    }

    @Test
    fun `CORS origins are configurable via env var`() {
        assertTrue(
            props.contains("\${CORS_ORIGINS:"),
            "CORS origins must be configurable via env var"
        )
    }
}
