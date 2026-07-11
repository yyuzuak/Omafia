import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { startJobs } from "./jobs/launder.js";
import authRoutes from "./modules/auth/routes.js";
import crimesRoutes from "./modules/crimes/routes.js";
import economyRoutes from "./modules/economy/routes.js";
import marketRoutes from "./modules/market/routes.js";
import playerRoutes from "./modules/player/routes.js";
import authPlugin from "./plugins/auth.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  credentials: true,
});
await app.register(rateLimit, { max: 30, timeWindow: "1 minute" });
await app.register(prismaPlugin);
await app.register(redisPlugin);
await app.register(authPlugin);

app.get("/api/health", async () => ({ ok: true }));

await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(playerRoutes, { prefix: "/api/player" });
await app.register(crimesRoutes, { prefix: "/api/crimes" });
await app.register(economyRoutes, { prefix: "/api/economy" });
await app.register(marketRoutes, { prefix: "/api/market" });

startJobs(app.prisma);

const port = Number(process.env.PORT ?? 3000);
try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
