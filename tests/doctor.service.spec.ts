import { DoctorService } from '../src/services/doctor.service';
import { FakePasswordHasher } from './doubles/fake-password-hasher';
import { InMemoryDoctorRepository } from './doubles/in-memory-doctor.repository';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';

describe('DoctorService', () => {
  let users: InMemoryUserRepository;
  let doctors: InMemoryDoctorRepository;
  let service: DoctorService;

  const helena = {
    name: 'Dra. Helena Souza',
    email: 'Helena@MedClinic.com',
    password: 'SenhaForte@123',
    crm: 'CRM-SC-54321',
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    doctors = new InMemoryDoctorRepository(users);
    service = new DoctorService(users, doctors, new FakePasswordHasher());
  });

  describe('create', () => {
    it('cria o médico e o usuário com perfil doctor, sem expor a senha', async () => {
      const result = await service.create(helena);

      expect(result).toEqual({
        id: 1,
        crm: 'CRM-SC-54321',
        user: { id: 1, name: 'Dra. Helena Souza', email: 'helena@medclinic.com', roles: ['doctor'] },
      });
      expect(users.items[0]?.passwordHash).toBe('hash(SenhaForte@123)');
    });

    it('recusa e-mail já cadastrado e não cria médico', async () => {
      await service.create(helena);

      await expect(
        service.create({ ...helena, email: 'HELENA@medclinic.com', crm: 'CRM-NOVO' }),
      ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO' });
      expect(doctors.items).toHaveLength(1);
    });

    it('recusa CRM já cadastrado e NÃO deixa o usuário criado (RN03)', async () => {
      await service.create(helena);

      await expect(
        service.create({ ...helena, email: 'outra@medclinic.com' }),
      ).rejects.toMatchObject({ code: 'CRM_JA_CADASTRADO' });
      expect(users.items.map((u) => u.email)).toEqual(['helena@medclinic.com']);
    });
  });

  describe('list / getById', () => {
    it('lista paginado e filtra pelo nome do médico', async () => {
      await service.create(helena);
      await service.create({ ...helena, name: 'Dr. Paulo', email: 'p@m.com', crm: 'CRM-2' });

      const page = await service.list({ page: 1, pageSize: 20, name: 'helena' });

      expect(page.data.map((d) => d.crm)).toEqual(['CRM-SC-54321']);
      expect(page.meta).toEqual({ total: 1, page: 1, pageSize: 20, totalPages: 1 });
    });

    it('busca por id e lança RECURSO_NAO_ENCONTRADO quando não existe', async () => {
      await service.create(helena);

      await expect(service.getById(1)).resolves.toMatchObject({ crm: 'CRM-SC-54321' });
      await expect(service.getById(99)).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
    });
  });
});
