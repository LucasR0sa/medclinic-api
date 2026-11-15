import { HealthController } from './controllers/health.controller';

/**
 * Composition root: o ÚNICO lugar que dá `new` nas peças e as encaixa.
 * Cada classe recebe as dependências pelo construtor (RP02); quem decide
 * qual peça entra em qual é este arquivo. Nas próximas aulas ele vai montar
 * a cadeia repository → service → controller.
 */
export function buildContainer() {
  return {
    healthController: new HealthController(),
  };
}

export type Container = ReturnType<typeof buildContainer>;
