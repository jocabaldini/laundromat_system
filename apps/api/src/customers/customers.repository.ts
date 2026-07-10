import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT: Prisma.CustomerSelect = {
  id: true,
  code: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(options: { search?: string; includeDeleted?: boolean }): Promise<CustomerRecord[]> {
    const { search, includeDeleted } = options;

    const where: Prisma.CustomerWhereInput = {
      // Soft-delete filter — excluded by default
      ...(!includeDeleted && { deletedAt: null }),

      // Search by name OR code (case-insensitive)
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.prisma.customer.findMany({
      where,
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string, includeDeleted = false): Promise<CustomerRecord | null> {
    return this.prisma.customer.findFirst({
      where: { id, ...(!includeDeleted && { deletedAt: null }) },
      select: SELECT,
    });
  }

  findByCode(code: string, includeDeleted = false): Promise<CustomerRecord | null> {
    return this.prisma.customer.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(!includeDeleted && { deletedAt: null }),
      },
      select: SELECT,
    });
  }

  create(data: {
    code: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<CustomerRecord> {
    return this.prisma.customer.create({
      data: { ...data, code: data.code.toUpperCase() },
      select: SELECT,
    });
  }

  update(
    id: string,
    data: {
      code?: string;
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
    },
  ): Promise<CustomerRecord> {
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...data,
        ...(data.code && { code: data.code.toUpperCase() }),
      },
      select: SELECT,
    });
  }

  // Soft-delete — sets deletedAt instead of removing the record
  softDelete(id: string): Promise<void> {
    return this.prisma.customer
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .then(() => undefined);
  }
}
