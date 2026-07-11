import businessesConfig from "@mafia/shared/config/businesses.json" with { type: "json" };
import type { BusinessDefinition } from "@mafia/shared";
import { getBusinessStats } from "@mafia/shared";
import type { FastifyInstance } from "fastify";
import {
  buyBusiness,
  depositLaunder,
  toggleRushMode,
  upgradeBusiness,
} from "./service.js";

const defs = businessesConfig.businesses as BusinessDefinition[];
const preHandler = ["authenticate"] as unknown as never[];

export default async function economyRoutes(app: FastifyInstance) {
  const pre = [app.authenticate];

  /** GET /api/economy/businesses — oyuncunun işletmeleri */
  app.get("/businesses", { preHandler: pre }, async (req, reply) => {
    const businesses = await app.prisma.business.findMany({
      where: { ownerId: req.user.sub },
      orderBy: { createdAt: "asc" },
    });

    return businesses.map((b) => {
      const def = defs.find((d) => d.id === b.typeId)!;
      const stats = getBusinessStats(def, b.level);
      const queueMax = stats.capacityPerHour * def.queueLimitMultiplier;
      return {
        id: b.id,
        typeId: b.typeId,
        name: def.name,
        level: b.level,
        cityId: b.cityId,
        launderQueue: b.launderQueue,
        queueMax,
        rushMode: b.rushMode,
        stats,
        upgradeAvailable: b.level < 3,
        nextUpgradeCost: def.upgrades.find((u) => u.level === b.level + 1)?.cost ?? null,
      };
    });
  });

  /** GET /api/economy/shop — satın alınabilir işletme listesi */
  app.get("/shop", { preHandler: pre }, async (req) => {
    return defs.map((def) => ({
      id: def.id,
      name: def.name,
      purchasePrice: def.purchasePrice,
      launderingCapacityPerHour: def.launderingCapacityPerHour,
      launderingRate: def.launderingRate,
      passiveIncomePerHour: def.passiveIncomePerHour,
      maxOwnedPerPlayer: def.maxOwnedPerPlayer,
    }));
  });

  /** POST /api/economy/businesses/buy */
  app.post<{ Body: { typeId: string } }>(
    "/businesses/buy",
    { preHandler: pre },
    async (req, reply) => {
      const { typeId } = req.body as { typeId?: string };
      if (!typeId) return reply.code(400).send({ error: "typeId gerekli" });

      const def = defs.find((d) => d.id === typeId);
      if (!def) return reply.code(404).send({ error: "İşletme türü bulunamadı" });

      const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
      const result = await buyBusiness(app.prisma, def, req.user.sub, player?.cityId ?? "new_haven");
      if (!result.ok) return reply.code(400).send({ error: result.reason });
      return result;
    },
  );

  /** POST /api/economy/businesses/:id/upgrade */
  app.post<{ Params: { id: string } }>(
    "/businesses/:id/upgrade",
    { preHandler: pre },
    async (req, reply) => {
      const biz = await app.prisma.business.findFirst({
        where: { id: req.params.id, ownerId: req.user.sub },
      });
      if (!biz) return reply.code(404).send({ error: "İşletme bulunamadı" });

      const def = defs.find((d) => d.id === biz.typeId)!;
      const result = await upgradeBusiness(app.prisma, def, biz.id, req.user.sub);
      if (!result.ok) return reply.code(400).send({ error: result.reason });
      return result;
    },
  );

  /** POST /api/economy/businesses/:id/launder */
  app.post<{ Params: { id: string }; Body: { amount: number } }>(
    "/businesses/:id/launder",
    { preHandler: pre },
    async (req, reply) => {
      const amount = Number((req.body as { amount?: unknown })?.amount);
      if (!amount || amount <= 0) return reply.code(400).send({ error: "Geçerli bir miktar girin" });

      const biz = await app.prisma.business.findFirst({
        where: { id: req.params.id, ownerId: req.user.sub },
      });
      if (!biz) return reply.code(404).send({ error: "İşletme bulunamadı" });

      const def = defs.find((d) => d.id === biz.typeId)!;
      const result = await depositLaunder(app.prisma, def, biz.id, req.user.sub, amount);
      if (!result.ok) return reply.code(400).send({ error: result.reason });
      return result;
    },
  );

  /** POST /api/economy/businesses/:id/rush */
  app.post<{ Params: { id: string }; Body: { rush: boolean } }>(
    "/businesses/:id/rush",
    { preHandler: pre },
    async (req, reply) => {
      const rush = Boolean((req.body as { rush?: unknown })?.rush);
      const result = await toggleRushMode(app.prisma, req.params.id, req.user.sub, rush);
      if (!result.ok) return reply.code(404).send({ error: result.reason });
      return result;
    },
  );
}
