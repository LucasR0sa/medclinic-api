import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from '../config/env';
import { Patient } from '../entities/patient.entity';
import { User } from '../entities/user.entity';
import { CreateUsers1794842477040 } from './migrations/1794842477040-create-users';
import { SeedAdmin1794842477041 } from './migrations/1794842477041-seed-admin';
import { CreatePatients1794842477042 } from './migrations/1794842477042-create-patients';

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
  entities: [User, Patient],
  // A ordem do array é a ordem do livro de reformas.
  migrations: [CreateUsers1794842477040, SeedAdmin1794842477041, CreatePatients1794842477042],
  synchronize: false, // RP06: estrutura só por migration, nunca automática
  logging: false,
});
