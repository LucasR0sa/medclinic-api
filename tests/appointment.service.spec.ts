import type { Doctor } from '../src/entities/doctor.entity';
import type { TokenPayload } from '../src/security/token-service';
import { AppointmentService } from '../src/services/appointment.service';
import { CalendarService } from '../src/services/calendar.service';
import { WorkScheduleService } from '../src/services/work-schedule.service';
import { InMemoryAppointmentRepository } from './doubles/in-memory-appointment.repository';
import { InMemoryDoctorRepository } from './doubles/in-memory-doctor.repository';
import { InMemoryPatientRepository } from './doubles/in-memory-patient.repository';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';
import { InMemoryWorkScheduleRepository } from './doubles/in-memory-work-schedule.repository';

// 13/10/2026 é uma TERÇA-feira (weekDay 2). Horários escritos no relógio da clínica (-03:00).
const at = (clock: string, day = '2026-10-13') => new Date(`${day}T${clock}:00-03:00`);

describe('AppointmentService', () => {
  let doctors: InMemoryDoctorRepository;
  let patients: InMemoryPatientRepository;
  let appointments: InMemoryAppointmentRepository;
  let service: AppointmentService;
  let calendar: CalendarService;
  let helena: Doctor;
  let paulo: Doctor;
  let ana: number;
  let bruno: number;

  const admin: TokenPayload = { userId: 900, roles: ['admin'] };
  const secretary: TokenPayload = { userId: 901, roles: ['secretary'] };
  const asDoctor = (doctor: Doctor): TokenPayload => ({ userId: doctor.userId, roles: ['doctor'] });

  beforeEach(async () => {
    doctors = new InMemoryDoctorRepository(new InMemoryUserRepository());
    patients = new InMemoryPatientRepository();
    const schedules = new InMemoryWorkScheduleRepository();
    appointments = new InMemoryAppointmentRepository();
    service = new AppointmentService(doctors, patients, schedules, appointments);
    calendar = new CalendarService(doctors, schedules, appointments);

    helena = await doctors.seed('Dra. Helena', 'CRM-1');
    paulo = await doctors.seed('Dr. Paulo', 'CRM-2');
    ana = (await patients.create({ name: 'Ana', cpf: '11111111111' })).id;
    bruno = (await patients.create({ name: 'Bruno', cpf: '22222222222' })).id;

    const scheduleService = new WorkScheduleService(doctors, schedules);
    const shifts = [
      { weekDay: 2, startTime: '08:00', endTime: '12:00', slotDurationMinutes: 30 },
      { weekDay: 2, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 20 },
      { weekDay: 4, startTime: '08:00', endTime: '11:10', slotDurationMinutes: 30 },
    ];
    await scheduleService.replace(helena.id, { shifts });
    await scheduleService.replace(paulo.id, { shifts });
  });

  const book = (doctorId: number, patientId: number, startsAt: Date) =>
    service.create({ doctorId, patientId, startsAt });

  /** Caso mínimo 2 (Seção 4.5): criação de agendamento. */
  describe('create', () => {
    it('caminho que dá certo: calcula o fim pela duração do turno e devolve em UTC', async () => {
      const result = await book(helena.id, ana, at('08:00'));

      expect(result).toEqual({
        id: 1,
        doctorId: helena.id,
        patientId: ana,
        startsAt: new Date('2026-10-13T11:00:00.000Z'),
        endsAt: new Date('2026-10-13T11:30:00.000Z'),
        status: 'scheduled',
      });
    });

    it('usa a duração do turno em que o horário cai (tarde: 20 min)', async () => {
      const result = await book(helena.id, ana, at('17:40'));

      expect(result.endsAt).toEqual(at('18:00'));
    });

    it('1. médico ou paciente inexistente → RECURSO_NAO_ENCONTRADO', async () => {
      await expect(book(99, ana, at('08:00'))).rejects.toMatchObject({
        code: 'RECURSO_NAO_ENCONTRADO',
      });
      await expect(book(helena.id, 99, at('08:00'))).rejects.toMatchObject({
        code: 'RECURSO_NAO_ENCONTRADO',
      });
    });

    it.each([
      ['2. fora de qualquer turno (12:30, no intervalo do almoço)', at('12:30')],
      ['2. dia sem escala (quarta-feira)', at('08:00', '2026-10-14')],
      ['3. desalinhado da grade (08:20 num turno de 30 min)', at('08:20')],
      ['3. desalinhado nos segundos (08:00:30)', new Date('2026-10-13T08:00:30-03:00')],
      ['4. não cabe no fim do turno (quinta 11:00 + 30 > 11:10)', at('11:00', '2026-10-15')],
    ])('%s → HORARIO_FORA_DA_ESCALA', async (_cenario, startsAt) => {
      await expect(book(helena.id, ana, startsAt)).rejects.toMatchObject({
        code: 'HORARIO_FORA_DA_ESCALA',
      });
      expect(appointments.items).toHaveLength(0);
    });

    it('5. conflito com consulta existente do MÉDICO → HORARIO_INDISPONIVEL', async () => {
      await book(helena.id, ana, at('08:00'));

      await expect(book(helena.id, bruno, at('08:00'))).rejects.toMatchObject({
        code: 'HORARIO_INDISPONIVEL',
      });
    });

    it('6. conflito com consulta existente do PACIENTE, mesmo com outro médico → PACIENTE_INDISPONIVEL', async () => {
      await book(helena.id, ana, at('08:00'));

      await expect(book(paulo.id, ana, at('08:00'))).rejects.toMatchObject({
        code: 'PACIENTE_INDISPONIVEL',
      });
    });

    it('consultas encostadas convivem (08:00-08:30 e 08:30-09:00)', async () => {
      await book(helena.id, ana, at('08:00'));

      await expect(book(helena.id, bruno, at('08:30'))).resolves.toMatchObject({ id: 2 });
    });

    it('RN13: cancelar libera o horário para outra consulta', async () => {
      const first = await book(helena.id, ana, at('08:00'));
      await service.changeStatus(secretary, first.id, 'cancelled');

      await expect(book(helena.id, bruno, at('08:00'))).resolves.toMatchObject({ id: 2 });
    });

    it('RN10: duas tentativas simultâneas para o mesmo horário → exatamente uma vence', async () => {
      const results = await Promise.allSettled([
        book(helena.id, ana, at('09:00')),
        book(helena.id, bruno, at('09:00')),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((r) => r.status === 'rejected')).toMatchObject({
        reason: { code: 'HORARIO_INDISPONIVEL' },
      });
      expect(appointments.items).toHaveLength(1);
    });
  });

  /** Caso mínimo 4 (Seção 4.5): transição de status. */
  describe('changeStatus', () => {
    let id: number;

    beforeEach(async () => {
      id = (await book(helena.id, ana, at('08:00'))).id;
    });

    it('transições válidas: o médico da consulta inicia, o admin conclui', async () => {
      await expect(service.changeStatus(asDoctor(helena), id, 'in_progress')).resolves.toMatchObject(
        { status: 'in_progress' },
      );
      await expect(service.changeStatus(admin, id, 'done')).resolves.toMatchObject({
        status: 'done',
      });
    });

    it('transição inválida: scheduled → done → TRANSICAO_INVALIDA', async () => {
      await expect(service.changeStatus(admin, id, 'done')).rejects.toMatchObject({
        code: 'TRANSICAO_INVALIDA',
      });
    });

    it('done e cancelled são o fim da linha', async () => {
      await service.changeStatus(admin, id, 'cancelled');

      await expect(service.changeStatus(admin, id, 'scheduled')).rejects.toMatchObject({
        code: 'TRANSICAO_INVALIDA',
      });
    });

    it('a secretária cancela consulta agendada, mas não em andamento', async () => {
      const other = (await book(helena.id, bruno, at('09:00'))).id;
      await expect(service.changeStatus(secretary, other, 'cancelled')).resolves.toMatchObject({
        status: 'cancelled',
      });

      await service.changeStatus(admin, id, 'in_progress');
      await expect(service.changeStatus(secretary, id, 'cancelled')).rejects.toMatchObject({
        code: 'ACESSO_NEGADO',
      });
    });

    it('outro médico não pode iniciar a consulta → ACESSO_NEGADO', async () => {
      await expect(service.changeStatus(asDoctor(paulo), id, 'in_progress')).rejects.toMatchObject({
        code: 'ACESSO_NEGADO',
      });
    });

    it('consulta inexistente → RECURSO_NAO_ENCONTRADO', async () => {
      await expect(service.changeStatus(admin, 99, 'cancelled')).rejects.toMatchObject({
        code: 'RECURSO_NAO_ENCONTRADO',
      });
    });

    it('se outra requisição mudou o status no meio do caminho → TRANSICAO_INVALIDA', async () => {
      vi.spyOn(appointments, 'changeStatus').mockResolvedValueOnce(null);

      await expect(service.changeStatus(admin, id, 'cancelled')).rejects.toMatchObject({
        code: 'TRANSICAO_INVALIDA',
      });
    });
  });

  describe('list / getById', () => {
    beforeEach(async () => {
      await book(helena.id, ana, at('08:00'));
      await book(paulo.id, bruno, at('08:00'));
      await book(paulo.id, ana, at('10:00', '2026-10-15'));
    });

    it('admin vê todas e pode filtrar por médico, status e período', async () => {
      expect((await service.list(admin, { page: 1, pageSize: 20 })).meta.total).toBe(3);

      const filtered = await service.list(admin, {
        page: 1,
        pageSize: 20,
        doctorId: paulo.id,
        status: 'scheduled',
        from: '2026-10-15',
        to: '2026-10-15',
      });
      expect(filtered.data.map((a) => a.patientId)).toEqual([ana]);
    });

    it('o médico só vê as próprias consultas, mesmo pedindo o doctorId de outro', async () => {
      const page = await service.list(asDoctor(helena), {
        page: 1,
        pageSize: 20,
        doctorId: paulo.id,
      });

      expect(page.data.every((a) => a.doctorId === helena.id)).toBe(true);
      expect(page.meta.total).toBe(1);
    });

    it('usuário doctor sem registro de médico não vê nada', async () => {
      const page = await service.list({ userId: 777, roles: ['doctor'] }, { page: 1, pageSize: 20 });

      expect(page).toEqual({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } });
    });

    it('getById: secretária e médico da consulta veem; outro médico recebe ACESSO_NEGADO', async () => {
      await expect(service.getById(secretary, 1)).resolves.toMatchObject({ id: 1 });
      await expect(service.getById(asDoctor(helena), 1)).resolves.toMatchObject({ id: 1 });
      await expect(service.getById(asDoctor(paulo), 1)).rejects.toMatchObject({
        code: 'ACESSO_NEGADO',
      });
      await expect(service.getById(admin, 99)).rejects.toMatchObject({
        code: 'RECURSO_NAO_ENCONTRADO',
      });
    });
  });

  describe('CalendarService', () => {
    it('devolve a escala e só as consultas ativas do período (dias inteiros, horário local)', async () => {
      await book(helena.id, ana, at('08:00'));
      const cancelled = await book(helena.id, bruno, at('09:00'));
      await service.changeStatus(admin, cancelled.id, 'cancelled');
      await book(helena.id, ana, at('08:00', '2026-10-20')); // fora do período

      const result = await calendar.get(helena.id, { from: '2026-10-12', to: '2026-10-16' });

      expect(result.workSchedule.shifts).toHaveLength(3);
      expect(result.appointments).toEqual([
        {
          id: 1,
          patientId: ana,
          startsAt: new Date('2026-10-13T11:00:00.000Z'),
          endsAt: new Date('2026-10-13T11:30:00.000Z'),
          status: 'scheduled',
        },
      ]);
    });

    it('médico inexistente → RECURSO_NAO_ENCONTRADO', async () => {
      await expect(calendar.get(99, { from: '2026-10-12', to: '2026-10-16' })).rejects.toMatchObject(
        { code: 'RECURSO_NAO_ENCONTRADO' },
      );
    });
  });
});
