import { AppError } from '../errors/app-error';
import type { UserRepository } from '../repositories/user.repository';
import type { PasswordHasher } from '../security/password-hasher';
import type { TokenService } from '../security/token-service';
import { normalizeEmail } from '../shared/email';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
}

/**
 * A portaria: confere e-mail e senha e entrega o crachá.
 * Depende só de portas (interfaces), recebidas pelo construtor (RP02).
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async login(input: LoginInput): Promise<LoginOutput> {
    const user = await this.users.findByEmail(normalizeEmail(input.email));

    // A senha digitada é comparada com o HASH guardado; a senha original
    // nunca foi guardada, então não há o que "descriptografar".
    const passwordMatches =
      user !== null && (await this.hasher.compare(input.password, user.passwordHash));

    // Mesmo erro para e-mail inexistente e senha errada: não revelamos qual falhou.
    if (!user || !passwordMatches) {
      throw new AppError('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.');
    }

    return { accessToken: this.tokens.sign({ userId: user.id, roles: user.roles }) };
  }
}
