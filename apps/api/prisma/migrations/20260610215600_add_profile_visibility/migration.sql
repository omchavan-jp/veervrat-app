-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_visibility" JSONB NOT NULL DEFAULT '{}';
