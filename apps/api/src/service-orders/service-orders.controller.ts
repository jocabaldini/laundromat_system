import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { I18nLang } from 'nestjs-i18n';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { UpdateServiceOrderItemDto } from './dto/update-service-order-item.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';

@Controller('service-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OPERATOR)
export class ServiceOrdersController {
  constructor(private readonly service: ServiceOrdersService) {}

  @Get()
  findAll(@Query() query: ServiceOrderQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.findById(id, lang);
  }

  @Post()
  create(@Body() dto: CreateServiceOrderDto, @I18nLang() lang: string) {
    return this.service.create(dto, lang);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceOrderDto, @I18nLang() lang: string) {
    return this.service.update(id, dto, lang);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateServiceOrderItemDto,
    @I18nLang() lang: string,
  ) {
    return this.service.updateItem(id, itemId, dto, lang);
  }

  @Post(':id/deliver')
  deliver(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.deliver(id, lang);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.cancel(id, lang);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.remove(id, lang);
  }
}
