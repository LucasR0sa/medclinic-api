import { ILike, type DataSource, type Repository } from 'typeorm';
import { isUniqueViolation } from '../database/pg-errors';
import { Doctor } from '../entities/doctor.entity';
import { User } from '../entities/user.entity';
import { AppError } from '../errors/app-error';
import { offsetOf, type Pagination, type Slice } from '../shared/pagination';
import { containsPattern } from '../shared/search';
import type { DoctorFilter, DoctorRepository, NewDoctor } from './doctor.repository';

export class TypeOrmDoctorRepository implements DoctorRepository {
  private readonly repo: Repository<Doctor>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(Doctor);
  }

  findById(id: number): Promise<Doctor | null> {
    return this.repo.findOne({ where: { id }, relations: { user: true } });
  }

  findByCrm(crm: string): Promise<Doctor | null> {
    return this.repo.findOne({ where: { crm }, relations: { user: true } });
  }

  findByUserId(userId: number): Promise<Doctor | null> {
    return this.repo.findOne({ where: { userId }, relations: { user: true } });
  }

  async list(filter: DoctorFilter, pagination: Pagination): Promise<Slice<Doctor>> {
    const [items, total] = await this.repo.findAndCount({
      where: filter.name ? { user: { name: ILike(containsPattern(filter.name)) } } : {},
      relations: { user: true },
      order: { id: 'ASC' },
      skip: offsetOf(pagination),
      take: pagination.pageSize,
    });
    return { items, total };
  }

  async createWithUser(data: NewDoctor): Promise<Doctor> {
    try {
      // dataSource.transaction abre BEGIN, roda o bloco e dá COMMIT.
      // Se qualquer linha lançar erro, ele dá ROLLBACK: o usuário gravado
      // na primeira linha é desfeito junto. Tudo ou nada (RN03).
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.save(
          manager.create(User, {
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            roles: ['doctor'],
          }),
        );
        const doctor = await manager.save(
          manager.create(Doctor, { user, userId: user.id, crm: data.crm }),
        );
        return doctor;
      });
    } catch (error) {
      if (isUniqueViolation(error, 'uq_users_email')) {
        throw new AppError('EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
      }
      if (isUniqueViolation(error, 'uq_doctors_crm')) {
        throw new AppError('CRM_JA_CADASTRADO', 'Este CRM já está cadastrado.');
      }
      throw error;
    }
  }
}
