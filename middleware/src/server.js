const express = require('express');
const kuromoji = require('kuromoji');

const app = express();
const PORT = process.env.PORT || 3000;

let tokenizer = null;
let initPromise = null;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Initialize tokenizer on startup (callback-based)
function initializeTokenizer() {
  if (tokenizer) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      const builder = kuromoji.builder({ dicPath: '/app/node_modules/kuromoji/dict' });
      builder.build(function(err, built) {
        if (err) {
          console.error('✗ Failed to initialize kuromoji:', err.message);
          reject(err);
        } else {
          tokenizer = built;
          console.log('✓ Kuromoji tokenizer initialized');
          resolve();
        }
      });
    } catch (err) {
      console.error('✗ Error building tokenizer:', err.message);
      reject(err);
    }
  });

  return initPromise;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', tokenizer: tokenizer ? 'ready' : 'initializing' });
});

// Tokenize endpoint
app.post('/tokenize', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid input: text required' });
    }

    // Ensure tokenizer is initialized
    if (!tokenizer) {
      await initializeTokenizer();
    }

    const tokens = tokenizer.tokenize(text);

    // Filter to meaningful parts of speech
    const filtered = tokens
      .filter(token => {
        const pos = token.pos[0];
        return (pos === '名詞' || pos === '動詞' || pos === '形容詞') && token.surface.length > 1;
      })
      .map(token => ({
        surface: token.surface,
        baseForm: token.basic_form || token.surface,
        partOfSpeech: token.pos[0],
        reading: token.reading_form,
      }));

    res.json({ tokens: filtered });
  } catch (err) {
    console.error('Tokenization error:', err);
    res.status(500).json({ error: 'Tokenization failed', details: err.message });
  }
});

// Start server
async function start() {
  try {
    // Initialize tokenizer (will log success)
    initializeTokenizer();

    app.listen(PORT, () => {
      console.log(`🚀 Middleware service listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
