import { Injectable } from '@nestjs/common';
import { InvitationStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const LIST_SELECT = {
  id: true,
  displayName: true,
  username: true,
  email: true,
  avatarUrl: true,
  suspendedAt: true,
  anonymisedAt: true,
  deletedAt: true,
  createdAt: true,
  lastActiveAt: true,
  roles: { select: { role: true } },
} as const;

@Injectable()
export class AdminUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: { cursor?: string; q?: string; take?: number }) {
    const take = params.take ?? 30;
    const q = params.q?.trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { displayName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const items = await this.prisma.user.findMany({
      where,
      select: LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take,
      ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
    });
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  findDetail(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        ...LIST_SELECT,
        // Shown in the admin UI beside roles, with who granted each and when — so the current
        // state answers "who gave this to them?" without searching the audit log.
        capabilities: {
          select: { capability: true, grantedAt: true, grantedBy: true },
          orderBy: { grantedAt: 'asc' },
        },
        gender: true,
        dob: true,
        language: true,
        emailVerifiedAt: true,
        onboardingCompletedAt: true,
        journeys: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            state: true,
            createdAt: true,
            sentence: { select: { id: true, textEn: true, textMr: true } },
            weaknesses: {
              select: { weakness: { select: { id: true, nameEn: true, nameMr: true } } },
            },
          },
        },
        testAttempts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            weakness: { select: { id: true, nameEn: true, nameMr: true } },
            isDraft: true,
            submittedAt: true,
            createdAt: true,
          },
        },
        experienceLogs: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true, visibility: true, isDraft: true, createdAt: true },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        suspendedAt: true,
        anonymisedAt: true,
        deletedAt: true,
        roles: { select: { role: true } },
      },
    });
  }

  // ─── Role management ─────────────────────────────────────────────────────────
  async addRoles(userId: string, roles: Role[]) {
    if (roles.length === 0) return;
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({ userId, role })),
      skipDuplicates: true,
    });
  }

  async removeRoles(userId: string, roles: Role[]) {
    if (roles.length === 0) return;
    await this.prisma.userRole.deleteMany({ where: { userId, role: { in: roles } } });
  }

  // ─── Account actions ─────────────────────────────────────────────────────────
  setSuspended(userId: string, suspendedAt: Date | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt },
      select: { id: true, suspendedAt: true },
    });
  }

  cancelPendingInvitations(inviterId: string) {
    return this.prisma.invitation.updateMany({
      where: { inviterId, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.CANCELLED },
    });
  }
}
