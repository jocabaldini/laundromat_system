import { Test } from '@nestjs/testing';
import { ServiceItemsService } from './service-items.service';
import { ServiceItemsRepository } from './service-items.repository';
import { I18nService } from 'nestjs-i18n';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PricingType } from '@prisma/client';

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockI18n = { t: jest.fn((key: string) => key) };

describe('ServiceItemsService', () => {
  let service: ServiceItemsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ServiceItemsService,
        { provide: ServiceItemsRepository, useValue: mockRepo },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    service = module.get(ServiceItemsService);
  });

  describe('create', () => {
    it('throws ConflictException when name already exists', async () => {
      mockRepo.findByName.mockResolvedValue({ id: '1', name: 'Terno simples' });
      await expect(
        service.create({ name: 'Terno simples', type: PricingType.POR_UNIDADE, price: 40 }, 'pt'),
      ).rejects.toThrow(ConflictException);
    });

    it('creates item when name is unique', async () => {
      mockRepo.findByName.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: '1', name: 'Novo item' });
      const result = await service.create(
        { name: 'Novo item', type: PricingType.POR_KG, price: 25 },
        'pt',
      );
      expect(result.name).toBe('Novo item');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when item does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing', 'pt')).rejects.toThrow(NotFoundException);
    });

    it('calls softDelete not hard delete', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1' });
      mockRepo.softDelete.mockResolvedValue(undefined);
      await service.remove('1', 'pt');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('1');
    });
  });
});
