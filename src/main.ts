import { createApp } from './app';
import { env } from './config/env';
import { buildContainer } from './container';
import { log } from './shared/logger';

const app = createApp(buildContainer());

// 0.0.0.0 = aceita conexões vindas de fora do container (RP10).
// Com 'localhost', a nuvem não consegue entregar tráfego para a API.
app.listen(env.PORT, '0.0.0.0', (error?: Error) => {
  if (error) {
    log('error', { message: 'Falha ao iniciar o servidor', error: error.message });
    process.exit(1);
  }
  log('info', { message: `MedClinic API ouvindo na porta ${env.PORT}` });
});
