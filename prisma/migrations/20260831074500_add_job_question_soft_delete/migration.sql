-- AlterTable
ALTER TABLE "JobQuestion" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "JobQuestion_isDeleted_idx" ON "JobQuestion"("isDeleted");
