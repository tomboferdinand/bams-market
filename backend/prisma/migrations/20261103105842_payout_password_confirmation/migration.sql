/*
  Warnings:

  - You are about to drop the column `payoutPhoneUsableAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `payoutPinAttempts` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `payoutPinHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `payoutPinLockedUntil` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "payoutPhoneUsableAt",
DROP COLUMN "payoutPinAttempts",
DROP COLUMN "payoutPinHash",
DROP COLUMN "payoutPinLockedUntil",
ADD COLUMN     "payoutAuthAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payoutAuthLockedUntil" TIMESTAMP(3);
