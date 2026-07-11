-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CLEAN', 'DIRTY');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "agility" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "charisma" INTEGER NOT NULL DEFAULT 5,
    "cityId" TEXT NOT NULL DEFAULT 'new_haven',
    "cleanMoney" INTEGER NOT NULL DEFAULT 500,
    "dirtyMoney" INTEGER NOT NULL DEFAULT 0,
    "jailUntil" TIMESTAMP(3),
    "hospitalUntil" TIMESTAMP(3),
    "travelUntil" TIMESTAMP(3),
    "protectionUntil" TIMESTAMP(3),
    "jailbreakSkill" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "fromId" TEXT,
    "toId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_playerId_idx" ON "RefreshToken"("playerId");

-- CreateIndex
CREATE INDEX "Transaction_fromId_idx" ON "Transaction"("fromId");

-- CreateIndex
CREATE INDEX "Transaction_toId_idx" ON "Transaction"("toId");

-- CreateIndex
CREATE INDEX "Transaction_type_createdAt_idx" ON "Transaction"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
