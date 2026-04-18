package com.yomitori.api

import org.springframework.data.domain.Page

data class PageResponse<T>(
    val content: List<T>,
    val pageable: PageableInfo,
    val totalElements: Long,
    val totalPages: Int,
    val last: Boolean,
    val first: Boolean,
    val missingIds: List<String> = emptyList()
) {
    companion object {
        fun <T> from(page: Page<T>, missingIds: List<String> = emptyList()): PageResponse<T> {
            return PageResponse(
                content = page.content,
                pageable = PageableInfo(
                    pageNumber = page.number,
                    pageSize = page.size
                ),
                totalElements = page.totalElements,
                totalPages = page.totalPages,
                last = page.isLast,
                first = page.isFirst,
                missingIds = missingIds
            )
        }
    }
}

data class PageableInfo(
    val pageNumber: Int,
    val pageSize: Int
)
