import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';
import { FollowsRepository } from './follows.repository';
import { UsersService } from '../users/users.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { hasPermission } from '../../common/permissions/has-permission';
import { AccessDeniedException, EntityNotFoundException } from '../../common/exceptions/app.exceptions';
import type { SessionUser } from '../auth/types/auth.types';

@Injectable()
export class FollowsService {
  constructor(
    private readonly followsRepository: FollowsRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async follow(user: SessionUser, username: string) {
    if (!hasPermission(user, { type: 'platform' }, 'follow.create')) {
      throw new AccessDeniedException();
    }
    const target = await this.usersService.findByUsername(username);
    if (!target) throw new EntityNotFoundException('User', username);
    if (target.id === user.id) throw new BadRequestException('You cannot follow yourself');

    const already = await this.followsRepository.exists(user.id, target.id);
    await this.followsRepository.follow(user.id, target.id);

    // Notify only on a new edge — idempotent re-follow does not re-notify.
    if (!already) {
      await this.notificationsRepository.create(
        target.id,
        user.id,
        NotificationEventType.NEW_FOLLOWER,
        'user',
        user.id,
      );
    }
    return { following: true };
  }

  async unfollow(user: SessionUser, username: string) {
    if (!hasPermission(user, { type: 'platform' }, 'follow.remove')) {
      throw new AccessDeniedException();
    }
    const target = await this.usersService.findByUsername(username);
    if (!target) throw new EntityNotFoundException('User', username);

    await this.followsRepository.unfollow(user.id, target.id);
    return { following: false };
  }

  // ── Cross-module helpers ──────────────────────────────────────────────────

  async getCounts(userId: string) {
    const [followers, following] = await Promise.all([
      this.followsRepository.countFollowers(userId),
      this.followsRepository.countFollowing(userId),
    ]);
    return { followers, following };
  }

  async getStatus(viewerId: string, targetId: string) {
    const [isFollowing, followsYou] = await Promise.all([
      this.followsRepository.exists(viewerId, targetId),
      this.followsRepository.exists(targetId, viewerId),
    ]);
    return { isFollowing, followsYou };
  }

  async areMutualFollows(a: string, b: string): Promise<boolean> {
    return this.followsRepository.areMutualFollows(a, b);
  }
}
