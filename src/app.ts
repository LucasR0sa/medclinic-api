import express, { type Express } from 'express';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware';
import { requestLogger } from './middlewares/request-logger.middleware';
import { authRoutes } from './routes/auth.routes';
import { healthRoutes } from './routes/health.routes';

/**
 * Monta o Express. A ORDEM dos app.use é a ordem em que a requisição
 * atravessa as peças, de cima para baixo.
 */
export function createApp(container: Container): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestLogger); // 1º: liga o cronômetro e gera o requestId
  app.use(express.json()); // transforma o corpo JSON em objeto (req.body)

  const api = express.Router();
  api.use(healthRoutes(container.healthController));
  api.use(authRoutes(container.authController));
  app.use('/api/v1', api); // todas as rotas do contrato vivem sob /api/v1

  app.use(notFoundHandler); // nenhuma rota respondeu → 404
  app.use(errorHandler); // sempre o último: traduz qualquer erro para o envelope

  return app;
}
