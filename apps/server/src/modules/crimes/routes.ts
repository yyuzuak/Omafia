import crimesConfig from "@mafia/shared/config/crimes.json" with { type: "json" };
import type { CrimeDefinition } from "@mafia/shared";
import type { FastifyInstance } from "fastify";
import { buildCrimeList, commitCrime } from "./service.js";

const crimes = crimesConfig.crimes as CrimeDefinition[];

export default async function crimesRoutes(app: FastifyInstance) {
  const preHandler = [app.authenticate];

  /** GET /api/crimes — oyuncuya göre suç listesi (başarı şansı + cooldown dahil) */
  app.get("/", { preHandler }, async (req, reply) => {
    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    if (player.jailUntil && player.jailUntil > new Date()) {
      return reply
        .code(403)
        .send({ error: "Hapisteyken suç işleyemezsin", jailUntil: player.jailUntil.toISOString() });
    }

    const list = await buildCrimeList(app.redis, crimes, player.id, player.level, {
      strength: player.strength,
      agility: player.agility,
      intelligence: player.intelligence,
      charisma: player.charisma,
    });
    return list;
  });

  /** POST /api/crimes/:id/commit — suç işle */
  app.post<{ Params: { id: string } }>("/:id/commit", { preHandler }, async (req, reply) => {
    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    if (player.jailUntil && player.jailUntil > new Date()) {
      return reply
        .code(403)
        .send({ error: "Hapisteyken suç işleyemezsin", jailUntil: player.jailUntil.toISOString() });
    }

    if (player.hospitalUntil && player.hospitalUntil > new Date()) {
      return reply
        .code(403)
        .send({ error: "Hastanedeyken suç işleyemezsin", hospitalUntil: player.hospitalUntil.toISOString() });
    }

    const crime = crimes.find((c) => c.id === req.params.id);
    if (!crime) return reply.code(404).send({ error: "Suç bulunamadı" });

    const result = await commitCrime(app.prisma, app.redis, crime, player.id, {
      strength: player.strength,
      agility: player.agility,
      intelligence: player.intelligence,
      charisma: player.charisma,
    }, player.level);

    if (!result.ok) return reply.code(400).send({ error: result.reason });

    return result;
  });

  /** POST /api/crimes/jail/bribe — rüşvetle hapisten çıkış */
  app.post("/jail/bribe", { preHandler }, async (req, reply) => {
    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    if (!player.jailUntil || player.jailUntil <= new Date()) {
      return reply.code(400).send({ error: "Hapiste değilsin" });
    }

    const remainingMs = player.jailUntil.getTime() - Date.now();
    // Rüşvet: kalan süreyle orantılı — tam sürenin maliyeti 1000₺/dk, min 200₺
    const bribeAmount = Math.max(200, Math.round((remainingMs / 60_000) * 1000));

    if (player.cleanMoney < bribeAmount) {
      return reply.code(400).send({
        error: `Yeterli temiz paran yok. Gerekli: ₺${bribeAmount.toLocaleString("tr-TR")}`,
        bribeAmount,
      });
    }

    await app.prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: player.id },
        data: { jailUntil: null, cleanMoney: { decrement: bribeAmount } },
      });
      await tx.transaction.create({
        data: {
          fromId: player.id,
          amount: bribeAmount,
          currency: "CLEAN",
          type: "JAIL_BRIBE",
          meta: { remainingSeconds: Math.round(remainingMs / 1000) },
        },
      });
    });

    return { ok: true, bribeAmount };
  });
}
