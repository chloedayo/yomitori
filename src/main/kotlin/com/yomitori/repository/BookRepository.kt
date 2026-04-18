package com.yomitori.repository

import com.yomitori.model.Book
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.time.LocalDateTime
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import jakarta.persistence.criteria.Predicate

interface BookRepositoryCustom {
    fun searchBooks(title: String, genre: String?, type: String?, pageable: Pageable): Page<Book>
    fun searchBooksByAuthor(title: String, genre: String?, type: String?, author: String, pageable: Pageable): Page<Book>
}

@Repository
interface BookRepository : JpaRepository<Book, String>, BookRepositoryCustom {
    @Query("SELECT b FROM Book b WHERE b.isDeleted = false AND LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%')) ORDER BY b.title ASC")
    fun searchByTitle(
        @Param("title") title: String,
        pageable: Pageable
    ): Page<Book>

    @Query("SELECT b FROM Book b WHERE b.isDeleted = false AND LOWER(b.title) LIKE LOWER(CONCAT('%', :title, '%')) AND (:genre IS NULL OR LOWER(b.genre) = LOWER(:genre)) AND (:type IS NULL OR LOWER(b.type) = LOWER(:type)) ORDER BY b.title ASC")
    fun searchByTitleGenreType(
        @Param("title") title: String,
        @Param("genre") genre: String?,
        @Param("type") type: String?,
        pageable: Pageable
    ): Page<Book>

    @Query("SELECT DISTINCT b.genre FROM Book b WHERE b.isDeleted = false AND b.genre IS NOT NULL ORDER BY b.genre ASC")
    fun findAllGenres(): List<String>

    @Query("SELECT DISTINCT b.type FROM Book b WHERE b.isDeleted = false ORDER BY b.type ASC")
    fun findAllTypes(): List<String>

    @Query("SELECT b FROM Book b WHERE b.isDeleted = false AND b.filepath = :filepath")
    fun findByFilepath(@Param("filepath") filepath: String): Book?

    @Query("SELECT b FROM Book b WHERE b.isDeleted = false AND b.lastIndexed < :timestamp")
    fun findNotIndexedSince(@Param("timestamp") timestamp: LocalDateTime): List<Book>
}
