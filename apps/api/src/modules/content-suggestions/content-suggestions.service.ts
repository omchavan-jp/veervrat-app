import { Injectable } from '@nestjs/common';
import { Prisma, SuggestionStatus } from '@prisma/client';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { hasPermission } from '../../common/permissions';
import type { PermissionAction } from '../../common/permissions/types';
import type { SessionUser } from '../auth/types/auth.types';
import { CapabilitiesService } from '../capabilities/capabilities.service';
import {
  ContentSuggestionsRepository,
  type SuggestionRecord,
} from './content-suggestions.repository';
import { CreateSuggestionDto } from './dto/create-suggestion.dto';
import { TriageSuggestionDto } from './dto/triage-suggestion.dto';
import { ListSuggestionsQueryDto } from './dto/list-suggestions.query.dto';
import { MineQueryDto } from './dto/mine.query.dto';

@Injectable()
export class ContentSuggestionsService {
  constructor(
    private readonly repository: ContentSuggestionsRepository,
    private readonly capabilities: CapabilitiesService,
  ) {}

  async create(user: SessionUser, dto: CreateSuggestionDto): Promise<SuggestionRecord> {
    if (!(await this.allowed(user, 'content_suggestion.create'))) {
      throw new AccessDeniedException();
    }

    return this.repository.create({
      authorId: user.id,
      kind: dto.kind,
      route: dto.route,
      url: dto.url,
      entityType: dto.entityType ?? null,
      entityId: dto.entityId ?? null,
      locale: dto.locale,
      anchorKey: dto.anchorKey ?? null,
      anchorText: dto.anchorText ?? null,
      anchorPath: dto.anchorPath ?? null,
      viewport: dto.viewport ?? null,
      titleEn: dto.titleEn,
      titleMr: dto.titleMr ?? null,
      bodyEn: dto.bodyEn as Prisma.InputJsonValue | undefined,
      bodyMr: dto.bodyMr as Prisma.InputJsonValue | undefined,
      currentText: dto.currentText ?? null,
    });
  }

  /**
   * The author's own suggestions — the whole list, or just this page's for the in-place pins.
   *
   * Scoped to `user.id` in the query rather than filtered afterwards: an author must never be
   * able to widen this by passing something, and a filter applied after the fact is one refactor
   * away from being dropped.
   */
  async listMine(user: SessionUser, query: MineQueryDto): Promise<SuggestionRecord[]> {
    if (!(await this.allowed(user, 'content_suggestion.read_own'))) {
      throw new AccessDeniedException();
    }

    if (query.route) {
      return this.repository.listForAuthorOnRoute(user.id, query.route, query.entityId ?? null);
    }
    return this.repository.listForAuthor(user.id);
  }

  async listAll(user: SessionUser, query: ListSuggestionsQueryDto) {
    if (!hasPermission(user, { type: 'platform' }, 'content_suggestion.triage')) {
      throw new AccessDeniedException();
    }
    return this.repository.listAll(query);
  }

  async triage(user: SessionUser, id: string, dto: TriageSuggestionDto): Promise<SuggestionRecord> {
    if (!hasPermission(user, { type: 'platform' }, 'content_suggestion.triage')) {
      throw new AccessDeniedException();
    }

    const existing = await this.repository.findById(id);
    if (!existing) throw new EntityNotFoundException('ContentSuggestion', id);

    return this.repository.triage(id, {
      status: dto.status,
      // Only overwrite what was sent. A triage that sets a status must not silently blank a
      // resolution written in an earlier pass.
      ...(dto.resolution !== undefined ? { resolution: dto.resolution } : {}),
      ...(dto.linkedIssue !== undefined ? { linkedIssue: dto.linkedIssue } : {}),
      ...(dto.linkedCmsKey !== undefined ? { linkedCmsKey: dto.linkedCmsKey } : {}),
      triagedById: user.id,
    });
  }

  /**
   * Both halves of the capability decision, read per request.
   *
   * `featureMode('CONTENT_SUGGEST')` is unconditionally `granted` — the per-user grant is the
   * whole gate, deliberately, so there is no second switch that can be left unset in
   * infrastructure and quietly disable the feature. See `capabilities.service.ts`.
   */
  private async allowed(user: SessionUser, action: PermissionAction): Promise<boolean> {
    const grants = await this.capabilities.grantsFor(user.id);
    const featureMode = this.capabilities.featureMode('CONTENT_SUGGEST');
    return hasPermission(user, { type: 'platform', grants, featureMode }, action);
  }
}

export { SuggestionStatus };
