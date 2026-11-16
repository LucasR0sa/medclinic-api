import type { Repository } from 'typeorm';
import type { MedicalRecord } from '../entities/medical-record.entity';
import { offsetOf, type Pagination, type Slice } from '../shared/pagination';
import type { MedicalRecordRepository, NewMedicalRecord } from './medical-record.repository';

export class TypeOrmMedicalRecordRepository implements MedicalRecordRepository {
  constructor(private readonly repo: Repository<MedicalRecord>) {}

  create(data: NewMedicalRecord): Promise<MedicalRecord> {
    return this.repo.save(this.repo.create(data));
  }

  async listByPatient(patientId: number, pagination: Pagination): Promise<Slice<MedicalRecord>> {
    const [items, total] = await this.repo.findAndCount({
      where: { patientId },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: offsetOf(pagination),
      take: pagination.pageSize,
    });
    return { items, total };
  }
}
