import { z } from 'zod';
import type { MedicalRecord } from '../entities/medical-record.entity';

/**
 * Só o texto entra pelo corpo. Se vier "doctorId" no corpo, o Zod descarta
 * (campo desconhecido): o autor SEMPRE vem do token (RN14).
 */
export const createMedicalRecordSchema = z.object({
  text: z.string().trim().min(1, 'o texto é obrigatório').max(20_000),
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

export interface MedicalRecordResponse {
  id: number;
  patientId: number;
  doctorId: number;
  text: string;
  createdAt: Date;
}

export function toMedicalRecordResponse(record: MedicalRecord): MedicalRecordResponse {
  return {
    id: record.id,
    patientId: record.patientId,
    doctorId: record.doctorId,
    text: record.text,
    createdAt: record.createdAt,
  };
}
