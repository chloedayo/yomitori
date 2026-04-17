package com.yomitori.model

enum class CoverExtractionStatus {
    PENDING,    // Not yet attempted
    FOUND,      // Cover successfully extracted
    NOT_FOUND   // Extraction attempted on all strategies, no cover found
}
