import { ILike, IsNull, type Repository } from 'typeorm';
import { isUniqueViolation } from '../database/pg-errors';
import type { Patient } from '../entities/patient.entity';
import { AppError } from '../errors/app-error';
import { offsetOf, type Pagination, type Slice } from '../shared/pagination';
import { containsPattern } from '../shared/search';
import type { NewPatient, PatientFilter, PatientRepository } from './patient.repository';

export class TypeOrmPatientRepository implements PatientRepository {
  constructor(private readonly repo: Repository<Patient>) {}

  findById(id: number): Promise<Patient | null> {
    return this.repo.findOneBy({ id });
  }

  findByCpf(cpf: string): Promise<Patient | null> {
    return this.repo.findOneBy({ cpf });
  }

  async list(filter: PatientFilter, pagination: Pagination): Promise<Slice<Patient>> {
    const [items, total] = await this.repo.findAndCount({
      where: filter.name ? { name: ILike(containsPattern(filter.name)) } : {},
      order: { id: 'ASC' },
      skip: offsetOf(pagination),
      take: pagination.pageSize,
    });
    return { items, total };
  }

  async create(data: NewPatient): Promise<Patient> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      if (isUniqueViolation(error, 'uq_patients_cpf')) {
        throw new AppError('CPF_JA_CADASTRADO', 'Este CPF já está cadastrado.');
      }
      throw error;
    }
  }

  async rename(id: number, name: string): Promise<Patient | null> {
    const patient = await this.repo.findOneBy({ id });
    if (!patient) return null;
    patient.name = name;
    return this.repo.save(patient);
  }

  async remove(id: number): Promise<boolean> {
    // Sem o "deletedAt: IsNull()", remover de novo um paciente já removido
    // atualizaria a linha e responderia 204 em vez de 404.
    const result = await this.repo.softDelete({ id, deletedAt: IsNull() });
    return (result.affected ?? 0) > 0;
  }
}
