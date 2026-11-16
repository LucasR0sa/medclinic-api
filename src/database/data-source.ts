import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { User } from '../entities/user.entity';
import { WorkShift } from '../entities/work-shift.entity';
import { CreateUsers1794842477040 } from './migrations/1794842477040-create-users';
import { SeedAdmin1794842477041 } from './migrations/1794842477041-seed-admin';
import { CreatePatients1794842477042 } from './migrations/1794842477042-create-patients';
import { CreateDoctors1794842477043 } from './migrations/1794842477043-create-doctors';
import { CreateWorkShifts1794842477044 } from './migrations/1794842477044-create-work-shifts';

/**
 * A "gaveta" do arquivo de fichas: como chegar no banco e o que existe nele.
 * O mesmo código serve o Postgres local e o Neon; só as variáveis mudam.
 */
export const dataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false, // RP08
  entities: [User, Patient, Doctor, WorkShift],
  // A ordem do array é a ordem do livro de reformas.
  migrations: [
    CreateUsers1794842477040,
    SeedAdmin1794842477041,
    CreatePatients1794842477042,
    CreateDoctors1794842477043,
    CreateWorkShifts1794842477044,
  ],
  synchronize: false, // RP06: estrutura só por migration, nunca automática
  logging: false,
});
