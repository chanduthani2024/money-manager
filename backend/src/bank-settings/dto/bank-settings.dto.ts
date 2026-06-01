import { IsString, IsOptional, IsBoolean, Length, MaxLength } from 'class-validator';

export class CreateBankSettingsDto {
  @IsString()
  @MaxLength(50)
  bankName: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  accountLastFour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pdfPassword?: string;
}

export class UpdateBankSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  accountLastFour?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pdfPassword?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
