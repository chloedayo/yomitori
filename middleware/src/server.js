const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow all origins
app.use(cors());

// JSON parser
app.use(express.json({ limit: '10mb' }));

// Simple regex-based tokenizer (fallback while kuromoji has issues)
function simpleTokenize(text) {
  const words = text.match(/[\p{L}\p{N}]+/gu) || [];
  return words
    .filter(w => w.length > 1)
    .map(word => ({
      surface: word,
      baseForm: word,
      partOfSpeech: 'unknown',
      reading: undefined,
    }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tokenizer: 'simple-regex' });
});

// Tokenize endpoint (using simple regex for now)
app.post('/tokenize', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text parameter required' });
    }

    const tokens = simpleTokenize(text);
    res.json({ tokens });
  } catch (err) {
    console.error('Tokenize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Middleware listening on port ${PORT}`);
  console.log('Using simple regex tokenizer');
});
