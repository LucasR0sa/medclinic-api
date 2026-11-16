import type { TokenPayload, TokenService } from '../../src/security/token-service';

/** Dublê do crachá: um texto legível, para o teste conferir o que foi assinado. */
export class FakeTokenService implements TokenService {
  sign({ userId, roles }: TokenPayload): string {
    return `token:${userId}:${roles.join(',')}`;
  }

  verify(token: string): TokenPayload {
    const [, userId, roles] = token.split(':');
    return { userId: Number(userId), roles: (roles ?? '').split(',') as TokenPayload['roles'] };
  }
}
