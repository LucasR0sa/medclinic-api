import type { Doctor } from '../entities/doctor.entity';
import type { Pagination, Slice } from '../shared/pagination';

export interface NewDoctor {
  name: string;
  email: string;
  passwordHash: string;
  crm: string;
}

export interface DoctorFilter {
  /** Busca parcial pelo nome do usuário do médico. */
  name?: string;
}

/** Porta do repositório de médicos. Todo Doctor devolvido vem com o `user` carregado. */
export interface DoctorRepository {
  findById(id: number): Promise<Doctor | null>;
  findByCrm(crm: string): Promise<Doctor | null>;
  /** Qual registro de médico pertence a este usuário (para quem chega com token de doctor). */
  findByUserId(userId: number): Promise<Doctor | null>;
  list(filter: DoctorFilter, pagination: Pagination): Promise<Slice<Doctor>>;
  /**
   * RN03: cria o usuário (perfil doctor) e o médico NA MESMA TRANSAÇÃO.
   * Se qualquer gravação falhar, nenhuma das duas fica no banco.
   * Lança EMAIL_JA_CADASTRADO ou CRM_JA_CADASTRADO.
   */
  createWithUser(data: NewDoctor): Promise<Doctor>;
}
