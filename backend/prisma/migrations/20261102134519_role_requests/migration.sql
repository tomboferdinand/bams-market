-- CreateEnum
CREATE TYPE "RoleRequestStatus" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE', 'ANNULEE');

-- CreateTable
CREATE TABLE "role_requests" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "requestedRole" "Role" NOT NULL,
    "payoutPhone" TEXT NOT NULL,
    "message" TEXT,
    "status" "RoleRequestStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_requests_userId_idx" ON "role_requests"("userId");

-- CreateIndex
CREATE INDEX "role_requests_status_idx" ON "role_requests"("status");

-- AddForeignKey
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_requests" ADD CONSTRAINT "role_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
