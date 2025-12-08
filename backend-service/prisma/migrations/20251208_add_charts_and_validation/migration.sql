-- CreateEnum
CREATE TYPE "ChartType" AS ENUM ('BAR', 'LINE', 'PIE', 'AREA', 'SCATTER', 'DOUGHNUT', 'COLUMN');

-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('LIST', 'NUMBER', 'TEXT_LENGTH', 'DATE', 'CUSTOM_FORMULA');

-- CreateTable
CREATE TABLE "charts" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChartType" NOT NULL,
    "dataRange" TEXT NOT NULL,
    "labelRange" TEXT,
    "config" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_validations" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "range" TEXT NOT NULL,
    "type" "ValidationType" NOT NULL,
    "criteria" TEXT NOT NULL,
    "allowBlank" BOOLEAN NOT NULL DEFAULT true,
    "showDropdown" BOOLEAN NOT NULL DEFAULT true,
    "errorTitle" TEXT,
    "errorMessage" TEXT,
    "inputTitle" TEXT,
    "inputMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "charts_sheetId_idx" ON "charts"("sheetId");

-- CreateIndex
CREATE INDEX "data_validations_sheetId_idx" ON "data_validations"("sheetId");

-- AddForeignKey
ALTER TABLE "charts" ADD CONSTRAINT "charts_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_validations" ADD CONSTRAINT "data_validations_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
