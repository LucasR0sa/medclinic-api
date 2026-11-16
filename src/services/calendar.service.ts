import type { CalendarQuery } from '../dtos/appointment.dto';
import { toShiftResponse, type WorkScheduleResponse } from '../dtos/work-schedule.dto';
import { AppError } from '../errors/app-error';
import type { AppointmentRepository } from '../repositories/appointment.repository';
import type { DoctorRepository } from '../repositories/doctor.repository';
import type { WorkScheduleRepository } from '../repositories/work-schedule.repository';
import type { AppointmentStatus } from '../shared/appointment-status';
import { clinicDayStart, nextDate } from '../shared/clinic-time';

export interface CalendarResponse {
  workSchedule: WorkScheduleResponse;
  appointments: {
    id: number;
    patientId: number;
    startsAt: Date;
    endsAt: Date;
    status: AppointmentStatus;
  }[];
}

/**
 * RF05: a agenda do médico num período. Devolve a escala + as consultas
 * ativas; quem monta a grade de horários livres é o front-end (a API não gera slots).
 */
export class CalendarService {
  constructor(
    private readonly doctors: DoctorRepository,
    private readonly schedules: WorkScheduleRepository,
    private readonly appointments: AppointmentRepository,
  ) {}

  async get(doctorId: number, { from, to }: CalendarQuery): Promise<CalendarResponse> {
    if (!(await this.doctors.findById(doctorId))) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Médico não encontrado.');
    }

    const shifts = await this.schedules.findByDoctor(doctorId);
    // Período inclusivo nas duas pontas, no relógio da clínica:
    // de 00:00 de `from` até 00:00 do dia SEGUINTE a `to` (exclusivo).
    const appointments = await this.appointments.findActiveByDoctorBetween(
      doctorId,
      clinicDayStart(from),
      clinicDayStart(nextDate(to)),
    );

    return {
      workSchedule: { shifts: shifts.map(toShiftResponse) },
      appointments: appointments.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      })),
    };
  }
}
