import { IsOptional, IsNumber, IsEnum, IsString, Min } from 'class-validator';
import { ServiceOrderItemStatus } from '@prisma/client';

export class UpdateServiceOrderItemDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity?: number;

  @IsOptional()
  @IsEnum(ServiceOrderItemStatus)
  status?: ServiceOrderItemStatus;

  @IsOptional()
  @IsString()
  observations?: string;
}
