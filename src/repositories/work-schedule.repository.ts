import type { WorkShift } from '../entities/work-shift.entity';

export interface NewWorkShift {
  weekDay: number;
  startMinute: number;
  endMinute: number;
  slotDurationMinutes: number;
}

/** Porta da escala de trabalho. Os turnos voltam ordenados por dia e hora de início. */
export interface WorkScheduleRepository {
  findByDoctor(doctorId: number): Promise<WorkShift[]>;
  /** Substitui a escala inteira (apaga a antiga e grava a nova) numa única transação. */
  replace(doctorId: number, shifts: NewWorkShift[]): Promise<WorkShift[]>;
}

/** Ordem de exibição: dia da semana, depois início do turno. */
export function sortShifts<T extends NewWorkShift>(shifts: T[]): T[] {
  return [...shifts].sort((a, b) => a.weekDay - b.weekDay || a.startMinute - b.startMinute);
}
