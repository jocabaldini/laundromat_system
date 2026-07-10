import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingType, Prisma } from '@prisma/client';

export interface ServiceItemRecord {
  id: string;
  name: string;
  type: PricingType;
  price: Prisma.Decimal;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SELECT: Prisma.ServiceItemSelect = {
  id: true,
  name: true,
  type: true,
  price: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ServiceItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(options: { includeDeleted?: boolean }): Promise<ServiceItemRecord[]> {
    return this.prisma.serviceItem.findMany({
      where: options.includeDeleted ? undefined : { deletedAt: null },
      select: SELECT,
      orderBy: { name: 'asc' },
    });
  }

  findById(id: string, includeDeleted = false): Promise<ServiceItemRecord | null> {
    return this.prisma.serviceItem.findFirst({
      where: { id, ...(!includeDeleted && { deletedAt: null }) },
      select: SELECT,
    });
  }

  findByName(name: string, includeDeleted = false): Promise<ServiceItemRecord | null> {
    return this.prisma.serviceItem.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(!includeDeleted && { deletedAt: null }),
      },
      select: SELECT,
    });
  }

  create(data: { name: string; type: PricingType; price: number }): Promise<ServiceItemRecord> {
    return this.prisma.serviceItem.create({ data, select: SELECT });
  }

  update(
    id: string,
    data: { name?: string; type?: PricingType; price?: number },
  ): Promise<ServiceItemRecord> {
    return this.prisma.serviceItem.update({ where: { id }, data, select: SELECT });
  }

  softDelete(id: string): Promise<void> {
    return this.prisma.serviceItem
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .then(() => undefined);
  }
}
