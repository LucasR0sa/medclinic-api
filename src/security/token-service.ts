import type { Role } from '../shared/roles';

/** O que vai dentro do crachá: quem é e quais perfis tem. */
export interface TokenPayload {
  userId: number;
  roles: Role[];
}

/** Porta do crachá. O service só conhece esta interface. */
export interface TokenService {
  sign(payload: TokenPayload): string;
  /** Confere o selo e a validade. Lança NAO_AUTENTICADO se algo não bater. */
  verify(token: string): TokenPayload;
}
