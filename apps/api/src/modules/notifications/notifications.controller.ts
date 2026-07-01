import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';

@Controller('notifications')
@UseGuards(SessionGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: SessionUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Get()
  async list(@CurrentUser() user: SessionUser, @Query() dto: ListNotificationsDto) {
    return this.notificationsService.listForUser(user.id, dto.cursor, dto.pageSize);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: SessionUser) {
    const updated = await this.notificationsService.markAllRead(user.id);
    return { updated };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    await this.notificationsService.markRead(user.id, id);
    return {};
  }
}
