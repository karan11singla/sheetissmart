-- AlterTable
ALTER TABLE "cells" ADD COLUMN     "mergeColSpan" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mergeRowSpan" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mergedIntoId" TEXT;
