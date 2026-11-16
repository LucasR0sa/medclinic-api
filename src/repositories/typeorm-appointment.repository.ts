import {
  And,
  In,
  LessThan,
  MoreThan,
  MoreThanOrEqual,
  Not,
  type DataSource,
  type EntityManager,
  type FindOperator,
  type FindOptionsWhere,
} from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import type { AppointmentStatus } from '../shared/appointment-status';
import { offsetOf, type Pagination, type Slice } from '../shared/pagination';
import type {
  AppointmentFilter,
  AppointmentRepository,
  BookingScope,
  NewAppointment,
} from './appointment.repository';

const ACTIVE = Not<AppointmentStatus>('cancelled');

/** Sobreposição em SQL: existente.starts_at < novo.fim E existente.ends_at > novo.início. */
function overlapping(startsAt: Date, endsAt: Date) {
  return { startsAt: LessThan(endsAt), endsAt: MoreThan(startsAt) };
}

function startsBetween(from?: Date, to?: Date): FindOperator<Date> | undefined {
  if (from && to) return And(MoreThanOrEqual(from), LessThan(to));
  if (from) return MoreThanOrEqual(from);
  if (to) return LessThan(to);
  return undefined;
}

/** As operações de dentro da transação usam o EntityManager DELA, não o global. */
class TypeOrmBookingScope implements BookingScope {
  constructor(private readonly manager: EntityManager) {}

  hasDoctorConflict(doctorId: number, startsAt: Date, endsAt: Date): Promise<boolean> {
    return this.manager.exists(Appointment, {
      where: { doctorId, status: ACTIVE, ...overlapping(startsAt, endsAt) },
    });
  }

  hasPatientConflict(patientId: number, startsAt: Date, endsAt: Date): Promise<boolean> {
    return this.manager.exists(Appointment, {
      where: { patientId, status: ACTIVE, ...overlapping(startsAt, endsAt) },
    });
  }

  create(data: NewAppointment): Promise<Appointment> {
    return this.manager.save(this.manager.create(Appointment, { ...data, status: 'scheduled' }));
  }
}

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repo() {
    return this.dataSource.getRepository(Appointment);
  }

  withBookingLock<T>(
    doctorId: number,
    patientId: number,
    work: (booking: BookingScope) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      // O "cadeado": a primeira transação trava a linha do médico; a segunda
      // fica PARADA nesta linha até a primeira dar COMMIT. Só então ela
      // verifica o conflito, e já enxerga a consulta que a primeira gravou.
      // Trava-se o MÉDICO (linha que sempre existe), e não as consultas:
      // numa agenda vazia não haveria consulta nenhuma para travar.
      await manager.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [doctorId]);
      // RN09: o paciente também não pode estar em duas consultas ao mesmo tempo.
      // A ordem fixa (médico, depois paciente) evita deadlock entre transações.
      await manager.query('SELECT id FROM patients WHERE id = $1 FOR UPDATE', [patientId]);
      return work(new TypeOrmBookingScope(manager));
    });
  }

  findById(id: number): Promise<Appointment | null> {
    return this.repo.findOneBy({ id });
  }

  async list(filter: AppointmentFilter, pagination: Pagination): Promise<Slice<Appointment>> {
    const where: FindOptionsWhere<Appointment> = {};
    if (filter.doctorId !== undefined) where.doctorId = filter.doctorId;
    if (filter.patientId !== undefined) where.patientId = filter.patientId;
    if (filter.status !== undefined) where.status = filter.status;
    const period = startsBetween(filter.from, filter.to);
    if (period) where.startsAt = period;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { startsAt: 'ASC', id: 'ASC' },
      skip: offsetOf(pagination),
      take: pagination.pageSize,
    });
    return { items, total };
  }

  findActiveByDoctorBetween(doctorId: number, from: Date, to: Date): Promise<Appointment[]> {
    return this.repo.find({
      where: { doctorId, status: ACTIVE, startsAt: startsBetween(from, to) },
      order: { startsAt: 'ASC' },
    });
  }

  async changeStatus(
    id: number,
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): Promise<Appointment | null> {
    const result = await this.repo.update({ id, status: from }, { status: to });
    if (!result.affected) return null;
    return this.repo.findOneBy({ id });
  }

  hasCareLink(doctorId: number, patientId: number): Promise<boolean> {
    return this.repo.exists({
      where: { doctorId, patientId, status: In<AppointmentStatus>(['in_progress', 'done']) },
    });
  }
}
