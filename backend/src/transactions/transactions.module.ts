import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from '../entities/transaction.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { GmailSyncRecord } from '../entities/gmail-sync.entity';
import { User } from '../entities/user.entity';
import { MonthlyBudgetsModule } from '../monthly-budgets/monthly-budgets.module';
import { ExpenseReasonsModule } from '../expense-reasons/expense-reasons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BudgetAllocation, GmailSyncRecord, User]),
    MonthlyBudgetsModule,
    ExpenseReasonsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}