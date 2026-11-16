import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Role } from '../shared/roles';

/**
 * Entidade = o formato da linha na tabela. NÃO é a resposta da API:
 * ela tem passwordHash, que nunca pode sair (RNF01). Quem decide o que sai
 * é o DTO de resposta.
 *
 * Todo @Column declara o tipo explicitamente: o tsx (usado no `npm run dev`)
 * não gera os metadados de tipo que o TypeORM usaria para adivinhar.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ type: 'text', array: true })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
