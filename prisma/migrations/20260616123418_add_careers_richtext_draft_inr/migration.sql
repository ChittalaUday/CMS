-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'FILE';

-- AlterTable
ALTER TABLE "JobPosting" ADD COLUMN     "descriptionJson" JSONB,
ADD COLUMN     "draftParentId" TEXT,
ADD COLUMN     "requirementsJson" JSONB,
ADD COLUMN     "responsibilities" TEXT,
ADD COLUMN     "responsibilitiesJson" JSONB,
ALTER COLUMN "currency" SET DEFAULT 'INR';

-- CreateIndex
CREATE INDEX "JobPosting_draftParentId_idx" ON "JobPosting"("draftParentId");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_draftParentId_fkey" FOREIGN KEY ("draftParentId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
