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
import { AdminResourcesService } from './admin-resources.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Controller('admin/resources')
@UseGuards(SessionGuard)
export class AdminResourcesController {
  constructor(private readonly resources: AdminResourcesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audited({ action: 'admin.create_resource', resourceType: 'resource', resourceId: (c) => (c.result as { id?: string })?.id })
  create(@CurrentUser() user: SessionUser, @Body() dto: CreateResourceDto) {
    return this.resources.create(user, dto);
  }

  @Patch(':id')
  @Audited({ action: 'admin.update_resource', resourceType: 'resource', resourceIdParam: 'id' })
  update(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.resources.update(user, id, dto);
  }

  @Delete(':id')
  @Audited({ action: 'admin.delete_resource', resourceType: 'resource', resourceIdParam: 'id' })
  remove(@CurrentUser() user: SessionUser, @Param('id') id: string) {
    return this.resources.remove(user, id);
  }
}
