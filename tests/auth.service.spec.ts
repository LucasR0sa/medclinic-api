import { AuthService } from '../src/services/auth.service';
import { FakePasswordHasher } from './doubles/fake-password-hasher';
import { FakeTokenService } from './doubles/fake-token-service';
import { InMemoryUserRepository } from './doubles/in-memory-user.repository';

describe('AuthService.login', () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let service: AuthService;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    service = new AuthService(users, hasher, new FakeTokenService());

    await users.create({
      name: 'Joana',
      email: 'joana@medclinic.com',
      passwordHash: await hasher.hash('SenhaForte@123'),
      roles: ['secretary'],
    });
  });

  it('devolve o accessToken com o id e os perfis do usuário quando a credencial está certa', async () => {
    const result = await service.login({ email: 'joana@medclinic.com', password: 'SenhaForte@123' });

    expect(result).toEqual({ accessToken: 'token:1:secretary' });
  });

  it('recusa e-mail inexistente com CREDENCIAIS_INVALIDAS', async () => {
    await expect(
      service.login({ email: 'ninguem@medclinic.com', password: 'SenhaForte@123' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' });
  });

  it('recusa senha errada com o MESMO erro do e-mail inexistente', async () => {
    await expect(
      service.login({ email: 'joana@medclinic.com', password: 'senha-errada' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' });
  });

  it('compara a senha digitada com o hash guardado, e não com texto puro', async () => {
    const compare = vi.spyOn(hasher, 'compare');

    await service.login({ email: 'joana@medclinic.com', password: 'SenhaForte@123' });

    expect(compare).toHaveBeenCalledWith('SenhaForte@123', 'hash(SenhaForte@123)');
  });

  it('aceita o e-mail com maiúsculas e espaços em volta', async () => {
    const result = await service.login({ email: '  Joana@MedClinic.com ', password: 'SenhaForte@123' });

    expect(result.accessToken).toBe('token:1:secretary');
  });
});
