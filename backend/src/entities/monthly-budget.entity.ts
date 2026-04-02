import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { BudgetAllocation } from './budget-allocation.entity';

@Entity('monthly_budgets')
export class MonthlyBudget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 12, scale: 2 })
  salary: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalAllocated: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0 })
  totalSpent: number;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.monthlyBudgets)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @OneToMany(() => BudgetAllocation, (allocation) => allocation.monthlyBudget)
  budgetAllocations: BudgetAllocation[];

  get remainingBalance(): number {
    return Number(this.salary) - Number(this.totalSpent);
  }
}