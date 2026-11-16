import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Reforma 5: escala de trabalho, uma linha por turno (RN04). */
export class CreateWorkShifts1794842477044 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE work_shifts (
        id                     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        doctor_id              integer  NOT NULL REFERENCES doctors (id),
        week_day               smallint NOT NULL,
        start_minute           smallint NOT NULL,
        end_minute             smallint NOT NULL,
        slot_duration_minutes  smallint NOT NULL,
        CONSTRAINT ck_work_shifts_week_day CHECK (week_day BETWEEN 0 AND 6),
        CONSTRAINT ck_work_shifts_period   CHECK (start_minute >= 0 AND start_minute < end_minute AND end_minute <= 1440),
        CONSTRAINT ck_work_shifts_slot     CHECK (slot_duration_minutes > 0)
      )
    `);
    await queryRunner.query(`CREATE INDEX ix_work_shifts_doctor ON work_shifts (doctor_id, week_day)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE work_shifts`);
  }
}
