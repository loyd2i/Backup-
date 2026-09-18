-- AlterTable
ALTER TABLE "Track" ADD COLUMN "lufs" REAL;
ALTER TABLE "Track" ADD COLUMN "truePeak" REAL;

-- AlterTable
ALTER TABLE "TrackVersion" ADD COLUMN "audioFormat" TEXT;
ALTER TABLE "TrackVersion" ADD COLUMN "bitDepth" INTEGER;
ALTER TABLE "TrackVersion" ADD COLUMN "bitrate" INTEGER;
ALTER TABLE "TrackVersion" ADD COLUMN "lufs" REAL;
ALTER TABLE "TrackVersion" ADD COLUMN "sampleRate" INTEGER;
ALTER TABLE "TrackVersion" ADD COLUMN "truePeak" REAL;
