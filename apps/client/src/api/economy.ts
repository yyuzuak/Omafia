async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`/api${path}`, { credentials: "include", headers, ...options });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Bir şeyler ters gitti");
  }
  return res.json() as Promise<T>;
}

export interface BusinessInfo {
  id: string; typeId: string; name: string; level: number; cityId: string;
  launderQueue: number; queueMax: number; rushMode: boolean;
  stats: { capacityPerHour: number; rate: number; passivePerHour: number };
  upgradeAvailable: boolean; nextUpgradeCost: number | null;
}

export interface MarketItem {
  id: string; name: string; category: string; rarity: string;
  durability: number; effects: Record<string, unknown>;
  basePrice: number; currentPrice: number; demand24h: number;
}

export interface InventoryItem {
  id: string; itemId: string; name: string; category?: string;
  durability: number; maxDurability: number; equipped: boolean;
  effects?: Record<string, unknown>;
}

export const economyApi = {
  myBusinesses: () => req<BusinessInfo[]>("/economy/businesses"),
  shop: () => req<{ id: string; name: string; purchasePrice: number; launderingCapacityPerHour: number; launderingRate: number; passiveIncomePerHour: number }[]>("/economy/shop"),
  buyBusiness: (typeId: string) => req<{ ok: true; businessId: string }>("/economy/businesses/buy", { method: "POST", body: JSON.stringify({ typeId }) }),
  upgradeBusiness: (id: string) => req<{ ok: true; level: number }>(`/economy/businesses/${id}/upgrade`, { method: "POST" }),
  depositLaunder: (id: string, amount: number) => req<{ ok: true; queued: number }>(`/economy/businesses/${id}/launder`, { method: "POST", body: JSON.stringify({ amount }) }),
  toggleRush: (id: string, rush: boolean) => req<{ ok: boolean; rushMode: boolean }>(`/economy/businesses/${id}/rush`, { method: "POST", body: JSON.stringify({ rush }) }),
  market: () => req<MarketItem[]>("/market"),
  inventory: () => req<InventoryItem[]>("/market/inventory"),
  buyItem: (itemId: string) => req<{ ok: true; inventoryId: string; price: number }>("/market/buy", { method: "POST", body: JSON.stringify({ itemId }) }),
  repairItem: (inventoryId: string) => req<{ ok: true; repairCost: number }>("/market/repair", { method: "POST", body: JSON.stringify({ inventoryId }) }),
  equipItem: (inventoryId: string, equip: boolean) => req<{ ok: true; equipped: boolean }>("/market/equip", { method: "POST", body: JSON.stringify({ inventoryId, equip }) }),
};
