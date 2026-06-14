import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import type { OwnProfileDto, PublicProfileDto } from './dto/public-profile.dto';
import { parseVisibility, isFieldVisible } from './profile-visibility';
import {
  EntityNotFoundException,
  UserUsernameTakenException,
} from '../../common/exceptions/app.exceptions';

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const ONLINE_THRESHOLD_MINUTES = 5;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getOwnProfile(userId: string): Promise<OwnProfileDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new EntityNotFoundException('User', userId);
    return this.toOwnProfileDto(user);
  }

  async updateOwnProfile(userId: string, dto: UpdateProfileDto): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);

    if (dto.username) {
      const taken = await this.usersRepository.isUsernameTaken(dto.username, userId);
      if (taken) throw new UserUsernameTakenException();
    }

    const user = await this.usersRepository.updateProfile(userId, {
      displayName: dto.displayName,
      username: dto.username,
      gender: dto.gender,
      // null = clear, undefined = no-change, string = set
      dob: dto.dob === undefined ? undefined : dto.dob === null ? null : new Date(dto.dob),
      language: dto.language,
    });

    return this.toOwnProfileDto(user);
  }

  async getPublicProfile(
    username: string,
    _requestingUserId?: string,
  ): Promise<PublicProfileDto> {
    const user = await this.usersRepository.findByUsername(username);

    if (!user || user.profilePrivate) {
      throw new EntityNotFoundException('User', username);
    }

    const vis = parseVisibility(user.profileVisibility);
    const show = (field: Parameters<typeof isFieldVisible>[1]) => isFieldVisible(vis, field);

    // displayName + username are always public (handle/identity). All other fields
    // are omitted entirely when toggled off (spec/10: hidden, not "—").
    const profile: PublicProfileDto = {
      username: user.username,
      displayName: user.displayName,
    };

    if (show('avatar')) profile.avatarUrl = user.avatarUrl;
    if (show('memberSince')) profile.memberSince = user.createdAt.toISOString();
    if (show('journeysCompleted')) profile.journeysCompleted = user.journeysCompleted;
    if (show('journeysActive')) profile.journeysActive = user.journeysActive;
    if (show('testsTaken')) profile.testsTaken = user.testsTaken;
    if (show('weaknesses')) profile.weaknessesWorkedOn = user.weaknessesWorkedOn;
    if (show('exposures')) {
      profile.exposuresActive = user.exposuresActive;
      profile.exposuresCompleted = user.exposuresCompleted;
    }
    if (show('resolutions')) {
      profile.resolutionsActive = user.resolutionsActive;
      profile.resolutionsCompleted = user.resolutionsCompleted;
    }
    if (show('challenges')) profile.challengesCompleted = user.challengesCompleted;
    if (show('experiences')) profile.publicExperienceCount = user.publicExperienceCount;

    if (user.showLastActive && user.lastActiveAt) {
      profile.lastActiveAt = user.lastActiveAt.toISOString();
    }
    if (user.showOnlineIndicator) {
      profile.isOnline = this.computeIsOnline(user.lastActiveAt);
    }

    return profile;
  }

  async updateVisibility(userId: string, dto: UpdateVisibilityDto): Promise<OwnProfileDto> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new EntityNotFoundException('User', userId);

    const user = await this.usersRepository.updateVisibility(userId, {
      profilePrivate: dto.profilePrivate,
      showLastActive: dto.showLastActive,
      showOnlineIndicator: dto.showOnlineIndicator,
      profileVisibility: dto.profileVisibility
        ? { ...parseVisibility(existing.profileVisibility), ...parseVisibility(dto.profileVisibility) }
        : undefined,
    });

    return this.toOwnProfileDto(user);
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async checkUsernameAvailable(username: string, requestingUserId: string): Promise<boolean> {
    if (!USERNAME_REGEX.test(username)) return false;

    const taken = await this.usersRepository.isUsernameTaken(username, requestingUserId);
    return !taken;
  }

  private computeIsOnline(lastActiveAt: Date | null): boolean {
    if (!lastActiveAt) return false;
    const diffMs = Date.now() - lastActiveAt.getTime();
    return diffMs < ONLINE_THRESHOLD_MINUTES * 60 * 1000;
  }

  private toOwnProfileDto(user: {
    id: string;
    email: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    gender: string | null;
    dob: Date | null;
    language: string;
    showLastActive: boolean;
    showOnlineIndicator: boolean;
    profilePrivate: boolean;
    profileVisibility: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): OwnProfileDto {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
      language: user.language,
      showLastActive: user.showLastActive,
      showOnlineIndicator: user.showOnlineIndicator,
      profilePrivate: user.profilePrivate,
      profileVisibility: parseVisibility(user.profileVisibility),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
