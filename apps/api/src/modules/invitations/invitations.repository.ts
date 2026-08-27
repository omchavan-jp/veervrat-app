import { Injectable } from '@nestjs/common';
import { InvitationType, InvitationStatus, InvitationChannel, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const VM_INVITE_EXPIRY_DAYS = 7;
const PLATFORM_INVITE_EXPIRY_DAYS = 30;

function expiryDaysFor(type: InvitationType): number {
  return type === InvitationType.PLATFORM ? PLATFORM_INVITE_EXPIRY_DAYS : VM_INVITE_EXPIRY_DAYS;
}

export type InvitationInviter = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * What an invited person is shown. Deliberately narrow: the inviter's public identity, what kind
 * of relationship is proposed, and when it runs out. **Nothing about the invitee**, because
 * `findByTokenForDisplay` is readable by anyone holding a token-shaped string.
 */
export type ReceivedInvitation = {
  id: string;
  token: string;
  type: InvitationType;
  scopeId: string | null;
  status?: InvitationStatus;
  invitedAt: Date;
  expiresAt: Date;
  inviter: InvitationInviter;
};

export type InvitationSlimResult = {
  id: string;
  inviterId: string;
  inviteeEmail: string;
  inviteeId: string | null;
  type: InvitationType;
  scopeId: string | null;
  token: string;
  status: InvitationStatus;
  channel: InvitationChannel;
  expiresAt: Date;
  acceptedAt: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    inviterId: string;
    inviteeEmail: string;
    inviteeId?: string | null;
    type: InvitationType;
    scopeId?: string | null;
    channel?: InvitationChannel;
  }): Promise<InvitationSlimResult> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiryDaysFor(data.type) * 24 * 60 * 60 * 1000);
    return this.prisma.invitation.create({
      data: {
        inviterId: data.inviterId,
        inviteeEmail: data.inviteeEmail,
        inviteeId: data.inviteeId ?? null,
        type: data.type,
        scopeId: data.scopeId ?? null,
        token,
        expiresAt,
        channel: data.channel ?? InvitationChannel.IN_APP,
      },
    });
  }

  // Accepting a vratmitra invitation is what makes someone a vratmitra. Signup grants VRATARTHI
  // and nothing else, and until 2026-08-27 the only other grant path was an admin editing the
  // user by hand — so the role never arrived and every VM permission check failed for the person
  // who had just accepted. `skipDuplicates` because someone already mentoring one vratarthi
  // accepts a second invitation with the role already held.
  async grantVratmitraRole(userId: string): Promise<void> {
    await this.prisma.userRole.createMany({
      data: [{ userId, role: Role.VRATMITRA }],
      skipDuplicates: true,
    });
  }

  async findByToken(token: string): Promise<InvitationSlimResult | null> {
    return this.prisma.invitation.findUnique({ where: { token } });
  }

  async findById(id: string): Promise<InvitationSlimResult | null> {
    return this.prisma.invitation.findUnique({ where: { id } });
  }

  async findPendingGlobalVmByInviter(inviterId: string): Promise<InvitationSlimResult | null> {
    return this.prisma.invitation.findFirst({
      where: { inviterId, type: InvitationType.VM_GLOBAL, status: InvitationStatus.PENDING },
    });
  }

  async updateStatus(
    id: string,
    status: InvitationStatus,
    extra?: { acceptedAt?: Date },
  ): Promise<InvitationSlimResult> {
    return this.prisma.invitation.update({
      where: { id },
      data: { status, ...(extra ?? {}) },
    });
  }

  async markReminderSent(id: string): Promise<InvitationSlimResult> {
    return this.prisma.invitation.update({
      where: { id },
      data: { reminderSentAt: new Date() },
    });
  }

  async listByInviter(inviterId: string): Promise<InvitationSlimResult[]> {
    return this.prisma.invitation.findMany({
      where: { inviterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Invitations addressed to this person. The mirror of `listByInviter`, and the thing whose
   * absence meant an invited vratmitra could not see their own invitation (#22, open since
   * 2026-07-18): the API could only answer "what did I send".
   *
   * **PENDING only.** A declined invitation is finished, and an accepted one has become a
   * relationship that belongs on `/my-vratmitras`. Listing either here would give the invitee
   * decisions to re-litigate and no action to take on any of them.
   *
   * Carries the inviter, because "you have an invitation" from nobody in particular is not
   * something a person can act on.
   */
  async listByInvitee(inviteeId: string): Promise<ReceivedInvitation[]> {
    const rows = await this.prisma.invitation.findMany({
      where: { inviteeId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        type: true,
        scopeId: true,
        invitedAt: true,
        expiresAt: true,
        inviter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      token: r.token,
      type: r.type,
      scopeId: r.scopeId,
      invitedAt: r.invitedAt,
      expiresAt: r.expiresAt,
      inviter: r.inviter,
    }));
  }

  /**
   * One invitation, by token, for the accept page.
   *
   * Read WITHOUT a session — the person holding the link may not have an account yet, which is
   * the whole reason the accept page could not say who was asking. So it returns only what the
   * invitation email already told them, and nothing about the invitee.
   */
  async findByTokenForDisplay(token: string): Promise<ReceivedInvitation | null> {
    const row = await this.prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        type: true,
        scopeId: true,
        status: true,
        invitedAt: true,
        expiresAt: true,
        inviter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      token: row.token,
      type: row.type,
      scopeId: row.scopeId,
      status: row.status,
      invitedAt: row.invitedAt,
      expiresAt: row.expiresAt,
      inviter: row.inviter,
    };
  }
}
