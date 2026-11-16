import type { Request, RequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import type { TokenPayload, TokenService } from '../security/token-service';
import type { Role } from '../shared/roles';

/**
 * A catraca da entrada: "quem é você?". Confere o crachá (JWT) e pendura
 * em req.user quem é e quais perfis tem. Falhou → 401 NAO_AUTENTICADO.
 */
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new AppError('NAO_AUTENTICADO', 'Token ausente ou malformado.');
    }
    req.user = tokens.verify(token); // selo inválido ou vencido → 401
    next();
  };
}

/**
 * A porta da sala: "você pode entrar AQUI?". Roda sempre DEPOIS do
 * authenticate. Basta ter um dos perfis aceitos. Falhou → 403 ACESSO_NEGADO.
 */
export function authorize(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = requireUser(req);
    if (!user.roles.some((role) => allowed.includes(role))) {
      throw new AppError('ACESSO_NEGADO', 'Seu perfil não tem permissão para esta operação.');
    }
    next();
  };
}

/** Quem está chamando. Só usar em rota protegida pelo authenticate. */
export function requireUser(req: Request): TokenPayload {
  if (!req.user) {
    throw new AppError('NAO_AUTENTICADO', 'Token ausente ou malformado.');
  }
  return req.user;
}
