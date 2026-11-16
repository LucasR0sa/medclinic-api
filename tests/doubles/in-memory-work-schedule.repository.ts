import type { WorkShift } from '../../src/entities/work-shift.entity';
import {
  sortShifts,
  type NewWorkShift,
  type WorkScheduleRepository,
} from '../../src/repositories/work-schedule.repository';

/** Dublê da porta de escala. */
export class InMemoryWorkScheduleRepository implements WorkScheduleRepository {
  items: WorkShift[] = [];
  private nextId = 1;

  async findByDoctor(doctorId: number): Promise<WorkShift[]> {
    return sortShifts(this.items.filter((shift) => shift.doctorId === doctorId));
  }

  async replace(doctorId: number, shifts: NewWorkShift[]): Promise<WorkShift[]> {
    this.items = this.items.filter((shift) => shift.doctorId !== doctorId);
    const created = shifts.map((shift) => ({ id: this.nextId++, doctorId, ...shift }));
    this.items.push(...created);
    return sortShifts(created);
  }
}
