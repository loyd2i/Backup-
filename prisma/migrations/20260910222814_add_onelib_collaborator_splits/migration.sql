-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OnelibCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "releaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'compositeur',
    "sharePercent" REAL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnelibCollaborator_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "OnelibRelease" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnelibCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OnelibCollaborator" ("createdAt", "id", "name", "releaseId", "role") SELECT "createdAt", "id", "name", "releaseId", "role" FROM "OnelibCollaborator";
DROP TABLE "OnelibCollaborator";
ALTER TABLE "new_OnelibCollaborator" RENAME TO "OnelibCollaborator";
CREATE TABLE "new_OnelibCollectionCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'compositeur',
    "sharePercent" REAL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnelibCollectionCollaborator_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "OnelibCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnelibCollectionCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OnelibCollectionCollaborator" ("collectionId", "createdAt", "id", "name", "role") SELECT "collectionId", "createdAt", "id", "name", "role" FROM "OnelibCollectionCollaborator";
DROP TABLE "OnelibCollectionCollaborator";
ALTER TABLE "new_OnelibCollectionCollaborator" RENAME TO "OnelibCollectionCollaborator";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
