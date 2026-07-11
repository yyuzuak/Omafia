/**
 * Suç başarı formülü — GDD Bölüm 2.2
 *
 * Ham Başarı % = 20 (baz) + (Stat Skoru × 50) + Ekipman − Zorluk Cezası
 * Final %      = clamp(Ham, 5, 95)
 *
 * S1'de ekipman bonusu ve itibar bonusu henüz yok (S3/S8'de eklenir);
 * şimdilik sadece stat + zorluk hesaplanır.
 */

import type { CrimeDefinition } from "../types/crimes.js";
import type { PlayerStats } from "../types/player.js";

const BASE_CHANCE = 20;
const STAT_WEIGHT = 50;

export interface CrimeChanceBreakdown {
  base: number;
  statScore: number;
  difficultyPenalty: number;
  finalChance: number;
}

export function calcCrimeChance(
  crime: CrimeDefinition,
  stats: PlayerStats,
): CrimeChanceBreakdown {
  // Stat ağırlıklı ortalama / eşik oranı
  const raw =
    (stats.strength ?? 0) * (crime.stats.strength ?? 0) +
    (stats.agility ?? 0) * (crime.stats.agility ?? 0) +
    (stats.intelligence ?? 0) * (crime.stats.intelligence ?? 0) +
    (stats.charisma ?? 0) * (crime.stats.charisma ?? 0);

  const statScore = Math.min(raw / crime.statThreshold, 1);
  const ham = BASE_CHANCE + statScore * STAT_WEIGHT - crime.difficultyPenalty;
  const finalChance = Math.max(5, Math.min(95, Math.round(ham)));

  return {
    base: BASE_CHANCE,
    statScore: Math.round(statScore * STAT_WEIGHT),
    difficultyPenalty: crime.difficultyPenalty,
    finalChance,
  };
}

/**
 * Suç sonucunu belirler.
 * rng: 0-99 arası tam sayı injekte edilir (test edilebilirlik; server crypto.randomInt kullanır).
 */
export function resolveCrime(
  crime: CrimeDefinition,
  stats: PlayerStats,
  rewardRng: number,
  successRng: number,
): { success: boolean; reward: number; breakdown: CrimeChanceBreakdown } {
  const breakdown = calcCrimeChance(crime, stats);
  const success = successRng < breakdown.finalChance;
  const reward = success
    ? crime.reward.min + Math.floor((rewardRng / 100) * (crime.reward.max - crime.reward.min))
    : 0;
  return { success, reward, breakdown };
}
