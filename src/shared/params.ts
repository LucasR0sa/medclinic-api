import { z } from 'zod';
import { AppError } from '../errors/app-error';

/** Limite do tipo integer do Postgres: um id maior que isso nem chega a ser consultado. */
const idSchema = z.coerce.number().int().positive().max(2_147_483_647);

/** Converte o :id da URL em número. "abc", "0" ou "-1" → 400 DADOS_INVALIDOS. */
export function parseId(raw: unknown, field = 'id'): number {
  const result = idSchema.safeParse(raw);
  if (!result.success) {
    throw new AppError('DADOS_INVALIDOS', `O parâmetro ${field} deve ser um inteiro positivo.`);
  }
  return result.data;
}
