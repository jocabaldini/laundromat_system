import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

// Shape returned in API responses — never exposes passwordHash or refreshTokenHash
export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

// Shape used internally for auth operations — includes sensitive fields
export interface UserWithCredentials {
  id: string;
  email: string;
  role: Role;
  passwordHash: string;
  refreshTokenHash: string | null;
}

export interface UserAuthRecord {
  id: string;
  email: string;
  role: Role;
  refreshTokenHash: string | null;
}

const PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<UserRecord[]> {
    return this.prisma.user.findMany({
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string): Promise<UserAuthRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findPublicById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_SELECT,
    });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: PUBLIC_SELECT,
    });
  }

  findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: {
    email: string;
    name?: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserRecord> {
    return this.prisma.user.create({ data, select: PUBLIC_SELECT });
  }

  update(
    id: string,
    data: {
      email?: string;
      name?: string;
      passwordHash?: string;
      role?: Role;
    },
  ): Promise<UserRecord> {
    return this.prisma.user.update({ where: { id }, data, select: PUBLIC_SELECT });
  }

  delete(id: string): Promise<void> {
    return this.prisma.user.delete({ where: { id } }).then(() => undefined);
  }

  updateRefreshToken(id: string, refreshTokenHash: string): Promise<void> {
    return this.prisma.user
      .update({
        where: { id },
        data: { refreshTokenHash },
      })
      .then(() => undefined);
  }

  clearRefreshToken(id: string): Promise<void> {
    return this.prisma.user
      .update({
        where: { id },
        data: { refreshTokenHash: null },
      })
      .then(() => undefined);
  }
}
