import { Test } from '@nestjs/testing';
import { ServiceOrdersService } from './service-orders.service';
import { ServiceOrdersRepository } from './service-orders.repository';
import { ServiceItemsRepository } from '../service-items/service-items.repository';
import { I18nService } from 'nestjs-i18n';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateItem: jest.fn(),
  findItemById: jest.fn(),
  softDelete: jest.fn(),
};

const mockServiceItemsRepo = {
  findById: jest.fn(),
  findByName: jest.fn(),
};

const mockI18n = { t: jest.fn((key: string) => key) };

describe('ServiceOrdersService', () => {
  let service: ServiceOrdersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ServiceOrdersService,
        { provide: ServiceOrdersRepository, useValue: mockRepo },
        { provide: ServiceItemsRepository, useValue: mockServiceItemsRepo },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    service = module.get(ServiceOrdersService);
  });

  describe('create', () => {
    it('resolves snapshots from service items and calculates totals correctly', async () => {
      mockServiceItemsRepo.findById.mockResolvedValue({
        id: 'item-1',
        name: 'Terno simples',
        type: 'POR_UNIDADE',
        price: new Decimal('40'),
      });
      mockRepo.create.mockImplementation((data) => Promise.resolve({ id: 'order-1', ...data }));

      const result = await service.create(
        {
          customerId: 'cust-1',
          estimatedDeliveryAt: '2026-08-01T00:00:00.000Z',
          items: [{ serviceItemId: 'item-1', quantity: 2 }],
        },
        'pt',
      );

      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      const callArg = mockRepo.create.mock.calls[0][0];
      expect(callArg.referenceTotal.toNumber()).toBe(80);
      expect(callArg.finalTotal.toNumber()).toBe(80);
      expect(callArg.discount.toNumber()).toBe(0);
      expect(callArg.items[0]).toMatchObject({
        serviceItemId: 'item-1',
        serviceItemName: 'Terno simples',
        serviceItemType: 'POR_UNIDADE',
      });
      expect(result).toMatchObject({ id: 'order-1' });
    });

    it('throws NotFoundException when a service item does not exist', async () => {
      mockServiceItemsRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(
          {
            customerId: 'cust-1',
            estimatedDeliveryAt: '2026-08-01T00:00:00.000Z',
            items: [{ serviceItemId: 'missing-item', quantity: 1 }],
          },
          'pt',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws BadRequestException when order is DELIVERED', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'DELIVERED' });
      await expect(service.update('1', { observations: 'x' }, 'pt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when order is CANCELLED', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'CANCELLED' });
      await expect(service.update('1', { observations: 'x' }, 'pt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when order does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { observations: 'x' }, 'pt')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deliver', () => {
    it('sets status to DELIVERED', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'READY' });
      mockRepo.update.mockResolvedValue({ id: '1', status: 'DELIVERED' });

      await service.deliver('1', 'pt');
      expect(mockRepo.update).toHaveBeenCalledWith('1', { status: 'DELIVERED' });
    });

    it('throws BadRequestException when order is already CANCELLED', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'CANCELLED' });
      await expect(service.deliver('1', 'pt')).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('throws BadRequestException when order is DELIVERED', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'DELIVERED' });
      await expect(service.cancel('1', 'pt')).rejects.toThrow(BadRequestException);
    });

    it('sets status to CANCELLED otherwise', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'RECEIVED' });
      mockRepo.update.mockResolvedValue({ id: '1', status: 'CANCELLED' });

      await service.cancel('1', 'pt');
      expect(mockRepo.update).toHaveBeenCalledWith('1', { status: 'CANCELLED' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when order does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing', 'pt')).rejects.toThrow(NotFoundException);
    });

    it('calls softDelete not hard delete', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', status: 'RECEIVED' });
      mockRepo.softDelete.mockResolvedValue(undefined);
      await service.remove('1', 'pt');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('1');
    });
  });
});
