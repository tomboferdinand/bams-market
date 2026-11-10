-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'COMMERCANT', 'LIVREUR', 'ADMINISTRATEUR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIF', 'SUSPENDU', 'DESACTIVE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIE', 'NON_VERIFIE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIF',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NON_VERIFIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
