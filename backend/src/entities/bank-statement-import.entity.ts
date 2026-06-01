import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('bank_statement_imports')
export class BankStatementImport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  bankName: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  accountLastFour: string | null;

  @Column({ type: 'date', nullable: true })
  periodStart: Date | null;

  @Column({ type: 'date', nullable: true })
  periodEnd: Date | null;

  @Column({ default: 0 })
  totalRows: number;

  @Column({ default: 0 })
  importedCount: number;

  @Column({ default: 0 })
  skippedCount: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
