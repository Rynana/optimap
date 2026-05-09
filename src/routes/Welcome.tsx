import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSqlDriver } from "../db/client";
import { setMetaFlag } from "../db/meta-flags";
import { useAppContext } from "../context/app-context";

export default function Welcome() {
  const navigate = useNavigate();
  const { markFirstLaunchDone } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [showCsvStub, setShowCsvStub] = useState(false);

  async function completeFirstLaunch() {
    const driver = await getSqlDriver();
    await setMetaFlag(driver, "first_launch_completed", "1");
    markFirstLaunchDone();
  }

  async function handleStartEmpty() {
    setLoading(true);
    try {
      await completeFirstLaunch();
      navigate("/sites");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-10">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome to OptiMap</h1>
        <p className="mt-3 text-lg text-slate-500">
          Your map-first tool for managing telecom sites and spectrum licences.
        </p>
      </div>

      <div className="mt-10 w-full max-w-md space-y-3">
        <div>
          <button
            type="button"
            disabled
            data-testid="start-sample-btn"
            className="w-full cursor-not-allowed rounded-lg bg-blue-200 px-4 py-3 text-sm font-medium text-blue-400"
          >
            Start with sample dataset (available after T-006)
          </button>
          <p className="mt-1 text-center text-xs text-slate-400">
            Lights up once the Sites module is built.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCsvStub((v) => !v)}
          disabled={loading}
          data-testid="import-csv-btn"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Import from CSV
        </button>
        {showCsvStub && (
          <p className="text-center text-sm text-slate-500" role="status">
            CSV import coming in T-019.
          </p>
        )}

        <button
          type="button"
          onClick={handleStartEmpty}
          disabled={loading}
          data-testid="start-empty-btn"
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start empty
        </button>
      </div>
    </div>
  );
}
