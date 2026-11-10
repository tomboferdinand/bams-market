-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DISPONIBLE', 'EN_COURS', 'LIVREE', 'ECHEC');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "confirmationCode" TEXT;

-- CreateTable
CREATE TABLE "deliveries" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "livreurId" INTEGER,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_orderId_key" ON "deliveries"("orderId");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
