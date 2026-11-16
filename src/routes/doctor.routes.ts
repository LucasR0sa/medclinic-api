import { Router, type RequestHandler } from 'express';
import type { DoctorController } from '../controllers/doctor.controller';
import { authorize } from '../middlewares/auth.middleware';

/** RN01: só a administração cadastra médico; todos consultam. */
export function doctorRoutes(controller: DoctorController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post('/doctors', authenticate, authorize('admin'), controller.create);
  router.get('/doctors', authenticate, controller.list);
  router.get('/doctors/:id', authenticate, controller.getById);
  return router;
}
