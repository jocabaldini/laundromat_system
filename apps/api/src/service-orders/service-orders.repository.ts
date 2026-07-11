import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ServiceOrderStatus, ServiceOrderItemStatus, PricingType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Include items and customer snapshot in all responses
const INCLUDE = {
  customer: { select: { id: true, code: true, name: true } },
  items: {
    select: {
      id: true,
      serviceItemId: true,
      serviceItemName: true,
      serviceItemType: true,
      referencePrice: true,
      finalPrice: true,
      quantity: true,
      status: true,
      observations: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ServiceOrderInclude;

export type ServiceOrderRecord = Prisma.ServiceOrderGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class ServiceOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(options: {
    customerId?: string;
    status?: ServiceOrderStatus;
    estimatedDeliveryFrom?: string;
    estimatedDeliveryTo?: string;
    includeDeleted?: boolean;
  }): Promise<ServiceOrderRecord[]> {
    const where: Prisma.ServiceOrderWhereInput = {
      ...(!options.includeDeleted && { deletedAt: null }),
      ...(options.customerId && { customerId: options.customerId }),
      ...(options.status && { status: options.status }),
      ...(options.estimatedDeliveryFrom || options.estimatedDeliveryTo
        ? {
            estimatedDeliveryAt: {
              ...(options.estimatedDeliveryFrom && {
                gte: new Date(options.estimatedDeliveryFrom),
              }),
              ...(options.estimatedDeliveryTo && { lte: new Date(options.estimatedDeliveryTo) }),
            },
          }
        : {}),
    };

    return this.prisma.serviceOrder.findMany({
      where,
      include: INCLUDE,
      orderBy: { estimatedDeliveryAt: 'asc' },
    });
  }

  findById(id: string, includeDeleted = false): Promise<ServiceOrderRecord | null> {
    return this.prisma.serviceOrder.findFirst({
      where: { id, ...(!includeDeleted && { deletedAt: null }) },
      include: INCLUDE,
    });
  }

  create(data: {
    customerId: string;
    estimatedDeliveryAt: Date;
    observations?: string;
    referenceTotal: Decimal;
    finalTotal: Decimal;
    discount: Decimal;
    items: {
      serviceItemId: string;
      serviceItemName: string;
      serviceItemType: PricingType;
      referencePrice: Decimal;
      finalPrice: Decimal;
      quantity: Decimal;
      observations?: string;
    }[];
  }): Promise<ServiceOrderRecord> {
    return this.prisma.serviceOrder.create({
      data: {
        customerId: data.customerId,
        estimatedDeliveryAt: data.estimatedDeliveryAt,
        observations: data.observations,
        referenceTotal: data.referenceTotal,
        finalTotal: data.finalTotal,
        discount: data.discount,
        items: { create: data.items },
      },
      include: INCLUDE,
    });
  }

  update(
    id: string,
    data: {
      estimatedDeliveryAt?: Date;
      observations?: string;
      status?: ServiceOrderStatus;
      referenceTotal?: Decimal;
      finalTotal?: Decimal;
      discount?: Decimal;
    },
  ): Promise<ServiceOrderRecord> {
    return this.prisma.serviceOrder.update({
      where: { id },
      data,
      include: INCLUDE,
    });
  }

  updateItem(
    itemId: string,
    data: {
      finalPrice?: Decimal;
      quantity?: Decimal;
      status?: ServiceOrderItemStatus;
      observations?: string;
    },
  ): Promise<{ id: string; serviceOrderId: string; status: ServiceOrderItemStatus }> {
    return this.prisma.serviceOrderItem.update({
      where: { id: itemId },
      data,
      select: { id: true, serviceOrderId: true, status: true },
    });
  }

  findItemById(itemId: string): Promise<{
    id: string;
    serviceOrderId: string;
    status: ServiceOrderItemStatus;
    finalPrice: Decimal;
    quantity: Decimal;
  } | null> {
    return this.prisma.serviceOrderItem.findUnique({
      where: { id: itemId },
      select: { id: true, serviceOrderId: true, status: true, finalPrice: true, quantity: true },
    });
  }

  softDelete(id: string): Promise<void> {
    return this.prisma.serviceOrder
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .then(() => undefined);
  }
}
