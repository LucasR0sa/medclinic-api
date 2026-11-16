import bcrypt from 'bcryptjs';
import type { PasswordHasher } from './password-hasher';

/**
 * bcrypt é LENTO de propósito: o custo 10 faz cada hash levar dezenas de ms.
 * Para quem faz login, é imperceptível; para quem roubou o banco e tenta
 * bilhões de senhas, vira anos.
 */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost = 10) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
