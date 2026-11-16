import {
  toPatientResponse,
  type CreatePatientInput,
  type ListPatientsQuery,
  type PatientResponse,
  type UpdatePatientInput,
} from '../dtos/patient.dto';
import { AppError } from '../errors/app-error';
import type { PatientRepository } from '../repositories/patient.repository';
import { toPage, type Page } from '../shared/pagination';

const notFound = () => new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente não encontrado.');

/** A recepção: cadastro de pacientes (RF02). */
export class PatientService {
  constructor(private readonly patients: PatientRepository) {}

  async create(input: CreatePatientInput): Promise<PatientResponse> {
    // Checagem amigável; a garantia de verdade é o índice único do banco (RP04).
    if (await this.patients.findByCpf(input.cpf)) {
      throw new AppError('CPF_JA_CADASTRADO', 'Este CPF já está cadastrado.');
    }
    return toPatientResponse(await this.patients.create(input));
  }

  async list(query: ListPatientsQuery): Promise<Page<PatientResponse>> {
    const { items, total } = await this.patients.list({ name: query.name }, query);
    return toPage(items.map(toPatientResponse), total, query);
  }

  async getById(id: number): Promise<PatientResponse> {
    const patient = await this.patients.findById(id);
    if (!patient) throw notFound();
    return toPatientResponse(patient);
  }

  async update(id: number, input: UpdatePatientInput): Promise<PatientResponse> {
    const patient = await this.patients.rename(id, input.name);
    if (!patient) throw notFound();
    return toPatientResponse(patient);
  }

  async remove(id: number): Promise<void> {
    if (!(await this.patients.remove(id))) throw notFound();
  }
}
