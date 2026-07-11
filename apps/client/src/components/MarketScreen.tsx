import { useEffect, useState } from "react";
import type { BusinessInfo, InventoryItem, MarketItem } from "../api/economy";
import { economyApi } from "../api/economy";
import { usePlayerStore } from "../stores/player";

type MarketTab = "pazar" | "isletmeler" | "envanter";

const RARITY_COLOR: Record<string, string> = {
  common: "text-muted",
  uncommon: "text-info",
  rare: "text-gold",
  legendary: "text-bordeaux",
};

const RARITY_LABEL: Record<string, string> = {
  common: "Yaygın",
  uncommon: "Nadir",
  rare: "Ender",
  legendary: "Efsanevi",
};

export function MarketScreen() {
  const [tab, setTab] = useState<MarketTab>("pazar");
  const [items, setItems] = useState<MarketItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessInfo[]>([]);
  const [shop, setShop] = useState<Awaited<ReturnType<typeof economyApi.shop>>>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { fetchMe } = usePlayerStore();

  const load = async () => {
    setError(null);
    try {
      const [m, b, s, inv] = await Promise.all([
        economyApi.market(),
        economyApi.myBusinesses(),
        economyApi.shop(),
        economyApi.inventory(),
      ]);
      setItems(m); setBusinesses(b); setShop(s); setInventory(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    }
  };

  useEffect(() => { void load(); }, []);

  const act = async (key: string, fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(key); setError(null); setMsg(null);
    try {
      await fn();
      setMsg(successMsg);
      await Promise.all([load(), fetchMe()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* İç sekmeler */}
      <div className="flex gap-1 bg-bg px-4 py-2">
        {(["pazar", "isletmeler", "envanter"] as MarketTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${tab === t ? "bg-panel text-gold" : "text-muted"}`}
          >
            {t === "pazar" ? "NPC Pazarı" : t === "isletmeler" ? "İşletmeler" : "Envanter"}
          </button>
        ))}
      </div>

      {msg && <p className="mx-4 mt-2 rounded-lg bg-info/10 p-2 text-xs text-info">{msg}</p>}
      {error && <p className="mx-4 mt-2 rounded-lg bg-bordeaux/10 p-2 text-xs text-bordeaux">{error}</p>}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "pazar" && (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${RARITY_COLOR[item.rarity] ?? "text-muted"}`}>
                        {RARITY_LABEL[item.rarity] ?? item.rarity}
                      </span>
                      <span className="font-semibold text-ink">{item.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{item.category}</p>
                    <p className="mt-1 text-sm font-medium text-gold">
                      ₺{item.currentPrice.toLocaleString("tr-TR")}
                      {item.currentPrice !== item.basePrice && (
                        <span className="ml-1 text-xs text-muted line-through">
                          ₺{item.basePrice.toLocaleString("tr-TR")}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    disabled={busy === item.id}
                    onClick={() => act(item.id, () => economyApi.buyItem(item.id), `${item.name} satın alındı`)}
                    className="shrink-0 rounded-lg bg-info px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-30"
                  >
                    {busy === item.id ? "…" : "Al"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "isletmeler" && (
          <div className="flex flex-col gap-3">
            {/* Sahip olunan işletmeler */}
            {businesses.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-muted">Senin İşletmelerin</h3>
                {businesses.map((biz) => (
                  <BusinessCard
                    key={biz.id}
                    biz={biz}
                    busy={busy}
                    onUpgrade={() => act(biz.id + "_up", () => economyApi.upgradeBusiness(biz.id), "İşletme yükseltildi")}
                    onDeposit={(amt) => act(biz.id + "_dep", () => economyApi.depositLaunder(biz.id, amt), `₺${amt.toLocaleString()} kuyruğa eklendi`)}
                    onToggleRush={() => act(biz.id + "_rush", () => economyApi.toggleRush(biz.id, !biz.rushMode), `Rush mod ${!biz.rushMode ? "açıldı" : "kapatıldı"}`)}
                  />
                ))}
              </>
            )}

            {/* Satın alınabilecek işletmeler */}
            <h3 className="mt-2 text-xs font-medium text-muted">Satın Al</h3>
            {shop.map((s) => (
              <div key={s.id} className="rounded-xl bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Kapasite: {s.launderingCapacityPerHour.toLocaleString()}/sa ·
                      Oran: %{Math.round(s.launderingRate * 100)} ·
                      Pasif: ₺{s.passiveIncomePerHour}/sa
                    </p>
                    <p className="mt-1 text-sm font-medium text-gold">₺{s.purchasePrice.toLocaleString("tr-TR")}</p>
                  </div>
                  <button
                    disabled={!!busy}
                    onClick={() => act(s.id + "_buy", () => economyApi.buyBusiness(s.id), `${s.name} satın alındı`)}
                    className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-30"
                  >
                    {busy === s.id + "_buy" ? "…" : "Al"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "envanter" && (
          <div className="flex flex-col gap-2">
            {inventory.length === 0 && <p className="text-sm text-muted">Envanter boş.</p>}
            {inventory.map((item) => {
              const durPct = Math.round((item.durability / item.maxDurability) * 100);
              return (
                <div key={item.id} className="rounded-xl bg-panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.equipped && <span className="text-xs text-gold">[Kuşanıldı]</span>}
                        <span className="font-semibold text-ink">{item.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg">
                          <div
                            className={`h-full rounded-full ${durPct > 50 ? "bg-info" : durPct > 25 ? "bg-gold" : "bg-bordeaux"}`}
                            style={{ width: `${durPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">{item.durability}/{item.maxDurability}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        disabled={!!busy}
                        onClick={() => act(item.id + "_eq", () => economyApi.equipItem(item.id, !item.equipped), item.equipped ? "Çıkarıldı" : "Kuşanıldı")}
                        className="rounded-md bg-panel border border-white/10 px-2 py-1 text-xs text-muted disabled:opacity-30"
                      >
                        {item.equipped ? "Çıkar" : "Kuşan"}
                      </button>
                      {item.durability < item.maxDurability && (
                        <button
                          disabled={!!busy}
                          onClick={() => act(item.id + "_rep", () => economyApi.repairItem(item.id), "Onarıldı")}
                          className="rounded-md bg-info/20 px-2 py-1 text-xs text-info disabled:opacity-30"
                        >
                          Onar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessCard({
  biz, busy, onUpgrade, onDeposit, onToggleRush,
}: {
  biz: BusinessInfo;
  busy: string | null;
  onUpgrade: () => void;
  onDeposit: (amount: number) => void;
  onToggleRush: () => void;
}) {
  const [depositInput, setDepositInput] = useState("");
  const queuePct = Math.round((biz.launderQueue / biz.queueMax) * 100);

  return (
    <div className="rounded-xl bg-panel p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-ink">{biz.name} <span className="text-xs text-muted">Sv.{biz.level}</span></p>
          <p className="mt-0.5 text-xs text-muted">
            Kapasite: {biz.stats.capacityPerHour.toLocaleString()}/sa ·
            Oran: %{Math.round(biz.stats.rate * 100)} ·
            Pasif: ₺{biz.stats.passivePerHour}/sa
          </p>
        </div>
        <div className="flex gap-1">
          {biz.upgradeAvailable && (
            <button
              disabled={!!busy}
              onClick={onUpgrade}
              className="rounded-md bg-gold/20 px-2 py-1 text-xs text-gold disabled:opacity-30"
            >
              ↑ ₺{biz.nextUpgradeCost?.toLocaleString()}
            </button>
          )}
        </div>
      </div>

      {/* Kuyruk durumu */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Kuyruk</span>
          <span>₺{biz.launderQueue.toLocaleString()} / ₺{biz.queueMax.toLocaleString()}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-bordeaux transition-[width]" style={{ width: `${queuePct}%` }} />
        </div>
      </div>

      {/* Kirli para yatır */}
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          value={depositInput}
          onChange={(e) => setDepositInput(e.target.value)}
          placeholder="Kirli para miktarı"
          className="flex-1 rounded-md border border-white/10 bg-bg px-2 py-1.5 text-xs outline-none focus:border-bordeaux"
        />
        <button
          disabled={!!busy || !depositInput}
          onClick={() => { onDeposit(Number(depositInput)); setDepositInput(""); }}
          className="rounded-md bg-bordeaux/80 px-3 py-1.5 text-xs text-ink disabled:opacity-30"
        >
          Akla
        </button>
      </div>

      {/* Rush mod */}
      <button
        disabled={!!busy}
        onClick={onToggleRush}
        className={`mt-2 w-full rounded-md py-1.5 text-xs transition-colors disabled:opacity-30 ${biz.rushMode ? "bg-bordeaux/30 text-bordeaux" : "bg-bg text-muted"}`}
      >
        {biz.rushMode ? "⚡ Rush Mod Açık (baskın riski %10/gün)" : "Rush Modu Aç (2× hız)"}
      </button>
    </div>
  );
}
