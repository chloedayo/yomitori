package com.yomitori.dto

import com.yomitori.model.Author
import com.yomitori.model.Book

data class AuthorWithBooks(
    val id: String,
    val name: String,
    val createdAt: String,
    val books: List<Book>
) {
    companion object {
        fun from(author: Author, books: List<Book>): AuthorWithBooks {
            return AuthorWithBooks(
                id = author.id,
                name = author.name,
                createdAt = author.createdAt.toString(),
                books = books
            )
        }
    }
}
