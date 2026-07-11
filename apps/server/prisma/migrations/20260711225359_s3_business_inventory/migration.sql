-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "newbieBonusUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "cityId" TEXT NOT NULL,
    "launderQueue" INTEGER NOT NULL DEFAULT 0,
    "rushMode" BOOLEAN NOT NULL DEFAULT false,
    "lastPassiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "durability" INTEGER NOT NULL,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentPrice" (
    "itemId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "demand24h" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentPrice_pkey" PRIMARY KEY ("itemId")
);

-- CreateIndex
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- CreateIndex
CREATE INDEX "Business_typeId_idx" ON "Business"("typeId");

-- CreateIndex
CREATE INDEX "InventoryItem_playerId_idx" ON "InventoryItem"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPrice_itemId_cityId_key" ON "EquipmentPrice"("itemId", "cityId");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
