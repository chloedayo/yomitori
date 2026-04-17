package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "books")
data class Book(
    @Id
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "book_id_gen")
    @TableGenerator(name = "book_id_gen", table = "id_gen", pkColumnName = "id_key", valueColumnName = "id_val", pkColumnValue = "book_id")
    val id: Long = 0,

    @Column(unique = true, nullable = false)
    val filepath: String,

    @Column(nullable = false)
    val filename: String,

    @Column(nullable = false)
    val title: String,

    @Column(nullable = true)
    val genre: String? = null,

    @Column(nullable = false)
    val type: String, // manga, novel, light-novel, textbook, other

    @Column(nullable = true)
    val coverPath: String? = null,

    @Column(nullable = false)
    val fileFormat: String, // pdf, epub, cbr, cbz

    @Column(nullable = false)
    val lastIndexed: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    val isDeleted: Boolean = false,

    @Column(nullable = false)
    val manualOverride: Boolean = false,

    @Column(nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),

    @Column(nullable = false)
    val updatedAt: LocalDateTime = LocalDateTime.now()
)
