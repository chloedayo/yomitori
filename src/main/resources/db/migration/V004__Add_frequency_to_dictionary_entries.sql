CREATE TABLE frequency_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    loaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE word_frequency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL,
    reading TEXT NOT NULL,
    frequency BIGINT NOT NULL,
    source_id INTEGER NOT NULL REFERENCES frequency_sources(id)
);

CREATE INDEX idx_word_freq_word ON word_frequency(word);
CREATE INDEX idx_word_freq_source ON word_frequency(source_id);
