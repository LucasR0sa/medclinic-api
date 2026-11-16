import jwt from 'jsonwebtoken';
import { AppError } from '../errors/app-error';
import { ROLES, type Role } from '../shared/roles';
import type { TokenPayload, TokenService } from './token-service';

function isRoleList(value: unknown): value is Role[] {
  return (
    Array.isArray(value) &&
    value.every((item) => (ROLES as readonly unknown[]).includes(item))
  );
}

/**
 * Implementação do crachá com JWT. Recebe o segredo e a validade pelo
 * construtor (não lê o env sozinha), então dá para testar sem variável de ambiente.
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresInSeconds: number,
  ) {}

  sign({ userId, roles }: TokenPayload): string {
    // "sub" (subject) é o campo padrão do JWT para "de quem é este token".
    return jwt.sign({ roles }, this.secret, {
      algorithm: 'HS256',
      subject: String(userId),
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): TokenPayload {
    try {
      // algorithms fixo: não deixamos o próprio token escolher como será conferido.
      const decoded = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      const roles: unknown = typeof decoded === 'string' ? undefined : decoded['roles'];
      const userId = typeof decoded === 'string' ? NaN : Number(decoded.sub);

      if (!Number.isInteger(userId) || !isRoleList(roles)) {
        throw new Error('conteúdo do token fora do formato');
      }
      return { userId, roles };
    } catch {
      // Selo inválido, vencido ou conteúdo estranho: para o cliente, tudo é 401.
      throw new AppError('NAO_AUTENTICADO', 'Token ausente, inválido ou expirado.');
    }
  }
}
