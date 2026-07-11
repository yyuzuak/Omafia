import { describe, expect, it } from "vitest";
import crimesConfig from "../config/crimes.json";
import type { CrimeDefinition } from "../types/crimes.js";
import { calcCrimeChance, resolveCrime } from "./crimes.js";

const crimes = crimesConfig.crimes as CrimeDefinition[];
const pickpocket = crimes.find((c) => c.id === "pickpocket")!;
const safeCracking = crimes.find((c) => c.id === "safe_cracking")!;

const weakStats = { strength: 5, agility: 5, intelligence: 5, charisma: 5 };
const strongStats = { strength: 50, agility: 50, intelligence: 50, charisma: 50 };

describe("calcCrimeChance", () => {
  it("zayıf statla yankesicilik: min %5 tavanı korunur", () => {
    // Baz %20 − 0 zorluk = %20 bile olsa başarı sansı düşük stat ile düşer
    const r = calcCrimeChance(pickpocket, weakStats);
    expect(r.finalChance).toBeGreaterThanOrEqual(5);
    expect(r.finalChance).toBeLessThanOrEqual(95);
  });

  it("maksimum statla başarı %95 tavanını aşamaz", () => {
    const r = calcCrimeChance(pickpocket, strongStats);
    expect(r.finalChance).toBeLessThanOrEqual(95);
    // Yankesicilik maks = baz(20) + statScore(50) - zorluk(0) = 70
    expect(r.finalChance).toBe(70);
  });

  it("zorluk cezası doğru uygulanır (kasa kırma -20)", () => {
    const weak = calcCrimeChance(safeCracking, weakStats);
    const strong = calcCrimeChance(safeCracking, strongStats);
    expect(strong.finalChance).toBeGreaterThan(weak.finalChance);
    // Zorluk cezası yapıya yansımış
    expect(weak.difficultyPenalty).toBe(20);
  });

  it("breakdown değerleri tutarlı (base + statScore - penalty ≈ finalChance)", () => {
    const r = calcCrimeChance(pickpocket, weakStats);
    const raw = r.base + r.statScore - r.difficultyPenalty;
    const expected = Math.max(5, Math.min(95, Math.round(raw)));
    expect(r.finalChance).toBe(expected);
  });
});

describe("resolveCrime", () => {
  it("rng < finalChance → başarılı, ödül hesaplanır", () => {
    const { success, reward, breakdown } = resolveCrime(pickpocket, weakStats, 50, 0);
    expect(success).toBe(true);
    expect(reward).toBeGreaterThanOrEqual(pickpocket.reward.min);
    expect(reward).toBeLessThanOrEqual(pickpocket.reward.max);
    expect(breakdown.finalChance).toBeGreaterThanOrEqual(5);
  });

  it("rng >= finalChance → başarısız, ödül 0", () => {
    const { success, reward } = resolveCrime(pickpocket, weakStats, 50, 99);
    expect(success).toBe(false);
    expect(reward).toBe(0);
  });

  it("reward deterministik: aynı rng aynı ödül", () => {
    const a = resolveCrime(pickpocket, weakStats, 75, 0);
    const b = resolveCrime(pickpocket, weakStats, 75, 0);
    expect(a.reward).toBe(b.reward);
  });
});
