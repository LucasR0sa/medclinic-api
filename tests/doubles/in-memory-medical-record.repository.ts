import type { MedicalRecord } from '../../src/entities/medical-record.entity';
import type {
  MedicalRecordRepository,
  NewMedicalRecord,
} from '../../src/repositories/medical-record.repository';
import { offsetOf, type Pagination, type Slice } from '../../src/shared/pagination';

/** Dublê da porta de prontuário. */
export class InMemoryMedicalRecordRepository implements MedicalRecordRepository {
  readonly items: MedicalRecord[] = [];
  private nextId = 1;

  async create(data: NewMedicalRecord): Promise<MedicalRecord> {
    const record: MedicalRecord = { id: this.nextId++, createdAt: new Date(), ...data };
    this.items.push(record);
    return record;
  }

  async listByPatient(patientId: number, pagination: Pagination): Promise<Slice<MedicalRecord>> {
    const matches = this.items.filter((r) => r.patientId === patientId).reverse(); // mais novo primeiro
    const start = offsetOf(pagination);
    return { items: matches.slice(start, start + pagination.pageSize), total: matches.length };
  }
}
