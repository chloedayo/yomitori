package com.yomitori.repository

import com.yomitori.model.Author
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@DataJpaTest
class AuthorRepositoryTest {
    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Test
    fun testFindByNameIgnoreCase() {
        val author = Author(name = "J.K. Rowling")
        authorRepository.save(author)

        val found = authorRepository.findByNameIgnoreCase("j.k. rowling")
        assertNotNull(found)
        assertEquals("J.K. Rowling", found.name)
    }

    @Test
    fun testFindByNameContainingIgnoreCase() {
        authorRepository.save(Author(name = "J.K. Rowling"))
        authorRepository.save(Author(name = "Stephen King"))

        val results = authorRepository.findByNameContainingIgnoreCase("rowl")
        assertEquals(1, results.size)
        assertEquals("J.K. Rowling", results[0].name)
    }
}
