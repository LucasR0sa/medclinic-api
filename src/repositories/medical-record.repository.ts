import type { MedicalRecord } from '../entities/medical-record.entity';
import type { Pagination, Slice } from '../shared/pagination';

export interface NewMedicalRecord {
  patientId: number;
  doctorId: number;
  text: string;
}

export interface MedicalRecordRepository {
  create(data: NewMedicalRecord): Promise<MedicalRecord>;
  /** Do mais recente para o mais antigo. */
  listByPatient(patientId: number, pagination: Pagination): Promise<Slice<MedicalRecord>>;
}
