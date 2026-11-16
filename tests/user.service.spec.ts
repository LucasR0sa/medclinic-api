import { UserService } from '../src/services/user.service';
import { FakePasswordHasher } from './doubles/fake-password-hasher';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';

describe('UserService', () => {
  let users: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserService(users, new FakePasswordHasher());
  });

  describe('create', () => {
    const input = {
      name: 'Joana Secretária',
      email: 'Joana@MedClinic.com',
      password: 'SenhaForte@123',
      roles: ['secretary' as const],
    };

    it('cadastra e devolve id, nome, e-mail e perfis, sem a senha', async () => {
      const result = await service.create(input);

      expect(result).toEqual({
        id: 1,
        name: 'Joana Secretária',
        email: 'joana@medclinic.com',
        roles: ['secretary'],
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('guarda só o hash da senha, nunca o texto', async () => {
      await service.create(input);

      expect(users.items[0]?.passwordHash).toBe('hash(SenhaForte@123)');
    });

    it('recusa e-mail já cadastrado, mesmo com maiúsculas diferentes', async () => {
      await service.create(input);

      await expect(
        service.create({ ...input, email: 'JOANA@medclinic.com' }),
      ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO' });
      expect(users.items).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('devolve o usuário sem a senha', async () => {
      await users.create({ name: 'Admin', email: 'a@m.com', passwordHash: 'h', roles: ['admin'] });

      await expect(service.getById(1)).resolves.toEqual({
        id: 1,
        name: 'Admin',
        email: 'a@m.com',
        roles: ['admin'],
      });
    });

    it('lança RECURSO_NAO_ENCONTRADO para id que não existe', async () => {
      await expect(service.getById(99)).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
    });
  });
});
