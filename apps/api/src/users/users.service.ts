import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateUserDto, lang: string) {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException(this.i18n.t('users.email_in_use', { lang }));
    }

    const passwordHash: string = await bcrypt.hash(dto.password, 10);

    return this.repo.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      role: dto.role ?? 'USER',
    });
  }

  findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string, lang: string, requesterId: string, requesterRole: Role) {
    // A regular USER can only view their own profile
    if (requesterRole === ('USER' as Role) && requesterId !== id) {
      throw new ForbiddenException();
    }

    const user = await this.repo.findPublicById(id);

    if (!user) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    lang: string,
    requesterId: string,
    requesterRole: Role,
  ) {
    // A regular USER can only update their own profile
    if (requesterRole === ('USER' as Role) && requesterId !== id) {
      throw new ForbiddenException();
    }

    // A regular USER cannot change their own role
    if (requesterRole === ('USER' as Role) && dto.role) {
      throw new ForbiddenException();
    }

    const existing = await this.repo.findPublicById(id);
    if (!existing) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    let passwordHash: string | undefined;
    if (dto.password) passwordHash = await bcrypt.hash(dto.password, 10);

    return this.repo.update(id, {
      email: dto.email,
      name: dto.name,
      role: dto.role,
      ...(passwordHash ? { passwordHash } : {}),
    });
  }

  async remove(id: string, lang: string) {
    const existing = await this.repo.findPublicById(id);
    if (!existing) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    await this.repo.delete(id);
    return { ok: true };
  }
}
