import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { AppointmentStatus } from '../shared/appointment-status';

/**
 * Consulta. Guarda o PRÓPRIO fim (endsAt), calculado na hora de agendar:
 * se a escala mudar depois, a consulta mantém o período que tinha (RN15).
 * Instantes em timestamptz (RP05): o banco guarda em UTC.
 */
@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: AppointmentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
