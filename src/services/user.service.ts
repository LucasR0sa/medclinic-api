import { toUserResponse, type CreateUserInput, type UserResponse } from '../dtos/user.dto';
import { AppError } from '../errors/app-error';
import type { UserRepository } from '../repositories/user.repository';
import type { PasswordHasher } from '../security/password-hasher';
import { normalizeEmail } from '../shared/email';

/** O RH: consulta e cadastro de usuários de acesso. */
export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async getById(id: number): Promise<UserResponse> {
    const user = await this.users.findById(id);
    // Token válido de um usuário que foi removido depois do login.
    if (!user) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Usuário não encontrado.');
    }
    return toUserResponse(user);
  }

  async create(input: CreateUserInput): Promise<UserResponse> {
    const email = normalizeEmail(input.email);

    // Checagem amigável. A garantia de verdade é a restrição UNIQUE do banco (RP04),
    // que o repositório traduz para o mesmo erro se duas requisições chegarem juntas.
    if (await this.users.findByEmail(email)) {
      throw new AppError('EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
    }

    const user = await this.users.create({
      name: input.name,
      email,
      passwordHash: await this.hasher.hash(input.password), // só o hash é guardado
      roles: input.roles,
    });
    return toUserResponse(user);
  }
}
