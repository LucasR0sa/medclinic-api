import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Uma anotação de prontuário: quem escreveu (doctorId), sobre quem (patientId) e o texto. */
@Entity('medical_records')
export class MedicalRecord {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
