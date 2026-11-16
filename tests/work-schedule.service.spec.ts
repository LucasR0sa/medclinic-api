import { WorkScheduleService } from '../src/services/work-schedule.service';
import { InMemoryDoctorRepository } from './doubles/in-memory-doctor.repository';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';
import { InMemoryWorkScheduleRepository } from './doubles/in-memory-work-schedule.repository';

/** Caso mínimo 3 (Seção 4.5): validação da escala. */
describe('WorkScheduleService', () => {
  let doctors: InMemoryDoctorRepository;
  let schedules: InMemoryWorkScheduleRepository;
  let service: WorkScheduleService;
  let doctorId: number;

  const shift = (weekDay: number, startTime: string, endTime: string, slotDurationMinutes = 30) => ({
    weekDay,
    startTime,
    endTime,
    slotDurationMinutes,
  });

  beforeEach(async () => {
    doctors = new InMemoryDoctorRepository(new InMemoryUserRepository());
    schedules = new InMemoryWorkScheduleRepository();
    service = new WorkScheduleService(doctors, schedules);
    doctorId = (await doctors.seed()).id;
  });

  it('grava e devolve a escala ordenada, no formato do contrato', async () => {
    const result = await service.replace(doctorId, {
      shifts: [shift(4, '08:00', '11:00'), shift(2, '14:00', '18:00', 20), shift(2, '08:00', '12:00')],
    });

    expect(result.shifts).toEqual([
      shift(2, '08:00', '12:00'),
      shift(2, '14:00', '18:00', 20),
      shift(4, '08:00', '11:00'),
    ]);
  });

  it('rejeita turnos sobrepostos no mesmo dia da semana', async () => {
    await expect(
      service.replace(doctorId, { shifts: [shift(2, '08:00', '12:00'), shift(2, '11:00', '14:00')] }),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
    expect(schedules.items).toHaveLength(0);
  });

  it('aceita turnos encostados (08:00-12:00 e 12:00-18:00)', async () => {
    const result = await service.replace(doctorId, {
      shifts: [shift(2, '08:00', '12:00'), shift(2, '12:00', '18:00')],
    });

    expect(result.shifts).toHaveLength(2);
  });

  it('aceita o mesmo horário em dias diferentes', async () => {
    const result = await service.replace(doctorId, {
      shifts: [shift(2, '08:00', '12:00'), shift(3, '08:00', '12:00')],
    });

    expect(result.shifts).toHaveLength(2);
  });

  it('substitui a escala inteira, e "shifts": [] apaga tudo', async () => {
    await service.replace(doctorId, { shifts: [shift(2, '08:00', '12:00')] });
    await service.replace(doctorId, { shifts: [shift(5, '13:00', '17:00')] });
    await expect(service.get(doctorId)).resolves.toEqual({ shifts: [shift(5, '13:00', '17:00')] });

    await service.replace(doctorId, { shifts: [] });
    await expect(service.get(doctorId)).resolves.toEqual({ shifts: [] });
  });

  it('médico inexistente → RECURSO_NAO_ENCONTRADO, na gravação e na consulta', async () => {
    await expect(service.replace(99, { shifts: [] })).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
    await expect(service.get(99)).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });
});
