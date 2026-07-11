import { loginSchema, registerSchema } from "@mafia/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import { REFRESH_TOKEN_TTL_DAYS } from "../../plugins/auth.js";
import {
  issueRefreshToken,
  registerPlayer,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyLogin,
} from "./service.js";

const REFRESH_COOKIE = "refresh_token";

export default async function authRoutes(app: FastifyInstance) {
  const setAuthCookies = async (
    reply: FastifyReply,
    player: { id: string; username: string },
  ) => {
    const accessToken = await reply.jwtSign(
      { sub: player.id, username: player.username },
      { expiresIn: "15m" },
    );
    const { token: refreshToken } = await issueRefreshToken(app.prisma, player.id);
    reply
      .setCookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60,
      })
      .setCookie(REFRESH_COOKIE, refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
      });
  };

  app.post("/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" });
    }
    const { username, email, password } = parsed.data;

    const existing = await app.prisma.player.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true },
    });
    if (existing) {
      return reply.code(409).send({
        error: existing.username === username ? "Bu kullanıcı adı alınmış" : "Bu e-posta kayıtlı",
      });
    }

    const player = await registerPlayer(app.prisma, { username, email, password });
    await setAuthCookies(reply, player);
    return reply.code(201).send({ id: player.id, username: player.username });
  });

  app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" });
    }
    const player = await verifyLogin(app.prisma, parsed.data);
    if (!player) {
      return reply.code(401).send({ error: "Kullanıcı adı veya şifre hatalı" });
    }
    await setAuthCookies(reply, player);
    return { id: player.id, username: player.username };
  });

  app.post("/refresh", async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) return reply.code(401).send({ error: "Oturum bulunamadı" });
    const rotated = await rotateRefreshToken(app.prisma, token);
    if (!rotated) return reply.code(401).send({ error: "Oturum geçersiz" });
    await setAuthCookies(reply, rotated.player);
    return { id: rotated.player.id, username: rotated.player.username };
  });

  app.post("/logout", async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await revokeRefreshToken(app.prisma, token);
    reply
      .clearCookie("access_token", { path: "/" })
      .clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    return { ok: true };
  });
}
