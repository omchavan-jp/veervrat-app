-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notification_prefs" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pending_email" TEXT;
