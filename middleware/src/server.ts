import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { initializeTokenizer, tokenizeText } from './utils/tokenizer.js';
import { deinflect, extractBaseForms } from './utils/deinflect.js';
import { mineWords } from './utils/miner.js';
import { canAddNotesForExpressions } from './utils/ankiClient.js';

const PORT = Number(process.env.PORT) || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const STATIC_DIR = process.env.YOMITORI_STATIC_DIR;

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
};

function contentTypeFor(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

async function proxyToBackend(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
  const targetUrl = `${BACKEND_URL}${req.url}`;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v !== undefined && k !== 'host' && k !== 'connection') {
      headers[k] = Array.isArray(v) ? v.join(',') : v;
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
    });
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch (err) {
    console.error(`[proxy] ${pathname} failed:`, err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Backend unavailable' }));
  }
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): boolean {
  if (!STATIC_DIR) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;

  const relPath = pathname === '/' ? '/index.html' : pathname;
  const normalized = path.posix.normalize(relPath);
  if (normalized.includes('..')) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return true;
  }

  const filePath = path.join(STATIC_DIR, normalized);
  const indexPath = path.join(STATIC_DIR, 'index.html');

  const tryServe = (p: string, fallbackToIndex: boolean) => {
    fs.stat(p, (err, stat) => {
      if (err || !stat.isFile()) {
        if (fallbackToIndex && p !== indexPath) {
          tryServe(indexPath, false);
          return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      res.setHeader('Content-Type', contentTypeFor(p));
      res.setHeader('Content-Length', stat.size);
      if (req.method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }
      res.writeHead(200);
      fs.createReadStream(p).pipe(res);
    });
  };

  tryServe(filePath, true);
  return true;
}

async function start() {
  try {
    await initializeTokenizer();

    const server = http.createServer((req, res) => {
      const pathname = new URL(req.url!, `http://${req.headers.host}`).pathname;

      // API proxy to backend — forward with original headers/body, no CORS rewriting needed (same origin)
      if (pathname.startsWith('/api/')) {
        void proxyToBackend(req, res, pathname);
        return;
      }

      // CORS headers for middleware-owned routes (still needed for non-browser callers)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

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

      // Try static file serving last (frontend dist — SPA with index.html fallback)
      if (serveStatic(req, res, pathname)) return;

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    const HOST = process.env.HOST || '127.0.0.1';
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Middleware listening on ${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start middleware:', err);
    process.exit(1);
  }
}

start();
