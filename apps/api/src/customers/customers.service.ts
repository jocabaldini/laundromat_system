import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CustomersRepository } from './customers.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly repo: CustomersRepository,
    private readonly i18n: I18nService,
  ) {}

  findAll(query: CustomerQueryDto) {
    return this.repo.findAll({
      search: query.search,
      includeDeleted: query.includeDeleted,
    });
  }

  async findById(id: string, lang: string) {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw new NotFoundException(this.i18n.t('customers.not_found', { lang }));
    }
    return customer;
  }

  async findByCode(code: string, lang: string) {
    const customer = await this.repo.findByCode(code);
    if (!customer) {
      throw new NotFoundException(this.i18n.t('customers.not_found', { lang }));
    }
    return customer;
  }

  // Returns availability status for real-time code validation in the frontend
  async checkCodeAvailability(code: string): Promise<{ available: boolean }> {
    const existing = await this.repo.findByCode(code, true); // include deleted to block reuse
    return { available: !existing };
  }

  async create(dto: CreateCustomerDto, lang: string) {
    // Block reuse of codes even from soft-deleted customers
    const existing = await this.repo.findByCode(dto.code, true);
    if (existing) {
      throw new ConflictException(this.i18n.t('customers.code_in_use', { lang }));
    }
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateCustomerDto, lang: string) {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw new NotFoundException(this.i18n.t('customers.not_found', { lang }));
    }

    // If code is changing, verify the new one is available
    if (dto.code && dto.code.toUpperCase() !== customer.code) {
      const codeInUse = await this.repo.findByCode(dto.code, true);
      if (codeInUse) {
        throw new ConflictException(this.i18n.t('customers.code_in_use', { lang }));
      }
    }

    return this.repo.update(id, dto);
  }

  async remove(id: string, lang: string) {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw new NotFoundException(this.i18n.t('customers.not_found', { lang }));
    }
    await this.repo.softDelete(id);
    return { ok: true };
  }

  // Suggests a 3-character code based on the customer name.
  // Priority: first letters of each word (up to 3 words).
  // Falls back to first 3 characters of the name if fewer than 3 words.
  suggestCode(name: string): string {
    const words = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 3) {
      return words[0][0] + words[1][0] + words[2][0];
    }
    if (words.length === 2) {
      return words[0].slice(0, 2) + words[1][0];
    }
    return (words[0] ?? 'XXX').slice(0, 3);
  }
}
