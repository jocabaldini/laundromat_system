import { Module } from '@nestjs/common';
import { ServiceItemsController } from './service-items.controller';
import { ServiceItemsService } from './service-items.service';
import { ServiceItemsRepository } from './service-items.repository';

@Module({
  controllers: [ServiceItemsController],
  providers: [ServiceItemsService, ServiceItemsRepository],
  exports: [ServiceItemsService, ServiceItemsRepository],
})
export class ServiceItemsModule {}
