import {
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateServiceOrderItemDto } from './create-service-order-item.dto';

export class CreateServiceOrderDto {
  @IsString()
  customerId!: string;

  @IsDateString()
  estimatedDeliveryAt!: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceOrderItemDto)
  items!: CreateServiceOrderItemDto[];
}
