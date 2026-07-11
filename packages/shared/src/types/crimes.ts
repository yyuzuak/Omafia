import { z } from "zod";

export const crimeStatsSchema = z.object({
  strength: z.number().optional(),
  agility: z.number().optional(),
  intelligence: z.number().optional(),
  charisma: z.number().optional(),
});

export const crimeDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(["street", "mid", "heavy", "organized"]),
  stats: crimeStatsSchema,
  statThreshold: z.number(),
  difficultyPenalty: z.number(),
  reward: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.literal("dirty"),
  }),
  cooldownSeconds: z.number(),
  actionPointCost: z.number(),
  failure: z.object({
    jailSeconds: z.number(),
    reputationLoss: z.number(),
  }),
  requirements: z.object({
    minLevel: z.number(),
    crew: z.object({ min: z.number(), max: z.number() }).nullable(),
    territory: z.string().nullable(),
  }),
  location: z.string(),
  minigame: z.string().optional(),
});

export type CrimeDefinition = z.infer<typeof crimeDefinitionSchema>;

export interface CrimeResult {
  success: boolean;
  reward: number;
  /** Hapis süresi bittikten sonraki zaman (ISO string) — sadece başarısızlıkta */
  jailUntil: string | null;
  /** Suç başarısı detay breakdown — UI'da gösterilir */
  breakdown: {
    base: number;
    statScore: number;
    difficultyPenalty: number;
    finalChance: number;
  };
}

/** Oyuncu için suç listesi öğesi — UI'ın ihtiyacı */
export interface CrimeListItem {
  id: string;
  name: string;
  tier: string;
  successChance: number;
  breakdown: CrimeResult["breakdown"];
  reward: { min: number; max: number };
  actionPointCost: number;
  cooldownSeconds: number;
  /** null → hazır, ISO string → cooldown bitiş zamanı */
  cooldownUntil: string | null;
  locked: boolean;
  lockReason: string | null;
}
