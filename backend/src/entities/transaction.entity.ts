import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { ExpenseReason } from './expense-reason.entity';
import { Category } from './category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: 'debit' })
  transactionType: 'debit' | 'credit';

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'date' })
  transactionDate: Date;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => ExpenseReason, (reason) => reason.transactions)
  @JoinColumn({ name: 'expenseReasonId' })
  expenseReason: ExpenseReason;

  @Column({ nullable: true })
  expenseReasonId: number | null;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: number | null;

  @Column({ nullable: true, type: 'varchar', length: 30 })
  refNo: string | null;
}