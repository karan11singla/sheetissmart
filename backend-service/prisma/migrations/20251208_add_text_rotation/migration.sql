-- AlterTable - Add textRotation column
ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "textRotation" INTEGER DEFAULT 0;
