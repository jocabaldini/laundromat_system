import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { I18nLang } from 'nestjs-i18n';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Only OPERATOR can create users
  @Roles(Role.OPERATOR)
  @Post()
  create(@Body() dto: CreateUserDto, @I18nLang() lang: string) {
    return this.users.create(dto, lang);
  }

  // Only OPERATOR can list all users
  @Roles(Role.OPERATOR)
  @Get()
  findAll() {
    return this.users.findAll();
  }

  // OPERATOR can view any profile — USER can only view their own (enforced in service)
  @Roles(Role.OPERATOR, Role.USER)
  @Get(':id')
  findOne(@Param('id') id: string, @I18nLang() lang: string, @Request() req: AuthenticatedRequest) {
    return this.users.findOne(id, lang, req.user.userId, req.user.role);
  }

  // OPERATOR can edit any profile — USER can only edit their own (enforced in service)
  @Roles(Role.OPERATOR, Role.USER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @I18nLang() lang: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.users.update(id, dto, lang, req.user.userId, req.user.role);
  }

  // Only OPERATOR can delete users
  @Roles(Role.OPERATOR)
  @Delete(':id')
  remove(@Param('id') id: string, @I18nLang() lang: string) {
    return this.users.remove(id, lang);
  }
}
