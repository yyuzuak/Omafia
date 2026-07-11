import { AP_REGEN_SECONDS } from "@mafia/shared";
import { useEffect, useState } from "react";
import { usePlayerStore } from "../stores/player";

/**
 * AP göstergesi — server'dan gelen snapshot'ı client'ta saniye saniye ilerletir
 * (görsel önizleme; otorite her zaman server).
 */
export function ApBar() {
  const profile = usePlayerStore((s) => s.profile);
  const [now, setNow] = useState(Date.now());
  const [snapshotAt, setSnapshotAt] = useState(Date.now());

  useEffect(() => {
    setSnapshotAt(Date.now());
  }, [profile?.ap, profile?.apMsUntilFull]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!profile) return null;

  const elapsed = now - snapshotAt;
  const gained = Math.floor(elapsed / (AP_REGEN_SECONDS * 1000));
  const ap = Math.min(profile.apMax, profile.ap + gained);
  const msLeft = Math.max(0, profile.apMsUntilFull - elapsed);
  const pct = (ap / profile.apMax) * 100;

  const mins = Math.floor(msLeft / 60_000);
  const secs = Math.floor((msLeft % 60_000) / 1000);

  return (
    <div className="bg-panel/60 px-4 py-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">Aksiyon Puanı</span>
        <span className="text-ink">
          {ap}/{profile.apMax}
          {ap < profile.apMax && (
            <span className="ml-2 text-muted">
              (dolum: {mins}:{secs.toString().padStart(2, "0")})
            </span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-info transition-[width] duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
