package com.yomitori.model

import java.io.Serializable

data class BookAuthorId(
    val book: String = "",
    val author: String = ""
) : Serializable
