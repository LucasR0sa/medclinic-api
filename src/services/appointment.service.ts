import {
  toAppointmentResponse,
  type AppointmentResponse,
  type CreateAppointmentInput,
  type ListAppointmentsQuery,
} from '../dtos/appointment.dto';
import type { Appointment } from '../entities/appointment.entity';
import type { WorkShift } from '../entities/work-shift.entity';
import { AppError } from '../errors/app-error';
import type {
  AppointmentFilter,
  AppointmentRepository,
} from '../repositories/appointment.repository';
import type { DoctorRepository } from '../repositories/doctor.repository';
import type { PatientRepository } from '../repositories/patient.repository';
import type { WorkScheduleRepository } from '../repositories/work-schedule.repository';
import type { TokenPayload } from '../security/token-service';
import type { AppointmentStatus } from '../shared/appointment-status';
import { clinicDayStart, nextDate, toClinicLocal } from '../shared/clinic-time';
import { toPage, type Page } from '../shared/pagination';
import type { Role } from '../shared/roles';

type Actor = 'admin' | 'secretary' | 'own_doctor';

/**
 * RN11 + RN12: de onde para onde se pode ir, e quem pode levar.
 * O que não está na tabela é TRANSICAO_INVALIDA; done e cancelled são o fim da linha.
 */
const TRANSITIONS: Record<AppointmentStatus, Partial<Record<AppointmentStatus, Actor[]>>> = {
  scheduled: {
    in_progress: ['own_doctor', 'admin'],
    cancelled: ['admin', 'secretary', 'own_doctor'],
  },
  in_progress: {
    done: ['own_doctor', 'admin'],
    cancelled: ['admin', 'own_doctor'],
  },
  done: {},
  cancelled: {},
};

const outOfSchedule = (message: string) => new AppError('HORARIO_FORA_DA_ESCALA', message);

/**
 * Validações 2, 3 e 4 (RN07): o horário EXISTE na agenda do médico?
 * Devolve o fim da consulta: início + duração do turno em que ele cai (RN04).
 */
export function slotEnd(shifts: WorkShift[], startsAt: Date): Date {
  const local = toClinicLocal(startsAt);
  const shift = shifts.find(
    (s) =>
      s.weekDay === local.weekDay &&
      s.startMinute <= local.minuteOfDay &&
      local.minuteOfDay < s.endMinute,
  );
  // 2. cai dentro de algum turno daquele dia da semana?
  if (!shift) {
    throw outOfSchedule('O horário não está dentro de nenhum turno da escala do médico.');
  }
  // 3. está alinhado à grade? (08:00 com 30 min → 08:00, 08:30... ; 08:20 não)
  const onGrid =
    (local.minuteOfDay - shift.startMinute) % shift.slotDurationMinutes === 0 &&
    startsAt.getUTCSeconds() === 0 &&
    startsAt.getUTCMilliseconds() === 0;
  if (!onGrid) {
    throw outOfSchedule('O horário não está alinhado à grade de consultas do turno.');
  }
  // 4. a consulta inteira cabe antes do fim do turno?
  if (local.minuteOfDay + shift.slotDurationMinutes > shift.endMinute) {
    throw outOfSchedule('A consulta não cabe antes do fim do turno.');
  }
  return new Date(startsAt.getTime() + shift.slotDurationMinutes * 60_000);
}

/** Médico "puro" (sem admin): só enxerga as próprias consultas. */
function isRestrictedDoctor(roles: Role[]): boolean {
  return roles.includes('doctor') && !roles.includes('admin');
}

/** Agendamentos (RF06, RF07, RF08). */
export class AppointmentService {
  constructor(
    private readonly doctors: DoctorRepository,
    private readonly patients: PatientRepository,
    private readonly schedules: WorkScheduleRepository,
    private readonly appointments: AppointmentRepository,
  ) {}

  async create(input: CreateAppointmentInput): Promise<AppointmentResponse> {
    const { doctorId, patientId, startsAt } = input;

    // 1. médico e paciente existem?
    if (!(await this.doctors.findById(doctorId))) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Médico não encontrado.');
    }
    if (!(await this.patients.findById(patientId))) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente não encontrado.');
    }

    // 2, 3 e 4. o horário existe na escala? (e qual é o fim da consulta)
    const endsAt = slotEnd(await this.schedules.findByDoctor(doctorId), startsAt);

    // 5 e 6, DENTRO da transação com a linha do médico travada (RN10):
    // verificar e gravar viram um passo só para quem chega ao mesmo tempo.
    const appointment = await this.appointments.withBookingLock(
      doctorId,
      patientId,
      async (booking) => {
        if (await booking.hasDoctorConflict(doctorId, startsAt, endsAt)) {
          throw new AppError('HORARIO_INDISPONIVEL', 'Este horário acabou de ser ocupado.');
        }
        if (await booking.hasPatientConflict(patientId, startsAt, endsAt)) {
          throw new AppError(
            'PACIENTE_INDISPONIVEL',
            'O paciente já tem uma consulta que se sobrepõe a este horário.',
          );
        }
        return booking.create({ doctorId, patientId, startsAt, endsAt });
      },
    );
    return toAppointmentResponse(appointment);
  }

  async list(
    requester: TokenPayload,
    query: ListAppointmentsQuery,
  ): Promise<Page<AppointmentResponse>> {
    const filter: AppointmentFilter = {
      doctorId: query.doctorId,
      patientId: query.patientId,
      status: query.status,
      from: query.from ? clinicDayStart(query.from) : undefined,
      to: query.to ? clinicDayStart(nextDate(query.to)) : undefined, // dia `to` inteiro
    };

    // Filtro FORÇADO por perfil: o médico só vê as dele, mande o doctorId que mandar.
    if (isRestrictedDoctor(requester.roles)) {
      const own = await this.doctors.findByUserId(requester.userId);
      if (!own) return toPage([], 0, query);
      filter.doctorId = own.id;
    }

    const { items, total } = await this.appointments.list(filter, query);
    return toPage(items.map(toAppointmentResponse), total, query);
  }

  async getById(requester: TokenPayload, id: number): Promise<AppointmentResponse> {
    const appointment = await this.findOrFail(id);
    if (isRestrictedDoctor(requester.roles)) {
      const actors = await this.actorsOf(requester, appointment);
      if (!actors.includes('own_doctor')) {
        throw new AppError('ACESSO_NEGADO', 'Esta consulta é de outro médico.');
      }
    }
    return toAppointmentResponse(appointment);
  }

  async changeStatus(
    requester: TokenPayload,
    id: number,
    to: AppointmentStatus,
  ): Promise<AppointmentResponse> {
    const appointment = await this.findOrFail(id);

    const allowed = TRANSITIONS[appointment.status][to];
    if (!allowed) {
      throw new AppError(
        'TRANSICAO_INVALIDA',
        `Não é possível mudar de ${appointment.status} para ${to}.`,
      );
    }

    const actors = await this.actorsOf(requester, appointment);
    if (!allowed.some((actor) => actors.includes(actor))) {
      throw new AppError('ACESSO_NEGADO', 'Seu perfil não pode fazer esta mudança de status.');
    }

    // UPDATE ... WHERE status = <o que eu li>: se outra requisição mudou
    // no meio do caminho, nada é alterado e a transição é recusada.
    const updated = await this.appointments.changeStatus(id, appointment.status, to);
    if (!updated) {
      throw new AppError('TRANSICAO_INVALIDA', 'O status mudou enquanto você alterava; consulte de novo.');
    }
    return toAppointmentResponse(updated);
  }

  private async findOrFail(id: number): Promise<Appointment> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Agendamento não encontrado.');
    }
    return appointment;
  }

  /** Em que papéis quem está chamando atua NESTA consulta. */
  private async actorsOf(requester: TokenPayload, appointment: Appointment): Promise<Actor[]> {
    const actors: Actor[] = [];
    if (requester.roles.includes('admin')) actors.push('admin');
    if (requester.roles.includes('secretary')) actors.push('secretary');
    if (requester.roles.includes('doctor')) {
      const own = await this.doctors.findByUserId(requester.userId);
      if (own?.id === appointment.doctorId) actors.push('own_doctor');
    }
    return actors;
  }
}
