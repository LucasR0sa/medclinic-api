import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 4: médicos. CRM único e um registro profissional por usuário (RN03 + RP04). */
export class CreateDoctors1794842477043 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE doctors (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id     integer     NOT NULL REFERENCES users (id),
        crm         varchar(30) NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_doctors_crm  UNIQUE (crm),
        CONSTRAINT uq_doctors_user UNIQUE (user_id)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE doctors`);
  }
}
