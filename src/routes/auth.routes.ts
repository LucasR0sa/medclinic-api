import { Router } from 'express';
import type { AuthController } from '../controllers/auth.controller';

/** Rota pública: é aqui que se consegue o crachá. */
export function authRoutes(controller: AuthController): Router {
  const router = Router();
  router.post('/auth/login', controller.login);
  return router;
}
