import type { CrimeListItem, CrimeResult } from "@mafia/shared";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Bir şeyler ters gitti");
  }
  return res.json() as Promise<T>;
}

export const crimesApi = {
  list: () => request<CrimeListItem[]>("/crimes"),
  commit: (crimeId: string) =>
    request<CrimeResult & { ok: true }>(`/crimes/${crimeId}/commit`, { method: "POST" }),
  bribe: () =>
    request<{ ok: boolean; bribeAmount: number }>("/crimes/jail/bribe", { method: "POST" }),
};
