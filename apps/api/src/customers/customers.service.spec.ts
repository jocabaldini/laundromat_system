import { Test } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
import { I18nService } from 'nestjs-i18n';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findByCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

const mockI18n = { t: jest.fn((key: string) => key) };

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CustomersRepository, useValue: mockRepo },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  describe('create', () => {
    it('throws ConflictException when code already exists', async () => {
      mockRepo.findByCode.mockResolvedValue({ id: '1', code: 'ABC' });
      await expect(service.create({ code: 'ABC', name: 'Ana' }, 'pt')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates customer when code is unique', async () => {
      mockRepo.findByCode.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: '1', code: 'ABC', name: 'Ana' });
      const result = await service.create({ code: 'ABC', name: 'Ana' }, 'pt');
      expect(result.code).toBe('ABC');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when customer does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'pt')).rejects.toThrow(NotFoundException);
    });

    it('calls softDelete (not hard delete)', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', code: 'ABC' });
      mockRepo.softDelete.mockResolvedValue(undefined);
      await service.remove('1', 'pt');
      expect(mockRepo.softDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('suggestCode', () => {
    it('uses first letters of 3 words', () => {
      expect(service.suggestCode('Maria Aparecida Santos')).toBe('MAS');
    });

    it('uses first 2 chars of first word + first of second for 2 words', () => {
      expect(service.suggestCode('João Silva')).toBe('JOS');
    });

    it('uses first 3 chars of single word', () => {
      expect(service.suggestCode('Beatriz')).toBe('BEA');
    });

    it('handles extra spaces', () => {
      expect(service.suggestCode('  Ana  Lima  ')).toBe('ANL');
    });
  });

  describe('checkCodeAvailability', () => {
    it('returns available true when code does not exist', async () => {
      mockRepo.findByCode.mockResolvedValue(null);
      const result = await service.checkCodeAvailability('XYZ');
      expect(result).toEqual({ available: true });
    });

    it('returns available false when code exists (even deleted)', async () => {
      mockRepo.findByCode.mockResolvedValue({ id: '1', code: 'XYZ', deletedAt: new Date() });
      const result = await service.checkCodeAvailability('XYZ');
      expect(result).toEqual({ available: false });
    });
  });
});
