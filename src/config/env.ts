import dotenv from 'dotenv';
import { z } from 'zod';

// Em desenvolvimento lê o arquivo .env; em produção ele não existe e as
// variáveis vêm do painel da plataforma (RNF08).
dotenv.config({ quiet: true });

/**
 * Contrato das variáveis de ambiente. Se faltar alguma ou vier num formato
 * errado, a aplicação nem sobe: é melhor falhar na largada do que no meio
 * de uma requisição.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
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
