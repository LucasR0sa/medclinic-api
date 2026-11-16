import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Paciente. A remoção é LÓGICA (deletedAt): a linha continua no banco porque
 * consultas e prontuários apontam para ela. O TypeORM esconde automaticamente
 * as linhas com deletedAt preenchido em todo find.
 */
@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'char', length: 11 })
  cpf!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
