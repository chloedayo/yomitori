package com.yomitori.config

import org.slf4j.LoggerFactory
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.stereotype.Component
import javax.sql.DataSource

@Component
class SchemaMigration(private val dataSource: DataSource) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @EventListener(ApplicationReadyEvent::class)
    fun migrateSchema() {
        logger.info("Starting SchemaMigration...")
        try {
            dataSource.connection.use { conn ->
                conn.createStatement().use { stmt ->
                    val result = stmt.executeQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='books'")
                    if (result.next()) {
                        val sql = result.getString("sql")
                        logger.info("Current books table SQL: {}", sql.take(100))
                        if (sql.contains("UNIQUE")) {
                            logger.info("Found UNIQUE constraint, removing...")
                            stmt.execute("CREATE TABLE books_new (id TEXT PRIMARY KEY,filepath TEXT NOT NULL,filename TEXT NOT NULL,title TEXT NOT NULL,genre TEXT,type TEXT NOT NULL CHECK (type IN ('manga', 'novel', 'light-novel', 'textbook', 'other')),cover_path TEXT,file_format TEXT NOT NULL CHECK (file_format IN ('pdf', 'epub', 'cbr', 'cbz')),last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,is_deleted INTEGER DEFAULT 0,manual_override INTEGER DEFAULT 0,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
                            stmt.execute("INSERT INTO books_new SELECT * FROM books")
                            stmt.execute("DROP TABLE books")
                            stmt.execute("ALTER TABLE books_new RENAME TO books")
                            stmt.execute("CREATE INDEX idx_title ON books(title)")
                            stmt.execute("CREATE INDEX idx_genre ON books(genre)")
                            stmt.execute("CREATE INDEX idx_type ON books(type)")
                            stmt.execute("CREATE INDEX idx_filepath ON books(filepath)")
                            stmt.execute("CREATE INDEX idx_is_deleted ON books(is_deleted)")
                            logger.info("Removed UNIQUE constraint from books.filepath")
                        } else {
                            logger.info("No UNIQUE constraint found, schema OK")
                        }
                    } else {
                        logger.warn("books table not found")
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Schema migration error", e)
        }
    }
}
