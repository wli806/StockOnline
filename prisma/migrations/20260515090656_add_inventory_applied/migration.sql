-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SushiOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ossId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "poDate" TEXT,
    "deliveryDate" TEXT,
    "orderDate" TEXT,
    "weekNo" INTEGER,
    "year" INTEGER,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inventoryApplied" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_SushiOrder" ("deliveryDate", "id", "orderDate", "ossId", "poDate", "poNumber", "status", "supplierName", "syncedAt", "weekNo", "year") SELECT "deliveryDate", "id", "orderDate", "ossId", "poDate", "poNumber", "status", "supplierName", "syncedAt", "weekNo", "year" FROM "SushiOrder";
DROP TABLE "SushiOrder";
ALTER TABLE "new_SushiOrder" RENAME TO "SushiOrder";
CREATE UNIQUE INDEX "SushiOrder_ossId_key" ON "SushiOrder"("ossId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
