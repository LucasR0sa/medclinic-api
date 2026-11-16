import type { User } from '../../src/entities/user.entity';
import { AppError } from '../../src/errors/app-error';
import type { NewUser, UserRepository } from '../../src/repositories/user.repository';

/** Dublê da porta: um "fichário de papel" em memória, com a mesma regra de e-mail único do banco. */
export class InMemoryUserRepository implements UserRepository {
  readonly items: User[] = [];
  private nextId = 1;

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((user) => user.email === email) ?? null;
  }

  async findById(id: number): Promise<User | null> {
    return this.items.find((user) => user.id === id) ?? null;
  }

  async create(data: NewUser): Promise<User> {
    if (this.items.some((user) => user.email === data.email)) {
      throw new AppError('EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
    }
    const user: User = { id: this.nextId++, createdAt: new Date(), ...data };
    this.items.push(user);
    return user;
  }
}
