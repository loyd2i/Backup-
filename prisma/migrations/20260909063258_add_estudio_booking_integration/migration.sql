-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL DEFAULT 'studio',
    "notes" TEXT,
    "totalPrice" REAL,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "artistCommissionAmount" REAL,
    "artistCommissionRefunded" BOOLEAN,
    CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("artistCommissionAmount", "artistCommissionRefunded", "confirmationSent", "createdAt", "date", "duration", "endTime", "id", "notes", "reminderSent", "startTime", "status", "studioId", "totalPrice", "updatedAt", "userId") SELECT "artistCommissionAmount", "artistCommissionRefunded", "confirmationSent", "createdAt", "date", "duration", "endTime", "id", "notes", "reminderSent", "startTime", "status", "studioId", "totalPrice", "updatedAt", "userId" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE TABLE "new_EStudioSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "sessionType" TEXT NOT NULL DEFAULT 'session_live',
    "audioQuality" TEXT NOT NULL DEFAULT 'standard',
    "enableVideo" BOOLEAN NOT NULL DEFAULT false,
    "enableScreenShare" BOOLEAN NOT NULL DEFAULT true,
    "enableChat" BOOLEAN NOT NULL DEFAULT true,
    "enableAnnotations" BOOLEAN NOT NULL DEFAULT false,
    "enableRecording" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipants" INTEGER NOT NULL DEFAULT 5,
    "iceServers" TEXT,
    "signalingToken" TEXT NOT NULL,
    "scheduledStart" DATETIME,
    "scheduledEnd" DATETIME,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appointmentId" TEXT,
    CONSTRAINT "EStudioSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EStudioSession_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EStudioSession" ("audioQuality", "createdAt", "enableAnnotations", "enableChat", "enableRecording", "enableScreenShare", "enableVideo", "endedAt", "hostId", "iceServers", "id", "maxParticipants", "scheduledEnd", "scheduledStart", "sessionType", "signalingToken", "startedAt", "status", "title", "updatedAt") SELECT "audioQuality", "createdAt", "enableAnnotations", "enableChat", "enableRecording", "enableScreenShare", "enableVideo", "endedAt", "hostId", "iceServers", "id", "maxParticipants", "scheduledEnd", "scheduledStart", "sessionType", "signalingToken", "startedAt", "status", "title", "updatedAt" FROM "EStudioSession";
DROP TABLE "EStudioSession";
ALTER TABLE "new_EStudioSession" RENAME TO "EStudioSession";
CREATE UNIQUE INDEX "EStudioSession_signalingToken_key" ON "EStudioSession"("signalingToken");
CREATE UNIQUE INDEX "EStudioSession_appointmentId_key" ON "EStudioSession"("appointmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
