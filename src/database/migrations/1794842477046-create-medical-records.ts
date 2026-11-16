import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 7: prontuário. */
export class CreateMedicalRecords1794842477046 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE medical_records (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        patient_id  integer     NOT NULL REFERENCES patients (id),
        doctor_id   integer     NOT NULL REFERENCES doctors (id),
        text        text        NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_medical_records_text CHECK (length(trim(text)) > 0)
      )
    `);
    // A leitura é sempre "o prontuário deste paciente, do mais novo para o mais antigo".
    await queryRunner.query(
      `CREATE INDEX ix_medical_records_patient ON medical_records (patient_id, created_at DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE medical_records`);
  }
}
