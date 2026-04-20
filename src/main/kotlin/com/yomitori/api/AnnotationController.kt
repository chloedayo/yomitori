package com.yomitori.api

import com.yomitori.model.Annotation
import com.yomitori.repository.AnnotationRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

data class CreateAnnotationRequest(
    val id: String,
    val bookId: String,
    val title: String,
    val body: String,
    val charPos: Long,
    val createdAt: Long,
    val updatedAt: Long,
)

data class UpdateAnnotationRequest(
    val title: String,
    val body: String,
    val charPos: Long,
    val updatedAt: Long,
)

@RestController
@RequestMapping("/api/annotations")
class AnnotationController(
    private val annotationRepository: AnnotationRepository,
) {
    @GetMapping
    fun getByBookId(@RequestParam bookId: String): ResponseEntity<List<Annotation>> =
        ResponseEntity.ok(annotationRepository.findByBookIdOrderByCreatedAtAsc(bookId))

    @PostMapping
    fun create(@RequestBody req: CreateAnnotationRequest): ResponseEntity<Annotation> {
        val annotation = Annotation(
            id = req.id,
            bookId = req.bookId,
            title = req.title,
            body = req.body,
            charPos = req.charPos,
            createdAt = req.createdAt,
            updatedAt = req.updatedAt,
        )
        return ResponseEntity.ok(annotationRepository.save(annotation))
    }

    @PatchMapping("/{id}")
    fun update(@PathVariable id: String, @RequestBody req: UpdateAnnotationRequest): ResponseEntity<Annotation> {
        val existing = annotationRepository.findById(id).orElse(null)
            ?: return ResponseEntity.notFound().build()
        val updated = existing.copy(
            title = req.title,
            body = req.body,
            charPos = req.charPos,
            updatedAt = req.updatedAt,
        )
        return ResponseEntity.ok(annotationRepository.save(updated))
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): ResponseEntity<Void> {
        annotationRepository.deleteById(id)
        return ResponseEntity.noContent().build()
    }
}
