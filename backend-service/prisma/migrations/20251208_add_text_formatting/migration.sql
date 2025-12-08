-- AlterTable - Add strikethrough, verticalAlign, and wrapText columns
ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "strikethrough" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "verticalAlign" TEXT DEFAULT 'middle';
ALTER TABLE "cells" ADD COLUMN IF NOT EXISTS "wrapText" BOOLEAN NOT NULL DEFAULT false;
