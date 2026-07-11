import { z } from "zod";

export const businessUpgradeSchema = z.object({
  level: z.number().int().min(2).max(3),
  cost: z.number(),
  capacityMult: z.number(),
  rateBonus: z.number(),
});

export const businessDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  purchasePrice: z.number(),
  launderingCapacityPerHour: z.number(),
  launderingRate: z.number(),
  passiveIncomePerHour: z.number(),
  queueLimitMultiplier: z.number(),
  rushLaundering: z.object({ speedMult: z.number(), raidChancePerDay: z.number() }),
  maxOwnedPerPlayer: z.number(),
  upgrades: z.array(businessUpgradeSchema),
});

export type BusinessDefinition = z.infer<typeof businessDefinitionSchema>;

export const equipmentDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["weapon", "armor", "vehicle", "tool"]),
  basePrice: z.number(),
  durability: z.number(),
  effects: z.record(z.unknown()),
  rarity: z.enum(["common", "uncommon", "rare", "legendary"]),
  source: z.string().optional(),
  dropChance: z.number().optional(),
  tradeable: z.boolean().optional(),
});

export type EquipmentDefinition = z.infer<typeof equipmentDefinitionSchema>;
