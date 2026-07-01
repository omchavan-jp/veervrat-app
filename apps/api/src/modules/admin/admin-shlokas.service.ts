import { Injectable } from '@nestjs/common';
import { AdminContentRepository } from './admin-content.repository';
import { ContentService } from '../content/content.service';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityNotFoundException,
  ValidationException,
} from '../../common/exceptions/app.exceptions';
import {
  CreateShlokaDto,
  ReorderQueueDto,
  ScheduleShlokaDto,
  UpdateShlokaDto,
} from './dto/shloka.dto';

@Injectable()
export class AdminShlokasService {
  constructor(
    private readonly repo: AdminContentRepository,
    private readonly content: ContentService,
  ) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_shlokas')) {
      throw new AccessDeniedException();
    }
  }

  async create(user: SessionUser, dto: CreateShlokaDto) {
    this.assert(user);
    const shloka = await this.repo.createShloka({
      devanagariText: dto.devanagariText,
      transliteration: dto.transliteration,
      meaningEn: dto.meaningEn,
      meaningMr: dto.meaningMr,
      sourceCitation: dto.sourceCitation,
      looseTags: dto.looseTags ?? [],
      formalTags: dto.formalTags ?? [],
    });
    this.content.syncShlokaToIndex(shloka);
    return shloka;
  }

  async update(user: SessionUser, id: string, dto: UpdateShlokaDto) {
    this.assert(user);
    if (!(await this.repo.findShloka(id))) throw new EntityNotFoundException('Shloka', id);
    const shloka = await this.repo.updateShloka(id, {
      devanagariText: dto.devanagariText,
      transliteration: dto.transliteration,
      meaningEn: dto.meaningEn,
      meaningMr: dto.meaningMr,
      sourceCitation: dto.sourceCitation,
      looseTags: dto.looseTags,
      formalTags: dto.formalTags,
    });
    this.content.syncShlokaToIndex(shloka);
    return shloka;
  }

  async remove(user: SessionUser, id: string) {
    this.assert(user);
    if (!(await this.repo.findShloka(id))) throw new EntityNotFoundException('Shloka', id);
    const result = await this.repo.deleteShloka(id);
    this.content.removeShlokaFromIndex(id);
    return result;
  }

  // ─── Scheduling ────────────────────────────────────────────────────────────────
  private parseDate(input: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
    if (!m) throw new ValidationException('Invalid date; expected YYYY-MM-DD');
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  }

  async schedule(user: SessionUser, dto: ScheduleShlokaDto) {
    this.assert(user);
    if (!(await this.repo.findShloka(dto.shlokaId)))
      throw new EntityNotFoundException('Shloka', dto.shlokaId);
    return this.repo.upsertSchedule(this.parseDate(dto.date), dto.shlokaId);
  }

  async unschedule(user: SessionUser, date: string) {
    this.assert(user);
    await this.repo.deleteSchedule(this.parseDate(date));
    return { date };
  }

  async listSchedule(user: SessionUser, from?: string, to?: string) {
    this.assert(user);
    const start = from ? this.parseDate(from) : this.parseDate(this.todayIso());
    const end = to ? this.parseDate(to) : new Date(start.getTime() + 60 * 86_400_000);
    return this.repo.listSchedule(start, end);
  }

  private todayIso(): string {
    // getToday uses UTC midnight; mirror it without Date.now in business logic boundaries.
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  // ─── Queue ───────────────────────────────────────────────────────────────────
  async listQueue(user: SessionUser) {
    this.assert(user);
    return this.repo.listQueue();
  }

  async reorderQueue(user: SessionUser, dto: ReorderQueueDto) {
    this.assert(user);
    const unique = new Set(dto.shlokaIds);
    if (unique.size !== dto.shlokaIds.length)
      throw new ValidationException('Queue contains duplicate shlokas');
    if (dto.shlokaIds.length > 0) {
      const found = await this.repo.countShlokasByIds(dto.shlokaIds);
      if (found !== dto.shlokaIds.length)
        throw new ValidationException('Queue references unknown shlokas');
    }
    await this.repo.replaceQueue(dto.shlokaIds);
    return this.repo.listQueue();
  }
}
