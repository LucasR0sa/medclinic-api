import { QueryFailedError } from 'typeorm';

/**
 * O Postgres avisa violação de UNIQUE com o código 23505 e o nome da
 * restrição. Damos nome às restrições nas migrations justamente para
 * saber QUAL foi violada (e-mail? CPF? CRM?).
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505' &&
    'constraint' in driverError &&
    driverError.constraint === constraint
  );
}
