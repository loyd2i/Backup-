/*
  Warnings:

  - You are about to drop the column `normalizationFeeAmount` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `normalizationRequestedAt` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `normalizationStatus` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `normalizedLra` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `normalizedLufs` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `normalizedTruePeak` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `previewAudioUrl` on the `OnelibRelease` table. All the data in the column will be lost.
  - You are about to drop the column `previewStartSeconds` on the `OnelibRelease` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OnelibRelease" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" DATETIME,
    "description" TEXT,
    "soundcloudUrl" TEXT,
    "coverUrl" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorLegalName" TEXT,
    "authorSignedAt" DATETIME,
    "distributionStatus" TEXT NOT NULL DEFAULT 'none',
    "distributionRequestedAt" DATETIME,
    "distributionFeeAmount" REAL,
    "distributionFeePaidAt" DATETIME,
    "distributionFeeStripeId" TEXT,
    CONSTRAINT "OnelibRelease_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnelibRelease_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OnelibRelease" ("authorLegalName", "authorSignedAt", "coverUrl", "createdAt", "description", "distributionFeeAmount", "distributionFeePaidAt", "distributionFeeStripeId", "distributionRequestedAt", "distributionStatus", "id", "publishedAt", "scheduledAt", "slug", "soundcloudUrl", "status", "trackId", "updatedAt", "userId", "views") SELECT "authorLegalName", "authorSignedAt", "coverUrl", "createdAt", "description", "distributionFeeAmount", "distributionFeePaidAt", "distributionFeeStripeId", "distributionRequestedAt", "distributionStatus", "id", "publishedAt", "scheduledAt", "slug", "soundcloudUrl", "status", "trackId", "updatedAt", "userId", "views" FROM "OnelibRelease";
DROP TABLE "OnelibRelease";
ALTER TABLE "new_OnelibRelease" RENAME TO "OnelibRelease";
CREATE UNIQUE INDEX "OnelibRelease_trackId_key" ON "OnelibRelease"("trackId");
CREATE UNIQUE INDEX "OnelibRelease_slug_key" ON "OnelibRelease"("slug");
CREATE TABLE "new_Track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "studioId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "bpm" INTEGER,
    "key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "audioUrl" TEXT,
    "duration" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "linkToken" TEXT,
    "coverUrl" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "sampleRate" INTEGER,
    "bitDepth" INTEGER,
    "bitrate" INTEGER,
    "audioFormat" TEXT,
    "truePeak" REAL,
    "lufs" REAL,
    "lra" REAL,
    "waveformPeaks" TEXT,
    "instruments" TEXT,
    "normalizationStatus" TEXT NOT NULL DEFAULT 'none',
    "normalizationRequestedAt" DATETIME,
    "normalizationFeeAmount" REAL,
    "normalizedLufs" REAL,
    "normalizedLra" REAL,
    "normalizedTruePeak" REAL,
    "previewAudioUrl" TEXT,
    "previewStartSeconds" REAL,
    "genre" TEXT,
    "releaseDate" DATETIME,
    "spotifyUrl" TEXT,
    "youtubeUrl" TEXT,
    "appleMusicUrl" TEXT,
    "deezerUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Track_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Track" ("appleMusicUrl", "artist", "audioFormat", "audioUrl", "bitDepth", "bitrate", "bpm", "coverUrl", "createdAt", "deezerUrl", "duration", "genre", "id", "instruments", "isPublic", "key", "linkToken", "lra", "lufs", "releaseDate", "sampleRate", "spotifyUrl", "status", "studioId", "title", "truePeak", "updatedAt", "userId", "views", "waveformPeaks", "youtubeUrl") SELECT "appleMusicUrl", "artist", "audioFormat", "audioUrl", "bitDepth", "bitrate", "bpm", "coverUrl", "createdAt", "deezerUrl", "duration", "genre", "id", "instruments", "isPublic", "key", "linkToken", "lra", "lufs", "releaseDate", "sampleRate", "spotifyUrl", "status", "studioId", "title", "truePeak", "updatedAt", "userId", "views", "waveformPeaks", "youtubeUrl" FROM "Track";
DROP TABLE "Track";
ALTER TABLE "new_Track" RENAME TO "Track";
CREATE UNIQUE INDEX "Track_linkToken_key" ON "Track"("linkToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
