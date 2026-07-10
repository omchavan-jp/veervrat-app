import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessDeniedException, ValidationException } from '../../common/exceptions/app.exceptions';
import { hasPermission } from '../../common/permissions';
import type { SessionUser } from '../auth/types/auth.types';
import { ContentOverridesRepository, OverridesByLocale } from './content-overrides.repository';
import { GithubPublisher, type PublishFile } from './github-publisher';
import { UpsertOverrideDto, OVERRIDE_LOCALES } from './dto/upsert-override.dto';
import { flatten, applyOverrides } from './messages.util';
import { placeholdersEqual } from './icu-placeholders';

@Injectable()
export class ContentOverridesService {
  private readonly enabled: boolean;
  private readonly editorIds: Set<string>;

  constructor(
    private readonly repository: ContentOverridesRepository,
    private readonly publisher: GithubPublisher,
    private readonly config: ConfigService,
  ) {
    this.enabled = this.config.get<boolean>('CONTENT_EDIT_ENABLED', false);
    this.editorIds = new Set(
      (this.config.get<string>('CONTENT_EDITOR_USER_IDS', '') ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    );
  }

  // The staged overrides for the web app to merge over its baked messages. Read-only and
  // feature-gated (not per-user) so the edit deployment's server can fetch it while
  // rendering; production has the feature disabled and returns 404.
  async getAllForMerge(): Promise<OverridesByLocale> {
    this.ensureEnabled();
    return this.repository.readAll();
  }

  async upsert(
    user: SessionUser,
    dto: UpsertOverrideDto,
  ): Promise<{ key: string; locale: string }> {
    this.ensureEnabled();
    this.assertEditor(user);

    // Immediate guardrail against dropping/adding interpolation args; the authoritative
    // check runs at publish against the canonical git files.
    if (!placeholdersEqual(dto.baseValue, dto.value)) {
      throw new ValidationException('Edited text changes the {placeholders} of the original', {
        key: dto.key,
      });
    }

    const map = await this.repository.readLocale(dto.locale);
    map[dto.key] = dto.value;
    await this.repository.writeLocale(dto.locale, map);
    return { key: dto.key, locale: dto.locale };
  }

  async publish(user: SessionUser): Promise<{ prUrl: string; branch: string }> {
    this.ensureEnabled();
    this.assertEditor(user);
    if (!this.publisher.configured) {
      throw new ServiceUnavailableException('Content publishing is not configured');
    }

    const staged = await this.repository.readAll();
    const hasEdits = OVERRIDE_LOCALES.some((l) => Object.keys(staged[l]).length > 0);
    if (!hasEdits) {
      throw new ValidationException('There are no staged edits to publish');
    }

    const baked = await this.publisher.getMessageFiles();
    const files: PublishFile[] = [];
    for (const locale of OVERRIDE_LOCALES) {
      const overrides = staged[locale];
      if (Object.keys(overrides).length === 0) continue;

      // Authoritative ICU parity check against the canonical git files.
      const bakedFlat = flatten(baked[locale]);
      for (const [key, value] of Object.entries(overrides)) {
        const current = bakedFlat[key];
        if (current !== undefined && !placeholdersEqual(current, value)) {
          throw new ValidationException(
            `Override for "${key}" (${locale}) changes its placeholders`,
            { key, locale },
          );
        }
      }

      const merged = applyOverrides(baked[locale], overrides);
      files.push({
        path: `apps/web/messages/${locale}.json`,
        content: `${JSON.stringify(merged, null, 2)}\n`,
      });
    }

    const total = OVERRIDE_LOCALES.reduce((n, l) => n + Object.keys(staged[l]).length, 0);
    return this.publisher.openPullRequest({
      branch: `content/edits-${Date.now()}`,
      title: 'content: apply in-context copy edits',
      body: `Applies ${total} staged content override(s) from the in-context editor.\n\nOpened automatically; review and squash-merge as usual.`,
      files,
    });
  }

  private ensureEnabled(): void {
    // Hard master gate: when disabled (the production default) the routes behave as if the
    // feature does not exist.
    if (!this.enabled) throw new NotFoundException('Not found');
  }

  private assertEditor(user: SessionUser): void {
    const isContentEditor = this.editorIds.has(user.id);
    if (!hasPermission(user, { type: 'platform', isContentEditor }, 'content.edit')) {
      throw new AccessDeniedException();
    }
  }
}
