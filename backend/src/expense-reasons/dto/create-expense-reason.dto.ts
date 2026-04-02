import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateExpenseReasonDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  isRecurring: boolean;

  @IsOptional()
  @IsNumber()
  recurringAmount?: number;

  @IsNumber()
  categoryId: number;
}