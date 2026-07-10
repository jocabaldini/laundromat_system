import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ServiceItemsRepository } from './service-items.repository';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';
import { ServiceItemQueryDto } from './dto/service-item-query.dto';

@Injectable()
export class ServiceItemsService {
  constructor(
    private readonly repo: ServiceItemsRepository,
    private readonly i18n: I18nService,
  ) {}

  findAll(query: ServiceItemQueryDto) {
    return this.repo.findAll({ includeDeleted: query.includeDeleted });
  }

  async findById(id: string, lang: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(this.i18n.t('service-items.not_found', { lang }));
    return item;
  }

  async create(dto: CreateServiceItemDto, lang: string) {
    const existing = await this.repo.findByName(dto.name, true);
    if (existing) throw new ConflictException(this.i18n.t('service-items.name_in_use', { lang }));
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateServiceItemDto, lang: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(this.i18n.t('service-items.not_found', { lang }));

    if (dto.name && dto.name !== item.name) {
      const nameInUse = await this.repo.findByName(dto.name, true);
      if (nameInUse)
        throw new ConflictException(this.i18n.t('service-items.name_in_use', { lang }));
    }

    return this.repo.update(id, dto);
  }

  async remove(id: string, lang: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(this.i18n.t('service-items.not_found', { lang }));
    await this.repo.softDelete(id);
    return { ok: true };
  }
}
