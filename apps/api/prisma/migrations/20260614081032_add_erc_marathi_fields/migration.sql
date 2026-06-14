-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;

-- AlterTable
ALTER TABLE "exposures" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;

-- AlterTable
ALTER TABLE "journey_challenges" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;

-- AlterTable
ALTER TABLE "journey_exposures" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;

-- AlterTable
ALTER TABLE "journey_resolutions" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;

-- AlterTable
ALTER TABLE "resolutions" ADD COLUMN     "description_mr" TEXT,
ADD COLUMN     "title_mr" TEXT;
