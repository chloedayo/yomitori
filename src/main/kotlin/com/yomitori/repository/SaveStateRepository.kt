package com.yomitori.repository

import com.yomitori.model.SaveState
import org.springframework.data.jpa.repository.JpaRepository

interface SaveStateRepository : JpaRepository<SaveState, String>
