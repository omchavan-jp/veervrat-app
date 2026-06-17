import { Injectable } from '@nestjs/common';
import { CmsRepository } from './cms.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import { InvalidTiptapContentError, sanitizeTiptapDoc, type TiptapDoc } from '../../common/tiptap/sanitize';
import { UpdateCmsPageDto, UpsertCmsPageDto } from './dto/cms-page.dto';

@Injectable()
export class CmsService {
  constructor(private readonly repo: CmsRepository) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_content')) {
      throw new AccessDeniedException();
    }
  }

  private sanitize(body: unknown): TiptapDoc {
    try {
      return sanitizeTiptapDoc(body);
    } catch (e) {
      if (e instanceof InvalidTiptapContentError) throw new ValidationException(e.message);
      throw e;
    }
  }

  async getByKey(key: string) {
    const page = await this.repo.findByKey(key);
    if (!page) throw new EntityNotFoundException('CmsPage', key);
    return page;
  }

  async list(user: SessionUser) {
    this.assert(user);
    return this.repo.list();
  }

  async upsert(user: SessionUser, dto: UpsertCmsPageDto) {
    this.assert(user);
    return this.repo.upsert({
      key: dto.key,
      titleEn: dto.titleEn,
      titleMr: dto.titleMr,
      bodyEn: this.sanitize(dto.bodyEn),
      bodyMr: dto.bodyMr !== undefined ? this.sanitize(dto.bodyMr) : undefined,
      updatedById: user.id,
    });
  }

  async update(user: SessionUser, key: string, dto: UpdateCmsPageDto) {
    this.assert(user);
    if (!(await this.repo.findByKey(key))) throw new EntityNotFoundException('CmsPage', key);
    return this.repo.update(key, {
      titleEn: dto.titleEn,
      titleMr: dto.titleMr,
      bodyEn: dto.bodyEn !== undefined ? this.sanitize(dto.bodyEn) : undefined,
      bodyMr: dto.bodyMr !== undefined ? this.sanitize(dto.bodyMr) : undefined,
      updatedById: user.id,
    });
  }

  async remove(user: SessionUser, key: string) {
    this.assert(user);
    if (!(await this.repo.findByKey(key))) throw new EntityNotFoundException('CmsPage', key);
    return this.repo.delete(key);
  }
}
