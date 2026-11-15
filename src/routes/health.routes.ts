import { Router } from 'express';
import type { HealthController } from '../controllers/health.controller';

/** Rota liga URL → (middlewares) → método do controller. Nada além disso. */
export function healthRoutes(controller: HealthController): Router {
  const router = Router();
  router.get('/health', controller.check);
  return router;
}
