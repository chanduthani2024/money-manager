import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Transaction } from '../entities/transaction.entity';
import { BankStatementImport } from '../entities/bank-statement-import.entity';
import { BankSettings } from '../entities/bank-settings.entity';
import { MonthlyBudgetsModule } from '../monthly-budgets/monthly-budgets.module';
import { BankStatementImportService } from './bank-statement-import.service';
import { BankStatementImportController } from './bank-statement-import.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BankStatementImport, BankSettings]),
    MulterModule.register({ storage: undefined }), // memory storage (default)
    MonthlyBudgetsModule,
  ],
  controllers: [BankStatementImportController],
  providers: [BankStatementImportService],
  exports: [BankStatementImportService],
})
export class BankStatementModule {}
