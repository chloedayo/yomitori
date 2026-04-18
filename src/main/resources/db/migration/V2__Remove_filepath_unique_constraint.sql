-- Remove UNIQUE constraint from filepath column
-- SQLite doesn't support direct ALTER TABLE to drop constraints,
-- so we recreate the table without the UNIQUE constraint

CREATE TABLE books_new (
    id TEXT PRIMARY KEY,
    filepath TEXT NOT NULL,
    filename TEXT NOT NULL,
    title TEXT NOT NULL,
    genre TEXT,
    type TEXT NOT NULL CHECK (type IN ('manga', 'novel', 'light-novel', 'textbook', 'other')),
    cover_path TEXT,
    file_format TEXT NOT NULL CHECK (file_format IN ('pdf', 'epub', 'cbr', 'cbz')),
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0,
    manual_override INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO books_new SELECT * FROM books;

DROP TABLE books;

ALTER TABLE books_new RENAME TO books;

CREATE INDEX idx_title ON books(title);
CREATE INDEX idx_genre ON books(genre);
CREATE INDEX idx_type ON books(type);
CREATE INDEX idx_filepath ON books(filepath);
CREATE INDEX idx_is_deleted ON books(is_deleted);
