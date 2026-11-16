import type { MigrationInterface, QueryRunner } from 'typeorm';
import { env } from '../../config/env';
import { BcryptPasswordHasher } from '../../security/bcrypt-password-hasher';

/**
 * Reforma 2: o primeiro administrador (RP07). Não existe rota pública que
 * crie admin (RF13), então o primeiro nasce aqui, com credenciais vindas do
 * ambiente. Atenção: a migration roda UMA vez. Trocar ADMIN_PASSWORD depois
 * não altera o admin que já existe.
 */
export class SeedAdmin1794842477041 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await new BcryptPasswordHasher().hash(env.ADMIN_PASSWORD);

    // $1, $2...: consulta parametrizada (RNF02). O valor nunca é colado no SQL.
    await queryRunner.query(
      `INSERT INTO users (name, email, password_hash, roles)
       VALUES ($1, $2, $3, $4::text[])
       ON CONFLICT (email) DO NOTHING`,
      [env.ADMIN_NAME, env.ADMIN_EMAIL.toLowerCase(), passwordHash, ['admin']],
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE email = $1`, [
      env.ADMIN_EMAIL.toLowerCase(),
    ]);
  }
}
