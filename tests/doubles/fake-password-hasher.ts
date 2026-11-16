import type { PasswordHasher } from '../../src/security/password-hasher';

/** Dublê do hash: previsível e instantâneo ("hash(senha)"), sem o custo do bcrypt. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hash(${plain})`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hash(${plain})`;
  }
}
