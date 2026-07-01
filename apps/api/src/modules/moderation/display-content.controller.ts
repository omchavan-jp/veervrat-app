import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { DisplayContentService } from './display-content.service';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SessionUser } from '../auth/types/auth.types';
import { Audited } from '../audit/audited.decorator';
import { SetFeaturedDto } from './dto/set-featured.dto';

@Controller('moderation')
@UseGuards(SessionGuard)
export class DisplayContentController {
  constructor(private readonly display: DisplayContentService) {}

  @Patch('blogs/:id/featured')
  @Audited({
    action: 'moderator.feature_blog',
    resourceType: 'blog',
    resourceIdParam: 'id',
    metadata: (c) => ({ featured: (c.body as SetFeaturedDto)?.featured }),
  })
  featureBlog(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: SetFeaturedDto,
  ) {
    return this.display.setBlogFeatured(user, id, dto.featured);
  }

  @Patch('experiences/:id/featured')
  @Audited({
    action: 'moderator.feature_experience',
    resourceType: 'experience_log',
    resourceIdParam: 'id',
    metadata: (c) => ({ featured: (c.body as SetFeaturedDto)?.featured }),
  })
  featureExperience(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() dto: SetFeaturedDto,
  ) {
    return this.display.setExperienceFeatured(user, id, dto.featured);
  }
}
