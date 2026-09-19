-- AlterTable
ALTER TABLE "Track" ADD COLUMN "linkToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Track_linkToken_key" ON "Track"("linkToken");
