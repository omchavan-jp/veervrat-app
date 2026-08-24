import { Injectable } from '@nestjs/common';
import { Capability, Role } from '@prisma/client';
import { CapabilitiesRepository } from '../capabilities/capabilities.repository';
import { AuditService } from '../audit/audit.service';
import { AdminUsersRepository } from './admin-users.repository';
import { AuthService } from '../auth/auth.service';
import { JourneysService } from '../journeys/journeys.service';
import { UsersService } from '../users/users.service';
import { hasPermission } from '../../common/permissions/has-permission';
import type { SessionUser } from '../auth/types/auth.types';
import {
  AccessDeniedException,
  EntityInUseException,
  EntityNotFoundException,
} from '../../common/exceptions/app.exceptions';
import {
  AnonymiseUserDto,
  OverrideJourneyStateDto,
  UpdateCapabilitiesDto,
  UpdateRolesDto,
} from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly repo: AdminUsersRepository,
    private readonly auth: AuthService,
    private readonly journeys: JourneysService,
    private readonly users: UsersService,
    private readonly capabilitiesRepo: CapabilitiesRepository,
    private readonly audit: AuditService,
  ) {}

  private assertManage(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.manage_users'))
      throw new AccessDeniedException();
  }

  private assertView(user: SessionUser): void {
    if (!hasPermission(user, { type: 'platform' }, 'admin.view_any_user'))
      throw new AccessDeniedException();
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
      journeys: detail.journeys.map((j) => ({
        ...j,
        weaknesses: j.weaknesses.map((w) => w.weakness),
      })),
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

  /**
   * Grant and revoke feature capabilities. Separate from roles on purpose — roles say who a
   * person IS in Veervrat, capabilities say what they may TRY. See openspec
   * `capability-grants/design.md`.
   *
   * Returns what actually changed, so the caller can audit real grants rather than every click.
   * An audit log full of no-op grants is worse than no log.
   */
  async updateCapabilities(user: SessionUser, id: string, dto: UpdateCapabilitiesDto) {
    this.assertManage(user);
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);

    const granted: Capability[] = [];
    const revoked: Capability[] = [];

    for (const capability of dto.remove ?? []) {
      if (await this.capabilitiesRepo.revoke(id, capability)) revoked.push(capability);
    }
    for (const capability of dto.add ?? []) {
      if (await this.capabilitiesRepo.grant(id, capability, user.id)) granted.push(capability);
    }

    for (const capability of granted) {
      this.audit.record({
        actorId: user.id,
        action: 'admin.capability.granted',
        resourceType: 'user',
        resourceId: id,
        // username alongside displayName, not instead of it (#144): username is what makes the
        // row unambiguous — display names collide (three accounts in pre-production already
        // share "Om Chavan") — but displayName stays for a human scanning the log, which
        // resourceId alone does not serve.
        metadata: { capability, displayName: target.displayName, username: target.username },
      });
    }
    for (const capability of revoked) {
      this.audit.record({
        actorId: user.id,
        action: 'admin.capability.revoked',
        resourceType: 'user',
        resourceId: id,
        metadata: { capability, displayName: target.displayName, username: target.username },
      });
    }

    return { capabilities: await this.capabilitiesRepo.listDetailedForUser(id) };
  }

  async setSuspended(user: SessionUser, id: string, suspended: boolean) {
    this.assertManage(user);
    if (id === user.id)
      throw new EntityInUseException('Account', 'you cannot suspend your own account');
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
    if (id === user.id)
      throw new EntityInUseException('Account', 'you cannot anonymise your own account');
    const target = await this.repo.findById(id);
    if (!target) throw new EntityNotFoundException('User', id);
    if (target.anonymisedAt)
      throw new EntityInUseException('Account', 'this account is already anonymised');

    // Single anonymisation implementation lives in UsersService (shared with self-delete).
    return this.users.anonymiseAccount(id);
  }

  async overrideJourneyState(user: SessionUser, journeyId: string, dto: OverrideJourneyStateDto) {
    if (!hasPermission(user, { type: 'platform' }, 'admin.override_journey_state'))
      throw new AccessDeniedException();
    const transition = await this.journeys.adminOverrideState(journeyId, dto.state);
    return { id: journeyId, ...transition };
  }
}
