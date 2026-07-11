import { randomInt } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  type BusinessDefinition,
  getBusinessStats,
  processLaunder,
} from "@mafia/shared";

/** İşletme satın al */
export async function buyBusiness(
  prisma: PrismaClient,
  def: BusinessDefinition,
  playerId: string,
  cityId: string,
): Promise<{ ok: false; reason: string } | { ok: true; businessId: string }> {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, reason: "Oyuncu bulunamadı" };

  if (player.cleanMoney < def.purchasePrice) {
    return { ok: false, reason: `Yeterli temiz para yok (gerekli: ₺${def.purchasePrice.toLocaleString()})` };
  }

  const owned = await prisma.business.count({ where: { ownerId: playerId, typeId: def.id } });
  if (owned >= def.maxOwnedPerPlayer) {
    return { ok: false, reason: `Bu tür işletmeden en fazla ${def.maxOwnedPerPlayer} adet alabilirsin` };
  }

  let businessId = "";
  await prisma.$transaction(async (tx) => {
    const biz = await tx.business.create({
      data: { ownerId: playerId, typeId: def.id, level: 1, cityId },
    });
    businessId = biz.id;
    await tx.player.update({
      where: { id: playerId },
      data: { cleanMoney: { decrement: def.purchasePrice } },
    });
    await tx.transaction.create({
      data: {
        fromId: playerId,
        amount: def.purchasePrice,
        currency: "CLEAN",
        type: "BUSINESS_PURCHASE",
        meta: { typeId: def.id, businessId: biz.id },
      },
    });
  });

  return { ok: true, businessId };
}

/** İşletme yükselt */
export async function upgradeBusiness(
  prisma: PrismaClient,
  def: BusinessDefinition,
  businessId: string,
  playerId: string,
): Promise<{ ok: false; reason: string } | { ok: true; level: number }> {
  const biz = await prisma.business.findFirst({ where: { id: businessId, ownerId: playerId } });
  if (!biz) return { ok: false, reason: "İşletme bulunamadı" };
  if (biz.level >= 3) return { ok: false, reason: "Maksimum seviyeye ulaşıldı" };

  const nextLevel = biz.level + 1;
  const upgrade = def.upgrades.find((u) => u.level === nextLevel);
  if (!upgrade) return { ok: false, reason: "Yükseltme bulunamadı" };

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.cleanMoney < upgrade.cost) {
    return { ok: false, reason: `Yeterli temiz para yok (gerekli: ₺${upgrade.cost.toLocaleString()})` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.business.update({ where: { id: businessId }, data: { level: nextLevel } });
    await tx.player.update({ where: { id: playerId }, data: { cleanMoney: { decrement: upgrade.cost } } });
    await tx.transaction.create({
      data: {
        fromId: playerId,
        amount: upgrade.cost,
        currency: "CLEAN",
        type: "BUSINESS_UPGRADE",
        meta: { businessId, level: nextLevel },
      },
    });
  });

  return { ok: true, level: nextLevel };
}

/** Kirli para aklamaya gönder */
export async function depositLaunder(
  prisma: PrismaClient,
  def: BusinessDefinition,
  businessId: string,
  playerId: string,
  amount: number,
): Promise<{ ok: false; reason: string } | { ok: true; queued: number }> {
  const biz = await prisma.business.findFirst({ where: { id: businessId, ownerId: playerId } });
  if (!biz) return { ok: false, reason: "İşletme bulunamadı" };

  const stats = getBusinessStats(def, biz.level);
  const queueMax = stats.capacityPerHour * def.queueLimitMultiplier;
  const available = queueMax - biz.launderQueue;
  if (available <= 0) return { ok: false, reason: "Kuyruk dolu (24 saatlik kapasite)" };

  const queued = Math.min(amount, available);
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player || player.dirtyMoney < queued) {
    return { ok: false, reason: "Yeterli kirli para yok" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.player.update({ where: { id: playerId }, data: { dirtyMoney: { decrement: queued } } });
    await tx.business.update({ where: { id: businessId }, data: { launderQueue: { increment: queued } } });
    await tx.transaction.create({
      data: {
        fromId: playerId,
        amount: queued,
        currency: "DIRTY",
        type: "LAUNDER_IN",
        meta: { businessId },
      },
    });
  });

  return { ok: true, queued };
}

/** Rush modu aç/kapat */
export async function toggleRushMode(
  prisma: PrismaClient,
  businessId: string,
  playerId: string,
  rush: boolean,
) {
  const biz = await prisma.business.findFirst({ where: { id: businessId, ownerId: playerId } });
  if (!biz) return { ok: false, reason: "İşletme bulunamadı" };
  await prisma.business.update({ where: { id: businessId }, data: { rushMode: rush } });
  return { ok: true, rushMode: rush };
}

/**
 * Saatlik aklama cron'u — tüm işletmeleri işler.
 * Her işletme için: kuyruktaki parayı kapasiteye göre aklar, pasif geliri tahsil eder.
 */
export async function runLaunderCron(prisma: PrismaClient, businessDefs: BusinessDefinition[]) {
  const businesses = await prisma.business.findMany({ where: { launderQueue: { gt: 0 } } });

  for (const biz of businesses) {
    const def = businessDefs.find((d) => d.id === biz.typeId);
    if (!def) continue;

    const stats = getBusinessStats(def, biz.level);
    const result = processLaunder({
      queueDirty: biz.launderQueue,
      capacityPerHour: stats.capacityPerHour,
      rate: stats.rate,
      rush: biz.rushMode,
      speedMult: def.rushLaundering.speedMult,
    });

    if (result.processed === 0) continue;

    // Rush mod baskın riski (GDD §3.4)
    if (biz.rushMode) {
      const raidRoll = randomInt(0, 1000);
      const raidThreshold = Math.floor(def.rushLaundering.raidChancePerDay * 1000 / 24);
      if (raidRoll < raidThreshold) {
        const seized = Math.floor(biz.launderQueue * 0.5);
        await prisma.$transaction([
          prisma.business.update({
            where: { id: biz.id },
            data: { launderQueue: { decrement: seized } },
          }),
          prisma.transaction.create({
            data: {
              fromId: biz.ownerId,
              amount: seized,
              currency: "DIRTY",
              type: "RAID_SEIZURE",
              meta: { businessId: biz.id },
            },
          }),
        ]);
        continue;
      }
    }

    await prisma.$transaction([
      prisma.business.update({
        where: { id: biz.id },
        data: { launderQueue: { decrement: result.processed } },
      }),
      prisma.player.update({
        where: { id: biz.ownerId },
        data: { cleanMoney: { increment: result.clean } },
      }),
      prisma.transaction.create({
        data: {
          toId: biz.ownerId,
          amount: result.clean,
          currency: "CLEAN",
          type: "LAUNDER_OUT",
          meta: { businessId: biz.id, burned: result.burned },
        },
      }),
    ]);
  }

  // Pasif gelir tahsili (son saatten bu yana)
  await runPassiveIncomeCron(prisma, businessDefs);
}

async function runPassiveIncomeCron(prisma: PrismaClient, defs: BusinessDefinition[]) {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const businesses = await prisma.business.findMany({
    where: { lastPassiveAt: { lte: oneHourAgo } },
  });

  for (const biz of businesses) {
    const def = defs.find((d) => d.id === biz.typeId);
    if (!def) continue;
    const stats = getBusinessStats(def, biz.level);
    await prisma.$transaction([
      prisma.business.update({ where: { id: biz.id }, data: { lastPassiveAt: now } }),
      prisma.player.update({ where: { id: biz.ownerId }, data: { cleanMoney: { increment: stats.passivePerHour } } }),
      prisma.transaction.create({
        data: {
          toId: biz.ownerId,
          amount: stats.passivePerHour,
          currency: "CLEAN",
          type: "PASSIVE_INCOME",
          meta: { businessId: biz.id },
        },
      }),
    ]);
  }
}
