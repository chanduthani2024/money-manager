import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Category } from './category.entity';
import { Transaction } from './transaction.entity';
import { BudgetAllocation } from './budget-allocation.entity';
import { User } from './user.entity';

@Entity('expense_reasons')
export class ExpenseReason {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: false })
  isRecurring: boolean;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  recurringAmount: number;

  @ManyToOne(() => Category, (category) => category.expenseReasons)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  categoryId: number;

  @ManyToOne(() => User, (user) => user.expenseReasons, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @OneToMany(() => Transaction, (transaction) => transaction.expenseReason)
  transactions: Transaction[];

  @OneToMany(() => BudgetAllocation, (allocation) => allocation.expenseReason)
  budgetAllocations: BudgetAllocation[];
}