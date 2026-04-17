package com.yomitori.api

import com.yomitori.model.Book
import com.yomitori.service.BookService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(BookController::class)
class BookControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockBean
    private lateinit var bookService: BookService

    private val testBook = Book(
        id = "1",
        filepath = "/books/test.pdf",
        filename = "test.pdf",
        title = "Test Book",
        genre = "fiction",
        type = "novel",
        fileFormat = "pdf"
    )

    @BeforeEach
    fun setup() {
        whenever(bookService.getAllGenres()).thenReturn(listOf("fiction", "manga"))
        whenever(bookService.getAllTypes()).thenReturn(listOf("novel", "manga"))
    }

    @Test
    fun `should search books by title`() {
        val page = PageImpl(listOf(testBook), PageRequest.of(0, 20), 1)
        whenever(bookService.searchBooks("test", null, null, 0, 20)).thenReturn(page)

        mockMvc.perform(get("/api/books/search?title=test"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].id").value("1"))
            .andExpect(jsonPath("$.content[0].title").value("Test Book"))
    }

    @Test
    fun `should return genres list`() {
        mockMvc.perform(get("/api/books/genres"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0]").value("fiction"))
            .andExpect(jsonPath("$[1]").value("manga"))
    }

    @Test
    fun `should return types list`() {
        mockMvc.perform(get("/api/books/types"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0]").value("novel"))
            .andExpect(jsonPath("$[1]").value("manga"))
    }

    @Test
    fun `should get book by id`() {
        whenever(bookService.getBookById("1")).thenReturn(testBook)

        mockMvc.perform(get("/api/books/1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value("1"))
            .andExpect(jsonPath("$.title").value("Test Book"))
    }

    @Test
    fun `should update book tag`() {
        val updated = testBook.copy(genre = "updated-genre", manualOverride = true)
        whenever(bookService.updateBookTag("1", "updated-genre", null)).thenReturn(updated)

        mockMvc.perform(
            post("/api/books/1/tag")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"genre":"updated-genre"}""")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.genre").value("updated-genre"))
    }
}
