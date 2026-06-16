-- AlterTable
ALTER TABLE "blog_comments" ADD COLUMN     "parent_comment_id" UUID,
ADD COLUMN     "reported_at" TIMESTAMP(3);
