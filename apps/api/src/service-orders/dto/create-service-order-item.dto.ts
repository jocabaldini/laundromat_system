import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateServiceOrderItemDto {
  @IsString()
  serviceItemId!: string;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  finalPrice?: number;

  @IsOptional()
  @IsString()
  observations?: string;
}
