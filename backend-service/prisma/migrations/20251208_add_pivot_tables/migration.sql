-- CreateEnum
CREATE TYPE "AggregationType" AS ENUM ('SUM', 'COUNT', 'AVERAGE', 'MIN', 'MAX', 'COUNT_DISTINCT');

-- CreateTable
CREATE TABLE "pivot_tables" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceRange" TEXT NOT NULL,
    "rowFields" TEXT NOT NULL,
    "columnFields" TEXT,
    "valueFields" TEXT NOT NULL,
    "filters" TEXT,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pivot_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pivot_tables_sheetId_idx" ON "pivot_tables"("sheetId");

-- AddForeignKey
ALTER TABLE "pivot_tables" ADD CONSTRAINT "pivot_tables_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
