import { log } from '../shared/logger';
import { dataSource } from './data-source';

/**
 * Comando de migration para uso manual:
 *   npm run migration:run     aplica as reformas pendentes
 *   npm run migration:revert  desfaz a última
 * Em produção não é preciso: a aplicação aplica as pendentes ao iniciar (main.ts).
 */
async function main(): Promise<void> {
  const revert = process.argv.includes('--revert');
  await dataSource.initialize();

  if (revert) {
    await dataSource.undoLastMigration();
    log('info', { message: 'Última migration desfeita.' });
  } else {
    const applied = await dataSource.runMigrations();
    log('info', { message: 'Migrations aplicadas.', migrations: applied.map((m) => m.name) });
  }

  await dataSource.destroy();
}

main().catch((error: unknown) => {
  log('error', { message: 'Falha na migration', error: String(error) });
  process.exit(1);
});
