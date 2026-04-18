package com.yomitori.repository

import com.yomitori.model.Author
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface AuthorRepository : JpaRepository<Author, String> {
    fun findByNameIgnoreCase(name: String): Author?
    fun findByNameContainingIgnoreCase(query: String): List<Author>
    fun findAllByOrderByNameAsc(pageable: org.springframework.data.domain.Pageable): org.springframework.data.domain.Page<Author>
}
