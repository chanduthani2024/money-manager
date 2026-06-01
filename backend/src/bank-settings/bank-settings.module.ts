import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankSettings } from '../entities/bank-settings.entity';
import { BankStatementImport } from '../entities/bank-statement-import.entity';
import { BankSettingsController } from './bank-settings.controller';
import { BankSettingsService } from './bank-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([BankSettings, BankStatementImport])],
  controllers: [BankSettingsController],
  providers: [BankSettingsService],
  exports: [BankSettingsService],
})
export class BankSettingsModule {}
