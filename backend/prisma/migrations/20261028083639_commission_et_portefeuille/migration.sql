-- CreateEnum
CREATE TYPE "WalletEntryType" AS ENUM ('VENTE', 'LIVRAISON', 'RETRAIT');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "commissionAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "merchantAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "type" "WalletEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_entries_userId_idx" ON "wallet_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_orderId_userId_type_key" ON "wallet_entries"("orderId", "userId", "type");

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
