import { Router, type RequestHandler } from 'express';
import type { UserController } from '../controllers/user.controller';
import { authorize } from '../middlewares/auth.middleware';

/** URL → catraca (authenticate) → porta (authorize) → controller. */
export function userRoutes(controller: UserController, authenticate: RequestHandler): Router {
  const router = Router();
  router.get('/users/me', authenticate, controller.me);
  router.post('/users', authenticate, authorize('admin'), controller.create); // RF13
  return router;
}
