import { z } from 'zod';
import type { Patient } from '../entities/patient.entity';
import { paginationSchema } from '../shared/pagination';

const nameSchema = z.string().trim().min(1, 'o nome é obrigatório').max(120);

/** RN02: CPF com exatamente 11 dígitos, sem pontuação. */
export const createPatientSchema = z.object({
  name: nameSchema,
  cpf: z.string().regex(/^\d{11}$/, 'o CPF deve ter 11 dígitos numéricos'),
});

export const updatePatientSchema = z.object({ name: nameSchema });

export const listPatientsQuerySchema = paginationSchema.extend({
  name: z.string().trim().min(1).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;

export interface PatientResponse {
  id: number;
  name: string;
  cpf: string;
  createdAt: Date; // o JSON vira "2026-10-20T14:03:11.000Z" (UTC com Z)
}

export function toPatientResponse(patient: Patient): PatientResponse {
  return { id: patient.id, name: patient.name, cpf: patient.cpf, createdAt: patient.createdAt };
}
