import { Injectable } from '@nestjs/common';
import { Capability } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CapabilitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<Capability[]> {
    const rows = await this.prisma.userCapability.findMany({
      where: { userId },
      select: { capability: true },
    });
    return rows.map((r) => r.capability);
  }

  async listDetailedForUser(userId: string) {
    return this.prisma.userCapability.findMany({
      where: { userId },
      select: { capability: true, grantedAt: true, grantedBy: true },
      orderBy: { grantedAt: 'asc' },
    });
  }

  async grant(userId: string, capability: Capability, grantedBy: string): Promise<boolean> {
    // Returns whether anything changed, so callers can avoid writing an audit row for a no-op.
    // An audit log that fills with grants that did not happen is worse than no log.
    const existing = await this.prisma.userCapability.findUnique({
      where: { userId_capability: { userId, capability } },
      select: { capability: true },
    });
    if (existing) return false;

    await this.prisma.userCapability.create({ data: { userId, capability, grantedBy } });
    return true;
  }

  async revoke(userId: string, capability: Capability): Promise<boolean> {
    const result = await this.prisma.userCapability.deleteMany({ where: { userId, capability } });
    return result.count > 0;
  }
}
