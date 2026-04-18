package com.yomitori.repository

import com.yomitori.model.BookAuthor
import com.yomitori.model.BookAuthorId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface BookAuthorRepository : JpaRepository<BookAuthor, BookAuthorId> {
    fun findByBookId(bookId: String): List<BookAuthor>
    fun deleteByBookId(bookId: String)
}
