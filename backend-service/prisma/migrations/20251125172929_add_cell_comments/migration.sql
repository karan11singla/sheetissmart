-- CreateTable
CREATE TABLE "cell_comments" (
    "id" TEXT NOT NULL,
    "cellId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cell_comments_cellId_idx" ON "cell_comments"("cellId");

-- AddForeignKey
ALTER TABLE "cell_comments" ADD CONSTRAINT "cell_comments_cellId_fkey" FOREIGN KEY ("cellId") REFERENCES "cells"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cell_comments" ADD CONSTRAINT "cell_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
