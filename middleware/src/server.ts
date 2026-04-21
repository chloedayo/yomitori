import * as http from 'http';
import { initializeTokenizer, tokenizeText } from './utils/tokenizer.js';
import { deinflect, extractBaseForms } from './utils/deinflect.js';
import { mineWords } from './utils/miner.js';
import { canAddNotesForExpressions } from './utils/ankiClient.js';

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await initializeTokenizer();

    const server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const pathname = new URL(req.url!, `http://${req.headers.host}`).pathname;

      if (pathname === '/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', tokenizer: 'kuromoji' }));
        return;
      }

      if (pathname === '/tokenize' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { text } = data;

            if (!text || typeof text !== 'string') {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'text parameter required' }));
              return;
            }

            const tokens = tokenizeText(text);
            res.writeHead(200);
            res.end(JSON.stringify({ tokens }));
          } catch (err) {
            console.error('Tokenize error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        return;
      }

      if (pathname === '/deinflect' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { text } = JSON.parse(body);
            if (!text || typeof text !== 'string') {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'text parameter required' }));
              return;
            }
            const candidates = deinflect(text.trim());
            res.writeHead(200);
            res.end(JSON.stringify({ candidates }));
          } catch (err) {
            console.error('Deinflect error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        return;
      }

      if (pathname === '/extract-baseForms' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { text } = JSON.parse(body);
            if (!text || typeof text !== 'string') {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'text parameter required' }));
              return;
            }
            const baseForms = extractBaseForms(text.trim());
            res.writeHead(200);
            res.end(JSON.stringify({ baseForms }));
          } catch (err) {
            console.error('extract-baseForms error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        return;
      }

      if (pathname === '/mine-words' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { text, frequencySource, minFrequencyRank, maxFrequencyRank, frequencyTagFilter, bookTitle, primaryDictName } = JSON.parse(body);
            if (!text || typeof text !== 'string') {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'text parameter required' }));
              return;
            }
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
            console.log(`[mine-words] text=${text.length} chars, freq=${frequencySource ?? 'none'}, min=${minFrequencyRank ?? '-'}, max=${maxFrequencyRank ?? '-'}, tag=${frequencyTagFilter ?? '-'}, book=${bookTitle ?? 'unknown'}`);
            const result = await mineWords(
              text.trim(),
              backendUrl,
              frequencySource ?? null,
              minFrequencyRank ?? null,
              maxFrequencyRank ?? null,
              frequencyTagFilter ?? null,
              bookTitle ?? null,
              primaryDictName ?? null
            );
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('mine-words error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        return;
      }

      if (pathname === '/anki/can-add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { expressions, deckName } = JSON.parse(body);
            if (!Array.isArray(expressions) || expressions.length === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'expressions array required' }));
              return;
            }
            const result = await canAddNotesForExpressions(expressions, deckName || '自動');
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('anki/can-add error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(PORT, () => {
      console.log(`🚀 Middleware listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start middleware:', err);
    process.exit(1);
  }
}

start();
