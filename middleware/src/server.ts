import * as restify from 'restify';
import corsMiddleware from 'restify-cors-middleware';
import { registerHealthResource } from './resources/health/health.resource';
import { registerTokenizeResource } from './resources/tokenize/tokenize.resource';

const PORT = process.env.PORT || 3000;

const server = restify.createServer({
  name: 'yomitori-middleware',
});

// CORS
const cors = corsMiddleware({
  origins: ['*'],
});

server.pre(cors.preflight);
server.use(cors.actual);

// Middleware
server.use(restify.plugins.jsonBodyParser());
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());

// Register resources
registerHealthResource(server);
registerTokenizeResource(server);

// Start
server.listen(PORT, () => {
  console.log(`🚀 Middleware listening on port ${PORT}`);
});
