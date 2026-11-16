import type { Patient } from '../entities/patient.entity';
import type { Pagination, Slice } from '../shared/pagination';

export interface NewPatient {
  name: string;
  cpf: string;
}

export interface PatientFilter {
  /** Busca parcial, sem diferenciar maiúsculas. */
  name?: string;
}

/** Porta do repositório de pacientes. Paciente removido não existe para nenhum método. */
export interface PatientRepository {
  findById(id: number): Promise<Patient | null>;
  findByCpf(cpf: string): Promise<Patient | null>;
  list(filter: PatientFilter, pagination: Pagination): Promise<Slice<Patient>>;
  /** Lança CPF_JA_CADASTRADO se o banco recusar por CPF repetido. */
  create(data: NewPatient): Promise<Patient>;
  /** Devolve null se o paciente não existe. */
  rename(id: number, name: string): Promise<Patient | null>;
  /** Remoção lógica. Devolve false se o paciente não existe. */
  remove(id: number): Promise<boolean>;
}
