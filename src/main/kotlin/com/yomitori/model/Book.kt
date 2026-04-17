package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "books")
data class Book(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: String,

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
