import type { DataSource } from 'typeorm';
import { WorkShift } from '../entities/work-shift.entity';
import {
  sortShifts,
  type NewWorkShift,
  type WorkScheduleRepository,
} from './work-schedule.repository';

export class TypeOrmWorkScheduleRepository implements WorkScheduleRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByDoctor(doctorId: number): Promise<WorkShift[]> {
    return this.dataSource.getRepository(WorkShift).find({
      where: { doctorId },
      order: { weekDay: 'ASC', startMinute: 'ASC' },
    });
  }

  async replace(doctorId: number, shifts: NewWorkShift[]): Promise<WorkShift[]> {
    // Apagar e regravar na MESMA transação: ninguém enxerga o médico
    // "sem escala" no meio da troca, e uma falha não deixa a escala pela metade.
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(WorkShift, { doctorId });
      const saved = await manager.save(
        shifts.map((shift) => manager.create(WorkShift, { ...shift, doctorId })),
      );
      return sortShifts(saved);
    });
  }
}
