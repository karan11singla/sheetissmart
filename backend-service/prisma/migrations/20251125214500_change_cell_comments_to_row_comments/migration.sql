-- DropForeignKey
ALTER TABLE "cell_comments" DROP CONSTRAINT "cell_comments_cellId_fkey";

-- DropForeignKey
ALTER TABLE "cell_comments" DROP CONSTRAINT "cell_comments_userId_fkey";

-- DropIndex
DROP INDEX "cell_comments_cellId_idx";

-- DropTable
DROP TABLE "cell_comments";

-- CreateTable
CREATE TABLE "row_comments" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "row_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "row_comments_rowId_idx" ON "row_comments"("rowId");

-- AddForeignKey
ALTER TABLE "row_comments" ADD CONSTRAINT "row_comments_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "row_comments" ADD CONSTRAINT "row_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
