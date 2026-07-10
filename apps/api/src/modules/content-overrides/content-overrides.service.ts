import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessDeniedException, ValidationException } from '../../common/exceptions/app.exceptions';
import { hasPermission } from '../../common/permissions';
import { parseContentEditorIds } from '../../common/content-editor-allowlist';
import type { SessionUser } from '../auth/types/auth.types';
import { ContentOverridesRepository, OverridesByLocale } from './content-overrides.repository';
import { GithubPublisher, type PublishFile } from './github-publisher';
import { UpsertOverrideDto, OVERRIDE_LOCALES, type OverrideLocale } from './dto/upsert-override.dto';
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
    this.editorIds = parseContentEditorIds(this.config.get<string>('CONTENT_EDITOR_USER_IDS', ''));
  }

  // The staged overrides for the web to merge over its baked messages, returned only to an
  // allowlisted editor (the web forwards the editor's session). This keeps staged, unpublished
  // copy from ever reaching other users — even if the feature flag is on. Disabled ⇒ 404.
  async getAllForMerge(user: SessionUser): Promise<OverridesByLocale> {
    this.ensureEnabled();
    this.assertEditor(user);
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
    map[dto.key] = {
      value: dto.value,
      editedById: user.id,
      editedByName: user.displayName,
      editedAt: new Date().toISOString(),
    };
    await this.repository.writeLocale(dto.locale, map);
    return { key: dto.key, locale: dto.locale };
  }

  // Removes a single staged edit (reverts that key/locale to the published value).
  async discard(
    user: SessionUser,
    key: string,
    locale: OverrideLocale,
  ): Promise<{ key: string; locale: string }> {
    this.ensureEnabled();
    this.assertEditor(user);
    const map = await this.repository.readLocale(locale);
    if (key in map) {
      delete map[key];
      await this.repository.writeLocale(locale, map);
    }
    return { key, locale };
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
    const changeLines: string[] = [];
    for (const locale of OVERRIDE_LOCALES) {
      const overrides = staged[locale];
      if (Object.keys(overrides).length === 0) continue;

      const bakedFlat = flatten(baked[locale]);
      const values: Record<string, string> = {};
      for (const [key, entry] of Object.entries(overrides)) {
        // Authoritative ICU parity check against the canonical git files.
        if (bakedFlat[key] !== undefined && !placeholdersEqual(bakedFlat[key], entry.value)) {
          throw new ValidationException(
            `Override for "${key}" (${locale}) changes its placeholders`,
            { key, locale },
          );
        }
        values[key] = entry.value;
        changeLines.push(`- \`${key}\` (${locale}) — edited by ${entry.editedByName}`);
      }

      const merged = applyOverrides(baked[locale], values);
      files.push({
        path: `apps/web/messages/${locale}.json`,
        content: `${JSON.stringify(merged, null, 2)}\n`,
      });
    }

    const body = `Applies ${changeLines.length} staged content override(s) from the in-context editor.\n\n${changeLines.join(
      '\n',
    )}\n\nOpened automatically; review and squash-merge as usual.`;
    return this.publisher.openPullRequest({
      branch: `content/edits-${Date.now()}`,
      title: 'content: apply in-context copy edits',
      body,
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
