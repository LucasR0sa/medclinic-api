import { Router, type RequestHandler } from 'express';
import type { AppointmentController } from '../controllers/appointment.controller';
import { authorize } from '../middlewares/auth.middleware';

/**
 * RN01: secretaria e administração marcam consulta. Consultar e mudar status
 * é para todo autenticado, mas o service aplica o filtro por posse e a
 * tabela de transições (RN12), que dependem da consulta, não só do perfil.
 */
export function appointmentRoutes(
  controller: AppointmentController,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.post('/appointments', authenticate, authorize('admin', 'secretary'), controller.create);
  router.get('/appointments', authenticate, controller.list);
  router.get('/appointments/:id', authenticate, controller.getById);
  router.patch('/appointments/:id/status', authenticate, controller.changeStatus);
  router.get('/doctors/:doctorId/calendar', authenticate, controller.getCalendar);
  return router;
}
