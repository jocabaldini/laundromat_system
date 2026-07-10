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
import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { ServiceItemQueryDto } from './dto/service-item-query.dto';

@Controller('service-items')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OPERATOR)
export class ServiceItemsController {
  constructor(private readonly service: ServiceItemsService) {}

  @Get()
  findAll(@Query() query: ServiceItemQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.findById(id, lang);
  }

  @Post()
  create(@Body() dto: CreateServiceItemDto, @I18nLang() lang: string) {
    return this.service.create(dto, lang);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceItemDto, @I18nLang() lang: string) {
    return this.service.update(id, dto, lang);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.remove(id, lang);
  }
}
