package com.yomitori.model

import jakarta.persistence.*

@Entity
@Table(name = "save_state")
data class SaveState(
    @Id
    @Column(name = "client_id")
    val clientId: String,

    @Column(name = "reviews_json", columnDefinition = "TEXT")
    val reviewsJson: String? = null,

    @Column(name = "dictionary_json", columnDefinition = "TEXT")
    val dictionaryJson: String? = null,

    @Column(name = "saved_at", nullable = false)
    val savedAt: String
)
