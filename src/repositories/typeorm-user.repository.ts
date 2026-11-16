import type { Repository } from 'typeorm';
import { isUniqueViolation } from '../database/pg-errors';
import type { User } from '../entities/user.entity';
import { AppError } from '../errors/app-error';
import type { NewUser, UserRepository } from './user.repository';

/** Implementação real da porta: o arquivista que fala com o Postgres. Nenhuma regra de negócio aqui. */
export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly repo: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async create(data: NewUser): Promise<User> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      // RP04: a última palavra sobre e-mail repetido é do banco.
      if (isUniqueViolation(error, 'uq_users_email')) {
        throw new AppError('EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
      }
      throw error;
    }
  }
}
