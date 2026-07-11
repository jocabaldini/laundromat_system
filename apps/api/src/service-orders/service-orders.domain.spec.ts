import {
  assertValidItemTransition,
  deriveOrderStatus,
  calculateOrderTotals,
} from './service-orders.domain';
import { Decimal } from '@prisma/client/runtime/library';

describe('ServiceOrders Domain', () => {
  describe('assertValidItemTransition', () => {
    it('allows RECEIVED → WASHING', () => {
      expect(() => assertValidItemTransition('RECEIVED', 'WASHING')).not.toThrow();
    });
    it('allows WASHING → IRONING', () => {
      expect(() => assertValidItemTransition('WASHING', 'IRONING')).not.toThrow();
    });
    it('allows IRONING → READY', () => {
      expect(() => assertValidItemTransition('IRONING', 'READY')).not.toThrow();
    });
    it('throws on invalid transition RECEIVED → READY', () => {
      expect(() => assertValidItemTransition('RECEIVED', 'READY')).toThrow();
    });
    it('throws on backward transition READY → WASHING', () => {
      expect(() => assertValidItemTransition('READY', 'WASHING')).toThrow();
    });
  });

  describe('deriveOrderStatus', () => {
    it('returns RECEIVED when all items are RECEIVED', () => {
      expect(deriveOrderStatus(['RECEIVED', 'RECEIVED'])).toBe('RECEIVED');
    });
    it('returns minimum status when items differ', () => {
      expect(deriveOrderStatus(['READY', 'WASHING', 'IRONING'])).toBe('WASHING');
    });
    it('returns READY when all items are READY', () => {
      expect(deriveOrderStatus(['READY', 'READY'])).toBe('READY');
    });
    it('returns RECEIVED when no items', () => {
      expect(deriveOrderStatus([])).toBe('RECEIVED');
    });
  });

  describe('calculateOrderTotals', () => {
    it('calculates reference and final totals correctly', () => {
      const items = [
        {
          quantity: new Decimal('2'),
          referencePrice: new Decimal('50'),
          finalPrice: new Decimal('45'),
        },
        {
          quantity: new Decimal('1'),
          referencePrice: new Decimal('30'),
          finalPrice: new Decimal('30'),
        },
      ];
      const result = calculateOrderTotals(items);
      expect(result.referenceTotal.toNumber()).toBe(130);
      expect(result.finalTotal.toNumber()).toBe(120);
      expect(result.discount.toNumber()).toBe(10);
    });
    it('returns zero discount when final equals reference', () => {
      const items = [
        {
          quantity: new Decimal('1'),
          referencePrice: new Decimal('40'),
          finalPrice: new Decimal('40'),
        },
      ];
      const result = calculateOrderTotals(items);
      expect(result.discount.toNumber()).toBe(0);
    });
  });
});
