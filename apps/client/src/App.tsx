import { useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { CityScreen } from "./components/CityScreen";
import { usePlayerStore } from "./stores/player";

export default function App() {
  const { status, fetchMe } = usePlayerStore();

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted">Yükleniyor…</p>
      </div>
    );
  }

  return status === "ready" ? <CityScreen /> : <AuthScreen />;
}
