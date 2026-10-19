-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('IDLE', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DEVELOPER';

-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "Category_slug_key";

-- DropIndex
DROP INDEX "JobPosting_slug_key";

-- DropIndex
DROP INDEX "Post_slug_key";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "atsConfidence" INTEGER,
ADD COLUMN     "atsJustification" TEXT,
ADD COLUMN     "atsScore" INTEGER,
ADD COLUMN     "atsStatus" "QueueStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "extractedEducation" TEXT,
ADD COLUMN     "extractedExperience" INTEGER,
ADD COLUMN     "extractedLocation" TEXT,
ADD COLUMN     "extractedSkills" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "keywordStatus" "QueueStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiredExperience" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "shaKey" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "draftParentId" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clientId" TEXT;

-- AlterTable
ALTER TABLE "UserInvite" ADD COLUMN     "clientId" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApiKey" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['read:blogs', 'read:careers', 'write:applications']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSecurityConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "apiRateLimitRpm" INTEGER NOT NULL DEFAULT 60,
    "apiRateLimitBurst" INTEGER NOT NULL DEFAULT 10,
    "allowedOrigins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxApiKeys" INTEGER NOT NULL DEFAULT 10,
    "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSecurityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiScopeDefinition" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "endpoints" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiScopeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_slug_key" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Client_slug_idx" ON "Client"("slug");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientApiKey_keyHash_key" ON "ClientApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ClientApiKey_clientId_idx" ON "ClientApiKey"("clientId");

-- CreateIndex
CREATE INDEX "ClientApiKey_keyHash_idx" ON "ClientApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSecurityConfig_clientId_key" ON "ClientSecurityConfig"("clientId");

-- CreateIndex
CREATE INDEX "ClientSecurityConfig_clientId_idx" ON "ClientSecurityConfig"("clientId");

-- CreateIndex
CREATE INDEX "ApiScopeDefinition_categoryId_idx" ON "ApiScopeDefinition"("categoryId");

-- CreateIndex
CREATE INDEX "ApiScopeDefinition_isActive_idx" ON "ApiScopeDefinition"("isActive");

-- CreateIndex
CREATE INDEX "CareerDepartment_clientId_idx" ON "CareerDepartment"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerDepartment_name_clientId_key" ON "CareerDepartment"("name", "clientId");

-- CreateIndex
CREATE INDEX "CareerLocation_clientId_idx" ON "CareerLocation"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "CareerLocation_name_clientId_key" ON "CareerLocation"("name", "clientId");

-- CreateIndex
CREATE INDEX "Category_clientId_idx" ON "Category"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_clientId_key" ON "Category"("name", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_clientId_key" ON "Category"("slug", "clientId");

-- CreateIndex
CREATE INDEX "JobPosting_clientId_idx" ON "JobPosting"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_slug_clientId_key" ON "JobPosting"("slug", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_shaKey_key" ON "Media"("shaKey");

-- CreateIndex
CREATE INDEX "Media_clientId_idx" ON "Media"("clientId");

-- CreateIndex
CREATE INDEX "Post_draftParentId_idx" ON "Post"("draftParentId");

-- CreateIndex
CREATE INDEX "Post_clientId_idx" ON "Post"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_clientId_key" ON "Post"("slug", "clientId");

-- CreateIndex
CREATE INDEX "User_clientId_idx" ON "User"("clientId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_draftParentId_fkey" FOREIGN KEY ("draftParentId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApiKey" ADD CONSTRAINT "ClientApiKey_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApiKey" ADD CONSTRAINT "ClientApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSecurityConfig" ADD CONSTRAINT "ClientSecurityConfig_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerDepartment" ADD CONSTRAINT "CareerDepartment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerLocation" ADD CONSTRAINT "CareerLocation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
