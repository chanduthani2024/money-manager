import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Transaction } from '../entities/transaction.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { MonthlyBudgetsModule } from '../monthly-budgets/monthly-budgets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BudgetAllocation]),
    TransactionsModule,
    MonthlyBudgetsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}