/*
  Warnings:

  - A unique constraint covering the columns `[activationTokenHash]` on the table `role_requests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "RoleRequestStatus" ADD VALUE 'A_ACTIVER';

-- AlterTable
ALTER TABLE "role_requests" ADD COLUMN     "activationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "activationTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "role_requests_activationTokenHash_key" ON "role_requests"("activationTokenHash");
