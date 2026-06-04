-- AlterEnum
ALTER TYPE "verification_type" ADD VALUE 'google_link';

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "metadata" JSONB;
