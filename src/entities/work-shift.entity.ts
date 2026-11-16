import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Um turno da escala (RN04). Os horários ficam guardados em MINUTOS desde a
 * meia-noite (08:30 → 510): a conta de grade e de sobreposição vira aritmética
 * simples. Na fronteira da API eles voltam a ser "HH:MM".
 */
@Entity('work_shifts')
export class WorkShift {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @Column({ name: 'week_day', type: 'smallint' })
  weekDay!: number;

  @Column({ name: 'start_minute', type: 'smallint' })
  startMinute!: number;

  @Column({ name: 'end_minute', type: 'smallint' })
  endMinute!: number;

  @Column({ name: 'slot_duration_minutes', type: 'smallint' })
  slotDurationMinutes!: number;
}
