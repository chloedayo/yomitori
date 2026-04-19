package com.yomitori.repository

import com.yomitori.model.DictionaryEntry
import org.springframework.data.jpa.repository.JpaRepository

interface DictionaryEntryRepository : JpaRepository<DictionaryEntry, Long> {
    fun findByExpression(expression: String): List<DictionaryEntry>
    fun findByReading(reading: String): List<DictionaryEntry>
    fun deleteByDictId(dictId: String)
    fun countByDictId(dictId: String): Long
}
