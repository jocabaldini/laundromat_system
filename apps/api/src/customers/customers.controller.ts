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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OPERATOR)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  findAll(@Query() query: CustomerQueryDto) {
    return this.service.findAll(query);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string, @I18nLang() lang: string) {
    return this.service.findByCode(code, lang);
  }

  @Get('code/:code/availability')
  checkCodeAvailability(@Param('code') code: string) {
    return this.service.checkCodeAvailability(code);
  }

  @Get('suggest-code')
  suggestCode(@Query('name') name: string) {
    return { code: this.service.suggestCode(name ?? '') };
  }

  @Get(':id')
  findOne(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.findById(id, lang);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto, @I18nLang() lang: string) {
    return this.service.create(dto, lang);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @I18nLang() lang: string) {
    return this.service.update(id, dto, lang);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @I18nLang() lang: string) {
    return this.service.remove(id, lang);
  }
}
