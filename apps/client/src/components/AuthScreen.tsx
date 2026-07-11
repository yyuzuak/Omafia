import { loginSchema, registerSchema } from "@mafia/shared";
import { type FormEvent, useState } from "react";
import { api } from "../api/client";
import { usePlayerStore } from "../stores/player";

export function AuthScreen() {
  const fetchMe = usePlayerStore((s) => s.fetchMe);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());

    const parsed = mode === "login" ? loginSchema.safeParse(raw) : registerSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Geçersiz form");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await api.login(loginSchema.parse(raw));
      } else {
        await api.register(registerSchema.parse(raw));
      }
      await fetchMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="mb-1 font-display text-4xl font-bold text-gold">Omafia</h1>
      <p className="mb-8 text-sm text-muted">Şehir seni bekliyor, göçmen.</p>

      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl bg-panel p-6 shadow-lg">
        <div className="mb-6 flex rounded-lg bg-bg p-1 text-sm">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`flex-1 rounded-md py-2 transition-colors ${
                mode === m ? "bg-panel text-gold" : "text-muted"
              }`}
            >
              {m === "login" ? "Giriş" : "Kayıt"}
            </button>
          ))}
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-muted">Kullanıcı adı</span>
          <input
            name="username"
            autoComplete="username"
            className="w-full rounded-md border border-white/10 bg-bg px-3 py-2 outline-none focus:border-gold"
          />
        </label>

        {mode === "register" && (
          <label className="mb-4 block">
            <span className="mb-1 block text-xs text-muted">E-posta</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-white/10 bg-bg px-3 py-2 outline-none focus:border-gold"
            />
          </label>
        )}

        <label className="mb-6 block">
          <span className="mb-1 block text-xs text-muted">Şifre</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-md border border-white/10 bg-bg px-3 py-2 outline-none focus:border-gold"
          />
        </label>

        {error && <p className="mb-4 text-sm text-bordeaux">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-gold py-2.5 font-medium text-bg transition-opacity disabled:opacity-50"
        >
          {busy ? "…" : mode === "login" ? "Şehre Gir" : "Aileye Katıl"}
        </button>
      </form>
    </div>
  );
}
