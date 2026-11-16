import { z } from 'zod';

/**
 * RF10: toda listagem é paginada. Query string sempre chega como TEXTO,
 * por isso o coerce. Fora do formato (page=0, pageSize=101, page=abc) → 400.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Envelope de listagem do contrato (Seção 4.9.1). */
export interface Page<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

/** O que o repositório devolve: a fatia pedida + quantos existem no total. */
export interface Slice<T> {
  items: T[];
  total: number;
}

export function toPage<T>(data: T[], total: number, { page, pageSize }: Pagination): Page<T> {
  return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
}

/** Quantas linhas pular: página 3 de 20 em 20 → pula 40. */
export function offsetOf({ page, pageSize }: Pagination): number {
  return (page - 1) * pageSize;
}
