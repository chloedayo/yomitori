ALTER TABLE word_frequency ADD COLUMN frequency_tag TEXT;
ALTER TABLE frequency_sources ADD COLUMN is_numeric INTEGER NOT NULL DEFAULT 1;
