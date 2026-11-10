/*
  Warnings:

  - A unique constraint covering the columns `[payoutId,type]` on the table `wallet_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHOUE');

-- AlterEnum
ALTER TYPE "WalletEntryType" ADD VALUE 'RETRAIT_ANNULE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "payoutPhone" TEXT,
ADD COLUMN     "payoutPhoneUsableAt" TIMESTAMP(3),
ADD COLUMN     "payoutPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payoutPinHash" TEXT,
ADD COLUMN     "payoutPinLockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wallet_entries" ADD COLUMN     "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "payoutId" INTEGER;

-- CreateTable
CREATE TABLE "payouts" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fees" INTEGER NOT NULL,
    "totalDebited" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "reference" TEXT NOT NULL,
    "providerReference" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_reference_key" ON "payouts"("reference");

-- CreateIndex
CREATE INDEX "payouts_userId_idx" ON "payouts"("userId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_payoutId_type_key" ON "wallet_entries"("payoutId", "type");

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
