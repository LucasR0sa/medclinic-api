import { createApp } from './app';
import { env } from './config/env';
import { buildContainer } from './container';
import { dataSource } from './database/data-source';
import { log } from './shared/logger';

async function bootstrap(): Promise<void> {
  // 1. Conecta no banco e aplica as migrations pendentes (RP06).
  //    Se o banco estiver fora, a API nem sobe: falha na largada, não no meio.
  await dataSource.initialize();
  const applied = await dataSource.runMigrations();
  if (applied.length > 0) {
    log('info', { message: 'Migrations aplicadas.', migrations: applied.map((m) => m.name) });
  }

  // 2. Monta as peças e abre a porta.
  const app = createApp(buildContainer(dataSource));

  // 0.0.0.0 = aceita conexões vindas de fora do container (RP10).
  // Com 'localhost', a nuvem não consegue entregar tráfego para a API.
  app.listen(env.PORT, '0.0.0.0', (error?: Error) => {
    if (error) {
      log('error', { message: 'Falha ao iniciar o servidor', error: error.message });
      process.exit(1);
    }
    log('info', { message: `MedClinic API ouvindo na porta ${env.PORT}` });
  });
}

bootstrap().catch((error: unknown) => {
  log('error', { message: 'Falha na inicialização', error: String(error) });
  process.exit(1);
});
