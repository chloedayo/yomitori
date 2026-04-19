import * as http from 'http';
import { initializeTokenizer, tokenizeText } from './utils/tokenizer.js';

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
