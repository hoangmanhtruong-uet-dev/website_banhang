-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "shippingAddress" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerEmail", "customerName", "customerPhone", "id", "paymentMethod", "shippingAddress", "status", "total", "updatedAt") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "id", "paymentMethod", "shippingAddress", "status", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
