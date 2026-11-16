import type { z } from 'zod';
import { AppError } from '../errors/app-error';

/**
 * Confere a entrada contra o DTO (RF12). Fora do formato → 400 DADOS_INVALIDOS,
 * antes de qualquer regra de negócio. Devolve o dado já tipado e limpo.
 */
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.map(String).join('.') || 'corpo'}: ${issue.message}`)
      .join('; ');
    throw new AppError('DADOS_INVALIDOS', `Dados inválidos. ${details}`);
  }
  return result.data;
}
