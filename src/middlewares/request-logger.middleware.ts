import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { log, type LogLevel } from '../shared/logger';

function levelFor(statusCode: number): LogLevel {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/**
 * RA2: um log estruturado por resposta.
 *
 * Este middleware roda no INÍCIO da requisição: gera o requestId e liga o
 * cronômetro. Mas só escreve o log no FIM, quando a resposta já saiu
 * (evento 'finish'). É por isso que ele consegue saber o statusCode e a duração.
 *
 * Só campos seguros entram no log: nada de corpo da requisição, cabeçalho
 * Authorization, senha ou token.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  const { method, path } = req;

  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    if (res.locals.skipLog) return;

    log(levelFor(res.statusCode), {
      requestId: req.requestId,
      method,
      path,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      error: res.locals.errorCode,
    });
  });

  next();
};
