ALTER TABLE books ADD COLUMN cover_extraction_status VARCHAR(20) DEFAULT 'PENDING';
CREATE INDEX idx_cover_extraction_status ON books(cover_extraction_status);
