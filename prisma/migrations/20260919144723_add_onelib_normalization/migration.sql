-- AlterTable
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizationStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizationRequestedAt" DATETIME;
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizationFeeAmount" REAL;
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizedLufs" REAL;
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizedLra" REAL;
ALTER TABLE "OnelibRelease" ADD COLUMN "normalizedTruePeak" REAL;
ALTER TABLE "OnelibRelease" ADD COLUMN "previewAudioUrl" TEXT;
ALTER TABLE "OnelibRelease" ADD COLUMN "previewStartSeconds" REAL;
