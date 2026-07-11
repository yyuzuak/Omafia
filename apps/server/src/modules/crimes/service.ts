import { randomInt } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  type CrimeDefinition,
  type CrimeListItem,
  calcCrimeChance,
  resolveCrime,
} from "@mafia/shared";
import type { Redis } from "ioredis";
import { getApState, saveApState } from "../player/ap.service.js";

// Cooldown key: crime:{playerId}:{crimeId} → TTL'li
const cooldownKey = (playerId: string, crimeId: string) => `crime:${playerId}:${crimeId}`;

export async function getCooldownUntil(
  redis: Redis,
  playerId: string,
  crimeId: string,
): Promise<string | null> {
  const ttl = await redis.pttl(cooldownKey(playerId, crimeId));
  if (ttl <= 0) return null;
  return new Date(Date.now() + ttl).toISOString();
}

export async function buildCrimeList(
  redis: Redis,
  crimes: CrimeDefinition[],
  playerId: string,
  playerLevel: number,
  stats: { strength: number; agility: number; intelligence: number; charisma: number },
): Promise<CrimeListItem[]> {
  return Promise.all(
    crimes.map(async (crime) => {
      const breakdown = calcCrimeChance(crime, stats);
      const cooldownUntil = await getCooldownUntil(redis, playerId, crime.id);
      const locked = playerLevel < crime.requirements.minLevel;
      return {
        id: crime.id,
        name: crime.name,
        tier: crime.tier,
        successChance: breakdown.finalChance,
        breakdown,
        reward: { min: crime.reward.min, max: crime.reward.max },
        actionPointCost: crime.actionPointCost,
        cooldownSeconds: crime.cooldownSeconds,
        cooldownUntil,
        locked,
        lockReason: locked ? `Seviye ${crime.requirements.minLevel} gerekli` : null,
      };
    }),
  );
}

export async function commitCrime(
  prisma: PrismaClient,
  redis: Redis,
  crime: CrimeDefinition,
  playerId: string,
  stats: { strength: number; agility: number; intelligence: number; charisma: number },
  playerLevel: number,
): Promise<
  | { ok: false; reason: string }
  | {
      ok: true;
      success: boolean;
      reward: number;
      jailUntil: string | null;
      breakdown: ReturnType<typeof calcCrimeChance>;
    }
> {
  // 1. Kilitli mi?
  if (playerLevel < crime.requirements.minLevel) {
    return { ok: false, reason: `Seviye ${crime.requirements.minLevel} gerekli` };
  }

  // 2. Cooldown kontrolü
  const onCooldown = await redis.exists(cooldownKey(playerId, crime.id));
  if (onCooldown) return { ok: false, reason: "Suç henüz hazır değil" };

  // 3. AP kontrolü + atomic harcama
  const apState = await getApState(redis, playerId);
  if (apState.ap < crime.actionPointCost) {
    return { ok: false, reason: `Yeterli AP yok (gerekli: ${crime.actionPointCost})` };
  }

  // 4. RNG — mimari kural #7: crypto.randomInt
  const successRng = randomInt(0, 100);
  const rewardRng = randomInt(0, 100);
  const { success, reward, breakdown } = resolveCrime(crime, stats, rewardRng, successRng);

  // 5. Hapis zamanı
  const jailUntil =
    !success && crime.failure.jailSeconds > 0
      ? new Date(Date.now() + crime.failure.jailSeconds * 1000)
      : null;

  // 6. DB transaction (kural #3: para hareketi + player güncelleme birlikte)
  await prisma.$transaction(async (tx) => {
    if (success && reward > 0) {
      await tx.player.update({
        where: { id: playerId },
        data: { dirtyMoney: { increment: reward } },
      });
      await tx.transaction.create({
        data: {
          toId: playerId,
          amount: reward,
          currency: "DIRTY",
          type: "CRIME_REWARD",
          meta: { crimeId: crime.id, tier: crime.tier },
        },
      });
    }

    if (jailUntil) {
      await tx.player.update({
        where: { id: playerId },
        data: { jailUntil },
      });
    }
  });

  // 7. AP düş + cooldown set
  await saveApState(redis, playerId, { ap: apState.ap - crime.actionPointCost, lastCalcMs: Date.now() });
  await redis.set(cooldownKey(playerId, crime.id), "1", "EX", crime.cooldownSeconds);

  return {
    ok: true,
    success,
    reward,
    jailUntil: jailUntil?.toISOString() ?? null,
    breakdown,
  };
}
