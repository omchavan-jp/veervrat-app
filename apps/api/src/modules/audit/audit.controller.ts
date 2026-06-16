import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessDeniedException } from '../../common/exceptions/app.exceptions';
import { isAdmin } from '../../common/permissions/types';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('admin/audit-events')
@UseGuards(SessionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Admin-only audit log (spec/17 — queryable by admin). Cursor-paginated.
  @Get()
  async list(
    @CurrentUser() user: SessionUser,
    @Query('cursor') cursor?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    if (!isAdmin(user)) throw new AccessDeniedException();
    return this.auditService.list({ cursor, action, actorId });
  }
}
