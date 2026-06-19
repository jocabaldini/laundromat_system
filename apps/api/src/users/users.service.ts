import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

// Public fields returned in responses
const PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateUserDto, lang: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(this.i18n.t('users.email_in_use', { lang }));
    }

    const passwordHash: string = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role ?? 'USER',
      },
      select: PUBLIC_SELECT,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, lang: string, requesterId: string, requesterRole: Role) {
    // A regular USER can only view their own profile
    if (requesterRole === ('USER' as Role) && requesterId !== id) {
      throw new ForbiddenException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_SELECT,
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    return user;
  }

  findByEmailWithHash(email: string): Promise<{
    id: string;
    email: string;
    role: Role;
    passwordHash: string;
    refreshTokenHash: string | null;
  } | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<{
    id: string;
    email: string;
    role: Role;
    refreshTokenHash: string | null;
  } | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateRefreshToken(id: string, refreshTokenHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash },
    });
  }

  clearRefreshToken(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { refreshTokenHash: null },
    });
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

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    let passwordHash: string | undefined;
    if (dto.password) passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: PUBLIC_SELECT,
    });
  }

  async remove(id: string, lang: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(this.i18n.t('users.not_found', { lang }));
    }

    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
