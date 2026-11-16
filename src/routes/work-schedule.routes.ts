import { Router, type RequestHandler } from 'express';
import type { WorkScheduleController } from '../controllers/work-schedule.controller';
import { authorize } from '../middlewares/auth.middleware';

/** RN01: a administração configura a escala; todos consultam. */
export function workScheduleRoutes(
  controller: WorkScheduleController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.put('/doctors/:doctorId/work-schedule', authenticate, authorize('admin'), controller.replace);
  router.get('/doctors/:doctorId/work-schedule', authenticate, controller.get);
  return router;
}
