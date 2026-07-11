import citiesConfig from "@mafia/shared/config/cities.json";
import { useEffect } from "react";
import { usePlayerStore } from "../stores/player";
import { ApBar } from "./ApBar";

const TABS = ["Şehir", "Suç", "Pazar", "Klan", "Profil"] as const;

export function CityScreen() {
  const { profile, fetchMe, logout } = usePlayerStore();

  // AP göstergesi tazelensin diye periyodik /me (S2'de Socket.io'ya taşınır)
  useEffect(() => {
    const id = setInterval(() => void fetchMe(), 30_000);
    return () => clearInterval(id);
  }, [fetchMe]);

  if (!profile) return null;

  const city = citiesConfig.cities.find((c) => c.id === profile.cityId);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Üst bar */}
      <header className="flex items-center justify-between bg-panel px-4 py-3">
        <div>
          <h1 className="font-display text-lg font-bold text-gold">{city?.name ?? profile.cityId}</h1>
          <p className="text-xs text-muted">
            {profile.username} · Sv. {profile.level}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gold">₺{profile.cleanMoney.toLocaleString("tr-TR")}</p>
          <p className="text-bordeaux">₺{profile.dirtyMoney.toLocaleString("tr-TR")} kirli</p>
        </div>
      </header>

      <ApBar />

      {/* Boş şehir alanı — S8'de Phaser isometric sahne buraya gelir */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-2 font-display text-2xl text-ink">{city?.name}</p>
        <p className="max-w-xs text-sm text-muted">{city?.description}</p>
        <p className="mt-8 text-xs text-muted/60">Sokaklar henüz sessiz… (S2: suç döngüsü geliyor)</p>
        <button onClick={() => void logout()} className="mt-6 text-xs text-info underline">
          Çıkış yap
        </button>
      </main>

      {/* Alt tab bar (mobil öncelikli) */}
      <nav className="flex border-t border-white/5 bg-panel pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            disabled={i !== 0}
            className={`flex-1 py-3 text-xs ${i === 0 ? "text-gold" : "text-muted/50"}`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
