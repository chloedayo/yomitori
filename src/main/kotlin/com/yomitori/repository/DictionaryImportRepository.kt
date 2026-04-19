package com.yomitori.repository

import com.yomitori.model.DictionaryImport
import org.springframework.data.jpa.repository.JpaRepository

interface DictionaryImportRepository : JpaRepository<DictionaryImport, String> {
    fun findByPath(path: String): DictionaryImport?
}
