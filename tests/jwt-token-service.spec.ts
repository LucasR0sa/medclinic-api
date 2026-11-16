import jwt from 'jsonwebtoken';
import { JwtTokenService } from '../src/security/jwt-token-service';

// Segredo fixo de teste: nenhum teste lê variável de ambiente (RNF07).
const SECRET = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';

describe('JwtTokenService', () => {
  const tokens = new JwtTokenService(SECRET, 3600);

  afterEach(() => {
    vi.useRealTimers();
  });

  it('assina e confere o crachá, devolvendo id e perfis', () => {
    const token = tokens.sign({ userId: 7, roles: ['doctor'] });

    expect(tokens.verify(token)).toEqual({ userId: 7, roles: ['doctor'] });
  });

  it('recusa token com payload adulterado (secretary → admin)', () => {
    const [header, payload, signature] = tokens.sign({ userId: 2, roles: ['secretary'] }).split('.');
    const body = JSON.parse(Buffer.from(payload!, 'base64url').toString());
    body.roles = ['admin'];
    const tampered = [header, Buffer.from(JSON.stringify(body)).toString('base64url'), signature].join('.');

    expect(() => tokens.verify(tampered)).toThrow(expect.objectContaining({ code: 'NAO_AUTENTICADO' }));
  });

  it('recusa token assinado com outro segredo', () => {
    const forged = new JwtTokenService('outro-segredo-qualquer-com-mais-de-32-caracteres', 3600)
      .sign({ userId: 1, roles: ['admin'] });

    expect(() => tokens.verify(forged)).toThrow(expect.objectContaining({ code: 'NAO_AUTENTICADO' }));
  });

  it('recusa token vencido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T10:00:00Z'));
    const token = tokens.sign({ userId: 1, roles: ['admin'] });

    vi.setSystemTime(new Date('2026-11-16T11:00:01Z')); // 1 h e 1 s depois

    expect(() => tokens.verify(token)).toThrow(expect.objectContaining({ code: 'NAO_AUTENTICADO' }));
  });

  it('recusa token válido mas com perfil que não existe no sistema', () => {
    const odd = jwt.sign({ roles: ['superuser'] }, SECRET, { subject: '1', expiresIn: 3600 });

    expect(() => tokens.verify(odd)).toThrow(expect.objectContaining({ code: 'NAO_AUTENTICADO' }));
  });

  it('recusa texto que nem é um token', () => {
    expect(() => tokens.verify('isto-nao-e-um-jwt')).toThrow(expect.objectContaining({ code: 'NAO_AUTENTICADO' }));
  });
});
