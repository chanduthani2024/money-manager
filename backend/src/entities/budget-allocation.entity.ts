import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { MonthlyBudget } from './monthly-budget.entity';
import { ExpenseReason } from './expense-reason.entity';

@Entity('budget_allocations')
export class BudgetAllocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  allocatedAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  spentAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => MonthlyBudget, (budget) => budget.budgetAllocations)
  @JoinColumn({ name: 'monthlyBudgetId' })
  monthlyBudget: MonthlyBudget;

  @Column()
  monthlyBudgetId: number;

  @ManyToOne(() => ExpenseReason, (reason) => reason.budgetAllocations)
  @JoinColumn({ name: 'expenseReasonId' })
  expenseReason: ExpenseReason;

  @Column()
  expenseReasonId: number;

  get remainingAmount(): number {
    return Number(this.allocatedAmount) - Number(this.spentAmount);
  }
}