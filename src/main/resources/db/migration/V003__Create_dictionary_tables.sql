CREATE TABLE dictionary_imports (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    path          TEXT NOT NULL UNIQUE,
    imported_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dictionary_entries (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    dict_id       TEXT NOT NULL REFERENCES dictionary_imports(id),
    expression    TEXT NOT NULL,
    reading       TEXT NOT NULL,
    definition    TEXT NOT NULL
);

CREATE INDEX idx_dict_expression ON dictionary_entries(expression);
CREATE INDEX idx_dict_reading    ON dictionary_entries(reading);
