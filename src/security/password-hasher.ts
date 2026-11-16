/**
 * Porta de hash de senha. O service conhece só esta interface; quem faz o
 * cálculo de verdade (bcrypt) é a implementação, trocada por um dublê nos testes.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
