import { IsString, IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsOptional()
  @IsString()
  description?: string;
}