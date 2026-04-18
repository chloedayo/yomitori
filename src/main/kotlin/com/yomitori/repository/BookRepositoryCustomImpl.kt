package com.yomitori.repository

import com.yomitori.model.Book
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Repository

@Repository
class BookRepositoryCustomImpl(
    @PersistenceContext private val entityManager: EntityManager
) : BookRepositoryCustom {

    override fun searchBooks(title: String, genre: String?, type: String?, pageable: Pageable): Page<Book> {
        val cb = entityManager.criteriaBuilder
        val query = cb.createQuery(Book::class.java)
        val root = query.from(Book::class.java)
        val predicates = mutableListOf<Predicate>()

        predicates.add(cb.equal(root.get<Boolean>("isDeleted"), false))

        if (title.isNotBlank()) {
            predicates.add(cb.like(cb.lower(root.get("title")), "%${title.lowercase()}%"))
        }
        if (!genre.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("genre"), genre))
        }
        if (!type.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("type"), type))
        }

        query.where(*predicates.toTypedArray())
        query.orderBy(cb.desc(root.get<Any>("createdAt")))

        val typedQuery = entityManager.createQuery(query)
        val total = typedQuery.resultList.size.toLong()
        typedQuery.firstResult = pageable.offset.toInt()
        typedQuery.maxResults = pageable.pageSize

        return PageImpl(typedQuery.resultList, pageable, total)
    }

    override fun searchBooksByAuthor(title: String, genre: String?, type: String?, author: String, pageable: Pageable): Page<Book> {
        val cb = entityManager.criteriaBuilder
        val query = cb.createQuery(Book::class.java)
        val root = query.from(Book::class.java)
        val authorJoin = root.join<Any, Any>("authors")
        val predicates = mutableListOf<Predicate>()

        predicates.add(cb.equal(root.get<Boolean>("isDeleted"), false))
        predicates.add(cb.like(cb.lower(authorJoin.get("name")), "%${author.lowercase()}%"))

        if (title.isNotBlank()) {
            predicates.add(cb.like(cb.lower(root.get("title")), "%${title.lowercase()}%"))
        }
        if (!genre.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("genre"), genre))
        }
        if (!type.isNullOrBlank()) {
            predicates.add(cb.equal(root.get<String>("type"), type))
        }

        query.where(*predicates.toTypedArray())
        query.distinct(true)
        query.orderBy(cb.desc(root.get<Any>("createdAt")))

        val typedQuery = entityManager.createQuery(query)
        val total = typedQuery.resultList.size.toLong()
        typedQuery.firstResult = pageable.offset.toInt()
        typedQuery.maxResults = pageable.pageSize

        return PageImpl(typedQuery.resultList, pageable, total)
    }
}
