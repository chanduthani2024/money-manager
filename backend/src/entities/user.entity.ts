import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { MonthlyBudget } from './monthly-budget.entity';
import { Transaction } from './transaction.entity';
import { ExpenseReason } from './expense-reason.entity';
import { Category } from './category.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => MonthlyBudget, (budget) => budget.user)
  monthlyBudgets: MonthlyBudget[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => ExpenseReason, (expenseReason) => expenseReason.user)
  expenseReasons: ExpenseReason[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];
}