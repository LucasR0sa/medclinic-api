import { z } from 'zod';

/**
 * RN06: o horário da escala é hora de RELÓGIO da clínica, sem fuso.
 * Instantes (startsAt) são guardados em UTC; para saber "que dia da semana
 * e que horas eram na clínica", convertemos com o fuso abaixo.
 */
export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

const WEEK_DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const localPartsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const offsetFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  timeZoneName: 'longOffset', // ex.: "GMT-03:00"
});

// ---------- Hora de relógio "HH:MM" ----------

export const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'use o formato HH:MM (24 horas)');

/** "08:30" → 510 (minutos desde a meia-noite). */
export function clockToMinutes(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

/** 510 → "08:30". */
export function minutesToClock(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ---------- Instante → relógio da clínica ----------

export interface ClinicLocalTime {
  /** 0 = domingo ... 6 = sábado, como o Date.getDay(). */
  weekDay: number;
  /** Minutos desde a meia-noite, no relógio da clínica. */
  minuteOfDay: number;
}

/** 2026-10-13T11:00:00Z → terça-feira, 08:00 em São Paulo. */
export function toClinicLocal(instant: Date): ClinicLocalTime {
  const parts = Object.fromEntries(
    localPartsFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    weekDay: WEEK_DAYS[parts.weekday ?? ''] ?? -1,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// ---------- Datas puras "YYYY-MM-DD" ----------

function splitDate(date: string): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number);
  return [year, month, day];
}

function isRealDate(date: string): boolean {
  const [year, month, day] = splitDate(date);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

/** "2026-02-30" passa no formato, mas não existe: recusado também. */
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato YYYY-MM-DD')
  .refine(isRealDate, 'data inexistente');

/** Diferença do fuso da clínica em minutos, naquele instante (ex.: -180). */
function offsetMinutesAt(instant: Date): number {
  const name = offsetFormat.formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '');
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** O instante UTC em que começa o dia `date` no relógio da clínica (00:00 local). */
export function clinicDayStart(date: string): Date {
  const [year, month, day] = splitDate(date);
  const utcMidnight = Date.UTC(year, month - 1, day);
  return new Date(utcMidnight - offsetMinutesAt(new Date(utcMidnight)) * 60_000);
}

/** O dia seguinte, em texto: "2026-10-31" → "2026-11-01". */
export function nextDate(date: string): string {
  const [year, month, day] = splitDate(date);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Quantos dias de `from` até `to` ("2026-10-12" → "2026-10-16" = 4). */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = splitDate(from);
  const [y2, m2, d2] = splitDate(to);
  return (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000;
}
