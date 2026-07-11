import { IsOptional, IsDateString, IsString, IsNumber, Min } from 'class-validator';

export class UpdateServiceOrderDto {
  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalTotal?: number;
}
