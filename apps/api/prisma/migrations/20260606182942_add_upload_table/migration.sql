-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "uploader_id" UUID NOT NULL,
    "room_id" TEXT,
    "minio_url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uploads_uploader_id_idx" ON "uploads"("uploader_id");

-- CreateIndex
CREATE INDEX "uploads_room_id_idx" ON "uploads"("room_id");

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
