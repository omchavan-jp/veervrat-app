import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminPothiService } from './admin-pothi.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { CreatePothiSectionDto, UpdatePothiSectionDto } from './dto/pothi.dto';

@Controller('admin/pothi/sections')
@UseGuards(SessionGuard)
export class AdminPothiController {
  constructor(private readonly pothi: AdminPothiService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audited({
    action: 'admin.create_pothi_section',
    resourceType: 'pothi_section',
    resourceId: (c) => (c.result as { id?: string })?.id,
  })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreatePothiSectionDto) {
    return this.pothi.create(user, dto);
  }

  @Patch(':id')
  @Audited({ action: 'admin.update_pothi_section', resourceType: 'pothi_section', resourceIdParam: 'id' })
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdatePothiSectionDto) {
    return this.pothi.update(user, id, dto);
  }

  @Delete(':id')
  @Audited({ action: 'admin.delete_pothi_section', resourceType: 'pothi_section', resourceIdParam: 'id' })
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.pothi.remove(user, id);
  }
}
