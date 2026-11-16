import type { DataSource } from 'typeorm';
import { env } from './config/env';
import { AppointmentController } from './controllers/appointment.controller';
import { AuthController } from './controllers/auth.controller';
import { DoctorController } from './controllers/doctor.controller';
import { HealthController } from './controllers/health.controller';
import { MedicalRecordController } from './controllers/medical-record.controller';
import { PatientController } from './controllers/patient.controller';
import { UserController } from './controllers/user.controller';
import { WorkScheduleController } from './controllers/work-schedule.controller';
import { MedicalRecord } from './entities/medical-record.entity';
import { Patient } from './entities/patient.entity';
import { User } from './entities/user.entity';
import { TypeOrmAppointmentRepository } from './repositories/typeorm-appointment.repository';
import { TypeOrmDoctorRepository } from './repositories/typeorm-doctor.repository';
import { TypeOrmMedicalRecordRepository } from './repositories/typeorm-medical-record.repository';
import { TypeOrmPatientRepository } from './repositories/typeorm-patient.repository';
import { TypeOrmUserRepository } from './repositories/typeorm-user.repository';
import { TypeOrmWorkScheduleRepository } from './repositories/typeorm-work-schedule.repository';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher';
import { JwtTokenService } from './security/jwt-token-service';
import { authenticate } from './middlewares/auth.middleware';
import { AppointmentService } from './services/appointment.service';
import { AuthService } from './services/auth.service';
import { CalendarService } from './services/calendar.service';
import { DoctorService } from './services/doctor.service';
import { MedicalRecordService } from './services/medical-record.service';
import { PatientService } from './services/patient.service';
import { UserService } from './services/user.service';
import { WorkScheduleService } from './services/work-schedule.service';

/**
 * Composition root: o ÚNICO lugar que dá `new` nas peças e as encaixa (RP02).
 * Lê-se de baixo para cima na cadeia: repository → service → controller.
 * É aqui (e só aqui) que a implementação real entra no lugar de cada porta.
 */
export function buildContainer(dataSource: DataSource) {
  // Infraestrutura (implementações das portas)
  const userRepository = new TypeOrmUserRepository(dataSource.getRepository(User));
  const patientRepository = new TypeOrmPatientRepository(dataSource.getRepository(Patient));
  const doctorRepository = new TypeOrmDoctorRepository(dataSource);
  const workScheduleRepository = new TypeOrmWorkScheduleRepository(dataSource);
  const appointmentRepository = new TypeOrmAppointmentRepository(dataSource);
  const medicalRecordRepository = new TypeOrmMedicalRecordRepository(
    dataSource.getRepository(MedicalRecord),
  );
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);

  // Regras de negócio
  const authService = new AuthService(userRepository, passwordHasher, tokenService);
  const userService = new UserService(userRepository, passwordHasher);
  const patientService = new PatientService(patientRepository);
  const doctorService = new DoctorService(userRepository, doctorRepository, passwordHasher);
  const workScheduleService = new WorkScheduleService(doctorRepository, workScheduleRepository);
  const appointmentService = new AppointmentService(
    doctorRepository,
    patientRepository,
    workScheduleRepository,
    appointmentRepository,
  );
  const calendarService = new CalendarService(
    doctorRepository,
    workScheduleRepository,
    appointmentRepository,
  );
  const medicalRecordService = new MedicalRecordService(
    patientRepository,
    doctorRepository,
    appointmentRepository,
    medicalRecordRepository,
  );

  return {
    authenticate: authenticate(tokenService),
    healthController: new HealthController(),
    authController: new AuthController(authService),
    userController: new UserController(userService),
    patientController: new PatientController(patientService),
    doctorController: new DoctorController(doctorService),
    workScheduleController: new WorkScheduleController(workScheduleService),
    appointmentController: new AppointmentController(appointmentService, calendarService),
    medicalRecordController: new MedicalRecordController(medicalRecordService),
  };
}

export type Container = ReturnType<typeof buildContainer>;
