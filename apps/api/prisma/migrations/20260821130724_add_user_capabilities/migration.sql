-- CreateEnum
CREATE TYPE "capability" AS ENUM ('feedback_widget', 'content_edit');

-- CreateTable
CREATE TABLE "user_capabilities" (
    "user_id" UUID NOT NULL,
    "capability" "capability" NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,

    CONSTRAINT "user_capabilities_pkey" PRIMARY KEY ("user_id","capability")
);

-- AddForeignKey
ALTER TABLE "user_capabilities" ADD CONSTRAINT "user_capabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
