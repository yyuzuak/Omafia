import { z } from "zod";

export const playerStatsSchema = z.object({
  strength: z.number().int().min(1),
  agility: z.number().int().min(1),
  intelligence: z.number().int().min(1),
  charisma: z.number().int().min(1),
});

export type PlayerStats = z.infer<typeof playerStatsSchema>;

/** /me yanıtı — client'ın oyun ekranı için ihtiyaç duyduğu her şey */
export interface PlayerProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  stats: PlayerStats;
  cityId: string;
  cleanMoney: number;
  dirtyMoney: number;
  ap: number;
  apMax: number;
  /** Bir sonraki tam dolum için kalan süre (ms) */
  apMsUntilFull: number;
  jailUntil: string | null;
  hospitalUntil: string | null;
  travelUntil: string | null;
}
