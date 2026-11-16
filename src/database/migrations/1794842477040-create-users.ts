import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 1: cria a tabela de usuários. */
export class CreateUsers1794842477040 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name          varchar(120) NOT NULL,
        email         varchar(255) NOT NULL,
        password_hash varchar(100) NOT NULL,
        roles         text[]       NOT NULL,
        created_at    timestamptz  NOT NULL DEFAULT now(),
        -- RP04: o BANCO garante e-mail único, não só o código
        CONSTRAINT uq_users_email UNIQUE (email),
        -- pelo menos um perfil, e só os três do contrato
        CONSTRAINT ck_users_roles CHECK (
          cardinality(roles) > 0
          AND roles <@ ARRAY['admin', 'secretary', 'doctor']::text[]
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
