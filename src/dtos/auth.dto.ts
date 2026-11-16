import { z } from 'zod';

/**
 * DTO de entrada do login. O e-mail aqui só precisa ser um texto não vazio:
 * um e-mail que não existe é "credencial inválida" (401), não "dado inválido" (400).
 */
export const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});
