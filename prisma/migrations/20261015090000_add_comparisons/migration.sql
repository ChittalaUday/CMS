-- AlterTable
ALTER TABLE "ClientApiKey" ALTER COLUMN "scopes" SET DEFAULT ARRAY['read:blogs', 'read:careers', 'read:comparisons', 'write:applications']::TEXT[];

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "disclaimer" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "relatedServiceSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonOption" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "linkSlug" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComparisonOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonCriterion" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ComparisonCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonCell" (
    "criterionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ComparisonCell_pkey" PRIMARY KEY ("criterionId","optionId")
);

-- CreateIndex
CREATE INDEX "Comparison_clientId_idx" ON "Comparison"("clientId");

-- CreateIndex
CREATE INDEX "Comparison_published_idx" ON "Comparison"("published");

-- CreateIndex
CREATE INDEX "Comparison_position_idx" ON "Comparison"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Comparison_slug_clientId_key" ON "Comparison"("slug", "clientId");

-- CreateIndex
CREATE INDEX "ComparisonOption_comparisonId_idx" ON "ComparisonOption"("comparisonId");

-- CreateIndex
CREATE INDEX "ComparisonCriterion_comparisonId_idx" ON "ComparisonCriterion"("comparisonId");

-- CreateIndex
CREATE INDEX "ComparisonCell_optionId_idx" ON "ComparisonCell"("optionId");

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonOption" ADD CONSTRAINT "ComparisonOption_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonCriterion" ADD CONSTRAINT "ComparisonCriterion_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "Comparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonCell" ADD CONSTRAINT "ComparisonCell_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "ComparisonCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparisonCell" ADD CONSTRAINT "ComparisonCell_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ComparisonOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

