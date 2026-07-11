import { ServiceOrderStatus, ServiceOrderItemStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Valid item status transitions — operator can only move forward
const ITEM_TRANSITIONS: Record<ServiceOrderItemStatus, ServiceOrderItemStatus[]> = {
  RECEIVED: ['WASHING'],
  WASHING: ['IRONING'],
  IRONING: ['READY'],
  READY: [],
};

export function assertValidItemTransition(
  from: ServiceOrderItemStatus,
  to: ServiceOrderItemStatus,
): void {
  if (!ITEM_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot transition item from ${from} to ${to}`);
  }
}

// OS status is derived from the minimum status across all items.
// DELIVERED and CANCELLED are terminal — set directly on the OS, not derived.
const STATUS_ORDER: ServiceOrderItemStatus[] = ['RECEIVED', 'WASHING', 'IRONING', 'READY'];

export function deriveOrderStatus(itemStatuses: ServiceOrderItemStatus[]): ServiceOrderStatus {
  if (itemStatuses.length === 0) return 'RECEIVED';
  const minIndex = Math.min(...itemStatuses.map((s) => STATUS_ORDER.indexOf(s)));
  return STATUS_ORDER[minIndex] as unknown as ServiceOrderStatus;
}

// Calculate item subtotal: quantity × price
export function calculateItemSubtotal(quantity: Decimal, price: Decimal): Decimal {
  return quantity.mul(price);
}

// Calculate order totals from items
export function calculateOrderTotals(
  items: { quantity: Decimal; referencePrice: Decimal; finalPrice: Decimal }[],
): { referenceTotal: Decimal; finalTotal: Decimal; discount: Decimal } {
  const referenceTotal = items.reduce(
    (sum, item) => sum.add(item.quantity.mul(item.referencePrice)),
    new Decimal(0),
  );
  const finalTotal = items.reduce(
    (sum, item) => sum.add(item.quantity.mul(item.finalPrice)),
    new Decimal(0),
  );
  const discount = referenceTotal.sub(finalTotal);
  return { referenceTotal, finalTotal, discount };
}
