import {
  toDoctorResponse,
  type CreateDoctorInput,
  type DoctorResponse,
  type ListDoctorsQuery,
} from '../dtos/doctor.dto';
import { AppError } from '../errors/app-error';
import type { DoctorRepository } from '../repositories/doctor.repository';
import type { UserRepository } from '../repositories/user.repository';
import type { PasswordHasher } from '../security/password-hasher';
import { normalizeEmail } from '../shared/email';
import { toPage, type Page } from '../shared/pagination';

/** Cadastro de médicos (RF03): registro profissional + acesso, sem meio cadastro. */
export class DoctorService {
  constructor(
    private readonly users: UserRepository,
    private readonly doctors: DoctorRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(input: CreateDoctorInput): Promise<DoctorResponse> {
    const email = normalizeEmail(input.email);

    // Checagens amigáveis, antes de gastar um hash. Se duas requisições
    // passarem por aqui ao mesmo tempo, quem decide é o banco (UNIQUE),
    // e a transação garante que nada fica pela metade.
    if (await this.users.findByEmail(email)) {
      throw new AppError('EMAIL_JA_CADASTRADO', 'Este e-mail já está cadastrado.');
    }
    if (await this.doctors.findByCrm(input.crm)) {
      throw new AppError('CRM_JA_CADASTRADO', 'Este CRM já está cadastrado.');
    }

    const doctor = await this.doctors.createWithUser({
      name: input.name,
      email,
      passwordHash: await this.hasher.hash(input.password),
      crm: input.crm,
    });
    return toDoctorResponse(doctor);
  }

  async list(query: ListDoctorsQuery): Promise<Page<DoctorResponse>> {
    const { items, total } = await this.doctors.list({ name: query.name }, query);
    return toPage(items.map(toDoctorResponse), total, query);
  }

  async getById(id: number): Promise<DoctorResponse> {
    const doctor = await this.doctors.findById(id);
    if (!doctor) throw new AppError('RECURSO_NAO_ENCONTRADO', 'Médico não encontrado.');
    return toDoctorResponse(doctor);
  }
}
