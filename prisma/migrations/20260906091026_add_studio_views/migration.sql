-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Studio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'professionnel',
    "pricePerHour" REAL NOT NULL DEFAULT 50,
    "rating" REAL NOT NULL DEFAULT 4.5,
    "views" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "coverUrl" TEXT,
    "equipment" TEXT,
    "capacity" INTEGER,
    "latitude" REAL,
    "longitude" REAL,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "twitter" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "spotify" TEXT,
    "soundcloud" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "totalEarnings" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Studio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Studio" ("address", "capacity", "country", "coverUrl", "createdAt", "description", "equipment", "facebook", "id", "imageUrl", "instagram", "isActive", "latitude", "location", "longitude", "name", "ownerId", "phone", "pricePerHour", "rating", "soundcloud", "spotify", "totalEarnings", "twitter", "type", "updatedAt", "walletBalance", "website", "youtube") SELECT "address", "capacity", "country", "coverUrl", "createdAt", "description", "equipment", "facebook", "id", "imageUrl", "instagram", "isActive", "latitude", "location", "longitude", "name", "ownerId", "phone", "pricePerHour", "rating", "soundcloud", "spotify", "totalEarnings", "twitter", "type", "updatedAt", "walletBalance", "website", "youtube" FROM "Studio";
DROP TABLE "Studio";
ALTER TABLE "new_Studio" RENAME TO "Studio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
