import { Router, type RequestHandler } from 'express';
import type { MedicalRecordController } from '../controllers/medical-record.controller';
import { authorize } from '../middlewares/auth.middleware';

/**
 * Duas barreiras: a ROTA confere o perfil (escrever: só doctor; ler: doctor
 * ou admin) e o SERVICE confere o vínculo com o paciente (RN14).
 */
export function medicalRecordRoutes(
  controller: MedicalRecordController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.post(
    '/patients/:patientId/medical-records',
    authenticate,
    authorize('doctor'),
    controller.create,
  );
  router.get(
    '/patients/:patientId/medical-records',
    authenticate,
    authorize('doctor', 'admin'),
    controller.list,
  );
  return router;
}
