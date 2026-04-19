package com.yomitori.repository

import com.yomitori.model.WordFrequency
import org.springframework.data.jpa.repository.JpaRepository

interface WordFrequencyRepository : JpaRepository<WordFrequency, Long> {
    fun findByWord(word: String): List<WordFrequency>
    fun deleteBySourceId(sourceId: Long)
}
