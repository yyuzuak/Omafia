import equipmentConfig from "@mafia/shared/config/equipment.json" with { type: "json" };
import type { EquipmentDefinition } from "@mafia/shared";
import { calcEquipmentPrice } from "@mafia/shared";
import type { FastifyInstance } from "fastify";

const items = equipmentConfig.equipment as EquipmentDefinition[];

export default async function marketRoutes(app: FastifyInstance) {
  const pre = [app.authenticate];

  /** GET /api/market — ekipman listesi (dinamik fiyatlar dahil) */
  app.get("/", { preHandler: pre }, async (req) => {
    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    const cityId = player?.cityId ?? "new_haven";

    const prices = await app.prisma.equipmentPrice.findMany({ where: { cityId } });
    const demandMap = new Map(prices.map((p) => [p.itemId, p.demand24h]));

    // Satın alınamayan (drop-only) itemler mağazada gösterilmez
    return items
      .filter((item) => item.basePrice > 0)
      .map((item) => {
        const demand = demandMap.get(item.id) ?? 0;
        const currentPrice = calcEquipmentPrice(item.basePrice, demand);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          rarity: item.rarity,
          durability: item.durability,
          effects: item.effects,
          basePrice: item.basePrice,
          currentPrice,
          demand24h: demand,
        };
      });
  });

  /** GET /api/market/inventory — oyuncunun envanteri */
  app.get("/inventory", { preHandler: pre }, async (req) => {
    const inv = await app.prisma.inventoryItem.findMany({ where: { playerId: req.user.sub } });
    return inv.map((i) => {
      const def = items.find((e) => e.id === i.itemId);
      return {
        id: i.id,
        itemId: i.itemId,
        name: def?.name ?? i.itemId,
        category: def?.category,
        durability: i.durability,
        maxDurability: def?.durability ?? 100,
        equipped: i.equipped,
        effects: def?.effects,
      };
    });
  });

  /** POST /api/market/buy */
  app.post<{ Body: { itemId: string } }>("/buy", { preHandler: pre }, async (req, reply) => {
    const itemId = (req.body as { itemId?: string })?.itemId;
    if (!itemId) return reply.code(400).send({ error: "itemId gerekli" });

    const def = items.find((i) => i.id === itemId);
    if (!def || !def.basePrice) return reply.code(404).send({ error: "Ürün bulunamadı veya satışta değil" });

    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    const cityId = player.cityId;
    const priceRow = await app.prisma.equipmentPrice.findUnique({
      where: { itemId_cityId: { itemId, cityId } },
    });
    const currentPrice = calcEquipmentPrice(def.basePrice, priceRow?.demand24h ?? 0);

    if (player.cleanMoney < currentPrice) {
      return reply.code(400).send({ error: `Yeterli temiz para yok (gerekli: ₺${currentPrice.toLocaleString()})` });
    }

    let inventoryId = "";
    await app.prisma.$transaction(async (tx) => {
      const inv = await tx.inventoryItem.create({
        data: { playerId: player.id, itemId, durability: def.durability },
      });
      inventoryId = inv.id;
      await tx.player.update({ where: { id: player.id }, data: { cleanMoney: { decrement: currentPrice } } });
      await tx.transaction.create({
        data: {
          fromId: player.id,
          amount: currentPrice,
          currency: "CLEAN",
          type: "ITEM_PURCHASE",
          meta: { itemId, inventoryId: inv.id },
        },
      });
      // Talep sayacını artır (saatlik cron günceller, biz sadece artırıyoruz)
      await tx.equipmentPrice.upsert({
        where: { itemId_cityId: { itemId, cityId } },
        create: { itemId, cityId, demand24h: 1 },
        update: { demand24h: { increment: 1 } },
      });
    });

    return { ok: true, inventoryId, price: currentPrice };
  });

  /** POST /api/market/repair */
  app.post<{ Body: { inventoryId: string } }>("/repair", { preHandler: pre }, async (req, reply) => {
    const inventoryId = (req.body as { inventoryId?: string })?.inventoryId;
    if (!inventoryId) return reply.code(400).send({ error: "inventoryId gerekli" });

    const item = await app.prisma.inventoryItem.findFirst({
      where: { id: inventoryId, playerId: req.user.sub },
    });
    if (!item) return reply.code(404).send({ error: "Eşya bulunamadı" });

    const def = items.find((i) => i.id === item.itemId);
    if (!def) return reply.code(404).send({ error: "Eşya tanımı bulunamadı" });

    if (item.durability >= def.durability) return reply.code(400).send({ error: "Eşya zaten tam durumda" });

    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    // Tamir maliyeti = baz fiyatın %30'u (GDD §4.2)
    const repairCost = Math.max(50, Math.round(def.basePrice * 0.30));
    if (player.cleanMoney < repairCost) {
      return reply.code(400).send({ error: `Yeterli para yok (tamir: ₺${repairCost.toLocaleString()})` });
    }

    await app.prisma.$transaction([
      app.prisma.inventoryItem.update({
        where: { id: inventoryId },
        data: { durability: def.durability },
      }),
      app.prisma.player.update({
        where: { id: req.user.sub },
        data: { cleanMoney: { decrement: repairCost } },
      }),
      app.prisma.transaction.create({
        data: {
          fromId: req.user.sub,
          amount: repairCost,
          currency: "CLEAN",
          type: "ITEM_REPAIR",
          meta: { inventoryId, itemId: item.itemId },
        },
      }),
    ]);

    return { ok: true, repairCost };
  });

  /** POST /api/market/equip */
  app.post<{ Body: { inventoryId: string; equip: boolean } }>(
    "/equip",
    { preHandler: pre },
    async (req, reply) => {
      const { inventoryId, equip } = req.body as { inventoryId?: string; equip?: boolean };
      if (!inventoryId) return reply.code(400).send({ error: "inventoryId gerekli" });

      const item = await app.prisma.inventoryItem.findFirst({
        where: { id: inventoryId, playerId: req.user.sub },
      });
      if (!item) return reply.code(404).send({ error: "Eşya bulunamadı" });

      const def = items.find((i) => i.id === item.itemId);
      if (!def) return reply.code(404).send({ error: "Eşya tanımı bulunamadı" });

      // Aynı kategoride başka equipped item'ı kaldır
      if (equip) {
        await app.prisma.inventoryItem.updateMany({
          where: {
            playerId: req.user.sub,
            equipped: true,
            id: { not: inventoryId },
            itemId: { in: items.filter((i) => i.category === def.category).map((i) => i.id) },
          },
          data: { equipped: false },
        });
      }

      await app.prisma.inventoryItem.update({
        where: { id: inventoryId },
        data: { equipped: equip ?? true },
      });

      return { ok: true, equipped: equip ?? true };
    },
  );
}
