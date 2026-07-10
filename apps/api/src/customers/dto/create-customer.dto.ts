import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateCustomerDto {
  @IsString()
  name!: string;

  @IsString()
  @Length(3, 3, { message: i18nValidationMessage('validation.LENGTH') })
  @Matches(/^[A-Za-z0-9]{3}$/, { message: i18nValidationMessage('validation.MATCHES') })
  code!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
