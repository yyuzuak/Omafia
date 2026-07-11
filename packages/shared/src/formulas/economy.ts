/**
 * Ekonomi formülleri — GDD Bölüm 3 & 4
 */

import type { BusinessDefinition } from "../types/economy.js";

/** İşletmenin seviyeye göre efektif kapasitesini ve oranını döner */
export function getBusinessStats(def: BusinessDefinition, level: number) {
  const upgrade = def.upgrades.find((u) => u.level === level);
  const capacityMult = upgrade?.capacityMult ?? 1;
  const rateBonus = upgrade?.rateBonus ?? 0;
  return {
    capacityPerHour: Math.round(def.launderingCapacityPerHour * capacityMult),
    rate: Math.min(1, def.launderingRate + rateBonus),
    passivePerHour: def.passiveIncomePerHour,
  };
}

/**
 * Kuyruktaki kirli parayı saatlik limitle işler.
 * Dönen değer: temiz paraya çevrilen miktar ve yakılan miktar (kayıp).
 */
export function processLaunder(params: {
  queueDirty: number;
  capacityPerHour: number;
  rate: number;
  rush: boolean;
  speedMult: number;
}): { processed: number; clean: number; burned: number } {
  const effectiveCap = params.rush
    ? params.capacityPerHour * params.speedMult
    : params.capacityPerHour;
  const processed = Math.min(params.queueDirty, effectiveCap);
  const clean = Math.floor(processed * params.rate);
  const burned = processed - clean;
  return { processed, clean, burned };
}

/**
 * Dinamik ekipman fiyatı — GDD Bölüm 4.3
 * Fiyat = BazFiyat × (1 + (talep − arz dengesi) × 0.002)
 * Bant: %70 - %150
 */
export function calcEquipmentPrice(basePrice: number, demand24h: number): number {
  const factor = 1 + demand24h * 0.002;
  const clamped = Math.max(0.7, Math.min(1.5, factor));
  return Math.round(basePrice * clamped);
}
