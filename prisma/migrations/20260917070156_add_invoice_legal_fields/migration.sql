/*
  Warnings:

  - Added the required column `invoiceNumber` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "year" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studioId" TEXT,
    "studioName" TEXT NOT NULL,
    "sellerLegalName" TEXT,
    "sellerSiret" TEXT,
    "sellerAddress" TEXT,
    "sellerVatNumber" TEXT,
    "sellerVatExempt" BOOLEAN NOT NULL DEFAULT false,
    "amountHT" REAL,
    "vatRate" REAL,
    "vatAmount" REAL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "appointmentId", "createdAt", "description", "id", "status", "studioName", "updatedAt", "userId") SELECT "amount", "appointmentId", "createdAt", "description", "id", "status", "studioName", "updatedAt", "userId" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE TABLE "new_Studio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL DEFAULT 'professionnel',
    "pricePerHour" REAL NOT NULL DEFAULT 50,
    "eStudioPricePerHour" REAL,
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
    "legalName" TEXT,
    "siret" TEXT,
    "legalStatus" TEXT,
    "vatNumber" TEXT,
    "vatExempt" BOOLEAN NOT NULL DEFAULT false,
    "referralOffer" TEXT,
    "walletBalance" REAL NOT NULL DEFAULT 0,
    "totalEarnings" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Studio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Studio" ("address", "capacity", "country", "coverUrl", "createdAt", "description", "eStudioPricePerHour", "equipment", "facebook", "id", "imageUrl", "instagram", "isActive", "latitude", "location", "longitude", "name", "ownerId", "phone", "pricePerHour", "rating", "referralOffer", "soundcloud", "spotify", "totalEarnings", "twitter", "type", "updatedAt", "views", "walletBalance", "website", "youtube") SELECT "address", "capacity", "country", "coverUrl", "createdAt", "description", "eStudioPricePerHour", "equipment", "facebook", "id", "imageUrl", "instagram", "isActive", "latitude", "location", "longitude", "name", "ownerId", "phone", "pricePerHour", "rating", "referralOffer", "soundcloud", "spotify", "totalEarnings", "twitter", "type", "updatedAt", "views", "walletBalance", "website", "youtube" FROM "Studio";
DROP TABLE "Studio";
ALTER TABLE "new_Studio" RENAME TO "Studio";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
