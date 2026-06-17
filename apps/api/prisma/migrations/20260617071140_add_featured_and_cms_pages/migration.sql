-- AlterTable
ALTER TABLE "blogs" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "experience_logs" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_mr" TEXT,
    "body_en" JSONB NOT NULL,
    "body_mr" JSONB,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_key_key" ON "cms_pages"("key");

-- CreateIndex
CREATE INDEX "blogs_featured_idx" ON "blogs"("featured");

-- CreateIndex
CREATE INDEX "experience_logs_featured_idx" ON "experience_logs"("featured");
