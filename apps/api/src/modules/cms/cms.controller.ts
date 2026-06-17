import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CmsService } from './cms.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { OptionalSessionGuard } from '../auth/guards/optional-session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { UpdateCmsPageDto, UpsertCmsPageDto } from './dto/cms-page.dto';

@Controller()
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  // ─── Public read ───────────────────────────────────────────────────────────────
  @Get('cms-pages/:key')
  @UseGuards(OptionalSessionGuard)
  getByKey(@Param('key') key: string) {
    return this.cms.getByKey(key);
  }

  // ─── Admin management ────────────────────────────────────────────────────────────
  @Get('admin/cms-pages')
  @UseGuards(SessionGuard)
  list(@CurrentUser() user: SessionUser) {
    return this.cms.list(user);
  }

  @Post('admin/cms-pages')
  @UseGuards(SessionGuard)
  @HttpCode(HttpStatus.OK)
  // CMS pages are keyed by a slug, not a UUID; audit resource_id is a uuid column, so the
  // key travels in metadata and resourceId stays null.
  @Audited({
    action: 'admin.upsert_cms_page',
    resourceType: 'cms_page',
    metadata: (c) => ({ key: (c.body as UpsertCmsPageDto)?.key }),
  })
  upsert(@CurrentUser() user: SessionUser, @Body() dto: UpsertCmsPageDto) {
    return this.cms.upsert(user, dto);
  }

  @Patch('admin/cms-pages/:key')
  @UseGuards(SessionGuard)
  @Audited({ action: 'admin.update_cms_page', resourceType: 'cms_page', metadata: (c) => ({ key: c.params.key }) })
  update(@CurrentUser() user: SessionUser, @Param('key') key: string, @Body() dto: UpdateCmsPageDto) {
    return this.cms.update(user, key, dto);
  }

  @Delete('admin/cms-pages/:key')
  @UseGuards(SessionGuard)
  @Audited({ action: 'admin.delete_cms_page', resourceType: 'cms_page', metadata: (c) => ({ key: c.params.key }) })
  remove(@CurrentUser() user: SessionUser, @Param('key') key: string) {
    return this.cms.remove(user, key);
  }
}
