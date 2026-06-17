import { Injectable } from '@nestjs/common';
import { AdminContentRepository } from './admin-content.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import { CreatePothiSectionDto, UpdatePothiSectionDto } from './dto/pothi.dto';

@Injectable()
export class AdminPothiService {
  constructor(private readonly repo: AdminContentRepository) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_pothi')) {
      throw new AccessDeniedException();
    }
  }

  private async assertShlokas(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    if (new Set(ids).size !== ids.length) throw new ValidationException('Section has duplicate shlokas');
    const found = await this.repo.countShlokasByIds(ids);
    if (found !== ids.length) throw new ValidationException('Section references unknown shlokas');
  }

  async create(user: SessionUser, dto: CreatePothiSectionDto) {
    this.assert(user);
    const shlokaIds = dto.shlokaIds ?? [];
    await this.assertShlokas(shlokaIds);
    return this.repo.createPothiSection(
      {
        sectionNumber: dto.sectionNumber,
        titleEn: dto.titleEn,
        titleMr: dto.titleMr,
        introText: dto.introText,
        congregationResponse: dto.congregationResponse,
        postShlokaCommentary: dto.postShlokaCommentary,
      },
      shlokaIds,
    );
  }

  async update(user: SessionUser, id: string, dto: UpdatePothiSectionDto) {
    this.assert(user);
    if (!(await this.repo.findPothiSection(id))) throw new EntityNotFoundException('PothiSection', id);
    if (dto.shlokaIds !== undefined) await this.assertShlokas(dto.shlokaIds);
    return this.repo.updatePothiSection(
      id,
      {
        sectionNumber: dto.sectionNumber,
        titleEn: dto.titleEn,
        titleMr: dto.titleMr,
        introText: dto.introText,
        congregationResponse: dto.congregationResponse,
        postShlokaCommentary: dto.postShlokaCommentary,
      },
      dto.shlokaIds,
    );
  }

  async remove(user: SessionUser, id: string) {
    this.assert(user);
    if (!(await this.repo.findPothiSection(id))) throw new EntityNotFoundException('PothiSection', id);
    return this.repo.deletePothiSection(id);
  }
}
