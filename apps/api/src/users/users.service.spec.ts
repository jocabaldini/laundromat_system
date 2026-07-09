import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { I18nService } from 'nestjs-i18n';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

// Mock implementations — isolate business logic from database
const mockRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findPublicById: jest.fn(),
  findByEmail: jest.fn(),
  findByEmailWithCredentials: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateRefreshToken: jest.fn(),
  clearRefreshToken: jest.fn(),
};

const mockI18n = {
  t: jest.fn((key: string) => key),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('throws ConflictException when email already exists', async () => {
      mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(
        service.create({ email: 'test@test.com', password: 'Pass@123' }, 'pt'),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user when email is unique', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: '1', email: 'new@test.com', role: 'USER' });

      const result = await service.create({ email: 'new@test.com', password: 'Pass@123' }, 'pt');
      expect(result.email).toBe('new@test.com');
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('throws ForbiddenException when USER tries to view another user', async () => {
      await expect(service.findOne('other-id', 'pt', 'my-id', Role.USER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findPublicById.mockResolvedValue(null);
      await expect(service.findOne('missing-id', 'pt', 'missing-id', Role.USER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns user when OPERATOR requests any user', async () => {
      const user = { id: 'other-id', email: 'other@test.com', role: 'USER' };
      mockRepo.findPublicById.mockResolvedValue(user);
      const result = await service.findOne('other-id', 'pt', 'my-id', Role.OPERATOR);
      expect(result).toEqual(user);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findPublicById.mockResolvedValue(null);
      await expect(service.remove('missing-id', 'pt')).rejects.toThrow(NotFoundException);
    });

    it('deletes user when found', async () => {
      mockRepo.findPublicById.mockResolvedValue({ id: '1' });
      mockRepo.delete.mockResolvedValue(undefined);
      await service.remove('1', 'pt');
      expect(mockRepo.delete).toHaveBeenCalledWith('1');
    });
  });
});
