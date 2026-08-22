/*
  Warnings:

  - Added the required column `username` to the `pending_signups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "pending_signups" ADD COLUMN     "username" TEXT NOT NULL;
