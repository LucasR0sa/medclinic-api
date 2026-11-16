import type { Appointment } from '../entities/appointment.entity';
import type { AppointmentStatus } from '../shared/appointment-status';
import type { Pagination, Slice } from '../shared/pagination';

export interface NewAppointment {
  doctorId: number;
  patientId: number;
  startsAt: Date;
  endsAt: Date;
}

export interface AppointmentFilter {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  /** Início inclusivo. */
  from?: Date;
  /** Fim EXCLUSIVO. */
  to?: Date;
}

/**
 * O que se pode fazer DENTRO da transação de agendamento, enquanto a linha
 * do médico está travada. "Ativo" = qualquer status menos cancelled.
 */
export interface BookingScope {
  hasDoctorConflict(doctorId: number, startsAt: Date, endsAt: Date): Promise<boolean>;
  hasPatientConflict(patientId: number, startsAt: Date, endsAt: Date): Promise<boolean>;
  create(data: NewAppointment): Promise<Appointment>;
}

export interface AppointmentRepository {
  /**
   * RN10: abre uma transação, trava a linha do médico (e a do paciente) com
   * SELECT ... FOR UPDATE e executa `work` dentro dela. Outra requisição para
   * o mesmo médico espera na fila até o COMMIT desta.
   */
  withBookingLock<T>(
    doctorId: number,
    patientId: number,
    work: (booking: BookingScope) => Promise<T>,
  ): Promise<T>;
  findById(id: number): Promise<Appointment | null>;
  list(filter: AppointmentFilter, pagination: Pagination): Promise<Slice<Appointment>>;
  /** Consultas não canceladas do médico com início em [from, to). */
  findActiveByDoctorBetween(doctorId: number, from: Date, to: Date): Promise<Appointment[]>;
  /**
   * Muda o status SÓ se ele ainda for `from` (UPDATE ... WHERE status = from).
   * Devolve null se outra requisição mudou antes.
   */
  changeStatus(
    id: number,
    from: AppointmentStatus,
    to: AppointmentStatus,
  ): Promise<Appointment | null>;
}
