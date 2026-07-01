import { Injectable } from '@nestjs/common';
import { AdminContentRepository } from './admin-content.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import {
  InvalidTiptapContentError,
  sanitizeTiptapDoc,
  type TiptapDoc,
} from '../../common/tiptap/sanitize';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Injectable()
export class AdminResourcesService {
  constructor(private readonly repo: AdminContentRepository) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_resources')) {
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

  async create(user: SessionUser, dto: CreateResourceDto) {
    this.assert(user);
    return this.repo.createResource(
      {
        type: dto.type,
        url: dto.url,
        filePath: dto.filePath,
        thumbnailUrl: dto.thumbnailUrl,
        title: dto.title,
        oneLiner: dto.oneLiner,
        description: dto.description !== undefined ? this.sanitize(dto.description) : undefined,
        looseTags: dto.looseTags ?? [],
        createdById: user.id,
      },
      dto.formalTags ?? [],
    );
  }

  async update(user: SessionUser, id: string, dto: UpdateResourceDto) {
    this.assert(user);
    if (!(await this.repo.findResource(id))) throw new EntityNotFoundException('Resource', id);
    return this.repo.updateResource(
      id,
      {
        type: dto.type,
        url: dto.url,
        filePath: dto.filePath,
        thumbnailUrl: dto.thumbnailUrl,
        title: dto.title,
        oneLiner: dto.oneLiner,
        description: dto.description !== undefined ? this.sanitize(dto.description) : undefined,
        looseTags: dto.looseTags,
      },
      dto.formalTags,
    );
  }

  async remove(user: SessionUser, id: string) {
    this.assert(user);
    if (!(await this.repo.findResource(id))) throw new EntityNotFoundException('Resource', id);
    return this.repo.deleteResource(id);
  }
}
