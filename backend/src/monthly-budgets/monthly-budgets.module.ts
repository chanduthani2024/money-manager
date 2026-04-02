import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonthlyBudgetsService } from './monthly-budgets.service';
import { MonthlyBudgetsController } from './monthly-budgets.controller';
import { MonthlyBudget } from '../entities/monthly-budget.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { Transaction } from '../entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MonthlyBudget, BudgetAllocation, Transaction])],
  controllers: [MonthlyBudgetsController],
  providers: [MonthlyBudgetsService],
  exports: [MonthlyBudgetsService],
})
export class MonthlyBudgetsModule {}