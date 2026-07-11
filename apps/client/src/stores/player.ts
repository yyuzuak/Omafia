import type { PlayerProfile } from "@mafia/shared";
import { create } from "zustand";
import { api } from "../api/client";

interface PlayerState {
  profile: PlayerProfile | null;
  status: "loading" | "guest" | "ready";
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  profile: null,
  status: "loading",
  fetchMe: async () => {
    try {
      const profile = await api.me();
      set({ profile, status: "ready" });
    } catch {
      set({ profile: null, status: "guest" });
    }
  },
  logout: async () => {
    await api.logout().catch(() => undefined);
    set({ profile: null, status: "guest" });
  },
}));
