/** Os três perfis do contrato, com estes nomes exatos, em minúsculas (RN01). */
export const ROLES = ['admin', 'secretary', 'doctor'] as const;

export type Role = (typeof ROLES)[number];
