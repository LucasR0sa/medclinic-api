import {
  toMedicalRecordResponse,
  type CreateMedicalRecordInput,
  type MedicalRecordResponse,
} from '../dtos/medical-record.dto';
import { AppError } from '../errors/app-error';
import type { AppointmentRepository } from '../repositories/appointment.repository';
import type { DoctorRepository } from '../repositories/doctor.repository';
import type { MedicalRecordRepository } from '../repositories/medical-record.repository';
import type { PatientRepository } from '../repositories/patient.repository';
import type { TokenPayload } from '../security/token-service';
import { toPage, type Page, type Pagination } from '../shared/pagination';

const noLink = () =>
  new AppError('ACESSO_NEGADO', 'Você não atendeu este paciente e não pode acessar o prontuário.');

/**
 * RN14: o prontuário é do médico que ATENDEU. O acesso é por POSSE (vínculo
 * com o atendimento), e não só por perfil: ser "doctor" não basta.
 */
export class MedicalRecordService {
  constructor(
    private readonly patients: PatientRepository,
    private readonly doctors: DoctorRepository,
    private readonly appointments: AppointmentRepository,
    private readonly records: MedicalRecordRepository,
  ) {}

  /** Escrever é ato médico: só o médico com vínculo (a rota já barrou admin e secretaria). */
  async create(
    requester: TokenPayload,
    patientId: number,
    input: CreateMedicalRecordInput,
  ): Promise<MedicalRecordResponse> {
    await this.ensurePatientExists(patientId);
    const doctorId = await this.linkedDoctorId(requester, patientId);
    if (doctorId === null) throw noLink();

    // O autor vem do TOKEN, nunca do corpo da requisição.
    const record = await this.records.create({ patientId, doctorId, text: input.text });
    return toMedicalRecordResponse(record);
  }

  /** Ler: médico com vínculo, ou a administração (auditoria). Secretaria não lê. */
  async list(
    requester: TokenPayload,
    patientId: number,
    pagination: Pagination,
  ): Promise<Page<MedicalRecordResponse>> {
    await this.ensurePatientExists(patientId);
    const isAdmin = requester.roles.includes('admin');
    if (!isAdmin && (await this.linkedDoctorId(requester, patientId)) === null) throw noLink();

    const { items, total } = await this.records.listByPatient(patientId, pagination);
    return toPage(items.map(toMedicalRecordResponse), total, pagination);
  }

  private async ensurePatientExists(patientId: number): Promise<void> {
    if (!(await this.patients.findById(patientId))) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente não encontrado.');
    }
  }

  /**
   * O id de médico de quem chama, SE ele tiver vínculo com o paciente
   * (ao menos uma consulta in_progress ou done entre os dois). Senão, null.
   */
  private async linkedDoctorId(requester: TokenPayload, patientId: number): Promise<number | null> {
    if (!requester.roles.includes('doctor')) return null;
    const doctor = await this.doctors.findByUserId(requester.userId);
    if (!doctor) return null;
    return (await this.appointments.hasCareLink(doctor.id, patientId)) ? doctor.id : null;
  }
}
