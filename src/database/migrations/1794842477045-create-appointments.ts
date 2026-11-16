import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 6: consultas, com o período [starts_at, ends_at) e o status. */
export class CreateAppointments1794842477045 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE appointments (
        id          integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        doctor_id   integer     NOT NULL REFERENCES doctors (id),
        patient_id  integer     NOT NULL REFERENCES patients (id),
        starts_at   timestamptz NOT NULL,
        ends_at     timestamptz NOT NULL,
        status      varchar(20) NOT NULL DEFAULT 'scheduled',
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_appointments_period CHECK (starts_at < ends_at),
        CONSTRAINT ck_appointments_status CHECK (
          status IN ('scheduled', 'in_progress', 'done', 'cancelled')
        )
      )
    `);
    // As buscas de conflito são sempre "deste médico/paciente, neste período".
    await queryRunner.query(
      `CREATE INDEX ix_appointments_doctor_starts ON appointments (doctor_id, starts_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_appointments_patient_starts ON appointments (patient_id, starts_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE appointments`);
  }
}
