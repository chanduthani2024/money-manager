import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseReasonsService } from './expense-reasons.service';
import { ExpenseReasonsController } from './expense-reasons.controller';
import { ExpenseReason } from '../entities/expense-reason.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseReason])],
  controllers: [ExpenseReasonsController],
  providers: [ExpenseReasonsService],
  exports: [ExpenseReasonsService],
})
export class ExpenseReasonsModule {}