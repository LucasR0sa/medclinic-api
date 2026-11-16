import {
  toShiftResponse,
  type ShiftInput,
  type WorkScheduleInput,
  type WorkScheduleResponse,
} from '../dtos/work-schedule.dto';
import { AppError } from '../errors/app-error';
import type { DoctorRepository } from '../repositories/doctor.repository';
import type { NewWorkShift, WorkScheduleRepository } from '../repositories/work-schedule.repository';
import { clockToMinutes } from '../shared/clinic-time';
import { periodsOverlap } from './period.service';

const WEEK_DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function toNewShift(shift: ShiftInput): NewWorkShift {
  return {
    weekDay: shift.weekDay,
    startMinute: clockToMinutes(shift.startTime),
    endMinute: clockToMinutes(shift.endTime),
    slotDurationMinutes: shift.slotDurationMinutes,
  };
}

/** RN05: dois turnos do MESMO dia da semana não podem se sobrepor. Encostados são válidos. */
function assertNoOverlap(shifts: NewWorkShift[]): void {
  shifts.forEach((a, i) => {
    shifts.slice(i + 1).forEach((b) => {
      const sameDay = a.weekDay === b.weekDay;
      const overlap = periodsOverlap(
        { start: a.startMinute, end: a.endMinute },
        { start: b.startMinute, end: b.endMinute },
      );
      if (sameDay && overlap) {
        throw new AppError(
          'DADOS_INVALIDOS',
          `Há turnos sobrepostos na escala de ${WEEK_DAY_NAMES[a.weekDay]}.`,
        );
      }
    });
  });
}

/** Escala de trabalho do médico (RF04). */
export class WorkScheduleService {
  constructor(
    private readonly doctors: DoctorRepository,
    private readonly schedules: WorkScheduleRepository,
  ) {}

  async replace(doctorId: number, input: WorkScheduleInput): Promise<WorkScheduleResponse> {
    const shifts = input.shifts.map(toNewShift);
    assertNoOverlap(shifts);
    await this.ensureDoctorExists(doctorId);
    const saved = await this.schedules.replace(doctorId, shifts);
    return { shifts: saved.map(toShiftResponse) };
  }

  /** Médico sem escala → 200 com "shifts": [] (não é 404). */
  async get(doctorId: number): Promise<WorkScheduleResponse> {
    await this.ensureDoctorExists(doctorId);
    const shifts = await this.schedules.findByDoctor(doctorId);
    return { shifts: shifts.map(toShiftResponse) };
  }

  private async ensureDoctorExists(doctorId: number): Promise<void> {
    if (!(await this.doctors.findById(doctorId))) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Médico não encontrado.');
    }
  }
}
