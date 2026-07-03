-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('issue', 'improvement');

-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('new', 'triaged', 'done', 'declined');

-- CreateTable
CREATE TABLE "feedback_items" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reporter_role" TEXT NOT NULL,
    "type" "feedback_type" NOT NULL,
    "status" "feedback_status" NOT NULL DEFAULT 'new',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "route" TEXT,
    "locale" TEXT,
    "viewport" TEXT,
    "user_agent" TEXT,
    "commit_sha" TEXT,
    "decline_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_upvotes" (
    "id" UUID NOT NULL,
    "feedback_item_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_items_status_created_at_idx" ON "feedback_items"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_upvotes_feedback_item_id_user_id_key" ON "feedback_upvotes"("feedback_item_id", "user_id");

-- AddForeignKey
ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_items_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_feedback_item_id_fkey" FOREIGN KEY ("feedback_item_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_upvotes" ADD CONSTRAINT "feedback_upvotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
