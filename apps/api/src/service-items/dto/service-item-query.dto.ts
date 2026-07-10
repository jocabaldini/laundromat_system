import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class ServiceItemQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean;
}
