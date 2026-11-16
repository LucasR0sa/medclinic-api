import type { User } from '../entities/user.entity';
import type { Role } from '../shared/roles';

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
  roles: Role[];
}

/**
 * Porta do repositório de usuários: O QUE o service precisa, sem dizer COMO.
 * A implementação real usa TypeORM; nos testes, entra um dublê em memória.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  /** Lança EMAIL_JA_CADASTRADO se o banco recusar por e-mail repetido. */
  create(data: NewUser): Promise<User>;
}
