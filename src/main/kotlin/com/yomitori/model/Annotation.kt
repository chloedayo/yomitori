package com.yomitori.model

import jakarta.persistence.*
import java.util.*

@Entity
@Table(
    name = "annotations",
    indexes = [Index(name = "idx_annotations_book_id", columnList = "book_id")]
)
data class Annotation(
    @Id
    val id: String = UUID.randomUUID().toString(),

    @Column(name = "book_id", nullable = false)
    val bookId: String,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    val body: String,

    @Column(name = "char_pos", nullable = false)
    val charPos: Long,

    @Column(name = "created_at", nullable = false)
    val createdAt: Long,

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Long,
)
