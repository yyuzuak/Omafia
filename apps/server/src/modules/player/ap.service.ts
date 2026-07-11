import { type ApState, calcAp, spendAp } from "@mafia/shared";
import type { Redis } from "ioredis";

/**
 * AP durumu Redis'te yaşar (mimari kural #5 — lazy regen, tick yok).
 * Key: ap:{playerId} → hash { ap, lastCalcMs }
 */
const apKey = (playerId: string) => `ap:${playerId}`;

const DEFAULT_STATE = (nowMs: number): ApState => ({ ap: 100, lastCalcMs: nowMs });

export async function getApState(redis: Redis, playerId: string): Promise<ApState> {
  const raw = await redis.hgetall(apKey(playerId));
  const nowMs = Date.now();
  if (!raw.ap || !raw.lastCalcMs) {
    const state = DEFAULT_STATE(nowMs);
    await saveApState(redis, playerId, state);
    return state;
  }
  return calcAp({ ap: Number(raw.ap), lastCalcMs: Number(raw.lastCalcMs) }, nowMs);
}

export async function saveApState(redis: Redis, playerId: string, state: ApState): Promise<void> {
  await redis.hset(apKey(playerId), { ap: state.ap, lastCalcMs: state.lastCalcMs });
}

/** AP harcamayı dener; yetersizse false döner. */
export async function trySpendAp(redis: Redis, playerId: string, cost: number): Promise<boolean> {
  const state = await getApState(redis, playerId);
  const next = spendAp(state, cost, Date.now());
  if (!next) return false;
  await saveApState(redis, playerId, next);
  return true;
}
