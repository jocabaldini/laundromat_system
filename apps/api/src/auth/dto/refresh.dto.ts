import { IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RefreshDto {
  @IsString({ message: i18nValidationMessage('validation.string') })
  refreshToken: string;
}
