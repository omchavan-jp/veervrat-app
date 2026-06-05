import { Injectable } from '@nestjs/common';
import { InvitationType, InvitationStatus, InvitationChannel } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const VM_INVITE_EXPIRY_DAYS = 7;

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
    const expiresAt = new Date(Date.now() + VM_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
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

  async listByInviter(inviterId: string): Promise<InvitationSlimResult[]> {
    return this.prisma.invitation.findMany({
      where: { inviterId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
