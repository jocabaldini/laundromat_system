import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ServiceOrdersRepository } from './service-orders.repository';
import { ServiceItemsRepository } from '../service-items/service-items.repository';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { UpdateServiceOrderItemDto } from './dto/update-service-order-item.dto';
import { ServiceOrderQueryDto } from './dto/service-order-query.dto';
import {
  assertValidItemTransition,
  calculateOrderTotals,
  deriveOrderStatus,
} from './service-orders.domain';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ServiceOrdersService {
  constructor(
    private readonly repo: ServiceOrdersRepository,
    private readonly serviceItemsRepo: ServiceItemsRepository,
    private readonly i18n: I18nService,
  ) {}

  findAll(query: ServiceOrderQueryDto) {
    return this.repo.findAll(query);
  }

  async findById(id: string, lang: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));
    return order;
  }

  async create(dto: CreateServiceOrderDto, lang: string) {
    // Resolve service items and snapshot their current prices
    const resolvedItems = await Promise.all(
      dto.items.map(async (itemDto) => {
        const serviceItem = await this.serviceItemsRepo.findById(itemDto.serviceItemId);
        if (!serviceItem) {
          throw new NotFoundException(this.i18n.t('service-orders.item_not_found', { lang }));
        }
        const quantity = new Decimal(itemDto.quantity);
        const referencePrice = serviceItem.price;
        return {
          serviceItemId: serviceItem.id,
          serviceItemName: serviceItem.name,
          serviceItemType: serviceItem.type,
          referencePrice,
          finalPrice: referencePrice, // starts equal to reference
          quantity,
          observations: itemDto.observations,
        };
      }),
    );

    const { referenceTotal, finalTotal, discount } = calculateOrderTotals(resolvedItems);

    return this.repo.create({
      customerId: dto.customerId,
      estimatedDeliveryAt: new Date(dto.estimatedDeliveryAt),
      observations: dto.observations,
      referenceTotal,
      finalTotal,
      discount,
      items: resolvedItems,
    });
  }

  async update(id: string, dto: UpdateServiceOrderDto, lang: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));

    if (order.status === 'DELIVERED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_delivered', { lang }),
      );
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_cancelled', { lang }),
      );
    }

    let finalTotal = order.finalTotal;
    let discount = order.discount;

    // If operator edits finalTotal directly, recalculate discount
    if (dto.finalTotal !== undefined) {
      finalTotal = new Decimal(dto.finalTotal);
      discount = order.referenceTotal.sub(finalTotal);
    }

    return this.repo.update(id, {
      ...(dto.estimatedDeliveryAt && { estimatedDeliveryAt: new Date(dto.estimatedDeliveryAt) }),
      ...(dto.observations !== undefined && { observations: dto.observations }),
      finalTotal,
      discount,
    });
  }

  async updateItem(orderId: string, itemId: string, dto: UpdateServiceOrderItemDto, lang: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));

    if (order.status === 'DELIVERED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_delivered', { lang }),
      );
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_cancelled', { lang }),
      );
    }

    const item = await this.repo.findItemById(itemId);
    if (!item || item.serviceOrderId !== orderId) {
      throw new NotFoundException(this.i18n.t('service-orders.item_not_found', { lang }));
    }

    // Validate status transition
    if (dto.status) {
      try {
        assertValidItemTransition(item.status, dto.status);
      } catch {
        throw new BadRequestException(
          this.i18n.t('service-orders.invalid_item_status_transition', { lang }),
        );
      }
    }

    // Update the item
    await this.repo.updateItem(itemId, {
      ...(dto.finalPrice !== undefined && { finalPrice: new Decimal(dto.finalPrice) }),
      ...(dto.quantity !== undefined && { quantity: new Decimal(dto.quantity) }),
      ...(dto.status && { status: dto.status }),
      ...(dto.observations !== undefined && { observations: dto.observations }),
    });

    // Reload order with updated items to recalculate totals and derive status
    const updatedOrder = await this.repo.findById(orderId);
    if (!updatedOrder) {
      throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));
    }

    const { referenceTotal, finalTotal, discount } = calculateOrderTotals(
      updatedOrder.items.map((i) => ({
        quantity: i.quantity,
        referencePrice: i.referencePrice,
        finalPrice: i.finalPrice,
      })),
    );

    const derivedStatus = deriveOrderStatus(updatedOrder.items.map((i) => i.status));

    return this.repo.update(orderId, {
      referenceTotal,
      finalTotal,
      discount,
      status: derivedStatus,
    });
  }

  async deliver(id: string, lang: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_cancelled', { lang }),
      );
    }
    return this.repo.update(id, { status: 'DELIVERED' });
  }

  async cancel(id: string, lang: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));
    if (order.status === 'DELIVERED') {
      throw new BadRequestException(
        this.i18n.t('service-orders.cannot_update_delivered', { lang }),
      );
    }
    return this.repo.update(id, { status: 'CANCELLED' });
  }

  async remove(id: string, lang: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundException(this.i18n.t('service-orders.not_found', { lang }));
    await this.repo.softDelete(id);
    return { ok: true };
  }
}
