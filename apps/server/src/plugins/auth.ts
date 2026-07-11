import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; username: string };
    user: { sub: string; username: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 30;

export default fp(async (app: FastifyInstance) => {
  await app.register(cookie);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret",
    cookie: { cookieName: "access_token", signed: false },
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Oturum geçersiz veya süresi dolmuş" });
    }
  });
});
