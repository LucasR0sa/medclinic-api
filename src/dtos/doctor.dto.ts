import { z } from 'zod';
import type { Doctor } from '../entities/doctor.entity';
import { paginationSchema } from '../shared/pagination';
import { toUserResponse, type UserResponse } from './user.dto';

export const createDoctorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(8),
  crm: z.string().trim().min(1).max(30),
});

export const listDoctorsQuerySchema = paginationSchema.extend({
  name: z.string().trim().min(1).optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;

export interface DoctorResponse {
  id: number;
  crm: string;
  user: UserResponse;
}

export function toDoctorResponse(doctor: Doctor): DoctorResponse {
  return { id: doctor.id, crm: doctor.crm, user: toUserResponse(doctor.user) };
}
