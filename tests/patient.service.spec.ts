import { PatientService } from '../src/services/patient.service';
import { InMemoryPatientRepository } from './doubles/in-memory-patient.repository';

describe('PatientService', () => {
  let patients: InMemoryPatientRepository;
  let service: PatientService;

  beforeEach(() => {
    patients = new InMemoryPatientRepository();
    service = new PatientService(patients);
  });

  const carlos = { name: 'Carlos Pereira', cpf: '12345678901' };

  describe('create', () => {
    it('cadastra e devolve id, nome, CPF e createdAt', async () => {
      const result = await service.create(carlos);

      expect(result).toMatchObject({ id: 1, name: 'Carlos Pereira', cpf: '12345678901' });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('recusa CPF já cadastrado (RN02) sem criar um segundo registro', async () => {
      await service.create(carlos);

      await expect(service.create({ name: 'Outro', cpf: carlos.cpf })).rejects.toMatchObject({
        code: 'CPF_JA_CADASTRADO',
      });
      expect(patients.items).toHaveLength(1);
    });

    it('libera o CPF de um paciente removido', async () => {
      const { id } = await service.create(carlos);
      await service.remove(id);

      await expect(service.create(carlos)).resolves.toMatchObject({ id: 2 });
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await service.create(carlos);
      await service.create({ name: 'Ana Carla', cpf: '22222222222' });
      await service.create({ name: 'Bruno Lima', cpf: '33333333333' });
    });

    it('devolve o envelope de paginação do contrato', async () => {
      const page = await service.list({ page: 2, pageSize: 2 });

      expect(page.data.map((p) => p.name)).toEqual(['Bruno Lima']);
      expect(page.meta).toEqual({ total: 3, page: 2, pageSize: 2, totalPages: 2 });
    });

    it('filtra por nome parcial sem diferenciar maiúsculas', async () => {
      const page = await service.list({ page: 1, pageSize: 20, name: 'CARL' });

      expect(page.data.map((p) => p.name)).toEqual(['Carlos Pereira', 'Ana Carla']);
      expect(page.meta.total).toBe(2);
    });
  });

  describe('getById / update / remove', () => {
    it('busca, renomeia e remove um paciente existente', async () => {
      const { id } = await service.create(carlos);

      await expect(service.getById(id)).resolves.toMatchObject({ name: 'Carlos Pereira' });
      await expect(service.update(id, { name: 'Carlos P.' })).resolves.toMatchObject({
        name: 'Carlos P.',
      });
      await service.remove(id);
      await expect(service.getById(id)).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
    });

    it.each([
      ['getById', (s: PatientService) => s.getById(99)],
      ['update', (s: PatientService) => s.update(99, { name: 'X' })],
      ['remove', (s: PatientService) => s.remove(99)],
    ])('%s de paciente inexistente lança RECURSO_NAO_ENCONTRADO', async (_name, call) => {
      await expect(call(service)).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
    });
  });
});
