import { Injectable } from '@nestjs/common';
import { ErcEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type CustomErcReviewCreateData = {
  entityType: ErcEntityType;
  submittedById: string;
  journeyExposureId?: string;
  journeyResolutionId?: string;
  journeyChallengeId?: string;
};

@Injectable()
export class CustomErcReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CustomErcReviewCreateData): Promise<{ id: string }> {
    return this.prisma.customErcReview.create({
      data: {
        entityType: data.entityType,
        submittedById: data.submittedById,
        journeyExposureId: data.journeyExposureId,
        journeyResolutionId: data.journeyResolutionId,
        journeyChallengeId: data.journeyChallengeId,
      },
      select: { id: true },
    });
  }
}
