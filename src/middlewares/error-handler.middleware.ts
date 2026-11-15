import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, type ErrorCode } from '../errors/app-error';
import { log } from '../shared/logger';

/**
 * Tradução de erro de negócio para HTTP. É o ÚNICO lugar do sistema que
 * conhece essa tabela (RP03). O tipo Record<ErrorCode, number> obriga a ter
 * um status para cada código: se alguém criar um código novo e esquecer
 * daqui, o TypeScript não compila.
 */
const statusByCode: Record<ErrorCode, number> = {
  DADOS_INVALIDOS: 400,
  NAO_AUTENTICADO: 401,
  CREDENCIAIS_INVALIDAS: 401,
  ACESSO_NEGADO: 403,
  RECURSO_NAO_ENCONTRADO: 404,
  EMAIL_JA_CADASTRADO: 409,
  CPF_JA_CADASTRADO: 409,
  CRM_JA_CADASTRADO: 409,
  HORARIO_INDISPONIVEL: 409,
  PACIENTE_INDISPONIVEL: 409,
  HORARIO_FORA_DA_ESCALA: 422,
  TRANSICAO_INVALIDA: 422,
};

/** Envelope de erro do contrato (Seção 4.9.1). */
interface ErrorBody {
  statusCode: number;
  error: ErrorCode | 'ERRO_INTERNO';
  message: string;
}

/** O express.json() lança um erro com type "entity.*" quando o corpo não é JSON válido. */
function isBodyParserError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof err.type === 'string' &&
    err.type.startsWith('entity.')
  );
}

function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return { statusCode: statusByCode[err.code], error: err.code, message: err.message };
  }
  if (isBodyParserError(err)) {
    return {
      statusCode: 400,
      error: 'DADOS_INVALIDOS',
      message: 'O corpo da requisição não é um JSON válido.',
    };
  }
  // Erro que ninguém previu: o cliente recebe uma mensagem genérica.
  return { statusCode: 500, error: 'ERRO_INTERNO', message: 'Erro interno do servidor.' };
}

/** Chegou aqui = nenhuma rota respondeu. */
export const notFoundHandler: RequestHandler = (_req, res, next) => {
  res.locals.skipLog = true; // RA2: 404 de rota inexistente não é logado
  next(new AppError('RECURSO_NAO_ENCONTRADO', 'Rota não encontrada.'));
};

/**
 * Ponto único de tratamento de erro. O Express sabe que é um error handler
 * porque a função tem 4 parâmetros. Qualquer erro lançado em qualquer camada
 * (middleware, controller, service, repository) acaba aqui.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const body = toErrorBody(err);

  if (body.statusCode >= 500) {
    // O detalhe técnico (stack trace) vai para o log do servidor,
    // nunca para a resposta (RNF03).
    log('error', {
      requestId: req.requestId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  res.locals.errorCode = body.error;
  res.status(body.statusCode).json(body);
};
