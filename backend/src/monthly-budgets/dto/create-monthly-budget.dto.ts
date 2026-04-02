import { IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetAllocationDto {
  @IsNumber()
  expenseReasonId: number;

  @IsNumber()
  allocatedAmount: number;
}

export class CreateMonthlyBudgetDto {
  @IsNumber()
  salary: number;

  @IsNumber()
  month: number; // 1-12

  @IsNumber()
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetAllocationDto)
  budgetAllocations: BudgetAllocationDto[];
}