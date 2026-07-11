import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { REFRESH_TOKEN_TTL_DAYS } from "../../plugins/auth.js";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function registerPlayer(
  prisma: PrismaClient,
  input: { username: string; email: string; password: string },
) {
  const passwordHash = await argon2.hash(input.password);
  // Başlangıç bakiyesi Player.default'ta; yine de kural #3 gereği
  // kayıt bonusu Transaction olarak loglanır.
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
      },
    });
    await tx.transaction.create({
      data: {
        toId: player.id,
        amount: 500,
        currency: "CLEAN",
        type: "REGISTER_BONUS",
      },
    });
    return player;
  });
}

export async function verifyLogin(
  prisma: PrismaClient,
  input: { username: string; password: string },
) {
  const player = await prisma.player.findUnique({ where: { username: input.username } });
  if (!player) return null;
  const ok = await argon2.verify(player.passwordHash, input.password);
  return ok ? player : null;
}

export async function issueRefreshToken(prisma: PrismaClient, playerId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(token), playerId, expiresAt },
  });
  return { token, expiresAt };
}

export async function rotateRefreshToken(prisma: PrismaClient, token: string) {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { player: true },
  });
  if (!existing || existing.expiresAt < new Date()) return null;
  await prisma.refreshToken.delete({ where: { id: existing.id } });
  const next = await issueRefreshToken(prisma, existing.playerId);
  return { player: existing.player, ...next };
}

export async function revokeRefreshToken(prisma: PrismaClient, token: string) {
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(token) } });
}
