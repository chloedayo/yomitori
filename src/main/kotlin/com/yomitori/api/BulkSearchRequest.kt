package com.yomitori.api

data class BulkSearchRequest(
    val bookIds: List<String>,
    val page: Int = 0,
    val pageSize: Int = 20
)
