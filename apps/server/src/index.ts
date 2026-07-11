import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import authRoutes from "./modules/auth/routes.js";
import playerRoutes from "./modules/player/routes.js";
import authPlugin from "./plugins/auth.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  credentials: true,
});
// Mimari kural #8: tüm mutasyon endpoint'leri rate-limit korumalı (varsayılan 30/dk)
await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });
await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(authPlugin);

app.get("/api/health", async () => ({ ok: true }));

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(playerRoutes, { prefix: "/api/player" });

const port = Number(process.env.PORT ?? 3000);
try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
