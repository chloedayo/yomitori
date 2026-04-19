package com.yomitori.model

import jakarta.persistence.*

@Entity
@Table(name = "word_frequency", indexes = [
    Index(name = "idx_word_freq_word", columnList = "word"),
    Index(name = "idx_word_freq_source", columnList = "source_id")
])
data class WordFrequency(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: Long? = null,

    @Column(nullable = false)
    val word: String,

    @Column(nullable = false)
    val reading: String,

    @Column(nullable = false)
    val frequency: Long,

    @Column(name = "source_id", nullable = false)
    val sourceId: Long
)
