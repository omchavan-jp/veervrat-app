-- AlterTable
ALTER TABLE "journey_challenges" ADD COLUMN     "created_by_id" UUID;

-- AlterTable
ALTER TABLE "journey_exposures" ADD COLUMN     "created_by_id" UUID;

-- AlterTable
ALTER TABLE "journey_resolutions" ADD COLUMN     "created_by_id" UUID;

-- CreateTable
CREATE TABLE "custom_erc_reviews" (
    "id" UUID NOT NULL,
    "entity_type" "erc_entity_type" NOT NULL,
    "journey_exposure_id" UUID,
    "journey_resolution_id" UUID,
    "journey_challenge_id" UUID,
    "submitted_by_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_erc_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "custom_erc_reviews" ADD CONSTRAINT "custom_erc_reviews_journey_exposure_id_fkey" FOREIGN KEY ("journey_exposure_id") REFERENCES "journey_exposures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_erc_reviews" ADD CONSTRAINT "custom_erc_reviews_journey_resolution_id_fkey" FOREIGN KEY ("journey_resolution_id") REFERENCES "journey_resolutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_erc_reviews" ADD CONSTRAINT "custom_erc_reviews_journey_challenge_id_fkey" FOREIGN KEY ("journey_challenge_id") REFERENCES "journey_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
