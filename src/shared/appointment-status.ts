/** RN11: o ciclo de vida da consulta. */
export const APPOINTMENT_STATUSES = ['scheduled', 'in_progress', 'done', 'cancelled'] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
