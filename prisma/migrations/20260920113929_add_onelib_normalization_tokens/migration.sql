-- CreateTable
CREATE TABLE "OnelibSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "monthlyPrice" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" DATETIME,
    "stripeSubscriptionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OnelibSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'artiste',
    "avatar" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "genre" TEXT,
    "instagram" TEXT,
    "spotify" TEXT,
    "soundcloud" TEXT,
    "youtube" TEXT,
    "website" TEXT,
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "normalizationTokens" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "bio", "city", "createdAt", "email", "genre", "id", "instagram", "name", "password", "phone", "role", "soundcloud", "spotify", "updatedAt", "walletBalance", "website", "youtube") SELECT "avatar", "bio", "city", "createdAt", "email", "genre", "id", "instagram", "name", "password", "phone", "role", "soundcloud", "spotify", "updatedAt", "walletBalance", "website", "youtube" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "OnelibSubscription_userId_key" ON "OnelibSubscription"("userId");
