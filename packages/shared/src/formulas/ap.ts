/**
 * Aksiyon Puanı (AP) — lazy regen formülü.
 * GDD Bölüm 9: Maks 100 AP, 1 AP / 72 sn (≈50 AP/saat, tam dolum 2 saat).
 * Tick tutulmaz: her istekte son hesaplama anından geçen süreyle hesaplanır.
 */

export const AP_MAX = 100;
export const AP_REGEN_SECONDS = 72; // 1 AP / 72 sn

export interface ApState {
  /** Son hesaplama anındaki AP değeri */
  ap: number;
  /** Son hesaplama zamanı (epoch ms) */
  lastCalcMs: number;
}

/**
 * Geçen süreye göre güncel AP'yi hesaplar.
 * Kalan küsurat kaybolmasın diye lastCalcMs yalnızca tam AP kadar ilerletilir.
 */
export function calcAp(state: ApState, nowMs: number, regenMultiplier = 1): ApState {
  if (nowMs <= state.lastCalcMs || state.ap >= AP_MAX) {
    return { ap: Math.min(state.ap, AP_MAX), lastCalcMs: nowMs > state.lastCalcMs ? nowMs : state.lastCalcMs };
  }
  const effectiveRegenMs = (AP_REGEN_SECONDS * 1000) / regenMultiplier;
  const elapsed = nowMs - state.lastCalcMs;
  const gained = Math.floor(elapsed / effectiveRegenMs);
  const newAp = Math.min(AP_MAX, state.ap + gained);
  // Tavana ulaşıldıysa küsurat anlamsız; değilse tam AP kadar ilerlet
  const lastCalcMs =
    newAp >= AP_MAX ? nowMs : state.lastCalcMs + gained * effectiveRegenMs;
  return { ap: newAp, lastCalcMs };
}

/** AP harcama: yetersizse null döner (server bunu 400'e çevirir). */
export function spendAp(state: ApState, cost: number, nowMs: number, regenMultiplier = 1): ApState | null {
  const current = calcAp(state, nowMs, regenMultiplier);
  if (current.ap < cost) return null;
  return { ap: current.ap - cost, lastCalcMs: current.lastCalcMs };
}

/** Tam dolum için kalan süre (ms) — UI geri sayımı için. */
export function msUntilFull(state: ApState, nowMs: number, regenMultiplier = 1): number {
  const current = calcAp(state, nowMs, regenMultiplier);
  if (current.ap >= AP_MAX) return 0;
  const effectiveRegenMs = (AP_REGEN_SECONDS * 1000) / regenMultiplier;
  const missing = AP_MAX - current.ap;
  const partial = nowMs - current.lastCalcMs; // bir sonraki AP'ye birikmiş süre
  return missing * effectiveRegenMs - partial;
}
