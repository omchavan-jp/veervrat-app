-- AlterTable
ALTER TABLE "users" ADD COLUMN     "anonymised_at" TIMESTAMP(3),
ADD COLUMN     "suspended_at" TIMESTAMP(3);
