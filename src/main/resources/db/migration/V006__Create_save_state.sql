CREATE TABLE IF NOT EXISTS save_state (
    client_id TEXT PRIMARY KEY,
    reviews_json TEXT,
    dictionary_json TEXT,
    saved_at TEXT NOT NULL
);
