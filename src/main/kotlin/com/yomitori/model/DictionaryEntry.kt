package com.yomitori.model

import jakarta.persistence.*

@Entity
@Table(name = "dictionary_entries", indexes = [
    Index(name = "idx_dict_expression", columnList = "expression"),
    Index(name = "idx_dict_reading", columnList = "reading")
])
data class DictionaryEntry(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: Long? = null,

    @Column(nullable = false)
    val dictId: String,

    @Column(nullable = false)
    val expression: String,

    @Column(nullable = false)
    val reading: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    val definition: String
)
