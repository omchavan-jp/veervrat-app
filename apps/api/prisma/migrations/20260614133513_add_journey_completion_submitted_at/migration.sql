-- DropIndex
DROP INDEX "journeys_title_trgm";

-- DropIndex
DROP INDEX "sentences_text_en_trgm";

-- DropIndex
DROP INDEX "sentences_text_mr_trgm";

-- DropIndex
DROP INDEX "subvirtues_name_en_trgm";

-- DropIndex
DROP INDEX "subvirtues_name_mr_trgm";

-- DropIndex
DROP INDEX "virtues_name_en_trgm";

-- DropIndex
DROP INDEX "virtues_name_mr_trgm";

-- DropIndex
DROP INDEX "weaknesses_name_en_trgm";

-- DropIndex
DROP INDEX "weaknesses_name_mr_trgm";

-- AlterTable
ALTER TABLE "journeys" ADD COLUMN     "completion_submitted_at" TIMESTAMP(3);
