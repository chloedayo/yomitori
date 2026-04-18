package com.yomitori.api

import com.yomitori.model.Author
import com.yomitori.repository.AuthorRepository
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class AuthorControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var authorRepository: AuthorRepository

    @Test
    fun testAutocompleteReturnsMatchingAuthors() {
        authorRepository.save(Author(name = "J.K. Rowling"))
        authorRepository.save(Author(name = "Stephen King"))

        mockMvc.perform(get("/api/authors/autocomplete?query=rowl"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].name").value("J.K. Rowling"))
    }

    @Test
    fun testAutocompleteEmptyQueryReturnsEmpty() {
        mockMvc.perform(get("/api/authors/autocomplete?query="))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
    }
}
