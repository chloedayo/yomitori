package com.yomitori.api

import com.fasterxml.jackson.databind.ObjectMapper
import com.yomitori.model.Annotation
import com.yomitori.repository.AnnotationRepository
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.util.Optional

@WebMvcTest(AnnotationController::class)
class AnnotationControllerTest {
    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var objectMapper: ObjectMapper
    @MockBean private lateinit var annotationRepository: AnnotationRepository

    private val testAnnotation = Annotation(
        id = "ann-1",
        bookId = "book-1",
        title = "Chapter 1",
        body = "## Thoughts\n\nInteresting...",
        charPos = 1234L,
        createdAt = 1000L,
        updatedAt = 1000L,
    )

    @Test
    fun `should return annotations for book`() {
        whenever(annotationRepository.findByBookIdOrderByCreatedAtAsc("book-1"))
            .thenReturn(listOf(testAnnotation))

        mockMvc.perform(get("/api/annotations?bookId=book-1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value("ann-1"))
            .andExpect(jsonPath("$[0].title").value("Chapter 1"))
    }

    @Test
    fun `should create annotation`() {
        whenever(annotationRepository.save(any<Annotation>())).thenReturn(testAnnotation)

        val request = mapOf(
            "id" to "ann-1",
            "bookId" to "book-1",
            "title" to "Chapter 1",
            "body" to "## Thoughts\n\nInteresting...",
            "charPos" to 1234,
            "createdAt" to 1000,
            "updatedAt" to 1000,
        )

        mockMvc.perform(
            post("/api/annotations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value("ann-1"))
    }

    @Test
    fun `should update annotation`() {
        val updated = testAnnotation.copy(title = "Updated", updatedAt = 2000L)
        whenever(annotationRepository.findById("ann-1")).thenReturn(Optional.of(testAnnotation))
        whenever(annotationRepository.save(any<Annotation>())).thenReturn(updated)

        val request = mapOf("title" to "Updated", "body" to "## Thoughts", "charPos" to 1234, "updatedAt" to 2000)

        mockMvc.perform(
            patch("/api/annotations/ann-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.title").value("Updated"))
    }

    @Test
    fun `should return 404 when updating nonexistent annotation`() {
        whenever(annotationRepository.findById("missing")).thenReturn(Optional.empty())

        val request = mapOf("title" to "x", "body" to "x", "charPos" to 0, "updatedAt" to 0)

        mockMvc.perform(
            patch("/api/annotations/missing")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isNotFound)
    }

    @Test
    fun `should delete annotation`() {
        doNothing().whenever(annotationRepository).deleteById("ann-1")

        mockMvc.perform(delete("/api/annotations/ann-1"))
            .andExpect(status().isNoContent)
    }
}
