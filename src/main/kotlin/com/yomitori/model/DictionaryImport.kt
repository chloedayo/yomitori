package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.*

@Entity
@Table(name = "dictionary_imports")
data class DictionaryImport(
    @Id
    val id: String = UUID.randomUUID().toString(),

    @Column(nullable = false)
    val name: String,

    @Column(nullable = false, unique = true)
    val path: String,

    @Column(nullable = false)
    val importedAt: LocalDateTime = LocalDateTime.now()
)
