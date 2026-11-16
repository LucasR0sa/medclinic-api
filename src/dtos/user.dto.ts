import { z } from 'zod';
import type { User } from '../entities/user.entity';
import { ROLES, type Role } from '../shared/roles';

/** DTO de entrada do POST /users. Perfil fora dos três → 400 DADOS_INVALIDOS. */
export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(8),
  roles: z
    .array(z.enum(ROLES))
    .min(1)
    .transform((roles) => [...new Set(roles)]), // ["secretary","secretary"] → ["secretary"]
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/** DTO de saída: o que a API devolve. Repare que passwordHash NÃO está aqui (RNF01). */
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  roles: Role[];
}

export function toUserResponse(user: User): UserResponse {
  return { id: user.id, name: user.name, email: user.email, roles: user.roles };
}
