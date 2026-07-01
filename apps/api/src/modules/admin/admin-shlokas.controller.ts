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
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminShlokasService } from './admin-shlokas.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import {
  CreateShlokaDto,
  ReorderQueueDto,
  ScheduleShlokaDto,
  UpdateShlokaDto,
} from './dto/shloka.dto';

@Controller('admin/shlokas')
@UseGuards(SessionGuard)
export class AdminShlokasController {
  constructor(private readonly shlokas: AdminShlokasService) {}

  // schedule + queue declared before :id so they aren't swallowed as ids.
  @Get('schedule')
  listSchedule(
    @CurrentUser() user: SessionUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.shlokas.listSchedule(user, from, to);
  }

  @Patch('schedule')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'admin.schedule_shloka',
    resourceType: 'shloka_schedule',
    resourceId: (c) => (c.body as ScheduleShlokaDto)?.shlokaId,
    metadata: (c) => ({ date: (c.body as ScheduleShlokaDto)?.date }),
  })
  schedule(@CurrentUser() user: SessionUser, @Body() dto: ScheduleShlokaDto) {
    return this.shlokas.schedule(user, dto);
  }

  @Delete('schedule/:date')
  @Audited({
    action: 'admin.unschedule_shloka',
    resourceType: 'shloka_schedule',
    metadata: (c) => ({ date: c.params.date }),
  })
  unschedule(@CurrentUser() user: SessionUser, @Param('date') date: string) {
    return this.shlokas.unschedule(user, date);
  }

  @Get('queue')
  listQueue(@CurrentUser() user: SessionUser) {
    return this.shlokas.listQueue(user);
  }

  @Patch('queue')
  @HttpCode(HttpStatus.OK)
  @Audited({
    action: 'admin.reorder_shloka_queue',
    resourceType: 'shloka_queue',
    metadata: (c) => ({ count: (c.body as ReorderQueueDto)?.shlokaIds?.length }),
  })
  reorderQueue(@CurrentUser() user: SessionUser, @Body() dto: ReorderQueueDto) {
    return this.shlokas.reorderQueue(user, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audited({
    action: 'admin.create_shloka',
    resourceType: 'shloka',
    resourceId: (c) => (c.result as { id?: string })?.id,
  })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateShlokaDto) {
    return this.shlokas.create(user, dto);
  }

  @Patch(':id')
  @Audited({ action: 'admin.update_shloka', resourceType: 'shloka', resourceIdParam: 'id' })
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateShlokaDto) {
    return this.shlokas.update(user, id, dto);
  }

  @Delete(':id')
  @Audited({ action: 'admin.delete_shloka', resourceType: 'shloka', resourceIdParam: 'id' })
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.shlokas.remove(user, id);
  }
}
