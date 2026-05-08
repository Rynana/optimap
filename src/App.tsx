import { useEffect, useState } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { getDataDir, getDbPath, getSqlDriver } from "./db/client";
import { runMigrations } from "./db/migrate";

type DbStatus = { kind: "initializing" } | { kind: "ready" } | { kind: "error"; message: string };

function App() {
  const [status, setStatus] = useState<DbStatus>({ kind: "initializing" });
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dir = await getDataDir();
        if (cancelled) return;
        setDataDir(dir);
        const driver = await getSqlDriver();
        await runMigrations(driver);
        if (cancelled) return;
        setStatus({ kind: "ready" });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        console.error("[OptiMap] Database initialization failed:", e);
        setStatus({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReveal() {
    try {
      const path = await getDbPath();
      await revealItemInDir(path);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[OptiMap] Failed to reveal data folder:", e);
      window.alert(`Could not reveal data folder: ${message}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-10">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">OptiMap</h1>
        <p className="mt-3 text-lg text-slate-500">coming soon</p>
        <p className="mt-6 text-sm text-slate-400" data-testid="db-status" aria-live="polite">
          {status.kind === "initializing" && "Initializing database…"}
          {status.kind === "ready" && "Database ready"}
          {status.kind === "error" && `Database error: ${status.message}`}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowSettings((prev) => !prev)}
        className="mt-8 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {showSettings ? "Hide settings" : "Settings"}
      </button>

      {showSettings && (
        <section
          aria-label="Settings (stub)"
          className="mt-4 w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-slate-900">Settings (stub)</h2>
          <p className="mt-1 text-sm text-slate-500">Full settings UI lands in a later ticket.</p>
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Data folder
            </p>
            <p className="mt-1 break-all rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
              {dataDir ?? "loading…"}
            </p>
            <button
              type="button"
              onClick={handleReveal}
              disabled={status.kind !== "ready"}
              className="mt-3 rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reveal data folder
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
