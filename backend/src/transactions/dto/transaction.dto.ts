import { IsNumber, IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsIn(['debit', 'credit'])
  transactionType?: 'debit' | 'credit';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  transactionDate: string;

  @IsNumber()
  expenseReasonId: number;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsNumber()
  expenseReasonId?: number;
}

export class GmailSyncDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class ClassifyGmailTransactionDto {
  @IsNumber()
  expenseReasonId: number;

  @IsOptional()
  @IsString()
  notes?: string;
}