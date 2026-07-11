import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Redis } from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export default fp(async (app: FastifyInstance) => {
  const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    maxRetriesPerRequest: 3,
  });
  app.decorate("redis", redis);
  app.addHook("onClose", async () => {
    redis.disconnect();
  });
});
