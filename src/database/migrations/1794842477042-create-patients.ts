import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 3: pacientes, com CPF único garantido pelo banco (RN02 + RP04). */
export class CreatePatients1794842477042 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE patients (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name        varchar(120) NOT NULL,
        cpf         char(11)     NOT NULL,
        created_at  timestamptz  NOT NULL DEFAULT now(),
        deleted_at  timestamptz  NULL,
        CONSTRAINT ck_patients_cpf CHECK (cpf ~ '^[0-9]{11}$')
      )
    `);
    // Índice único PARCIAL: só vale entre os pacientes não removidos.
    // Um paciente removido (remoção lógica) libera o CPF para novo cadastro.
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_patients_cpf ON patients (cpf) WHERE deleted_at IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE patients`);
  }
}
