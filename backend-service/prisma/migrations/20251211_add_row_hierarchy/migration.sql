-- Add row hierarchy support (Smartsheet-style indentation)

-- Add hierarchy columns to rows table
ALTER TABLE "rows" ADD COLUMN "parentRowId" TEXT;
ALTER TABLE "rows" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "rows" ADD COLUMN "isExpanded" BOOLEAN NOT NULL DEFAULT true;

-- Add foreign key constraint for self-referencing parent-child relationship
ALTER TABLE "rows" ADD CONSTRAINT "rows_parentRowId_fkey" FOREIGN KEY ("parentRowId") REFERENCES "rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for efficient hierarchy queries
CREATE INDEX "rows_sheetId_parentRowId_idx" ON "rows"("sheetId", "parentRowId");
