package com.yomitori.model

import jakarta.persistence.*

@Entity
@Table(name = "book_authors")
@IdClass(BookAuthorId::class)
data class BookAuthor(
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id")
    val book: Book,

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    val author: Author
)
