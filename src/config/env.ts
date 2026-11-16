import dotenv from 'dotenv';
import { z } from 'zod';

// Em desenvolvimento lê o arquivo .env; em produção ele não existe e as
// variáveis vêm do painel da plataforma (RNF08).
dotenv.config({ quiet: true });

/**
 * Variável de ambiente sempre chega como TEXTO. z.coerce.boolean() trataria
 * "false" como true (texto não vazio é verdadeiro em JS), então aceitamos
 * só "true"/"false" e convertemos explicitamente.
 */
const booleanFromText = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

/**
 * Contrato das variáveis de ambiente. Se faltar alguma ou vier num formato
 * errado, a aplicação nem sobe: é melhor falhar na largada do que no meio
 * de uma requisição.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Banco de dados (local: docker compose; produção: Neon)
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_SSL: booleanFromText, // RP08: produção exige conexão criptografada

  // Token de acesso
  JWT_SECRET: z.string().min(32, 'use pelo menos 32 caracteres aleatórios'),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(3600), // em segundos

  // Primeiro administrador, criado pela migration de seed (RP07)
  ADMIN_NAME: z.string().min(1).default('Administrador'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map(
    (issue) => `${issue.path.map(String).join('.')}: ${issue.message}`,
  );
  console.error(`Variáveis de ambiente inválidas:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

export const env = parsed.data;
