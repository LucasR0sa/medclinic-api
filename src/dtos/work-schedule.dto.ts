import { z } from 'zod';
import type { WorkShift } from '../entities/work-shift.entity';
import { clockTimeSchema, minutesToClock } from '../shared/clinic-time';

const shiftSchema = z
  .object({
    weekDay: z.number().int().min(0).max(6), // 0 = domingo, como o Date.getDay()
    startTime: clockTimeSchema,
    endTime: clockTimeSchema,
    slotDurationMinutes: z.number().int().positive().max(1440),
  })
  // "HH:MM" com zero à esquerda pode ser comparado como texto: "08:00" < "12:00".
  .refine((shift) => shift.startTime < shift.endTime, {
    message: 'startTime deve ser menor que endTime',
    path: ['endTime'],
  });

/** PUT substitui a escala inteira; "shifts": [] apaga a escala. */
export const workScheduleSchema = z.object({ shifts: z.array(shiftSchema) });

export type WorkScheduleInput = z.infer<typeof workScheduleSchema>;
export type ShiftInput = WorkScheduleInput['shifts'][number];

export interface ShiftResponse {
  weekDay: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export interface WorkScheduleResponse {
  shifts: ShiftResponse[];
}

export function toShiftResponse(shift: WorkShift): ShiftResponse {
  return {
    weekDay: shift.weekDay,
    startTime: minutesToClock(shift.startMinute),
    endTime: minutesToClock(shift.endMinute),
    slotDurationMinutes: shift.slotDurationMinutes,
  };
}
