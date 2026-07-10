import { IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { PricingType } from '@prisma/client';

export class CreateServiceItemDto {
  @IsString()
  name!: string;

  @IsEnum(PricingType)
  type!: PricingType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;
}
