import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpenseReasonsModule } from './expense-reasons/expense-reasons.module';
import { MonthlyBudgetsModule } from './monthly-budgets/monthly-budgets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    UsersModule,
    CategoriesModule,
    ExpenseReasonsModule,
    MonthlyBudgetsModule,
    TransactionsModule,
    DashboardModule,
  ],
})
export class AppModule {}