import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { getSqlDriver } from "./db/client";
import { runMigrations } from "./db/migrate";
import { getMetaFlag } from "./db/meta-flags";
import { AppContext } from "./context/app-context";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./routes/Dashboard";
import Sites from "./routes/Sites";
import MapView from "./routes/MapView";
import Licences from "./routes/Licences";
import Settings from "./routes/Settings";
import Welcome from "./routes/Welcome";

type InitState =
  | { status: "initializing" }
  | { status: "ready"; firstLaunch: boolean }
  | { status: "error"; message: string };

export default function App() {
  const [initState, setInitState] = useState<InitState>({ status: "initializing" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const driver = await getSqlDriver();
        await runMigrations(driver);
        const flag = await getMetaFlag(driver, "first_launch_completed");
        if (!cancelled) {
          setInitState({ status: "ready", firstLaunch: flag === null });
        }
      } catch (e) {
        if (!cancelled) {
          setInitState({
            status: "error",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (initState.status === "initializing") {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-50"
        data-testid="init-loading"
        aria-live="polite"
      >
        <p className="text-sm text-slate-400">Initializing…</p>
      </div>
    );
  }

  if (initState.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-base font-medium text-red-700">Failed to initialize database</p>
          <p className="mt-1 text-sm text-slate-500">{initState.message}</p>
        </div>
      </div>
    );
  }

  const { firstLaunch } = initState;

  return (
    <AppContext.Provider
      value={{
        firstLaunch,
        markFirstLaunchDone: () => setInitState({ status: "ready", firstLaunch: false }),
        resetFirstLaunch: () => setInitState({ status: "ready", firstLaunch: true }),
      }}
    >
      <HashRouter>
        <Routes>
          {/* Full-screen route — no AppShell */}
          <Route path="/welcome" element={<Welcome />} />

          {/* Shell routes */}
          <Route path="/" element={<AppShell />}>
            <Route
              index
              element={firstLaunch ? <Navigate to="/welcome" replace /> : <Dashboard />}
            />
            <Route path="sites" element={<Sites />} />
            <Route path="map" element={<MapView />} />
            <Route path="licences" element={<Licences />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}
