import type { Doctor } from '../../src/entities/doctor.entity';
import { AppError } from '../../src/errors/app-error';
import type {
  DoctorFilter,
  DoctorRepository,
  NewDoctor,
} from '../../src/repositories/doctor.repository';
import { offsetOf, type Pagination, type Slice } from '../../src/shared/pagination';
import type { InMemoryUserRepository } from './in-memory-user.repository';

/**
 * Dublê da porta de médicos. Simula a transação: confere as duas unicidades
 * ANTES de gravar qualquer coisa, então ou grava usuário + médico, ou nada.
 */
export class InMemoryDoctorRepository implements DoctorRepository {
  readonly items: Doctor[] = [];
  private nextId = 1;

  constructor(private readonly users: InMemoryUserRepository) {}

  async findById(id: number): Promise<Doctor | null> {
    return this.items.find((doctor) => doctor.id === id) ?? null;
  }

  async findByCrm(crm: string): Promise<Doctor | null> {
    return this.items.find((doctor) => doctor.crm === crm) ?? null;
  }

  async findByUserId(userId: number): Promise<Doctor | null> {
    return this.items.find((doctor) => doctor.userId === userId) ?? null;
  }

  async list(filter: DoctorFilter, pagination: Pagination): Promise<Slice<Doctor>> {
    const term = filter.name?.toLowerCase();
    const matches = this.items.filter(
      (doctor) => !term || doctor.user.name.toLowerCase().includes(term),
    );
    const start = offsetOf(pagination);
    return { items: matches.slice(start, start + pagination.pageSize), total: matches.length };
  }

  async createWithUser(data: NewDoctor): Promise<Doctor> {
    if (await this.findByCrm(data.crm)) {
      throw new AppError('CRM_JA_CADASTRADO', 'Este CRM já está cadastrado.');
    }
    const user = await this.users.create({
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      roles: ['doctor'],
    });
    const doctor: Doctor = {
      id: this.nextId++,
      userId: user.id,
      user,
      crm: data.crm,
      createdAt: new Date(),
    };
    this.items.push(doctor);
    return doctor;
  }

  /** Atalho para os testes de outros módulos: cria um médico pronto. */
  async seed(name = 'Dra. Helena', crm = `CRM-${this.nextId}`): Promise<Doctor> {
    return this.createWithUser({
      name,
      email: `${crm.toLowerCase()}@medclinic.com`,
      passwordHash: 'hash',
      crm,
    });
  }
}
