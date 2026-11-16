import type { Appointment } from '../../src/entities/appointment.entity';
import type {
  AppointmentFilter,
  AppointmentRepository,
  BookingScope,
  NewAppointment,
} from '../../src/repositories/appointment.repository';
import { periodsOverlap } from '../../src/services/period.service';
import type { AppointmentStatus } from '../../src/shared/appointment-status';
import { offsetOf, type Pagination, type Slice } from '../../src/shared/pagination';

/**
 * Dublê da porta de consultas. O "cadeado" é uma fila de Promises: cada
 * bloco `work` só começa quando o anterior terminou, como o FOR UPDATE faz
 * no Postgres. Sem a fila, duas criações simultâneas passariam juntas pela
 * verificação de conflito (os `await` intercalam as duas).
 */
export class InMemoryAppointmentRepository implements AppointmentRepository, BookingScope {
  readonly items: Appointment[] = [];
  private nextId = 1;
  private queue: Promise<unknown> = Promise.resolve();

  withBookingLock<T>(
    _doctorId: number,
    _patientId: number,
    work: (booking: BookingScope) => Promise<T>,
  ): Promise<T> {
    const run = this.queue.then(() => work(this));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private active(): Appointment[] {
    return this.items.filter((a) => a.status !== 'cancelled');
  }

  private overlaps(a: Appointment, startsAt: Date, endsAt: Date): boolean {
    return periodsOverlap(
      { start: a.startsAt.getTime(), end: a.endsAt.getTime() },
      { start: startsAt.getTime(), end: endsAt.getTime() },
    );
  }

  async hasDoctorConflict(doctorId: number, startsAt: Date, endsAt: Date): Promise<boolean> {
    return this.active().some((a) => a.doctorId === doctorId && this.overlaps(a, startsAt, endsAt));
  }

  async hasPatientConflict(patientId: number, startsAt: Date, endsAt: Date): Promise<boolean> {
    return this.active().some(
      (a) => a.patientId === patientId && this.overlaps(a, startsAt, endsAt),
    );
  }

  async create(data: NewAppointment): Promise<Appointment> {
    const appointment: Appointment = {
      id: this.nextId++,
      ...data,
      status: 'scheduled',
      createdAt: new Date(),
    };
    this.items.push(appointment);
    return appointment;
  }

  async findById(id: number): Promise<Appointment | null> {
    return this.items.find((a) => a.id === id) ?? null;
  }

  async list(filter: AppointmentFilter, pagination: Pagination): Promise<Slice<Appointment>> {
    const matches = this.items
      .filter(
        (a) =>
          (filter.doctorId === undefined || a.doctorId === filter.doctorId) &&
          (filter.patientId === undefined || a.patientId === filter.patientId) &&
          (filter.status === undefined || a.status === filter.status) &&
          (!filter.from || a.startsAt >= filter.from) &&
          (!filter.to || a.startsAt < filter.to),
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    const start = offsetOf(pagination);
    return { items: matches.slice(start, start + pagination.pageSize), total: matches.length };
  }

  async findActiveByDoctorBetween(doctorId: number, from: Date, to: Date): Promise<Appointment[]> {
    return this.active().filter(
      (a) => a.doctorId === doctorId && a.startsAt >= from && a.startsAt < to,
    );
  }

  async changeStatus(
    id: number,
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): Promise<Appointment | null> {
    const appointment = this.items.find((a) => a.id === id && a.status === from);
    if (!appointment) return null;
    appointment.status = to;
    return appointment;
  }

  async hasCareLink(doctorId: number, patientId: number): Promise<boolean> {
    return this.items.some(
      (a) =>
        a.doctorId === doctorId &&
        a.patientId === patientId &&
        (a.status === 'in_progress' || a.status === 'done'),
    );
  }
}
