import { z } from 'zod';
import type { Appointment } from '../entities/appointment.entity';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../shared/appointment-status';
import { calendarDateSchema, daysBetween } from '../shared/clinic-time';
import { paginationSchema } from '../shared/pagination';
import { idSchema } from '../shared/params';

/**
 * O cliente manda só o início. Instante em ISO 8601 COM fuso explícito
 * ("2026-10-13T08:00:00-03:00" ou "...Z"); sem fuso → 400.
 */
const bodyIdSchema = z.number().int().positive().max(2_147_483_647); // no corpo, é número JSON

export const createAppointmentSchema = z.object({
  doctorId: bodyIdSchema,
  patientId: bodyIdSchema,
  startsAt: z.iso
    .datetime({ offset: true, message: 'use ISO 8601 com fuso, ex.: 2026-10-13T08:00:00-03:00' })
    .transform((value) => new Date(value)),
});

export const listAppointmentsQuerySchema = paginationSchema.extend({
  doctorId: idSchema.optional(),
  patientId: idSchema.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: calendarDateSchema.optional(),
  to: calendarDateSchema.optional(),
});

export const changeStatusSchema = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

/** Agenda: período inclusivo, de no máximo 31 dias. */
export const calendarQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .refine(({ from, to }) => from <= to, { message: 'from não pode ser posterior a to', path: ['from'] })
  .refine(({ from, to }) => daysBetween(from, to) <= 31, {
    message: 'o intervalo máximo é de 31 dias',
    path: ['to'],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export interface AppointmentResponse {
  id: number;
  doctorId: number;
  patientId: number;
  startsAt: Date; // devolvido em UTC com Z: "2026-10-13T11:00:00.000Z"
  endsAt: Date;
  status: AppointmentStatus;
}

export function toAppointmentResponse(appointment: Appointment): AppointmentResponse {
  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    status: appointment.status,
  };
}
