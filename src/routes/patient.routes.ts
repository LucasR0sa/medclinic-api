import { Router, type RequestHandler } from 'express';
import type { PatientController } from '../controllers/patient.controller';
import { authorize } from '../middlewares/auth.middleware';

/** RN01: secretaria e administração cadastram; só a administração remove; todos consultam. */
export function patientRoutes(controller: PatientController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post('/patients', authenticate, authorize('admin', 'secretary'), controller.create);
  router.get('/patients', authenticate, controller.list);
  router.get('/patients/:id', authenticate, controller.getById);
  router.patch('/patients/:id', authenticate, authorize('admin', 'secretary'), controller.update);
  router.delete('/patients/:id', authenticate, authorize('admin'), controller.remove);
  return router;
}
