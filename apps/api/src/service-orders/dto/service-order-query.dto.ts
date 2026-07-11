import { IsOptional, IsString, IsEnum, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ServiceOrderStatus } from '@prisma/client';

export class ServiceOrderQueryDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(ServiceOrderStatus)
  status?: ServiceOrderStatus;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryFrom?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryTo?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean;
}
