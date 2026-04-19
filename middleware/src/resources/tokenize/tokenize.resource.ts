import * as restify from 'restify';
import { simpleTokenize } from '../../utils/tokenizer';

interface TokenizeRequest {
  text: string;
}

export function registerTokenizeResource(server: restify.Server) {
  server.post('/tokenize', (req: restify.Request, res: restify.Response, next: restify.Next) => {
    try {
      const { text } = req.body as TokenizeRequest;

      if (!text || typeof text !== 'string') {
        res.status(400);
        res.json({ error: 'text parameter required' });
        return next();
      }

      const tokens = simpleTokenize(text);
      res.json({ tokens });
      return next();
    } catch (err) {
      console.error('Tokenize error:', err);
      res.status(500);
      res.json({ error: (err as Error).message });
      return next();
    }
  });
}
