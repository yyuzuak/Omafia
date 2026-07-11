import businessesConfig from "@mafia/shared/config/businesses.json" with { type: "json" };
import equipmentConfig from "@mafia/shared/config/equipment.json" with { type: "json" };
import type { BusinessDefinition, EquipmentDefinition } from "@mafia/shared";
import type { PrismaClient } from "@prisma/client";
import { runLaunderCron } from "../modules/economy/service.js";

const businessDefs = businessesConfig.businesses as BusinessDefinition[];
const equipmentDefs = equipmentConfig.equipment as EquipmentDefinition[];

/** Saatlik talep sayacı sıfırlama — fiyat formülü için (GDD §4.3) */
async function resetDemandCounters(prisma: PrismaClient) {
  await prisma.equipmentPrice.updateMany({ data: { demand24h: 0, updatedAt: new Date() } });
}

export function startJobs(prisma: PrismaClient) {
  // Aklama + pasif gelir: her saat başı
  const runLaunder = async () => {
    try {
      await runLaunderCron(prisma, businessDefs);
    } catch (err) {
      console.error("[launder-cron] hata:", err);
    }
  };

  // Talep sayacı: her 24 saatte bir sıfırla
  const runDemandReset = async () => {
    try {
      await resetDemandCounters(prisma);
    } catch (err) {
      console.error("[demand-reset] hata:", err);
    }
  };

  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  // İlk çalışma anında hemen başlat (sunucu restart'ında kaçan cron'ları yakala)
  void runLaunder();

  setInterval(() => void runLaunder(), HOUR_MS);
  setInterval(() => void runDemandReset(), DAY_MS);

  console.log("[jobs] Aklama ve talep cron'ları başlatıldı");
}
