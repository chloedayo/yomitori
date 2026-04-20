package com.yomitori.repository

import com.yomitori.model.Annotation
import org.springframework.data.jpa.repository.JpaRepository

interface AnnotationRepository : JpaRepository<Annotation, String> {
    fun findByBookIdOrderByCreatedAtAsc(bookId: String): List<Annotation>
}
