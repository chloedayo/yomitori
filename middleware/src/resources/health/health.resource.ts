import * as restify from 'restify';

export function registerHealthResource(server: restify.Server) {
  server.get('/health', (req: restify.Request, res: restify.Response, next: restify.Next) => {
    res.json({
      status: 'ok',
      tokenizer: 'simple-regex',
    });
    return next();
  });
}
