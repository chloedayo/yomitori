package com.yomitori.repository

import com.yomitori.model.FrequencySource
import org.springframework.data.jpa.repository.JpaRepository

interface FrequencySourceRepository : JpaRepository<FrequencySource, Long> {
    fun findByName(name: String): FrequencySource?
}
