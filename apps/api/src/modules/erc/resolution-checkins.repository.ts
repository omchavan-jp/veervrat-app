import { Injectable } from '@nestjs/common';
import { CheckinStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CheckinRecord = {
  id: string;
  journeyResolutionId: string;
  status: CheckinStatus;
  note: string | null;
  checkedInAt: Date;
  createdAt: Date;
};

export type CheckinsWithStreak = {
  checkins: CheckinRecord[];
  streak: number;
};

export type ResolutionSlim = {
  id: string;
  journeyId: string;
  status: string;
  isDeactivated: boolean;
};

@Injectable()
export class ResolutionCheckinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findResolutionById(id: string): Promise<ResolutionSlim | null> {
    return this.prisma.journeyResolution.findUnique({
      where: { id },
      select: { id: true, journeyId: true, status: true, isDeactivated: true },
    });
  }

  async create(resolutionId: string, status: CheckinStatus, note?: string): Promise<CheckinRecord> {
    return this.prisma.resolutionCheckin.create({
      data: {
        journeyResolutionId: resolutionId,
        status,
        note: note ?? null,
      },
      select: { id: true, journeyResolutionId: true, status: true, note: true, checkedInAt: true, createdAt: true },
    });
  }

  async listWithStreak(resolutionId: string): Promise<CheckinsWithStreak> {
    const checkins = await this.prisma.resolutionCheckin.findMany({
      where: { journeyResolutionId: resolutionId },
      select: { id: true, journeyResolutionId: true, status: true, note: true, checkedInAt: true, createdAt: true },
      orderBy: { checkedInAt: 'asc' },
    });

    let streak = 0;
    for (let i = checkins.length - 1; i >= 0; i--) {
      if (checkins[i].status === CheckinStatus.DONE) {
        streak++;
      } else {
        break;
      }
    }

    return { checkins, streak };
  }
}
