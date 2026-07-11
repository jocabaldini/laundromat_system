import { Module } from '@nestjs/common';
import { ServiceOrdersController } from './service-orders.controller';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersRepository } from './service-orders.repository';
import { ServiceItemsModule } from '../service-items/service-items.module';

@Module({
  imports: [ServiceItemsModule],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService, ServiceOrdersRepository],
  exports: [ServiceOrdersService, ServiceOrdersRepository],
})
export class ServiceOrdersModule {}
