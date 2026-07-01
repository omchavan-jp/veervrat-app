import { Injectable } from '@nestjs/common';
import { ModerationRepository } from './moderation.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import {
  AccessDeniedException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class DisplayContentService {
  constructor(private readonly repository: ModerationRepository) {}

  private assert(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'moderator.manage_display_content')) {
      throw new AccessDeniedException();
    }
  }

  async setBlogFeatured(user: SessionUser, id: string, featured: boolean) {
    this.assert(user);
    if (!(await this.repository.findBlog(id))) throw new EntityNotFoundException('Blog', id);
    return this.repository.setBlogFeatured(id, featured);
  }

  async setExperienceFeatured(user: SessionUser, id: string, featured: boolean) {
    this.assert(user);
    if (!(await this.repository.findExperienceLog(id)))
      throw new EntityNotFoundException('ExperienceLog', id);
    return this.repository.setExperienceLogFeatured(id, featured);
  }
}
