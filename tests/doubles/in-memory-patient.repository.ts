import type { Patient } from '../../src/entities/patient.entity';
import { AppError } from '../../src/errors/app-error';
import type {
  NewPatient,
  PatientFilter,
  PatientRepository,
} from '../../src/repositories/patient.repository';
import { offsetOf, type Pagination, type Slice } from '../../src/shared/pagination';

/** Dublê da porta de pacientes, com as mesmas regras do banco (CPF único, remoção lógica). */
export class InMemoryPatientRepository implements PatientRepository {
  readonly items: Patient[] = [];
  private nextId = 1;

  private active(): Patient[] {
    return this.items.filter((patient) => patient.deletedAt === null);
  }

  async findById(id: number): Promise<Patient | null> {
    return this.active().find((patient) => patient.id === id) ?? null;
  }

  async findByCpf(cpf: string): Promise<Patient | null> {
    return this.active().find((patient) => patient.cpf === cpf) ?? null;
  }

  async list(filter: PatientFilter, pagination: Pagination): Promise<Slice<Patient>> {
    const term = filter.name?.toLowerCase();
    const matches = this.active().filter(
      (patient) => !term || patient.name.toLowerCase().includes(term),
    );
    const start = offsetOf(pagination);
    return { items: matches.slice(start, start + pagination.pageSize), total: matches.length };
  }

  async create(data: NewPatient): Promise<Patient> {
    if (await this.findByCpf(data.cpf)) {
      throw new AppError('CPF_JA_CADASTRADO', 'Este CPF já está cadastrado.');
    }
    const patient: Patient = { id: this.nextId++, createdAt: new Date(), deletedAt: null, ...data };
    this.items.push(patient);
    return patient;
  }

  async rename(id: number, name: string): Promise<Patient | null> {
    const patient = await this.findById(id);
    if (patient) patient.name = name;
    return patient;
  }

  async remove(id: number): Promise<boolean> {
    const patient = await this.findById(id);
    if (!patient) return false;
    patient.deletedAt = new Date();
    return true;
  }
}
