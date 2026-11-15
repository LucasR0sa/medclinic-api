export type LogLevel = 'info' | 'warn' | 'error';

/**
 * Log estruturado: uma linha de JSON por evento. A plataforma de nuvem
 * consegue filtrar por campo (ex.: level = "error") em vez de ler texto solto.
 */
export function log(level: LogLevel, fields: Record<string, unknown>): void {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, ...fields });

  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}
