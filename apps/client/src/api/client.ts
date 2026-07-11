import type { LoginInput, PlayerProfile, RegisterInput } from "@mafia/shared";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    // Access token süresi dolduysa bir kez refresh dene
    if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
      const refreshed = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (refreshed.ok) return request<T>(path, options);
    }
    throw new ApiError(res.status, body?.error ?? "Bir şeyler ters gitti");
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (input: RegisterInput) =>
    request<{ id: string; username: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  login: (input: LoginInput) =>
    request<{ id: string; username: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => request<PlayerProfile>("/player/me"),
};

export { ApiError };
