import { AP_MAX, msUntilFull, type PlayerProfile } from "@mafia/shared";
import type { FastifyInstance } from "fastify";
import { getApState } from "./ap.service.js";

export default async function playerRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const player = await app.prisma.player.findUnique({ where: { id: req.user.sub } });
    if (!player) return reply.code(404).send({ error: "Oyuncu bulunamadı" });

    const apState = await getApState(app.redis, player.id);
    const nowMs = Date.now();

    const profile: PlayerProfile = {
      id: player.id,
      username: player.username,
      level: player.level,
      xp: player.xp,
      stats: {
        strength: player.strength,
        agility: player.agility,
        intelligence: player.intelligence,
        charisma: player.charisma,
      },
      cityId: player.cityId,
      cleanMoney: player.cleanMoney,
      dirtyMoney: player.dirtyMoney,
      ap: apState.ap,
      apMax: AP_MAX,
      apMsUntilFull: msUntilFull(apState, nowMs),
      jailUntil: player.jailUntil?.toISOString() ?? null,
      hospitalUntil: player.hospitalUntil?.toISOString() ?? null,
      travelUntil: player.travelUntil?.toISOString() ?? null,
    };
    return profile;
  });
}
