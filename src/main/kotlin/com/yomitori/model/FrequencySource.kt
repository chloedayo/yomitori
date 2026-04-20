package com.yomitori.model

import jakarta.persistence.*
import java.time.LocalDateTime

@Entity
@Table(name = "frequency_sources")
data class FrequencySource(
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    val id: Long? = null,

    @Column(nullable = false, unique = true)
    val name: String,

    @Column(nullable = false)
    val path: String,

    @Column(nullable = false)
    val isNumeric: Boolean = true,

    @Column(nullable = false)
    val loadedAt: LocalDateTime = LocalDateTime.now()
)
