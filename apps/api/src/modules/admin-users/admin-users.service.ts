import { Injectable } from '@nestjs/common';
import { JourneyState, Role } from '@prisma/client';
import { AdminUsersRepository } from './admin-users.repository';
import { AuthService } from '../auth/auth.service';
import { JourneysService } from '../journeys/journeys.service';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityInUseException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import { AnonymiseUserDto, OverrideJourneyStateDto, UpdateRolesDto } from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly repo: AdminUsersRepository,
    private readonly auth: AuthService,
    private readonly journeys: JourneysService,
  ) {}

  private assertManage(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_users')) throw new AccessDeniedException();
  }

  private assertView(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.view_any_user')) throw new AccessDeniedException();
  }

  async list(user: SessionUser, cursor?: string, q?: string) {
    this.assertView(user);
    return this.repo.list({ cursor, q });
  }

  async getDetail(user: SessionUser, id: string) {
    this.assertView(user);
    const detail = await this.repo.findDetail(id);
    if (!detail) throw new EntityNotFoundException('User', id);
    return {
      ...detail,
      journeys: detail.journeys.map((j) => ({ ...j, weaknesses: j.weaknesses.map((w) => w.weakness) })),
    };
  }

  async updateRoles(user: SessionUser, id: string, dto: UpdateRolesDto) {
    this.assertManage(user);
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);

    // An admin cannot strip their own ADMIN role (self-lockout guard).
    if (id === user.id && (dto.remove ?? []).includes(Role.ADMIN)) {
      throw new EntityInUseException('Role', 'you cannot remove your own admin role');
    }

    await this.repo.removeRoles(id, dto.remove ?? []);
    await this.repo.addRoles(id, dto.add ?? []);
    return this.repo.findById(id);
  }

  async setSuspended(user: SessionUser, id: string, suspended: boolean) {
    this.assertManage(user);
    if (id === user.id) throw new EntityInUseException('Account', 'you cannot suspend your own account');
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);

    const result = await this.repo.setSuspended(id, suspended ? new Date() : null);
    if (suspended) await this.auth.forceLogout(id);
    return result;
  }

  async forceLogout(user: SessionUser, id: string) {
    this.assertManage(user);
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);
    await this.auth.forceLogout(id);
    return { id, loggedOut: true };
  }

  async anonymise(user: SessionUser, id: string, _dto: AnonymiseUserDto) {
    this.assertManage(user);
    if (id === user.id) throw new EntityInUseException('Account', 'you cannot anonymise your own account');
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);
    if (target.anonymisedAt) throw new EntityInUseException('Account', 'this account is already anonymised');

    // Deterministic pseudonym from the (stable, unique) user id — no Math.random/Date.now.
    const shortId = id.replace(/-/g, '').slice(0, 12);
    const now = new Date();
    const result = await this.repo.anonymise(
      id,
      { displayName: '[Deleted user]', email: `anon-${shortId}@deleted.invalid`, username: `deleted_${shortId}` },
      now,
    );
    await this.auth.forceLogout(id);
    await this.repo.cancelPendingInvitations(id);
    return result;
  }

  async overrideJourneyState(user: SessionUser, journeyId: string, dto: OverrideJourneyStateDto) {
    if (!hasPermission(user, { type: 'platform' }, 'admin.override_journey_state')) throw new AccessDeniedException();
    const transition = await this.journeys.adminOverrideState(journeyId, dto.state as JourneyState);
    return { id: journeyId, ...transition };
  }
}
