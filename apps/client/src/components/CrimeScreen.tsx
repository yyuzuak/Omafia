import type { CrimeListItem, CrimeResult } from "@mafia/shared";
import { useEffect, useState } from "react";
import { crimesApi } from "../api/crimes";
import { usePlayerStore } from "../stores/player";

const TIER_LABEL: Record<string, string> = {
  street: "Sokak",
  mid: "Orta",
  heavy: "Ağır",
  organized: "Organize",
};

const TIER_COLOR: Record<string, string> = {
  street: "text-muted",
  mid: "text-info",
  heavy: "text-gold",
  organized: "text-bordeaux",
};

export function CrimeScreen() {
  const { profile, fetchMe } = usePlayerStore();
  const [crimes, setCrimes] = useState<CrimeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<(CrimeResult & { crimeName: string }) | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCrimes = async () => {
    try {
      const list = await crimesApi.list();
      setCrimes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suçlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCrimes();
  }, []);

  const commitCrime = async (crime: CrimeListItem) => {
    setBusy(crime.id);
    setResult(null);
    setError(null);
    try {
      const r = await crimesApi.commit(crime.id);
      setResult({ ...r, crimeName: crime.name });
      await Promise.all([fetchMe(), fetchCrimes()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bir şeyler ters gitti");
    } finally {
      setBusy(null);
    }
  };

  const bribe = async () => {
    setBusy("bribe");
    setError(null);
    try {
      await crimesApi.bribe();
      await Promise.all([fetchMe(), fetchCrimes()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rüşvet başarısız");
    } finally {
      setBusy(null);
    }
  };

  // Hapis ekranı
  if (profile?.jailUntil && new Date(profile.jailUntil) > new Date()) {
    const remaining = Math.max(0, new Date(profile.jailUntil).getTime() - Date.now());
    const mins = Math.floor(remaining / 60_000);
    const secs = Math.floor((remaining % 60_000) / 1000);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="font-display text-xl text-bordeaux">Hapishanede</h2>
        <p className="text-sm text-muted">
          Tahliye: {mins}:{secs.toString().padStart(2, "0")}
        </p>
        <button
          onClick={bribe}
          disabled={!!busy}
          className="rounded-lg bg-gold px-6 py-2.5 text-sm font-medium text-bg disabled:opacity-50"
        >
          {busy ? "…" : "Rüşvet Ver"}
        </button>
        {error && <p className="text-sm text-bordeaux">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Suç sonucu bildirimi */}
      {result && (
        <div
          className={`mx-4 mt-4 rounded-xl p-4 ${result.success ? "bg-info/10 border border-info/30" : "bg-bordeaux/10 border border-bordeaux/30"}`}
        >
          <p className="font-semibold">
            {result.success ? "✓ Başarılı" : "✗ Başarısız"} — {result.crimeName}
          </p>
          {result.success && (
            <p className="mt-1 text-sm text-muted">
              +₺{result.reward.toLocaleString("tr-TR")} kirli para kazandın
            </p>
          )}
          {result.jailUntil && (
            <p className="mt-1 text-sm text-bordeaux">Hapis cezası aldın!</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Başarı şansı: %{result.breakdown.finalChance} (Baz +{result.breakdown.base}, Stat +
            {result.breakdown.statScore}, Zorluk −{result.breakdown.difficultyPenalty})
          </p>
        </div>
      )}

      {error && (
        <p className="mx-4 mt-4 rounded-lg bg-bordeaux/10 p-3 text-sm text-bordeaux">{error}</p>
      )}

      {/* Suç listesi */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-muted">Yükleniyor…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {crimes.map((crime) => (
              <CrimeCard
                key={crime.id}
                crime={crime}
                busy={busy === crime.id}
                currentAp={profile?.ap ?? 0}
                onCommit={() => void commitCrime(crime)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CrimeCard({
  crime,
  busy,
  currentAp,
  onCommit,
}: {
  crime: CrimeListItem;
  busy: boolean;
  currentAp: number;
  onCommit: () => void;
}) {
  const onCooldown = !!crime.cooldownUntil;
  const noAp = currentAp < crime.actionPointCost;
  const disabled = crime.locked || onCooldown || noAp || busy;

  return (
    <div className={`rounded-xl bg-panel p-4 ${crime.locked ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${TIER_COLOR[crime.tier] ?? "text-muted"}`}>
              {TIER_LABEL[crime.tier] ?? crime.tier}
            </span>
            <h3 className="font-semibold text-ink">{crime.name}</h3>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>%{crime.successChance} başarı</span>
            <span>
              ₺{crime.reward.min.toLocaleString("tr-TR")}–{crime.reward.max.toLocaleString("tr-TR")}
            </span>
            <span>{crime.actionPointCost} AP</span>
          </div>
          {crime.lockReason && <p className="mt-1 text-xs text-bordeaux">{crime.lockReason}</p>}
          {onCooldown && (
            <CooldownBadge until={crime.cooldownUntil!} />
          )}
          {!onCooldown && noAp && !crime.locked && (
            <p className="mt-1 text-xs text-bordeaux">Yeterli AP yok</p>
          )}
        </div>
        <button
          onClick={onCommit}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-info px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:opacity-30"
        >
          {busy ? "…" : "Yap"}
        </button>
      </div>
    </div>
  );
}

function CooldownBadge({ until }: { until: string }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const update = () => {
      const ms = Math.max(0, new Date(until).getTime() - Date.now());
      if (ms <= 0) { setLabel(""); return; }
      const m = Math.floor(ms / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLabel(m > 0 ? `${m}d ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (!label) return null;
  return <p className="mt-1 text-xs text-gold">Hazır: {label}</p>;
}
