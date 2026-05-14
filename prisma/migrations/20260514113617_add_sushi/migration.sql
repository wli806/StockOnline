-- CreateTable
CREATE TABLE "SushiOrder" (
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
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SushiOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "ossItemId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "uom" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    CONSTRAINT "SushiOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SushiOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SushiOrder_ossId_key" ON "SushiOrder"("ossId");
