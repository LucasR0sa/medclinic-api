import type { Doctor } from '../src/entities/doctor.entity';
import type { TokenPayload } from '../src/security/token-service';
import { MedicalRecordService } from '../src/services/medical-record.service';
import { InMemoryAppointmentRepository } from './doubles/in-memory-appointment.repository';
import { InMemoryDoctorRepository } from './doubles/in-memory-doctor.repository';
import { InMemoryMedicalRecordRepository } from './doubles/in-memory-medical-record.repository';
import { InMemoryPatientRepository } from './doubles/in-memory-patient.repository';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';

/** Caso mínimo 5 (Seção 4.5): prontuário com controle por vínculo (RN14). */
describe('MedicalRecordService', () => {
  let appointments: InMemoryAppointmentRepository;
  let records: InMemoryMedicalRecordRepository;
  let service: MedicalRecordService;
  let helena: Doctor;
  let paulo: Doctor;
  let patientId: number;

  const admin: TokenPayload = { userId: 900, roles: ['admin'] };
  const secretary: TokenPayload = { userId: 901, roles: ['secretary'] };
  const asDoctor = (doctor: Doctor): TokenPayload => ({ userId: doctor.userId, roles: ['doctor'] });
  const page = { page: 1, pageSize: 20 };

  beforeEach(async () => {
    const doctors = new InMemoryDoctorRepository(new InMemoryUserRepository());
    const patients = new InMemoryPatientRepository();
    appointments = new InMemoryAppointmentRepository();
    records = new InMemoryMedicalRecordRepository();
    service = new MedicalRecordService(patients, doctors, appointments, records);

    helena = await doctors.seed('Dra. Helena', 'CRM-1');
    paulo = await doctors.seed('Dr. Paulo', 'CRM-2');
    patientId = (await patients.create({ name: 'Ana', cpf: '11111111111' })).id;
  });

  /** Helena atendeu a paciente: consulta com o status dado. */
  const appointmentWithHelena = async (status: 'scheduled' | 'in_progress' | 'done') => {
    const a = await appointments.create({
      doctorId: helena.id,
      patientId,
      startsAt: new Date('2026-10-13T11:00:00Z'),
      endsAt: new Date('2026-10-13T11:30:00Z'),
    });
    a.status = status;
  };

  it('médico COM vínculo escreve; o autor vem do token', async () => {
    await appointmentWithHelena('in_progress');

    const result = await service.create(asDoctor(helena), patientId, { text: 'Dor lombar.' });

    expect(result).toMatchObject({ id: 1, patientId, doctorId: helena.id, text: 'Dor lombar.' });
  });

  it('médico SEM vínculo recebe ACESSO_NEGADO ao escrever e ao ler', async () => {
    await appointmentWithHelena('done');

    await expect(service.create(asDoctor(paulo), patientId, { text: 'x' })).rejects.toMatchObject({
      code: 'ACESSO_NEGADO',
    });
    await expect(service.list(asDoctor(paulo), patientId, page)).rejects.toMatchObject({
      code: 'ACESSO_NEGADO',
    });
    expect(records.items).toHaveLength(0);
  });

  it('consulta só agendada (scheduled) ainda NÃO dá vínculo', async () => {
    await appointmentWithHelena('scheduled');

    await expect(service.create(asDoctor(helena), patientId, { text: 'x' })).rejects.toMatchObject({
      code: 'ACESSO_NEGADO',
    });
  });

  it('usuário doctor sem registro de médico não tem vínculo', async () => {
    await expect(
      service.create({ userId: 777, roles: ['doctor'] }, patientId, { text: 'x' }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  it('leitura: médico com vínculo e admin leem, do mais novo para o mais antigo; secretária não', async () => {
    await appointmentWithHelena('done');
    await service.create(asDoctor(helena), patientId, { text: 'primeira' });
    await service.create(asDoctor(helena), patientId, { text: 'segunda' });

    const byDoctor = await service.list(asDoctor(helena), patientId, page);
    expect(byDoctor.data.map((r) => r.text)).toEqual(['segunda', 'primeira']);
    expect(byDoctor.meta.total).toBe(2);

    await expect(service.list(admin, patientId, page)).resolves.toMatchObject({
      meta: { total: 2 },
    });
    await expect(service.list(secretary, patientId, page)).rejects.toMatchObject({
      code: 'ACESSO_NEGADO',
    });
  });

  it('paciente inexistente → RECURSO_NAO_ENCONTRADO', async () => {
    await expect(service.create(asDoctor(helena), 99, { text: 'x' })).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
    await expect(service.list(admin, 99, page)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });
});
