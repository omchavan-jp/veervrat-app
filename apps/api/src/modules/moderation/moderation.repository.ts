import { Injectable } from '@nestjs/common';
import { ErcEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ErcType = 'exposure' | 'resolution' | 'challenge';

export function entityTypeToErcType(e: ErcEntityType): ErcType {
  if (e === ErcEntityType.EXPOSURE) return 'exposure';
  if (e === ErcEntityType.RESOLUTION) return 'resolution';
  return 'challenge';
}

// Selects the journey ERC item id for a review (exactly one of the three is set).
function reviewItemId(review: {
  journeyExposureId: string | null;
  journeyResolutionId: string | null;
  journeyChallengeId: string | null;
}): string {
  return (review.journeyExposureId ?? review.journeyResolutionId ?? review.journeyChallengeId)!;
}

@Injectable()
export class ModerationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Featured content curation ───────────────────────────────────────────────
  findBlog(id: string) {
    return this.prisma.blog.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  setBlogFeatured(id: string, featured: boolean) {
    return this.prisma.blog.update({ where: { id }, data: { featured }, select: { id: true, featured: true } });
  }

  findExperienceLog(id: string) {
    return this.prisma.experienceLog.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  setExperienceLogFeatured(id: string, featured: boolean) {
    return this.prisma.experienceLog.update({
      where: { id },
      data: { featured },
      select: { id: true, featured: true },
    });
  }

  async findReviewById(id: string) {
    return this.prisma.customErcReview.findUnique({
      where: { id },
      select: {
        id: true,
        entityType: true,
        status: true,
        submittedById: true,
        journeyExposureId: true,
        journeyResolutionId: true,
        journeyChallengeId: true,
      },
    });
  }

  // Pending queue, FIFO, cursor-paginated. Title/type/submitter for the list row.
  async listPending(cursor?: string, take = 20) {
    const reviews = await this.prisma.customErcReview.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        entityType: true,
        submittedById: true,
        createdAt: true,
        journeyExposure: { select: { titleEn: true } },
        journeyResolution: { select: { titleEn: true } },
        journeyChallenge: { select: { titleEn: true } },
      },
    });
    const submitters = await this.submittersByIds(reviews.map((r) => r.submittedById));
    const items = reviews.map((r) => ({
      id: r.id,
      entityType: r.entityType,
      title: r.journeyExposure?.titleEn ?? r.journeyResolution?.titleEn ?? r.journeyChallenge?.titleEn ?? '',
      submitter: submitters.get(r.submittedById) ?? null,
      createdAt: r.createdAt,
    }));
    const nextCursor = items.length === take ? items[items.length - 1].id : null;
    return { items, nextCursor };
  }

  // CustomErcReview has no User relation (submittedById is a scalar) — fetch submitters
  // separately and map by id.
  private async submittersByIds(ids: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true, username: true, avatarUrl: true },
    });
    return new Map(users.map((u) => [u.id, u]));
  }

  // Strictly-limited review context (spec/17): ERC content + submitter + journey title +
  // sentence + subvirtue/virtue + journey weakness tags. NO experience logs, other ERC
  // items/status, or chat.
  async findReviewDetail(id: string) {
    const review = await this.prisma.customErcReview.findUnique({
      where: { id },
      select: {
        id: true,
        entityType: true,
        status: true,
        reviewNote: true,
        submittedById: true,
        journeyExposureId: true,
        journeyResolutionId: true,
        journeyChallengeId: true,
        journeyExposure: { select: ERC_DETAIL_SELECT.exposure },
        journeyResolution: { select: ERC_DETAIL_SELECT.resolution },
        journeyChallenge: { select: ERC_DETAIL_SELECT.challenge },
      },
    });
    if (!review) return null;

    const item = review.journeyExposure ?? review.journeyResolution ?? review.journeyChallenge;
    if (!item) return null;
    const ercType = entityTypeToErcType(review.entityType);
    const submitter = (await this.submittersByIds([review.submittedById])).get(review.submittedById) ?? null;

    // Journey context — title, sentence, subvirtue→virtue, weakness tags only.
    const journey = await this.prisma.journey.findUnique({
      where: { id: item.journeyId },
      select: {
        id: true,
        title: true,
        sentence: {
          select: {
            textEn: true,
            textMr: true,
            subvirtue: {
              select: { nameEn: true, nameMr: true, virtue: { select: { nameEn: true, nameMr: true } } },
            },
          },
        },
        weaknesses: { select: { weakness: { select: { id: true, nameEn: true, nameMr: true } } } },
      },
    });

    return {
      id: review.id,
      ercType,
      status: review.status,
      reviewNote: review.reviewNote,
      submitter,
      item,
      journey: journey
        ? {
            id: journey.id,
            title: journey.title,
            sentence: journey.sentence,
            weaknesses: journey.weaknesses.map((w) => w.weakness),
          }
        : null,
    };
  }

  // Promote a (possibly-edited) custom journey ERC item into the global pool: create a
  // pool entity tied to the journey's sentence with the journey's weakness tags. Returns
  // the new pool entity id. Runs in a transaction with the review/item status updates.
  async approveAndPromote(params: {
    reviewId: string;
    reviewerId: string;
    ercType: ErcType;
    itemId: string;
    journeyId: string;
  }): Promise<{ poolId: string }> {
    const { ercType, itemId, journeyId } = params;

    return this.prisma.$transaction(async (tx) => {
      const weaknessIds = (
        await tx.journeyWeakness.findMany({ where: { journeyId }, select: { weaknessId: true } })
      ).map((w) => w.weaknessId);

      let poolId: string;

      if (ercType === 'exposure') {
        const item = await tx.journeyExposure.findUniqueOrThrow({
          where: { id: itemId },
          select: { titleEn: true, titleMr: true, descriptionEn: true, descriptionMr: true, tier: true, journey: { select: { sentenceId: true } } },
        });
        const pool = await tx.exposure.create({
          data: {
            sentenceId: item.journey.sentenceId,
            tier: item.tier!,
            titleEn: item.titleEn,
            titleMr: item.titleMr,
            descriptionEn: item.descriptionEn,
            descriptionMr: item.descriptionMr,
            weaknessTags: { create: weaknessIds.map((weaknessId) => ({ weaknessId })) },
          },
          select: { id: true },
        });
        poolId = pool.id;
      } else if (ercType === 'resolution') {
        const item = await tx.journeyResolution.findUniqueOrThrow({
          where: { id: itemId },
          select: { titleEn: true, titleMr: true, descriptionEn: true, descriptionMr: true, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true, journey: { select: { sentenceId: true } } },
        });
        const pool = await tx.resolution.create({
          data: {
            sentenceId: item.journey.sentenceId,
            titleEn: item.titleEn,
            titleMr: item.titleMr,
            descriptionEn: item.descriptionEn,
            descriptionMr: item.descriptionMr,
            durationWeeks: item.durationWeeks,
            frequencyPerWeek: item.frequencyPerWeek,
            frequencyLabel: item.frequencyLabel,
            weaknessTags: { create: weaknessIds.map((weaknessId) => ({ weaknessId })) },
          },
          select: { id: true },
        });
        poolId = pool.id;
      } else {
        const item = await tx.journeyChallenge.findUniqueOrThrow({
          where: { id: itemId },
          select: { titleEn: true, titleMr: true, descriptionEn: true, descriptionMr: true, durationDays: true, journey: { select: { sentenceId: true } } },
        });
        const pool = await tx.challenge.create({
          data: {
            sentenceId: item.journey.sentenceId,
            titleEn: item.titleEn,
            titleMr: item.titleMr,
            descriptionEn: item.descriptionEn,
            descriptionMr: item.descriptionMr,
            durationDays: item.durationDays,
            weaknessTags: { create: weaknessIds.map((weaknessId) => ({ weaknessId })) },
          },
          select: { id: true },
        });
        poolId = pool.id;
      }

      await tx.customErcReview.update({
        where: { id: params.reviewId },
        data: { status: 'approved', reviewedById: params.reviewerId, reviewedAt: new Date() },
      });

      return { poolId };
    });
  }

  async setRejected(reviewId: string, reviewerId: string, reason: string) {
    return this.prisma.customErcReview.update({
      where: { id: reviewId },
      data: { status: 'rejected', reviewedById: reviewerId, reviewedAt: new Date(), reviewNote: reason },
      select: { id: true },
    });
  }

  reviewItemId = reviewItemId;
}

const COMMON_ITEM = {
  id: true,
  journeyId: true,
  titleEn: true,
  titleMr: true,
  descriptionEn: true,
  descriptionMr: true,
} as const;

const ERC_DETAIL_SELECT = {
  exposure: { ...COMMON_ITEM, tier: true },
  resolution: { ...COMMON_ITEM, durationWeeks: true, frequencyPerWeek: true, frequencyLabel: true },
  challenge: { ...COMMON_ITEM, durationDays: true },
} as const;
