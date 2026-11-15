import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    // Enquanto não existe nenhum service, a suíte vazia não deve reprovar.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      // Recorte da cobertura: só os arquivos de regra de negócio (RNF07).
      include: ['src/**/*.service.ts'],
      reporter: ['text', 'html'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
  },
});
